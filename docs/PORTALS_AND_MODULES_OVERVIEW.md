# University Management System: Logins, Portals, Modules, and Code Points

Last reviewed from the current codebase on 2026-05-01.

## Purpose

This document describes the login entry points, role portals, main functions, e-learning areas, code modules, and important implementation points in this project.

The application is a React/Vite university management system backed by Supabase authentication and database tables. Routing is defined mainly in `src/App.jsx`, role session data is handled in `src/contexts/AuthContext.jsx`, and portal shell selection is handled in `src/components/RoleBasedLayout.jsx`.

## Login Entry Points

| Login | URL | Expected role | Main user type | Main destination |
|---|---|---|---|---|
| Super Admin login | `/login/admin` | `admin` | University-level administrator | Admin dashboard and university-wide modules |
| College Admin login | `/login/college` | `user` in database, treated as college admin | College operator/admin | College-scoped administration modules |
| Instructor login | `/login/instructor` | `instructor` | Teacher/faculty member | Instructor teaching portal |
| Student login | `/login/student` | `student` | Enrolled student | Student academic portal |
| Applicant login | `/login/applicant` | `applicant` | Admission applicant before becoming a student | Applicant portal |
| Applicant registration | `/register` | Creates applicant flow | New admission applicant | Application registration and tracking |
| Public application lookup | `/lookup-application` | Public or applicant-facing lookup | Applicant/user checking status | Application status page |

## Authentication and Role Flow

- Supabase Auth performs email/password login.
- After login, `AuthContext` loads the user row from the `users` table by email.
- The app stores `userRole`, `collegeId`, and, for instructors, `departmentId`.
- The database role `user` represents a college admin.
- `RoleBasedLayout` chooses the correct layout:
  - `admin` and `user`: `Layout`
  - `student`: `StudentLayout` or `StudentELearningLayout`
  - `instructor`: `InstructorLayout`
  - `applicant`: `ApplicantPortalLayout` through applicant-specific routes

## Portal Summary

| Portal | Layout/code shell | Primary role | Main function |
|---|---|---|---|
| Admin portal | `src/components/Layout.jsx` | `admin` | University-wide setup, colleges, academic structure, admissions, people, finance, grading, operations |
| College admin portal | `src/components/Layout.jsx` | `user` | College-scoped academic, student, instructor, admission, finance, attendance, and examination management |
| Instructor portal | `src/components/InstructorLayout.jsx` | `instructor` | Teaching, courses, lessons, assessments, gradebook, analytics, communication, reports |
| Student portal | `src/components/StudentLayout.jsx` | `student` | Profile, registration, timetable, grades, attendance, payments, documents, requests |
| Student e-learning portal | `src/components/StudentELearningLayout.jsx` | `student` | Teams sessions, recordings, courseware, online exams, study planner, e-library, progress |
| Applicant portal | `src/pages/applicant/ApplicantPortalLayout.jsx` | `applicant` | Applicant dashboard, profile, new applications, application status, offer letters |

## Admin Portal

The admin portal is used for university-level control. It uses the main layout with an admin navigation set.

### Main modules

- Dashboard: central overview after admin login.
- University configuration: university settings, colleges, and user settings.
- Academic configuration: academic years, semesters, departments, majors, subjects, sessions/classes, lesson building, curriculum map, rubric builder, and e-library.
- Admissions: applications, new application creation, enrollments, and bulk enrollment.
- People: students, Excel student upload, and instructors.
- Grades: grade management, student grades, transcripts, and analytics.
- Financial assistance: invoices, credit wallet, fee structures, installment plans, scholarships placeholder/navigation, donations, and reports.
- Operations: schedule, attendance, examinations, and student requests.

### Key routes

