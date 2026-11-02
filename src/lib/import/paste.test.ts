import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePastedRoster } from "./paste";

test("parses common roster formats", () => {
  const text = [
    "14 Ola Nordmann",
    "3, Kari Hansen",
    "7;Per Olsen",
    "9\tNils Berg",
    "Anne Lund 11",
    "#2 Eva Dahl",
    "5",
    "Trener: Someone",
    "14 Duplicate",
  ].join("\n");
  const players = parsePastedRoster(text);
  assert.deepEqual(
    players.map((p) => [p.number, p.name]),
    [
      [2, "Eva Dahl"],
      [3, "Kari Hansen"],
      [5, ""],
      [7, "Per Olsen"],
      [9, "Nils Berg"],
      [11, "Anne Lund"],
      [14, "Ola Nordmann"],
    ],
  );
});
