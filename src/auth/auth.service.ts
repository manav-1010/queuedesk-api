import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email already in use.');
    }

    // Hash passwords before storing them. Never store plain text passwords.
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName?.trim() || null,
        role: UserRole.USER,
      },
      select: { id: true, email: true, role: true, fullName: true, createdAt: true },
    });

    const token = this.signToken(user.id, user.email, user.role);

    return { user, accessToken: token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Token payload stays minimal (user id + role). Avoid putting personal data into JWT.
    const token = this.signToken(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      accessToken: token,
    };
  }

  private signToken(userId: string, email: string, role: UserRole) {
    return this.jwt.sign({ sub: userId, email, role });
  }
}
