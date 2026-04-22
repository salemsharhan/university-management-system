-- Fix grade_components RLS insert/update failures by:
-- 1) Auto-populating required foreign keys/college_id from enrollments/classes
-- 2) Updating existing rows missing these values
-- 3) Replacing INSERT/UPDATE policies to validate via enrollments/classes instead of trusting client-provided fields

-- Ensure table exists
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

-- 1) Auto-fill function
CREATE OR REPLACE FUNCTION public.fill_grade_components_refs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  e RECORD;
  c RECORD;
BEGIN
  -- Prefer enrollment as source of truth when available
  IF NEW.enrollment_id IS NOT NULL THEN
    SELECT * INTO e FROM public.enrollments WHERE id = NEW.enrollment_id;
    IF FOUND THEN
      IF NEW.student_id IS NULL THEN NEW.student_id := e.student_id; END IF;
      IF NEW.class_id IS NULL THEN NEW.class_id := e.class_id; END IF;
      IF NEW.semester_id IS NULL THEN NEW.semester_id := e.semester_id; END IF;
      IF NEW.college_id IS NULL THEN NEW.college_id := e.college_id; END IF;
    END IF;
  END IF;

  -- Backfill college/semester from class if still missing
  IF NEW.class_id IS NOT NULL AND (NEW.college_id IS NULL OR NEW.semester_id IS NULL) THEN
    SELECT id, semester_id, college_id INTO c FROM public.classes WHERE id = NEW.class_id;
    IF FOUND THEN
      IF NEW.semester_id IS NULL THEN NEW.semester_id := c.semester_id; END IF;
      IF NEW.college_id IS NULL THEN NEW.college_id := c.college_id; END IF;
    END IF;
  END IF;

  -- Always keep updated_at fresh
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_fill_grade_components_refs ON public.grade_components;
CREATE TRIGGER trigger_fill_grade_components_refs
BEFORE INSERT OR UPDATE ON public.grade_components
FOR EACH ROW
EXECUTE FUNCTION public.fill_grade_components_refs();

-- 2) Backfill existing rows
UPDATE public.grade_components gc
SET
  student_id = COALESCE(gc.student_id, e.student_id),
  class_id = COALESCE(gc.class_id, e.class_id),
  semester_id = COALESCE(gc.semester_id, e.semester_id),
  college_id = COALESCE(gc.college_id, e.college_id),
  updated_at = now()
FROM public.enrollments e
WHERE gc.enrollment_id = e.id
  AND (gc.student_id IS NULL OR gc.class_id IS NULL OR gc.semester_id IS NULL OR gc.college_id IS NULL);

UPDATE public.grade_components gc
SET
  semester_id = COALESCE(gc.semester_id, c.semester_id),
  college_id = COALESCE(gc.college_id, c.college_id),
  updated_at = now()
FROM public.classes c
WHERE gc.class_id = c.id
  AND (gc.semester_id IS NULL OR gc.college_id IS NULL);

-- 3) Replace INSERT/UPDATE policies
-- Drop existing policies if they exist (names used in earlier migrations)
DROP POLICY IF EXISTS "Instructors and admins can insert grades" ON public.grade_components;
DROP POLICY IF EXISTS "Instructors and admins can update grades" ON public.grade_components;

-- Insert policy: admin, college staff(user), or instructor assigned to the class of the enrollment
CREATE POLICY "Instructors and admins can insert grades"
ON public.grade_components
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin can insert anything
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u."openId" = auth.uid()::text
      AND u.role = 'admin'
  )
  OR
  -- College staff can insert for their college (based on enrollment->class college)
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.enrollments e ON e.id = grade_components.enrollment_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE u."openId" = auth.uid()::text
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
    WHERE u."openId" = auth.uid()::text
      AND c.instructor_id = i.id
  )
);

-- Update policy: same as insert, plus prevent editing after finalization
CREATE POLICY "Instructors and admins can update grades"
ON public.grade_components
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u."openId" = auth.uid()::text
      AND u.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.enrollments e ON e.id = grade_components.enrollment_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE u."openId" = auth.uid()::text
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
    WHERE u."openId" = auth.uid()::text
      AND c.instructor_id = i.id
  )
)
WITH CHECK (
  (grade_components.status IN ('draft','submitted','approved'))
  AND (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u."openId" = auth.uid()::text
        AND u.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.enrollments e ON e.id = grade_components.enrollment_id
      JOIN public.classes c ON c.id = e.class_id
      WHERE u."openId" = auth.uid()::text
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
      WHERE u."openId" = auth.uid()::text
        AND c.instructor_id = i.id
    )
  )
);

