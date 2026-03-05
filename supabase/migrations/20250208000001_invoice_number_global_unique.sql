-- Fix duplicate invoice_number: constraint is globally unique but function was per-college.
-- Generate invoice numbers from a global sequence (INV + YYYY + 6-digit) so they are unique across all colleges.

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
    lock_id bigint := 900001; -- Single global lock for invoice number generation
BEGIN
    -- Use a global advisory lock so only one transaction generates at a time (avoids duplicates)
    PERFORM pg_advisory_xact_lock(lock_id);

    -- Global max: do NOT filter by college_id so numbers are unique across all colleges
    SELECT COALESCE(MAX(
        CAST(RIGHT(invoice_number, 6) AS integer)
    ), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE (prefix || year_str || '%')
    AND LENGTH(invoice_number) = LENGTH(prefix) + LENGTH(year_str) + 6;

    invoice_num := prefix || year_str || LPAD(sequence_num::text, 6, '0');

    -- Safety: ensure uniqueness (in case of legacy data or format edge cases)
    WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_number = invoice_num) LOOP
        attempt := attempt + 1;
        IF attempt > max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique invoice number after % attempts', max_attempts;
        END IF;
        sequence_num := sequence_num + 1;
        invoice_num := prefix || year_str || LPAD(sequence_num::text, 6, '0');
    END LOOP;

    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invoice_number(integer) IS 'Generates globally unique invoice numbers (INV + YYYY + 6-digit). college_id_param is kept for API compatibility but sequence is global to satisfy invoices_invoice_number_unique.';
