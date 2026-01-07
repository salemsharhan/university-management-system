-- University-level settings and scoped entities (university-wide vs college-specific)

-- Create university_settings table (similar to college settings but for entire university)
CREATE TABLE IF NOT EXISTS "university_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"academic_settings" jsonb,
	"financial_settings" jsonb,
	"email_settings" jsonb,
	"onboarding_settings" jsonb,
	"system_settings" jsonb,
	"examination_settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add ENUM for semester season
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'semester_season') THEN
        CREATE TYPE "semester_season" AS ENUM('fall', 'spring', 'summer', 'winter');
    END IF;
END $$;

-- Update academic_years to support college_id and university-wide
ALTER TABLE "academic_years" 
ADD COLUMN IF NOT EXISTS "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS "is_university_wide" boolean DEFAULT false NOT NULL;

-- Update semesters to add missing fields
ALTER TABLE "semesters"
ADD COLUMN IF NOT EXISTS "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS "is_university_wide" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "academic_year_number" integer,
ADD COLUMN IF NOT EXISTS "season" "semester_season",
ADD COLUMN IF NOT EXISTS "late_registration_end_date" date,
ADD COLUMN IF NOT EXISTS "add_deadline" date,
ADD COLUMN IF NOT EXISTS "drop_deadline" date,
ADD COLUMN IF NOT EXISTS "withdrawal_deadline" date,
ADD COLUMN IF NOT EXISTS "min_credit_hours" integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS "max_credit_hours" integer DEFAULT 18,
ADD COLUMN IF NOT EXISTS "max_credit_hours_with_permission" integer DEFAULT 21,
ADD COLUMN IF NOT EXISTS "min_gpa_for_max_credits" numeric(3, 2) DEFAULT 3.0;

-- Update faculties to support college_id and university-wide
ALTER TABLE "faculties"
ADD COLUMN IF NOT EXISTS "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS "is_university_wide" boolean DEFAULT false NOT NULL;

-- Update departments to support college_id and university-wide
ALTER TABLE "departments"
ADD COLUMN IF NOT EXISTS "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS "is_university_wide" boolean DEFAULT false NOT NULL;

-- Update majors to add missing fields and support college_id
ALTER TABLE "majors"
ADD COLUMN IF NOT EXISTS "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS "is_university_wide" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "accreditation_date" date,
ADD COLUMN IF NOT EXISTS "accreditation_expiry" date,
ADD COLUMN IF NOT EXISTS "accrediting_body" varchar(255),
ADD COLUMN IF NOT EXISTS "head_of_major" varchar(255),
ADD COLUMN IF NOT EXISTS "head_email" varchar(320),
ADD COLUMN IF NOT EXISTS "head_phone" varchar(50);

-- Create subject_prerequisites table (already exists but ensure it's correct)
-- Create subject_corequisites table (already exists but ensure it's correct)

-- Update subjects to support college_id and university-wide
ALTER TABLE "subjects"
ADD COLUMN IF NOT EXISTS "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS "is_university_wide" boolean DEFAULT false NOT NULL;

-- Update classes to add missing fields
ALTER TABLE "classes"
ADD COLUMN IF NOT EXISTS "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS "is_university_wide" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "room" varchar(100),
ADD COLUMN IF NOT EXISTS "building" varchar(255),
ADD COLUMN IF NOT EXISTS "notes" text;

-- Create class_schedules table (already exists but ensure it has all fields)
-- The table already exists from initial schema, but let's verify it has what we need

-- Update colleges table to add reference to university settings
ALTER TABLE "colleges"
ADD COLUMN IF NOT EXISTS "use_university_settings" boolean DEFAULT false NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_academic_years_college_id" ON "academic_years"("college_id");
CREATE INDEX IF NOT EXISTS "idx_academic_years_university_wide" ON "academic_years"("is_university_wide");
CREATE INDEX IF NOT EXISTS "idx_semesters_college_id" ON "semesters"("college_id");
CREATE INDEX IF NOT EXISTS "idx_semesters_university_wide" ON "semesters"("is_university_wide");
CREATE INDEX IF NOT EXISTS "idx_faculties_college_id" ON "faculties"("college_id");
CREATE INDEX IF NOT EXISTS "idx_faculties_university_wide" ON "faculties"("is_university_wide");
CREATE INDEX IF NOT EXISTS "idx_departments_college_id" ON "departments"("college_id");
CREATE INDEX IF NOT EXISTS "idx_departments_university_wide" ON "departments"("is_university_wide");
CREATE INDEX IF NOT EXISTS "idx_majors_college_id" ON "majors"("college_id");
CREATE INDEX IF NOT EXISTS "idx_majors_university_wide" ON "majors"("is_university_wide");
CREATE INDEX IF NOT EXISTS "idx_subjects_college_id" ON "subjects"("college_id");
CREATE INDEX IF NOT EXISTS "idx_subjects_university_wide" ON "subjects"("is_university_wide");
CREATE INDEX IF NOT EXISTS "idx_classes_college_id" ON "classes"("college_id");
CREATE INDEX IF NOT EXISTS "idx_classes_university_wide" ON "classes"("is_university_wide");

-- Update unique constraints to allow same code for different colleges
-- Remove unique constraints and add composite unique constraints with college_id
ALTER TABLE "academic_years" DROP CONSTRAINT IF EXISTS "academic_years_code_unique";
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_code_college_unique" UNIQUE("code", "college_id", "is_university_wide");

ALTER TABLE "faculties" DROP CONSTRAINT IF EXISTS "faculties_code_unique";
ALTER TABLE "faculties" ADD CONSTRAINT "faculties_code_college_unique" UNIQUE("code", "college_id", "is_university_wide");

ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_code_unique";
ALTER TABLE "departments" ADD CONSTRAINT "departments_code_college_unique" UNIQUE("code", "college_id", "is_university_wide");

ALTER TABLE "majors" DROP CONSTRAINT IF EXISTS "majors_code_unique";
ALTER TABLE "majors" ADD CONSTRAINT "majors_code_college_unique" UNIQUE("code", "college_id", "is_university_wide");

ALTER TABLE "subjects" DROP CONSTRAINT IF EXISTS "subjects_code_unique";
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_code_college_unique" UNIQUE("code", "college_id", "is_university_wide");




