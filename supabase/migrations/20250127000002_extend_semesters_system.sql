-- Extend Semesters System
-- Add control flags and update status enum to support full lifecycle

-- Update semester_status enum to include all lifecycle states
DO $$ 
DECLARE
    type_oid oid;
BEGIN
    -- Check if the enum type exists
    SELECT oid INTO type_oid FROM pg_type WHERE typname = 'semester_status';
    
    -- Only proceed if the type exists
    IF type_oid IS NOT NULL THEN
        -- Add new status values if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'draft' AND enumtypid = type_oid) THEN
            ALTER TYPE "semester_status" ADD VALUE 'draft';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scheduled' AND enumtypid = type_oid) THEN
            ALTER TYPE "semester_status" ADD VALUE 'scheduled';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'registration_closed' AND enumtypid = type_oid) THEN
            ALTER TYPE "semester_status" ADD VALUE 'registration_closed';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_progress' AND enumtypid = type_oid) THEN
            ALTER TYPE "semester_status" ADD VALUE 'in_progress';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ending' AND enumtypid = type_oid) THEN
            ALTER TYPE "semester_status" ADD VALUE 'ending';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'closed' AND enumtypid = type_oid) THEN
            ALTER TYPE "semester_status" ADD VALUE 'closed';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'archived' AND enumtypid = type_oid) THEN
            ALTER TYPE "semester_status" ADD VALUE 'archived';
        END IF;
    ELSE
        -- If type doesn't exist, create it with all values
        CREATE TYPE "semester_status" AS ENUM(
            'active', 
            'planned', 
            'completed', 
            'registration_open',
            'draft',
            'scheduled',
            'registration_closed',
            'in_progress',
            'ending',
            'closed',
            'archived'
        );
    END IF;
END $$;

-- Add master control flags to semesters table
ALTER TABLE "semesters"
ADD COLUMN IF NOT EXISTS "course_registration_allowed" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "add_drop_allowed" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "withdrawal_allowed" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "grade_entry_allowed" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "attendance_editing_allowed" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "late_registration_allowed" boolean DEFAULT false NOT NULL;

-- Add audit fields
ALTER TABLE "semesters"
ADD COLUMN IF NOT EXISTS "created_by" varchar(320),
ADD COLUMN IF NOT EXISTS "last_status_change" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "last_status_change_by" varchar(320),
ADD COLUMN IF NOT EXISTS "last_status_change_reason" text;

-- Add comments
COMMENT ON COLUMN "semesters"."course_registration_allowed" IS 'Master switch: When true, students can register for courses in this semester';
COMMENT ON COLUMN "semesters"."add_drop_allowed" IS 'Master switch: When true, students can add or drop courses';
COMMENT ON COLUMN "semesters"."withdrawal_allowed" IS 'Master switch: When true, students can withdraw from courses';
COMMENT ON COLUMN "semesters"."grade_entry_allowed" IS 'Master switch: When true, instructors can enter and edit grades';
COMMENT ON COLUMN "semesters"."attendance_editing_allowed" IS 'Master switch: When true, attendance records can be modified';
COMMENT ON COLUMN "semesters"."late_registration_allowed" IS 'Master switch: When true, late course registration is allowed';
COMMENT ON COLUMN "semesters"."created_by" IS 'Email of the user who created this semester';
COMMENT ON COLUMN "semesters"."last_status_change" IS 'Timestamp of the last status transition';
COMMENT ON COLUMN "semesters"."last_status_change_by" IS 'Email of the user who performed the last status change';
COMMENT ON COLUMN "semesters"."last_status_change_reason" IS 'Reason or description for the last status change';
