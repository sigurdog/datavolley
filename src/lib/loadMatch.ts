import { createClient } from "@/lib/supabase/server";
import type { Match, Player, Rally, SetRecord, Team } from "@/lib/types";

export interface MatchBundle {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  /** Squad for this match (falls back to full rosters when no squad was picked). */
  homePlayers: Player[];
  awayPlayers: Player[];
  sets: SetRecord[];
  rallies: Rally[];
}

export async function loadMatchBundle(matchId: string): Promise<MatchBundle | null> {
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!match) return null;

  const [{ data: teams }, { data: players }, { data: squad }, { data: sets }, { data: rallies }] =
    await Promise.all([
      supabase.from("teams").select("*").in("id", [match.home_team_id, match.away_team_id]),
      supabase
        .from("players")
        .select("*")
        .in("team_id", [match.home_team_id, match.away_team_id])
        .order("number"),
      supabase.from("match_players").select("player_id").eq("match_id", matchId),
      supabase.from("sets").select("*").eq("match_id", matchId).order("set_number"),
      supabase
        .from("rallies")
        .select("*")
        .eq("match_id", matchId)
        .order("set_number")
        .order("seq"),
    ]);

  const homeTeam = (teams ?? []).find((t) => t.id === match.home_team_id) as Team | undefined;
  const awayTeam = (teams ?? []).find((t) => t.id === match.away_team_id) as Team | undefined;
  if (!homeTeam || !awayTeam) return null;

  const squadIds = new Set((squad ?? []).map((s) => s.player_id));
  const all = (players ?? []) as Player[];
  const inSquad = (p: Player) => squadIds.size === 0 || squadIds.has(p.id);

  return {
    match: match as Match,
    homeTeam,
    awayTeam,
    homePlayers: all.filter((p) => p.team_id === homeTeam.id && inSquad(p)),
    awayPlayers: all.filter((p) => p.team_id === awayTeam.id && inSquad(p)),
    sets: (sets ?? []) as SetRecord[],
    rallies: (rallies ?? []) as Rally[],
  };
}
