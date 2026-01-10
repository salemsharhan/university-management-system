-- Subject Actions and Content Management System
-- This migration creates all tables needed for subject actions, content, homework, and exams

-- 1. Subject Actions Tables
CREATE TABLE IF NOT EXISTS "subject_actions" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(20) UNIQUE NOT NULL,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "action_type" varchar(20) NOT NULL, -- 'student' or 'teacher'
    "category" varchar(50), -- 'view', 'material', 'homework', 'exam', 'attendance', 'grade', etc.
    "description_en" text,
    "description_ar" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add missing columns if table already exists but columns are missing (for existing installations)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subject_actions') THEN
        -- Add category column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'subject_actions' AND column_name = 'category'
        ) THEN
            ALTER TABLE "subject_actions" ADD COLUMN "category" varchar(50);
            COMMENT ON COLUMN "subject_actions"."category" IS 'Category of action: view, material, homework, exam, attendance, grade, etc.';
        END IF;

        -- Add description_en column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'subject_actions' AND column_name = 'description_en'
        ) THEN
            ALTER TABLE "subject_actions" ADD COLUMN "description_en" text;
            COMMENT ON COLUMN "subject_actions"."description_en" IS 'Description of the action in English';
        END IF;

        -- Add description_ar column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'subject_actions' AND column_name = 'description_ar'
        ) THEN
            ALTER TABLE "subject_actions" ADD COLUMN "description_ar" text;
            COMMENT ON COLUMN "subject_actions"."description_ar" IS 'Description of the action in Arabic';
        END IF;

        -- Add action_type column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'subject_actions' AND column_name = 'action_type'
        ) THEN
            ALTER TABLE "subject_actions" ADD COLUMN "action_type" varchar(20);
            COMMENT ON COLUMN "subject_actions"."action_type" IS 'Type of action: student or teacher';
        END IF;

        -- Add is_active column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'subject_actions' AND column_name = 'is_active'
        ) THEN
            ALTER TABLE "subject_actions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
            COMMENT ON COLUMN "subject_actions"."is_active" IS 'Whether this action is currently active';
        END IF;

        -- Add created_at column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'subject_actions' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE "subject_actions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
        END IF;

        -- Add updated_at column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'subject_actions' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE "subject_actions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
        END IF;
    END IF;
END $$;

-- 2. Subject Content Types
CREATE TABLE IF NOT EXISTS "subject_content_types" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(20) UNIQUE NOT NULL,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "icon" varchar(50), -- Icon name for UI
    "mime_types" text[], -- Array of allowed mime types
    "max_file_size" bigint, -- Max file size in bytes
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Subject Materials/Content
CREATE TABLE IF NOT EXISTS "subject_materials" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "content_type_code" varchar(20) NOT NULL REFERENCES "subject_content_types"("code"),
    "title" varchar(255) NOT NULL,
    "title_ar" varchar(255),
    "description" text,
    "description_ar" text,
    "file_url" varchar(500), -- URL to stored file
    "file_name" varchar(255),
    "file_size" bigint,
    "external_link" varchar(500), -- For CT_LNK type
    "display_order" integer DEFAULT 0,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "access_level" varchar(20) DEFAULT 'all', -- 'all', 'students', 'instructors'
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Subject Homework
CREATE TABLE IF NOT EXISTS "subject_homework" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "class_id" integer REFERENCES "classes"("id") ON DELETE SET NULL,
    "title" varchar(255) NOT NULL,
    "title_ar" varchar(255),
    "description" text NOT NULL,
    "description_ar" text,
    "instructions" text,
    "instructions_ar" text,
    "attachment_url" varchar(500), -- Assignment file/attachment
    "total_points" numeric(10, 2) NOT NULL DEFAULT 100,
    "weight_percentage" numeric(5, 2) DEFAULT 0,
    "status" varchar(20) DEFAULT 'HW_DRF' NOT NULL, -- HW_DRF, HW_PUB, HW_CLD, etc.
    "due_date" timestamp with time zone NOT NULL,
    "allow_late_submission" boolean DEFAULT false,
    "late_penalty_percentage" numeric(5, 2) DEFAULT 0,
    "created_by" integer NOT NULL REFERENCES "users"("id"),
    "published_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Homework Submissions
