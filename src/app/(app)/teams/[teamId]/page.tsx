import { notFound } from "next/navigation";
import { RosterEditor } from "@/components/RosterEditor";
import { createClient } from "@/lib/supabase/server";
import { rosterSources } from "@/lib/import/minvolleyball";
import type { Player, Team } from "@/lib/types";

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();

  const [{ data: team }, { data: players }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
    supabase.from("players").select("*").eq("team_id", teamId).order("number"),
  ]);
  if (!team) notFound();

  const plugins = rosterSources.map((s) => ({ id: s.id, label: s.label, available: s.isAvailable() }));

  return <RosterEditor team={team as Team} players={(players ?? []) as Player[]} plugins={plugins} />;
}
