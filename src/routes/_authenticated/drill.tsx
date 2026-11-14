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
import { skipQuestion, matchingItems, matchesPracticeFilters, type TopicSelection } from "@/lib/practice";
import { Label } from "@/components/ui/label";
import { PracticeMultiSelect } from "@/components/app/PracticeMultiSelect";

export const Route = createFileRoute("/_authenticated/drill")({
  head: () => ({ meta: [{ title: "Practice · SciOly Center" }, { name: "description", content: "Practice Science Olympiad questions with answer checking and concise feedback." }, { property: "og:title", content: "Practice · SciOly Center" }, { property: "og:description", content: "Practice questions with answer checking and concise feedback." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Drill,
});

const ALL = "__all";

function Drill() {
  const qc = useQueryClient();
  const { data: events = [] } = useQuery(liveEventsQuery);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
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
    const topicFilters = selectedTopics.map((value) => JSON.parse(value) as TopicSelection);
    for (;;) {
    const { data: id } = await supabase.rpc("next_drill_question", {
      p_event: selectedEvents.length === 1 ? selectedEvents[0] : undefined,
      p_topic: topicFilters.length === 1 ? topicFilters[0]?.[1] : undefined,
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
    if (inPracticeScope(candidate) && matchesPracticeFilters(candidate, selectedEvents, topicFilters)) { data = candidate as unknown as Question; break; }
    seen.current.push(candidate.id);
    }
    setQ(data as unknown as Question);
    setEmpty(false);
    setLoading(false);
    started.current = Date.now();
  }, [selectedEvents, selectedTopics, difficulty]);

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

  const topics = events.filter((e) => selectedEvents.includes(e.event)).flatMap((e) => e.topicTree.flatMap((topic) => [{ value: JSON.stringify([e.event, topic.name, null]), label: topic.name, heading: e.event }, ...topic.subtopics.map((subtopic) => ({ value: JSON.stringify([e.event, topic.name, subtopic]), label: subtopic, indent: true, heading: e.event }))]));
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
        <PracticeMultiSelect label="Event" placeholder="Select events" options={events.map((e) => ({ value: e.event, label: e.event }))} value={selectedEvents} onChange={(values) => { setSelectedEvents(values); setSelectedTopics((current) => current.filter((value) => values.includes((JSON.parse(value) as TopicSelection)[0]))); }} /></div><div className="space-y-2"><Label>Topic</Label>
        <PracticeMultiSelect label="Topic" placeholder={selectedEvents.length ? "All topics in selected events" : "Select an event first"} options={topics} value={selectedTopics} onChange={setSelectedTopics} disabled={!selectedEvents.length} /></div><div className="space-y-2"><Label>Difficulty</Label>
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