CREATE TABLE IF NOT EXISTS "homework_submissions" (
    "id" serial PRIMARY KEY NOT NULL,
    "homework_id" integer NOT NULL REFERENCES "subject_homework"("id") ON DELETE CASCADE,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "enrollment_id" integer NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
    "submission_text" text,
    "attachment_url" varchar(500), -- Submitted file
    "file_name" varchar(255),
    "file_size" bigint,
    "status" varchar(20) DEFAULT 'HW_SUB' NOT NULL, -- HW_SUB, HW_LATE, HW_GRD, HW_RTN
    "points_earned" numeric(10, 2),
    "grade" varchar(10),
    "feedback" text,
    "feedback_ar" text,
    "graded_by" integer REFERENCES "users"("id"),
    "graded_at" timestamp with time zone,
    "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("homework_id", "student_id")
);

-- 6. Subject Exams (enhanced from existing)
CREATE TABLE IF NOT EXISTS "subject_exams" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "class_id" integer REFERENCES "classes"("id") ON DELETE SET NULL,
    "examination_id" integer REFERENCES "examinations"("id") ON DELETE SET NULL, -- Link to existing examinations table
    "title" varchar(255) NOT NULL,
    "title_ar" varchar(255),
    "description" text,
    "description_ar" text,
    "exam_type" varchar(50) NOT NULL, -- midterm, final, quiz, assignment, project
    "status" varchar(20) DEFAULT 'EX_DRF' NOT NULL, -- EX_DRF, EX_SCH, EX_OPN, EX_CLS, EX_GRD, EX_REL
    "scheduled_date" date NOT NULL,
    "start_time" time NOT NULL,
    "end_time" time NOT NULL,
    "duration_minutes" integer, -- Calculated or manual
    "location" varchar(255),
    "online_link" varchar(500), -- For online exams
    "total_points" numeric(10, 2) NOT NULL DEFAULT 100,
    "passing_points" numeric(10, 2),
    "weight_percentage" numeric(5, 2) DEFAULT 0,
    "instructions" text,
    "instructions_ar" text,
    "allow_calculator" boolean DEFAULT false,
    "allow_notes" boolean DEFAULT false,
    "created_by" integer NOT NULL REFERENCES "users"("id"),
    "published_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "results_released_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Exam Submissions (separate from exam_results for subject-level tracking)
CREATE TABLE IF NOT EXISTS "exam_submissions" (
    "id" serial PRIMARY KEY NOT NULL,
    "exam_id" integer NOT NULL REFERENCES "subject_exams"("id") ON DELETE CASCADE,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "enrollment_id" integer NOT NULL REFERENCES "enrollments"("id") ON DELETE CASCADE,
    "submission_data" jsonb, -- For structured exam answers (questions, answers, etc.)
    "attachment_url" varchar(500), -- For file-based submissions
    "status" varchar(20) DEFAULT 'EX_SUB' NOT NULL, -- EX_SUB, EX_GRD, etc.
    "points_earned" numeric(10, 2),
    "grade" varchar(10),
    "feedback" text,
    "feedback_ar" text,
    "graded_by" integer REFERENCES "users"("id"),
    "graded_at" timestamp with time zone,
    "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("exam_id", "student_id")
);

-- 8. Subject Attendance Rules
CREATE TABLE IF NOT EXISTS "subject_attendance_rules" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "attendance_method" varchar(20) DEFAULT 'AT_MAN' NOT NULL, -- AT_AUTO, AT_MAN
    "auto_mark_present_after_minutes" integer, -- For online classes (auto attendance)
    "allow_excused_absence" boolean DEFAULT true,
    "max_absences" integer, -- Maximum allowed absences before penalty
    "max_absences_percentage" numeric(5, 2), -- Percentage-based
    "penalty_on_max_absences" varchar(100), -- What happens when max absences reached
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("subject_id")
);

