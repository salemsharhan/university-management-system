import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check, FileText, Users } from 'lucide-react'

export default function ClassGrades() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
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
  const [gradeConfiguration, setGradeConfiguration] = useState([])

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
          subjects(id, name_en, code, grade_configuration),
          semesters(id, name_en, code),
          instructors(id, name_en),
          colleges(id, name_en, academic_settings)
        `)
        .eq('id', classId)
        .single()

      if (error) throw error
      setClassData(data)

      // Extract grade configuration from subject
      if (data?.subjects?.grade_configuration && Array.isArray(data.subjects.grade_configuration)) {
        setGradeConfiguration(data.subjects.grade_configuration)
      } else {
        setGradeConfiguration([])
      }

      // Extract grading scale from college settings
      if (data?.colleges?.academic_settings?.gradingScale) {
        setGradingScale(data.colleges.academic_settings.gradingScale)
      } else {
        // Default grading scale (will be translated in display)
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
      setError(err.message || t('grading.classGrades.failedToLoad'))
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
      setError(err.message || t('grading.classGrades.failedToLoadEnrollments'))
    }
  }

  const calculateNumericGrade = (gradeData) => {
    if (gradeConfiguration.length === 0) {
      // Fallback to old calculation if no grade configuration
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
      const nonZero = components.filter(c => c > 0)
      if (nonZero.length === 0) return null
      const sum = components.reduce((a, b) => a + b, 0)
      return Math.min(100, Math.max(0, sum))
    }

    // Calculate based on grade configuration with weights
    let totalWeightedScore = 0
    let totalWeight = 0

    gradeConfiguration.forEach(config => {
      const fieldName = `grade_${config.grade_type_code.toLowerCase().replace(/\s+/g, '_')}`
      const score = gradeData[fieldName] || 0
      const weight = config.weight || 0

      if (score > 0 && weight > 0) {
        // Normalize score to percentage if needed (assuming max is the maximum score)
        const maxScore = config.maximum || 100
        const normalizedScore = (score / maxScore) * 100
        totalWeightedScore += normalizedScore * (weight / 100)
        totalWeight += weight / 100
      }
    })

    if (totalWeight === 0) return null
    return Math.min(100, Math.max(0, (totalWeightedScore / totalWeight) * 100))
  }

  const validateGradeValue = (value, config) => {
    if (value === null || value === undefined || value === '') return null
    
    const parsedValue = parseFloat(value)
    if (isNaN(parsedValue)) return null
    
    // Validate minimum
    if (config.minimum !== null && config.minimum !== undefined && parsedValue < config.minimum) {
      return `${t('grading.classGrades.valueTooLow')}: ${config.grade_type_name_en} ${t('grading.classGrades.minimum')} ${config.minimum}`
    }
    
    // Validate maximum
    if (config.maximum !== null && config.maximum !== undefined && parsedValue > config.maximum) {
      return `${t('grading.classGrades.valueTooHigh')}: ${config.grade_type_name_en} ${t('grading.classGrades.maximum')} ${config.maximum}`
    }
    
    return null // No error
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
      
      let parsedValue = value ? parseFloat(value) : null
      
      // Validate against grade configuration if it exists
      if (gradeConfiguration.length > 0 && parsedValue !== null && !isNaN(parsedValue)) {
        const gradeConfigFields = gradeConfiguration.map(gc => 
          `grade_${gc.grade_type_code.toLowerCase().replace(/\s+/g, '_')}`
        )
        
        if (gradeConfigFields.includes(field)) {
          // Find the matching grade configuration
          const config = gradeConfiguration.find(gc => 
            `grade_${gc.grade_type_code.toLowerCase().replace(/\s+/g, '_')}` === field
          )
          
          if (config) {
            const validationError = validateGradeValue(value, config)
            if (validationError) {
              setError(validationError)
              // Still allow the value to be entered, but show error
              // User can correct it
            } else {
              // Clear error if validation passes
              if (error) setError('')
            }
          }
        }
      } else if (error && gradeConfiguration.length === 0) {
        // Clear error if no grade configuration
        setError('')
      }
      
      const updated = {
        ...current,
        [field]: parsedValue,
      }
      
      // Recalculate numeric grade if components changed
      const gradeConfigFields = gradeConfiguration.map(gc => 
        `grade_${gc.grade_type_code.toLowerCase().replace(/\s+/g, '_')}`
      )
      const allGradeFields = ['midterm', 'final', 'assignments', 'quizzes', 'class_participation', 'project', 'lab', 'other', ...gradeConfigFields]
      
      if (allGradeFields.includes(field)) {
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

  const handleGradeBlur = (enrollmentId, field, value) => {
    // Validate on blur for better UX
    if (gradeConfiguration.length > 0 && value) {
      const gradeConfigFields = gradeConfiguration.map(gc => 
        `grade_${gc.grade_type_code.toLowerCase().replace(/\s+/g, '_')}`
      )
      
      if (gradeConfigFields.includes(field)) {
        const config = gradeConfiguration.find(gc => 
          `grade_${gc.grade_type_code.toLowerCase().replace(/\s+/g, '_')}` === field
        )
        
        if (config) {
          const validationError = validateGradeValue(value, config)
          if (validationError) {
            setError(validationError)
          } else {
            setError('')
          }
        }
      }
    }
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
      setError(err.message || t('grading.classGrades.failedToSave'))
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
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <button
          onClick={() => navigate('/grading')}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('grading.classGrades.back')}</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{t('grading.classGrades.title')}</h1>
        <div></div>
      </div>

      {/* Class Info */}
      {classData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className={`text-sm font-medium text-gray-500 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.classCode')}</h3>
              <p className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{classData.code}</p>
            </div>
            <div>
              <h3 className={`text-sm font-medium text-gray-500 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.subject')}</h3>
              <p className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {classData.subjects?.name_en || 'N/A'}
              </p>
            </div>
            <div>
              <h3 className={`text-sm font-medium text-gray-500 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.instructorLabel')}</h3>
              <p className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                {classData.instructors?.name_en || t('grading.classGrades.tba')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grading Scale Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className={`text-sm font-medium text-blue-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.gradingScale')}</h3>
        <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
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
        <div className={`bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
          <Check className="w-5 h-5" />
          <span>{t('grading.classGrades.savedSuccess')}</span>
        </div>
      )}

      {/* Grade Entry Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className={`text-xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.gradeEntry')}</h2>
          <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.gradeEntryDesc')}</p>
        </div>

        {enrollments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>{t('grading.classGrades.noEnrolledStudents')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.student')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.numericGrade')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.letterGrade')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.gpaPoints')}</th>
                  {gradeConfiguration.length > 0 ? (
                    gradeConfiguration.map((config) => (
                      <th key={config.grade_type_id} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                        {config.grade_type_name_en} {config.weight ? `(${config.weight}%)` : ''}
                      </th>
                    ))
                  ) : (
                    <>
                      <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.midterm')}</th>
                      <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.final')}</th>
                      <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.assignments')}</th>
                      <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.quizzes')}</th>
                      <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.classParticipation')}</th>
                    </>
                  )}
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.notes')}</th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.classGrades.status')}</th>
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
                      {gradeConfiguration.length > 0 ? (
                        gradeConfiguration.map((config) => {
                          const fieldName = `grade_${config.grade_type_code.toLowerCase().replace(/\s+/g, '_')}`
                          const maxValue = config.maximum || 100
                          const minValue = config.minimum || 0
                          return (
                            <td key={config.grade_type_id} className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                step="0.01"
                                min={minValue}
                                max={maxValue}
                                value={grade[fieldName] || ''}
                                onChange={(e) => handleGradeChange(enrollment.id, fieldName, e.target.value)}
                                onBlur={(e) => handleGradeBlur(enrollment.id, fieldName, e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                                placeholder="-"
                                title={`${t('grading.classGrades.maximum')}: ${maxValue}, ${t('grading.classGrades.pass')}: ${config.pass_score || 'N/A'}, ${t('grading.classGrades.fail')}: ${config.fail_score || 'N/A'}, ${t('grading.classGrades.minimum')}: ${minValue}`}
                              />
                            </td>
                          )
                        })
                      ) : (
                        <>
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
                        </>
                      )}
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={grade.notes || ''}
                          onChange={(e) => handleGradeChange(enrollment.id, 'notes', e.target.value)}
                          className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm"
                          placeholder={t('grading.classGrades.notesPlaceholder')}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={grade.status || 'draft'}
                          onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-sm"
                        >
                          <option value="draft">{t('grading.classGrades.draft')}</option>
                          <option value="submitted">{t('grading.classGrades.submitted')}</option>
                          <option value="approved">{t('grading.classGrades.approved')}</option>
                          <option value="final">{t('grading.classGrades.finalStatus')}</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={`p-6 border-t border-gray-200 flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Save className="w-5 h-5" />
            <span>{loading ? t('grading.classGrades.saving') : t('grading.classGrades.saveGrades')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}



