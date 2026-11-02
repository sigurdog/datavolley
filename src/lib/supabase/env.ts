export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = supabaseEnv();
  if (!url || !key) return false;
  if (!url.startsWith("http")) return false;
  // Placeholders from .env.example
  if (url.includes("your-project-ref") || key.startsWith("your-")) return false;
  return true;
}

/** Dev-only admin/admin login. Never active in production builds. */
export function devAdminEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_ADMIN_ENABLED === "true" &&
    Boolean(process.env.DEV_ADMIN_EMAIL && process.env.DEV_ADMIN_PASSWORD)
  );
}
