import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { getLocalizedName } from '../utils/localizedName'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, Plus, MoreVertical, Edit, Trash2, Eye, GraduationCap, ChevronRight } from 'lucide-react'

function getInitials(s, isRTL) {
  if (!s) return '?'
  const nameForInitials = isRTL ? (s.name_ar || s.name_en) : (s.name_en || s.name_ar)
  const first = (s.first_name || s.name_en || '').trim().charAt(0)
  const last = (s.last_name || '').trim().charAt(0)
  if (first && last) return `${first}${last}`.toUpperCase()
  const name = (nameForInitials || '').trim()
  return name.length >= 2 ? name.slice(0, 2).toUpperCase() : (first || name.charAt(0) || '?').toUpperCase()
}

function getStudentDisplayName(student, isRTL) {
  if (!student) return '—'
  const localized = getLocalizedName(student, isRTL)
  if (localized) return localized
  const en = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')
  const ar = [student.first_name_ar, student.middle_name_ar, student.last_name_ar].filter(Boolean).join(' ')
  return isRTL ? (ar || en) : (en || ar) || '—'
}
export default function Students() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const { userRole, collegeId, departmentId } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showActions, setShowActions] = useState(null)

  useEffect(() => {
    // Only fetch when we have the necessary data based on role
    if (userRole === 'admin') {
      // Admin can fetch (shows all students)
      fetchStudents()
    } else if (userRole === 'user' && collegeId) {
      // College admin needs collegeId
      console.log('College admin - fetching students for collegeId:', collegeId)
      fetchStudents()
    } else if (userRole === 'instructor' && collegeId) {
      // Instructor needs collegeId (departmentId is optional but query handles it)
      fetchStudents()
    } else if (userRole === 'user' && !collegeId) {
      // College admin but collegeId not loaded yet
      console.warn('College admin logged in but collegeId is not available yet')
      setLoading(false)
    }
    // Don't fetch if we don't have required data
  }, [collegeId, userRole, departmentId])

  const fetchStudents = async () => {
    // Don't fetch if we don't have required data
    if (userRole === 'user' && !collegeId) {
      console.warn('Cannot fetch students: userRole is "user" but collegeId is missing')
      setLoading(false)
      return
    }
    if (userRole === 'instructor' && !collegeId) {
      console.warn('Cannot fetch students: userRole is "instructor" but collegeId is missing')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      let query = supabase
        .from('students')
        .select('*, majors(name_en, name_ar, code)')
        .eq('status', 'active') // Only fetch active students

      // Filter by college for college admins
      if (userRole === 'user' && collegeId) {
        console.log('Filtering students by college_id:', collegeId)
        query = query.eq('college_id', collegeId)
      }
      // Filter by college and department for instructors
      else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
        // Also filter by department if instructor has a department
        if (departmentId) {
          // Get majors that belong to this department first
          const { data: departmentMajors, error: majorsError } = await supabase
            .from('majors')
            .select('id')
            .eq('department_id', departmentId)
          
          if (majorsError) throw majorsError
          
          if (departmentMajors && departmentMajors.length > 0) {
            const majorIds = departmentMajors.map(m => m.id)
            query = query.in('major_id', majorIds)
          } else {
            // No majors in this department, return empty result
            query = query.eq('major_id', -1)
          }
        }
      }

      query = query.order('created_at', { ascending: false })

      console.log('Fetching students with query...')
      const { data, error } = await query
      if (error) {
        console.error('Supabase error fetching students:', error)
        throw error
      }
      console.log('Fetched students:', data?.length || 0, 'students')
      setStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
      setStudents([]) // Set empty array on error to prevent showing stale data
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'on_probation':
        return 'bg-yellow-100 text-yellow-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredStudents = students.filter(student =>
    (student.first_name && student.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (student.last_name && student.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (student.student_id && student.student_id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('students.title')}</h1>
          <p className="text-gray-600 mt-1">{t('students.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/students/create')}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
        >
          <Plus className="w-5 h-5" />
          <span>{t('students.addStudent')}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input
              type="text"
              placeholder={t('students.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
            />
          </div>
        </div>
      </div>

      {/* Students list */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500 border-t-transparent mx-auto" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <GraduationCap className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('students.noStudentsFound')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wider w-12`} />
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wider`}>
                    {t('students.name')}
                  </th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell`}>
                    {t('students.studentId')}
                  </th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell`}>
                    {t('students.email')}
                  </th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell`}>
                    {t('students.major')}
                  </th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-500 uppercase tracking-wider`}>
                    {t('students.status')}
                  </th>
                  <th className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'} text-xs font-semibold text-gray-500 uppercase tracking-wider w-24`}>
                    {t('students.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {getInitials(student, isRTL)}
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <Link
                        to={`/students/${student.id}`}
                        className="font-semibold text-gray-900 hover:text-primary-600 transition-colors inline-flex items-center gap-1"
                      >
                        {getStudentDisplayName(student, isRTL)}
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary-500" />
                      </Link>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell ${isRTL ? 'text-right' : 'text-left'}`}>
                      {student.student_id || '—'}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell max-w-[180px] truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                      {student.email || '—'}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell ${isRTL ? 'text-right' : 'text-left'}`}>
                      {student.majors ? getLocalizedName(student.majors, isRTL) : '—'}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(student.status || 'active')}`}>
                        {(student.status || 'active').replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}>
                      <div className="relative inline-flex items-center gap-1">
                        <Link
                          to={`/students/${student.id}`}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title={t('common.view')}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => navigate(`/students/${student.id}/edit`)}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowActions(showActions === student.id ? null : student.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {showActions === student.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowActions(null)} />
                            <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20`}>
                              <Link
                                to={`/students/${student.id}`}
                                onClick={() => setShowActions(null)}
                                className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}
                              >
                                <Eye className="w-4 h-4" /> {t('common.view')}
                              </Link>
                              <button
                                onClick={() => { navigate(`/students/${student.id}/edit`); setShowActions(null); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}
                              >
                                <Edit className="w-4 h-4" /> {t('common.edit')}
                              </button>
                              <button className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Trash2 className="w-4 h-4" /> {t('common.delete')}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
