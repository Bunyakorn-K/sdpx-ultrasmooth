<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Stack

PairEval is a student evaluation system based on pairwise comparison.

- Use Next.js with the App Router and TypeScript for both the UI and server-side API route handlers.
- Use Tailwind CSS for styling.
- Use PostgreSQL through Supabase for data storage and Google OAuth authentication.
- Use Drizzle ORM for database access and schema migrations.
- Use TanStack Query for server-state fetching and caching, and Jotai for client-side UI state.
- Use Remeda for utility and data-transformation functions.
- Deploy the application on Vercel.
- Review every AI-generated change before committing it; contributors must be able to explain the code they commit.
