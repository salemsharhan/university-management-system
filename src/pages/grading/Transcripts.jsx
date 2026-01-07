import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { FileText, Download, Printer, Calendar } from 'lucide-react'

export default function Transcripts() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [student, setStudent] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (studentId) {
      fetchStudentData()
      fetchEnrollments()
    }
  }, [studentId])

  const fetchStudentData = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          majors(id, name_en),
          colleges(id, name_en)
        `)
        .eq('id', studentId)
        .single()

      if (error) throw error
      setStudent(data)
    } catch (err) {
      console.error('Error fetching student:', err)
    }
  }

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          classes(
            id,
            code,
            subjects(id, name_en, code, credit_hours)
          ),
          semesters(id, name_en, code, start_date, end_date),
          grade_components(
            numeric_grade,
            letter_grade,
            gpa_points,
            status
          )
        `)
        .eq('student_id', studentId)
        .order('semesters(start_date)', { ascending: false })

      if (error) throw error
      setEnrollments(data || [])
    } catch (err) {
      console.error('Error fetching enrollments:', err)
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

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    alert('PDF export functionality will be implemented')
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academic Transcript</h1>
          <p className="text-gray-600 mt-1">Official academic record</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Printer className="w-5 h-5" />
            <span>Print Transcript</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Transcript Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 print:shadow-none">
        {/* Header */}
        <div className="bg-primary-gradient text-white p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold">Academic Transcript</h2>
          <p className="text-sm opacity-90">Official Student Record</p>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Student Name</h3>
            <p className="text-lg font-semibold text-gray-900">{student.name_en}</p>
            <h3 className="text-sm font-medium text-gray-500 mb-2 mt-4">Student ID</h3>
            <p className="text-lg font-semibold text-gray-900">{student.student_id}</p>
            <h3 className="text-sm font-medium text-gray-500 mb-2 mt-4">Program</h3>
            <p className="text-lg font-semibold text-gray-900">{student.majors?.name_en || '-'}</p>
            <h3 className="text-sm font-medium text-gray-500 mb-2 mt-4">Major</h3>
            <p className="text-lg font-semibold text-gray-900">{student.majors?.name_en || '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Cumulative GPA</h3>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold text-gray-900">{cumulativeGPA}</p>
              <button className="text-sm text-primary-600 hover:text-primary-800">Edit</button>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 mt-4">Credits Attempted</h3>
            <p className="text-lg font-semibold text-gray-900">
              {totalCreditsAttempted}
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">0</span>
            </p>
            <h3 className="text-sm font-medium text-gray-500 mb-2 mt-4">Credits Earned</h3>
            <p className="text-lg font-semibold text-gray-900">
              {totalCreditsEarned}
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">0</span>
            </p>
            <h3 className="text-sm font-medium text-gray-500 mb-2 mt-4">Academic Standing</h3>
            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Academic Good Standing
            </span>
          </div>
        </div>

        {/* Semester Details */}
        {Object.values(semesterGroups).map((group, idx) => {
          const semester = group.semester
          const semesterEnrollments = group.enrollments
          const semesterGPA = calculateGPA(semesterEnrollments)
          const semesterCredits = semesterEnrollments.reduce((sum, e) => sum + (e.classes?.subjects?.credit_hours || 0), 0)
          const semesterEarned = semesterEnrollments.filter(e => {
            const grade = e.grade_components?.[0]
            return grade && grade.gpa_points && grade.gpa_points > 0
          }).reduce((sum, e) => sum + (e.classes?.subjects?.credit_hours || 0), 0)

          return (
            <div key={semester.id} className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-primary-600" />
                <h3 className="text-xl font-bold text-gray-900">{semester.name_en} - {new Date(semester.start_date).getFullYear()}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Semester GPA: {semesterGPA} Credits: {semesterEarned}/{semesterCredits}
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade Points</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {semesterEnrollments.map((enrollment) => {
                      const grade = enrollment.grade_components?.[0]
                      return (
                        <tr key={enrollment.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {enrollment.classes?.subjects?.code || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {enrollment.classes?.subjects?.name_en || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {enrollment.classes?.subjects?.credit_hours || 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {grade?.letter_grade || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {grade?.gpa_points || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full inline-block"></span>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan="2" className="px-4 py-3 text-sm text-gray-900">Semester Totals:</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{semesterCredits}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">GPA Calculation: {semesterGPA}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">Earned: {semesterEarned}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {/* Overall Totals */}
        <div className="border-t pt-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Credits Attempted</h3>
              <p className="text-lg font-semibold text-gray-900">{totalCreditsAttempted}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Credits Earned</h3>
              <p className="text-lg font-semibold text-gray-900">{totalCreditsEarned}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Cumulative GPA</h3>
              <div className="flex items-center space-x-2">
                <p className="text-lg font-semibold text-gray-900">{cumulativeGPA}</p>
                <button className="text-sm text-primary-600 hover:text-primary-800">Edit</button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Academic Standing</h3>
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Academic Good Standing
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-6 mt-6 text-center text-sm text-gray-500">
          <p>Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="mt-2 flex items-center justify-center space-x-1">
            <FileText className="w-4 h-4" />
            <span>This is an official transcript issued by the university.</span>
          </p>
          <p className="mt-4">Registrar's Signature: _________________</p>
        </div>
      </div>
    </div>
  )
}



