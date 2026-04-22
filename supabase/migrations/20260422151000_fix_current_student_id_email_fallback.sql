-- Fix current_student_id() so student RLS works even when students.user_id is null.
-- Many student rows are linked by email only (especially after onboarding).

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT s.id
  FROM public.students s
  LEFT JOIN public.users u ON u.id = s.user_id
  WHERE (
      (u."openId" = auth.uid()::text)
      OR lower(u.email) = lower((auth.jwt() ->> 'email'))
      OR lower(s.email) = lower((auth.jwt() ->> 'email'))
  )
  ORDER BY s.id
  LIMIT 1;
$$;

