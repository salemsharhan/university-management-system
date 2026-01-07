-- Add foreign key constraint for instructor_id in classes table
ALTER TABLE "classes"
ADD CONSTRAINT "classes_instructor_id_instructors_id_fk" 
FOREIGN KEY ("instructor_id") 
REFERENCES "public"."instructors"("id") 
ON DELETE SET NULL 
ON UPDATE NO ACTION;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_classes_instructor_id" ON "classes"("instructor_id");



