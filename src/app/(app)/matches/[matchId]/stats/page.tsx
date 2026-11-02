import { notFound } from "next/navigation";
import { StatsView } from "@/components/StatsView";
import { loadMatchBundle } from "@/lib/loadMatch";

export default async function StatsPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const bundle = await loadMatchBundle(matchId);
  if (!bundle) notFound();
  return <StatsView {...bundle} />;
}
