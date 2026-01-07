-- Add college_id to attendance table for college scoping
ALTER TABLE "attendance"
ADD COLUMN IF NOT EXISTS "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_attendance_college_id" ON "attendance"("college_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_student_id" ON "attendance"("student_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_class_id" ON "attendance"("class_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_date" ON "attendance"("date");

-- Create class_sessions table for managing class sessions
CREATE TABLE IF NOT EXISTS "class_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
	"college_id" integer NOT NULL REFERENCES "colleges"("id") ON DELETE CASCADE,
	"semester_id" integer REFERENCES "semesters"("id"),
	"session_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"location" varchar(255),
	"room" varchar(100),
	"building" varchar(255),
	"instructor_id" integer REFERENCES "instructors"("id"),
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for class_sessions
CREATE INDEX IF NOT EXISTS "idx_class_sessions_class_id" ON "class_sessions"("class_id");
CREATE INDEX IF NOT EXISTS "idx_class_sessions_college_id" ON "class_sessions"("college_id");
CREATE INDEX IF NOT EXISTS "idx_class_sessions_session_date" ON "class_sessions"("session_date");
CREATE INDEX IF NOT EXISTS "idx_class_sessions_instructor_id" ON "class_sessions"("instructor_id");

-- Add session_id to attendance table to link to class sessions
ALTER TABLE "attendance"
ADD COLUMN IF NOT EXISTS "session_id" integer REFERENCES "class_sessions"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_attendance_session_id" ON "attendance"("session_id");

-- Populate college_id for existing attendance records based on class_id
UPDATE "attendance" a
SET "college_id" = (
  SELECT c.college_id 
  FROM "classes" c 
  WHERE c.id = a.class_id
  LIMIT 1
)
WHERE "college_id" IS NULL;

-- Add comments
COMMENT ON COLUMN "attendance"."college_id" IS 'College this attendance record belongs to. Used for filtering by college.';
COMMENT ON COLUMN "attendance"."session_id" IS 'Optional: Link to the class session this attendance was recorded for.';
COMMENT ON TABLE "class_sessions" IS 'Scheduled class sessions for attendance tracking. Each session belongs to a class and college.';

