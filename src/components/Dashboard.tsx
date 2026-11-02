"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClub } from "@/app/actions/clubs";
import { createTeam, deleteTeam } from "@/app/actions/teams";
import { deleteMatch } from "@/app/actions/matches";
import { useT } from "@/lib/i18n/context";
import type { Club, Match, Team } from "@/lib/types";

export function Dashboard({
  club,
  teams,
  matches,
  playerCounts,
}: {
  club: Club | null;
  teams: Team[];
  matches: Match[];
  playerCounts: Record<string, number>;
}) {
  const { t } = useT();

  if (!club) return <CreateClub />;

  const teamById = Object.fromEntries(teams.map((tm) => [tm.id, tm]));
  const own = teams.filter((tm) => !tm.is_opponent);
  const opp = teams.filter((tm) => tm.is_opponent);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted">{t("dash_title")}</p>
          <h1 className="text-2xl font-bold">{club.name}</h1>
        </div>
        <Link href="/matches/new" className={`btn btn-primary ${teams.length < 2 ? "pointer-events-none opacity-50" : ""}`}>
          {t("dash_newMatch")}
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("dash_matches")}</h2>
        {matches.length === 0 ? (
          <p className="text-muted">{t("dash_noMatches")}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} home={teamById[m.home_team_id]} away={teamById[m.away_team_id]} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("dash_teams")}</h2>
        </div>
        {teams.length === 0 && <p className="text-muted">{t("dash_noTeams")}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <TeamList title={t("dash_ownTeams")} teams={own} playerCounts={playerCounts} />
          <TeamList title={t("dash_opponents")} teams={opp} playerCounts={playerCounts} />
        </div>
        <NewTeam clubId={club.id} />
      </section>
    </div>
  );
}

function MatchRow({ match, home, away }: { match: Match; home?: Team; away?: Team }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const statusKey = `dash_status_${match.status}` as const;
  const statusColor =
    match.status === "live" ? "text-good" : match.status === "finished" ? "text-muted" : "text-mid";

  return (
    <li className="card flex items-center justify-between gap-3">
      <Link href={`/matches/${match.id}`} className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">
          {home?.name ?? "?"} <span className="text-muted">{t("common_vs")}</span> {away?.name ?? "?"}
        </span>
        <span className="text-sm text-muted">
          {match.played_at}
          {match.venue ? ` · ${match.venue}` : ""} ·{" "}
          <span className={statusColor}>{t(statusKey)}</span>
        </span>
      </Link>
      <button
        type="button"
        className="btn text-xs"
        disabled={pending}
        onClick={() => {
          if (!confirm(t("match_deleteConfirm"))) return;
          start(async () => {
            await deleteMatch(match.id);
            router.refresh();
          });
        }}
      >
        {t("common_delete")}
      </button>
    </li>
  );
}

function TeamList({
  title,
  teams,
  playerCounts,
}: {
  title: string;
  teams: Team[];
  playerCounts: Record<string, number>;
}) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="card flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      {teams.length === 0 ? (
        <p className="text-sm text-muted">–</p>
      ) : (
        <ul className="divide-y divide-border">
          {teams.map((tm) => (
            <li key={tm.id} className="flex items-center justify-between py-2">
              <Link href={`/teams/${tm.id}`} className="font-medium hover:underline">
                {tm.name}
                {tm.short_name ? <span className="ml-2 text-sm text-muted">{tm.short_name}</span> : null}
              </Link>
              <span className="flex items-center gap-3 text-sm text-muted">
                {playerCounts[tm.id] ?? 0} {t("dash_players")}
                <button
                  type="button"
                  className="btn text-xs"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(t("team_deleteConfirm"))) return;
                    start(async () => {
                      await deleteTeam(tm.id);
                      router.refresh();
                    });
                  }}
                >
                  {t("common_delete")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewTeam({ clubId }: { clubId: string }) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [isOpponent, setIsOpponent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="card flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await createTeam({ clubId, name, shortName, isOpponent });
          if (res.error) setError(res.error);
          else {
            setName("");
            setShortName("");
            if (res.teamId) router.push(`/teams/${res.teamId}`);
            else router.refresh();
          }
        });
      }}
    >
      <label className="flex flex-1 flex-col gap-1 text-sm">
        {t("dash_teamName")}
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="flex w-28 flex-col gap-1 text-sm">
        {t("dash_shortName")}
        <input className="input" maxLength={6} value={shortName} onChange={(e) => setShortName(e.target.value)} />
      </label>
      <label className="flex items-center gap-2 py-2 text-sm">
        <input type="checkbox" checked={isOpponent} onChange={(e) => setIsOpponent(e.target.checked)} />
        {t("dash_isOpponent")}
      </label>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {t("dash_newTeam")}
      </button>
      {error && <p className="w-full text-sm text-bad">{error}</p>}
    </form>
  );
}

function CreateClub() {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="card mx-auto mt-12 flex w-full max-w-md flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await createClub(name);
          if (res.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <h1 className="text-xl font-bold">{t("dash_noClub")}</h1>
      <label className="flex flex-col gap-1 text-sm">
        {t("dash_clubName")}
        <input className="input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {t("dash_createClub")}
      </button>
    </form>
  );
}
