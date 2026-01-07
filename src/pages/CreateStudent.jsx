import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { createAuthUser } from '../lib/createAuthUser'
import { ArrowLeft, ArrowRight, Check, User, Phone, FileText, GraduationCap, Heart, Upload, Eye } from 'lucide-react'

const steps = [
  { id: 1, name: 'Essential Info', icon: User },
  { id: 2, name: 'Emergency Contact', icon: Phone },
  { id: 3, name: 'Identity Documents', icon: FileText },
  { id: 4, name: 'Academic & Medical', icon: GraduationCap },
  { id: 5, name: 'Review & Submit', icon: Check },
]

export default function CreateStudent() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [searchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [majors, setMajors] = useState([])
  const [colleges, setColleges] = useState([])
  const [collegeId, setCollegeId] = useState(null)
  const [selectedCollegeId, setSelectedCollegeId] = useState(null)

  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    middle_name: '',
    last_name: '',
    first_name_ar: '',
    middle_name_ar: '',
    last_name_ar: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    religion: '',
    marital_status: '',
    blood_type: '',
    is_international: false,
    
    // Contact Information
    email: '',
    phone: '',
    mobile_phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    
    // Academic Information
    major_id: '',
    study_type: '',
    study_load: '',
    study_approach: '',
    credit_hours: '',
    enrollment_date: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_phone: '',
    emergency_contact_email: '',
    
    // Identity Documents
    national_id: '',
    passport_number: '',
    passport_expiry: '',
    visa_number: '',
    visa_expiry: '',
    residence_permit_number: '',
    residence_permit_expiry: '',
    
    // Previous Education
    high_school_name: '',
    high_school_country: '',
    graduation_year: '',
    high_school_gpa: '',
    
    // Scholarship
    has_scholarship: false,
    scholarship_type: '',
    scholarship_percentage: '',
    
    // Medical
    medical_conditions: '',
    allergies: '',
    medications: '',
    
    // Documents
    documents: [],
    
    // Additional
    notes: '',
    
    // Login Account (Optional)
    create_login_account: false,
    login_password: '',
  })

  const fetchMajors = async () => {
    try {
      let query = supabase
        .from('majors')
        .select('id, name_en, code, college_id, is_university_wide')
        .eq('status', 'active')
        .order('name_en')
      
      // If user is college admin, filter by their college or university-wide
      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }
      
      const { data, error } = await query
      if (error) throw error
      setMajors(data || [])
    } catch (err) {
      console.error('Error fetching majors:', err)
    }
  }

  const fetchMajorsForCollege = async (collegeId) => {
    try {
      const { data, error } = await supabase
        .from('majors')
        .select('id, name_en, code, college_id, is_university_wide')
        .eq('status', 'active')
        .or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
        .order('name_en')
      
      if (error) throw error
      setMajors(data || [])
    } catch (err) {
      console.error('Error fetching majors for college:', err)
    }
  }

  const fetchCollegeId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return
      
      const { data: userData } = await supabase
        .from('users')
        .select('college_id')
        .eq('email', user.email)
        .single()
      
      if (userData?.college_id) {
        setCollegeId(userData.college_id)
        setSelectedCollegeId(userData.college_id)
      }
    } catch (err) {
      console.error('Error fetching college ID:', err)
    }
  }

  const fetchColleges = async () => {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name_en, code')
        .eq('status', 'active')
        .order('name_en')
      
      if (error) throw error
      setColleges(data || [])
    } catch (err) {
      console.error('Error fetching colleges:', err)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      // Check if college ID is passed via URL parameter
      const urlCollegeId = searchParams.get('collegeId')
      if (urlCollegeId && userRole === 'admin') {
        const collegeIdInt = parseInt(urlCollegeId)
        setSelectedCollegeId(collegeIdInt)
        setCollegeId(collegeIdInt)
        // Fetch majors for the selected college
        if (collegeIdInt) {
          await fetchMajorsForCollege(collegeIdInt)
        }
      } else if (userRole === 'user' && authCollegeId) {
        // For college admins, use their college ID
        setCollegeId(authCollegeId)
        setSelectedCollegeId(authCollegeId)
      } else {
        await fetchCollegeId()
      }
      
      await fetchMajors()
      if (userRole === 'admin') {
        await fetchColleges()
      }
    }
    
    initializeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, searchParams])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts filling fields
    if (error && value) {
      setError('')
    }
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...files.map(f => ({ name: f.name, file: f }))]
    }))
  }

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const validateStep = (step) => {
    switch (step) {
      case 1:
        const missingFields = []
        if (!formData.first_name?.trim()) missingFields.push('First Name')
        if (!formData.last_name?.trim()) missingFields.push('Last Name')
        if (!formData.date_of_birth) missingFields.push('Date of Birth')
        if (!formData.email?.trim()) missingFields.push('Email')
        if (!formData.major_id) missingFields.push('Major')
        if (!formData.study_type) missingFields.push('Study Type')
        if (!formData.study_load) missingFields.push('Study Load')
        if (!formData.study_approach) missingFields.push('Study Approach')
        if (!formData.enrollment_date) missingFields.push('Enrollment Date')
        
        if (missingFields.length > 0) {
          setError(`Please fill in: ${missingFields.join(', ')}`)
          return false
        }
        return true
      case 2:
        return true // Optional fields
      case 3:
        return true // Optional fields
      case 4:
        return true // Optional fields
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
      setError('')
    }
    // Error is set inside validateStep now
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError('')
  }

  const generateStudentId = async (targetCollegeId = null) => {
    const collegeIdToUse = targetCollegeId || collegeId
    if (!collegeIdToUse) return null
    
    try {
      const { data: college } = await supabase
        .from('colleges')
        .select('student_id_prefix, student_id_format, student_id_starting_number')
        .eq('id', collegeIdToUse)
        .single()
      
      if (!college) return null
      
      const prefix = college.student_id_prefix || 'STU'
      const year = new Date().getFullYear()
      const format = college.student_id_format || '{prefix}{year}{sequence:D4}'
      
      // Get all existing student IDs for this college
      const { data: existingStudents, error: studentError } = await supabase
        .from('students')
        .select('student_id')
        .eq('college_id', collegeIdToUse)
      
      // Handle case where no students exist yet (not an error)
      if (studentError && studentError.code !== 'PGRST116') {
        console.error('Error fetching existing students:', studentError)
      }
      
      const existingIds = new Set(existingStudents?.map(s => s.student_id).filter(Boolean) || [])
      
      // Start from the configured starting number or 1
      let sequence = college.student_id_starting_number || 1
      
      // Find the highest sequence number used for this year
      const yearPrefix = `${prefix}${year}`
      const yearStudents = Array.from(existingIds).filter(id => id && id.startsWith(yearPrefix))
      
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
      
      // Generate the ID and check for uniqueness (retry if needed)
      let attempts = 0
      const maxAttempts = 1000 // Prevent infinite loop
      
      while (attempts < maxAttempts) {
        const generatedId = format
          .replace('{prefix}', prefix)
          .replace('{year}', year)
          .replace('{sequence:D4}', sequence.toString().padStart(4, '0'))
          .replace('{sequence:D5}', sequence.toString().padStart(5, '0'))
        
        // Double-check: Query database to ensure ID doesn't exist
        const { data: checkExisting, error: checkError } = await supabase
          .from('students')
          .select('student_id')
          .eq('student_id', generatedId)
          .limit(1)
        
        // If no error and no existing record, this ID is available
        if (!checkError && (!checkExisting || checkExisting.length === 0)) {
          // Also check against our local cache
          if (!existingIds.has(generatedId)) {
            return generatedId
          }
        }
        
        // If it exists, increment and try again
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate all required fields before submission
      const missingFields = []
      if (!formData.first_name?.trim()) missingFields.push('First Name')
      if (!formData.last_name?.trim()) missingFields.push('Last Name')
      if (!formData.date_of_birth) missingFields.push('Date of Birth')
      if (!formData.email?.trim()) missingFields.push('Email')
      if (!formData.major_id) missingFields.push('Major')
      if (!formData.study_type) missingFields.push('Study Type')
      if (!formData.study_load) missingFields.push('Study Load')
      if (!formData.study_approach) missingFields.push('Study Approach')
      if (!formData.enrollment_date) missingFields.push('Enrollment Date')
      
      // Check college selection for admin users
      if (userRole === 'admin' && !selectedCollegeId) {
        missingFields.push('College')
      }
      
      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`)
        setLoading(false)
        setCurrentStep(1) // Go back to first step to show missing fields
        return
      }

      // Use selected college ID for admin, or auto-fetched for college admin
      const finalCollegeId = userRole === 'admin' ? selectedCollegeId : collegeId
      
      if (!finalCollegeId) {
        throw new Error('College ID not found. Please select a college.')
      }

      // Generate student ID with retry logic for duplicate key errors
      let studentId = await generateStudentId(finalCollegeId)
      if (!studentId) {
        throw new Error('Failed to generate student ID')
      }

      // Construct name_en and name_ar from first/middle/last names
      const name_en = [formData.first_name, formData.middle_name, formData.last_name]
        .filter(Boolean).join(' ')
      const name_ar = [formData.first_name_ar, formData.middle_name_ar, formData.last_name_ar]
        .filter(Boolean).join(' ')

      // Retry logic for duplicate key errors
      let insertAttempts = 0
      const maxInsertAttempts = 5
      let insertSuccess = false
      let lastError = null

      while (insertAttempts < maxInsertAttempts && !insertSuccess) {
        const studentData = {
          student_id: studentId,
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name,
          name_en: name_en || formData.first_name + ' ' + formData.last_name,
          name_ar: name_ar || formData.first_name_ar + ' ' + formData.last_name_ar,
          first_name_ar: formData.first_name_ar || null,
          middle_name_ar: formData.middle_name_ar || null,
          last_name_ar: formData.last_name_ar || null,
          email: formData.email,
          phone: formData.phone || null,
          mobile_phone: formData.mobile_phone || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          nationality: formData.nationality || null,
          religion: formData.religion || null,
          marital_status: formData.marital_status || null,
          blood_type: formData.blood_type || null,
          is_international: formData.is_international,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          country: formData.country || null,
          postal_code: formData.postal_code || null,
          major_id: parseInt(formData.major_id), // Required - validated before submission
          college_id: finalCollegeId,
          enrollment_date: formData.enrollment_date,
          study_type: formData.study_type || null,
          study_load: formData.study_load || null,
          study_approach: formData.study_approach || null,
          credit_hours: formData.credit_hours ? parseInt(formData.credit_hours) : null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_relation: formData.emergency_contact_relation || null,
          emergency_phone: formData.emergency_phone || null,
          emergency_contact_email: formData.emergency_contact_email || null,
          national_id: formData.national_id || null,
          passport_number: formData.passport_number || null,
          passport_expiry: formData.passport_expiry || null,
          visa_number: formData.visa_number || null,
          visa_expiry: formData.visa_expiry || null,
          residence_permit_number: formData.residence_permit_number || null,
          residence_permit_expiry: formData.residence_permit_expiry || null,
          high_school_name: formData.high_school_name || null,
          high_school_country: formData.high_school_country || null,
          graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
          high_school_gpa: formData.high_school_gpa ? parseFloat(formData.high_school_gpa) : null,
          has_scholarship: formData.has_scholarship,
          scholarship_type: formData.scholarship_type || null,
          scholarship_percentage: formData.scholarship_percentage ? parseFloat(formData.scholarship_percentage) : null,
          medical_conditions: formData.medical_conditions || null,
          allergies: formData.allergies || null,
          medications: formData.medications || null,
          documents: formData.documents.length > 0 ? JSON.stringify(formData.documents.map(d => d.name)) : null,
          notes: formData.notes || null,
          status: 'active',
        }

        const { data, error: insertError } = await supabase
          .from('students')
          .insert(studentData)
          .select()
          .single()

        // Check if error is a duplicate key error
        if (insertError) {
          // If it's a duplicate key error (23505), generate a new ID and retry
          if (insertError.code === '23505' && insertError.message?.includes('student_id')) {
            console.warn(`Duplicate student_id detected: ${studentId}. Generating new ID...`)
            insertAttempts++
            // Generate a new student ID
            const newStudentId = await generateStudentId(finalCollegeId)
            if (newStudentId && newStudentId !== studentId) {
              studentId = newStudentId
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
          
          // Continue with the rest of the submission logic
          // Create auth user if password is provided
          if (formData.create_login_account && formData.login_password) {
            try {
              const { data: functionResult, error: functionError } = await createAuthUser({
                email: formData.email,
                password: formData.login_password,
                role: 'student',
                college_id: finalCollegeId,
                name: name_en,
              })

              if (functionError) {
                console.warn('Failed to create auth account:', functionError.message)
                // Continue anyway - student is created, just no login account
              } else if (functionResult?.success) {
                console.log('✅ Student login account created successfully')
              } else {
                console.warn('Failed to create auth account:', functionResult?.error)
              }
            } catch (err) {
              console.error('Error creating auth account:', err)
              // Continue anyway - student is created, just no login account
            }
          }

          // Upload documents if any
          if (formData.documents.length > 0) {
            // TODO: Implement file upload to Supabase Storage
            console.log('Documents to upload:', formData.documents)
          }

          // Navigate to students list on success
          navigate('/students')
          break // Exit retry loop
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
      setError(err.message || 'Failed to create student')
      console.error('Error creating student:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <EssentialInfoStep 
            formData={formData} 
            handleChange={handleChange} 
            majors={majors}
            userRole={userRole}
            colleges={colleges}
            selectedCollegeId={selectedCollegeId}
            setSelectedCollegeId={setSelectedCollegeId}
            setCollegeId={setCollegeId}
            fetchMajorsForCollege={fetchMajorsForCollege}
            collegeId={userRole === 'user' ? authCollegeId : collegeId}
          />
        )
      case 2:
        return <EmergencyContactStep formData={formData} handleChange={handleChange} />
      case 3:
        return <IdentityDocumentsStep formData={formData} handleChange={handleChange} />
      case 4:
        return <AcademicMedicalStep formData={formData} handleChange={handleChange} handleFileUpload={handleFileUpload} removeDocument={removeDocument} majors={majors} />
      case 5:
        return <ReviewStep formData={formData} majors={majors} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/students')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Students</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Student</h1>
          <p className="text-gray-600 mt-1">Step {currentStep} of {steps.length} • {steps[currentStep - 1].name}</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        isActive
                          ? 'bg-primary-gradient border-primary-600 text-white'
                          : isCompleted
                          ? 'bg-green-100 border-green-500 text-green-600'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      <StepIcon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs mt-2 font-medium ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Previous</span>
            </button>
            
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center space-x-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <span>Next</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" />
                <span>{loading ? 'Creating...' : 'Create Student'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// Step 1: Essential Info
function EssentialInfoStep({ 
  formData, 
  handleChange, 
  majors, 
  userRole, 
  colleges, 
  selectedCollegeId, 
  setSelectedCollegeId, 
  setCollegeId, 
  fetchMajorsForCollege,
  collegeId 
}) {
  return (
    <div className="space-y-8">
      {/* Personal Information */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
            <input
              type="text"
              value={formData.middle_name}
              onChange={(e) => handleChange('middle_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name (Arabic)</label>
            <input
              type="text"
              value={formData.first_name_ar}
              onChange={(e) => handleChange('first_name_ar', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name (Arabic)</label>
            <input
              type="text"
              value={formData.middle_name_ar}
              onChange={(e) => handleChange('middle_name_ar', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name (Arabic)</label>
            <input
              type="text"
              value={formData.last_name_ar}
              onChange={(e) => handleChange('last_name_ar', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
            <input
              type="text"
              value={formData.nationality}
              onChange={(e) => handleChange('nationality', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
            <input
              type="text"
              value={formData.religion}
              onChange={(e) => handleChange('religion', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
            <select
              value={formData.marital_status}
              onChange={(e) => handleChange('marital_status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Blood Type</label>
            <select
              value={formData.blood_type}
              onChange={(e) => handleChange('blood_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Blood Type</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              checked={formData.is_international}
              onChange={(e) => handleChange('is_international', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="ml-2 text-sm text-gray-700">International Student</label>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Phone</label>
            <input
              type="tel"
              value={formData.mobile_phone}
              onChange={(e) => handleChange('mobile_phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={(e) => handleChange('postal_code', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Academic Information */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Academic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userRole === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">College *</label>
              <select
                value={selectedCollegeId || ''}
                onChange={(e) => {
                  const collegeId = e.target.value ? parseInt(e.target.value) : null
                  setSelectedCollegeId(collegeId)
                  setCollegeId(collegeId)
                  // Clear major selection when college changes
                  handleChange('major_id', '')
                  // Refetch majors for the selected college
                  if (collegeId) {
                    fetchMajorsForCollege(collegeId)
                  }
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select College...</option>
                {colleges.map((college) => (
                  <option key={college.id} value={college.id}>
                    {college.name_en} ({college.code})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Major *</label>
            <select
              value={formData.major_id}
              onChange={(e) => handleChange('major_id', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Major...</option>
              {majors
                .filter(major => {
                  if (userRole === 'admin') {
                    return !selectedCollegeId || major.college_id === selectedCollegeId || major.is_university_wide
                  }
                  return !collegeId || major.college_id === collegeId || major.is_university_wide
                })
                .map(major => (
                  <option key={major.id} value={major.id}>{major.name_en} ({major.code})</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Study Type *</label>
            <select
              value={formData.study_type}
              onChange={(e) => handleChange('study_type', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Study Type</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Study Load *</label>
            <select
              value={formData.study_load}
              onChange={(e) => handleChange('study_load', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Study Load</option>
              <option value="light">Light</option>
              <option value="normal">Normal</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Study Approach *</label>
            <select
              value={formData.study_approach}
              onChange={(e) => handleChange('study_approach', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select Study Approach</option>
              <option value="on_campus">On Campus</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credit Hours</label>
            <input
              type="number"
              value={formData.credit_hours}
              onChange={(e) => handleChange('credit_hours', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment Date</label>
            <input
              type="date"
              value={formData.enrollment_date}
              onChange={(e) => handleChange('enrollment_date', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 2: Emergency Contact
function EmergencyContactStep({ formData, handleChange }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Emergency Contact</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
          <input
            type="text"
            value={formData.emergency_contact_name}
            onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Relation</label>
          <input
            type="text"
            value={formData.emergency_contact_relation}
            onChange={(e) => handleChange('emergency_contact_relation', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.emergency_phone}
            onChange={(e) => handleChange('emergency_phone', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={formData.emergency_contact_email}
            onChange={(e) => handleChange('emergency_contact_email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  )
}

// Step 3: Identity Documents
function IdentityDocumentsStep({ formData, handleChange }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Identity Documents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">National ID</label>
          <input
            type="text"
            value={formData.national_id}
            onChange={(e) => handleChange('national_id', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number</label>
          <input
            type="text"
            value={formData.passport_number}
            onChange={(e) => handleChange('passport_number', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Passport Expiry</label>
          <input
            type="date"
            value={formData.passport_expiry}
            onChange={(e) => handleChange('passport_expiry', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visa Number</label>
          <input
            type="text"
            value={formData.visa_number}
            onChange={(e) => handleChange('visa_number', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Visa Expiry</label>
          <input
            type="date"
            value={formData.visa_expiry}
            onChange={(e) => handleChange('visa_expiry', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Residence Permit Number</label>
          <input
            type="text"
            value={formData.residence_permit_number}
            onChange={(e) => handleChange('residence_permit_number', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Residence Permit Expiry</label>
          <input
            type="date"
            value={formData.residence_permit_expiry}
            onChange={(e) => handleChange('residence_permit_expiry', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  )
}

// Step 4: Academic & Medical
function AcademicMedicalStep({ formData, handleChange, handleFileUpload, removeDocument, majors }) {
  return (
    <div className="space-y-8">
      {/* Previous Education */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Previous Education</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">High School Name</label>
            <input
              type="text"
              value={formData.high_school_name}
              onChange={(e) => handleChange('high_school_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">High School Country</label>
            <input
              type="text"
              value={formData.high_school_country}
              onChange={(e) => handleChange('high_school_country', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
            <input
              type="number"
              value={formData.graduation_year}
              onChange={(e) => handleChange('graduation_year', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">High School GPA</label>
            <input
              type="number"
              step="0.01"
              value={formData.high_school_gpa}
              onChange={(e) => handleChange('high_school_gpa', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Scholarship Information */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Scholarship Information</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.has_scholarship}
              onChange={(e) => handleChange('has_scholarship', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="ml-2 text-sm text-gray-700">Has Scholarship</label>
          </div>
          {formData.has_scholarship && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scholarship Type</label>
                <input
                  type="text"
                  value={formData.scholarship_type}
                  onChange={(e) => handleChange('scholarship_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scholarship Percentage</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.scholarship_percentage}
                  onChange={(e) => handleChange('scholarship_percentage', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Medical Information */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Medical Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
            <textarea
              value={formData.medical_conditions}
              onChange={(e) => handleChange('medical_conditions', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
            <textarea
              value={formData.allergies}
              onChange={(e) => handleChange('allergies', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medications</label>
            <textarea
              value={formData.medications}
              onChange={(e) => handleChange('medications', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Documents Upload */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Documents Upload</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Documents</label>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Accepted formats: PDF, DOC, DOCX, JPG, PNG. Max size per file: 10MB
          </p>
        </div>
        {formData.documents.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Selected Documents</p>
            <div className="space-y-2">
              {formData.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{doc.name}</span>
                  <button
                    type="button"
                    onClick={() => removeDocument(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          {/* Login Account Creation */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={formData.create_login_account}
                onChange={(e) => handleChange('create_login_account', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Create login account for this student
              </label>
            </div>
            {formData.create_login_account && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Password *
                </label>
                <input
                  type="password"
                  value={formData.login_password}
                  onChange={(e) => handleChange('login_password', e.target.value)}
                  required={formData.create_login_account}
                  placeholder="Set a password for the student to log in"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The student will be able to log in at /login/student using their email and this password.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 5: Review
function ReviewStep({ formData, majors }) {
  const getMajorName = (id) => {
    const major = majors.find(m => m.id === parseInt(id))
    return major ? major.name_en : 'Not selected'
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Review Your Information</h2>
      <p className="text-gray-600 mb-6">Please review all information carefully before submitting. You can click Previous to go back to any section.</p>
      
      {/* Personal Information */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">First Name:</span>
            <span className="ml-2 text-gray-900">{formData.first_name || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">Last Name:</span>
            <span className="ml-2 text-gray-900">{formData.last_name || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">First Name (Arabic):</span>
            <span className="ml-2 text-gray-900">{formData.first_name_ar || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">Last Name (Arabic):</span>
            <span className="ml-2 text-gray-900">{formData.last_name_ar || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">Date of Birth:</span>
            <span className="ml-2 text-gray-900">
              {formData.date_of_birth ? new Date(formData.date_of_birth).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Gender:</span>
            <span className="ml-2 text-gray-900">{formData.gender || 'Not selected'}</span>
          </div>
          <div>
            <span className="text-gray-500">Marital Status:</span>
            <span className="ml-2 text-gray-900">{formData.marital_status || 'Not selected'}</span>
          </div>
          <div>
            <span className="text-gray-500">Blood Type:</span>
            <span className="ml-2 text-gray-900">{formData.blood_type || 'Not selected'}</span>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Email:</span>
            <span className="ml-2 text-gray-900">{formData.email || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Academic Information */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Academic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Major:</span>
            <span className="ml-2 text-gray-900">{getMajorName(formData.major_id)}</span>
          </div>
          <div>
            <span className="text-gray-500">Study Type:</span>
            <span className="ml-2 text-gray-900">{formData.study_type || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">Study Load:</span>
            <span className="ml-2 text-gray-900">{formData.study_load || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">Study Approach:</span>
            <span className="ml-2 text-gray-900">{formData.study_approach || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">Credit Hours:</span>
            <span className="ml-2 text-gray-900">{formData.credit_hours || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">Enrollment Date:</span>
            <span className="ml-2 text-gray-900">
              {formData.enrollment_date ? new Date(formData.enrollment_date).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Scholarship Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Scholarship Information</h3>
        <div className="text-sm">
          <div>
            <span className="text-gray-500">Has Scholarship:</span>
            <span className="ml-2 text-gray-900">{formData.has_scholarship ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

