-- Extend Academic Years System
-- Add control flags and update status enum to support full lifecycle

-- Update academic_year_status enum to include all lifecycle states
DO $$ BEGIN
    -- Add new status values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'draft' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'academic_year_status')) THEN
        ALTER TYPE "academic_year_status" ADD VALUE 'draft';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scheduled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'academic_year_status')) THEN
        ALTER TYPE "academic_year_status" ADD VALUE 'scheduled';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_progress' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'academic_year_status')) THEN
        ALTER TYPE "academic_year_status" ADD VALUE 'in_progress';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'closing' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'academic_year_status')) THEN
        ALTER TYPE "academic_year_status" ADD VALUE 'closing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'closed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'academic_year_status')) THEN
        ALTER TYPE "academic_year_status" ADD VALUE 'closed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'archived' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'academic_year_status')) THEN
        ALTER TYPE "academic_year_status" ADD VALUE 'archived';
    END IF;
END $$;

-- Add system control flags to academic_years table
ALTER TABLE "academic_years"
ADD COLUMN IF NOT EXISTS "registration_open" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "grade_entry_allowed" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "attendance_editing_allowed" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "financial_posting_allowed" boolean DEFAULT false NOT NULL;

-- Add audit fields
ALTER TABLE "academic_years"
ADD COLUMN IF NOT EXISTS "created_by" varchar(320),
ADD COLUMN IF NOT EXISTS "last_status_change" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "last_status_change_by" varchar(320),
ADD COLUMN IF NOT EXISTS "last_status_change_reason" text;

-- Note: Cannot set default to 'draft' in same transaction as enum addition
-- The default will be handled in application code (CreateAcademicYear.jsx sets status: 'draft')
-- If you need to set it at DB level, create a separate migration after this one

-- Add comments
COMMENT ON COLUMN "academic_years"."registration_open" IS 'Master switch: When true, students can register for courses within this academic year';
COMMENT ON COLUMN "academic_years"."grade_entry_allowed" IS 'Master switch: When true, instructors can submit and edit grades for courses in this academic year';
COMMENT ON COLUMN "academic_years"."attendance_editing_allowed" IS 'Master switch: When true, administrators and instructors can modify attendance records';
COMMENT ON COLUMN "academic_years"."financial_posting_allowed" IS 'Master switch: When true, financial transactions (e.g., fee payments) can be posted for this academic year';
COMMENT ON COLUMN "academic_years"."created_by" IS 'Email of the user who created this academic year';
COMMENT ON COLUMN "academic_years"."last_status_change" IS 'Timestamp of the last status transition';
COMMENT ON COLUMN "academic_years"."last_status_change_by" IS 'Email of the user who performed the last status change';
COMMENT ON COLUMN "academic_years"."last_status_change_reason" IS 'Reason or description for the last status change';
