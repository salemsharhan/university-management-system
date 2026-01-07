# User Login Setup Guide

## Overview

When creating colleges, students, and instructors, you need to create authentication accounts so they can log in to their portals.

## Current Status

- ✅ **Colleges**: Created in database, but no auth account created automatically
- ✅ **Students**: Created in database, but no auth account created automatically  
- ✅ **Instructors**: Created in database, but no auth account created automatically

## Solution Options

### Option 1: Supabase Edge Function (Recommended)

We've created an Edge Function at `supabase/functions/create-auth-user/index.ts` that securely creates auth users.

#### Setup:

1. **Deploy the Edge Function:**
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy create-auth-user
```

2. **Set Environment Variables:**
The function uses these environment variables (automatically available in Supabase):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

3. **Update Creation Forms:**
The creation forms will call this function when a password is provided.

### Option 2: Manual Creation via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users** → **Add User**
2. Create user with:
   - Email: (use the email from student/instructor/college)
   - Password: (set a temporary password)
   - Auto Confirm: ✅
3. Link to database by running SQL:

```sql
-- For a student
INSERT INTO users (openId, email, name, role, college_id, "loginMethod")
VALUES (
  'auth-user-id-from-step-2',
  'student@example.com',
  'Student Name',
  'student',
  college_id_here,
  'email'
);

-- For an instructor
INSERT INTO users (openId, email, name, role, college_id, "loginMethod")
VALUES (
  'auth-user-id-from-step-2',
  'instructor@example.com',
  'Instructor Name',
  'instructor',
  college_id_here,
  'email'
);

-- For a college admin
INSERT INTO users (openId, email, name, role, college_id, "loginMethod")
VALUES (
  'auth-user-id-from-step-2',
  'college@example.com',
  'College Admin Name',
  'user',
  college_id_here,
  'email'
);
```

### Option 3: Automated Script (For Development)

Use the existing `scripts/setup-test-users.js` as a template to create users programmatically.

## Login URLs

Once auth accounts are created, users can log in at:

- **Super Admin**: `/login/admin`
- **College Admin**: `/login/college`
- **Instructor**: `/login/instructor`
- **Student**: `/login/student`

## Next Steps

1. **Add password fields** to creation forms (optional, for automatic account creation)
2. **Integrate Edge Function** calls in creation forms
3. **Add "Generate Login" button** in admin panel for existing users
4. **Email credentials** to users (future enhancement)

## Security Notes

- Never expose the service role key in frontend code
- Always use Edge Functions or backend APIs for auth user creation
- Consider implementing password reset flows
- Consider implementing email verification workflows



