import { supabase } from '../lib/supabase'
import { createAuthUser } from '../lib/createAuthUser'

/**
 * Generate a unique student ID for a college
 */
export async function generateStudentId(collegeId) {
  if (!collegeId) return null
  
  try {
    const { data: college } = await supabase
      .from('colleges')
      .select('student_id_prefix, student_id_format, student_id_starting_number')
      .eq('id', collegeId)
      .single()
    
    if (!college) return null
    
    const prefix = college.student_id_prefix || 'STU'
    const year = new Date().getFullYear()
    const format = college.student_id_format || '{prefix}{year}{sequence:D4}'
    
    // Get existing student IDs for this college and year (more efficient than fetching all)
    const yearPrefix = `${prefix}${year}`
    const { data: existingStudents, error: studentError } = await supabase
      .from('students')
      .select('student_id')
      .eq('college_id', collegeId)
      .ilike('student_id', `${yearPrefix}%`) // Filter by year prefix to reduce query size
      .limit(10000) // Safety limit
    
    // Handle case where no students exist yet (not an error)
    if (studentError && studentError.code !== 'PGRST116') {
      console.error('Error fetching existing students:', studentError)
    }
    
    const existingIds = new Set(existingStudents?.map(s => s.student_id).filter(Boolean) || [])
    
    // Start from the configured starting number or 1
    let sequence = college.student_id_starting_number || 1
    
    // Find the highest sequence number used for this year (already filtered by yearPrefix in query)
    const yearStudents = Array.from(existingIds)
    
    if (yearStudents.length > 0) {
      // Extract sequence numbers from existing IDs
      const sequences = yearStudents
        .map(id => {
          // Try to extract sequence from end (last 4 or 5 digits)
          const match = id.match(/\d{4,5}$/)
          return match ? parseInt(match[0]) : 0
        })
        .filter(num => num > 0)
      
      if (sequences.length > 0) {
        const maxSequence = Math.max(...sequences)
        sequence = maxSequence + 1
      }
    }
    
    // Generate the ID and check for uniqueness (use local cache only - database unique constraint will catch race conditions)
    let attempts = 0
    const maxAttempts = 100 // Safety limit to prevent infinite loops
    
    while (attempts < maxAttempts) {
      const generatedId = format
        .replace('{prefix}', prefix)
        .replace('{year}', year)
        .replace('{sequence:D4}', sequence.toString().padStart(4, '0'))
        .replace('{sequence:D5}', sequence.toString().padStart(5, '0'))
      
      // Check against local cache only (no database query in loop to prevent timeout)
      // If there's a race condition, the database unique constraint will catch it
      // and the calling code will retry with a new ID
      if (!existingIds.has(generatedId)) {
        return generatedId
      }
      
      // If it exists in cache, increment and try again
      sequence++
      attempts++
    }
    
    // If we've exhausted attempts, throw an error
    throw new Error('Unable to generate unique student ID after multiple attempts')
  } catch (err) {
    console.error('Error generating student ID:', err)
    return null
  }
}

/**
 * Create an invoice retroactively for registration fee paid during application
 * @param {Object} student - The created student object
 * @param {Object} application - The application object with payment information
 */
