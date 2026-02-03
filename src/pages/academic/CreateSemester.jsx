import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { getSemesterCreditsFromUniversitySettings } from '../../utils/getCollegeSettings'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check, Plus, X } from 'lucide-react'

export default function CreateSemester() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId: authCollegeId } = useAuth() // Get collegeId from AuthContext
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(authCollegeId) // Initialize with authCollegeId
  const [colleges, setColleges] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [isUniversityWide, setIsUniversityWide] = useState(false)
  const [semesterCreditsFromUni, setSemesterCreditsFromUni] = useState({
    min_credit_hours: 12,
    max_credit_hours: 18,
    max_credit_hours_with_permission: 21,
    min_gpa_for_max_credits: 3.0,
  })

  const [formData, setFormData] = useState({
    academic_year_id: '',
    name_en: '',
    name_ar: '',
    code: '',
    academic_year_number: '',
    season: '',
    start_date: '',
    end_date: '',
    registration_start_date: '',
    registration_end_date: '',
    late_registration_end_date: '',
    add_deadline: '',
    drop_deadline: '',
    withdrawal_deadline: '',
    description: '',
    description_ar: '',
    college_id: null,
    is_university_wide: false,
    status: 'draft',
    course_registration_allowed: false,
    add_drop_allowed: false,
    withdrawal_allowed: false,
    grade_entry_allowed: false,
    attendance_editing_allowed: false,
    late_registration_allowed: false,
  })

  useEffect(() => {
    // Check if college ID is passed via URL parameter
    const urlCollegeId = searchParams.get('collegeId')
    if (urlCollegeId && userRole === 'admin') {
      const collegeIdInt = parseInt(urlCollegeId)
      setCollegeId(collegeIdInt)
      setFormData(prev => ({ ...prev, college_id: collegeIdInt, is_university_wide: false }))
      setIsUniversityWide(false)
    } else if (authCollegeId) {
      // Use collegeId from AuthContext if available
      setCollegeId(authCollegeId)
      setFormData(prev => ({ ...prev, college_id: authCollegeId }))
    } else if (userRole === 'user') {
      // For college admins, fetch college ID if not in auth context
      fetchUserCollege()
    }
    
    if (userRole === 'admin') {
      fetchColleges()
    }
  }, [userRole, searchParams, authCollegeId])

  useEffect(() => {
    // Fetch academic years whenever collegeId or isUniversityWide changes
    // Only fetch if:
    // 1. User is admin (can see all or selected college)
    // 2. User is college admin and collegeId is set
    // 3. University-wide mode is selected
    if (userRole === 'admin' || (userRole === 'user' && collegeId) || isUniversityWide) {
      fetchAcademicYears()
    }
  }, [collegeId, isUniversityWide, userRole])

  useEffect(() => {
    // Fetch semester credits from university settings (read-only, used for display and insert)
    const fetchCredits = async () => {
      const credits = await getSemesterCreditsFromUniversitySettings()
      setSemesterCreditsFromUni(credits)
    }
    fetchCredits()
  }, [])

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
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name_en, name_ar, code')
        .eq('status', 'active')
        .order('name_en')

      if (error) throw error
      setColleges(data || [])
    } catch (err) {
      console.error('Error fetching colleges:', err)
    }
  }

  const fetchAcademicYears = async () => {
    try {
      let query = supabase
        .from('academic_years')
        .select('id, name_en, name_ar, code, start_date, end_date')
        .order('start_date', { ascending: false })

      // For college admins (user role): show college's academic years OR university-wide
      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (isUniversityWide) {
        // University-wide: show only university-wide academic years
        query = query.eq('is_university_wide', true)
      } else if (collegeId && userRole === 'admin') {
        // For super admin with selected college: show college's academic years OR university-wide
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }
      // If no college selected and not university-wide, show all (for super admin)

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

  const autoGenerate = () => {
    if (!formData.academic_year_id || !formData.season) {
      alert(t('academic.semesters.autoGenerateError'))
      return
    }

    const selectedYear = academicYears.find(y => y.id === parseInt(formData.academic_year_id))
    if (!selectedYear) return

    const yearStart = new Date(selectedYear.start_date).getFullYear()
    const yearEnd = new Date(selectedYear.end_date).getFullYear()
    const seasonName = formData.season.charAt(0).toUpperCase() + formData.season.slice(1)
    
    // Generate name
    const collegeName = isUniversityWide ? '' : getLocalizedName(colleges.find(c => c.id === (formData.college_id || collegeId)), isRTL)
    const nameEn = `${seasonName} ${yearStart}-${yearEnd}${collegeName ? ` - ${collegeName}` : ''}`
    
    // Generate code
    const code = `${seasonName}${yearEnd}`

    setFormData(prev => ({
      ...prev,
      name_en: nameEn,
      code: code,
      academic_year_number: yearStart
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Get current user email for audit
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email || null

      const submitData = {
        academic_year_id: parseInt(formData.academic_year_id),
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        code: formData.code,
        academic_year_number: formData.academic_year_number ? parseInt(formData.academic_year_number) : null,
        season: formData.season || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        registration_start_date: formData.registration_start_date || null,
        registration_end_date: formData.registration_end_date || null,
        late_registration_end_date: formData.late_registration_end_date || null,
        add_deadline: formData.add_deadline || null,
        drop_deadline: formData.drop_deadline || null,
        withdrawal_deadline: formData.withdrawal_deadline || null,
        min_credit_hours: semesterCreditsFromUni.min_credit_hours,
        max_credit_hours: semesterCreditsFromUni.max_credit_hours,
        max_credit_hours_with_permission: semesterCreditsFromUni.max_credit_hours_with_permission,
        min_gpa_for_max_credits: semesterCreditsFromUni.min_gpa_for_max_credits,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
        status: formData.status || 'draft',
        course_registration_allowed: formData.course_registration_allowed || false,
        add_drop_allowed: formData.add_drop_allowed || false,
        withdrawal_allowed: formData.withdrawal_allowed || false,
        grade_entry_allowed: formData.grade_entry_allowed || false,
        attendance_editing_allowed: formData.attendance_editing_allowed || false,
        late_registration_allowed: formData.late_registration_allowed || false,
        created_by: userEmail,
      }

      const { data, error: insertError } = await supabase
        .from('semesters')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

      // University-wide: single record, no cloning. New colleges automatically see it via query filter.
      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/semesters')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to create semester')
      console.error('Error creating semester:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Navigation */}
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-500 hover:text-gray-900 mb-6 text-sm font-medium`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('academic.semesters.back')}</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('academic.semesters.createTitle')}</h1>
          <p className="text-sm text-gray-500">{t('academic.semesters.createSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className={`mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                <Check className="w-5 h-5" />
                <span>{t('academic.semesters.createdSuccess')}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Scope Selection */}
              {userRole === 'admin' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <label className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'} cursor-pointer`}>
                    <input
                      type="checkbox"
                      id="universityWide"
                      checked={isUniversityWide}
                      onChange={(e) => {
                        setIsUniversityWide(e.target.checked)
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, college_id: null }))
                          setCollegeId(null)
                        } else {
                          setFormData(prev => ({ ...prev, college_id: collegeId }))
                        }
                      }}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-900">{t('academic.semesters.universityWide')}</span>
                  </label>
                  <p className={`text-xs text-gray-500 mt-2 ${isRTL ? 'text-right' : 'text-left'} ${isRTL ? 'mr-7' : 'ml-7'}`}>
                    {t('academic.semesters.universityWideDesc')}
                  </p>
                </div>
              )}

              {/* College Selection */}
              {userRole === 'admin' && !isUniversityWide && (
                <div id="collegeSection">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('navigation.colleges')}</label>
                  <select
                    value={formData.college_id || ''}
                    onChange={(e) => {
                      const selectedCollegeId = e.target.value ? parseInt(e.target.value) : null
                      setCollegeId(selectedCollegeId)
                      handleChange('college_id', selectedCollegeId)
                    }}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{t('academic.semesters.selectCollege')}</option>
                    {colleges.map(college => (
                      <option key={college.id} value={college.id}>{getLocalizedName(college, isRTL)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Academic Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('academic.semesters.academicYear')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.academic_year_id}
                  onChange={(e) => handleChange('academic_year_id', e.target.value)}
                  required
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">{t('academic.semesters.selectAcademicYear')}</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>
                      {getLocalizedName(year, isRTL)} ({year.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.name')} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => handleChange('name_en', e.target.value)}
                    required
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Fall Semester 2024"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('academic.semesters.nameHint')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.nameAr')}</label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => handleChange('name_ar', e.target.value)}
                    dir="rtl"
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="الفصل الدراسي الأول 2024"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.code')} *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., FALL2024"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('academic.semesters.codeHint')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.numberYear')} *</label>
                  <input
                    type="number"
                    value={formData.academic_year_number}
                    onChange={(e) => handleChange('academic_year_number', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.season')} *</label>
                  <select
                    value={formData.season}
                    onChange={(e) => handleChange('season', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{t('academic.semesters.selectSeason')}</option>
                    <option value="fall">{t('academic.semesters.fall')}</option>
                    <option value="spring">{t('academic.semesters.spring')}</option>
                    <option value="summer">{t('academic.semesters.summer')}</option>
                    <option value="winter">{t('academic.semesters.winter')}</option>
                  </select>
                </div>
              </div>

              {/* Auto-generate Helper */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{t('academic.semesters.autoGenerateTitle')}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('academic.semesters.autoGenerateDesc')}</div>
                </div>
                <button
                  type="button"
                  onClick={autoGenerate}
                  className="px-5 py-2.5 bg-primary-gradient text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                >
                  {t('academic.semesters.autoGenerateNow')}
                </button>
              </div>

              {/* Semester Dates */}
              <h3 className="text-base font-semibold text-gray-900 mb-5 pt-6 border-t border-gray-200">{t('academic.semesters.semesterDates')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.startDate')} <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    required
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.endDate')} <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    required
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Registration Dates */}
              <h3 className="text-base font-semibold text-gray-900 mb-5 pt-6 border-t border-gray-200">{t('academic.semesters.registrationDates')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.registrationStart')}</label>
                    <input
                      type="date"
                      value={formData.registration_start_date}
                      onChange={(e) => handleChange('registration_start_date', e.target.value)}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.registrationEnd')}</label>
                    <input
                      type="date"
                      value={formData.registration_end_date}
                      onChange={(e) => handleChange('registration_end_date', e.target.value)}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.lateRegistrationEnd')}</label>
                  <input
                    type="date"
                    value={formData.late_registration_end_date}
                    onChange={(e) => handleChange('late_registration_end_date', e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

              {/* Academic Deadlines */}
              <h3 className="text-base font-semibold text-gray-900 mb-5 pt-6 border-t border-gray-200">{t('academic.semesters.academicDeadlines')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.addDeadline')}</label>
                  <input
                    type="date"
                    value={formData.add_deadline}
                    onChange={(e) => handleChange('add_deadline', e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.dropDeadline')}</label>
                  <input
                    type="date"
                    value={formData.drop_deadline}
                    onChange={(e) => handleChange('drop_deadline', e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.withdrawalDeadline')}</label>
                  <input
                    type="date"
                    value={formData.withdrawal_deadline}
                    onChange={(e) => handleChange('withdrawal_deadline', e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Credit Hours - Read-only from University Settings */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-base font-semibold text-gray-900 mb-5">{t('academic.semesters.creditHoursConfig')}</h3>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500 mb-4">{t('academic.semesters.creditHoursFromUniversitySettings') || 'Semester credit limits are configured in University Settings. These values are read-only.'}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{t('academic.semesters.minCredits')}</div>
                      <div className="text-sm font-medium text-gray-900">{semesterCreditsFromUni.min_credit_hours}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{t('academic.semesters.maxCredits')}</div>
                      <div className="text-sm font-medium text-gray-900">{semesterCreditsFromUni.max_credit_hours}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{t('academic.semesters.maxWithPermission')}</div>
                      <div className="text-sm font-medium text-gray-900">{semesterCreditsFromUni.max_credit_hours_with_permission}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{t('academic.semesters.minGpaForMax')}</div>
                      <div className="text-sm font-medium text-gray-900">{semesterCreditsFromUni.min_gpa_for_max_credits}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Status */}
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold text-gray-900 mb-5">{t('academic.semesters.initialStatus')}</h3>
                <div className={`flex ${isRTL ? 'space-x-reverse' : 'space-x-4'} gap-4`}>
                  <label className={`flex items-center gap-2 px-6 py-4 bg-gray-50 border-2 ${formData.status === 'draft' ? 'border-primary-500' : 'border-gray-200'} rounded-xl cursor-pointer`}>
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={formData.status === 'draft'}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm font-medium text-gray-900">{t('academic.semesters.statusDraft')}</span>
                  </label>
                  <label className={`flex items-center gap-2 px-6 py-4 bg-gray-50 border-2 ${formData.status === 'scheduled' ? 'border-primary-500' : 'border-gray-200'} rounded-xl cursor-pointer`}>
                    <input
                      type="radio"
                      name="status"
                      value="scheduled"
                      checked={formData.status === 'scheduled'}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm font-medium text-gray-900">{t('academic.semesters.statusScheduled')}</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">{t('academic.semesters.initialStatusHint')}</p>
              </div>

              {/* Initial Master Control Flags */}
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold text-gray-900 mb-5">{t('academic.semesters.initialMasterControlFlags')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer ${formData.course_registration_allowed ? 'ring-2 ring-primary-500' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.course_registration_allowed}
                      onChange={(e) => handleChange('course_registration_allowed', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t('academic.semesters.courseRegistrationAllowed')}</div>
                      <div className="text-xs text-gray-500">{t('academic.semesters.courseRegistrationAllowedDesc')}</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer ${formData.add_drop_allowed ? 'ring-2 ring-primary-500' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.add_drop_allowed}
                      onChange={(e) => handleChange('add_drop_allowed', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t('academic.semesters.addDropAllowed')}</div>
                      <div className="text-xs text-gray-500">{t('academic.semesters.addDropAllowedDesc')}</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer ${formData.withdrawal_allowed ? 'ring-2 ring-primary-500' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.withdrawal_allowed}
                      onChange={(e) => handleChange('withdrawal_allowed', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t('academic.semesters.withdrawalAllowed')}</div>
                      <div className="text-xs text-gray-500">{t('academic.semesters.withdrawalAllowedDesc')}</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer ${formData.grade_entry_allowed ? 'ring-2 ring-primary-500' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.grade_entry_allowed}
                      onChange={(e) => handleChange('grade_entry_allowed', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t('academic.semesters.gradeEntryAllowed')}</div>
                      <div className="text-xs text-gray-500">{t('academic.semesters.gradeEntryAllowedDesc')}</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer ${formData.attendance_editing_allowed ? 'ring-2 ring-primary-500' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.attendance_editing_allowed}
                      onChange={(e) => handleChange('attendance_editing_allowed', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t('academic.semesters.attendanceEditingAllowed')}</div>
                      <div className="text-xs text-gray-500">{t('academic.semesters.attendanceEditingAllowedDesc')}</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer ${formData.late_registration_allowed ? 'ring-2 ring-primary-500' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.late_registration_allowed}
                      onChange={(e) => handleChange('late_registration_allowed', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{t('academic.semesters.lateRegistrationAllowed')}</div>
                      <div className="text-xs text-gray-500">{t('academic.semesters.lateRegistrationAllowedDesc')}</div>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-3">{t('academic.semesters.initialMasterControlFlagsDesc')}</p>
              </div>

              {/* Description */}
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold text-gray-900 mb-5">{t('academic.semesters.description')}</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={t('academic.semesters.descriptionPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.descriptionAr')}</label>
                  <textarea
                    value={formData.description_ar}
                    onChange={(e) => handleChange('description_ar', e.target.value)}
                    rows={3}
                    dir="rtl"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="...معلومات إضافية عن هذا الفصل الدراسي"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className={`flex ${isRTL ? 'justify-start space-x-reverse space-x-4' : 'justify-end space-x-4'} pt-6 border-t border-gray-200`}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-7 py-3.5 border border-gray-200 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t('academic.semesters.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-7 py-3.5 bg-primary-gradient text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Save className="w-4 h-4" />
              <span>{loading ? t('academic.semesters.creating') : t('academic.semesters.create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


