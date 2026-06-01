import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { getLocalizedName } from './localizedName'
import { getNationalityLabel } from './nationalities'
import { formatGenderLabel } from './formatGenderLabel'

const ENROLLMENT_SELECT = `
  id,
  enrollment_date,
  status,
  grade,
  numeric_grade,
  grade_points,
  semester_id,
  student_id,
  class_id,
  students(
    id,
    student_id,
    first_name,
    middle_name,
    last_name,
    name_en,
    name_ar,
    first_name_ar,
    middle_name_ar,
    last_name_ar,
    email,
    phone,
    mobile_phone,
    gender,
    nationality,
    date_of_birth,
    status,
    majors(id, name_en, name_ar, code),
    colleges(id, name_en, name_ar, code)
  ),
  classes(
    id,
    code,
    section,
    class_schedules(day_of_week, start_time, end_time, location),
    subjects(id, code, name_en, name_ar, credit_hours),
    instructors(id, name_en, name_ar)
  ),
  semesters(id, name_en, name_ar, code, start_date)
`

function cell(value) {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value).trim()
}

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString().slice(0, 10)
}

function studentDisplayName(s, isArabic) {
  if (!s) return ''
  const localized = getLocalizedName(s, isArabic)
  if (localized) return localized
  const parts = isArabic
    ? [s.first_name_ar, s.middle_name_ar, s.last_name_ar]
    : [s.first_name, s.middle_name, s.last_name]
  const joined = parts.filter(Boolean).join(' ')
  if (joined) return joined
  return s.name_en || s.name_ar || ''
}

function scheduleSummary(schedules) {
  if (!schedules?.length) return ''
  return schedules
    .map((sc) => {
      const day = sc.day_of_week || ''
      const start = sc.start_time ? String(sc.start_time).slice(0, 5) : ''
      const end = sc.end_time ? String(sc.end_time).slice(0, 5) : ''
      const loc = sc.location || ''
      return [day, start && end ? `${start}-${end}` : start, loc].filter(Boolean).join(' ')
    })
    .join('; ')
}

export function getEnrollmentExportColumnDefs(isArabic) {
  const L = (en, ar) => (isArabic ? ar : en)

  return [
    { header: L('Student ID', 'رقم الطالب'), get: (e) => e.students?.student_id },
    { header: L('Student name', 'اسم الطالب'), get: (e) => studentDisplayName(e.students, isArabic) },
    { header: L('Email', 'البريد'), get: (e) => e.students?.email },
    { header: L('Phone', 'الهاتف'), get: (e) => e.students?.phone },
    { header: L('Mobile', 'الجوال'), get: (e) => e.students?.mobile_phone || e.students?.phone },
    {
      header: L('Gender', 'الجنس'),
      get: (e) => formatGenderLabel(e.students?.gender, isArabic),
    },
    {
      header: L('Nationality', 'الجنسية'),
      get: (e) => getNationalityLabel(e.students?.nationality, isArabic),
    },
    { header: L('College', 'الكلية'), get: (e) => getLocalizedName(e.students?.colleges, isArabic) },
    { header: L('Major', 'التخصص'), get: (e) => getLocalizedName(e.students?.majors, isArabic) },
    { header: L('Major code', 'رمز التخصص'), get: (e) => e.students?.majors?.code },
    { header: L('Semester', 'الفصل'), get: (e) => getLocalizedName(e.semesters, isArabic) || e.semesters?.code },
    { header: L('Course code', 'رمز المقرر'), get: (e) => e.classes?.subjects?.code || e.classes?.code },
    {
      header: L('Course name', 'اسم المقرر'),
      get: (e) => getLocalizedName(e.classes?.subjects, isArabic) || e.classes?.subjects?.code,
    },
    { header: L('Class section', 'الشعبة'), get: (e) => e.classes?.section },
    { header: L('Class code', 'رمز الشعبة'), get: (e) => e.classes?.code },
    { header: L('Credit hours', 'الساعات'), get: (e) => e.classes?.subjects?.credit_hours },
    {
      header: L('Instructor', 'المحاضر'),
      get: (e) => getLocalizedName(e.classes?.instructors, isArabic),
    },
    {
      header: L('Schedule', 'الجدول'),
      get: (e) => scheduleSummary(e.classes?.class_schedules),
    },
    { header: L('Enrollment date', 'تاريخ التسجيل'), get: (e) => formatDate(e.enrollment_date) },
    { header: L('Enrollment status', 'حالة التسجيل'), get: (e) => e.status },
    { header: L('Grade', 'الدرجة'), get: (e) => e.grade },
    { header: L('Numeric grade', 'الدرجة الرقمية'), get: (e) => e.numeric_grade },
    { header: L('Grade points', 'نقاط الدرجة'), get: (e) => e.grade_points },
  ]
}

export async function fetchEnrollmentsForExport({ studentIds, semesterId, status, collegeId }) {
  if (!studentIds?.length && !collegeId) return []

  let ids = studentIds
  if (!ids?.length && collegeId) {
    const { data: sts, error: stErr } = await supabase.from('students').select('id').eq('college_id', collegeId)
    if (stErr) throw stErr
    ids = (sts || []).map((s) => s.id)
    if (!ids.length) return []
  }

  const all = []
  const chunkSize = 80
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    let query = supabase.from('enrollments').select(ENROLLMENT_SELECT).in('student_id', chunk)

    if (semesterId && semesterId !== 'all') {
      query = query.eq('semester_id', parseInt(semesterId, 10))
    }
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    query = query.order('semester_id', { ascending: false }).order('student_id', { ascending: true })

    const { data, error } = await query
    if (error) throw error
    all.push(...(data || []))
  }

  return all
}

export function buildEnrollmentExportRows(enrollments, isArabic) {
  const cols = getEnrollmentExportColumnDefs(isArabic)
  const headers = cols.map((c) => c.header)
  const rows = (enrollments || []).map((e) => cols.map((col) => cell(col.get(e))))
  return { headers, rows }
}

function downloadExcel({ headers, rows, filename, sheetName }) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

function downloadCsv({ headers, rows, filename }) {
  const escape = (v) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportEnrollmentRecords(enrollments, isArabic, format = 'xlsx') {
  const { headers, rows } = buildEnrollmentExportRows(enrollments, isArabic)
  const stamp = new Date().toISOString().slice(0, 10)
  const base = `student-course-enrollments-${stamp}`

  if (format === 'csv') {
    downloadCsv({ headers, rows, filename: `${base}.csv` })
  } else {
    downloadExcel({ headers, rows, filename: `${base}.xlsx`, sheetName: 'Enrollments' })
  }
  return enrollments?.length || 0
}

/**
 * Export one row per course registration (student enrolled in a class).
 */
export async function exportStudentEnrollmentsList({
  studentIds,
  semesterId = 'all',
  status = 'enrolled',
  collegeId = null,
  isArabic = false,
  format = 'xlsx',
}) {
  const enrollments = await fetchEnrollmentsForExport({ studentIds, semesterId, status, collegeId })
  return exportEnrollmentRecords(enrollments, isArabic, format)
}
