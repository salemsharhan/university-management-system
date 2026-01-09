import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Search, GraduationCap } from 'lucide-react'

export default function Enrollments() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const { userRole, collegeId, departmentId } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [semesterFilter, setSemesterFilter] = useState('all')
  const [semesters, setSemesters] = useState([])

  useEffect(() => {
    // Only fetch when we have the necessary data based on role
    if (userRole === 'admin') {
      fetchEnrollments()
      fetchSemesters()
    } else if (userRole === 'user' && collegeId) {
      fetchEnrollments()
      fetchSemesters()
    } else if (userRole === 'instructor' && collegeId) {
      fetchEnrollments()
      fetchSemesters()
    }
    // Don't fetch if we don't have required data
  }, [collegeId, userRole, departmentId])

  const fetchSemesters = async () => {
    // Don't fetch if we don't have required data
    if (userRole === 'user' && !collegeId) return
    if (userRole === 'instructor' && !collegeId) return

    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code')
        .order('start_date', { ascending: false })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }
      // For instructors, filter by their college
      else if (userRole === 'instructor' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setSemesters([]) // Set empty array on error to prevent showing stale data
    }
  }

  const fetchEnrollments = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('enrollments')
        .select(`
          id,
          enrollment_date,
          status,
          grade,
          numeric_grade,
          grade_points,
          created_at,
          updated_at,
          students (
            id,
            first_name,
            last_name,
            student_id,
            email
          ),
          classes (
            id,
            code,
            section,
            instructor_id,
            subjects (
              id,
              name_en,
              code
            ),
            instructors (
              id,
              name_en
            )
          ),
          semesters (
            id,
            name_en,
            code
          )
        `)
        .order('enrollment_date', { ascending: false })

      // Filter by college for college admins
      if (userRole === 'user' && collegeId) {
        // Get student IDs for this college
        const { data: collegeStudents } = await supabase
          .from('students')
          .select('id')
          .eq('college_id', collegeId)

        if (collegeStudents && collegeStudents.length > 0) {
          const studentIds = collegeStudents.map(s => s.id)
          query = query.in('student_id', studentIds)
        } else {
          query = query.eq('student_id', -1) // No students, return empty
        }
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (semesterFilter !== 'all') {
        query = query.eq('semester_id', parseInt(semesterFilter))
      }

      const { data, error } = await query
      if (error) throw error
      setEnrollments(data || [])
    } catch (err) {
      console.error('Error fetching enrollments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEnrollments()
  }, [statusFilter, semesterFilter])

  const filteredEnrollments = enrollments.filter(enrollment => {
    if (!searchQuery) return true
    const student = enrollment.students
    const searchLower = searchQuery.toLowerCase()
    return (
      (student?.first_name?.toLowerCase().includes(searchLower)) ||
      (student?.last_name?.toLowerCase().includes(searchLower)) ||
      (student?.student_id?.toLowerCase().includes(searchLower)) ||
      (student?.email?.toLowerCase().includes(searchLower))
    )
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'enrolled':
        return 'bg-green-100 text-green-800'
      case 'dropped':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'withdrawn':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('enrollments.title')}</h1>
          <p className="text-gray-600 mt-1">{t('enrollments.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/enrollments/create')}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
        >
          <Plus className="w-5 h-5" />
          <span>{t('enrollments.create')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input
              type="text"
              placeholder={t('enrollments.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
            />
          </div>
          <div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">{t('enrollments.allSemesters')}</option>
              {semesters.map(semester => (
                <option key={semester.id} value={semester.id}>
                  {semester.name_en} ({semester.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">{t('enrollments.allStatus')}</option>
              <option value="enrolled">{t('enrollments.enrolled')}</option>
              <option value="dropped">{t('enrollments.dropped')}</option>
              <option value="completed">{t('enrollments.completed')}</option>
              <option value="failed">{t('enrollments.failed')}</option>
              <option value="withdrawn">{t('enrollments.withdrawn')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Enrollments Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {t('enrollments.student')}
                  </th>
                  <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {t('enrollments.class')}
                  </th>
                  <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {t('enrollments.semester')}
                  </th>
                  <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {t('enrollments.enrollmentDate')}
                  </th>
                  <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {t('enrollments.status')}
                  </th>
                  <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {t('enrollments.grade')}
                  </th>
                  <th className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {t('enrollments.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      {t('enrollments.noEnrollmentsFound')}
                    </td>
                  </tr>
                ) : (
                  filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {enrollment.students?.first_name} {enrollment.students?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {enrollment.students?.student_id || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {enrollment.classes?.subjects?.code} - {enrollment.classes?.subjects?.name_en}
                          </div>
                          <div className="text-sm text-gray-500">
                            {t('enrollments.section')}: {enrollment.classes?.section || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {enrollment.semesters?.name_en || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(enrollment.enrollment_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                          {t(`enrollments.${enrollment.status || 'enrolled'}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {enrollment.grade || '-'}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}>
                        <button
                          onClick={() => navigate(`/enrollments/${enrollment.id}`)}
                          className="text-primary-600 hover:text-primary-800 font-medium text-sm"
                        >
                          {t('enrollments.viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

