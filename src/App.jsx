import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CollegeProvider } from './contexts/CollegeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import './i18n'
import Layout from './components/Layout'
import RoleBasedLayout from './components/RoleBasedLayout'
import RoleSelection from './pages/RoleSelection'
import LoginAdmin from './pages/LoginAdmin'
import LoginCollege from './pages/LoginCollege'
import LoginInstructor from './pages/LoginInstructor'
import LoginStudent from './pages/LoginStudent'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import CreateStudent from './pages/CreateStudent'
import UploadStudents from './pages/UploadStudents'
import Instructors from './pages/Instructors'
import Courses from './pages/Courses'
import Schedule from './pages/Schedule'
import Examinations from './pages/Examinations'
import Settings from './pages/Settings'
import Colleges from './pages/admin/Colleges'
import CreateCollege from './pages/admin/CreateCollege'
import ViewCollege from './pages/admin/ViewCollege'
import CollegeProfile from './pages/admin/CollegeProfile'
import CollegeKPIs from './pages/admin/CollegeKPIs'
import CreateInstructor from './pages/CreateInstructor'
import CreateAcademicYear from './pages/academic/CreateAcademicYear'
import CreateSemester from './pages/academic/CreateSemester'
import CreateDepartment from './pages/academic/CreateDepartment'
import CreateMajor from './pages/academic/CreateMajor'
import CreateSubject from './pages/academic/CreateSubject'
import CreateClass from './pages/academic/CreateClass'
import AcademicYears from './pages/academic/AcademicYears'
import Semesters from './pages/academic/Semesters'
import Departments from './pages/academic/Departments'
import Majors from './pages/academic/Majors'
import Subjects from './pages/academic/Subjects'
import Classes from './pages/academic/Classes'
import ViewAcademicYear from './pages/academic/ViewAcademicYear'
import EditAcademicYear from './pages/academic/EditAcademicYear'
import ViewSemester from './pages/academic/ViewSemester'
import EditSemester from './pages/academic/EditSemester'
import ViewDepartment from './pages/academic/ViewDepartment'
import EditDepartment from './pages/academic/EditDepartment'
import ViewMajor from './pages/academic/ViewMajor'
import EditMajor from './pages/academic/EditMajor'
import ManageMajorSheet from './pages/academic/ManageMajorSheet'
import ViewSubject from './pages/academic/ViewSubject'
import EditSubject from './pages/academic/EditSubject'
import ViewClass from './pages/academic/ViewClass'
import EditClass from './pages/academic/EditClass'
import ViewInstructor from './pages/ViewInstructor'
import EditInstructor from './pages/EditInstructor'
import ViewStudent from './pages/ViewStudent'
import EditStudent from './pages/EditStudent'
import AttendanceDashboard from './pages/attendance/AttendanceDashboard'
import ClassSessions from './pages/attendance/ClassSessions'
import TakeAttendance from './pages/attendance/TakeAttendance'
import CreateSession from './pages/attendance/CreateSession'
import Enrollments from './pages/Enrollments'
import CreateEnrollment from './pages/CreateEnrollment'
import ViewEnrollment from './pages/ViewEnrollment'
import BulkEnrollment from './pages/BulkEnrollment'
import CreateExamination from './pages/examinations/CreateExamination'
import ExaminationDashboard from './pages/examinations/ExaminationDashboard'
import ExaminationStatistics from './pages/examinations/ExaminationStatistics'
import ExaminationConflicts from './pages/examinations/ExaminationConflicts'
import Applications from './pages/admissions/Applications'
import CreateApplication from './pages/admissions/CreateApplication'
import ViewApplication from './pages/admissions/ViewApplication'
import UniversitySettings from './pages/admin/UniversitySettings'
import GradeManagement from './pages/grading/GradeManagement'
import ClassGrades from './pages/grading/ClassGrades'
import StudentGrades from './pages/grading/StudentGrades'
import Transcripts from './pages/grading/Transcripts'
import GradeAnalytics from './pages/grading/GradeAnalytics'
import StudentMyGrades from './pages/student/StudentMyGrades'
import StudentMyAttendance from './pages/student/StudentMyAttendance'
import StudentPayments from './pages/student/StudentPayments'
import StudentSubjectView from './pages/student/StudentSubjectView'
import StudentEnrollment from './pages/student/StudentEnrollment'
import StudentProfile from './pages/student/StudentProfile'
import StudentSchedule from './pages/student/StudentSchedule'
import StudentGraduationPath from './pages/student/StudentGraduationPath'
import StudentCourseGuide from './pages/student/StudentCourseGuide'
import StudentComingSoon from './pages/student/StudentComingSoon'
import InstructorSubjectView from './pages/instructor/InstructorSubjectView'
import CreateMaterial from './pages/instructor/CreateMaterial'
import EditMaterial from './pages/instructor/EditMaterial'
import CreateHomework from './pages/instructor/CreateHomework'
import EditHomework from './pages/instructor/EditHomework'
import CreateExam from './pages/instructor/CreateExam'
import InvoiceManagement from './pages/finance/InvoiceManagement'
import CreateInvoice from './pages/finance/CreateInvoice'
import ViewInvoice from './pages/finance/ViewInvoice'
import CreditWallet from './pages/finance/CreditWallet'
import FinanceReports from './pages/finance/FinanceReports'
import Donations from './pages/finance/Donations'
import InstallmentPlans from './pages/finance/InstallmentPlans'
import FinanceConfiguration from './pages/finance/FinanceConfiguration'
import CreateFeeStructure from './pages/finance/CreateFeeStructure'
import CreateFeeType from './pages/finance/CreateFeeType'
import RegisterApplication from './pages/public/RegisterApplication'
import TrackApplication from './pages/public/TrackApplication'
import ApplicationStatus from './pages/public/ApplicationStatus'

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CollegeProvider>
          <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/login/admin" element={<LoginAdmin />} />
          <Route path="/login/college" element={<LoginCollege />} />
          <Route path="/login/instructor" element={<LoginInstructor />} />
          <Route path="/login/student" element={<LoginStudent />} />
          <Route path="/signup" element={<Signup />} />
          {/* Public Application Routes */}
          <Route path="/register" element={<RegisterApplication />} />
          <Route path="/track" element={<TrackApplication />} />
          <Route path="/track/:id" element={<ApplicationStatus />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Dashboard />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Students />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateStudent />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/upload"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <UploadStudents />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructors"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Instructors />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollments"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Enrollments />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollments/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateEnrollment />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollments/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewEnrollment />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollments/bulk"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <BulkEnrollment />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Courses />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Schedule />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Examinations />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations/dashboard"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ExaminationDashboard />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations/statistics"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ExaminationStatistics />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations/conflicts"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ExaminationConflicts />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateExamination />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/applications"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Applications />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/applications/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateApplication />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/applications/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewApplication />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Settings />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <AttendanceDashboard />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/sessions"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ClassSessions />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/take"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <TakeAttendance />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/sessions/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateSession />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Colleges />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateCollege />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/university-settings"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <UniversitySettings />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateCollege />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CollegeProfile />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges/:id/kpis"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CollegeKPIs />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/college/kpis"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CollegeKPIs />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructors/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateInstructor />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/years/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateAcademicYear />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/semesters/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateSemester />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/departments/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateDepartment />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateMajor />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/subjects/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateSubject />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/classes/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateClass />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/years"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <AcademicYears />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/semesters"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Semesters />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/departments"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Departments />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Majors />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/subjects"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Subjects />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/classes"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Classes />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/years/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewAcademicYear />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/years/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <EditAcademicYear />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/semesters/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewSemester />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/semesters/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <EditSemester />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/departments/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewDepartment />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/departments/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <EditDepartment />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewMajor />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <EditMajor />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors/:id/degree-plan"
            element={
              <ProtectedRoute allowedRoles={['admin', 'user']}>
                <RoleBasedLayout>
                  <ManageMajorSheet />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/subjects/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewSubject />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/subjects/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <EditSubject />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/classes/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewClass />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/classes/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <EditClass />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructors/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewInstructor />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructors/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <EditInstructor />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewStudent />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <EditStudent />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <GradeManagement />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/classes/:classId/grades"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ClassGrades />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/students"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <StudentGrades />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/students/:studentId/report"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Transcripts />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/transcripts"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Transcripts />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/analytics"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <GradeAnalytics />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          {/* Student Pages */}
          <Route
            path="/student/grades"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <StudentMyGrades />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <StudentMyAttendance />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/subjects/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <StudentSubjectView />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/payments"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <RoleBasedLayout>
                  <StudentPayments />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/enroll"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <RoleBasedLayout>
                  <StudentEnrollment />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <RoleBasedLayout>
                  <StudentProfile />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/schedule"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <RoleBasedLayout>
                  <StudentSchedule />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/graduation-path"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <RoleBasedLayout>
                  <StudentGraduationPath />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/course-guide"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <RoleBasedLayout>
                  <StudentCourseGuide />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/coming-soon"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <RoleBasedLayout>
                  <StudentComingSoon />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          {/* Instructor Routes - More specific routes first */}
          <Route
            path="/instructor/subjects/:id/homework/:homeworkId/edit"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <RoleBasedLayout>
                  <EditHomework />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/subjects/:id/materials/create"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <RoleBasedLayout>
                  <CreateMaterial />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/subjects/:id/materials/:materialId/edit"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <RoleBasedLayout>
                  <EditMaterial />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/subjects/:id/homework/create"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <RoleBasedLayout>
                  <CreateHomework />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/subjects/:id/exams/create"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <RoleBasedLayout>
                  <CreateExam />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/subjects/:id"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <RoleBasedLayout>
                  <InstructorSubjectView />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          {/* Finance Routes */}
          <Route
            path="/finance/invoices"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <InvoiceManagement />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/invoices/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateInvoice />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/invoices/:id"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <ViewInvoice />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/wallet"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreditWallet />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/reports"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <FinanceReports />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/donations"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <Donations />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/installments"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <InstallmentPlans />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <FinanceConfiguration />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration/create"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateFeeStructure />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration/:id/edit"
            element={
              <ProtectedRoute>
                <RoleBasedLayout>
                  <CreateFeeStructure />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration/types/create"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RoleBasedLayout>
                  <CreateFeeType />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration/types/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RoleBasedLayout>
                  <CreateFeeType />
                </RoleBasedLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
        </CollegeProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
