import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateStudentId } from '../utils/createStudentFromApplication'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Trash2, Lock } from 'lucide-react'

// Column mapping: Excel header (Arabic or English) or 0-based index -> field key
const EXCEL_COLUMNS = [
  { key: 'academic_year_label', index: 0, headers: ['السنة الدراسية', 'Academic Year'] },
  { key: 'student_id', index: 1, headers: ['رقم الطالب الجامعي', 'Student ID', 'University Student Number'] },
  { key: 'name_ar', index: 2, headers: ['اسم الطالب (الطالبة) باللغة العربية', 'Student Name (Arabic)', 'Name (Arabic)'] },
  { key: 'name_en', index: 3, headers: ['Student Name (English)', 'اسم الطالب بالإنجليزية'] },
  { key: 'date_of_birth', index: 4, headers: ['تاريخ الميلاد', 'Date of Birth'] },
  { key: 'nationality', index: 5, headers: ['الجنسية', 'Nationality'] },
  { key: 'passport_or_id', index: 6, headers: ['رقم جواز السفر / رقم الهوية', 'Passport/ID Number'] },
  { key: 'id_type', index: 7, headers: ['نوع الهوية', 'ID Type'] },
  { key: 'email', index: 8, headers: ['البريد الإلكتروني', 'Email'] },
  { key: 'phone', index: 9, headers: ['رقم الهاتف', 'Phone'] },
  { key: 'whatsapp', index: 10, headers: ['رقم الواتساب', 'WhatsApp'] },
  { key: 'country', index: 11, headers: ['الدولة المقيم (المقيمة) بها', 'Country of Residence'] },
  { key: 'address', index: 12, headers: ['محل الإقامة', 'Address'] },
  { key: 'education_level', index: 13, headers: ['أعلى مستوى تعليمي قبل التقدم للدراسة', 'Education Level'] },
  { key: 'certificate_name', index: 14, headers: ['اسم الشهادة', 'Certificate Name'] },
  { key: 'high_school_name', index: 15, headers: ['اسم الجهة الدراسية', 'Institution Name'] },
  { key: 'graduation_year', index: 16, headers: ['سنة التخرج', 'Graduation Year'] },
  { key: 'high_school_gpa', index: 17, headers: ['المعدل العام / المعدل التراكمي للمواد الدراسية', 'GPA', 'Cumulative GPA'] },
  { key: 'high_school_country', index: 18, headers: ['الدولة التي حصل (حصلت) منها على الشهادة', 'Country of Certificate'] },
  { key: 'college_old', index: 19, headers: ['الكلية', 'College'] },
  { key: 'college', index: 20, headers: ['الكلية (الجديدة)', 'College (New)', 'New College'] },
  { key: 'major', index: 21, headers: ['التخصص', 'Major'] },
  { key: 'student_status', index: 22, headers: ['حالة الطالب (الطالبة)', 'Student Status'] },
  { key: 'current_level', index: 23, headers: ['المستوى أو الفصل الدراسي الحالي', 'Current Level'] },
  { key: 'notes', index: 29, headers: ['ملاحظات الشئون الطلابية', 'Notes'] },
]

function normalizeHeader(s) {
  if (s == null || typeof s !== 'string') return ''
  return String(s).replace(/\s+/g, ' ').trim()
}

function parseRow(row, headerMap) {
  const get = (key) => {
    const idx = headerMap[key]
    if (idx == null) return ''
    const v = row[idx]
    if (v == null) return ''
    if (typeof v === 'number' && !Number.isFinite(v)) return ''
    return String(v).trim()
  }
  return EXCEL_COLUMNS.reduce((acc, { key }) => {
    acc[key] = get(key)
    return acc
  }, {})
}

function buildHeaderMap(firstRow) {
  const map = {}
  const normalizedFirst = firstRow.map((c) => normalizeHeader(c))
  EXCEL_COLUMNS.forEach(({ key, index, headers }) => {
    const headerSet = new Set(headers.map(normalizeHeader))
    const idx = normalizedFirst.findIndex((h) => headerSet.has(h) || h === key)
    map[key] = idx >= 0 ? idx : index
  })
  return map
}

