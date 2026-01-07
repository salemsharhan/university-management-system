-- Finance Affairs Module - Complete Schema
-- This migration creates all tables and structures needed for the Finance Affairs module

-- Create ENUM types for finance module
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE "invoice_status" AS ENUM('draft', 'pending', 'paid', 'overdue', 'cancelled', 'partially_paid');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type') THEN
        CREATE TYPE "invoice_type" AS ENUM('admission_fee', 'course_fee', 'subject_fee', 'onboarding_fee', 'penalty', 'miscellaneous', 'wallet_credit', 'other');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE "payment_method" AS ENUM('cash', 'bank_transfer', 'online_payment', 'wallet', 'check', 'other');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE "payment_status" AS ENUM('pending', 'verified', 'rejected', 'refunded');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_transaction_type') THEN
        CREATE TYPE "wallet_transaction_type" AS ENUM('credit', 'debit', 'refund');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scholarship_type') THEN
        CREATE TYPE "scholarship_type" AS ENUM('merit_based', 'need_based', 'institutional', 'external');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scholarship_coverage_type') THEN
        CREATE TYPE "scholarship_coverage_type" AS ENUM('percentage', 'fixed_amount');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'installment_status') THEN
        CREATE TYPE "installment_status" AS ENUM('pending', 'paid', 'overdue', 'cancelled');
    END IF;
END $$;

-- 1. Finance Configuration Table
-- Stores base fees and fee structures
CREATE TABLE IF NOT EXISTS "finance_configuration" (
    "id" serial PRIMARY KEY NOT NULL,
    "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
    "is_university_wide" boolean DEFAULT false NOT NULL,
    "fee_type" varchar(100) NOT NULL, -- admission_fee, course_fee, subject_fee, etc.
    "fee_name_en" varchar(255) NOT NULL,
    "fee_name_ar" varchar(255),
    "amount" numeric(10, 2) NOT NULL,
    "currency" varchar(3) DEFAULT 'USD' NOT NULL,
    "applies_to_degree_level" "degree_level"[],
    "applies_to_faculty" integer[], -- Array of faculty IDs (if needed)
    "applies_to_major" integer[], -- Array of major IDs
    "applies_to_semester" integer[], -- Array of semester IDs
    "is_active" boolean DEFAULT true NOT NULL,
    "valid_from" date,
    "valid_to" date,
    "description" text,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_finance_config_college_id" ON "finance_configuration"("college_id");
CREATE INDEX IF NOT EXISTS "idx_finance_config_fee_type" ON "finance_configuration"("fee_type");
CREATE INDEX IF NOT EXISTS "idx_finance_config_is_active" ON "finance_configuration"("is_active");

-- 2. Wallets Table
-- Student wallet balances
CREATE TABLE IF NOT EXISTS "wallets" (
    "id" serial PRIMARY KEY NOT NULL,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "college_id" integer NOT NULL REFERENCES "colleges"("id") ON DELETE CASCADE,
    "balance" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "currency" varchar(3) DEFAULT 'USD' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "wallets_student_id_unique" UNIQUE("student_id")
);

CREATE INDEX IF NOT EXISTS "idx_wallets_student_id" ON "wallets"("student_id");
CREATE INDEX IF NOT EXISTS "idx_wallets_college_id" ON "wallets"("college_id");

-- 3. Wallet Transactions Table
-- All wallet credit/debit transactions
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
    "id" serial PRIMARY KEY NOT NULL,
    "wallet_id" integer NOT NULL REFERENCES "wallets"("id") ON DELETE CASCADE,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "transaction_type" "wallet_transaction_type" NOT NULL,
    "amount" numeric(10, 2) NOT NULL,
    "balance_before" numeric(10, 2) NOT NULL,
    "balance_after" numeric(10, 2) NOT NULL,
    "description" text,
    "reference_invoice_id" integer, -- Links to invoice if transaction created invoice
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_wallet_id" ON "wallet_transactions"("wallet_id");
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_student_id" ON "wallet_transactions"("student_id");
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_reference_invoice" ON "wallet_transactions"("reference_invoice_id");

-- 4. Invoices Table
-- Main invoice records
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" serial PRIMARY KEY NOT NULL,
    "invoice_number" varchar(100) NOT NULL,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "college_id" integer NOT NULL REFERENCES "colleges"("id") ON DELETE CASCADE,
    "semester_id" integer REFERENCES "semesters"("id") ON DELETE SET NULL,
    "invoice_date" date NOT NULL,
    "due_date" date,
    "invoice_type" "invoice_type" NOT NULL,
    "status" "invoice_status" DEFAULT 'pending' NOT NULL,
    "subtotal" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "discount_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "scholarship_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "tax_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "total_amount" numeric(10, 2) NOT NULL,
    "paid_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "pending_amount" numeric(10, 2) NOT NULL,
    "currency" varchar(3) DEFAULT 'USD' NOT NULL,
    "payment_method" "payment_method",
    "notes" text,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);

