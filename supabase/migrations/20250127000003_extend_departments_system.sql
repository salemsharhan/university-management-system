-- Extend Departments System per SRS
-- Add contact info, capabilities, academic config, and audit fields

-- Extend status enum to include archived (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'archived' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status')) THEN
        ALTER TYPE "status" ADD VALUE 'archived';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL; -- Value already exists
END $$;

-- Add contact information
ALTER TABLE "departments"
ADD COLUMN IF NOT EXISTS "email" varchar(320),
ADD COLUMN IF NOT EXISTS "phone" varchar(50),
ADD COLUMN IF NOT EXISTS "building" varchar(50),
ADD COLUMN IF NOT EXISTS "floor" varchar(20),
ADD COLUMN IF NOT EXISTS "room" varchar(20);

-- Add established date and HoD appointment date
ALTER TABLE "departments"
ADD COLUMN IF NOT EXISTS "established_date" date,
ADD COLUMN IF NOT EXISTS "hod_appointed_date" date;

-- Add department capabilities
ALTER TABLE "departments"
ADD COLUMN IF NOT EXISTS "can_offer_courses" boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS "can_have_majors" boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS "can_enroll_students" boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS "is_research" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "has_graduate_programs" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "has_external_partnerships" boolean DEFAULT false NOT NULL;

-- Add academic configuration
ALTER TABLE "departments"
ADD COLUMN IF NOT EXISTS "min_credit_hours" integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS "max_credit_hours" integer DEFAULT 21,
ADD COLUMN IF NOT EXISTS "min_gpa_required" numeric(3, 2) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS "max_students" integer DEFAULT 500,
ADD COLUMN IF NOT EXISTS "graduation_credits" integer DEFAULT 120,
ADD COLUMN IF NOT EXISTS "expected_duration" integer DEFAULT 8;

-- Add audit fields
ALTER TABLE "departments"
ADD COLUMN IF NOT EXISTS "created_by" varchar(320),
ADD COLUMN IF NOT EXISTS "updated_by" varchar(320);
