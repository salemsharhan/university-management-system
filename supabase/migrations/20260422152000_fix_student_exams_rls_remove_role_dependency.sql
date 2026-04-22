-- Fix: student exam RLS should not depend on users.role being 'student'.
-- Many deployments don't create/link a `users` row for students, so current_app_user_role() may be null.
-- Instead, rely on current_student_id() + enrollments.

-- ---------------------------------------------------------------------------
-- subject_exams
-- ---------------------------------------------------------------------------
ALTER TABLE public.subject_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_exams_student_select" ON public.subject_exams;
CREATE POLICY "subject_exams_student_select"
  ON public.subject_exams FOR SELECT TO authenticated
  USING (
    public.current_student_id() IS NOT NULL
    AND class_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.student_id = public.current_student_id()
        AND e.class_id = subject_exams.class_id
        AND e.status = 'enrolled'
    )
    AND subject_exams.status IN ('EX_SCH','EX_OPN','EX_CLS','EX_REL')
  );

-- ---------------------------------------------------------------------------
-- subject_exam_questions
-- ---------------------------------------------------------------------------
ALTER TABLE public.subject_exam_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_exam_questions_student_select" ON public.subject_exam_questions;
CREATE POLICY "subject_exam_questions_student_select"
  ON public.subject_exam_questions FOR SELECT TO authenticated
  USING (
    public.current_student_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.subject_exams ex
      WHERE ex.id = subject_exam_questions.subject_exam_id
        AND ex.class_id IS NOT NULL
        AND ex.status IN ('EX_OPN','EX_CLS','EX_REL')
        AND EXISTS (
          SELECT 1
          FROM public.enrollments e
          WHERE e.student_id = public.current_student_id()
            AND e.class_id = ex.class_id
            AND e.status = 'enrolled'
        )
    )
  );

-- ---------------------------------------------------------------------------
-- exam_submissions
-- ---------------------------------------------------------------------------
ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_submissions_student_select" ON public.exam_submissions;
CREATE POLICY "exam_submissions_student_select"
  ON public.exam_submissions FOR SELECT TO authenticated
  USING (
    student_id = public.current_student_id()
  );

DROP POLICY IF EXISTS "exam_submissions_student_insert" ON public.exam_submissions;
CREATE POLICY "exam_submissions_student_insert"
  ON public.exam_submissions FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.current_student_id()
    AND status IN ('EX_DRF','EX_SUB')
    AND EXISTS (
      SELECT 1
      FROM public.subject_exams ex
      JOIN public.enrollments e ON e.class_id = ex.class_id
      WHERE ex.id = exam_submissions.exam_id
        AND e.student_id = public.current_student_id()
        AND e.status = 'enrolled'
    )
  );

DROP POLICY IF EXISTS "exam_submissions_student_update" ON public.exam_submissions;
CREATE POLICY "exam_submissions_student_update"
  ON public.exam_submissions FOR UPDATE TO authenticated
  USING (
    student_id = public.current_student_id()
    AND status IN ('EX_DRF','EX_SUB')
  )
  WITH CHECK (
    student_id = public.current_student_id()
    AND status IN ('EX_DRF','EX_SUB')
  );