async function createRegistrationFeeInvoice(student, application) {
  try {
    // Generate invoice number
    const invoiceNumber = await supabase.rpc('generate_invoice_number', {
      college_id_param: student.college_id
    })

    if (invoiceNumber.error) throw invoiceNumber.error

    const feeAmount = parseFloat(application.registration_fee_amount || 0)
    const paymentDate = application.registration_fee_paid_at ? new Date(application.registration_fee_paid_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

    // Create invoice for registration fee
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber.data,
        student_id: student.id,
        college_id: student.college_id,
        invoice_date: paymentDate,
        invoice_type: 'admission_fee', // Registration fees are typically admission fees
        status: 'paid', // Already paid during application
        subtotal: feeAmount,
        discount_amount: 0,
        scholarship_amount: 0,
        tax_amount: 0,
        total_amount: feeAmount,
        paid_amount: feeAmount,
        pending_amount: 0,
        payment_method: application.registration_fee_payment_method || 'online_payment',
        notes: `Registration fee paid during application process (Application #${application.application_number || application.id})`
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Create invoice item
    const { error: itemError } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        item_type: 'registration_fee',
        item_name_en: 'Registration Fee',
        item_name_ar: 'رسوم التسجيل',
        description: `Registration fee paid during application process`,
        quantity: 1,
        unit_price: feeAmount,
        discount_amount: 0,
        scholarship_amount: 0,
        total_amount: feeAmount,
        reference_id: application.id,
        reference_type: 'application'
      })

    if (itemError) throw itemError

    // Create payment record
    const paymentNumber = await supabase.rpc('generate_payment_number', {
      college_id_param: student.college_id
    })

    if (paymentNumber.error) throw paymentNumber.error

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_number: paymentNumber.data,
        invoice_id: invoice.id,
        student_id: student.id,
        college_id: student.college_id,
        payment_date: paymentDate,
        payment_method: application.registration_fee_payment_method || 'online_payment',
        amount: feeAmount,
        status: 'verified', // Already verified when paid during application
        verified_at: application.registration_fee_paid_at || new Date().toISOString(),
        notes: `Registration fee payment from application #${application.application_number || application.id}`
      })

    if (paymentError) throw paymentError

    console.log(`✅ Created registration fee invoice ${invoice.invoice_number} for student ${student.student_id}`)
  } catch (err) {
    console.error('Error creating registration fee invoice:', err)
    throw err
  }
}

/**
 * Create a student record from an application
 * This function handles the complete student creation process including:
 * - Student ID generation
 * - Student record creation
 * - Auth user account creation (with custom or auto-generated password)
 * - Registration fee invoice creation (if fee was paid during application)
 * @param {Object} application - The application object
 * @param {string} [customPassword] - Optional custom password for the auth user account
 */
