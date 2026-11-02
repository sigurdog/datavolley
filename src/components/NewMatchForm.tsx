"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createMatch } from "@/app/actions/matches";
import { useT } from "@/lib/i18n/context";
import type { Club, Player, Team } from "@/lib/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function NewMatchForm({ club, teams, players }: { club: Club; teams: Team[]; players: Player[] }) {
  const { t } = useT();
  const router = useRouter();
  const own = teams.filter((tm) => !tm.is_opponent);
  const [homeId, setHomeId] = useState(own[0]?.id ?? teams[0]?.id ?? "");
  const [awayId, setAwayId] = useState(teams.find((tm) => tm.id !== (own[0]?.id ?? teams[0]?.id))?.id ?? "");
  const [playedAt, setPlayedAt] = useState(today());
  const [venue, setVenue] = useState("");
  const [trackReception, setTrackReception] = useState(true);
  const [setsToWin, setSetsToWin] = useState(3);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const squadTeams = useMemo(
    () => [homeId, awayId].filter(Boolean).map((id) => teams.find((tm) => tm.id === id)!).filter(Boolean),
    [homeId, awayId, teams],
  );

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const valid = homeId && awayId && homeId !== awayId;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) {
          setError(t("match_selectTeams"));
          return;
        }
        setError(null);
        const squad = players
          .filter((p) => (p.team_id === homeId || p.team_id === awayId) && !excluded.has(p.id))
          .map((p) => p.id);
        start(async () => {
          const res = await createMatch({
            clubId: club.id,
            homeTeamId: homeId,
            awayTeamId: awayId,
            playedAt,
            venue,
            trackReception,
            setsToWin,
            squadPlayerIds: squad,
          });
          if (res.error) setError(res.error);
          else router.push(`/matches/${res.matchId}`);
        });
      }}
    >
      <div>
        <Link href="/dashboard" className="text-sm text-muted hover:underline">
          ← {t("nav_dashboard")}
        </Link>
        <h1 className="text-2xl font-bold">{t("match_new")}</h1>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          {t("match_home")}
          <select className="input" value={homeId} onChange={(e) => setHomeId(e.target.value)}>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("match_away")}
          <select className="input" value={awayId} onChange={(e) => setAwayId(e.target.value)}>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("match_date")}
          <input className="input" type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("match_venue")}
          <input className="input" value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("match_format")}
          <select className="input" value={setsToWin} onChange={(e) => setSetsToWin(Number(e.target.value))}>
            <option value={3}>{t("match_bestOf5")}</option>
            <option value={2}>{t("match_bestOf3")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={trackReception} onChange={(e) => setTrackReception(e.target.checked)} />
            {t("match_trackReception")}
          </span>
          <span className="text-xs text-muted">{t("match_trackReceptionHelp")}</span>
        </label>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("match_squad")}</h2>
        <p className="text-sm text-muted">{t("match_squadHelp")}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {squadTeams.map((tm) => {
            const list = players.filter((p) => p.team_id === tm.id);
            return (
              <div key={tm.id} className="card">
                <h3 className="mb-2 font-semibold">{tm.name}</h3>
                {list.length === 0 ? (
                  <p className="text-sm text-muted">
                    {t("team_noPlayers")}{" "}
                    <Link className="text-accent underline" href={`/teams/${tm.id}`}>
                      {t("team_roster")}
                    </Link>
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {list.map((p) => (
                      <li key={p.id}>
                        <label className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-surface-2">
                          <input type="checkbox" checked={!excluded.has(p.id)} onChange={() => toggle(p.id)} />
                          <span className="w-6 text-right font-mono font-semibold">{p.number}</span>
                          <span className="truncate text-muted">{p.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {error && <p className="text-sm text-bad">{error}</p>}
      <div>
        <button className="btn btn-primary" disabled={pending || !valid} type="submit">
          {t("match_create")}
        </button>
      </div>
    </form>
  );
}
