-- Add milestone_trigger column to finance_configuration table
-- This column tracks which financial milestone this fee contributes to when paid

ALTER TABLE "finance_configuration" 
ADD COLUMN IF NOT EXISTS "milestone_trigger" varchar(10) DEFAULT 'PM00';

-- Add index for performance
CREATE INDEX IF NOT EXISTS "idx_finance_config_milestone_trigger" ON "finance_configuration"("milestone_trigger");

-- Add foreign key constraint to financial_milestones (drop first if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'finance_config_milestone_trigger_fk'
    ) THEN
        ALTER TABLE "finance_configuration" 
        DROP CONSTRAINT "finance_config_milestone_trigger_fk";
    END IF;
END $$;

ALTER TABLE "finance_configuration"
ADD CONSTRAINT "finance_config_milestone_trigger_fk"
FOREIGN KEY ("milestone_trigger") 
REFERENCES "financial_milestones"("code") 
ON DELETE SET DEFAULT;

-- Add comment
COMMENT ON COLUMN "finance_configuration"."milestone_trigger" IS 'Financial milestone code that this fee contributes to when paid (PM00, PM10, PM30, PM60, PM90, PM100)';

