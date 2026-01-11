-- Add Microsoft Teams meeting links for classes
-- This allows instructors to create Teams meetings for their classes and students to access them

CREATE TABLE IF NOT EXISTS class_teams_meetings (
    id serial PRIMARY KEY NOT NULL,
    class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id integer NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    instructor_id integer NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    
    -- Meeting details
    meeting_title varchar(255) NOT NULL,
    meeting_description text,
    meeting_date timestamp with time zone NOT NULL,
    meeting_duration_minutes integer DEFAULT 60 NOT NULL,
    
    -- Microsoft Teams/Graph API data
    teams_meeting_id varchar(255) UNIQUE, -- Microsoft Graph event ID
    teams_join_url text, -- Teams meeting join URL
    teams_organizer_email varchar(320) NOT NULL, -- Email of the meeting organizer
    teams_event_id varchar(255), -- Full event ID from Graph API
    
    -- Status
    is_active boolean DEFAULT true NOT NULL,
    is_recurring boolean DEFAULT false NOT NULL,
    recurrence_pattern text, -- JSON string for recurring meetings
    
    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT class_teams_meetings_class_id_fk FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT class_teams_meetings_subject_id_fk FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT class_teams_meetings_instructor_id_fk FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_teams_meetings_class_id ON class_teams_meetings(class_id);
CREATE INDEX IF NOT EXISTS idx_class_teams_meetings_subject_id ON class_teams_meetings(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_teams_meetings_instructor_id ON class_teams_meetings(instructor_id);
CREATE INDEX IF NOT EXISTS idx_class_teams_meetings_meeting_date ON class_teams_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_class_teams_meetings_teams_meeting_id ON class_teams_meetings(teams_meeting_id);
CREATE INDEX IF NOT EXISTS idx_class_teams_meetings_is_active ON class_teams_meetings(is_active);

fofor now directly assign this to the college
-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_class_teams_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_class_teams_meetings_updated_at
BEFORE UPDATE ON class_teams_meetings
FOR EACH ROW
EXECUTE FUNCTION update_class_teams_meetings_updated_at();

-- Add comments
COMMENT ON TABLE class_teams_meetings IS 'Stores Microsoft Teams meeting links for classes. Instructors can create meetings and students can access join links.';
COMMENT ON COLUMN class_teams_meetings.teams_join_url IS 'Teams meeting join URL (e.g., https://teams.microsoft.com/l/meetup-join/...)';
COMMENT ON COLUMN class_teams_meetings.teams_organizer_email IS 'Email address of the meeting organizer (instructor)';
COMMENT ON COLUMN class_teams_meetings.recurrence_pattern IS 'JSON string for recurring meeting patterns (daily, weekly, etc.)';