CREATE INDEX IF NOT EXISTS "idx_invoices_student_id" ON "invoices"("student_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_college_id" ON "invoices"("college_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_semester_id" ON "invoices"("semester_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "idx_invoices_invoice_date" ON "invoices"("invoice_date");
CREATE INDEX IF NOT EXISTS "idx_invoices_invoice_number" ON "invoices"("invoice_number");

-- 5. Invoice Items Table
-- Line items for each invoice
CREATE TABLE IF NOT EXISTS "invoice_items" (
    "id" serial PRIMARY KEY NOT NULL,
    "invoice_id" integer NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "item_type" varchar(100) NOT NULL, -- admission_fee, subject_fee, course_fee, etc.
    "item_name_en" varchar(255) NOT NULL,
    "item_name_ar" varchar(255),
    "description" text,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10, 2) NOT NULL,
    "discount_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "scholarship_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "total_amount" numeric(10, 2) NOT NULL,
    "reference_id" integer, -- Can reference subject_id, class_id, etc.
    "reference_type" varchar(50), -- subject, class, etc.
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_invoice_items_invoice_id" ON "invoice_items"("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_invoice_items_reference" ON "invoice_items"("reference_id", "reference_type");

-- 6. Payments Table
-- Payment records
CREATE TABLE IF NOT EXISTS "payments" (
    "id" serial PRIMARY KEY NOT NULL,
    "payment_number" varchar(100) NOT NULL,
    "invoice_id" integer NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "college_id" integer NOT NULL REFERENCES "colleges"("id") ON DELETE CASCADE,
    "payment_date" date NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "amount" numeric(10, 2) NOT NULL,
    "currency" varchar(3) DEFAULT 'USD' NOT NULL,
    "status" "payment_status" DEFAULT 'pending' NOT NULL,
    "transaction_reference" varchar(255), -- Bank reference, transaction ID, etc.
    "verified_by" integer REFERENCES "users"("id"),
    "verified_at" timestamp with time zone,
    "rejection_reason" text,
    "notes" text,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "payments_payment_number_unique" UNIQUE("payment_number")
);

CREATE INDEX IF NOT EXISTS "idx_payments_invoice_id" ON "payments"("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_payments_student_id" ON "payments"("student_id");
CREATE INDEX IF NOT EXISTS "idx_payments_college_id" ON "payments"("college_id");
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "idx_payments_payment_date" ON "payments"("payment_date");

-- 7. Payment Receipts Table
-- Uploaded payment receipt files
CREATE TABLE IF NOT EXISTS "payment_receipts" (
    "id" serial PRIMARY KEY NOT NULL,
    "payment_id" integer NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
    "file_url" varchar(500) NOT NULL,
    "file_name" varchar(255) NOT NULL,
    "file_size" integer,
    "file_type" varchar(50),
    "uploaded_by" integer REFERENCES "users"("id"),
    "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_payment_receipts_payment_id" ON "payment_receipts"("payment_id");

-- 8. Scholarships Table
-- Scholarship definitions
CREATE TABLE IF NOT EXISTS "scholarships" (
    "id" serial PRIMARY KEY NOT NULL,
    "scholarship_code" varchar(50) NOT NULL,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255),
    "scholarship_type" "scholarship_type" NOT NULL,
    "coverage_type" "scholarship_coverage_type" NOT NULL,
    "coverage_value" numeric(10, 2) NOT NULL, -- Percentage or fixed amount
    "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
    "is_university_wide" boolean DEFAULT false NOT NULL,
    "eligible_degree_levels" "degree_level"[],
    "eligible_major_ids" integer[],
    "eligible_faculty_ids" integer[],
    "valid_from" date,
    "valid_to" date,
    "max_students" integer, -- Maximum number of students who can receive this scholarship
    "current_recipients" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "description" text,
    "eligibility_criteria" jsonb, -- JSON for complex criteria (GPA, financial need, etc.)
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "scholarships_scholarship_code_unique" UNIQUE("scholarship_code")
);

CREATE INDEX IF NOT EXISTS "idx_scholarships_college_id" ON "scholarships"("college_id");
CREATE INDEX IF NOT EXISTS "idx_scholarships_is_active" ON "scholarships"("is_active");
CREATE INDEX IF NOT EXISTS "idx_scholarships_scholarship_code" ON "scholarships"("scholarship_code");

-- 9. Student Scholarships Table
-- Student scholarship assignments
CREATE TABLE IF NOT EXISTS "student_scholarships" (
    "id" serial PRIMARY KEY NOT NULL,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "scholarship_id" integer NOT NULL REFERENCES "scholarships"("id") ON DELETE CASCADE,
    "college_id" integer NOT NULL REFERENCES "colleges"("id") ON DELETE CASCADE,
    "assigned_date" date NOT NULL,
    "start_date" date NOT NULL,
    "end_date" date,
    "is_active" boolean DEFAULT true NOT NULL,
    "coverage_type" "scholarship_coverage_type" NOT NULL,
    "coverage_value" numeric(10, 2) NOT NULL, -- Can override scholarship default
    "notes" text,
    "assigned_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_student_scholarships_student_id" ON "student_scholarships"("student_id");
CREATE INDEX IF NOT EXISTS "idx_student_scholarships_scholarship_id" ON "student_scholarships"("scholarship_id");
CREATE INDEX IF NOT EXISTS "idx_student_scholarships_college_id" ON "student_scholarships"("college_id");
CREATE INDEX IF NOT EXISTS "idx_student_scholarships_is_active" ON "student_scholarships"("is_active");

-- 10. Installment Plans Table
-- Installment plan configurations
CREATE TABLE IF NOT EXISTS "installment_plans" (
    "id" serial PRIMARY KEY NOT NULL,
    "plan_code" varchar(50) NOT NULL,
    "name_en" varchar(255) NOT NULL,
    "name_ar" varchar(255),
    "college_id" integer REFERENCES "colleges"("id") ON DELETE CASCADE,
    "is_university_wide" boolean DEFAULT false NOT NULL,
    "degree_level" "degree_level",
    "major_id" integer REFERENCES "majors"("id") ON DELETE SET NULL,
    "semester_id" integer REFERENCES "semesters"("id") ON DELETE SET NULL,
    "number_of_installments" integer NOT NULL,
    "total_amount" numeric(10, 2) NOT NULL,
    "late_payment_penalty_percentage" numeric(5, 2) DEFAULT 0.00,
    "late_payment_penalty_fixed" numeric(10, 2) DEFAULT 0.00,
    "grace_period_days" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "valid_from" date,
    "valid_to" date,
    "description" text,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "installment_plans_plan_code_unique" UNIQUE("plan_code")
);

CREATE INDEX IF NOT EXISTS "idx_installment_plans_college_id" ON "installment_plans"("college_id");
CREATE INDEX IF NOT EXISTS "idx_installment_plans_is_active" ON "installment_plans"("is_active");

-- 11. Installment Plan Details Table
-- Individual installment schedule for each plan
CREATE TABLE IF NOT EXISTS "installment_plan_details" (
    "id" serial PRIMARY KEY NOT NULL,
    "installment_plan_id" integer NOT NULL REFERENCES "installment_plans"("id") ON DELETE CASCADE,
    "installment_number" integer NOT NULL,
    "due_date" date NOT NULL,
    "amount" numeric(10, 2) NOT NULL,
    "percentage_of_total" numeric(5, 2), -- Percentage of total amount
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "installment_plan_details_plan_installment_unique" UNIQUE("installment_plan_id", "installment_number")
);

CREATE INDEX IF NOT EXISTS "idx_installment_plan_details_plan_id" ON "installment_plan_details"("installment_plan_id");

-- 12. Student Installments Table
-- Student-specific installment assignments
CREATE TABLE IF NOT EXISTS "student_installments" (
    "id" serial PRIMARY KEY NOT NULL,
    "student_id" integer NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "installment_plan_id" integer NOT NULL REFERENCES "installment_plans"("id") ON DELETE CASCADE,
    "invoice_id" integer REFERENCES "invoices"("id") ON DELETE SET NULL, -- Parent invoice
    "college_id" integer NOT NULL REFERENCES "colleges"("id") ON DELETE CASCADE,
    "semester_id" integer REFERENCES "semesters"("id") ON DELETE SET NULL,
    "total_amount" numeric(10, 2) NOT NULL,
    "start_date" date NOT NULL,
    "end_date" date,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_student_installments_student_id" ON "student_installments"("student_id");
CREATE INDEX IF NOT EXISTS "idx_student_installments_plan_id" ON "student_installments"("installment_plan_id");
CREATE INDEX IF NOT EXISTS "idx_student_installments_college_id" ON "student_installments"("college_id");

-- 13. Installment Invoices Table
-- Individual installment invoices
CREATE TABLE IF NOT EXISTS "installment_invoices" (
    "id" serial PRIMARY KEY NOT NULL,
    "student_installment_id" integer NOT NULL REFERENCES "student_installments"("id") ON DELETE CASCADE,
    "installment_plan_detail_id" integer NOT NULL REFERENCES "installment_plan_details"("id") ON DELETE CASCADE,
    "invoice_id" integer NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
    "installment_number" integer NOT NULL,
    "due_date" date NOT NULL,
    "amount" numeric(10, 2) NOT NULL,
    "paid_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "status" "installment_status" DEFAULT 'pending' NOT NULL,
    "overdue_days" integer DEFAULT 0,
    "penalty_amount" numeric(10, 2) DEFAULT 0.00 NOT NULL,
    "paid_date" date,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_installment_invoices_student_installment" ON "installment_invoices"("student_installment_id");
CREATE INDEX IF NOT EXISTS "idx_installment_invoices_invoice_id" ON "installment_invoices"("invoice_id");
CREATE INDEX IF NOT EXISTS "idx_installment_invoices_status" ON "installment_invoices"("status");
CREATE INDEX IF NOT EXISTS "idx_installment_invoices_due_date" ON "installment_invoices"("due_date");

-- 14. Donations Table
-- Donation records
CREATE TABLE IF NOT EXISTS "donations" (
    "id" serial PRIMARY KEY NOT NULL,
    "donation_number" varchar(100) NOT NULL,
    "institute_name_en" varchar(255) NOT NULL,
    "institute_name_ar" varchar(255),
    "donation_amount" numeric(10, 2) NOT NULL,
    "currency" varchar(3) DEFAULT 'USD' NOT NULL,
    "reference_id" varchar(255),
    "donation_date" date NOT NULL,
    "college_id" integer REFERENCES "colleges"("id") ON DELETE SET NULL,
    "description" text,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_by" integer REFERENCES "users"("id"),
    CONSTRAINT "donations_donation_number_unique" UNIQUE("donation_number")
);

CREATE INDEX IF NOT EXISTS "idx_donations_college_id" ON "donations"("college_id");
CREATE INDEX IF NOT EXISTS "idx_donations_donation_date" ON "donations"("donation_date");
CREATE INDEX IF NOT EXISTS "idx_donations_donation_number" ON "donations"("donation_number");

-- Functions and Triggers

-- Function to update invoice pending_amount
CREATE OR REPLACE FUNCTION update_invoice_pending_amount()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET 
        paid_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE invoice_id = NEW.invoice_id
            AND status = 'verified'
        ),
        pending_amount = total_amount - (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE invoice_id = NEW.invoice_id
            AND status = 'verified'
        ) - discount_amount - scholarship_amount,
        status = CASE
            WHEN total_amount - (
                SELECT COALESCE(SUM(amount), 0)
                FROM payments
                WHERE invoice_id = NEW.invoice_id
                AND status = 'verified'
            ) - discount_amount - scholarship_amount <= 0 THEN 'paid'
            WHEN total_amount - (
                SELECT COALESCE(SUM(amount), 0)
                FROM payments
                WHERE invoice_id = NEW.invoice_id
                AND status = 'verified'
            ) - discount_amount - scholarship_amount < total_amount THEN 'partially_paid'
            WHEN due_date < CURRENT_DATE AND status != 'paid' THEN 'overdue'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_on_payment
AFTER INSERT OR UPDATE OF amount, status ON payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_pending_amount();

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE wallets
    SET 
        balance = CASE
            WHEN NEW.transaction_type = 'credit' THEN balance + NEW.amount
            WHEN NEW.transaction_type = 'debit' THEN balance - NEW.amount
            WHEN NEW.transaction_type = 'refund' THEN balance + NEW.amount
            ELSE balance
        END,
        updated_at = NOW()
    WHERE id = NEW.wallet_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_balance
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(college_id_param integer)
RETURNS varchar(100) AS $$
DECLARE
    prefix varchar(10) := 'INV';
    year_str varchar(4) := TO_CHAR(CURRENT_DATE, 'YYYY');
    sequence_num integer;
    invoice_num varchar(100);
BEGIN
    -- Get next sequence number for this college and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS integer)), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE college_id = college_id_param
    AND invoice_number LIKE prefix || year_str || '%';
    
    invoice_num := prefix || year_str || LPAD(sequence_num::text, 6, '0');
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function to generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number(college_id_param integer)
RETURNS varchar(100) AS $$
DECLARE
    prefix varchar(10) := 'PAY';
    year_str varchar(4) := TO_CHAR(CURRENT_DATE, 'YYYY');
    sequence_num integer;
    payment_num varchar(100);
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM '[0-9]+$') AS integer)), 0) + 1
    INTO sequence_num
    FROM payments
    WHERE college_id = college_id_param
    AND payment_number LIKE prefix || year_str || '%';
    
    payment_num := prefix || year_str || LPAD(sequence_num::text, 6, '0');
    
    RETURN payment_num;
