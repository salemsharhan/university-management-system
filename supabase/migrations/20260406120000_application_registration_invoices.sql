-- Allow invoices and payments for application-phase registration fees (before a student record exists).

ALTER TABLE "invoices" ALTER COLUMN "student_id" DROP NOT NULL;

ALTER TABLE "invoices"
ADD COLUMN IF NOT EXISTS "application_id" bigint REFERENCES "applications"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_invoices_application_id" ON "invoices"("application_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_student_or_application_chk'
  ) THEN
    ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_student_or_application_chk"
    CHECK (student_id IS NOT NULL OR application_id IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN "invoices"."application_id" IS 'Registration/admission fee paid during application; student_id is set when the applicant is enrolled as a student.';

ALTER TABLE "payments" ALTER COLUMN "student_id" DROP NOT NULL;
