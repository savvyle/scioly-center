import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { leaderboardQuery } from "@/lib/data";
import { useMe } from "@/lib/auth";
import { fmtWeek, pct } from "@/lib/week";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard · SciOly@KLS" }, { name: "description", content: "Weekly ranking by correct answers." }] }),
  component: Board,
});

function Board() {
  const [offset, setOffset] = useState(0);
  const { data: me } = useMe();
  const { data = [] } = useQuery(leaderboardQuery(offset));
  const week = data[0];
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">Weekly leaderboard</h1>
      <div className="flex gap-2">
        {["This week", "Last week", "2 weeks ago"].map((l, i) => (
          <button key={l} onClick={() => setOffset(i)} className={cn("rounded-full border border-border px-3 py-1 text-sm", offset === i && "border-foreground bg-foreground text-background")}>{l}</button>
        ))}
      </div>
      {week && <p className="font-mono text-xs text-muted-foreground">{fmtWeek(week.week_start, week.week_end)} · ranked by correct answers, ties go to accuracy</p>}
      <div className="panel divide-y divide-border">
        <div className="grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem_3.5rem] gap-2 px-4 py-2 font-mono text-[11px] uppercase text-muted-foreground">
          <span>#</span><span>Name</span><span className="text-right">Done</span><span className="text-right">Right</span><span className="text-right">Acc</span>
        </div>
        {data.map((r) => (
          <div key={r.user_id} className={cn("grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem_3.5rem] items-center gap-2 px-4 py-2.5", r.user_id === me?.id && "bg-secondary")}>
            <span className={cn("font-display text-lg font-extrabold", r.rank <= 3 && r.correct > 0 && "text-accent")}>{r.rank}</span>
            <span className="truncate font-medium">{r.display_name} {r.division && <span className="tag ml-1">{r.division}</span>}</span>
            <span className="text-right font-mono text-sm">{r.answered}</span>
            <span className="text-right font-mono text-sm font-semibold">{r.correct}</span>
            <span className="text-right font-mono text-sm">{r.answered ? pct(Number(r.accuracy)) : "—"}</span>
          </div>
        ))}
        {!data.length && <p className="p-4 text-sm text-muted-foreground">No students yet.</p>}
      </div>
    </div>
  );
}