-- 9. Subject Grades Visibility Rules
CREATE TABLE IF NOT EXISTS "subject_grades_visibility" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "visibility_status" varchar(20) DEFAULT 'GV_HID' NOT NULL, -- GV_HID, GV_TMP, GV_REL, GV_FIN
    "release_date" timestamp with time zone, -- When to release grades (GV_TMP or GV_REL)
    "hide_after_date" timestamp with time zone, -- For GV_TMP (temporary visibility)
    "final_lock_date" timestamp with time zone, -- When to lock final grades (GV_FIN)
    "requires_payment_completion" boolean DEFAULT false, -- Hide until full payment (PM100)
    "notes" text,
    "updated_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("subject_id")
);

-- 10. Subject Action Permissions (which actions are enabled for this subject)
CREATE TABLE IF NOT EXISTS "subject_action_permissions" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "action_code" varchar(20) NOT NULL REFERENCES "subject_actions"("code"),
    "is_enabled" boolean DEFAULT true NOT NULL,
    "enabled_by_status_codes" varchar(10)[], -- Array of student status codes that enable this
    "enabled_by_finance_milestones" varchar(10)[], -- Array of finance milestone codes (PM10, PM30, etc.)
    "enabled_by_payment_completion" boolean DEFAULT false, -- Requires PM100
    "requires_exam_status" varchar(20), -- Requires specific exam status (EX_OPN, etc.)
    "requires_homework_status" varchar(20), -- Requires specific homework status (HW_PUB, etc.)
    "start_date" timestamp with time zone, -- Action available from this date
    "end_date" timestamp with time zone, -- Action available until this date
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("subject_id", "action_code")
);

-- 11. Subject Syllabus/Plan
CREATE TABLE IF NOT EXISTS "subject_syllabus" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "version" integer DEFAULT 1 NOT NULL,
    "syllabus_content" text NOT NULL,
    "syllabus_content_ar" text,
    "topics" jsonb, -- Array of topics with details
    "learning_objectives" text,
    "learning_objectives_ar" text,
    "assessment_methods" text,
    "assessment_methods_ar" text,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" integer NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 12. Subject Discussion Forum (simple implementation)
CREATE TABLE IF NOT EXISTS "subject_forum_posts" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "parent_post_id" integer REFERENCES "subject_forum_posts"("id") ON DELETE CASCADE, -- For replies
    "posted_by_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "posted_by_student_id" integer REFERENCES "students"("id") ON DELETE SET NULL,
    "posted_by_instructor_id" integer REFERENCES "instructors"("id") ON DELETE SET NULL,
    "title" varchar(255),
    "content" text NOT NULL,
    "content_ar" text,
    "is_pinned" boolean DEFAULT false,
    "is_locked" boolean DEFAULT false,
    "reply_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 13. Subject Questions & Answers (Q&A)
CREATE TABLE IF NOT EXISTS "subject_questions" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "asked_by_student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "question_text" text NOT NULL,
    "question_text_ar" text,
    "answer_text" text,
    "answer_text_ar" text,
    "answered_by_instructor_id" integer REFERENCES "instructors"("id"),
    "answered_at" timestamp with time zone,
    "is_public" boolean DEFAULT true, -- If false, only visible to asker and instructor
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 14. Subject Recorded Lectures
CREATE TABLE IF NOT EXISTS "subject_recordings" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "class_session_id" integer REFERENCES "class_sessions"("id") ON DELETE SET NULL,
    "title" varchar(255) NOT NULL,
    "title_ar" varchar(255),
    "description" text,
    "recording_url" varchar(500) NOT NULL, -- Video URL
    "duration_minutes" integer,
    "thumbnail_url" varchar(500),
    "recorded_date" date NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "access_level" varchar(20) DEFAULT 'all', -- 'all', 'students', 'instructors'
    "uploaded_by" integer NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert default subject actions (Student Actions)
