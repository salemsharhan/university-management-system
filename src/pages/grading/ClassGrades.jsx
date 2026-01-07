import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check, FileText, Users } from 'lucide-react'

export default function ClassGrades() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [classData, setClassData] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [grades, setGrades] = useState({}) // enrollment_id -> grade data
  const [gradingScale, setGradingScale] = useState([])

  useEffect(() => {
    fetchClassData()
    fetchEnrollments()
  }, [classId])

  const fetchClassData = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          subjects(id, name_en, code),
          semesters(id, name_en, code),
          instructors(id, name_en),
          colleges(id, name_en, academic_settings)
        `)
        .eq('id', classId)
        .single()

      if (error) throw error
      setClassData(data)

      // Extract grading scale from college settings
      if (data?.colleges?.academic_settings?.gradingScale) {
        setGradingScale(data.colleges.academic_settings.gradingScale)
      } else {
        // Default grading scale
        setGradingScale([
          { letter: 'A+', minPercent: 95, maxPercent: 100, points: 4.0, passing: true },
          { letter: 'A', minPercent: 90, maxPercent: 94, points: 3.7, passing: true },
          { letter: 'B+', minPercent: 85, maxPercent: 89, points: 3.3, passing: true },
          { letter: 'B', minPercent: 80, maxPercent: 84, points: 3.0, passing: true },
          { letter: 'C+', minPercent: 75, maxPercent: 79, points: 2.7, passing: true },
          { letter: 'C', minPercent: 70, maxPercent: 74, points: 2.0, passing: true },
          { letter: 'D', minPercent: 60, maxPercent: 69, points: 1.0, passing: true },
          { letter: 'F', minPercent: 0, maxPercent: 59, points: 0.0, passing: false },
        ])
      }
    } catch (err) {
      console.error('Error fetching class data:', err)
      setError(err.message || 'Failed to load class data')
    } finally {
      setFetching(false)
    }
  }

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          students(id, student_id, name_en, first_name, last_name)
        `)
        .eq('class_id', classId)
        .eq('status', 'enrolled')
        .order('students(name_en)')

      if (error) throw error
      setEnrollments(data || [])

      // Fetch existing grades
      if (data && data.length > 0) {
        const enrollmentIds = data.map(e => e.id)
        const { data: gradesData, error: gradesError } = await supabase
          .from('grade_components')
          .select('*')
          .in('enrollment_id', enrollmentIds)

        if (!gradesError && gradesData) {
          const gradesMap = {}
          gradesData.forEach(grade => {
            gradesMap[grade.enrollment_id] = grade
          })
          setGrades(gradesMap)
        }
      }
    } catch (err) {
      console.error('Error fetching enrollments:', err)
      setError(err.message || 'Failed to load enrollments')
    }
  }

  const calculateNumericGrade = (gradeData) => {
    // Simple calculation: sum of all components (assuming equal weight)
    // In a real system, you'd use weights from class/subject settings
    const components = [
      gradeData.midterm || 0,
      gradeData.final || 0,
      gradeData.assignments || 0,
      gradeData.quizzes || 0,
      gradeData.class_participation || 0,
      gradeData.project || 0,
      gradeData.lab || 0,
      gradeData.other || 0,
    ]
    
    // For now, use simple average if all components are provided
    // Or sum if they represent percentages
    const nonZero = components.filter(c => c > 0)
    if (nonZero.length === 0) return null
    
    // Simple sum approach (components should add up to 100)
    const sum = components.reduce((a, b) => a + b, 0)
    return Math.min(100, Math.max(0, sum)) // Clamp between 0-100
  }

  const handleGradeChange = (enrollmentId, field, value) => {
    setGrades(prev => {
      const current = prev[enrollmentId] || {
        enrollment_id: enrollmentId,
        class_id: parseInt(classId),
        student_id: enrollments.find(e => e.id === enrollmentId)?.student_id,
        semester_id: classData?.semester_id,
        college_id: classData?.college_id,
        status: 'draft',
      }
      
      const updated = {
        ...current,
        [field]: value ? parseFloat(value) : null,
      }
      
      // Recalculate numeric grade if components changed
      if (['midterm', 'final', 'assignments', 'quizzes', 'class_participation', 'project', 'lab', 'other'].includes(field)) {
        const numericGrade = calculateNumericGrade(updated)
        if (numericGrade !== null) {
          updated.numeric_grade = numericGrade
          // Letter grade and GPA will be calculated by trigger
        }
      }
      
      return {
        ...prev,
        [enrollmentId]: updated,
      }
    })
  }

  const handleStatusChange = (enrollmentId, status) => {
    setGrades(prev => ({
      ...prev,
      [enrollmentId]: {
        ...(prev[enrollmentId] || {}),
        status,
      },
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const gradesToSave = Object.values(grades).filter(g => g.enrollment_id)
      
      for (const grade of gradesToSave) {
        const { enrollment_id, ...gradeData } = grade
        
        // Upsert grade component
        const { error: upsertError } = await supabase
          .from('grade_components')
          .upsert({
            ...gradeData,
            enrollment_id,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'enrollment_id',
          })

        if (upsertError) throw upsertError
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to save grades')
      console.error('Error saving grades:', err)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/grading')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Class Grades</h1>
        <div></div>
      </div>

      {/* Class Info */}
      {classData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Class Code</h3>
              <p className="text-lg font-semibold text-gray-900">{classData.code}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Subject</h3>
              <p className="text-lg font-semibold text-gray-900">
                {classData.subjects?.name_en || 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Instructor</h3>
              <p className="text-lg font-semibold text-gray-900">
                {classData.instructors?.name_en || 'TBA'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grading Scale Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Grading Scale</h3>
        <div className="flex flex-wrap gap-2">
          {gradingScale.map((scale, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-blue-700 border border-blue-200"
            >
              {scale.letter}: {scale.minPercent}-{scale.maxPercent}% ({scale.points} pts)
            </span>
          ))}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center space-x-2">
          <Check className="w-5 h-5" />
          <span>Grades saved successfully!</span>
        </div>
      )}

      {/* Grade Entry Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Grade Entry</h2>
          <p className="text-sm text-gray-600 mt-1">Enter or update grades for students in this class</p>
        </div>

        {enrollments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No enrolled students in this class</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numeric Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Letter Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GPA Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Midterm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quizzes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Participation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enrollments.map((enrollment) => {
                  const grade = grades[enrollment.id] || {}
                  const student = enrollment.students
                  return (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student?.name_en || `${student?.first_name} ${student?.last_name}`}
                          </div>
                          <div className="text-sm text-gray-500">{student?.student_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={grade.numeric_grade || ''}
                          onChange={(e) => handleGradeChange(enrollment.id, 'numeric_grade', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {grade.letter_grade || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {grade.gpa_points || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={grade.midterm || ''}
                          onChange={(e) => handleGradeChange(enrollment.id, 'midterm', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={grade.final || ''}
                          onChange={(e) => handleGradeChange(enrollment.id, 'final', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={grade.assignments || ''}
                          onChange={(e) => handleGradeChange(enrollment.id, 'assignments', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={grade.quizzes || ''}
                          onChange={(e) => handleGradeChange(enrollment.id, 'quizzes', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={grade.class_participation || ''}
                          onChange={(e) => handleGradeChange(enrollment.id, 'class_participation', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={grade.notes || ''}
                          onChange={(e) => handleGradeChange(enrollment.id, 'notes', e.target.value)}
                          className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm"
                          placeholder="Notes..."
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={grade.status || 'draft'}
                          onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm"
                        >
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="approved">Approved</option>
                          <option value="final">Final</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? 'Saving...' : 'Save Grades'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}



