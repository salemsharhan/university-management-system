-- Create fee_types table for managing custom fee types
CREATE TABLE IF NOT EXISTS "fee_types" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(50) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255),
    "description" text,
    "category" varchar(50) DEFAULT 'general', -- 'admission', 'tuition', 'service', 'penalty', 'general'
    "is_semester_based" boolean DEFAULT true NOT NULL, -- Whether this fee type is typically semester-based
    "requires_semester" boolean DEFAULT true NOT NULL, -- Whether semester is required when creating invoice
    "is_active" boolean DEFAULT true NOT NULL,
    "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
    "is_university_wide" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "fee_types_code_unique" UNIQUE("code")
);

CREATE INDEX IF NOT EXISTS "idx_fee_types_college_id" ON "fee_types"("college_id");
CREATE INDEX IF NOT EXISTS "idx_fee_types_category" ON "fee_types"("category");
CREATE INDEX IF NOT EXISTS "idx_fee_types_is_active" ON "fee_types"("is_active");

-- Insert default fee types
INSERT INTO "fee_types" ("code", "name_en", "name_ar", "category", "is_semester_based", "requires_semester", "is_university_wide", "sort_order")
VALUES
    ('admission_fee', 'Admission Fee', 'رسوم القبول', 'admission', false, false, true, 1),
    ('application_fee', 'Application Fee', 'رسوم التقديم', 'admission', false, false, true, 2),
    ('registration_fee', 'Registration Fee', 'رسوم التسجيل', 'admission', false, false, true, 3),
    ('course_fee', 'Course Fee', 'رسوم المقرر', 'tuition', true, true, true, 10),
    ('subject_fee', 'Subject Fee', 'رسوم المادة', 'tuition', true, true, true, 11),
    ('tuition_fee', 'Tuition Fee', 'الرسوم الدراسية', 'tuition', true, true, true, 12),
    ('onboarding_fee', 'Onboarding Fee', 'رسوم التعريف', 'service', false, false, true, 20),
    ('lab_fee', 'Laboratory Fee', 'رسوم المختبر', 'service', true, true, true, 21),
    ('library_fee', 'Library Fee', 'رسوم المكتبة', 'service', true, true, true, 22),
    ('sports_fee', 'Sports Fee', 'رسوم الرياضة', 'service', true, true, true, 23),
    ('late_payment_penalty', 'Late Payment Penalty', 'غرامة التأخير', 'penalty', false, false, true, 30),
    ('penalty', 'Penalty', 'غرامة', 'penalty', false, false, true, 31),
    ('miscellaneous', 'Miscellaneous', 'متنوع', 'general', false, false, true, 40),
    ('other', 'Other', 'أخرى', 'general', false, false, true, 50)
ON CONFLICT ("code") DO NOTHING;

-- Update finance_configuration to use applies_to_semester array properly
-- Remove any reference to semester_id if it exists (it shouldn't based on schema, but just in case)
-- The schema already uses applies_to_semester integer[] which is correct

-- Add comment
COMMENT ON TABLE "fee_types" IS 'Manageable fee types that can be customized per college or university-wide';
COMMENT ON COLUMN "fee_types"."is_semester_based" IS 'Whether this fee type typically applies to semesters';
COMMENT ON COLUMN "fee_types"."requires_semester" IS 'Whether semester selection is required when creating invoices with this fee type';
