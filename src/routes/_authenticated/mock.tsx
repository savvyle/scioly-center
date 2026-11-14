import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { liveEventsQuery, type Question } from "@/lib/data";
import { QuestionCard } from "@/components/app/QuestionCard";
import { pct } from "@/lib/week";
import { ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mock")({
  head: () => ({ meta: [{ title: "Mock test · SciOly Center" }, { name: "description", content: "Timed 50-minute practice tests." }] }),
  component: Mock,
});

const DURATION = 50 * 60;
const MAX_Q = 50;

type Run = { id: string; event: string; questions: Question[]; startedAt: number };

function Mock() {
  const qc = useQueryClient();
  const { data: events = [] } = useQuery(liveEventsQuery);
  const [run, setRun] = useState<Run | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    if (!run || result) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [run, result]);

  const left = run ? Math.max(0, DURATION - Math.floor((now - run.startedAt) / 1000)) : DURATION;
  useEffect(() => {
    if (run && !result && left === 0) submit();
  }, [left]);

  async function start(event: string) {
    const { data } = await supabase.from("questions").select("*").eq("status", "live").eq("event", event).limit(1000);
    const pool = ((data ?? []) as unknown as Question[]).sort(() => Math.random() - 0.5).slice(0, MAX_Q);
    if (!pool.length) { toast.error("No questions for that event yet."); return; }
    const { data: u } = await supabase.auth.getUser();
    const { data: m, error } = await supabase.from("mock_tests").insert({ user_id: u.user!.id, event, question_ids: pool.map((p) => p.id), duration_sec: DURATION }).select("id, started_at").single();
    if (error || !m) { toast.error("Couldn't start the test."); return; }
    setAnswers({});
    setIdx(0);
    setResult(null);
    setRun({ id: m.id, event, questions: pool, startedAt: Date.now() });
  }

  async function submit() {
    if (!run || result) return;
    const rows = run.questions.map((q) => ({
      question_id: q.id, mode: "mock", mock_id: run.id,
      chosen_index: answers[q.id] ?? null, is_correct: answers[q.id] === q.correct_index,
    }));
    const score = rows.filter((r) => r.is_correct).length;
    setResult({ score, total: rows.length });
    await supabase.from("attempts").insert(rows.filter((r) => r.chosen_index !== null));
    await supabase.from("mock_tests").update({ finished_at: new Date().toISOString(), score, total: rows.length }).eq("id", run.id);
    qc.invalidateQueries();
  }

  if (!run) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-extrabold">Mock test</h1>
        <p className="text-muted-foreground">50 minutes, one event, up to {MAX_Q} questions. You see results only at the end, like a real tournament.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {events.map((e) => (
            <button key={e.event} onClick={() => start(e.event)} className="panel flex items-center justify-between p-4 text-left hover:border-primary">
              <span className="font-semibold">{e.event}</span>
              <span className="tag">{Math.min(e.count, MAX_Q)} Q</span>
            </button>
          ))}
          {!events.length && <p className="text-sm text-muted-foreground">No questions in the bank yet.</p>}
        </div>
      </div>
    );
  }

  if (result) {
    const missed = run.questions.filter((q) => answers[q.id] !== q.correct_index);
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="panel p-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{run.event}</p>
          <div className="font-display text-6xl font-extrabold">{result.score}<span className="text-2xl text-muted-foreground">/{result.total}</span></div>
          <p className="text-lg">{pct(result.score / result.total)}</p>
          <Button className="mt-4" onClick={() => setRun(null)}>Done</Button>
        </div>
        {missed.length > 0 && <h2 className="text-xl font-bold">Review your misses ({missed.length})</h2>}
        {missed.map((q) => <QuestionCard key={q.id} q={q} chosen={answers[q.id] ?? null} reveal />)}
      </div>
    );
  }

  const q = run.questions[idx]!;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{run.event}</span>
        <span className={cn("flex items-center gap-1 font-mono text-lg font-medium", left < 300 && "text-destructive")}><Timer className="h-4 w-4" />{mm}:{ss}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {run.questions.map((qq, i) => (
          <button key={qq.id} onClick={() => setIdx(i)} className={cn("h-7 w-7 rounded border border-border font-mono text-xs", answers[qq.id] !== undefined && "bg-secondary", i === idx && "border-primary ring-1 ring-primary")}>
            {i + 1}
          </button>
        ))}
      </div>
      <QuestionCard q={q} chosen={answers[q.id] ?? null} reveal={false} showTagsBefore={false} onChoose={(i) => setAnswers({ ...answers, [q.id]: i })} />
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={idx === 0} onClick={() => setIdx(idx - 1)}><ChevronLeft /></Button>
        <Button variant="outline" disabled={idx === run.questions.length - 1} onClick={() => setIdx(idx + 1)}><ChevronRight /></Button>
        <span className="flex-1 text-center font-mono text-xs text-muted-foreground">{Object.keys(answers).length}/{run.questions.length} answered</span>
        <Button variant="hero" onClick={() => { if (confirm("Submit your test?")) submit(); }}>Submit</Button>
      </div>
    </div>
  );
}
