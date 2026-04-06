/** Shared question types for question bank, assessments, and filters (i18n keys under instructorPortal.*). */
export const QUESTION_TYPE_OPTIONS = [
  { value: 'multiple_choice', key: 'multipleChoice' },
  { value: 'true_false', key: 'trueFalse' },
  { value: 'matching', key: 'matching' },
  { value: 'order', key: 'order' },
  { value: 'fill_blank', key: 'fillBlank' },
  { value: 'short_answer', key: 'shortAnswer' },
  { value: 'essay', key: 'essay' },
  { value: 'numeric', key: 'numeric' },
  { value: 'file_upload', key: 'fileUpload' },
]

/** Includes "All types" for bank filters. */
export const QUESTION_TYPES_WITH_ALL = [{ value: '', key: 'allTypes' }, ...QUESTION_TYPE_OPTIONS]
