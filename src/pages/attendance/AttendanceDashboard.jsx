import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  FileText,
  Zap,
  TrendingUp,
  Clock,
} from 'lucide-react'

export default function AttendanceDashboard() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const navigate = useNavigate()
  const { userRole, collegeId, departmentId } = useAuth()
  const isArabicLayout = isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')

  const [loading, setLoading] = useState(true)
  const [semesters, setSemesters] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [stats, setStats] = useState({
    todaySessions: 0,
    recorded: 0,
    lowAttendanceAlerts: 0,
    pendingContests: 0,
  })

  useEffect(() => {
    fetchStats()
    fetchSemesters()
  }, [collegeId, userRole])

  useEffect(() => {
    if (selectedSemesterId) {
      fetchClasses()
    } else {
      setClasses([])
      setSelectedClassId('')
    }
  }, [selectedSemesterId, collegeId, userRole])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      let classSessionsQuery = supabase
        .from('class_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('session_date', today)

      let attendanceQuery = supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('date', today)

      if (userRole === 'user' && collegeId) {
        classSessionsQuery = classSessionsQuery.eq('college_id', collegeId)
        attendanceQuery = attendanceQuery.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        classSessionsQuery = classSessionsQuery.eq('college_id', collegeId)
        attendanceQuery = attendanceQuery.eq('college_id', collegeId)
      }

      if (userRole === 'student') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          const { data: studentData } = await supabase
            .from('students')
            .select('id')
            .eq('email', user.email)
            .single()

          if (studentData?.id) {
            attendanceQuery = attendanceQuery.eq('student_id', studentData.id)
          }
        }
      }

      const [sessionsRes, attendanceRes] = await Promise.all([
        classSessionsQuery,
        attendanceQuery,
      ])

      setStats({
        todaySessions: sessionsRes.count || 0,
        recorded: attendanceRes.count || 0,
        lowAttendanceAlerts: 0,
        pendingContests: 0,
      })
    } catch (err) {
      console.error('Error fetching attendance stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSemesters = async () => {
    if (userRole === 'user' && !collegeId) return
    if (userRole === 'instructor' && !collegeId) return

    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, name_ar, code, start_date, end_date')
        .order('start_date', { ascending: false })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setSemesters([])
    }
  }

  const fetchClasses = async () => {
    try {
      let query = supabase
        .from('classes')
        .select('id, code, section, subjects(name_en, name_ar, code)')
        .eq('status', 'active')
        .eq('semester_id', selectedSemesterId)
        .order('code')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }

  const quickActions = [
    {
      title: t('attendance.dashboard.viewAlerts'),
      description: t('attendance.dashboard.viewAlertsDesc'),
      icon: AlertTriangle,
      color: 'yellow',
      onClick: () => navigate('/attendance/alerts'),
    },
    {
      title: t('attendance.dashboard.reviewContests'),
      description: t('attendance.dashboard.reviewContestsDesc'),
      icon: FileText,
      color: 'blue',
      onClick: () => navigate('/attendance/contests'),
    },
    {
      title: t('attendance.dashboard.generateReports'),
      description: t('attendance.dashboard.generateReportsDesc'),
      icon: TrendingUp,
      color: 'blue',
      onClick: () => navigate('/attendance/reports'),
    },
  ]

  const statCardInner = (iconBg, Icon, iconColor, labelKey, value) => (
    <div
      className="flex items-center gap-3"
      dir={isArabicLayout ? 'rtl' : 'ltr'}
    >
      <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className={`min-w-0 flex-1 ${isArabicLayout ? 'text-right' : 'text-left'}`}>
        <p className="text-sm text-gray-600">{t(labelKey)}</p>
        <p className="text-2xl font-bold text-gray-900">{loading ? '-' : value}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      {/* Header — in RTL, flex justify-start aligns to inline-start (= right), not justify-end */}
      <div
        className={isArabicLayout ? 'text-right' : 'text-left'}
        dir={isArabicLayout ? 'rtl' : 'ltr'}
      >
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2 justify-start">
          {isArabicLayout ? (
            <>
              <span>{t('attendance.dashboard.title')}</span>
              <Calendar className="w-8 h-8 flex-shrink-0" aria-hidden />
            </>
          ) : (
            <>
              <Calendar className="w-8 h-8 flex-shrink-0" aria-hidden />
              <span>{t('attendance.dashboard.title')}</span>
            </>
          )}
        </h1>
        <p className="text-gray-600 mt-1">{t('attendance.dashboard.subtitle')}</p>
      </div>

      {/* Summary Cards — RTL: icon on right via dir=rtl on inner flex */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        dir={isArabicLayout ? 'rtl' : 'ltr'}
      >
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          {statCardInner('bg-blue-100', Calendar, 'text-blue-600', 'attendance.dashboard.todaysSessions', stats.todaySessions)}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
          {statCardInner('bg-green-100', CheckCircle, 'text-green-600', 'attendance.dashboard.recorded', stats.recorded)}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
          {statCardInner('bg-yellow-100', AlertTriangle, 'text-yellow-600', 'attendance.dashboard.lowAttendanceAlerts', stats.lowAttendanceAlerts)}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          {statCardInner('bg-blue-100', FileText, 'text-blue-600', 'attendance.dashboard.pendingContests', stats.pendingContests)}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2
          className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"
          dir={isArabicLayout ? 'rtl' : 'ltr'}
        >
          <Zap className="w-5 h-5 flex-shrink-0" />
          <span>{t('attendance.dashboard.quickActions')}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir={isArabicLayout ? 'rtl' : 'ltr'}>
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={action.onClick}
              className={`p-4 rounded-lg border-2 border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-all text-left ${isArabicLayout ? 'text-right' : 'text-left'}`}
            >
              <div className="flex items-start gap-3" dir={isArabicLayout ? 'rtl' : 'ltr'}>
                <action.icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                  action.color === 'yellow' ? 'text-yellow-600' : 'text-blue-600'
                }`}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Find Class Sessions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2
          className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"
          dir={isArabicLayout ? 'rtl' : 'ltr'}
        >
          <Clock className="w-5 h-5 flex-shrink-0" />
          <span>{t('attendance.dashboard.findClassSessions')}</span>
        </h2>
        <div
          className="flex flex-col md:flex-row flex-wrap gap-4"
          dir={isArabicLayout ? 'rtl' : 'ltr'}
        >
          <select
            value={selectedSemesterId}
            onChange={(e) => {
              setSelectedSemesterId(e.target.value)
              setSelectedClassId('')
            }}
            className={`flex-1 min-w-[12rem] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 ${isArabicLayout ? 'text-right' : 'text-left'}`}
          >
            <option value="">{t('attendance.dashboard.selectSemester')}</option>
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {getLocalizedName(semester, isArabicLayout)} ({semester.code})
              </option>
            ))}
          </select>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={!selectedSemesterId || classes.length === 0}
            className={`flex-1 min-w-[12rem] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${isArabicLayout ? 'text-right' : 'text-left'}`}
          >
            <option value="">
              {selectedSemesterId && classes.length === 0
                ? t('attendance.dashboard.noClassesAvailable')
                : t('attendance.dashboard.selectClass')}
            </option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.code}-{cls.section} — {getLocalizedName(cls.subjects, isArabicLayout) || cls.subjects?.code}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (selectedClassId) {
                navigate(`/attendance/sessions?classId=${selectedClassId}`)
              } else {
                navigate('/attendance/sessions')
              }
            }}
            disabled={!selectedClassId}
            className={`px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isArabicLayout ? 'flex-row-reverse' : ''}`}
          >
            <span>{t('attendance.dashboard.viewSessions')}</span>
            <Clock className="w-4 h-4 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div
          className="flex items-center justify-between gap-3 mb-4 flex-wrap"
          dir={isArabicLayout ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <h2 className="text-xl font-bold text-gray-900">{t('attendance.dashboard.recentActivity')}</h2>
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex-shrink-0">0</span>
        </div>
        <div className={`py-12 text-gray-500 ${isArabicLayout ? 'text-right' : 'text-center'}`}>
          <FileText className={`w-16 h-16 mb-4 opacity-50 ${isArabicLayout ? 'mr-0 ml-auto' : 'mx-auto'}`} />
          <p className="text-lg font-medium">{t('attendance.dashboard.noRecentActivity')}</p>
          <p className="text-sm mt-2">{t('attendance.dashboard.noRecentActivityDesc')}</p>
        </div>
      </div>
    </div>
  )
}
