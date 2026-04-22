-- e-Learning / Teams sessions (student portal)
--
-- IMPORTANT: Sessions themselves are GENERATED from existing timetable data:
-- - public.classes (semester_id)
-- - public.class_schedules (day_of_week/start_time/end_time/location)
--
-- Therefore we DO NOT create a separate "elearning_sessions" table here.
-- We only store: materials, recordings, and per-student attendance against a timetable slot.

-- Attendance status per student
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'elearning_attendance_status') THEN
    CREATE TYPE public.elearning_attendance_status AS ENUM ('registered','attended','missed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.elearning_schedule_materials (
  id bigserial PRIMARY KEY,
  class_schedule_id integer NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  -- Optional: attach materials to a specific occurrence date; NULL means reusable for all occurrences.
  session_date date,
  title_en text,
  title_ar text,
  material_type text NOT NULL DEFAULT 'file', -- file | link
  file_path text,
  external_url text,
  mime_type text,
  file_size bigint,
  created_by_user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elearning_schedule_materials_schedule_id
ON public.elearning_schedule_materials(class_schedule_id);

CREATE INDEX IF NOT EXISTS idx_elearning_schedule_materials_session_date
ON public.elearning_schedule_materials(session_date);

CREATE TABLE IF NOT EXISTS public.elearning_schedule_recordings (
  id bigserial PRIMARY KEY,
  class_schedule_id integer NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  -- Usually recordings are for a specific date.
  session_date date NOT NULL,
  title_en text,
  title_ar text,
  recording_type text NOT NULL DEFAULT 'file', -- file | link
  file_path text,
  external_url text,
  duration_minutes integer,
  available_until date,
  created_by_user_id integer REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elearning_schedule_recordings_schedule_id
ON public.elearning_schedule_recordings(class_schedule_id);

CREATE INDEX IF NOT EXISTS idx_elearning_schedule_recordings_session_date
ON public.elearning_schedule_recordings(session_date);

CREATE TABLE IF NOT EXISTS public.elearning_schedule_attendance (
  id bigserial PRIMARY KEY,
  class_schedule_id integer NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  student_id integer NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status public.elearning_attendance_status NOT NULL DEFAULT 'registered',
  joined_at timestamptz,
  left_at timestamptz,
  attended_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_schedule_id, session_date, student_id)
);

CREATE INDEX IF NOT EXISTS idx_elearning_schedule_attendance_schedule_id
ON public.elearning_schedule_attendance(class_schedule_id);

CREATE INDEX IF NOT EXISTS idx_elearning_schedule_attendance_student_id
ON public.elearning_schedule_attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_elearning_schedule_attendance_session_date
ON public.elearning_schedule_attendance(session_date);

-- updated_at triggers (reuse existing function if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_elearning_schedule_attendance_updated_at ON public.elearning_schedule_attendance;
    CREATE TRIGGER trg_elearning_schedule_attendance_updated_at
      BEFORE UPDATE ON public.elearning_schedule_attendance
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.elearning_schedule_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_schedule_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_schedule_attendance ENABLE ROW LEVEL SECURITY;

-- Access rules (generated sessions come from schedules + enrollments)
-- Students can access schedule artifacts only if they are enrolled in the schedule's class.

-- Materials
DROP POLICY IF EXISTS "view elearning schedule materials by enrollment" ON public.elearning_schedule_materials;
CREATE POLICY "view elearning schedule materials by enrollment"
ON public.elearning_schedule_materials
FOR SELECT
TO authenticated
USING (
  public.current_app_user_role() IN ('admin','user')
  OR EXISTS (
    SELECT 1
    FROM public.class_schedules cs
    JOIN public.classes c ON c.id = cs.class_id
    JOIN public.enrollments e ON e.class_id = c.id AND e.semester_id = c.semester_id
    WHERE cs.id = elearning_schedule_materials.class_schedule_id
      AND e.student_id = public.current_student_id()
      AND e.status = 'enrolled'
  )
);

DROP POLICY IF EXISTS "staff can manage elearning schedule materials" ON public.elearning_schedule_materials;
CREATE POLICY "staff can manage elearning schedule materials"
ON public.elearning_schedule_materials
FOR ALL
TO authenticated
USING (public.current_app_user_role() IN ('admin','user'))
WITH CHECK (public.current_app_user_role() IN ('admin','user'));

-- Recordings
DROP POLICY IF EXISTS "view elearning schedule recordings by enrollment" ON public.elearning_schedule_recordings;
CREATE POLICY "view elearning schedule recordings by enrollment"
ON public.elearning_schedule_recordings
FOR SELECT
TO authenticated
USING (
  public.current_app_user_role() IN ('admin','user')
  OR EXISTS (
    SELECT 1
    FROM public.class_schedules cs
    JOIN public.classes c ON c.id = cs.class_id
    JOIN public.enrollments e ON e.class_id = c.id AND e.semester_id = c.semester_id
    WHERE cs.id = elearning_schedule_recordings.class_schedule_id
      AND e.student_id = public.current_student_id()
      AND e.status = 'enrolled'
  )
);

DROP POLICY IF EXISTS "staff can manage elearning schedule recordings" ON public.elearning_schedule_recordings;
CREATE POLICY "staff can manage elearning schedule recordings"
ON public.elearning_schedule_recordings
FOR ALL
TO authenticated
USING (public.current_app_user_role() IN ('admin','user'))
WITH CHECK (public.current_app_user_role() IN ('admin','user'));

-- Attendance
DROP POLICY IF EXISTS "students can view own elearning schedule attendance" ON public.elearning_schedule_attendance;
CREATE POLICY "students can view own elearning schedule attendance"
ON public.elearning_schedule_attendance
FOR SELECT
TO authenticated
USING (
  public.current_app_user_role() IN ('admin','user')
  OR student_id = public.current_student_id()
);

DROP POLICY IF EXISTS "students can upsert own elearning schedule attendance" ON public.elearning_schedule_attendance;
CREATE POLICY "students can upsert own elearning schedule attendance"
ON public.elearning_schedule_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = public.current_student_id()
  AND EXISTS (
    SELECT 1
    FROM public.class_schedules cs
    JOIN public.classes c ON c.id = cs.class_id
    JOIN public.enrollments e ON e.class_id = c.id AND e.semester_id = c.semester_id
    WHERE cs.id = elearning_schedule_attendance.class_schedule_id
      AND e.student_id = public.current_student_id()
      AND e.status = 'enrolled'
  )
);

DROP POLICY IF EXISTS "students can update own elearning schedule attendance" ON public.elearning_schedule_attendance;
CREATE POLICY "students can update own elearning schedule attendance"
ON public.elearning_schedule_attendance
FOR UPDATE
TO authenticated
USING (student_id = public.current_student_id() OR public.current_app_user_role() IN ('admin','user'))
WITH CHECK (student_id = public.current_student_id() OR public.current_app_user_role() IN ('admin','user'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elearning_schedule_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elearning_schedule_recordings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elearning_schedule_attendance TO authenticated;

