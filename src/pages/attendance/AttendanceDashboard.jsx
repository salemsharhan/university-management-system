import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Zap,
  TrendingUp,
  Clock
} from 'lucide-react'

export default function AttendanceDashboard() {
  const navigate = useNavigate()
  const { userRole, collegeId, departmentId } = useAuth()
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

      // Build queries based on role
      let classSessionsQuery = supabase
        .from('class_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('session_date', today)

      let attendanceQuery = supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('date', today)

      // Filter by college for college admins
      if (userRole === 'user' && collegeId) {
        classSessionsQuery = classSessionsQuery.eq('college_id', collegeId)
        attendanceQuery = attendanceQuery.eq('college_id', collegeId)
      }
      // Filter by college for instructors
      else if (userRole === 'instructor' && collegeId) {
        classSessionsQuery = classSessionsQuery.eq('college_id', collegeId)
        attendanceQuery = attendanceQuery.eq('college_id', collegeId)
      }

      // Filter by student for students
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
        lowAttendanceAlerts: 0, // TODO: Implement low attendance calculation
        pendingContests: 0, // TODO: Implement contest requests
      })
    } catch (err) {
      console.error('Error fetching attendance stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSemesters = async () => {
    // Don't fetch if we don't have required data
    if (userRole === 'user' && !collegeId) return
    if (userRole === 'instructor' && !collegeId) return

    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code, start_date, end_date')
        // .eq('status', 'active')
        .order('start_date', { ascending: false })

      // Filter by college for college admins - include their college's semesters AND university-wide semesters
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

  const fetchClasses = async () => {
    try {
      let query = supabase
        .from('classes')
        .select('id, code, section, subjects(name_en, code)')
        .eq('status', 'active')
        .eq('semester_id', selectedSemesterId)
        .order('code')

      // Filter by college for college admins - only their college's classes (exclude university-wide)
      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId).eq('is_university_wide', false)
      }
      // For instructors, filter by their college
      else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId).eq('is_university_wide', false)
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
      title: 'View Alerts',
      description: 'Check low attendance warnings',
      icon: AlertTriangle,
      color: 'yellow',
      onClick: () => navigate('/attendance/alerts'),
    },
    {
      title: 'Review Contests',
      description: 'Handle student attendance disputes',
      icon: FileText,
      color: 'blue',
      onClick: () => navigate('/attendance/contests'),
    },
    {
      title: 'Generate Reports',
      description: 'View attendance statistics',
      icon: TrendingUp,
      color: 'blue',
      onClick: () => navigate('/attendance/reports'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
          <Calendar className="w-8 h-8" />
          <span>Attendance Management</span>
        </h1>
        <p className="text-gray-600 mt-1">Track and manage student attendance across all classes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Today's Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '-' : stats.todaySessions}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recorded</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '-' : stats.recorded}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Low Attendance Alerts</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '-' : stats.lowAttendanceAlerts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Contests</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '-' : stats.pendingContests}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <Zap className="w-5 h-5" />
          <span>Quick Actions</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={`p-4 rounded-lg border-2 border-${action.color}-200 hover:border-${action.color}-400 hover:bg-${action.color}-50 transition-all text-left`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <action.icon className={`w-6 h-6 text-${action.color}-600`} />
                <h3 className="font-semibold text-gray-900">{action.title}</h3>
              </div>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Find Class Sessions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Find Class Sessions</span>
        </h2>
        <div className="flex flex-col md:flex-row gap-4">
          <select 
            value={selectedSemesterId}
            onChange={(e) => {
              setSelectedSemesterId(e.target.value)
              setSelectedClassId('')
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Semester</option>
            {semesters.map(semester => (
              <option key={semester.id} value={semester.id}>
                {semester.name_en} ({semester.code})
              </option>
            ))}
          </select>
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={!selectedSemesterId || classes.length === 0}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">{selectedSemesterId && classes.length === 0 ? 'No classes available' : 'Select Class'}</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.code}-{cls.section} - {cls.subjects?.name_en || cls.subjects?.code}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedClassId) {
                navigate(`/attendance/sessions?classId=${selectedClassId}`)
              } else {
                navigate('/attendance/sessions')
              }
            }}
            disabled={!selectedClassId}
            className="px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>View Sessions</span>
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Recent Activity</span>
          <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">0</span>
        </h2>
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No recent activity</p>
          <p className="text-sm mt-2">Attendance records will appear here once sessions are recorded</p>
        </div>
      </div>
    </div>
  )
}

