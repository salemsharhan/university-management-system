-- Add payment tracking columns to applications table
-- This allows us to track registration fee payments made during the application process
-- and create invoices retroactively when the student is enrolled

ALTER TABLE "applications"
ADD COLUMN IF NOT EXISTS "registration_fee_amount" numeric(10, 2),
ADD COLUMN IF NOT EXISTS "registration_fee_paid_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "registration_fee_payment_method" payment_method;

COMMENT ON COLUMN "applications"."registration_fee_amount" IS 'Amount of registration fee paid during application process. Used to create invoice retroactively when student is enrolled.';
COMMENT ON COLUMN "applications"."registration_fee_paid_at" IS 'Date and time when registration fee was paid.';
COMMENT ON COLUMN "applications"."registration_fee_payment_method" IS 'Payment method used for registration fee payment.';

