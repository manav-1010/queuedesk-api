# QueueDesk API

QueueDesk is a backend for an internal service request portal. This is the kind of system a team can use to track operational requests such as IT support, facilities issues, access requests, onboarding tasks, and other internal helpdesk-style workflows.

The API includes authentication, role-based access control, ticket management, and a listing experience with filtering, sorting, and pagination. Each ticket also gets an SLA-style due date based on priority so it’s easy to spot what needs attention.

## Live deployment

- **Base URL:** https://queuedesk-api-6.onrender.com
- **Swagger UI:** https://queuedesk-api-6.onrender.com/docs
- **Health check:** https://queuedesk-api-6.onrender.com/health

Notes:

- Visiting `/` may return 404, which is expected (this is an API-only service).
- Use `/docs` to explore and test endpoints.

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

## Local URLs

1. Swagger UI: http://localhost:3000/docs
2. Health: http://localhost:3000/health
3. API base (prefixed): http://localhost:3000/api

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

## Deployment notes

Deployed on Render with a Neon-hosted PostgreSQL database.

Production environment variables:

Required:

1. DATABASE_URL
2. JWT_SECRET

Optional (depending on setup):

1. DIRECT_URL (common with Neon + Prisma, especially when using pooling)
2. JWT_EXPIRES_IN
3. NODE_ENV
4. API_PREFIX

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
