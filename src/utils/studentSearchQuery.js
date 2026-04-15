/**
 * PostgREST `.or()` filter for searching students by university ID, names,
 * email, phone, mobile, and national ID. Returns null if the term is too short.
 */
export function buildStudentSearchOrFilter(rawTerm) {
  const term = (rawTerm || '').trim()
  if (term.length < 2) return null
  const p = `%${term}%`
  return [
    `student_id.ilike.${p}`,
    `name_en.ilike.${p}`,
    `name_ar.ilike.${p}`,
    `first_name.ilike.${p}`,
    `last_name.ilike.${p}`,
    `first_name_ar.ilike.${p}`,
    `last_name_ar.ilike.${p}`,
    `email.ilike.${p}`,
    `phone.ilike.${p}`,
    `mobile_phone.ilike.${p}`,
    `national_id.ilike.${p}`,
  ].join(',')
}
