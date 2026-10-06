# PairEval

> A university student-evaluation system built on pairwise comparison.

Instead of scoring each submission on an absolute scale, PairEval asks reviewers a simpler question: **“which of these two is better?”** These pairwise judgments are aggregated into consistent, objective rankings — reducing bias and grading fatigue.

- **Production:** https://sdpx-ultrasmooth.vercel.app
- **Staging:** Separate Vercel project pending; its URL must be set as the GitHub `STAGING_URL` variable.

## Project Status

PairEval now uses the App Router for every route. The landing page and demo flow are available, alongside early database-backed classroom and evaluation flows. Sign-in still uses a development cookie stub; Better Auth and Google OAuth are planned.

## Tech Stack

| Layer | Choice | Status |
| --- | --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 App Router | Active |
| Language | TypeScript | Installed |
| Styling | Tailwind CSS v4 | Installed |
| Backend | Next.js Route Handlers and server-side modules | Active |
| Database | PostgreSQL with Drizzle ORM; Supabase hosting is a deployment target | Active locally |
| Auth | Better Auth with Google OAuth | Planned |
| Server state | TanStack Query | Planned |
| Client state | Jotai | Planned |
| Utilities | Remeda | Planned |
| Deployment | [Vercel](https://vercel.com) | Active |

See `package.json` and `bun.lock` for installed libraries. Planned libraries will be added when their corresponding features are implemented.

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

The landing page does not need environment variables. Database-backed routes require `DATABASE_URL`; see `.env.example` for placeholders. Never commit real credentials.

## Scripts

| Command | Description |
| --- | --- |
| `bun dev` | Start the development server |
| `bun run build` | Build for production |
| `bun run start` | Run the production build |

Run `bun run lint`, `bun run test`, `bun run test:coverage`, and `bun run test:e2e` for the current quality gates.

## App Router

All application routes, including the landing page at `/`, live in `src/app`.
The interactive landing page is in `src/features/home`; the legacy demo flow
uses client components in `src/features/demo`. The root layout imports
`src/styles/globals.css`.

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
