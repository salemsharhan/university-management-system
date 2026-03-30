import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Calendar, Clock, MapPin, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getLocalizedName } from '../utils/localizedName'

export default function Examinations() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const { userRole, collegeId, selectedCollegeId } = useAuth()
  const [examinations, setExaminations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const isArabicLayout = isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')

  const getTypeColor = (type) => {
    switch (type) {
      case 'final':
        return 'bg-red-100 text-red-800'
      case 'midterm':
        return 'bg-orange-100 text-orange-800'
      case 'quiz':
        return 'bg-blue-100 text-blue-800'
      case 'assignment':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  const getTypeLabel = (type) => t(`examinations.types.${type}`, { defaultValue: type })
  const getStatusLabel = (status) => t(`examinations.statuses.${status}`, { defaultValue: status })

  // Determine which college ID to use for filtering
  const examCollegeId = userRole === 'admin' ? selectedCollegeId : collegeId

  useEffect(() => {
    // Don't fetch if collegeId is required but not available
    if ((userRole === 'user' || userRole === 'instructor') && !collegeId) {
      return
    }
    fetchExaminations()
  }, [userRole, examCollegeId, typeFilter, statusFilter])

  const fetchExaminations = async () => {
    // Guard: Don't fetch if collegeId is required but not available
    if ((userRole === 'user' || userRole === 'instructor') && !collegeId) {
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('examinations')
        .select(`
          id,
          exam_name,
          exam_code,
          exam_type,
          type,
          title,
          exam_date,
          date,
          start_time,
          end_time,
          duration_minutes,
          location,
          total_marks,
          passing_marks,
          weight_percentage,
          status,
          class_id,
          classes (
            id,
            code,
            subjects (
              id,
              code,
              name_en,
              name_ar
            ),
            instructors (
              id,
              name_en,
              name_ar
            )
          ),
          colleges (
            id,
            name_en,
            name_ar
          )
        `)
        .order('exam_date', { ascending: true })
        .order('start_time', { ascending: true })

      // Apply role-based filtering
      if (userRole === 'user' && examCollegeId) {
        query = query.or(`college_id.eq.${examCollegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && examCollegeId) {
        query = query.eq('college_id', examCollegeId)
      } else if (userRole === 'admin' && examCollegeId) {
        query = query.eq('college_id', examCollegeId)
      } else if (userRole === 'admin' && !examCollegeId) {
        // Admin without selected college sees all
      }

      // Apply type filter
      if (typeFilter !== 'all') query = query.eq('type', typeFilter)

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter.toLowerCase())
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching examinations:', error)
        return
      }

      // Transform the data to match the expected format
      const transformedData = (data || []).map(exam => {
        const classData = exam.classes
        const subject = classData?.subjects
        const instructor = classData?.instructors
        const college = exam.colleges

        // Format time
        let timeDisplay = t('examinations.tba')
        if (exam.start_time && exam.end_time) {
          const startTime = exam.start_time.substring(0, 5) // HH:MM
          const endTime = exam.end_time.substring(0, 5) // HH:MM
          timeDisplay = `${startTime} - ${endTime}`
        } else if (exam.start_time) {
          timeDisplay = exam.start_time.substring(0, 5)
        }

        // Get course name
        const courseName = subject 
          ? `${subject.code || ''} - ${getLocalizedName(subject, isArabicLayout) || ''}`.trim()
          : classData?.code || t('common.unknown')

        return {
          id: exam.id,
          course: courseName,
          type: exam.type || exam.exam_type?.toLowerCase() || 'other',
          title: exam.exam_name || exam.title || t('common.unknown'),
          date: exam.exam_date || exam.date,
          time: timeDisplay,
          location: exam.location || t('examinations.tba'),
          totalMarks: exam.total_marks || 0,
          passingMarks: exam.passing_marks || 0,
          status: exam.status || 'scheduled',
          examCode: exam.exam_code,
          duration: exam.duration_minutes,
          weight: exam.weight_percentage,
          classId: exam.class_id,
          instructorName: instructor 
            ? (isArabicLayout ? (instructor.name_ar || instructor.name_en) : (instructor.name_en || instructor.name_ar)) || t('examinations.tba')
            : t('examinations.tba'),
          collegeName: college ? getLocalizedName(college, isArabicLayout) : t('examinations.create.fields.universityWide')
        }
      })

      setExaminations(transformedData)
    } catch (err) {
      console.error('Error fetching examinations:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter examinations based on search query
  const filteredExaminations = examinations.filter(exam => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      exam.title.toLowerCase().includes(query) ||
      exam.course.toLowerCase().includes(query) ||
      exam.examCode?.toLowerCase().includes(query) ||
      exam.instructorName.toLowerCase().includes(query)
    )
  })

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return t('examinations.tba')
    try {
      return new Date(dateString).toLocaleDateString(isArabicLayout ? 'ar-SA' : 'en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className={`space-y-6 ${isArabicLayout ? 'text-right' : 'text-left'}`} dir={isArabicLayout ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('examinations.title')}</h1>
          <p className="text-gray-600 mt-1">{t('examinations.listSubtitle')}</p>
        </div>
        <button 
          onClick={() => navigate('/examinations/create')}
          className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
        >
          <Plus className="w-5 h-5" />
          <span>{t('examinations.scheduleExam')}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute ${isArabicLayout ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input
              type="text"
              placeholder={t('examinations.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isArabicLayout ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
            />
          </div>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">{t('examinations.filters.allTypes')}</option>
            <option value="final">{t('examinations.types.final')}</option>
            <option value="midterm">{t('examinations.types.midterm')}</option>
            <option value="quiz">{t('examinations.types.quiz')}</option>
            <option value="assignment">{t('examinations.types.assignment')}</option>
	            <option value="project">{t('examinations.types.project')}</option>
	            <option value="other">{t('examinations.types.other')}</option>
	          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">{t('examinations.filters.allStatus')}</option>
            <option value="scheduled">{t('examinations.statuses.scheduled')}</option>
            <option value="ongoing">{t('examinations.statuses.ongoing')}</option>
            <option value="completed">{t('examinations.statuses.completed')}</option>
            <option value="cancelled">{t('examinations.statuses.cancelled')}</option>
          </select>
        </div>
      </div>

      {/* Examinations Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className={`${isArabicLayout ? 'mr-3' : 'ml-3'} text-gray-600`}>{t('examinations.loading')}</span>
        </div>
      ) : filteredExaminations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('examinations.noExamsTitle')}</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
              ? t('examinations.noExamsTryAdjusting')
              : t('examinations.noExamsGetStarted')}
          </p>
          {!searchQuery && typeFilter === 'all' && statusFilter === 'all' && (
            <button
              onClick={() => navigate('/examinations/create')}
              className={`inline-flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
            >
              <Plus className="w-5 h-5" />
              <span>{t('examinations.scheduleExam')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredExaminations.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
	                <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} mb-2`}>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                      exam.type
                    )}`}
                  >
                    {getTypeLabel(exam.type)}
                  </span>
                  <span
                    className={`inline-flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-1' : 'space-x-1'} px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      exam.status
                    )}`}
                  >
                    {getStatusIcon(exam.status)}
                    <span>{getStatusLabel(exam.status)}</span>
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{exam.title}</h3>
                <p className="text-sm text-gray-600">{exam.course}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} text-sm text-gray-600`}>
                <Calendar className="w-4 h-4" />
                <span>{formatDate(exam.date)}</span>
              </div>
              <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} text-sm text-gray-600`}>
                <Clock className="w-4 h-4" />
                <span>{exam.time}</span>
                {exam.duration && (
                  <span className="text-gray-400">({exam.duration} {t('examinations.minutesShort')})</span>
                )}
              </div>
              <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} text-sm text-gray-600`}>
                <MapPin className="w-4 h-4" />
                <span>{exam.location}</span>
              </div>
              <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} text-sm text-gray-600`}>
                <FileText className="w-4 h-4" />
                <span>
                  {t('examinations.total')}: {exam.totalMarks} {t('examinations.marks')} | {t('examinations.passing')}: {exam.passingMarks} {t('examinations.marks')}
                </span>
              </div>
              {exam.weight && (
                <div className="text-xs text-gray-500">
                  {t('examinations.weight')}: {exam.weight}%
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button 
                onClick={() => navigate(`/examinations/${exam.id}`)}
                className="w-full bg-primary-50 text-primary-600 py-2 rounded-xl font-medium hover:bg-primary-100 transition-colors"
              >
                {t('examinations.viewDetails')}
              </button>
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  )
}
