import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, Edit, CalendarDays, Trash2, Users, FileText, AlertTriangle, 
  DollarSign, CreditCard, Copy, CheckCircle,
  TrendingUp
} from 'lucide-react'

export default function ViewAcademicYear() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [academicYear, setAcademicYear] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [kpis, setKpis] = useState({
    totalEnrollments: 0,
    gradesSubmitted: 0,
    coursesMissingGrades: 0,
    attendanceWarnings: 0,
    feesCollected: 0,
    outstandingBalances: 0
  })
  const [updatingFlag, setUpdatingFlag] = useState(null)
  const [lifecycleLoading, setLifecycleLoading] = useState(false)

  const statusTransitions = {
    draft: 'scheduled',
    scheduled: 'in_progress',
    in_progress: 'closing',
    closing: 'closed',
    closed: 'archived',
    archived: null
  }
  const legacyStatusMap = {
    planned: 'draft',
    active: 'in_progress',
    completed: 'closed'
  }
  const statusTranslationKeys = {
    draft: 'statusDraft',
    scheduled: 'statusScheduled',
    in_progress: 'statusInProgress',
    closing: 'statusClosing',
    closed: 'statusClosed',
    archived: 'statusArchived'
  }
  const normalizeStatus = (status) => legacyStatusMap[status] || status

  const normalizedStatus = normalizeStatus(academicYear?.status)
  const isReadOnlyStatus = ['closed', 'archived'].includes(normalizedStatus)
  const displayTitleName = isRTL
    ? (academicYear?.name_ar || '')
    : (academicYear?.name_en || getLocalizedName(academicYear, isRTL))

  useEffect(() => {
    fetchAcademicYear()
    if (id) {
      fetchKPIs()
    }
  }, [id])

  const fetchAcademicYear = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      
      // Fetch college data if college_id exists
      if (data.college_id) {
        const { data: collegeData } = await supabase
          .from('colleges')
          .select('id, name_en, name_ar, code')
          .eq('id', data.college_id)
          .single()
        
        data.colleges = collegeData || null
      } else {
        data.colleges = null
      }
      
      setAcademicYear(data)
    } catch (err) {
      console.error('Error fetching academic year:', err)
      setError(err.message || 'Failed to load academic year')
    } finally {
      setLoading(false)
    }
  }

  const fetchKPIs = async () => {
    try {
      // Fetch enrollments for this academic year
      const { data: semesters } = await supabase
        .from('semesters')
        .select('id')
        .eq('academic_year_id', id)

      const semesterIds = semesters?.map(s => s.id) || []

      if (semesterIds.length > 0) {
        const { count: enrollmentCount } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .in('semester_id', semesterIds)

        setKpis(prev => ({
          ...prev,
          totalEnrollments: enrollmentCount || 0
        }))
      }

      // TODO: Fetch other KPIs (grades, attendance, fees) when those tables are available
    } catch (err) {
      console.error('Error fetching KPIs:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('academic.academicYears.deleteConfirm'))) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .eq('id', id)

      if (error) throw error
      navigate('/academic/years')
    } catch (err) {
      console.error('Error deleting academic year:', err)
      setError(err.message || 'Failed to delete academic year')
    } finally {
      setDeleting(false)
    }
  }

  const handleLifecycleAction = async (action) => {
    if (!academicYear) return

    setError('') // Clear any previous errors
    setLifecycleLoading(true)
    try {
      let updateData = {}
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email || null

      switch (action) {
        case 'clone_year': {
          if (!confirm(t('academic.academicYears.cloneConfirm', 'Create a draft copy of this academic year?'))) {
            return
          }
          // Clone the academic year - only include fields that should be copied
          // Generate a unique code by checking for existing copies
          let cloneCode = `${academicYear.code}-copy`
          let counter = 1
          while (true) {
            const { data: existing } = await supabase
              .from('academic_years')
              .select('id')
              .eq('code', cloneCode)
              .maybeSingle()
            
            if (!existing) break
            cloneCode = `${academicYear.code}-copy-${counter}`
            counter++
          }
          
          const cloneData = {
            name_en: `${academicYear.name_en} (Copy)`,
            name_ar: academicYear.name_ar ? `${academicYear.name_ar} (نسخة)` : null,
            code: cloneCode,
            start_date: academicYear.start_date,
            end_date: academicYear.end_date,
            description: academicYear.description,
            description_ar: academicYear.description_ar,
            is_university_wide: academicYear.is_university_wide,
            college_id: academicYear.college_id,
            status: 'draft',
            is_current: false,
            registration_open: false,
            grade_entry_allowed: false,
            attendance_editing_allowed: false,
            financial_posting_allowed: false,
            created_by: userEmail
          }
          
          const { data: clonedYear, error: cloneError } = await supabase
            .from('academic_years')
            .insert(cloneData)
            .select()
            .single()
          
          if (cloneError) throw cloneError
          
          if (clonedYear) {
            navigate(`/academic/years/${clonedYear.id}`)
          }
          return
        }
        case 'advance_status': {
          const nextStatus = statusTransitions[normalizedStatus]
          if (!nextStatus) return
          if (!confirm(`${t('academic.academicYears.moveTo', 'Move to')}: ${getStatusLabel(nextStatus)}?`)) {
            return
          }

          updateData = {
            status: nextStatus
          }

          // Lifecycle-safe defaults
          if (nextStatus === 'closing') {
            updateData.registration_open = false
          }
          if (nextStatus === 'closed' || nextStatus === 'archived') {
            updateData.registration_open = false
            updateData.grade_entry_allowed = false
            updateData.attendance_editing_allowed = false
            updateData.financial_posting_allowed = false
            updateData.is_current = false
          }
          break
        }
        case 'set_as_current': {
          if (!confirm(t('academic.academicYears.setCurrentConfirm', 'Set this academic year as current?'))) {
            return
          }
          // First, unset all other current years (respecting scope)
          let unsetQuery = supabase
            .from('academic_years')
            .update({ is_current: false })
            .eq('is_current', true)
            .neq('id', id)
          
          // If this is a college-specific year, only unset other years for the same college
          if (!academicYear.is_university_wide && academicYear.college_id) {
            unsetQuery = unsetQuery.eq('college_id', academicYear.college_id)
          } else if (academicYear.is_university_wide) {
            // If setting a university-wide year as current, unset all university-wide years
            unsetQuery = unsetQuery.eq('is_university_wide', true)
          }
          
          const { error: unsetError } = await unsetQuery
          if (unsetError) throw unsetError
          
          // Now set this year as current
          // Setting current implicitly activates the year to avoid "current vs in_progress" confusion
          updateData = { is_current: true, status: 'in_progress' }
          break
        }
        default:
          return
      }

      updateData.last_status_change = new Date().toISOString()
      updateData.last_status_change_by = userEmail
      updateData.last_status_change_reason = action

      const { error } = await supabase
        .from('academic_years')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      fetchAcademicYear()
    } catch (err) {
      console.error('Error performing lifecycle action:', err)
      setError(err.message || 'Failed to perform action')
    } finally {
      setLifecycleLoading(false)
    }
  }

  const toggleControlFlag = async (flag) => {
    if (!academicYear) return
    if (isReadOnlyStatus) return

    setUpdatingFlag(flag)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email || null

      const updateData = {
        [flag]: !academicYear[flag],
        last_status_change: new Date().toISOString(),
        last_status_change_by: userEmail
      }

      const { error } = await supabase
        .from('academic_years')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      fetchAcademicYear()
    } catch (err) {
      console.error('Error toggling control flag:', err)
      setError(err.message || 'Failed to update flag')
    } finally {
      setUpdatingFlag(null)
    }
  }

  const getStatusBadge = (status) => {
    const normalized = normalizeStatus(status)
    const statusMap = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800' },
      in_progress: { bg: 'bg-primary-gradient', text: 'text-white' },
      closing: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-600' },
      archived: { bg: 'bg-gray-50', text: 'text-gray-500' }
    }
    const style = statusMap[normalized] || statusMap.draft
    return (
      <span className={`px-4 py-1.5 ${style.bg} ${style.text} rounded-full text-xs font-semibold`}>
        {getStatusLabel(normalized).toUpperCase()}
      </span>
    )
  }

  const getStatusLabel = (status) => {
    const normalized = normalizeStatus(status)
    if (!normalized) return 'N/A'
    const translationKey = statusTranslationKeys[normalized]
    return translationKey ? t(`academic.academicYears.${translationKey}`) : normalized
  }

  const showSetAsCurrent = !academicYear?.is_current && ['scheduled', 'in_progress'].includes(normalizedStatus)
  const nextStatus = normalizedStatus ? statusTransitions[normalizedStatus] : null
  const showAdvanceStatus = Boolean(nextStatus) && !(normalizedStatus === 'scheduled' && showSetAsCurrent)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !academicYear) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('academic.academicYears.back')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Back Button & Actions */}
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <button
          onClick={() => navigate('/academic/years')}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('academic.academicYears.back')}</span>
        </button>
        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : 'space-x-3'}`}>
          <button
            onClick={() => navigate(`/academic/years/${id}/edit`)}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-5 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all`}
          >
            <Edit className="w-4 h-4" />
            <span>{t('common.edit')}</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-red-50 text-red-600 border border-red-200 px-5 py-2.5 rounded-lg font-semibold hover:bg-red-100 transition-all disabled:opacity-50`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? t('academic.academicYears.deleting') : t('academic.academicYears.delete')}</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Academic Year Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className={`flex items-start gap-6 mb-8 ${isRTL ? 'text-right' : 'text-left'}`}
        >
          <div className="w-20 h-20 bg-primary-gradient rounded-2xl flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className={`text-3xl font-bold text-gray-900 inline-flex items-baseline ${isRTL ? 'flex-row' : 'flex-row'} gap-2`} dir={isRTL ? 'rtl' : 'ltr'}>
                <span dir="auto" className="inline-block [unicode-bidi:isolate]">
                  {displayTitleName}
                </span>
                <span>-</span>
                <span dir="auto" className="inline-block [unicode-bidi:isolate]">
                  {getLocalizedName(academicYear?.colleges, isRTL) || t('academic.academicYears.universityWideLabel')}
                </span>
              </h1>
              {getStatusBadge(academicYear?.status)}
            </div>
            <p className={`text-gray-600 inline-flex items-baseline gap-2 ${isRTL ? 'flex-row' : 'flex-row'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <span dir="auto" className="inline-block [unicode-bidi:isolate]">{academicYear?.code}</span>
              <span>-</span>
              <span dir="auto" className="inline-block [unicode-bidi:isolate]">
                {getLocalizedName(academicYear?.colleges, isRTL) || t('academic.academicYears.universityWideLabel')}
              </span>
            </p>
          </div>
        </div>

        {/* Basic Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {!isRTL && (
            <div className="text-left">
              <div className="text-xs text-gray-600 mb-1.5">{t('academic.academicYears.nameEn')}</div>
              <div className="text-sm font-semibold text-gray-900">{academicYear?.name_en || 'N/A'}</div>
            </div>
          )}
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-xs text-gray-600 mb-1.5">{t('academic.academicYears.startDate')}</div>
            <div className="text-sm font-semibold text-gray-900">
              {academicYear?.start_date ? new Date(academicYear.start_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-xs text-gray-600 mb-1.5">{t('academic.academicYears.nameAr')}</div>
            <div className="text-sm font-semibold text-gray-900" dir="rtl">
              {academicYear?.name_ar || 'N/A'}
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-xs text-gray-600 mb-1.5">{t('academic.academicYears.endDate')}</div>
            <div className="text-sm font-semibold text-gray-900">
              {academicYear?.end_date ? new Date(academicYear.end_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-xs text-gray-600 mb-1.5">{t('academic.academicYears.code')}</div>
            <div className="text-sm font-semibold text-gray-900">{academicYear?.code}</div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-xs text-gray-600 mb-1.5">{t('academic.academicYears.isCurrent')}</div>
            <div className="text-sm font-semibold text-gray-900">
              {academicYear?.is_current ? t('common.yes') : t('common.no')}
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-xs text-gray-600 mb-1.5">{t('academic.academicYears.status')}</div>
            <div className="text-sm font-semibold text-green-600 capitalize">{getStatusLabel(academicYear?.status)}</div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="text-xs text-gray-600 mb-1.5">{t('academic.academicYears.scope')}</div>
            <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
              {academicYear?.is_university_wide 
                ? t('academic.academicYears.universityWideLabel') 
                : t('academic.academicYears.collegeSpecific')}
            </span>
          </div>
        </div>
      </div>

      {/* Lifecycle Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className={`text-lg font-semibold text-gray-900 mb-5 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academic.academicYears.lifecycleActions')}</h2>
        <p className="text-sm text-gray-600 mb-4">
          {t('academic.academicYears.lifecycleHelp')}
        </p>
        <div className={`flex flex-wrap ${isRTL ? 'space-x-reverse' : 'space-x-3'} gap-3`}>
          {showSetAsCurrent && (
            <button
              onClick={() => handleLifecycleAction('set_as_current')}
              disabled={lifecycleLoading}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-primary-gradient text-white border border-primary-600 rounded-lg text-sm font-semibold hover:shadow-lg transition-colors disabled:opacity-50`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{t('academic.academicYears.setAsCurrent')}</span>
            </button>
          )}
          <button
            onClick={() => handleLifecycleAction('clone_year')}
            disabled={lifecycleLoading}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-50`}
          >
            <Copy className="w-4 h-4" />
            <span>{t('academic.academicYears.cloneYear')}</span>
          </button>
          {showAdvanceStatus && (
            <button
              onClick={() => handleLifecycleAction('advance_status')}
              disabled={lifecycleLoading}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-5 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>{`${t('academic.academicYears.moveTo')}: ${getStatusLabel(nextStatus)}`}</span>
            </button>
          )}
        </div>
      </div>

      {/* System Control Flags */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">{t('academic.academicYears.systemControlFlags')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Registration Open */}
          <div className={`${academicYear?.registration_open ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-5`}>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'} mb-3`}>
              <Users className={`w-6 h-6 ${academicYear?.registration_open ? 'text-green-600' : 'text-gray-600'}`} />
              <button
                onClick={() => toggleControlFlag('registration_open')}
                disabled={updatingFlag === 'registration_open' || isReadOnlyStatus}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  academicYear?.registration_open ? 'bg-green-600' : 'bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`absolute top-0.5 ${isRTL ? 'right-0.5' : 'left-0.5'} w-5 h-5 bg-white rounded-full transition-transform ${
                  academicYear?.registration_open ? (isRTL ? 'translate-x-0' : 'translate-x-6') : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className={`text-sm font-semibold ${academicYear?.registration_open ? 'text-green-900' : 'text-gray-900'} mb-1`}>
              {t('academic.academicYears.registrationOpen')}
            </div>
            <div className={`text-xs ${academicYear?.registration_open ? 'text-green-600' : 'text-gray-600'}`}>
              {academicYear?.registration_open 
                ? t('academic.academicYears.studentsCanRegister') 
                : t('academic.academicYears.studentsCannotRegister')}
            </div>
          </div>

          {/* Grade Entry Allowed */}
          <div className={`${academicYear?.grade_entry_allowed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-5`}>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'} mb-3`}>
              <FileText className={`w-6 h-6 ${academicYear?.grade_entry_allowed ? 'text-green-600' : 'text-gray-600'}`} />
              <button
                onClick={() => toggleControlFlag('grade_entry_allowed')}
                disabled={updatingFlag === 'grade_entry_allowed' || isReadOnlyStatus}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  academicYear?.grade_entry_allowed ? 'bg-green-600' : 'bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`absolute top-0.5 ${isRTL ? 'right-0.5' : 'left-0.5'} w-5 h-5 bg-white rounded-full transition-transform ${
                  academicYear?.grade_entry_allowed ? (isRTL ? 'translate-x-0' : 'translate-x-6') : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className={`text-sm font-semibold ${academicYear?.grade_entry_allowed ? 'text-green-900' : 'text-gray-900'} mb-1`}>
              {t('academic.academicYears.gradeEntryAllowed')}
            </div>
            <div className={`text-xs ${academicYear?.grade_entry_allowed ? 'text-green-600' : 'text-gray-600'}`}>
              {academicYear?.grade_entry_allowed 
                ? t('academic.academicYears.instructorsCanEnterGrades') 
                : t('academic.academicYears.instructorsCannotEnterGrades')}
            </div>
          </div>

          {/* Attendance Editing Allowed */}
          <div className={`${academicYear?.attendance_editing_allowed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-5`}>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'} mb-3`}>
              <CheckCircle className={`w-6 h-6 ${academicYear?.attendance_editing_allowed ? 'text-green-600' : 'text-gray-600'}`} />
              <button
                onClick={() => toggleControlFlag('attendance_editing_allowed')}
                disabled={updatingFlag === 'attendance_editing_allowed' || isReadOnlyStatus}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  academicYear?.attendance_editing_allowed ? 'bg-green-600' : 'bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`absolute top-0.5 ${isRTL ? 'right-0.5' : 'left-0.5'} w-5 h-5 bg-white rounded-full transition-transform ${
                  academicYear?.attendance_editing_allowed ? (isRTL ? 'translate-x-0' : 'translate-x-6') : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className={`text-sm font-semibold ${academicYear?.attendance_editing_allowed ? 'text-green-900' : 'text-gray-900'} mb-1`}>
              {t('academic.academicYears.attendanceEditing')}
            </div>
            <div className={`text-xs ${academicYear?.attendance_editing_allowed ? 'text-green-600' : 'text-gray-600'}`}>
              {academicYear?.attendance_editing_allowed 
                ? t('academic.academicYears.attendanceCanBeModified') 
                : t('academic.academicYears.attendanceCannotBeModified')}
            </div>
          </div>

          {/* Financial Posting Allowed */}
          <div className={`${academicYear?.financial_posting_allowed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded-xl p-5`}>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'} mb-3`}>
              <DollarSign className={`w-6 h-6 ${academicYear?.financial_posting_allowed ? 'text-green-600' : 'text-yellow-600'}`} />
              <button
                onClick={() => toggleControlFlag('financial_posting_allowed')}
                disabled={updatingFlag === 'financial_posting_allowed' || isReadOnlyStatus}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  academicYear?.financial_posting_allowed ? 'bg-green-600' : 'bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`absolute top-0.5 ${isRTL ? 'right-0.5' : 'left-0.5'} w-5 h-5 bg-white rounded-full transition-transform ${
                  academicYear?.financial_posting_allowed ? (isRTL ? 'translate-x-0' : 'translate-x-6') : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className={`text-sm font-semibold ${academicYear?.financial_posting_allowed ? 'text-green-900' : 'text-yellow-900'} mb-1`}>
              {t('academic.academicYears.financialPosting')}
            </div>
            <div className={`text-xs ${academicYear?.financial_posting_allowed ? 'text-green-600' : 'text-yellow-600'}`}>
              {academicYear?.financial_posting_allowed 
                ? t('academic.academicYears.financialTransactionsAllowed') 
                : t('academic.academicYears.currentlyDisabled')}
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2 KPIs */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-5">{t('academic.academicYears.yearSpecificKPIs')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Total Enrollments */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-400 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-1">{t('academic.academicYears.totalEnrollments')}</div>
            <div className="text-3xl font-bold text-gray-900">{kpis.totalEnrollments.toLocaleString()}</div>
            <div className="text-xs text-green-600 mt-2 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12% {t('academic.academicYears.fromLastYear')}</span>
            </div>
          </div>

          {/* Grades Submitted */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-400 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-1">{t('academic.academicYears.gradesSubmitted')}</div>
            <div className="text-3xl font-bold text-gray-900">{kpis.gradesSubmitted}%</div>
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" style={{ width: `${kpis.gradesSubmitted}%` }} />
              </div>
            </div>
          </div>

          {/* Courses Missing Grades */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-400 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-1">{t('academic.academicYears.coursesMissingGrades')}</div>
            <div className="text-3xl font-bold text-yellow-600">{kpis.coursesMissingGrades}</div>
            <div className="text-xs text-gray-600 mt-2">{t('academic.academicYears.outOfCourses', { total: 108 })}</div>
          </div>

          {/* Attendance Warnings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-400 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-1">{t('academic.academicYears.attendanceWarnings')}</div>
            <div className="text-3xl font-bold text-red-600">{kpis.attendanceWarnings}</div>
            <div className="text-xs text-gray-600 mt-2">{t('academic.academicYears.studentsBelowThreshold')}</div>
          </div>

          {/* Fees Collected */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-400 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-1">{t('academic.academicYears.feesCollected')}</div>
            <div className="text-3xl font-bold text-gray-900">{kpis.feesCollected}%</div>
            <div className="mt-3">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: `${kpis.feesCollected}%` }} />
              </div>
            </div>
          </div>

          {/* Outstanding Balances */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-400 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-gray-600 mb-1">{t('academic.academicYears.outstandingBalances')}</div>
            <div className="text-3xl font-bold text-gray-900">${kpis.outstandingBalances.toLocaleString()}</div>
            <div className="text-xs text-gray-600 mt-2">{t('academic.academicYears.fromStudents', { count: 156 })}</div>
          </div>
        </div>
      </div>

      {/* Audit Information */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">{t('academic.academicYears.auditInformation')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-gray-500 mb-1">{t('academic.academicYears.createdBy')}</div>
            <div className="text-sm font-medium text-gray-700">{academicYear?.created_by || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">{t('academic.academicYears.createdDate')}</div>
            <div className="text-sm font-medium text-gray-700">
              {academicYear?.created_at ? new Date(academicYear.created_at).toLocaleString() : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">{t('academic.academicYears.lastStatusChange')}</div>
            <div className="text-sm font-medium text-gray-700">
              {academicYear?.last_status_change 
                ? `${new Date(academicYear.last_status_change).toLocaleString()} (${t('academic.academicYears.setTo')} ${academicYear.status})`
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
