-- Add head_of_major_id column to majors table to link to instructors
ALTER TABLE "majors"
ADD COLUMN IF NOT EXISTS "head_of_major_id" integer REFERENCES "instructors"("id") ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "idx_majors_head_of_major_id" ON "majors"("head_of_major_id");

-- Add comment
COMMENT ON COLUMN "majors"."head_of_major_id" IS 'Optional: Reference to the instructor who is the head of this major.';



