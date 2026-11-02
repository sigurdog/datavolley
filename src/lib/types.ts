export type Side = "home" | "away";
export type ReceptionGrade = "perfect" | "ok" | "bad" | "error";
export type Outcome = "ace" | "kill" | "block" | "error";
export type ErrorType =
  | "serve"
  | "attack"
  | "net"
  | "handling"
  | "rotation"
  | "other";

export const SIDES: Side[] = ["home", "away"];
export const RECEPTION_GRADES: ReceptionGrade[] = ["perfect", "ok", "bad", "error"];
export const OUTCOMES: Outcome[] = ["ace", "kill", "block", "error"];
export const ERROR_TYPES: ErrorType[] = [
  "serve",
  "attack",
  "net",
  "handling",
  "rotation",
  "other",
];

export interface Club {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  club_id: string;
  name: string;
  short_name: string | null;
  is_opponent: boolean;
  external_source: string | null;
  external_id: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  number: number;
  name: string | null;
  external_id: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  club_id: string;
  home_team_id: string;
  away_team_id: string;
  played_at: string;
  venue: string | null;
  status: "scheduled" | "live" | "finished";
  track_reception: boolean;
  sets_to_win: number;
  points_per_set: number;
  points_final_set: number;
  created_by: string | null;
  created_at: string;
}

/** Player ids in court positions 1..6 at the start of the set, plus libero. */
export interface Lineup {
  positions: (string | null)[];
  libero: string | null;
}

export interface SetRecord {
  id: string;
  match_id: string;
  set_number: number;
  first_server: Side;
  home_lineup: Lineup;
  away_lineup: Lineup;
  finished: boolean;
  created_at: string;
}

export interface Rally {
  id: string;
  match_id: string;
  set_number: number;
  seq: number;
  serving_team: Side;
  home_rotation: number;
  away_rotation: number;
  reception_player_id: string | null;
  reception_grade: ReceptionGrade | null;
  winner: Side;
  outcome: Outcome;
  player_id: string | null;
  error_type: ErrorType | null;
  home_score: number;
  away_score: number;
  created_by?: string | null;
  created_at?: string;
}

/** What the scout enters for one rally; the engine fills in the rest. */
export interface RallyInput {
  reception_player_id: string | null;
  reception_grade: ReceptionGrade | null;
  winner: Side;
  outcome: Outcome;
  player_id: string | null;
  error_type: ErrorType | null;
}

export function otherSide(side: Side): Side {
  return side === "home" ? "away" : "home";
}
