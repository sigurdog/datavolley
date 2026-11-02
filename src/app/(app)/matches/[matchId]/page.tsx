import { notFound } from "next/navigation";
import { MatchScout } from "@/components/scout/MatchScout";
import { loadMatchBundle } from "@/lib/loadMatch";

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const bundle = await loadMatchBundle(matchId);
  if (!bundle) notFound();
  return <MatchScout {...bundle} />;
}
