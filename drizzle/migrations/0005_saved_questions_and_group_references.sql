ALTER TABLE public.questions ADD COLUMN merged_into uuid REFERENCES public.questions(id);
COMMENT ON COLUMN public.questions.merged_into IS 'Replacement grouped question; superseded parts are retained for answer history.';
CREATE TABLE public.saved_questions (
 user_id uuid NOT NULL DEFAULT auth.uid(),
 question_id uuid NOT NULL REFERENCES public.questions(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, question_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_questions TO authenticated;
GRANT ALL ON public.saved_questions TO service_role;
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own saved questions" ON public.saved_questions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "save own questions" ON public.saved_questions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.questions q WHERE q.id = question_id AND q.school_id = public.current_school_id() AND q.merged_into IS NULL));
CREATE POLICY "remove own saved questions" ON public.saved_questions FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "read saved questions" ON public.questions FOR SELECT TO authenticated USING (school_id = public.current_school_id() AND EXISTS (SELECT 1 FROM public.saved_questions s WHERE s.question_id = questions.id AND s.user_id = auth.uid()));