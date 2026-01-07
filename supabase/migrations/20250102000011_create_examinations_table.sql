-- Create examinations table
CREATE TABLE IF NOT EXISTS examinations (
  id BIGSERIAL PRIMARY KEY,
  exam_name VARCHAR(255) NOT NULL,
  exam_code VARCHAR(100) UNIQUE NOT NULL,
  class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  semester_id BIGINT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  exam_type VARCHAR(50) NOT NULL, -- midterm, final, quiz, assignment, etc.
  description TEXT,
  
  -- Schedule Information
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER, -- Calculated from start_time and end_time
  
  -- Grading Information
  total_marks DECIMAL(10, 2) NOT NULL DEFAULT 100,
  passing_marks DECIMAL(10, 2),
  weight_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0, -- Percentage contribution to final grade
  
  -- Exam Instructions
  instructions TEXT,
  
  -- Allowed Materials
  allow_calculator BOOLEAN DEFAULT false,
  allow_notes BOOLEAN DEFAULT false,
  allow_textbook BOOLEAN DEFAULT false,
  other_allowed_materials TEXT,
  
  -- College scoping
  college_id BIGINT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  is_university_wide BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by BIGINT REFERENCES users(id),
  updated_by BIGINT REFERENCES users(id)
);

-- Add college_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'examinations' AND column_name = 'college_id'
  ) THEN
    ALTER TABLE examinations ADD COLUMN college_id BIGINT REFERENCES colleges(id) ON DELETE CASCADE;
    ALTER TABLE examinations ADD COLUMN is_university_wide BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Indexes will be created in the next migration after columns are added

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_examinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_examinations_updated_at
  BEFORE UPDATE ON examinations
  FOR EACH ROW
  EXECUTE FUNCTION update_examinations_updated_at();

-- Create trigger to calculate duration_minutes
CREATE OR REPLACE FUNCTION calculate_exam_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_exam_duration_trigger
  BEFORE INSERT OR UPDATE ON examinations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_exam_duration();

