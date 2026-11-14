import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { importDriveFolder } from "@/lib/drive.functions";
import { parseTest } from "@/lib/parse.functions";
import { LEVELS } from "@/lib/events";
import { toast } from "sonner";
import { FolderDown, Loader2 } from "lucide-react";

export function DriveImport() {
  const qc = useQueryClient();
  const importFn = useServerFn(importDriveFolder);
  const parse = useServerFn(parseTest);
  const [f, setF] = useState({ url: "", year: "2026", tournament: "", level: "Invitational", includeBuild: false });
  const [status, setStatus] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLog([]);
    try {
      setStatus("Copying files from Google Drive…");
      const r = await importFn({ data: { folderUrl: f.url, year: Number(f.year) || null, tournament: f.tournament || null, level: f.level, includeBuild: f.includeBuild } });
      qc.invalidateQueries({ queryKey: ["tests"] });
      setLog(r.skipped.map((s) => `Skipped ${s}`));
      let i = 0, total = 0, review = 0;
      for (const t of r.created) {
        i++;
        setStatus(`Reading ${t.event} with AI (${i}/${r.created.length})…`);
        try {
          const p = await parse({ data: { testId: t.id } });
          total += p.total; review += p.review;
          setLog((l) => [...l, `${t.event}: ${p.total} questions (${p.review} to review)`]);
        } catch (err) {
          setLog((l) => [...l, `${t.event}: failed — ${err instanceof Error ? err.message : "error"}`]);
        }
        qc.invalidateQueries({ queryKey: ["tests"] });
      }
      toast.success(`Imported ${r.created.length} tests, ${total} questions (${review} need review).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setStatus(null);
      qc.invalidateQueries();
    }
  }

  return (
    <form onSubmit={run} className="panel space-y-3 p-5">
      <h2 className="text-lg font-bold">Import a Google Drive folder</h2>
      <p className="text-sm text-muted-foreground">Files named like "Water Quality B.pdf" and "Water Quality B Key.pdf" are paired automatically.</p>
      <Input placeholder="https://drive.google.com/drive/folders/…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} required />
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1"><Label>Year</Label><Input value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} /></div>
        <div className="col-span-2 space-y-1"><Label>Tournament</Label><Input value={f.tournament} onChange={(e) => setF({ ...f, tournament: e.target.value })} placeholder="Highlands Invitational" /></div>
      </div>
      <div className="flex items-center gap-3">
        <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.includeBuild} onCheckedChange={(v) => setF({ ...f, includeBuild: !!v })} /> Include build events</label>
      </div>
      <Button type="submit" className="w-full" disabled={!!status}>
        {status ? <><Loader2 className="animate-spin" /> {status}</> : <><FolderDown /> Import and parse</>}
      </Button>
      {log.length > 0 && <ul className="max-h-60 space-y-0.5 overflow-auto font-mono text-xs text-muted-foreground">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
    </form>
  );
}
