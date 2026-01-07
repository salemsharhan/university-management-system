-- Create custom types
CREATE TYPE IF NOT EXISTS "public"."academic_year_status" AS ENUM('active', 'planned', 'completed');
CREATE TYPE IF NOT EXISTS "public"."admission_status" AS ENUM('pending', 'under_review', 'accepted', 'rejected', 'waitlisted');
CREATE TYPE IF NOT EXISTS "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'excused');
CREATE TYPE IF NOT EXISTS "public"."class_status" AS ENUM('active', 'inactive', 'full');
CREATE TYPE IF NOT EXISTS "public"."class_type" AS ENUM('on_campus', 'online', 'hybrid');
CREATE TYPE IF NOT EXISTS "public"."day_of_week" AS ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
CREATE TYPE IF NOT EXISTS "public"."degree_level" AS ENUM('bachelor', 'master', 'phd', 'diploma');
CREATE TYPE IF NOT EXISTS "public"."enrollment_status" AS ENUM('enrolled', 'dropped', 'completed', 'failed', 'withdrawn');
CREATE TYPE IF NOT EXISTS "public"."examination_status" AS ENUM('scheduled', 'ongoing', 'completed', 'cancelled');
CREATE TYPE IF NOT EXISTS "public"."examination_type" AS ENUM('midterm', 'final', 'quiz', 'assignment', 'project');
CREATE TYPE IF NOT EXISTS "public"."faculty_type" AS ENUM('sciences', 'engineering', 'business', 'arts', 'medicine', 'other');
CREATE TYPE IF NOT EXISTS "public"."financial_transaction_status" AS ENUM('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE IF NOT EXISTS "public"."financial_transaction_type" AS ENUM('tuition', 'lab_fee', 'registration', 'library', 'other');
CREATE TYPE IF NOT EXISTS "public"."gender" AS ENUM('male', 'female');
CREATE TYPE IF NOT EXISTS "public"."instructor_status" AS ENUM('active', 'inactive', 'on_leave');
CREATE TYPE IF NOT EXISTS "public"."instructor_title" AS ENUM('professor', 'associate_professor', 'assistant_professor', 'lecturer', 'teaching_assistant');
CREATE TYPE IF NOT EXISTS "public"."role" AS ENUM('user', 'admin', 'instructor', 'student');
CREATE TYPE IF NOT EXISTS "public"."semester_status" AS ENUM('active', 'planned', 'completed', 'registration_open');
CREATE TYPE IF NOT EXISTS "public"."status" AS ENUM('active', 'inactive');
CREATE TYPE IF NOT EXISTS "public"."student_status" AS ENUM('active', 'graduated', 'suspended', 'withdrawn', 'on_probation');
CREATE TYPE IF NOT EXISTS "public"."subject_type" AS ENUM('core', 'elective', 'general');

-- Create colleges table
CREATE TABLE IF NOT EXISTS "colleges" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"abbreviation" varchar(20),
	"official_email" varchar(320),
	"phone_number" varchar(50),
	"website_url" varchar(500),
	"address_en" text,
	"address_ar" text,
	"logo_url" varchar(500),
	"primary_color" varchar(7),
	"secondary_color" varchar(7),
	"student_id_prefix" varchar(10) DEFAULT 'STU',
	"student_id_format" varchar(100) DEFAULT '{prefix}{year}{sequence:D4}',
	"student_id_starting_number" integer DEFAULT 1,
	"instructor_id_prefix" varchar(10) DEFAULT 'INS',
	"instructor_id_format" varchar(100) DEFAULT '{prefix}{year}{sequence:D4}',
	"instructor_id_starting_number" integer DEFAULT 1,
	"academic_settings" jsonb,
	"financial_settings" jsonb,
	"email_settings" jsonb,
	"onboarding_settings" jsonb,
	"system_settings" jsonb,
	"examination_settings" jsonb,
	"status" "status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colleges_code_unique" UNIQUE("code")
);

