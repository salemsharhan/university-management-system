# Login Setup Using Scripts (Recommended Method)

This guide shows you how to create login accounts for students, instructors, and college admins using the provided scripts.

## Prerequisites

1. **Add to your `.env` file:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ACCESS_TOKEN=your_access_token_here  # Optional, for SQL execution
SUPABASE_PROJECT_REF=your_project_ref  # Optional, extracted from URL if not provided
```

## Method 1: Individual User Creation

### Create Login for a Single Student

```bash
npm run create:login student <student_id> <password>
```

**Example:**
```bash
npm run create:login student 1 "Student123!"
```

### Create Login for a Single Instructor

```bash
npm run create:login instructor <instructor_id> <password>
```

**Example:**
```bash
npm run create:login instructor 1 "Instructor123!"
```

### Create Login for a College Admin

```bash
npm run create:login college <college_id> <email> <password> [name]
```

**Example:**
```bash
npm run create:login college 1 "admin@college.edu" "Admin123!" "College Admin"
```

## Method 2: Batch Creation (Recommended for Multiple Users)

### Create Logins for All Students

```bash
npm run batch:logins students [default_password]
```

**Example:**
```bash
npm run batch:logins students "Student123!"
```

This will:
- Find all active students with email addresses
- Create auth accounts for those without login accounts
- Set the default password for all
- Link them to the `users` table automatically

### Create Logins for All Instructors

```bash
npm run batch:logins instructors [default_password]
```

**Example:**
```bash
npm run batch:logins instructors "Instructor123!"
```

## What the Scripts Do

1. **Check for existing accounts** - Skips users who already have login accounts
2. **Create Supabase Auth users** - Uses service role key to create auth accounts
3. **Link to database** - Creates records in the `users` table with correct role and college_id
4. **Auto-confirm emails** - Users can login immediately without email verification

## Login URLs

After running the scripts, users can log in at:

- **Students**: `/login/student`
- **Instructors**: `/login/instructor`
- **College Admins**: `/login/college`

## Security Notes

- The scripts use the service role key, which should **never** be exposed in frontend code
- Default passwords should be changed on first login (future enhancement)
- Consider implementing password reset flows
- For production, use stronger default passwords or require password change on first login

## Troubleshooting

**"Missing environment variables" error:**
- Make sure `.env` file has `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

**"User already exists" message:**
- The script will skip users who already have login accounts
- To recreate, delete the user from Supabase Auth Dashboard first

**"Student/Instructor not found" error:**
- Check that the ID exists in the database
- Make sure the student/instructor has an email address

## Integration with Creation Forms

The creation forms now have an optional "Create login account" checkbox. When checked:
1. The form will attempt to call the Edge Function (if deployed)
2. Or you can run the script manually after creation:
   ```bash
   npm run create:login student <new_student_id> <password>
   ```

## Best Practices

1. **For new students/instructors**: Use the checkbox in the creation form
2. **For existing users**: Use batch creation script
3. **For production**: Set strong default passwords and require password change
4. **For security**: Never commit service role keys to version control



