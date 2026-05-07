-- Subject-level lesson templates (admin-authored, reused across sessions/classes).

CREATE TABLE IF NOT EXISTS public.subject_lessons (
  id serial PRIMARY KEY,
  subject_id integer NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  title_ar varchar(255),
  unit_number integer DEFAULT 1 NOT NULL,
  lesson_number integer DEFAULT 1 NOT NULL,
  estimated_minutes integer DEFAULT 45 NOT NULL,
  summary text,
  prerequisite_subject_lesson_id integer REFERENCES public.subject_lessons(id) ON DELETE SET NULL,
  status varchar(20) DEFAULT 'draft' NOT NULL,
  published_at timestamptz,
  created_by integer REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT subject_lessons_subject_unit_lesson_unique UNIQUE (subject_id, unit_number, lesson_number)
);

CREATE INDEX IF NOT EXISTS idx_subject_lessons_subject_id
  ON public.subject_lessons(subject_id);

CREATE TABLE IF NOT EXISTS public.subject_lesson_clos (
  id serial PRIMARY KEY,
  subject_lesson_id integer NOT NULL REFERENCES public.subject_lessons(id) ON DELETE CASCADE,
  clo_id integer NOT NULL REFERENCES public.subject_learning_outcomes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT subject_lesson_clos_unique UNIQUE (subject_lesson_id, clo_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_lesson_clos_subject_lesson_id
  ON public.subject_lesson_clos(subject_lesson_id);

CREATE TABLE IF NOT EXISTS public.subject_lesson_elements (
  id serial PRIMARY KEY,
  subject_lesson_id integer NOT NULL REFERENCES public.subject_lessons(id) ON DELETE CASCADE,
  element_type varchar(30) NOT NULL,
  title varchar(255),
  content jsonb DEFAULT '{}'::jsonb NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  is_required boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subject_lesson_elements_subject_lesson_id
  ON public.subject_lesson_elements(subject_lesson_id);

COMMENT ON TABLE public.subject_lessons IS 'Admin-authored subject-level lesson templates.';
COMMENT ON TABLE public.subject_lesson_elements IS 'Structured lesson template blocks per subject lesson.';
COMMENT ON TABLE public.subject_lesson_clos IS 'CLO mapping for subject lesson templates.';

