-- Create applications table for student admissions
CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  
  -- Personal Information
  first_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  last_name VARCHAR(255) NOT NULL,
  first_name_ar VARCHAR(255),
  middle_name_ar VARCHAR(255),
  last_name_ar VARCHAR(255),
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(50),
  date_of_birth DATE NOT NULL,
  gender VARCHAR(50),
  nationality VARCHAR(100),
  religion VARCHAR(100),
  place_of_birth VARCHAR(255),
  
  -- Contact Information
  street_address TEXT,
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  
  -- Emergency Contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_relationship VARCHAR(100),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_email VARCHAR(320),
  
  -- Academic Information
  major_id BIGINT REFERENCES majors(id),
  semester_id BIGINT REFERENCES semesters(id),
  high_school_name VARCHAR(255),
  high_school_country VARCHAR(100),
  graduation_year INTEGER,
  gpa DECIMAL(3, 2),
  certificate_type VARCHAR(100),
  
  -- Test Scores
  toefl_score INTEGER,
  ielts_score DECIMAL(3, 1),
  sat_score INTEGER,
  gmat_score INTEGER,
  gre_score INTEGER,
  
  -- Transfer Information
  is_transfer_student BOOLEAN DEFAULT false,
  previous_university VARCHAR(255),
  previous_degree VARCHAR(100),
  transfer_credits INTEGER,
  
  -- Additional Information
  personal_statement TEXT,
  scholarship_request BOOLEAN DEFAULT false,
  scholarship_percentage DECIMAL(5, 2),
  
  -- Application Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, waitlisted
  reviewed_by BIGINT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- College scoping
  college_id BIGINT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by BIGINT REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_college_id ON applications(college_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_major_id ON applications(major_id);
CREATE INDEX IF NOT EXISTS idx_applications_semester_id ON applications(semester_id);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_updated_at();



