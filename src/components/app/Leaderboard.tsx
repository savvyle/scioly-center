import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { leaderboardQuery } from "@/lib/data";
import { useMe } from "@/lib/auth";
import { fmtWeek, pct } from "@/lib/week";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Leaderboard() {
  const [offset, setOffset] = useState(0);
  const { data: me } = useMe();
  const { data = [] } = useQuery(leaderboardQuery(offset));
  const week = data[0];
  return (
    <section className="space-y-4 border-t border-border pt-6">
      <h2 className="text-2xl font-extrabold">Weekly leaderboard</h2>
      <div className="flex flex-wrap gap-2">
        {["This week", "Last week", "2 weeks ago"].map((label, i) => (
          <Button key={label} size="sm" variant={offset === i ? "default" : "outline"} aria-pressed={offset === i} onClick={() => setOffset(i)}>{label}</Button>
        ))}
      </div>
      {week && <p className="font-mono text-xs text-muted-foreground">{fmtWeek(week.week_start, week.week_end)} · ranked by correct answers, ties go to accuracy</p>}
      <div className="divide-y divide-border">
        <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_2.5rem_2.5rem_3rem] gap-2 py-2 font-mono text-[11px] uppercase text-muted-foreground sm:grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_3.5rem_3.5rem] sm:px-4">
          <span>#</span><span>Name</span><span className="text-right">Done</span><span className="text-right">Right</span><span className="text-right">Acc</span>
        </div>
        {data.map((r) => (
          <div key={r.user_id} className={cn("grid grid-cols-[1.5rem_minmax(0,1fr)_2.5rem_2.5rem_3rem] items-center gap-2 py-2.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_3.5rem_3.5rem_3.5rem] sm:px-4", r.user_id === me?.id && "bg-secondary")}>
            <span className={cn("font-display text-lg font-extrabold", r.rank <= 3 && r.correct > 0 && "text-accent")}>{r.rank}</span>
            <span className="min-w-0 truncate font-medium">{r.display_name} {r.division && <span className="tag ml-1">{r.division}</span>}</span>
            <span className="text-right font-mono text-sm">{r.answered}</span>
            <span className="text-right font-mono text-sm font-semibold">{r.correct}</span>
            <span className="text-right font-mono text-sm">{r.answered ? pct(Number(r.accuracy)) : "—"}</span>
          </div>
        ))}
        {!data.length && <p className="py-4 text-sm text-muted-foreground">No students yet.</p>}
      </div>
    </section>
  );
}