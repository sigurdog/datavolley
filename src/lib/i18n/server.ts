import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./dictionaries";

const LOCALE_COOKIE = "dv_locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return (LOCALES as string[]).includes(v ?? "") ? (v as Locale) : DEFAULT_LOCALE;
}
