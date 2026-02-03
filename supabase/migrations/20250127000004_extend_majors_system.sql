-- Extend majors table with SRS fields: major_status, academic controls, audit
-- Extend major_sheets with status for version lifecycle

-- Add major_status column for full lifecycle (draft, open_for_admission, active, suspended, phasing_out, archived)
ALTER TABLE "majors"
ADD COLUMN IF NOT EXISTS "major_status" varchar(30) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS "max_study_duration_years" integer,
ADD COLUMN IF NOT EXISTS "min_gpa_override" numeric(3, 2),
ADD COLUMN IF NOT EXISTS "enable_substitution_workflow" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "enable_prerequisite_override" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "enforce_graduation_threshold" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "created_by" integer REFERENCES "users"("id"),
ADD COLUMN IF NOT EXISTS "updated_by" integer REFERENCES "users"("id");

-- Add status to major_sheets for version lifecycle (draft, active, superseded)
ALTER TABLE "major_sheets"
ADD COLUMN IF NOT EXISTS "sheet_status" varchar(20) DEFAULT 'draft';

-- Add check constraint for major_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'majors_major_status_check'
  ) THEN
    ALTER TABLE "majors" ADD CONSTRAINT "majors_major_status_check"
    CHECK (major_status IN ('draft', 'open_for_admission', 'active', 'suspended', 'phasing_out', 'archived'));
  END IF;
END $$;

-- Add check constraint for major_sheets sheet_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'major_sheets_sheet_status_check'
  ) THEN
    ALTER TABLE "major_sheets" ADD CONSTRAINT "major_sheets_sheet_status_check"
    CHECK (sheet_status IN ('draft', 'active', 'superseded'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_majors_major_status" ON "majors"("major_status");
CREATE INDEX IF NOT EXISTS "idx_major_sheets_sheet_status" ON "major_sheets"("sheet_status");

COMMENT ON COLUMN "majors"."major_status" IS 'Lifecycle status: draft, open_for_admission, active, suspended, phasing_out, archived';
COMMENT ON COLUMN "majors"."max_study_duration_years" IS 'Maximum years to complete the program';
COMMENT ON COLUMN "majors"."enable_substitution_workflow" IS 'Enable approval workflow for course substitutions';
COMMENT ON COLUMN "majors"."enable_prerequisite_override" IS 'Allow Head of Major to override prerequisites';
COMMENT ON COLUMN "majors"."enforce_graduation_threshold" IS 'Enforce minimum credits for graduation';
COMMENT ON COLUMN "major_sheets"."sheet_status" IS 'Version status: draft, active, superseded';
