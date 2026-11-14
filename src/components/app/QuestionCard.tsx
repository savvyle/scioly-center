import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, Flag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DIFFICULTY } from "@/lib/events";
import { signedImageUrls, type Question } from "@/lib/data";
import { toast } from "sonner";
import { cleanStem, type Answer } from "@/lib/answers";
import { useQuery } from "@tanstack/react-query";
import { masteryLevel, matchingItems, sourceLabel } from "@/lib/practice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditQuestionButton } from "./EditQuestionButton";
import { useServerFn } from "@tanstack/react-start";
import { reportQuestion } from "@/lib/report.functions";

const LETTERS = "ABCDEFGHIJ";

export function QuestionTags({ q }: { q: Question }) {
  const { data: state } = useQuery({ queryKey: ["question-mastery", q.id], queryFn: async () => {
    const { data, error } = await supabase.from("review_state").select("box,due_at").eq("question_id", q.id).maybeSingle();
    if (error) throw error;
    return data;
  } });
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="tag">{DIFFICULTY[q.difficulty]}</span>
      <span className="tag">{q.points ?? 1} pt{Number(q.points ?? 1) === 1 ? "" : "s"}</span>
      <span className={`tag ${state?.box === 4 ? "text-success" : ""}`}>{masteryLevel(state?.box)}</span>
      {state && <span className="self-center text-xs text-muted-foreground">{new Date(state.due_at) <= new Date() ? "Review due" : `Next review ${new Date(state.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}</span>}
    </div>
  );
}

function QuestionSource({ q }: { q: Question }) {
  const { data: source } = useQuery({ queryKey: ["question-source", q.test_id], enabled: !!q.test_id, queryFn: async () => {
    if (!q.test_id) return null;
    const { data, error } = await supabase.from("tests").select("tournament,division,year,source_path").eq("id", q.test_id).maybeSingle();
    if (error) throw error;
    return data;
  } });
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!source?.source_path) return;
    let active = true;
    supabase.storage.from("tests").createSignedUrl(source.source_path, 300).then(({ data }) => {
      if (active && data) setUrl(`${data.signedUrl}${q.source_page ? `#page=${q.source_page}` : ""}`);
    });
    return () => { active = false; };
  }, [source?.source_path, q.source_page]);
  if (!source) return null;
  const number = q.source_number ?? (Number(q.stem.match(/^(?:Original question |Question )?(\d+)/i)?.[1]) || null);
  const label = sourceLabel(source, number);
  return <div className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{label}</a> : label}</div>;
}

export function QuestionImages({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    signedImageUrls(paths).then(setUrls);
  }, [paths.join("|")]);
  if (!urls.length) return null;
  return (
    <div className="mt-3 grid gap-2">
      {urls.map((u) => (
        <img key={u} src={u} alt="Question figure" className="max-h-80 w-full rounded-lg border border-border object-contain" />
      ))}
    </div>
  );
}

export function QuestionCard({
  q,
  chosen,
  reveal,
  onChoose,
  showTagsBefore = true,
  answer,
  onAnswer,
  feedback,
}: {
  q: Question;
  chosen: number | null;
  reveal: boolean;
  onChoose?: (i: number) => void;
  showTagsBefore?: boolean;
  answer?: Answer;
  onAnswer?: ((answer: Answer) => void) | undefined;
  feedback?: string[] | undefined;
}) {
  const [edited, setEdited] = useState<Question | null>(null);
  q = edited?.id === q.id ? edited : q;
  const indices = answer?.indices ?? (chosen === null ? [] : [chosen]);
  const free = q.question_type === "free_response";
  const matching = free ? matchingItems(q.stem, q.choices) : [];
  const correctIndices = q.question_type === "multiple" ? q.correct_indices ?? [] : [q.correct_index];
  return (
    <div className="panel p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">{(showTagsBefore || reveal) && <QuestionTags q={q} />}<EditQuestionButton q={q} onSaved={(updated) => { setEdited(updated); onAnswer?.({ indices: [], text: "" }); }} /></div>
      <p className="mt-3 whitespace-pre-wrap text-[17px] leading-relaxed">{cleanStem(q.stem)}</p>
      <QuestionImages paths={q.image_urls ?? []} />
      {matching.length > 0 && <><div className="mt-6 space-y-3">{q.choices.map((choice, i) => <p key={i}>{LETTERS[i]}) {choice}</p>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2">{matching.map((item, i) => {
        const responses = answer?.text.split("\n") ?? [];
        const value = responses[i]?.match(/—\s*([A-J])/)?.[1] ?? "";
        return <div key={item.number} className="space-y-1"><label className="text-sm" htmlFor={`match-${q.id}-${i}`}>{item.number}. {item.text}</label><Select disabled={reveal || !onAnswer} value={value} onValueChange={(letter) => {
          const next = matching.map((part, j) => `${part.number} — ${j === i ? letter : responses[j]?.match(/—\s*([A-J])/)?.[1] ?? ""}`);
          onAnswer?.({ indices: [], text: next.join("\n") });
        }}><SelectTrigger id={`match-${q.id}-${i}`} aria-label={`Answer for ${item.number}. ${item.text}`}><SelectValue placeholder="Choose answer" /></SelectTrigger><SelectContent>{q.choices.map((choice, j) => <SelectItem key={j} value={LETTERS[j] ?? String(j)}>{LETTERS[j]}) {choice}</SelectItem>)}</SelectContent></Select></div>;
      })}</div></>}
      {free && !matching.length && <Textarea aria-label="Your answer" placeholder="Your answer" className="mt-4" rows={4} value={answer?.text ?? ""} disabled={reveal || !onAnswer} onChange={(e) => onAnswer?.({ indices: [], text: e.target.value })} />}
      {!free && <div className="mt-4 grid gap-2">
        {q.choices.map((c, i) => {
          let variant: "choice" | "correct" | "wrong" = "choice";
          if (reveal && correctIndices.includes(i)) variant = "correct";
          else if (reveal && indices.includes(i)) variant = "wrong";
          const selected = !reveal && indices.includes(i);
          return (
            <Button
              key={i}
              variant={variant}
              disabled={reveal || (!onChoose && !onAnswer)}
              aria-pressed={indices.includes(i)}
              onClick={() => {
                if (onAnswer) onAnswer({ text: "", indices: q.question_type === "multiple" ? indices.includes(i) ? indices.filter((x) => x !== i) : [...indices, i] : [i] });
                else onChoose?.(i);
              }}
              className={`${selected ? "border-primary bg-secondary" : "disabled:opacity-100"} h-auto min-h-12 whitespace-normal text-left`}
            >
              <span className="mr-2 font-mono text-xs text-muted-foreground">{LETTERS[i]}</span>
              <span className="flex-1">{c}</span>
              {reveal && correctIndices.includes(i) && <Check className="text-success" />}
              {reveal && indices.includes(i) && !correctIndices.includes(i) && <X className="text-destructive" />}
            </Button>
          );
        })}
      </div>}
      {reveal && free && <div className="mt-3 text-sm"><strong>Accepted answers</strong><ul className="mt-1 list-disc space-y-1 pl-5">{(q.accepted_answers ?? []).map((text, i) => <li key={i}>{text}</li>)}</ul></div>}
      {reveal && <ul className="mt-4 list-disc space-y-2 rounded-lg bg-muted p-4 pl-8 text-sm text-muted-foreground">{(feedback?.length ? feedback : q.feedback_bullets?.length ? q.feedback_bullets : q.explanation ? [q.explanation] : []).map((text, i) => <li key={i}>{text.replace(/^[-•]\s*/, "")}</li>)}</ul>}
      <QuestionSource q={q} />
    </div>
  );
}

export function FlagButton({ questionId, onFlagged }: { questionId: string; onFlagged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const report = useServerFn(reportQuestion);
  async function submit() {
    setBusy(true);
    try {
      const result = await report({ data: { questionId, reason: reason || "Wrong or broken" } });
      toast.success(result.message);
      setOpen(false);
      setReason("");
      onFlagged?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Couldn't report that question."); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What's wrong with this question?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {["Wrong answer", "Missing context (image, passage)", "Typo / unreadable", "Ambiguous or more than one answer", "Bad question"].map((r) => (
            <Button key={r} variant={reason === r ? "default" : "outline"} size="sm" onClick={() => setReason(r)}>
              {r}
            </Button>
          ))}
        </div>
        <Textarea placeholder="Details (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button onClick={submit} disabled={busy}>{busy ? "AI is checking…" : "Send report"}</Button>
      </DialogContent>
    </Dialog>
  );
}
