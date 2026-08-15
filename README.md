# ChaiForm

Production-ready SaaS foundation for a modern Google Forms alternative.

Implemented so far:

- MongoDB Atlas schema with Mongoose (users, forms with embedded fields, responses with embedded answers)
- Google OAuth and email/password authentication with Auth.js / NextAuth
- Password hashing with bcryptjs
- User persistence in MongoDB Atlas
- Protected `/dashboard` and `/forms` routes
- Form builder with 9 field types, drafts, and publishing
- Public form pages with progress indicator and inline validation
- Response inbox with CSV export, per-form analytics, and AI insights (Pro)
- AI form generation from a text prompt (Pro)
- Email notifications on new responses
- tRPC context with `publicProcedure`, `protectedProcedure`, and `proProcedure`
- Service and validation packages
- Environment validation and deployment-ready configuration

## Install Commands

The starter already includes most dependencies. Use these commands when setting up from scratch:

```bash
pnpm add mongoose zod dotenv --filter @repo/database
pnpm add -D tsx @types/node dotenv-cli --filter @repo/database
pnpm add next-auth@5.0.0-beta.30 --filter @repo/auth
pnpm add next-auth@5.0.0-beta.30 --filter web
pnpm add bcryptjs --filter @repo/services
pnpm add @repo/database @repo/services @repo/validators --filter @repo/trpc
pnpm add clsx tailwind-merge --filter @repo/ui
```

Then install workspace links:

```bash
pnpm install
```

## Environment

Copy `.env.example` to `.env` and fill the values:

```bash
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/chaiforms?retryWrites=true&w=majority"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
AUTH_SECRET=""
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:8000"
BASE_URL="http://localhost:8000"
WEB_URL="http://localhost:3000"
PORT="8000"
```

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

## Database

Create a free MongoDB Atlas cluster, then put the connection string in `MONGODB_URI`.
No migrations are needed — Mongoose schemas and indexes are defined in code and created
lazily on first use.

Models entrypoint:

```text
packages/database/index.ts
```

Collections (document model — form fields are embedded in forms, answers in responses):

- `users`
- `forms` (with embedded `fields`)
- `responses` (with embedded `answers`)

All document ids are UUID strings to keep the API contract stable.

## Architecture

```text
apps/
  api/        Express tRPC API
  web/        Next.js App Router app

packages/
  auth/       Auth.js configuration and handlers
  database/   Mongoose models and connection
  services/   Business logic and DB-facing services
  trpc/       Routers, context, procedures
  ui/         Shared UI utilities
  validators/ Shared Zod schemas and env validation
```

## Development

```bash
pnpm dev
```

Web app:

```text
http://localhost:3000
```

API:

```text
http://localhost:8000
```

## Auth Flow

```text
Landing page -> Signup/Login -> Protected dashboard
```

Supported auth methods:

- Google OAuth
- Email/password credentials

Credentials passwords are hashed with bcryptjs before storage. Email verification emails, OTP, and forgot password are intentionally out of scope for this checkpoint.

Protected routes:

- `/dashboard`
- `/forms`

Unauthenticated users are redirected to `/login`.

## Deployment

For Vercel, set the same environment variables from `.env.example`. MongoDB Atlas handles the database; no Docker/Postgres is required.

Use these callback URLs in Google Cloud Console:

```text
http://localhost:3000/api/auth/callback/google
https://your-domain.com/api/auth/callback/google
```
