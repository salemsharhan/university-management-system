-- Migration: Create Major Sheets (Degree Plan) System
-- This migration creates tables for managing academic degree plans with flexible course groups and rules

-- 1. Major Sheets Table
-- Stores the overall degree plan structure for a major
CREATE TABLE IF NOT EXISTS "major_sheets" (
    "id" serial PRIMARY KEY NOT NULL,
    "major_id" integer NOT NULL REFERENCES "majors"("id") ON DELETE CASCADE,
    "version" varchar(50) NOT NULL, -- e.g., "2024-2025", "v2.1"
    "academic_year" varchar(20) NOT NULL, -- e.g., "2024-2025"
    "effective_from" date NOT NULL,
    "effective_to" date,
    "sheet_type" varchar(20) NOT NULL DEFAULT 'rule_based', -- 'fixed_by_year' or 'rule_based'
    "total_credits_required" integer NOT NULL,
    "min_credits_per_semester" integer DEFAULT 12,
    "max_credits_per_semester" integer DEFAULT 18,
    "min_gpa_for_graduation" numeric(3, 2) DEFAULT 2.0,
    "description" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "major_sheets_major_version_unique" UNIQUE("major_id", "version")
);

CREATE INDEX IF NOT EXISTS "idx_major_sheets_major_id" ON "major_sheets"("major_id");
CREATE INDEX IF NOT EXISTS "idx_major_sheets_version" ON "major_sheets"("version");
CREATE INDEX IF NOT EXISTS "idx_major_sheets_effective_from" ON "major_sheets"("effective_from");

