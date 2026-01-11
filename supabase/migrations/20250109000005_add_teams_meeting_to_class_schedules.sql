-- Add Teams meeting URL and related fields to class_schedules table
-- This allows storing a recurring Teams meeting link for each class schedule entry

ALTER TABLE "class_schedules"
ADD COLUMN IF NOT EXISTS "teams_meeting_url" text,
ADD COLUMN IF NOT EXISTS "teams_meeting_id" varchar(255),
ADD COLUMN IF NOT EXISTS "teams_event_id" varchar(255);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "idx_class_schedules_teams_meeting_id" ON "class_schedules"("teams_meeting_id");
CREATE INDEX IF NOT EXISTS "idx_class_schedules_teams_event_id" ON "class_schedules"("teams_event_id");

-- Add comments for documentation
COMMENT ON COLUMN "class_schedules"."teams_meeting_url" IS 'Microsoft Teams meeting join URL for this recurring schedule entry';
COMMENT ON COLUMN "class_schedules"."teams_meeting_id" IS 'Microsoft Graph online meeting ID';
COMMENT ON COLUMN "class_schedules"."teams_event_id" IS 'Microsoft Graph calendar event ID';

