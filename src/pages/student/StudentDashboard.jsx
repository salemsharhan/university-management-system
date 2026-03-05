import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import {
  AlertTriangle,
  CreditCard,
  FileText,
  Calendar,
  GraduationCap,
  PenLine,
  ClipboardList,
  GraduationCap as AdvisingIcon,
  HelpCircle,
} from 'lucide-react'

const STUDENT_PORTAL_BG = '#1a3a6b'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAY_NAMES_EN = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' }
const DAY_NAMES_AR = { sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت' }

export default function StudentDashboard() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [activeSemester, setActiveSemester] = useState(null)
  const [todaySchedule, setTodaySchedule] = useState([])
  const [totalCreditsRequired, setTotalCreditsRequired] = useState(120)
  const [completedCredits, setCompletedCredits] = useState(0)
  const [currentSemesterCredits, setCurrentSemesterCredits] = useState(0)
  const [computedGpa, setComputedGpa] = useState(null)

  useEffect(() => {
    if (user?.email) fetchData()
  }, [user?.email])

  const fetchData = async () => {
    if (!user?.email) return
    try {
      setLoading(true)
      const { data: studentData, error: studentErr } = await supabase
        .from('students')
        .select('id, student_id, name_en, name_ar, first_name, last_name, gpa, college_id, major_id, colleges(id, name_en, name_ar), majors(id, name_en, name_ar)')
        .eq('email', user.email)
        .eq('status', 'active')
        .single()
      if (studentErr || !studentData) {
        setLoading(false)
        return
      }
      setStudent(studentData)

      const { data: invData } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, pending_amount, status, invoice_type')
        .eq('student_id', studentData.id)
      setInvoices(invData || [])

      const { data: semData } = await supabase
        .from('semesters')
        .select('id, name_en, name_ar, start_date, end_date, status')
        .in('status', ['active', 'registration_open'])
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      setActiveSemester(semData)

      const { data: enrollData } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          grade_points,
          grade,
          numeric_grade,
          classes(
            subjects(credit_hours, code, name_en, name_ar),
            class_schedules(day_of_week, start_time, end_time, location),
            instructors(name_en, name_ar)
          )
        `)
        .eq('student_id', studentData.id)
      setEnrollments(enrollData || [])

      const creditsFromEnrollments = (enrollData || []).reduce((sum, e) => {
        const cred = e.classes?.subjects?.credit_hours
        return sum + (typeof cred === 'number' ? cred : parseInt(cred, 10) || 3)
      }, 0)
      setCompletedCredits(creditsFromEnrollments)
      setCurrentSemesterCredits(creditsFromEnrollments)

      // Cumulative GPA from enrollments that have grade_points (weighted by credit hours)
      let gpaFromEnrollments = null
      let totalWeighted = 0
      let totalCreditsGraded = 0
      ;(enrollData || []).forEach((e) => {
        const points = e.grade_points != null ? Number(e.grade_points) : null
        if (points == null || points === '') return
        const cred = e.classes?.subjects?.credit_hours
        const ch = typeof cred === 'number' ? cred : parseInt(cred, 10) || 3
        totalWeighted += points * ch
        totalCreditsGraded += ch
      })
      if (totalCreditsGraded > 0) {
        gpaFromEnrollments = totalWeighted / totalCreditsGraded
      }
      setComputedGpa(gpaFromEnrollments)

      const dayIndex = new Date().getDay()
      const todayKey = DAYS[dayIndex]
      const todayItems = (enrollData || [])
        .filter(e => e.classes?.class_schedules?.some(s => String(s.day_of_week).toLowerCase() === todayKey))
        .map(e => {
          const sched = e.classes?.class_schedules?.find(s => String(s.day_of_week).toLowerCase() === todayKey)
          return {
            code: e.classes?.subjects?.code || '—',
            name: getLocalizedName(e.classes?.subjects, language === 'ar') || '—',
            location: sched?.location || '—',
            instructor: getLocalizedName(e.classes?.instructors, language === 'ar') || '—',
            start: sched?.start_time,
            end: sched?.end_time,
          }
        })
        .sort((a, b) => (a.start || '').localeCompare(b.start || ''))
      setTodaySchedule(todayItems)
    } catch (err) {
      console.error('Student dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const balanceDue = invoices.reduce((sum, inv) => sum + parseFloat(inv.pending_amount || 0), 0)
  const hasFinancialHold = balanceDue > 0
  const dayNum = new Date().getDay()
  const dayName = language === 'ar' ? DAY_NAMES_AR[DAYS[dayNum]] : DAY_NAMES_EN[DAYS[dayNum]]
  // Prefer GPA computed from enrollment grades; fallback to students.gpa
  const displayGpa = computedGpa != null ? computedGpa : (student?.gpa != null ? Number(student.gpa) : 0)

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
        <p className="text-amber-800">{t('studentPortal.noStudentData', 'No student data found.')}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Financial status banner */}
      {hasFinancialHold && (
        <div className="rounded-2xl text-white p-6 flex flex-col sm:flex-row sm:items-center gap-4" style={{ backgroundColor: STUDENT_PORTAL_BG }}>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{t('studentPortal.nextRequiredProcedure', 'THE NEXT REQUIRED PROCEDURE')}</h3>
            <p className="text-slate-200">{t('studentPortal.financialCommentSuspended', 'You have a financial comment — registration is suspended')}</p>
            <p className="text-sm text-slate-300 mt-2">
              {t('studentPortal.payRequiredFees', 'The required fees ({amount}) must be paid before registration for the courses can be completed.', { amount: `${balanceDue.toFixed(2)} SAR` })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <button
              onClick={() => navigate('/student/payments')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium rounded-lg flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {t('studentPortal.payNow', 'Pay now')}
            </button>
            <button
              onClick={() => navigate('/student/payments')}
              className="px-4 py-2 border border-white/30 hover:bg-white/10 rounded-lg"
            >
              {t('studentPortal.viewComments', 'View comments')}
            </button>
          </div>
        </div>
      )}

      {/* KPI cards — order: Active comments, Completed hours, Balance due, Cumulative GPA, Recorded hours */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-md border-t-4 border-red-500 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">{t('studentPortal.activeComments', 'Active comments')}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{hasFinancialHold ? 1 : 0}</p>
          <p className="text-xs text-slate-500">{hasFinancialHold ? t('studentPortal.financialComment', 'Financial comment') : '—'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border-t-4 border-blue-500 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">{t('studentPortal.completedHours', 'Completed hours')}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{completedCredits}</p>
          <p className="text-xs text-slate-500">{t('studentPortal.fromHours', 'From {total} hours', { total: totalCreditsRequired })}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border-t-4 border-amber-500 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">{t('studentPortal.balanceDue', 'Balance due')}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{balanceDue.toFixed(0)}</p>
          <p className="text-xs text-slate-500">{t('studentPortal.saudiRiyal', 'Saudi Riyal')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border-t-4 border-green-500 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">{t('studentPortal.cumulativeGpa', 'Cumulative GPA')}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{displayGpa.toFixed(2)}</p>
          <p className="text-xs text-slate-500">{t('studentPortal.from4', 'From 4.00')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border-t-4 border-sky-500 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">{t('studentPortal.recordedHours', 'Recorded hours')}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{currentSemesterCredits}</p>
          <p className="text-xs text-slate-500">{t('studentPortal.fromHours', 'From {total} hours', { total: 21 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic progress */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">{t('studentPortal.academicProgress', 'Academic progress')}</h2>
          <p className="text-xs text-slate-500 mb-4">{t('studentPortal.theDetails', 'the details')}</p>
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-slate-900">{displayGpa.toFixed(2)}</p>
              <p className="text-sm text-slate-500">{t('studentPortal.cumulativeGpa', 'Cumulative GPA')}</p>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (completedCredits / totalCreditsRequired) * 100)}%` }} />
            </div>
            <p className="text-sm text-slate-600">{completedCredits}/{totalCreditsRequired} {t('studentPortal.completedHours', 'Completed hours')}</p>
            <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (18 / 30) * 100)}%` }} />
            </div>
            <p className="text-sm text-slate-600">18/30 {t('studentPortal.collegeRequirements', 'College requirements')}</p>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '45%', backgroundColor: STUDENT_PORTAL_BG }} />
            </div>
            <p className="text-sm text-slate-600">27/60 {t('studentPortal.mandatorySpecializationRequirements', 'Specialization requirements')}</p>
          </div>
          <button
            onClick={() => navigate('/student/graduation-path')}
            className="mt-4 w-full py-3 text-white font-medium rounded-xl flex items-center justify-center gap-2"
            style={{ backgroundColor: STUDENT_PORTAL_BG }}
          >
            <GraduationCap className="w-5 h-5" />
            {t('studentPortal.graduationPathPresentation', 'Graduation Pathway Presentation')}
          </button>
        </div>

        {/* Registration window */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {t('studentPortal.registrationWindow', 'Registration window')} — {activeSemester ? getLocalizedName(activeSemester, language === 'ar') : t('studentPortal.currentSemester', 'Current semester')}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {activeSemester?.status === 'registration_open' ? t('studentPortal.openUntil', 'Open until {date}', { date: activeSemester?.end_date || 'March 31, 2026' }) : t('studentPortal.closed', 'Closed')}
          </p>
          <div className={`grid grid-cols-3 gap-2 mb-4 ${isRTL ? 'rtl' : ''}`}>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{activeSemester?.status === 'registration_open' ? '33' : '0'}</p>
              <p className="text-xs text-slate-500">{t('studentPortal.daysRemaining', 'One day remaining')}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-900">2</p>
              <p className="text-xs text-slate-500">{t('studentPortal.inWaitingList', 'In the waiting list')}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{enrollments.filter(e => e.status === 'enrolled').length || 5}</p>
              <p className="text-xs text-slate-500">{t('studentPortal.recordedCourses', 'Recorded courses')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/student/schedule')} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-1">
              <Calendar className="w-4 h-4" />
              {t('studentPortal.classSchedule', 'Class schedule')}
            </button>
            <button onClick={() => navigate('/student/enroll')} className="flex-1 py-2 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1" style={{ backgroundColor: STUDENT_PORTAL_BG }}>
              <PenLine className="w-4 h-4" />
              {t('studentPortal.courseRegistration', 'Course registration')}
            </button>
          </div>
        </div>

        {/* Today's schedule */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">{t('studentPortal.todaysSchedule', "Today's schedule")} — {dayName}</h2>
            <button onClick={() => navigate('/student/schedule')} className="text-sm text-slate-600 hover:text-slate-900 font-medium">
              {t('studentPortal.fullTable', 'Full table')}
            </button>
          </div>
          <div className="space-y-3">
            {todaySchedule.length === 0 ? (
              <p className="text-slate-500 text-sm">{t('studentPortal.noClassesToday', 'No classes scheduled for today')}</p>
            ) : (
              todaySchedule.slice(0, 3).map((item, i) => (
                <div key={i} className={`rounded-xl bg-slate-50 border border-slate-100 p-3 flex ${isRTL ? 'flex-row-reverse' : ''} justify-between gap-3`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{item.code} — {item.name}</p>
                    <p className="text-sm text-slate-600">{item.location} | {item.instructor}</p>
                  </div>
                  <p className={`text-sm text-slate-600 font-medium flex-shrink-0 ${isRTL ? 'text-left' : 'text-right'}`}>{item.start} - {item.end}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('studentPortal.financialSummary', 'Financial Summary')}</h2>
        <p className="text-sm text-slate-500 mb-3">{t('studentPortal.invoiceDisplay', 'Invoice display')}</p>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">{t('studentPortal.due', 'Due')}</span>
            <span className="font-semibold">{balanceDue.toFixed(0)} SAR</span>
          </div>
          <p className="text-xs text-slate-500">{t('studentPortal.deadline', 'Deadline')}: {invoices[0]?.due_date || '2026-03-01'}</p>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-600">{t('studentPortal.paid', 'paid')}</span>
            <span className="text-green-600 font-medium">{(invoices.reduce((s, i) => s + parseFloat(i.paid_amount || 0), 0)).toFixed(0)} SAR</span>
          </div>
          <p className="text-xs text-slate-500">{t('studentPortal.acceptanceDeposit', 'Acceptance deposit')}</p>
        </div>
        <button
          onClick={() => navigate('/student/payments')}
          className="w-full py-2.5 text-white font-medium rounded-lg flex items-center justify-center gap-2"
          style={{ backgroundColor: STUDENT_PORTAL_BG }}
        >
          <CreditCard className="w-4 h-4" />
          {t('studentPortal.payRequiredFeesButton', 'Pay the required fees')}
        </button>
      </div>

      {/* Latest notifications + Quick links row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">{t('studentPortal.latestNotifications', 'Latest notifications')}</h2>
          <p className="text-xs text-slate-500 mb-4">{t('studentPortal.everyone', 'everyone')}</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              {t('studentPortal.activeFinancialComment', 'Active financial comment')} (3 days ago)
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <span className="text-green-500">✓</span>
              {t('studentPortal.registrationWindowOpen', 'The registration window is open')} (5 days ago)
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <FileText className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              {t('studentPortal.registrationLetterUnderReview', 'The registration letter request is under review')} (A week ago)
            </li>
          </ul>
        </div>
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">{t('studentPortal.quickLinks', 'Quick links')}</h2>
          <div className="space-y-2">
            <Link to="/student/coming-soon" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 text-sm py-1.5">
              <ClipboardList className="w-4 h-4" />
              {t('studentPortal.submitServiceRequest', 'Submit a service request')}
            </Link>
            <Link to="/student/grades" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 text-sm py-1.5">
              <FileText className="w-4 h-4" />
              {t('studentPortal.academicRecord', 'Academic Record')}
            </Link>
            <Link to="/student/coming-soon" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 text-sm py-1.5">
              <AdvisingIcon className="w-4 h-4" />
              {t('studentPortal.academicAdvisingAppointment', 'Academic Advising Appointment')}
            </Link>
            <Link to="/student/coming-soon" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 text-sm py-1.5">
              <HelpCircle className="w-4 h-4" />
              {t('studentPortal.helpCenter', 'Help Center')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
