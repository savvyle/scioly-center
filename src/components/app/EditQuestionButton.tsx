import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe } from "@/lib/auth";
import type { Question } from "@/lib/data";
import { canEditQuestion, questionEditSchema } from "@/lib/question-edit";
import { editQuestion } from "@/lib/question-edit.functions";

export function EditQuestionButton({ q, onSaved }: { q: Question; onSaved: (q: Question) => void }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const save = useServerFn(editQuestion);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stem, setStem] = useState(q.stem);
  const [choices, setChoices] = useState(q.choices.join("\n"));
  const [type, setType] = useState(q.question_type ?? "single");
  const [key, setKey] = useState(q.question_type === "multiple" ? q.correct_indices ?? [] : [q.correct_index]);
  const [accepted, setAccepted] = useState((q.accepted_answers ?? []).join("\n"));
  const [rubric, setRubric] = useState(q.grading_rubric ?? "");
  if (!me || !canEditQuestion(me.role)) return null;
  const options = choices.split("\n").map((s) => s.trim()).filter(Boolean);
  async function submit() {
    const result = questionEditSchema.safeParse({ questionId: q.id, stem, choices: options, question_type: type, correct_indices: type === "free_response" ? [] : key, accepted_answers: accepted.split("\n").map((s) => s.trim()).filter(Boolean), grading_rubric: rubric });
    if (!result.success) { toast.error(result.error.issues[0]?.message ?? "Check the answer key."); return; }
    setBusy(true);
    try {
      await save({ data: result.data });
      onSaved({ ...q, ...result.data, correct_index: result.data.correct_indices[0] ?? 0, explanation: null, feedback_bullets: [] });
      await qc.invalidateQueries();
      setOpen(false); toast.success("Question saved.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save this question."); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => {
    if (value) { setStem(q.stem); setChoices(q.choices.join("\n")); setType(q.question_type ?? "single"); setKey(q.question_type === "multiple" ? q.correct_indices ?? [] : [q.correct_index]); setAccepted((q.accepted_answers ?? []).join("\n")); setRubric(q.grading_rubric ?? ""); }
    setOpen(value);
  }}><DialogTrigger asChild><Button variant="ghost" size="icon" title="Edit question" aria-label="Edit question"><Pencil /></Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Edit question</DialogTitle></DialogHeader>
      <Label htmlFor="edit-prompt">Question prompt</Label><Textarea id="edit-prompt" rows={6} value={stem} onChange={(e) => setStem(e.target.value)} />
      <Label>Answer format</Label><Select value={type} onValueChange={(v) => { setType(v as typeof type); setKey([]); }}><SelectTrigger aria-label="Answer format"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Single choice</SelectItem><SelectItem value="multiple">Multiple select</SelectItem><SelectItem value="free_response">Free response / matching</SelectItem></SelectContent></Select>
      <Label htmlFor="edit-choices">Answer choices (one per line)</Label><Textarea id="edit-choices" rows={4} value={choices} onChange={(e) => setChoices(e.target.value)} />
      {type === "free_response" ? <><Label htmlFor="edit-accepted">Answer key (one accepted answer per line)</Label><Textarea id="edit-accepted" value={accepted} onChange={(e) => setAccepted(e.target.value)} /><Label htmlFor="edit-rubric">Grading rubric</Label><Textarea id="edit-rubric" value={rubric} onChange={(e) => setRubric(e.target.value)} /></> : <><Label>Answer key</Label><div className="grid gap-2">{options.map((choice, i) => <Button key={i} variant={key.includes(i) ? "default" : "outline"} className="h-auto whitespace-normal justify-start text-left" aria-pressed={key.includes(i)} onClick={() => setKey(type === "single" ? [i] : key.includes(i) ? key.filter((j) => j !== i) : [...key, i])}>{String.fromCharCode(65 + i)}. {choice}</Button>)}</div></>}
      <Button disabled={busy} onClick={submit}>{busy ? "Saving…" : "Save changes"}</Button>
    </DialogContent></Dialog>;
}