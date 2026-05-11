# School Student Information System Blueprint

This document outlines a Student Information System for a school serving KG through Grade 12. It is inspired by the existing university management system structure, but simplified and adapted for school operations.

## Purpose

The system should manage the full student lifecycle in a school environment:

- Admissions and student registration
- Student profiles and guardian information
- Grade levels, sections, subjects, and teacher assignments
- Timetables and attendance
- Assessments, marks, report cards, and promotion
- Fees and payments
- Parent/student communication
- Documents, requests, and school administration

The system should support daily school operations for administrators, teachers, students, parents, accountants, and admission staff.

## Main User Roles

| Role | Main user | Purpose |
|---|---|---|
| School Admin | Principal, registrar, academic coordinator | Manage students, teachers, classes, subjects, attendance, exams, and school reports |
| Admissions Officer | Admissions team | Handle new student applications, admission review, and enrollment |
| Teacher | Classroom or subject teacher | Take attendance, give homework, enter marks, add behavior notes, and message parents |
| Student | Enrolled student | View timetable, homework, attendance, marks, report cards, and school notices |
| Parent / Guardian | Student guardian | View child details, attendance, fees, report cards, messages, and requests |
| Accountant | Finance team | Manage student fees, invoices, payments, discounts, and receipts |

## Login Entry Points

| Login | URL example | Expected role | Main destination |
|---|---|---|---|
| Admin login | `/login/admin` | `school_admin` | Admin dashboard |
| Admissions login | `/login/admissions` | `admissions` | Admissions dashboard |
| Teacher login | `/login/teacher` | `teacher` | Teacher dashboard |
| Student login | `/login/student` | `student` | Student portal |
| Parent login | `/login/parent` | `parent` | Parent portal |
| Accountant login | `/login/accounts` | `accountant` | Finance dashboard |
| Online application | `/apply` | public/applicant | New student application |
| Application status | `/application-status` | public/applicant | Track admission progress |

## Portal Summary

| Portal | Primary role | Main function |
|---|---|---|
| Admin Portal | School Admin | School setup, academic structure, users, students, classes, subjects, reports |
| Admissions Portal | Admissions Officer | Applications, entrance tests, interviews, offers, enrollment |
| Teacher Portal | Teacher | Classes, attendance, lesson plans, homework, marks, behavior, communication |
| Student Portal | Student | Profile, timetable, homework, attendance, marks, report cards, resources |
| Parent Portal | Parent / Guardian | Child progress, attendance, fees, communication, requests |
| Finance Portal | Accountant | Fees, invoices, collections, discounts, receipts, finance reports |

## Academic Structure

The system should be based on school grades rather than university colleges, departments, majors, and semesters.

### Core academic entities

| Entity | Description |
|---|---|
| Academic Year | School year, for example `2026-2027` |
| Term | Term, semester, trimester, or quarter depending on the school policy |
| Grade Level | KG1, KG2, Grade 1, Grade 2, ..., Grade 12 |
| Section | Class group inside a grade, for example Grade 5-A or Grade 5-B |
| Subject | English, Math, Science, Arabic, Islamic Studies, Social Studies, ICT, PE, Art |
| Teacher | Staff member assigned as class teacher, subject teacher, or both |
| Timetable Slot | Scheduled period for a subject, section, teacher, room, and day |
| Assessment | Quiz, assignment, project, midterm, final exam, practical, oral test |
| Marking Scheme | Weighting rules for subject marks and final grades |

### Example structure

| Grade level | Sections | Example subjects |
|---|---|---|
| KG1-KG2 | KG1-A, KG1-B, KG2-A | English, Arabic, Numeracy, Motor Skills, Art |
| Grades 1-5 | 1-A, 1-B, 2-A, etc. | English, Math, Science, Arabic, Islamic Studies, Social Studies, PE |
| Grades 6-8 | 6-A, 6-B, 7-A, etc. | English, Math, Science, Arabic, ICT, Social Studies, PE |
| Grades 9-12 | 9-A, 10-A, 11-Science, 12-Commerce | English, Math, Physics, Chemistry, Biology, Business, ICT |

