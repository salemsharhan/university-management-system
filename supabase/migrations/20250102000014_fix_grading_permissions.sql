-- Fix permissions and refresh schema cache for grade_components
-- This migration ensures the table is accessible via PostgREST

-- Grant permissions on grade_components table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grade_components') THEN
    -- Grant table permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "grade_components" TO anon, authenticated;
    GRANT USAGE, SELECT ON SEQUENCE "grade_components_id_seq" TO anon, authenticated;
    
    -- Grant enum permissions
    IF EXISTS (SELECT FROM pg_type WHERE typname = 'grade_status') THEN
      GRANT USAGE ON TYPE "grade_status" TO anon, authenticated;
    END IF;
    
    -- Enable RLS if not already enabled
    ALTER TABLE "grade_components" ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view grades for their college" ON "grade_components";
    DROP POLICY IF EXISTS "Instructors and admins can insert grades" ON "grade_components";
    DROP POLICY IF EXISTS "Instructors and admins can update grades" ON "grade_components";
    
    -- Create RLS Policies
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

    CREATE POLICY "Instructors and admins can insert grades"
    ON "grade_components"
    FOR INSERT
    TO authenticated
    WITH CHECK (
      CASE
        WHEN EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        ) THEN true
        WHEN EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'user'
          AND users.college_id = grade_components.college_id
        ) THEN true
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

    CREATE POLICY "Instructors and admins can update grades"
    ON "grade_components"
    FOR UPDATE
    TO authenticated
    USING (
      CASE
        WHEN EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        ) THEN true
        WHEN EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'user'
          AND users.college_id = grade_components.college_id
        ) THEN true
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
        WHEN EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        ) THEN true
        WHEN EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'user'
          AND users.college_id = grade_components.college_id
        ) THEN true
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
  END IF;
END $$;



