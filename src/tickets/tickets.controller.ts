import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/user.decorator';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQuery } from './dto/list-tickets.query';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@ApiTags('tickets')
@ApiBearerAuth()
// Everything below requires a valid JWT (Swagger: paste ONLY the raw token, no "Bearer")
@UseGuards(JwtAuthGuard)
// Controller stays thin: validation + routing.
// All business logic (including auth checks) lives in the service.
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  async create(@CurrentUser() user: { userId: string }, @Body() dto: CreateTicketDto) {
    return this.tickets.create(user.userId, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: { userId: string; role: UserRole },
    @Query() query: ListTicketsQuery,
  ) {
    return this.tickets.list(user, query);
  }

  // Ownership rules are enforced in the service layer (owner OR admin).
  // Controller stays thin on purpose.
  @Get(':id')
  async get(@CurrentUser() user: { userId: string; role: UserRole }, @Param('id') id: string) {
    return this.tickets.get(user, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { userId: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.tickets.update(user, id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: { userId: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.tickets.updateStatus(user, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: { userId: string; role: UserRole }, @Param('id') id: string) {
    return this.tickets.remove(user, id);
  }
}
