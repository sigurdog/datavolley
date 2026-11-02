"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { currentServer, onCourt, type SetState } from "@/lib/engine/state";
import { useT } from "@/lib/i18n/context";
import type { TKey } from "@/lib/i18n/dictionaries";
import {
  otherSide,
  type ErrorType,
  type Lineup,
  type Outcome,
  type Player,
  type Rally,
  type RallyInput,
  type ReceptionGrade,
  type Side,
  type Team,
} from "@/lib/types";
import { PlayerButton } from "./PlayerButton";
import { describeRally } from "./describe";

type Step =
  | { kind: "reception" }
  | { kind: "receptionGrade"; playerId: string }
  | { kind: "rally" }
  | { kind: "outcome"; winner: Side }
  | { kind: "errorType"; winner: Side }
  | { kind: "player"; winner: Side; outcome: Outcome; errorType: ErrorType | null };

interface Draft {
  reception_player_id: string | null;
  reception_grade: ReceptionGrade | null;
}

export interface ScoutBoardProps {
  matchId: string;
  trackReception: boolean;
  state: SetState;
  setsWon: { home: number; away: number };
  teams: Record<Side, Team>;
  players: Record<Side, Player[]>;
  lineups: Record<Side, Lineup>;
  rallies: Rally[];
  onRally: (input: RallyInput) => void;
  onUndo: () => void;
  canUndo: boolean;
  saving: boolean;
  error: string | null;
}

