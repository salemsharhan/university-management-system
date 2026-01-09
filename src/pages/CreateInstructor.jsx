import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { createAuthUser } from '../lib/createAuthUser'
import { ArrowLeft, ArrowRight, Save, User, GraduationCap, Briefcase, Award, Globe, Plus, X, Lock } from 'lucide-react'

export default function CreateInstructor() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId: authCollegeId } = useAuth()

  const steps = [
    { id: 1, name: t('createInstructor.personalInfo'), icon: User },
    { id: 2, name: t('createInstructor.contactLocation'), icon: Globe },
    { id: 3, name: t('createInstructor.education'), icon: GraduationCap },
    { id: 4, name: t('createInstructor.experienceSkills'), icon: Briefcase },
    { id: 5, name: t('createInstructor.academicAssignment'), icon: Award },
    { id: 6, name: t('createInstructor.reviewSubmit'), icon: Save },
  ]
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [departments, setDepartments] = useState([])
  const [colleges, setColleges] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [collegeId, setCollegeId] = useState(null)

  const [formData, setFormData] = useState({
    // Personal Information
    employee_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    first_name_ar: '',
    middle_name_ar: '',
    last_name_ar: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    national_id: '',
    passport_number: '',
    
    // Contact Information
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    postal_code: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    emergency_contact_email: '',
    
    // Academic Assignment
    college_id: null,
    department_id: '',
    academic_year_id: '',
    title: 'lecturer',
    specialization: '',
    office_location: '',
    office_hours: '',
    hire_date: '',
    status: 'active',
    
    // Education (JSONB array)
    education: [],
    
    // Work Experience (JSONB array)
    work_experience: [],
    
    // Publications (JSONB array)
    publications: [],
    
    // Certifications (JSONB array)
    certifications: [],
    
    // Languages (JSONB array)
    languages: [],
    
    // Additional
    research_interests: '',
    bio: '',
    bio_ar: '',
    photo: '',
    
    // Login Account (Optional)
    create_login_account: false,
    login_password: '',
  })

  useEffect(() => {
    // Check if college ID is passed via URL parameter
    const urlCollegeId = searchParams.get('collegeId')
    if (urlCollegeId && userRole === 'admin') {
      const collegeIdInt = parseInt(urlCollegeId)
      setCollegeId(collegeIdInt)
      setFormData(prev => ({ ...prev, college_id: collegeIdInt }))
    } else if (userRole === 'user' && authCollegeId) {
      // For college admins, use their college ID
      setCollegeId(authCollegeId)
      setFormData(prev => ({ ...prev, college_id: authCollegeId }))
    } else {
      fetchUserCollege()
    }
    
    fetchDepartments()
    fetchColleges() // Always fetch colleges - needed for display even for college admins
    fetchAcademicYears()
  }, [userRole, authCollegeId, searchParams])

  useEffect(() => {
    // Refetch departments when college changes
    if (formData.college_id || collegeId) {
      fetchDepartments()
    }
  }, [formData.college_id, collegeId])

  const fetchUserCollege = async () => {
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
        setFormData(prev => ({ ...prev, college_id: userData.college_id }))
      }
    } catch (err) {
      console.error('Error fetching college ID:', err)
    }
  }

  const fetchColleges = async () => {
    try {
      let query = supabase
        .from('colleges')
        .select('id, name_en, name_ar, code')
        .eq('status', 'active')
        .order('name_en')

      // For college admins, only fetch their college
      if (userRole === 'user' && authCollegeId) {
        query = query.eq('id', authCollegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setColleges(data || [])
    } catch (err) {
      console.error('Error fetching colleges:', err)
    }
  }

  const fetchDepartments = async () => {
    try {
      let query = supabase
        .from('departments')
        .select('id, name_en, code, college_id')
        .order('name_en', { ascending: true })

      // For college admins (user role), filter by their college or university-wide
      if (userRole === 'user' && authCollegeId) {
        query = query.or(`college_id.eq.${authCollegeId},is_university_wide.eq.true`)
      }
      // For super admins, filter by selected college if available
      else if (userRole === 'admin' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }
      // If no college filter, show all (only for super admin)

      const { data, error } = await query
      if (error) throw error
      setDepartments(data || [])
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const fetchAcademicYears = async () => {
    try {
      let query = supabase
        .from('academic_years')
        .select('id, name_en, code, start_date, end_date')
        .order('start_date', { ascending: false })

      // For college admins (user role), filter by their college or university-wide
      if (userRole === 'user' && authCollegeId) {
        query = query.or(`college_id.eq.${authCollegeId},is_university_wide.eq.true`)
      }
      // For super admins, filter by selected college if available
      else if (userRole === 'admin' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }
      // If no college filter, show all (only for super admin)

      const { data, error } = await query
      if (error) throw error
      setAcademicYears(data || [])
    } catch (err) {
      console.error('Error fetching academic years:', err)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, {
        degree: '',
        field: '',
        institution: '',
        country: '',
        graduation_year: '',
        gpa: '',
        honors: '',
      }]
    }))
  }

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }))
  }

  const updateEducation = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }))
  }

  const addWorkExperience = () => {
    setFormData(prev => ({
      ...prev,
      work_experience: [...prev.work_experience, {
        position: '',
        organization: '',
        start_date: '',
        end_date: '',
        current: false,
        description: '',
      }]
    }))
  }

  const removeWorkExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      work_experience: prev.work_experience.filter((_, i) => i !== index)
    }))
  }

  const updateWorkExperience = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      work_experience: prev.work_experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }))
  }

  const addLanguage = () => {
    setFormData(prev => ({
      ...prev,
      languages: [...prev.languages, { language: '', proficiency: '' }]
    }))
  }

  const removeLanguage = (index) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }))
  }

  const updateLanguage = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.map((lang, i) => 
        i === index ? { ...lang, [field]: value } : lang
      )
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const name_en = `${formData.first_name} ${formData.middle_name} ${formData.last_name}`.trim()
      const name_ar = `${formData.first_name_ar} ${formData.middle_name_ar} ${formData.last_name_ar}`.trim()

      const submitData = {
        employee_id: formData.employee_id,
        name_en,
        name_ar: name_ar || name_en,
        email: formData.email,
        phone: formData.phone,
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
        college_id: formData.college_id || collegeId,
        title: formData.title,
        specialization: formData.specialization || null,
        office_location: formData.office_location || null,
        office_hours: formData.office_hours || null,
        status: formData.status,
        hire_date: formData.hire_date || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        nationality: formData.nationality || null,
        national_id: formData.national_id || null,
        passport_number: formData.passport_number || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || null,
        postal_code: formData.postal_code || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_relation: formData.emergency_contact_relation || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        emergency_contact_email: formData.emergency_contact_email || null,
        academic_year_id: formData.academic_year_id ? parseInt(formData.academic_year_id) : null,
        education: formData.education.length > 0 ? formData.education : null,
        work_experience: formData.work_experience.length > 0 ? formData.work_experience : null,
        publications: formData.publications.length > 0 ? formData.publications : null,
        certifications: formData.certifications.length > 0 ? formData.certifications : null,
        languages: formData.languages.length > 0 ? formData.languages : null,
        research_interests: formData.research_interests || null,
        bio: formData.bio || null,
        bio_ar: formData.bio_ar || null,
        photo: formData.photo || null,
      }

      const { data, error: insertError } = await supabase
        .from('instructors')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

      // Create login account if requested
      if (formData.create_login_account && formData.login_password) {
        try {
          const instructorName = `${formData.first_name} ${formData.middle_name} ${formData.last_name}`.trim()
          
          const { data: functionResult, error: functionError } = await createAuthUser({
            email: formData.email,
            password: formData.login_password,
            role: 'instructor',
            college_id: data.college_id,
            name: instructorName,
          })

          if (functionError) {
            console.warn('Failed to create auth account:', functionError.message)
            // Continue anyway - instructor is created, just no login account
          } else if (functionResult?.success) {
            console.log('✅ Instructor login account created successfully')
          } else {
            console.warn('Failed to create auth account:', functionResult?.error)
          }
        } catch (authError) {
          console.error('Error creating auth account:', authError)
          // Continue anyway - instructor is created, just no login account
        }
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/instructors')
      }, 2000)
    } catch (err) {
      setError(err.message || t('createInstructor.createdSuccess'))
      console.error('Error creating instructor:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('createInstructor.personalInformation')}</h2>
            
            {userRole === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.college')} *</label>
                <select
                  value={formData.college_id || ''}
                  onChange={(e) => {
                    const collegeIdValue = e.target.value ? parseInt(e.target.value) : null
                    setCollegeId(collegeIdValue)
                    handleChange('college_id', collegeIdValue)
                    // Clear department selection when college changes
                    handleChange('department_id', '')
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">{t('createInstructor.selectCollege')}</option>
                  {colleges.map(college => (
                    <option key={college.id} value={college.id}>
                      {college.name_en} ({college.code})
                    </option>
                  ))}
                </select>
                {colleges.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">{t('createInstructor.loadingColleges')}</p>
                )}
              </div>
            )}

            {userRole === 'user' && authCollegeId && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{t('createInstructor.college')}:</strong> {colleges.find(c => c.id === authCollegeId)?.name_en || t('createInstructor.yourCollege')}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.employeeId')} *</label>
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={(e) => handleChange('employee_id', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('createInstructor.employeeIdPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.dateOfBirth')}</label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.firstNameEn')} *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.middleName')}</label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => handleChange('middle_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.lastNameEn')} *</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.firstNameAr')}</label>
                <input
                  type="text"
                  value={formData.first_name_ar}
                  onChange={(e) => handleChange('first_name_ar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.middleNameAr')}</label>
                <input
                  type="text"
                  value={formData.middle_name_ar}
                  onChange={(e) => handleChange('middle_name_ar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.lastNameAr')}</label>
                <input
                  type="text"
                  value={formData.last_name_ar}
                  onChange={(e) => handleChange('last_name_ar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.gender')}</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">{t('createInstructor.selectGender')}</option>
                  <option value="male">{t('createInstructor.male')}</option>
                  <option value="female">{t('createInstructor.female')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.nationality')}</label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => handleChange('nationality', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.nationalId')}</label>
                <input
                  type="text"
                  value={formData.national_id}
                  onChange={(e) => handleChange('national_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.passportNumber')}</label>
              <input
                type="text"
                value={formData.passport_number}
                onChange={(e) => handleChange('passport_number', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('createInstructor.contactLocation')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.email')} *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.phone')} *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.address')}</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.city')}</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.country')}</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.postalCode')}</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('createInstructor.emergencyContact')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.contactName')}</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.relation')}</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_relation}
                    onChange={(e) => handleChange('emergency_contact_relation', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.emergencyPhone')}</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.emergencyEmail')}</label>
                  <input
                    type="email"
                    value={formData.emergency_contact_email}
                    onChange={(e) => handleChange('emergency_contact_email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Education</h2>
              <button
                type="button"
                onClick={addEducation}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Education</span>
              </button>
            </div>

            {formData.education.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No education records added yet. Click "Add Education" to add one.</p>
            ) : (
              <div className="space-y-4">
                {formData.education.map((edu, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Education #{index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Degree *</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="e.g., Ph.D., Master's, Bachelor's"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
                        <input
                          type="text"
                          value={edu.field}
                          onChange={(e) => updateEducation(index, 'field', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="e.g., Computer Science"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Institution *</label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                        <input
                          type="text"
                          value={edu.country}
                          onChange={(e) => updateEducation(index, 'country', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
                        <input
                          type="number"
                          value={edu.graduation_year}
                          onChange={(e) => updateEducation(index, 'graduation_year', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="e.g., 2020"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">GPA</label>
                        <input
                          type="text"
                          value={edu.gpa}
                          onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="e.g., 3.8/4.0"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Honors/Awards</label>
                        <input
                          type="text"
                          value={edu.honors}
                          onChange={(e) => updateEducation(index, 'honors', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="e.g., Summa Cum Laude, Dean's List"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Work Experience</h2>
              <button
                type="button"
                onClick={addWorkExperience}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Experience</span>
              </button>
            </div>

            {formData.work_experience.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No work experience added yet. Click "Add Experience" to add one.</p>
            ) : (
              <div className="space-y-4">
                {formData.work_experience.map((exp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Experience #{index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeWorkExperience(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Position *</label>
                        <input
                          type="text"
                          value={exp.position}
                          onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Organization *</label>
                        <input
                          type="text"
                          value={exp.organization}
                          onChange={(e) => updateWorkExperience(index, 'organization', e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={exp.start_date}
                          onChange={(e) => updateWorkExperience(index, 'start_date', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                          type="date"
                          value={exp.end_date}
                          onChange={(e) => updateWorkExperience(index, 'end_date', e.target.value)}
                          disabled={exp.current}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={exp.current}
                          onChange={(e) => updateWorkExperience(index, 'current', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label className="text-sm font-medium text-gray-700">Current Position</label>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={exp.description}
                          onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages</h3>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Add languages spoken by the instructor</span>
                <button
                  type="button"
                  onClick={addLanguage}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Language</span>
                </button>
              </div>
              {formData.languages.length > 0 && (
                <div className="space-y-2">
                  {formData.languages.map((lang, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={lang.language}
                        onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                        placeholder="Language"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <select
                        value={lang.proficiency}
                        onChange={(e) => updateLanguage(index, 'proficiency', e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Proficiency</option>
                        <option value="native">Native</option>
                        <option value="fluent">Fluent</option>
                        <option value="advanced">Advanced</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="basic">Basic</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeLanguage(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Interests</h3>
              <textarea
                value={formData.research_interests}
                onChange={(e) => handleChange('research_interests', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe research interests and areas of expertise..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio (English)</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Brief biography..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio (Arabic)</label>
                <textarea
                  value={formData.bio_ar}
                  onChange={(e) => handleChange('bio_ar', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="سيرة ذاتية موجزة..."
                />
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Academic Assignment</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRole === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.college')} *</label>
                  <select
                    value={formData.college_id || ''}
                    onChange={(e) => {
                      const collegeIdValue = e.target.value ? parseInt(e.target.value) : null
                      setCollegeId(collegeIdValue)
                      handleChange('college_id', collegeIdValue)
                      // Clear department selection when college changes
                      handleChange('department_id', '')
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{t('createInstructor.selectCollege')}</option>
                    {colleges.map(college => (
                      <option key={college.id} value={college.id}>
                        {college.name_en} ({college.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {userRole === 'user' && authCollegeId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.college')}</label>
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {colleges.find(c => c.id === authCollegeId)?.name_en || t('createInstructor.yourCollege')}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('createInstructor.department')}</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => handleChange('department_id', e.target.value)}
                  disabled={!formData.college_id && !authCollegeId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{t('createInstructor.selectDepartment')}</option>
                  {departments
                    .filter(dept => {
                      const targetCollegeId = formData.college_id || authCollegeId
                      return !targetCollegeId || dept.college_id === targetCollegeId || dept.is_university_wide
                    })
                    .map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name_en} ({dept.code})</option>
                    ))}
                </select>
                {(!formData.college_id && !authCollegeId) && userRole === 'admin' && (
                  <p className="text-xs text-gray-500 mt-1">{t('createInstructor.selectCollegeFirst')}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                <select
                  value={formData.academic_year_id}
                  onChange={(e) => handleChange('academic_year_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select Academic Year...</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>{year.name_en} ({year.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <select
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="professor">Professor</option>
                  <option value="associate_professor">Associate Professor</option>
                  <option value="assistant_professor">Assistant Professor</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="teaching_assistant">Teaching Assistant</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => handleChange('specialization', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Computer Science, Mathematics"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Office Location</label>
                <input
                  type="text"
                  value={formData.office_location}
                  onChange={(e) => handleChange('office_location', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Building A, Room 201"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Office Hours</label>
                <input
                  type="text"
                  value={formData.office_hours}
                  onChange={(e) => handleChange('office_hours', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Mon-Wed 2:00 PM - 4:00 PM"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hire Date</label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleChange('hire_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
            </div>

            {/* Authentication Section */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Authentication</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="create_login_account"
                    checked={formData.create_login_account}
                    onChange={(e) => handleChange('create_login_account', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="create_login_account" className="text-sm font-medium text-gray-700">
                    Create login account for this instructor
                  </label>
                </div>
                {formData.create_login_account && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.login_password}
                      onChange={(e) => handleChange('login_password', e.target.value)}
                      placeholder="Enter password for login account"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required={formData.create_login_account}
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 6 characters. The instructor will use this password to log in.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Personal Information</h3>
                <p className="text-sm text-gray-600">
                  {formData.first_name} {formData.middle_name} {formData.last_name}
                </p>
                <p className="text-sm text-gray-600">Employee ID: {formData.employee_id}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
                <p className="text-sm text-gray-600">Email: {formData.email}</p>
                <p className="text-sm text-gray-600">Phone: {formData.phone}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Academic Assignment</h3>
                <p className="text-sm text-gray-600">
                  College: {colleges.find(c => c.id === formData.college_id)?.name_en || 'Not selected'}
                </p>
                <p className="text-sm text-gray-600">
                  Department: {departments.find(d => d.id === parseInt(formData.department_id))?.name_en || 'Not selected'}
                </p>
                <p className="text-sm text-gray-600">Title: {formData.title}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Education Records</h3>
                <p className="text-sm text-gray-600">{formData.education.length} record(s) added</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Work Experience</h3>
                <p className="text-sm text-gray-600">{formData.work_experience.length} record(s) added</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900 mb-4`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('createInstructor.back')}</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('createInstructor.title')}</h1>
          <p className="text-gray-600 mt-1">{t('createInstructor.subtitle')}</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'}`}>
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-primary-gradient text-white shadow-lg'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      <StepIcon className="w-6 h-6" />
                    </div>
                    <span className={`mt-2 text-xs font-medium ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className={`mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                <span>{t('createInstructor.createdSuccess')}</span>
              </div>
            )}

            {renderStepContent()}
          </div>

          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'justify-between'}`}>
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('createInstructor.previous')}</span>
            </button>
            
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
                className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all`}
              >
                <span>{t('createInstructor.next')}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Save className="w-5 h-5" />
                <span>{loading ? t('createInstructor.creating') : t('createInstructor.createButton')}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

