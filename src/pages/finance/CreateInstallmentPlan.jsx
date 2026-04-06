import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react'

function uniquePlanCode() {
  const y = new Date().getFullYear()
  const r = Math.random().toString(36).slice(2, 10).toUpperCase()
  return `PLAN${y}${r}`
}

export default function CreateInstallmentPlan() {
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
  const [majors, setMajors] = useState([])
  const [semesters, setSemesters] = useState([])

  const [formData, setFormData] = useState({
    plan_code: '',
    name_en: '',
    name_ar: '',
    is_university_wide: false,
    degree_level: '',
    major_id: '',
    semester_id: '',
    number_of_installments: '2',
    total_amount: '',
    late_payment_penalty_percentage: '0',
    late_payment_penalty_fixed: '0',
    grace_period_days: '0',
    is_active: true,
    valid_from: '',
    valid_to: '',
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
    fetchMajors()
    fetchSemesters()
  }, [collegeId, userRole])

  useEffect(() => {
    if (!isEdit) {
      setFormData((prev) => ({ ...prev, plan_code: uniquePlanCode() }))
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const { data, error: err } = await supabase.from('installment_plans').select('*').eq('id', id).single()
        if (err) throw err
        if (data) {
          if (data.college_id) setSelectedCollegeId(data.college_id)
          setFormData({
            plan_code: data.plan_code || '',
            name_en: data.name_en || '',
            name_ar: data.name_ar || '',
            is_university_wide: !!data.is_university_wide,
            degree_level: data.degree_level || '',
            major_id: data.major_id ? String(data.major_id) : '',
            semester_id: data.semester_id ? String(data.semester_id) : '',
            number_of_installments: String(data.number_of_installments ?? ''),
            total_amount: String(data.total_amount ?? ''),
            late_payment_penalty_percentage: String(data.late_payment_penalty_percentage ?? '0'),
            late_payment_penalty_fixed: String(data.late_payment_penalty_fixed ?? '0'),
            grace_period_days: String(data.grace_period_days ?? '0'),
            is_active: data.is_active !== false,
            valid_from: data.valid_from ? data.valid_from.split('T')[0] : '',
            valid_to: data.valid_to ? data.valid_to.split('T')[0] : '',
            description: data.description || '',
          })
        }
      } catch (e) {
        console.error(e)
        setError(t('finance.createInstallmentPlan.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit, t])

  const fetchMajors = async () => {
    try {
      let query = supabase
        .from('majors')
        .select('id, name_en, name_ar, code')
        .eq('status', 'active')
        .order('name_en')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error: err } = await query
      if (err) throw err
      setMajors(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const fetchSemesters = async () => {
    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, name_ar, code')
        .order('start_date', { ascending: false })
        .limit(50)

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error: err } = await query
      if (err) throw err
      setSemesters(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!formData.name_en.trim() || !formData.plan_code.trim()) {
      setError(t('finance.createInstallmentPlan.errors.required'))
      return
    }
    const nInst = parseInt(formData.number_of_installments, 10)
    const total = parseFloat(formData.total_amount)
    if (Number.isNaN(nInst) || nInst < 1) {
      setError(t('finance.createInstallmentPlan.errors.installments'))
      return
    }
    if (Number.isNaN(total) || total <= 0) {
      setError(t('finance.createInstallmentPlan.errors.amount'))
      return
    }
    if (!formData.is_university_wide) {
      if (userRole === 'admin' && !collegeId) {
        setError(t('finance.createInstallmentPlan.errors.college'))
        return
      }
      if (userRole !== 'admin' && !collegeId) {
        setError(t('finance.createInstallmentPlan.errors.college'))
        return
      }
    }

    setLoading(true)
    try {
      const payload = {
        plan_code: formData.plan_code.trim(),
        name_en: formData.name_en.trim(),
        name_ar: formData.name_ar.trim() || null,
        is_university_wide: formData.is_university_wide,
        college_id: formData.is_university_wide ? null : collegeId,
        degree_level: formData.degree_level || null,
        major_id: formData.major_id ? parseInt(formData.major_id, 10) : null,
        semester_id: formData.semester_id ? parseInt(formData.semester_id, 10) : null,
        number_of_installments: nInst,
        total_amount: total,
        late_payment_penalty_percentage: parseFloat(formData.late_payment_penalty_percentage) || 0,
        late_payment_penalty_fixed: parseFloat(formData.late_payment_penalty_fixed) || 0,
        grace_period_days: parseInt(formData.grace_period_days, 10) || 0,
        is_active: formData.is_active,
        valid_from: formData.valid_from || null,
        valid_to: formData.valid_to || null,
        description: formData.description.trim() || null,
      }

      if (isEdit) {
        const { error: upErr } = await supabase.from('installment_plans').update(payload).eq('id', id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase
          .from('installment_plans')
          .insert({ ...payload, created_by: createdById })
        if (insErr) throw insErr
      }
      navigate('/finance/installments')
    } catch (err) {
      console.error(err)
      setError(err.message || t('finance.createInstallmentPlan.errors.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (loading && isEdit && !formData.name_en) {
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
        onClick={() => navigate('/finance/installments')}
        className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 ${iconRow}`}
      >
        {isArabicLayout ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        <span>{t('finance.createInstallmentPlan.back')}</span>
      </button>

      <div>
        <h1 className={`text-3xl font-bold text-gray-900 ${alignStart}`}>
          {isEdit ? t('finance.createInstallmentPlan.titleEdit') : t('finance.createInstallmentPlan.title')}
        </h1>
        <p className={`text-gray-600 mt-1 ${alignStart}`}>{t('finance.createInstallmentPlan.subtitle')}</p>
      </div>

      {userRole === 'admin' && (
        <div
          className={`rounded-xl border p-4 ${requiresCollegeSelection && !formData.is_university_wide ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}
        >
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.installmentPlansPage.filterCollege')}{' '}
            {requiresCollegeSelection && !formData.is_university_wide && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            disabled={formData.is_university_wide}
            className={`w-full md:w-96 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart} ${
              requiresCollegeSelection && !formData.is_university_wide ? 'border-yellow-300 bg-white' : 'border-gray-300'
            }`}
          >
            <option value="">{t('finance.installmentPlansPage.selectCollegePlaceholder')}</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {getLocalizedName(c, isArabicLayout) || c.name_en}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className={`flex w-full ${isArabicLayout ? 'justify-end' : 'justify-start'}`}>
          <label className={`flex items-center gap-2 max-w-full ${iconRow}`}>
            <input
              type="checkbox"
              checked={formData.is_university_wide}
              onChange={(e) => setFormData({ ...formData, is_university_wide: e.target.checked })}
              className="w-4 h-4 rounded text-primary-600 shrink-0"
            />
            <span className="text-sm font-medium text-gray-700">{t('finance.createInstallmentPlan.universityWide')}</span>
          </label>
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInstallmentPlan.planCode')} *
          </label>
          <input
            type="text"
            value={formData.plan_code}
            onChange={(e) => setFormData({ ...formData, plan_code: e.target.value })}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
            dir="ltr"
            required
            disabled={isEdit}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInstallmentPlan.nameEn')} *
          </label>
          <input
            type="text"
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
            required
          />
        </div>
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInstallmentPlan.nameAr')}
          </label>
          <input
            type="text"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInstallmentPlan.degreeLevel')}
          </label>
          <select
            value={formData.degree_level}
            onChange={(e) => setFormData({ ...formData, degree_level: e.target.value })}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
          >
            <option value="">{t('finance.createInstallmentPlan.optionalAll')}</option>
            {['bachelor', 'master', 'phd', 'diploma'].map((level) => (
              <option key={level} value={level}>
                {t(`finance.feeStructureForm.degree.${level}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInstallmentPlan.major')}
          </label>
          <select
            value={formData.major_id}
            onChange={(e) => setFormData({ ...formData, major_id: e.target.value })}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
            dir={isArabicLayout ? 'rtl' : 'ltr'}
          >
            <option value="">{t('finance.createInstallmentPlan.optionalAll')}</option>
            {majors.map((m) => (
              <option key={m.id} value={m.id}>
                {getLocalizedName(m, isArabicLayout) || m.name_en} ({m.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInstallmentPlan.semester')}
          </label>
          <select
            value={formData.semester_id}
            onChange={(e) => setFormData({ ...formData, semester_id: e.target.value })}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
            dir={isArabicLayout ? 'rtl' : 'ltr'}
          >
            <option value="">{t('finance.createInstallmentPlan.optionalAll')}</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {getLocalizedName(s, isArabicLayout) || s.name_en} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInstallmentPlan.numInstallments')} *
            </label>
            <input
              type="number"
              min="1"
              value={formData.number_of_installments}
              onChange={(e) => setFormData({ ...formData, number_of_installments: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
              dir="ltr"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInstallmentPlan.totalAmount')} *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
              dir="ltr"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInstallmentPlan.latePct')}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.late_payment_penalty_percentage}
              onChange={(e) => setFormData({ ...formData, late_payment_penalty_percentage: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
              dir="ltr"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInstallmentPlan.lateFixed')}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.late_payment_penalty_fixed}
              onChange={(e) => setFormData({ ...formData, late_payment_penalty_fixed: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
              dir="ltr"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInstallmentPlan.graceDays')}
            </label>
            <input
              type="number"
              min="0"
              value={formData.grace_period_days}
              onChange={(e) => setFormData({ ...formData, grace_period_days: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInstallmentPlan.validFrom')}
            </label>
            <input
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInstallmentPlan.validTo')}
            </label>
            <input
              type="date"
              value={formData.valid_to}
              onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
            />
          </div>
        </div>

        <label className={`flex items-center gap-2 ${iconRow}`}>
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 rounded text-primary-600"
          />
          <span className="text-sm font-medium text-gray-700">{t('finance.createInstallmentPlan.active')}</span>
        </label>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInstallmentPlan.description')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl ${alignStart}`}
          />
        </div>

        <div className={`flex flex-wrap gap-4 pt-4 ${isArabicLayout ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
          <button
            type="button"
            onClick={() => navigate('/finance/installments')}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            {t('finance.createInstallmentPlan.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg disabled:opacity-50 ${iconRow}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{loading ? t('finance.createInstallmentPlan.saving') : t('finance.createInstallmentPlan.save')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
