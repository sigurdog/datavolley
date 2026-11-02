"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { downloadText, matchToJson, ralliesToCsv, statsToCsv, type ExportContext } from "@/lib/engine/export";
import { computeMatchSummary, rulesFromMatch } from "@/lib/engine/state";
import { computeStats, pct, positiveReceptionPct, type PlayerStats, type TeamStats } from "@/lib/engine/stats";
import { useT } from "@/lib/i18n/context";
import type { TKey } from "@/lib/i18n/dictionaries";
import { ERROR_TYPES, type Player, type Side } from "@/lib/types";
import type { MatchBundle } from "@/lib/loadMatch";

export function StatsView({ match, homeTeam, awayTeam, homePlayers, awayPlayers, sets, rallies }: MatchBundle) {
  const { t } = useT();
  const [setFilter, setSetFilter] = useState<number | null>(null);

  const players = useMemo(
    () => Object.fromEntries([...homePlayers, ...awayPlayers].map((p) => [p.id, p])),
    [homePlayers, awayPlayers],
  );
  const playerSide = useMemo(() => {
    const m: Record<string, Side> = {};
    for (const p of homePlayers) m[p.id] = "home";
    for (const p of awayPlayers) m[p.id] = "away";
    return m;
  }, [homePlayers, awayPlayers]);

  const rules = rulesFromMatch(match);
  const summary = useMemo(() => computeMatchSummary(sets, rallies, rules), [sets, rallies, rules]);
  const stats = useMemo(() => computeStats(rallies, playerSide, setFilter), [rallies, playerSide, setFilter]);
  const teams = { home: homeTeam, away: awayTeam };

  const ctx: ExportContext = {
    matchLabel: `${homeTeam.name} vs ${awayTeam.name} ${match.played_at}`,
    teams,
    players,
    playerSide,
  };
  const base = `${match.played_at}_${homeTeam.short_name ?? homeTeam.name}_${awayTeam.short_name ?? awayTeam.name}`
    .replace(/[^\w.-]+/g, "_");

  const setNumbers = sets.map((s) => s.set_number);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/matches/${match.id}`} className="text-sm text-muted hover:underline">
            ← {t("scout_back")}
          </Link>
          <h1 className="text-2xl font-bold">
            {homeTeam.name} <span className="font-mono">{summary.homeSets}–{summary.awaySets}</span> {awayTeam.name}
          </h1>
          <p className="text-sm text-muted">
            {setNumbers.map((n) => `${summary.sets[n].home}–${summary.sets[n].away}`).join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn text-sm" onClick={() => downloadText(`${base}_rallies.csv`, ralliesToCsv(rallies, ctx), "text/csv")}>
            {t("stats_exportRallies")}
          </button>
          <button className="btn text-sm" onClick={() => downloadText(`${base}_stats.csv`, statsToCsv(computeStats(rallies, playerSide), ctx), "text/csv")}>
            {t("stats_exportStats")}
          </button>
          <button className="btn text-sm" onClick={() => downloadText(`${base}.json`, matchToJson(rallies, ctx), "application/json")}>
            {t("stats_exportJson")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={setFilter === null} onClick={() => setSetFilter(null)}>
          {t("stats_allSets")}
        </FilterChip>
        {setNumbers.map((n) => (
          <FilterChip key={n} active={setFilter === n} onClick={() => setSetFilter(n)}>
            {t("stats_set", { n })}
          </FilterChip>
        ))}
      </div>

      {stats.rallies === 0 ? (
        <p className="text-muted">{t("stats_noData")}</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TeamCard side="home" name={homeTeam.name} ts={stats.teams.home} />
            <TeamCard side="away" name={awayTeam.name} ts={stats.teams.away} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PlayerTable side="home" name={homeTeam.name} list={homePlayers} stats={stats.players} />
            <PlayerTable side="away" name={awayTeam.name} list={awayPlayers} stats={stats.players} />
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-white" : "border-border bg-surface"}`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col rounded-lg bg-surface-2 px-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-mono text-lg font-semibold">{value}</span>
    </div>
  );
}

