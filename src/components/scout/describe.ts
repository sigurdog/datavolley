import type { TKey } from "@/lib/i18n/dictionaries";
import type { Player, Rally, Side, Team } from "@/lib/types";

export function playerLabel(players: Record<string, Player>, id: string | null): string {
  if (!id) return "";
  const p = players[id];
  return p ? `#${p.number}` : "?";
}

export function describeRally(
  r: Rally,
  players: Record<string, Player>,
  teams: Record<Side, Team>,
  t: (k: TKey, v?: Record<string, string | number>) => string,
): string {
  const team = teams[r.winner].short_name ?? teams[r.winner].name;
  const who = playerLabel(players, r.player_id);
  let how: string;
  switch (r.outcome) {
    case "ace":
      how = `${t("outcome_ace")} ${who}`;
      break;
    case "kill":
      how = `${t("outcome_kill")} ${who}`;
      break;
    case "block":
      how = `${t("outcome_block")} ${who}`;
      break;
    case "error":
      how = `${t("outcome_error")}: ${t(`err_${r.error_type ?? "other"}` as TKey)} ${who}`;
      break;
  }
  const rec =
    r.reception_grade && r.reception_grade !== "error"
      ? ` · ${t(`grade_${r.reception_grade}` as TKey)} ${playerLabel(players, r.reception_player_id)}`
      : "";
  return `${r.home_score}–${r.away_score} ${team}: ${how.trim()}${rec}`;
}