INSERT INTO "subject_actions" ("code", "name_en", "name_ar", "action_type", "category", "description_en", "description_ar") VALUES
('SS_VIEW', 'View subject overview', 'عرض صفحة المقرر', 'student', 'view', 'View the subject main page with overview information', 'عرض الصفحة الرئيسية للمقرر مع معلومات عامة'),
('SS_MATL', 'View learning materials', 'عرض المواد التعليمية', 'student', 'material', 'Access and view learning materials', 'الوصول إلى وعرض المواد التعليمية'),
('SS_DOWN', 'Download materials', 'تحميل المواد', 'student', 'material', 'Download learning materials', 'تحميل المواد التعليمية'),
('SS_REC', 'View recorded lectures', 'مشاهدة المحاضرات المسجلة', 'student', 'recording', 'Watch recorded class sessions', 'مشاهدة جلسات المحاضرات المسجلة'),
('SS_JOIN', 'Join live class', 'الانضمام إلى المحاضرة', 'student', 'class', 'Join a live online class session', 'الانضمام إلى جلسة محاضرة مباشرة'),
('SS_ATT', 'View attendance record', 'عرض سجل الحضور', 'student', 'attendance', 'View personal attendance record for this subject', 'عرض سجل الحضور الشخصي لهذا المقرر'),
('SS_HWV', 'View homework', 'عرض الواجبات', 'student', 'homework', 'View assigned homework', 'عرض الواجبات المخصصة'),
('SS_HWS', 'Submit homework', 'تسليم الواجب', 'student', 'homework', 'Submit homework assignment', 'تسليم الواجب'),
('SS_HWU', 'Update homework submission', 'تعديل تسليم الواجب', 'student', 'homework', 'Update or resubmit homework', 'تحديث أو إعادة تسليم الواجب'),
('SS_EXAM', 'Join exam', 'دخول الاختبار', 'student', 'exam', 'Take an exam', 'أداء اختبار'),
('SS_EXVR', 'View exam result', 'عرض نتيجة الاختبار', 'student', 'exam', 'View exam results and grades', 'عرض نتائج ودرجات الاختبار'),
('SS_GRAD', 'View grades', 'عرض الدرجات', 'student', 'grade', 'View all grades for this subject', 'عرض جميع الدرجات لهذا المقرر'),
('SS_FEED', 'View instructor feedback', 'عرض ملاحظات المحاضر', 'student', 'feedback', 'View feedback from instructor', 'عرض ملاحظات المحاضر'),
('SS_FOR', 'Participate in discussion forum', 'المشاركة في منتدى المقرر', 'student', 'forum', 'Post and reply in subject forum', 'النشر والرد في منتدى المقرر'),
('SS_QNA', 'Ask question about subject', 'طرح سؤال حول المقرر', 'student', 'question', 'Ask questions to instructor', 'طرح أسئلة للمحاضر'),
('SS_SYL', 'View syllabus', 'عرض توصيف المقرر', 'student', 'syllabus', 'View subject syllabus and course plan', 'عرض توصيف المقرر وخطة الدورة')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar",
    "action_type" = EXCLUDED."action_type",
    "category" = EXCLUDED."category",
    "description_en" = EXCLUDED."description_en",
    "description_ar" = EXCLUDED."description_ar",
    "is_active" = COALESCE(EXCLUDED."is_active", "subject_actions"."is_active", true),
    "updated_at" = now();

