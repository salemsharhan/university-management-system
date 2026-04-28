-- Add academic year on applications + allow defaults in onboarding_settings.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS academic_year_id integer REFERENCES public.academic_years(id);

CREATE INDEX IF NOT EXISTS idx_applications_academic_year_id
  ON public.applications(academic_year_id);

COMMENT ON COLUMN public.applications.academic_year_id IS 'Academic year context for the application (used for defaulted application intakes).';