## Student Management

### Main functions

- Create and update student profiles.
- Store student personal information.
- Store parent and guardian details.
- Assign student to academic year, grade level, and section.
- Track admission number, roll number, status, and previous school.
- Upload and manage documents.
- Track siblings in the same school.
- Manage student transfers, withdrawals, and graduation.
- Promote students from one grade to the next at year end.

### Student profile fields

| Category | Example fields |
|---|---|
| Identity | Student ID, admission number, full name, date of birth, gender, nationality |
| Academic | Academic year, grade level, section, roll number, house, status |
| Contact | Address, phone, email, emergency contact |
| Guardian | Father name, mother name, guardian name, relationship, phone, email, occupation |
| Health | Blood group, allergies, medical notes, doctor contact |
| Transport | Bus route, pickup point, drop-off point |
| Documents | Birth certificate, passport/ID, previous report card, transfer certificate, photos |

## Class and Section Management

### Main functions

- Create grade levels from KG to Grade 12.
- Create sections under each grade.
- Assign class teachers to sections.
- Assign students to sections.
- Define room or homeroom for each section.
- Set section capacity.
- Move students between sections.
- View section roster.

### Example section model

| Field | Example |
|---|---|
| Academic year | 2026-2027 |
| Grade level | Grade 4 |
| Section name | Grade 4-A |
| Class teacher | Ms. Sara |
| Room | B-204 |
| Capacity | 30 |
| Current students | 27 |

## Subject Management

### Main functions

- Create subjects for each grade level.
- Mark subjects as core, optional, language, activity, or non-graded.
- Assign subject teachers to grade sections.
- Define weekly periods per subject.
- Define subject-specific assessment structure.
- Support different subject groups for higher grades.

### Subject assignment example

| Grade | Section | Subject | Teacher | Weekly periods |
|---|---|---|---|---|
| Grade 6 | 6-A | Mathematics | Mr. Ahmed | 5 |
| Grade 6 | 6-A | Science | Ms. Lina | 4 |
| Grade 6 | 6-A | English | Ms. Fatima | 5 |
| Grade 6 | 6-A | PE | Mr. Omar | 2 |

## Teacher Management

### Main functions

- Maintain teacher profiles.
- Assign teachers to subjects and sections.
- Assign one teacher as class teacher for a section.
- Track teacher timetable and workload.
- Manage teacher attendance if needed.
- Allow teachers to enter marks and attendance only for assigned classes.
- Support substitute teacher assignment.

### Teacher profile fields

| Category | Example fields |
|---|---|
| Identity | Teacher ID, full name, gender, nationality |
| Employment | Joining date, designation, department, employment type |
| Teaching | Subjects, grade levels, assigned sections, class teacher section |
| Contact | Phone, email, address |
| Documents | Certificates, ID, contract, resume |

## Attendance Management

### Student attendance

- Daily attendance by section.
- Period-wise attendance for middle/high school if required.
- Status options: present, absent, late, excused, medical leave.
- Teacher can take attendance for assigned section or period.
- Admin can review, correct, and approve attendance.
- Parent can view attendance history.
- Automatic absence alerts to parents.

### Attendance reports

- Daily absence report.
- Class attendance summary.
- Student attendance percentage.
- Chronic absentee list.
- Late arrival report.
- Term-wise and yearly attendance report.

## Timetable Management

### Main functions

- Build weekly timetable by grade, section, teacher, subject, room, and period.
- Prevent teacher double-booking.
- Prevent room conflicts.
- Support breaks, assemblies, activities, and clubs.
- Publish timetables to teachers, students, and parents.
- Support temporary timetable changes.

### Timetable fields

