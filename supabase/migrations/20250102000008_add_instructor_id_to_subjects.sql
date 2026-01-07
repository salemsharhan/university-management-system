-- Add instructor_id column to subjects table to properly link subjects to instructors
ALTER TABLE "subjects"
ADD COLUMN IF NOT EXISTS "instructor_id" integer REFERENCES "instructors"("id") ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_subjects_instructor_id" ON "subjects"("instructor_id");

-- Add comment
COMMENT ON COLUMN "subjects"."instructor_id" IS 'Optional: Reference to the instructor assigned to teach this subject. instructor_name and instructor_email are kept for backward compatibility but instructor_id is the preferred way to link.';



