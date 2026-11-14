import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "./data";

export const savedQuestionsQuery = (userId: string) => queryOptions({
  queryKey: ["saved-questions", userId],
  queryFn: async () => {
    const { data, error } = await supabase.from("saved_questions").select("question_id,created_at,questions(*)").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    const ids = [...new Set((data ?? []).flatMap((row) => row.questions?.merged_into ? [row.questions.merged_into] : []))];
    const replacements = new Map<string, Question>();
    if (ids.length) {
      const { data: questions, error: replacementError } = await supabase.from("questions").select("*").in("id", ids);
      if (replacementError) throw replacementError;
      for (const question of questions ?? []) replacements.set(question.id, question as unknown as Question);
    }
    const resolved = new Map<string, { id: string; q: Question }>();
    for (const row of data ?? []) {
      if (!row.questions) continue;
      const q = row.questions.merged_into ? replacements.get(row.questions.merged_into) : row.questions as unknown as Question;
      if (q) resolved.set(q.id, { id: q.id, q });
    }
    return [...resolved.values()];
  },
});

export async function setQuestionSaved(userId: string, questionId: string, saved: boolean) {
  const result = saved
    ? await supabase.from("saved_questions").upsert({ user_id: userId, question_id: questionId }, { onConflict: "user_id,question_id", ignoreDuplicates: true })
    : await supabase.from("saved_questions").delete().eq("user_id", userId).eq("question_id", questionId);
  if (result.error) throw result.error;
}