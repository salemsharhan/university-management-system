-- Subject-wise and class-wise materials
-- 1. instructors.can_add_materials: allow instructor to add material for their classes
-- 2. class_materials: instructor-added materials per class

ALTER TABLE "instructors"
ADD COLUMN IF NOT EXISTS "can_add_materials" boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN "instructors"."can_add_materials" IS 'When true, instructor can add materials for their classes when assigned to teach';

-- Class materials: instructor-added materials for a specific class (same structure as subject_materials)
CREATE TABLE IF NOT EXISTS "class_materials" (
  "id" serial PRIMARY KEY NOT NULL,
  "class_id" integer NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
  "subject_id" integer NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
  "content_type_code" varchar(20) NOT NULL REFERENCES "subject_content_types"("code"),
  "title" varchar(255) NOT NULL,
  "title_ar" varchar(255),
  "description" text,
  "description_ar" text,
  "file_url" varchar(500),
  "file_name" varchar(255),
  "file_size" bigint,
  "external_link" varchar(500),
  "display_order" integer DEFAULT 0,
  "is_published" boolean DEFAULT false NOT NULL,
  "published_at" timestamp with time zone,
  "access_level" varchar(20) DEFAULT 'all',
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_class_materials_class_id" ON "class_materials"("class_id");
CREATE INDEX IF NOT EXISTS "idx_class_materials_subject_id" ON "class_materials"("subject_id");

COMMENT ON TABLE "class_materials" IS 'Instructor-added materials for a specific class. Shown alongside subject_materials to students enrolled in that class';
