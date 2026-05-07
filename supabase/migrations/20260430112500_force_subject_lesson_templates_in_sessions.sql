-- Allow subject lesson templates to force session/class lessons to use template content.

ALTER TABLE public.subject_lessons
  ADD COLUMN IF NOT EXISTS force_use_in_sessions boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.subject_lessons.force_use_in_sessions IS 'When true, class/session lessons should be locked to this template content.';

ALTER TABLE public.class_lessons
  ADD COLUMN IF NOT EXISTS subject_lesson_id integer REFERENCES public.subject_lessons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_class_lessons_subject_lesson_id
  ON public.class_lessons(subject_lesson_id);

COMMENT ON COLUMN public.class_lessons.subject_lesson_id IS 'Optional link to the subject-level lesson template that this class lesson follows.';

