import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
// Build/device events have no written questions to practice.
const BUILD_EVENTS = /boomilever|scrambler|roller coaster|ping pong parachute|hovercraft|glider|helicopter|tower|bungee|wind power|electric vehicle|mission possible|robot|machines|wheeled|flight|trajectory/i;

function headers() {
  const lk = process.env["LOVABLE_API_KEY"];
  const ck = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lk || !ck) throw new Error("Google Drive isn't connected.");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": ck };
}

export function folderIdFrom(url: string) {
  const m = url.match(/folders\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? (/^[a-zA-Z0-9_-]{15,}$/.test(url.trim()) ? url.trim() : null);
}

/** "Water Quality B Key.pdf" -> { event: "Water Quality", division: "B", isKey: true } */
export function parseDriveName(name: string) {
  let base = name.replace(/\.pdf$/i, "").trim();
  const isKey = /\b(key|answers?|solutions?)\b/i.test(base);
  base = base.replace(/\b(key|answer key|answers?|solutions?)\b/gi, "").replace(/[-_()]+/g, " ").replace(/\s+/g, " ").trim();
  const dm = base.match(/\s(B|C)$/);
  const division = (dm?.[1] as "B" | "C" | undefined) ?? null;
  const event = (dm ? base.slice(0, -2) : base).trim().replace(/\band\b/g, "&").replace(/^Anatomy & Physiology$/i, "Anatomy & Physiology");
  return { event, division, isKey };
}

export const importDriveFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      folderUrl: z.string().min(5),
      year: z.number().int().nullable(),
      tournament: z.string().max(120).nullable(),
      level: z.string().max(40),
      includeBuild: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Only captains and coaches can import tests.");
    const folderId = folderIdFrom(data.folderUrl);
    if (!folderId) throw new Error("That doesn't look like a Google Drive folder link.");

    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and mimeType='application/pdf'`);
    const res = await fetch(`${GATEWAY}/files?q=${q}&fields=files(id,name,size)&pageSize=1000`, { headers: headers() });
    if (!res.ok) {
      const body = await res.text();
      console.error("Drive list failed", res.status, body);
      throw new Error(res.status === 404 ? "Folder not found, or the connected Google account can't see it." : `Google Drive error ${res.status}`);
    }
    const files = ((await res.json()).files ?? []) as { id: string; name: string }[];
    const groups = new Map<string, { event: string; division: "B" | "C" | null; test?: string; key?: string; testName?: string }>();
    for (const f of files) {
      const p = parseDriveName(f.name);
      const k = `${p.event}|${p.division}`;
      const g = groups.get(k) ?? { event: p.event, division: p.division };
      if (p.isKey) g.key = f.id;
      else { g.test = f.id; g.testName = f.name; }
      groups.set(k, g);
    }

    const { data: existing } = await supabase.from("tests").select("source_ref");
    const done = new Set((existing ?? []).map((t) => t.source_ref).filter(Boolean));
    const created: { id: string; event: string }[] = [];
    const skipped: string[] = [];

    for (const g of groups.values()) {
      if (!g.test) { skipped.push(`${g.event} (no test file)`); continue; }
      if (!data.includeBuild && BUILD_EVENTS.test(g.event)) { skipped.push(`${g.event} (build event)`); continue; }
      if (done.has(`drive:${g.test}`)) { skipped.push(`${g.event} (already imported)`); continue; }
      const { data: row, error } = await supabase.from("tests").insert({
        event: g.event, division: g.division, year: data.year, tournament: data.tournament, level: data.level,
        source_ref: `drive:${g.test}`, created_by: userId,
      }).select("id").single();
      if (error || !row) throw new Error(error?.message ?? "Couldn't save test");
      const paths: { source_path: string | null; key_path: string | null } = { source_path: null, key_path: null };
      for (const [fileId, col, fname] of [[g.test, "source_path", "test.pdf"], [g.key, "key_path", "key.pdf"]] as const) {
        if (!fileId) continue;
        const dl = await fetch(`${GATEWAY}/files/${fileId}?alt=media`, { headers: headers() });
        if (!dl.ok) { console.error("Drive download failed", dl.status, await dl.text()); continue; }
        const path = `${row.id}/${fname}`;
        const up = await supabase.storage.from("tests").upload(path, await dl.arrayBuffer(), { contentType: "application/pdf", upsert: true });
        if (up.error) throw new Error(up.error.message);
        paths[col] = path;
      }
      await supabase.from("tests").update(paths).eq("id", row.id);
      created.push({ id: row.id, event: g.event });
    }
    return { created, skipped };
  });
