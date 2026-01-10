-- Migration: Semester-Based Finance System
-- This migration makes fees semester-specific and tracks financial milestones per semester

-- 1. Add semester_id to finance_configuration (replacing applies_to_semester array)
ALTER TABLE finance_configuration
ADD COLUMN IF NOT EXISTS semester_id integer REFERENCES semesters(id) ON DELETE CASCADE;

-- 2. Remove milestone_trigger column (no longer needed - milestones calculated per semester)
ALTER TABLE finance_configuration
DROP COLUMN IF EXISTS milestone_trigger;

-- 3. Remove applies_to_semester array (replaced by single semester_id)
ALTER TABLE finance_configuration
DROP COLUMN IF EXISTS applies_to_semester;

-- 4. Create student_semester_financial_status table to track per-semester milestones
CREATE TABLE IF NOT EXISTS student_semester_financial_status (
    id serial PRIMARY KEY NOT NULL,
    student_id integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    semester_id integer NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    financial_milestone_code varchar(10) DEFAULT 'PM00' NOT NULL,
    total_due numeric(10, 2) DEFAULT 0 NOT NULL,
    total_paid numeric(10, 2) DEFAULT 0 NOT NULL,
    financial_hold_reason_code varchar(10) REFERENCES financial_hold_reasons(code),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(student_id, semester_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_semester_financial_status_student_id ON student_semester_financial_status(student_id);
CREATE INDEX IF NOT EXISTS idx_student_semester_financial_status_semester_id ON student_semester_financial_status(semester_id);
CREATE INDEX IF NOT EXISTS idx_student_semester_financial_status_milestone ON student_semester_financial_status(financial_milestone_code);
CREATE INDEX IF NOT EXISTS idx_finance_config_semester_id ON finance_configuration(semester_id);

-- 6. Add comment for documentation
COMMENT ON TABLE student_semester_financial_status IS 'Tracks financial milestones per student per semester (PM10, PM30, PM60, PM90, PM100)';
COMMENT ON COLUMN finance_configuration.semester_id IS 'Semester this fee applies to. Fees are now semester-specific.';

-- 7. Update existing finance_configuration records to set a default semester_id if needed
-- (This is a safety measure - you may want to manually update existing records)
-- UPDATE finance_configuration SET semester_id = (SELECT id FROM semesters ORDER BY start_date DESC LIMIT 1) WHERE semester_id IS NULL;



