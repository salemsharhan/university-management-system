-- Student study planner: student-owned tasks

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'study_task_status') THEN
    CREATE TYPE public.study_task_status AS ENUM ('pending', 'done', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.student_study_tasks (
  id bigserial PRIMARY KEY,
  student_id integer NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  course_code text,
  due_at timestamptz,
  status public.study_task_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_study_tasks_student_id ON public.student_study_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_study_tasks_due_at ON public.student_study_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_student_study_tasks_status ON public.student_study_tasks(status);

DROP TRIGGER IF EXISTS trg_student_study_tasks_updated_at ON public.student_study_tasks;
CREATE TRIGGER trg_student_study_tasks_updated_at
BEFORE UPDATE ON public.student_study_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.student_study_tasks ENABLE ROW LEVEL SECURITY;

-- Student can CRUD own tasks
DROP POLICY IF EXISTS student_study_tasks_select_own ON public.student_study_tasks;
CREATE POLICY student_study_tasks_select_own
  ON public.student_study_tasks FOR SELECT TO authenticated
  USING (
    public.current_app_user_role() = 'student'
    AND student_id = public.current_student_id()
  );

DROP POLICY IF EXISTS student_study_tasks_insert_own ON public.student_study_tasks;
CREATE POLICY student_study_tasks_insert_own
  ON public.student_study_tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.current_app_user_role() = 'student'
    AND student_id = public.current_student_id()
  );

DROP POLICY IF EXISTS student_study_tasks_update_own ON public.student_study_tasks;
CREATE POLICY student_study_tasks_update_own
  ON public.student_study_tasks FOR UPDATE TO authenticated
  USING (
    public.current_app_user_role() = 'student'
    AND student_id = public.current_student_id()
  )
  WITH CHECK (
    public.current_app_user_role() = 'student'
    AND student_id = public.current_student_id()
  );

DROP POLICY IF EXISTS student_study_tasks_delete_own ON public.student_study_tasks;
CREATE POLICY student_study_tasks_delete_own
  ON public.student_study_tasks FOR DELETE TO authenticated
  USING (
    public.current_app_user_role() = 'student'
    AND student_id = public.current_student_id()
  );

-- Admin/user can read/manage (support workflows)
DROP POLICY IF EXISTS student_study_tasks_manage_staff ON public.student_study_tasks;
CREATE POLICY student_study_tasks_manage_staff
  ON public.student_study_tasks FOR ALL TO authenticated
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

