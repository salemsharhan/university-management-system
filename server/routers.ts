import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { 
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
  admissions,
  financialTransactions,
} from "../drizzle/schema";
import { getDb } from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return await db.getDashboardStats();
    }),
    financialSummary: protectedProcedure.query(async () => {
      return await db.getFinancialSummary();
    }),
  }),

  academicYears: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllAcademicYears();
    }),
    current: protectedProcedure.query(async () => {
      return await db.getCurrentAcademicYear();
    }),
    create: protectedProcedure
      .input(z.object({
        code: z.string(),
        nameEn: z.string(),
        nameAr: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        status: z.enum(["active", "planned", "completed"]),
        isCurrent: z.boolean().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        
        if (input.isCurrent) {
          await dbInstance.update(academicYears).set({ isCurrent: false });
        }
        
        return await dbInstance.insert(academicYears).values({
          ...input,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),
  }),

  semesters: router({
    list: protectedProcedure
      .input(z.object({ academicYearId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSemestersByAcademicYear(input.academicYearId);
      }),
    current: protectedProcedure.query(async () => {
      return await db.getCurrentSemester();
    }),
    create: protectedProcedure
      .input(z.object({
        academicYearId: z.number(),
        code: z.string(),
        nameEn: z.string(),
        nameAr: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        registrationStartDate: z.string().optional(),
        registrationEndDate: z.string().optional(),
        status: z.enum(["active", "planned", "completed", "registration_open"]),
        isCurrent: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        
        if (input.isCurrent) {
          await dbInstance.update(semesters).set({ isCurrent: false });
        }
        
        return await dbInstance.insert(semesters).values({
          ...input,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          registrationStartDate: input.registrationStartDate ? new Date(input.registrationStartDate) : null,
          registrationEndDate: input.registrationEndDate ? new Date(input.registrationEndDate) : null,
        });
      }),
  }),

  faculties: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllFaculties();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getFacultyById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        code: z.string(),
        nameEn: z.string(),
        nameAr: z.string(),
        type: z.enum(["sciences", "engineering", "business", "arts", "medicine", "other"]),
        deanId: z.number().optional(),
        status: z.enum(["active", "inactive"]),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(faculties).values(input);
      }),
  }),

  departments: router({
    list: protectedProcedure
      .input(z.object({ facultyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDepartmentsByFaculty(input.facultyId);
      }),
    create: protectedProcedure
      .input(z.object({
        facultyId: z.number(),
        code: z.string(),
        nameEn: z.string(),
        nameAr: z.string(),
        headId: z.number().optional(),
        status: z.enum(["active", "inactive"]),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(departments).values(input);
      }),
  }),

  majors: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllMajors();
    }),
    byFaculty: protectedProcedure
      .input(z.object({ facultyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMajorsByFaculty(input.facultyId);
      }),
    create: protectedProcedure
      .input(z.object({
        facultyId: z.number(),
        departmentId: z.number().optional(),
        code: z.string(),
        nameEn: z.string(),
        nameAr: z.string(),
        degreeLevel: z.enum(["bachelor", "master", "phd", "diploma"]),
        degreeTitleEn: z.string().optional(),
        degreeTitleAr: z.string().optional(),
        totalCredits: z.number(),
        coreCredits: z.number(),
        electiveCredits: z.number(),
        minSemesters: z.number(),
        maxSemesters: z.number(),
        minGpa: z.string(),
        tuitionFee: z.string().optional(),
        labFee: z.string().optional(),
        registrationFee: z.string().optional(),
        status: z.enum(["active", "inactive"]),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(majors).values(input);
      }),
  }),

  subjects: router({
    list: protectedProcedure
      .input(z.object({ majorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSubjectsByMajor(input.majorId);
      }),
    create: protectedProcedure
      .input(z.object({
        majorId: z.number(),
        code: z.string(),
        nameEn: z.string(),
        nameAr: z.string(),
        type: z.enum(["core", "elective", "general"]),
        creditHours: z.number(),
        theoryHours: z.number(),
        labHours: z.number(),
        tutorialHours: z.number(),
        semesterNumber: z.number(),
        labFee: z.string().optional(),
        materialFee: z.string().optional(),
        instructorName: z.string().optional(),
        instructorEmail: z.string().optional(),
        textbook: z.string().optional(),
        isElective: z.boolean(),
        status: z.enum(["active", "inactive"]),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(subjects).values(input);
      }),
  }),

  classes: router({
    list: protectedProcedure
      .input(z.object({ semesterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getClassesBySemester(input.semesterId);
      }),
    create: protectedProcedure
      .input(z.object({
        subjectId: z.number(),
        semesterId: z.number(),
        code: z.string(),
        section: z.string(),
        instructorId: z.number().optional(),
        capacity: z.number(),
        enrolled: z.number().optional(),
        location: z.string().optional(),
        type: z.enum(["on_campus", "online", "hybrid"]),
        status: z.enum(["active", "inactive", "full"]),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(classes).values(input);
      }),
  }),

  students: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllStudents();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudentById(input.id);
      }),
    byMajor: protectedProcedure
      .input(z.object({ majorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getStudentsByMajor(input.majorId);
      }),
    create: protectedProcedure
      .input(z.object({
        studentId: z.string(),
        nameEn: z.string(),
        nameAr: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["male", "female"]).optional(),
        nationalId: z.string().optional(),
        majorId: z.number(),
        enrollmentDate: z.string(),
        expectedGraduationDate: z.string().optional(),
        status: z.enum(["active", "graduated", "suspended", "withdrawn", "on_probation"]),
        address: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
        photo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(students).values({
          ...input,
          enrollmentDate: new Date(input.enrollmentDate),
          expectedGraduationDate: input.expectedGraduationDate ? new Date(input.expectedGraduationDate) : null,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        });
      }),
  }),

  instructors: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllInstructors();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getInstructorById(input.id);
      }),
    byDepartment: protectedProcedure
      .input(z.object({ departmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInstructorsByDepartment(input.departmentId);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.string(),
        nameEn: z.string(),
        nameAr: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        departmentId: z.number(),
        title: z.enum(["professor", "associate_professor", "assistant_professor", "lecturer", "teaching_assistant"]),
        specialization: z.string().optional(),
        officeLocation: z.string().optional(),
        officeHours: z.string().optional(),
        status: z.enum(["active", "inactive", "on_leave"]),
        hireDate: z.string().optional(),
        photo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(instructors).values({
          ...input,
          hireDate: input.hireDate ? new Date(input.hireDate) : null,
        });
      }),
  }),

  enrollments: router({
    byStudent: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEnrollmentsByStudent(input.studentId);
      }),
    byClass: protectedProcedure
      .input(z.object({ classId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEnrollmentsByClass(input.classId);
      }),
    create: protectedProcedure
      .input(z.object({
        studentId: z.number(),
        classId: z.number(),
        semesterId: z.number(),
        status: z.enum(["enrolled", "dropped", "completed", "failed", "withdrawn"]),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(enrollments).values(input);
      }),
  }),

  admissions: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllAdmissions();
    }),
    byStatus: protectedProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ input }) => {
        return await db.getAdmissionsByStatus(input.status);
      }),
    create: protectedProcedure
      .input(z.object({
        applicationNumber: z.string(),
        academicYearId: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
        dateOfBirth: z.string(),
        gender: z.enum(["male", "female"]),
        nationalId: z.string().optional(),
        address: z.string().optional(),
        firstChoiceMajorId: z.number(),
        secondChoiceMajorId: z.number().optional(),
        thirdChoiceMajorId: z.number().optional(),
        highSchoolGrade: z.string().optional(),
        status: z.enum(["pending", "under_review", "accepted", "rejected", "waitlisted"]),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(admissions).values({
          ...input,
          dateOfBirth: new Date(input.dateOfBirth),
        });
      }),
  }),

  finance: router({
    summary: protectedProcedure.query(async () => {
      return await db.getFinancialSummary();
    }),
    byStudent: protectedProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTransactionsByStudent(input.studentId);
      }),
    create: protectedProcedure
      .input(z.object({
        studentId: z.number(),
        type: z.enum(["tuition", "lab_fee", "registration", "library", "other"]),
        amount: z.string(),
        status: z.enum(["pending", "paid", "overdue", "cancelled"]),
        dueDate: z.string().optional(),
        paidDate: z.string().optional(),
        paymentMethod: z.string().optional(),
        transactionReference: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await getDb();
        if (!dbInstance) throw new Error("Database not available");
        return await dbInstance.insert(financialTransactions).values({
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          paidDate: input.paidDate ? new Date(input.paidDate) : null,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
