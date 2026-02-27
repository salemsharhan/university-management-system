-- Application documents: same document types as in registration form; uploadable on track page if not filled at registration
-- Document types: id_photo, transcript (Transcript / Grades). Application form = submission (always done). Documents verification = process status.

CREATE TABLE IF NOT EXISTS application_documents (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  content_type VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(application_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_document_type ON application_documents(document_type);

COMMENT ON TABLE application_documents IS 'Uploaded documents per application (ID photo, transcript, etc.). Same types as in register form; can be uploaded on track page if not submitted at registration.';

-- RLS: allow public read/insert so track page can list and upload without login (page is semi-public via application id in URL)
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select application_documents"
ON application_documents FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert application_documents"
ON application_documents FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update application_documents"
ON application_documents FOR UPDATE TO public USING (true);

-- Create bucket "qalam" in Dashboard: Storage → New bucket, public, 10MB limit, MIME: image/jpeg, image/png, image/webp, application/pdf.
-- Add storage policies to allow public INSERT and SELECT on bucket "qalam" so the track page can upload without login.