-- Insert Teacher Actions
INSERT INTO "subject_actions" ("code", "name_en", "name_ar", "action_type", "category", "description_en", "description_ar") VALUES
('TS_VIEW', 'View assigned subjects', 'عرض المقررات المسندة', 'teacher', 'view', 'View list of assigned subjects', 'عرض قائمة المقررات المسندة'),
('TS_PLAN', 'Manage subject plan', 'إدارة خطة المقرر', 'teacher', 'plan', 'Create and manage subject teaching plan', 'إنشاء وإدارة خطة تدريس المقرر'),
('TS_SYL', 'Create/update syllabus', 'إنشاء / تحديث توصيف المقرر', 'teacher', 'syllabus', 'Create or update subject syllabus', 'إنشاء أو تحديث توصيف المقرر'),
('TS_MATL', 'Add learning materials', 'إضافة مواد تعليمية', 'teacher', 'material', 'Upload and manage learning materials', 'رفع وإدارة المواد التعليمية'),
('TS_EDIT', 'Edit materials', 'تعديل المواد', 'teacher', 'material', 'Edit existing learning materials', 'تعديل المواد التعليمية الموجودة'),
('TS_DEL', 'Delete materials', 'حذف المواد', 'teacher', 'material', 'Delete learning materials', 'حذف المواد التعليمية'),
('TS_REC', 'Upload lecture recording', 'رفع تسجيل محاضرة', 'teacher', 'recording', 'Upload recorded lecture sessions', 'رفع تسجيلات جلسات المحاضرات'),
('TS_HWCR', 'Create homework', 'إنشاء واجب', 'teacher', 'homework', 'Create new homework assignment', 'إنشاء واجب جديد'),
('TS_HWED', 'Edit homework', 'تعديل واجب', 'teacher', 'homework', 'Edit existing homework', 'تعديل واجب موجود'),
('TS_HWCL', 'Close homework submission', 'إغلاق تسليم الواجب', 'teacher', 'homework', 'Close homework submission period', 'إغلاق فترة تسليم الواجب'),
('TS_GRHW', 'Grade homework', 'تصحيح الواجب', 'teacher', 'homework', 'Grade student homework submissions', 'تصحيح تسليمات الواجب للطلاب'),
('TS_EXCR', 'Create exam', 'إنشاء اختبار', 'teacher', 'exam', 'Create new exam', 'إنشاء اختبار جديد'),
('TS_EXED', 'Edit exam', 'تعديل اختبار', 'teacher', 'exam', 'Edit existing exam', 'تعديل اختبار موجود'),
('TS_EXSC', 'Schedule exam', 'جدولة اختبار', 'teacher', 'exam', 'Schedule exam date and time', 'جدولة تاريخ ووقت الاختبار'),
('TS_EXCL', 'Close exam', 'إغلاق الاختبار', 'teacher', 'exam', 'Close exam and stop submissions', 'إغلاق الاختبار وإيقاف التسليمات'),
('TS_GREX', 'Grade exam', 'تصحيح الاختبار', 'teacher', 'exam', 'Grade student exam submissions', 'تصحيح تسليمات اختبار الطلاب'),
('TS_ATTM', 'Take attendance', 'تسجيل الحضور', 'teacher', 'attendance', 'Record student attendance', 'تسجيل حضور الطلاب'),
('TS_ATTE', 'Edit attendance', 'تعديل الحضور', 'teacher', 'attendance', 'Edit attendance records', 'تعديل سجلات الحضور'),
('TS_GRUP', 'Upload grades', 'رفع الدرجات', 'teacher', 'grade', 'Upload or enter student grades', 'رفع أو إدخال درجات الطلاب'),
('TS_FEED', 'Provide feedback', 'إضافة ملاحظات', 'teacher', 'feedback', 'Provide feedback to students', 'إضافة ملاحظات للطلاب'),
('TS_FOR', 'Moderate discussion forum', 'إدارة منتدى النقاش', 'teacher', 'forum', 'Moderate subject discussion forum', 'إدارة منتدى مناقشة المقرر')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar",
    "action_type" = EXCLUDED."action_type",
    "category" = EXCLUDED."category",
    "description_en" = EXCLUDED."description_en",
    "description_ar" = EXCLUDED."description_ar",
    "is_active" = COALESCE(EXCLUDED."is_active", "subject_actions"."is_active", true),
    "updated_at" = now();