export function ScoutBoard(p: ScoutBoardProps) {
  const { t } = useT();
  const { state, teams, players, lineups, trackReception } = p;
  const serving = state.servingTeam;
  const receiving = otherSide(serving);

  const initialStep: Step = trackReception ? { kind: "reception" } : { kind: "rally" };
  const [step, setStep] = useState<Step>(initialStep);
  const [draft, setDraft] = useState<Draft>({ reception_player_id: null, reception_grade: null });
  const [buffer, setBuffer] = useState("");
  const [showKeys, setShowKeys] = useState(false);

  const playerMap = useMemo(
    () => Object.fromEntries([...players.home, ...players.away].map((pl) => [pl.id, pl])),
    [players],
  );
  const rotation = { home: state.homeRotation, away: state.awayRotation };
  const serverId = currentServer(lineups[serving], rotation[serving]);

  const reset = useCallback(() => {
    setStep(trackReception ? { kind: "reception" } : { kind: "rally" });
    setDraft({ reception_player_id: null, reception_grade: null });
    setBuffer("");
  }, [trackReception]);

  // A new rally (or an undo) always restarts the entry flow. This is the
  // "adjust state when a prop changes" pattern, done during render.
  const [seenRallyCount, setSeenRallyCount] = useState(state.rallyCount);
  if (seenRallyCount !== state.rallyCount) {
    setSeenRallyCount(state.rallyCount);
    reset();
  }

  const commit = useCallback(
    (winner: Side, outcome: Outcome, playerId: string | null, errorType: ErrorType | null, d: Draft = draft) => {
      p.onRally({
        reception_player_id: d.reception_player_id,
        reception_grade: d.reception_grade,
        winner,
        outcome,
        player_id: playerId,
        error_type: errorType,
      });
    },
    [p, draft],
  );

  // ---- transitions ---------------------------------------------------------

  const chooseReceiver = (id: string) => setStep({ kind: "receptionGrade", playerId: id });

  const chooseGrade = (grade: ReceptionGrade) => {
    if (step.kind !== "receptionGrade") return;
    const d: Draft = { reception_player_id: step.playerId, reception_grade: grade };
    if (grade === "error") {
      commit(serving, "ace", serverId, null, d);
      return;
    }
    setDraft(d);
    setStep({ kind: "rally" });
  };

  const skipReception = () => {
    setDraft({ reception_player_id: null, reception_grade: null });
    setStep({ kind: "rally" });
  };

  const chooseWinner = (winner: Side) => setStep({ kind: "outcome", winner });

  const chooseOutcome = (outcome: Outcome) => {
    if (step.kind !== "outcome") return;
    const { winner } = step;
    if (outcome === "ace") {
      if (winner !== serving) return;
      commit(winner, "ace", serverId, null);
      return;
    }
    if (outcome === "error") {
      setStep({ kind: "errorType", winner });
      return;
    }
    setStep({ kind: "player", winner, outcome, errorType: null });
  };

  const chooseErrorType = (errorType: ErrorType) => {
    if (step.kind !== "errorType") return;
    const { winner } = step;
    const loser = otherSide(winner);
    if (errorType === "serve") {
      if (loser !== serving) return;
      commit(winner, "error", serverId, "serve");
      return;
    }
    setStep({ kind: "player", winner, outcome: "error", errorType });
  };

  const choosePlayer = (id: string | null) => {
    if (step.kind !== "player") return;
    commit(step.winner, step.outcome, id, step.errorType);
  };

  // Which side's players are being picked right now
  const pickSide: Side | null =
    step.kind === "reception"
      ? receiving
      : step.kind === "player"
        ? step.outcome === "error"
          ? otherSide(step.winner)
          : step.winner
        : null;

  const onPick = (id: string) => {
    if (step.kind === "reception") chooseReceiver(id);
    else if (step.kind === "player") choosePlayer(id);
  };

  // ---- keyboard --------------------------------------------------------------

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;

      if (k === "Escape") {
        reset();
        return;
      }
      if (k === "z" || k === "Z") {
        if (p.canUndo && !p.saving) p.onUndo();
        return;
      }
      if (/^\d$/.test(k)) {
        if (pickSide) setBuffer((b) => (b + k).slice(-2));
        return;
      }
      if (k === "Backspace") {
        setBuffer((b) => b.slice(0, -1));
        return;
      }
      if (k === "Enter") {
        if (pickSide && buffer) {
          const pl = players[pickSide].find((x) => x.number === Number(buffer));
          setBuffer("");
          if (pl) onPick(pl.id);
        }
        return;
      }
      if (k === "ArrowLeft" && (step.kind === "reception" || step.kind === "rally")) {
        chooseWinner("home");
        return;
      }
      if (k === "ArrowRight" && (step.kind === "reception" || step.kind === "rally")) {
        chooseWinner("away");
        return;
      }
      if (k === " " && step.kind === "reception") {
        e.preventDefault();
        skipReception();
        return;
      }
      const L = k.toLowerCase();
      if (step.kind === "receptionGrade") {
        if (L === "p") chooseGrade("perfect");
        else if (L === "o") chooseGrade("ok");
        else if (L === "b") chooseGrade("bad");
        else if (L === "a") chooseGrade("error");
        return;
      }
      if (step.kind === "outcome") {
        if (L === "k") chooseOutcome("kill");
        else if (L === "b") chooseOutcome("block");
        else if (L === "a") chooseOutcome("ace");
        else if (L === "e") chooseOutcome("error");
        return;
      }
      if (step.kind === "errorType") {
        const map: Record<string, ErrorType> = { s: "serve", t: "attack", n: "net", h: "handling", r: "rotation", o: "other" };
        if (map[L]) chooseErrorType(map[L]);
        return;
      }
      if (step.kind === "player" && L === "u") {
        choosePlayer(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, buffer, pickSide, p.canUndo, p.saving, players, serverId, draft]);

  // ---- render ----------------------------------------------------------------

  const teamName = (s: Side) => teams[s].short_name ?? teams[s].name;
  const sideColor = (s: Side) => (s === "home" ? "text-home" : "text-away");
  const sideBg = (s: Side) => (s === "home" ? "bg-home-soft border-home" : "bg-away-soft border-away");

  const lastRallies = p.rallies.slice(-4).reverse();

  return (
    <div className="flex flex-col gap-4">
      {/* Scoreboard */}
      <div className="card flex items-center justify-between gap-2 py-3">
        <ScoreSide side="home" name={teams.home.name} score={state.homeScore} sets={p.setsWon.home} serving={serving === "home"} rotation={rotation.home} />
        <div className="flex flex-col items-center text-center">
          <span className="text-xs uppercase text-muted">
            {t("scout_set")} {state.setNumber}
          </span>
          <span className="font-mono text-sm text-muted">
            {p.setsWon.home}–{p.setsWon.away}
          </span>
          <div className="mt-1 flex gap-1">
            <button type="button" className="btn px-2 py-1 text-xs" disabled={!p.canUndo || p.saving} onClick={p.onUndo} title="Z">
              ↶ {t("scout_undo")}
            </button>
            <Link href={`/matches/${p.matchId}/stats`} className="btn px-2 py-1 text-xs">
              {t("scout_stats")}
            </Link>
            <button type="button" className="btn hidden px-2 py-1 text-xs md:inline-flex" onClick={() => setShowKeys((v) => !v)}>
              ⌨
            </button>
          </div>
        </div>
        <ScoreSide side="away" name={teams.away.name} score={state.awayScore} sets={p.setsWon.away} serving={serving === "away"} rotation={rotation.away} right />
      </div>

      {showKeys && <KeyboardHelp />}

      {p.error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{p.error}</p>}

      {/* Step panel */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {step.kind === "reception" && (
              <>
                <span className={sideColor(receiving)}>{teamName(receiving)}</span>: {t("scout_reception")}
              </>
            )}
            {step.kind === "receptionGrade" && (
              <>
                {t("scout_receptionGrade")} · <span className="font-mono">#{playerMap[step.playerId]?.number}</span>
              </>
            )}
            {step.kind === "rally" && t("scout_rallyEnd")}
            {step.kind === "outcome" && (
              <span className={sideColor(step.winner)}>{t("scout_how", { team: teamName(step.winner) })}</span>
            )}
            {step.kind === "errorType" && (
              <>
                <span className={sideColor(otherSide(step.winner))}>{teamName(otherSide(step.winner))}</span>: {t("scout_errorType")}
              </>
            )}
            {step.kind === "player" && (
              <>
                <span className={sideColor(pickSide!)}>{teamName(pickSide!)}</span>:{" "}
                {step.outcome === "error" ? t("scout_whoErred") : t("scout_who")}
              </>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {buffer && <span className="kbd font-mono text-base">#{buffer}</span>}
            {step.kind !== initialStep.kind && (
              <button type="button" className="btn px-2 py-1 text-xs" onClick={reset}>
                {t("scout_cancel")}
              </button>
            )}
            {p.saving && <span className="text-xs text-muted">{t("scout_saving")}</span>}
          </div>
        </div>

        {/* Reception grade */}
        {step.kind === "receptionGrade" && (
          <div className="grid grid-cols-4 gap-2">
            <button className="tap bg-good-soft text-good" onClick={() => chooseGrade("perfect")}>
              {t("grade_perfect")} <span className="kbd ml-1">P</span>
            </button>
            <button className="tap bg-mid-soft text-mid" onClick={() => chooseGrade("ok")}>
              {t("grade_ok")} <span className="kbd ml-1">O</span>
            </button>
            <button className="tap bg-bad-soft text-bad" onClick={() => chooseGrade("bad")}>
              {t("grade_bad")} <span className="kbd ml-1">B</span>
            </button>
            <button className={`tap ${sideBg(serving)}`} onClick={() => chooseGrade("error")}>
              {t("grade_error")} #{playerMap[serverId ?? ""]?.number ?? "?"} <span className="kbd ml-1">A</span>
            </button>
          </div>
        )}

        {/* Outcome */}
        {step.kind === "outcome" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button className="tap" onClick={() => chooseOutcome("kill")}>
              {t("outcome_kill")} <span className="kbd ml-1">K</span>
            </button>
            <button className="tap" onClick={() => chooseOutcome("block")}>
              {t("outcome_block")} <span className="kbd ml-1">B</span>
            </button>
            <button className="tap" disabled={step.winner !== serving} onClick={() => chooseOutcome("ace")}>
              {t("outcome_ace")} <span className="kbd ml-1">A</span>
            </button>
            <button className="tap" onClick={() => chooseOutcome("error")}>
              {t("outcome_error")} <span className="kbd ml-1">E</span>
            </button>
          </div>
        )}

        {/* Error type */}
        {step.kind === "errorType" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(
              [
                ["serve", "S"],
                ["attack", "T"],
                ["net", "N"],
                ["handling", "H"],
                ["rotation", "R"],
                ["other", "O"],
              ] as [ErrorType, string][]
            ).map(([et, key]) => (
              <button
                key={et}
                className="tap"
                disabled={et === "serve" && otherSide(step.winner) !== serving}
                onClick={() => chooseErrorType(et)}
              >
                {t(`err_${et}` as TKey)} <span className="kbd ml-1">{key}</span>
              </button>
            ))}
          </div>
        )}

        {/* Player picker (reception or scorer / erring player) */}
        {pickSide && (
          <PlayerPicker
            side={pickSide}
            players={players[pickSide]}
            lineup={lineups[pickSide]}
            rotation={rotation[pickSide]}
            serverId={pickSide === serving ? serverId : null}
            onPick={onPick}
            extra={
              step.kind === "reception" ? (
                <button className="tap" onClick={skipReception}>
                  {t("scout_skip")} <span className="kbd ml-1">␣</span>
                </button>
              ) : (
                <button className="tap" onClick={() => choosePlayer(null)}>
                  {t("scout_unknown")} <span className="kbd ml-1">U</span>
                </button>
              )
            }
          />
        )}

        {/* Point buttons: always available before the outcome is chosen */}
        {(step.kind === "reception" || step.kind === "rally") && (
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <button className={`tap min-h-16 text-lg ${sideBg("home")}`} onClick={() => chooseWinner("home")}>
              {t("scout_pointTo", { team: teamName("home") })} <span className="kbd ml-1">←</span>
            </button>
            <button className={`tap min-h-16 text-lg ${sideBg("away")}`} onClick={() => chooseWinner("away")}>
              {t("scout_pointTo", { team: teamName("away") })} <span className="kbd ml-1">→</span>
            </button>
          </div>
        )}
      </div>

      {/* Rally log */}
      {lastRallies.length > 0 && (
        <div className="card py-2">
          <h3 className="mb-1 text-xs font-semibold uppercase text-muted">{t("scout_log")}</h3>
          <ul className="divide-y divide-border text-sm">
            {lastRallies.map((r, i) => (
              <li key={r.id} className={`py-1 ${i === 0 ? "" : "text-muted"}`}>
                <span className={`mr-2 ${sideColor(r.winner)}`}>●</span>
                {describeRally(r, playerMap, teams, t)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScoreSide({
  side,
  name,
  score,
  serving,
  rotation,
  right,
}: {
  side: Side;
  name: string;
  score: number;
  sets: number;
  serving: boolean;
  rotation: number;
  right?: boolean;
}) {
  const { t } = useT();
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${right ? "flex-row-reverse text-right" : ""}`}>
      <span className={`font-mono text-5xl font-bold ${side === "home" ? "text-home" : "text-away"}`}>{score}</span>
      <div className="min-w-0">
        <div className="truncate font-semibold">{name}</div>
        <div className="text-xs text-muted">
          {serving && <span className="mr-1">🏐 {t("scout_serving")}</span>}
          {t("scout_rotation")} {rotation + 1}
        </div>
      </div>
    </div>
  );
}

function PlayerPicker({
  side,
  players,
  lineup,
  rotation,
  serverId,
  onPick,
  extra,
}: {
  side: Side;
  players: Player[];
  lineup: Lineup;
  rotation: number;
  serverId: string | null;
  onPick: (id: string) => void;
  extra: React.ReactNode;
}) {
  const { t } = useT();
  const byId = Object.fromEntries(players.map((pl) => [pl.id, pl]));
  const court = onCourt(lineup, rotation); // positions 1..6
  const courtIds = new Set(court.filter(Boolean) as string[]);
  const libero = lineup.libero ? byId[lineup.libero] : null;
  const bench = players.filter((pl) => !courtIds.has(pl.id) && pl.id !== lineup.libero);
  // Net at the top: 4 3 2 / 5 6 1
  const grid = [4, 3, 2, 5, 6, 1].map((pos) => ({ pos, id: court[pos - 1] }));

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1fr)]">
        {grid.slice(0, 3).map(({ pos, id }) =>
          id && byId[id] ? (
            <PlayerButton key={pos} player={byId[id]} side={side} label={`${pos}`} onClick={() => onPick(id)} highlight={id === serverId} />
          ) : (
            <div key={pos} className="tap opacity-30">?</div>
          ),
        )}
        <div className="hidden sm:block">
          {libero && <PlayerButton player={libero} side={side} label="L" onClick={() => onPick(libero.id)} />}
        </div>
        {grid.slice(3).map(({ pos, id }) =>
          id && byId[id] ? (
            <PlayerButton key={pos} player={byId[id]} side={side} label={`${pos}`} onClick={() => onPick(id)} highlight={id === serverId} />
          ) : (
            <div key={pos} className="tap opacity-30">?</div>
          ),
        )}
        <div className="hidden sm:block">{extra}</div>
      </div>
      <div className="flex flex-wrap gap-2 sm:hidden">
        {libero && <PlayerButton player={libero} side={side} label="L" small onClick={() => onPick(libero.id)} />}
        {extra}
      </div>
      {bench.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
          <span className="mr-1 text-xs uppercase text-muted">{t("scout_bench")}</span>
          {bench.map((pl) => (
            <PlayerButton key={pl.id} player={pl} side={side} small onClick={() => onPick(pl.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function KeyboardHelp() {
  const { t } = useT();
  const keys: TKey[] = [
    "keys_digits",
    "keys_grades",
    "keys_skip",
    "keys_winner",
    "keys_outcome",
    "keys_errorType",
    "keys_unknown",
    "keys_undo",
    "keys_cancel",
  ];
  return (
    <div className="card py-3 text-sm">
      <h3 className="mb-1 font-semibold">{t("keys_title")}</h3>
      <ul className="grid gap-1 sm:grid-cols-2">
        {keys.map((k) => (
          <li key={k} className="text-muted">
            {t(k)}
          </li>
        ))}
      </ul>
    </div>
  );
}
