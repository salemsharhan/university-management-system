-- Add grade_configuration column to subjects table
-- This column stores the grade types and their configurations (max, min, pass, fail scores) for each subject
ALTER TABLE "subjects"
ADD COLUMN IF NOT EXISTS "grade_configuration" jsonb DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN "subjects"."grade_configuration" IS 'Array of grade type configurations. Each item contains: grade_type_id, grade_type_code, maximum, minimum, pass_score, fail_score, weight (optional)';




