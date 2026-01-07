import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, ArrowRight, Save, User, Phone, FileText, GraduationCap, Check } from 'lucide-react'

const steps = [
  { id: 1, name: 'Essential Info', icon: User },
  { id: 2, name: 'Emergency Contact', icon: Phone },
  { id: 3, name: 'Identity Documents', icon: FileText },
  { id: 4, name: 'Academic & Medical', icon: GraduationCap },
]

export default function EditStudent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
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
    
    // Additional
    notes: '',
    status: 'active',
  })

  const fetchMajors = async () => {
    try {
      let query = supabase
        .from('majors')
        .select('id, name_en, code, college_id, is_university_wide')
        .eq('status', 'active')
        .order('name_en')
      
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

  const fetchStudent = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        first_name: data.first_name || '',
        middle_name: data.middle_name || '',
        last_name: data.last_name || '',
        first_name_ar: data.first_name_ar || '',
        middle_name_ar: data.middle_name_ar || '',
        last_name_ar: data.last_name_ar || '',
        date_of_birth: data.date_of_birth || '',
        gender: data.gender || '',
        nationality: data.nationality || '',
        religion: data.religion || '',
        marital_status: data.marital_status || '',
        blood_type: data.blood_type || '',
        is_international: data.is_international || false,
        email: data.email || '',
        phone: data.phone || '',
        mobile_phone: data.mobile_phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        postal_code: data.postal_code || '',
        major_id: data.major_id ? String(data.major_id) : '',
        study_type: data.study_type || '',
        study_load: data.study_load || '',
        study_approach: data.study_approach || '',
        credit_hours: data.credit_hours ? String(data.credit_hours) : '',
        enrollment_date: data.enrollment_date || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_relation: data.emergency_contact_relation || '',
        emergency_phone: data.emergency_phone || '',
        emergency_contact_email: data.emergency_contact_email || '',
        national_id: data.national_id || '',
        passport_number: data.passport_number || '',
        passport_expiry: data.passport_expiry || '',
        visa_number: data.visa_number || '',
        visa_expiry: data.visa_expiry || '',
        residence_permit_number: data.residence_permit_number || '',
        residence_permit_expiry: data.residence_permit_expiry || '',
        high_school_name: data.high_school_name || '',
        high_school_country: data.high_school_country || '',
        graduation_year: data.graduation_year ? String(data.graduation_year) : '',
        high_school_gpa: data.high_school_gpa ? String(data.high_school_gpa) : '',
        has_scholarship: data.has_scholarship || false,
        scholarship_type: data.scholarship_type || '',
        scholarship_percentage: data.scholarship_percentage ? String(data.scholarship_percentage) : '',
        medical_conditions: data.medical_conditions || '',
        allergies: data.allergies || '',
        medications: data.medications || '',
        notes: data.notes || '',
        status: data.status || 'active',
      })

      if (data.college_id) {
        setCollegeId(data.college_id)
        setSelectedCollegeId(data.college_id)
        if (userRole === 'admin') {
          await fetchMajorsForCollege(data.college_id)
        }
      }
    } catch (err) {
      console.error('Error fetching student:', err)
      setError(err.message || 'Failed to load student')
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      if (userRole === 'admin') {
        await fetchColleges()
      }
      await fetchStudent()
      await fetchMajors()
    }
    
    initializeData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userRole])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) {
      setError('')
    }
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
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
      setError('')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const name_en = [formData.first_name, formData.middle_name, formData.last_name]
        .filter(Boolean).join(' ')
      const name_ar = [formData.first_name_ar, formData.middle_name_ar, formData.last_name_ar]
        .filter(Boolean).join(' ')

      const submitData = {
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
        major_id: formData.major_id ? parseInt(formData.major_id) : null,
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
        notes: formData.notes || null,
        status: formData.status,
      }

      // Update college_id if admin changed it
      if (userRole === 'admin' && selectedCollegeId) {
        submitData.college_id = selectedCollegeId
      }

      const { error: updateError } = await supabase
        .from('students')
        .update(submitData)
        .eq('id', id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        navigate('/students')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to update student')
      console.error('Error updating student:', err)
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
            collegeId={collegeId}
          />
        )
      case 2:
        return <EmergencyContactStep formData={formData} handleChange={handleChange} />
      case 3:
        return <IdentityDocumentsStep formData={formData} handleChange={handleChange} />
      case 4:
        return <AcademicMedicalStep formData={formData} handleChange={handleChange} />
      default:
        return null
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Student</h1>
        <p className="text-gray-600">Step {currentStep} of {steps.length} • {steps[currentStep - 1].name}</p>
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
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center space-x-2">
              <Check className="w-5 h-5" />
              <span>Student updated successfully! Redirecting...</span>
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
              <Save className="w-5 h-5" />
              <span>{loading ? 'Updating...' : 'Update Student'}</span>
            </button>
          )}
        </div>
      </form>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">College</label>
              <select
                value={selectedCollegeId || ''}
                onChange={(e) => {
                  const collegeId = e.target.value ? parseInt(e.target.value) : null
                  setSelectedCollegeId(collegeId)
                  setCollegeId(collegeId)
                  handleChange('major_id', '')
                  if (collegeId) {
                    fetchMajorsForCollege(collegeId)
                  }
                }}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment Date *</label>
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
function AcademicMedicalStep({ formData, handleChange }) {
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
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.status === 'active'}
              onChange={(e) => handleChange('status', e.target.checked ? 'active' : 'inactive')}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-sm font-medium text-gray-700">Active</label>
          </div>
        </div>
      </div>
    </div>
  )
}
