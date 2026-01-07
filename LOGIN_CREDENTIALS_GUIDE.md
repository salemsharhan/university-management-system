# Login Credentials Setup Guide

## How Users Can Log In

When you create colleges, students, or instructors, you need to set up login accounts for them to access their portals.

## Quick Answer

### Option 1: Automatic (Recommended - After Edge Function Setup)

1. **Deploy the Edge Function:**
   ```bash
   supabase functions deploy create-auth-user
   ```

2. **When creating a student/instructor:**
   - Check "Create login account"
   - Enter a password
   - The system will automatically create the auth account

3. **Users can then log in at:**
   - Students: `/login/student`
   - Instructors: `/login/instructor`
   - College Admins: `/login/college`

### Option 2: Manual Setup (Current Method)

1. **Create the student/instructor/college** through the admin panel

2. **Go to Supabase Dashboard:**
   - Authentication → Users → Add User
   - Email: (use the email from the created record)
   - Password: (set a password)
   - Auto Confirm: ✅

3. **Link to database** (run SQL in Supabase SQL Editor):
   ```sql
   -- For a student
   INSERT INTO users (openId, email, name, role, college_id, "loginMethod")
   SELECT 
     au.id::text,
     au.email,
     s.name_en,
     'student',
     s.college_id,
     'email'
   FROM auth.users au
   CROSS JOIN students s
   WHERE au.email = s.email
   AND NOT EXISTS (SELECT 1 FROM users u WHERE u.openId = au.id::text);
   ```

## Login URLs

- **Super Admin**: `/login/admin`
- **College Admin**: `/login/college`  
- **Instructor**: `/login/instructor`
- **Student**: `/login/student`

## What Happens After Login

Once logged in, users will:
- See their role-specific dashboard
- Have access to features based on their role
- Be able to view/edit their profile
- Access role-specific pages

## Troubleshooting

**User can't log in:**
1. Check if auth account exists in Supabase Dashboard
2. Check if user record exists in `users` table
3. Verify email matches exactly
4. Check role is correct in `users` table

**Password reset:**
- Currently manual via Supabase Dashboard
- Future: Password reset flow will be added



