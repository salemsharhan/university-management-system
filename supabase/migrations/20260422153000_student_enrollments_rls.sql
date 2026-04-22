-- Allow students to read their own enrollments.
-- Required for exam/courseware RLS policies that use EXISTS(enrollments ...).

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enrollments_student_select" ON public.enrollments;
CREATE POLICY "enrollments_student_select"
  ON public.enrollments FOR SELECT TO authenticated
  USING (
    student_id = public.current_student_id()
  );

