-- Fix: students still can't see subject_exams even when enrolled + exam is scheduled.
-- Re-create policies with the simplest possible enrollment check, relying only on current_student_id().

-- ---------------------------------------------------------------------------
-- subject_exams
-- ---------------------------------------------------------------------------
ALTER TABLE public.subject_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_exams_student_select" ON public.subject_exams;
CREATE POLICY "subject_exams_student_select"
  ON public.subject_exams FOR SELECT TO authenticated
  USING (
    public.current_student_id() IS NOT NULL
    AND subject_exams.class_id IS NOT NULL
    AND subject_exams.status IN ('EX_SCH','EX_OPN','EX_CLS','EX_REL')
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.student_id = public.current_student_id()
        AND e.class_id = subject_exams.class_id
    )
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
        )
    )
  );

