# PairEval

> ระบบประเมินผลนักศึกษาแบบ Pairwise Comparison — a university student-evaluation system built on pairwise comparison.

Instead of scoring each submission on an absolute scale, PairEval asks reviewers a simpler question: **“which of these two is better?”** These pairwise judgments are aggregated into consistent, objective rankings — reducing bias and grading fatigue.

**Live:** https://sdpx-ultrasmooth.vercel.app

## Tech Stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | [Next.js](https://nextjs.org) 16 (Pages Router)    |
| Language   | TypeScript                                         |
| Styling    | Tailwind CSS v4                                     |
| Backend    | Next.js API Routes (`src/pages/api`)               |
| Database   | PostgreSQL via [Supabase](https://supabase.com)    |
| Auth       | Google OAuth (Supabase Auth)                       |
| Deployment | [Vercel](https://vercel.com)                       |

## Getting Started

Requires [Node.js](https://nodejs.org) 20+ and [Bun](https://bun.sh) (the repo uses `bun.lock`).

```bash
# 1. Install dependencies
bun install

# 2. Set up environment variables
cp .env.example .env.local   # then fill in the values below

# 3. Run the dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

Create a `.env.local` file with your Supabase project credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Scripts

| Command     | Description                          |
| ----------- | ----------------------------------- |
| `bun dev`   | Start the development server        |
| `bun run build` | Build for production            |
| `bun start` | Run the production build            |

## Project Structure

```
src/
├── pages/            # Routes (Pages Router)
│   ├── _app.tsx      # App wrapper — global CSS & shared providers
│   ├── _document.tsx # Custom HTML document
│   ├── index.tsx     # Landing page
│   └── api/          # API routes (→ /api/*)
└── styles/
    └── globals.css   # Tailwind entry & global styles
```

Imports use the `#/*` path alias, which maps to `src/*` (e.g. `import "#/styles/globals.css"`).

## Branching & Contributing

- `main` — stable / production
- `develop` — integration branch for ongoing work

Open feature branches off `develop`, then submit a pull request back into it.
All AI-generated code must be read and understood before it is committed.

## Team

| Student ID | Name                  |
| ---------- | --------------------- |
| 67015026   | ฉัตรนรินทร บุญแสง       |
| 67015052   | ธนพนธ์ ภูพานทอง        |
| 67015067   | นนทพันธ์ อินทวงศ์       |
| 67015080   | บุณยกร เกตุแก้ว         |
| 67015193   | สิรภพ แสงสุข           |
