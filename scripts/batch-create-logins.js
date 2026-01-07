import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || supabaseUrl?.split('//')[1]?.split('.')[0];
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createLoginForStudent(student, password) {
  try {
    console.log(`\n🎓 Creating login for: ${student.email}...`);
    
    // Check if auth user exists
    let authUserId = null;
    try {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (!error && users) {
        const existing = users.find(u => u.email === student.email);
        if (existing) {
          authUserId = existing.id;
          console.log(`   ℹ️  Auth user already exists: ${authUserId}`);
        }
      }
    } catch (err) {
      // Continue to create
    }
    
    if (!authUserId) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: student.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: student.name_en || 'Student',
          role: 'student',
        },
      });
      
      if (authError) {
        console.log(`   ❌ Failed to create auth user: ${authError.message}`);
        return { success: false, error: authError.message };
      }
      
      authUserId = authData.user.id;
      console.log(`   ✅ Auth user created: ${authUserId}`);
    }
    
    // Create/update user record
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        openId: authUserId,
        email: student.email,
        name: student.name_en || 'Student',
        role: 'student',
        college_id: student.college_id,
        loginMethod: 'email',
      }, {
        onConflict: 'openId'
      })
      .select()
      .single();
    
    if (userError) {
      console.log(`   ⚠️  Failed to create user record: ${userError.message}`);
      return { success: false, error: userError.message };
    }
    
    console.log(`   ✅ Login account created successfully`);
    return { success: true, email: student.email, role: 'student' };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createLoginForInstructor(instructor, password) {
  try {
    console.log(`\n👨‍🏫 Creating login for: ${instructor.email}...`);
    
    // Check if auth user exists
    let authUserId = null;
    try {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (!error && users) {
        const existing = users.find(u => u.email === instructor.email);
        if (existing) {
          authUserId = existing.id;
          console.log(`   ℹ️  Auth user already exists: ${authUserId}`);
        }
      }
    } catch (err) {
      // Continue to create
    }
    
    if (!authUserId) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: instructor.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: instructor.name_en || 'Instructor',
          role: 'instructor',
        },
      });
      
      if (authError) {
        console.log(`   ❌ Failed to create auth user: ${authError.message}`);
        return { success: false, error: authError.message };
      }
      
      authUserId = authData.user.id;
      console.log(`   ✅ Auth user created: ${authUserId}`);
    }
    
    // Create/update user record
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        openId: authUserId,
        email: instructor.email,
        name: instructor.name_en || 'Instructor',
        role: 'instructor',
        college_id: instructor.college_id,
        loginMethod: 'email',
      }, {
        onConflict: 'openId'
      })
      .select()
      .single();
    
    if (userError) {
      console.log(`   ⚠️  Failed to create user record: ${userError.message}`);
      return { success: false, error: userError.message };
    }
    
    console.log(`   ✅ Login account created successfully`);
    return { success: true, email: instructor.email, role: 'instructor' };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function batchCreateStudentLogins(defaultPassword = 'Student123!') {
  console.log('🚀 Batch Creating Student Login Accounts\n');
  console.log('='.repeat(60));
  
  // Get all students without login accounts
  const { data: students, error } = await supabaseAdmin
    .from('students')
    .select('id, email, name_en, college_id')
    .not('email', 'is', null)
    .eq('status', 'active');
  
  if (error) {
    console.error('❌ Failed to fetch students:', error.message);
    return;
  }
  
  // Get existing users to filter out
  const { data: existingUsers } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('role', 'student');
  
  const existingEmails = new Set(existingUsers?.map(u => u.email) || []);
  const studentsToProcess = students?.filter(s => !existingEmails.has(s.email)) || [];
  
  console.log(`📋 Found ${studentsToProcess.length} students without login accounts\n`);
  
  if (studentsToProcess.length === 0) {
    console.log('✅ All students already have login accounts!');
    return;
  }
  
  const results = [];
  for (const student of studentsToProcess) {
    const result = await createLoginForStudent(student, defaultPassword);
    results.push({ student: student.email, ...result });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(60));
  
  if (successful > 0) {
    console.log('\n📋 Login Credentials:');
    console.log(`   Default Password: ${defaultPassword}`);
    console.log(`   Students can login at: /login/student`);
    console.log(`   Email: (their email from student record)`);
  }
}

async function batchCreateInstructorLogins(defaultPassword = 'Instructor123!') {
  console.log('🚀 Batch Creating Instructor Login Accounts\n');
  console.log('='.repeat(60));
  
  // Get all instructors without login accounts
  const { data: instructors, error } = await supabaseAdmin
    .from('instructors')
    .select('id, email, name_en, college_id')
    .not('email', 'is', null)
    .eq('status', 'active');
  
  if (error) {
    console.error('❌ Failed to fetch instructors:', error.message);
    return;
  }
  
  // Get existing users to filter out
  const { data: existingUsers } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('role', 'instructor');
  
  const existingEmails = new Set(existingUsers?.map(u => u.email) || []);
  const instructorsToProcess = instructors?.filter(i => !existingEmails.has(i.email)) || [];
  
  console.log(`📋 Found ${instructorsToProcess.length} instructors without login accounts\n`);
  
  if (instructorsToProcess.length === 0) {
    console.log('✅ All instructors already have login accounts!');
    return;
  }
  
  const results = [];
  for (const instructor of instructorsToProcess) {
    const result = await createLoginForInstructor(instructor, defaultPassword);
    results.push({ instructor: instructor.email, ...result });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(60));
  
  if (successful > 0) {
    console.log('\n📋 Login Credentials:');
    console.log(`   Default Password: ${defaultPassword}`);
    console.log(`   Instructors can login at: /login/instructor`);
    console.log(`   Email: (their email from instructor record)`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'students') {
    const password = args[1] || 'Student123!';
    await batchCreateStudentLogins(password);
  } else if (command === 'instructors') {
    const password = args[1] || 'Instructor123!';
    await batchCreateInstructorLogins(password);
  } else {
    console.log('Usage:');
    console.log('  node scripts/batch-create-logins.js students [password]');
    console.log('  node scripts/batch-create-logins.js instructors [password]');
    console.log('\nExample:');
    console.log('  node scripts/batch-create-logins.js students "Student123!"');
    console.log('  node scripts/batch-create-logins.js instructors "Instructor123!"');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});



