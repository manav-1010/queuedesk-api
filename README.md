# QueueDesk API

**QueueDesk** is an internal _service request portal_ backend that I built to show real-world backend skills (auth, RBAC, SQL, Docker, CI, deployment) in a project that feels like something a team would actually use.

It supports a simple ticket workflow (create → track → resolve) with **filtering/sorting/pagination** and a lightweight **SLA due date** per ticket priority.

## Why this project

I wanted a project that matches common junior backend job requirements in Canada:

- REST API design + validation
- JWT auth + role-based access (USER / ADMIN)
- PostgreSQL schema + migrations + seed data
- Docker Compose for local dev
- Swagger docs + CI (GitHub Actions)
- Deployed API + real hosted Postgres

---

## Features

- JWT auth (register/login)
- Roles: `USER`, `ADMIN`
- Tickets CRUD (users can manage their own tickets; admins can manage everything)
- List tickets with **filtering / sorting / pagination**
- **SLA due date** stored on each ticket
- Swagger docs at `/docs`
- Health check at `/health`
- Local dev with Docker Compose
- GitHub Actions CI (lint + build + tests)

## SLA rules (simple + realistic)

When a ticket is created, `dueAt` is set automatically:

- `URGENT` → +1 day
- `HIGH` → +2 days
- `MEDIUM` → +3 days
- `LOW` → +5 days

If priority changes, `dueAt` is recalculated using the original `createdAt`.

---

## Tech

- NestJS (TypeScript)
- Prisma ORM + PostgreSQL
- Passport JWT
- class-validator / class-transformer

---

## Quick start (local)

### 1) Prereqs

- Node.js 20+
- Docker Desktop

### 2) Setup

```bash
cp .env.example .env
npm install

docker compose up -d db

npm run prisma:generate
npm run prisma:migrate
npm run seed

npm run start:dev
```

API (prefixed): http://localhost:3000/api  
Swagger: http://localhost:3000/docs  
Health: http://localhost:3000/health

---

## Environment variables

See `.env.example`.

---

## Common endpoints

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`

Tickets (authenticated):

- `POST /api/tickets`
- `GET /api/tickets` (filter/sort/paginate)
- `GET /api/tickets/:id`
- `PATCH /api/tickets/:id`

Admin-only:

- `PATCH /api/tickets/:id/status`
- `DELETE /api/tickets/:id`

---

## Deployment (Render + Neon)

- Create a Neon Postgres DB, copy `DATABASE_URL`
- Create a Render Web Service from this repo
- Set env vars in Render:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN` (optional)
  - `NODE_ENV=production`
- Build command:
  - `npm ci && npx prisma generate && npm run build`
- Start command:
  - `node dist/main.js`

Run migrations once in production:

- `npx prisma migrate deploy`

---

## License

MIT
