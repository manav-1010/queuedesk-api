import { PrismaClient, UserRole, TicketPriority, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function computeDueAt(createdAt: Date, priority: TicketPriority): Date {
  const map: Record<TicketPriority, number> = {
    [TicketPriority.URGENT]: 1,
    [TicketPriority.HIGH]: 2,
    [TicketPriority.MEDIUM]: 3,
    [TicketPriority.LOW]: 5,
  };

  const days = map[priority] ?? 3;
  return new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  const adminEmail = 'admin@queuedesk.local';
  const userEmail = 'user@queuedesk.local';

  const adminPwd = await bcrypt.hash('Admin123!', 10);
  const userPwd = await bcrypt.hash('User123!', 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: adminPwd, role: UserRole.ADMIN, fullName: 'Admin' },
  });

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: { email: userEmail, passwordHash: userPwd, role: UserRole.USER, fullName: 'Demo User' },
  });

  const now = new Date();

  const t1Priority = TicketPriority.HIGH;
  const t2Priority = TicketPriority.MEDIUM;

  await prisma.ticket.createMany({
    data: [
      {
        title: 'Wi-Fi not working in meeting room',
        description: 'Cannot connect to the guest Wi-Fi. Tried reconnecting multiple times.',
        category: 'IT Support',
        priority: t1Priority,
        status: TicketStatus.OPEN,
        createdById: user.id,
        createdAt: now,
        dueAt: computeDueAt(now, t1Priority),
      },
      {
        title: 'Request: access to shared drive',
        description: 'Need access to Finance shared drive for project documents.',
        category: 'Access / Permissions',
        priority: t2Priority,
        status: TicketStatus.IN_PROGRESS,
        createdById: user.id,
        createdAt: now,
        dueAt: computeDueAt(now, t2Priority),
      },
    ],
  });

  console.log('Seed complete. Demo users (local/dev):');
  console.log(`Admin: ${adminEmail} / Admin123!`);
  console.log(`User:  ${userEmail} / User123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
