import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Calendar, Search, Eye, Edit, CalendarDays, TrendingUp, Users, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function Semesters() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [kpis, setKpis] = useState({
    currentSemester: null,
    activeSemesters: 0,
    registrationStatus: 'closed',
    daysRemaining: 0,
    semesterHealth: 'healthy'
  })
  const [semesterStats, setSemesterStats] = useState({}) // Store enrollments, courses, classes counts per semester

  useEffect(() => {
    if (userRole === 'admin') {
      fetchSemesters()
    } else if ((userRole === 'user' || userRole === 'instructor') && collegeId) {
      fetchSemesters()
    }
  }, [collegeId, userRole])

  const fetchSemesters = async () => {
    if ((userRole === 'user' || userRole === 'instructor') && !collegeId) return

    try {
      setLoading(true)
      let query = supabase
        .from('semesters')
        .select('*, academic_years(name_en, name_ar, code, start_date, end_date), colleges(id, name_en, name_ar, code)')
        .order('start_date', { ascending: false })

      if ((userRole === 'user' || userRole === 'instructor') && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      
      // Fetch college data separately if needed
      const collegeIds = [...new Set((data || []).filter(s => s.college_id).map(s => s.college_id))]
      let collegesMap = {}
      
      if (collegeIds.length > 0) {
        const { data: collegesData } = await supabase
          .from('colleges')
          .select('id, name_en, name_ar, code')
          .in('id', collegeIds)
        
        if (collegesData) {
          collegesMap = collegesData.reduce((acc, college) => {
            acc[college.id] = college
            return acc
          }, {})
        }
      }
      
      // Attach college data to semesters
      const semestersWithColleges = (data || []).map(semester => ({
        ...semester,
        colleges: semester.college_id ? collegesMap[semester.college_id] : null
      }))
      
      setSemesters(semestersWithColleges)
      calculateKPIs(semestersWithColleges)
      
      // Fetch statistics for each semester
      if (semestersWithColleges.length > 0) {
        fetchSemesterStatistics(semestersWithColleges)
      }
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setSemesters([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSemesterStatistics = async (semesters) => {
    try {
      const stats = {}
      
      const promises = semesters.map(async (semester) => {
        // Fetch enrollments for this semester
        const { count: enrollmentCount, error: enrollError } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('semester_id', semester.id)
        
        // Fetch classes for this semester directly
        const { data: classes, count: classCount, error: classError } = await supabase
          .from('classes')
          .select('id, subject_id', { count: 'exact' })
          .eq('semester_id', semester.id)
        
        const subjectIds = classes?.map(c => c.subject_id).filter(Boolean) || []
        const courseCount = new Set(subjectIds).size
        
        return {
          semesterId: semester.id,
          enrollmentCount: enrollError ? 0 : (enrollmentCount || 0),
          courseCount,
          classCount: classError ? 0 : (classCount || 0)
        }
      })
      
      const results = await Promise.all(promises)
      results.forEach(({ semesterId, enrollmentCount, courseCount, classCount }) => {
        stats[semesterId] = { enrollmentCount, courseCount, classCount }
      })
      
      setSemesterStats(stats)
    } catch (err) {
      console.error('Error fetching semester statistics:', err)
    }
  }

  const calculateKPIs = (semestersArray) => {
    const semesters = Array.isArray(semestersArray) ? semestersArray : []
    
    if (!semesters || semesters.length === 0) {
      setKpis({
        currentSemester: null,
        activeSemesters: 0,
        registrationStatus: 'closed',
        daysRemaining: 0,
        semesterHealth: 'unknown'
      })
      return
    }

    const now = new Date()
    const currentSemester = semesters.find(semester => {
      const start = new Date(semester.start_date)
      const end = new Date(semester.end_date)
      return semester.is_current || (now >= start && now <= end && (semester.status === 'active' || semester.status === 'registration_open'))
    })

    const activeSemesters = semesters.filter(semester => 
      ['active', 'registration_open'].includes(semester.status)
    ).length

    // Check registration status from control flags or status
    const registrationStatus = currentSemester?.status === 'registration_open' ? 'open' : 'closed'
    
    let daysRemaining = 0
    if (currentSemester) {
      const endDate = new Date(currentSemester.end_date)
      daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    }

    const semesterHealth = currentSemester ? 'healthy' : 'unknown'

    setKpis({
      currentSemester,
      activeSemesters,
      registrationStatus,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      semesterHealth
    })
  }

  const filteredSemesters = semesters.filter(semester => {
    const name = getLocalizedName(semester, isRTL)
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      semester.code.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'DRAFT' },
      planned: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'DRAFT' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'SCHEDULED' },
      registration_open: { bg: 'bg-green-100', text: 'text-green-700', label: 'IN PROGRESS' },
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'IN PROGRESS' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'CLOSED' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'CLOSED' },
      archived: { bg: 'bg-gray-50', text: 'text-gray-400', label: 'ARCHIVED' }
    }
    const style = statusMap[status] || statusMap.planned
    return (
      <span className={`px-3 py-1 ${style.bg} ${style.text} rounded-full text-xs font-semibold whitespace-nowrap`}>
        {style.label}
      </span>
    )
  }

  const getCollegeName = (semester) => {
    if (semester.is_university_wide) return t('academic.semesters.universityWide')
    if (semester.colleges) return getLocalizedName(semester.colleges, isRTL)
    return t('academic.semesters.collegeSpecific')
  }

  const handleQuickAction = async (action, semesterId) => {
    // TODO: Implement lifecycle actions
    console.log('Quick action:', action, semesterId)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className={`flex items-start ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('academic.semesters.title')}</h1>
          <p className="text-sm text-gray-500">{t('academic.semesters.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/academic/semesters/create')}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all`}
        >
          <Plus className="w-4 h-4" />
          <span>{t('academic.semesters.create')}</span>
        </button>
      </div>

      {/* Tier 1 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
        {/* Current Semester */}
        <div className="bg-primary-gradient rounded-2xl p-6 text-white shadow-lg">
          <div className="mb-4">
            <div className="text-xs opacity-80 mb-1">{t('academic.semesters.currentSemester')}</div>
            <div className="text-lg font-bold mb-2">
              {kpis.currentSemester ? (getLocalizedName(kpis.currentSemester, isRTL) || kpis.currentSemester.code) : 'N/A'}
            </div>
            {kpis.currentSemester && (
              <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">
                {t('academic.semesters.inProgress').toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Active Semesters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-400 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-1">{t('academic.semesters.activeSemesters')}</div>
          <div className="text-3xl font-bold text-gray-900">{kpis.activeSemesters}</div>
        </div>

        {/* Registration Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-400 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-1">{t('academic.semesters.registrationStatus')}</div>
          <div className={`text-lg font-bold ${kpis.registrationStatus === 'open' ? 'text-yellow-600' : 'text-gray-600'}`}>
            {kpis.registrationStatus === 'open' ? t('academic.semesters.open').toUpperCase() : t('academic.semesters.closed').toUpperCase()}
          </div>
          {kpis.registrationStatus === 'open' && (
            <div className="text-xs text-gray-500 mt-1">{t('academic.semesters.opensInDays', { days: 45 })}</div>
          )}
        </div>

        {/* Days Remaining */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-400 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-1">{t('academic.semesters.daysRemaining')}</div>
          <div className="text-3xl font-bold text-green-600">{kpis.daysRemaining}</div>
          <div className="text-xs text-gray-500 mt-1">{t('academic.semesters.untilSemesterEnd')}</div>
        </div>

        {/* Semester Health */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-400 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-1">{t('academic.semesters.semesterHealth')}</div>
          <div className="text-lg font-bold text-green-600">{t('academic.semesters.healthy').toUpperCase()}</div>
          <div className="text-xs text-gray-500 mt-1">{t('academic.semesters.allSystemsNormal')}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4 mb-6">
        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : 'space-x-3'}`}>
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('academic.semesters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-none outline-none text-sm text-gray-900 bg-transparent"
          />
        </div>
      </div>

      {/* Semester Cards Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSemesters.map((semester) => {
            const stats = semesterStats[semester.id] || { enrollmentCount: 0, courseCount: 0, classCount: 0 }
            const isInProgress = semester.status === 'active' || semester.status === 'registration_open'
            const isDraft = semester.status === 'planned' || semester.status === 'draft'

            return (
              <div
                key={semester.id}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 ${
                  isInProgress ? 'border-green-500' : 'border-gray-200'
                } hover:shadow-md transition-shadow`}
              >
                <div className="p-6">
                  <div className={`flex items-start ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-4'} mb-5`}>
                    <div className="w-14 h-14 bg-primary-gradient rounded-xl flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{getLocalizedName(semester, isRTL)}</h3>
                      <p className="text-sm text-gray-500">{semester.code}</p>
                    </div>
                  </div>

                  <div className={`flex ${isRTL ? 'space-x-reverse' : 'space-x-2'} gap-2 mb-4`}>
                    {getStatusBadge(semester.status)}
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                      {semester.is_university_wide ? t('academic.semesters.universityWide') : t('academic.semesters.collegeSpecific')}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 mb-3">
                    <strong className="text-gray-900">{t('academic.semesters.academicYear')}:</strong> {getLocalizedName(semester.academic_years, isRTL)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.start')}</div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(semester.start_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{t('academic.semesters.end')}</div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(semester.end_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Mini Indicators */}
                  <div className="flex gap-4 p-3 bg-gray-50 rounded-lg mb-4">
                    <div className="text-center flex-1">
                      <div className="text-base font-bold text-primary-600">{stats.enrollmentCount}</div>
                      <div className="text-xs text-gray-500">{t('academic.semesters.enrollments')}</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-base font-bold text-primary-600">{stats.courseCount}</div>
                      <div className="text-xs text-gray-500">{t('academic.semesters.courses')}</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-base font-bold text-primary-600">{stats.classCount}</div>
                      <div className="text-xs text-gray-500">{t('academic.semesters.classes')}</div>
                    </div>
                  </div>

                  <div className={`flex ${isRTL ? 'space-x-reverse' : 'space-x-3'} gap-3`}>
                    <button
                      onClick={() => navigate(`/academic/semesters/${semester.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 border border-gray-200 rounded-lg text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      {t('academic.semesters.view')}
                    </button>
                    <button
                      onClick={() => navigate(`/academic/semesters/${semester.id}/edit`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 bg-primary-gradient rounded-lg text-white text-xs font-semibold hover:shadow-lg transition-all"
                    >
                      <Edit className="w-4 h-4" />
                      {t('academic.semesters.edit')}
                    </button>
                  </div>
                </div>

                {/* Quick Actions Bar */}
                <div className={`px-6 py-3 border-t ${
                  isInProgress ? 'bg-green-50 border-green-200' : 
                  isDraft ? 'bg-gray-50 border-gray-200' : 
                  'bg-gray-50 border-gray-200'
                } flex justify-center gap-2`}>
                  {isInProgress && (
                    <>
                      <button
                        onClick={() => handleQuickAction('close_registration', semester.id)}
                        className="px-3 py-1.5 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded-md text-xs font-medium hover:bg-yellow-200 transition-colors"
                      >
                        {t('academic.semesters.closeRegistration')}
                      </button>
                      <button
                        onClick={() => handleQuickAction('end_semester', semester.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-600 border border-red-300 rounded-md text-xs font-medium hover:bg-red-200 transition-colors"
                      >
                        {t('academic.semesters.endSemester')}
                      </button>
                    </>
                  )}
                  {isDraft && (
                    <>
                      <button
                        onClick={() => handleQuickAction('open_registration', semester.id)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 border border-blue-300 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors"
                      >
                        {t('academic.semesters.openRegistration')}
                      </button>
                      <button
                        onClick={() => handleQuickAction('start_semester', semester.id)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 border border-green-300 rounded-md text-xs font-medium hover:bg-green-200 transition-colors"
                      >
                        {t('academic.semesters.startSemester')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
