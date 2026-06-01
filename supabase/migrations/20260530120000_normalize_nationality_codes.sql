-- Normalize legacy free-text nationality values to ISO 3166-1 alpha-2 codes.

CREATE OR REPLACE FUNCTION public.normalize_nationality_code(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
  k text;
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN
    RETURN NULL;
  END IF;

  v := upper(btrim(raw));
  IF length(v) = 2 AND v ~ '^[A-Z]{2}$' THEN
    RETURN v;
  END IF;

  k := lower(btrim(raw));

  RETURN CASE k
    WHEN 'filipino' THEN 'PH'
    WHEN 'philippines' THEN 'PH'
    WHEN 'philippine' THEN 'PH'
    WHEN 'gambian' THEN 'GM'
    WHEN 'gambia' THEN 'GM'
    WHEN 'غامبيا' THEN 'GM'
    WHEN 'nigeria' THEN 'NG'
    WHEN 'nigerian' THEN 'NG'
    WHEN 'nigéria' THEN 'NG'
    WHEN 'nigería' THEN 'NG'
    WHEN 'نجيري' THEN 'NG'
    WHEN 'نيجيريا' THEN 'NG'
    WHEN 'syria' THEN 'SY'
    WHEN 'syrian' THEN 'SY'
    WHEN 'سوريا' THEN 'SY'
    WHEN 'tanzania' THEN 'TZ'
    WHEN 'tanzanian' THEN 'TZ'
    WHEN 'تنزاني' THEN 'TZ'
    WHEN 'تنزانية' THEN 'TZ'
    WHEN 'thai' THEN 'TH'
    WHEN 'thailand' THEN 'TH'
    WHEN 'تايلاند' THEN 'TH'
    WHEN 'تايلاندي' THEN 'TH'
    WHEN 'تايلاندية' THEN 'TH'
    WHEN 'تايلادن' THEN 'TH'
    WHEN 'الجنسية التايلاندية' THEN 'TH'
    WHEN 'بان خو' THEN 'TH'
    WHEN 'mali' THEN 'ML'
    WHEN 'مالي' THEN 'ML'
    WHEN 'egypt' THEN 'EG'
    WHEN 'egyptian' THEN 'EG'
    WHEN 'مصر' THEN 'EG'
    WHEN 'مصري' THEN 'EG'
    WHEN 'morocco' THEN 'MA'
    WHEN 'moroccan' THEN 'MA'
    WHEN 'مغربية' THEN 'MA'
    WHEN 'مغربي' THEN 'MA'
    WHEN 'niger' THEN 'NE'
    WHEN 'nigerien' THEN 'NE'
    WHEN 'النيجر' THEN 'NE'
    WHEN 'kuwait' THEN 'KW'
    WHEN 'kuwaiti' THEN 'KW'
    WHEN 'الكويت' THEN 'KW'
    WHEN 'كويت' THEN 'KW'
    WHEN 'كويتي' THEN 'KW'
    WHEN 'كويتية' THEN 'KW'
    ELSE NULL
  END;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['applications', 'students', 'instructors', 'applicant_profiles']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'nationality'
    ) THEN
      EXECUTE format(
        $q$
        UPDATE public.%I
        SET nationality = public.normalize_nationality_code(nationality)
        WHERE nationality IS NOT NULL
          AND btrim(nationality) <> ''
          AND public.normalize_nationality_code(nationality) IS NOT NULL
          AND nationality IS DISTINCT FROM public.normalize_nationality_code(nationality)
        $q$,
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.normalize_nationality_code(text) IS
  'Maps legacy nationality free text to ISO 3166-1 alpha-2; used by app and one-time data cleanup.';
