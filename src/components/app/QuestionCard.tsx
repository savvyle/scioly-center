import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, Flag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DIFFICULTY } from "@/lib/events";
import { signedImageUrls, type Question } from "@/lib/data";
import { toast } from "sonner";

const LETTERS = "ABCDEFGHIJ";

export function QuestionTags({ q }: { q: Question }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="tag">{q.event}{q.division ? ` · ${q.division}` : ""}</span>
      {q.topic && <span className="tag">{q.topic}</span>}
      {q.subtopic && <span className="tag">{q.subtopic}</span>}
      <span className="tag">{DIFFICULTY[q.difficulty]}</span>
      {q.year && <span className="tag">{q.year}</span>}
      {q.level && <span className="tag">{q.level}</span>}
      {q.converted_from_frq && <span className="tag">from free response</span>}
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
}: {
  q: Question;
  chosen: number | null;
  reveal: boolean;
  onChoose?: (i: number) => void;
  showTagsBefore?: boolean;
}) {
  return (
    <div className="panel p-4 sm:p-6">
      {(showTagsBefore || reveal) && <QuestionTags q={q} />}
      <p className="mt-3 whitespace-pre-wrap text-[17px] leading-relaxed">{q.stem}</p>
      <QuestionImages paths={q.image_urls ?? []} />
      <div className="mt-4 grid gap-2">
        {q.choices.map((c, i) => {
          let variant: "choice" | "correct" | "wrong" = "choice";
          if (reveal && i === q.correct_index) variant = "correct";
          else if (reveal && i === chosen) variant = "wrong";
          const selected = !reveal && chosen === i;
          return (
            <Button
              key={i}
              variant={variant}
              disabled={reveal || !onChoose}
              onClick={() => onChoose?.(i)}
              className={selected ? "border-primary bg-secondary" : "disabled:opacity-100"}
            >
              <span className="mr-2 font-mono text-xs text-muted-foreground">{LETTERS[i]}</span>
              <span className="flex-1">{c}</span>
              {reveal && i === q.correct_index && <Check className="text-success" />}
              {reveal && i === chosen && i !== q.correct_index && <X className="text-destructive" />}
            </Button>
          );
        })}
      </div>
      {reveal && q.explanation && <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{q.explanation}</p>}
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
    if (error) { toast.error("Couldn't flag that question."); return; }
    toast.success("Thanks — a coach will check it.");
    setOpen(false);
    setReason("");
    onFlagged?.();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag /> Flag
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
        <Button onClick={submit} disabled={busy}>Send flag</Button>
      </DialogContent>
    </Dialog>
  );
}
