import { z } from "zod";

export function canEditQuestion(role: string) {
  return role === "coach" || role === "captain";
}

export const questionEditSchema = z.object({
  questionId: z.string().uuid(),
  stem: z.string().trim().min(1).max(30000),
  question_type: z.enum(["single", "multiple", "free_response"]),
  choices: z.array(z.string().trim().min(1)).max(100),
  correct_indices: z.array(z.number().int().nonnegative()),
  accepted_answers: z.array(z.string().trim().min(1)),
  grading_rubric: z.string().max(30000),
}).superRefine((q, ctx) => {
  if (q.question_type === "free_response") {
    if (!q.accepted_answers.length) ctx.addIssue({ code: "custom", message: "Add an accepted answer." });
  } else if (q.choices.length < 2 || !q.correct_indices.length || q.correct_indices.some((i) => i >= q.choices.length) || (q.question_type === "single" && q.correct_indices.length !== 1)) {
    ctx.addIssue({ code: "custom", message: "Choose a valid answer key." });
  }
});