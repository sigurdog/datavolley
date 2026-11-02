import { redirect } from "next/navigation";
import { NewMatchForm } from "@/components/NewMatchForm";
import { createClient } from "@/lib/supabase/server";
import type { Club, Player, Team } from "@/lib/types";

export default async function NewMatchPage() {
  const supabase = await createClient();
  const { data: clubs } = await supabase.from("clubs").select("*").order("created_at").limit(1);
  const club = clubs?.[0] as Club | undefined;
  if (!club) redirect("/dashboard");

  const [{ data: teams }, { data: players }] = await Promise.all([
    supabase.from("teams").select("*").eq("club_id", club.id).order("is_opponent").order("name"),
    supabase.from("players").select("*").order("number"),
  ]);

  return (
    <NewMatchForm club={club} teams={(teams ?? []) as Team[]} players={(players ?? []) as Player[]} />
  );
}
