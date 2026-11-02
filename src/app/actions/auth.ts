"use server";

import { redirect } from "next/navigation";
import { devAdminEnabled } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Development-only shortcut: "admin" / "admin" signs in as the seeded dev
 * admin user. Disabled in production builds and when DEV_ADMIN_ENABLED is not
 * "true". See scripts/seed-admin.mjs.
 */
export async function devAdminLogin(
  username: string,
  password: string,
): Promise<{ error?: string }> {
  if (!devAdminEnabled()) return { error: "Dev admin login is not enabled" };
  if (username.trim().toLowerCase() !== "admin" || password !== "admin") {
    return { error: "Invalid login credentials" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.DEV_ADMIN_EMAIL!,
    password: process.env.DEV_ADMIN_PASSWORD!,
  });
  if (error) return { error: `${error.message} (run: npm run seed:admin)` };
  return {};
}
