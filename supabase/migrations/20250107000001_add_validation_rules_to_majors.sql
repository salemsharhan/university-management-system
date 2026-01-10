-- Add validation_rules column to majors table
-- This stores admission requirements/validation rules as JSONB

ALTER TABLE "majors"
ADD COLUMN IF NOT EXISTS "validation_rules" jsonb DEFAULT '{}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN "majors"."validation_rules" IS 'Admission validation rules including minimum scores for TOEFL, IELTS, GPA, graduation year, etc. Structure: {"toefl_min": 80, "ielts_min": 6.5, "gpa_min": 3.0, "graduation_year_min": 2020, "certificate_types_allowed": ["IB", "A-Levels"], "requires_interview": false, "requires_entrance_exam": false}';

-- Create index for validation rules queries
CREATE INDEX IF NOT EXISTS "idx_majors_validation_rules" ON "majors" USING gin("validation_rules");



