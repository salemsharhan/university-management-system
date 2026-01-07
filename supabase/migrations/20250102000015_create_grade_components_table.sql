-- Create grade_components table if it doesn't exist
-- This migration ensures the table is created even if the previous migration failed

-- Create grade status enum if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_status') THEN
        CREATE TYPE "grade_status" AS ENUM('draft', 'submitted', 'approved', 'final');
    END IF;
END $$;

-- Create grade_components table if it doesn't exist
CREATE TABLE IF NOT EXISTS "grade_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollment_id" integer NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
	"class_id" integer NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
	"student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
	"semester_id" integer NOT NULL REFERENCES "semesters"("id") ON DELETE CASCADE,
	"college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
	
	-- Grade components (stored as numeric, can be null if not graded yet)
	"midterm" numeric(5, 2),
	"final" numeric(5, 2),
	"assignments" numeric(5, 2),
	"quizzes" numeric(5, 2),
	"class_participation" numeric(5, 2),
	"project" numeric(5, 2),
	"lab" numeric(5, 2),
	"other" numeric(5, 2),
	
	-- Calculated final grades
	"numeric_grade" numeric(5, 2), -- Final numeric grade (0-100)
	"letter_grade" varchar(5), -- Letter grade (A+, A, B+, etc.)
	"gpa_points" numeric(3, 2), -- GPA points (0.0-4.0)
	
	-- Metadata
	"status" "grade_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"graded_by" integer REFERENCES "instructors"("id"),
	"graded_at" timestamp with time zone,
	"approved_by" integer REFERENCES "users"("id"),
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	
	CONSTRAINT "grade_components_enrollment_id_unique" UNIQUE("enrollment_id")
);

-- Create indexes for grade_components (only if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_grade_components_enrollment_id" ON "grade_components"("enrollment_id");
CREATE INDEX IF NOT EXISTS "idx_grade_components_class_id" ON "grade_components"("class_id");
CREATE INDEX IF NOT EXISTS "idx_grade_components_student_id" ON "grade_components"("student_id");
CREATE INDEX IF NOT EXISTS "idx_grade_components_semester_id" ON "grade_components"("semester_id");
CREATE INDEX IF NOT EXISTS "idx_grade_components_college_id" ON "grade_components"("college_id");
CREATE INDEX IF NOT EXISTS "idx_grade_components_status" ON "grade_components"("status");

-- Add college_id to enrollments if not exists (for filtering)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'enrollments' 
    AND column_name = 'college_id'
  ) THEN
    ALTER TABLE "enrollments"
    ADD COLUMN "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS "idx_enrollments_college_id" ON "enrollments"("college_id");
    
    -- Populate college_id for existing enrollments
    UPDATE "enrollments" e
    SET "college_id" = (
      SELECT c.college_id 
      FROM "classes" c 
      WHERE c.id = e.class_id
      LIMIT 1
    )
    WHERE "college_id" IS NULL;
  END IF;
END $$;

-- Function to calculate letter grade and GPA points from numeric grade
CREATE OR REPLACE FUNCTION calculate_grade_from_numeric(numeric_grade numeric)
RETURNS TABLE(letter_grade varchar(5), gpa_points numeric(3, 2)) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE
      WHEN numeric_grade >= 95 THEN 'A+'::varchar(5)
      WHEN numeric_grade >= 90 THEN 'A'::varchar(5)
      WHEN numeric_grade >= 85 THEN 'B+'::varchar(5)
      WHEN numeric_grade >= 80 THEN 'B'::varchar(5)
      WHEN numeric_grade >= 75 THEN 'C+'::varchar(5)
      WHEN numeric_grade >= 70 THEN 'C'::varchar(5)
      WHEN numeric_grade >= 60 THEN 'D'::varchar(5)
      ELSE 'F'::varchar(5)
    END as letter_grade,
    CASE
      WHEN numeric_grade >= 95 THEN 4.0::numeric(3, 2)
      WHEN numeric_grade >= 90 THEN 3.7::numeric(3, 2)
      WHEN numeric_grade >= 85 THEN 3.3::numeric(3, 2)
      WHEN numeric_grade >= 80 THEN 3.0::numeric(3, 2)
      WHEN numeric_grade >= 75 THEN 2.7::numeric(3, 2)
      WHEN numeric_grade >= 70 THEN 2.0::numeric(3, 2)
      WHEN numeric_grade >= 60 THEN 1.0::numeric(3, 2)
      ELSE 0.0::numeric(3, 2)
    END as gpa_points;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate letter grade and GPA when numeric grade is updated
