import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { getSemesterCreditsFromUniversitySettings } from '../../utils/getCollegeSettings'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, Edit, CalendarDays, Trash2, Users, UserPlus, Lock, Play, Pause, Archive, Copy, 
  TrendingUp, Clock, CheckCircle, AlertTriangle, DollarSign, BookOpen, GraduationCap
} from 'lucide-react'

export default function ViewSemester() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [semester, setSemester] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [kpis, setKpis] = useState({
    totalEnrollments: 0,
    addDropCount: 0,
    withdrawals: 0,
    coursesStarted: 0,
    gradesSubmitted: 0,
    attendanceWarnings: 0,
    creditLimitBlocks: 0,
    classesActive: 0
  })
  const [updatingFlag, setUpdatingFlag] = useState(null)
  const [semesterCreditsFromUni, setSemesterCreditsFromUni] = useState({
    min_credit_hours: 12,
    max_credit_hours: 18,
    max_credit_hours_with_permission: 21,
    min_gpa_for_max_credits: 3.0,
  })

  useEffect(() => {
    fetchSemester()
  }, [id])

  useEffect(() => {
    if (semester) {
      fetchKPIs()
    }
  }, [semester])

  useEffect(() => {
    const fetchCredits = async () => {
      const credits = await getSemesterCreditsFromUniversitySettings()
      setSemesterCreditsFromUni(credits)
    }
    fetchCredits()
  }, [])

  const fetchSemester = async () => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      
      // Fetch college data separately if college_id exists
      let collegeData = null
      if (data.college_id) {
        const { data: college } = await supabase
          .from('colleges')
          .select('id, name_en, name_ar, code')
          .eq('id', data.college_id)
          .maybeSingle()
        
        if (college) {
          collegeData = college
        }
      }
      
      // Fetch academic year data
      let academicYearData = null
      if (data.academic_year_id) {
        const { data: academicYear } = await supabase
          .from('academic_years')
          .select('id, name_en, name_ar, code')
          .eq('id', data.academic_year_id)
          .maybeSingle()
        
        if (academicYear) {
          academicYearData = academicYear
        }
      }
      
      setSemester({
        ...data,
        colleges: collegeData,
        academic_years: academicYearData
      })
    } catch (err) {
      console.error('Error fetching semester:', err)
      setError(err.message || 'Failed to load semester')
    } finally {
      setLoading(false)
    }
  }

  const fetchKPIs = async () => {
    if (!semester) return
    
    try {
      // Total Enrollments
      const { count: enrollmentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('semester_id', semester.id)
      
      // Classes for this semester (derive stats directly from classes table)
      const { data: classes, count: classCount } = await supabase
        .from('classes')
        .select('id, subject_id, status', { count: 'exact' })
        .eq('semester_id', semester.id)
      
      const activeClasses = (classes || []).filter(c => c.status === 'active')
      const subjectIds = activeClasses.map(c => c.subject_id).filter(Boolean)
      const uniqueSubjectCount = new Set(subjectIds).size
      
      // Courses Started (approximation based on subjects that have active classes)
      const coursesStarted = uniqueSubjectCount > 0 ? 100 : 0
      
      // Grades Submitted (placeholder - would need grade data)
      const gradesSubmitted = 45 // Placeholder
      
      // Add/Drop Count (placeholder - would need enrollment change history)
      const addDropCount = 47 // Placeholder
      
      // Withdrawals (placeholder)
      const withdrawals = 8 // Placeholder
      
      // Attendance Warnings (placeholder)
      const attendanceWarnings = 23 // Placeholder
      
      // Credit Limit Blocks (placeholder)
      const creditLimitBlocks = 5 // Placeholder
      
      setKpis({
        totalEnrollments: enrollmentCount || 0,
        addDropCount,
        withdrawals,
        coursesStarted,
        gradesSubmitted,
        attendanceWarnings,
        creditLimitBlocks,
        classesActive: classCount || 0
      })
    } catch (err) {
      console.error('Error fetching KPIs:', err)
    }
  }

  const handleLifecycleAction = async (action) => {
    if (!semester) return

    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email || null
      
      let updateData = {}
      
      switch (action) {
        case 'open_registration':
          updateData = { 
            status: 'registration_open',
            course_registration_allowed: true
          }
          break
        case 'close_registration':
          updateData = { 
            status: 'registration_closed',
            course_registration_allowed: false
          }
          break
        case 'start_semester':
          updateData = { status: 'in_progress' }
          break
        case 'end_semester':
          updateData = { status: 'ending' }
          break
        case 'lock_semester':
          updateData = { 
            status: 'closed',
            course_registration_allowed: false,
            add_drop_allowed: false,
            withdrawal_allowed: false,
            grade_entry_allowed: false,
            attendance_editing_allowed: false
          }
          break
        case 'archive':
          updateData = { status: 'archived' }
          break
        case 'clone_semester':
          // Clone the semester
          const cloneData = {
            academic_year_id: semester.academic_year_id,
            name_en: `${semester.name_en} (Copy)`,
            name_ar: semester.name_ar ? `${semester.name_ar} (نسخة)` : null,
            code: `${semester.code}-copy`,
            academic_year_number: semester.academic_year_number,
            season: semester.season,
            start_date: semester.start_date,
            end_date: semester.end_date,
            registration_start_date: semester.registration_start_date,
            registration_end_date: semester.registration_end_date,
            late_registration_end_date: semester.late_registration_end_date,
            add_deadline: semester.add_deadline,
            drop_deadline: semester.drop_deadline,
            withdrawal_deadline: semester.withdrawal_deadline,
            min_credit_hours: semesterCreditsFromUni.min_credit_hours,
            max_credit_hours: semesterCreditsFromUni.max_credit_hours,
            max_credit_hours_with_permission: semesterCreditsFromUni.max_credit_hours_with_permission,
            min_gpa_for_max_credits: semesterCreditsFromUni.min_gpa_for_max_credits,
            description: semester.description,
            description_ar: semester.description_ar,
            is_university_wide: semester.is_university_wide,
            college_id: semester.college_id,
            status: 'draft',
            course_registration_allowed: false,
            add_drop_allowed: false,
            withdrawal_allowed: false,
            grade_entry_allowed: false,
            attendance_editing_allowed: false,
            late_registration_allowed: false,
            created_by: userEmail
          }
          
          const { data: clonedSemester, error: cloneError } = await supabase
            .from('semesters')
            .insert(cloneData)
            .select()
            .single()
          
          if (cloneError) throw cloneError
          
          if (clonedSemester) {
            navigate(`/academic/semesters/${clonedSemester.id}`)
          }
          return
        default:
          return
      }

      updateData.last_status_change = new Date().toISOString()
      updateData.last_status_change_by = userEmail

      const { error: updateError } = await supabase
        .from('semesters')
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError
      fetchSemester()
    } catch (err) {
      console.error('Error performing lifecycle action:', err)
      setError(err.message || 'Failed to perform action')
    }
  }

  const toggleControlFlag = async (flag) => {
    if (!semester) return

    setUpdatingFlag(flag)
    try {
      const updateData = {
        [flag]: !semester[flag],
        last_status_change: new Date().toISOString(),
        last_status_change_by: (await supabase.auth.getUser()).data.user?.email || null
      }

      const { error } = await supabase
        .from('semesters')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      fetchSemester()
    } catch (err) {
      console.error('Error updating flag:', err)
      setError(err.message || 'Failed to update flag')
    } finally {
      setUpdatingFlag(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('academic.semesters.deleteConfirm'))) {
      return
    }

    setDeleting(true)
    try {
      // Check if semester has enrollments or classes
      const { count: enrollmentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('semester_id', id)
      
      if (enrollmentCount > 0) {
        throw new Error(t('academic.semesters.cannotDeleteWithEnrollments'))
      }
      
      // Check directly for classes linked to this semester
      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('semester_id', id)
      
      if (classCount > 0) {
        throw new Error(t('academic.semesters.cannotDeleteWithClasses'))
      }

      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', id)

      if (error) throw error
      navigate('/academic/semesters')
    } catch (err) {
      console.error('Error deleting semester:', err)
      setError(err.message || 'Failed to delete semester')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'DRAFT' },
      planned: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'DRAFT' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'SCHEDULED' },
      registration_open: { bg: 'bg-green-100', text: 'text-green-700', label: 'IN PROGRESS' },
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'IN PROGRESS' },
      in_progress: { bg: 'bg-green-100', text: 'text-green-700', label: 'IN PROGRESS' },
      registration_closed: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'REGISTRATION CLOSED' },
      ending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'ENDING' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'CLOSED' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'CLOSED' },
      archived: { bg: 'bg-gray-50', text: 'text-gray-400', label: 'ARCHIVED' }
    }
    const style = statusMap[status] || statusMap.planned
    return (
      <span className={`px-4 py-1.5 ${style.bg} ${style.text} rounded-full text-xs font-semibold`}>
        {style.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !semester) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('academic.semesters.back')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation & Actions */}
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-500 hover:text-gray-900 text-sm font-medium`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('academic.semesters.back')}</span>
        </button>
        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
          <button
            onClick={() => navigate(`/academic/semesters/${id}/edit`)}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-5 py-3 rounded-lg text-sm font-semibold hover:shadow-lg transition-all`}
          >
            <Edit className="w-4 h-4" />
            <span>{t('academic.semesters.edit')}</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-red-600 text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? t('academic.semesters.deleting') : t('academic.semesters.delete')}</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Semester Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className={`flex items-start ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-6'} mb-8`}>
          <div className="w-20 h-20 bg-primary-gradient rounded-2xl flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-4'} mb-2`}>
              <h1 className="text-3xl font-bold text-gray-900">{getLocalizedName(semester, isRTL)}</h1>
              {getStatusBadge(semester?.status)}
            </div>
            <p className="text-sm text-gray-500">{semester?.code}</p>
          </div>
        </div>
      </div>

      {/* Lifecycle Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">{t('academic.semesters.lifecycleActions')}</h3>
        <div className={`flex flex-wrap ${isRTL ? 'space-x-reverse' : 'space-x-3'} gap-3`}>
          {/* Open Registration - Show for draft, planned, scheduled, or when registration is closed */}
          {(semester?.status === 'draft' || semester?.status === 'planned' || semester?.status === 'scheduled' || semester?.status === 'registration_closed') && (
            <button
              onClick={() => handleLifecycleAction('open_registration')}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('academic.semesters.openRegistration')}</span>
            </button>
          )}
          
          {/* Close Registration - Show when registration is open or in progress */}
          {(semester?.status === 'registration_open' || semester?.status === 'in_progress' || semester?.status === 'active') && (
            <button
              onClick={() => handleLifecycleAction('close_registration')}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm font-semibold hover:bg-yellow-100 transition-colors`}
            >
              <Lock className="w-4 h-4" />
              <span>{t('academic.semesters.closeRegistration')}</span>
            </button>
          )}
          
          {/* Start Semester - Show when registration is closed or for draft/planned/scheduled */}
          {(semester?.status === 'registration_closed' || semester?.status === 'draft' || semester?.status === 'planned' || semester?.status === 'scheduled') && (
            <button
              onClick={() => handleLifecycleAction('start_semester')}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors`}
            >
              <Play className="w-4 h-4" />
              <span>{t('academic.semesters.startSemester')}</span>
            </button>
          )}
          
          {/* End Semester - Show when in progress, active, or registration_open */}
          {(semester?.status === 'in_progress' || semester?.status === 'active' || semester?.status === 'registration_open' || semester?.status === 'ending') && (
            <button
              onClick={() => handleLifecycleAction('end_semester')}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors`}
            >
              <Pause className="w-4 h-4" />
              <span>{t('academic.semesters.endSemester')}</span>
            </button>
          )}
          
          {/* Lock Semester - Show when closed, ending, or in_progress */}
          {(semester?.status === 'closed' || semester?.status === 'ending' || semester?.status === 'in_progress' || semester?.status === 'active') && (
            <button
              onClick={() => handleLifecycleAction('lock_semester')}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors`}
            >
              <Lock className="w-4 h-4" />
              <span>{t('academic.semesters.lockSemester')}</span>
            </button>
          )}
          
          {/* Archive - Show when closed, ending, or in_progress */}
          {(semester?.status === 'closed' || semester?.status === 'ending' || semester?.status === 'in_progress' || semester?.status === 'active' || semester?.status === 'completed') && (
            <button
              onClick={() => handleLifecycleAction('archive')}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors`}
            >
              <Archive className="w-4 h-4" />
              <span>{t('academic.semesters.archive')}</span>
            </button>
          )}
          
          {/* Clone Semester - Always available */}
          <button
            onClick={() => handleLifecycleAction('clone_semester')}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors`}
          >
            <Copy className="w-4 h-4" />
            <span>{t('academic.semesters.cloneSemester')}</span>
          </button>
        </div>
      </div>

      {/* Master Control Flags */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">{t('academic.semesters.masterControlFlags')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Course Registration */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            semester?.course_registration_allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div>
              <div className="text-sm font-semibold text-gray-900">{t('academic.semesters.courseRegistration')}</div>
              <div className="text-xs text-gray-500">{t('academic.semesters.courseRegistrationDesc')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={semester?.course_registration_allowed || false}
                onChange={() => toggleControlFlag('course_registration_allowed')}
                disabled={updatingFlag === 'course_registration_allowed'}
                className="sr-only peer"
              />
              <div className={`w-12 h-6 ${semester?.course_registration_allowed ? 'bg-green-600' : 'bg-gray-300'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>
          
          {/* Add/Drop */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            semester?.add_drop_allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div>
              <div className="text-sm font-semibold text-gray-900">{t('academic.semesters.addDropAllowed')}</div>
              <div className="text-xs text-gray-500">{t('academic.semesters.addDropAllowedDesc')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={semester?.add_drop_allowed || false}
                onChange={() => toggleControlFlag('add_drop_allowed')}
                disabled={updatingFlag === 'add_drop_allowed'}
                className="sr-only peer"
              />
              <div className={`w-12 h-6 ${semester?.add_drop_allowed ? 'bg-green-600' : 'bg-gray-300'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>
          
          {/* Withdrawal */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            semester?.withdrawal_allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div>
              <div className="text-sm font-semibold text-gray-900">{t('academic.semesters.withdrawalAllowed')}</div>
              <div className="text-xs text-gray-500">{t('academic.semesters.withdrawalAllowedDesc')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={semester?.withdrawal_allowed || false}
                onChange={() => toggleControlFlag('withdrawal_allowed')}
                disabled={updatingFlag === 'withdrawal_allowed'}
                className="sr-only peer"
              />
              <div className={`w-12 h-6 ${semester?.withdrawal_allowed ? 'bg-green-600' : 'bg-gray-300'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>
          
          {/* Grade Entry */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            semester?.grade_entry_allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div>
              <div className="text-sm font-semibold text-gray-900">{t('academic.semesters.gradeEntryAllowed')}</div>
              <div className="text-xs text-gray-500">{t('academic.semesters.gradeEntryAllowedDesc')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={semester?.grade_entry_allowed || false}
                onChange={() => toggleControlFlag('grade_entry_allowed')}
                disabled={updatingFlag === 'grade_entry_allowed'}
                className="sr-only peer"
              />
              <div className={`w-12 h-6 ${semester?.grade_entry_allowed ? 'bg-green-600' : 'bg-gray-300'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>
          
          {/* Attendance Editing */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            semester?.attendance_editing_allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div>
              <div className="text-sm font-semibold text-gray-900">{t('academic.semesters.attendanceEditingAllowed')}</div>
              <div className="text-xs text-gray-500">{t('academic.semesters.attendanceEditingAllowedDesc')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={semester?.attendance_editing_allowed || false}
                onChange={() => toggleControlFlag('attendance_editing_allowed')}
                disabled={updatingFlag === 'attendance_editing_allowed'}
                className="sr-only peer"
              />
              <div className={`w-12 h-6 ${semester?.attendance_editing_allowed ? 'bg-green-600' : 'bg-gray-300'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>
          
          {/* Late Registration */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            semester?.late_registration_allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div>
              <div className="text-sm font-semibold text-gray-900">{t('academic.semesters.lateRegistrationAllowed')}</div>
              <div className="text-xs text-gray-500">{t('academic.semesters.lateRegistrationAllowedDesc')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={semester?.late_registration_allowed || false}
                onChange={() => toggleControlFlag('late_registration_allowed')}
                disabled={updatingFlag === 'late_registration_allowed'}
                className="sr-only peer"
              />
              <div className={`w-12 h-6 ${semester?.late_registration_allowed ? 'bg-green-600' : 'bg-gray-300'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>
        </div>
      </div>

      {/* Tier 2 KPIs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">{t('academic.semesters.semesterKPIs')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Enrollments */}
          <div className="bg-primary-gradient rounded-xl p-5 text-white">
            <div className="text-xs opacity-80 mb-2">{t('academic.semesters.totalEnrollments')}</div>
            <div className="text-3xl font-bold">{kpis.totalEnrollments}</div>
            <div className="text-xs opacity-70 mt-1">+24 this week</div>
          </div>
          
          {/* Add/Drop Count */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="text-xs text-gray-500 mb-2">{t('academic.semesters.addDropCount')}</div>
            <div className="text-3xl font-bold text-gray-900">{kpis.addDropCount}</div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-green-600">+32 Added</span>
              <span className="text-xs text-red-600">-15 Dropped</span>
            </div>
          </div>
          
          {/* Withdrawals */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="text-xs text-gray-500 mb-2">{t('academic.semesters.withdrawals')}</div>
            <div className="text-3xl font-bold text-yellow-600">{kpis.withdrawals}</div>
            <div className="text-xs text-gray-400 mt-1">2.6% of enrollments</div>
          </div>
          
          {/* Courses Started */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="text-xs text-gray-500 mb-2">{t('academic.semesters.coursesStarted')}</div>
            <div className="text-3xl font-bold text-green-600">{kpis.coursesStarted}%</div>
            <div className="text-xs text-gray-400 mt-1">22 of 24 courses</div>
          </div>
          
          {/* Grades Submitted */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="text-xs text-gray-500 mb-2">{t('academic.semesters.gradesSubmitted')}</div>
            <div className="text-3xl font-bold text-blue-600">{kpis.gradesSubmitted}%</div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${kpis.gradesSubmitted}%` }}></div>
            </div>
          </div>
          
          {/* Attendance Warnings */}
          <div className="bg-red-50 rounded-xl p-5 border border-red-200">
            <div className="text-xs text-gray-500 mb-2">{t('academic.semesters.attendanceWarnings')}</div>
            <div className="text-3xl font-bold text-red-600">{kpis.attendanceWarnings}</div>
            <div className="text-xs text-gray-400 mt-1">{t('academic.semesters.studentsAtRisk')}</div>
          </div>
          
          {/* Credit Limit Blocks */}
          <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
            <div className="text-xs text-gray-500 mb-2">{t('academic.semesters.creditLimitBlocks')}</div>
            <div className="text-3xl font-bold text-yellow-600">{kpis.creditLimitBlocks}</div>
            <div className="text-xs text-gray-400 mt-1">{t('academic.semesters.studentsBlocked')}</div>
          </div>
          
          {/* Classes Active */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="text-xs text-gray-500 mb-2">{t('academic.semesters.classesActive')}</div>
            <div className="text-3xl font-bold text-gray-900">{kpis.classesActive}</div>
            <div className="text-xs text-gray-400 mt-1">{t('academic.semesters.acrossCourses', { count: 24 })}</div>
          </div>
        </div>
      </div>

      {/* Semester Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-6">{t('academic.semesters.semesterInformation')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.name')} ({t('common.english')})</div>
              <div className="text-sm font-medium text-gray-900">{getLocalizedName(semester, isRTL)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.startDate')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.start_date ? new Date(semester.start_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.nameAr')}</div>
              <div className="text-sm font-medium text-gray-900" dir="rtl">{semester?.name_ar || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.endDate')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.end_date ? new Date(semester.end_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.code')}</div>
              <div className="text-sm font-medium text-gray-900">{semester?.code}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.registrationStart')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.registration_start_date ? new Date(semester.registration_start_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.academicYear')}</div>
              <div className="text-sm font-medium text-gray-900">
                {getLocalizedName(semester?.academic_years, isRTL)} ({semester?.academic_years?.code})
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.lateRegistrationEnd')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.late_registration_end_date ? new Date(semester.late_registration_end_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.season')}</div>
              <div className="text-sm font-medium text-gray-900 capitalize">{semester?.season || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.scope')}</div>
              <span className={`inline-block px-3 py-1 rounded-md text-xs font-medium ${
                semester?.is_university_wide ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {semester?.is_university_wide ? t('academic.semesters.universityWide') : t('academic.semesters.collegeSpecific')}
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.status')}</div>
              <div className="text-sm font-medium text-green-600 capitalize">{semester?.status || 'N/A'}</div>
            </div>
            {!semester?.is_university_wide && semester?.colleges && (
              <div>
                <div className="text-xs text-gray-400 mb-1">{t('navigation.colleges')}</div>
                <div className="text-sm font-medium text-gray-900">{getLocalizedName(semester.colleges, isRTL)}</div>
              </div>
            )}
          </div>
          
          {/* Academic Deadlines */}
          <h4 className="text-sm font-semibold text-gray-900 mb-4 pt-6 border-t border-gray-200">{t('academic.semesters.academicDeadlines')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.addDeadline')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.add_deadline ? new Date(semester.add_deadline).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.dropDeadline')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.drop_deadline ? new Date(semester.drop_deadline).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.withdrawalDeadline')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.withdrawal_deadline ? new Date(semester.withdrawal_deadline).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </div>
            </div>
          </div>
          
          {/* Credit Hours - From University Settings (read-only) */}
          <h4 className="text-sm font-semibold text-gray-900 mb-4 pt-6 border-t border-gray-200">{t('academic.semesters.creditHoursConfig')}</h4>
          <p className="text-xs text-gray-500 mb-4">{t('academic.semesters.creditHoursFromUniversitySettings') || 'Semester credit limits are configured in University Settings.'}</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.minCredits')}</div>
              <div className="text-sm font-medium text-gray-900">{semesterCreditsFromUni.min_credit_hours}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.maxCredits')}</div>
              <div className="text-sm font-medium text-gray-900">{semesterCreditsFromUni.max_credit_hours}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.maxWithPermission')}</div>
              <div className="text-sm font-medium text-gray-900">{semesterCreditsFromUni.max_credit_hours_with_permission}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.minGpaForMax')}</div>
              <div className="text-sm font-medium text-gray-900">{semesterCreditsFromUni.min_gpa_for_max_credits}</div>
            </div>
          </div>
          
          {/* Description */}
          <h4 className="text-sm font-semibold text-gray-900 mb-4 pt-6 border-t border-gray-200">{t('academic.semesters.description')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('common.english')}</div>
              <div className="text-sm text-gray-900">{semester?.description || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('common.arabic')}</div>
              <div className="text-sm text-gray-900" dir="rtl">{semester?.description_ar || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        {/* Audit Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-fit">
          <h3 className="text-base font-semibold text-gray-900 mb-6">{t('academic.semesters.auditInformation')}</h3>
          
          <div className="space-y-5">
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.createdBy')}</div>
              <div className="text-sm font-medium text-gray-900">{semester?.created_by || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.createdDate')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.created_at ? new Date(semester.created_at).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.lastModifiedBy')}</div>
              <div className="text-sm font-medium text-gray-900">{semester?.last_status_change_by || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.lastModifiedDate')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.updated_at ? new Date(semester.updated_at).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.lastStatusChange')}</div>
              <div className="text-sm font-medium text-gray-900">
                {semester?.last_status_change ? new Date(semester.last_status_change).toLocaleString() : 'N/A'}
              </div>
              {semester?.last_status_change && (
                <div className="text-xs text-gray-500 mt-1">Draft → {semester.status}</div>
              )}
            </div>
          </div>
          
          {/* Status History */}
          <h4 className="text-sm font-semibold text-gray-900 mb-4 mt-6 pt-6 border-t border-gray-200">{t('academic.semesters.statusHistory')}</h4>
          <div className="relative pl-5">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>
            
            <div className="relative mb-4">
              <div className="absolute left-[-21px] top-1.5 w-2.5 h-2.5 bg-green-600 rounded-full"></div>
              <div className="text-sm font-medium text-gray-900 capitalize">{semester?.status || 'N/A'}</div>
              <div className="text-xs text-gray-500">
                {semester?.last_status_change ? new Date(semester.last_status_change).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            
            <div className="relative mb-4">
              <div className="absolute left-[-21px] top-1.5 w-2.5 h-2.5 bg-yellow-600 rounded-full"></div>
              <div className="text-sm font-medium text-gray-900">{t('academic.semesters.registrationClosed')}</div>
              <div className="text-xs text-gray-500">
                {semester?.registration_end_date ? new Date(semester.registration_end_date).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            
            <div className="relative mb-4">
              <div className="absolute left-[-21px] top-1.5 w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
              <div className="text-sm font-medium text-gray-900">{t('academic.semesters.registrationOpen')}</div>
              <div className="text-xs text-gray-500">
                {semester?.registration_start_date ? new Date(semester.registration_start_date).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute left-[-21px] top-1.5 w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
              <div className="text-sm font-medium text-gray-900">{t('academic.semesters.statusDraft')}</div>
              <div className="text-xs text-gray-500">
                {semester?.created_at ? new Date(semester.created_at).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
