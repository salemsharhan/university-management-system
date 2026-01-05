CREATE TABLE `academic_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`status` enum('active','planned','completed') NOT NULL DEFAULT 'planned',
	`is_current` boolean NOT NULL DEFAULT false,
	`description` text,
	`description_ar` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academic_years_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_years_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `admissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`application_number` varchar(50) NOT NULL,
	`academic_year_id` int NOT NULL,
	`first_name` varchar(255) NOT NULL,
	`last_name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`date_of_birth` date NOT NULL,
	`gender` enum('male','female') NOT NULL,
	`national_id` varchar(50),
	`address` text,
	`first_choice_major_id` int NOT NULL,
	`second_choice_major_id` int,
	`third_choice_major_id` int,
	`high_school_grade` decimal(5,2),
	`status` enum('pending','under_review','accepted','rejected','waitlisted') NOT NULL DEFAULT 'pending',
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_notes` text,
	`application_date` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admissions_application_number_unique` UNIQUE(`application_number`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollment_id` int NOT NULL,
	`class_id` int NOT NULL,
	`student_id` int NOT NULL,
	`date` date NOT NULL,
	`status` enum('present','absent','late','excused') NOT NULL,
	`notes` text,
	`recorded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `class_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`class_id` int NOT NULL,
	`day_of_week` enum('sunday','monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`location` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `class_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject_id` int NOT NULL,
	`semester_id` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`section` varchar(10) NOT NULL,
	`instructor_id` int,
	`capacity` int NOT NULL,
	`enrolled` int NOT NULL DEFAULT 0,
	`location` varchar(255),
	`type` enum('on_campus','online','hybrid') NOT NULL DEFAULT 'on_campus',
	`status` enum('active','inactive','full') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`faculty_id` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`head_id` int,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`description` text,
	`description_ar` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`class_id` int NOT NULL,
	`semester_id` int NOT NULL,
	`enrollment_date` timestamp NOT NULL DEFAULT (now()),
	`status` enum('enrolled','dropped','completed','failed','withdrawn') NOT NULL DEFAULT 'enrolled',
	`grade` varchar(5),
	`numeric_grade` decimal(5,2),
	`grade_points` decimal(3,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`examination_id` int NOT NULL,
	`enrollment_id` int NOT NULL,
	`student_id` int NOT NULL,
	`marks_obtained` decimal(5,2) NOT NULL,
	`grade` varchar(5),
	`remarks` text,
	`submitted_at` timestamp,
	`graded_by` int,
	`graded_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exam_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `examinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`class_id` int NOT NULL,
	`type` enum('midterm','final','quiz','assignment','project') NOT NULL,
	`title` varchar(255) NOT NULL,
	`date` date NOT NULL,
	`start_time` time,
	`end_time` time,
	`location` varchar(255),
	`total_marks` decimal(5,2) NOT NULL,
	`passing_marks` decimal(5,2) NOT NULL,
	`weightage` decimal(5,2) NOT NULL,
	`instructions` text,
	`status` enum('scheduled','ongoing','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `examinations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faculties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`type` enum('sciences','engineering','business','arts','medicine','other') NOT NULL DEFAULT 'other',
	`dean_id` int,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`description` text,
	`description_ar` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faculties_id` PRIMARY KEY(`id`),
	CONSTRAINT `faculties_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `financial_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`type` enum('tuition','lab_fee','registration','library','other') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`due_date` date,
	`paid_date` date,
	`payment_method` varchar(50),
	`transaction_reference` varchar(100),
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `instructors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`employee_id` varchar(50) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`department_id` int NOT NULL,
	`title` enum('professor','associate_professor','assistant_professor','lecturer','teaching_assistant') NOT NULL DEFAULT 'lecturer',
	`specialization` varchar(255),
	`office_location` varchar(255),
	`office_hours` text,
	`status` enum('active','inactive','on_leave') NOT NULL DEFAULT 'active',
	`hire_date` date,
	`photo` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `instructors_id` PRIMARY KEY(`id`),
	CONSTRAINT `instructors_employee_id_unique` UNIQUE(`employee_id`),
	CONSTRAINT `instructors_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `majors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`faculty_id` int NOT NULL,
	`department_id` int,
	`code` varchar(50) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`degree_level` enum('bachelor','master','phd','diploma') NOT NULL DEFAULT 'bachelor',
	`degree_title_en` varchar(255),
	`degree_title_ar` varchar(255),
	`total_credits` int NOT NULL,
	`core_credits` int NOT NULL,
	`elective_credits` int NOT NULL,
	`min_semesters` int NOT NULL,
	`max_semesters` int NOT NULL,
	`min_gpa` decimal(3,2) NOT NULL,
	`tuition_fee` decimal(10,2),
	`lab_fee` decimal(10,2),
	`registration_fee` decimal(10,2),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`description` text,
	`description_ar` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `majors_id` PRIMARY KEY(`id`),
	CONSTRAINT `majors_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `semesters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academic_year_id` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`registration_start_date` date,
	`registration_end_date` date,
	`status` enum('active','planned','completed','registration_open') NOT NULL DEFAULT 'planned',
	`is_current` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `semesters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`student_id` varchar(50) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`date_of_birth` date,
	`gender` enum('male','female'),
	`national_id` varchar(50),
	`major_id` int NOT NULL,
	`enrollment_date` date NOT NULL,
	`expected_graduation_date` date,
	`status` enum('active','graduated','suspended','withdrawn','on_probation') NOT NULL DEFAULT 'active',
	`gpa` decimal(3,2),
	`total_credits_earned` int NOT NULL DEFAULT 0,
	`address` text,
	`emergency_contact` varchar(255),
	`emergency_phone` varchar(50),
	`photo` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_student_id_unique` UNIQUE(`student_id`),
	CONSTRAINT `students_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `subject_corequisites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject_id` int NOT NULL,
	`corequisite_subject_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subject_corequisites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subject_prerequisites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject_id` int NOT NULL,
	`prerequisite_subject_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subject_prerequisites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`major_id` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`name_ar` varchar(255) NOT NULL,
	`type` enum('core','elective','general') NOT NULL DEFAULT 'core',
	`credit_hours` int NOT NULL,
	`theory_hours` int NOT NULL,
	`lab_hours` int NOT NULL,
	`tutorial_hours` int NOT NULL,
	`semester_number` int NOT NULL,
	`lab_fee` decimal(10,2),
	`material_fee` decimal(10,2),
	`instructor_name` varchar(255),
	`instructor_email` varchar(320),
	`textbook` text,
	`is_elective` boolean NOT NULL DEFAULT false,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`description` text,
	`description_ar` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','instructor','student') NOT NULL DEFAULT 'user';