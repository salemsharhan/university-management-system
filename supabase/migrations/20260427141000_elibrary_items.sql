-- e-Library content by major (student portal)

CREATE TABLE IF NOT EXISTS public.elibrary_items (
  id bigserial PRIMARY KEY,
  major_id integer NOT NULL REFERENCES public.majors (id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_ar text,
  author_en text,
  author_ar text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  kind text NOT NULL DEFAULT 'book' CHECK (kind IN ('book', 'article', 'audio', 'link')),
  url text,
  cover_emoji text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elibrary_items_major_id ON public.elibrary_items (major_id);
CREATE INDEX IF NOT EXISTS idx_elibrary_items_active ON public.elibrary_items (is_active);

DROP TRIGGER IF EXISTS tr_elibrary_items_updated_at ON public.elibrary_items;
CREATE TRIGGER tr_elibrary_items_updated_at
  BEFORE UPDATE ON public.elibrary_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.elibrary_items ENABLE ROW LEVEL SECURITY;

-- Students can read active items for their own major.
DROP POLICY IF EXISTS elibrary_items_select_student_major ON public.elibrary_items;
CREATE POLICY elibrary_items_select_student_major
  ON public.elibrary_items
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.students s ON s.user_id = u.id
      WHERE s.major_id = elibrary_items.major_id
        AND (
          u."openId" = auth.uid()::text
          OR lower(u.email) = lower((auth.jwt() ->> 'email'))
        )
        AND u.role = 'student'
    )
  );

-- Admin/college staff can manage items.
DROP POLICY IF EXISTS elibrary_items_manage_staff ON public.elibrary_items;
CREATE POLICY elibrary_items_manage_staff
  ON public.elibrary_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u."openId" = auth.uid()::text
        AND u.role IN ('admin', 'user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u."openId" = auth.uid()::text
        AND u.role IN ('admin', 'user')
    )
  );

