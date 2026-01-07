-- Make faculty_id optional in departments to allow creating departments without faculties
-- This breaks the circular dependency: instructors need departments, departments need faculties
ALTER TABLE "departments"
ALTER COLUMN "faculty_id" DROP NOT NULL;

-- Make department_id optional in instructors to allow creating instructors without departments
-- This allows creating either departments or instructors first, then linking them later
ALTER TABLE "instructors"
ALTER COLUMN "department_id" DROP NOT NULL;

-- Make faculty_id optional in majors to allow creating majors without faculties
-- Majors can use instructors instead
ALTER TABLE "majors"
ALTER COLUMN "faculty_id" DROP NOT NULL;

-- Add comments explaining the changes
COMMENT ON COLUMN "departments"."faculty_id" IS 'Optional: Department can exist without a faculty. Use head_id for the department head (instructor).';
COMMENT ON COLUMN "instructors"."department_id" IS 'Optional: Instructor can be created without a department initially, then assigned later.';
COMMENT ON COLUMN "majors"."faculty_id" IS 'Optional: Major can exist without a faculty. Use head_of_major_id for the major head (instructor).';

