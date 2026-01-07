-- Fix examinations table type column issue
-- The table has both 'type' (enum, NOT NULL) and 'exam_type' (varchar) columns
-- We need to either populate 'type' from 'exam_type' or make 'type' nullable

-- First, let's check if we need to populate 'type' from 'exam_type' for existing records
DO $$
BEGIN
  -- Update existing records where type is null but exam_type exists
  UPDATE examinations
  SET "type" = CASE
    WHEN LOWER(exam_type) LIKE '%midterm%' THEN 'midterm'::examination_type
    WHEN LOWER(exam_type) LIKE '%final%' THEN 'final'::examination_type
    WHEN LOWER(exam_type) LIKE '%quiz%' THEN 'quiz'::examination_type
    WHEN LOWER(exam_type) LIKE '%assignment%' THEN 'assignment'::examination_type
    WHEN LOWER(exam_type) LIKE '%project%' THEN 'project'::examination_type
    ELSE 'quiz'::examination_type -- Default fallback
  END
  WHERE "type" IS NULL AND exam_type IS NOT NULL;
  
  -- Set default for any remaining nulls
  UPDATE examinations
  SET "type" = 'quiz'::examination_type
  WHERE "type" IS NULL;
END $$;

-- Make 'type' column nullable since we're using 'exam_type' now
-- But set a default value first
ALTER TABLE examinations 
ALTER COLUMN "type" SET DEFAULT 'quiz'::examination_type;

-- Now make it nullable
ALTER TABLE examinations 
ALTER COLUMN "type" DROP NOT NULL;

-- Add a trigger to auto-populate 'type' from 'exam_type' on insert/update
CREATE OR REPLACE FUNCTION sync_examination_type()
RETURNS TRIGGER AS $$
BEGIN
  -- If exam_type is provided but type is null, populate type from exam_type
  IF NEW.exam_type IS NOT NULL AND NEW."type" IS NULL THEN
    NEW."type" := CASE
      WHEN LOWER(NEW.exam_type) LIKE '%midterm%' THEN 'midterm'::examination_type
      WHEN LOWER(NEW.exam_type) LIKE '%final%' THEN 'final'::examination_type
      WHEN LOWER(NEW.exam_type) LIKE '%quiz%' THEN 'quiz'::examination_type
      WHEN LOWER(NEW.exam_type) LIKE '%assignment%' THEN 'assignment'::examination_type
      WHEN LOWER(NEW.exam_type) LIKE '%project%' THEN 'project'::examination_type
      ELSE 'quiz'::examination_type
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_examination_type_trigger ON examinations;
CREATE TRIGGER sync_examination_type_trigger
  BEFORE INSERT OR UPDATE ON examinations
  FOR EACH ROW
  EXECUTE FUNCTION sync_examination_type();

