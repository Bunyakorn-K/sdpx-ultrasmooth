export function isAuthConfigured() {
  return (
    !!process.env.DATABASE_URL ||
    !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    )
  );
}
