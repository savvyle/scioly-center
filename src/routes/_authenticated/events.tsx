import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { CONFLICT_BLOCKS, conflictWith, groupOf } from "@/lib/conflict-blocks";
import { SYLLABUS } from "@/lib/syllabus";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "My events · SciOly Center" }, { name: "description", content: "Pick your events, one per conflict block." }] }),
  component: EventsPage,
});

function EventsPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const division = me?.division ?? "B";
  const { data: picked = [] } = useQuery({
    queryKey: ["my-events", me?.id],
    enabled: !!me,
    queryFn: async () => ((await supabase.from("student_events").select("event").eq("user_id", me!.id)).data ?? []).map((r) => r.event),
  });

  async function toggle(event: string) {
    if (!me) return;
    if (picked.includes(event)) {
      await supabase.from("student_events").delete().eq("user_id", me.id).eq("event", event);
    } else {
      const clash = conflictWith(division, picked, event);
      if (clash) { toast.error(`${event} is in the same block as ${clash}. Drop ${clash} first.`); return; }
      const { error } = await supabase.from("student_events").insert({ user_id: me.id, event, division, conflict_group: groupOf(division, event)! });
      if (error) { toast.error("Couldn't add that event."); return; }
    }
    qc.invalidateQueries({ queryKey: ["my-events"] });
  }

  if (!me) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">My events · Div {division}</h1>
      <p className="text-muted-foreground">Events in the same block run at the same time at tournaments, so you can pick one per block.</p>
      {CONFLICT_BLOCKS[division].map((group, i) => (
        <div key={i} className="panel p-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Block {i + 1}</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {group.map((e) => {
              const on = picked.includes(e);
              const blocked = !on && !!conflictWith(division, picked, e);
              const topics = SYLLABUS[division]?.[e]?.topics.length;
              return (
                <button key={e} onClick={() => toggle(e)} className={cn("flex items-center justify-between rounded-lg border-2 border-border px-3 py-2.5 text-left", on && "border-primary bg-secondary", blocked && "opacity-40")}>
                  <span><span className="font-semibold">{e}</span>{topics ? <span className="block text-xs text-muted-foreground">{topics} topics</span> : null}</span>
                  {on && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
