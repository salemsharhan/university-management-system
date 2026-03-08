-- Assessment authoring and question bank for instructor portal

ALTER TABLE "subject_exams"
ADD COLUMN IF NOT EXISTS "assessment_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE TABLE IF NOT EXISTS "subject_question_bank" (
  "id" serial PRIMARY KEY,
  "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  "class_id" integer REFERENCES "classes"("id") ON DELETE SET NULL,
  "question_type" varchar(30) NOT NULL DEFAULT 'multiple_choice',
  "difficulty_level" integer DEFAULT 3 NOT NULL,
  "bloom_level" varchar(30) DEFAULT 'understand',
  "question_text" text NOT NULL,
  "question_text_ar" text,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "correct_answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "rubric" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "explanation" text,
  "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "unit_number" integer,
  "estimated_marks" numeric(10,2) DEFAULT 1 NOT NULL,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_subject_question_bank_subject_id"
  ON "subject_question_bank"("subject_id");

CREATE INDEX IF NOT EXISTS "idx_subject_question_bank_type"
  ON "subject_question_bank"("question_type");

CREATE INDEX IF NOT EXISTS "idx_subject_question_bank_difficulty"
  ON "subject_question_bank"("difficulty_level");

CREATE TABLE IF NOT EXISTS "subject_exam_questions" (
  "id" serial PRIMARY KEY,
  "subject_exam_id" integer NOT NULL REFERENCES "subject_exams"("id") ON DELETE CASCADE,
  "question_bank_id" integer REFERENCES "subject_question_bank"("id") ON DELETE SET NULL,
  "question_order" integer DEFAULT 1 NOT NULL,
  "question_type" varchar(30) NOT NULL DEFAULT 'multiple_choice',
  "question_text" text NOT NULL,
  "question_text_ar" text,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "correct_answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "marks" numeric(10,2) DEFAULT 1 NOT NULL,
  "rubric" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "source" varchar(20) DEFAULT 'manual' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_subject_exam_questions_exam_id"
  ON "subject_exam_questions"("subject_exam_id");

CREATE INDEX IF NOT EXISTS "idx_subject_exam_questions_bank_id"
  ON "subject_exam_questions"("question_bank_id");

COMMENT ON TABLE "subject_question_bank" IS 'Reusable question bank at subject/class level for instructor assessments';
COMMENT ON TABLE "subject_exam_questions" IS 'Question set attached to a subject exam/assessment';
