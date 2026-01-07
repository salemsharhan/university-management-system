import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, Plus, MoreVertical, Edit, Trash2, Eye } from 'lucide-react'

export default function Students() {
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
      fetchStudents()
    } else if (userRole === 'instructor' && collegeId) {
      // Instructor needs collegeId (departmentId is optional but query handles it)
      fetchStudents()
    }
    // Don't fetch if we don't have required data
  }, [collegeId, userRole, departmentId])

  const fetchStudents = async () => {
    // Don't fetch if we don't have required data
    if (userRole === 'user' && !collegeId) return
    if (userRole === 'instructor' && !collegeId) return

    try {
      setLoading(true)
      let query = supabase
        .from('students')
        .select('*, majors(name_en, code)')

      // Filter by college for college admins
      if (userRole === 'user' && collegeId) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">Manage student records and information</p>
        </div>
        <button
          onClick={() => navigate('/students/create')}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Student</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Students Table */}
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Major
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No students found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{student.student_id || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{student.email || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{student.majors?.name_en || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            student.status || 'active'
                          )}`}
                        >
                          {(student.status || 'active').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setShowActions(showActions === student.id ? null : student.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {showActions === student.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowActions(null)}
                              />
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                                <button 
                                  onClick={() => {
                                    navigate(`/students/${student.id}`)
                                    setShowActions(null)
                                  }}
                                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    navigate(`/students/${student.id}/edit`)
                                    setShowActions(null)
                                  }}
                                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>Edit</span>
                                </button>
                                <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
