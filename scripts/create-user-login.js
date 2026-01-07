import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || process.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0];
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_PROJECT_REF (or extract from VITE_SUPABASE_URL)');
  console.error('   - SUPABASE_ACCESS_TOKEN');
  console.error('\nPlease add these to your .env file');
  process.exit(1);
}

async function executeSQL(sql) {
  try {
    const response = await axios.post(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      { query: sql },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

async function createAuthUser(email, password, name, role, collegeId = null) {
  try {
    console.log(`\n📝 Creating auth user: ${email} (${role})...`);
    
    // First, check if user already exists in auth
    const checkUserSQL = `
      SELECT id, email FROM auth.users WHERE email = '${email}' LIMIT 1;
    `;
    
    const checkResult = await executeSQL(checkUserSQL);
    let authUserId = null;
    
    if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
      authUserId = checkResult.data[0].id;
      console.log(`   ℹ️  User already exists in auth: ${authUserId}`);
    } else {
      // Create auth user using Supabase Auth Admin API via SQL
      // Note: We'll need to use the service role key for this
      // For now, we'll create the user record and provide instructions
      console.log(`   ⚠️  Auth user creation via API requires service role key`);
      console.log(`   📋 Please create auth user manually in Supabase Dashboard`);
      console.log(`   📋 Email: ${email}`);
      console.log(`   📋 Password: ${password}`);
      console.log(`   📋 Auto Confirm: ✅`);
      
      return {
        success: false,
        needsManualAuth: true,
        email,
        password,
        name,
        role,
        collegeId
      };
    }
    
    // Create or update user record in users table
    const insertUserSQL = `
      INSERT INTO users (openId, email, name, role, college_id, "loginMethod")
      VALUES (
        '${authUserId}',
        '${email}',
        '${name.replace(/'/g, "''")}',
        '${role}',
        ${collegeId ? collegeId : 'NULL'},
        'email'
      )
      ON CONFLICT (openId) DO UPDATE 
      SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        college_id = EXCLUDED.college_id;
    `;
    
    const userResult = await executeSQL(insertUserSQL);
    
    if (userResult.success) {
      console.log(`   ✅ User record created/updated in users table`);
      return {
        success: true,
        authUserId,
        email,
        role
      };
    } else {
      console.log(`   ⚠️  Failed to create user record: ${userResult.error}`);
      return {
        success: false,
        error: userResult.error
      };
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function createLoginForStudent(studentId, password) {
  try {
    console.log(`\n🎓 Creating login for student ID: ${studentId}...`);
    
    // Get student info
    const getStudentSQL = `
      SELECT id, email, name_en, college_id 
      FROM students 
      WHERE id = ${studentId} 
      LIMIT 1;
    `;
    
    const studentResult = await executeSQL(getStudentSQL);
    
    if (!studentResult.success || !studentResult.data || studentResult.data.length === 0) {
      console.log(`   ❌ Student not found with ID: ${studentId}`);
      return { success: false, error: 'Student not found' };
    }
    
    const student = studentResult.data[0];
    
    if (!student.email) {
      console.log(`   ❌ Student has no email address`);
      return { success: false, error: 'Student has no email' };
    }
    
    return await createAuthUser(
      student.email,
      password,
      student.name_en || 'Student',
      'student',
      student.college_id
    );
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createLoginForInstructor(instructorId, password) {
  try {
    console.log(`\n👨‍🏫 Creating login for instructor ID: ${instructorId}...`);
    
    // Get instructor info
    const getInstructorSQL = `
      SELECT id, email, name_en, college_id 
      FROM instructors 
      WHERE id = ${instructorId} 
      LIMIT 1;
    `;
    
    const instructorResult = await executeSQL(getInstructorSQL);
    
    if (!instructorResult.success || !instructorResult.data || instructorResult.data.length === 0) {
      console.log(`   ❌ Instructor not found with ID: ${instructorId}`);
      return { success: false, error: 'Instructor not found' };
    }
    
    const instructor = instructorResult.data[0];
    
    if (!instructor.email) {
      console.log(`   ❌ Instructor has no email address`);
      return { success: false, error: 'Instructor has no email' };
    }
    
    return await createAuthUser(
      instructor.email,
      password,
      instructor.name_en || 'Instructor',
      'instructor',
      instructor.college_id
    );
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function createLoginForCollegeAdmin(collegeId, email, password, name) {
  try {
    console.log(`\n🏛️  Creating login for college admin: ${email}...`);
    
    return await createAuthUser(
      email,
      password,
      name || 'College Admin',
      'user',
      collegeId
    );
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🚀 User Login Account Creator\n');
  console.log('='.repeat(60));
  
  if (command === 'student' && args[1] && args[2]) {
    const studentId = parseInt(args[1]);
    const password = args[2];
    await createLoginForStudent(studentId, password);
  } else if (command === 'instructor' && args[1] && args[2]) {
    const instructorId = parseInt(args[1]);
    const password = args[2];
    await createLoginForInstructor(instructorId, password);
  } else if (command === 'college' && args[1] && args[2] && args[3]) {
    const collegeId = parseInt(args[1]);
    const email = args[2];
    const password = args[3];
    const name = args[4] || 'College Admin';
    await createLoginForCollegeAdmin(collegeId, email, password, name);
  } else {
    console.log('Usage:');
    console.log('  node scripts/create-user-login.js student <student_id> <password>');
    console.log('  node scripts/create-user-login.js instructor <instructor_id> <password>');
    console.log('  node scripts/create-user-login.js college <college_id> <email> <password> [name]');
    console.log('\nExample:');
    console.log('  node scripts/create-user-login.js student 1 "Student123!"');
    console.log('  node scripts/create-user-login.js instructor 1 "Instructor123!"');
    console.log('  node scripts/create-user-login.js college 1 "admin@college.edu" "Admin123!" "College Admin"');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Process completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. If auth user needs to be created manually:');
  console.log('   - Go to Supabase Dashboard → Authentication → Users');
  console.log('   - Click "Add User"');
  console.log('   - Enter email and password');
  console.log('   - Check "Auto Confirm"');
  console.log('2. User can then login at:');
  console.log('   - Students: /login/student');
  console.log('   - Instructors: /login/instructor');
  console.log('   - College Admins: /login/college');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});



