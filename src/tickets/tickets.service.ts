import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Ticket, TicketPriority, UserRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQuery } from './dto/list-tickets.query';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

type TicketWithOverdue = Ticket & { isOverdue: boolean };

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTicketDto) {
    const createdAt = new Date();
    const dueAt = this.computeDueAt(createdAt, dto.priority);

    return this.prisma.ticket.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category.trim(),
        priority: dto.priority,
        createdById: userId,
        createdAt,
        dueAt,
      },
      include: {
        createdBy: { select: { id: true, email: true, fullName: true, role: true } },
      },
    });
  }

  async list(user: { userId: string; role: UserRole }, query: ListTicketsQuery) {
    const where: Prisma.TicketWhereInput = {};

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

    const sortBy = query.sortBy ?? 'createdAt';
    const sortDir = (query.sortDir ?? 'desc') as Prisma.SortOrder;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const orderBy = { [sortBy]: sortDir } as Prisma.TicketOrderByWithRelationInput;

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { createdBy: { select: { id: true, email: true, fullName: true, role: true } } },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    const withOverdue: TicketWithOverdue[] = items.map((t) => ({
      ...t,
      isOverdue: this.isOverdue(t),
    }));

    return {
      page,
      limit,
      total,
      items: withOverdue,
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

  async updateStatus(id: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    return this.prisma.ticket.update({
      where: { id },
      data: { status: dto.status },
      include: { createdBy: { select: { id: true, email: true, fullName: true, role: true } } },
    });
  }

  async remove(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');

    await this.prisma.ticket.delete({ where: { id } });
    return { deleted: true };
  }

  private computeDueAt(createdAt: Date, priority: TicketPriority): Date {
    const map: Record<TicketPriority, number> = {
      [TicketPriority.URGENT]: 1,
      [TicketPriority.HIGH]: 2,
      [TicketPriority.MEDIUM]: 3,
      [TicketPriority.LOW]: 5,
    };

    const days = map[priority] ?? 3;
    return new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private isOverdue(ticket: Pick<Ticket, 'dueAt' | 'status'>): boolean {
    const doneStatuses = new Set(['RESOLVED', 'CLOSED']);
    if (doneStatuses.has(ticket.status)) return false;
    return Date.now() > new Date(ticket.dueAt).getTime();
  }
}