function parseExcelDate(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number' && Number.isFinite(val)) {
    try {
      const d = XLSX.SSF.parse_date_code(val)
      if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    } catch (_) {}
  }
  const s = String(val).trim()
  if (!s) return null
  const dmys = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  const ymds = s.match(/^(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (dmys) {
    const [, d, m, y] = dmys
    const year = y.length === 2 ? (parseInt(y) < 50 ? 2000 + parseInt(y) : 1900 + parseInt(y)) : parseInt(y)
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (ymds) {
    const [, y, m, d] = ymds
    const year = y.length === 2 ? (parseInt(y) < 50 ? 2000 + parseInt(y) : 1900 + parseInt(y)) : parseInt(y)
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function slug(str) {
  const s = String(str)
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return s || 'item'
}

export default function UploadStudents() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  const canCreateCollege = userRole === 'admin'
  const findOrCreateCollege = useCallback(async (collegeName, allowCreate = true) => {
    const name = collegeName?.trim()
    if (!name) return { id: null, created: false }
    const { data: existing } = await supabase
      .from('colleges')
      .select('id, name_en, name_ar')
      .or(`name_en.ilike.%${name}%,name_ar.ilike.%${name}%`)
      .limit(1)
      .maybeSingle()
    if (existing) return { id: existing.id, created: false }
    if (!allowCreate || !canCreateCollege) return { id: null, created: false }
    const codeBase = slug(name).slice(0, 20) || 'COL'
    let code = codeBase
    let attempts = 0
    while (attempts < 100) {
      const { data: conflict } = await supabase.from('colleges').select('id').eq('code', code).maybeSingle()
      if (!conflict) break
      code = `${codeBase}-${attempts + 1}`
      attempts++
    }
    const { data: created, error: insertErr } = await supabase
      .from('colleges')
      .insert({
        code,
        name_en: name,
        name_ar: name,
        status: 'active',
      })
      .select('id')
      .single()
    if (insertErr) throw insertErr
    return { id: created.id, created: true }
  }, [canCreateCollege])

  const findOrCreateMajor = useCallback(async (majorName, collegeId) => {
    const name = majorName?.trim()
    if (!name || !collegeId) return { id: null, created: false }
    const { data: existing } = await supabase
      .from('majors')
      .select('id')
      .eq('college_id', collegeId)
      .or(`name_en.ilike.%${name}%,name_ar.ilike.%${name}%`)
      .limit(1)
      .maybeSingle()
    if (existing) return { id: existing.id, created: false }
    const codeBase = slug(name).slice(0, 25) || 'MAJ'
    let code = `${codeBase}-${collegeId}`
    let attempts = 0
    while (attempts < 100) {
      const { data: conflict } = await supabase.from('majors').select('id').eq('code', code).maybeSingle()
      if (!conflict) break
      code = `${codeBase}-${collegeId}-${attempts + 1}`
      attempts++
    }
    const { data: created, error: insertErr } = await supabase
      .from('majors')
      .insert({
        code,
        name_en: name,
        name_ar: name,
        college_id: collegeId,
        is_university_wide: false,
        degree_level: 'bachelor',
        total_credits: 120,
        core_credits: 90,
        elective_credits: 30,
        min_semesters: 8,
        max_semesters: 10,
        min_gpa: 2.0,
        status: 'active',
        major_status: 'active',
      })
      .select('id')
      .single()
    if (insertErr) throw insertErr
    return { id: created.id, created: true }
  }, [])

  const isSectionHeaderRow = (row) => {
    const nameAr = (row.name_ar || '').trim()
    const nameEn = (row.name_en || '').trim()
    const college = (row.college || '').trim()
    if (!nameAr && !nameEn && !college) return true
    if (nameAr && (nameAr.includes('كلية') && nameAr.includes(':'))) return true
    if (nameEn && nameEn.length > 80) return true
    return false
  }

  const handleResetAllStudents = async () => {
    if (!resetPassword.trim()) {
      setResetError(t('uploadStudents.enterPassword', 'Enter your password'))
      return
    }
    setResetLoading(true)
    setResetError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setResetError(t('uploadStudents.sessionExpired', 'Session expired. Please sign in again.'))
        return
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: resetPassword.trim(),
      })
      if (signInError) {
        setResetError(t('uploadStudents.wrongPassword', 'Incorrect password'))
        return
      }
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_all_students_and_references')
      if (rpcError) {
        setResetError(rpcError.message || t('uploadStudents.resetFailed', 'Reset failed'))
        return
      }
      const res = rpcData && typeof rpcData === 'object' ? rpcData : {}
      if (res.ok === false && res.error) {
        setResetError(res.error)
        return
      }
      setResetModalOpen(false)
      setResetPassword('')
      setResult({ resetDone: true, studentsDeleted: res.students_deleted })
    } catch (err) {
      setResetError(err.message || t('uploadStudents.resetFailed', 'Reset failed'))
    } finally {
      setResetLoading(false)
    }
  }

  const handleFile = (f) => {
    if (!f) return
    const name = (f.name || '').toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError(t('uploadStudents.invalidFileType', 'Please upload an Excel file (.xlsx or .xls)'))
      return
    }
    setFile(f)
    setError('')
    setResult(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError(t('uploadStudents.selectFile', 'Please select an Excel file'))
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    const summary = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      collegesCreated: 0,
      majorsCreated: 0,
      skipReasons: {
        sectionHeader: 0,
        noCollegeOrMajor: 0,
        noName: 0,
        collegeNotFound: 0,
        majorNotFound: 0,
        otherCollege: 0,
        duplicateEmail: 0,
      },
      skipDetails: [], // { row: number, reason: string } for first 100
    }
    const collegeCache = {}
    const majorCache = {}
    const addSkip = (reason, rowIndex) => {
      summary.skipped++
      summary.skipReasons[reason] = (summary.skipReasons[reason] || 0) + 1
      if (summary.skipDetails.length < 100) {
        summary.skipDetails.push({ row: rowIndex + 2, reason })
      }
    }

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', raw: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error(t('uploadStudents.noSheet', 'No sheet found in file'))
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (!rows.length) throw new Error(t('uploadStudents.emptySheet', 'Sheet is empty'))
      const headerMap = buildHeaderMap(rows[0])
      const dataRows = rows.slice(1)

      for (let i = 0; i < dataRows.length; i++) {
        const row = parseRow(dataRows[i], headerMap)
        if (isSectionHeaderRow(row)) {
          addSkip('sectionHeader', i)
          continue
        }
        const collegeName = row.college || row.college_old
        const majorName = row.major
        if (!collegeName?.trim() || !majorName?.trim()) {
          addSkip('noCollegeOrMajor', i)
          continue
        }
        const nameAr = (row.name_ar || '').trim()
        const nameEn = (row.name_en || '').trim()
        if (!nameAr && !nameEn) {
          addSkip('noName', i)
          continue
        }

        let collegeId = collegeCache[collegeName]
        if (collegeId == null) {
          try {
            const res = await findOrCreateCollege(collegeName, canCreateCollege)
            if (res.id) {
              collegeCache[collegeName] = res.id
              collegeId = res.id
              if (res.created) summary.collegesCreated++
            }
          } catch (err) {
            summary.errors.push(`Row ${i + 2}: College "${collegeName}" - ${err.message}`)
            addSkip('collegeNotFound', i)
            continue
          }
        }
        if (!collegeId) {
          addSkip('collegeNotFound', i)
          continue
        }

        const cacheKey = `${collegeId}:${majorName}`
        let majorId = majorCache[cacheKey]
        if (majorId == null) {
          try {
            const res = await findOrCreateMajor(majorName, collegeId)
            if (res.id) {
              majorCache[cacheKey] = res.id
              majorId = res.id
              if (res.created) summary.majorsCreated++
            }
          } catch (err) {
            summary.errors.push(`Row ${i + 2}: Major "${majorName}" - ${err.message}`)
            addSkip('majorNotFound', i)
            continue
          }
        }
        if (!majorId) {
          addSkip('majorNotFound', i)
          continue
        }

        if ((userRole === 'user' || userRole === 'instructor') && authCollegeId && collegeId !== authCollegeId) {
          addSkip('otherCollege', i)
          continue
        }

        let email = (row.email || '').trim()
        if (!email) email = `import-${collegeId}-${Date.now()}-${i}@placeholder.local`
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id, student_id')
          .eq('email', email)
          .eq('college_id', collegeId)
          .maybeSingle()

        const enrollmentDate = new Date().toISOString().split('T')[0]
        const dob = parseExcelDate(row.date_of_birth)
        let gpa = null
        if (row.high_school_gpa) {
          const num = parseFloat(String(row.high_school_gpa).replace(',', '.'))
          if (Number.isFinite(num) && num >= 0 && num <= 999.99) gpa = Math.round(num * 100) / 100
        }
        let gradYear = null
        if (row.graduation_year) {
          const y = parseInt(String(row.graduation_year).replace(/\D/g, '').slice(0, 4), 10)
          if (Number.isFinite(y) && y >= 1900 && y <= 2100) gradYear = y
        }

        const nameEnFinal = nameEn || nameAr
        const nameArFinal = nameAr || nameEn

        let studentId = (row.student_id || '').trim()
        if (existingStudent) {
          studentId = existingStudent.student_id
        } else {
          if (studentId) {
            const { data: existingId } = await supabase
              .from('students')
              .select('id')
              .eq('student_id', studentId)
              .maybeSingle()
            if (existingId) studentId = null
          }
          if (!studentId) studentId = await generateStudentId(collegeId)
          if (!studentId) {
            summary.errors.push(`Row ${i + 2}: Could not generate student ID`)
            summary.skipped++
            continue
          }
        }

        const studentData = {
          student_id: studentId,
          first_name: nameEnFinal.split(/\s+/)[0] || nameEnFinal,
          last_name: nameEnFinal.split(/\s+/).slice(1).join(' ') || nameEnFinal,
          first_name_ar: nameAr.split(/\s+/)[0] || null,
          last_name_ar: nameAr.split(/\s+/).slice(1).join(' ') || null,
          name_en: nameEnFinal,
          name_ar: nameArFinal,
          email,
          phone: (row.phone || row.whatsapp || '').trim() || null,
          mobile_phone: (row.whatsapp || row.phone || '').trim() || null,
          date_of_birth: dob,
          nationality: (row.nationality || '').trim() || null,
          national_id: (row.id_type || '').toLowerCase().includes('بطاقة') || (row.id_type || '').toLowerCase().includes('هوية') ? (row.passport_or_id || '').trim() || null : null,
          passport_number: (row.passport_or_id || '').trim() || null,
          address: (row.address || '').trim() || null,
          country: (row.country || '').trim() || null,
          high_school_name: (row.high_school_name || '').trim() || null,
          high_school_country: (row.high_school_country || row.country || '').trim() || null,
          graduation_year: gradYear,
          high_school_gpa: gpa,
          college_id: collegeId,
          major_id: majorId,
          enrollment_date: enrollmentDate,
          study_type: 'full_time',
          study_load: 'normal',
          study_approach: 'on_campus',
          notes: [row.notes, row.current_level, row.academic_year_label].filter(Boolean).join(' | ') || `Imported from Excel`,
          status: 'active',
        }

        if (existingStudent) {
          const { error: updateErr } = await supabase
            .from('students')
            .update(studentData)
            .eq('id', existingStudent.id)
            .select()
          if (!updateErr) summary.updated++
          else summary.errors.push(`Row ${i + 2}: ${updateErr.message}`)
        } else {
          let inserted = false
          let lastInsertError = null
          for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
            const { error: insertErr } = await supabase.from('students').insert(studentData).select()
            if (!insertErr) {
              summary.created++
              inserted = true
              break
            }
            lastInsertError = insertErr
            if (insertErr.code === '23505' && insertErr.message?.includes('student_id')) {
              const newId = await generateStudentId(collegeId)
              if (newId) studentData.student_id = newId
              else break
            } else break
          }
          if (!inserted && lastInsertError) {
            summary.errors.push(`Row ${i + 2}: ${lastInsertError.message}`)
          }
        }
      }

      setResult(summary)
    } catch (err) {
      setError(err.message || t('uploadStudents.uploadFailed', 'Upload failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('common.back')}
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileSpreadsheet className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {t('uploadStudents.title', 'Upload Students from Excel')}
              </h1>
              <p className="text-sm text-gray-500">
                {t('uploadStudents.subtitle', 'Upload an Excel file to import students. Colleges and majors will be created if they do not exist.')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer?.files?.[0]
                handleFile(f)
              }}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">
                {t('uploadStudents.dragDrop', 'Drag and drop your Excel file here, or click to browse')}
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                id="excel-upload"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <label
                htmlFor="excel-upload"
                className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700"
              >
                {t('uploadStudents.browse', 'Browse')}
              </label>
              {file && (
                <p className="mt-3 text-sm text-gray-700">
                  {t('uploadStudents.selected', 'Selected')}: {file.name}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result?.resetDone && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{t('uploadStudents.resetSuccess', 'All students and their data have been deleted. You can re-upload your file.')} {result.studentsDeleted != null && `(${result.studentsDeleted} deleted)`}</span>
              </div>
            )}
            {result && !result.resetDone && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">
                    {t('uploadStudents.done', 'Import complete')}
                  </span>
                </div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>{t('uploadStudents.createdCount', 'Students created')}: {result.created}</li>
                  {result.updated != null && result.updated > 0 && (
                    <li>{t('uploadStudents.updatedCount', 'Students updated')}: {result.updated}</li>
                  )}
                  <li>{t('uploadStudents.skippedCount', 'Rows skipped')}: {result.skipped}</li>
                  {result.collegesCreated > 0 && (
                    <li>{t('uploadStudents.collegesCreated', 'Colleges created')}: {result.collegesCreated}</li>
                  )}
                  {result.majorsCreated > 0 && (
                    <li>{t('uploadStudents.majorsCreated', 'Majors created')}: {result.majorsCreated}</li>
                  )}
                </ul>
                {result.skipped > 0 && result.skipReasons && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {t('uploadStudents.skipReasonsTitle', 'Why rows were skipped')}:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {result.skipReasons.sectionHeader > 0 && (
                        <li>{t('uploadStudents.skipSectionHeader', 'Section/header row')}: {result.skipReasons.sectionHeader}</li>
                      )}
                      {result.skipReasons.noCollegeOrMajor > 0 && (
                        <li>{t('uploadStudents.skipNoCollegeMajor', 'No college or major')}: {result.skipReasons.noCollegeOrMajor}</li>
                      )}
                      {result.skipReasons.noName > 0 && (
                        <li>{t('uploadStudents.skipNoName', 'No student name (Arabic or English)')}: {result.skipReasons.noName}</li>
                      )}
                      {result.skipReasons.collegeNotFound > 0 && (
                        <li>{t('uploadStudents.skipCollegeNotFound', 'College not found (and cannot create)')}: {result.skipReasons.collegeNotFound}</li>
                      )}
                      {result.skipReasons.majorNotFound > 0 && (
                        <li>{t('uploadStudents.skipMajorNotFound', 'Major not found')}: {result.skipReasons.majorNotFound}</li>
                      )}
                      {result.skipReasons.otherCollege > 0 && (
                        <li>{t('uploadStudents.skipOtherCollege', 'Different college (no permission)')}: {result.skipReasons.otherCollege}</li>
                      )}
                      {result.skipReasons.duplicateEmail > 0 && (
                        <li>{t('uploadStudents.skipDuplicateEmail', 'Duplicate email in same college')}: {result.skipReasons.duplicateEmail}</li>
                      )}
                    </ul>
                    {result.skipDetails?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('uploadStudents.skipDetailsHint', 'First skipped rows')}: {result.skipDetails.slice(0, 15).map(d => `#${d.row} (${d.reason})`).join(', ')}
                        {result.skipDetails.length > 15 && '…'}
                      </p>
                    )}
                  </div>
                )}
                {result.errors?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-amber-700">{t('uploadStudents.errors', 'Errors')}:</p>
                    <ul className="text-xs text-amber-800 mt-1 max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 20).map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                      ))}
                      {result.errors.length > 20 && (
                        <li>… +{result.errors.length - 20} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!file || loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('uploadStudents.importing', 'Importing...')}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    {t('uploadStudents.import', 'Import')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/students')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>

          {userRole === 'admin' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t('uploadStudents.resetSectionTitle', 'Super admin only')}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {t('uploadStudents.resetSectionDesc', 'Delete all students and their data (enrollments, grades, attendance, finance, etc.) so you can re-upload a fresh file. You will be asked to confirm with your password.')}
              </p>
              <button
                type="button"
                onClick={() => { setResetModalOpen(true); setResetError(''); setResetPassword(''); }}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                {t('uploadStudents.resetAllStudents', 'Reset all students')}
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {t('uploadStudents.expectedColumns', 'Expected columns (Arabic or English)')}:
            </p>
            <p className="text-xs text-gray-500">
              {t('uploadStudents.expectedColumnsHint', 'Academic year, Student ID, Name (Arabic), Name (English), Date of birth, Nationality, Passport/ID, Email, Phone, WhatsApp, Country, Address, Institution, Graduation year, GPA, College, Major, Status, Notes. Missing fields use defaults.')}
            </p>
          </div>
        </div>
      </div>

      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center gap-2 text-red-700 mb-4">
              <Lock className="w-5 h-5" />
              <h3 className="text-lg font-semibold">{t('uploadStudents.confirmReset', 'Confirm reset all students')}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {t('uploadStudents.confirmResetDesc', 'This will permanently delete all students and their enrollments, grades, attendance, and finance records. Enter your super admin password to continue.')}
            </p>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder={t('uploadStudents.yourPassword', 'Your password')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
              autoComplete="current-password"
            />
            {resetError && (
              <p className="text-sm text-red-600 mb-2">{resetError}</p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => { setResetModalOpen(false); setResetPassword(''); setResetError(''); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleResetAllStudents}
                disabled={resetLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {resetLoading ? t('common.loading', 'Loading...') : t('uploadStudents.confirmResetButton', 'Delete all')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
