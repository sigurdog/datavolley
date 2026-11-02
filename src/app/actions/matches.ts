"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createMatch(input: {
  clubId: string;
  homeTeamId: string;
  awayTeamId: string;
  playedAt: string;
  venue?: string;
  trackReception: boolean;
  setsToWin: number;
  squadPlayerIds: string[];
}): Promise<{ error?: string; matchId?: string }> {
  if (input.homeTeamId === input.awayTeamId) return { error: "Teams must differ" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data, error } = await supabase
    .from("matches")
    .insert({
      club_id: input.clubId,
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
      played_at: input.playedAt,
      venue: input.venue?.trim() || null,
      track_reception: input.trackReception,
      sets_to_win: input.setsToWin,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (input.squadPlayerIds.length > 0) {
    const { error: sqErr } = await supabase
      .from("match_players")
      .insert(input.squadPlayerIds.map((player_id) => ({ match_id: data.id, player_id })));
    if (sqErr) return { error: sqErr.message };
  }

  revalidatePath("/dashboard");
  return { matchId: data.id };
}

export async function deleteMatch(matchId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return {};
}

export async function setMatchStatus(
  matchId: string,
  status: "scheduled" | "live" | "finished",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ status }).eq("id", matchId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath(`/matches/${matchId}`);
  return {};
}
