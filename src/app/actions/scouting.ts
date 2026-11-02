"use server";

import { createClient } from "@/lib/supabase/server";
import { lineupComplete } from "@/lib/engine/state";
import type { Lineup, Rally, SetRecord, Side } from "@/lib/types";

export async function saveSetLineup(input: {
  matchId: string;
  setNumber: number;
  firstServer: Side;
  homeLineup: Lineup;
  awayLineup: Lineup;
}): Promise<{ error?: string; set?: SetRecord }> {
  if (!lineupComplete(input.homeLineup) || !lineupComplete(input.awayLineup)) {
    return { error: "Lineup incomplete" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sets")
    .upsert(
      {
        match_id: input.matchId,
        set_number: input.setNumber,
        first_server: input.firstServer,
        home_lineup: input.homeLineup,
        away_lineup: input.awayLineup,
      },
      { onConflict: "match_id,set_number" },
    )
    .select("*")
    .single();
  if (error) return { error: error.message };

  // Make sure the match is marked live once scouting starts.
  await supabase
    .from("matches")
    .update({ status: "live" })
    .eq("id", input.matchId)
    .eq("status", "scheduled");

  return { set: data as SetRecord };
}

export async function insertRally(
  rally: Omit<Rally, "id">,
): Promise<{ error?: string; rally?: Rally }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("rallies")
    .insert({ ...rally, created_by: user?.id ?? null })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { rally: data as Rally };
}

export async function deleteRally(rallyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("rallies").delete().eq("id", rallyId);
  if (error) return { error: error.message };
  return {};
}

export async function markSetFinished(
  matchId: string,
  setNumber: number,
  finished: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sets")
    .update({ finished })
    .eq("match_id", matchId)
    .eq("set_number", setNumber);
  if (error) return { error: error.message };
  return {};
}
