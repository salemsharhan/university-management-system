-- Add application_number column to applications table
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS application_number VARCHAR(50) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_applications_application_number ON applications(application_number);
CREATE INDEX IF NOT EXISTS idx_applications_date_of_birth ON applications(date_of_birth);

-- Function to generate application number
CREATE OR REPLACE FUNCTION generate_application_number(college_code VARCHAR)
RETURNS VARCHAR(50) AS $$
DECLARE
    prefix VARCHAR(10);
    year_str VARCHAR(4) := TO_CHAR(CURRENT_DATE, 'YYYY');
    sequence_num INTEGER;
    app_num VARCHAR(50);
BEGIN
    -- Use college code or default prefix
    prefix := COALESCE(UPPER(SUBSTRING(college_code FROM 1 FOR 3)), 'APP');
    
    -- Get the next sequence number for this year and college
    SELECT COALESCE(MAX(CAST(SUBSTRING(application_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM applications
    WHERE application_number LIKE prefix || year_str || '%'
      AND college_id = (SELECT id FROM colleges WHERE code = college_code LIMIT 1);
    
    -- Format: PREFIX-YYYY-000001
    app_num := prefix || '-' || year_str || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    RETURN app_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate application number on insert
CREATE OR REPLACE FUNCTION set_application_number()
RETURNS TRIGGER AS $$
DECLARE
    college_code_val VARCHAR(50);
BEGIN
    -- Only set if not already provided
    IF NEW.application_number IS NULL OR NEW.application_number = '' THEN
        -- Get college code
        SELECT code INTO college_code_val
        FROM colleges
        WHERE id = NEW.college_id;
        
        -- Generate application number
        NEW.application_number := generate_application_number(college_code_val);
        
        -- Ensure uniqueness (in case of collision, add retry logic)
        WHILE EXISTS (SELECT 1 FROM applications WHERE application_number = NEW.application_number) LOOP
            NEW.application_number := generate_application_number(college_code_val);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_application_number ON applications;
CREATE TRIGGER trigger_set_application_number
    BEFORE INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION set_application_number();




