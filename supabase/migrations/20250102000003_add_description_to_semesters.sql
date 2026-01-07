-- Add description columns to semesters table
ALTER TABLE "semesters"
ADD COLUMN IF NOT EXISTS "description" text,
ADD COLUMN IF NOT EXISTS "description_ar" text;



