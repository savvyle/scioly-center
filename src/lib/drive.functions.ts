import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_DIVISION } from "./practice-scope";
import { pdfPairName, isAnswerKey, publicPdfUrl } from "./test-metadata";

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
  const event = (dm ? base.slice(0, -2) : base).trim().replace(/^Anatomy and Physiology$/i, "Anatomy & Physiology");
  return { event, division, isKey };
}

export const importDriveFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      folderUrl: z.string().min(5),
      year: z.number().int().nullable().optional(),
      tournament: z.string().max(120).nullable().optional(),
      level: z.string().max(40).optional(),
      includeBuild: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Only captains and coaches can import tests.");
    const folderId = folderIdFrom(data.folderUrl);
    if (!folderId) throw new Error("That doesn't look like a Google Drive folder link.");

    const folderResponse = await fetch(`${GATEWAY}/files/${folderId}?fields=name`, { headers: headers() });
    if (!folderResponse.ok) throw new Error("Couldn't read that Google Drive folder. Check the link and sharing permissions.");
    const folderName = String((await folderResponse.json()).name ?? "");
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
      const k = pdfPairName(f.name);
      const g = groups.get(k) ?? { event: p.event, division: p.division };
      if (p.isKey) g.key = f.id;
      else { g.test = f.id; g.testName = f.name; }
      groups.set(k, g);
    }

    const { data: existing } = await supabase.from("tests").select("source_ref");
    const done = new Set((existing ?? []).map((t) => t.source_ref).filter(Boolean));
    const created: { id: string; event: string; sourceHint: string }[] = [];
    const skipped: string[] = [];

    for (const g of groups.values()) {
      if (!g.test) { skipped.push(`${g.event} (no test file)`); continue; }
      if (!data.includeBuild && BUILD_EVENTS.test(g.event)) { skipped.push(`${g.event} (build event)`); continue; }
      if (done.has(`drive:${g.test}`)) { skipped.push(`${g.event} (already imported)`); continue; }
      const { data: row, error } = await supabase.from("tests").insert({
        event: "Pending identification", division: g.division ?? DEFAULT_DIVISION, year: data.year ?? null, tournament: data.tournament ?? null, level: data.level ?? null,
        source_ref: `drive:${g.test}`, created_by: userId,
      }).select("id").single();
      if (error || !row) throw new Error(error?.message ?? "Couldn't save test");
      const paths: { source_path: string | null; key_path: string | null } = { source_path: null, key_path: null };
      for (const [fileId, col, fname] of [[g.test, "source_path", g.testName || "test.pdf"], [g.key, "key_path", "key.pdf"]] as const) {
        if (!fileId) continue;
        const dl = await fetch(`${GATEWAY}/files/${fileId}?alt=media`, { headers: headers() });
        if (!dl.ok) { console.error("Drive download failed", dl.status, await dl.text()); throw new Error(`Couldn't download ${fname} from Google Drive (${dl.status}).`); }
        const path = `${row.id}/${fname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const up = await supabase.storage.from("tests").upload(path, await dl.arrayBuffer(), { contentType: "application/pdf", upsert: true });
        if (up.error) throw new Error(up.error.message);
        paths[col] = path;
      }
      await supabase.from("tests").update(paths).eq("id", row.id);
      created.push({ id: row.id, event: g.event, sourceHint: `${folderName} / ${g.testName}` });
    }
    return { created, skipped };
  });

/** Import a Drive PDF or a public PDF URL. Folder imports use the batch function above. */
export const importTestLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Only captains and coaches can import tests.");
    const url = publicPdfUrl(data.url);
    let name = decodeURIComponent(url.pathname.split("/").pop() || "test.pdf");
    let response: Response;
    let sourceRef = data.url;
    if (url.hostname === "drive.google.com") {
      const id = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? url.searchParams.get("id");
      if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Use a Google Drive PDF or folder link.");
      const info = await fetch(`${GATEWAY}/files/${id}?fields=name,mimeType,size`, { headers: headers() });
      if (!info.ok) throw new Error(`Couldn't read the Google Drive file (${info.status}). Check its sharing permissions.`);
      const metadata = await info.json();
      if (metadata.mimeType !== "application/pdf") throw new Error("That Drive link isn't a PDF. Upload a PDF or zip instead.");
      name = metadata.name;
      sourceRef = `drive:${id}`;
      response = await fetch(`${GATEWAY}/files/${id}?alt=media`, { headers: headers() });
    } else {
      let destination = url;
      response = await fetch(destination, { redirect: "manual" });
      for (let i = 0; response.status >= 300 && response.status < 400 && i < 4; i++) {
        const location = response.headers.get("location");
        if (!location) break;
        destination = publicPdfUrl(new URL(location, destination).href);
        response = await fetch(destination, { redirect: "manual" });
      }
    }
    if (!response.ok) { console.error("Test download failed", response.status, await response.text()); throw new Error(`Couldn't download the PDF (${response.status}). Check that the link opens a PDF.`); }
    const bytes = await response.arrayBuffer();
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("That link doesn't open a PDF. Use a direct PDF link or a Google Drive link.");
    const { data: existing } = await supabase.from("tests").select("id").eq("source_ref", sourceRef).limit(1);
    if (existing?.length) return { created: [], skipped: ["Already imported"] };
    const { data: row, error } = await supabase.from("tests").insert({ event: "Pending identification", division: DEFAULT_DIVISION, source_ref: sourceRef, created_by: userId }).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "Couldn't save test");
    const path = `${row.id}/${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("tests").upload(path, bytes, { contentType: "application/pdf" });
    if (uploadError) throw new Error(uploadError.message);
    const { error: saveError } = await supabase.from("tests").update({ source_path: path }).eq("id", row.id);
    if (saveError) throw new Error(saveError.message);
    return { created: [{ id: row.id, event: name, sourceHint: name }], skipped: [] };
  });
