"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { devAdminLogin } from "@/app/actions/auth";
import { useT } from "@/lib/i18n/context";
import { LocaleToggle } from "./LocaleToggle";

export function AuthForm({ mode, devAdmin = false }: { mode: "login" | "signup"; devAdmin?: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();

    if (mode === "login") {
      // Dev-only: username "admin" (no @) goes through the server-side shortcut.
      if (devAdmin && !email.includes("@")) {
        const res = await devAdminLogin(email, password);
        if (res.error) {
          setError(res.error);
          setBusy(false);
          return;
        }
        router.replace(params.get("next") || "/dashboard");
        router.refresh();
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      router.replace(params.get("next") || "/dashboard");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    setInfo(t("auth_checkEmail"));
    setBusy(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("appName")}</h1>
          <p className="text-sm text-muted">{t("tagline")}</p>
        </div>
        <LocaleToggle />
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          {t("auth_email")}
          <input
            className="input"
            type={devAdmin && mode === "login" ? "text" : "email"}
            autoComplete={devAdmin && mode === "login" ? "username" : "email"}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("auth_password")}
          <input
            className="input"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? t("auth_minPassword") : undefined}
          />
        </label>
        {error && <p className="text-sm text-bad">{error}</p>}
        {info && <p className="text-sm text-good">{info}</p>}
        <button className="btn btn-primary" disabled={busy} type="submit">
          {mode === "login" ? t("auth_login") : t("auth_signup")}
        </button>
        {devAdmin && mode === "login" && (
          <p className="text-xs text-muted">{t("auth_devAdminHint")}</p>
        )}
      </form>

      <p className="text-center text-sm text-muted">
        {mode === "login" ? t("auth_noAccount") : t("auth_haveAccount")}{" "}
        <Link className="font-medium text-accent underline" href={mode === "login" ? "/signup" : "/login"}>
          {mode === "login" ? t("auth_signup") : t("auth_login")}
        </Link>
      </p>
    </main>
  );
}
