import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { statsQuery } from "@/lib/data";
import { selectedEventProgress } from "@/lib/event-progress";
import { pct } from "@/lib/week";

export function MyEventProgress({ userId }: { userId: string }) {
  const { data: picked = [] } = useQuery({
    queryKey: ["my-events", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_events").select("event").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((row) => row.event);
    },
  });
  const { data: totals = [] } = useQuery(statsQuery(userId));
  const rows = selectedEventProgress(picked, totals);
  return (
    <section className="panel min-w-0 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">My event(s)</h2>
        <Button asChild variant="outline" size="sm"><Link to="/events">Pick your event(s)</Link></Button>
      </div>
      {!rows.length ? <p className="mt-4 text-sm text-muted-foreground">No events picked yet.</p> : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem_4rem] gap-2 text-right font-mono text-[11px] text-muted-foreground">
            <span className="text-left">Event</span><span>Done</span><span>Right</span><span>Accuracy</span>
          </div>
          {rows.map((row) => <div key={row.event} className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem_4rem] items-center gap-2 text-sm">
              <span className="min-w-0 break-words font-medium">{row.event}</span>
              <span className="text-right font-mono text-xs">{row.answered}</span>
              <span className="text-right font-mono text-xs">{row.correct}</span>
              <span className="text-right font-mono text-xs">{row.accuracy === null ? "—" : pct(row.accuracy)}</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: pct(row.accuracy ?? 0) }} />
            </div>
          </div>)}
        </div>
      )}
    </section>
  );
}