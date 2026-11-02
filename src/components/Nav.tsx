"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { LocaleToggle } from "./LocaleToggle";
import { signOut } from "@/app/actions/auth";

export function Nav({ email }: { email: string | null }) {
  const { t } = useT();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          {t("appName")}
        </Link>
        <div className="flex items-center gap-3">
          {email && <span className="hidden text-sm text-muted sm:inline">{email}</span>}
          <LocaleToggle />
          <form action={signOut}>
            <button className="btn text-sm" type="submit">
              {t("nav_signOut")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