CREATE OR REPLACE FUNCTION update_grade_calculations()
RETURNS TRIGGER AS $$
DECLARE
  calculated_grade RECORD;
BEGIN
  IF NEW.numeric_grade IS NOT NULL THEN
    SELECT * INTO calculated_grade FROM calculate_grade_from_numeric(NEW.numeric_grade);
    NEW.letter_grade := calculated_grade.letter_grade;
    NEW.gpa_points := calculated_grade.gpa_points;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_grade_calculations ON grade_components;
CREATE TRIGGER trigger_update_grade_calculations
BEFORE INSERT OR UPDATE OF numeric_grade ON grade_components
FOR EACH ROW
EXECUTE FUNCTION update_grade_calculations();

-- Trigger to sync grade_components with enrollments table
CREATE OR REPLACE FUNCTION sync_enrollment_grades()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE enrollments
  SET 
    grade = NEW.letter_grade,
    numeric_grade = NEW.numeric_grade,
    grade_points = NEW.gpa_points,
    updated_at = NOW()
  WHERE id = NEW.enrollment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_sync_enrollment_grades ON grade_components;
CREATE TRIGGER trigger_sync_enrollment_grades
AFTER INSERT OR UPDATE OF letter_grade, numeric_grade, gpa_points ON grade_components
FOR EACH ROW
WHEN (NEW.status = 'final' OR NEW.status = 'approved')
EXECUTE FUNCTION sync_enrollment_grades();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "grade_components" TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE "grade_components_id_seq" TO anon, authenticated;
GRANT USAGE ON TYPE "grade_status" TO anon, authenticated;

-- Enable RLS
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
      WHERE users."openId" = auth.uid()::text
      AND users.role = 'admin'
    ) THEN true
    -- College admin can see grades for their college
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users."openId" = auth.uid()::text
      AND users.role = 'user'
      AND users.college_id = grade_components.college_id
    ) THEN true
    -- Instructor can see grades for their classes
    WHEN EXISTS (
      SELECT 1 FROM instructors 
      INNER JOIN users ON users.id = instructors.user_id
      WHERE users."openId" = auth.uid()::text
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
      INNER JOIN users ON users.id = students.user_id
      WHERE users."openId" = auth.uid()::text
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
      WHERE users."openId" = auth.uid()::text
      AND users.role = 'admin'
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users."openId" = auth.uid()::text
      AND users.role = 'user'
      AND users.college_id = grade_components.college_id
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM instructors 
      INNER JOIN users ON users.id = instructors.user_id
      WHERE users."openId" = auth.uid()::text
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
      WHERE users."openId" = auth.uid()::text
      AND users.role = 'admin'
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users."openId" = auth.uid()::text
      AND users.role = 'user'
      AND users.college_id = grade_components.college_id
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM instructors 
      INNER JOIN users ON users.id = instructors.user_id
      WHERE users."openId" = auth.uid()::text
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
      WHERE users."openId" = auth.uid()::text
      AND users.role = 'admin'
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE users."openId" = auth.uid()::text
      AND users.role = 'user'
      AND users.college_id = grade_components.college_id
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM instructors 
      INNER JOIN users ON users.id = instructors.user_id
      WHERE users."openId" = auth.uid()::text
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

-- Add comments
COMMENT ON TABLE "grade_components" IS 'Detailed grade breakdown for student enrollments. Stores individual component grades (midterm, final, assignments, etc.) and calculated final grades.';
COMMENT ON COLUMN "grade_components"."status" IS 'Grade status: draft (being entered), submitted (awaiting approval), approved (approved by admin), final (finalized and cannot be changed)';
COMMENT ON COLUMN "grade_components"."college_id" IS 'College this grade belongs to. Used for filtering by college.';