- `/dashboard`
- `/admin/university-settings`
- `/admin/colleges`
- `/academic/years`
- `/academic/semesters`
- `/academic/departments`
- `/academic/majors`
- `/academic/subjects`
- `/academic/classes`
- `/academic/classes/build-lessons`
- `/admin/curriculum-map`
- `/admin/rubric-builder`
- `/admin/elibrary`
- `/admissions/applications`
- `/enrollments`
- `/students`
- `/instructors`
- `/grading`
- `/finance/invoices`
- `/schedule`
- `/attendance`
- `/examinations`
- `/admin/requests`

## College Admin Portal

The college admin role is stored as `user` in the database. It shares the main `Layout` but receives a filtered navigation based on role.

### Main modules

- Dashboard: college operational overview.
- Academic setup: academic years, semesters, departments, majors, subjects, sessions/classes, and lesson building.
- Student management: all students and Excel upload.
- Instructor management: instructor list and instructor creation.
- Enrollment management: enrollment records, create enrollment, view enrollment, and bulk enrollment.
- Schedule and attendance: timetable, attendance sessions, attendance taking, and session creation.
- Examinations: exam list, dashboard, statistics, conflicts, and exam creation.
- Admissions: applications, create application, and view application.
- Grading: grading management, class grades, student reports, transcripts, and analytics.
- Finance: invoices, wallet, fee structures, donations, installment plans, and reports.
- Student requests: request review and detail pages.
- Settings: user settings.

### Key routes

- `/dashboard`
- `/academic/*`
- `/students`
- `/students/create`
- `/students/upload`
- `/instructors`
- `/instructors/create`
- `/enrollments`
- `/enrollments/create`
- `/enrollments/bulk`
- `/schedule`
- `/attendance`
- `/examinations`
- `/admissions/applications`
- `/grading`
- `/finance/*`
- `/admin/requests`
- `/settings`

## Instructor Portal

The instructor portal has a separate instructor layout and navigation. It is focused on teaching delivery, course content, assessments, analytics, and communication.

### Main modules

- Instructor dashboard: teaching overview.
- My courses: instructor course/session list.
- Subject view: materials, homework, exams, attendance, and subject-level actions.
- Curriculum map: learning outcomes and curriculum alignment.
- Lesson content builder: build lessons and preview lesson content.
- Content release: schedule or manage content availability.
- Question bank: manage reusable assessment questions.
- Assessment authoring: create assessments/exams.
- Gradebook: review and manage grades.
- Final grade submission: submit final grades.
- Analytics and engagement: course analytics and student engagement views.
- Communication: messages/announcements area.
- Integrity cases: assessment integrity or proctoring cases.
- Workload: instructor workload view.
- Reports: teaching and course reports.
- Templates: reusable templates.

### Key routes

- `/instructor/dashboard`
- `/instructor/courses`
- `/instructor/subjects/:id`
- `/instructor/subjects/:id/materials/create`
- `/instructor/subjects/:id/materials/:materialId/edit`
- `/instructor/subjects/:id/homework/create`
- `/instructor/subjects/:id/homework/:homeworkId/edit`
- `/instructor/subjects/:id/exams/create`
- `/instructor/curriculum-map`
- `/instructor/build-lessons`
- `/instructor/lesson-preview`
- `/instructor/content-release`
- `/instructor/question-bank`
- `/instructor/assessments`
- `/instructor/gradebook`
- `/instructor/grade-submission`
- `/instructor/analytics`
- `/instructor/communication`
- `/instructor/integrity-cases`
- `/instructor/workload`
- `/instructor/reports`
- `/instructor/preview-exam`
- `/instructor/monitor-exam`
- `/instructor/integrity-settings`

## Student Portal

The student portal is for enrolled students. It uses `StudentLayout` unless the path starts with `/student/elearning`, where it switches to the e-learning layout.

### Main modules