function TeamCard({ side, name, ts }: { side: Side; name: string; ts: TeamStats }) {
  const { t } = useT();
  return (
    <section className={`card border-t-4 ${side === "home" ? "border-t-home" : "border-t-away"}`}>
      <h2 className="mb-3 font-semibold">{name}</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <Stat label={t("stats_points")} value={ts.points} />
        <Stat label={t("stats_sideout")} value={`${pct(ts.sideoutWon, ts.sideoutTotal)} (${ts.sideoutWon}/${ts.sideoutTotal})`} />
        <Stat label={t("stats_break")} value={`${pct(ts.breakWon, ts.breakTotal)} (${ts.breakWon}/${ts.breakTotal})`} />
        <Stat label={t("stats_recPositive")} value={positiveReceptionPct(ts.reception)} />
        <Stat label={t("stats_aces")} value={ts.aces} />
        <Stat label={t("stats_kills")} value={ts.kills} />
        <Stat label={t("stats_blocks")} value={ts.blocks} />
        <Stat label={t("stats_oppErrors")} value={ts.opponentErrors} />
        <Stat label={t("stats_errors")} value={ts.errors} />
      </div>

      <h3 className="mb-1 mt-4 text-sm font-semibold text-muted">{t("stats_errorsByType")}</h3>
      <div className="flex flex-wrap gap-2 text-sm">
        {ERROR_TYPES.map((e) => (
          <span key={e} className="rounded-full bg-surface-2 px-2 py-0.5">
            {t(`err_${e}` as TKey)}: <span className="font-mono font-semibold">{ts.errorsByType[e]}</span>
          </span>
        ))}
      </div>

      <h3 className="mb-1 mt-4 text-sm font-semibold text-muted">{t("stats_rotation")}</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-muted">
          <tr>
            <th className="py-1">{t("stats_rotation")}</th>
            <th className="py-1 text-right">{t("stats_won")}</th>
            <th className="py-1 text-right">{t("stats_lost")}</th>
            <th className="py-1 text-right">{t("stats_sideout")}</th>
            <th className="py-1 text-right">{t("stats_break")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border font-mono">
          {ts.rotations.map((r) => (
            <tr key={r.rotation}>
              <td className="py-1">R{r.rotation + 1}</td>
              <td className="py-1 text-right">{r.pointsWon}</td>
              <td className="py-1 text-right">{r.pointsLost}</td>
              <td className="py-1 text-right">{pct(r.sideoutWon, r.sideoutTotal)}</td>
              <td className="py-1 text-right">{pct(r.breakWon, r.breakTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PlayerTable({
  side,
  name,
  list,
  stats,
}: {
  side: Side;
  name: string;
  list: Player[];
  stats: Record<string, PlayerStats>;
}) {
  const { t } = useT();
  return (
    <section className={`card overflow-x-auto border-t-4 ${side === "home" ? "border-t-home" : "border-t-away"}`}>
      <h2 className="mb-3 font-semibold">{name}</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-muted">
          <tr>
            <th className="py-1">{t("stats_player")}</th>
            <th className="py-1 text-right">{t("stats_points")}</th>
            <th className="py-1 text-right">{t("stats_aces")}</th>
            <th className="py-1 text-right">{t("stats_kills")}</th>
            <th className="py-1 text-right">{t("stats_blocks")}</th>
            <th className="py-1 text-right">{t("stats_errors")}</th>
            <th className="py-1 text-right">{t("stats_recTotal")}</th>
            <th className="py-1 text-right">{t("stats_recPositive")}</th>
            <th className="py-1 text-right">{t("stats_recErrors")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {list.map((p) => {
            const s = stats[p.id];
            return (
              <tr key={p.id} className={s ? "" : "text-muted"}>
                <td className="py-1">
                  <span className="font-mono font-semibold">{p.number}</span>
                  {p.name && <span className="ml-2 text-muted">{p.name}</span>}
                </td>
                <td className="py-1 text-right font-mono font-semibold">{s?.points ?? 0}</td>
                <td className="py-1 text-right font-mono">{s?.aces ?? 0}</td>
                <td className="py-1 text-right font-mono">{s?.kills ?? 0}</td>
                <td className="py-1 text-right font-mono">{s?.blocks ?? 0}</td>
                <td className="py-1 text-right font-mono">{s?.errors ?? 0}</td>
                <td className="py-1 text-right font-mono">{s?.reception.total ?? 0}</td>
                <td className="py-1 text-right font-mono">{s ? positiveReceptionPct(s.reception) : "–"}</td>
                <td className="py-1 text-right font-mono">{s?.reception.error ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
