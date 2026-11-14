import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "@/lib/data";
import { QuestionImages, QuestionTags } from "@/components/app/QuestionCard";
import { useMe } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/coach/queue")({
  head: () => ({ meta: [{ title: "Review queue · SciOly Center" }, { name: "description", content: "Check uncertain and flagged questions." }, { property: "og:title", content: "Review queue · SciOly Center" }, { property: "og:description", content: "Check uncertain and flagged questions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Queue,
});

function Queue() {
  const { data: review = [] } = useQuery({
    queryKey: ["queue", "review"],
    queryFn: async () => ((await supabase.from("questions").select("*").eq("status", "review").order("created_at").limit(200)).data ?? []) as unknown as Question[],
  });
  const { data: flags = [] } = useQuery({
    queryKey: ["queue", "flags"],
    queryFn: async () => (await supabase.from("flags").select("*, questions(*)").is("resolved_at", null).order("created_at").limit(200)).data ?? [],
  });
  const byQ = new Map<string, { q: Question; reasons: string[]; ids: string[] }>();
  type FlagRow = { id: string; question_id: string; reason: string; questions: unknown };
  for (const f of flags as unknown as FlagRow[]) {
    if (!f.questions) continue;
    const cur = byQ.get(f.question_id) ?? { q: f.questions as Question, reasons: [] as string[], ids: [] as string[] };
    cur.reasons.push(f.reason);
    cur.ids.push(f.id);
    byQ.set(f.question_id, cur);
  }
  return (
    <Tabs defaultValue="review">
      <TabsList>
        <TabsTrigger value="review">Needs review ({review.length})</TabsTrigger>
        <TabsTrigger value="flags">Flagged ({byQ.size})</TabsTrigger>
      </TabsList>
      <TabsContent value="review" className="space-y-4">
        {review.map((q) => <Editor key={q.id} q={q} />)}
        {!review.length && <p className="panel p-6 text-center text-muted-foreground">Queue is empty.</p>}
      </TabsContent>
      <TabsContent value="flags" className="space-y-4">
        {[...byQ.values()].map((x) => <Editor key={x.q.id} q={x.q} flagIds={x.ids} flagReasons={x.reasons} />)}
        {!byQ.size && <p className="panel p-6 text-center text-muted-foreground">No open flags.</p>}
      </TabsContent>
    </Tabs>
  );
}

function Editor({ q, flagIds, flagReasons }: { q: Question; flagIds?: string[]; flagReasons?: string[] }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [f, setF] = useState({
    stem: q.stem, choices: q.choices.join("\n"), correct: q.correct_index, topic: q.topic ?? "", subtopic: q.subtopic ?? "",
    difficulty: q.difficulty, explanation: q.explanation ?? "", images: q.image_urls ?? [],
    type: q.question_type ?? "single", points: q.points ?? 1, accepted: (q.accepted_answers ?? []).join("\n"), rubric: q.grading_rubric ?? "", correctIndices: q.correct_indices ?? [q.correct_index],
  });
  const [busy, setBusy] = useState(false);
  const choices = f.choices.split("\n").map((c) => c.trim()).filter(Boolean);

  async function addImage(file: File) {
    const path = `${q.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("question-images").upload(path, file);
    if (error) { toast.error(error.message); return; }
    setF((s) => ({ ...s, images: [...s.images, path] }));
  }

  async function save(status: "live" | "rejected") {
    if (status === "live" && (f.points <= 0 || (f.type === "free_response" ? !f.accepted.trim() : choices.length < 2 || (f.type === "multiple" ? !f.correctIndices.length || f.correctIndices.some((i) => i >= choices.length) : f.correct >= choices.length)))) { toast.error("Add valid answers and a positive point value."); return; }
    setBusy(true);
    const { error } = await supabase.from("questions").update({
      stem: f.stem, choices, correct_index: f.correct, topic: f.topic || null, subtopic: f.subtopic || null,
      difficulty: f.difficulty, explanation: f.explanation || null, image_urls: f.images, status, review_note: null,
      question_type: f.type, points: f.points, correct_indices: f.type === "multiple" ? f.correctIndices : [f.correct], accepted_answers: f.accepted.split("\n").map((a) => a.trim()).filter(Boolean), grading_rubric: f.rubric || null, feedback_bullets: f.explanation.split("\n").filter(Boolean),
    }).eq("id", q.id);
    if (!error && flagIds?.length) {
      await supabase.from("flags").update({ resolved_at: new Date().toISOString(), resolved_by: me?.id ?? null, resolution: status === "live" ? "fixed" : "removed" }).in("id", flagIds);
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "live" ? "Question is live." : "Question removed.");
    qc.invalidateQueries({ queryKey: ["queue"] });
  }

  return (
    <div className="panel space-y-3 p-4">
      <QuestionTags q={q} />
      {q.review_note && <p className="rounded-md bg-muted p-2 text-sm">{q.review_note}</p>}
      {flagReasons && <p className="rounded-md bg-destructive-soft p-2 text-sm">Flags: {flagReasons.join(" · ")}</p>}
      <div className="space-y-1.5"><Label>Question</Label><Textarea rows={4} value={f.stem} onChange={(e) => setF({ ...f, stem: e.target.value })} /></div>
      <div className="flex flex-wrap items-center gap-3"><Label>Answer format</Label><select aria-label="Answer format" className="rounded-md border border-input bg-card p-2 text-sm" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as typeof f.type })}><option value="single">Single choice</option><option value="multiple">Multiple select</option><option value="free_response">Free response</option></select><Label>Points</Label><Input aria-label="Points" className="w-24" type="number" min="0.25" step="0.25" value={f.points} onChange={(e) => setF({ ...f, points: Number(e.target.value) })} /></div>
      {f.type === "free_response" && <div className="space-y-2"><Label>Accepted answers (one per line)</Label><Textarea value={f.accepted} onChange={(e) => setF({ ...f, accepted: e.target.value })} /><Label>Grading rubric</Label><Textarea value={f.rubric} onChange={(e) => setF({ ...f, rubric: e.target.value })} /></div>}
      {f.type !== "free_response" && <>
      <div className="space-y-1.5"><Label>Choices (one per line)</Label><Textarea rows={4} value={f.choices} onChange={(e) => setF({ ...f, choices: e.target.value })} /></div>
      <div className="flex flex-wrap items-center gap-2">
        <Label>Correct:</Label>
        {choices.map((c, i) => (
          <Button key={i} type="button" size="sm" variant={(f.type === "multiple" ? f.correctIndices.includes(i) : f.correct === i) ? "default" : "outline"} onClick={() => setF({ ...f, correct: i, correctIndices: f.correctIndices.includes(i) ? f.correctIndices.filter((x) => x !== i) : [...f.correctIndices, i] })} className="max-w-48 truncate">
            {"ABCDEFGHIJ"[i]}. {c.slice(0, 24)}
          </Button>
        ))}
      </div>
      </>}
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder="Topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
        <Input placeholder="Subtopic" value={f.subtopic} onChange={(e) => setF({ ...f, subtopic: e.target.value })} />
        <select className="rounded-md border border-input bg-card px-2 text-sm" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: Number(e.target.value) })}>
          <option value={1}>Easy</option><option value={2}>Medium</option><option value={3}>Hard</option>
        </select>
      </div>
      <Input placeholder="Explanation (optional)" value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} />
      <QuestionImages paths={f.images} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary">
          + Attach image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && addImage(e.target.files[0])} />
        </label>
        {f.images.length > 0 && <Button size="sm" variant="ghost" onClick={() => setF({ ...f, images: [] })}>Clear images</Button>}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => save("rejected")}>Remove</Button>
          <Button disabled={busy} onClick={() => save("live")}>Approve & go live</Button>
        </div>
      </div>
    </div>
  );
}
