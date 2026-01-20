# QueueDesk API

QueueDesk is a backend for an internal service request portal. This is the kind of system a team can use to track operational requests such as IT support, facilities issues, access requests, onboarding tasks, and other internal helpdesk-style workflows.

The API supports authentication, role-based access control, ticket management, and a clean listing experience with filtering, sorting, and pagination. Each ticket also gets a simple SLA-style due date based on priority so it’s easy to spot what needs attention.

## Real-world use cases

1. IT helpdesk requests  
   Wi-Fi issues, software access, device problems, account unlocks, internal tooling requests.

2. Facilities requests  
   Maintenance, room setup, equipment requests, building issues.

3. Internal service intake  
   Requests routed to teams such as finance, HR, ops, engineering enablement, etc.

4. Lightweight ticket tracking  
   For teams that want something simpler than a full ITSM platform.

## Core features

1. Authentication  
   Register and login using JWT.

2. Role-based access control  
   Roles supported: USER and ADMIN.

3. Tickets workflow  
   Create tickets, update fields, update ticket status, and delete tickets with ownership and role rules.

4. Ticket listing  
   Filtering, sorting, pagination, and basic search support.

5. SLA-style due date  
   A dueAt field is calculated based on priority and remains consistent over time.

6. API documentation and health checks  
   Swagger UI at /docs and health endpoint at /health.

7. Local dev and CI  
   Local Postgres with Docker Compose and CI checks via GitHub Actions.

## SLA rules

When a ticket is created, dueAt is set automatically based on priority:

1. URGENT: +1 day
2. HIGH: +2 days
3. MEDIUM: +3 days
4. LOW: +5 days

If priority changes, dueAt is recalculated using the original createdAt.

## Tech stack

1. NestJS (TypeScript)
2. PostgreSQL + Prisma ORM
3. Passport JWT
4. class-validator / class-transformer
5. Docker Compose (local Postgres)
6. GitHub Actions (CI)

## Quick start (local)

Prereqs:

1. Node.js 20+
2. Docker Desktop

Setup:

```bash
cp .env.example .env
npm install

docker compose up -d db

npm run prisma:generate
npm run prisma:migrate
npm run seed

npm run start:dev
```

## URLs

1. API (prefixed): http://localhost:3000/api
2. Swagger UI: http://localhost:3000/docs
3. Health: http://localhost:3000/health

## Environment variables

See `.env.example`.

## API overview

Auth:

1. POST /api/auth/register
2. POST /api/auth/login

Tickets (authenticated):

1. POST /api/tickets
2. GET /api/tickets
3. GET /api/tickets/:id
4. PATCH /api/tickets/:id

Privileged actions (owner or admin depending on rules):

1. PATCH /api/tickets/:id/status
2. DELETE /api/tickets/:id

## Deployment (Render + Neon)

Steps:

1. Create a Neon Postgres database and copy the `DATABASE_URL`.
2. Create a Render Web Service connected to this repository.
3. Add environment variables in Render:
   DATABASE_URL  
   JWT_SECRET  
   JWT_EXPIRES_IN (optional)  
   NODE_ENV=production

Build command:

```bash
npm ci && npx prisma generate && npm run build
```

Start command:

```bash
node dist/main.js
```

Run migrations in production:

```bash
npx prisma migrate deploy
```
