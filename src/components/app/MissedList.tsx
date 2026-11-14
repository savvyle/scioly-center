import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "@/lib/data";
import { QuestionCard } from "./QuestionCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SaveButton } from "./SaveButton";
import { useMe } from "@/lib/auth";

export function MissedList({ userId }: { userId: string }) {
  const { data: me } = useMe();
  const [event, setEvent] = useState("__all");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["missed", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select("question_id, is_correct, chosen_index, selected_indices, response_text, feedback_bullets, answered_at, questions(*)")
        .eq("user_id", userId)
        .order("answered_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const replacementIds = [...new Set((data ?? []).flatMap((a) => a.questions?.merged_into ? [a.questions.merged_into] : []))];
      const replacements = new Map<string, Question>();
      if (replacementIds.length) {
        const { data: grouped, error: groupedError } = await supabase.from("questions").select("*").in("id", replacementIds);
        if (groupedError) throw groupedError;
        for (const q of grouped ?? []) replacements.set(q.id, q as unknown as Question);
      }
      const latest = new Map<string, { q: Question; lastCorrect: boolean; chosen: number | null; misses: number; answer: { indices: number[]; text: string }; feedback: string[] }>();
      for (const a of data ?? []) {
        if (!a.questions) continue;
        const question = a.questions.merged_into ? replacements.get(a.questions.merged_into) : a.questions as unknown as Question;
        if (!question) continue;
        const cur = latest.get(question.id);
        if (!cur) latest.set(question.id, { q: question, lastCorrect: a.is_correct, chosen: a.is_correct ? null : a.chosen_index, misses: a.is_correct ? 0 : 1, answer: { indices: a.selected_indices ?? [], text: a.response_text ?? "" }, feedback: a.feedback_bullets ?? [] });
        else if (!a.is_correct) { cur.misses++; if (cur.chosen === null) cur.chosen = a.chosen_index; }
      }
      return [...latest.values()].filter((x) => x.misses > 0);
    },
  });
  const events = [...new Set(data.map((d) => d.q.event))].sort();
  const rows = data.filter((d) => event === "__all" || d.q.event === event);
  if (isLoading) return null;
  if (error) return <p className="py-6 text-destructive">Couldn't load missed questions.</p>;
  if (!data.length) return <div className="panel p-6 text-center text-muted-foreground">No missed questions. Nice.</div>;
  return (
    <div className="space-y-3">
      <Select value={event} onValueChange={setEvent}>
        <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All events ({data.length})</SelectItem>
          {events.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
        </SelectContent>
      </Select>
      {rows.map((r) => (
        <div key={r.q.id}>
          <div className="mb-1 flex gap-2 font-mono text-xs text-muted-foreground">
            <span>missed {r.misses}×</span>
            {r.lastCorrect && <span className="text-success">· since answered correctly</span>}
          </div>
          <QuestionCard q={r.q} chosen={r.chosen} answer={r.answer} feedback={r.feedback} reveal />
           {me?.id === userId && <div className="mt-1 flex justify-end"><SaveButton questionId={r.q.id} /></div>}
        </div>
      ))}
    </div>
  );
}
