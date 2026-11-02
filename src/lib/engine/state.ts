import {
  otherSide,
  type Lineup,
  type Rally,
  type RallyInput,
  type Side,
} from "../types";

export interface Rules {
  setsToWin: number;
  pointsPerSet: number;
  pointsFinalSet: number;
  minLead: number;
}

export const DEFAULT_RULES: Rules = {
  setsToWin: 3,
  pointsPerSet: 25,
  pointsFinalSet: 15,
  minLead: 2,
};

export function rulesFromMatch(m: {
  sets_to_win: number;
  points_per_set: number;
  points_final_set: number;
}): Rules {
  return {
    setsToWin: m.sets_to_win,
    pointsPerSet: m.points_per_set,
    pointsFinalSet: m.points_final_set,
    minLead: 2,
  };
}

export function finalSetNumber(rules: Rules): number {
  return rules.setsToWin * 2 - 1;
}

export function setTarget(setNumber: number, rules: Rules): number {
  return setNumber === finalSetNumber(rules)
    ? rules.pointsFinalSet
    : rules.pointsPerSet;
}

export function setWinner(
  home: number,
  away: number,
  setNumber: number,
  rules: Rules,
): Side | null {
  const target = setTarget(setNumber, rules);
  if (home >= target && home - away >= rules.minLead) return "home";
  if (away >= target && away - home >= rules.minLead) return "away";
  return null;
}

/** Live state of one set, derived purely from its rallies. */
export interface SetState {
  setNumber: number;
  homeScore: number;
  awayScore: number;
  servingTeam: Side;
  /** 0..5, number of rotations performed since the start of the set. */
  homeRotation: number;
  awayRotation: number;
  rallyCount: number;
  winner: Side | null;
}

export function initialSetState(setNumber: number, firstServer: Side): SetState {
  return {
    setNumber,
    homeScore: 0,
    awayScore: 0,
    servingTeam: firstServer,
    homeRotation: 0,
    awayRotation: 0,
    rallyCount: 0,
    winner: null,
  };
}

/** Apply one rally result to a state and return the next state. */
export function applyPoint(state: SetState, winner: Side, rules: Rules): SetState {
  const next: SetState = {
    ...state,
    homeScore: state.homeScore + (winner === "home" ? 1 : 0),
    awayScore: state.awayScore + (winner === "away" ? 1 : 0),
    rallyCount: state.rallyCount + 1,
  };
  if (winner !== state.servingTeam) {
    // Side-out: the receiving team wins the serve and rotates.
    next.servingTeam = winner;
    if (winner === "home") next.homeRotation = (state.homeRotation + 1) % 6;
    else next.awayRotation = (state.awayRotation + 1) % 6;
  }
  next.winner = setWinner(next.homeScore, next.awayScore, state.setNumber, rules);
  return next;
}

export function computeSetState(
  setNumber: number,
  firstServer: Side,
  rallies: Rally[],
  rules: Rules,
): SetState {
  let state = initialSetState(setNumber, firstServer);
  for (const r of rallies) {
    if (r.set_number !== setNumber) continue;
    state = applyPoint(state, r.winner, rules);
  }
  return state;
}

/**
 * Build the full rally row from the scout's input and the current state.
 * The id is left for the caller / database.
 */
export function buildRally(
  matchId: string,
  state: SetState,
  input: RallyInput,
  rules: Rules,
): Omit<Rally, "id"> {
  const after = applyPoint(state, input.winner, rules);
  return {
    match_id: matchId,
    set_number: state.setNumber,
    seq: state.rallyCount + 1,
    serving_team: state.servingTeam,
    home_rotation: state.homeRotation,
    away_rotation: state.awayRotation,
    reception_player_id: input.reception_player_id,
    reception_grade: input.reception_grade,
    winner: input.winner,
    outcome: input.outcome,
    player_id: input.player_id,
    error_type: input.error_type,
    home_score: after.homeScore,
    away_score: after.awayScore,
  };
}

/** Player id currently standing in court position 1..6. */
export function playerAtPosition(
  lineup: Lineup,
  rotation: number,
  position: number,
): string | null {
  const idx = (position - 1 + rotation) % 6;
  return lineup.positions[idx] ?? null;
}

export function currentServer(lineup: Lineup, rotation: number): string | null {
  return playerAtPosition(lineup, rotation, 1);
}

export function onCourt(lineup: Lineup, rotation: number): (string | null)[] {
  return [1, 2, 3, 4, 5, 6].map((p) => playerAtPosition(lineup, rotation, p));
}

export function lineupComplete(lineup: Lineup): boolean {
  return (
    lineup.positions.length === 6 &&
    lineup.positions.every((p) => typeof p === "string" && p.length > 0) &&
    new Set(lineup.positions).size === 6 &&
    (lineup.libero === null || !lineup.positions.includes(lineup.libero))
  );
}

export interface MatchSummary {
  homeSets: number;
  awaySets: number;
  winner: Side | null;
  /** Final or current score for each set, keyed by set number. */
  sets: Record<number, { home: number; away: number; winner: Side | null }>;
}

export function computeMatchSummary(
  sets: { set_number: number; first_server: Side }[],
  rallies: Rally[],
  rules: Rules,
): MatchSummary {
  const summary: MatchSummary = { homeSets: 0, awaySets: 0, winner: null, sets: {} };
  for (const s of [...sets].sort((a, b) => a.set_number - b.set_number)) {
    const st = computeSetState(s.set_number, s.first_server, rallies, rules);
    summary.sets[s.set_number] = {
      home: st.homeScore,
      away: st.awayScore,
      winner: st.winner,
    };
    if (st.winner === "home") summary.homeSets++;
    if (st.winner === "away") summary.awaySets++;
  }
  if (summary.homeSets >= rules.setsToWin) summary.winner = "home";
  if (summary.awaySets >= rules.setsToWin) summary.winner = "away";
  return summary;
}

/** Who serves first in the next set: alternates from set 1. Set 5 is decided by a toss. */
export function suggestedFirstServer(previousFirstServer: Side): Side {
  return otherSide(previousFirstServer);
}
