-- Add grade_types column to university_settings table
ALTER TABLE "university_settings"
ADD COLUMN IF NOT EXISTS "grade_types" jsonb DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN "university_settings"."grade_types" IS 'Array of grade types that can be used when configuring subjects. Each item contains: id, code, name_en, name_ar';




