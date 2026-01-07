-- Extend instructors table with education and additional details
ALTER TABLE "instructors"
ADD COLUMN IF NOT EXISTS "date_of_birth" date,
ADD COLUMN IF NOT EXISTS "gender" "gender",
ADD COLUMN IF NOT EXISTS "nationality" varchar(100),
ADD COLUMN IF NOT EXISTS "national_id" varchar(50),
ADD COLUMN IF NOT EXISTS "passport_number" varchar(50),
ADD COLUMN IF NOT EXISTS "address" text,
ADD COLUMN IF NOT EXISTS "city" varchar(100),
ADD COLUMN IF NOT EXISTS "country" varchar(100),
ADD COLUMN IF NOT EXISTS "postal_code" varchar(20),
ADD COLUMN IF NOT EXISTS "emergency_contact_name" varchar(255),
ADD COLUMN IF NOT EXISTS "emergency_contact_relation" varchar(50),
ADD COLUMN IF NOT EXISTS "emergency_contact_phone" varchar(50),
ADD COLUMN IF NOT EXISTS "emergency_contact_email" varchar(320),
ADD COLUMN IF NOT EXISTS "academic_year_id" integer REFERENCES "academic_years"("id"),
ADD COLUMN IF NOT EXISTS "education" jsonb,
ADD COLUMN IF NOT EXISTS "work_experience" jsonb,
ADD COLUMN IF NOT EXISTS "publications" jsonb,
ADD COLUMN IF NOT EXISTS "certifications" jsonb,
ADD COLUMN IF NOT EXISTS "languages" jsonb,
ADD COLUMN IF NOT EXISTS "research_interests" text,
ADD COLUMN IF NOT EXISTS "bio" text,
ADD COLUMN IF NOT EXISTS "bio_ar" text;

-- Extend colleges table with new fields
ALTER TABLE "colleges"
ADD COLUMN IF NOT EXISTS "type" varchar(50),
ADD COLUMN IF NOT EXISTS "description_en" text,
ADD COLUMN IF NOT EXISTS "description_ar" text,
ADD COLUMN IF NOT EXISTS "dean_name" varchar(255),
ADD COLUMN IF NOT EXISTS "dean_email" varchar(320),
ADD COLUMN IF NOT EXISTS "dean_phone" varchar(50),
ADD COLUMN IF NOT EXISTS "contact_email" varchar(320),
ADD COLUMN IF NOT EXISTS "contact_phone" varchar(50),
ADD COLUMN IF NOT EXISTS "building" varchar(255),
ADD COLUMN IF NOT EXISTS "floor" varchar(50),
ADD COLUMN IF NOT EXISTS "room_number" varchar(50),
ADD COLUMN IF NOT EXISTS "location_description" text,
ADD COLUMN IF NOT EXISTS "vision" text,
ADD COLUMN IF NOT EXISTS "mission" text,
ADD COLUMN IF NOT EXISTS "established_date" date,
ADD COLUMN IF NOT EXISTS "accreditation_info" text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_instructors_academic_year_id" ON "instructors"("academic_year_id");
CREATE INDEX IF NOT EXISTS "idx_instructors_college_id" ON "instructors"("college_id");



