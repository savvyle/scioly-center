import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/coach/settings")({
  head: () => ({ meta: [{ title: "Settings · SciOly Center" }, { name: "description", content: "Weekly goal targets." }, { property: "og:title", content: "Settings · SciOly Center" }, { property: "og:description", content: "Weekly goal targets." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Settings,
});

function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [f, setF] = useState({ questions: "15", accuracy: "60", sheet: "" });
  useEffect(() => {
    if (data) setF({ questions: String(data.questions), accuracy: String(Math.round(data.accuracy * 100)), sheet: data.familySheetUrl ?? "" });
  }, [data]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.schoolId) return;
    const { error } = await supabase.from("settings").update({
      goal_questions: Math.max(1, Number(f.questions) || 15),
      goal_accuracy: Math.min(100, Math.max(0, Number(f.accuracy) || 60)) / 100,
      family_sheet_url: f.sheet || null,
    }).eq("school_id", data.schoolId);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }
  return (
    <form onSubmit={save} className="panel max-w-md space-y-4 p-5">
      <h1 className="text-2xl font-extrabold">Weekly goal</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Questions per week</Label><Input type="number" value={f.questions} onChange={(e) => setF({ ...f, questions: e.target.value })} /></div>
        <div className="space-y-1"><Label>Min. accuracy (%)</Label><Input type="number" value={f.accuracy} onChange={(e) => setF({ ...f, accuracy: e.target.value })} /></div>
      </div>
      <div className="space-y-1"><Label>Family info Google Sheet link</Label><Input type="url" value={f.sheet} onChange={(e) => setF({ ...f, sheet: e.target.value })} placeholder="https://docs.google.com/…" /></div>
      <Button type="submit">Save</Button>
    </form>
  );
}
