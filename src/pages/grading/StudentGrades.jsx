import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Search, GraduationCap, FileText, TrendingUp } from 'lucide-react'

export default function StudentGrades() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId, departmentId } = useAuth()
  const { selectedCollegeId } = useCollege()
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('All Programs')
  const [loading, setLoading] = useState(false)
  const [collegeId, setCollegeId] = useState(null)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Grades</h1>
          <p className="text-gray-600 mt-1">Select a student to view their detailed grade report</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID or name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="All Programs">All Programs</option>
              {getPrograms().map(program => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Students ({filteredStudents.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative GPA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      Semester 1
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      N/A
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/grading/students/${student.id}/report`)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View Report
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

