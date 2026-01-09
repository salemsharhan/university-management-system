import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit, Calendar, Trash2 } from 'lucide-react'

export default function ViewSemester() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [semester, setSemester] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchSemester()
  }, [id])

  const fetchSemester = async () => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*, academic_years(name_en, code), colleges(id, name_en, code)')
        .eq('id', id)
        .single()

      if (error) throw error
      setSemester(data)
    } catch (err) {
      console.error('Error fetching semester:', err)
      setError(err.message || 'Failed to load semester')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('common.confirm'))) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', id)

      if (error) throw error
      navigate('/academic/semesters')
    } catch (err) {
      console.error('Error deleting semester:', err)
      setError(err.message || 'Failed to delete semester')
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

  if (error && !semester) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('academic.semesters.back')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('academic.semesters.back')}</span>
        </button>
        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
          <button
            onClick={() => navigate(`/academic/semesters/${id}/edit`)}
            className="flex items-center space-x-2 bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
          >
            <Edit className="w-4 h-4" />
            <span>{t('academic.semesters.edit')}</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? t('academic.semesters.deleting') : t('academic.semesters.delete')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'} mb-6`}>
          <div className="w-16 h-16 bg-primary-gradient rounded-xl flex items-center justify-center">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{semester?.name_en}</h1>
            <p className="text-gray-600">{semester?.code}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.name')} (English)</label>
              <p className="text-lg text-gray-900 mt-1">{semester?.name_en}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.nameAr')}</label>
              <p className="text-lg text-gray-900 mt-1">{semester?.name_ar || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.code')}</label>
              <p className="text-lg text-gray-900 mt-1">{semester?.code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.academicYear')}</label>
              <p className="text-lg text-gray-900 mt-1">
                {semester?.academic_years?.name_en} ({semester?.academic_years?.code})
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.season')}</label>
              <p className="text-lg text-gray-900 mt-1 capitalize">{semester?.season || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.status')}</label>
              <p className="text-lg text-gray-900 mt-1 capitalize">{semester?.status || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.startDate')}</label>
              <p className="text-lg text-gray-900 mt-1">
                {semester?.start_date ? new Date(semester.start_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.endDate')}</label>
              <p className="text-lg text-gray-900 mt-1">
                {semester?.end_date ? new Date(semester.end_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.registrationStart')}</label>
              <p className="text-lg text-gray-900 mt-1">
                {semester?.registration_start_date ? new Date(semester.registration_start_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.registrationEnd')}</label>
              <p className="text-lg text-gray-900 mt-1">
                {semester?.registration_end_date ? new Date(semester.registration_end_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.lateRegistrationEnd')}</label>
              <p className="text-lg text-gray-900 mt-1">
                {semester?.late_registration_end_date ? new Date(semester.late_registration_end_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.scope')}</label>
              <p className="text-lg text-gray-900 mt-1">
                {semester?.is_university_wide ? (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {t('academic.semesters.universityWide')}
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                    {t('academic.semesters.collegeSpecific')}
                  </span>
                )}
              </p>
            </div>
            {!semester?.is_university_wide && semester?.colleges && (
              <div>
                <label className="text-sm font-medium text-gray-500">{t('navigation.colleges')}</label>
                <p className="text-lg text-gray-900 mt-1">
                  {semester.colleges.name_en} ({semester.colleges.code})
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.numberYear')}</label>
              <p className="text-lg text-gray-900 mt-1">{semester?.academic_year_number || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Academic Deadlines */}
        {(semester?.add_deadline || semester?.drop_deadline || semester?.withdrawal_deadline) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.semesters.academicDeadlines')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {semester?.add_deadline && (
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('academic.semesters.addDeadline')}</label>
                  <p className="text-lg text-gray-900 mt-1">
                    {new Date(semester.add_deadline).toLocaleDateString()}
                  </p>
                </div>
              )}
              {semester?.drop_deadline && (
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('academic.semesters.dropDeadline')}</label>
                  <p className="text-lg text-gray-900 mt-1">
                    {new Date(semester.drop_deadline).toLocaleDateString()}
                  </p>
                </div>
              )}
              {semester?.withdrawal_deadline && (
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('academic.semesters.withdrawalDeadline')}</label>
                  <p className="text-lg text-gray-900 mt-1">
                    {new Date(semester.withdrawal_deadline).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.semesters.creditHoursConfig')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.minCredits')}</label>
              <p className="text-lg text-gray-900 mt-1">{semester?.min_credit_hours || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.maxCredits')}</label>
              <p className="text-lg text-gray-900 mt-1">{semester?.max_credit_hours || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.maxWithPermission')}</label>
              <p className="text-lg text-gray-900 mt-1">{semester?.max_credit_hours_with_permission || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">{t('academic.semesters.minGpaForMax')}</label>
              <p className="text-lg text-gray-900 mt-1">{semester?.min_gpa_for_max_credits || 'N/A'}</p>
            </div>
          </div>
        </div>

        {(semester?.description || semester?.description_ar) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.semesters.description')}</h3>
            {semester?.description && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">English</label>
                <p className="text-gray-700 mt-1">{semester.description}</p>
              </div>
            )}
            {semester?.description_ar && (
              <div>
                <label className="text-sm font-medium text-gray-500">Arabic</label>
                <p className="text-gray-700 mt-1">{semester.description_ar}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}



