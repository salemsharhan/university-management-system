-- enrollments had RLS enabled with a student SELECT policy only (20260422153000_student_enrollments_rls.sql).
-- That blocks INSERT/UPDATE/DELETE for everyone (including self-service enrollment from the student portal).
-- Add student write policies plus staff read/write so admin/college flows keep working.

-- ---------------------------------------------------------------------------
-- Staff + instructor: read enrollments in their scope (additive with student self-select)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "enrollments_staff_select" ON public.enrollments;
CREATE POLICY "enrollments_staff_select"
  ON public.enrollments FOR SELECT TO authenticated
  USING (
    public.current_app_user_role() = 'admin'
    OR (
      public.current_app_user_role() = 'user'
      AND EXISTS (
        SELECT 1
        FROM public.students st
        JOIN public.users u ON u.id = public.current_app_user_id()
        WHERE st.id = enrollments.student_id
          AND u.college_id IS NOT NULL
          AND u.college_id = st.college_id
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.instructors i
      JOIN public.classes c ON c.id = enrollments.class_id AND c.instructor_id = i.id
      WHERE (
        lower(i.email) = lower((auth.jwt() ->> 'email'))
        OR EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.id = i.user_id
            AND (
              u2."openId" = auth.uid()::text
              OR lower(u2.email) = lower((auth.jwt() ->> 'email'))
            )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Student: create own enrollment (student portal course registration)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "enrollments_student_insert" ON public.enrollments;
CREATE POLICY "enrollments_student_insert"
  ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (
    public.current_student_id() IS NOT NULL
    AND enrollments.student_id = public.current_student_id()
    AND EXISTS (
      SELECT 1
      FROM public.classes cl
      JOIN public.students st ON st.id = enrollments.student_id
      WHERE cl.id = enrollments.class_id
        AND cl.semester_id = enrollments.semester_id
        AND (cl.college_id = st.college_id OR cl.is_university_wide IS TRUE)
    )
  );

DROP POLICY IF EXISTS "enrollments_student_update" ON public.enrollments;
CREATE POLICY "enrollments_student_update"
  ON public.enrollments FOR UPDATE TO authenticated
  USING (public.current_student_id() IS NOT NULL AND enrollments.student_id = public.current_student_id())
  WITH CHECK (public.current_student_id() IS NOT NULL AND enrollments.student_id = public.current_student_id());

-- ---------------------------------------------------------------------------
-- Staff: admin or college admin may create/update enrollments for their students
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "enrollments_staff_insert" ON public.enrollments;
CREATE POLICY "enrollments_staff_insert"
  ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (
    public.current_app_user_role() = 'admin'
    OR (
      public.current_app_user_role() = 'user'
      AND EXISTS (
        SELECT 1
        FROM public.students st
        JOIN public.users u ON u.id = public.current_app_user_id()
        WHERE st.id = enrollments.student_id
          AND u.college_id IS NOT NULL
          AND u.college_id = st.college_id
      )
      AND EXISTS (
        SELECT 1
        FROM public.classes cl
        JOIN public.students st2 ON st2.id = enrollments.student_id
        WHERE cl.id = enrollments.class_id
          AND cl.semester_id = enrollments.semester_id
          AND (cl.college_id = st2.college_id OR cl.is_university_wide IS TRUE)
      )
    )
  );

DROP POLICY IF EXISTS "enrollments_staff_update" ON public.enrollments;
CREATE POLICY "enrollments_staff_update"
  ON public.enrollments FOR UPDATE TO authenticated
  USING (
    public.current_app_user_role() = 'admin'
    OR (
      public.current_app_user_role() = 'user'
      AND EXISTS (
        SELECT 1
        FROM public.students st
        JOIN public.users u ON u.id = public.current_app_user_id()
        WHERE st.id = enrollments.student_id
          AND u.college_id IS NOT NULL
          AND u.college_id = st.college_id
      )
    )
  )
  WITH CHECK (
    public.current_app_user_role() = 'admin'
    OR (
      public.current_app_user_role() = 'user'
      AND EXISTS (
        SELECT 1
        FROM public.students st
        JOIN public.users u ON u.id = public.current_app_user_id()
        WHERE st.id = enrollments.student_id
          AND u.college_id IS NOT NULL
          AND u.college_id = st.college_id
      )
    )
  );

DROP POLICY IF EXISTS "enrollments_staff_delete" ON public.enrollments;
CREATE POLICY "enrollments_staff_delete"
  ON public.enrollments FOR DELETE TO authenticated
  USING (
    public.current_app_user_role() = 'admin'
    OR (
      public.current_app_user_role() = 'user'
      AND EXISTS (
        SELECT 1
        FROM public.students st
        JOIN public.users u ON u.id = public.current_app_user_id()
        WHERE st.id = enrollments.student_id
          AND u.college_id IS NOT NULL
          AND u.college_id = st.college_id
      )
    )
  );
