import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease add SUPABASE_SERVICE_ROLE_KEY to your .env file')
  process.exit(1)
}

// Create admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  {
    email: 'admin@university.edu',
    password: 'Admin123!',
    name: 'Super Admin',
    role: 'admin',
    college_id: null,
  },
  {
    email: 'college@testuniversity.edu',
    password: 'College123!',
    name: 'College Admin',
    role: 'user',
    college_code: 'TEST001',
  },
  {
    email: 'instructor@testuniversity.edu',
    password: 'Instructor123!',
    name: 'Test Instructor',
    role: 'instructor',
    college_code: 'TEST001',
  },
  {
    email: 'student@testuniversity.edu',
    password: 'Student123!',
    name: 'Test Student',
    role: 'student',
    college_code: 'TEST001',
  },
]

async function setupTestUsers() {
  console.log('🚀 Starting test user setup...\n')

  try {
    // Step 1: Ensure test college exists
    console.log('📚 Checking test college...')
    const { data: college, error: collegeError } = await supabaseAdmin
      .from('colleges')
      .select('id, code')
      .eq('code', 'TEST001')
      .single()

    let collegeId = null
    if (collegeError || !college) {
      console.log('   Creating test college...')
      const { data: newCollege, error: createError } = await supabaseAdmin
        .from('colleges')
        .insert({
          code: 'TEST001',
          name_en: 'Test University',
          name_ar: 'جامعة الاختبار',
          abbreviation: 'TU',
          official_email: 'admin@testuniversity.edu',
          phone_number: '+966501234567',
          primary_color: '#952562',
          secondary_color: '#E82B5E',
          status: 'active',
        })
        .select('id')
        .single()

      if (createError) {
        console.error('❌ Error creating college:', createError.message)
        throw createError
      }
      collegeId = newCollege.id
      console.log(`   ✅ College created with ID: ${collegeId}`)
    } else {
      collegeId = college.id
      console.log(`   ✅ College already exists with ID: ${collegeId}`)
    }

    // Step 2: Create auth users and link to database
    console.log('\n👥 Creating auth users and linking to database...\n')

    for (const user of testUsers) {
      try {
        // Check if user already exists in auth by listing users
        let authUserId = null
        let userExists = false
        
        try {
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
          if (!listError && users) {
            const existingUser = users.find(u => u.email === user.email)
            if (existingUser) {
              userExists = true
              authUserId = existingUser.id
              console.log(`   ℹ️  User ${user.email} already exists in auth`)
            }
          }
        } catch (err) {
          // If listing fails, try to create anyway
        }

        if (!userExists) {
          // Create auth user
          console.log(`   Creating auth user: ${user.email}...`)
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              name: user.name,
              role: user.role,
            },
          })

          if (authError) {
            console.error(`   ❌ Error creating auth user ${user.email}:`, authError.message)
            continue
          }

          authUserId = authData.user.id
          console.log(`   ✅ Auth user created: ${user.email} (${authUserId})`)
        }

        // Get college_id if needed
        let userCollegeId = user.college_id
        if (user.college_code && !userCollegeId) {
          userCollegeId = collegeId
        }

        // Create or update user record in users table
        const { data: userRecord, error: userError } = await supabaseAdmin
          .from('users')
          .upsert({
            openId: authUserId,
            email: user.email,
            name: user.name,
            role: user.role,
            college_id: userCollegeId,
            loginMethod: 'email',
          }, {
            onConflict: 'openId',
          })
          .select()
          .single()

        if (userError) {
          console.error(`   ❌ Error creating user record for ${user.email}:`, userError.message)
          continue
        }

        console.log(`   ✅ User record linked: ${user.email} (Role: ${user.role})`)
      } catch (error) {
        console.error(`   ❌ Error processing user ${user.email}:`, error.message)
      }
    }

    console.log('\n✅ Test user setup completed!\n')
    console.log('📋 Test Login Credentials:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    testUsers.forEach(user => {
      console.log(`\n${user.name} (${user.role})`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Password: ${user.password}`)
      console.log(`   Login: http://localhost:5173/login/${user.role === 'user' ? 'college' : user.role}`)
    })
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  }
}

setupTestUsers()
