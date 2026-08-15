# ChaiForm

A modern, AI-powered form builder — a polished alternative to Google Forms and Typeform. Build forms with a drag-friendly no-code editor or generate them from a text prompt, collect unlimited responses, and analyze them with live analytics and AI insights.

## Features

- **AI form generation** — describe the form you need and AI builds the questions (Pro)
- **AI response insights** — question-level summaries of your responses (Pro)
- **No-code form builder** — 9+ field types, drafts, publishing, and live previews
- **Public form pages** — progress indicator, inline validation, file uploads
- **Response inbox** — per-form responses with one-click CSV export
- **Live analytics** — response trends, question-level charts, and activity feed
- **Sharing** — public links, QR codes, and share dialogs
- **Email notifications** — notified on new responses (Resend)
- **Authentication** — Google OAuth + email/password via Auth.js (NextAuth v5), with email verification and password reset
- **Plans** — Free (unlimited forms and responses) and Pro (AI features, branding removal)
- **Rate limiting** — per-IP windows for signup, submissions, and AI calls

## Tech Stack

| Layer | Tech |
| --- | --- |
| Web app | Next.js 15 (App Router), React 18, Tailwind CSS 4, shadcn-style Radix UI |
| API | Express 5, tRPC 11, Zod, OpenAPI docs (Scalar) |
| Database | MongoDB Atlas with Mongoose (schemas/indexes created lazily — no migrations) |
| Auth | Auth.js / NextAuth v5, bcryptjs password hashing |
| AI | OpenAI-compatible API (works with OpenAI or Google Gemini) |
| Email | Resend |
| Tooling | pnpm workspaces, Turborepo, TypeScript |

## Monorepo Structure

```text
apps/
  api/        Express + tRPC API server (port 8000)
  web/        Next.js App Router web app (port 3000)

packages/
  auth/             Auth.js configuration and handlers
  database/         Mongoose models and connection
  services/         Business logic: auth, forms, AI, notifications, users
  trpc/             Routers, context, and procedures (public / protected / pro)
  ui/               Shared UI utilities
  validators/       Shared Zod schemas and env validation
  logger/           Shared logger
  eslint-config/    Shared ESLint configs
  typescript-config/ Shared tsconfig presets
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9 (`corepack enable` will pick up the pinned version)

### Install

```bash
pnpm install
```

### Environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Or run `./setup.sh`, which copies `.env.example` to `.env` if missing and links it into every `apps/*` and `packages/*` workspace.

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth app credentials |
| `AUTH_SECRET` | Secret for Auth.js — generate with `openssl rand -base64 32` |
| `AUTH_URL` / `NEXTAUTH_URL` | Web app URL (`http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` / `BASE_URL` | API URL (`http://localhost:8000`) |
| `WEB_URL` | Web app origin used for CORS |
| `PORT` | API port (default `8000`) |
| `AI_API_KEY` | API key for AI features (OpenAI or Google AI Studio) |
| `AI_BASE_URL` | OpenAI-compatible base URL (defaults to Gemini's endpoint) |
| `AI_MODEL` | Model name (default `gemini-3.7-flash`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Resend credentials for response notifications |

## Development

Run both the web app and the API with Turborepo:

```bash
pnpm dev
```

- Web app: <http://localhost:3000>
- API: <http://localhost:8000>
- Health check: <http://localhost:8000/health>
- OpenAPI docs (dev only): <http://localhost:8000/docs>

Other root scripts:

```bash
pnpm build        # build all workspaces
pnpm lint         # lint all workspaces
pnpm check-types  # typecheck all workspaces
```

## Database

Create a free MongoDB Atlas cluster and put the connection string in `MONGODB_URI`. No migrations are needed — Mongoose schemas and indexes are defined in code and created lazily on first use. Models live in `packages/database/models/`:

- `users`
- `forms` (fields embedded)
- `responses` (answers embedded)

All document ids are UUID strings to keep the API contract stable.

## API

The API is an Express server exposing a tRPC router at `/trpc` (and an OpenAPI-compatible surface at `/api`). Routers live in `packages/trpc/server/routes/`:

- **auth** — `providers`, `signup`, `me`, `upgradeToPro`
- **forms** — `create`, `update`, `delete`, `publish`, `unpublish`, `getById`, `getAllMine`, `getBySlug` (public), `submit` (public), `getResponses`, `getAnalytics`, `activity`, `generateWithAI` (Pro), `summarizeResponses` (Pro)
- **health** — `getHealth`

Procedures are gated with `publicProcedure`, `protectedProcedure`, and `proProcedure`.

## Auth Flow

```text
Landing page -> Signup / Login -> Protected dashboard
```

Supported methods:

- Google OAuth
- Email/password (bcryptjs-hashed)

Unauthenticated users are redirected to `/login`. Google Cloud Console callback URLs:

```text
http://localhost:3000/api/auth/callback/google
https://your-domain.com/api/auth/callback/google
```

## Deployment

The API and web app can be deployed to any Node host (e.g. Vercel for the web app, a container for the API). Set the same environment variables from `.env.example` on each service. MongoDB Atlas handles the database — no Docker/Postgres required.
