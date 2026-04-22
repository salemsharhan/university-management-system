-- Student access for courseware (lessons/elements/progress)
-- Existing instructor RLS locks these tables; students need read access to published + released lessons
-- and can upsert their own progress.

-- Ensure the helper functions exist (created earlier for requests center).
-- We depend on:
--   public.current_student_id()
--   public.current_app_user_role()

-- ---------------------------------------------------------------------------
-- class_lessons: students can SELECT published lessons for enrolled classes
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_lessons_student_select" ON public.class_lessons;
CREATE POLICY "class_lessons_student_select"
  ON public.class_lessons FOR SELECT TO authenticated
  USING (
    public.current_app_user_role() = 'student'
    AND status = 'published'
    AND (release_at IS NULL OR release_at <= now())
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.student_id = public.current_student_id()
        AND e.class_id = class_lessons.class_id
        AND e.semester_id = (SELECT c.semester_id FROM public.classes c WHERE c.id = class_lessons.class_id)
        AND e.status = 'enrolled'
    )
  );

-- ---------------------------------------------------------------------------
-- class_lesson_elements: students can SELECT elements if they can see the lesson
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_lesson_elements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_lesson_elements_student_select" ON public.class_lesson_elements;
CREATE POLICY "class_lesson_elements_student_select"
  ON public.class_lesson_elements FOR SELECT TO authenticated
  USING (
    public.current_app_user_role() = 'student'
    AND EXISTS (
      SELECT 1
      FROM public.class_lessons cl
      WHERE cl.id = class_lesson_elements.lesson_id
        AND cl.status = 'published'
        AND (cl.release_at IS NULL OR cl.release_at <= now())
        AND EXISTS (
          SELECT 1
          FROM public.enrollments e
          WHERE e.student_id = public.current_student_id()
            AND e.class_id = cl.class_id
            AND e.semester_id = (SELECT c.semester_id FROM public.classes c WHERE c.id = cl.class_id)
            AND e.status = 'enrolled'
        )
    )
  );

-- ---------------------------------------------------------------------------
-- class_lesson_progress: students can SELECT/INSERT/UPDATE their own
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_lesson_progress_student_select" ON public.class_lesson_progress;
CREATE POLICY "class_lesson_progress_student_select"
  ON public.class_lesson_progress FOR SELECT TO authenticated
  USING (
    public.current_app_user_role() = 'student'
    AND student_id = public.current_student_id()
  );

DROP POLICY IF EXISTS "class_lesson_progress_student_insert" ON public.class_lesson_progress;
CREATE POLICY "class_lesson_progress_student_insert"
  ON public.class_lesson_progress FOR INSERT TO authenticated
  WITH CHECK (
    public.current_app_user_role() = 'student'
    AND student_id = public.current_student_id()
    AND EXISTS (
      SELECT 1
      FROM public.class_lessons cl
      JOIN public.enrollments e ON e.class_id = cl.class_id
      WHERE cl.id = class_lesson_progress.lesson_id
        AND e.student_id = public.current_student_id()
        AND e.status = 'enrolled'
    )
  );

DROP POLICY IF EXISTS "class_lesson_progress_student_update" ON public.class_lesson_progress;
CREATE POLICY "class_lesson_progress_student_update"
  ON public.class_lesson_progress FOR UPDATE TO authenticated
  USING (
    public.current_app_user_role() = 'student'
    AND student_id = public.current_student_id()
  )
  WITH CHECK (
    public.current_app_user_role() = 'student'
    AND student_id = public.current_student_id()
  );

