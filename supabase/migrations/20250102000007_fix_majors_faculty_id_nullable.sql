-- Force make faculty_id nullable in majors table
-- This migration ensures faculty_id can be null even if previous migration didn't work
DO $$ 
BEGIN
    -- Check if column is NOT NULL and alter it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'majors' 
        AND column_name = 'faculty_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "majors" ALTER COLUMN "faculty_id" DROP NOT NULL;
    END IF;
END $$;

-- Verify the change
COMMENT ON COLUMN "majors"."faculty_id" IS 'Optional: Major can exist without a faculty. Use head_of_major_id for the major head (instructor).';



