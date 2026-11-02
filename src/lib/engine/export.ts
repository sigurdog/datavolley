import type { Player, Rally, Side, Team } from "../types";
import { computeStats, type MatchStats } from "./stats";

export interface ExportContext {
  matchLabel: string;
  teams: Record<Side, Team>;
  players: Record<string, Player>;
  playerSide: Record<string, Side>;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}

function playerLabel(ctx: ExportContext, id: string | null): string {
  if (!id) return "";
  const p = ctx.players[id];
  if (!p) return id;
  return p.name ? `${p.number} ${p.name}` : String(p.number);
}

export function ralliesToCsv(rallies: Rally[], ctx: ExportContext): string {
  const header = [
    "set",
    "rally",
    "serving_team",
    "home_rotation",
    "away_rotation",
    "reception_player",
    "reception_grade",
    "winner",
    "outcome",
    "player",
    "error_type",
    "home_score",
    "away_score",
  ];
  const rows = rallies.map((r) => [
    r.set_number,
    r.seq,
    ctx.teams[r.serving_team].name,
    r.home_rotation + 1,
    r.away_rotation + 1,
    playerLabel(ctx, r.reception_player_id),
    r.reception_grade ?? "",
    ctx.teams[r.winner].name,
    r.outcome,
    playerLabel(ctx, r.player_id),
    r.error_type ?? "",
    r.home_score,
    r.away_score,
  ]);
  return csv([header, ...rows]);
}

export function statsToCsv(stats: MatchStats, ctx: ExportContext): string {
  const header = [
    "team",
    "number",
    "name",
    "points",
    "aces",
    "kills",
    "blocks",
    "errors",
    "err_serve",
    "err_attack",
    "err_net",
    "err_handling",
    "err_rotation",
    "err_other",
    "rec_total",
    "rec_perfect",
    "rec_ok",
    "rec_bad",
    "rec_error",
  ];
  const rows = Object.values(stats.players)
    .sort((a, b) => {
      if (a.side !== b.side) return a.side === "home" ? -1 : 1;
      return (ctx.players[a.playerId]?.number ?? 0) - (ctx.players[b.playerId]?.number ?? 0);
    })
    .map((p) => {
      const pl = ctx.players[p.playerId];
      return [
        ctx.teams[p.side].name,
        pl?.number ?? "",
        pl?.name ?? "",
        p.points,
        p.aces,
        p.kills,
        p.blocks,
        p.errors,
        p.errorsByType.serve,
        p.errorsByType.attack,
        p.errorsByType.net,
        p.errorsByType.handling,
        p.errorsByType.rotation,
        p.errorsByType.other,
        p.reception.total,
        p.reception.perfect,
        p.reception.ok,
        p.reception.bad,
        p.reception.error,
      ];
    });
  return csv([header, ...rows]);
}

export function matchToJson(rallies: Rally[], ctx: ExportContext): string {
  const stats = computeStats(rallies, ctx.playerSide);
  return JSON.stringify(
    {
      match: ctx.matchLabel,
      exported_at: new Date().toISOString(),
      teams: ctx.teams,
      players: Object.values(ctx.players),
      rallies,
      stats,
    },
    null,
    2,
  );
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
