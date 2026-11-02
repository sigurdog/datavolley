"use client";

import { useT } from "@/lib/i18n/context";

export function LocaleToggle() {
  const { locale, setLocale } = useT();
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-border text-sm">
      {(["nb", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 font-medium uppercase ${
            locale === l ? "bg-accent text-white" : "bg-surface text-muted"
          }`}
          aria-pressed={locale === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