-- Insert Content Types
INSERT INTO "subject_content_types" ("code", "name_en", "name_ar", "icon", "mime_types") VALUES
('CT_PDF', 'PDF document', 'ملف PDF', 'FileText', ARRAY['application/pdf']),
('CT_VID', 'Video lecture', 'محاضرة فيديو', 'Video', ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
('CT_PPT', 'Presentation slides', 'عرض تقديمي', 'Presentation', ARRAY['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
('CT_AUD', 'Audio content', 'محتوى صوتي', 'Headphones', ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg']),
('CT_LNK', 'External resource link', 'رابط خارجي', 'Link', NULL),
('CT_TXT', 'Text content', 'محتوى نصي', 'FileText', ARRAY['text/plain', 'text/markdown']),
('CT_REC', 'Class recording', 'تسجيل محاضرة', 'Video', ARRAY['video/mp4', 'video/webm'])
ON CONFLICT ("code") DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_subject_materials_subject_id" ON "subject_materials"("subject_id");
CREATE INDEX IF NOT EXISTS "idx_subject_materials_content_type" ON "subject_materials"("content_type_code");
CREATE INDEX IF NOT EXISTS "idx_subject_homework_subject_id" ON "subject_homework"("subject_id");
CREATE INDEX IF NOT EXISTS "idx_subject_homework_status" ON "subject_homework"("status");
CREATE INDEX IF NOT EXISTS "idx_homework_submissions_homework_id" ON "homework_submissions"("homework_id");
CREATE INDEX IF NOT EXISTS "idx_homework_submissions_student_id" ON "homework_submissions"("student_id");
CREATE INDEX IF NOT EXISTS "idx_subject_exams_subject_id" ON "subject_exams"("subject_id");
CREATE INDEX IF NOT EXISTS "idx_subject_exams_status" ON "subject_exams"("status");
CREATE INDEX IF NOT EXISTS "idx_exam_submissions_exam_id" ON "exam_submissions"("exam_id");
CREATE INDEX IF NOT EXISTS "idx_exam_submissions_student_id" ON "exam_submissions"("student_id");
CREATE INDEX IF NOT EXISTS "idx_subject_action_permissions_subject_id" ON "subject_action_permissions"("subject_id");
CREATE INDEX IF NOT EXISTS "idx_subject_action_permissions_action_code" ON "subject_action_permissions"("action_code");
CREATE INDEX IF NOT EXISTS "idx_subject_forum_posts_subject_id" ON "subject_forum_posts"("subject_id");
CREATE INDEX IF NOT EXISTS "idx_subject_questions_subject_id" ON "subject_questions"("subject_id");
CREATE INDEX IF NOT EXISTS "idx_subject_recordings_subject_id" ON "subject_recordings"("subject_id");

-- Add columns to subjects table for enhanced configuration
ALTER TABLE "subjects"
ADD COLUMN IF NOT EXISTS "syllabus_content" text,
ADD COLUMN IF NOT EXISTS "syllabus_content_ar" text,
ADD COLUMN IF NOT EXISTS "attendance_rules" jsonb DEFAULT '{"method": "AT_MAN", "allow_excused": true}'::jsonb,
ADD COLUMN IF NOT EXISTS "grades_visibility_status" varchar(20) DEFAULT 'GV_HID',
ADD COLUMN IF NOT EXISTS "allowed_student_actions" varchar(20)[] DEFAULT ARRAY[]::varchar(20)[],
ADD COLUMN IF NOT EXISTS "allowed_teacher_actions" varchar(20)[] DEFAULT ARRAY[]::varchar(20)[];

-- Comments for documentation
COMMENT ON TABLE "subject_actions" IS 'Catalog of all available subject actions for students and teachers';
COMMENT ON TABLE "subject_content_types" IS 'Types of content that can be uploaded to subjects';
COMMENT ON TABLE "subject_materials" IS 'Learning materials and content for subjects';
COMMENT ON TABLE "subject_homework" IS 'Homework assignments for subjects';
COMMENT ON TABLE "homework_submissions" IS 'Student submissions for homework';
COMMENT ON TABLE "subject_exams" IS 'Exams for subjects (enhanced from examinations table)';
COMMENT ON TABLE "exam_submissions" IS 'Student exam submissions';
COMMENT ON TABLE "subject_attendance_rules" IS 'Attendance rules specific to each subject';
COMMENT ON TABLE "subject_grades_visibility" IS 'Rules controlling when grades are visible to students';
COMMENT ON TABLE "subject_action_permissions" IS 'Permissions for which actions are enabled based on status, finance, etc.';


