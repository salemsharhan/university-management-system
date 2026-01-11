-- Optimize application number generation trigger to prevent timeouts
-- The original trigger had a potential infinite loop and inefficient queries

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trigger_set_application_number ON applications;
DROP FUNCTION IF EXISTS set_application_number();
DROP FUNCTION IF EXISTS generate_application_number(VARCHAR);

-- Optimized function to generate application number
-- Uses college_id directly instead of college_code lookup, and limits query scope
CREATE OR REPLACE FUNCTION generate_application_number(college_id_param BIGINT)
RETURNS VARCHAR(50) AS $$
DECLARE
    prefix VARCHAR(10);
    year_str VARCHAR(4) := TO_CHAR(CURRENT_DATE, 'YYYY');
    sequence_num INTEGER;
    app_num VARCHAR(50);
BEGIN
    -- Get college code (if available)
    SELECT COALESCE(UPPER(SUBSTRING(code FROM 1 FOR 3)), 'APP')
    INTO prefix
    FROM colleges
    WHERE id = college_id_param
    LIMIT 1;
    
    -- Default prefix if college not found
    prefix := COALESCE(prefix, 'APP');
    
    -- Get the next sequence number for this year and college (more efficient query)
    -- Only query applications with the same prefix and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(application_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM applications
    WHERE college_id = college_id_param
      AND application_number LIKE prefix || '-' || year_str || '-%'
    LIMIT 10000; -- Safety limit to prevent scanning too many rows
    
    -- Format: PREFIX-YYYY-000001
    app_num := prefix || '-' || year_str || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    RETURN app_num;
END;
$$ LANGUAGE plpgsql;

-- Optimized trigger function (removed infinite loop, added retry limit)
CREATE OR REPLACE FUNCTION set_application_number()
RETURNS TRIGGER AS $$
DECLARE
    app_num VARCHAR(50);
    retry_count INTEGER := 0;
    max_retries INTEGER := 10;
BEGIN
    -- Only set if not already provided
    IF NEW.application_number IS NULL OR NEW.application_number = '' THEN
        -- Generate application number
        app_num := generate_application_number(NEW.college_id);
        
        -- Ensure uniqueness with retry limit (prevents infinite loop)
        WHILE EXISTS (SELECT 1 FROM applications WHERE application_number = app_num) 
          AND retry_count < max_retries 
        LOOP
            app_num := generate_application_number(NEW.college_id);
            retry_count := retry_count + 1;
        END LOOP;
        
        -- If still not unique after retries, append a random suffix
        IF EXISTS (SELECT 1 FROM applications WHERE application_number = app_num) THEN
            app_num := app_num || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        END IF;
        
        NEW.application_number := app_num;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_set_application_number
    BEFORE INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION set_application_number();

-- Add index on (college_id, application_number) for faster lookups
CREATE INDEX IF NOT EXISTS idx_applications_college_app_number 
ON applications(college_id, application_number) 
WHERE application_number IS NOT NULL;

