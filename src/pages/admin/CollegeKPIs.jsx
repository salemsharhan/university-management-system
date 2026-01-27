import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Download, Building2 } from 'lucide-react'

export default function CollegeKPIs() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  
  // For college admins, use their college_id. For super admins, use the id from params
  const collegeId = userRole === 'user' ? authCollegeId : (id ? parseInt(id) : null)
  
  const [loading, setLoading] = useState(true)
  const [college, setCollege] = useState(null)
  const [kpiData, setKpiData] = useState({
    totalStudents: 0,
    totalInstructors: 0,
    activeCourses: 0,
    averageGPA: 0,
    attendanceRate: 0,
    passRate: 0,
    honorRollStudents: 0,
    graduationRate: 0,
    retentionRate: 0,
    departmentPerformance: [],
    feeCollectionRate: 0,
    scholarshipStudents: 0,
    installmentPlansActive: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    attendanceBreakdown: {
      regular: 0,
      warning: 0,
      critical: 0,
      autoDropped: 0,
    },
    averageLateArrivals: 0,
    examsConducted: 0,
    averageScore: 0,
    makeupExams: 0,
    failedExams: 0,
    gradeDistribution: {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      f: 0,
    },
    enrollmentPipeline: {
      applications: 0,
      underReview: 0,
      interviewed: 0,
      accepted: 0,
      enrolled: 0,
      rejected: 0,
    },
    yieldRate: 0,
    acceptanceRate: 0,
    avgProcessingTime: 0,
  })

  useEffect(() => {
    if (collegeId) {
      fetchCollegeData()
      fetchKPIData()
    }
  }, [collegeId])

  const fetchCollegeData = async () => {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .eq('id', collegeId)
        .single()

      if (error) throw error
      setCollege(data)
    } catch (err) {
      console.error('Error fetching college:', err)
    }
  }

  const fetchKPIData = async () => {
    try {
      setLoading(true)

      // Fetch total students for this college
      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId)
        .eq('status', 'active')

      // Fetch total instructors for this college
      const { count: instructorsCount } = await supabase
        .from('instructors')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId)
        .eq('status', 'active')

      // Fetch active courses (classes) for this college
      // First get semesters for this college, then get classes
      const { data: collegeSemesters } = await supabase
        .from('semesters')
        .select('id')
        .or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
        .eq('status', 'active')

      const semesterIds = collegeSemesters?.map(s => s.id) || []
      const { count: coursesCount } = semesterIds.length > 0
        ? await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .in('semester_id', semesterIds)
            .eq('status', 'active')
        : { count: 0 }

      // Fetch average GPA from students
      const { data: studentsData } = await supabase
        .from('students')
        .select('gpa')
        .eq('college_id', collegeId)
        .not('gpa', 'is', null)
        .eq('status', 'active')

      const avgGPA = studentsData && studentsData.length > 0
        ? studentsData.reduce((sum, s) => sum + parseFloat(s.gpa || 0), 0) / studentsData.length
        : 0

      // Fetch honor roll students (GPA >= 3.5)
      const { count: honorRollCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId)
        .gte('gpa', 3.5)
        .eq('status', 'active')

      // Get student IDs for this college first (used in multiple queries)
      const { data: collegeStudents } = await supabase
        .from('students')
        .select('id')
        .eq('college_id', collegeId)
        .eq('status', 'active')

      const studentIds = collegeStudents?.map(s => s.id) || []

      // Fetch attendance data
      const { data: attendanceData } = studentIds.length > 0
        ? await supabase
            .from('attendance')
            .select('status')
            .in('student_id', studentIds)
        : { data: [] }

      const totalAttendance = attendanceData?.length || 0
      const presentCount = attendanceData?.filter(a => a.status === 'present' || a.status === 'late').length || 0
      const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0

      // Fetch enrollments for pass rate calculation
      const { data: enrollmentsData } = studentIds.length > 0
        ? await supabase
            .from('enrollments')
            .select('status, grade')
            .in('student_id', studentIds)
            .eq('status', 'completed')
        : { data: [] }

      const completedEnrollments = enrollmentsData?.length || 0
      const passedEnrollments = enrollmentsData?.filter(e => {
        const grade = parseFloat(e.grade || 0)
        return grade >= 2.0 // Assuming 2.0 is passing
      }).length || 0
      const passRate = completedEnrollments > 0 ? (passedEnrollments / completedEnrollments) * 100 : 0

      // Fetch department performance
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('id, name_en, code')
        .or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
        .eq('status', 'active')

      const departmentPerformance = await Promise.all(
        (departmentsData || []).map(async (dept) => {
          // Get majors for this department
          const { data: deptMajors } = await supabase
            .from('majors')
            .select('id')
            .eq('department_id', dept.id)
            .or(`college_id.eq.${collegeId},is_university_wide.eq.true`)

          const majorIds = deptMajors?.map(m => m.id) || []
          
          const { count: deptStudents } = majorIds.length > 0
            ? await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .in('major_id', majorIds)
                .eq('college_id', collegeId)
                .eq('status', 'active')
            : { count: 0 }

          const { data: deptStudentsData } = majorIds.length > 0
            ? await supabase
                .from('students')
                .select('gpa')
                .in('major_id', majorIds)
                .eq('college_id', collegeId)
                .not('gpa', 'is', null)
                .eq('status', 'active')
            : { data: [] }

          const deptGPA = deptStudentsData && deptStudentsData.length > 0
            ? deptStudentsData.reduce((sum, s) => sum + parseFloat(s.gpa || 0), 0) / deptStudentsData.length
            : 0

          // Get student IDs for this department
          const { data: deptStudentIdsData } = majorIds.length > 0
            ? await supabase
                .from('students')
                .select('id')
                .in('major_id', majorIds)
                .eq('college_id', collegeId)
                .eq('status', 'active')
            : { data: [] }

          const deptStudentIds = deptStudentIdsData?.map(s => s.id) || []

          const { data: deptEnrollments } = deptStudentIds.length > 0
            ? await supabase
                .from('enrollments')
                .select('grade, status')
                .in('student_id', deptStudentIds)
                .eq('status', 'completed')
            : { data: [] }

          const deptPassed = deptEnrollments?.filter(e => parseFloat(e.grade || 0) >= 2.0).length || 0
          const deptPassRate = deptEnrollments?.length > 0 ? (deptPassed / deptEnrollments.length) * 100 : 0

          return {
            name: dept.name_en,
            students: deptStudents || 0,
            gpa: deptGPA,
            passRate: deptPassRate,
          }
        })
      )

      // Fetch financial data
      const { data: invoicesData } = studentIds.length > 0
        ? await supabase
            .from('invoices')
            .select('total_amount, paid_amount, pending_amount, status')
            .in('student_id', studentIds)
        : { data: [] }

      const totalInvoiced = invoicesData?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) || 0
      const collectedAmount = invoicesData?.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0) || 0
      const pendingAmount = invoicesData?.reduce((sum, inv) => sum + parseFloat(inv.pending_amount || 0), 0) || 0
      const feeCollectionRate = totalInvoiced > 0 ? (collectedAmount / totalInvoiced) * 100 : 0

      // Fetch scholarship students
      const { count: scholarshipCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', collegeId)
        .eq('has_scholarship', true)
        .eq('status', 'active')

      const totalActiveStudents = studentsCount || 0
      const scholarshipPercentage = totalActiveStudents > 0 ? ((scholarshipCount || 0) / totalActiveStudents) * 100 : 0

      // Calculate attendance breakdown (simplified - would need actual attendance calculations)
      const regularAttendance = Math.floor(totalActiveStudents * 0.88)
      const warningAttendance = Math.floor(totalActiveStudents * 0.08)
      const criticalAttendance = Math.floor(totalActiveStudents * 0.025)
      const autoDropped = Math.floor(totalActiveStudents * 0.015)

      // Fetch examination data
      // First get class IDs for this college's semesters
      const { data: collegeClasses } = semesterIds.length > 0
        ? await supabase
            .from('classes')
            .select('id')
            .in('semester_id', semesterIds)
        : { data: [] }

      const classIds = collegeClasses?.map(c => c.id) || []
      const { data: examsData } = classIds.length > 0
        ? await supabase
            .from('examinations')
            .select('id, status')
            .in('class_id', classIds)
        : { data: [] }

      const examsConducted = examsData?.length || 0

      // Fetch grade distribution from enrollments
      const { data: allEnrollments } = studentIds.length > 0
        ? await supabase
            .from('enrollments')
            .select('grade')
            .in('student_id', studentIds)
            .eq('status', 'completed')
            .not('grade', 'is', null)
        : { data: [] }

      const gradeDist = {
        a: allEnrollments?.filter(e => parseFloat(e.grade || 0) >= 3.7).length || 0,
        b: allEnrollments?.filter(e => parseFloat(e.grade || 0) >= 3.0 && parseFloat(e.grade || 0) < 3.7).length || 0,
        c: allEnrollments?.filter(e => parseFloat(e.grade || 0) >= 2.0 && parseFloat(e.grade || 0) < 3.0).length || 0,
        d: allEnrollments?.filter(e => parseFloat(e.grade || 0) >= 1.0 && parseFloat(e.grade || 0) < 2.0).length || 0,
        f: allEnrollments?.filter(e => parseFloat(e.grade || 0) < 1.0).length || 0,
      }

      const totalGrades = gradeDist.a + gradeDist.b + gradeDist.c + gradeDist.d + gradeDist.f
      const gradeDistribution = totalGrades > 0 ? {
        a: (gradeDist.a / totalGrades) * 100,
        b: (gradeDist.b / totalGrades) * 100,
        c: (gradeDist.c / totalGrades) * 100,
        d: (gradeDist.d / totalGrades) * 100,
        f: (gradeDist.f / totalGrades) * 100,
      } : { a: 0, b: 0, c: 0, d: 0, f: 0 }

      // Fetch enrollment pipeline data
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('status_code, college_id')
        .eq('college_id', collegeId)

      const enrollmentPipeline = {
        applications: applicationsData?.length || 0,
        underReview: applicationsData?.filter(a => a.status_code === 'APPN').length || 0,
        interviewed: applicationsData?.filter(a => a.status_code === 'APPI').length || 0,
        accepted: applicationsData?.filter(a => a.status_code === 'APPA').length || 0,
        enrolled: applicationsData?.filter(a => a.status_code === 'APPE').length || 0,
        rejected: applicationsData?.filter(a => a.status_code === 'APPR').length || 0,
      }

      const yieldRate = enrollmentPipeline.accepted > 0
        ? (enrollmentPipeline.enrolled / enrollmentPipeline.accepted) * 100
        : 0
      const acceptanceRate = enrollmentPipeline.applications > 0
        ? (enrollmentPipeline.accepted / enrollmentPipeline.applications) * 100
        : 0

      setKpiData({
        totalStudents: studentsCount || 0,
        totalInstructors: instructorsCount || 0,
        activeCourses: coursesCount || 0,
        averageGPA: parseFloat(avgGPA.toFixed(2)),
        attendanceRate: parseFloat(attendanceRate.toFixed(1)),
        passRate: parseFloat(passRate.toFixed(1)),
        honorRollStudents: honorRollCount || 0,
        graduationRate: 91, // Would need actual graduation data
        retentionRate: 88, // Would need actual retention data
        departmentPerformance,
        feeCollectionRate: parseFloat(feeCollectionRate.toFixed(1)),
        scholarshipStudents: parseFloat(scholarshipPercentage.toFixed(1)),
        installmentPlansActive: 35, // Would need actual installment data
        collectedAmount,
        pendingAmount,
        overdueAmount: 0, // Would need actual overdue calculation
        attendanceBreakdown: {
          regular: regularAttendance,
          warning: warningAttendance,
          critical: criticalAttendance,
          autoDropped,
        },
        averageLateArrivals: 2.3, // Would need actual late arrival data
        examsConducted,
        averageScore: 78.5, // Would need actual exam score calculation
        makeupExams: 45, // Would need actual makeup exam data
        failedExams: parseFloat(((gradeDist.f / totalGrades) * 100).toFixed(1)) || 0,
        gradeDistribution,
        enrollmentPipeline,
        yieldRate: parseFloat(yieldRate.toFixed(1)),
        acceptanceRate: parseFloat(acceptanceRate.toFixed(1)),
        avgProcessingTime: 14, // Would need actual processing time calculation
      })
    } catch (err) {
      console.error('Error fetching KPI data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!college) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t('common.notFound') || 'College not found'}</p>
        </div>
      </div>
    )
  }

  const honorRollPercentage = kpiData.totalStudents > 0
    ? ((kpiData.honorRollStudents / kpiData.totalStudents) * 100).toFixed(0)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(userRole === 'user' ? '/dashboard' : '/admin/colleges')}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900 mb-4`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{userRole === 'user' ? t('common.backToDashboard') || 'Back to Dashboard' : t('colleges.back') || 'Back to Colleges'}</span>
          </button>
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-4'}`}>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: college.primary_color || '#952562' }}
              >
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{college.name_en}</h1>
                <p className="text-gray-600 text-sm">
                  {college.name_ar} • {college.code}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option>Fall 2025</option>
                <option>Spring 2025</option>
                <option>Summer 2024</option>
              </select>
              <button className="px-5 py-2 bg-primary-gradient text-white rounded-lg text-sm font-medium flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t('common.export') || 'Export Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">+8.2%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{kpiData.totalStudents.toLocaleString()}</div>
            <div className="text-sm text-gray-600">{t('kpis.collegeKPIs.totalStudents')}</div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">+3</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{kpiData.totalInstructors.toLocaleString()}</div>
            <div className="text-sm text-gray-600">{t('kpis.collegeKPIs.instructors')}</div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{kpiData.activeCourses.toLocaleString()}</div>
            <div className="text-sm text-gray-600">{t('kpis.collegeKPIs.activeCourses')}</div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">↑ 0.15</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{kpiData.averageGPA}</div>
            <div className="text-sm text-gray-600">{t('kpis.collegeKPIs.averageGPA')}</div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{kpiData.attendanceRate}%</div>
            <div className="text-sm text-gray-600">{t('kpis.collegeKPIs.attendanceRate')}</div>
          </div>
        </div>

        {/* Academic Performance Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('kpis.collegeKPIs.academicPerformanceMetrics')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Pass Rate */}
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${kpiData.passRate}, 100`}/>
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-green-800">
                  {kpiData.passRate}%
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">{t('kpis.collegeKPIs.coursePassRate')}</div>
              <div className="text-xs text-gray-600 mt-1">↑ 2% {t('kpis.collegeKPIs.fromLastSemester')}</div>
            </div>

            {/* Honor Roll */}
            <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${honorRollPercentage}, 100`}/>
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-amber-800">
                  {honorRollPercentage}%
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">{t('kpis.collegeKPIs.honorRoll')}</div>
              <div className="text-xs text-gray-600 mt-1">{kpiData.honorRollStudents} {t('kpis.collegeKPIs.students')}</div>
            </div>

            {/* Graduation Rate */}
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${kpiData.graduationRate}, 100`}/>
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-blue-800">
                  {kpiData.graduationRate}%
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">{t('kpis.collegeKPIs.graduationRate')}</div>
              <div className="text-xs text-gray-600 mt-1">↑ 4% {t('kpis.collegeKPIs.fromLastYear')}</div>
            </div>

            {/* Retention Rate */}
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray={`${kpiData.retentionRate}, 100`}/>
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold text-purple-800">
                  {kpiData.retentionRate}%
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">{t('kpis.collegeKPIs.retentionRate')}</div>
              <div className="text-xs text-gray-600 mt-1">{t('kpis.collegeKPIs.yearOverYear')}</div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Department Performance */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{t('kpis.collegeKPIs.departmentPerformance')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className={`text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t('kpis.collegeKPIs.department')}</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">{t('kpis.collegeKPIs.students')}</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">{t('kpis.collegeKPIs.gpa')}</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 uppercase">{t('kpis.collegeKPIs.pass')} %</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiData.departmentPerformance.slice(0, 4).map((dept, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className={`py-3.5 px-2 text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{dept.name}</td>
                      <td className="text-center py-3.5 px-2 text-sm text-gray-600">{dept.students.toLocaleString()}</td>
                      <td className="text-center py-3.5 px-2 text-sm font-semibold text-green-600">{dept.gpa.toFixed(2)}</td>
                      <td className="text-center py-3.5 px-2 text-sm text-gray-600">{dept.passRate.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{t('kpis.collegeKPIs.financialSummary')}</h2>
            
            <div className="space-y-5 mb-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{t('kpis.collegeKPIs.feeCollectionRate')}</span>
                  <span className="text-sm font-semibold text-gray-900">{kpiData.feeCollectionRate}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                    style={{ width: `${kpiData.feeCollectionRate}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{t('kpis.collegeKPIs.scholarshipStudents')}</span>
                  <span className="text-sm font-semibold text-gray-900">{kpiData.scholarshipStudents}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                    style={{ width: `${kpiData.scholarshipStudents}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{t('kpis.collegeKPIs.installmentPlansActive')}</span>
                  <span className="text-sm font-semibold text-gray-900">{kpiData.installmentPlansActive}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                    style={{ width: `${kpiData.installmentPlansActive}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-5 grid grid-cols-3 gap-3">
              <div className="text-center p-3.5 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-800">${(kpiData.collectedAmount / 1000).toFixed(0)}K</div>
                <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.collected')}</div>
              </div>
              <div className="text-center p-3.5 bg-amber-50 rounded-lg">
                <div className="text-xl font-bold text-amber-800">${(kpiData.pendingAmount / 1000).toFixed(0)}K</div>
                <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.pending')}</div>
              </div>
              <div className="text-center p-3.5 bg-red-50 rounded-lg">
                <div className="text-xl font-bold text-red-800">${(kpiData.overdueAmount / 1000).toFixed(0)}K</div>
                <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.overdue')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance & Examination Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Attendance Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{t('kpis.collegeKPIs.attendanceBreakdown')}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-800 mb-1">{kpiData.attendanceBreakdown.regular.toLocaleString()}</div>
                <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.regularAttendance')}</div>
                <div className="text-xs text-green-600 mt-1">88% {t('kpis.collegeKPIs.ofStudents')}</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-amber-800 mb-1">{kpiData.attendanceBreakdown.warning.toLocaleString()}</div>
                <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.warningLevel')}</div>
                <div className="text-xs text-amber-600 mt-1">8% {t('kpis.collegeKPIs.ofStudents')}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-800 mb-1">{kpiData.attendanceBreakdown.critical.toLocaleString()}</div>
                <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.criticalLevel')}</div>
                <div className="text-xs text-red-600 mt-1">2.5% {t('kpis.collegeKPIs.ofStudents')}</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-blue-800 mb-1">{kpiData.attendanceBreakdown.autoDropped.toLocaleString()}</div>
                <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.autoDropped')}</div>
                <div className="text-xs text-blue-600 mt-1">1.5% {t('kpis.collegeKPIs.ofStudents')}</div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('kpis.collegeKPIs.averageLateArrivals')}</span>
                <span className="text-lg font-semibold text-gray-900">{kpiData.averageLateArrivals}</span>
              </div>
            </div>
          </div>

          {/* Examination Statistics */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{t('kpis.collegeKPIs.examinationStatistics')}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="text-xs text-gray-600 mb-1">{t('kpis.collegeKPIs.examsConducted')}</div>
                <div className="text-2xl font-bold text-purple-800">{kpiData.examsConducted}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="text-xs text-gray-600 mb-1">{t('kpis.collegeKPIs.averageScore')}</div>
                <div className="text-2xl font-bold text-green-800">{kpiData.averageScore}%</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <div className="text-xs text-gray-600 mb-1">{t('kpis.collegeKPIs.makeupExams')}</div>
                <div className="text-2xl font-bold text-amber-800">{kpiData.makeupExams}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-xl">
                <div className="text-xs text-gray-600 mb-1">{t('kpis.collegeKPIs.failedExams')}</div>
                <div className="text-2xl font-bold text-red-800">{kpiData.failedExams}%</div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('kpis.collegeKPIs.gradeDistribution')}</h3>
              <div className="flex gap-2 items-end h-20">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-green-500 rounded-t" style={{ height: `${kpiData.gradeDistribution.a * 0.8}%` }}></div>
                  <span className="text-xs text-gray-600 mt-1">A ({kpiData.gradeDistribution.a.toFixed(0)}%)</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${kpiData.gradeDistribution.b * 0.8}%` }}></div>
                  <span className="text-xs text-gray-600 mt-1">B ({kpiData.gradeDistribution.b.toFixed(0)}%)</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-amber-500 rounded-t" style={{ height: `${kpiData.gradeDistribution.c * 0.8}%` }}></div>
                  <span className="text-xs text-gray-600 mt-1">C ({kpiData.gradeDistribution.c.toFixed(0)}%)</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-orange-500 rounded-t" style={{ height: `${kpiData.gradeDistribution.d * 0.8}%` }}></div>
                  <span className="text-xs text-gray-600 mt-1">D ({kpiData.gradeDistribution.d.toFixed(0)}%)</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-red-500 rounded-t" style={{ height: `${kpiData.gradeDistribution.f * 0.8}%` }}></div>
                  <span className="text-xs text-gray-600 mt-1">F ({kpiData.gradeDistribution.f.toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enrollment & Onboarding */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('kpis.collegeKPIs.enrollmentOnboardingPipeline')}</h2>
          
          <div className="grid grid-cols-6 gap-4 mb-5">
            <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl relative">
              <div className="text-2xl font-bold text-blue-800 mb-2">{kpiData.enrollmentPipeline.applications}</div>
              <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.applications')}</div>
              <div className="absolute right-[-8px] top-1/2 transform -translate-y-1/2 text-gray-300">→</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl relative">
              <div className="text-2xl font-bold text-purple-800 mb-2">{kpiData.enrollmentPipeline.underReview}</div>
              <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.underReview')}</div>
              <div className="absolute right-[-8px] top-1/2 transform -translate-y-1/2 text-gray-300">→</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl relative">
              <div className="text-2xl font-bold text-amber-800 mb-2">{kpiData.enrollmentPipeline.interviewed}</div>
              <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.interviewed')}</div>
              <div className="absolute right-[-8px] top-1/2 transform -translate-y-1/2 text-gray-300">→</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl relative">
              <div className="text-2xl font-bold text-green-800 mb-2">{kpiData.enrollmentPipeline.accepted}</div>
              <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.accepted')}</div>
              <div className="absolute right-[-8px] top-1/2 transform -translate-y-1/2 text-gray-300">→</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl relative">
              <div className="text-2xl font-bold text-emerald-800 mb-2">{kpiData.enrollmentPipeline.enrolled}</div>
              <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.enrolled')}</div>
              <div className="absolute right-[-8px] top-1/2 transform -translate-y-1/2 text-gray-300">→</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-xl">
              <div className="text-2xl font-bold text-red-800 mb-2">{kpiData.enrollmentPipeline.rejected}</div>
              <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.rejected')}</div>
            </div>
          </div>
          
          <div className="mt-5 p-4 bg-gray-50 rounded-xl flex justify-around">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{kpiData.yieldRate}%</div>
              <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.yieldRate')}</div>
            </div>
            <div className="w-px bg-gray-300"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{kpiData.acceptanceRate}%</div>
              <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.acceptanceRate')}</div>
            </div>
            <div className="w-px bg-gray-300"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{kpiData.avgProcessingTime} {t('kpis.collegeKPIs.days')}</div>
              <div className="text-xs text-gray-600">{t('kpis.collegeKPIs.avgProcessingTime')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
