import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { BarChart3, PieChart, TrendingUp, Users, FileText, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

export default function ExaminationStatistics() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const { userRole, collegeId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalExaminations: 0,
    completed: 0,
    studentsTested: 0,
    totalResults: 0,
    passRate: 0,
    averageScore: null,
    attendanceRate: 0,
    graded: 0,
    pending: 0,
    upcoming: 0,
    cancelledExams: 0,
    activeConflicts: 0,
    totalIncidents: 0,
    makeupRequests: 0,
  })
  const [examTypes, setExamTypes] = useState([])
  const [statusDistribution, setStatusDistribution] = useState([])

  const isArabicLayout = isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')

  const getExamTypeLabel = (examType) => {
    if (!examType) return t('examinations.types.other')
    const lower = examType.toLowerCase()
    if (lower.includes('final')) return t('examinations.types.final')
    if (lower.includes('midterm')) return t('examinations.types.midterm')
    if (lower.includes('quiz')) return t('examinations.types.quiz')
    if (lower.includes('assignment')) return t('examinations.types.assignment')
    if (lower.includes('project')) return t('examinations.types.project')
    if (lower.includes('lab')) return t('examinations.types.lab')
    if (lower.includes('oral')) return t('examinations.types.oral')
    if (lower.includes('practical')) return t('examinations.types.practical')
    if (lower.includes('other')) return t('examinations.types.other')
    return examType
  }

  const getStatusLabel = (status) => t(`examinations.statuses.${status}`, { defaultValue: status })

  useEffect(() => {
    fetchStatistics()
  }, [collegeId, userRole])

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchOverallStats(),
        fetchPerformanceStats(),
        fetchExamTypes(),
        fetchStatusDistribution(),
        fetchAdditionalStats(),
      ])
    } catch (err) {
      console.error('Error fetching statistics:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchOverallStats = async () => {
    try {
      let query = supabase
        .from('examinations')
        .select('id, status', { count: 'exact' })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { count, data } = await query
      
      const completed = data?.filter(e => e.status === 'completed').length || 0
      
      setStats(prev => ({
        ...prev,
        totalExaminations: count || 0,
        completed,
      }))
    } catch (err) {
      console.error('Error fetching overall stats:', err)
    }
  }

  const fetchPerformanceStats = async () => {
    try {
      // Placeholder - would require exam_results table
      setStats(prev => ({
        ...prev,
        passRate: 0,
        averageScore: null,
        attendanceRate: 0,
        graded: 0,
        pending: 0,
      }))
    } catch (err) {
      console.error('Error fetching performance stats:', err)
    }
  }

  const fetchExamTypes = async () => {
    try {
      let query = supabase
        .from('examinations')
        .select('exam_type')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data } = await query
      
      if (data) {
        const typeCounts = {}
        data.forEach(exam => {
          typeCounts[exam.exam_type] = (typeCounts[exam.exam_type] || 0) + 1
        })
        setExamTypes(Object.entries(typeCounts).map(([type, count]) => ({ type, count })))
      }
    } catch (err) {
      console.error('Error fetching exam types:', err)
    }
  }

  const fetchStatusDistribution = async () => {
    try {
      let query = supabase
        .from('examinations')
        .select('status')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data } = await query
      
      if (data) {
        const statusCounts = {}
        data.forEach(exam => {
          statusCounts[exam.status] = (statusCounts[exam.status] || 0) + 1
        })
        setStatusDistribution(Object.entries(statusCounts).map(([status, count]) => ({ status, count })))
      }
    } catch (err) {
      console.error('Error fetching status distribution:', err)
    }
  }

  const fetchAdditionalStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('examinations')
        .select('id, status, exam_date')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data } = await query
      
      const upcoming = data?.filter(e => e.exam_date >= today && e.status === 'scheduled').length || 0
      const cancelled = data?.filter(e => e.status === 'cancelled').length || 0
      
      setStats(prev => ({
        ...prev,
        upcoming,
        cancelledExams: cancelled,
      }))
    } catch (err) {
      console.error('Error fetching additional stats:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const gradingProgress = stats.totalResults > 0 
    ? ((stats.graded / stats.totalResults) * 100).toFixed(1)
    : 0

  return (
    <div className={`space-y-6 ${isArabicLayout ? 'text-right' : 'text-left'}`} dir={isArabicLayout ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('examinations.statistics.title')}</h1>
          <p className="text-gray-600 mt-1">{t('examinations.statistics.subtitle')}</p>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
              <div>
              <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.totalExaminations')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalExaminations}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.completed')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.studentsTested')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.studentsTested}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.totalResults')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalResults}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Overall Performance */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('examinations.statistics.overallPerformance')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.passRate')}</p>
            <p className="text-3xl font-bold text-gray-900">{stats.passRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">{t('examinations.statistics.passRate')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.averageScore')}</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.averageScore !== null ? stats.averageScore : '--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('examinations.statistics.averageScore')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.attendanceRate')}</p>
            <p className="text-3xl font-bold text-gray-900">{stats.attendanceRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">{t('examinations.statistics.attendanceRate')}</p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">{t('examinations.statistics.gradingProgress')}</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {stats.graded} {t('examinations.statistics.graded')} / {stats.pending} {t('examinations.statistics.pending')}
            </span>
            <span className="text-sm text-gray-600">{gradingProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${gradingProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Exam Type */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('examinations.statistics.performanceByExamType')}</h2>
          {examTypes.length > 0 ? (
            <div className="space-y-3">
              {examTypes.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{getExamTypeLabel(item.type)}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>{t('examinations.dashboard.noDataAvailable')}</p>
            </div>
          )}
        </div>

        {/* Examination Status Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('examinations.statistics.statusDistribution')}</h2>
          {statusDistribution.length > 0 ? (
            <div className="space-y-3">
              {statusDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{getStatusLabel(item.status)}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>{t('examinations.dashboard.noDataAvailable')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('examinations.statistics.keyInsights')}</h2>
        <div className="space-y-4">
          {stats.passRate < 50 && (
            <div className={`flex items-start ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'} p-4 bg-yellow-50 border border-yellow-200 rounded-lg`}>
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900">{t('examinations.statistics.lowPassRateTitle')}</p>
                <p className="text-sm text-yellow-800">{t('examinations.statistics.lowPassRateDesc')}</p>
              </div>
            </div>
          )}
          {stats.attendanceRate < 80 && (
            <div className={`flex items-start ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'} p-4 bg-red-50 border border-red-200 rounded-lg`}>
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">{t('examinations.statistics.lowAttendanceTitle')}</p>
                <p className="text-sm text-red-800">{t('examinations.statistics.lowAttendanceDesc')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('examinations.statistics.additionalStatistics')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.upcoming')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.cancelled')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.cancelledExams}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.activeConflicts')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeConflicts}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.totalIncidents')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalIncidents}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('examinations.statistics.makeupRequests')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.makeupRequests}</p>
          </div>
        </div>
      </div>
    </div>
  )
}



