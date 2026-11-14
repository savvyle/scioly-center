import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { savedQuestionsQuery } from "@/lib/saved-questions";
import { QuestionCard, FlagButton } from "./QuestionCard";
import { SaveButton } from "./SaveButton";

export function SavedList({ userId }: { userId: string }) {
  const [event, setEvent] = useState("__all");
  const { data = [], isPending, error } = useQuery(savedQuestionsQuery(userId));
  if (isPending) return <p className="panel p-6 text-muted-foreground">Loading saved questions…</p>;
  if (error) return <p className="panel p-6 text-destructive">Couldn't load saved questions.</p>;
  if (!data.length) return <p className="panel p-6 text-center text-muted-foreground">No saved questions yet.</p>;
  const events = [...new Set(data.map((r) => r.q.event))].sort();
  return <div className="space-y-4">
    <div className="panel p-4"><Select value={event} onValueChange={setEvent}><SelectTrigger className="w-full sm:w-60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__all">All events ({data.length})</SelectItem>{events.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div>
    {data.filter((r) => event === "__all" || r.q.event === event).map((r) => <div key={r.id}><QuestionCard q={r.q} chosen={null} reveal /><div className="mt-1 flex justify-end"><SaveButton questionId={r.id} /><FlagButton questionId={r.id} /></div></div>)}
  </div>;
}