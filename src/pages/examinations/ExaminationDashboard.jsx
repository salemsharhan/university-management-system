import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Calendar, TrendingUp, Users, AlertTriangle, FileText, Clock, CheckCircle, XCircle, BarChart3, PieChart } from 'lucide-react'

export default function ExaminationDashboard() {
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todaysExams: 0,
    upcoming: 0,
    pendingGrades: 0,
    schedulingConflicts: 0,
    overallPassRate: null,
    averageScore: null,
    attendanceRate: null,
    totalExaminations: 0,
    completed: 0,
    studentsTested: 0,
    totalResults: 0,
    makeupRequests: 0,
    recentIncidents: 0,
    reportedIncidents: 0,
    cancelledExams: 0,
    activeConflicts: 0,
    totalIncidents: 0,
  })
  const [upcomingExams, setUpcomingExams] = useState([])
  const [examTypes, setExamTypes] = useState([])
  const [gradeDistribution, setGradeDistribution] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [collegeId, userRole])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchTodaysExams(),
        fetchUpcomingExams(),
        fetchPendingGrades(),
        fetchSchedulingConflicts(),
        fetchPerformanceMetrics(),
        fetchExamTypes(),
        fetchGradeDistribution(),
        fetchQuickStatistics(),
      ])
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTodaysExams = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('examinations')
        .select('id', { count: 'exact' })
        .eq('exam_date', today)
        .in('status', ['scheduled', 'ongoing'])

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { count } = await query
      setStats(prev => ({ ...prev, todaysExams: count || 0 }))
    } catch (err) {
      console.error('Error fetching today\'s exams:', err)
    }
  }

  const fetchUpcomingExams = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('examinations')
        .select('id', { count: 'exact' })
        .gt('exam_date', today)
        .eq('status', 'scheduled')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { count } = await query
      setStats(prev => ({ ...prev, upcoming: count || 0 }))
    } catch (err) {
      console.error('Error fetching upcoming exams:', err)
    }
  }

  const fetchPendingGrades = async () => {
    try {
      // This would require an exam_results table - placeholder for now
      setStats(prev => ({ ...prev, pendingGrades: 0 }))
    } catch (err) {
      console.error('Error fetching pending grades:', err)
    }
  }

  const fetchSchedulingConflicts = async () => {
    try {
      // Check for exams on same date/time with overlapping classes
      let query = supabase
        .from('examinations')
        .select(`
          id,
          exam_date,
          start_time,
          end_time,
          class_id,
          classes!inner (
            id,
            code,
            class_schedules (
              day_of_week,
              start_time,
              end_time
            )
          )
        `)
        .eq('status', 'scheduled')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data } = await query
      
      // Simple conflict detection - same date and overlapping times
      const conflicts = []
      if (data) {
        for (let i = 0; i < data.length; i++) {
          for (let j = i + 1; j < data.length; j++) {
            if (data[i].exam_date === data[j].exam_date) {
              const start1 = data[i].start_time
              const end1 = data[i].end_time
              const start2 = data[j].start_time
              const end2 = data[j].end_time
              
              if ((start1 <= start2 && end1 > start2) || (start2 <= start1 && end2 > start1)) {
                conflicts.push({ exam1: data[i], exam2: data[j] })
              }
            }
          }
        }
      }
      
      setStats(prev => ({ ...prev, schedulingConflicts: conflicts.length, activeConflicts: conflicts.length }))
    } catch (err) {
      console.error('Error fetching scheduling conflicts:', err)
    }
  }

  const fetchPerformanceMetrics = async () => {
    try {
      // Placeholder - would require exam_results table
      setStats(prev => ({
        ...prev,
        overallPassRate: null,
        averageScore: null,
        attendanceRate: null,
      }))
    } catch (err) {
      console.error('Error fetching performance metrics:', err)
    }
  }

  const fetchExamTypes = async () => {
    try {
      let query = supabase
        .from('examinations')
        .select('exam_type', { count: 'exact' })

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

  const fetchGradeDistribution = async () => {
    try {
      // Placeholder - would require exam_results table
      setGradeDistribution([])
    } catch (err) {
      console.error('Error fetching grade distribution:', err)
    }
  }

  const fetchQuickStatistics = async () => {
    try {
      let query = supabase
        .from('examinations')
        .select('id, status', { count: 'exact' })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { count, data } = await query
      
      const completed = data?.filter(e => e.status === 'completed').length || 0
      const cancelled = data?.filter(e => e.status === 'cancelled').length || 0
      
      setStats(prev => ({
        ...prev,
        totalExaminations: count || 0,
        completed,
        cancelledExams: cancelled,
      }))
    } catch (err) {
      console.error('Error fetching quick statistics:', err)
    }
  }

  useEffect(() => {
    fetchUpcomingExamsList()
  }, [collegeId, userRole])

  const fetchUpcomingExamsList = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('examinations')
        .select(`
          id,
          exam_name,
          exam_code,
          exam_date,
          start_time,
          end_time,
          exam_type,
          status,
          classes (
            code,
            subjects (
              name_en
            )
          )
        `)
        .gte('exam_date', today)
        .eq('status', 'scheduled')
        .order('exam_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5)

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data } = await query
      setUpcomingExams(data || [])
    } catch (err) {
      console.error('Error fetching upcoming exams list:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Examination Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of examination metrics and performance</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Today's Exams</p>
              <p className="text-3xl font-bold text-gray-900">{stats.todaysExams}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Upcoming</p>
              <p className="text-3xl font-bold text-gray-900">{stats.upcoming}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Grades</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingGrades}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Scheduling Conflicts</p>
              <p className="text-3xl font-bold text-gray-900">{stats.schedulingConflicts}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Metrics</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Overall Pass Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.overallPassRate !== null ? `${stats.overallPassRate}%` : '--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.averageScore !== null ? stats.averageScore : '--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.attendanceRate !== null ? `${stats.attendanceRate}%` : '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Statistics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Statistics</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Today's Exams</span>
              <span className="text-lg font-semibold text-gray-900">{stats.todaysExams}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending Grades</span>
              <span className="text-lg font-semibold text-gray-900">{stats.pendingGrades}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Makeup Requests</span>
              <span className="text-lg font-semibold text-gray-900">{stats.makeupRequests}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Recent Incidents</span>
              <span className="text-lg font-semibold text-gray-900">{stats.recentIncidents}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Examination Types */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Examination Types</h2>
          {examTypes.length > 0 ? (
            <div className="space-y-3">
              {examTypes.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.type}</span>
                  <span className="text-sm text-gray-600">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No Data Available</p>
            </div>
          )}
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Grade Distribution</h2>
          {gradeDistribution.length > 0 ? (
            <div className="space-y-3">
              {gradeDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.grade}</span>
                  <span className="text-sm text-gray-600">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No Data Available</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Examinations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming</h2>
        {upcomingExams.length > 0 ? (
          <div className="space-y-4">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{exam.exam_name}</h3>
                  <p className="text-sm text-gray-600">
                    {exam.classes?.code} - {exam.classes?.subjects?.name_en || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(exam.exam_date).toLocaleDateString()} • {exam.start_time?.substring(0, 5)} - {exam.end_time?.substring(0, 5)}
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {exam.exam_type}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No Examinations Found</p>
          </div>
        )}
      </div>

      {/* Issues & Alerts */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Issues & Alerts</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-sm font-medium text-yellow-800">Scheduling Conflicts</span>
            <span className="text-lg font-bold text-yellow-900">{stats.schedulingConflicts}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-800">Reported Incidents</span>
            <span className="text-lg font-bold text-red-900">{stats.reportedIncidents}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

