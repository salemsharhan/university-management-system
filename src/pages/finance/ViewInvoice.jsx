import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { getCollegeCurrencyCode } from '../../utils/getCollegeSettings'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { calculateFinancialMilestone } from '../../utils/financePermissions'
import { ArrowLeft, ArrowRight, DollarSign, CheckCircle, XCircle, Clock, Calendar, User, Building2, Plus, Loader2, AlertCircle } from 'lucide-react'

const INVOICE_TYPE_TO_FEE_KEY = {
  admission_fee: 'admissionFee',
  course_fee: 'courseFee',
  subject_fee: 'subjectFee',
  onboarding_fee: 'onboardingFee',
  penalty: 'penalty',
  penalty_fee: 'penalty',
  miscellaneous: 'miscellaneous',
  other: 'other',
}

function invoiceTypeLabel(type, t) {
  if (type === 'wallet_credit') return t('finance.creditWallet.title')
  const k = INVOICE_TYPE_TO_FEE_KEY[type]
  if (k) return t(`finance.feeTypes.${k}`)
  return (type || '').replace(/_/g, ' ')
}

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

function RtlMoney({ isArabicLayout, className = '', children }) {
  const inner = (
    <span dir="ltr" className={`tabular-nums ${className}`}>
      {children}
    </span>
  )
  if (!isArabicLayout) return inner
  return <div className="flex w-full min-w-0 justify-end">{inner}</div>
}

