import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
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
    min_credit_hours: 12,
    max_credit_hours: 18,
    max_credit_hours_with_permission: 21,
    min_gpa_for_max_credits: 3.0,
    description: '',
    description_ar: '',
    college_id: null,
    is_university_wide: false,
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
        .select('id, name_en, code')
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
        .select('id, name_en, code, start_date, end_date')
        .order('start_date', { ascending: false })

      // For college admins (user role), ONLY show their college's academic years (exclude university-wide)
      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId).eq('is_university_wide', false)
      } else if (isUniversityWide) {
        // University-wide: show only university-wide academic years
        query = query.eq('is_university_wide', true)
      } else if (collegeId && userRole === 'admin') {
        // For super admin with selected college: show ONLY that college's academic years (not university-wide)
        query = query.eq('college_id', collegeId).eq('is_university_wide', false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
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
        min_credit_hours: parseInt(formData.min_credit_hours) || 12,
        max_credit_hours: parseInt(formData.max_credit_hours) || 18,
        max_credit_hours_with_permission: parseInt(formData.max_credit_hours_with_permission) || 21,
        min_gpa_for_max_credits: parseFloat(formData.min_gpa_for_max_credits) || 3.0,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
      }

      const { data, error: insertError } = await supabase
        .from('semesters')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900 mb-4`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('academic.semesters.back')}</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('academic.semesters.createTitle')}</h1>
          <p className="text-gray-600 mt-1">{t('academic.semesters.createSubtitle')}</p>
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
                <Check className="w-5 h-5" />
                <span>{t('academic.semesters.createdSuccess')}</span>
              </div>
            )}

            <div className="space-y-6">
              {userRole === 'admin' && (
                <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} p-4 bg-gray-50 rounded-lg`}>
                  <input
                    type="checkbox"
                    checked={isUniversityWide}
                    onChange={(e) => {
                      setIsUniversityWide(e.target.checked)
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, college_id: null }))
                        setCollegeId(null) // Clear collegeId for university-wide
                      } else {
                        setFormData(prev => ({ ...prev, college_id: collegeId }))
                        // collegeId remains the same, useEffect will handle fetchAcademicYears
                      }
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    {t('academic.semesters.universityWide')}
                  </label>
                </div>
              )}

              {userRole === 'admin' && !isUniversityWide && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('navigation.colleges')}</label>
                  <select
                    value={formData.college_id || ''}
                    onChange={(e) => {
                      const selectedCollegeId = e.target.value ? parseInt(e.target.value) : null
                      setCollegeId(selectedCollegeId) // Update collegeId state first
                      handleChange('college_id', selectedCollegeId)
                      // fetchAcademicYears will be called automatically by useEffect when collegeId changes
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{t('academic.semesters.selectCollege')}</option>
                    {colleges.map(college => (
                      <option key={college.id} value={college.id}>{college.name_en}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.academicYear')} *</label>
                <select
                  value={formData.academic_year_id}
                  onChange={(e) => handleChange('academic_year_id', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">{t('academic.semesters.selectAcademicYear')}</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>
                      {year.name_en} ({year.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{/* helper text intentionally left generic */}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.name')} *</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => handleChange('name_en', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Fall Semester 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.nameAr')}</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => handleChange('name_ar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="الفصل الدراسي الأول 2024"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <p className="text-xs text-gray-500 mt-1"></p>
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
                  <p className="text-xs text-gray-500 mt-1"></p>
                </div>
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
                <p className="text-xs text-gray-500 mt-1"></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.startDate')} *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.endDate')} *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.semesters.registrationDates')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.registrationStart')}</label>
                    <input
                      type="date"
                      value={formData.registration_start_date}
                      onChange={(e) => handleChange('registration_start_date', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.registrationEnd')}</label>
                    <input
                      type="date"
                      value={formData.registration_end_date}
                      onChange={(e) => handleChange('registration_end_date', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.lateRegistrationEnd')}</label>
                    <input
                      type="date"
                      value={formData.late_registration_end_date}
                      onChange={(e) => handleChange('late_registration_end_date', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.semesters.academicDeadlines')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.addDeadline')}</label>
                    <input
                      type="date"
                      value={formData.add_deadline}
                      onChange={(e) => handleChange('add_deadline', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.dropDeadline')}</label>
                    <input
                      type="date"
                      value={formData.drop_deadline}
                      onChange={(e) => handleChange('drop_deadline', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.withdrawalDeadline')}</label>
                    <input
                      type="date"
                      value={formData.withdrawal_deadline}
                      onChange={(e) => handleChange('withdrawal_deadline', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.semesters.creditHoursConfig')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.minCredits')}</label>
                    <input
                      type="number"
                      value={formData.min_credit_hours}
                      onChange={(e) => handleChange('min_credit_hours', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.maxCredits')}</label>
                    <input
                      type="number"
                      value={formData.max_credit_hours}
                      onChange={(e) => handleChange('max_credit_hours', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.maxWithPermission')}</label>
                    <input
                      type="number"
                      value={formData.max_credit_hours_with_permission}
                      onChange={(e) => handleChange('max_credit_hours_with_permission', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.minGpaForMax')}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.min_gpa_for_max_credits}
                      onChange={(e) => handleChange('min_gpa_for_max_credits', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1"></p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Additional information about this semester..."
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.semesters.descriptionAr')}</label>
                  <textarea
                    value={formData.description_ar}
                    onChange={(e) => handleChange('description_ar', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="معلومات إضافية عن هذا الفصل الدراسي..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`flex ${isRTL ? 'justify-start space-x-reverse space-x-4' : 'justify-end space-x-4'}`}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('academic.semesters.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Save className="w-5 h-5" />
              <span>{loading ? t('academic.semesters.creating') : t('academic.semesters.create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


