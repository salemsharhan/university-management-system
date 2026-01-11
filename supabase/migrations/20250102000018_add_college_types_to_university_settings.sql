-- Add college_types column to university_settings table
-- This allows storing an array of college types (e.g., Medicine, Science, Engineering)
-- that can be selected when creating colleges

ALTER TABLE "university_settings"
ADD COLUMN IF NOT EXISTS "college_types" jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN "university_settings"."college_types" IS 'Array of college type objects with structure: [{"id": number, "code": string, "name_en": string, "name_ar": string}]';




