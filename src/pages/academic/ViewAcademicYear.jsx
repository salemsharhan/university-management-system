import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit, CalendarDays, Trash2 } from 'lucide-react'

export default function ViewAcademicYear() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [academicYear, setAcademicYear] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchAcademicYear()
  }, [id])

  const fetchAcademicYear = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setAcademicYear(data)
    } catch (err) {
      console.error('Error fetching academic year:', err)
      setError(err.message || 'Failed to load academic year')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('academicYears.deleteConfirm'))) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .eq('id', id)

      if (error) throw error
      navigate('/academic/years')
    } catch (err) {
      console.error('Error deleting academic year:', err)
      setError(err.message || 'Failed to delete academic year')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !academicYear) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('academicYears.back')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'}`}>
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('academicYears.back')}</span>
        </button>
        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : 'space-x-3'}`}>
          <button
            onClick={() => navigate(`/academic/years/${id}/edit`)}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all`}
          >
            <Edit className="w-4 h-4" />
            <span>{t('common.edit')}</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? t('academicYears.deleting') : t('academicYears.delete')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-4'} mb-6`}>
          <div className="w-16 h-16 bg-primary-gradient rounded-xl flex items-center justify-center">
            <CalendarDays className="w-8 h-8 text-white" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{academicYear?.name_en}</h1>
            <p className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{academicYear?.code}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.nameEn')}</label>
              <p className={`text-lg text-gray-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{academicYear?.name_en}</p>
            </div>
            <div>
              <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.nameAr')}</label>
              <p className={`text-lg text-gray-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{academicYear?.name_ar || t('common.noData')}</p>
            </div>
            <div>
              <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.code')}</label>
              <p className={`text-lg text-gray-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{academicYear?.code}</p>
            </div>
            <div>
              <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.status')}</label>
              <p className={`text-lg text-gray-900 mt-1 capitalize ${isRTL ? 'text-right' : 'text-left'}`}>{academicYear?.status || t('common.noData')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.startDate')}</label>
              <p className={`text-lg text-gray-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {academicYear?.start_date ? new Date(academicYear.start_date).toLocaleDateString() : t('common.noData')}
              </p>
            </div>
            <div>
              <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.endDate')}</label>
              <p className={`text-lg text-gray-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {academicYear?.end_date ? new Date(academicYear.end_date).toLocaleDateString() : t('common.noData')}
              </p>
            </div>
            <div>
              <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.isCurrent')}</label>
              <p className={`text-lg text-gray-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {academicYear?.is_current ? t('common.yes') : t('common.no')}
              </p>
            </div>
            <div>
              <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.scope')}</label>
              <p className={`text-lg text-gray-900 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {academicYear?.is_university_wide ? (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {t('academicYears.universityWideLabel')}
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                    {t('academicYears.collegeSpecific')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {(academicYear?.description || academicYear?.description_ar) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.description')}</h3>
            {academicYear?.description && (
              <div className="mb-4">
                <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.description')} (English)</label>
                <p className={`text-gray-700 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{academicYear.description}</p>
              </div>
            )}
            {academicYear?.description_ar && (
              <div>
                <label className={`text-sm font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('academicYears.descriptionAr')}</label>
                <p className={`text-gray-700 mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir="rtl">{academicYear.description_ar}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}



