import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { leaderboardQuery, settingsQuery } from "@/lib/data";
import { meetsGoal, pct } from "@/lib/week";
import { EventAccuracy, TrendChart } from "@/components/app/StatsPanels";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/")({
  head: () => ({ meta: [{ title: "Team dashboard · SciOly Center" }, { name: "description", content: "Team strength by event and weekly goals." }] }),
  component: CoachHome,
});

function CoachHome() {
  const [div, setDiv] = useState<"B" | "C" | null>(null);
  const { data: goal } = useQuery(settingsQuery);
  const { data: board = [] } = useQuery(leaderboardQuery(0));
  const rows = board.filter((r) => !div || r.division === div);
  const missed = goal ? rows.filter((r) => !meetsGoal(r.answered, r.correct, goal)) : [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-extrabold">Team</h1>
        {([null, "B", "C"] as const).map((d) => (
          <button key={String(d)} onClick={() => setDiv(d)} className={cn("rounded-full border border-border px-3 py-1 text-sm", div === d && "border-foreground bg-foreground text-background")}>
            {d ? `Div ${d}` : "Both"}
          </button>
        ))}
        {goal?.familySheetUrl && (
          <a href={goal.familySheetUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primary underline">Family info <ExternalLink className="h-3 w-3" /></a>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <EventAccuracy userId={null} division={div} />
        <div className="panel p-4">
          <h2 className="text-lg font-bold">Missing the weekly goal <span className="text-muted-foreground">({missed.length}/{rows.length})</span></h2>
          <div className="mt-2 divide-y divide-border">
            {missed.map((r) => (
              <Link key={r.user_id} to="/coach/students/$id" params={{ id: r.user_id }} className="flex justify-between py-2 text-sm hover:text-primary">
                <span>{r.display_name} {r.division && <span className="tag">{r.division}</span>}</span>
                <span className="font-mono text-xs">{r.answered} Q · {r.answered ? pct(Number(r.accuracy)) : "—"}</span>
              </Link>
            ))}
            {!missed.length && <p className="py-2 text-sm text-muted-foreground">Everyone is on track.</p>}
          </div>
        </div>
      </div>
      <TrendChart userId={null} />
      <div className="panel p-4">
        <h2 className="text-lg font-bold">Students</h2>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {rows.map((r) => (
            <Link key={r.user_id} to="/coach/students/$id" params={{ id: r.user_id }} className="flex justify-between rounded-md px-2 py-1.5 text-sm hover:bg-secondary">
              <span>{r.display_name}</span><span className="font-mono text-xs text-muted-foreground">{r.correct}/{r.answered} this week</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
