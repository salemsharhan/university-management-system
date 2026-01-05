import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, date, time } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "instructor", "student"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Academic Years
 */
export const academicYears = mysqlTable("academic_years", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: mysqlEnum("status", ["active", "planned", "completed"]).default("planned").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AcademicYear = typeof academicYears.$inferSelect;
export type InsertAcademicYear = typeof academicYears.$inferInsert;

/**
 * Semesters
 */
export const semesters = mysqlTable("semesters", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academic_year_id").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  registrationStartDate: date("registration_start_date"),
  registrationEndDate: date("registration_end_date"),
  status: mysqlEnum("status", ["active", "planned", "completed", "registration_open"]).default("planned").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Semester = typeof semesters.$inferSelect;
export type InsertSemester = typeof semesters.$inferInsert;

/**
 * Faculties/Colleges
 */
export const faculties = mysqlTable("faculties", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["sciences", "engineering", "business", "arts", "medicine", "other"]).default("other").notNull(),
  deanId: int("dean_id"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Faculty = typeof faculties.$inferSelect;
export type InsertFaculty = typeof faculties.$inferInsert;

/**
 * Departments
 */
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  facultyId: int("faculty_id").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  headId: int("head_id"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

/**
 * Majors/Programs
 */
export const majors = mysqlTable("majors", {
  id: int("id").autoincrement().primaryKey(),
  facultyId: int("faculty_id").notNull(),
  departmentId: int("department_id"),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  degreeLevel: mysqlEnum("degree_level", ["bachelor", "master", "phd", "diploma"]).default("bachelor").notNull(),
  degreeTitleEn: varchar("degree_title_en", { length: 255 }),
  degreeTitleAr: varchar("degree_title_ar", { length: 255 }),
  totalCredits: int("total_credits").notNull(),
  coreCredits: int("core_credits").notNull(),
  electiveCredits: int("elective_credits").notNull(),
  minSemesters: int("min_semesters").notNull(),
  maxSemesters: int("max_semesters").notNull(),
  minGpa: decimal("min_gpa", { precision: 3, scale: 2 }).notNull(),
  tuitionFee: decimal("tuition_fee", { precision: 10, scale: 2 }),
  labFee: decimal("lab_fee", { precision: 10, scale: 2 }),
  registrationFee: decimal("registration_fee", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Major = typeof majors.$inferSelect;
export type InsertMajor = typeof majors.$inferInsert;

/**
 * Subjects/Courses
 */
export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  majorId: int("major_id").notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["core", "elective", "general"]).default("core").notNull(),
  creditHours: int("credit_hours").notNull(),
  theoryHours: int("theory_hours").notNull(),
  labHours: int("lab_hours").notNull(),
  tutorialHours: int("tutorial_hours").notNull(),
  semesterNumber: int("semester_number").notNull(),
  labFee: decimal("lab_fee", { precision: 10, scale: 2 }),
  materialFee: decimal("material_fee", { precision: 10, scale: 2 }),
  instructorName: varchar("instructor_name", { length: 255 }),
  instructorEmail: varchar("instructor_email", { length: 320 }),
  textbook: text("textbook"),
  isElective: boolean("is_elective").default(false).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;

/**
 * Subject Prerequisites
 */
export const subjectPrerequisites = mysqlTable("subject_prerequisites", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subject_id").notNull(),
  prerequisiteSubjectId: int("prerequisite_subject_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Subject Corequisites
 */
export const subjectCorequisites = mysqlTable("subject_corequisites", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subject_id").notNull(),
  corequisiteSubjectId: int("corequisite_subject_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Classes/Sections
 */
export const classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subject_id").notNull(),
  semesterId: int("semester_id").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  section: varchar("section", { length: 10 }).notNull(),
  instructorId: int("instructor_id"),
  capacity: int("capacity").notNull(),
  enrolled: int("enrolled").default(0).notNull(),
  location: varchar("location", { length: 255 }),
  type: mysqlEnum("type", ["on_campus", "online", "hybrid"]).default("on_campus").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "full"]).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Class = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;

/**
 * Class Schedules
 */
export const classSchedules = mysqlTable("class_schedules", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("class_id").notNull(),
  dayOfWeek: mysqlEnum("day_of_week", ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Students
 */
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  studentId: varchar("student_id", { length: 50 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  dateOfBirth: date("date_of_birth"),
  gender: mysqlEnum("gender", ["male", "female"]),
  nationalId: varchar("national_id", { length: 50 }),
  majorId: int("major_id").notNull(),
  enrollmentDate: date("enrollment_date").notNull(),
  expectedGraduationDate: date("expected_graduation_date"),
  status: mysqlEnum("status", ["active", "graduated", "suspended", "withdrawn", "on_probation"]).default("active").notNull(),
  gpa: decimal("gpa", { precision: 3, scale: 2 }),
  totalCreditsEarned: int("total_credits_earned").default(0).notNull(),
  address: text("address"),
  emergencyContact: varchar("emergency_contact", { length: 255 }),
  emergencyPhone: varchar("emergency_phone", { length: 50 }),
  photo: varchar("photo", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

/**
 * Instructors
 */
export const instructors = mysqlTable("instructors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  nameAr: varchar("name_ar", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  departmentId: int("department_id").notNull(),
  title: mysqlEnum("title", ["professor", "associate_professor", "assistant_professor", "lecturer", "teaching_assistant"]).default("lecturer").notNull(),
  specialization: varchar("specialization", { length: 255 }),
  officeLocation: varchar("office_location", { length: 255 }),
  officeHours: text("office_hours"),
  status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default("active").notNull(),
  hireDate: date("hire_date"),
  photo: varchar("photo", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Instructor = typeof instructors.$inferSelect;
export type InsertInstructor = typeof instructors.$inferInsert;

/**
 * Enrollments
 */
export const enrollments = mysqlTable("enrollments", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull(),
  classId: int("class_id").notNull(),
  semesterId: int("semester_id").notNull(),
  enrollmentDate: timestamp("enrollment_date").defaultNow().notNull(),
  status: mysqlEnum("status", ["enrolled", "dropped", "completed", "failed", "withdrawn"]).default("enrolled").notNull(),
  grade: varchar("grade", { length: 5 }),
  numericGrade: decimal("numeric_grade", { precision: 5, scale: 2 }),
  gradePoints: decimal("grade_points", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = typeof enrollments.$inferInsert;

/**
 * Attendance
 */
export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  enrollmentId: int("enrollment_id").notNull(),
  classId: int("class_id").notNull(),
  studentId: int("student_id").notNull(),
  date: date("date").notNull(),
  status: mysqlEnum("status", ["present", "absent", "late", "excused"]).notNull(),
  notes: text("notes"),
  recordedBy: int("recorded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

/**
 * Examinations
 */
export const examinations = mysqlTable("examinations", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("class_id").notNull(),
  type: mysqlEnum("type", ["midterm", "final", "quiz", "assignment", "project"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  date: date("date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  location: varchar("location", { length: 255 }),
  totalMarks: decimal("total_marks", { precision: 5, scale: 2 }).notNull(),
  passingMarks: decimal("passing_marks", { precision: 5, scale: 2 }).notNull(),
  weightage: decimal("weightage", { precision: 5, scale: 2 }).notNull(),
  instructions: text("instructions"),
  status: mysqlEnum("status", ["scheduled", "ongoing", "completed", "cancelled"]).default("scheduled").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Examination = typeof examinations.$inferSelect;
export type InsertExamination = typeof examinations.$inferInsert;

/**
 * Exam Results
 */
export const examResults = mysqlTable("exam_results", {
  id: int("id").autoincrement().primaryKey(),
  examinationId: int("examination_id").notNull(),
  enrollmentId: int("enrollment_id").notNull(),
  studentId: int("student_id").notNull(),
  marksObtained: decimal("marks_obtained", { precision: 5, scale: 2 }).notNull(),
  grade: varchar("grade", { length: 5 }),
  remarks: text("remarks"),
  submittedAt: timestamp("submitted_at"),
  gradedBy: int("graded_by"),
  gradedAt: timestamp("graded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ExamResult = typeof examResults.$inferSelect;
export type InsertExamResult = typeof examResults.$inferInsert;

/**
 * Admissions
 */
export const admissions = mysqlTable("admissions", {
  id: int("id").autoincrement().primaryKey(),
  applicationNumber: varchar("application_number", { length: 50 }).notNull().unique(),
  academicYearId: int("academic_year_id").notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: mysqlEnum("gender", ["male", "female"]).notNull(),
  nationalId: varchar("national_id", { length: 50 }),
  address: text("address"),
  firstChoiceMajorId: int("first_choice_major_id").notNull(),
  secondChoiceMajorId: int("second_choice_major_id"),
  thirdChoiceMajorId: int("third_choice_major_id"),
  highSchoolGrade: decimal("high_school_grade", { precision: 5, scale: 2 }),
  status: mysqlEnum("status", ["pending", "under_review", "accepted", "rejected", "waitlisted"]).default("pending").notNull(),
  reviewedBy: int("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  applicationDate: timestamp("application_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Admission = typeof admissions.$inferSelect;
export type InsertAdmission = typeof admissions.$inferInsert;

/**
 * Financial Transactions
 */
export const financialTransactions = mysqlTable("financial_transactions", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull(),
  type: mysqlEnum("type", ["tuition", "lab_fee", "registration", "library", "other"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "overdue", "cancelled"]).default("pending").notNull(),
  dueDate: date("due_date"),
  paidDate: date("paid_date"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionReference: varchar("transaction_reference", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = typeof financialTransactions.$inferInsert;