| Field | Example |
|---|---|
| Day | Monday |
| Period | Period 2 |
| Time | 08:40-09:20 |
| Grade / Section | Grade 7-A |
| Subject | Science |
| Teacher | Ms. Lina |
| Room | Lab 1 |

## Assessment and Marks

### Main functions

- Create assessment categories per grade and subject.
- Enter marks by teacher.
- Support grading scales and comments.
- Calculate term marks and final marks.
- Generate report cards.
- Lock submitted marks after approval.
- Allow admin review and correction with audit history.

### Assessment examples

| Assessment type | Example weight |
|---|---:|
| Classwork | 10% |
| Homework | 10% |
| Quiz | 15% |
| Project | 15% |
| Midterm exam | 20% |
| Final exam | 30% |

For KG and early grades, the system should also support skill-based evaluation instead of only numeric marks.

### KG skill evaluation examples

- Language development
- Numeracy
- Social skills
- Motor skills
- Creativity
- Classroom behavior
- Participation

Ratings can be configured as:

- Excellent
- Very Good
- Good
- Developing
- Needs Support

## Report Cards and Promotion

### Main functions

- Generate term report cards.
- Generate final annual report cards.
- Show marks, grades, teacher comments, attendance, and principal remarks.
- Support class teacher comments.
- Support pass/fail or promoted/not promoted decision.
- Bulk promote students to the next grade.
- Handle repeated students and transferred students.
- Archive report cards by academic year.

### Promotion examples

| Current grade | Next grade |
|---|---|
| KG1 | KG2 |
| KG2 | Grade 1 |
| Grade 1 | Grade 2 |
| Grade 11 | Grade 12 |
| Grade 12 | Graduated |

## Admissions Management

### Main functions

- Public online application form.
- Applicant profile and guardian information.
- Applied grade level and preferred academic year.
- Document upload.
- Application review by admissions team.
- Entrance test or interview scheduling.
- Admission decision: pending, shortlisted, accepted, rejected, waitlisted.
- Offer letter generation.
- Convert accepted applicant into enrolled student.

### Admission workflow

1. Parent submits application.
2. Admissions team reviews documents.
3. School schedules entrance test or interview if required.
4. Admissions team records result and decision.
5. Parent receives offer or rejection.
6. Accepted applicant completes registration and fee payment.
7. System creates student profile and assigns grade/section.

## Parent Portal

### Main functions

- View all children under one parent account.
- View student profile and class information.
- View attendance and absence alerts.
- View timetable.
- View homework and assignments.
- View marks and report cards.
- View invoices, payments, and receipts.
- Submit requests to school.
- Receive announcements and messages.
- Update contact information with admin approval.

### Parent request examples

- Leave request
- Transport request
- Document request
- Fee installment request
- Meeting request
- Profile update request
- Transfer certificate request

## Student Portal

### Main functions

- View dashboard.
- View personal profile.
- View timetable.
- View subjects and teachers.
- View homework and assignments.
- View attendance.
- View marks and report cards.
- Access learning resources.
- View school notices.
- Submit simple requests if allowed by school policy.

For younger students, the portal can be optional. The parent portal may be the primary access point for KG and primary grades.

## Homework and Learning Resources

### Main functions

- Teachers create homework by subject and section.
- Attach files, links, or instructions.
- Set due dates.
- Students or parents can view homework.
- Optional online submission.
- Teacher can mark homework as checked or graded.
- Admin can monitor homework load by class.

### Learning resource types

- Lesson notes
- Worksheets
- Videos
- Reading material
- Practice questions
- Presentations
- Revision packs

## Finance and Fees

### Main functions

- Configure fee types.
- Configure grade-wise fee structures.
- Generate invoices by academic year or term.
- Track payments and receipts.
- Apply discounts, scholarships, or sibling concessions.
- Manage installment plans.
- Track outstanding balances.
- Parent can view invoices and payment history.

### Fee examples

