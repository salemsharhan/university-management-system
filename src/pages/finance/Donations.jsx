import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { getCollegeCurrencyCode } from '../../utils/getCollegeSettings'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Plus, Edit, Trash2, DollarSign, Loader2 } from 'lucide-react'

export default function Donations() {
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
  const [donations, setDonations] = useState([])
  const [currencyByCollege, setCurrencyByCollege] = useState({})

  const fetchDonations = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('donations')
        .select('*')
        .order('donation_date', { ascending: false })

      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }
      // admin with no college filter: show all donations

      const { data, error } = await query
      if (error) throw error
      setDonations(data || [])

      const ids = [...new Set((data || []).map((d) => d.college_id).filter(Boolean))]
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
      console.error('Error fetching donations:', err)
    } finally {
      setLoading(false)
    }
  }, [userRole, collegeId])

  useEffect(() => {
    fetchDonations()
  }, [fetchDonations])

  const formatMoney = (amount, currency, donationCollegeId) => {
    const cur = currency || (donationCollegeId && currencyByCollege[donationCollegeId]) || 'USD'
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

  const handleDelete = async (id) => {
    if (!confirm(t('finance.donationsPage.deleteConfirm'))) return

    try {
      const { error } = await supabase.from('donations').delete().eq('id', id)

      if (error) throw error
      fetchDonations()
    } catch (err) {
      console.error('Error deleting donation:', err)
      alert(t('finance.donationsPage.deleteFailed'))
    }
  }

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className={`flex flex-wrap items-center justify-between gap-4 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
        <div className={`min-w-0 ${alignStart}`}>
          <h1 className="text-3xl font-bold text-gray-900">{t('finance.donationsPage.title')}</h1>
          <p className="text-gray-600 mt-1">{t('finance.donationsPage.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/finance/donations/create')}
          className={`flex items-center gap-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl ${iconRow}`}
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span>{t('finance.donationsPage.add')}</span>
        </button>
      </div>

      {userRole === 'admin' && (
        <div
          className={`rounded-2xl border p-4 ${
            requiresCollegeSelection ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'
          }`}
        >
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.donationsPage.filterCollege')}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className={`w-full md:w-96 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart} ${
              requiresCollegeSelection ? 'border-yellow-300 bg-white' : 'border-gray-300'
            }`}
          >
            <option value="">{t('finance.donationsPage.allColleges')}</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {getLocalizedName(c, isArabicLayout) || c.name_en}
              </option>
            ))}
          </select>
          {requiresCollegeSelection && (
            <p className={`text-xs text-yellow-700 mt-2 ${alignStart}`}>{t('finance.donationsPage.filterHint')}</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : donations.length === 0 ? (
        <div className={`bg-white rounded-2xl border border-gray-200 p-12 ${alignStart}`}>
          <p className="text-gray-600">{t('finance.donationsPage.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donations.map((donation) => (
            <div key={donation.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className={`flex items-start justify-between gap-3 mb-4 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                <div className={`min-w-0 flex-1 ${alignStart}`}>
                  {(() => {
                    const primary =
                      isArabicLayout && donation.institute_name_ar?.trim()
                        ? donation.institute_name_ar.trim()
                        : donation.institute_name_en
                    const secondary = isArabicLayout
                      ? donation.institute_name_en
                      : donation.institute_name_ar?.trim()
                    return (
                      <>
                        <h3 className="text-lg font-bold text-gray-900">{primary}</h3>
                        {secondary && secondary !== primary && (
                          <p className="text-sm text-gray-600">{secondary}</p>
                        )}
                      </>
                    )
                  })()}
                </div>
                <DollarSign className="w-8 h-8 text-green-600 shrink-0" />
              </div>
              <div className="space-y-2 mb-4">
                <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-gray-600">{t('finance.donationsPage.amount')}</span>
                  <span className="text-xl font-bold text-green-600 tabular-nums" dir="ltr">
                    {formatMoney(donation.donation_amount, donation.currency, donation.college_id)}
                  </span>
                </div>
                <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-gray-600">{t('finance.donationsPage.date')}</span>
                  <span className="text-sm font-medium">
                    {new Date(donation.donation_date).toLocaleDateString(isArabicLayout ? 'ar-KW' : undefined)}
                  </span>
                </div>
                {donation.reference_id && (
                  <div className={`flex items-center justify-between gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-gray-600">{t('finance.donationsPage.reference')}</span>
                    <span className="text-sm font-medium" dir="ltr">
                      {donation.reference_id}
                    </span>
                  </div>
                )}
              </div>
              <div className={`flex items-center gap-2 pt-4 border-t border-gray-200 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => navigate(`/finance/donations/${donation.id}/edit`)}
                  className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 ${iconRow}`}
                >
                  <Edit className="w-4 h-4 shrink-0" />
                  {t('finance.donationsPage.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(donation.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  aria-label={t('finance.donationsPage.delete')}
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
