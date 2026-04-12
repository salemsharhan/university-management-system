-- Grading rubrics (admin Rubric builder + instructor assessment attachment via `code` → assessment_settings.rubric_id)

CREATE TABLE IF NOT EXISTS public.rubrics (
  id serial PRIMARY KEY,
  code varchar(120) NOT NULL UNIQUE,
  name_en varchar(255) NOT NULL,
  name_ar varchar(255),
  rubric_type varchar(50) DEFAULT 'analytic' NOT NULL,
  total_marks numeric(10, 2) DEFAULT 0 NOT NULL,
  subject_id integer REFERENCES public.subjects(id) ON DELETE SET NULL,
  matrix jsonb NOT NULL DEFAULT '{"criteria":[]}'::jsonb,
  is_active boolean DEFAULT true NOT NULL,
  created_by integer REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rubrics_subject_id ON public.rubrics(subject_id);
CREATE INDEX IF NOT EXISTS idx_rubrics_is_active ON public.rubrics(is_active);
CREATE INDEX IF NOT EXISTS idx_rubrics_code ON public.rubrics(code);

COMMENT ON TABLE public.rubrics IS 'Rubric definitions; `code` matches subject_exams.assessment_settings.rubric_id';

ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;

-- Instructors (and students) can read active rubrics; admins can read all
CREATE POLICY "rubrics_select"
  ON public.rubrics FOR SELECT TO authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u."openId" = auth.uid()::text AND u.role = 'admin'
    )
  );

CREATE POLICY "rubrics_insert_admin"
  ON public.rubrics FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u."openId" = auth.uid()::text AND u.role = 'admin'
    )
  );

CREATE POLICY "rubrics_update_admin"
  ON public.rubrics FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u."openId" = auth.uid()::text AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u."openId" = auth.uid()::text AND u.role = 'admin'
    )
  );

CREATE POLICY "rubrics_delete_admin"
  ON public.rubrics FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u."openId" = auth.uid()::text AND u.role = 'admin'
    )
  );

-- Seed defaults (codes match instructor `INSTRUCTOR_RUBRIC_CATALOG` / assessment_settings)
INSERT INTO public.rubrics (code, name_en, rubric_type, total_marks, matrix) VALUES
(
  'academic_writing_default',
  'Academic writing rubric',
  'analytic',
  30,
  $matrix$
  {
    "criteria": [
      {
        "title": "Content and ideas",
        "weight_marks": 10,
        "l4": "Ideas are clear and highly developed, with strong supporting examples and deep analysis.",
        "l3": "Ideas are mostly clear with adequate examples and some analysis.",
        "l2": "Basic ideas with limited examples and surface-level analysis.",
        "l1": "Ideas unclear or missing, without examples or analysis."
      },
      {
        "title": "Organization and structure",
        "weight_marks": 8,
        "l4": "Excellent logical structure with clear introduction and conclusion and smooth transitions.",
        "l3": "Clear structure with some good transitions.",
        "l2": "Basic structure with limited transitions.",
        "l1": "Unclear or missing structure."
      },
      {
        "title": "Language and style",
        "weight_marks": 7,
        "l4": "Professional academic language with varied vocabulary and very few grammar errors.",
        "l3": "Good language with minor errors that do not affect meaning.",
        "l2": "Repeated errors that sometimes affect clarity.",
        "l1": "Many errors that hinder understanding."
      },
      {
        "title": "Documentation and references",
        "weight_marks": 5,
        "l4": "Full correct APA citation with a comprehensive reference list.",
        "l3": "Good documentation with minor formatting errors.",
        "l2": "Incomplete or inconsistent documentation.",
        "l1": "Missing or incorrect documentation."
      }
    ]
  }
  $matrix$::jsonb
),
(
  'oral_presentation_default',
  'Oral presentation rubric',
  'analytic',
  20,
  $matrix2$
  {
    "criteria": [
      {
        "title": "Delivery & clarity",
        "weight_marks": 10,
        "l4": "Confident, clear speech; strong eye contact; excellent pacing.",
        "l3": "Mostly clear delivery with minor hesitations.",
        "l2": "Uneven clarity; frequent reading from notes.",
        "l1": "Difficult to follow; poor pacing or articulation."
      },
      {
        "title": "Content & structure",
        "weight_marks": 10,
        "l4": "Well-organized; strong introduction/conclusion; meets time limits.",
        "l3": "Good structure with minor gaps.",
        "l2": "Basic organization; weak transitions.",
        "l1": "Disorganized or off-topic; timing issues."
      }
    ]
  }
  $matrix2$::jsonb
)
ON CONFLICT (code) DO NOTHING;
