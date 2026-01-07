import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { TrendingUp, BarChart3, Users, Award } from 'lucide-react'

export default function GradeAnalytics() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId } = useCollege()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [collegeId, setCollegeId] = useState(null)

  useEffect(() => {
    if (userRole === 'admin' && selectedCollegeId) {
      setCollegeId(selectedCollegeId)
    } else if (userRole === 'user' && authCollegeId) {
      setCollegeId(authCollegeId)
    }
    fetchClasses()
  }, [userRole, selectedCollegeId, authCollegeId])

  useEffect(() => {
    if (selectedClass) {
      fetchAnalytics()
    } else {
      setAnalytics(null)
    }
  }, [selectedClass])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('classes')
        .select(`
          id,
          code,
          subjects(id, name_en, code)
        `)
        .eq('status', 'active')
        .order('code')

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

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // Fetch enrollments with grades
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          grade_components(numeric_grade, letter_grade, gpa_points, status)
        `)
        .eq('class_id', selectedClass)
        .eq('status', 'enrolled')

      if (enrollmentsError) throw enrollmentsError

      // Calculate analytics
      const grades = enrollments
        .map(e => e.grade_components?.[0])
        .filter(g => g && g.numeric_grade !== null)

      if (grades.length === 0) {
        setAnalytics({
          totalStudents: enrollments.length,
          gradedStudents: 0,
          pendingStudents: enrollments.length,
          averageGrade: null,
          medianGrade: null,
          highestGrade: null,
          lowestGrade: null,
          passRate: 0,
          failRate: 0,
          gradeDistribution: {},
        })
        return
      }

      const numericGrades = grades.map(g => g.numeric_grade).sort((a, b) => a - b)
      const averageGrade = numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length
      const medianGrade = numericGrades.length % 2 === 0
        ? (numericGrades[numericGrades.length / 2 - 1] + numericGrades[numericGrades.length / 2]) / 2
        : numericGrades[Math.floor(numericGrades.length / 2)]
      const highestGrade = Math.max(...numericGrades)
      const lowestGrade = Math.min(...numericGrades)

      const passingGrades = grades.filter(g => g.gpa_points && g.gpa_points >= 2.0)
      const failingGrades = grades.filter(g => !g.gpa_points || g.gpa_points < 2.0)
      const passRate = (passingGrades.length / grades.length) * 100
      const failRate = (failingGrades.length / grades.length) * 100

      // Grade distribution
      const gradeDistribution = {}
      grades.forEach(grade => {
        const letter = grade.letter_grade || 'N/A'
        gradeDistribution[letter] = (gradeDistribution[letter] || 0) + 1
      })

      setAnalytics({
        totalStudents: enrollments.length,
        gradedStudents: grades.length,
        pendingStudents: enrollments.length - grades.length,
        averageGrade: averageGrade.toFixed(2),
        medianGrade: medianGrade.toFixed(2),
        highestGrade: highestGrade.toFixed(2),
        lowestGrade: lowestGrade.toFixed(2),
        passRate: passRate.toFixed(1),
        failRate: failRate.toFixed(1),
        gradeDistribution,
      })
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedClassData = classes.find(c => c.id === parseInt(selectedClass))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grade Distribution Analytics</h1>
          <p className="text-gray-600 mt-1">Select a class to view grade distribution and analytics</p>
        </div>
      </div>

      {/* Class Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Select Class...</option>
          {classes.map(classItem => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.code} - {classItem.subjects?.name_en || 'N/A'}
            </option>
          ))}
        </select>
      </div>

      {/* Analytics Display */}
      {selectedClass && analytics && (
        <div className="space-y-6">
          {/* Class Info */}
          {selectedClassData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {selectedClassData.subjects?.name_en || 'N/A'}
              </h2>
              <p className="text-sm text-gray-600">Class Code: {selectedClassData.code}</p>
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalStudents}</p>
                </div>
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  {analytics.gradedStudents} Graded, {analytics.pendingStudents} Pending
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Grade</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {analytics.averageGrade || 'N/A'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Median</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {analytics.medianGrade || 'N/A'}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Highest / Lowest</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {analytics.highestGrade || 'N/A'} / {analytics.lowestGrade || 'N/A'}
                  </p>
                </div>
                <Award className="w-8 h-8 text-primary-600" />
              </div>
            </div>
          </div>

          {/* Pass/Fail Rate */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pass Rate / Fail Rate</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Pass Rate</span>
                  <span className="text-lg font-bold text-green-600">{analytics.passRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full"
                    style={{ width: `${analytics.passRate}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Fail Rate</span>
                  <span className="text-lg font-bold text-red-600">{analytics.failRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-red-500 h-4 rounded-full"
                    style={{ width: `${analytics.failRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Pass Rate: {analytics.passRate}%</p>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Grade Distribution Chart</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Grade Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.gradeDistribution)
                    .sort((a, b) => {
                      const order = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
                      return order.indexOf(a[0]) - order.indexOf(b[0])
                    })
                    .map(([grade, count]) => {
                      const percentage = (count / analytics.gradedStudents) * 100
                      return (
                        <div key={grade} className="flex items-center space-x-4">
                          <div className="w-16 text-sm font-medium text-gray-700">{grade}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600">{count} students</span>
                              <span className="text-sm text-gray-600">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-primary-600 h-3 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedClass && !analytics && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No grade data available for this class</p>
        </div>
      )}
    </div>
  )
}



