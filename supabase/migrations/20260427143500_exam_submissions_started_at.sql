-- Track when a student actually starts an exam attempt (for duration-based timing)

ALTER TABLE public.exam_submissions
ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_exam_submissions_started_at ON public.exam_submissions(started_at);

