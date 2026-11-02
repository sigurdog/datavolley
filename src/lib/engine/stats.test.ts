import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStats, pct } from "./stats";
import type { Rally } from "../types";

function rally(partial: Partial<Rally> & Pick<Rally, "winner" | "outcome" | "serving_team">): Rally {
  return {
    id: Math.random().toString(36).slice(2),
    match_id: "m",
    set_number: 1,
    seq: 1,
    home_rotation: 0,
    away_rotation: 0,
    reception_player_id: null,
    reception_grade: null,
    player_id: null,
    error_type: null,
    home_score: 0,
    away_score: 0,
    ...partial,
  };
}

const sides = { h1: "home" as const, h2: "home" as const, a1: "away" as const };

test("points, aces, kills, blocks and errors are attributed", () => {
  const rallies = [
    rally({ serving_team: "home", winner: "home", outcome: "ace", player_id: "h1", reception_player_id: "a1", reception_grade: "error" }),
    rally({ serving_team: "home", winner: "away", outcome: "kill", player_id: "a1", reception_player_id: "a1", reception_grade: "perfect" }),
    rally({ serving_team: "away", winner: "home", outcome: "block", player_id: "h2", reception_player_id: "h1", reception_grade: "ok" }),
    rally({ serving_team: "home", winner: "away", outcome: "error", player_id: "h1", error_type: "serve" }),
  ];
  const s = computeStats(rallies, sides);
  assert.equal(s.rallies, 4);
  assert.equal(s.players.h1.aces, 1);
  assert.equal(s.players.h1.points, 1);
  assert.equal(s.players.h1.errors, 1);
  assert.equal(s.players.h1.errorsByType.serve, 1);
  assert.equal(s.players.h2.blocks, 1);
  assert.equal(s.players.a1.kills, 1);
  assert.equal(s.players.a1.reception.total, 2);
  assert.equal(s.players.a1.reception.error, 1);
  assert.equal(s.players.a1.reception.perfect, 1);
  assert.equal(s.teams.home.points, 2);
  assert.equal(s.teams.away.points, 2);
  assert.equal(s.teams.away.opponentErrors, 1);
  assert.equal(s.teams.home.errors, 1);
});

test("side-out and break percentages", () => {
  const rallies = [
    rally({ serving_team: "home", winner: "home", outcome: "kill" }),
    rally({ serving_team: "home", winner: "away", outcome: "kill" }),
    rally({ serving_team: "away", winner: "away", outcome: "kill" }),
    rally({ serving_team: "away", winner: "home", outcome: "kill" }),
  ];
  const s = computeStats(rallies, sides);
  assert.equal(s.teams.home.breakTotal, 2);
  assert.equal(s.teams.home.breakWon, 1);
  assert.equal(s.teams.home.sideoutTotal, 2);
  assert.equal(s.teams.home.sideoutWon, 1);
  assert.equal(s.teams.away.sideoutWon, 1);
  assert.equal(pct(1, 2), "50%");
  assert.equal(pct(0, 0), "–");
});

test("set filter and rotation buckets", () => {
  const rallies = [
    rally({ set_number: 1, serving_team: "home", winner: "home", outcome: "kill", home_rotation: 2 }),
    rally({ set_number: 2, serving_team: "home", winner: "away", outcome: "kill", home_rotation: 3 }),
  ];
  const all = computeStats(rallies, sides);
  assert.equal(all.rallies, 2);
  assert.equal(all.teams.home.rotations[2].pointsWon, 1);
  assert.equal(all.teams.home.rotations[3].pointsLost, 1);
  const set2 = computeStats(rallies, sides, 2);
  assert.equal(set2.rallies, 1);
});
