import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { parseTest, retagTest } from "@/lib/parse.functions";
import { importDriveFolder, importTestLink } from "@/lib/drive.functions";
import { isAnswerKey, pdfPairName } from "@/lib/test-metadata";
import { DEFAULT_DIVISION } from "@/lib/practice-scope";
import { toast } from "sonner";
import { FileUp, Link2, Loader2, Upload, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/upload")({
  head: () => ({ meta: [{ title: "Upload tests · SciOly Center" }, { name: "description", content: "Import Science Olympiad tests from a file or link with automatically identified test details." }, { property: "og:title", content: "Upload tests · SciOly Center" }, { property: "og:description", content: "Import Science Olympiad tests from a file or link with automatically identified test details." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: UploadPage,
});

async function expandFiles(files: File[]) {
  const pdfs: File[] = [];
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const zip = await JSZip.loadAsync(file);
      for (const entry of Object.values(zip.files)) {
        if (entry.dir || !/\.pdf$/i.test(entry.name) || entry.name.startsWith("__MACOSX")) continue;
        pdfs.push(new File([await entry.async("blob")], entry.name.split("/").pop() || "test.pdf", { type: "application/pdf" }));
      }
    } else if (/\.pdf$/i.test(file.name)) pdfs.push(file);
    else throw new Error("Choose PDF or zip files.");
  }
  if (!pdfs.length) throw new Error("No PDFs found.");
  const tests = pdfs.filter((f) => !isAnswerKey(f.name));
  const keys = pdfs.filter((f) => isAnswerKey(f.name));
  if (!tests.length) throw new Error("Only answer keys found. Include the test PDF too.");
  return tests.map((test) => ({ test, key: keys.find((k) => pdfPairName(k.name) === pdfPairName(test.name)) ?? (tests.length === 1 && keys.length === 1 ? keys[0] : undefined) }));
}

function UploadPage() {
  const qc = useQueryClient();
  const parse = useServerFn(parseTest);
  const retag = useServerFn(retagTest);
  const importFolder = useServerFn(importDriveFolder);
  const importLink = useServerFn(importTestLink);
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const { data: tests = [] } = useQuery({
    queryKey: ["tests"],
    queryFn: async () => (await supabase.from("tests").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
    refetchInterval: (q) => ((q.state.data ?? []).some((t) => t.status === "parsing") ? 4000 : false),
  });

  async function readTest(id: string, sourceHint?: string) {
    const result = await parse({ data: { testId: id, identify: Boolean(sourceHint), sourceHint } });
    setLog((l) => [...l, `${result.event} · Div ${result.division}${result.year ? ` · ${result.year}` : ""}: ${result.total} questions, ${result.review} to review`]);
    await qc.invalidateQueries({ queryKey: ["tests"] });
    return result;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length && !url.trim()) return;
    setLog([]);
    let succeeded = 0, failed = 0;
    try {
      let created: { id: string; event: string; sourceHint: string }[] = [];
      if (url.trim()) {
        setBusy("Getting files…");
        const isFolder = new URL(url.trim()).hostname === "drive.google.com" && /\/folders\//.test(url);
        const result = isFolder ? await importFolder({ data: { folderUrl: url.trim(), includeBuild: false } }) : await importLink({ data: { url: url.trim() } });
        created = result.created;
        setLog(result.skipped.map((s) => `Skipped: ${s}`));
      } else {
        setBusy("Opening files…");
        const pairs = await expandFiles(files);
        for (const { test, key } of pairs) {
          setBusy(`Uploading ${test.name}…`);
          const { data: row, error } = await supabase.from("tests").insert({ event: "Pending identification", division: DEFAULT_DIVISION }).select("id").single();
          if (error || !row) throw new Error(error?.message ?? "Couldn't save test");
          const paths: { source_path: string; key_path: string | null } = { source_path: "", key_path: null };
          for (const [file, field] of [[test, "source_path"], [key, "key_path"]] as const) {
            if (!file) continue;
            const path = `${row.id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const { error: uploadError } = await supabase.storage.from("tests").upload(path, file, { contentType: "application/pdf" });
            if (uploadError) throw new Error(uploadError.message);
            paths[field] = path;
          }
          const { error: saveError } = await supabase.from("tests").update(paths).eq("id", row.id);
          if (saveError) throw new Error(saveError.message);
          created.push({ id: row.id, event: test.name, sourceHint: test.name });
        }
      }
      for (const [i, test] of created.entries()) {
        setBusy(`Reading test ${i + 1} of ${created.length}…`);
        try { await readTest(test.id, test.sourceHint); succeeded++; }
        catch (error) { failed++; setLog((l) => [...l, `${test.event}: ${error instanceof Error ? error.message : "Couldn't read this test"}`]); }
      }
      if (failed) toast.error(`${succeeded} tests ready; ${failed} need attention.`);
      else if (succeeded) toast.success(`${succeeded} ${succeeded === 1 ? "test" : "tests"} ready.`);
      else toast.info("No new tests to import.");
      setFiles([]); setUrl("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); }
    finally { setBusy(null); await qc.invalidateQueries(); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section>
        <h1 className="text-2xl font-extrabold">Upload tests</h1>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-link" className="flex items-center gap-2"><Link2 className="size-4" /> Test or folder link</Label>
            <Input id="test-link" type="url" placeholder="Paste a Google Drive or PDF link" value={url} disabled={!!busy} onChange={(e) => { setUrl(e.target.value); setFiles([]); if (fileInput.current) fileInput.current.value = ""; }} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <div className="rounded-md border border-dashed border-border bg-card p-6 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy) { setFiles(Array.from(e.dataTransfer.files)); setUrl(""); } }}>
            <FileUp className="mx-auto mb-3 size-7 text-primary" />
            <Button type="button" variant="outline" disabled={!!busy} onClick={() => fileInput.current?.click()}><Upload className="size-4" /> Choose files</Button>
            <p className="mt-2 text-xs text-muted-foreground">PDFs or zip · Answer key optional</p>
            <Input ref={fileInput} type="file" aria-label="Test files" accept=".pdf,.zip" multiple className="sr-only" disabled={!!busy} onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setUrl(""); }} />
            {files.length > 0 && <ul className="mt-4 space-y-1 text-left text-sm">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center gap-2"><FileUp className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 break-words">{file.name}</span><Button type="button" variant="ghost" size="icon" disabled={!!busy} aria-label={`Remove ${file.name}`} onClick={() => setFiles((f) => f.filter((_, i) => i !== index))}><X className="size-4" /></Button></li>)}</ul>}
          </div>
          <Button type="submit" size="lg" disabled={!!busy || (!files.length && !url.trim())} className="w-full"><span className="shrink-0">{busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}</span><span className="min-w-0 whitespace-normal">{busy ?? "Import tests"}</span></Button>
          {log.length > 0 && <ul aria-live="polite" className="max-h-64 space-y-2 overflow-auto text-sm text-muted-foreground">{log.map((line, i) => <li key={i} className="break-words">{line}</li>)}</ul>}
        </form>
      </section>
      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-bold">Recent uploads</h2>
        <div className="mt-2 divide-y divide-border">
          {tests.map((t) => <div key={t.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
            <div className="min-w-0 flex-1 basis-48"><div className="font-medium">{t.event}{t.division ? ` · Div ${t.division}` : ""}</div><div className="font-mono text-xs text-muted-foreground">{[t.year, t.tournament, t.level].filter(Boolean).join(" · ")}</div>{t.error && <div className="break-words text-xs text-destructive">{t.error}</div>}</div>
            <span className="tag">{t.status === "parsed" ? `${t.question_count} Q` : t.status}</span>
            {t.status === "parsed" && <Button size="sm" variant="ghost" disabled={!!busy} onClick={async () => { setBusy("Retagging…"); try { const r = await retag({ data: { testId: t.id } }); toast.success(`Retagged ${r.updated} questions`); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed"); } finally { setBusy(null); } }}>Retag</Button>}
            {(t.status === "failed" || t.status === "uploaded") && t.source_path && <Button size="sm" variant="outline" disabled={!!busy} onClick={async () => { setBusy("Reading test…"); try { await readTest(t.id); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed"); } finally { setBusy(null); } }}>Retry</Button>}
          </div>)}
          {!tests.length && <p className="py-3 text-sm text-muted-foreground">Nothing uploaded yet.</p>}
        </div>
      </section>
    </div>
  );
}
