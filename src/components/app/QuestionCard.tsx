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
import { schoolYear } from "@/lib/school-year";

const LETTERS = "ABCDEFGHIJ";

export function QuestionTags({ q }: { q: Question }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="tag">{q.event}{q.division ? ` · ${q.division}` : ""}</span>
      {q.topic && <span className="tag">{q.topic}</span>}
      {q.subtopic && <span className="tag">{q.subtopic}</span>}
      <span className="tag">{DIFFICULTY[q.difficulty]}</span>
      {q.year && <span className="tag">{schoolYear(q.year)}</span>}
      {q.level && <span className="tag">{q.level}</span>}
      <span className="tag">{q.points ?? 1} pt{Number(q.points ?? 1) === 1 ? "" : "s"}</span>
      {q.question_type === "multiple" && <span className="tag">Multiple select</span>}
      {q.question_type === "free_response" && <span className="tag">Free response</span>}
    </div>
  );
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
  const indices = answer?.indices ?? (chosen === null ? [] : [chosen]);
  const free = q.question_type === "free_response";
  const correctIndices = q.question_type === "multiple" ? q.correct_indices ?? [] : [q.correct_index];
  return (
    <div className="panel p-4 sm:p-6">
      {(showTagsBefore || reveal) && <QuestionTags q={q} />}
      <p className="mt-3 whitespace-pre-wrap text-[17px] leading-relaxed">{cleanStem(q.stem)}</p>
      <QuestionImages paths={q.image_urls ?? []} />
      {free && <Textarea aria-label="Your answer" placeholder="Your answer" className="mt-4" rows={4} value={answer?.text ?? ""} disabled={reveal || !onAnswer} onChange={(e) => onAnswer?.({ indices: [], text: e.target.value })} />}
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
    </div>
  );
}

export function FlagButton({ questionId, onFlagged }: { questionId: string; onFlagged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    const { error } = await supabase.from("flags").insert({ question_id: questionId, reason: reason || "Wrong or broken" });
    setBusy(false);
    if (error) { toast.error("Couldn't report that question."); return; }
    toast.success("Thanks — a coach will check it.");
    setOpen(false);
    setReason("");
    onFlagged?.();
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
          {["Wrong answer", "Missing image", "Typo / unreadable", "Two answers correct"].map((r) => (
            <Button key={r} variant={reason === r ? "default" : "outline"} size="sm" onClick={() => setReason(r)}>
              {r}
            </Button>
          ))}
        </div>
        <Textarea placeholder="Details (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button onClick={submit} disabled={busy}>Send report</Button>
      </DialogContent>
    </Dialog>
  );
}
