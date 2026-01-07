import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { GraduationCap, BookOpen, Users, Calendar } from 'lucide-react'

export default function GradeManagement() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, colleges, setSelectedCollegeId } = useCollege()
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [collegeId, setCollegeId] = useState(null)

  useEffect(() => {
    // Set college ID based on role first
    if (userRole === 'admin' && selectedCollegeId) {
      setCollegeId(selectedCollegeId)
    } else if (userRole === 'user' && authCollegeId) {
      setCollegeId(authCollegeId)
    } else if (userRole === 'instructor' && authCollegeId) {
      setCollegeId(authCollegeId)
    } else if (userRole === 'admin' && !selectedCollegeId) {
      setCollegeId(null)
    }
  }, [userRole, selectedCollegeId, authCollegeId])

  useEffect(() => {
    // Only fetch when we have the necessary data based on role
    if (userRole === 'admin') {
      // Admin can fetch (with or without college filter)
      fetchSemesters()
    } else if (userRole === 'user' && authCollegeId) {
      // College admin needs collegeId
      fetchSemesters()
    } else if (userRole === 'instructor' && authCollegeId) {
      // Instructor needs collegeId
      fetchSemesters()
    }
    // Don't fetch if we don't have required data
  }, [userRole, authCollegeId, selectedCollegeId])

  useEffect(() => {
    if (selectedSemester) {
      fetchClasses()
    } else {
      setClasses([])
    }
  }, [selectedSemester, collegeId])

  const fetchSemesters = async () => {
    // Don't fetch if we don't have required data
    if (userRole === 'user' && !authCollegeId) return
    if (userRole === 'instructor' && !authCollegeId) return

    try {
      setLoading(true)
      let query = supabase
        .from('semesters')
        .select('id, name_en, code, start_date, end_date, status')
        .order('start_date', { ascending: false })

      // Filter by college for college admins
      if (userRole === 'user' && authCollegeId) {
        query = query.or(`college_id.eq.${authCollegeId},is_university_wide.eq.true`)
      }
      // Filter by college for instructors
      else if (userRole === 'instructor' && authCollegeId) {
        query = query.or(`college_id.eq.${authCollegeId},is_university_wide.eq.true`)
      }
      // Filter by selected college for super admins
      else if (userRole === 'admin' && selectedCollegeId) {
        query = query.or(`college_id.eq.${selectedCollegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
      
      // Auto-select current semester if available
      const currentSemester = data?.find(s => s.status === 'active' || s.is_current)
      if (currentSemester) {
        setSelectedSemester(String(currentSemester.id))
      }
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setSemesters([]) // Set empty array on error to prevent showing stale data
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          capacity,
          enrolled,
          subjects(id, name_en, code),
          instructors(id, name_en),
          class_schedules(day_of_week, start_time, end_time)
        `)
        .eq('semester_id', selectedSemester)
        .eq('status', 'active')
        .order('code')

      // Filter by college
      if (collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'user' && authCollegeId) {
        query = query.eq('college_id', authCollegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatSchedule = (schedules) => {
    if (!schedules || schedules.length === 0) return 'TBA'
    return schedules.map(s => {
      const day = s.day_of_week?.charAt(0).toUpperCase() + s.day_of_week?.slice(1) || ''
      const start = s.start_time || ''
      const end = s.end_time || ''
      return `${day} ${start}-${end}`
    }).join(', ')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grade Management</h1>
          <p className="text-gray-600 mt-1">Enter and manage student grades for your classes</p>
        </div>
      </div>

      {/* College Selector for Admin */}
      {userRole === 'admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select College</label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => {
              const newCollegeId = e.target.value ? parseInt(e.target.value) : null
              setSelectedCollegeId(newCollegeId)
              setCollegeId(newCollegeId)
            }}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Colleges</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>
                {college.name_en}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Semester Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Semester</label>
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Select Semester...</option>
          {semesters.map(semester => (
            <option key={semester.id} value={semester.id}>
              {semester.name_en} {semester.status === 'active' ? '(Current)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Classes List */}
      {selectedSemester && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Classes</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No classes found for this semester</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  onClick={() => navigate(`/grading/classes/${classItem.id}/grades`)}
                  className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{classItem.code}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {classItem.subjects?.name_en || 'N/A'}
                      </p>
                    </div>
                    <BookOpen className="w-8 h-8 text-primary-600" />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span>Instructor: {classItem.instructors?.name_en || 'TBA'}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Schedule: {formatSchedule(classItem.class_schedules)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      <span>Capacity: {classItem.enrolled || 0}/{classItem.capacity || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

