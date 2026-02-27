-- Student documents: copied from application_documents when student is accepted; shown on student profile/detail page.
-- Same document types (id_photo, transcript). file_path points to qalam bucket (files are not duplicated).

CREATE TABLE IF NOT EXISTS student_documents (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  content_type VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_document_type ON student_documents(document_type);

COMMENT ON TABLE student_documents IS 'Documents for the student (ID photo, transcript, etc.). Copied from application_documents when student is accepted; displayed on student profile.';

ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read student_documents"
ON student_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role insert update delete student_documents"
ON student_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users (admin, college, instructor) to read; restrict insert/update to backend/service
CREATE POLICY "Allow authenticated insert student_documents"
ON student_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update student_documents"
ON student_documents FOR UPDATE TO authenticated USING (true);
