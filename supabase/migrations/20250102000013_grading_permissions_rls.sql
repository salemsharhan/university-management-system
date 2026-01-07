-- Grant permissions and set up RLS for grade_components table
-- This also helps refresh PostgREST schema cache

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on grade_components table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "grade_components" TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE "grade_components_id_seq" TO anon, authenticated;

-- Enable RLS
ALTER TABLE "grade_components" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grade_components
-- Allow authenticated users to view grades for their college
CREATE POLICY "Users can view grades for their college"
ON "grade_components"
FOR SELECT
TO authenticated
USING (
  CASE
    -- Admin can see all grades
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    ) THEN true
    -- College admin can see grades for their college
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'user'
      AND users.college_id = grade_components.college_id
    ) THEN true
    -- Instructor can see grades for their classes
    WHEN EXISTS (
      SELECT 1 FROM instructors 
      WHERE instructors.user_id = auth.uid()
      AND instructors.college_id = grade_components.college_id
      AND EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = grade_components.class_id
        AND classes.instructor_id = instructors.id
      )
    ) THEN true
    -- Students can see their own grades
    WHEN EXISTS (
      SELECT 1 FROM students 
      WHERE students.user_id = auth.uid()
      AND students.id = grade_components.student_id
    ) THEN true
    ELSE false
  END
);

-- Allow instructors and admins to insert grades
CREATE POLICY "Instructors and admins can insert grades"
ON "grade_components"
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    -- Admin can insert grades
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    ) THEN true
    -- College admin can insert grades for their college
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'user'
      AND users.college_id = grade_components.college_id
    ) THEN true
    -- Instructor can insert grades for their classes
    WHEN EXISTS (
      SELECT 1 FROM instructors 
      WHERE instructors.user_id = auth.uid()
      AND instructors.college_id = grade_components.college_id
      AND EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = grade_components.class_id
        AND classes.instructor_id = instructors.id
      )
    ) THEN true
    ELSE false
  END
);

-- Allow instructors and admins to update grades
CREATE POLICY "Instructors and admins can update grades"
ON "grade_components"
FOR UPDATE
TO authenticated
USING (
  CASE
    -- Admin can update all grades
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    ) THEN true
    -- College admin can update grades for their college
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'user'
      AND users.college_id = grade_components.college_id
    ) THEN true
    -- Instructor can update grades for their classes (only if status is draft or submitted)
    WHEN EXISTS (
      SELECT 1 FROM instructors 
      WHERE instructors.user_id = auth.uid()
      AND instructors.college_id = grade_components.college_id
      AND EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = grade_components.class_id
        AND classes.instructor_id = instructors.id
      )
      AND (grade_components.status = 'draft' OR grade_components.status = 'submitted')
    ) THEN true
    ELSE false
  END
)
WITH CHECK (
  CASE
    -- Admin can update all grades
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    ) THEN true
    -- College admin can update grades for their college
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'user'
      AND users.college_id = grade_components.college_id
    ) THEN true
    -- Instructor can update grades for their classes (only if status is draft or submitted)
    WHEN EXISTS (
      SELECT 1 FROM instructors 
      WHERE instructors.user_id = auth.uid()
      AND instructors.college_id = grade_components.college_id
      AND EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = grade_components.class_id
        AND classes.instructor_id = instructors.id
      )
      AND (grade_components.status = 'draft' OR grade_components.status = 'submitted')
    ) THEN true
    ELSE false
  END
);

-- Grant permissions on grade_status enum
GRANT USAGE ON TYPE "grade_status" TO anon, authenticated;

-- Refresh PostgREST schema cache by notifying it of schema changes
NOTIFY pgrst, 'reload schema';



