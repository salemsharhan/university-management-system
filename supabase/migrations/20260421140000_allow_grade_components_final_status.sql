-- Allow setting grade_components.status = 'final' for authorized users.
-- Previously the RLS UPDATE policy only allowed ('draft','submitted','approved'), so "final" was blocked.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'grade_components'
  ) THEN
    RAISE NOTICE 'grade_components table does not exist, skipping migration';
    RETURN;
  END IF;
END $$;

DROP POLICY IF EXISTS "Instructors and admins can update grades" ON public.grade_components;

CREATE POLICY "Instructors and admins can update grades"
ON public.grade_components
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
      AND u.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.enrollments e ON e.id = grade_components.enrollment_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
      AND u.role = 'user'
      AND u.college_id = c.college_id
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.instructors i
    JOIN public.enrollments e ON e.id = grade_components.enrollment_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE c.instructor_id = i.id
      AND (
        lower(i.email) = lower((auth.jwt() ->> 'email'))
        OR EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = i.user_id
            AND (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
        )
      )
  )
)
WITH CHECK (
  -- Allow final as well (so instructors can finalize grades when permitted by the app)
  (grade_components.status IN ('draft','submitted','approved','final'))
  AND (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
        AND u.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.enrollments e ON e.id = grade_components.enrollment_id
      JOIN public.classes c ON c.id = e.class_id
      WHERE (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
        AND u.role = 'user'
        AND u.college_id = c.college_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.instructors i
      JOIN public.enrollments e ON e.id = grade_components.enrollment_id
      JOIN public.classes c ON c.id = e.class_id
      WHERE c.instructor_id = i.id
        AND (
          lower(i.email) = lower((auth.jwt() ->> 'email'))
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = i.user_id
              AND (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
          )
        )
    )
  )
);

