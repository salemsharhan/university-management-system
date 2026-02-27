-- Storage RLS policies for bucket "qalam" (application/student documents).
-- Ensures uploads from track page and register form (anon) and reads via getPublicUrl work.
--
-- Required: Create bucket "qalam" in Dashboard (Storage → New bucket) if it does not exist.
-- For public URL access (e.g. student profile, track page): set the bucket to Public
-- (Storage → qalam → Configuration → Public bucket).

-- Allow anyone (including anon) to INSERT into qalam bucket (track page + register form uploads)
CREATE POLICY "Allow public insert qalam"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'qalam');

-- Allow anyone to SELECT (read) from qalam bucket so public URLs work (student profile, track page)
CREATE POLICY "Allow public select qalam"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'qalam');

-- Allow update/delete for authenticated users (e.g. replace document)
CREATE POLICY "Allow authenticated update qalam"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'qalam')
WITH CHECK (bucket_id = 'qalam');

CREATE POLICY "Allow authenticated delete qalam"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'qalam');
