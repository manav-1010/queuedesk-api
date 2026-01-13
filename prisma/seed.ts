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

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: adminPwd, role: UserRole.ADMIN, fullName: 'Admin' },
  });

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: { email: userEmail, passwordHash: userPwd, role: UserRole.USER, fullName: 'Demo User' },
  });

  await prisma.ticket.createMany({
    data: [
      {
        title: 'Wi-Fi not working in meeting room',
        description: 'Cannot connect to the guest Wi-Fi. Tried reconnecting multiple times.',
        category: 'IT Support',
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        createdById: user.id,
      },
      {
        title: 'Request: access to shared drive',
        description: 'Need access to Finance shared drive for project documents.',
        category: 'Access / Permissions',
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        createdById: user.id,
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete. Demo users (local/dev):');
  // eslint-disable-next-line no-console
  console.log(`Admin: ${adminEmail} / Admin123!`);
  // eslint-disable-next-line no-console
  console.log(`User:  ${userEmail} / User123!`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
