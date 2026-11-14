import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { questionEditSchema, questionFeedbackFields } from "./question-edit";

export const editQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => questionEditSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: staff, error: roleError } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (roleError || !staff) throw new Error("Only coaches and captains can edit questions.");
    const { questionId, ...fields } = data;
    const { data: saved, error } = await context.supabase.from("questions").update({
      ...fields,
      correct_index: data.correct_indices[0] ?? 0,
      grading_rubric: data.grading_rubric || null,
      ...questionFeedbackFields(data.feedback_bullets),
    }).eq("id", questionId).is("merged_into", null).select("id").single();
    if (error || !saved) throw new Error("Couldn't save this question.");
    return saved;
  });