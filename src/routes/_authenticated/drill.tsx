import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { liveEventsQuery, type Question } from "@/lib/data";
import { DIFFICULTY } from "@/lib/events";
import { FlagButton, QuestionCard } from "@/components/app/QuestionCard";
import { ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/drill")({
  head: () => ({ meta: [{ title: "Drill · SciOly@KLS" }, { name: "description", content: "One question at a time with instant feedback." }] }),
  component: Drill,
});

const ALL = "__all";

function Drill() {
  const qc = useQueryClient();
  const { data: events = [] } = useQuery(liveEventsQuery);
  const [event, setEvent] = useState(ALL);
  const [topic, setTopic] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);
  const [q, setQ] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [session, setSession] = useState({ answered: 0, correct: 0 });
  const seen = useRef<string[]>([]);
  const started = useRef(Date.now());

  const next = useCallback(async () => {
    setLoading(true);
    setChosen(null);
    const { data: id } = await supabase.rpc("next_drill_question", {
      p_event: event === ALL ? undefined : event,
      p_topic: topic === ALL ? undefined : topic,
      p_difficulty: difficulty === ALL ? undefined : Number(difficulty),
      p_exclude: seen.current,
    } as any);
    if (!id) {
      setQ(null);
      setEmpty(true);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("questions").select("*").eq("id", id as string).single();
    setQ(data as unknown as Question);
    setEmpty(false);
    setLoading(false);
    started.current = Date.now();
  }, [event, topic, difficulty]);

  useEffect(() => {
    seen.current = [];
    next();
  }, [next]);

  async function choose(i: number) {
    if (!q || chosen !== null) return;
    setChosen(i);
    const ok = i === q.correct_index;
    seen.current.push(q.id);
    setSession((s) => ({ answered: s.answered + 1, correct: s.correct + (ok ? 1 : 0) }));
    await supabase.from("attempts").insert({ question_id: q.id, mode: "drill", chosen_index: i, is_correct: ok, time_ms: Date.now() - started.current });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

  const topics = events.find((e) => e.event === event)?.topics ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Drill</h1>
        <span className="font-mono text-sm">
          <span className="text-success">{session.correct}</span>/{session.answered} this session
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Select value={event} onValueChange={(v) => { setEvent(v); setTopic(ALL); }}>
          <SelectTrigger><SelectValue placeholder="Event" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All events</SelectItem>
            {events.map((e) => <SelectItem key={e.event} value={e.event}>{e.event} ({e.count})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={topic} onValueChange={setTopic} disabled={event === ALL}>
          <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All topics</SelectItem>
            {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any level</SelectItem>
            {[1, 2, 3].map((d) => <SelectItem key={d} value={String(d)}>{DIFFICULTY[d]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading && <div className="panel flex h-60 items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>}
      {!loading && empty && (
        <div className="panel p-8 text-center">
          <h2 className="text-xl font-bold">You're caught up.</h2>
          <p className="mt-1 text-muted-foreground">No new or due questions for these filters. Try another event, or come back later for reviews.</p>
        </div>
      )}
      {!loading && q && (
        <>
          <QuestionCard q={q} chosen={chosen} reveal={chosen !== null} onChoose={choose} showTagsBefore={false} />
          {chosen !== null && (
            <div className="sticky bottom-20 flex items-center gap-2 md:bottom-4">
              <div className={chosen === q.correct_index ? "flex-1 font-display text-xl font-bold text-success" : "flex-1 font-display text-xl font-bold text-destructive"}>
                {chosen === q.correct_index ? "Correct!" : "Not quite — it'll come back soon."}
              </div>
              <FlagButton questionId={q.id} />
              <Button size="lg" onClick={next}>Next <ArrowRight /></Button>
            </div>
          )}
          {chosen === null && <div className="flex justify-end"><FlagButton questionId={q.id} onFlagged={next} /></div>}
        </>
      )}
    </div>
  );
}
