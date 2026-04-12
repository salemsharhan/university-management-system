/**
 * Default rubric keys stored in `subject_exams.assessment_settings.rubric_id`.
 * When a `rubrics` (or similar) table exists in Supabase, load options from the DB
 * and merge with or replace this list.
 */
/** Fallback when `rubrics` table is empty or unreachable (offline). */
export const RUBRIC_CATALOG_FALLBACK = [
  { id: '', key: 'rubricOptionNone' },
  { id: 'academic_writing_default', key: 'rubricOptionAcademicWriting' },
  { id: 'oral_presentation_default', key: 'rubricOptionOral' },
]

/** @deprecated Use RUBRIC_CATALOG_FALLBACK */
export const INSTRUCTOR_RUBRIC_CATALOG = RUBRIC_CATALOG_FALLBACK
