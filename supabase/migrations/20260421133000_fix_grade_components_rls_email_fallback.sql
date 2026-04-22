-- Fix grade_components RLS for instructor accounts when users.openId is not synced.
-- Adds a fallback match using auth.jwt()->>'email' against users.email.

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

-- Replace INSERT/UPDATE policies with email fallback.
DROP POLICY IF EXISTS "Instructors and admins can insert grades" ON public.grade_components;
DROP POLICY IF EXISTS "Instructors and admins can update grades" ON public.grade_components;

CREATE POLICY "Instructors and admins can insert grades"
ON public.grade_components
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin can insert anything
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
      AND u.role = 'admin'
  )
  OR
  -- College staff can insert for their college (based on enrollment->class college)
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
  -- Instructor can insert for their own class (based on enrollment->class instructor)
  EXISTS (
    SELECT 1
    FROM public.instructors i
    JOIN public.users u ON u.id = i.user_id
    JOIN public.enrollments e ON e.id = grade_components.enrollment_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
      AND c.instructor_id = i.id
  )
);

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
    JOIN public.users u ON u.id = i.user_id
    JOIN public.enrollments e ON e.id = grade_components.enrollment_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
      AND c.instructor_id = i.id
  )
)
WITH CHECK (
  (grade_components.status IN ('draft','submitted','approved'))
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
      JOIN public.users u ON u.id = i.user_id
      JOIN public.enrollments e ON e.id = grade_components.enrollment_id
      JOIN public.classes c ON c.id = e.class_id
      WHERE (u."openId" = auth.uid()::text OR lower(u.email) = lower((auth.jwt() ->> 'email')))
        AND c.instructor_id = i.id
    )
  )
);

