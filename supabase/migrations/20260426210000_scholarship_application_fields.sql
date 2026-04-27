-- Scholarship narrative fields on applications; copy to students on enrollment from application.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS scholarship_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS scholarship_details TEXT;

COMMENT ON COLUMN public.applications.scholarship_type IS 'Applicant-declared scholarship category (e.g. merit, need-based).';
COMMENT ON COLUMN public.applications.scholarship_details IS 'Applicant statement / details supporting a scholarship request.';

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS scholarship_details TEXT;

COMMENT ON COLUMN public.students.scholarship_details IS 'Statement or notes supporting scholarship status; may be copied from application.';
