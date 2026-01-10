-- Student Lifecycle and Finance Rules System
-- This migration creates comprehensive tables for student status codes, financial milestones,
-- action codes, and workflow rules

-- 1. Student Status Codes Table
CREATE TABLE IF NOT EXISTS "student_status_codes" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(10) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "category" varchar(50) NOT NULL, -- application, review, decision, enrollment, academic, graduation
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Status Transition Reasons (Request Info, Reject Reasons, etc.)
CREATE TABLE IF NOT EXISTS "status_transition_reasons" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(10) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "reason_type" varchar(50) NOT NULL, -- request_info, reject, hold
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Financial Milestones Table
CREATE TABLE IF NOT EXISTS "financial_milestones" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(10) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "percentage_threshold" numeric(5, 2) NOT NULL, -- 0, 10, 30, 60, 90, 100
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Financial Hold Reasons Table
CREATE TABLE IF NOT EXISTS "financial_hold_reasons" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(10) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Student Actions Table (All possible actions)
CREATE TABLE IF NOT EXISTS "student_actions" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(20) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "action_category" varchar(50) NOT NULL, -- academic, enrollment, finance, profile, communication, graduation
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Subject Actions Table (Student and Teacher actions for subjects)
CREATE TABLE IF NOT EXISTS "subject_actions" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(20) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "action_type" varchar(20) NOT NULL, -- student, teacher, both
    "content_type" varchar(50), -- pdf, video, ppt, audio, link, text, recording
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Status Workflow Transitions Table
CREATE TABLE IF NOT EXISTS "status_workflow_transitions" (
    "id" serial PRIMARY KEY NOT NULL,
    "from_status_code" varchar(10) NOT NULL REFERENCES "student_status_codes"("code"),
    "to_status_code" varchar(10) NOT NULL REFERENCES "student_status_codes"("code"),
    "trigger_code" varchar(10) NOT NULL, -- TRSB, TRVF, TRVP, etc.
    "trigger_name_en" varchar(255) NOT NULL,
    "trigger_name_ar" varchar(255) NOT NULL,
    "is_automatic" boolean DEFAULT false NOT NULL,
    "requires_reason" boolean DEFAULT false NOT NULL,
    "reason_type" varchar(50), -- request_info, reject, hold
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. Financial Milestone Actions Table (PMXX → FA_XXX)
CREATE TABLE IF NOT EXISTS "financial_milestone_actions" (
    "id" serial PRIMARY KEY NOT NULL,
    "milestone_code" varchar(10) NOT NULL REFERENCES "financial_milestones"("code"),
    "action_code" varchar(20) NOT NULL REFERENCES "student_actions"("code"),
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("milestone_code", "action_code")
);

-- 9. Financial Hold Actions Table (FHXX → Blocked Actions)
CREATE TABLE IF NOT EXISTS "financial_hold_blocked_actions" (
    "id" serial PRIMARY KEY NOT NULL,
    "hold_reason_code" varchar(10) NOT NULL REFERENCES "financial_hold_reasons"("code"),
    "action_code" varchar(20) NOT NULL REFERENCES "student_actions"("code"),
    "is_blocked" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("hold_reason_code", "action_code")
);

-- 10. Financial Milestone Status Impact Table (PMXX → Status Change)
CREATE TABLE IF NOT EXISTS "financial_milestone_status_impact" (
    "id" serial PRIMARY KEY NOT NULL,
    "milestone_code" varchar(10) NOT NULL REFERENCES "financial_milestones"("code"),
    "target_status_code" varchar(10) NOT NULL REFERENCES "student_status_codes"("code"),
    "is_automatic" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE("milestone_code", "target_status_code")
);

-- 11. Subject Content Types Table
CREATE TABLE IF NOT EXISTS "subject_content_types" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(10) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 12. Homework Status Codes Table
CREATE TABLE IF NOT EXISTS "homework_status_codes" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(10) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 13. Exam Status Codes Table
CREATE TABLE IF NOT EXISTS "exam_status_codes" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(10) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 14. Attendance Action Codes Table
CREATE TABLE IF NOT EXISTS "attendance_action_codes" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(10) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 15. Grades Visibility Control Codes Table
CREATE TABLE IF NOT EXISTS "grades_visibility_codes" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" varchar(10) NOT NULL UNIQUE,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_student_status_codes_category" ON "student_status_codes"("category");
CREATE INDEX IF NOT EXISTS "idx_student_status_codes_code" ON "student_status_codes"("code");
CREATE INDEX IF NOT EXISTS "idx_status_transition_reasons_type" ON "status_transition_reasons"("reason_type");
CREATE INDEX IF NOT EXISTS "idx_financial_milestones_code" ON "financial_milestones"("code");
CREATE INDEX IF NOT EXISTS "idx_student_actions_category" ON "student_actions"("action_category");
CREATE INDEX IF NOT EXISTS "idx_status_workflow_transitions_from" ON "status_workflow_transitions"("from_status_code");
CREATE INDEX IF NOT EXISTS "idx_status_workflow_transitions_to" ON "status_workflow_transitions"("to_status_code");
CREATE INDEX IF NOT EXISTS "idx_financial_milestone_actions_milestone" ON "financial_milestone_actions"("milestone_code");
CREATE INDEX IF NOT EXISTS "idx_financial_milestone_actions_action" ON "financial_milestone_actions"("action_code");

-- Update applications table to use new status code system
ALTER TABLE "applications" 
ADD COLUMN IF NOT EXISTS "status_code" varchar(10) DEFAULT 'APDR',
ADD COLUMN IF NOT EXISTS "status_reason_code" varchar(10),
ADD COLUMN IF NOT EXISTS "financial_milestone_code" varchar(10) DEFAULT 'PM00',
ADD COLUMN IF NOT EXISTS "financial_hold_reason_code" varchar(10),
ADD COLUMN IF NOT EXISTS "status_changed_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "status_changed_by" integer REFERENCES "users"("id");

-- Add indexes for applications
CREATE INDEX IF NOT EXISTS "idx_applications_status_code" ON "applications"("status_code");
CREATE INDEX IF NOT EXISTS "idx_applications_financial_milestone" ON "applications"("financial_milestone_code");

-- Update students table to track financial milestone and status
ALTER TABLE "students"
ADD COLUMN IF NOT EXISTS "current_status_code" varchar(10) DEFAULT 'ENAC',
ADD COLUMN IF NOT EXISTS "financial_milestone_code" varchar(10) DEFAULT 'PM00',
ADD COLUMN IF NOT EXISTS "financial_hold_reason_code" varchar(10),
ADD COLUMN IF NOT EXISTS "status_updated_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "financial_milestone_updated_at" timestamp with time zone;

-- Add indexes for students
CREATE INDEX IF NOT EXISTS "idx_students_status_code" ON "students"("current_status_code");
CREATE INDEX IF NOT EXISTS "idx_students_financial_milestone" ON "students"("financial_milestone_code");

-- Create status change audit log table
CREATE TABLE IF NOT EXISTS "status_change_audit_log" (
    "id" serial PRIMARY KEY NOT NULL,
    "entity_type" varchar(50) NOT NULL, -- application, student
    "entity_id" bigint NOT NULL,
    "from_status_code" varchar(10),
    "to_status_code" varchar(10) NOT NULL,
    "transition_reason_code" varchar(10),
    "trigger_code" varchar(10),
    "triggered_by" integer REFERENCES "users"("id"),
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_status_audit_entity" ON "status_change_audit_log"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_status_audit_created_at" ON "status_change_audit_log"("created_at");

-- Insert Student Status Codes
INSERT INTO "student_status_codes" ("code", "name_en", "name_ar", "category") VALUES
-- Application Statuses
('APDR', 'Application Draft', 'مسودة طلب الالتحاق', 'application'),
('APSB', 'Application Submitted', 'تم إرسال طلب الالتحاق', 'application'),
('APIV', 'Application Invalid', 'طلب غير صالح / بيانات غير صحيحة', 'application'),
('APPN', 'Application Payment Pending', 'رسوم التقديم قيد الانتظار', 'application'),
('APPC', 'Application Payment Confirmed', 'تم تأكيد رسوم التقديم', 'application'),

-- Review Statuses
('RVQU', 'Review Queue', 'في قائمة انتظار المراجعة', 'review'),
('RVIN', 'Under Review', 'تحت المراجعة', 'review'),
('RVHL', 'On Hold (Internal)', 'مُعلّق داخليًا', 'review'),
('RVRI', 'Requesting Additional Info', 'طلب بيانات/مستندات إضافية', 'review'),
('RVRC', 'Info Received from Applicant', 'تم استلام المطلوب من المتقدم', 'review'),
('RVDV', 'Documents Verification', 'تدقيق/تحقق المستندات', 'review'),
('RVIV', 'Interview Required', 'مقابلة مطلوبة', 'review'),
('RVEX', 'Entrance Exam Required', 'اختبار قبول مطلوب', 'review'),

-- Decision Statuses
('DCPN', 'Decision Pending', 'القرار قيد الانتظار', 'decision'),
('DCCA', 'Accepted – Conditional', 'قبول مشروط', 'decision'),
('DCFA', 'Accepted – Final', 'قبول نهائي', 'decision'),
('DCWL', 'Waitlisted', 'قائمة انتظار', 'decision'),
('DCRJ', 'Rejected', 'مرفوض', 'decision'),

-- Enrollment Statuses
('ENPN', 'Enrollment Pending', 'التسجيل قيد الإجراء', 'enrollment'),
('ENCF', 'Enrollment Confirmed', 'تم تأكيد التسجيل', 'enrollment'),
('ENAC', 'Enrolled (Active)', 'تم تسجيله كطالب (نشط)', 'enrollment'),
('ENDF', 'Deferred', 'تأجيل', 'enrollment'),
('ENCA', 'Cancelled by Applicant', 'إلغاء من المتقدم', 'enrollment'),
('ENCU', 'Cancelled by University', 'إلغاء من الجامعة', 'enrollment'),

-- Academic Statuses
('ACAC', 'Academically Active', 'نشط أكاديميًا', 'academic'),
('ACPR', 'Academic Probation', 'إنذار/مراقبة أكاديمية', 'academic'),
('ACSP', 'Academic Suspension', 'إيقاف أكاديمي', 'academic'),
('ACWD', 'Withdrawn', 'منسحب', 'academic'),

-- Graduation Statuses
('GRAD', 'Graduated', 'متخرج', 'graduation'),
('ALUM', 'Alumni', 'خريج/ضمن رابطة الخريجين', 'graduation')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar",
    "category" = EXCLUDED."category";

-- Insert Status Transition Reasons (Request Info)
INSERT INTO "status_transition_reasons" ("code", "name_en", "name_ar", "reason_type") VALUES
('RRID', 'Missing/Invalid ID or Passport', 'نقص/عدم صلاحية الهوية أو الجواز', 'request_info'),
('RRTR', 'Missing Academic Transcript', 'نقص كشف الدرجات/السجل الأكاديمي', 'request_info'),
('RRLG', 'Legal Translation Required', 'مطلوب ترجمة قانونية/معتمدة', 'request_info'),
('RRPH', 'Missing Personal Photo', 'نقص الصورة الشخصية', 'request_info'),
('RRAD', 'Missing/Incorrect Address or Contact', 'نقص/خطأ بيانات العنوان أو التواصل', 'request_info'),
('RRPY', 'Payment Proof Required', 'مطلوب إثبات الدفع', 'request_info'),
('RREQ', 'Qualification Clarification Required', 'مطلوب توضيح المؤهل', 'request_info'),
('RREX', 'Experience Details Required', 'مطلوب تفاصيل الخبرات (إن وجدت)', 'request_info'),
('RRMD', 'Medical Document Required', 'مطلوب تقرير/مستند طبي', 'request_info'),
('RROR', 'Other Documents Required', 'مستندات أخرى مطلوبة', 'request_info')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar",
    "reason_type" = EXCLUDED."reason_type";

-- Insert Status Transition Reasons (Reject)
INSERT INTO "status_transition_reasons" ("code", "name_en", "name_ar", "reason_type") VALUES
('RJAR', 'Admission Requirements Not Met', 'لا يستوفي شروط القبول', 'reject'),
('RJAC', 'Academic Criteria Not Met', 'لا يحقق المعايير الأكاديمية', 'reject'),
('RJDO', 'Documents Not Valid', 'مستندات غير صحيحة/غير معتمدة', 'reject'),
('RJFR', 'Fraud/Misrepresentation', 'تزوير/تضليل في البيانات', 'reject'),
('RJNR', 'No Response After Deadline', 'عدم الرد بعد انتهاء المهلة', 'reject'),
('RJCP', 'Program Capacity Full', 'اكتمال الطاقة الاستيعابية للبرنامج', 'reject'),
('RJPM', 'Payment Not Completed', 'عدم إكمال الدفع', 'reject'),
('RJPL', 'Policy/Compliance Violation', 'مخالفة سياسة/امتثال', 'reject'),
('RJIN', 'Interview Failed', 'عدم اجتياز المقابلة', 'reject'),
('RJEX', 'Entrance Exam Failed', 'عدم اجتياز اختبار القبول', 'reject'),
('RJOT', 'Other Reason', 'سبب آخر', 'reject')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar",
    "reason_type" = EXCLUDED."reason_type";

-- Insert Financial Milestones
INSERT INTO "financial_milestones" ("code", "name_en", "name_ar", "percentage_threshold") VALUES
('PM00', 'No payment received', 'لم يتم استلام أي دفعة', 0.00),
('PM10', 'Initial payment received (registration fee)', 'تم استلام الدفعة الأولى (رسوم التسجيل)', 10.00),
('PM30', '30% of total fees received', 'تم استلام 30٪ من الرسوم', 30.00),
('PM60', '60% of total fees received', 'تم استلام 60٪ من الرسوم', 60.00),
('PM90', '90% of total fees received', 'تم استلام 90٪ من الرسوم', 90.00),
('PM100', 'Full payment completed', 'تم سداد الرسوم بالكامل', 100.00)
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar",
    "percentage_threshold" = EXCLUDED."percentage_threshold";

-- Insert Financial Hold Reasons
INSERT INTO "financial_hold_reasons" ("code", "name_en", "name_ar") VALUES
('FHNP', 'No payment', 'عدم وجود أي دفعة'),
('FHPP', 'Partial payment below required threshold', 'دفعة جزئية أقل من الحد المطلوب'),
('FHOD', 'Overdue payment', 'دفعة متأخرة'),
('FHCH', 'Payment chargeback / reversed', 'استرجاع أو إلغاء عملية الدفع'),
('FHEX', 'Exceeded payment deadline', 'تجاوز الموعد النهائي للسداد')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar";

-- Insert Student Actions
INSERT INTO "student_actions" ("code", "name_en", "name_ar", "action_category") VALUES
-- Academic Actions
('SA_LGN', 'Login to student portal', 'الدخول إلى بوابة الطالب', 'academic'),
('SA_CRS', 'View enrolled courses', 'عرض المقررات المسجلة', 'academic'),
('SA_JCL', 'Join live class (online)', 'الانضمام إلى المحاضرة المباشرة', 'academic'),
('SA_ATT', 'Mark attendance', 'تسجيل الحضور', 'academic'),
('SA_REC', 'View class recordings', 'مشاهدة تسجيلات المحاضرات', 'academic'),
('SA_MAT', 'Access course materials', 'الوصول لمحتوى المقرر', 'academic'),
('SA_ASN', 'View assignments', 'عرض الواجبات', 'academic'),
('SA_SUB', 'Submit assignment', 'تسليم الواجب', 'academic'),
('SA_EXM', 'Join exam', 'دخول الاختبار', 'academic'),
('SA_RST', 'View exam result', 'عرض نتيجة الاختبار', 'academic'),

-- Enrollment Actions
('SE_REG', 'Register semester', 'تسجيل الفصل الدراسي', 'enrollment'),
('SE_ADD', 'Add subject', 'إضافة مقرر', 'enrollment'),
('SE_DRP', 'Drop subject', 'حذف مقرر', 'enrollment'),
('SE_CHG', 'Change section', 'تغيير الشعبة', 'enrollment'),
('SE_WTL', 'Join waitlist', 'الانضمام لقائمة الانتظار', 'enrollment'),
('SE_DEF', 'Request deferment', 'طلب تأجيل', 'enrollment'),
('SE_WDR', 'Request withdrawal', 'طلب انسحاب', 'enrollment'),
('SE_PRG', 'Change program/major', 'طلب تغيير التخصص', 'enrollment'),

-- Finance Actions
('SF_PAY', 'Pay fees', 'سداد الرسوم', 'finance'),
('SF_INS', 'View installment plan', 'عرض خطة الأقساط', 'finance'),
('SF_INV', 'View invoices', 'عرض الفواتير', 'finance'),
('SF_RCP', 'Download receipt', 'تحميل إيصال الدفع', 'finance'),
('SF_BAL', 'View outstanding balance', 'عرض الرصيد المستحق', 'finance'),
('SF_REF', 'Request refund', 'طلب استرداد', 'finance'),
('SF_EXT', 'Request payment extension', 'طلب مهلة سداد', 'finance'),

-- Student Requests
('SR_DOC', 'Request official document', 'طلب مستند رسمي', 'requests'),
('SR_TRN', 'Request transcript', 'طلب كشف درجات', 'requests'),
('SR_CER', 'Request certificate', 'طلب شهادة', 'requests'),
('SR_ID', 'Request student ID', 'طلب بطاقة طالب', 'requests'),
('SR_LTR', 'Request official letter', 'طلب خطاب رسمي', 'requests'),
('SR_EQV', 'Request course equivalency', 'طلب معادلة مقرر', 'requests'),
('SR_COM', 'Submit complaint', 'تقديم شكوى', 'requests'),
('SR_SUP', 'Contact support', 'التواصل مع الدعم', 'requests'),

-- Profile Actions
('SP_PRF', 'Update profile information', 'تحديث البيانات الشخصية', 'profile'),
('SP_CNT', 'Update contact details', 'تحديث بيانات التواصل', 'profile'),
('SP_DOC', 'Upload personal documents', 'رفع المستندات الشخصية', 'profile'),
('SP_PWD', 'Change password', 'تغيير كلمة المرور', 'profile'),
('SP_SEC', 'Manage security settings', 'إدارة إعدادات الأمان', 'profile'),

-- Communication Actions
('SC_MSG', 'Send message to instructor', 'إرسال رسالة للمحاضر', 'communication'),
('SC_NOT', 'View notifications', 'عرض الإشعارات', 'communication'),
('SC_CAL', 'View academic calendar', 'عرض التقويم الأكاديمي', 'communication'),
('SC_EVT', 'Join academic event', 'المشاركة في فعالية', 'communication'),
('SC_SUR', 'Fill survey / feedback', 'تعبئة استبيان / تقييم', 'communication'),

-- Graduation Actions
('SG_GRD', 'Apply for graduation', 'التقديم على التخرج', 'graduation'),
('SG_CLR', 'Request financial clearance', 'طلب إخلاء طرف مالي', 'graduation'),
('SG_CER', 'Download graduation certificate', 'تحميل شهادة التخرج', 'graduation'),
('SG_ALM', 'Join alumni network', 'الانضمام لشبكة الخريجين', 'graduation'),
('SG_JOB', 'Access career services', 'الوصول لخدمات التوظيف', 'graduation')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar",
    "action_category" = EXCLUDED."action_category";

-- Insert Subject Actions (Student)
INSERT INTO "subject_actions" ("code", "name_en", "name_ar", "action_type") VALUES
('SS_VIEW', 'View subject overview', 'عرض صفحة المقرر', 'student'),
('SS_MATL', 'View learning materials', 'عرض المواد التعليمية', 'student'),
('SS_DOWN', 'Download materials', 'تحميل المواد', 'student'),
('SS_REC', 'View recorded lectures', 'مشاهدة المحاضرات المسجلة', 'student'),
('SS_JOIN', 'Join live class', 'الانضمام إلى المحاضرة', 'student'),
('SS_ATT', 'View attendance record', 'عرض سجل الحضور', 'student'),
('SS_HWV', 'View homework', 'عرض الواجبات', 'student'),
('SS_HWS', 'Submit homework', 'تسليم الواجب', 'student'),
('SS_HWU', 'Update homework submission', 'تعديل تسليم الواجب', 'student'),
('SS_EXAM', 'Join exam', 'دخول الاختبار', 'student'),
('SS_EXVR', 'View exam result', 'عرض نتيجة الاختبار', 'student'),
('SS_GRAD', 'View grades', 'عرض الدرجات', 'student'),
('SS_FEED', 'View instructor feedback', 'عرض ملاحظات المحاضر', 'student'),
('SS_FOR', 'Participate in discussion forum', 'المشاركة في منتدى المقرر', 'student'),
('SS_QNA', 'Ask question about subject', 'طرح سؤال حول المقرر', 'student'),
('SS_SYL', 'View syllabus', 'عرض توصيف المقرر', 'student')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar",
    "action_type" = EXCLUDED."action_type";

-- Insert Subject Actions (Teacher)
INSERT INTO "subject_actions" ("code", "name_en", "name_ar", "action_type") VALUES
('TS_VIEW', 'View assigned subjects', 'عرض المقررات المسندة', 'teacher'),
('TS_PLAN', 'Manage subject plan', 'إدارة خطة المقرر', 'teacher'),
('TS_SYL', 'Create/update syllabus', 'إنشاء / تحديث توصيف المقرر', 'teacher'),
('TS_MATL', 'Add learning materials', 'إضافة مواد تعليمية', 'teacher'),
('TS_EDIT', 'Edit materials', 'تعديل المواد', 'teacher'),
('TS_DEL', 'Delete materials', 'حذف المواد', 'teacher'),
('TS_REC', 'Upload lecture recording', 'رفع تسجيل محاضرة', 'teacher'),
('TS_HWCR', 'Create homework', 'إنشاء واجب', 'teacher'),
('TS_HWED', 'Edit homework', 'تعديل الواجب', 'teacher'),
('TS_HWCL', 'Close homework submission', 'إغلاق تسليم الواجب', 'teacher'),
('TS_GRHW', 'Grade homework', 'تصحيح الواجب', 'teacher'),
('TS_EXCR', 'Create exam', 'إنشاء اختبار', 'teacher'),
('TS_EXED', 'Edit exam', 'تعديل الاختبار', 'teacher'),
('TS_EXSC', 'Schedule exam', 'جدولة اختبار', 'teacher'),
('TS_EXCL', 'Close exam', 'إغلاق الاختبار', 'teacher'),
('TS_GREX', 'Grade exam', 'تصحيح الاختبار', 'teacher'),
('TS_ATTM', 'Take attendance', 'تسجيل الحضور', 'teacher'),
('TS_ATTE', 'Edit attendance', 'تعديل الحضور', 'teacher'),
('TS_GRUP', 'Upload grades', 'رفع الدرجات', 'teacher'),
('TS_FEED', 'Provide feedback', 'إضافة ملاحظات', 'teacher'),
('TS_FOR', 'Moderate discussion forum', 'إدارة منتدى النقاش', 'teacher')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar",
    "action_type" = EXCLUDED."action_type";

-- Insert Subject Content Types
INSERT INTO "subject_content_types" ("code", "name_en", "name_ar") VALUES
('CT_PDF', 'PDF document', 'ملف PDF'),
('CT_VID', 'Video lecture', 'محاضرة فيديو'),
('CT_PPT', 'Presentation slides', 'عرض تقديمي'),
('CT_AUD', 'Audio content', 'محتوى صوتي'),
('CT_LNK', 'External resource link', 'رابط خارجي'),
('CT_TXT', 'Text content', 'محتوى نصي'),
('CT_REC', 'Class recording', 'تسجيل محاضرة')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar";

-- Insert Homework Status Codes
INSERT INTO "homework_status_codes" ("code", "name_en", "name_ar") VALUES
('HW_DRF', 'Homework draft', 'مسودة واجب'),
('HW_PUB', 'Homework published', 'واجب منشور'),
('HW_SUB', 'Homework submitted', 'تم تسليم الواجب'),
('HW_LATE', 'Late submission', 'تسليم متأخر'),
('HW_CLD', 'Submission closed', 'إغلاق التسليم'),
('HW_GRD', 'Homework graded', 'تم تصحيح الواجب'),
('HW_RTN', 'Returned with feedback', 'معاد مع ملاحظات')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar";

-- Insert Exam Status Codes
INSERT INTO "exam_status_codes" ("code", "name_en", "name_ar") VALUES
('EX_DRF', 'Exam draft', 'مسودة اختبار'),
('EX_SCH', 'Exam scheduled', 'اختبار مجدول'),
('EX_OPN', 'Exam open', 'اختبار مفتوح'),
('EX_SUB', 'Exam submitted', 'تم تسليم الاختبار'),
('EX_CLS', 'Exam closed', 'اختبار مغلق'),
('EX_GRD', 'Exam graded', 'تم تصحيح الاختبار'),
('EX_REL', 'Results released', 'تم نشر النتائج')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar";

-- Insert Attendance Action Codes
INSERT INTO "attendance_action_codes" ("code", "name_en", "name_ar") VALUES
('AT_AUTO', 'Automatic attendance (online)', 'حضور تلقائي (أونلاين)'),
('AT_MAN', 'Manual attendance', 'حضور يدوي'),
('AT_PRE', 'Present', 'حاضر'),
('AT_ABS', 'Absent', 'غائب'),
('AT_LATE', 'Late', 'متأخر'),
('AT_EXC', 'Excused absence', 'غياب بعذر')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar";

-- Insert Grades Visibility Control Codes
INSERT INTO "grades_visibility_codes" ("code", "name_en", "name_ar") VALUES
('GV_HID', 'Grades hidden', 'الدرجات مخفية'),
('GV_TMP', 'Grades visible temporarily', 'الدرجات ظاهرة مؤقتًا'),
('GV_REL', 'Grades released', 'تم نشر الدرجات'),
('GV_FIN', 'Final grades locked', 'تثبيت الدرجات النهائية')
ON CONFLICT ("code") DO UPDATE SET
    "name_en" = EXCLUDED."name_en",
    "name_ar" = EXCLUDED."name_ar";

-- Insert Financial Milestone Actions (PM10 → Actions)
INSERT INTO "financial_milestone_actions" ("milestone_code", "action_code", "is_enabled") VALUES
('PM10', 'SA_LGN', true),
('PM10', 'SA_CRS', true),
('PM30', 'SA_ATT', true),
('PM30', 'SE_REG', true),
('PM60', 'SA_EXM', true),
('PM100', 'SA_RST', true),
('PM100', 'SR_CER', true),
('PM100', 'SR_TRN', true)
ON CONFLICT ("milestone_code", "action_code") DO UPDATE SET "is_enabled" = EXCLUDED."is_enabled";

-- Insert Financial Hold Blocked Actions
INSERT INTO "financial_hold_blocked_actions" ("hold_reason_code", "action_code", "is_blocked") VALUES
('FHNP', 'SA_ATT', true),
('FHPP', 'SA_EXM', true),
('FHOD', 'SA_RST', true),
('FHOD', 'SR_CER', true),
('FHCH', 'SA_LGN', true),
('FHCH', 'SA_CRS', true),
('FHCH', 'SA_ATT', true),
('FHCH', 'SA_EXM', true),
('FHCH', 'SA_RST', true)
ON CONFLICT ("hold_reason_code", "action_code") DO UPDATE SET "is_blocked" = EXCLUDED."is_blocked";

-- Insert Financial Milestone Status Impact
INSERT INTO "financial_milestone_status_impact" ("milestone_code", "target_status_code", "is_automatic") VALUES
('PM00', 'RVHL', true),
('PM10', 'ENAC', true),
('PM100', 'ACAC', true)
ON CONFLICT ("milestone_code", "target_status_code") DO UPDATE SET "is_automatic" = EXCLUDED."is_automatic";

-- Insert Status Workflow Transitions
INSERT INTO "status_workflow_transitions" ("from_status_code", "to_status_code", "trigger_code", "trigger_name_en", "trigger_name_ar", "is_automatic", "requires_reason") VALUES
('APDR', 'APSB', 'TRSB', 'Applicant submitted application', 'المتقدم أرسل الطلب', false, false),
('APSB', 'APIV', 'TRVF', 'Auto validation failed', 'فشل التحقق التلقائي', true, false),
('APSB', 'APPN', 'TRPW', 'Payment required (fee check)', 'الرسوم مطلوبة (تحقق الرسوم)', true, false),
('APSB', 'RVQU', 'TRVP', 'Auto validation passed', 'نجح التحقق التلقائي', true, false),
('APPN', 'APPC', 'TRWH', 'Payment webhook received', 'استلام إشعار بوابة الدفع', true, false),
('APPC', 'RVQU', 'TRPC', 'Payment confirmed / reconciled', 'تم تأكيد/مطابقة الدفع', true, false),
('RVQU', 'RVIN', 'TRAS', 'Auto assigned to reviewer', 'توزيع تلقائي لمراجع', true, false),
('RVIN', 'RVRI', 'TRRQ', 'Reviewer requested info', 'المراجع طلب بيانات', false, true),
('RVRI', 'RVRC', 'TRUP', 'Applicant uploaded requested items', 'المتقدم رفع المطلوب', false, false),
('RVRC', 'RVDV', 'TRDV', 'Document verification started', 'بدء التحقق من المستندات', true, false),
('RVDV', 'DCPN', 'TRDA', 'Documents approved (pass)', 'اعتماد المستندات', true, false),
('RVIN', 'RVIV', 'TRIV', 'Interview required flagged', 'تحديد مقابلة مطلوبة', true, false),
('RVIN', 'RVEX', 'TREX', 'Exam required flagged', 'تحديد اختبار مطلوب', true, false),
('RVIN', 'RVHL', 'TRHL', 'Internal hold applied', 'تطبيق تعليق داخلي', true, false),
('RVHL', 'RVIN', 'TRHR', 'Internal hold released', 'رفع التعليق الداخلي', false, false),
('DCPN', 'DCCA', 'TRAC', 'Accepted (conditional) decided', 'قرار قبول مشروط', false, false),
('DCCA', 'DCFA', 'TRAF', 'Accepted (final) confirmed', 'تأكيد قبول نهائي', true, false),
('DCPN', 'DCWL', 'TRWL', 'Waitlist decided', 'قرار قائمة انتظار', false, false),
('DCPN', 'DCRJ', 'TRRJ', 'Rejected decided', 'قرار رفض', false, true),
('DCFA', 'ENPN', 'TROA', 'Offer accepted by applicant', 'قبول العرض من المتقدم', false, false),
('ENPN', 'ENCF', 'TRER', 'Enrollment requirements met', 'استيفاء متطلبات التسجيل', true, false),
('ENCF', 'ENAC', 'TRRA', 'Registrar activated enrollment', 'تفعيل التسجيل من القبول والتسجيل', false, false),
('ENAC', 'ACAC', 'TRSS', 'Semester started', 'بدء الفصل', true, false),
('ACAC', 'ACPR', 'TRGP', 'GPA rule triggered', 'تفعيل قاعدة المعدل', true, false),
('ACPR', 'ACSP', 'TRPE', 'Probation escalated', 'تصعيد الإنذار', true, false),
('ACAC', 'GRAD', 'TRGA', 'Graduation audit passed', 'اجتياز تدقيق التخرج', true, false),
('GRAD', 'ALUM', 'TRAL', 'Alumni sync completed', 'اكتمال ترحيل الخريجين', true, false)
ON CONFLICT DO NOTHING;

-- Create trigger function for status changes audit log
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.status_code IS DISTINCT FROM NEW.status_code OR OLD.current_status_code IS DISTINCT FROM NEW.current_status_code) THEN
        INSERT INTO status_change_audit_log (
            entity_type,
            entity_id,
            from_status_code,
            to_status_code,
            created_at
        ) VALUES (
            CASE 
                WHEN TG_TABLE_NAME = 'applications' THEN 'application'
                WHEN TG_TABLE_NAME = 'students' THEN 'student'
                ELSE 'unknown'
            END,
            NEW.id,
            COALESCE(OLD.status_code, OLD.current_status_code),
            COALESCE(NEW.status_code, NEW.current_status_code),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for applications and students
DROP TRIGGER IF EXISTS trigger_log_application_status_change ON applications;
CREATE TRIGGER trigger_log_application_status_change
    AFTER UPDATE ON applications
    FOR EACH ROW
    WHEN (OLD.status_code IS DISTINCT FROM NEW.status_code)
    EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS trigger_log_student_status_change ON students;
CREATE TRIGGER trigger_log_student_status_change
    AFTER UPDATE ON students
    FOR EACH ROW
    WHEN (OLD.current_status_code IS DISTINCT FROM NEW.current_status_code)
    EXECUTE FUNCTION log_status_change();

-- Add comments
COMMENT ON TABLE "student_status_codes" IS 'Student lifecycle status codes with categories';
COMMENT ON TABLE "status_transition_reasons" IS 'Reasons for status transitions (request info, reject, etc.)';
COMMENT ON TABLE "financial_milestones" IS 'Financial payment milestones (0%, 10%, 30%, 60%, 90%, 100%)';
COMMENT ON TABLE "financial_hold_reasons" IS 'Reasons for financial holds that block actions';
COMMENT ON TABLE "student_actions" IS 'All possible student portal actions by category';
COMMENT ON TABLE "subject_actions" IS 'Subject/course level actions for students and teachers';
COMMENT ON TABLE "status_workflow_transitions" IS 'Valid status transitions with triggers';
COMMENT ON TABLE "financial_milestone_actions" IS 'Actions enabled by financial milestones';
COMMENT ON TABLE "financial_hold_blocked_actions" IS 'Actions blocked by financial holds';
COMMENT ON TABLE "financial_milestone_status_impact" IS 'Status changes triggered by financial milestones';
COMMENT ON TABLE "subject_content_types" IS 'Types of content that can be uploaded for subjects';
COMMENT ON TABLE "homework_status_codes" IS 'Homework lifecycle status codes';
COMMENT ON TABLE "exam_status_codes" IS 'Exam lifecycle status codes';
COMMENT ON TABLE "attendance_action_codes" IS 'Attendance recording action codes';
COMMENT ON TABLE "grades_visibility_codes" IS 'Grade visibility control codes';
COMMENT ON TABLE "status_change_audit_log" IS 'Audit trail for all status changes';