END;
$$ LANGUAGE plpgsql;

-- Function to generate donation number
CREATE OR REPLACE FUNCTION generate_donation_number()
RETURNS varchar(100) AS $$
DECLARE
    prefix varchar(10) := 'DON';
    year_str varchar(4) := TO_CHAR(CURRENT_DATE, 'YYYY');
    sequence_num integer;
    donation_num varchar(100);
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(donation_number FROM '[0-9]+$') AS integer)), 0) + 1
    INTO sequence_num
    FROM donations
    WHERE donation_number LIKE prefix || year_str || '%';
    
    donation_num := prefix || year_str || LPAD(sequence_num::text, 6, '0');
    
    RETURN donation_num;
END;
$$ LANGUAGE plpgsql;

-- Initialize wallets for existing students
INSERT INTO wallets (student_id, college_id, balance)
SELECT id, college_id, 0.00
FROM students
WHERE id NOT IN (SELECT student_id FROM wallets)
ON CONFLICT (student_id) DO NOTHING;

-- Add comments
COMMENT ON TABLE "finance_configuration" IS 'Base fees and fee structures configuration';
COMMENT ON TABLE "wallets" IS 'Student wallet balances for credit/debit transactions';
COMMENT ON TABLE "wallet_transactions" IS 'All wallet credit/debit transactions with audit trail';
COMMENT ON TABLE "invoices" IS 'Main invoice records with status tracking';
COMMENT ON TABLE "invoice_items" IS 'Line items for each invoice';
COMMENT ON TABLE "payments" IS 'Payment records with verification status';
COMMENT ON TABLE "payment_receipts" IS 'Uploaded payment receipt files';
COMMENT ON TABLE "scholarships" IS 'Scholarship definitions and eligibility criteria';
COMMENT ON TABLE "student_scholarships" IS 'Student scholarship assignments';
COMMENT ON TABLE "installment_plans" IS 'Installment plan configurations';
COMMENT ON TABLE "installment_plan_details" IS 'Individual installment schedules for plans';
COMMENT ON TABLE "student_installments" IS 'Student-specific installment assignments';
COMMENT ON TABLE "installment_invoices" IS 'Individual installment invoices with due dates';
COMMENT ON TABLE "donations" IS 'Donation records with audit trail';