- Dashboard: student overview.
- My profile: student personal and academic profile.
- Document center: student documents.
- Holds and blocks: academic/financial/service restrictions.
- Course catalog: browse available courses.
- Course registration: enroll in available sessions/courses.
- Timetable: student schedule.
- Grades and results: student grades.
- Degree audit/graduation path: progress toward graduation.
- Invoices and fees: student payments and payment receipts.
- Requests center: student service requests and request details.
- Attendance: personal attendance view.
- Subject view: course/subject detail page.

### Key routes

- `/dashboard`
- `/student/profile`
- `/student/documents`
- `/student/holds`
- `/student/course-catalog`
- `/student/course-guide`
- `/student/enroll`
- `/student/schedule`
- `/student/grades`
- `/student/graduation-path`
- `/student/payments`
- `/student/payments/receipt/:paymentId`
- `/student/requests`
- `/student/requests/:id`
- `/student/attendance`
- `/student/subjects/:id`

## Student E-Learning Portal

The e-learning portal is a separate student shell for online learning workflows. It is still accessed by users with the `student` role.

### Main modules

- Teams sessions: upcoming or active online sessions.
- Session lobby: join flow for a specific class schedule and date.
- Recordings/history: previous session recordings.
- Courseware: course content by class.
- Lesson viewer: individual lesson content.
- Exams: online exams list.
- Exam room: online exam taking page.
- Submitted exam page: confirmation/result after submission.
- Study planner: learning plan and study schedule.
- e-Library: digital learning resources.
- Progress: learning progress tracking.

### Key routes

- `/student/elearning/sessions`
- `/student/elearning/sessions/history`
- `/student/elearning/sessions/:classScheduleId/:sessionDate/lobby`
- `/student/elearning/courseware`
- `/student/elearning/courseware/:classId`
- `/student/elearning/courseware/:classId/lesson/:lessonId`
- `/student/elearning/exams`
- `/student/elearning/exams/:examId`
- `/student/elearning/exams/:examId/submitted`
- `/student/elearning/study-planner`
- `/student/elearning/elibrary`
- `/student/elearning/progress`

## Applicant Portal

The applicant portal is for users before they become students. It uses applicant-specific protection and redirects promoted students to the student portal.

### Main modules

- Applicant dashboard: applicant overview.
- Profile: applicant personal information.
- New application: select major and submit new application.
- Application status: view status of submitted applications.
- Offer letter: view offer letters when available.
- Public tracking: application lookup and status routes.

### Key routes

- `/register`
- `/login/applicant`
- `/portal`
- `/portal/profile`
- `/portal/apply`
- `/portal/apply/new`
- `/portal/applications/:id`
- `/portal/applications/:id/offer-letter`
- `/portal/offer-letter`
- `/application-status`
- `/lookup-application`
- `/application-status/:id`

## Shared Operational Modules

### Academic

Code folder: `src/pages/academic`

Functions:

- Academic years CRUD.
- Semesters CRUD.
- Departments CRUD.
- Majors CRUD.
- Major degree plan/sheet management.
- Subjects CRUD.
- Classes/sessions CRUD.
- Subject curriculum mapping.

### Admissions

Code folder: `src/pages/admissions` and applicant/public pages.

Functions:

- Create applications.
- Review application list.
- View application details.
- Applicant registration and application status tracking.
- Offer letter pages.

### Attendance

Code folder: `src/pages/attendance`

Functions:

- Attendance dashboard.
- Class session list.
- Create attendance sessions.
- Take attendance.

### Examinations

Code folder: `src/pages/examinations`

Functions:

- Examination list.
- Examination dashboard.
- Examination creation.
- Statistics.
- Conflict detection/review.

### Finance

Code folder: `src/pages/finance`

Functions:

- Invoice management.
- Invoice creation and viewing.
- Credit wallet.
- Finance reports.
- Donations.
- Installment plans.
- Fee structure and fee type configuration.

### Grading

Code folder: `src/pages/grading`

Functions:

- Grade management.
- Class grades.
- Student grade reports.
- Transcripts.
- Grade analytics.

### E-Learning and Course Content

Code folders:

