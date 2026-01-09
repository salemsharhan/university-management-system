import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Building2, Edit, Mail, Phone, Globe, MapPin, Calendar, Settings } from 'lucide-react'

export default function ViewCollege() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [college, setCollege] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCollege()
  }, [id])

  const fetchCollege = async () => {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCollege(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch college')
      console.error('Error fetching college:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !college) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/colleges')}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('colleges.back')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error || 'College not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/colleges')}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('colleges.back')}</span>
        </button>
        <button
          onClick={() => navigate(`/admin/colleges/${id}/edit`)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all`}
        >
          <Edit className="w-5 h-5" />
          <span>{t('colleges.edit')}</span>
        </button>
      </div>

      {/* College Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className={`flex items-start ${isRTL ? 'space-x-reverse space-x-6' : 'space-x-6'}`}>
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: college.primary_color || '#952562' }}
          >
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{college.name_en}</h1>
            {college.name_ar && (
              <p className="text-xl text-gray-600 mt-1">{college.name_ar}</p>
            )}
            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'} mt-4`}>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                {t('colleges.prefix')}: {college.code}
              </span>
              {college.abbreviation && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                  {college.abbreviation}
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  college.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {college.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('colleges.contactInfo')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {college.official_email && (
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'}`}>
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">{t('colleges.email')}</p>
                <p className="text-gray-900">{college.official_email}</p>
              </div>
            </div>
          )}
          {college.phone_number && (
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'}`}>
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">{t('colleges.phone')}</p>
                <p className="text-gray-900">{college.phone_number}</p>
              </div>
            </div>
          )}
          {college.website_url && (
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'}`}>
              <Globe className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">{t('colleges.website')}</p>
                <a
                  href={college.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  {college.website_url}
                </a>
              </div>
            </div>
          )}
          {college.address_en && (
            <div className={`flex items-start ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'}`}>
              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">{t('colleges.addressEn')}</p>
                <p className="text-gray-900">{college.address_en}</p>
              </div>
            </div>
          )}
          {college.address_ar && (
            <div className={`flex items-start ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'}`}>
              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">{t('colleges.addressAr')}</p>
                <p className="text-gray-900">{college.address_ar}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ID Configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('colleges.idConfiguration')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('colleges.studentId')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('colleges.prefix')}:</span>
                <span className="text-sm font-medium text-gray-900">{college.student_id_prefix || 'STU'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('colleges.format')}:</span>
                <span className="text-sm font-medium text-gray-900">{college.student_id_format || '{prefix}{year}{sequence:D4}'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('colleges.startingNumber')}:</span>
                <span className="text-sm font-medium text-gray-900">{college.student_id_starting_number || 1}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('colleges.instructorId')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('colleges.prefix')}:</span>
                <span className="text-sm font-medium text-gray-900">{college.instructor_id_prefix || 'INS'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('colleges.format')}:</span>
                <span className="text-sm font-medium text-gray-900">{college.instructor_id_format || '{prefix}{year}{sequence:D4}'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('colleges.startingNumber')}:</span>
                <span className="text-sm font-medium text-gray-900">{college.instructor_id_starting_number || 1}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
          <Settings className="w-5 h-5" />
          <span>{t('colleges.settingsOverview')}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700">{t('colleges.academicSettings')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {college.academic_settings ? t('colleges.configured') : t('colleges.notConfigured')}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700">{t('colleges.financialSettings')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {college.financial_settings ? t('colleges.configured') : t('colleges.notConfigured')}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700">{t('colleges.emailSettings')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {college.email_settings ? t('colleges.configured') : t('colleges.notConfigured')}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700">{t('colleges.onboardingSettings')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {college.onboarding_settings ? t('colleges.configured') : t('colleges.notConfigured')}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700">{t('colleges.systemSettings')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {college.system_settings ? t('colleges.configured') : t('colleges.notConfigured')}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700">{t('colleges.examinationSettings')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {college.examination_settings ? t('colleges.configured') : t('colleges.notConfigured')}
            </p>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
          <Calendar className="w-5 h-5" />
          <span>{t('colleges.metadata')}</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">{t('colleges.createdAt')}</p>
            <p className="text-gray-900">
              {new Date(college.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('colleges.updatedAt')}</p>
            <p className="text-gray-900">
              {new Date(college.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}




