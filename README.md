# PairEval

> A university student-evaluation system built on pairwise comparison.

Instead of scoring each submission on an absolute scale, PairEval asks reviewers a simpler question: **“which of these two is better?”** These pairwise judgments are aggregated into consistent, objective rankings — reducing bias and grading fatigue.

- **Production:** https://sdpx-ultrasmooth.vercel.app
- **Staging:** https://sdpx-ultrasmooth-s1ux.vercel.app/

## Project Status

PairEval is currently an early landing-page scaffold. The repository is transitioning from its original Pages Router scaffold to the App Router architecture described below. Authentication, persistence, comparison workflows, ranking logic, and reviewer dashboards are planned capabilities and are not implemented yet.

## Tech Stack

| Layer | Choice | Status |
| --- | --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 App Router | Migration target |
| Language | TypeScript | Installed |
| Styling | Tailwind CSS v4 | Installed |
| Backend | Next.js Route Handlers and server-side modules | Planned |
| Database | PostgreSQL on [Supabase](https://supabase.com) with Drizzle ORM | Planned |
| Auth | Better Auth with Google OAuth | Planned |
| Server state | TanStack Query | Planned |
| Client state | Jotai | Planned |
| Utilities | Remeda | Planned |
| Deployment | [Vercel](https://vercel.com) | Active |

Only Next.js, React, TypeScript, and Tailwind CSS are currently installed. Planned libraries will be added when their corresponding features are implemented.

## Getting Started

Install [Bun](https://bun.sh) before starting; `bun.lock` is the canonical lockfile.

```bash
# 1. Install dependencies
bun install --frozen-lockfile

# 2. Run the development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

The current landing page does not require application environment variables. Database and authentication variables will be documented in `.env.example` when those integrations are implemented. Never commit real credentials.

## Scripts

| Command | Description |
| --- | --- |
| `bun dev` | Start the development server |
| `bun run build` | Build for production |
| `bun run start` | Run the production build |

No lint or automated test scripts are configured yet.

## App Router Migration

New product routes belong in `src/app`. The current landing page remains under `src/pages` until it is migrated and verified; do not define the same URL in both routers.

### Current Structure

```text
src/
├── pages/            # Legacy routes during migration
│   ├── _app.tsx      # App wrapper — global CSS & shared providers
│   ├── _document.tsx # Custom HTML document
│   ├── index.tsx     # Landing page
│   └── api/          # Legacy API routes
└── styles/
    └── globals.css   # Tailwind entry & global styles
```

### Target Structure

```text
src/
├── app/                 # App Router routes, layouts, and route handlers
├── components/          # Reusable presentation components
├── features/<feature>/  # Feature-owned UI, queries, state, and domain logic
├── db/                  # Drizzle client, schema, and migrations
├── lib/                 # Shared integrations, including Better Auth
├── pages/               # Removed after route migration is complete
└── styles/              # Global styles
```

Imports use the `#/*` path alias, which maps to `src/*`, for example `import "#/styles/globals.css"`.

## Branching & Contributing

- `main` — stable / production
- `develop` — integration branch for ongoing work

Open feature branches off `develop`, then submit a pull request back into it.
Use Conventional Commits and read all AI-generated code before committing it. See [`AGENTS.md`](AGENTS.md) for architecture rules, quality gates, and the definition of done.

## Team

| Student ID | Name                  |
| ---------- | --------------------- |
| 67015026   | ฉัตรนรินทร บุญแสง       |
| 67015052   | ธนพนธ์ ภูพานทอง        |
| 67015067   | นนทพันธ์ อินทวงศ์       |
| 67015080   | บุณยกร เกตุแก้ว         |
| 67015193   | สิรภพ แสงสุข           |
