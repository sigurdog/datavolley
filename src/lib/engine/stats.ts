import {
  ERROR_TYPES,
  type ErrorType,
  type Rally,
  type ReceptionGrade,
  type Side,
} from "../types";

export interface ReceptionStats {
  perfect: number;
  ok: number;
  bad: number;
  error: number;
  total: number;
}

export interface PlayerStats {
  playerId: string;
  side: Side;
  points: number;
  aces: number;
  kills: number;
  blocks: number;
  errors: number;
  errorsByType: Record<ErrorType, number>;
  reception: ReceptionStats;
}

export interface RotationStats {
  rotation: number;
  pointsWon: number;
  pointsLost: number;
  sideoutWon: number;
  sideoutTotal: number;
  breakWon: number;
  breakTotal: number;
}

export interface TeamStats {
  side: Side;
  points: number;
  aces: number;
  kills: number;
  blocks: number;
  opponentErrors: number;
  errors: number;
  errorsByType: Record<ErrorType, number>;
  reception: ReceptionStats;
  sideoutWon: number;
  sideoutTotal: number;
  breakWon: number;
  breakTotal: number;
  rotations: RotationStats[];
}

export interface MatchStats {
  players: Record<string, PlayerStats>;
  teams: Record<Side, TeamStats>;
  rallies: number;
}

function emptyErrors(): Record<ErrorType, number> {
  return Object.fromEntries(ERROR_TYPES.map((t) => [t, 0])) as Record<ErrorType, number>;
}

function emptyReception(): ReceptionStats {
  return { perfect: 0, ok: 0, bad: 0, error: 0, total: 0 };
}

function emptyTeam(side: Side): TeamStats {
  return {
    side,
    points: 0,
    aces: 0,
    kills: 0,
    blocks: 0,
    opponentErrors: 0,
    errors: 0,
    errorsByType: emptyErrors(),
    reception: emptyReception(),
    sideoutWon: 0,
    sideoutTotal: 0,
    breakWon: 0,
    breakTotal: 0,
    rotations: Array.from({ length: 6 }, (_, i) => ({
      rotation: i,
      pointsWon: 0,
      pointsLost: 0,
      sideoutWon: 0,
      sideoutTotal: 0,
      breakWon: 0,
      breakTotal: 0,
    })),
  };
}

function emptyPlayer(playerId: string, side: Side): PlayerStats {
  return {
    playerId,
    side,
    points: 0,
    aces: 0,
    kills: 0,
    blocks: 0,
    errors: 0,
    errorsByType: emptyErrors(),
    reception: emptyReception(),
  };
}

function addReception(r: ReceptionStats, grade: ReceptionGrade) {
  r[grade]++;
  r.total++;
}

/**
 * Compute stats for a list of rallies.
 * @param playerSide map from player id to the side they play for
 * @param setFilter  only count this set, or null for the whole match
 */
export function computeStats(
  rallies: Rally[],
  playerSide: Record<string, Side>,
  setFilter: number | null = null,
): MatchStats {
  const stats: MatchStats = {
    players: {},
    teams: { home: emptyTeam("home"), away: emptyTeam("away") },
    rallies: 0,
  };

  const player = (id: string | null): PlayerStats | null => {
    if (!id) return null;
    const side = playerSide[id];
    if (!side) return null;
    if (!stats.players[id]) stats.players[id] = emptyPlayer(id, side);
    return stats.players[id];
  };

  for (const r of rallies) {
    if (setFilter !== null && r.set_number !== setFilter) continue;
    stats.rallies++;

    const serving = r.serving_team;
    const receiving: Side = serving === "home" ? "away" : "home";
    const winner = r.winner;
    const loser: Side = winner === "home" ? "away" : "home";
    const wTeam = stats.teams[winner];
    const lTeam = stats.teams[loser];

    wTeam.points++;

    // Side-out / break point bookkeeping
    const servingTeam = stats.teams[serving];
    const receivingTeam = stats.teams[receiving];
    servingTeam.breakTotal++;
    receivingTeam.sideoutTotal++;
    if (winner === serving) servingTeam.breakWon++;
    else receivingTeam.sideoutWon++;

    const homeRot = stats.teams.home.rotations[r.home_rotation];
    const awayRot = stats.teams.away.rotations[r.away_rotation];
    const rot = { home: homeRot, away: awayRot };
    rot[winner].pointsWon++;
    rot[loser].pointsLost++;
    rot[serving].breakTotal++;
    rot[receiving].sideoutTotal++;
    if (winner === serving) rot[serving].breakWon++;
    else rot[receiving].sideoutWon++;

    // Reception
    if (r.reception_grade) {
      addReception(receivingTeam.reception, r.reception_grade);
      const rp = player(r.reception_player_id);
      if (rp) addReception(rp.reception, r.reception_grade);
    }

    // Terminal action
    switch (r.outcome) {
      case "ace": {
        wTeam.aces++;
        const p = player(r.player_id);
        if (p) {
          p.aces++;
          p.points++;
        }
        break;
      }
      case "kill": {
        wTeam.kills++;
        const p = player(r.player_id);
        if (p) {
          p.kills++;
          p.points++;
        }
        break;
      }
      case "block": {
        wTeam.blocks++;
        const p = player(r.player_id);
        if (p) {
          p.blocks++;
          p.points++;
        }
        break;
      }
      case "error": {
        wTeam.opponentErrors++;
        lTeam.errors++;
        const type: ErrorType = r.error_type ?? "other";
        lTeam.errorsByType[type]++;
        const p = player(r.player_id);
        if (p) {
          p.errors++;
          p.errorsByType[type]++;
        }
        break;
      }
    }
  }

  return stats;
}

export function pct(num: number, den: number): string {
  if (den === 0) return "–";
  return `${Math.round((num / den) * 100)}%`;
}

export function positiveReceptionPct(r: ReceptionStats): string {
  return pct(r.perfect + r.ok, r.total);
}
