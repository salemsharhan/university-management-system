import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check } from 'lucide-react'

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
        .select('id, name_en, code')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
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
      }

      const { data, error: insertError } = await supabase
        .from('academic_years')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

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
              {userRole === 'admin' && (
                <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} p-4 bg-gray-50 rounded-lg`}>
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
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    {t('academic.academicYears.universityWide')}
                  </label>
                </div>
              )}

              {userRole === 'admin' && !isUniversityWide && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.college')}</label>
                  <select
                    value={formData.college_id || ''}
                    onChange={(e) => handleChange('college_id', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{t('academic.academicYears.selectCollege')}</option>
                    {colleges.map(college => (
                      <option key={college.id} value={college.id}>{college.name_en}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.name')} *</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => handleChange('name_en', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('academic.academicYears.namePlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('academic.academicYears.nameHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.nameAr')}</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => handleChange('name_ar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('academic.academicYears.nameArPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.code')} *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('academic.academicYears.codePlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('academic.academicYears.codeHint')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.startDate')} *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.endDate')} *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('academic.academicYears.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('academic.academicYears.descriptionAr')}</label>
                <textarea
                  value={formData.description_ar}
                  onChange={(e) => handleChange('description_ar', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('academic.academicYears.descriptionArPlaceholder')}
                />
              </div>
            </div>
          </div>

          <div className={`flex ${isRTL ? 'justify-start space-x-reverse' : 'justify-end'} space-x-4`}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('academic.academicYears.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Save className="w-5 h-5" />
              <span>{loading ? t('academic.academicYears.creating') : t('academic.academicYears.create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


