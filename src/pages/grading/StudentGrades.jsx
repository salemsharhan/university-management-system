import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getGradingScaleFromUniversitySettings, calculateGpaWithScale } from '../../utils/getCollegeSettings'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Search, GraduationCap, FileText, TrendingUp } from 'lucide-react'

export default function StudentGrades() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId, departmentId } = useAuth()
  const { selectedCollegeId } = useCollege()
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('All Programs')
  const [loading, setLoading] = useState(false)
  const [collegeId, setCollegeId] = useState(null)
  const [gradingScale, setGradingScale] = useState([])
  const [enrollmentsByStudent, setEnrollmentsByStudent] = useState({})
  const [activeSemester, setActiveSemester] = useState(null)

  useEffect(() => {
    // Only set collegeId and fetch if we have the required data
    if (userRole === 'admin' && selectedCollegeId) {
      setCollegeId(selectedCollegeId)
    } else if (userRole === 'user' && authCollegeId) {
      setCollegeId(authCollegeId)
    } else if (userRole === 'instructor' && authCollegeId) {
      setCollegeId(authCollegeId)
    } else if (userRole === 'admin' && !selectedCollegeId) {
      // Admin without selected college - can show all or wait
      setCollegeId(null)
    }
  }, [userRole, selectedCollegeId, authCollegeId])

  useEffect(() => {
    // Only fetch when we have the necessary data based on role
    if (userRole === 'admin') {
      // Admin can fetch (with or without college filter)
      fetchStudents()
    } else if (userRole === 'user' && authCollegeId) {
      // College admin needs collegeId
      fetchStudents()
    } else if (userRole === 'instructor' && authCollegeId) {
      // Instructor needs collegeId (departmentId is optional but query handles it)
      fetchStudents()
    }
    // Don't fetch if we don't have required data
  }, [userRole, collegeId, authCollegeId, departmentId])

  useEffect(() => {
    filterStudents()
  }, [searchTerm, selectedProgram, students])

  useEffect(() => {
    getGradingScaleFromUniversitySettings().then(setGradingScale)
  }, [])

  useEffect(() => {
    if (collegeId || userRole === 'admin') {
      supabase
        .from('semesters')
        .select('id, name_en, code')
        .or('status.eq.active,is_current.eq.true')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => setActiveSemester(data))
    }
  }, [collegeId, userRole])

  useEffect(() => {
    if (filteredStudents.length === 0) {
      setEnrollmentsByStudent({})
      return
    }
    const studentIds = filteredStudents.map(s => s.id)
    supabase
      .from('enrollments')
      .select(`
        student_id,
        semester_id,
        classes(id, subjects(id, credit_hours)),
        grade_components(numeric_grade, gpa_points)
      `)
      .in('student_id', studentIds)
      .eq('status', 'enrolled')
      .then(({ data }) => {
        const byStudent = {}
        ;(data || []).forEach(e => {
          if (!byStudent[e.student_id]) byStudent[e.student_id] = []
          byStudent[e.student_id].push({
            ...e,
            grade_components: e.grade_components,
            classes: e.classes,
          })
        })
        setEnrollmentsByStudent(byStudent)
      })
  }, [filteredStudents])

  const fetchStudents = async () => {
    // Don't fetch if we don't have required data
    if (userRole === 'user' && !authCollegeId) return
    if (userRole === 'instructor' && !authCollegeId) return

    try {
      setLoading(true)
      let query = supabase
        .from('students')
        .select(`
          id,
          student_id,
          name_en,
          first_name,
          last_name,
          majors(id, name_en),
          college_id,
          colleges(id, name_en)
        `)
        .eq('status', 'active')

      // Filter by college for college admins
      if (userRole === 'user' && authCollegeId) {
        query = query.eq('college_id', authCollegeId)
      }
      // Filter by college and department for instructors
      else if (userRole === 'instructor' && authCollegeId) {
        query = query.eq('college_id', authCollegeId)
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
      // Filter by selected college for super admins
      else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      query = query.order('name_en')

      const { data, error } = await query
      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
      setStudents([]) // Set empty array on error to prevent showing stale data
    } finally {
      setLoading(false)
    }
  }

  const filterStudents = () => {
    let filtered = [...students]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s =>
        s.student_id?.toLowerCase().includes(term) ||
        s.name_en?.toLowerCase().includes(term) ||
        s.first_name?.toLowerCase().includes(term) ||
        s.last_name?.toLowerCase().includes(term)
      )
    }

    if (selectedProgram && selectedProgram !== 'All Programs') {
      filtered = filtered.filter(s => s.majors?.name_en === selectedProgram)
    }

    setFilteredStudents(filtered)
  }

  const getStudentGpas = (studentId) => {
    const enrollments = enrollmentsByStudent[studentId] || []
    const allGpa = calculateGpaWithScale(enrollments, gradingScale)
    const currentGpa = activeSemester
      ? calculateGpaWithScale(enrollments, gradingScale, activeSemester.id)
      : { gpa: '0.00' }
    return {
      currentSemesterGpa: currentGpa.gpa,
      totalGpa: allGpa.gpa,
    }
  }

  const getPrograms = () => {
    const programs = new Set()
    students.forEach(s => {
      if (s.majors?.name_en) {
        programs.add(s.majors.name_en)
      }
    })
    return Array.from(programs).sort()
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('grading.studentGrades.title')}</h1>
          <p className="text-gray-600 mt-1">{t('grading.studentGrades.subtitle')}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('grading.studentGrades.searchPlaceholder')}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
            />
          </div>
          <div>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="All Programs">{t('grading.studentGrades.allPrograms')}</option>
              {getPrograms().map(program => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.studentGrades.students')} ({filteredStudents.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>{t('grading.studentGrades.noStudentsFound')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.studentGrades.studentId')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.studentGrades.name')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.studentGrades.program')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.studentGrades.currentSemesterGpa')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.studentGrades.totalGpa')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.studentGrades.status')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.student_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.name_en || `${student.first_name} ${student.last_name}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.majors?.name_en || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getStudentGpas(student.id).currentSemesterGpa}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getStudentGpas(student.id).totalGpa}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {t('grading.studentGrades.active')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/grading/students/${student.id}/report`)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        {t('grading.studentGrades.viewReport')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

