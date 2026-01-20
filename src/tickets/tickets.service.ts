import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQuery } from './dto/list-tickets.query';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { Prisma, TicketPriority, TicketStatus, UserRole } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTicketDto) {
    const createdAt = new Date();

    return this.prisma.ticket.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category.trim(),
        priority: dto.priority,
        createdById: userId,
        createdAt,
        dueAt: this.computeDueAt(createdAt, dto.priority),
      },
      include: {
        createdBy: { select: { id: true, email: true, fullName: true, role: true } },
      },
    });
  }

  async list(user: { userId: string; role: UserRole }, query: ListTicketsQuery) {
    const where: Prisma.TicketWhereInput = {};

    // Non-admins can only see their own tickets
    if (user.role !== UserRole.ADMIN) {
      where.createdById = user.userId;
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = { equals: query.category, mode: 'insensitive' };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // Only allow sorting by known safe fields (prevents weird values + keeps Prisma types happy)
    const allowedSortFields = new Set<keyof Prisma.TicketOrderByWithRelationInput>([
      'createdAt',
      'updatedAt',
      'dueAt',
      'priority',
      'status',
      'category',
      'title',
    ]);

    const sortBy: keyof Prisma.TicketOrderByWithRelationInput =
      query.sortBy &&
      allowedSortFields.has(query.sortBy as keyof Prisma.TicketOrderByWithRelationInput)
        ? (query.sortBy as keyof Prisma.TicketOrderByWithRelationInput)
        : 'createdAt';

    const sortDir: Prisma.SortOrder = query.sortDir === 'asc' ? 'asc' : 'desc';

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip,
        take: limit,
        include: { createdBy: { select: { id: true, email: true, fullName: true, role: true } } },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((t) => ({ ...t, isOverdue: this.isOverdue(t) })),
    };
  }

  async get(user: { userId: string; role: UserRole }, id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, email: true, fullName: true, role: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    if (user.role !== UserRole.ADMIN && ticket.createdById !== user.userId) {
      throw new ForbiddenException('You do not have access to this ticket.');
    }

    // "isOverdue" is computed, not stored.
    // That way it's always correct even if time passes without updates.
    return { ...ticket, isOverdue: this.isOverdue(ticket) };
  }

  async update(user: { userId: string; role: UserRole }, id: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    const isOwner = ticket.createdById === user.userId;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have access to update this ticket.');
    }

    // Users (and admins) can update basic fields here.
    // Status changes are handled via updateStatus.
    return this.prisma.ticket.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        category: dto.category?.trim(),
        priority: dto.priority,
        dueAt: dto.priority ? this.computeDueAt(ticket.createdAt, dto.priority) : undefined,
      },
      include: { createdBy: { select: { id: true, email: true, fullName: true, role: true } } },
    });
  }

  async updateStatus(
    user: { userId: string; role: UserRole },
    id: string,
    dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    const isOwner = ticket.createdById === user.userId;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have access to update this ticket.');
    }

    return this.prisma.ticket.update({
      where: { id },
      data: { status: dto.status },
      include: { createdBy: { select: { id: true, email: true, fullName: true, role: true } } },
    });
  }

  async remove(user: { userId: string; role: UserRole }, id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    const isOwner = ticket.createdById === user.userId;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have access to delete this ticket.');
    }

    await this.prisma.ticket.delete({ where: { id } });
    return { deleted: true };
  }

  // Due date is derived from createdAt + priority.
  // Keeping it server-side prevents clients from gaming due dates.
  private computeDueAt(createdAt: Date, priority: TicketPriority): Date {
    const map: Record<TicketPriority, number> = {
      URGENT: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 5,
    };

    const days = map[priority] ?? 3;
    return new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private isOverdue(ticket: { dueAt: Date; status: TicketStatus }): boolean {
    const doneStatuses: ReadonlySet<TicketStatus> = new Set(['RESOLVED', 'CLOSED']);
    if (doneStatuses.has(ticket.status)) return false;
    return Date.now() > new Date(ticket.dueAt).getTime();
  }
}
