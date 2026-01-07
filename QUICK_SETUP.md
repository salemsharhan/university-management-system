# 🚀 Quick Setup Guide

## One-Command Test User Setup

### Prerequisites

1. **Add to your `.env` file:**
```env
VITE_SUPABASE_URL=https://xgavrsqjlgvxvexeptdw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnYXZyc3FqbGd2eHZleGVwdGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzc2MzAsImV4cCI6MjA4MzIxMzYzMH0.IpsDHxA_OrIic6SpYcBKGEz2VGsVOlercOf5MykS0Po
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnYXZyc3FqbGd2eHZleGVwdGR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzNzYzMCwiZXhwIjoyMDgzMjEzNjMwfQ.vye61xR9f8yLUNgXrQ1Ibc2DASQ9I-Iirggxu2U1-n4
```

### Step 1: Push Database Migration

```bash
npx supabase db push
```

This creates the test college (TEST001) with all settings configured.

### Step 2: Create Test Users (Automated)

```bash
npm run setup:users
```

This script will:
- ✅ Create 4 auth users in Supabase (using service role key)
- ✅ Link them to the database with correct roles
- ✅ Display all login credentials

### Step 3: Test Login

Use these credentials to login:

| Role | Email | Password | URL |
|------|-------|----------|-----|
| Super Admin | `admin@university.edu` | `Admin123!` | http://localhost:5173/login/admin |
| College Admin | `college@testuniversity.edu` | `College123!` | http://localhost:5173/login/college |
| Instructor | `instructor@testuniversity.edu` | `Instructor123!` | http://localhost:5173/login/instructor |
| Student | `student@testuniversity.edu` | `Student123!` | http://localhost:5173/login/student |

## What Gets Created

### Test College (TEST001)
- ✅ All academic settings (credit hours, GPA, grading scale, attendance)
- ✅ All financial settings (payment gateway, discounts, late fees)
- ✅ Email/SMTP settings
- ✅ Onboarding settings
- ✅ System settings (security, backup, etc.)
- ✅ Examination settings

### Test Users
- ✅ Super Admin (no college)
- ✅ College Admin (linked to TEST001)
- ✅ Instructor (linked to TEST001)
- ✅ Student (linked to TEST001)

## Troubleshooting

### If setup script fails:
1. Check that `SUPABASE_SERVICE_ROLE_KEY` is in `.env`
2. Verify Supabase project is linked: `npx supabase status`
3. Check that migrations are applied: `npx supabase migration list`

### If users can't login:
1. Verify users exist in Supabase Dashboard → Authentication → Users
2. Check users table: `SELECT * FROM users;`
3. Verify roles are correct: `SELECT email, role, college_id FROM users;`

## Manual Alternative

If you prefer manual setup, see `TEST_USERS.md` for step-by-step instructions.