export default function ViewInvoice() {
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
  const { userRole, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [invoiceItems, setInvoiceItems] = useState([])
  const [payments, setPayments] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [relatedInvoices, setRelatedInvoices] = useState([]) // Parent or child invoices
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'other',
    amount: '',
    transaction_reference: '',
    notes: ''
  })
  const [displayCurrency, setDisplayCurrency] = useState('USD')

  useEffect(() => {
    fetchCurrentUserId()
    fetchInvoice()
  }, [id])

  useEffect(() => {
    if (!invoice?.college_id) {
      setDisplayCurrency(invoice?.currency || 'USD')
      return
    }
    getCollegeCurrencyCode(invoice.college_id)
      .then(setDisplayCurrency)
      .catch(() => setDisplayCurrency(invoice?.currency || 'USD'))
  }, [invoice?.college_id, invoice?.currency])

  const fetchCurrentUserId = async () => {
    if (!user?.email) return
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single()
      if (!error && userData) {
        setCurrentUserId(userData.id)
      }
    } catch (err) {
      console.error('Error fetching current user ID:', err)
    }
  }

  const fetchInvoice = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          students (
            id,
            student_id,
            name_en,
            name_ar,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            email,
            college_id
          ),
          semesters (
            id,
            name_en,
            name_ar,
            code,
            start_date,
            end_date
          ),
          colleges (
            id,
            name_en,
            name_ar,
            code
          )
        `)
        .eq('id', id)
        .single()

      if (invoiceError) throw invoiceError

      setInvoice(invoiceData)

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('id', { ascending: true })

      if (itemsError) throw itemsError
      setInvoiceItems(itemsData || [])

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          users:verified_by (
            id,
            email,
            name
          ),
          created_by_user:created_by (
            id,
            email,
            name
          )
        `)
        .eq('invoice_id', id)
        .order('payment_date', { ascending: false })

      if (paymentsError) throw paymentsError
      setPayments(paymentsData || [])

      // Set default payment amount to pending amount
      if (invoiceData) {
        setPaymentForm(prev => ({
          ...prev,
          amount: invoiceData.pending_amount || invoiceData.total_amount
        }))
      }

      // Fetch related invoices (parent or children)
      if (invoiceData.parent_invoice_id) {
        // This is a child invoice - fetch parent and siblings
        const { data: relatedData, error: relatedError } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            total_amount,
            paid_amount,
            pending_amount,
            status,
            due_date,
            portion_number,
            portion_percentage,
            students (student_id, name_en, name_ar, first_name, last_name, first_name_ar, last_name_ar)
          `)
          .or(`id.eq.${invoiceData.parent_invoice_id},parent_invoice_id.eq.${invoiceData.parent_invoice_id}`)
          .order('portion_number', { ascending: true, nullsFirst: false })
          .order('invoice_date', { ascending: true })

        if (!relatedError && relatedData) {
          setRelatedInvoices(relatedData)
        }
      } else {
        // This might be a parent invoice - check for children
        const { data: childrenData, error: childrenError } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            total_amount,
            paid_amount,
            pending_amount,
            status,
            due_date,
            portion_number,
            portion_percentage,
            students (student_id, name_en, name_ar, first_name, last_name, first_name_ar, last_name_ar)
          `)
          .eq('parent_invoice_id', invoiceData.id)
          .order('portion_number', { ascending: true })

        if (!childrenError && childrenData && childrenData.length > 0) {
          // Include parent in the list
          setRelatedInvoices([invoiceData, ...childrenData])
        }
      }

    } catch (err) {
      console.error('Error fetching invoice:', err)
      setError(err.message || t('finance.viewInvoice.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const updateStudentFinancialMilestone = async (studentId, semesterId) => {
    if (!semesterId) return

    try {
      const { data: semesterInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount, status, invoice_type')
        .eq('student_id', studentId)
        .eq('semester_id', semesterId)
        .neq('invoice_type', 'admission_fee')

      if (invoicesError) {
        console.error('Error fetching invoices for milestone calculation:', invoicesError)
        throw new Error(invoicesError.message || 'Failed to fetch invoices for milestone')
      }

      let totalDue = 0
      let totalPaid = 0

      semesterInvoices?.forEach(invoice => {
        totalDue += parseFloat(invoice.total_amount || 0)
        if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
          totalPaid += parseFloat(invoice.paid_amount || 0)
        }
      })

      const newMilestone = calculateFinancialMilestone(totalPaid, totalDue)

      const { data: existingRecord } = await supabase
        .from('student_semester_financial_status')
        .select('id')
        .eq('student_id', studentId)
        .eq('semester_id', semesterId)
        .maybeSingle()

      if (existingRecord) {
        const { error: updateErr } = await supabase
          .from('student_semester_financial_status')
          .update({
            financial_milestone_code: newMilestone,
            total_due: totalDue,
            total_paid: totalPaid,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
        if (updateErr) throw new Error(updateErr.message || 'Failed to update financial status')
      } else {
        const { error: insertErr } = await supabase
          .from('student_semester_financial_status')
          .insert({
            student_id: studentId,
            semester_id: semesterId,
            financial_milestone_code: newMilestone,
            total_due: totalDue,
            total_paid: totalPaid
          })
        if (insertErr) throw new Error(insertErr.message || 'Failed to create financial status')
      }

      // PM10 → ENAC (Initial payment activates enrollment)
      if (newMilestone === 'PM10') {
        const { data: student } = await supabase
          .from('students')
          .select('current_status_code')
          .eq('id', studentId)
          .single()

        if (student && student.current_status_code === 'ENPN') {
          await supabase
            .from('students')
            .update({
              current_status_code: 'ENAC',
              status_updated_at: new Date().toISOString()
            })
            .eq('id', studentId)
        }
      }

      // PM100 → Clear financial holds
      if (newMilestone === 'PM100') {
        const { data: allSemesterStatuses } = await supabase
          .from('student_semester_financial_status')
          .select('financial_milestone_code')
          .eq('student_id', studentId)

        const allPaid = allSemesterStatuses?.every(status => status.financial_milestone_code === 'PM100')

        if (allPaid) {
          await supabase
            .from('students')
            .update({
              financial_hold_reason_code: null
            })
            .eq('id', studentId)
        }
      }
    } catch (err) {
      console.error('Error updating student financial milestone:', err)
    }
  }

  const formatCurrency = (amount) => {
    const code = displayCurrency || invoice?.currency || 'USD'
    try {
      return new Intl.NumberFormat(isArabicLayout ? 'ar-SA' : 'en-US', {
        style: 'currency',
        currency: code,
      }).format(parseFloat(amount || 0))
    } catch {
      return `${code} ${parseFloat(amount || 0).toFixed(2)}`
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString(isArabicLayout ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleAddPayment = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    if (!invoice) return

    try {
      const paymentAmount = parseFloat(paymentForm.amount)
      if (!paymentAmount || paymentAmount <= 0) {
        throw new Error(t('finance.viewInvoice.errors.amountRequired'))
      }

      if (paymentAmount > parseFloat(invoice.pending_amount || 0)) {
        throw new Error(
          t('finance.viewInvoice.errors.amountExceedsPending', {
            amount: formatCurrency(parseFloat(invoice.pending_amount || 0)),
          })
        )
      }

      // Ensure we have currentUserId for admin payments
      let adminUserId = currentUserId
      if (!adminUserId && (userRole === 'admin' || userRole === 'user')) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.email) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', authUser.email)
            .single()
          if (userData?.id) {
            adminUserId = userData.id
            setCurrentUserId(userData.id)
          }
        }
      }

      // Generate payment number
      const paymentNumber = await supabase.rpc('generate_payment_number', {
        college_id_param: invoice.college_id
      })

      if (paymentNumber.error) throw paymentNumber.error

      // Create payment record
      const paymentData = {
        payment_number: paymentNumber.data,
        invoice_id: invoice.id,
        student_id: invoice.student_id,
        college_id: invoice.college_id,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        amount: paymentAmount,
        currency: displayCurrency || invoice.currency || 'USD',
        status: 'verified', // Admin payments are automatically verified
        transaction_reference: paymentForm.transaction_reference || null,
        verified_by: adminUserId, // Admin who created the payment
        verified_at: new Date().toISOString(),
        created_by: adminUserId,
        notes:
          paymentForm.notes ||
          t('finance.viewInvoice.adminPaymentNote', {
            role:
              userRole === 'admin'
                ? t('finance.viewInvoice.adminRoleUniversity')
                : t('finance.viewInvoice.adminRoleCollege'),
          }),
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)

      if (paymentError) throw paymentError

      // Update student_semester_financial_status (tuition % excludes admission_fee invoices inside the helper)
      let milestoneError = null
      if (invoice.semester_id) {
        try {
          await updateStudentFinancialMilestone(invoice.student_id, invoice.semester_id)
        } catch (err) {
          console.error('Error updating student financial status:', err)
          milestoneError = err
        }
      }

      setShowPaymentForm(false)
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'other',
        amount: '',
        transaction_reference: '',
        notes: ''
      })

      if (milestoneError) {
        setError(
          t('finance.viewInvoice.paymentRecordedPartial', { message: milestoneError.message })
        )
      } else {
        setSuccess(t('finance.viewInvoice.paymentRecordedSuccess'))
      }

      // Refresh invoice and payments in UI
      await fetchInvoice()

    } catch (err) {
      console.error('Error adding payment:', err)
      setError(err.message || t('finance.viewInvoice.errors.recordFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'partially_paid':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const invoiceStatusLabel = (status) => {
    const map = {
      pending: 'statusPending',
      paid: 'statusPaid',
      partially_paid: 'statusPartiallyPaid',
      overdue: 'statusOverdue',
      cancelled: 'statusCancelled',
    }
    const k = map[status]
    return k ? t(`finance.invoiceManagement.${k}`) : status
  }

  const paymentMethodLabel = (code) =>
    t(`finance.viewInvoice.paymentMethods.${code}`, { defaultValue: String(code || '').replace(/_/g, ' ') })

  const paymentStatusLabel = (status) => {
    const map = {
      verified: 'paymentStatusVerified',
      pending: 'paymentStatusPending',
      rejected: 'paymentStatusRejected',
    }
    const k = map[status]
    return k ? t(`finance.viewInvoice.${k}`) : status
  }

  const translatePaymentNoteText = useCallback(
    (notes) => {
      if (!notes?.trim()) return ''
      const s = notes.trim()
      const lng = isArabicLayout ? 'ar' : i18n.language
      const regFee = /^Registration fee payment received:\s*\$?([\d.,]+)\s+via\s+(.+)$/i.exec(s)
      if (regFee) {
        return i18n.t('finance.viewInvoice.notesSystem.registrationFeeReceived', {
          amount: regFee[1],
          method: regFee[2].trim(),
          lng,
        })
      }
      const autoFail = /^Auto-validation failed:\s*([\s\S]+)$/i.exec(s)
      if (autoFail) {
        return i18n.t('finance.viewInvoice.notesSystem.autoValidationFailed', {
          details: autoFail[1].trim(),
          lng,
        })
      }
      if (/Admin Payment|University Admin|College admin|processed by/i.test(s)) {
        return t('finance.viewInvoice.adminPaymentNote', {
          role: t('finance.viewInvoice.adminRoleUniversity'),
        })
      }
      return notes
    },
    [i18n, isArabicLayout, t]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" dir={isArabicLayout ? 'rtl' : 'ltr'}>
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className={`text-gray-600 ${isArabicLayout ? 'me-3' : 'ms-3'}`}>{t('finance.viewInvoice.loading')}</span>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
        <button
          type="button"
          onClick={() => navigate('/finance/invoices')}
          className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 ${isArabicLayout ? 'flex-row-reverse' : ''}`}
        >
          {isArabicLayout ? <ArrowRight className="w-5 h-5 shrink-0" /> : <ArrowLeft className="w-5 h-5 shrink-0" />}
          <span>{t('finance.viewInvoice.backToInvoices')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className={`flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className={`text-red-800 ${alignStart}`}>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
        <button
          type="button"
          onClick={() => navigate('/finance/invoices')}
          className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 ${isArabicLayout ? 'flex-row-reverse' : ''}`}
        >
          {isArabicLayout ? <ArrowRight className="w-5 h-5 shrink-0" /> : <ArrowLeft className="w-5 h-5 shrink-0" />}
          <span>{t('finance.viewInvoice.backToInvoices')}</span>
        </button>
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-12 ${isArabicLayout ? 'text-right' : 'text-center'}`}>
          <p className="text-gray-600">{t('finance.viewInvoice.invoiceNotFound')}</p>
        </div>
      </div>
    )
  }

  const pendingAmount = parseFloat(invoice.pending_amount || 0)
  const canAddPayment = (userRole === 'admin' || userRole === 'user') && pendingAmount > 0

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={`flex items-center gap-4 min-w-0 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('/finance/invoices')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            {isArabicLayout ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div className={`min-w-0 ${alignStart}`}>
            <h1 className="text-3xl font-bold text-gray-900">{t('finance.viewInvoice.title')}</h1>
            <p className="text-gray-600 mt-1">
              {t('finance.viewInvoice.subtitle', { number: invoice.invoice_number })}
            </p>
          </div>
        </div>
        {canAddPayment && (
          <button
            type="button"
            onClick={() => setShowPaymentForm(!showPaymentForm)}
            className={`flex items-center gap-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl shrink-0 ${isArabicLayout ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-5 h-5 shrink-0" />
            <span>{showPaymentForm ? t('finance.viewInvoice.cancel') : t('finance.viewInvoice.addPayment')}</span>
          </button>
        )}
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* Add Payment Form */}
      {showPaymentForm && canAddPayment && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-xl font-bold text-gray-900 mb-4 ${alignStart}`}>{t('finance.viewInvoice.addPaymentTitle')}</h2>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                  {t('finance.viewInvoice.paymentDate')} *
                </label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                  {t('finance.viewInvoice.paymentMethod')} *
                </label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
                  required
                >
                  {['cash', 'bank_transfer', 'online_payment', 'wallet', 'check', 'other'].map((pm) => (
                    <option key={pm} value={pm}>
                      {paymentMethodLabel(pm)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                  {t('finance.viewInvoice.amountPending', { amount: formatCurrency(pendingAmount) })}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={pendingAmount}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                  {t('finance.viewInvoice.transactionReference')}
                </label>
                <input
                  type="text"
                  value={paymentForm.transaction_reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
                  placeholder={t('finance.viewInvoice.optional')}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                {t('finance.viewInvoice.notes')}
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${alignStart}`}
                rows="3"
                placeholder={t('finance.viewInvoice.notesPlaceholder')}
              />
            </div>
            <div className={`flex flex-wrap items-center gap-4 ${isArabicLayout ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentForm(false)
                  setError('')
                  setSuccess('')
                }}
                className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {t('finance.viewInvoice.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex items-center gap-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${isArabicLayout ? 'flex-row-reverse' : ''}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    <span>{t('finance.viewInvoice.processing')}</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5 shrink-0" />
                    <span>{t('finance.viewInvoice.recordPayment')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className={`min-w-0 flex-1 ${alignStart}`}>
            <h2 className="text-xl font-bold text-gray-900">{t('finance.viewInvoice.invoiceInformation')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('finance.viewInvoice.invoiceNumberLabel', { number: invoice.invoice_number })}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium shrink-0 ${getStatusColor(
              invoice.status
            )}`}
          >
            {getStatusIcon(invoice.status)}
            <span>{invoiceStatusLabel(invoice.status)}</span>
          </span>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 ${alignStart}`}>
          <div className={alignStart}>
            <p className="text-sm text-gray-500">{t('finance.viewInvoice.invoiceDate')}</p>
            <p className="font-semibold">{formatDate(invoice.invoice_date)}</p>
          </div>
          {invoice.due_date && (
            <div className={alignStart}>
              <p className="text-sm text-gray-500">{t('finance.viewInvoice.dueDate')}</p>
              <p className="font-semibold">{formatDate(invoice.due_date)}</p>
            </div>
          )}
          <div className={alignStart}>
            <p className="text-sm text-gray-500">{t('finance.viewInvoice.invoiceType')}</p>
            <p className="font-semibold">{invoiceTypeLabel(invoice.invoice_type, t)}</p>
          </div>
          <div className={alignStart}>
            <p className="text-sm text-gray-500">{t('finance.viewInvoice.totalAmount')}</p>
            <p className="font-semibold text-lg">
              <RtlMoney isArabicLayout={isArabicLayout}>{formatCurrency(invoice.total_amount)}</RtlMoney>
            </p>
          </div>
          <div className={alignStart}>
            <p className="text-sm text-gray-500">{t('finance.viewInvoice.paidAmount')}</p>
            <p className="font-semibold text-green-600">
              <RtlMoney isArabicLayout={isArabicLayout} className="text-green-600">
                {formatCurrency(invoice.paid_amount)}
              </RtlMoney>
            </p>
          </div>
          <div className={alignStart}>
            <p className="text-sm text-gray-500">{t('finance.viewInvoice.pendingAmount')}</p>
            <p className="font-semibold text-red-600">
              <RtlMoney isArabicLayout={isArabicLayout} className="text-red-600">
                {formatCurrency(invoice.pending_amount)}
              </RtlMoney>
            </p>
          </div>
        </div>

        {/* Student Information */}
        {invoice.students && (
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className={`text-lg font-bold text-gray-900 mb-4 ${alignStart}`}>
              {t('finance.viewInvoice.studentInformation')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isArabicLayout ? (
                <>
                  {invoice.colleges && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className={`min-w-0 flex-1 ${alignStart}`}>
                        <p className="text-sm text-gray-500">{t('finance.viewInvoice.college')}</p>
                        <p className="font-semibold">
                          {getLocalizedName(invoice.colleges, isArabicLayout) || invoice.colleges.name_en}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className={`min-w-0 flex-1 ${alignStart}`}>
                      <p className="text-sm text-gray-500">{t('finance.viewInvoice.studentName')}</p>
                      <p className="font-semibold">{displayPersonName(invoice.students, isArabicLayout)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className={`min-w-0 flex-1 ${alignStart}`}>
                      <p className="text-sm text-gray-500">{t('finance.viewInvoice.studentNumber')}</p>
                      <p className="font-semibold" dir="ltr">
                        {invoice.students.student_id}
                      </p>
                    </div>
                  </div>
                  {invoice.semesters && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className={`min-w-0 flex-1 ${alignStart}`}>
                        <p className="text-sm text-gray-500">{t('finance.viewInvoice.semester')}</p>
                        <p className="font-semibold">
                          {getLocalizedName(invoice.semesters, isArabicLayout) || invoice.semesters.name_en} (
                          <span dir="ltr">{invoice.semesters.code}</span>)
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className={`min-w-0 ${alignStart}`}>
                      <p className="text-sm text-gray-500">{t('finance.viewInvoice.studentNumber')}</p>
                      <p className="font-semibold" dir="ltr">
                        {invoice.students.student_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400 shrink-0" />
                    <div className={`min-w-0 ${alignStart}`}>
                      <p className="text-sm text-gray-500">{t('finance.viewInvoice.studentName')}</p>
                      <p className="font-semibold">{displayPersonName(invoice.students, isArabicLayout)}</p>
                    </div>
                  </div>
                  {invoice.colleges && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className={`min-w-0 ${alignStart}`}>
                        <p className="text-sm text-gray-500">{t('finance.viewInvoice.college')}</p>
                        <p className="font-semibold">
                          {getLocalizedName(invoice.colleges, isArabicLayout) || invoice.colleges.name_en}
                        </p>
                      </div>
                    </div>
                  )}
                  {invoice.semesters && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className={`min-w-0 ${alignStart}`}>
                        <p className="text-sm text-gray-500">{t('finance.viewInvoice.semester')}</p>
                        <p className="font-semibold">
                          {getLocalizedName(invoice.semesters, isArabicLayout) || invoice.semesters.name_en} (
                          <span dir="ltr">{invoice.semesters.code}</span>)
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Items */}
      {invoiceItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-xl font-bold text-gray-900 mb-4 ${alignStart}`}>{t('finance.viewInvoice.invoiceItems')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]" dir={isArabicLayout ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className={`${alignStart} py-3 px-4 text-sm font-medium text-gray-700`}>
                    {t('finance.viewInvoice.item')}
                  </th>
                  <th className={`${alignStart} py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap`}>
                    {t('finance.viewInvoice.quantity')}
                  </th>
                  <th className={`${alignStart} py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap`}>
                    {t('finance.viewInvoice.unitPrice')}
                  </th>
                  <th className={`${alignStart} py-3 px-4 text-sm font-medium text-gray-700 whitespace-nowrap`}>
                    {t('finance.viewInvoice.lineAmount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className={`py-3 px-4 ${alignStart}`}>
                      <div>
                        <p className="font-medium">
                          {isArabicLayout && item.item_name_ar?.trim()
                            ? item.item_name_ar.trim()
                            : item.item_name_en}
                        </p>
                        {item.description && (
                          <p className="text-sm text-gray-500">{item.description}</p>
                        )}
                      </div>
                    </td>
                    <td className={`py-3 px-4 ${alignStart} tabular-nums`} dir="ltr">
                      {item.quantity}
                    </td>
                    <td className={`py-3 px-4 ${alignStart}`}>
                      <RtlMoney isArabicLayout={isArabicLayout}>{formatCurrency(item.unit_price)}</RtlMoney>
                    </td>
                    <td className={`py-3 px-4 font-semibold ${alignStart}`}>
                      <RtlMoney isArabicLayout={isArabicLayout}>{formatCurrency(item.total_amount)}</RtlMoney>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan="3" className={`py-3 px-4 font-semibold ${alignStart}`}>
                    {t('finance.viewInvoice.subtotal')}:
                  </td>
                  <td className={`py-3 px-4 font-semibold ${alignStart}`}>
                    <RtlMoney isArabicLayout={isArabicLayout}>{formatCurrency(invoice.subtotal)}</RtlMoney>
                  </td>
                </tr>
                {invoice.discount_amount > 0 && (
                  <tr>
                    <td colSpan="3" className={`py-3 px-4 ${alignStart}`}>
                      {t('finance.viewInvoice.discount')}:
                    </td>
                    <td className={`py-3 px-4 text-red-600 ${alignStart}`}>
                      <RtlMoney isArabicLayout={isArabicLayout} className="text-red-600">
                        -{formatCurrency(invoice.discount_amount)}
                      </RtlMoney>
                    </td>
                  </tr>
                )}
                {invoice.scholarship_amount > 0 && (
                  <tr>
                    <td colSpan="3" className={`py-3 px-4 ${alignStart}`}>
                      {t('finance.viewInvoice.scholarship')}:
                    </td>
                    <td className={`py-3 px-4 text-green-600 ${alignStart}`}>
                      <RtlMoney isArabicLayout={isArabicLayout} className="text-green-600">
                        -{formatCurrency(invoice.scholarship_amount)}
                      </RtlMoney>
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td colSpan="3" className={`py-3 px-4 font-bold text-lg ${alignStart}`}>
                    {t('finance.viewInvoice.total')}:
                  </td>
                  <td className={`py-3 px-4 font-bold text-lg ${alignStart}`}>
                    <RtlMoney isArabicLayout={isArabicLayout}>{formatCurrency(invoice.total_amount)}</RtlMoney>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Related Invoices (Payment Portions) */}
      {relatedInvoices.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-xl font-bold text-gray-900 mb-4 ${alignStart}`}>
            {invoice.parent_invoice_id
              ? t('finance.viewInvoice.paymentPlanOverview')
              : t('finance.viewInvoice.paymentPortions')}
          </h2>
          <div className="space-y-3">
            {relatedInvoices.map((relatedInvoice) => {
              const isCurrent = relatedInvoice.id === invoice.id
              const portionInfo = relatedInvoice.portion_number
                ? t('finance.viewInvoice.portionLabel', {
                    n: relatedInvoice.portion_number,
                    pct: relatedInvoice.portion_percentage,
                  })
                : t('finance.viewInvoice.parentInvoice')

              return (
                <div
                  key={relatedInvoice.id}
                  className={`border rounded-xl p-4 transition-colors ${
                    isCurrent
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`flex flex-wrap items-center justify-between gap-3 ${isArabicLayout ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={`flex flex-wrap items-center gap-3 mb-2 ${isArabicLayout ? 'flex-row-reverse justify-end' : ''}`}
                      >
                        <span className="font-semibold text-gray-900" dir="ltr">
                          {relatedInvoice.invoice_number}
                        </span>
                        {isCurrent && (
                          <span className="text-xs px-2 py-1 bg-primary-600 text-white rounded">
                            {t('finance.viewInvoice.current')}
                          </span>
                        )}
                        {relatedInvoice.portion_number && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">{portionInfo}</span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(relatedInvoice.status)}`}>
                          {invoiceStatusLabel(relatedInvoice.status)}
                        </span>
                      </div>
                      <div
                        className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 ${alignStart} ${isArabicLayout ? 'flex-row-reverse' : ''}`}
                      >
                        <span>
                          {t('finance.viewInvoice.totalsLine', {
                            amount: formatCurrency(relatedInvoice.total_amount),
                          })}
                        </span>
                        <span className="text-green-600">
                          {t('finance.viewInvoice.paidLine', {
                            amount: formatCurrency(relatedInvoice.paid_amount),
                          })}
                        </span>
                        <span className="text-red-600">
                          {t('finance.viewInvoice.pendingLine', {
                            amount: formatCurrency(relatedInvoice.pending_amount),
                          })}
                        </span>
                        {relatedInvoice.due_date && (
                          <span>
                            {t('finance.viewInvoice.dueLine', {
                              date: formatDate(relatedInvoice.due_date),
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => navigate(`/finance/invoices/${relatedInvoice.id}`)}
                        className={`shrink-0 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm ${isArabicLayout ? 'me-0' : 'ms-0'}`}
                      >
                        {t('finance.viewInvoice.view')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Payments History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className={`text-xl font-bold text-gray-900 mb-4 ${alignStart}`}>{t('finance.viewInvoice.paymentHistory')}</h2>
        {payments.length === 0 ? (
          <div className={`py-8 text-gray-500 ${isArabicLayout ? 'text-right' : 'text-center'}`}>
            <DollarSign
              className={`w-12 h-12 mb-2 text-gray-400 ${isArabicLayout ? 'ms-auto' : 'mx-auto'}`}
            />
            <p>{t('finance.viewInvoice.noPayments')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className={`flex flex-wrap items-start justify-between gap-3 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`flex-1 min-w-0 flex flex-col ${isArabicLayout ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`flex flex-wrap items-center gap-3 mb-2 w-full ${isArabicLayout ? 'flex-row-reverse justify-end' : ''}`}
                    >
                      <span className="font-semibold" dir="ltr">
                        {payment.payment_number}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : payment.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {payment.status === 'verified' ? (
                          <CheckCircle className="w-3 h-3 shrink-0" />
                        ) : payment.status === 'rejected' ? (
                          <XCircle className="w-3 h-3 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 shrink-0" />
                        )}
                        <span>{paymentStatusLabel(payment.status)}</span>
                      </span>
                      <span className="text-sm text-gray-500">{paymentMethodLabel(payment.payment_method)}</span>
                    </div>
                    <div
                      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 w-full ${alignStart} ${isArabicLayout ? 'flex-row-reverse justify-end' : ''}`}
                    >
                      <span>
                        {t('finance.viewInvoice.paymentDateShort')}: {formatDate(payment.payment_date)}
                      </span>
                      <span className="font-semibold text-lg">
                        {t('finance.viewInvoice.amount')}:{' '}
                        <span dir="ltr" className="tabular-nums inline-block">
                          {formatCurrency(payment.amount)}
                        </span>
                      </span>
                      {payment.transaction_reference && (
                        <span dir="ltr">
                          {t('finance.viewInvoice.reference')}: {payment.transaction_reference}
                        </span>
                      )}
                      {payment.verified_by && payment.users && (
                        <span dir="ltr">
                          {t('finance.viewInvoice.verifiedBy')}:{' '}
                          {payment.users.email || payment.users.name || '—'}
                        </span>
                      )}
                    </div>
                    {payment.notes && (
                      <p className={`text-sm text-gray-500 mt-2 w-full ${alignStart}`}>{translatePaymentNoteText(payment.notes)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

