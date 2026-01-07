-- Add additional fields to students table for comprehensive student information

-- Add ENUM types if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'marital_status') THEN
        CREATE TYPE "marital_status" AS ENUM('single', 'married', 'divorced', 'widowed');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blood_type') THEN
        CREATE TYPE "blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'study_type') THEN
        CREATE TYPE "study_type" AS ENUM('full_time', 'part_time');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'study_load') THEN
        CREATE TYPE "study_load" AS ENUM('light', 'normal', 'heavy');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'study_approach') THEN
        CREATE TYPE "study_approach" AS ENUM('on_campus', 'online', 'hybrid');
    END IF;
END $$;

-- Add new columns to students table
ALTER TABLE "students" 
ADD COLUMN IF NOT EXISTS "first_name" varchar(255),
ADD COLUMN IF NOT EXISTS "middle_name" varchar(255),
ADD COLUMN IF NOT EXISTS "last_name" varchar(255),
ADD COLUMN IF NOT EXISTS "first_name_ar" varchar(255),
ADD COLUMN IF NOT EXISTS "middle_name_ar" varchar(255),
ADD COLUMN IF NOT EXISTS "last_name_ar" varchar(255),
ADD COLUMN IF NOT EXISTS "nationality" varchar(100),
ADD COLUMN IF NOT EXISTS "religion" varchar(100),
ADD COLUMN IF NOT EXISTS "marital_status" "marital_status",
ADD COLUMN IF NOT EXISTS "blood_type" "blood_type",
ADD COLUMN IF NOT EXISTS "is_international" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "mobile_phone" varchar(50),
ADD COLUMN IF NOT EXISTS "city" varchar(100),
ADD COLUMN IF NOT EXISTS "state" varchar(100),
ADD COLUMN IF NOT EXISTS "country" varchar(100),
ADD COLUMN IF NOT EXISTS "postal_code" varchar(20),
ADD COLUMN IF NOT EXISTS "study_type" "study_type",
ADD COLUMN IF NOT EXISTS "study_load" "study_load",
ADD COLUMN IF NOT EXISTS "study_approach" "study_approach",
ADD COLUMN IF NOT EXISTS "credit_hours" integer,
ADD COLUMN IF NOT EXISTS "emergency_contact_name" varchar(255),
ADD COLUMN IF NOT EXISTS "emergency_contact_relation" varchar(100),
ADD COLUMN IF NOT EXISTS "emergency_contact_email" varchar(320),
ADD COLUMN IF NOT EXISTS "passport_number" varchar(50),
ADD COLUMN IF NOT EXISTS "passport_expiry" date,
ADD COLUMN IF NOT EXISTS "visa_number" varchar(50),
ADD COLUMN IF NOT EXISTS "visa_expiry" date,
ADD COLUMN IF NOT EXISTS "residence_permit_number" varchar(50),
ADD COLUMN IF NOT EXISTS "residence_permit_expiry" date,
ADD COLUMN IF NOT EXISTS "high_school_name" varchar(255),
ADD COLUMN IF NOT EXISTS "high_school_country" varchar(100),
ADD COLUMN IF NOT EXISTS "graduation_year" integer,
ADD COLUMN IF NOT EXISTS "high_school_gpa" numeric(5, 2),
ADD COLUMN IF NOT EXISTS "has_scholarship" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "scholarship_type" varchar(100),
ADD COLUMN IF NOT EXISTS "scholarship_percentage" numeric(5, 2),
ADD COLUMN IF NOT EXISTS "medical_conditions" text,
ADD COLUMN IF NOT EXISTS "allergies" text,
ADD COLUMN IF NOT EXISTS "medications" text,
ADD COLUMN IF NOT EXISTS "documents" jsonb,
ADD COLUMN IF NOT EXISTS "notes" text;

-- Update name_en and name_ar to be computed from first/middle/last name if they're null
-- But keep them for backward compatibility
-- We'll handle the name construction in the application layer

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_students_email" ON "students"("email");
CREATE INDEX IF NOT EXISTS "idx_students_student_id" ON "students"("student_id");
CREATE INDEX IF NOT EXISTS "idx_students_major_id" ON "students"("major_id");
CREATE INDEX IF NOT EXISTS "idx_students_college_id" ON "students"("college_id");
CREATE INDEX IF NOT EXISTS "idx_students_status" ON "students"("status");

