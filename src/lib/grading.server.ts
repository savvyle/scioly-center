import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText, type FilePart } from "ai";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./ai/run-id.server.ts";

const resultSchema = z.object({
  accepted_answers: z.array(z.string()),
  rubric: z.string(),
  points_earned: z.number(),
  bullets: z.array(z.string()),
});

export async function structuredAi<T>(schema: z.ZodType<T>, instructions: string, input: unknown, files: FilePart[] = []) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI grading is not configured.");
  const request = getRequest();
  const run = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    apiKey: key, baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: run.fetch,
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"), instructions,
      messages: [{ role: "user", content: [{ type: "text", text: JSON.stringify(input) }, ...files] }],
      output: Output.object({ schema }), maxRetries: 0, abortSignal: request.signal,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    return await result.output;
  } catch (error) {
    const e = error as { statusCode?: number; responseBody?: string; message?: string };
    let safe = "AI grading couldn't finish. Your answer has not been submitted.";
    if (e.responseBody) {
      try { const parsed = JSON.parse(e.responseBody); safe = parsed.message ?? parsed.error?.message ?? safe; } catch { /* not JSON */ }
    }
    if (e.statusCode === 402 || e.statusCode === 403) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("ai_grading_status").upsert({ id: "grading", paused: true, message: safe });
    }
    throw new Error(safe);
  }
}

export async function gradeWithAi(instructions: string, input: unknown) {
  return structuredAi(resultSchema, instructions, input);
}