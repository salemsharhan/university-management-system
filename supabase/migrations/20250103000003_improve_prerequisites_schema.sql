-- Improve subject_prerequisites and subject_corequisites tables
-- Add unique constraints to prevent duplicate prerequisites/corequisites
-- Add check constraints to prevent self-references
-- Add indexes for better query performance
-- Update foreign key constraints to CASCADE on delete

-- Add unique constraint to subject_prerequisites to prevent duplicates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subject_prerequisites_unique'
    ) THEN
        ALTER TABLE "subject_prerequisites"
        ADD CONSTRAINT "subject_prerequisites_unique" 
        UNIQUE ("subject_id", "prerequisite_subject_id");
    END IF;
END $$;

-- Add unique constraint to subject_corequisites to prevent duplicates
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subject_corequisites_unique'
    ) THEN
        ALTER TABLE "subject_corequisites"
        ADD CONSTRAINT "subject_corequisites_unique" 
        UNIQUE ("subject_id", "corequisite_subject_id");
    END IF;
END $$;

-- Add check constraint to prevent a subject from being its own prerequisite
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subject_prerequisites_no_self_reference'
    ) THEN
        ALTER TABLE "subject_prerequisites"
        ADD CONSTRAINT "subject_prerequisites_no_self_reference" 
        CHECK ("subject_id" != "prerequisite_subject_id");
    END IF;
END $$;

-- Add check constraint to prevent a subject from being its own corequisite
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subject_corequisites_no_self_reference'
    ) THEN
        ALTER TABLE "subject_corequisites"
        ADD CONSTRAINT "subject_corequisites_no_self_reference" 
        CHECK ("subject_id" != "corequisite_subject_id");
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_subject_prerequisites_subject_id" 
ON "subject_prerequisites"("subject_id");

CREATE INDEX IF NOT EXISTS "idx_subject_prerequisites_prerequisite_id" 
ON "subject_prerequisites"("prerequisite_subject_id");

CREATE INDEX IF NOT EXISTS "idx_subject_corequisites_subject_id" 
ON "subject_corequisites"("subject_id");

CREATE INDEX IF NOT EXISTS "idx_subject_corequisites_corequisite_id" 
ON "subject_corequisites"("corequisite_subject_id");

-- Update foreign key constraints to CASCADE on delete for better data integrity
-- Drop existing foreign key constraints
ALTER TABLE "subject_prerequisites"
DROP CONSTRAINT IF EXISTS "subject_prerequisites_subject_id_subjects_id_fk";

ALTER TABLE "subject_prerequisites"
DROP CONSTRAINT IF EXISTS "subject_prerequisites_prerequisite_subject_id_subjects_id_fk";

ALTER TABLE "subject_corequisites"
DROP CONSTRAINT IF EXISTS "subject_corequisites_subject_id_subjects_id_fk";

ALTER TABLE "subject_corequisites"
DROP CONSTRAINT IF EXISTS "subject_corequisites_corequisite_subject_id_subjects_id_fk";

-- Add new foreign key constraints with CASCADE delete
ALTER TABLE "subject_prerequisites"
ADD CONSTRAINT "subject_prerequisites_subject_id_subjects_id_fk" 
FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_prerequisites"
ADD CONSTRAINT "subject_prerequisites_prerequisite_subject_id_subjects_id_fk" 
FOREIGN KEY ("prerequisite_subject_id") REFERENCES "public"."subjects"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_corequisites"
ADD CONSTRAINT "subject_corequisites_subject_id_subjects_id_fk" 
FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subject_corequisites"
ADD CONSTRAINT "subject_corequisites_corequisite_subject_id_subjects_id_fk" 
FOREIGN KEY ("corequisite_subject_id") REFERENCES "public"."subjects"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

