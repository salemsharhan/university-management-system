/**
 * Semester fields needed for instructor portal (lifecycle + admin master flags).
 */
export const INSTRUCTOR_SEMESTER_SELECT =
  'id, name_en, name_ar, code, start_date, status, course_registration_allowed, add_drop_allowed, withdrawal_allowed, grade_entry_allowed, attendance_editing_allowed, late_registration_allowed'

/**
 * Lists distinct semesters where the instructor has at least one active class
 * (any college). Falls back to recent semesters in the instructor's home college
 * when they have no class assignments yet.
 */
export async function fetchSemestersForInstructor(supabase, { instructorId, collegeId }) {
  if (!instructorId) return []

  const { data: fromClasses, error } = await supabase
    .from('classes')
    .select(`semester_id, semesters (${INSTRUCTOR_SEMESTER_SELECT})`)
    .eq('instructor_id', instructorId)
    .eq('status', 'active')

  if (error) {
    console.error('fetchSemestersForInstructor (classes):', error)
  }

  const byId = new Map()
  for (const row of fromClasses || []) {
    const s = row.semesters
    if (s?.id != null) byId.set(s.id, s)
  }

  let list = [...byId.values()].sort(
    (a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0)
  )

  if (!list.length && collegeId) {
    const { data: collegeSem, error: semErr } = await supabase
      .from('semesters')
      .select(INSTRUCTOR_SEMESTER_SELECT)
      .eq('college_id', collegeId)
      .order('start_date', { ascending: false })
      .limit(12)

    if (semErr) console.error('fetchSemestersForInstructor (fallback):', semErr)
    list = collegeSem || []
  }

  return list
}

/** Prefer a “live” teaching term when picking a default dashboard semester. */
export function pickPreferredSemesterForDashboard(semesterList) {
  if (!semesterList?.length) return null
  const preferredStatuses = new Set([
    'active',
    'registration_open',
    'in_progress',
    'scheduled',
    'registration_closed',
    'ending',
  ])
  const hit = semesterList.find((s) => preferredStatuses.has(s.status))
  return hit || semesterList[0]
}
