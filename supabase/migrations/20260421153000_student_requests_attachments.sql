-- Attachments for student service requests (e.g., generated PDFs)

CREATE TABLE IF NOT EXISTS public.student_service_request_attachments (
  id bigserial PRIMARY KEY,
  request_id bigint NOT NULL REFERENCES public.student_service_requests(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text,
  mime_type text,
  file_size bigint,
  uploaded_by_user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_service_request_attachments_request_id
ON public.student_service_request_attachments(request_id);

ALTER TABLE public.student_service_request_attachments ENABLE ROW LEVEL SECURITY;

-- Students can view attachments for their own requests; admin/college can view all.
DROP POLICY IF EXISTS "view request attachments by request access" ON public.student_service_request_attachments;
CREATE POLICY "view request attachments by request access"
ON public.student_service_request_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.student_service_requests r
    WHERE r.id = request_id
      AND (
        public.current_app_user_role() IN ('admin','user')
        OR r.student_id = public.current_student_id()
      )
  )
);

-- Only admin/college staff can add attachments.
DROP POLICY IF EXISTS "admin can attach files to requests" ON public.student_service_request_attachments;
CREATE POLICY "admin can attach files to requests"
ON public.student_service_request_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_app_user_role() IN ('admin','user')
  AND EXISTS (SELECT 1 FROM public.student_service_requests r WHERE r.id = request_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_service_request_attachments TO authenticated;

