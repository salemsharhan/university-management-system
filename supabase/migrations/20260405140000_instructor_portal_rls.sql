-- Production RLS for instructor portal: curriculum, assessments, question bank.
-- Requires users."openId" = auth.uid() (see sync_user_openid) and/or instructors linked by email/user_id.

CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u."openId" = auth.uid()::text AND u.role = 'admin'
  );
$$;

/** Active instructor row for the current auth user (by user_id link or email). */
CREATE OR REPLACE FUNCTION public.auth_instructor_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id
  FROM public.users u
  INNER JOIN public.instructors i
    ON (i.user_id = u.id OR lower(i.email) = lower(u.email))
  WHERE u."openId" = auth.uid()::text
    AND i.status = 'active'
  ORDER BY i.id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id FROM public.users u WHERE u."openId" = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_instructor_owns_class(p_class_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = p_class_id AND c.instructor_id = public.auth_instructor_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- instructor_course_settings
-- ---------------------------------------------------------------------------
ALTER TABLE public.instructor_course_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instructor_course_settings_rw" ON public.instructor_course_settings;
CREATE POLICY "instructor_course_settings_rw"
  ON public.instructor_course_settings FOR ALL TO authenticated
  USING (
    public.auth_is_admin()
    OR instructor_id = public.auth_instructor_id()
  )
  WITH CHECK (
    public.auth_is_admin()
    OR instructor_id = public.auth_instructor_id()
  );

-- ---------------------------------------------------------------------------
-- class_lessons
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_lessons_rw" ON public.class_lessons;
CREATE POLICY "class_lessons_rw"
  ON public.class_lessons FOR ALL TO authenticated
  USING (
    public.auth_is_admin()
    OR public.auth_instructor_owns_class(class_id)
  )
  WITH CHECK (
    public.auth_is_admin()
    OR public.auth_instructor_owns_class(class_id)
  );

-- ---------------------------------------------------------------------------
-- class_lesson_elements
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_lesson_elements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_lesson_elements_rw" ON public.class_lesson_elements;
CREATE POLICY "class_lesson_elements_rw"
  ON public.class_lesson_elements FOR ALL TO authenticated
  USING (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.class_lessons cl
      WHERE cl.id = class_lesson_elements.lesson_id
        AND public.auth_instructor_owns_class(cl.class_id)
    )
  )
  WITH CHECK (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.class_lessons cl
      WHERE cl.id = class_lesson_elements.lesson_id
        AND public.auth_instructor_owns_class(cl.class_id)
    )
  );

-- ---------------------------------------------------------------------------
-- class_lesson_clos
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_lesson_clos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_lesson_clos_rw" ON public.class_lesson_clos;
CREATE POLICY "class_lesson_clos_rw"
  ON public.class_lesson_clos FOR ALL TO authenticated
  USING (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.class_lessons cl
      WHERE cl.id = class_lesson_clos.lesson_id
        AND public.auth_instructor_owns_class(cl.class_id)
    )
  )
  WITH CHECK (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.class_lessons cl
      WHERE cl.id = class_lesson_clos.lesson_id
        AND public.auth_instructor_owns_class(cl.class_id)
    )
  );

-- ---------------------------------------------------------------------------
-- class_lesson_progress (instructor reads class progress)
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_lesson_progress_select" ON public.class_lesson_progress;
CREATE POLICY "class_lesson_progress_select"
  ON public.class_lesson_progress FOR SELECT TO authenticated
  USING (
    public.auth_is_admin()
    OR public.auth_instructor_owns_class(class_id)
  );

-- Students updating own progress would need a separate policy; not used in this app path yet.

-- ---------------------------------------------------------------------------
-- subject_question_bank
-- ---------------------------------------------------------------------------
ALTER TABLE public.subject_question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_question_bank_rw" ON public.subject_question_bank;
CREATE POLICY "subject_question_bank_rw"
  ON public.subject_question_bank FOR ALL TO authenticated
  USING (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.instructor_id = public.auth_instructor_id()
        AND (
          c.subject_id = subject_question_bank.subject_id
          OR (subject_question_bank.class_id IS NOT NULL AND subject_question_bank.class_id = c.id)
        )
    )
  )
  WITH CHECK (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.instructor_id = public.auth_instructor_id()
        AND (
          c.subject_id = subject_question_bank.subject_id
          OR (subject_question_bank.class_id IS NOT NULL AND subject_question_bank.class_id = c.id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- subject_exams
-- ---------------------------------------------------------------------------
ALTER TABLE public.subject_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_exams_rw" ON public.subject_exams;
CREATE POLICY "subject_exams_rw"
  ON public.subject_exams FOR ALL TO authenticated
  USING (
    public.auth_is_admin()
    OR created_by = public.auth_user_id()
    OR (class_id IS NOT NULL AND public.auth_instructor_owns_class(class_id))
    OR (
      class_id IS NULL AND EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.subject_id = subject_exams.subject_id AND c.instructor_id = public.auth_instructor_id()
      )
    )
  )
  WITH CHECK (
    public.auth_is_admin()
    OR created_by = public.auth_user_id()
    OR (class_id IS NOT NULL AND public.auth_instructor_owns_class(class_id))
    OR (
      class_id IS NULL AND EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.subject_id = subject_exams.subject_id AND c.instructor_id = public.auth_instructor_id()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- subject_exam_questions
-- ---------------------------------------------------------------------------
ALTER TABLE public.subject_exam_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_exam_questions_rw" ON public.subject_exam_questions;
CREATE POLICY "subject_exam_questions_rw"
  ON public.subject_exam_questions FOR ALL TO authenticated
  USING (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.subject_exams se
      WHERE se.id = subject_exam_questions.subject_exam_id
        AND (
          se.created_by = public.auth_user_id()
          OR (se.class_id IS NOT NULL AND public.auth_instructor_owns_class(se.class_id))
          OR (
            se.class_id IS NULL AND EXISTS (
              SELECT 1 FROM public.classes c
              WHERE c.subject_id = se.subject_id AND c.instructor_id = public.auth_instructor_id()
            )
          )
        )
    )
  )
  WITH CHECK (
    public.auth_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.subject_exams se
      WHERE se.id = subject_exam_questions.subject_exam_id
        AND (
          se.created_by = public.auth_user_id()
          OR (se.class_id IS NOT NULL AND public.auth_instructor_owns_class(se.class_id))
          OR (
            se.class_id IS NULL AND EXISTS (
              SELECT 1 FROM public.classes c
              WHERE c.subject_id = se.subject_id AND c.instructor_id = public.auth_instructor_id()
            )
          )
        )
    )
  );

COMMENT ON FUNCTION public.auth_instructor_id() IS 'Maps Supabase auth user to instructors.id for RLS';
