import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getLocalizedName } from '../../utils/localizedName'
import { getStudentSemesterMilestone, checkFinancePermission } from '../../utils/financePermissions'
import { supabase } from '../../lib/supabase'
import { AlertTriangle, Search, BookOpen, UserPlus } from 'lucide-react'

const PORTAL_BG = '#1a3a6b'

export default function StudentCourseGuide() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [currentSemester, setCurrentSemester] = useState(null)
  const [classes, setClasses] = useState([])
  const [prereqMap, setPrereqMap] = useState({}) // subject_id -> [codes]
  const [financialHold, setFinancialHold] = useState(false)
  const [registrationAllowed, setRegistrationAllowed] = useState(false)
  const [filterCondition, setFilterCondition] = useState('all') // all | available | waiting | closed
  const [searchQuery, setSearchQuery] = useState('')
  const [majorSheetSubjectIds, setMajorSheetSubjectIds] = useState(null) // null = all, [] = none from plan, [ids] = filter
  const [enrolledOrCompletedSubjectIds, setEnrolledOrCompletedSubjectIds] = useState(new Set()) // subject_ids student already enrolled in (this sem) or completed

  useEffect(() => {
    if (user?.email) fetchStudentAndSemesters()
  }, [user?.email])

  useEffect(() => {
    if (student?.id && selectedSemesterId) {
      fetchClassesAndPrereqs()
      checkFinancialStatus()
    } else {
      setClasses([])
      setCurrentSemester(null)
    }
  }, [student?.id, selectedSemesterId])

  const fetchStudentAndSemesters = async () => {
    if (!user?.email) return
    try {
      setLoading(true)
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('id, student_id, college_id, major_id, enrollment_date')
        .eq('email', user.email)
        .eq('status', 'active')
        .single()
      if (studentErr || !studentData) {
        setLoading(false)
        return
      }
      setStudent(studentData)

      const { data: semestersData, error: semErr } = await supabase
        .from('semesters')
        .select('id, name_en, name_ar, code, start_date, end_date, registration_start_date, registration_end_date, late_registration_end_date, status')
        .or(`college_id.eq.${studentData.college_id},is_university_wide.eq.true`)
        .order('start_date', { ascending: false })
      if (!semErr && semestersData?.length) {
        setSemesters(semestersData)
        if (!selectedSemesterId) {
          const active = semestersData.find(s => s.status === 'active' || s.status === 'registration_open')
          setSelectedSemesterId(String(active?.id || semestersData[0].id))
        }
      }

      // Resolve major sheet to get subject IDs for the plan (so we show plan-relevant courses first or only)
      let sheetId = null
      const { data: sms } = await supabase
        .from('student_major_sheets')
        .select('major_sheet_id')
        .eq('student_id', studentData.id)
        .eq('is_active', true)
        .maybeSingle()
      if (sms?.major_sheet_id) sheetId = sms.major_sheet_id
      if (!sheetId && studentData.major_id) {
        const admissionYear = studentData.enrollment_date
          ? new Date(studentData.enrollment_date).getFullYear().toString()
          : new Date().getFullYear().toString()
        const { data: ms } = await supabase
          .from('major_sheets')
          .select('id')
          .eq('major_id', studentData.major_id)
          .eq('is_active', true)
          .ilike('academic_year', `%${admissionYear}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!ms) {
          const { data: msFallback } = await supabase
            .from('major_sheets')
            .select('id')
            .eq('major_id', studentData.major_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (msFallback) sheetId = msFallback.id
        } else sheetId = ms.id
      }
      if (sheetId) {
        const { data: msc } = await supabase
          .from('major_sheet_courses')
          .select('subject_id')
          .eq('major_sheet_id', sheetId)
        const ids = [...new Set((msc || []).map(c => c.subject_id))]
        setMajorSheetSubjectIds(ids)
      } else {
        setMajorSheetSubjectIds([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const checkFinancialStatus = async () => {
    if (!student?.id || !selectedSemesterId) return
    const { milestone, hold } = await getStudentSemesterMilestone(student.id, parseInt(selectedSemesterId))
    const check = checkFinancePermission('SE_REG', milestone, hold)
    setRegistrationAllowed(check.allowed)
    setFinancialHold(!!hold || !check.allowed)
  }

  const fetchClassesAndPrereqs = async () => {
    if (!student?.college_id || !selectedSemesterId) return
    try {
      setLoading(true)
      const semesterId = parseInt(selectedSemesterId)

      // Courses the student already enrolled in this semester or has completed (passed) — exclude these so we show only "courses you need to enroll"
      const alreadySubjectIds = new Set()
      const { data: enrollmentsThisSem } = await supabase
        .from('enrollments')
        .select('classes(subject_id)')
        .eq('student_id', student.id)
        .eq('semester_id', semesterId)
        .in('status', ['enrolled'])
      ;(enrollmentsThisSem || []).forEach(e => {
        const sid = e.classes?.subject_id
        if (sid) alreadySubjectIds.add(sid)
      })
      const { data: completedEnrollments } = await supabase
        .from('enrollments')
        .select('classes(subject_id), grade_points, status')
        .eq('student_id', student.id)
      ;(completedEnrollments || []).forEach(e => {
        const sid = e.classes?.subject_id
        if (!sid) return
        const passed = e.status === 'completed' || e.status === 'passed' || (e.grade_points != null && Number(e.grade_points) >= 2)
        if (passed) alreadySubjectIds.add(sid)
      })
      setEnrolledOrCompletedSubjectIds(alreadySubjectIds)

      let query = supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          capacity,
          enrolled,
          room,
          building,
          subject_id,
          subjects(id, name_en, name_ar, code, credit_hours),
          instructors(id, name_en, name_ar)
        `)
        .eq('semester_id', semesterId)
        .eq('status', 'active')
        .order('code')

      query = query.or(`college_id.eq.${student.college_id},is_university_wide.eq.true`)

      const { data: classesData, error } = await query
      if (error) throw error

      let list = classesData || []
      if (majorSheetSubjectIds && majorSheetSubjectIds.length > 0) {
        list = list.filter(c => majorSheetSubjectIds.includes(c.subject_id))
      }
      // Exclude classes for subjects the student is already enrolled in (this semester) or has completed
      list = list.filter(c => !alreadySubjectIds.has(c.subject_id))

      setClasses(list)
      const sem = semesters.find(s => String(s.id) === selectedSemesterId)
      setCurrentSemester(sem || null)

      const subjectIds = [...new Set(list.map(c => c.subject_id).filter(Boolean))]
      if (subjectIds.length === 0) {
        setPrereqMap({})
        setLoading(false)
        return
      }

      const { data: sp } = await supabase
        .from('subject_prerequisites')
        .select('subject_id, prerequisite_subject_id')
        .in('subject_id', subjectIds)
      const prereqIds = [...new Set((sp || []).map(p => p.prerequisite_subject_id))]
      const codeMap = {}
      if (prereqIds.length > 0) {
        const { data: subj } = await supabase
          .from('subjects')
          .select('id, code')
          .in('id', prereqIds)
        ;(subj || []).forEach(s => { codeMap[s.id] = s.code || '' })
      }
      const { data: cp } = await supabase
        .from('course_prerequisites')
        .select('subject_id, prerequisite_subject_id')
        .in('subject_id', subjectIds)
        .eq('prerequisite_type', 'prerequisite')
      const map = {}
      ;(sp || []).forEach(p => {
        if (!map[p.subject_id]) map[p.subject_id] = []
        if (codeMap[p.prerequisite_subject_id]) map[p.subject_id].push(codeMap[p.prerequisite_subject_id])
      })
      ;(cp || []).forEach(p => {
        if (!map[p.subject_id]) map[p.subject_id] = []
        if (codeMap[p.prerequisite_subject_id] && !map[p.subject_id].includes(codeMap[p.prerequisite_subject_id])) {
          map[p.subject_id].push(codeMap[p.prerequisite_subject_id])
        }
      })
      setPrereqMap(map)
    } catch (e) {
      console.error(e)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  const isRegistrationOpenForSemester = (sem) => {
    if (!sem) return false
    if (sem.status === 'registration_open' || sem.status === 'active') return true
    const today = new Date().toISOString().split('T')[0]
    if (sem.registration_start_date && sem.registration_end_date) {
      if (today >= sem.registration_start_date && today <= sem.registration_end_date) return true
    }
    if (sem.late_registration_end_date && today <= sem.late_registration_end_date) return true
    return false
  }

  const getCondition = (cls) => {
    const open = currentSemester && isRegistrationOpenForSemester(currentSemester)
    const capacity = cls.capacity ?? 0
    const enrolled = cls.enrolled ?? 0
    const hasSeats = capacity > enrolled
    if (!open) return 'closed'
    if (hasSeats) return 'available'
    return 'waiting'
  }

  const filteredClasses = useMemo(() => {
    let list = classes
    if (filterCondition !== 'all') {
      list = list.filter(cls => getCondition(cls) === filterCondition)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(cls => {
        const name = getLocalizedName(cls.subjects, isRTL) || ''
        const code = cls.subjects?.code || ''
        return name.toLowerCase().includes(q) || code.toLowerCase().includes(q)
      })
    }
    return list
  }, [classes, filterCondition, searchQuery, currentSemester, isRTL])

  const goToEnroll = () => {
    navigate(selectedSemesterId ? `/student/enroll?semester=${selectedSemesterId}` : '/student/enroll')
  }

  if (loading && !student) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
        <p className="text-amber-800">{t('studentPortal.noStudentData', 'Student data not found.')}</p>
      </div>
    )
  }

  const semesterName = currentSemester ? getLocalizedName(currentSemester, isRTL) : ''

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('studentPortal.courseGuide', 'Course Guide')}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {t('studentPortal.courseGuideSubtitle', 'Browse the courses available for registration')}
          {semesterName ? ` — ${semesterName}` : ''}
        </p>
      </div>

      {financialHold && !registrationAllowed && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">
              {t('studentPortal.viewComments', 'View comments.')} {t('studentPortal.financialHoldAlert', 'You have an active financial hold — registration is not possible until it is lifted.')}
            </p>
          </div>
        </div>
      )}

      <div className={`flex flex-wrap items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('studentPortal.semester', 'Semester')}</label>
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">{t('common.select', 'Select')}</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>{getLocalizedName(s, isRTL) || s.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('studentPortal.condition', 'Condition')}</label>
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">{t('studentPortal.allConditions', 'All cases')}</option>
            <option value="available">{t('studentPortal.available', 'Available')}</option>
            <option value="waiting">{t('studentPortal.waiting', 'Waiting')}</option>
            <option value="closed">{t('studentPortal.closed', 'Closed')}</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('common.search', 'Search')}</label>
          <div className="relative">
            <Search className={`absolute w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('studentPortal.searchByNameOrCode', 'Search by name or code...')}
              className={`w-full rounded-lg border border-slate-300 py-2 text-sm ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {filteredClasses.length} {t('studentPortal.courses', 'courses')}
        </p>
        {registrationAllowed && currentSemester && isRegistrationOpenForSemester(currentSemester) && (
          <button
            type="button"
            onClick={goToEnroll}
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium"
            style={{ backgroundColor: PORTAL_BG }}
          >
            <UserPlus className="w-4 h-4" />
            {t('studentPortal.goToCourseRegistration', 'Go to Course registration')}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white text-xs font-medium" style={{ backgroundColor: PORTAL_BG }}>
                <th className="px-4 py-3 text-left">{t('studentPortal.courseCode', 'Course code')}</th>
                <th className="px-4 py-3 text-left">{t('studentPortal.courseName', 'Course Name')}</th>
                <th className="px-4 py-3 text-left">{t('studentPortal.hours', 'hours')}</th>
                <th className="px-4 py-3 text-left">{t('studentPortal.professor', 'Professor')}</th>
                <th className="px-4 py-3 text-left">{t('studentPortal.theHall', 'The hall')}</th>
                <th className="px-4 py-3 text-left">{t('studentPortal.seats', 'Seats')}</th>
                <th className="px-4 py-3 text-left">{t('studentPortal.prerequisite', 'Prerequisite')}</th>
                <th className="px-4 py-3 text-left">{t('studentPortal.condition', 'Condition')}</th>
                <th className="px-4 py-3 text-left">{t('studentPortal.procedure', 'Procedure')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    {loading ? t('common.loading', 'Loading...') : t('studentPortal.noCoursesToEnroll', 'No courses left to enroll — you have completed or are already enrolled in all courses from your major plan for this semester.')}
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => {
                  const condition = getCondition(cls)
                  const prereqCodes = prereqMap[cls.subject_id] || []
                  const instructorName = cls.instructors
                    ? (isRTL && cls.instructors.name_ar ? cls.instructors.name_ar : cls.instructors.name_en) || 'TBA'
                    : 'TBA'
                  const hall = [cls.building, cls.room].filter(Boolean).join(' ') || '—'
                  const capacity = cls.capacity ?? 0
                  const enrolled = cls.enrolled ?? 0
                  const hasSeats = capacity > enrolled
                  const canRegister = registrationAllowed && condition === 'available' && hasSeats

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900 text-left">{cls.subjects?.code || '—'}</td>
                      <td className="px-4 py-3 text-slate-900 text-left">{getLocalizedName(cls.subjects, isRTL) || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 text-left">{cls.subjects?.credit_hours ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700 text-left">{instructorName}</td>
                      <td className="px-4 py-3 text-slate-700 text-left">{hall}</td>
                      <td className="px-4 py-3 text-left">
                        <span className={hasSeats ? 'text-green-600' : 'text-red-600'}>
                          {enrolled}/{capacity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-left">{prereqCodes.length ? prereqCodes.join(', ') : '—'}</td>
                      <td className="px-4 py-3 text-left">
                        <span className={
                          condition === 'available' ? 'text-green-600 font-medium' :
                          condition === 'waiting' ? 'text-amber-600' : 'text-red-600'
                        }>
                          {condition === 'available' ? t('studentPortal.available') : condition === 'waiting' ? t('studentPortal.waiting') : t('studentPortal.closed')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left">
                        {condition === 'available' && canRegister ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/student/enroll?semester=${selectedSemesterId}`)}
                            className="text-green-600 font-medium hover:underline"
                          >
                            {t('studentPortal.registration', 'Registration')}
                          </button>
                        ) : condition === 'waiting' ? (
                          <span className="text-amber-600 font-medium">{t('studentPortal.waitingList', 'Waiting list')}</span>
                        ) : (
                          <span className="text-slate-500">{t('studentPortal.closed', 'closed')}</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
