-- Add enrollment_date column to applications table
-- This field can be used to specify the intended enrollment date when accepting an application

ALTER TABLE "applications"
ADD COLUMN IF NOT EXISTS "enrollment_date" date;

COMMENT ON COLUMN "applications"."enrollment_date" IS 'Intended enrollment date when the application is accepted. Used when creating student records from applications.';

