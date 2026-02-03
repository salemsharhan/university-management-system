import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check, AlertCircle } from 'lucide-react'

export default function CreateAcademicYear() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(null)
  const [colleges, setColleges] = useState([])
  const [isUniversityWide, setIsUniversityWide] = useState(false)

  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    code: '',
    start_date: '',
    end_date: '',
    description: '',
    description_ar: '',
    college_id: null,
    is_university_wide: false,
    status: 'draft',
    registration_open: false,
    grade_entry_allowed: false,
    attendance_editing_allowed: false,
    financial_posting_allowed: false,
  })

  useEffect(() => {
    // Check if college ID is passed via URL parameter
    const urlCollegeId = searchParams.get('collegeId')
    if (urlCollegeId && userRole === 'admin') {
      const collegeIdInt = parseInt(urlCollegeId)
      setCollegeId(collegeIdInt)
      setFormData(prev => ({ ...prev, college_id: collegeIdInt, is_university_wide: false }))
      setIsUniversityWide(false)
    } else {
      fetchUserCollege()
    }
    
    if (userRole === 'admin') {
      fetchColleges()
    }
  }, [userRole, searchParams])

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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const autoGenerate = () => {
    if (formData.start_date && formData.end_date) {
      const startYear = new Date(formData.start_date).getFullYear()
      const endYear = new Date(formData.end_date).getFullYear()
      
      const generatedName = `Academic Year ${startYear}-${endYear}`
      const generatedCode = `${startYear}-${endYear}`
      
      setFormData(prev => ({
        ...prev,
        name_en: generatedName,
        code: generatedCode
      }))
    } else {
      setError(t('academic.academicYears.autoGenerateError'))
    }
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
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        code: formData.code,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
        status: formData.status,
        registration_open: formData.registration_open,
        grade_entry_allowed: formData.grade_entry_allowed,
        attendance_editing_allowed: formData.attendance_editing_allowed,
        financial_posting_allowed: formData.financial_posting_allowed,
        created_by: userEmail,
      }

      const { data, error: insertError } = await supabase
        .from('academic_years')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

      // University-wide: single record, no cloning. New colleges automatically see it via query filter.
      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/years')
      }, 2000)
    } catch (err) {
      setError(err.message || t('academic.academicYears.createdSuccess'))
      console.error('Error creating academic year:', err)
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
            <span>{t('academic.academicYears.back')}</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('academic.academicYears.createTitle')}</h1>
          <p className="text-gray-600 mt-1">{t('academic.academicYears.createSubtitle')}</p>
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
                <span>{t('academic.academicYears.createdSuccess')}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Scope Selection */}
              {userRole === 'admin' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <label className={`flex items-start ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'} cursor-pointer`}>
                    <input
                      type="checkbox"
                      checked={isUniversityWide}
                      onChange={(e) => {
                        setIsUniversityWide(e.target.checked)
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, college_id: null }))
                        } else {
                          setFormData(prev => ({ ...prev, college_id: collegeId }))
                        }
                      }}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {t('academic.academicYears.universityWide')}
                      </div>
                      <div className="text-xs text-gray-600">
                        {t('academic.academicYears.universityWideDesc')}
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* College Selection */}
              {userRole === 'admin' && !isUniversityWide && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.college')}</label>
                  <select
                    value={formData.college_id || ''}
                    onChange={(e) => handleChange('college_id', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: isRTL ? 'left 16px center' : 'right 16px center',
                      paddingRight: isRTL ? '16px' : '48px',
                      paddingLeft: isRTL ? '48px' : '16px'
                    }}
                  >
                    <option value="">{t('academic.academicYears.selectCollege')}</option>
                    {colleges.map(college => (
                      <option key={college.id} value={college.id}>{getLocalizedName(college, isRTL)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name (English) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('academic.academicYears.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nameEn"
                  value={formData.name_en}
                  onChange={(e) => handleChange('name_en', e.target.value)}
                  required
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('academic.academicYears.namePlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('academic.academicYears.nameHint')}</p>
              </div>

              {/* Name (Arabic) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.nameAr')}</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => handleChange('name_ar', e.target.value)}
                  dir="rtl"
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('academic.academicYears.nameArPlaceholder')}
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('academic.academicYears.code')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  required
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('academic.academicYears.codePlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('academic.academicYears.codeHint')}</p>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('academic.academicYears.startDate')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    required
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('academic.academicYears.endDate')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    required
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.initialStatus')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: isRTL ? 'left 16px center' : 'right 16px center',
                    paddingRight: isRTL ? '16px' : '48px',
                    paddingLeft: isRTL ? '48px' : '16px'
                  }}
                >
                  <option value="draft">{t('academic.academicYears.statusDraft')}</option>
                  <option value="scheduled">{t('academic.academicYears.statusScheduled')}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('academic.academicYears.initialStatusHint')}</p>
              </div>

              {/* Description (English) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.description')}</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                  placeholder={t('academic.academicYears.descriptionPlaceholder')}
                />
              </div>

              {/* Description (Arabic) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.descriptionAr')}</label>
                <textarea
                  rows="3"
                  value={formData.description_ar}
                  onChange={(e) => handleChange('description_ar', e.target.value)}
                  dir="rtl"
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                  placeholder={t('academic.academicYears.descriptionArPlaceholder')}
                />
              </div>

              {/* System Control Flags Section */}
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('academic.academicYears.initialSystemControlFlags')}</h2>
                <p className="text-sm text-gray-600 mb-6">{t('academic.academicYears.initialSystemControlFlagsDesc')}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <label className="flex justify-between items-center cursor-pointer">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{t('academic.academicYears.registrationOpen')}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{t('academic.academicYears.registrationOpenDesc')}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.registration_open}
                        onChange={(e) => handleChange('registration_open', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </label>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <label className="flex justify-between items-center cursor-pointer">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{t('academic.academicYears.gradeEntryAllowed')}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{t('academic.academicYears.gradeEntryAllowedDesc')}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.grade_entry_allowed}
                        onChange={(e) => handleChange('grade_entry_allowed', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </label>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <label className="flex justify-between items-center cursor-pointer">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{t('academic.academicYears.attendanceEditingAllowed')}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{t('academic.academicYears.attendanceEditingAllowedDesc')}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.attendance_editing_allowed}
                        onChange={(e) => handleChange('attendance_editing_allowed', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </label>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <label className="flex justify-between items-center cursor-pointer">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{t('academic.academicYears.financialPostingAllowed')}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{t('academic.academicYears.financialPostingAllowedDesc')}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.financial_posting_allowed}
                        onChange={(e) => handleChange('financial_posting_allowed', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Auto-generate Helper */}
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
                <div className={`flex items-start ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'}`}>
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-yellow-900 mb-1">{t('academic.academicYears.autoGenerateTitle')}</div>
                    <div className="text-xs text-yellow-700 mb-3">{t('academic.academicYears.autoGenerateDesc')}</div>
                    <button
                      type="button"
                      onClick={autoGenerate}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-xs font-medium hover:bg-yellow-700 transition-colors"
                    >
                      {t('academic.academicYears.autoGenerateNow')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className={`bg-white rounded-xl border-t border-gray-200 px-8 py-6 flex ${isRTL ? 'justify-start space-x-reverse' : 'justify-end'} space-x-4`}>
            <button
              type="button"
              onClick={() => navigate('/academic/years')}
              className="px-8 py-3.5 border border-gray-300 rounded-lg bg-white text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              {t('academic.academicYears.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-8 py-3.5 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Save className="w-4 h-4" />
              <span>{loading ? t('academic.academicYears.creating') : t('academic.academicYears.create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


