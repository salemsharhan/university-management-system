-- RPC: Delete all students and their references (super admin only).
-- Callable only by users with role 'admin'. Deletes in order to satisfy FKs.

CREATE OR REPLACE FUNCTION delete_all_students_and_references()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  deleted_count int;
  audit_count int;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Require super admin (role = 'admin')
  SELECT role INTO caller_role
  FROM users
  WHERE "openId" = auth.uid()::text
  LIMIT 1;

  IF caller_role IS NULL OR caller_role <> 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only super admin can reset all students');
  END IF;

  -- Delete in order (tables with ON DELETE NO ACTION must be cleared first)
  DELETE FROM attendance;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM exam_results;
  DELETE FROM enrollments;

  DELETE FROM financial_transactions;

  -- Audit log entries for students
  DELETE FROM status_change_audit_log WHERE entity_type = 'student';
  GET DIAGNOSTICS audit_count = ROW_COUNT;

  -- Delete all students (CASCADE will remove: grade_components, wallets, invoices, payments, etc.)
  DELETE FROM students;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'students_deleted', deleted_count,
    'audit_entries_deleted', audit_count
  );
END;
$$;

COMMENT ON FUNCTION delete_all_students_and_references() IS 'Super admin only: deletes all students and referencing rows. Requires role=admin.';
