import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "./data";

export const savedQuestionsQuery = (userId: string) => queryOptions({
  queryKey: ["saved-questions", userId],
  queryFn: async () => {
    const { data, error } = await supabase.from("saved_questions").select("question_id,created_at,questions(*)").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).flatMap((row) => row.questions ? [{ id: row.question_id, q: row.questions as unknown as Question }] : []);
  },
});

export async function setQuestionSaved(userId: string, questionId: string, saved: boolean) {
  const result = saved
    ? await supabase.from("saved_questions").upsert({ user_id: userId, question_id: questionId }, { onConflict: "user_id,question_id", ignoreDuplicates: true })
    : await supabase.from("saved_questions").delete().eq("user_id", userId).eq("question_id", questionId);
  if (result.error) throw result.error;
}