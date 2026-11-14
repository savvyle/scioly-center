import { z } from "zod";
import { questionEditSchema } from "./question-edit";

export const repairResultSchema = z.object({
  fixable: z.boolean(), confidence: z.number(), reason: z.string(),
  stem: z.string(), question_type: z.enum(["single", "multiple", "free_response"]),
  choices: z.array(z.string()), correct_indices: z.array(z.number()),
  accepted_answers: z.array(z.string()), grading_rubric: z.string(), feedback_bullets: z.array(z.string()),
});
export function safeRepair(result: z.infer<typeof repairResultSchema>, questionId: string, sourceAvailable: boolean) {
  if (!sourceAvailable || !result.fixable || result.confidence < 0.95) return null;
  const parsed = questionEditSchema.safeParse({ ...result, questionId });
  return parsed.success ? parsed.data : null;
}