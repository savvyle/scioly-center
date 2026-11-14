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
import { inPracticeScope } from "@/lib/practice-scope";
import { SaveButton } from "@/components/app/SaveButton";
import { skipQuestion, matchingItems } from "@/lib/practice";
import { Label } from "@/components/ui/label";

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
  const [active, setActive] = useState(false);
  const [q, setQ] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
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
    let data: Question | null = null;
    const selectedTopic = topic === ALL ? null : JSON.parse(topic) as [string, string | null];
    for (;;) {
    const { data: id } = await supabase.rpc("next_drill_question", {
      p_event: event === ALL ? undefined : event,
      p_topic: selectedTopic?.[0],
      p_difficulty: difficulty === ALL ? undefined : Number(difficulty),
      p_exclude: seen.current,
    } as any);
    if (!id) {
      setQ(null);
      setEmpty(true);
      setLoading(false);
      return;
    }
    const { data: candidate, error } = await supabase.from("questions").select("*").eq("id", id as string).single();
    if (error || !candidate) { setLoading(false); toast.error("Couldn't load this question."); return; }
    if (inPracticeScope(candidate) && (!selectedTopic?.[1] || candidate.subtopic === selectedTopic[1])) { data = candidate as unknown as Question; break; }
    seen.current.push(candidate.id);
    }
    setQ(data as unknown as Question);
    setEmpty(false);
    setLoading(false);
    started.current = Date.now();
  }, [event, topic, difficulty]);

  useEffect(() => {
    seen.current = [];
    if (active) next();
  }, [next, active]);

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
      qc.invalidateQueries({ queryKey: ["missed"] });
      qc.invalidateQueries({ queryKey: ["question-mastery", q.id] });
      qc.invalidateQueries({ queryKey: ["practice-reviews"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't check your answer."); }
    finally { checkingRef.current = false; setChecking(false); }
  }

  const topics = event === ALL ? events.flatMap((e) => e.topicTree).filter((t, i, all) => all.findIndex((x) => x.name === t.name) === i) : events.find((e) => e.event === event)?.topicTree ?? [];
  const { data: reviews } = useQuery({ queryKey: ["practice-reviews"], queryFn: async () => {
    const { data, error } = await supabase.from("review_state").select("box,due_at,questions!inner(event,topic,subtopic,division,status,merged_into)").order("due_at");
    if (error) throw error;
    const eligible = (data ?? []).filter((r) => r.questions.status === "live" && !r.questions.merged_into && inPracticeScope(r.questions));
    return { due: eligible.filter((r) => new Date(r.due_at) <= new Date()).length, next: eligible.find((r) => new Date(r.due_at) > new Date())?.due_at };
  } });
  const matching = q ? matchingItems(q.stem, q.choices) : [];
  const complete = q?.question_type === "free_response" ? matching.length ? matching.every((_, i) => /—\s*[A-J]/.test(answer.text.split("\n")[i] ?? "")) : !!answer.text.trim() : answer.indices.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Practice</h1>
        <span className="font-mono text-sm">
          <span className="text-success">{session.correct}</span>/{session.answered} this session
        </span>
      </div>
      {active && <div className="flex justify-end"><Button variant="ghost" size="sm" disabled={checking} onClick={() => setActive(false)}>Change practice</Button></div>}
      {!active && <><section className="space-y-5 border-y border-border py-6"><div className="space-y-2"><Label>Event</Label>
        <Select value={event} onValueChange={(v) => { setEvent(v); setTopic(ALL); }}>
          <SelectTrigger aria-label="Event"><SelectValue placeholder="Event" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All events</SelectItem>
            {events.map((e) => <SelectItem key={e.event} value={e.event}>{e.event} ({e.count})</SelectItem>)}
          </SelectContent>
        </Select></div><div className="space-y-2"><Label>Topic</Label>
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger aria-label="Topic"><SelectValue placeholder="Topic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All topics</SelectItem>
            {topics.map((t) => <div key={t.name}><SelectItem className="font-semibold" value={JSON.stringify([t.name, null])}>{t.name}</SelectItem>{t.subtopics.map((s) => <SelectItem className="pl-7" key={s} value={JSON.stringify([t.name, s])}>{s}</SelectItem>)}</div>)}
          </SelectContent>
        </Select></div><div className="space-y-2"><Label>Difficulty</Label>
        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger aria-label="Difficulty"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any level</SelectItem>
            {[1, 2, 3].map((d) => <SelectItem key={d} value={String(d)}>{DIFFICULTY[d]}</SelectItem>)}
          </SelectContent>
        </Select></div><Button size="lg" className="w-full" onClick={() => { seen.current = []; setActive(true); }}>Practice <ArrowRight /></Button></section><div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>{reviews?.due ?? 0} reviews due</span>{reviews?.next && <span>Next review {new Date(reviews.next).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}</div></>}

      {active && loading && <div className="panel flex h-60 items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>}
      {active && !loading && empty && (
        <div className="panel p-8 text-center">
          <h2 className="text-xl font-bold">No more questions this round.</h2>
          <p className="mt-1 text-muted-foreground">No new or due questions for these filters. Try another event, or come back later for reviews.</p>
          <Button className="mt-4" onClick={() => { seen.current = []; next(); }}>Practice again</Button>
        </div>
      )}
      {active && !loading && q && (
        <>
          <QuestionCard q={q} chosen={answer.indices[0] ?? null} answer={answer} reveal={checked !== null} onAnswer={checking ? undefined : setAnswer} feedback={checked?.bullets} />
          {checked && (
            <div className="sticky bottom-20 flex flex-wrap items-center gap-2 bg-background py-2 md:bottom-4">
              <div className={checked.correct ? "flex-1 font-display text-xl font-bold text-success" : "flex-1 font-display text-xl font-bold text-destructive"}>
                {checked.correct ? "Correct!" : "Not quite"} <span className="text-sm">{checked.points}/{checked.possible} pts</span>
              </div>
              <SaveButton questionId={q.id} /><FlagButton questionId={q.id} />
              <Button size="lg" onClick={next}>Next <ArrowRight /></Button>
            </div>
          )}
          {!checked && <div className="flex flex-wrap items-center justify-end gap-2"><Button variant="outline" disabled={checking} onClick={() => { seen.current = skipQuestion(seen.current, q.id); next(); }}>Skip <ArrowRight /></Button><SaveButton questionId={q.id} />{!checking && <FlagButton questionId={q.id} onFlagged={next} />}<Button size="lg" onClick={commitAnswer} disabled={checking || !complete}>{checking && <Loader2 className="animate-spin" />}{checking ? "Checking…" : "Check answer"}</Button></div>}
        </>
      )}
    </div>
  );
}
