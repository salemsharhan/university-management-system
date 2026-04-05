import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react'

const CATEGORY_VALUES = ['admission', 'tuition', 'service', 'penalty', 'general']

function categoryOptionLabel(value, t) {
  const key = `finance.feeCategories.${value}`
  const tr = t(key)
  return tr === key ? value : tr
}

export default function CreateFeeType() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabicLayout =
    isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')
  const alignStart = isArabicLayout ? 'text-right' : 'text-left'

  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_ar: '',
    description: '',
    category: 'general',
    is_semester_based: true,
    requires_semester: true,
    is_active: true,
    is_university_wide: false,
    sort_order: 0,
  })

  useEffect(() => {
    if (isEdit) {
      fetchFeeType()
    }
  }, [id])

  const fetchFeeType = async () => {
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase.from('fee_types').select('*').eq('id', id).single()

      if (qErr) throw qErr

      setFormData({
        code: data.code || '',
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        description: data.description || '',
        category: data.category || 'general',
        is_semester_based: data.is_semester_based !== undefined ? data.is_semester_based : true,
        requires_semester: data.requires_semester !== undefined ? data.requires_semester : true,
        is_active: data.is_active !== undefined ? data.is_active : true,
        is_university_wide: data.is_university_wide || false,
        sort_order: data.sort_order || 0,
      })
    } catch (err) {
      console.error('Error fetching fee type:', err)
      setError(t('finance.feeTypeForm.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!formData.code || !formData.name_en) {
      setError(t('finance.feeTypeForm.errors.required'))
      return
    }

    const codeRegex = /^[a-z0-9_]+$/
    if (!codeRegex.test(formData.code)) {
      setError(t('finance.feeTypeForm.errors.codeFormat'))
      return
    }

    if (!collegeId && !formData.is_university_wide && userRole !== 'admin') {
      setError(t('finance.feeTypeForm.errors.collegeOrWide'))
      return
    }

    setLoading(true)

    try {
      const feeTypeData = {
        code: formData.code.trim().toLowerCase(),
        name_en: formData.name_en.trim(),
        name_ar: formData.name_ar.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category,
        is_semester_based: formData.is_semester_based,
        requires_semester: formData.requires_semester,
        is_active: formData.is_active,
        is_university_wide: formData.is_university_wide,
        sort_order: parseInt(formData.sort_order, 10) || 0,
      }

      if (!formData.is_university_wide && collegeId) {
        feeTypeData.college_id = collegeId
      }

      if (isEdit) {
        const { error: updateError } = await supabase.from('fee_types').update(feeTypeData).eq('id', id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('fee_types').insert(feeTypeData)

        if (insertError) {
          if (insertError.code === '23505') {
            setError(t('finance.feeTypeForm.errors.duplicateCode', { code: formData.code }))
          } else {
            throw insertError
          }
          return
        }
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/finance/configuration?tab=types', { replace: true })
      }, 1500)
    } catch (err) {
      console.error('Error saving fee type:', err)
      setError(err.message || t('finance.feeTypeForm.errors.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = `w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 py-3 px-4 ${alignStart}`
  const selectField = `w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none ps-4 pe-10 py-3 ${alignStart}`

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className={alignStart}>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? t('finance.feeTypeForm.editTitle') : t('finance.feeTypeForm.createTitle')}
          </h1>
          <p className="text-gray-600 mt-1">{t('finance.feeTypeForm.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/finance/configuration?tab=types')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          aria-label={t('common.back')}
        >
          {isArabicLayout ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>
      </div>

      {userRole === 'admin' && (
        <div
          className={`bg-white rounded-2xl shadow-sm border p-4 ${
            requiresCollegeSelection && !formData.is_university_wide ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
          }`}
          dir={isArabicLayout ? 'rtl' : 'ltr'}
        >
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.feeTypeForm.selectCollege')}{' '}
            {requiresCollegeSelection && !formData.is_university_wide && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            disabled={formData.is_university_wide}
            className={`w-full md:max-w-md ${selectField} ${
              formData.is_university_wide
                ? 'bg-gray-100 border-gray-300'
                : requiresCollegeSelection
                  ? 'border-yellow-300 bg-white'
                  : 'bg-white'
            }`}
            required={requiresCollegeSelection && !formData.is_university_wide}
          >
            <option value="">{t('finance.feeTypeForm.collegePlaceholder')}</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {getLocalizedName(college, isArabicLayout) || college.name_en}
              </option>
            ))}
          </select>
          {requiresCollegeSelection && !formData.is_university_wide && (
            <p className={`text-xs text-yellow-600 mt-1 ${alignStart}`}>{t('finance.feeTypeForm.collegeHint')}</p>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6"
        dir={isArabicLayout ? 'rtl' : 'ltr'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.feeTypeForm.code')} *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
              }
              className={`${fieldClass} font-mono`}
              placeholder={t('finance.feeTypeForm.codePlaceholder')}
              required
              disabled={isEdit}
              dir="ltr"
            />
            <p className={`text-xs text-gray-500 mt-1 ${alignStart}`}>{t('finance.feeTypeForm.codeHint')}</p>
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.feeTypeForm.category')} *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={selectField}
                required
              >
                {CATEGORY_VALUES.map((v) => (
                <option key={v} value={v}>
                  {categoryOptionLabel(v, t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.feeTypeForm.nameEn')} *
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className={fieldClass}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.feeTypeForm.nameAr')}
            </label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.feeTypeForm.sortOrder')}
            </label>
            <input
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })}
              className={`${fieldClass} tabular-nums`}
              dir="ltr"
            />
            <p className={`text-xs text-gray-500 mt-1 ${alignStart}`}>{t('finance.feeTypeForm.sortOrderHint')}</p>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.feeTypeForm.description')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={fieldClass}
            rows="3"
            placeholder={t('finance.feeTypeForm.descriptionPlaceholder')}
          />
        </div>

        <div className="space-y-4 border-t border-gray-200 pt-4">
          <h3 className={`text-lg font-semibold text-gray-900 ${alignStart}`}>{t('finance.feeTypeForm.semesterSettings')}</h3>

          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`min-w-0 flex-1 ${alignStart}`}>
              <label className="text-sm font-medium text-gray-700">{t('finance.feeTypeForm.semesterBased')}</label>
              <p className="text-xs text-gray-500 mt-0.5">{t('finance.feeTypeForm.semesterBasedHelp')}</p>
            </div>
            <input
              type="checkbox"
              checked={formData.is_semester_based}
              onChange={(e) => {
                const checked = e.target.checked
                setFormData({
                  ...formData,
                  is_semester_based: checked,
                  requires_semester: checked ? formData.requires_semester : false,
                })
              }}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`min-w-0 flex-1 ${alignStart}`}>
              <label className="text-sm font-medium text-gray-700">{t('finance.feeTypeForm.requiresSemester')}</label>
              <p className="text-xs text-gray-500 mt-0.5">{t('finance.feeTypeForm.requiresSemesterHelp')}</p>
            </div>
            <input
              type="checkbox"
              checked={formData.requires_semester}
              onChange={(e) => setFormData({ ...formData, requires_semester: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 shrink-0"
              disabled={!formData.is_semester_based}
            />
          </div>
          {!formData.is_semester_based && (
            <p className={`text-xs text-gray-500 italic ${alignStart}`}>{t('finance.feeTypeForm.requiresSemesterNote')}</p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={formData.is_university_wide}
              onChange={(e) => setFormData({ ...formData, is_university_wide: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 shrink-0"
            />
            <span className="text-sm font-medium text-gray-700">{t('finance.feeTypeForm.universityWide')}</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 shrink-0"
            />
            <span className="text-sm font-medium text-gray-700">{t('finance.feeTypeForm.active')}</span>
          </label>
        </div>

        {error && (
          <div className={`bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl ${alignStart}`}>{error}</div>
        )}
        {success && (
          <div className={`bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl ${alignStart}`}>
            {isEdit ? t('finance.feeTypeForm.successUpdate') : t('finance.feeTypeForm.successCreate')}
          </div>
        )}

        <div className="flex w-full flex-wrap items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span>{t('finance.feeTypeForm.saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 shrink-0" />
                <span>{isEdit ? t('finance.feeTypeForm.saveUpdate') : t('finance.feeTypeForm.saveCreate')}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/finance/configuration?tab=types')}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {t('finance.feeTypeForm.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
