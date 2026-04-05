import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { getLocalizedName } from '../../utils/localizedName'
import { getCollegeCurrencyCode } from '../../utils/getCollegeSettings'
import { ArrowLeft, ArrowRight, Save, Search, Wallet, Loader2 } from 'lucide-react'

function displayPersonName(person, isArabicLayout) {
  if (!person) return ''
  if (isArabicLayout) {
    const ar = [person.first_name_ar, person.last_name_ar].filter(Boolean).join(' ').trim()
    if (ar) return ar
    if (person.name_ar?.trim()) return person.name_ar.trim()
  }
  if (person.first_name && person.last_name) return `${person.first_name} ${person.last_name}`.trim()
  return person.name_en?.trim() || ''
}

function RtlMoney({ isArabicLayout, inline = false, className = '', children }) {
  const inner = (
    <span dir="ltr" className={`tabular-nums ${className}`}>
      {children}
    </span>
  )
  if (!isArabicLayout) return inner
  if (inline) {
    return (
      <span className="inline-flex min-w-0 max-w-full justify-start align-middle">
        {inner}
      </span>
    )
  }
  return (
    <div className="flex w-full min-w-0 justify-start">
      {inner}
    </div>
  )
}

export default function CreditWallet() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabicLayout =
    isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')

  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const alignStart = isArabicLayout ? 'text-right' : 'text-left'
  const iconRow = isArabicLayout ? 'flex-row-reverse' : ''

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [students, setStudents] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [creditAmount, setCreditAmount] = useState('')
  const [description, setDescription] = useState('')
  const [currencyCode, setCurrencyCode] = useState('USD')

  useEffect(() => {
    const cid = selectedStudent?.college_id ?? collegeId
    if (!cid) {
      setCurrencyCode('USD')
      return
    }
    getCollegeCurrencyCode(cid)
      .then(setCurrencyCode)
      .catch(() => setCurrencyCode('USD'))
  }, [selectedStudent?.college_id, collegeId])

  useEffect(() => {
    if (studentSearch && studentSearch.length >= 3) {
      searchStudents()
    } else {
      setStudents([])
    }
  }, [studentSearch, collegeId])

  useEffect(() => {
    if (selectedStudent) {
      fetchWalletBalance()
    }
  }, [selectedStudent])

  const formatMoney = (n) => {
    const code = currencyCode || 'USD'
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(n))
    } catch {
      return `${code} ${Number(n).toFixed(2)}`
    }
  }

  const searchStudents = async () => {
    if (!collegeId && userRole !== 'admin') return

    try {
      let query = supabase
        .from('students')
        .select('id, student_id, name_en, first_name, last_name, email, college_id')
        .ilike('student_id', `%${studentSearch}%`)
        .limit(10)

      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error: qErr } = await query
      if (qErr) throw qErr
      setStudents(data || [])
    } catch (err) {
      console.error('Error searching students:', err)
    }
  }

  const fetchWalletBalance = async () => {
    try {
      const { data, error: qErr } = await supabase
        .from('wallets')
        .select('balance')
        .eq('student_id', selectedStudent.id)
        .single()

      if (qErr && qErr.code !== 'PGRST116') throw qErr
      setWalletBalance(data?.balance || 0)
    } catch (err) {
      console.error('Error fetching wallet balance:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedStudent) {
      setError(t('finance.creditWallet.errors.selectStudent'))
      return
    }

    const amount = parseFloat(creditAmount)
    if (!amount || amount <= 0) {
      setError(t('finance.creditWallet.errors.invalidAmount'))
      return
    }

    setLoading(true)

    try {
      let { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('student_id', selectedStudent.id)
        .single()

      if (walletError && walletError.code === 'PGRST116') {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            student_id: selectedStudent.id,
            college_id: selectedStudent.college_id,
            balance: 0,
          })
          .select()
          .single()

        if (createError) throw createError
        wallet = newWallet
      } else if (walletError) {
        throw walletError
      }

      const balanceBefore = parseFloat(wallet.balance || 0)
      const balanceAfter = balanceBefore + amount

      const { data: transaction, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          student_id: selectedStudent.id,
          transaction_type: 'credit',
          amount: amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: description || 'Wallet top-up',
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      const invoiceNumber = await supabase.rpc('generate_invoice_number', {
        college_id_param: selectedStudent.college_id,
      })

      if (invoiceNumber.error) throw invoiceNumber.error

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber.data,
          student_id: selectedStudent.id,
          college_id: selectedStudent.college_id,
          invoice_date: new Date().toISOString().split('T')[0],
          invoice_type: 'wallet_credit',
          status: 'paid',
          subtotal: amount,
          discount_amount: 0,
          scholarship_amount: 0,
          tax_amount: 0,
          total_amount: amount,
          paid_amount: amount,
          pending_amount: 0,
          currency: currencyCode || 'USD',
          notes: `Wallet credit transaction: ${transaction.id}`,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      await supabase.from('invoice_items').insert({
        invoice_id: invoice.id,
        item_type: 'wallet_credit',
        item_name_en: 'Wallet Credit',
        item_name_ar: 'رصيد المحفظة',
        description: description || 'Wallet top-up',
        quantity: 1,
        unit_price: amount,
        discount_amount: 0,
        scholarship_amount: 0,
        total_amount: amount,
      })

      await supabase
        .from('wallet_transactions')
        .update({ reference_invoice_id: invoice.id })
        .eq('id', transaction.id)

      setSuccess(true)
      setCreditAmount('')
      setDescription('')
      fetchWalletBalance()

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Error crediting wallet:', err)
      setError(err.message || t('finance.creditWallet.errors.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className={alignStart}>
          <h1 className="text-3xl font-bold text-gray-900">{t('finance.creditWallet.title')}</h1>
          <p className="text-gray-600 mt-1">{t('finance.creditWallet.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/finance')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          aria-label={t('common.back')}
        >
          {isArabicLayout ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>
      </div>

      {userRole === 'admin' && (
        <div
          className={`bg-white rounded-2xl shadow-sm border p-4 ${
            requiresCollegeSelection ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
          }`}
          dir={isArabicLayout ? 'rtl' : 'ltr'}
        >
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.creditWallet.selectCollege')}{' '}
            {requiresCollegeSelection && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className={`w-full md:max-w-md border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ps-4 pe-10 py-2.5 ${alignStart} ${
              requiresCollegeSelection ? 'border-yellow-300 bg-white' : 'border-gray-300 bg-white'
            }`}
            required={requiresCollegeSelection}
          >
            <option value="">{t('finance.creditWallet.collegePlaceholder')}</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {getLocalizedName(college, isArabicLayout) || college.name_en}
              </option>
            ))}
          </select>
          {requiresCollegeSelection && (
            <p className={`text-xs text-yellow-600 mt-1 ${alignStart}`}>{t('finance.creditWallet.collegeHint')}</p>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6"
        dir={isArabicLayout ? 'rtl' : 'ltr'}
      >
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.creditWallet.studentNumber')} *
          </label>
          <div className="relative">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${
                isArabicLayout ? 'right-3' : 'left-3'
              }`}
            />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder={t('finance.creditWallet.searchPlaceholder')}
              className={`w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 py-3 ${
                isArabicLayout ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
              }`}
            />
          </div>
          {students.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-xl bg-white shadow-lg max-h-60 overflow-y-auto">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudent(student)
                    setStudentSearch(student.student_id)
                    setStudents([])
                  }}
                  className={`w-full px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${alignStart}`}
                >
                  <div className="font-semibold" dir="ltr">
                    {student.student_id}
                  </div>
                  <div className="text-sm text-gray-600">{displayPersonName(student, isArabicLayout)}</div>
                </button>
              ))}
            </div>
          )}
          {selectedStudent && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <div className={`flex flex-wrap items-center justify-between gap-4 ${iconRow}`}>
                <div className={`min-w-0 ${alignStart}`}>
                  <p className="text-sm text-gray-600">{t('finance.creditWallet.selectedStudent')}</p>
                  <p className="font-semibold">
                    <span dir="ltr" className="tabular-nums">
                      {selectedStudent.student_id}
                    </span>
                    {' — '}
                    {displayPersonName(selectedStudent, isArabicLayout)}
                  </p>
                </div>
                <div className={`min-w-0 ${isArabicLayout ? 'text-right' : 'text-left'}`}>
                  <p className="text-sm text-gray-600">{t('finance.creditWallet.currentBalance')}</p>
                  <p className="text-2xl font-bold text-primary-600 inline-flex items-center gap-2">
                    <Wallet className="w-6 h-6 shrink-0" />
                    <RtlMoney isArabicLayout={isArabicLayout} className="text-2xl font-bold text-primary-600">
                      {formatMoney(walletBalance)}
                    </RtlMoney>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.creditWallet.creditAmount')} ({currencyCode}) *
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            placeholder="0.00"
            dir="ltr"
            className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 py-3 px-4 tabular-nums bg-white"
            required
          />
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.creditWallet.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('finance.creditWallet.descriptionPlaceholder')}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
            rows="3"
          />
        </div>

        {selectedStudent && creditAmount && parseFloat(creditAmount) > 0 && (
          <div className="bg-primary-50 p-4 rounded-xl">
            <p className={`text-sm text-gray-600 ${alignStart}`}>{t('finance.creditWallet.newBalance')}</p>
            <p className="text-2xl font-bold text-primary-600">
              <RtlMoney isArabicLayout={isArabicLayout}>
                {formatMoney(walletBalance + parseFloat(creditAmount || 0))}
              </RtlMoney>
            </p>
          </div>
        )}

        {error && (
          <div className={`bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl ${alignStart}`}>
            {error}
          </div>
        )}
        {success && (
          <div className={`bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl ${alignStart}`}>
            {t('finance.creditWallet.success')}
          </div>
        )}

        <div className="flex w-full flex-wrap items-center justify-between gap-4 pt-2">
          <button
            type="submit"
            disabled={loading || !selectedStudent}
            className="flex items-center gap-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span>{t('finance.creditWallet.processing')}</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 shrink-0" />
                <span>{t('finance.creditWallet.submit')}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/finance')}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {t('finance.creditWallet.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
