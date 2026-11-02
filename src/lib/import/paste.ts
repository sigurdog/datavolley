import type { ImportedPlayer } from "./types";

/**
 * Parse a pasted roster. Accepts one player per line in any of these shapes:
 *   14 Ola Nordmann
 *   14, Ola Nordmann
 *   14;Ola Nordmann
 *   14<TAB>Ola Nordmann
 *   Ola Nordmann 14
 *   14
 * Lines without a number are ignored. Duplicate numbers keep the first entry.
 */
export function parsePastedRoster(text: string): ImportedPlayer[] {
  const out: ImportedPlayer[] = [];
  const seen = new Set<number>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/[\t;,]+/g, " ").trim();
    if (!line) continue;

    let number: number | null = null;
    let name = "";

    const lead = line.match(/^#?(\d{1,2})\b\s*(.*)$/);
    const trail = line.match(/^(.*?)\s*#?(\d{1,2})$/);

    if (lead) {
      number = Number(lead[1]);
      name = lead[2].trim();
    } else if (trail) {
      number = Number(trail[2]);
      name = trail[1].trim();
    }

    if (number === null || Number.isNaN(number) || seen.has(number)) continue;
    seen.add(number);
    out.push({ number, name: name.replace(/^[-–:]\s*/, "").trim() });
  }

  return out.sort((a, b) => a.number - b.number);
}
