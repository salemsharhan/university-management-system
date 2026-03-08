-- Instructor curriculum, lessons, release, and progress system

CREATE TABLE IF NOT EXISTS "subject_learning_outcomes" (
  "id" serial PRIMARY KEY,
  "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  "code" varchar(50) NOT NULL,
  "description" text NOT NULL,
  "description_ar" text,
  "bloom_level" varchar(50) DEFAULT 'apply',
  "difficulty_level" varchar(20) DEFAULT 'medium',
  "display_order" integer DEFAULT 0,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "subject_learning_outcomes_subject_code_unique" UNIQUE ("subject_id", "code")
);

CREATE INDEX IF NOT EXISTS "idx_subject_learning_outcomes_subject_id"
  ON "subject_learning_outcomes"("subject_id");

CREATE TABLE IF NOT EXISTS "instructor_course_settings" (
  "id" serial PRIMARY KEY,
  "class_id" integer NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "instructor_id" integer NOT NULL REFERENCES "instructors"("id") ON DELETE CASCADE,
  "default_release_mode" varchar(20) DEFAULT 'scheduled' NOT NULL,
  "completion_tracking" boolean DEFAULT true NOT NULL,
  "show_progress_to_students" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "instructor_course_settings_class_instructor_unique" UNIQUE ("class_id", "instructor_id")
);

CREATE INDEX IF NOT EXISTS "idx_instructor_course_settings_class_id"
  ON "instructor_course_settings"("class_id");

CREATE TABLE IF NOT EXISTS "class_lessons" (
  "id" serial PRIMARY KEY,
  "class_id" integer NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "title_ar" varchar(255),
  "unit_number" integer DEFAULT 1 NOT NULL,
  "lesson_number" integer DEFAULT 1 NOT NULL,
  "estimated_minutes" integer DEFAULT 45 NOT NULL,
  "summary" text,
  "prerequisite_lesson_id" integer REFERENCES "class_lessons"("id") ON DELETE SET NULL,
  "release_mode" varchar(20) DEFAULT 'scheduled' NOT NULL,
  "release_at" timestamp with time zone,
  "release_condition" text,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "published_at" timestamp with time zone,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_class_lessons_class_id"
  ON "class_lessons"("class_id");

CREATE INDEX IF NOT EXISTS "idx_class_lessons_subject_id"
  ON "class_lessons"("subject_id");

CREATE INDEX IF NOT EXISTS "idx_class_lessons_unit_lesson"
  ON "class_lessons"("class_id", "unit_number", "lesson_number");

CREATE TABLE IF NOT EXISTS "class_lesson_clos" (
  "id" serial PRIMARY KEY,
  "lesson_id" integer NOT NULL REFERENCES "class_lessons"("id") ON DELETE CASCADE,
  "clo_id" integer NOT NULL REFERENCES "subject_learning_outcomes"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_lesson_clos_unique" UNIQUE ("lesson_id", "clo_id")
);

CREATE INDEX IF NOT EXISTS "idx_class_lesson_clos_lesson_id"
  ON "class_lesson_clos"("lesson_id");

CREATE INDEX IF NOT EXISTS "idx_class_lesson_clos_clo_id"
  ON "class_lesson_clos"("clo_id");

CREATE TABLE IF NOT EXISTS "class_lesson_elements" (
  "id" serial PRIMARY KEY,
  "lesson_id" integer NOT NULL REFERENCES "class_lessons"("id") ON DELETE CASCADE,
  "element_type" varchar(30) NOT NULL,
  "title" varchar(255),
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_required" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_class_lesson_elements_lesson_id"
  ON "class_lesson_elements"("lesson_id");

CREATE TABLE IF NOT EXISTS "class_lesson_progress" (
  "id" serial PRIMARY KEY,
  "lesson_id" integer NOT NULL REFERENCES "class_lessons"("id") ON DELETE CASCADE,
  "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "enrollment_id" integer REFERENCES "enrollments"("id") ON DELETE SET NULL,
  "class_id" integer NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "status" varchar(20) DEFAULT 'not_started' NOT NULL,
  "progress_percent" numeric(5,2) DEFAULT 0 NOT NULL,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "last_activity_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "class_lesson_progress_unique" UNIQUE ("lesson_id", "student_id")
);

CREATE INDEX IF NOT EXISTS "idx_class_lesson_progress_class_id"
  ON "class_lesson_progress"("class_id");

CREATE INDEX IF NOT EXISTS "idx_class_lesson_progress_student_id"
  ON "class_lesson_progress"("student_id");

COMMENT ON TABLE "subject_learning_outcomes" IS 'CLOs/learning outcomes defined per subject';
COMMENT ON TABLE "class_lessons" IS 'Lessons authored for a class with release and publish controls';
COMMENT ON TABLE "class_lesson_elements" IS 'Structured lesson blocks (text, video, quiz, poll, attachment, etc.)';
COMMENT ON TABLE "class_lesson_progress" IS 'Per-student lesson progress and completion status';