-- Create users table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"college_id" integer REFERENCES "colleges"("id"),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);

-- Create academic_years table
CREATE TABLE IF NOT EXISTS "academic_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "academic_year_status" DEFAULT 'planned' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"description" text,
	"description_ar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_years_code_unique" UNIQUE("code")
);

-- Create faculties table
CREATE TABLE IF NOT EXISTS "faculties" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"type" "faculty_type" DEFAULT 'other' NOT NULL,
	"dean_id" integer,
	"status" "status" DEFAULT 'active' NOT NULL,
	"description" text,
	"description_ar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faculties_code_unique" UNIQUE("code")
);

-- Create departments table
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"faculty_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"head_id" integer,
	"status" "status" DEFAULT 'active' NOT NULL,
	"description" text,
	"description_ar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code"),
	CONSTRAINT "departments_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action
);

-- Create majors table
CREATE TABLE IF NOT EXISTS "majors" (
	"id" serial PRIMARY KEY NOT NULL,
	"faculty_id" integer NOT NULL,
	"department_id" integer,
	"code" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"degree_level" "degree_level" DEFAULT 'bachelor' NOT NULL,
	"degree_title_en" varchar(255),
	"degree_title_ar" varchar(255),
	"total_credits" integer NOT NULL,
	"core_credits" integer NOT NULL,
	"elective_credits" integer NOT NULL,
	"min_semesters" integer NOT NULL,
	"max_semesters" integer NOT NULL,
	"min_gpa" numeric(3, 2) NOT NULL,
	"tuition_fee" numeric(10, 2),
	"lab_fee" numeric(10, 2),
	"registration_fee" numeric(10, 2),
	"status" "status" DEFAULT 'active' NOT NULL,
	"description" text,
	"description_ar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "majors_code_unique" UNIQUE("code"),
	CONSTRAINT "majors_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "majors_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action
);

-- Create students table
CREATE TABLE IF NOT EXISTS "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"student_id" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(50),
	"date_of_birth" date,
	"gender" "gender",
	"national_id" varchar(50),
	"major_id" integer NOT NULL,
	"college_id" integer NOT NULL REFERENCES "colleges"("id"),
	"enrollment_date" date NOT NULL,
	"expected_graduation_date" date,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"gpa" numeric(3, 2),
	"total_credits_earned" integer DEFAULT 0 NOT NULL,
	"address" text,
	"emergency_contact" varchar(255),
	"emergency_phone" varchar(50),
	"photo" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_student_id_unique" UNIQUE("student_id"),
	CONSTRAINT "students_email_unique" UNIQUE("email"),
	CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "students_major_id_majors_id_fk" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("id") ON DELETE no action ON UPDATE no action
);

-- Create instructors table
CREATE TABLE IF NOT EXISTS "instructors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"employee_id" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(50),
	"department_id" integer NOT NULL,
	"college_id" integer NOT NULL REFERENCES "colleges"("id"),
	"title" "instructor_title" DEFAULT 'lecturer' NOT NULL,
	"specialization" varchar(255),
	"office_location" varchar(255),
	"office_hours" text,
	"status" "instructor_status" DEFAULT 'active' NOT NULL,
	"hire_date" date,
	"photo" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instructors_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "instructors_email_unique" UNIQUE("email"),
	CONSTRAINT "instructors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "instructors_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action
);

-- Create semesters table
CREATE TABLE IF NOT EXISTS "semesters" (
	"id" serial PRIMARY KEY NOT NULL,
	"academic_year_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"registration_start_date" date,
	"registration_end_date" date,
	"status" "semester_status" DEFAULT 'planned' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "semesters_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"major_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"type" "subject_type" DEFAULT 'core' NOT NULL,
	"credit_hours" integer NOT NULL,
	"theory_hours" integer NOT NULL,
	"lab_hours" integer NOT NULL,
	"tutorial_hours" integer NOT NULL,
	"semester_number" integer NOT NULL,
	"lab_fee" numeric(10, 2),
	"material_fee" numeric(10, 2),
	"instructor_name" varchar(255),
	"instructor_email" varchar(320),
	"textbook" text,
	"is_elective" boolean DEFAULT false NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"description" text,
	"description_ar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_code_unique" UNIQUE("code"),
	CONSTRAINT "subjects_major_id_majors_id_fk" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("id") ON DELETE no action ON UPDATE no action
);

