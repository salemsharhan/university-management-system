-- Fix update_invoice_pending_amount function to properly cast ENUM values
-- This fixes the error: "column \"status\" is of type invoice_status but expression is of type text"

CREATE OR REPLACE FUNCTION update_invoice_pending_amount()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET 
        paid_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE invoice_id = NEW.invoice_id
            AND status = 'verified'::payment_status
        ),
        pending_amount = GREATEST(0, total_amount - (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE invoice_id = NEW.invoice_id
            AND status = 'verified'::payment_status
        ) - discount_amount - scholarship_amount),
        status = (
            CASE
                WHEN total_amount - (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM payments
                    WHERE invoice_id = NEW.invoice_id
                    AND status = 'verified'::payment_status
                ) - discount_amount - scholarship_amount <= 0 
                THEN 'paid'::invoice_status
                
                WHEN (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM payments
                    WHERE invoice_id = NEW.invoice_id
                    AND status = 'verified'::payment_status
                ) > 0 
                AND total_amount - (
                    SELECT COALESCE(SUM(amount), 0)
                    FROM payments
                    WHERE invoice_id = NEW.invoice_id
                    AND status = 'verified'::payment_status
                ) - discount_amount - scholarship_amount < total_amount
                THEN 'partially_paid'::invoice_status
                
                WHEN due_date IS NOT NULL 
                AND due_date < CURRENT_DATE 
                AND (SELECT status FROM invoices WHERE id = NEW.invoice_id) != 'paid'::invoice_status
                THEN 'overdue'::invoice_status
                
                ELSE 'pending'::invoice_status
            END
        )::invoice_status,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