-- 2. Course Groups Table
-- Defines the 5 types of course groups with their rules
CREATE TABLE IF NOT EXISTS "course_groups" (
    "id" serial PRIMARY KEY NOT NULL,
    "major_sheet_id" integer NOT NULL REFERENCES "major_sheets"("id") ON DELETE CASCADE,
    "group_type" varchar(50) NOT NULL, -- 'university_requirements', 'college_requirements', 'major_core', 'major_electives', 'free_electives'
    "group_name_en" varchar(255) NOT NULL,
    "group_name_ar" varchar(255),
    "group_number" integer NOT NULL, -- 1, 2, 3, 4, 5 for ordering
    "min_credits_required" integer NOT NULL,
    "max_credits_allowed" integer,
    "rule_type" varchar(50) NOT NULL DEFAULT 'all_required', -- 'all_required', 'choose_n_from_m', 'flexible'
    "choose_count" integer, -- If rule_type is 'choose_n_from_m', this is N
    "total_options" integer, -- If rule_type is 'choose_n_from_m', this is M
    "allows_substitution" boolean DEFAULT false NOT NULL,
    "requires_approval_for_substitution" boolean DEFAULT true NOT NULL,
    "min_gpa_required" numeric(3, 2), -- Minimum GPA to enroll in courses from this group
    "description" text,
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_course_groups_major_sheet_id" ON "course_groups"("major_sheet_id");
CREATE INDEX IF NOT EXISTS "idx_course_groups_group_type" ON "course_groups"("group_type");
CREATE INDEX IF NOT EXISTS "idx_course_groups_group_number" ON "course_groups"("group_number");

-- 3. Major Sheet Courses Table
-- Links courses to major sheets with specific rules
CREATE TABLE IF NOT EXISTS "major_sheet_courses" (
    "id" serial PRIMARY KEY NOT NULL,
    "major_sheet_id" integer NOT NULL REFERENCES "major_sheets"("id") ON DELETE CASCADE,
    "course_group_id" integer NOT NULL REFERENCES "course_groups"("id") ON DELETE CASCADE,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "is_mandatory" boolean DEFAULT true NOT NULL, -- For rule-based: true = mandatory, false = elective option
    "is_capstone" boolean DEFAULT false NOT NULL, -- Final year / capstone course
    "academic_year" integer, -- For fixed-by-year: Year 1, 2, 3, 4
    "semester_number" integer, -- For fixed-by-year: 1, 2, or 3 (summer)
    "display_order" integer DEFAULT 0,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "major_sheet_courses_unique" UNIQUE("major_sheet_id", "course_group_id", "subject_id")
);

CREATE INDEX IF NOT EXISTS "idx_major_sheet_courses_major_sheet_id" ON "major_sheet_courses"("major_sheet_id");
CREATE INDEX IF NOT EXISTS "idx_major_sheet_courses_course_group_id" ON "major_sheet_courses"("course_group_id");
CREATE INDEX IF NOT EXISTS "idx_major_sheet_courses_subject_id" ON "major_sheet_courses"("subject_id");

-- 4. Prerequisites Table
-- Defines course prerequisites and co-requisites
CREATE TABLE IF NOT EXISTS "course_prerequisites" (
    "id" serial PRIMARY KEY NOT NULL,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "prerequisite_subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "prerequisite_type" varchar(20) NOT NULL DEFAULT 'prerequisite', -- 'prerequisite' or 'co_requisite'
    "requires_grade" varchar(5), -- Minimum grade required (e.g., 'C', 'D')
    "min_gpa" numeric(3, 2), -- Minimum GPA in prerequisite course
    "is_mandatory" boolean DEFAULT true NOT NULL, -- Can this be overridden?
    "description" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "course_prerequisites_unique" UNIQUE("subject_id", "prerequisite_subject_id", "prerequisite_type")
);

CREATE INDEX IF NOT EXISTS "idx_course_prerequisites_subject_id" ON "course_prerequisites"("subject_id");
CREATE INDEX IF NOT EXISTS "idx_course_prerequisites_prerequisite_subject_id" ON "course_prerequisites"("prerequisite_subject_id");

-- 5. Course Substitutions Table
-- Defines approved course substitutions
CREATE TABLE IF NOT EXISTS "course_substitutions" (
    "id" serial PRIMARY KEY NOT NULL,
    "major_sheet_id" integer NOT NULL REFERENCES "major_sheets"("id") ON DELETE CASCADE,
    "original_subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "substitute_subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "substitution_type" varchar(50) NOT NULL DEFAULT 'equivalent', -- 'equivalent', 'transfer', 'curriculum_change'
    "approved_by" integer REFERENCES "users"("id"),
    "approved_at" timestamp with time zone,
    "notes" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "course_substitutions_unique" UNIQUE("major_sheet_id", "original_subject_id", "substitute_subject_id")
);

CREATE INDEX IF NOT EXISTS "idx_course_substitutions_major_sheet_id" ON "course_substitutions"("major_sheet_id");
CREATE INDEX IF NOT EXISTS "idx_course_substitutions_original_subject_id" ON "course_substitutions"("original_subject_id");

-- 6. Student Major Sheet Assignments Table
-- Links students to their specific major sheet version (cohort-based)
CREATE TABLE IF NOT EXISTS "student_major_sheets" (
    "id" serial PRIMARY KEY NOT NULL,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "major_sheet_id" integer NOT NULL REFERENCES "major_sheets"("id") ON DELETE RESTRICT,
    "admission_year" varchar(20) NOT NULL, -- Cohort year
    "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
    "assigned_by" integer REFERENCES "users"("id"),
    "notes" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "student_major_sheets_unique" UNIQUE("student_id", "major_sheet_id", "is_active")
);

CREATE INDEX IF NOT EXISTS "idx_student_major_sheets_student_id" ON "student_major_sheets"("student_id");
CREATE INDEX IF NOT EXISTS "idx_student_major_sheets_major_sheet_id" ON "student_major_sheets"("major_sheet_id");

-- 7. College Course Group Templates Table
-- Pre-defined course group templates at college level (for reusability)
CREATE TABLE IF NOT EXISTS "college_course_group_templates" (
    "id" serial PRIMARY KEY NOT NULL,
    "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
    "is_university_wide" boolean DEFAULT false NOT NULL,
    "group_type" varchar(50) NOT NULL, -- 'university_requirements', 'college_requirements'
    "group_name_en" varchar(255) NOT NULL,
    "group_name_ar" varchar(255),
    "min_credits_required" integer NOT NULL,
    "max_credits_allowed" integer,
    "rule_type" varchar(50) NOT NULL DEFAULT 'all_required',
    "choose_count" integer,
    "total_options" integer,
    "description" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_college_course_group_templates_college_id" ON "college_course_group_templates"("college_id");
CREATE INDEX IF NOT EXISTS "idx_college_course_group_templates_group_type" ON "college_course_group_templates"("group_type");

-- 8. Template Courses Table
-- Courses in college templates
CREATE TABLE IF NOT EXISTS "template_courses" (
    "id" serial PRIMARY KEY NOT NULL,
    "template_id" integer NOT NULL REFERENCES "college_course_group_templates"("id") ON DELETE CASCADE,
    "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "is_mandatory" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "template_courses_unique" UNIQUE("template_id", "subject_id")
);

CREATE INDEX IF NOT EXISTS "idx_template_courses_template_id" ON "template_courses"("template_id");
CREATE INDEX IF NOT EXISTS "idx_template_courses_subject_id" ON "template_courses"("subject_id");

-- Add comments
COMMENT ON TABLE "major_sheets" IS 'Degree plan structures for majors with versioning support';
COMMENT ON TABLE "course_groups" IS 'Course groups (University, College, Major Core, Major Electives, Free Electives) with flexible rules';
COMMENT ON TABLE "major_sheet_courses" IS 'Courses assigned to major sheets within course groups';
COMMENT ON TABLE "course_prerequisites" IS 'Prerequisites and co-requisites for courses';
COMMENT ON TABLE "course_substitutions" IS 'Approved course substitutions for major sheets';
COMMENT ON TABLE "student_major_sheets" IS 'Student assignments to specific major sheet versions (cohort-based)';
COMMENT ON TABLE "college_course_group_templates" IS 'Reusable course group templates at college/university level';
COMMENT ON TABLE "template_courses" IS 'Courses in college course group templates';

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_major_sheets_updated_at BEFORE UPDATE ON major_sheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_groups_updated_at BEFORE UPDATE ON course_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_major_sheet_courses_updated_at BEFORE UPDATE ON major_sheet_courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_prerequisites_updated_at BEFORE UPDATE ON course_prerequisites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_substitutions_updated_at BEFORE UPDATE ON course_substitutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_major_sheets_updated_at BEFORE UPDATE ON student_major_sheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_college_course_group_templates_updated_at BEFORE UPDATE ON college_course_group_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

