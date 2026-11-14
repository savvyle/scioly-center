import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "@/lib/data";
import { QuestionCard } from "./QuestionCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MissedList({ userId }: { userId: string }) {
  const [event, setEvent] = useState("__all");
  const { data = [], isLoading } = useQuery({
    queryKey: ["missed", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("attempts")
        .select("question_id, is_correct, chosen_index, answered_at, questions(*)")
        .eq("user_id", userId)
        .order("answered_at", { ascending: false })
        .limit(1000);
      const latest = new Map<string, { q: Question; lastCorrect: boolean; chosen: number | null; misses: number }>();
      for (const a of data ?? []) {
        if (!a.questions) continue;
        const cur = latest.get(a.question_id);
        if (!cur) latest.set(a.question_id, { q: a.questions as unknown as Question, lastCorrect: a.is_correct, chosen: a.is_correct ? null : a.chosen_index, misses: a.is_correct ? 0 : 1 });
        else if (!a.is_correct) { cur.misses++; if (cur.chosen === null) cur.chosen = a.chosen_index; }
      }
      return [...latest.values()].filter((x) => x.misses > 0);
    },
  });
  const events = [...new Set(data.map((d) => d.q.event))].sort();
  const rows = data.filter((d) => event === "__all" || d.q.event === event);
  if (isLoading) return null;
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
          <QuestionCard q={r.q} chosen={r.chosen} reveal />
        </div>
      ))}
    </div>
  );
}