export async function createStudentFromApplication(application, customPassword = null) {
  try {
    // Check if student already exists for this application
    const { data: existingStudent, error: checkError } = await supabase
      .from('students')
      .select('id, student_id, email')
      .eq('email', application.email)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Error checking existing student: ${checkError.message}`)
    }

    if (existingStudent) {
      return {
        success: false,
        error: 'Student already exists with this email',
        student: existingStudent,
        alreadyExists: true
      }
    }

    if (!application.college_id) {
      throw new Error('Application must have a college_id')
    }

    if (!application.major_id) {
      throw new Error('Application must have a major_id')
    }

    // Generate student ID
    const studentId = await generateStudentId(application.college_id)
    if (!studentId) {
      throw new Error('Failed to generate student ID')
    }

    // Construct name_en and name_ar from first/middle/last names
    const name_en = [application.first_name, application.middle_name, application.last_name]
      .filter(Boolean).join(' ')
    const name_ar = [application.first_name_ar, application.middle_name_ar, application.last_name_ar]
      .filter(Boolean).join(' ')

    // Map application fields to student fields
    // Use enrollment_date from application or default to current date
    // enrollment_date is required in students table, so we must always provide a value
    const enrollmentDate = application.enrollment_date || new Date().toISOString().split('T')[0]

    // Retry logic for duplicate key errors
    let insertAttempts = 0
    const maxInsertAttempts = 5
    let insertSuccess = false
    let lastError = null
    let currentStudentId = studentId

    while (insertAttempts < maxInsertAttempts && !insertSuccess) {
      const studentData = {
        student_id: currentStudentId,
        first_name: application.first_name,
        middle_name: application.middle_name || null,
        last_name: application.last_name,
        name_en: name_en || application.first_name + ' ' + application.last_name,
        name_ar: name_ar || (application.first_name_ar && application.last_name_ar 
          ? application.first_name_ar + ' ' + application.last_name_ar 
          : null),
        first_name_ar: application.first_name_ar || null,
        middle_name_ar: application.middle_name_ar || null,
        last_name_ar: application.last_name_ar || null,
        email: application.email,
        phone: application.phone || null,
        mobile_phone: application.phone || null, // Use phone as mobile if available
        date_of_birth: application.date_of_birth || null,
        gender: application.gender || null,
        nationality: application.nationality || null,
        religion: application.religion || null,
        marital_status: null, // Not in application
        blood_type: null, // Not in application
        is_international: application.nationality ? 
          (application.nationality.toLowerCase() !== 'kuwait' && application.nationality.toLowerCase() !== 'الكويت') 
          : false,
        address: application.street_address || application.address || null,
        city: application.city || null,
        state: application.state_province || application.state || null,
        country: application.country || null,
        postal_code: application.postal_code || null,
        major_id: parseInt(application.major_id),
        college_id: parseInt(application.college_id),
        enrollment_date: enrollmentDate,
        study_type: 'full_time', // Default for new students
        study_load: 'normal', // Default
        study_approach: 'on_campus', // Default
        credit_hours: null, // Will be determined by enrollment
        emergency_contact_name: application.emergency_contact_name || null,
        emergency_contact_relation: application.emergency_contact_relationship || application.emergency_contact_relation || null,
        emergency_phone: application.emergency_contact_phone || application.emergency_phone || null,
        emergency_contact_email: application.emergency_contact_email || null,
        national_id: null, // Not in application form
        passport_number: null, // Not in application form
        passport_expiry: null,
        visa_number: null,
        visa_expiry: null,
        residence_permit_number: null,
        residence_permit_expiry: null,
        high_school_name: application.high_school_name || null,
        high_school_country: application.high_school_country || null,
        graduation_year: application.graduation_year ? parseInt(application.graduation_year) : null,
        high_school_gpa: application.gpa ? parseFloat(application.gpa) : null,
        has_scholarship: application.scholarship_request || false,
        scholarship_type: null, // Not in application
        scholarship_percentage: application.scholarship_percentage ? parseFloat(application.scholarship_percentage) : null,
        medical_conditions: null, // Not in application
        allergies: null, // Not in application
        medications: null, // Not in application
        documents: null, // Documents are stored separately in applications
        notes: `Created from application #${application.application_number || application.id}`,
        status: 'active',
      }

      const { data: createdStudent, error: insertError } = await supabase
        .from('students')
        .insert(studentData)
        .select()
        .single()

      // Check if error is a duplicate key error
      if (insertError) {
        // If it's a duplicate key error (23505), generate a new ID and retry
        if (insertError.code === '23505' && insertError.message?.includes('student_id')) {
          console.warn(`Duplicate student_id detected: ${currentStudentId}. Generating new ID...`)
          insertAttempts++
          // Generate a new student ID
          const newStudentId = await generateStudentId(application.college_id)
          if (newStudentId && newStudentId !== currentStudentId) {
            currentStudentId = newStudentId
            continue // Retry with new ID
          } else {
            lastError = insertError
            break // Can't generate new ID, break and throw error
          }
        } else {
          // For other errors, throw immediately
          throw insertError
        }
      } else {
        // Success! Break out of retry loop
        insertSuccess = true
        
        // Create auth user account automatically
        // Use custom password if provided, otherwise generate a temporary password
        const password = customPassword || `Temp${currentStudentId}@${new Date().getFullYear()}`
        
        try {
          const { data: functionResult, error: functionError } = await createAuthUser({
            email: application.email,
            password: password,
            role: 'student',
            college_id: application.college_id,
            name: name_en,
          })

          if (functionError) {
            console.warn('Failed to create auth account:', functionError.message)
            // Continue anyway - student is created, just no login account
            // The student can request password reset later
          } else if (functionResult?.success) {
            console.log('✅ Student login account created successfully')
          } else {
            console.warn('Failed to create auth account:', functionResult?.error)
          }
        } catch (authErr) {
          console.error('Error creating auth account:', authErr)
          // Continue anyway - student is created, just no login account
        }

        // Create invoice retroactively if registration fee was paid during application
        if (application.registration_fee_amount && application.registration_fee_paid_at) {
          try {
            await createRegistrationFeeInvoice(createdStudent, application)
          } catch (invoiceError) {
            console.error('Error creating registration fee invoice:', invoiceError)
            // Don't throw - student is created successfully, invoice creation is secondary
            // The invoice can be created manually later if needed
          }
        }

        return {
          success: true,
          student: createdStudent,
          password: password, // Return password for potential email notification
          alreadyExists: false
        }
      }
    }

    // If we exhausted retry attempts, throw the last error
    if (!insertSuccess && lastError) {
      throw lastError
    }
    
    // If we exhausted retry attempts without an error, throw generic error
    if (!insertSuccess) {
      throw new Error('Failed to create student after multiple attempts due to duplicate student ID conflicts')
    }
  } catch (err) {
    console.error('Error creating student from application:', err)
    return {
      success: false,
      error: err.message || 'Failed to create student from application',
      alreadyExists: false
    }
  }
}

