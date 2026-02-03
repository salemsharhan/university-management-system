-- Subject major-wise: subjects can apply to multiple majors, all majors of a college, or university-wide
-- Replaces semester-wise single-major model

-- 1. Add applies_to_all_majors_of_college
ALTER TABLE "subjects"
ADD COLUMN IF NOT EXISTS "applies_to_all_majors_of_college" boolean DEFAULT false NOT NULL;

-- 2. Create subject_majors junction for multi-major selection
CREATE TABLE IF NOT EXISTS "subject_majors" (
  "id" serial PRIMARY KEY NOT NULL,
  "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  "major_id" integer NOT NULL REFERENCES "majors"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "subject_majors_unique" UNIQUE("subject_id", "major_id")
);

CREATE INDEX IF NOT EXISTS "idx_subject_majors_subject_id" ON "subject_majors"("subject_id");
CREATE INDEX IF NOT EXISTS "idx_subject_majors_major_id" ON "subject_majors"("major_id");

-- 3. Migrate existing data: copy major_id to subject_majors
INSERT INTO "subject_majors" ("subject_id", "major_id")
SELECT id, major_id FROM "subjects" WHERE major_id IS NOT NULL
ON CONFLICT ("subject_id", "major_id") DO NOTHING;

-- 4. Make major_id nullable (subject can use subject_majors or applies_to_all or is_university_wide)
ALTER TABLE "subjects" ALTER COLUMN "major_id" DROP NOT NULL;

-- 5. Make semester_number nullable (placement is in major_sheet_courses, not subject)
ALTER TABLE "subjects" ALTER COLUMN "semester_number" DROP NOT NULL;

COMMENT ON COLUMN "subjects"."applies_to_all_majors_of_college" IS 'When true, subject applies to all majors of its college_id';
COMMENT ON TABLE "subject_majors" IS 'Junction: subjects available to specific majors. Used when scope is not university-wide or all-majors-of-college';

-- University-wide subjects: code must be globally unique
CREATE UNIQUE INDEX IF NOT EXISTS "idx_subjects_code_university_wide" 
ON "subjects"("code") WHERE "is_university_wide" = true;
