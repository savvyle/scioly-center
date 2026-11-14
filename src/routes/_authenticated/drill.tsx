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
import { useServerFn } from "@tanstack/react-start";
import { checkAnswer } from "@/lib/answers.functions";
import { emptyAnswer, type Answer } from "@/lib/answers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/drill")({
  head: () => ({ meta: [{ title: "Practice · SciOly Center" }, { name: "description", content: "Practice Science Olympiad questions with answer checking and concise feedback." }, { property: "og:title", content: "Practice · SciOly Center" }, { property: "og:description", content: "Practice questions with answer checking and concise feedback." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
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
  const [answer, setAnswer] = useState<Answer>(emptyAnswer);
  const [checked, setChecked] = useState<{ correct: boolean; points: number; possible: number; bullets: string[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const submissionId = useRef("");
  const check = useServerFn(checkAnswer);
  const [session, setSession] = useState({ answered: 0, correct: 0 });
  const seen = useRef<string[]>([]);
  const started = useRef(Date.now());

  const next = useCallback(async () => {
    setLoading(true);
    setAnswer(emptyAnswer());
    setChecked(null);
    submissionId.current = crypto.randomUUID();
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

  async function commitAnswer() {
    if (!q || checked || checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const result = await check({ data: { questionId: q.id, submissionId: submissionId.current, ...answer } });
      setChecked(result);
      seen.current.push(q.id);
      setSession((s) => ({ answered: s.answered + 1, correct: s.correct + (result.correct ? 1 : 0) }));
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["trend"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't check your answer."); }
    finally { checkingRef.current = false; setChecking(false); }
  }

  const topics = events.find((e) => e.event === event)?.topics ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Practice</h1>
        <span className="font-mono text-sm">
          <span className="text-success">{session.correct}</span>/{session.answered} this session
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Select disabled={checking} value={event} onValueChange={(v) => { setEvent(v); setTopic(ALL); }}>
          <SelectTrigger><SelectValue placeholder="Event" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All events</SelectItem>
            {events.map((e) => <SelectItem key={e.event} value={e.event}>{e.event} ({e.count})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={topic} onValueChange={setTopic} disabled={event === ALL || checking}>
          <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All topics</SelectItem>
            {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select disabled={checking} value={difficulty} onValueChange={setDifficulty}>
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
          <QuestionCard q={q} chosen={answer.indices[0] ?? null} answer={answer} reveal={checked !== null} onAnswer={checking ? undefined : setAnswer} feedback={checked?.bullets} />
          {checked && (
            <div className="sticky bottom-20 flex flex-wrap items-center gap-2 bg-background py-2 md:bottom-4">
              <div className={checked.correct ? "flex-1 font-display text-xl font-bold text-success" : "flex-1 font-display text-xl font-bold text-destructive"}>
                {checked.correct ? "Correct!" : "Not quite"} <span className="text-sm">{checked.points}/{checked.possible} pts</span>
              </div>
              <FlagButton questionId={q.id} />
              <Button size="lg" onClick={next}>Next <ArrowRight /></Button>
            </div>
          )}
          {!checked && <div className="flex items-center justify-end gap-2">{!checking && <FlagButton questionId={q.id} onFlagged={next} />}<Button size="lg" onClick={commitAnswer} disabled={checking || (q.question_type === "free_response" ? !answer.text.trim() : !answer.indices.length)}>{checking && <Loader2 className="animate-spin" />}{checking ? "Checking…" : "Check answer"}</Button></div>}
        </>
      )}
    </div>
  );
}