-- Create classes table
CREATE TABLE IF NOT EXISTS "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"section" varchar(10) NOT NULL,
	"instructor_id" integer,
	"capacity" integer NOT NULL,
	"enrolled" integer DEFAULT 0 NOT NULL,
	"location" varchar(255),
	"type" "class_type" DEFAULT 'on_campus' NOT NULL,
	"status" "class_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "classes_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"enrollment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "enrollment_status" DEFAULT 'enrolled' NOT NULL,
	"grade" varchar(5),
	"numeric_grade" numeric(5, 2),
	"grade_points" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "enrollments_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE no action ON UPDATE no action
);

-- Create class_schedules table
CREATE TABLE IF NOT EXISTS "class_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"day_of_week" "day_of_week" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"location" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_schedules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollment_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" "attendance_status" NOT NULL,
	"notes" text,
	"recorded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action
);

-- Create examinations table
CREATE TABLE IF NOT EXISTS "examinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"type" "examination_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"location" varchar(255),
	"total_marks" numeric(5, 2) NOT NULL,
	"passing_marks" numeric(5, 2) NOT NULL,
	"weightage" numeric(5, 2) NOT NULL,
	"instructions" text,
	"status" "examination_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "examinations_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action
);

-- Create exam_results table
CREATE TABLE IF NOT EXISTS "exam_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"examination_id" integer NOT NULL,
	"enrollment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"marks_obtained" numeric(5, 2) NOT NULL,
	"grade" varchar(5),
	"remarks" text,
	"submitted_at" timestamp with time zone,
	"graded_by" integer,
	"graded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_results_examination_id_examinations_id_fk" FOREIGN KEY ("examination_id") REFERENCES "public"."examinations"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "exam_results_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "exam_results_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action
);

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS "financial_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"type" "financial_transaction_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "financial_transaction_status" DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"paid_date" date,
	"payment_method" varchar(50),
	"transaction_reference" varchar(100),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_transactions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action
);

-- Create admissions table
CREATE TABLE IF NOT EXISTS "admissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_number" varchar(50) NOT NULL,
	"academic_year_id" integer NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" "gender" NOT NULL,
	"national_id" varchar(50),
	"address" text,
	"first_choice_major_id" integer NOT NULL,
	"second_choice_major_id" integer,
	"third_choice_major_id" integer,
	"high_school_grade" numeric(5, 2),
	"status" "admission_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"application_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admissions_application_number_unique" UNIQUE("application_number"),
	CONSTRAINT "admissions_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "admissions_first_choice_major_id_majors_id_fk" FOREIGN KEY ("first_choice_major_id") REFERENCES "public"."majors"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "admissions_second_choice_major_id_majors_id_fk" FOREIGN KEY ("second_choice_major_id") REFERENCES "public"."majors"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "admissions_third_choice_major_id_majors_id_fk" FOREIGN KEY ("third_choice_major_id") REFERENCES "public"."majors"("id") ON DELETE no action ON UPDATE no action
);

-- Create subject_prerequisites table
CREATE TABLE IF NOT EXISTS "subject_prerequisites" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"prerequisite_subject_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_prerequisites_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "subject_prerequisites_prerequisite_subject_id_subjects_id_fk" FOREIGN KEY ("prerequisite_subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action
);

-- Create subject_corequisites table
CREATE TABLE IF NOT EXISTS "subject_corequisites" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"corequisite_subject_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_corequisites_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "subject_corequisites_corequisite_subject_id_subjects_id_fk" FOREIGN KEY ("corequisite_subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action
);




