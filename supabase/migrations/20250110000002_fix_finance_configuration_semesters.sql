-- Fix finance_configuration to support multiple semesters
-- This migration:
-- 1. Adds applies_to_semester array column if it doesn't exist
-- 2. Migrates data from semester_id to applies_to_semester if semester_id exists
-- 3. Optionally removes semester_id column (keeping it for backward compatibility for now)

-- Add applies_to_semester column if it doesn't exist
ALTER TABLE "finance_configuration"
ADD COLUMN IF NOT EXISTS "applies_to_semester" integer[];

-- Migrate data from semester_id to applies_to_semester if semester_id exists
-- This handles the case where a previous migration changed from array to single semester_id
DO $$
BEGIN
    -- Check if semester_id column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'finance_configuration' 
        AND column_name = 'semester_id'
    ) THEN
        -- Migrate existing semester_id values to applies_to_semester array
        UPDATE "finance_configuration"
        SET "applies_to_semester" = ARRAY["semester_id"]
        WHERE "semester_id" IS NOT NULL 
        AND ("applies_to_semester" IS NULL OR array_length("applies_to_semester", 1) IS NULL);
        
        -- Note: We keep semester_id column for now to avoid breaking existing code
        -- It can be removed in a future migration once all code is updated
    END IF;
END $$;

-- Create index for applies_to_semester if it doesn't exist
CREATE INDEX IF NOT EXISTS "idx_finance_config_applies_to_semester" 
ON "finance_configuration" USING GIN ("applies_to_semester");

-- Add comment
COMMENT ON COLUMN "finance_configuration"."applies_to_semester" IS 'Array of semester IDs this fee structure applies to. Supports multiple semesters.';

