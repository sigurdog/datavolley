import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { Dashboard } from "@/components/Dashboard";
import type { Club, Match, Team } from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");

  const { data: clubs } = await supabase
    .from("clubs")
    .select("*")
    .order("created_at", { ascending: true });

  const club = (clubs?.[0] as Club | undefined) ?? null;
  if (!club) return <Dashboard club={null} teams={[]} matches={[]} playerCounts={{}} />;

  const [{ data: teams }, { data: matches }, { data: players }] = await Promise.all([
    supabase.from("teams").select("*").eq("club_id", club.id).order("is_opponent").order("name"),
    supabase
      .from("matches")
      .select("*")
      .eq("club_id", club.id)
      .order("played_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("players").select("team_id"),
  ]);

  const playerCounts: Record<string, number> = {};
  for (const p of players ?? []) {
    playerCounts[p.team_id] = (playerCounts[p.team_id] ?? 0) + 1;
  }

  return (
    <Dashboard
      club={club}
      teams={(teams ?? []) as Team[]}
      matches={(matches ?? []) as Match[]}
      playerCounts={playerCounts}
    />
  );
}
