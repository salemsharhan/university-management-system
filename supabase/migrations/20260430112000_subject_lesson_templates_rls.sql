-- RLS for subject lesson templates.
-- Admin: full access. Instructors: read-only when they teach the subject.

ALTER TABLE public.subject_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_lesson_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_lesson_clos ENABLE ROW LEVEL SECURITY;

-- subject_lessons
DROP POLICY IF EXISTS "subject_lessons_admin_rw" ON public.subject_lessons;
CREATE POLICY "subject_lessons_admin_rw"
  ON public.subject_lessons FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS "subject_lessons_instructor_read" ON public.subject_lessons;
CREATE POLICY "subject_lessons_instructor_read"
  ON public.subject_lessons FOR SELECT TO authenticated
  USING (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.subject_id = subject_lessons.subject_id
        AND c.instructor_id = public.auth_instructor_id()
    )
  );

-- subject_lesson_elements
DROP POLICY IF EXISTS "subject_lesson_elements_admin_rw" ON public.subject_lesson_elements;
CREATE POLICY "subject_lesson_elements_admin_rw"
  ON public.subject_lesson_elements FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS "subject_lesson_elements_instructor_read" ON public.subject_lesson_elements;
CREATE POLICY "subject_lesson_elements_instructor_read"
  ON public.subject_lesson_elements FOR SELECT TO authenticated
  USING (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.subject_lessons sl
      JOIN public.classes c ON c.subject_id = sl.subject_id
      WHERE sl.id = subject_lesson_elements.subject_lesson_id
        AND c.instructor_id = public.auth_instructor_id()
    )
  );

-- subject_lesson_clos
DROP POLICY IF EXISTS "subject_lesson_clos_admin_rw" ON public.subject_lesson_clos;
CREATE POLICY "subject_lesson_clos_admin_rw"
  ON public.subject_lesson_clos FOR ALL TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS "subject_lesson_clos_instructor_read" ON public.subject_lesson_clos;
CREATE POLICY "subject_lesson_clos_instructor_read"
  ON public.subject_lesson_clos FOR SELECT TO authenticated
  USING (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.subject_lessons sl
      JOIN public.classes c ON c.subject_id = sl.subject_id
      WHERE sl.id = subject_lesson_clos.subject_lesson_id
        AND c.instructor_id = public.auth_instructor_id()
    )
  );