- `src/pages/student`
- `src/pages/instructor`
- `src/pages/admin`
- `src/components/teams`
- `src/components/subject`

Functions:

- Lesson building.
- Lesson preview.
- Courseware delivery.
- Microsoft Teams sessions.
- Recordings.
- Online exams.
- Question bank.
- Assessment authoring.
- e-Library.
- Learning progress.

## Main Code Modules

| Area | Main files/folders | Responsibility |
|---|---|---|
| Routing | `src/App.jsx` | Defines public, protected, admin, college, student, e-learning, instructor, finance, academic, and applicant routes |
| Authentication | `src/contexts/AuthContext.jsx` | Supabase session, sign-in, sign-out, user role, college id, instructor department id |
| Protected routes | `src/components/ProtectedRoute.jsx` | Checks whether a user is signed in |
| Applicant protection | `src/components/ApplicantProtectedRoute.jsx` | Allows applicant portal only for `applicant`; redirects promoted `student` users |
| Role layout selection | `src/components/RoleBasedLayout.jsx` | Chooses admin/college, student, e-learning, or instructor layout |
| Admin/college layout | `src/components/Layout.jsx` | Navigation and shell for admin and college admin users |
| Student layout | `src/components/StudentLayout.jsx` | Student academic portal shell |
| Student e-learning layout | `src/components/StudentELearningLayout.jsx` | Student e-learning shell |
| Instructor layout | `src/components/InstructorLayout.jsx` | Instructor portal shell |
| Applicant layout | `src/pages/applicant/ApplicantPortalLayout.jsx` | Applicant portal shell |
| Supabase client | `src/lib/supabase` | Supabase API connection |
| Database migrations | `supabase/migrations` | Schema and database changes |
| Setup scripts | `scripts` | User setup and supporting automation |

## Important Code Points

- Role detection depends on the `users` table email matching the Supabase Auth user email.
- College admin users use role `user`, not `college`, in the database.
- `AuthContext.signIn(email, password, expectedRole)` validates the expected login role after Supabase Auth succeeds.
- `RoleBasedLayout` selects the visual portal shell, but it is not a security boundary by itself.
- `ProtectedRoute` currently ignores the `allowedRoles` prop even though many routes pass it. As implemented, it only checks whether the user is authenticated. Real role enforcement should be added there if route-level access control is required.
- Applicant routes use `ApplicantProtectedRoute`, which does enforce applicant role behavior and redirects students away from applicant pages.
- Student e-learning is not a separate auth role; it is a separate layout selected by URL path prefix `/student/elearning`.
- Payments can be hidden in the student navigation through `getPaymentsEnabled(collegeId)`.
- The app supports Arabic/English switching through `LanguageContext` and i18n.
- Some route links appear in navigation before a matching route is fully visible in `App.jsx` or may be placeholders, such as scholarships and some instructor notification/settings links. These should be checked before release.

## Test/Login References in Repository

The repository includes setup guides with sample accounts:

- `LOGIN_CREDENTIALS_GUIDE.md`
- `TEST_USERS.md`
- `LOGIN_SETUP_USING_SCRIPTS.md`
- `SETUP_TEST_USERS.md`

Common sample users from the repo docs:

| Role | Email | Password | Login |
|---|---|---|---|
| Super Admin | `admin@university.edu` | `Admin123!` | `/login/admin` |
| College Admin | `college@testuniversity.edu` | `College123!` | `/login/college` |
| Instructor | `instructor@testuniversity.edu` | `Instructor123!` | `/login/instructor` |
| Student | `student@testuniversity.edu` | `Student123!` | `/login/student` |

## Recommended Next Improvements

- Enforce `allowedRoles` inside `ProtectedRoute`.
- Add a route inventory test so navigation links cannot point to missing routes.
- Document which modules are university-wide and which are college-scoped.
- Add a permission matrix for admin, college admin, instructor, student, and applicant.
- Review placeholder modules before production release.
