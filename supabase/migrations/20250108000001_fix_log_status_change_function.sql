-- Fix log_status_change function to handle applications and students tables correctly
-- Applications table has 'status_code', students table has 'current_status_code'

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old_status VARCHAR(10);
    v_new_status VARCHAR(10);
BEGIN
    -- Determine old and new status based on table name
    IF TG_TABLE_NAME = 'applications' THEN
        v_old_status := OLD.status_code;
        v_new_status := NEW.status_code;
    ELSIF TG_TABLE_NAME = 'students' THEN
        v_old_status := OLD.current_status_code;
        v_new_status := NEW.current_status_code;
    ELSE
        -- Unknown table, skip logging
        RETURN NEW;
    END IF;
    
    -- Only insert if status actually changed
    IF TG_OP = 'UPDATE' AND (v_old_status IS DISTINCT FROM v_new_status) THEN
        INSERT INTO status_change_audit_log (
            entity_type,
            entity_id,
            from_status_code,
            to_status_code,
            created_at
        ) VALUES (
            CASE 
                WHEN TG_TABLE_NAME = 'applications' THEN 'application'
                WHEN TG_TABLE_NAME = 'students' THEN 'student'
                ELSE 'unknown'
            END,
            NEW.id,
            v_old_status,
            v_new_status,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;



