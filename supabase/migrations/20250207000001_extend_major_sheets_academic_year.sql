-- Extend major_sheets.academic_year to allow longer labels (e.g. "2025-2026- Academic Year - Hadith")
-- Fixes: value too long for type character varying(20)
ALTER TABLE "major_sheets"
  ALTER COLUMN "academic_year" TYPE varchar(255);

COMMENT ON COLUMN "major_sheets"."academic_year" IS 'Academic year label, e.g. "2024-2025" or "2025-2026- Academic Year - Hadith"';
