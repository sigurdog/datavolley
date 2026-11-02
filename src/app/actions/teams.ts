"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parsePastedRoster } from "@/lib/import/paste";

export async function createTeam(input: {
  clubId: string;
  name: string;
  shortName?: string;
  isOpponent: boolean;
}): Promise<{ error?: string; teamId?: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert({
      club_id: input.clubId,
      name,
      short_name: input.shortName?.trim() || null,
      is_opponent: input.isOpponent,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { teamId: data.id };
}

export async function deleteTeam(teamId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return {};
}

export async function addPlayer(input: {
  teamId: string;
  number: number;
  name?: string;
}): Promise<{ error?: string }> {
  if (!Number.isInteger(input.number) || input.number < 0 || input.number > 99) {
    return { error: "Number must be 0–99" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("players").insert({
    team_id: input.teamId,
    number: input.number,
    name: input.name?.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/teams/${input.teamId}`);
  return {};
}

export async function updatePlayer(input: {
  playerId: string;
  teamId: string;
  number: number;
  name?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({ number: input.number, name: input.name?.trim() || null })
    .eq("id", input.playerId);
  if (error) return { error: error.message };
  revalidatePath(`/teams/${input.teamId}`);
  return {};
}

export async function removePlayer(playerId: string, teamId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) return { error: error.message };
  revalidatePath(`/teams/${teamId}`);
  return {};
}

/** Import a pasted roster. Existing numbers are updated, new ones inserted. */
export async function importPastedRoster(
  teamId: string,
  text: string,
): Promise<{ error?: string; count?: number }> {
  const players = parsePastedRoster(text);
  if (players.length === 0) return { error: "No players found" };

  const supabase = await createClient();
  const { error } = await supabase.from("players").upsert(
    players.map((p) => ({ team_id: teamId, number: p.number, name: p.name || null })),
    { onConflict: "team_id,number" },
  );
  if (error) return { error: error.message };
  revalidatePath(`/teams/${teamId}`);
  return { count: players.length };
}
