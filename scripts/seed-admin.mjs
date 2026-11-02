#!/usr/bin/env node
/**
 * Creates a local development admin user in Supabase so you can log in with
 * username "admin" and password "admin" without confirming an email.
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (Project Settings -> API -> service_role, keep secret)
 *
 * Writes DEV_ADMIN_ENABLED / DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD to .env.local
 * if they are missing. Run with:  npm run seed:admin
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("No .env.local found. Copy .env.example to .env.local first.");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || url.includes("your-project-ref")) {
  console.error("NEXT_PUBLIC_SUPABASE_URL in .env.local is still the placeholder.");
  process.exit(1);
}
if (!serviceKey) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY is missing in .env.local.\n" +
      "Copy it from Supabase -> Project Settings -> API -> service_role (secret).",
  );
  process.exit(1);
}

const email = env.DEV_ADMIN_EMAIL || "admin@datavolley.local";
const password = env.DEV_ADMIN_PASSWORD || randomBytes(18).toString("base64url");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// Find existing user by email (paginate; dev projects are small).
let existing = null;
for (let page = 1; page <= 20 && !existing; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("listUsers failed:", error.message);
    process.exit(1);
  }
  existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (data.users.length < 200) break;
}

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("updateUser failed:", error.message);
    process.exit(1);
  }
  console.log(`Updated existing admin user ${email}`);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "dev-admin" },
  });
  if (error) {
    console.error("createUser failed:", error.message);
    process.exit(1);
  }
  console.log(`Created admin user ${email}`);
}

// Persist the dev admin settings so the login form can use them.
let content = readFileSync(envPath, "utf8");
const setVar = (k, v) => {
  const re = new RegExp(`^${k}=.*$`, "m");
  if (re.test(content)) content = content.replace(re, `${k}=${v}`);
  else content += `${content.endsWith("\n") || content === "" ? "" : "\n"}${k}=${v}\n`;
};
setVar("DEV_ADMIN_ENABLED", "true");
setVar("DEV_ADMIN_EMAIL", email);
setVar("DEV_ADMIN_PASSWORD", password);
writeFileSync(envPath, content);

console.log("\nDone. Restart `npm run dev`, then log in with username: admin  password: admin");
