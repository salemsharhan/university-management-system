-- Student Requests Center: requests + comments (student portal + admin)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_request_status') THEN
    CREATE TYPE public.student_request_status AS ENUM ('draft', 'submitted', 'processing', 'completed', 'cancelled', 'rejected');
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.student_service_requests_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_student_request_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  seq bigint;
  yr text;
BEGIN
  SELECT nextval('public.student_service_requests_seq') INTO seq;
  yr := to_char(now(), 'YYYY');
  RETURN 'REQ-' || yr || '-' || lpad(seq::text, 6, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.student_service_requests (
  id bigserial PRIMARY KEY,
  request_number text UNIQUE NOT NULL DEFAULT public.generate_student_request_number(),
  student_id integer NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  college_id integer REFERENCES public.colleges(id) ON DELETE SET NULL,
  semester_id integer REFERENCES public.semesters(id) ON DELETE SET NULL,
  request_type text NOT NULL,
  title_en text,
  title_ar text,
  description text,
  payload jsonb,
  status public.student_request_status NOT NULL DEFAULT 'submitted',
  expected_completion_days integer,
  fee_amount numeric(10,2) DEFAULT 0,
  fee_paid boolean DEFAULT false,
  last_status_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_service_requests_student_id ON public.student_service_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_service_requests_college_id ON public.student_service_requests(college_id);
CREATE INDEX IF NOT EXISTS idx_student_service_requests_status ON public.student_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_service_requests_created_at ON public.student_service_requests(created_at);

CREATE TABLE IF NOT EXISTS public.student_service_request_comments (
  id bigserial PRIMARY KEY,
  request_id bigint NOT NULL REFERENCES public.student_service_requests(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('student','admin','college','staff')),
  author_user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_service_request_comments_request_id ON public.student_service_request_comments(request_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_service_requests_updated_at ON public.student_service_requests;
CREATE TRIGGER trg_student_service_requests_updated_at
BEFORE UPDATE ON public.student_service_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Keep last_status_at updated when status changes
CREATE OR REPLACE FUNCTION public.bump_request_last_status_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.last_status_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.last_status_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_service_requests_status_bump ON public.student_service_requests;
CREATE TRIGGER trg_student_service_requests_status_bump
BEFORE INSERT OR UPDATE OF status ON public.student_service_requests
FOR EACH ROW
EXECUTE FUNCTION public.bump_request_last_status_at();

-- RLS
ALTER TABLE public.student_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_service_request_comments ENABLE ROW LEVEL SECURITY;

-- Helpers: identify current user row by openId/email fallback
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u."openId" = auth.uid()::text
     OR lower(u.email) = lower((auth.jwt() ->> 'email'))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT u.role::text
  FROM public.users u
  WHERE u."openId" = auth.uid()::text
     OR lower(u.email) = lower((auth.jwt() ->> 'email'))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT s.id
  FROM public.students s
  JOIN public.users u ON u.id = s.user_id
  WHERE u."openId" = auth.uid()::text
     OR lower(u.email) = lower((auth.jwt() ->> 'email'))
  LIMIT 1;
$$;

-- Policies: requests
DROP POLICY IF EXISTS "students view own requests" ON public.student_service_requests;
CREATE POLICY "students view own requests"
ON public.student_service_requests
FOR SELECT
TO authenticated
USING (
  public.current_app_user_role() IN ('admin','user')
  OR student_id = public.current_student_id()
);

DROP POLICY IF EXISTS "students create own requests" ON public.student_service_requests;
CREATE POLICY "students create own requests"
ON public.student_service_requests
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = public.current_student_id()
);

DROP POLICY IF EXISTS "students update own requests" ON public.student_service_requests;
CREATE POLICY "students update own requests"
ON public.student_service_requests
FOR UPDATE
TO authenticated
USING (
  public.current_app_user_role() IN ('admin','user')
  OR student_id = public.current_student_id()
)
WITH CHECK (
  public.current_app_user_role() IN ('admin','user')
  OR (
    student_id = public.current_student_id()
    AND status IN ('draft','submitted','processing','cancelled') -- student can cancel before completion
  )
);

-- Policies: comments
DROP POLICY IF EXISTS "view comments by request access" ON public.student_service_request_comments;
CREATE POLICY "view comments by request access"
ON public.student_service_request_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_service_requests r
    WHERE r.id = request_id
      AND (public.current_app_user_role() IN ('admin','user') OR r.student_id = public.current_student_id())
  )
);

DROP POLICY IF EXISTS "create comment by request access" ON public.student_service_request_comments;
CREATE POLICY "create comment by request access"
ON public.student_service_request_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_service_requests r
    WHERE r.id = request_id
      AND (
        public.current_app_user_role() IN ('admin','user')
        OR r.student_id = public.current_student_id()
      )
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_service_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_service_request_comments TO authenticated;

