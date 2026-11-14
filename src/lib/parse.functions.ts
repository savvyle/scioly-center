import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CONFIDENCE_THRESHOLD = 0.75;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "number", "stem", "original_format", "choices", "correct_index", "topic", "subtopic",
          "difficulty", "page", "needs_image", "image_description", "confidence", "explanation",
        ],
        properties: {
          number: { type: "integer" },
          stem: { type: "string" },
          original_format: { type: "string", enum: ["mcq", "free_response"] },
          choices: { type: "array", items: { type: "string" } },
          correct_index: { type: "integer" },
          topic: { type: "string" },
          subtopic: { type: "string" },
          difficulty: { type: "integer" },
          page: { type: "integer" },
          needs_image: { type: "boolean" },
          image_description: { type: "string" },
          confidence: { type: "number" },
          explanation: { type: "string" },
        },
      },
    },
  },
} as const;

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

async function streamResponses(apiKey: string, body: unknown): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("AI credits are used up. Add credits to keep parsing tests.");
    if (res.status === 429) throw new Error("The AI is busy right now. Try again in a minute.");
    console.error("AI error", res.status, t);
    throw new Error(`The AI couldn't read this test (error ${res.status}).`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  let refusal = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
          else if (ev.type === "response.refusal.delta") refusal += ev.delta ?? "";
          else if (ev.type === "error" || ev.type === "response.failed") {
            throw new Error(ev.error?.message ?? ev.response?.error?.message ?? "AI stream failed");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
  if (!out && refusal) throw new Error("The AI declined to parse this file.");
  return out;
}

export const parseTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ testId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!staff) throw new Error("Only captains and coaches can upload tests.");
    const { data: test, error } = await supabase.from("tests").select("*").eq("id", data.testId).single();
    if (error || !test) throw new Error("Test not found");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");

    await supabase.from("tests").update({ status: "parsing", error: null }).eq("id", test.id);
    try {
      const files: { name: string; b64: string }[] = [];
      for (const [path, name] of [[test.source_path, "test.pdf"], [test.key_path, "answer-key.pdf"]] as const) {
        if (!path) continue;
        const { data: blob, error: de } = await supabase.storage.from("tests").download(path);
        if (de || !blob) throw new Error("Couldn't read the uploaded file.");
        files.push({ name, b64: toBase64(await blob.arrayBuffer()) });
      }
      if (!files.length) throw new Error("No PDF attached.");

      const instructions = `You convert Science Olympiad tests into a multiple-choice question bank.
Event: ${test.event}${test.division ? ` (Division ${test.division})` : ""}. Year: ${test.year ?? "unknown"}. Tournament: ${test.tournament ?? "unknown"} (${test.level ?? ""}).
The first PDF is the test. ${files.length > 1 ? "The second PDF is the answer key." : "The answer key may be included at the end of the test PDF."}
Rules:
- Extract EVERY question in order. Keep stems faithful; include any needed data, tables (as plain text) or station context.
- Multiple-choice: copy choices verbatim without letter prefixes; set correct_index from the answer key.
- Free response (short answer, fill-in, numeric, matching items): set original_format "free_response", put the answer key's correct answer as one choice and write 3 plausible but clearly wrong choices (common misconceptions, near-miss values, sibling terms). Shuffle; correct_index points at the right one. Never write a distractor that could also be correct.
- Multi-part questions: split into separate questions, each self-contained.
- topic and subtopic: short labels within the event's syllabus. difficulty: 1 easy, 2 medium, 3 hard.
- page: 1-based page number in the test PDF.
- needs_image true if the question can't be answered without a figure, photo or specimen image; describe it in image_description (else empty string).
- confidence 0..1: your confidence that stem, choices and correct answer are all right. Use below 0.75 when the key is missing/ambiguous, text was unreadable, or you guessed.
- explanation: one or two sentences on why the answer is correct (empty if unknown).`;

      const raw = await streamResponses(apiKey, {
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions,
        input: [
          {
            role: "user",
            content: [
              ...files.map((f) => ({ type: "input_file", filename: f.name, file_data: `data:application/pdf;base64,${f.b64}` })),
              { type: "input_text", text: "Parse this test into the question bank JSON." },
            ],
          },
        ],
        text: { format: { type: "json_schema", name: "question_bank", strict: true, schema } },
      });

      let parsed: { questions: any[] };
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("The AI returned something unreadable. Try again.");
      }
      const rows = (parsed.questions ?? [])
        .filter((q) => q.stem && Array.isArray(q.choices) && q.choices.length >= 2)
        .map((q) => {
          const ci = Math.min(Math.max(0, q.correct_index | 0), q.choices.length - 1);
          const conf = Math.max(0, Math.min(1, Number(q.confidence) || 0));
          const needsReview = conf < CONFIDENCE_THRESHOLD || q.needs_image;
          const notes: string[] = [];
          if (conf < CONFIDENCE_THRESHOLD) notes.push(`Low AI confidence (${Math.round(conf * 100)}%).`);
          if (q.needs_image) notes.push(`Needs image from page ${q.page}: ${q.image_description}`);
          return {
            test_id: test.id,
            event: test.event,
            division: test.division,
            year: test.year,
            level: test.level,
            topic: q.topic || null,
            subtopic: q.subtopic || null,
            difficulty: Math.min(3, Math.max(1, q.difficulty | 0 || 2)),
            stem: q.stem,
            choices: q.choices,
            correct_index: ci,
            explanation: q.explanation || null,
            status: needsReview ? "review" : "live",
            ai_confidence: conf,
            converted_from_frq: q.original_format === "free_response",
            review_note: notes.join(" ") || null,
          };
        });
      if (!rows.length) throw new Error("No questions found. If this is a scanned PDF, it may need manual entry.");
      const { error: ie } = await supabase.from("questions").insert(rows);
      if (ie) throw new Error(ie.message);
      const live = rows.filter((r) => r.status === "live").length;
      await supabase.from("tests").update({ status: "parsed", question_count: rows.length }).eq("id", test.id);
      return { total: rows.length, live, review: rows.length - live };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Parsing failed";
      await supabase.from("tests").update({ status: "failed", error: msg }).eq("id", test.id);
      throw new Error(msg);
    }
  });
