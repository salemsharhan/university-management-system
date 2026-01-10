-- Fix invoice number generation to prevent duplicates
-- The issue: The function was extracting all trailing digits instead of just the sequence portion
-- Also add proper locking to prevent race conditions

-- Drop existing function to recreate
DROP FUNCTION IF EXISTS generate_invoice_number(integer);

CREATE OR REPLACE FUNCTION generate_invoice_number(college_id_param integer)
RETURNS varchar(100) AS $$
DECLARE
    prefix varchar(10) := 'INV';
    year_str varchar(4) := TO_CHAR(CURRENT_DATE, 'YYYY');
    sequence_num integer;
    invoice_num varchar(100);
    max_attempts integer := 10;
    attempt integer := 0;
    lock_id bigint;
BEGIN
    -- Use advisory lock based on college_id to prevent concurrent generation for same college
    lock_id := college_id_param;
    
    -- Acquire advisory lock for this college (blocks until available)
    PERFORM pg_advisory_xact_lock(lock_id);
    
    -- Extract only the sequence portion (last 6 digits after prefix + year)
    -- Format: INV + YYYY + 6-digit-sequence (e.g., INV2026000001)
    -- The invoice_number format is: INV + YYYY + 6-digit-sequence = 13 characters total
    -- Use RIGHT() to extract last 6 characters, then cast to integer
    SELECT COALESCE(MAX(
        CAST(RIGHT(invoice_number, 6) AS integer)
    ), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE college_id = college_id_param
    AND invoice_number LIKE (prefix || year_str || '%')
    AND LENGTH(invoice_number) = LENGTH(prefix) + LENGTH(year_str) + 6; -- Ensure correct format
    
    -- Generate new invoice number with proper padding
    invoice_num := prefix || year_str || LPAD(sequence_num::text, 6, '0');
    
    -- Double-check for uniqueness (shouldn't happen with lock, but safety check)
    WHILE EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoice_number = invoice_num 
        AND college_id = college_id_param
    ) LOOP
        attempt := attempt + 1;
        IF attempt > max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique invoice number after % attempts', max_attempts;
        END IF;
        
        sequence_num := sequence_num + 1;
        invoice_num := prefix || year_str || LPAD(sequence_num::text, 6, '0');
    END LOOP;
    
    RETURN invoice_num;
    
    -- Advisory lock is automatically released when transaction ends
END;
$$ LANGUAGE plpgsql;

-- Also fix payment number generation with the same approach
DROP FUNCTION IF EXISTS generate_payment_number(integer);

CREATE OR REPLACE FUNCTION generate_payment_number(college_id_param integer)
RETURNS varchar(100) AS $$
DECLARE
    prefix varchar(10) := 'PAY';
    year_str varchar(4) := TO_CHAR(CURRENT_DATE, 'YYYY');
    sequence_num integer;
    payment_num varchar(100);
    max_attempts integer := 10;
    attempt integer := 0;
    lock_id bigint;
BEGIN
    lock_id := college_id_param + 1000000; -- Different lock ID for payments
    
    PERFORM pg_advisory_xact_lock(lock_id);
    
    SELECT COALESCE(MAX(
        CAST(RIGHT(payment_number, 6) AS integer)
    ), 0) + 1
    INTO sequence_num
    FROM payments
    WHERE college_id = college_id_param
    AND payment_number LIKE (prefix || year_str || '%')
    AND LENGTH(payment_number) = LENGTH(prefix) + LENGTH(year_str) + 6; -- Ensure correct format
    
    payment_num := prefix || year_str || LPAD(sequence_num::text, 6, '0');
    
    WHILE EXISTS (
        SELECT 1 FROM payments 
        WHERE payment_number = payment_num 
        AND college_id = college_id_param
    ) LOOP
        attempt := attempt + 1;
        IF attempt > max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique payment number after % attempts', max_attempts;
        END IF;
        
        sequence_num := sequence_num + 1;
        payment_num := prefix || year_str || LPAD(sequence_num::text, 6, '0');
    END LOOP;
    
    RETURN payment_num;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION generate_invoice_number(integer) IS 'Generates unique invoice numbers with format: INV + YYYY + 6-digit-sequence. Uses advisory locks to prevent race conditions.';
COMMENT ON FUNCTION generate_payment_number(integer) IS 'Generates unique payment numbers with format: PAY + YYYY + 6-digit-sequence. Uses advisory locks to prevent race conditions.';

