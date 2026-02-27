-- Ensure anon and authenticated can read/insert/update application_documents (track page is unauthenticated).
-- In Supabase, unauthenticated requests use the anon role; "TO public" may not apply to anon.

DROP POLICY IF EXISTS "Allow public select application_documents" ON application_documents;
DROP POLICY IF EXISTS "Allow public insert application_documents" ON application_documents;
DROP POLICY IF EXISTS "Allow public update application_documents" ON application_documents;

CREATE POLICY "Allow anon select application_documents"
ON application_documents FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert application_documents"
ON application_documents FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update application_documents"
ON application_documents FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated select application_documents"
ON application_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert application_documents"
ON application_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update application_documents"
ON application_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
