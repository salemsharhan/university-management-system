import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { getCollegeCurrencyCode } from '../../utils/getCollegeSettings'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Plus, Edit, Trash2, Calendar, Loader2 } from 'lucide-react'

export default function InstallmentPlans() {
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
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState([])
  const [currencyByCollege, setCurrencyByCollege] = useState({})

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('installment_plans')
        .select(`
          id,
          plan_code,
          name_en,
          name_ar,
          college_id,
          is_university_wide,
          number_of_installments,
          total_amount,
          late_payment_penalty_percentage,
          late_payment_penalty_fixed,
          grace_period_days,
          is_active,
          valid_from,
          valid_to,
          degree_level,
          major_id,
          semester_id,
          majors (id, name_en, name_ar),
          semesters (id, name_en, name_ar),
          colleges (id, name_en, name_ar)
        `)
        .order('created_at', { ascending: false })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setPlans(data || [])

      const ids = [...new Set((data || []).map((p) => p.college_id).filter(Boolean))]
      const next = {}
      await Promise.all(
        ids.map(async (cid) => {
          try {
            const c = await getCollegeCurrencyCode(cid)
            if (c) next[cid] = c
          } catch {
            /* ignore */
          }
        })
      )
      setCurrencyByCollege(next)
    } catch (err) {
      console.error('Error fetching installment plans:', err)
    } finally {
      setLoading(false)
    }
  }, [collegeId, userRole])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const formatMoney = (amount, planCollegeId) => {
    const cur = (planCollegeId && currencyByCollege[planCollegeId]) || 'USD'
    try {
      return new Intl.NumberFormat(isArabicLayout ? 'ar-KW' : 'en-US', {
        style: 'currency',
        currency: cur,
        minimumFractionDigits: 2,
      }).format(parseFloat(amount || 0))
    } catch {
      return `${parseFloat(amount || 0).toFixed(2)} ${cur}`
    }
  }

  const degreeLabel = (level) => {
    if (!level) return ''
    const k = `finance.feeStructureForm.degree.${level}`
    const tr = t(k)
    return tr === k ? level : tr
  }

  const handleDelete = async (id) => {
    if (!confirm(t('finance.installmentPlansPage.deleteConfirm'))) return

    try {
      const { error } = await supabase.from('installment_plans').delete().eq('id', id)

      if (error) throw error
      fetchPlans()
    } catch (err) {
      console.error('Error deleting plan:', err)
      alert(t('finance.installmentPlansPage.deleteFailed'))
    }
  }

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className={`flex flex-wrap items-center justify-between gap-4 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
        <div className={`min-w-0 ${alignStart}`}>
          <h1 className="text-3xl font-bold text-gray-900">{t('finance.installmentPlansPage.title')}</h1>
          <p className="text-gray-600 mt-1">{t('finance.installmentPlansPage.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/finance/installments/create')}
          className={`flex items-center gap-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl ${iconRow}`}
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span>{t('finance.installmentPlansPage.create')}</span>
        </button>
      </div>

      {userRole === 'admin' && (
        <div
          className={`rounded-2xl border p-4 ${
            requiresCollegeSelection ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'
          }`}
        >
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.installmentPlansPage.filterCollege')}{' '}
            {requiresCollegeSelection && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className={`w-full md:w-96 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart} ${
              requiresCollegeSelection ? 'border-yellow-300 bg-white' : 'border-gray-300'
            }`}
          >
            <option value="">{t('finance.installmentPlansPage.allColleges')}</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {getLocalizedName(college, isArabicLayout) || college.name_en}
              </option>
            ))}
          </select>
          {requiresCollegeSelection && (
            <p className={`text-xs text-yellow-700 mt-2 ${alignStart}`}>{t('finance.installmentPlansPage.filterHint')}</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-12 ${alignStart}`}>
          <Calendar className={`w-16 h-16 text-gray-400 mb-4 ${isArabicLayout ? 'ms-auto' : 'mx-auto'}`} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('finance.installmentPlansPage.emptyTitle')}</h3>
          <p className="text-gray-600 mb-6">{t('finance.installmentPlansPage.emptyHint')}</p>
          <button
            type="button"
            onClick={() => navigate('/finance/installments/create')}
            className={`inline-flex items-center gap-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold ${iconRow}`}
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span>{t('finance.installmentPlansPage.create')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className={`flex items-start justify-between gap-3 mb-4 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                <div className={`min-w-0 flex-1 ${alignStart}`}>
                  <h3 className="text-lg font-bold text-gray-900">
                    {isArabicLayout && plan.name_ar?.trim() ? plan.name_ar.trim() : plan.name_en}
                  </h3>
                  {plan.name_ar && plan.name_en && plan.name_ar !== plan.name_en && (
                    <p className="text-sm text-gray-600">
                      {isArabicLayout ? plan.name_en : plan.name_ar}
                    </p>
                  )}
                  <p className={`text-xs text-gray-500 mt-1 ${alignStart}`} dir="ltr">
                    {t('finance.installmentPlansPage.code')}: {plan.plan_code}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${
                    plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {plan.is_active ? t('finance.installmentPlansPage.active') : t('finance.installmentPlansPage.inactive')}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-gray-600">{t('finance.installmentPlansPage.installments')}</span>
                  <span className="font-semibold tabular-nums">{plan.number_of_installments}</span>
                </div>
                <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-gray-600">{t('finance.installmentPlansPage.totalAmount')}</span>
                  <span className="text-lg font-bold text-primary-600 tabular-nums" dir="ltr">
                    {formatMoney(plan.total_amount, plan.college_id)}
                  </span>
                </div>
                {plan.degree_level && (
                  <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-gray-600">{t('finance.installmentPlansPage.degree')}</span>
                    <span className="text-sm font-medium">{degreeLabel(plan.degree_level)}</span>
                  </div>
                )}
                {plan.majors && (
                  <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-gray-600">{t('finance.installmentPlansPage.major')}</span>
                    <span className="text-sm font-medium">
                      {getLocalizedName(plan.majors, isArabicLayout) || plan.majors.name_en}
                    </span>
                  </div>
                )}
                {plan.colleges && (
                  <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-gray-600">{t('finance.installmentPlansPage.college')}</span>
                    <span className="text-sm font-medium">
                      {getLocalizedName(plan.colleges, isArabicLayout) || plan.colleges.name_en}
                    </span>
                  </div>
                )}
                {plan.is_university_wide && (
                  <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-gray-600">{t('finance.installmentPlansPage.scope')}</span>
                    <span className="text-sm font-medium">{t('finance.installmentPlansPage.universityWide')}</span>
                  </div>
                )}
                {plan.late_payment_penalty_percentage > 0 && (
                  <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-gray-600">{t('finance.installmentPlansPage.lateFee')}</span>
                    <span className="text-sm font-medium text-red-600 tabular-nums" dir="ltr">
                      {plan.late_payment_penalty_percentage}%
                    </span>
                  </div>
                )}
              </div>

              <div className={`flex items-center gap-2 pt-4 border-t border-gray-200 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => navigate(`/finance/installments/${plan.id}/edit`)}
                  className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 ${iconRow}`}
                >
                  <Edit className="w-4 h-4 shrink-0" />
                  {t('finance.installmentPlansPage.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(plan.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  aria-label={t('finance.installmentPlansPage.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
