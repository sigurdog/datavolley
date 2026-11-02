import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RULES,
  applyPoint,
  buildRally,
  computeMatchSummary,
  computeSetState,
  currentServer,
  initialSetState,
  lineupComplete,
  onCourt,
  setTarget,
  setWinner,
} from "./state";
import type { Lineup, Rally } from "../types";

test("set target is 25 except final set 15", () => {
  assert.equal(setTarget(1, DEFAULT_RULES), 25);
  assert.equal(setTarget(4, DEFAULT_RULES), 25);
  assert.equal(setTarget(5, DEFAULT_RULES), 15);
});

test("set winner requires two point lead", () => {
  assert.equal(setWinner(25, 23, 1, DEFAULT_RULES), "home");
  assert.equal(setWinner(25, 24, 1, DEFAULT_RULES), null);
  assert.equal(setWinner(26, 24, 1, DEFAULT_RULES), "home");
  assert.equal(setWinner(14, 16, 5, DEFAULT_RULES), "away");
  assert.equal(setWinner(15, 14, 5, DEFAULT_RULES), null);
});

test("serving team keeps serve on break point; side-out rotates the receiver", () => {
  let s = initialSetState(1, "home");
  s = applyPoint(s, "home", DEFAULT_RULES);
  assert.equal(s.servingTeam, "home");
  assert.equal(s.homeRotation, 0);
  assert.deepEqual([s.homeScore, s.awayScore], [1, 0]);

  s = applyPoint(s, "away", DEFAULT_RULES);
  assert.equal(s.servingTeam, "away");
  assert.equal(s.awayRotation, 1);
  assert.equal(s.homeRotation, 0);

  s = applyPoint(s, "home", DEFAULT_RULES);
  assert.equal(s.servingTeam, "home");
  assert.equal(s.homeRotation, 1);
});

test("rotation wraps after six side-outs", () => {
  let s = initialSetState(1, "away");
  for (let i = 0; i < 6; i++) {
    s = applyPoint(s, "home", DEFAULT_RULES); // home side-out
    s = applyPoint(s, "away", DEFAULT_RULES); // away side-out
  }
  assert.equal(s.homeRotation, 0);
  assert.equal(s.awayRotation, 0);
});

test("court positions follow the rotation", () => {
  const lineup: Lineup = { positions: ["a", "b", "c", "d", "e", "f"], libero: "L" };
  assert.equal(currentServer(lineup, 0), "a");
  assert.deepEqual(onCourt(lineup, 0), ["a", "b", "c", "d", "e", "f"]);
  // After one rotation the player from position 2 serves.
  assert.equal(currentServer(lineup, 1), "b");
  assert.deepEqual(onCourt(lineup, 1), ["b", "c", "d", "e", "f", "a"]);
  assert.equal(currentServer(lineup, 5), "f");
});

test("lineupComplete validates six unique players and libero not on court", () => {
  assert.equal(lineupComplete({ positions: ["a", "b", "c", "d", "e", "f"], libero: null }), true);
  assert.equal(lineupComplete({ positions: ["a", "b", "c", "d", "e", "a"], libero: null }), false);
  assert.equal(lineupComplete({ positions: ["a", "b", "c", "d", "e", null], libero: null }), false);
  assert.equal(lineupComplete({ positions: ["a", "b", "c", "d", "e", "f"], libero: "a" }), false);
});

test("buildRally snapshots state before and score after", () => {
  const s = initialSetState(2, "away");
  const r = buildRally(
    "m1",
    s,
    {
      reception_player_id: "h1",
      reception_grade: "bad",
      winner: "home",
      outcome: "kill",
      player_id: "h2",
      error_type: null,
    },
    DEFAULT_RULES,
  );
  assert.equal(r.seq, 1);
  assert.equal(r.serving_team, "away");
  assert.equal(r.home_rotation, 0);
  assert.equal(r.home_score, 1);
  assert.equal(r.away_score, 0);
});

test("computeSetState and match summary end the set at 25", () => {
  const rallies: Rally[] = [];
  let s = initialSetState(1, "home");
  for (let i = 0; i < 25; i++) {
    const r = buildRally(
      "m",
      s,
      {
        reception_player_id: null,
        reception_grade: null,
        winner: "home",
        outcome: "kill",
        player_id: null,
        error_type: null,
      },
      DEFAULT_RULES,
    );
    rallies.push({ ...r, id: String(i) });
    s = applyPoint(s, "home", DEFAULT_RULES);
  }
  const st = computeSetState(1, "home", rallies, DEFAULT_RULES);
  assert.equal(st.winner, "home");
  assert.equal(st.homeScore, 25);
  const summary = computeMatchSummary([{ set_number: 1, first_server: "home" }], rallies, DEFAULT_RULES);
  assert.equal(summary.homeSets, 1);
  assert.equal(summary.winner, null);
});
