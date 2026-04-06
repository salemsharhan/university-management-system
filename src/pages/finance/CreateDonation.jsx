import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { getLocalizedName } from '../../utils/localizedName'
import { getCollegeCurrencyCode } from '../../utils/getCollegeSettings'
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react'

export default function CreateDonation() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabicLayout =
    isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')
  const alignStart = isArabicLayout ? 'text-right' : 'text-left'
  const iconRow = isArabicLayout ? 'flex-row-reverse' : ''

  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { userRole, collegeId: authCollegeId, user } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdById, setCreatedById] = useState(null)
  const [formData, setFormData] = useState({
    institute_name_en: '',
    institute_name_ar: '',
    donation_amount: '',
    currency: 'USD',
    reference_id: '',
    donation_date: new Date().toISOString().split('T')[0],
    description: '',
  })

  useEffect(() => {
    if (!user?.email) return
    supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single()
      .then(({ data }) => {
        if (data?.id) setCreatedById(data.id)
      })
      .catch(() => {})
  }, [user?.email])

  useEffect(() => {
    if (!collegeId) return
    getCollegeCurrencyCode(collegeId)
      .then((code) => {
        if (code && !isEdit) setFormData((prev) => ({ ...prev, currency: code }))
      })
      .catch(() => {})
  }, [collegeId, isEdit])

  useEffect(() => {
    if (!isEdit) return
    const load = async () => {
      setLoading(true)
      try {
        const { data, error: err } = await supabase.from('donations').select('*').eq('id', id).single()
        if (err) throw err
        if (data) {
          if (data.college_id) setSelectedCollegeId(data.college_id)
          setFormData({
            institute_name_en: data.institute_name_en || '',
            institute_name_ar: data.institute_name_ar || '',
            donation_amount: String(data.donation_amount ?? ''),
            currency: data.currency || 'USD',
            reference_id: data.reference_id || '',
            donation_date: data.donation_date ? data.donation_date.split('T')[0] : '',
            description: data.description || '',
          })
        }
      } catch (e) {
        console.error(e)
        setError(t('finance.createDonation.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit, t])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!formData.institute_name_en.trim() || !formData.donation_amount || !formData.donation_date) {
      setError(t('finance.createDonation.errors.required'))
      return
    }
    if (userRole === 'admin' && !collegeId) {
      setError(t('finance.createDonation.errors.selectCollege'))
      return
    }
    const amt = parseFloat(formData.donation_amount)
    if (Number.isNaN(amt) || amt <= 0) {
      setError(t('finance.createDonation.errors.invalidAmount'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        institute_name_en: formData.institute_name_en.trim(),
        institute_name_ar: formData.institute_name_ar.trim() || null,
        donation_amount: amt,
        currency: formData.currency || 'USD',
        reference_id: formData.reference_id.trim() || null,
        donation_date: formData.donation_date,
        college_id: collegeId,
        description: formData.description.trim() || null,
        updated_by: createdById,
      }

      if (isEdit) {
        const { error: upErr } = await supabase.from('donations').update(payload).eq('id', id)
        if (upErr) throw upErr
      } else {
        const { data: num, error: rpcErr } = await supabase.rpc('generate_donation_number')
        if (rpcErr) throw rpcErr
        const { error: insErr } = await supabase.from('donations').insert({
          ...payload,
          donation_number: num,
          created_by: createdById,
        })
        if (insErr) throw insErr
      }
      navigate('/finance/donations')
    } catch (err) {
      console.error(err)
      setError(err.message || t('finance.createDonation.errors.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (loading && isEdit && !formData.institute_name_en) {
    return (
      <div className="flex justify-center py-12" dir={isArabicLayout ? 'rtl' : 'ltr'}>
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => navigate('/finance/donations')}
        className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 ${iconRow}`}
      >
        {isArabicLayout ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        <span>{t('finance.createDonation.back')}</span>
      </button>

      <div>
        <h1 className={`text-3xl font-bold text-gray-900 ${alignStart}`}>
          {isEdit ? t('finance.createDonation.titleEdit') : t('finance.createDonation.title')}
        </h1>
        <p className={`text-gray-600 mt-1 ${alignStart}`}>{t('finance.createDonation.subtitle')}</p>
      </div>

      {userRole === 'admin' && (
        <div
          className={`rounded-xl border p-4 ${requiresCollegeSelection ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}
        >
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.donationsPage.filterCollege')} {requiresCollegeSelection && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className={`w-full md:w-96 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart} ${
              requiresCollegeSelection ? 'border-yellow-300 bg-white' : 'border-gray-300'
            }`}
            required={userRole === 'admin'}
          >
            <option value="">{t('finance.donationsPage.selectCollegePlaceholder')}</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {getLocalizedName(c, isArabicLayout) || c.name_en}
              </option>
            ))}
          </select>
          {requiresCollegeSelection && (
            <p className={`text-xs text-yellow-700 mt-2 ${alignStart}`}>{t('finance.donationsPage.selectCollegeToSave')}</p>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createDonation.instituteEn')} *
          </label>
          <input
            type="text"
            value={formData.institute_name_en}
            onChange={(e) => setFormData({ ...formData, institute_name_en: e.target.value })}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
            required
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createDonation.instituteAr')}
          </label>
          <input
            type="text"
            value={formData.institute_name_ar}
            onChange={(e) => setFormData({ ...formData, institute_name_ar: e.target.value })}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createDonation.amount')} *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.donation_amount}
              onChange={(e) => setFormData({ ...formData, donation_amount: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createDonation.currency')}
            </label>
            <input
              type="text"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase().slice(0, 3) })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
              dir="ltr"
              maxLength={3}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createDonation.date')} *
            </label>
            <input
              type="date"
              value={formData.donation_date}
              onChange={(e) => setFormData({ ...formData, donation_date: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createDonation.reference')}
            </label>
            <input
              type="text"
              value={formData.reference_id}
              onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
              dir="ltr"
            />
          </div>
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createDonation.description')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
          />
        </div>
        <div className={`flex flex-wrap gap-4 pt-4 ${isArabicLayout ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
          <button
            type="button"
            onClick={() => navigate('/finance/donations')}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            {t('finance.createDonation.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg disabled:opacity-50 ${iconRow}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{loading ? t('finance.createDonation.saving') : t('finance.createDonation.save')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
