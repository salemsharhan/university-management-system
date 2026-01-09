import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit, BookMarked, Trash2 } from 'lucide-react'

export default function ViewMajor() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [major, setMajor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMajor()
  }, [id])

  const fetchMajor = async () => {
    try {
      const { data, error } = await supabase
        .from('majors')
        .select('*, departments(id, name_en, code), instructors:head_of_major_id(id, name_en, email, phone, title), colleges(id, name_en, code)')
        .eq('id', id)
        .single()

      if (error) throw error
      setMajor(data)
    } catch (err) {
      console.error('Error fetching major:', err)
      setError(err.message || 'Failed to load major')
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

  if (error && !major) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
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
            onClick={() => navigate(`/academic/majors/${id}/edit`)}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all`}
          >
            <Edit className="w-4 h-4" />
            <span>{t('academic.majors.edit')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'} mb-6`}>
          <div className="w-16 h-16 bg-primary-gradient rounded-lg flex items-center justify-center">
            <BookMarked className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{major?.name_en}</h1>
            <p className="text-gray-600">{major?.code}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('departmentsForm.nameAr')}</h3>
              <p className="text-gray-900">{major?.name_ar || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.degreeLevel')}</h3>
              <p className="text-gray-900 capitalize">{major?.degree_level || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('academic.departments.title')}</h3>
              <p className="text-gray-900">{major?.departments?.name_en || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('departmentsForm.college')}</h3>
              <p className="text-gray-900">
                {major?.colleges?.name_en || (major?.is_university_wide ? t('academic.semesters.universityWide') : 'N/A')}
              </p>
            </div>
            {(major?.degree_title_en || major?.degree_title_ar) && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.degreeTitle')}</h3>
                  <p className="text-gray-900">{major?.degree_title_en || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.degreeTitleAr')}</h3>
                  <p className="text-gray-900">{major?.degree_title_ar || 'N/A'}</p>
                </div>
              </>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('academic.semesters.status')}</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                major?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {major?.status || 'active'}
              </span>
            </div>
          </div>

          {/* Academic Requirements */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.majors.academicRequirements')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.totalCredits')}</h4>
                <p className="text-gray-900">{major?.total_credits || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.coreCredits')}</h4>
                <p className="text-gray-900">{major?.core_credits || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.electiveCredits')}</h4>
                <p className="text-gray-900">{major?.elective_credits || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.minSemesters')}</h4>
                <p className="text-gray-900">{major?.min_semesters || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.maxSemesters')}</h4>
                <p className="text-gray-900">{major?.max_semesters || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.minGpa')}</h4>
                <p className="text-gray-900">{major?.min_gpa || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          {(major?.tuition_fee || major?.lab_fee || major?.registration_fee) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.majors.financialInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {major?.tuition_fee && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.tuitionFee')}</h4>
                    <p className="text-gray-900">{major.tuition_fee}</p>
                  </div>
                )}
                {major?.lab_fee && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.labFee')}</h4>
                    <p className="text-gray-900">{major.lab_fee}</p>
                  </div>
                )}
                {major?.registration_fee && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.registrationFee')}</h4>
                    <p className="text-gray-900">{major.registration_fee}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accreditation & Contact */}
          {(major?.accreditation_date || major?.accrediting_body || major?.head_of_major || major?.head_email || major?.head_phone) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.majors.accreditationContact')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {major?.accreditation_date && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.accreditationDate')}</h4>
                    <p className="text-gray-900">
                      {new Date(major.accreditation_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {major?.accreditation_expiry && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.accreditationExpiry')}</h4>
                    <p className="text-gray-900">
                      {new Date(major.accreditation_expiry).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {major?.accrediting_body && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.accreditingBody')}</h4>
                    <p className="text-gray-900">{major.accrediting_body}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">{t('academic.majors.headOfMajor')}</h4>
                  <p className="text-gray-900">
                    {major?.instructors?.name_en || major?.head_of_major || 'Not assigned'}
                    {major?.instructors?.title && ` (${major.instructors.title})`}
                  </p>
                  {major?.instructors?.email && (
                    <p className="text-sm text-gray-600 mt-1">{major.instructors.email}</p>
                  )}
                  {major?.instructors?.phone && (
                    <p className="text-sm text-gray-600">{major.instructors.phone}</p>
                  )}
                  {!major?.instructors?.email && major?.head_email && (
                    <p className="text-sm text-gray-600 mt-1">{major.head_email}</p>
                  )}
                  {!major?.instructors?.phone && major?.head_phone && (
                    <p className="text-sm text-gray-600">{major.head_phone}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Descriptions */}
          {(major?.description || major?.description_ar) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.majors.description')}</h3>
              {major?.description && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">{t('departmentsForm.nameEn')} (English)</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{major.description}</p>
                </div>
              )}
              {major?.description_ar && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">{t('departmentsForm.nameAr')}</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{major.description_ar}</p>
                </div>
              )}
            </div>
          )}

          {major?.is_university_wide && (
            <div className="border-t pt-6">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {t('academic.semesters.universityWide')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



