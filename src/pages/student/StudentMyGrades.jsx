import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { GraduationCap, FileText, Calendar } from 'lucide-react'

export default function StudentMyGrades() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [enrollments, setEnrollments] = useState([])

  useEffect(() => {
    if (user?.email) {
      fetchStudentData()
    }
  }, [user])

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      // Get student ID from email
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          name_en,
          first_name,
          last_name,
          email,
          majors(id, name_en),
          colleges(id, name_en)
        `)
        .eq('email', user.email)
        .eq('status', 'active')
        .single()

      if (studentError) throw studentError
      setStudent(studentData)

      // Fetch enrollments with grades for this student
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          *,
          classes(
            id,
            code,
            section,
            subjects(id, name_en, code, credit_hours)
          ),
          semesters(id, name_en, code, start_date, end_date),
          grade_components(
            numeric_grade,
            letter_grade,
            gpa_points,
            midterm,
            final,
            assignments,
            quizzes,
            class_participation,
            status
          )
        `)
        .eq('student_id', studentData.id)
        .eq('status', 'enrolled')
        .order('semesters(start_date)', { ascending: false })

      if (enrollmentsError) throw enrollmentsError
      setEnrollments(enrollmentsData || [])
    } catch (err) {
      console.error('Error fetching student data:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateGPA = (enrollments) => {
    let totalPoints = 0
    let totalCredits = 0

    enrollments.forEach(enrollment => {
      const grade = enrollment.grade_components?.[0]
      const credits = enrollment.classes?.subjects?.credit_hours || 0
      
      if (grade?.gpa_points && credits > 0) {
        totalPoints += grade.gpa_points * credits
        totalCredits += credits
      }
    })

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00'
  }

  const groupBySemester = (enrollments) => {
    const grouped = {}
    enrollments.forEach(enrollment => {
      const semesterId = enrollment.semester_id
      if (!grouped[semesterId]) {
        grouped[semesterId] = {
          semester: enrollment.semesters,
          enrollments: [],
        }
      }
      grouped[semesterId].enrollments.push(enrollment)
    })
    return grouped
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-12 text-gray-500">
        <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>{t('student.myGrades.studentNotFound')}</p>
      </div>
    )
  }

  const semesterGroups = groupBySemester(enrollments)
  const cumulativeGPA = calculateGPA(enrollments)
  const totalCreditsAttempted = enrollments.reduce((sum, e) => sum + (e.classes?.subjects?.credit_hours || 0), 0)
  const totalCreditsEarned = enrollments.filter(e => {
    const grade = e.grade_components?.[0]
    return grade && grade.gpa_points && grade.gpa_points > 0
  }).reduce((sum, e) => sum + (e.classes?.subjects?.credit_hours || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('student.myGrades.title')}</h1>
          <p className="text-gray-600 mt-1">{t('student.myGrades.subtitle')}</p>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className={`text-sm font-medium text-gray-500 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('student.myGrades.studentName')}</h3>
            <p className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {student.name_en || `${student.first_name} ${student.last_name}`}
            </p>
            <h3 className={`text-sm font-medium text-gray-500 mb-2 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('student.myGrades.studentId')}</h3>
            <p className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{student.student_id}</p>
          </div>
          <div>
            <h3 className={`text-sm font-medium text-gray-500 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('student.myGrades.program')}</h3>
            <p className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{student.majors?.name_en || '-'}</p>
            <h3 className={`text-sm font-medium text-gray-500 mb-2 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('student.myGrades.college')}</h3>
            <p className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{student.colleges?.name_en || '-'}</p>
          </div>
          <div>
            <h3 className={`text-sm font-medium text-gray-500 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('student.myGrades.cumulativeGpa')}</h3>
            <p className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{cumulativeGPA}</p>
            <h3 className={`text-sm font-medium text-gray-500 mb-2 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('student.myGrades.totalCredits')}</h3>
            <p className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {totalCreditsEarned} / {totalCreditsAttempted}
            </p>
          </div>
        </div>
      </div>

      {/* Semester Grades */}
      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>{t('student.myGrades.noGrades')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(semesterGroups).map((group) => {
            const semester = group.semester
            const semesterEnrollments = group.enrollments
            const semesterGPA = calculateGPA(semesterEnrollments)
            const semesterCredits = semesterEnrollments.reduce((sum, e) => sum + (e.classes?.subjects?.credit_hours || 0), 0)

            return (
              <div key={semester.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} mb-4`}>
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <h3 className="text-xl font-bold text-gray-900">{semester.name_en}</h3>
                  <span className={`text-sm text-gray-600 ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
                    GPA: {semesterGPA} | {t('student.myGrades.credits')}: {semesterCredits}
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('student.myGrades.courseCode')}
                        </th>
                        <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('student.myGrades.courseTitle')}
                        </th>
                        <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('student.myGrades.credits')}
                        </th>
                        <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('student.myGrades.grade')}
                        </th>
                        <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('student.myGrades.gpaPoints')}
                        </th>
                        <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                          {t('student.myGrades.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {semesterEnrollments.map((enrollment) => {
                        const grade = enrollment.grade_components?.[0]
                        return (
                          <tr key={enrollment.id} className="hover:bg-gray-50">
                            <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {enrollment.classes?.subjects?.code || '-'}
                            </td>
                            <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {enrollment.classes?.subjects?.name_en || '-'}
                            </td>
                            <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {enrollment.classes?.subjects?.credit_hours || 0}
                            </td>
                            <td className={`px-4 py-3 text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {grade?.letter_grade || '-'}
                            </td>
                            <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {grade?.gpa_points || '-'}
                            </td>
                            <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                grade?.status === 'final' 
                                  ? 'bg-green-100 text-green-800' 
                                  : grade?.status === 'approved' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {grade?.status || 'draft'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}




