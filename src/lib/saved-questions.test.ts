import { beforeEach, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ upsert: vi.fn(), remove: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ upsert: calls.upsert, delete: calls.remove }) } }));
import { setQuestionSaved } from "./saved-questions";
beforeEach(() => {
  vi.clearAllMocks();
  calls.upsert.mockResolvedValue({ error: null });
  const query = { eq: calls.eq, then: (resolve: (value: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve) };
  calls.eq.mockReturnValue(query);
  calls.remove.mockReturnValue(query);
});
it("saves a question for the signed-in student without recording an answer", async () => {
  await setQuestionSaved("student-a", "question-48", true);
  expect(calls.upsert).toHaveBeenCalledWith({ user_id: "student-a", question_id: "question-48" }, { onConflict: "user_id,question_id", ignoreDuplicates: true });
  expect(calls.remove).not.toHaveBeenCalled();
});
it("removes only the selected question owned by that student", async () => {
  await setQuestionSaved("student-a", "question-48", false);
  expect(calls.eq.mock.calls).toEqual([["user_id", "student-a"], ["question_id", "question-48"]]);
});
it("surfaces save failures instead of pretending the question is saved", async () => {
  calls.upsert.mockResolvedValue({ error: new Error("Permission denied") });
  await expect(setQuestionSaved("student-a", "question-48", true)).rejects.toThrow("Permission denied");
});