import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CollegeProvider } from './contexts/CollegeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import './i18n'
import Layout from './components/Layout'
import RoleSelection from './pages/RoleSelection'
import LoginAdmin from './pages/LoginAdmin'
import LoginCollege from './pages/LoginCollege'
import LoginInstructor from './pages/LoginInstructor'
import LoginStudent from './pages/LoginStudent'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import CreateStudent from './pages/CreateStudent'
import Instructors from './pages/Instructors'
import Courses from './pages/Courses'
import Schedule from './pages/Schedule'
import Examinations from './pages/Examinations'
import Settings from './pages/Settings'
import Colleges from './pages/admin/Colleges'
import CreateCollege from './pages/admin/CreateCollege'
import ViewCollege from './pages/admin/ViewCollege'
import CollegeProfile from './pages/admin/CollegeProfile'
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
import InstructorSubjectView from './pages/instructor/InstructorSubjectView'
import CreateMaterial from './pages/instructor/CreateMaterial'
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
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <Layout>
                  <Students />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateStudent />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructors"
            element={
              <ProtectedRoute>
                <Layout>
                  <Instructors />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollments"
            element={
              <ProtectedRoute>
                <Layout>
                  <Enrollments />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollments/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateEnrollment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollments/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewEnrollment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollments/bulk"
            element={
              <ProtectedRoute>
                <Layout>
                  <BulkEnrollment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Layout>
                  <Courses />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <Layout>
                  <Schedule />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations"
            element={
              <ProtectedRoute>
                <Layout>
                  <Examinations />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExaminationDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations/statistics"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExaminationStatistics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations/conflicts"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExaminationConflicts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/examinations/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateExamination />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/applications"
            element={
              <ProtectedRoute>
                <Layout>
                  <Applications />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/applications/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateApplication />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/applications/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewApplication />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Layout>
                  <AttendanceDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/sessions"
            element={
              <ProtectedRoute>
                <Layout>
                  <ClassSessions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/take"
            element={
              <ProtectedRoute>
                <Layout>
                  <TakeAttendance />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/sessions/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateSession />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges"
            element={
              <ProtectedRoute>
                <Layout>
                  <Colleges />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateCollege />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/university-settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <UniversitySettings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateCollege />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/colleges/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CollegeProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructors/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateInstructor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/years/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateAcademicYear />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/semesters/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateSemester />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/departments/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateDepartment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateMajor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/subjects/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateSubject />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/classes/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateClass />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/years"
            element={
              <ProtectedRoute>
                <Layout>
                  <AcademicYears />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/semesters"
            element={
              <ProtectedRoute>
                <Layout>
                  <Semesters />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/departments"
            element={
              <ProtectedRoute>
                <Layout>
                  <Departments />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors"
            element={
              <ProtectedRoute>
                <Layout>
                  <Majors />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/subjects"
            element={
              <ProtectedRoute>
                <Layout>
                  <Subjects />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/classes"
            element={
              <ProtectedRoute>
                <Layout>
                  <Classes />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/years/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewAcademicYear />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/years/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditAcademicYear />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/semesters/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewSemester />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/semesters/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditSemester />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/departments/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewDepartment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/departments/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditDepartment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewMajor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditMajor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/majors/:id/degree-plan"
            element={
              <ProtectedRoute allowedRoles={['admin', 'user']}>
                <Layout>
                  <ManageMajorSheet />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/subjects/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewSubject />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/subjects/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditSubject />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/classes/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewClass />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic/classes/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditClass />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructors/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewInstructor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructors/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditInstructor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewStudent />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <EditStudent />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading"
            element={
              <ProtectedRoute>
                <Layout>
                  <GradeManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/classes/:classId/grades"
            element={
              <ProtectedRoute>
                <Layout>
                  <ClassGrades />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/students"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentGrades />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/students/:studentId/report"
            element={
              <ProtectedRoute>
                <Layout>
                  <Transcripts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/transcripts"
            element={
              <ProtectedRoute>
                <Layout>
                  <Transcripts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grading/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <GradeAnalytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Student Pages */}
          <Route
            path="/student/grades"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentMyGrades />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentMyAttendance />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/subjects/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentSubjectView />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/payments"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Layout>
                  <StudentPayments />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/enroll"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Layout>
                  <StudentEnrollment />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Instructor Routes - More specific routes first */}
          <Route
            path="/instructor/subjects/:id/homework/:homeworkId/edit"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <EditHomework />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/subjects/:id/materials/create"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <CreateMaterial />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/subjects/:id/homework/create"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <CreateHomework />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/subjects/:id/exams/create"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <CreateExam />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/subjects/:id"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <InstructorSubjectView />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Finance Routes */}
          <Route
            path="/finance/invoices"
            element={
              <ProtectedRoute>
                <Layout>
                  <InvoiceManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/invoices/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateInvoice />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/invoices/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ViewInvoice />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/wallet"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreditWallet />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <FinanceReports />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/donations"
            element={
              <ProtectedRoute>
                <Layout>
                  <Donations />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/installments"
            element={
              <ProtectedRoute>
                <Layout>
                  <InstallmentPlans />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration"
            element={
              <ProtectedRoute>
                <Layout>
                  <FinanceConfiguration />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateFeeStructure />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration/:id/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateFeeStructure />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration/types/create"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <CreateFeeType />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/configuration/types/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <CreateFeeType />
                </Layout>
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
