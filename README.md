# AI Marketing Portal — AdMind

A multi-brand, AI-powered marketing strategy and content portal for agencies. Built with **Next.js 16 + Prisma + SQLite (dev) / PostgreSQL (prod)**.

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env — at minimum, set OPENAI_API_KEY

# 3. Run database migrations
npx prisma migrate dev

# 4. Seed the database (creates admin account + sample brand)
npm run db:seed

# 5. Start the dev server
npm run dev
# → Open http://localhost:3000
```

### Default Login (after seed)
| Email | Password | Role |
|---|---|---|
| admin@admind.io | admin123! | Super Admin |

---

## Architecture

```
portal-admind/
├── prisma/
│   ├── schema.prisma       — All data models
│   ├── seed.ts             — Sample data
│   └── migrations/         — DB migrations
├── src/
│   ├── app/
│   │   ├── (auth)/         — Login & Register pages
│   │   ├── (dashboard)/    — All authenticated pages
│   │   │   ├── dashboard/  — Overview page
│   │   │   ├── brands/     — Brand list + creation
│   │   │   │   └── [brandId]/
│   │   │   │       ├── page.tsx         — Brand detail
│   │   │   │       ├── strategy/        — Strategy viewer
│   │   │   │       ├── content/         — 4-week content calendar
│   │   │   │       ├── review/          — Approval queue
│   │   │   │       └── settings/        — Publishing toggle + Meta connection
│   │   │   └── settings/   — Global audit log
│   │   └── api/
│   │       ├── auth/       — NextAuth + register
│   │       ├── brands/     — Brand CRUD + autofill + strategy + content + posts + members
│   │       └── scheduler/  — Cron endpoint for simulated/real publishing
│   ├── lib/
│   │   ├── prisma.ts       — Prisma client singleton
│   │   ├── auth.ts         — NextAuth config
│   │   ├── ai.ts           — AI client (OpenAI / Perplexity compatible) + prompts
│   │   ├── encrypt.ts      — AES-256-GCM for stored credentials
│   │   └── utils.ts        — Role checking, audit logging, safe mode check
│   └── components/
│       ├── ui/             — Button, Input, Card, Badge, Dialog, Switch, Select...
│       └── layout/         — Sidebar
```

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Components) |
| Auth | NextAuth.js v5 (beta) with Credentials provider |
| Database (dev) | SQLite via Prisma |
| Database (prod) | PostgreSQL (Supabase / Railway / Render) |
| ORM | Prisma 6 |
| AI | OpenAI API (gpt-4o-mini) or Perplexity (OpenAI-compatible) |
| Web Scraping | Axios + Cheerio (HTML parsing) + AI extraction |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI primitives + custom CVA components |
| Encryption | Node.js `crypto` AES-256-GCM |

---

## Environment Variables

See `.env` for all variables. Key ones:

```env
# Database
DATABASE_URL="file:./dev.db"              # Dev: SQLite
# DATABASE_URL="postgresql://..."          # Prod: Postgres

# Auth (generate with: openssl rand -hex 32)
AUTH_SECRET="your-secret-here"

# AI
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"
# Or use Perplexity:
# AI_PROVIDER="perplexity"
# PERPLEXITY_API_KEY="pplx-..."

# Meta (only needed when enabling real publishing)
META_APP_ID=""
META_APP_SECRET=""

# Google Ads (only needed when enabling real publishing)
GOOGLE_ADS_DEVELOPER_TOKEN=""

# Notifications
RESEND_API_KEY=""
SLACK_WEBHOOK_URL=""

# Scheduler auth
SCHEDULER_SECRET="your-scheduler-secret"

# Credential encryption (32-byte hex: openssl rand -hex 32)
ENCRYPTION_KEY="..."
```

---

## User Roles

| Role | Capabilities |
|---|---|
| **Super Admin** | Access all brands, all settings, toggle publishing mode |
| **Admin** (per brand) | Manage team members, toggle publishing mode for that brand |
| **Brand Manager** | Approve/reject posts, schedule, view strategy |
| **Creator** | Generate content, view calendar (cannot approve or schedule) |

---

## Safety Architecture

### Draft Only Mode (default for ALL brands)
- Portal creates strategies, captions, image prompts, Google Ads copy ✅
- Scheduler **simulates** publish: writes a `PublishRecord` with `mode=SIMULATED` and logs the payload ✅
- **Zero** calls to Meta Graph API or Google Ads API that change state ✅

### Real Publishing Mode (explicit opt-in per brand)
To enable:
1. Admin goes to **Brand Settings → Publishing Mode**
2. Flips the switch and confirms the warning dialog
3. Sets Meta Page ID + access token

After enabling:
- Scheduler calls `POST /{pageId}/feed` for Facebook posts
- Scheduler calls Instagram Media Container + Publish flow for IG posts  
- Google Ads: exports structured JSON assets; creates **paused/draft** campaigns only — never auto-enables

Every real publish attempt is logged in `AuditLog` with `PUBLISH_REAL_ATTEMPT`.

---

## Running the Scheduler

The scheduler is a simple HTTP endpoint at `GET /api/scheduler?secret=SCHEDULER_SECRET`.

Options:
1. **Vercel Cron** — add to `vercel.json`:
```json
{
  "crons": [{ "path": "/api/scheduler?secret=xxx", "schedule": "* * * * *" }]
}
```
2. **GitHub Actions** — trigger every minute via workflow
3. **Any cron service** — call the URL every minute

---

## Switching to PostgreSQL (Production)

1. Change `DATABASE_URL` in `.env` to your Postgres URL
2. Change `provider = "sqlite"` → `provider = "postgresql"` in `prisma/schema.prisma`
3. Run `npx prisma migrate dev` to apply schema to Postgres

---

## Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:seed      # Seed sample data
npm run db:studio    # Open Prisma Studio (DB browser)
npm run db:migrate   # Apply schema changes
npm run db:reset     # Reset DB (WARNING: deletes all data)
```

---

## AI Prompts

See `PROMPTS.md` for all AI prompt templates used for:
- Website scraping & brand extraction
- Marketing strategy generation  
- 4-week content plan generation
- Post revision (after rejection)
