-- Soft-delete: mark students inactive without removing rows (lists filter by default)
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'inactive';
