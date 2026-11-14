import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { savedQuestionsQuery, setQuestionSaved } from "@/lib/saved-questions";

export function SaveButton({ questionId }: { questionId: string }) {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data = [], isPending, isError } = useQuery({ ...savedQuestionsQuery(me?.id ?? ""), enabled: Boolean(me) });
  const saved = data.some((q) => q.id === questionId);
  async function toggle() {
    if (!me || busy) return;
    setBusy(true);
    try {
      await setQuestionSaved(me.id, questionId, !saved);
      await qc.invalidateQueries({ queryKey: ["saved-questions", me.id] });
      toast.success(saved ? "Question removed from Saved." : "Question saved.");
    } catch { toast.error("Couldn't update saved questions. Please try again."); }
    finally { setBusy(false); }
  }
  return <Button variant="ghost" size="sm" disabled={!me || busy || isPending || isError} aria-pressed={saved} onClick={toggle}>
    {busy ? <Loader2 className="animate-spin" /> : saved ? <BookmarkCheck /> : <Bookmark />} {saved ? "Saved" : "Save"}
  </Button>;
}