CREATE OR REPLACE FUNCTION public.review_interval_days(p_box integer) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT CASE p_box WHEN 1 THEN 3 WHEN 2 THEN 9 WHEN 3 THEN 15 ELSE 25 END $$;
GRANT EXECUTE ON FUNCTION public.review_interval_days(integer) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.apply_leitner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur integer; nb integer;
BEGIN
SELECT box INTO cur FROM public.review_state WHERE user_id = new.user_id AND question_id = new.question_id;
IF cur IS NULL THEN cur := 0; END IF;
IF new.is_correct THEN
nb := least(cur + 1, 4);
INSERT INTO public.review_state(user_id,question_id,box,due_at) VALUES(new.user_id,new.question_id,nb,now() + public.review_interval_days(nb) * interval '1 day') ON CONFLICT(user_id,question_id) DO UPDATE SET box = excluded.box, due_at = excluded.due_at;
ELSE
INSERT INTO public.review_state(user_id,question_id,box,due_at) VALUES(new.user_id,new.question_id,0,now()) ON CONFLICT(user_id,question_id) DO UPDATE SET box = 0, due_at = now();
END IF;
RETURN new;
END $$;