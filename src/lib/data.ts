import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inPracticeScope } from "./practice-scope";
import { topicTree } from "./practice";

export type Question = {
  id: string; event: string; division?: string | null; topic: string | null; subtopic: string | null; difficulty: number;
  year: number | null; level: string | null; stem: string; choices: string[]; correct_index: number;
  explanation: string | null; image_urls: string[]; status: string; ai_confidence: number | null;
  converted_from_frq: boolean; review_note: string | null; test_id: string | null;
  question_type?: "single" | "multiple" | "free_response"; correct_indices?: number[];
  accepted_answers?: string[]; grading_rubric?: string | null; points?: number; feedback_bullets?: string[];
  source_number?: number | null; source_page?: number | null;
};

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data } = await supabase.from("settings").select("*").maybeSingle();
    return {
      questions: data?.goal_questions ?? 15,
      accuracy: Number(data?.goal_accuracy ?? 0.6),
      familySheetUrl: data?.family_sheet_url ?? null,
      schoolId: data?.school_id ?? null,
    };
  },
});

export const leaderboardQuery = (offset: number) =>
  queryOptions({
    queryKey: ["leaderboard", offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("weekly_leaderboard", { p_offset: offset });
      if (error) throw error;
      return data ?? [];
    },
  });

export const statsQuery = (userId: string | null, division: string | null = null) =>
  queryOptions({
    queryKey: ["stats", userId, division],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("stats_by_topic", { p_user: userId as any, p_division: division as any });
      if (error) throw error;
      return data ?? [];
    },
  });

export const trendQuery = (userId: string | null) =>
  queryOptions({
    queryKey: ["trend", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("daily_trend", { p_user: userId as any, p_days: 28 });
      if (error) throw error;
      return data ?? [];
    },
  });

export const liveEventsQuery = queryOptions({
  queryKey: ["live-events"],
  queryFn: async () => {
    const all = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from("questions").select("event, topic, subtopic, division").eq("status", "live").is("merged_into", null).order("id").range(offset, offset + 999);
      if (error) throw error;
      all.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
    const data = (all ?? []).filter(inPracticeScope);
    const map = new Map<string, Set<string>>();
    for (const r of data ?? []) {
      if (!map.has(r.event)) map.set(r.event, new Set());
      if (r.topic) map.get(r.event)?.add(r.topic);
    }
    return [...map.entries()]
      .map(([event, topics]) => ({ event, topics: [...topics].sort(), topicTree: topicTree(data.filter((d) => d.event === event)), count: (data ?? []).filter((d) => d.event === event).length }))
      .sort((a, b) => a.event.localeCompare(b.event));
  },
});

export async function signedImageUrls(paths: string[]) {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from("question-images").createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

export function byEvent(rows: { event: string; answered: number; correct: number }[]) {
  const m = new Map<string, { event: string; answered: number; correct: number }>();
  for (const r of rows) {
    const cur = m.get(r.event) ?? { event: r.event, answered: 0, correct: 0 };
    cur.answered += r.answered;
    cur.correct += r.correct;
    m.set(r.event, cur);
  }
  return [...m.values()].sort((a, b) => a.correct / a.answered - b.correct / b.answered);
}
