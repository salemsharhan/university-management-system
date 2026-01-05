import { eq, desc, and, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  academicYears,
  semesters,
  faculties,
  departments,
  majors,
  subjects,
  classes,
  students,
  instructors,
  enrollments,
  attendance,
  examinations,
  examResults,
  admissions,
  financialTransactions,
  type AcademicYear,
  type Semester,
  type Faculty,
  type Department,
  type Major,
  type Subject,
  type Class,
  type Student,
  type Instructor,
  type Enrollment,
  type Admission,
  type FinancialTransaction,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User Management
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Dashboard Statistics
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const [
    activeStudentsCount,
    activeInstructorsCount,
    activeCoursesCount,
    totalFacultiesCount,
    totalEnrollmentsCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(students).where(eq(students.status, "active")),
    db.select({ count: count() }).from(instructors).where(eq(instructors.status, "active")),
    db.select({ count: count() }).from(classes).where(eq(classes.status, "active")),
    db.select({ count: count() }).from(faculties).where(eq(faculties.status, "active")),
    db.select({ count: count() }).from(enrollments).where(eq(enrollments.status, "enrolled")),
  ]);

  const avgGpaResult = await db.select({ avg: sql<number>`AVG(${students.gpa})` }).from(students);

  return {
    activeStudents: activeStudentsCount[0]?.count || 0,
    activeInstructors: activeInstructorsCount[0]?.count || 0,
    activeCourses: activeCoursesCount[0]?.count || 0,
    totalFaculties: totalFacultiesCount[0]?.count || 0,
    totalEnrollments: totalEnrollmentsCount[0]?.count || 0,
    averageGpa: avgGpaResult[0]?.avg || 0,
  };
}

// Academic Years
export async function getAllAcademicYears(): Promise<AcademicYear[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(academicYears).orderBy(desc(academicYears.startDate));
}

export async function getCurrentAcademicYear(): Promise<AcademicYear | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(academicYears).where(eq(academicYears.isCurrent, true)).limit(1);
  return result[0];
}

export async function createAcademicYear(data: typeof academicYears.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (data.isCurrent) {
    await db.update(academicYears).set({ isCurrent: false });
  }
  
  const result = await db.insert(academicYears).values(data);
  return result;
}

// Semesters
export async function getSemestersByAcademicYear(academicYearId: number): Promise<Semester[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(semesters).where(eq(semesters.academicYearId, academicYearId)).orderBy(semesters.startDate);
}

export async function getCurrentSemester(): Promise<Semester | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(semesters).where(eq(semesters.isCurrent, true)).limit(1);
  return result[0];
}

// Faculties
export async function getAllFaculties(): Promise<Faculty[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(faculties).orderBy(faculties.nameEn);
}

export async function getFacultyById(id: number): Promise<Faculty | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(faculties).where(eq(faculties.id, id)).limit(1);
  return result[0];
}

// Departments
export async function getDepartmentsByFaculty(facultyId: number): Promise<Department[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(departments).where(eq(departments.facultyId, facultyId)).orderBy(departments.nameEn);
}

// Majors
export async function getAllMajors(): Promise<Major[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(majors).orderBy(majors.nameEn);
}

export async function getMajorsByFaculty(facultyId: number): Promise<Major[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(majors).where(eq(majors.facultyId, facultyId)).orderBy(majors.nameEn);
}

// Subjects
export async function getSubjectsByMajor(majorId: number): Promise<Subject[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subjects).where(eq(subjects.majorId, majorId)).orderBy(subjects.semesterNumber, subjects.code);
}

// Classes
export async function getClassesBySemester(semesterId: number): Promise<Class[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(classes).where(eq(classes.semesterId, semesterId)).orderBy(classes.code);
}

// Students
export async function getAllStudents(): Promise<Student[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(students).orderBy(desc(students.enrollmentDate));
}

export async function getStudentById(id: number): Promise<Student | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return result[0];
}

export async function getStudentsByMajor(majorId: number): Promise<Student[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(students).where(eq(students.majorId, majorId)).orderBy(students.nameEn);
}

// Instructors
export async function getAllInstructors(): Promise<Instructor[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(instructors).orderBy(instructors.nameEn);
}

export async function getInstructorById(id: number): Promise<Instructor | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(instructors).where(eq(instructors.id, id)).limit(1);
  return result[0];
}

export async function getInstructorsByDepartment(departmentId: number): Promise<Instructor[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(instructors).where(eq(instructors.departmentId, departmentId)).orderBy(instructors.nameEn);
}

// Enrollments
export async function getEnrollmentsByStudent(studentId: number): Promise<Enrollment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(enrollments).where(eq(enrollments.studentId, studentId)).orderBy(desc(enrollments.enrollmentDate));
}

export async function getEnrollmentsByClass(classId: number): Promise<Enrollment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(enrollments).where(eq(enrollments.classId, classId));
}

// Admissions
export async function getAllAdmissions(): Promise<Admission[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(admissions).orderBy(desc(admissions.applicationDate));
}

export async function getAdmissionsByStatus(status: string): Promise<Admission[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(admissions).where(eq(admissions.status, status as any)).orderBy(desc(admissions.applicationDate));
}

// Financial Transactions
export async function getTransactionsByStudent(studentId: number): Promise<FinancialTransaction[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(financialTransactions).where(eq(financialTransactions.studentId, studentId)).orderBy(desc(financialTransactions.createdAt));
}

export async function getFinancialSummary() {
  const db = await getDb();
  if (!db) return null;

  const [totalRevenue, paidAmount, pendingAmount] = await Promise.all([
    db.select({ sum: sql<number>`SUM(${financialTransactions.amount})` }).from(financialTransactions),
    db.select({ sum: sql<number>`SUM(${financialTransactions.amount})` }).from(financialTransactions).where(eq(financialTransactions.status, "paid")),
    db.select({ sum: sql<number>`SUM(${financialTransactions.amount})` }).from(financialTransactions).where(eq(financialTransactions.status, "pending")),
  ]);

  return {
    totalRevenue: totalRevenue[0]?.sum || 0,
    paidAmount: paidAmount[0]?.sum || 0,
    pendingAmount: pendingAmount[0]?.sum || 0,
    collectionRate: totalRevenue[0]?.sum ? ((paidAmount[0]?.sum || 0) / totalRevenue[0].sum) * 100 : 0,
  };
}
