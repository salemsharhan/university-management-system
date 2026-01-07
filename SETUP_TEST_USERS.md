# Setup Test Users - Step by Step Guide

## ✅ College Settings Schema Status

**YES, the college settings schema has been migrated!** 

The migration includes:
- ✅ `colleges` table with all settings fields:
  - `academic_settings` (JSONB) - Credit hours, GPA, grading scale, attendance, etc.
  - `financial_settings` (JSONB) - Payment gateway, discounts, late fees, installments, etc.
  - `email_settings` (JSONB) - SMTP configuration, notifications
  - `onboarding_settings` (JSONB) - Application settings, document requirements
  - `system_settings` (JSONB) - Security, file upload, maintenance, backup
  - `examination_settings` (JSONB) - Grading, exam types, scheduling, makeup exams

The migration `20250101000000_initial_schema.sql` has been applied to your Supabase database.

## 🚀 Quick Setup Test Users

### Method 1: Using Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard** → Your Project → Authentication → Users

2. **Click "Add User"** and create each user:

   #### Super Admin
   - Email: `admin@university.edu`
   - Password: `Admin123!`
   - Auto Confirm: ✅ (check this)

   #### College Admin
   - Email: `college@testuniversity.edu`
   - Password: `College123!`
   - Auto Confirm: ✅

   #### Instructor
   - Email: `instructor@testuniversity.edu`
   - Password: `Instructor123!`
   - Auto Confirm: ✅

   #### Student
   - Email: `student@testuniversity.edu`
   - Password: `Student123!`
   - Auto Confirm: ✅

3. **After creating auth users, run this SQL** in Supabase SQL Editor:

```sql
-- First, ensure the test college exists (run seed.sql or this):
INSERT INTO colleges (
  code, name_en, name_ar, abbreviation, official_email, 
  primary_color, secondary_color, status
) VALUES (
  'TEST001', 'Test University', 'جامعة الاختبار', 'TU', 
  'admin@testuniversity.edu', '#952562', '#E82B5E', 'active'
) ON CONFLICT (code) DO NOTHING;

-- Get auth user IDs and link to users table
DO $$
DECLARE
  college_id_val INTEGER;
  admin_auth_id UUID;
  college_auth_id UUID;
  instructor_auth_id UUID;
  student_auth_id UUID;
BEGIN
  -- Get college ID
  SELECT id INTO college_id_val FROM colleges WHERE code = 'TEST001';
  
  -- Get auth user IDs (you'll need to get these from auth.users table)
  -- For now, we'll create user records that will be linked when auth users sign in
  
  -- Create/Update Super Admin user record
  INSERT INTO users (openId, email, name, role, "college_id", "loginMethod")
  VALUES (
    (SELECT id::text FROM auth.users WHERE email = 'admin@university.edu' LIMIT 1),
    'admin@university.edu',
    'Super Admin',
    'admin',
    NULL,
    'email'
  )
  ON CONFLICT (openId) DO UPDATE 
  SET role = 'admin', "college_id" = NULL;
  
  -- Create/Update College Admin user record
  INSERT INTO users (openId, email, name, role, "college_id", "loginMethod")
  VALUES (
    (SELECT id::text FROM auth.users WHERE email = 'college@testuniversity.edu' LIMIT 1),
    'college@testuniversity.edu',
    'College Admin',
    'user',
    college_id_val,
    'email'
  )
  ON CONFLICT (openId) DO UPDATE 
  SET role = 'user', "college_id" = college_id_val;
  
  -- Create/Update Instructor user record
  INSERT INTO users (openId, email, name, role, "college_id", "loginMethod")
  VALUES (
    (SELECT id::text FROM auth.users WHERE email = 'instructor@testuniversity.edu' LIMIT 1),
    'instructor@testuniversity.edu',
    'Test Instructor',
    'instructor',
    college_id_val,
    'email'
  )
  ON CONFLICT (openId) DO UPDATE 
  SET role = 'instructor', "college_id" = college_id_val;
  
  -- Create/Update Student user record
  INSERT INTO users (openId, email, name, role, "college_id", "loginMethod")
  VALUES (
    (SELECT id::text FROM auth.users WHERE email = 'student@testuniversity.edu' LIMIT 1),
    'student@testuniversity.edu',
    'Test Student',
    'student',
    college_id_val,
    'email'
  )
  ON CONFLICT (openId) DO UPDATE 
  SET role = 'student', "college_id" = college_id_val;
END $$;
```

### Method 2: Using Supabase CLI (Alternative)

If you prefer using the CLI, you can create users programmatically, but the Dashboard method is simpler.

## 📋 Test Login Credentials Summary

| Role | Email | Password | Login URL |
|------|-------|----------|-----------|
| **Super Admin** | `admin@university.edu` | `Admin123!` | http://localhost:5173/login/admin |
| **College Admin** | `college@testuniversity.edu` | `College123!` | http://localhost:5173/login/college |
| **Instructor** | `instructor@testuniversity.edu` | `Instructor123!` | http://localhost:5173/login/instructor |
| **Student** | `student@testuniversity.edu` | `Student123!` | http://localhost:5173/login/student |

## 🔍 Verify Setup

After setup, verify by:

1. **Check users table**:
```sql
SELECT email, role, college_id FROM users;
```

2. **Check colleges table**:
```sql
SELECT code, name_en, academic_settings, financial_settings FROM colleges WHERE code = 'TEST001';
```

3. **Test login** at each role's login page

## 🎯 What Each Role Can Access

- **Super Admin**: Create and manage colleges, full system access
- **College Admin**: Manage their college settings (academic, financial, email, etc.)
- **Instructor**: View classes, manage attendance, grades
- **Student**: View courses, grades, schedule, exams

## 📝 Notes

- The test college (TEST001) includes all configured settings as JSONB
- All settings are stored in the `colleges` table's JSONB columns
- You can modify settings via the college admin dashboard (once built)
- The seed data includes comprehensive default settings for testing




