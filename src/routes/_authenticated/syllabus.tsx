import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { statsQuery } from "@/lib/data";
import { SYLLABUS } from "@/lib/syllabus";
import { pct } from "@/lib/week";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/syllabus")({
  head: () => ({ meta: [{ title: "Syllabus · SciOly Center" }, { name: "description", content: "Every 2027 concept to master, with your accuracy." }, { property: "og:title", content: "Syllabus · SciOly Center" }, { property: "og:description", content: "Every 2027 concept to master, with your accuracy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SyllabusPage,
});

function level(acc: number | null, n: number) {
  if (acc === null || n < 3) return { label: n ? "Started" : "Not started", cls: "bg-muted" };
  if (acc >= 0.8) return { label: "Mastered", cls: "bg-success" };
  if (acc >= 0.6) return { label: "Getting there", cls: "bg-accent" };
  return { label: "Needs work", cls: "bg-destructive" };
}

function SyllabusPage() {
  const { data: me } = useMe();
  const division = me?.division ?? "B";
  const { data: stats = [] } = useQuery({ ...statsQuery(me?.id ?? null), enabled: !!me });
  const { data: mine = [] } = useQuery({
    queryKey: ["my-events", me?.id], enabled: !!me,
    queryFn: async () => ((await supabase.from("student_events").select("event").eq("user_id", me!.id)).data ?? []).map((r) => r.event),
  });
  const syl = SYLLABUS[division];
  const events = Object.keys(syl).sort((a, b) => Number(mine.includes(b)) - Number(mine.includes(a)) || a.localeCompare(b));
  if (!me) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">2027 syllabus · Div {division}</h1>
      <p className="text-muted-foreground">Every concept from the official rules. Mastered = 80%+ over 3 or more questions. <Link to="/events" className="text-primary underline">Pick your events</Link></p>
      {!events.length && <p className="panel p-4 text-sm text-muted-foreground">The Division {division} syllabus hasn't been added yet.</p>}
      {events.map((e) => (
        <details key={e} className="panel p-4" open={mine.includes(e)}>
          <summary className="flex cursor-pointer items-center justify-between">
            <span className="font-bold">{e} {mine.includes(e) && <span className="tag ml-1">my event</span>}</span>
            <span className="tag">{syl[e]!.type}</span>
          </summary>
          <div className="mt-3 space-y-2">
            {syl[e]!.topics.map((t) => {
              const s = stats.find((r) => r.event === e && r.topic === t.name);
              const acc = s ? s.correct / s.answered : null;
              const l = level(acc, s?.answered ?? 0);
              return (
                <div key={t.name} className="flex items-start gap-3">
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", l.cls)} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm font-medium"><span>{t.name}</span><span className="font-mono text-xs text-muted-foreground">{s ? `${pct(acc!)} of ${s.answered}` : l.label}</span></div>
                    <div className="text-xs text-muted-foreground">{t.subtopics.join(" · ")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