| Fee type | Description |
|---|---|
| Admission fee | One-time registration/admission fee |
| Tuition fee | Main academic fee |
| Transport fee | Bus or transport service fee |
| Activity fee | Clubs, events, or activities |
| Exam fee | Assessment or board exam fee |
| Books and uniform | Optional school store charges |

## Communication

### Main functions

- School-wide announcements.
- Grade or section announcements.
- Teacher-to-parent messages.
- Parent-to-school requests.
- Attendance alerts.
- Fee reminders.
- Exam schedule notices.
- Event notices.

Communication should support read status and message history.

## Documents

### Student documents

- Birth certificate
- Passport or national ID
- Student photo
- Parent/guardian ID
- Previous school report card
- Transfer certificate
- Medical documents
- Vaccination record

### Generated documents

- Admission offer letter
- Enrollment confirmation
- Fee receipt
- Bonafide/student certificate
- Transfer certificate
- Report card
- Attendance certificate

## Reports and Dashboards

### Admin dashboard

- Total students
- Students by grade and section
- New admissions
- Attendance summary
- Fee collection summary
- Pending applications
- Pending requests
- Teacher workload

### Teacher dashboard

- Today timetable
- Assigned sections
- Pending attendance
- Pending homework checks
- Upcoming assessments
- Recent messages

### Parent dashboard

- Child attendance
- Homework due
- Fee balance
- Latest marks
- Notices
- Requests status

### Important reports

- Student list by grade/section
- Admission report
- Attendance report
- Marks report
- Report card export
- Fee outstanding report
- Payment collection report
- Teacher assignment report
- Student promotion report

## Suggested Core Database Tables

| Table | Purpose |
|---|---|
| `users` | Login users and roles |
| `school_settings` | School profile, contact details, branding, and default policies |
| `academic_years` | Academic year setup |
| `terms` | Terms/semesters/quarters |
| `grade_levels` | KG1 to Grade 12 |
| `sections` | Grade sections/classes |
| `students` | Student master profile |
| `guardians` | Parent/guardian records |
| `student_guardians` | Link students to guardians |
| `teachers` | Teacher master profile |
| `subjects` | Subject master list |
| `grade_subjects` | Subjects assigned to grade levels |
| `section_subject_teachers` | Teacher assignment by section and subject |
| `timetable_slots` | Weekly timetable |
| `attendance_records` | Student attendance |
| `assessments` | Tests, quizzes, assignments, exams |
| `marks` | Student marks by assessment |
| `report_cards` | Generated report card records |
| `applications` | Admission applications |
| `student_documents` | Uploaded student documents |
| `fee_structures` | Grade-wise fees |
| `invoices` | Student invoices |
| `payments` | Payment records |
| `requests` | Parent/student/admin service requests |
| `announcements` | School notices and announcements |
| `messages` | Communication records |

## Suggested Route Map

### Admin

- `/dashboard`
- `/admin/school-settings`
- `/admin/users`
- `/academic/years`
- `/academic/terms`
- `/academic/grades`
- `/academic/sections`
- `/academic/subjects`
- `/academic/timetable`
- `/students`
- `/students/create`
- `/students/upload`
- `/teachers`
- `/teachers/create`
- `/attendance`
- `/exams`
- `/marks`
- `/report-cards`
- `/promotion`
- `/requests`

### Admissions

- `/admissions/dashboard`
- `/admissions/applications`
- `/admissions/applications/create`
- `/admissions/applications/:id`
- `/admissions/tests`
- `/admissions/offers`

### Teacher

- `/teacher/dashboard`
- `/teacher/classes`
- `/teacher/classes/:sectionId`
- `/teacher/attendance`
- `/teacher/homework`
- `/teacher/marks`
- `/teacher/timetable`
- `/teacher/messages`

### Student

