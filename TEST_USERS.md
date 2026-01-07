# Test User Credentials

## 🚀 Quick Setup (Automated)

### Option 1: Automated Setup Script (Recommended)

1. **Add service role key to `.env` file:**
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

2. **Run the setup script:**
```bash
npm run setup:users
```

This will automatically:
- ✅ Create the test college (TEST001) with all settings
- ✅ Create all 4 auth users in Supabase Auth
- ✅ Link users to the database with correct roles
- ✅ Display login credentials

### Option 2: Manual Setup (Alternative)

If you prefer manual setup:

### Step 1: Create Users in Supabase Auth

Go to your Supabase Dashboard → Authentication → Users → Add User

Create the following users:

### Step 2: Test User Credentials

#### 1. Super Admin
- **Email**: `admin@university.edu`
- **Password**: `Admin123!`
- **Role**: `admin`
- **Login URL**: `/login/admin`
- **Description**: Manages universities and creates colleges

#### 2. College Admin
- **Email**: `college@testuniversity.edu`
- **Password**: `College123!`
- **Role**: `user` (college admin)
- **College**: Test University (TEST001)
- **Login URL**: `/login/college`
- **Description**: Manages college settings and operations

#### 3. Instructor
- **Email**: `instructor@testuniversity.edu`
- **Password**: `Instructor123!`
- **Role**: `instructor`
- **College**: Test University (TEST001)
- **Login URL**: `/login/instructor`
- **Description**: Accesses teaching dashboard and classes

#### 4. Student
- **Email**: `student@testuniversity.edu`
- **Password**: `Student123!`
- **Role**: `student`
- **College**: Test University (TEST001)
- **Login URL**: `/login/student`
- **Description**: Views courses, grades, and schedule

### Step 3: Push Migration and Link Users

1. **Push the seed migration:**
```bash
npx supabase db push
```

2. **Link Users to Database** (if not using automated script):

After creating the auth users, run this SQL in Supabase SQL Editor:

```sql
-- Get the college ID
DO $$
DECLARE
  college_id_val INTEGER;
BEGIN
  SELECT id INTO college_id_val FROM colleges WHERE code = 'TEST001';
  
  -- Update Super Admin (no college_id)
  UPDATE users 
  SET role = 'admin', college_id = NULL 
  WHERE email = 'admin@university.edu';
  
  -- Update College Admin
  UPDATE users 
  SET role = 'user', college_id = college_id_val 
  WHERE email = 'college@testuniversity.edu';
  
  -- Update Instructor
  UPDATE users 
  SET role = 'instructor', college_id = college_id_val 
  WHERE email = 'instructor@testuniversity.edu';
  
  -- Update Student
  UPDATE users 
  SET role = 'student', college_id = college_id_val 
  WHERE email = 'student@testuniversity.edu';
END $$;
```

### Alternative: Create Users via SQL (if auth.users table is accessible)

If you have direct access to create users, you can use Supabase's `auth.users` table, but it's recommended to use the Dashboard.

## Quick Reference

| Role | Email | Password | Login Page |
|------|-------|----------|------------|
| Super Admin | admin@university.edu | Admin123! | /login/admin |
| College Admin | college@testuniversity.edu | College123! | /login/college |
| Instructor | instructor@testuniversity.edu | Instructor123! | /login/instructor |
| Student | student@testuniversity.edu | Student123! | /login/student |

## Notes

- All passwords follow the pattern: `[Role]123!`
- The test college (TEST001) is automatically created with all settings configured
- Make sure to create users in Supabase Auth before linking them in the database
- The `openId` field in the users table should match the `id` from `auth.users`

