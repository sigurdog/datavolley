"use client";

import { useState } from "react";
import { lineupComplete } from "@/lib/engine/state";
import { useT } from "@/lib/i18n/context";
import type { Lineup, Player, SetRecord, Side, Team } from "@/lib/types";

const EMPTY: Lineup = { positions: [null, null, null, null, null, null], libero: null };

export function LineupForm({
  setNumber,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  previous,
  suggestedFirstServer,
  onSubmit,
  busy,
  error,
}: {
  setNumber: number;
  homeTeam: Team;
  awayTeam: Team;
  homePlayers: Player[];
  awayPlayers: Player[];
  previous: SetRecord | null;
  suggestedFirstServer: Side;
  onSubmit: (v: { firstServer: Side; homeLineup: Lineup; awayLineup: Lineup }) => void;
  busy: boolean;
  error: string | null;
}) {
  const { t } = useT();
  const [firstServer, setFirstServer] = useState<Side>(suggestedFirstServer);
  const [home, setHome] = useState<Lineup>(previous?.home_lineup ?? EMPTY);
  const [away, setAway] = useState<Lineup>(previous?.away_lineup ?? EMPTY);

  const valid = lineupComplete(home) && lineupComplete(away);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ firstServer, homeLineup: home, awayLineup: away });
      }}
    >
      <div>
        <h1 className="text-2xl font-bold">{t("lineup_title", { n: setNumber })}</h1>
        <p className="text-sm text-muted">{t("lineup_help")}</p>
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <span className="font-medium">{t("lineup_firstServer")}:</span>
        {(["home", "away"] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFirstServer(s)}
            className={`btn ${firstServer === s ? (s === "home" ? "bg-home-soft border-home" : "bg-away-soft border-away") : ""}`}
          >
            {s === "home" ? homeTeam.name : awayTeam.name}
          </button>
        ))}
        {previous && (
          <button
            type="button"
            className="btn ml-auto text-sm"
            onClick={() => {
              setHome(previous.home_lineup);
              setAway(previous.away_lineup);
            }}
          >
            {t("lineup_copyPrevious")}
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TeamLineup side="home" team={homeTeam} players={homePlayers} value={home} onChange={setHome} />
        <TeamLineup side="away" team={awayTeam} players={awayPlayers} value={away} onChange={setAway} />
      </div>

      {!valid && <p className="text-sm text-muted">{t("lineup_incomplete")}</p>}
      {error && <p className="text-sm text-bad">{error}</p>}
      <div>
        <button className="btn btn-primary" type="submit" disabled={!valid || busy}>
          {t("lineup_start")}
        </button>
      </div>
    </form>
  );
}

function TeamLineup({
  side,
  team,
  players,
  value,
  onChange,
}: {
  side: Side;
  team: Team;
  players: Player[];
  value: Lineup;
  onChange: (l: Lineup) => void;
}) {
  const { t } = useT();
  const used = new Set([...value.positions, value.libero].filter(Boolean));

  const select = (current: string | null, set: (id: string | null) => void) => (
    <select className="input" value={current ?? ""} onChange={(e) => set(e.target.value || null)}>
      <option value="">–</option>
      {players.map((p) => (
        <option key={p.id} value={p.id} disabled={used.has(p.id) && p.id !== current}>
          {p.number}
          {p.name ? ` ${p.name}` : ""}
        </option>
      ))}
    </select>
  );

  // Court layout: front row 4-3-2, back row 5-6-1 (net at the top).
  const order = [4, 3, 2, 5, 6, 1];

  return (
    <div className={`card border-t-4 ${side === "home" ? "border-t-home" : "border-t-away"}`}>
      <h2 className="mb-3 font-semibold">{team.name}</h2>
      <div className="grid grid-cols-3 gap-2">
        {order.map((pos) => (
          <label key={pos} className="flex flex-col gap-1 text-xs text-muted">
            {t("lineup_position", { n: pos })}
            {select(value.positions[pos - 1], (id) => {
              const positions = [...value.positions];
              positions[pos - 1] = id;
              onChange({ ...value, positions });
            })}
          </label>
        ))}
      </div>
      <label className="mt-3 flex flex-col gap-1 text-xs text-muted">
        {t("lineup_libero")}
        {select(value.libero, (id) => onChange({ ...value, libero: id }))}
      </label>
    </div>
  );
}
