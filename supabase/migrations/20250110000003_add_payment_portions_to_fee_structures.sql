-- Migration: Add payment portions to fee structures
-- This allows fee structures to define payment installments with percentages and deadlines

-- Add payment_portions column to finance_configuration
-- This will store an array of payment portion configurations
ALTER TABLE "finance_configuration"
ADD COLUMN IF NOT EXISTS "payment_portions" jsonb DEFAULT NULL;

-- Add index for payment_portions queries
CREATE INDEX IF NOT EXISTS "idx_finance_config_payment_portions" 
ON "finance_configuration" USING GIN ("payment_portions");

-- Add parent_invoice_id to invoices table to link related invoices from same fee structure
ALTER TABLE "invoices"
ADD COLUMN IF NOT EXISTS "parent_invoice_id" integer REFERENCES "invoices"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "fee_structure_id" integer REFERENCES "finance_configuration"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "portion_number" integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "portion_percentage" numeric(5, 2) DEFAULT NULL;

-- Add indexes for invoice relationships
CREATE INDEX IF NOT EXISTS "idx_invoices_parent_invoice_id" ON "invoices"("parent_invoice_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_fee_structure_id" ON "invoices"("fee_structure_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_portion_number" ON "invoices"("portion_number");

-- Add comment explaining payment_portions structure
COMMENT ON COLUMN "finance_configuration"."payment_portions" IS 
'JSON array of payment portions. Each portion has:
{
  "portion_number": 1,
  "percentage": 10.00,
  "deadline_type": "days_from_invoice" | "days_from_previous" | "custom_date",
  "days": 10,  // for days_from_invoice or days_from_previous
  "custom_date": "2025-01-15"  // for custom_date
}';

COMMENT ON COLUMN "invoices"."parent_invoice_id" IS 
'Links child invoices to parent invoice when fee structure has payment portions';

COMMENT ON COLUMN "invoices"."fee_structure_id" IS 
'References the fee structure used to create this invoice';

COMMENT ON COLUMN "invoices"."portion_number" IS 
'Portion number (1, 2, 3...) when invoice is part of a payment plan';

COMMENT ON COLUMN "invoices"."portion_percentage" IS 
'Percentage of total amount for this portion';

