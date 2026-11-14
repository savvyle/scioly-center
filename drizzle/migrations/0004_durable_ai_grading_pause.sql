CREATE TABLE public.ai_grading_status (id text PRIMARY KEY, paused boolean NOT NULL DEFAULT false, message text);
GRANT SELECT,UPDATE ON public.ai_grading_status TO authenticated;
GRANT ALL ON public.ai_grading_status TO service_role;
ALTER TABLE public.ai_grading_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaches read grading status" ON public.ai_grading_status FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'coach'));
CREATE POLICY "coaches resume grading" ON public.ai_grading_status FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'coach')) WITH CHECK (public.has_role(auth.uid(),'coach'));