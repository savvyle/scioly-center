import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { parseTest, retagTest } from "@/lib/parse.functions";
import { EVENTS, LEVELS } from "@/lib/events";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { DriveImport } from "@/components/app/DriveImport";
import { DEFAULT_DIVISION } from "@/lib/practice-scope";

export const Route = createFileRoute("/_authenticated/coach/upload")({
  head: () => ({ meta: [{ title: "Upload test · SciOly Center" }, { name: "description", content: "Upload a past test for AI parsing." }, { property: "og:title", content: "Upload test · SciOly Center" }, { property: "og:description", content: "Upload a past test for AI parsing." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: UploadPage,
});

async function splitZip(file: File) {
  const zip = await JSZip.loadAsync(file);
  const pdfs = Object.values(zip.files).filter((f) => !f.dir && f.name.toLowerCase().endsWith(".pdf") && !f.name.startsWith("__MACOSX"));
  if (!pdfs.length) throw new Error("No PDFs inside that zip.");
  const isKey = (n: string) => /key|answer|sol/i.test(n);
  const keyEntry = pdfs.find((p) => isKey(p.name));
  const testEntry = pdfs.find((p) => p !== keyEntry) ?? pdfs[0]!;
  const toFile = async (e: JSZip.JSZipObject) => new File([await e.async("blob")], e.name.split("/").pop()!, { type: "application/pdf" });
  return { test: await toFile(testEntry), key: keyEntry && keyEntry !== testEntry ? await toFile(keyEntry) : null };
}

function UploadPage() {
  const qc = useQueryClient();
  const parse = useServerFn(parseTest);
  const retag = useServerFn(retagTest);
  const [meta, setMeta] = useState({ event: "", division: DEFAULT_DIVISION as "B" | "C", year: String(new Date().getFullYear()), tournament: "", level: "Invitational" });
  const [testFile, setTestFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: tests = [] } = useQuery({
    queryKey: ["tests"],
    queryFn: async () => (await supabase.from("tests").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
    refetchInterval: (q) => ((q.state.data ?? []).some((t: any) => t.status === "parsing") ? 4000 : false),
  });

  async function runParse(testId: string) {
    setBusy("Reading the test with AI… this can take a few minutes.");
    try {
      const r = await parse({ data: { testId } });
      toast.success(`${r.total} questions: ${r.live} live, ${r.review} sent to review.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Parsing failed");
    } finally {
      setBusy(null);
      qc.invalidateQueries();
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!testFile || !meta.event) { toast.error("Pick an event and a file."); return; }
    let t = testFile, k = keyFile;
    try {
      if (testFile.name.toLowerCase().endsWith(".zip")) {
        setBusy("Unzipping…");
        const s = await splitZip(testFile);
        t = s.test;
        k = s.key ?? keyFile;
      }
      setBusy("Uploading…");
      const { data: row, error } = await supabase
        .from("tests")
        .insert({ event: meta.event, division: meta.division, year: Number(meta.year) || null, tournament: meta.tournament || null, level: meta.level })
        .select("id")
        .single();
      if (error || !row) throw new Error(error?.message ?? "Couldn't save test");
      const tp = `${row.id}/test.pdf`;
      const up1 = await supabase.storage.from("tests").upload(tp, t, { contentType: "application/pdf" });
      if (up1.error) throw new Error(up1.error.message);
      let kp: string | null = null;
      if (k) {
        kp = `${row.id}/key.pdf`;
        const up2 = await supabase.storage.from("tests").upload(kp, k, { contentType: "application/pdf" });
        if (up2.error) throw new Error(up2.error.message);
      }
      await supabase.from("tests").update({ source_path: tp, key_path: kp }).eq("id", row.id);
      setTestFile(null);
      setKeyFile(null);
      (e.target as HTMLFormElement).reset();
      await runParse(row.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
      <form onSubmit={submit} className="panel space-y-4 p-5">
        <h1 className="text-2xl font-extrabold">Upload a test</h1>
        <p className="text-sm text-muted-foreground">PDF test plus answer key, or one zip with both. Confident questions go live; the rest wait in the review queue.</p>
        <div className="space-y-1.5">
          <Label>Event</Label>
          <Input list="events" value={meta.event} onChange={(e) => setMeta({ ...meta, event: e.target.value })} required placeholder="e.g. Anatomy & Physiology" />
          <datalist id="events">{EVENTS.map((e) => <option key={e} value={e} />)}</datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Division</Label><Select value={meta.division} onValueChange={(division) => setMeta({ ...meta, division: division as "B" | "C" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="B">Div B</SelectItem><SelectItem value="C">Div C</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Year</Label><Input type="number" value={meta.year} onChange={(e) => setMeta({ ...meta, year: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select value={meta.level} onValueChange={(v) => setMeta({ ...meta, level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Tournament</Label><Input value={meta.tournament} onChange={(e) => setMeta({ ...meta, tournament: e.target.value })} placeholder="e.g. MIT Invitational" /></div>
        <div className="space-y-1.5"><Label>Test (PDF or zip)</Label><Input type="file" accept=".pdf,.zip" onChange={(e) => setTestFile(e.target.files?.[0] ?? null)} required /></div>
        <div className="space-y-1.5"><Label>Answer key (PDF, optional if inside the test or zip)</Label><Input type="file" accept=".pdf" onChange={(e) => setKeyFile(e.target.files?.[0] ?? null)} /></div>
        <Button type="submit" className="w-full" size="lg" disabled={!!busy}>
          {busy ? <><Loader2 className="animate-spin" /> {busy}</> : <><Upload /> Upload and parse</>}
        </Button>
      </form>
      <div className="space-y-5">
      <DriveImport />
      <div className="panel p-5">
        <h2 className="text-lg font-bold">Recent uploads</h2>
        <div className="mt-2 divide-y divide-border">
          {tests.map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 py-2 text-sm">
              <div className="flex-1">
                <div className="font-medium">{t.event}{t.division ? ` · Div ${t.division}` : ""}</div>
                <div className="font-mono text-xs text-muted-foreground">{[t.year, t.tournament, t.level].filter(Boolean).join(" · ")}</div>
                {t.error && <div className="text-xs text-destructive">{t.error}</div>}
              </div>
              <span className="tag">{t.status === "parsed" ? `${t.question_count} Q` : t.status}</span>
              {t.status === "parsed" && (
                <Button size="sm" variant="ghost" disabled={!!busy} onClick={async () => { setBusy("Retagging…"); try { const r = await retag({ data: { testId: t.id } }); toast.success(`Retagged ${r.updated} questions`); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); } }}>Retag</Button>
              )}
              {(t.status === "failed" || t.status === "uploaded") && t.source_path && (
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => runParse(t.id)}>Retry</Button>
              )}
            </div>
          ))}
          {!tests.length && <p className="py-2 text-sm text-muted-foreground">Nothing uploaded yet.</p>}
        </div>
      </div>
      </div>
    </div>
  );
}