- `/student/dashboard`
- `/student/profile`
- `/student/timetable`
- `/student/subjects`
- `/student/homework`
- `/student/attendance`
- `/student/marks`
- `/student/report-cards`
- `/student/resources`

### Parent

- `/parent/dashboard`
- `/parent/children`
- `/parent/children/:studentId`
- `/parent/attendance`
- `/parent/homework`
- `/parent/report-cards`
- `/parent/fees`
- `/parent/requests`
- `/parent/messages`

### Finance

- `/finance/dashboard`
- `/finance/fee-structures`
- `/finance/invoices`
- `/finance/payments`
- `/finance/discounts`
- `/finance/reports`

## Permission Matrix

| Module | Admin | Admissions | Teacher | Student | Parent | Accountant |
|---|---|---|---|---|---|---|
| School settings | Full | No | No | No | No | No |
| Student profiles | Full | Create during admission | Assigned students only | Own profile | Own children only | Basic billing info |
| Guardians | Full | Create/update during admission | View limited | No | Own account | Billing contact only |
| Classes/sections | Full | View | Assigned sections only | Own section | Child section | View only |
| Subjects | Full | View | Assigned subjects only | Own subjects | Child subjects | No |
| Attendance | Full | No | Assigned classes | Own attendance | Own children | No |
| Marks/report cards | Full | No | Assigned subjects | Own marks | Own children | No |
| Admissions | Full | Full | Interview notes if assigned | No | Application only | Fee confirmation |
| Fees | Full | View admission fees | No | Own invoices | Own children | Full |
| Requests | Full | Admission requests | Assigned communication | Own requests | Own requests | Finance requests |
| Announcements | Full | Admissions notices | Class notices | View | View | Finance notices |

## Important Implementation Notes

- Use role-based access control at route level and API/database level.
- A layout or sidebar menu is not a security boundary.
- Keep school settings simple unless multi-school support is required later.
- Keep all student academic records tied to an academic year.
- Avoid deleting student records; use statuses such as active, inactive, transferred, withdrawn, or graduated.
- Keep audit history for marks, attendance corrections, fee changes, and profile changes.
- Parent accounts should be linked to students through a separate guardian relationship table.
- A student may have multiple guardians, and a guardian may have multiple children.
- Teachers should only access classes, subjects, and students assigned to them.
- Report cards should be generated from locked marks to avoid accidental changes after publication.
- KG and lower primary grades may need skill-based assessment instead of numeric grading.
- Fee structures should be grade-wise and academic-year-wise because fees can change every year.
- Timetable generation should check teacher, room, and section conflicts.
- Attendance should support both daily and period-wise modes, configurable by grade level.

## Recommended Build Phases

### Phase 1: Core SIS

- Authentication and roles
- Academic years and terms
- Grade levels and sections
- Student profiles
- Guardian profiles
- Teacher profiles
- Subject setup
- Student enrollment into grade/section

### Phase 2: Daily Operations

- Teacher assignments
- Timetable
- Attendance
- Homework
- Announcements
- Parent portal
- Student portal

### Phase 3: Exams and Reports

- Assessment setup
- Marks entry
- Grade calculation
- Report cards
- Promotion
- Academic reports

### Phase 4: Admissions and Finance

- Online applications
- Admission review
- Offer letters
- Fee structures
- Invoices
- Payments and receipts
- Outstanding fee reports

### Phase 5: Advanced Features

- Transport
- Library
- Behavior/discipline records
- Health records
- Clubs and activities
- SMS/WhatsApp/email notifications
- Mobile app support
- Advanced analytics

## Minimum Viable Version

If building the first release quickly, start with:

- Admin, teacher, parent, and student login
- Academic year, grades, sections, subjects
- Student and guardian records
- Teacher records and subject assignments
- Attendance
- Timetable
- Marks entry
- Report cards
- Fees and invoices
- Parent dashboard

Admissions, transport, library, advanced e-learning, and mobile app features can be added after the core school workflow is stable.
