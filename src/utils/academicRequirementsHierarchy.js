/**
 * Academic requirements appear in three places (department, major, degree plan / major sheet).
 *
 * Runtime (student graduation path, GPA checks): uses major_sheets — total_credits_required,
 * min_gpa_for_graduation, and course_groups. See StudentGraduationPath.
 *
 * Department fields: policy defaults for the unit; not read by student graduation logic.
 * Major fields (majors.total_credits, min_gpa): catalog / reporting; kept aligned when
 * degree plan is saved (ManageMajorSheet).
 */

export const GRADUATION_SOURCE_OF_TRUTH = 'major_sheet'

/**
 * @param {{ total_credits_required?: number|null }|null|undefined} majorSheet
 * @param {{ total_credits?: number|null }|null|undefined} major
 */
export function getGraduationCreditTotal(majorSheet, major) {
  if (majorSheet?.total_credits_required != null && majorSheet.total_credits_required !== '') {
    const n = Number(majorSheet.total_credits_required)
    if (!Number.isNaN(n)) return n
  }
  if (major?.total_credits != null && major.total_credits !== '') {
    const n = Number(major.total_credits)
    if (!Number.isNaN(n)) return n
  }
  return 120
}

/**
 * @param {{ min_gpa_for_graduation?: number|null }|null|undefined} majorSheet
 * @param {{ min_gpa?: number|null }|null|undefined} major
 */
export function getGraduationMinGpa(majorSheet, major) {
  if (majorSheet?.min_gpa_for_graduation != null && majorSheet.min_gpa_for_graduation !== '') {
    const n = Number(majorSheet.min_gpa_for_graduation)
    if (!Number.isNaN(n)) return n
  }
  if (major?.min_gpa != null && major.min_gpa !== '') {
    const n = Number(major.min_gpa)
    if (!Number.isNaN(n)) return n
  }
  return 2.0
}
