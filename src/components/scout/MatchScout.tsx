"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { deleteRally, insertRally, markSetFinished, saveSetLineup } from "@/app/actions/scouting";
import { setMatchStatus } from "@/app/actions/matches";
import {
  buildRally,
  computeMatchSummary,
  computeSetState,
  rulesFromMatch,
  suggestedFirstServer,
} from "@/lib/engine/state";
import { useT } from "@/lib/i18n/context";
import type { MatchBundle } from "@/lib/loadMatch";
import type { Lineup, Rally, RallyInput, SetRecord, Side } from "@/lib/types";
import { LineupForm } from "./LineupForm";
import { ScoutBoard } from "./ScoutBoard";

export function MatchScout(bundle: MatchBundle) {
  const { match, homeTeam, awayTeam, homePlayers, awayPlayers } = bundle;
  const { t } = useT();
  const router = useRouter();
  const rules = useMemo(() => rulesFromMatch(match), [match]);

  const [sets, setSets] = useState<SetRecord[]>(bundle.sets);
  const [rallies, setRallies] = useState<Rally[]>(bundle.rallies);
  const [status, setStatus] = useState(match.status);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lineupBusy, setLineupBusy] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const currentSet = sets.length ? sets[sets.length - 1] : null;
  const summary = useMemo(() => computeMatchSummary(sets, rallies, rules), [sets, rallies, rules]);
  const state = useMemo(
    () => (currentSet ? computeSetState(currentSet.set_number, currentSet.first_server, rallies, rules) : null),
    [currentSet, rallies, rules],
  );
  const setRallies_ = useMemo(
    () => (currentSet ? rallies.filter((r) => r.set_number === currentSet.set_number) : []),
    [rallies, currentSet],
  );

  // Serialise writes so seq numbers reach the database in order.
  const enqueue = useCallback((job: () => Promise<void>) => {
    setPendingSaves((n) => n + 1);
    queue.current = queue.current
      .then(job)
      .catch(() => {})
      .finally(() => setPendingSaves((n) => n - 1));
  }, []);

  const onRally = useCallback(
    (input: RallyInput) => {
      if (!currentSet || !state || state.winner) return;
      setError(null);
      const row = buildRally(match.id, state, input, rules);
      const tempId = `tmp-${Date.now()}-${row.seq}`;
      const optimistic: Rally = { ...row, id: tempId };
      setRallies((prev) => [...prev, optimistic]);

      enqueue(async () => {
        const res = await insertRally(row);
        if (res.error || !res.rally) {
          setRallies((prev) => prev.filter((r) => r.id !== tempId));
          setError(t("scout_saveError"));
          return;
        }
        const saved = res.rally;
        setRallies((prev) => prev.map((r) => (r.id === tempId ? saved : r)));
        // Mark set finished if this point ended it.
        if (
          computeSetState(currentSet.set_number, currentSet.first_server, [...rallies, saved], rules).winner
        ) {
          await markSetFinished(match.id, currentSet.set_number, true);
        }
      });
    },
    [currentSet, state, match.id, rules, enqueue, t, rallies],
  );

  const onUndo = useCallback(() => {
    if (!currentSet) return;
    const last = setRallies_[setRallies_.length - 1];
    if (!last || last.id.startsWith("tmp-")) return;
    setError(null);
    setRallies((prev) => prev.filter((r) => r.id !== last.id));
    enqueue(async () => {
      const res = await deleteRally(last.id);
      if (res.error) {
        setRallies((prev) => [...prev, last].sort((a, b) => a.set_number - b.set_number || a.seq - b.seq));
        setError(t("scout_saveError"));
        return;
      }
      if (currentSet.finished) await markSetFinished(match.id, currentSet.set_number, false);
    });
  }, [currentSet, setRallies_, enqueue, match.id, t]);

  async function startSet(v: { firstServer: Side; homeLineup: Lineup; awayLineup: Lineup }) {
    const setNumber = (currentSet?.set_number ?? 0) + 1;
    setLineupBusy(true);
    setError(null);
    const res = await saveSetLineup({ matchId: match.id, setNumber, ...v });
    setLineupBusy(false);
    if (res.error || !res.set) {
      setError(res.error ?? t("common_error"));
      return;
    }
    setSets((prev) => [...prev.filter((s) => s.set_number !== setNumber), res.set!]);
    setStatus("live");
  }

  async function finishMatch() {
    if (!confirm(t("scout_confirmFinish"))) return;
    await setMatchStatus(match.id, "finished");
    setStatus("finished");
    router.push(`/matches/${match.id}/stats`);
  }

  async function reopen() {
    await setMatchStatus(match.id, "live");
    setStatus("live");
  }

  const header = (
    <div className="flex items-center justify-between">
      <Link href="/dashboard" className="text-sm text-muted hover:underline">
        ← {t("nav_dashboard")}
      </Link>
      <span className="text-sm text-muted">
        {homeTeam.name} {t("common_vs")} {awayTeam.name} · {match.played_at}
      </span>
    </div>
  );

  // ---- Which screen? ---------------------------------------------------------

  const matchOver = summary.winner !== null;
  const needLineup = !currentSet || (state?.winner !== null && !matchOver && status !== "finished");

  if (status === "finished" || matchOver) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="card flex flex-col items-center gap-3 py-10 text-center">
          <h1 className="text-2xl font-bold">{t("scout_matchOver")}</h1>
          <p className="font-mono text-4xl font-bold">
            <span className="text-home">{summary.homeSets}</span> – <span className="text-away">{summary.awaySets}</span>
          </p>
          <p className="text-muted">
            {sets.map((s) => `${summary.sets[s.set_number].home}–${summary.sets[s.set_number].away}`).join(", ")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={`/matches/${match.id}/stats`} className="btn btn-primary">
              {t("scout_stats")}
            </Link>
            {status !== "finished" ? (
              <>
                <button className="btn" onClick={finishMatch}>
                  {t("scout_finishMatch")}
                </button>
                <button className="btn" onClick={onUndo} disabled={pendingSaves > 0}>
                  ↶ {t("scout_undo")}
                </button>
              </>
            ) : (
              <button className="btn" onClick={reopen}>
                {t("scout_reopen")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (needLineup) {
    const nextNumber = (currentSet?.set_number ?? 0) + 1;
    return (
      <div className="flex flex-col gap-4">
        {header}
        {currentSet && state?.winner && (
          <div className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                {t("scout_setOver")}: {t("scout_set")} {currentSet.set_number}
              </p>
              <p className="font-mono text-2xl">
                <span className="text-home">{state.homeScore}</span> – <span className="text-away">{state.awayScore}</span>
                <span className="ml-3 text-sm text-muted">
                  ({summary.homeSets}–{summary.awaySets})
                </span>
              </p>
            </div>
            <button className="btn" onClick={onUndo} disabled={pendingSaves > 0}>
              ↶ {t("scout_undo")}
            </button>
          </div>
        )}
        <LineupForm
          key={nextNumber}
          setNumber={nextNumber}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          previous={currentSet}
          suggestedFirstServer={currentSet ? suggestedFirstServer(currentSet.first_server) : "home"}
          onSubmit={startSet}
          busy={lineupBusy}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      <ScoutBoard
        key={currentSet!.set_number}
        matchId={match.id}
        trackReception={match.track_reception}
        state={state!}
        setsWon={{ home: summary.homeSets, away: summary.awaySets }}
        teams={{ home: homeTeam, away: awayTeam }}
        players={{ home: homePlayers, away: awayPlayers }}
        lineups={{ home: currentSet!.home_lineup, away: currentSet!.away_lineup }}
        rallies={setRallies_}
        onRally={onRally}
        onUndo={onUndo}
        canUndo={setRallies_.length > 0 && !setRallies_[setRallies_.length - 1].id.startsWith("tmp-")}
        saving={pendingSaves > 0}
        error={error}
      />
    </div>
  );
}
