import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { normalizeCurrencyCode, getCollegeCurrencyCode } from '../../utils/getCollegeSettings'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import {
  Search,
  FileText,
  Download,
  CheckCircle,
  Clock,
  DollarSign,
  Building2,
  GraduationCap,
  BookOpen,
  User,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react'

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

const STATUS_I18N_KEYS = {
  pending: 'statusPending',
  paid: 'statusPaid',
  partially_paid: 'statusPartiallyPaid',
  overdue: 'statusOverdue',
  cancelled: 'statusCancelled',
}

function invoiceTypeLabel(type, t) {
  const k = INVOICE_TYPE_TO_FEE_KEY[type]
  if (k) return t(`finance.feeTypes.${k}`)
  return (type || '').replace(/_/g, ' ')
}

function statusLabel(status, t) {
  const key = STATUS_I18N_KEYS[status]
  return key ? t(`finance.invoiceManagement.${key}`) : status
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

/** In RTL, dir=ltr amounts default to the left; flex-start follows direction so values sit on the right. */
function RtlMoney({ isArabicLayout, inline = false, className = '', children }) {
  const inner = (
    <span dir="ltr" className={`tabular-nums ${className}`}>
      {children}
    </span>
  )
  if (!isArabicLayout) {
    return inner
  }
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

export default function InvoiceManagement() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabicLayout =
    isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')

  const locale = isArabicLayout ? 'ar' : 'en-US'

  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [studentData, setStudentData] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [groupedInvoices, setGroupedInvoices] = useState({})
  const [walletBalance, setWalletBalance] = useState(0)
  const [pendingFees, setPendingFees] = useState(0)
  const [viewMode, setViewMode] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [semesters, setSemesters] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [error, setError] = useState('')
  const [studentViewCurrency, setStudentViewCurrency] = useState('USD')
  /** When admin picks one college (or college user), all amounts use this from financial settings. */
  const [scopedCollegeCurrency, setScopedCollegeCurrency] = useState('USD')
  /** Admin + all colleges: map college_id -> ISO code from each college's financial settings. */
  const [collegeCurrencyMap, setCollegeCurrencyMap] = useState({})
  const fetchInvoicesSeq = useRef(0)

  useEffect(() => {
    let cancelled = false
    const cid = userRole === 'admin' ? selectedCollegeId : collegeId
    if (!cid) {
      setScopedCollegeCurrency('USD')
      return
    }
    getCollegeCurrencyCode(cid).then((code) => {
      if (!cancelled) setScopedCollegeCurrency(code)
    })
    return () => {
      cancelled = true
    }
  }, [userRole, selectedCollegeId, collegeId])

  useEffect(() => {
    if (viewMode === 'all') {
      if (userRole === 'admin') {
        fetchAllInvoices()
        fetchSemesters()
      } else if (userRole === 'user') {
        if (collegeId) {
          fetchAllInvoices()
          fetchSemesters()
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [userRole, collegeId, selectedCollegeId, statusFilter, selectedSemesterId, viewMode])

  useEffect(() => {
    if (viewMode === 'student' && searchQuery && searchQuery.length >= 3) {
      const timeoutId = setTimeout(() => {
        searchStudent()
      }, 500)
      return () => clearTimeout(timeoutId)
    } else if (viewMode === 'student') {
      setStudentData(null)
      setInvoices([])
      setGroupedInvoices({})
      setStudentViewCurrency('USD')
    }
  }, [searchQuery, collegeId, viewMode])

  const fetchSemesters = async () => {
    if (userRole !== 'admin' && userRole !== 'user') return
    if (userRole === 'user' && !collegeId) return

    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, name_ar, code, start_date, end_date')
        .order('start_date', { ascending: false })
        .limit(50)

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'admin' && selectedCollegeId) {
        query = query.or(`college_id.eq.${selectedCollegeId},is_university_wide.eq.true`)
      }

      const { data, error: qErr } = await query
      if (qErr) throw qErr
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
    }
  }

  const fetchAllInvoices = async () => {
    if (viewMode !== 'all' || (userRole !== 'admin' && userRole !== 'user')) {
      setLoading(false)
      return
    }

    if (userRole === 'user' && !collegeId) {
      setLoading(false)
      setInvoices([])
      setGroupedInvoices({})
      return
    }

    const seq = ++fetchInvoicesSeq.current
    setLoading(true)
    try {
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          invoice_type,
          status,
          subtotal,
          discount_amount,
          scholarship_amount,
          total_amount,
          paid_amount,
          pending_amount,
          currency,
          semester_id,
          student_id,
          college_id,
          students (
            id,
            student_id,
            name_en,
            name_ar,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            email
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
        .order('invoice_date', { ascending: false })
        .limit(500)

      if (userRole === 'admin' && selectedCollegeId) {
        query = query.eq('college_id', selectedCollegeId)
      } else if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (selectedSemesterId) {
        query = query.eq('semester_id', selectedSemesterId)
      }

      const { data: invoicesData, error: invoicesError } = await query

      if (seq !== fetchInvoicesSeq.current) return

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError)
        setError(t('finance.invoiceManagement.fetchFailed', { message: invoicesError.message || '—' }))
        setInvoices([])
        setGroupedInvoices({})
        setCollegeCurrencyMap({})
        return
      }

      const rows = invoicesData || []

      if (userRole === 'admin' && !selectedCollegeId && rows.length > 0) {
        const ids = [...new Set(rows.map((r) => r.college_id).filter(Boolean))]
        const map = {}
        await Promise.all(
          ids.map(async (id) => {
            map[id] = await getCollegeCurrencyCode(id)
          })
        )
        if (seq !== fetchInvoicesSeq.current) return
        setCollegeCurrencyMap(map)
      } else {
        setCollegeCurrencyMap({})
      }

      setInvoices(rows)

      const grouped = {}
      let totalPending = 0

      rows.forEach((invoice) => {
        const semesterKey = invoice.semester_id ? `semester_${invoice.semester_id}` : 'no_semester'

        if (!grouped[semesterKey]) {
          grouped[semesterKey] = {
            semester: invoice.semesters,
            invoices: [],
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
          }
        }

        grouped[semesterKey].invoices.push(invoice)
        grouped[semesterKey].totalAmount += parseFloat(invoice.total_amount || 0)
        grouped[semesterKey].paidAmount += parseFloat(invoice.paid_amount || 0)
        grouped[semesterKey].pendingAmount += parseFloat(invoice.pending_amount || 0)

        if (
          invoice.status === 'pending' ||
          invoice.status === 'overdue' ||
          invoice.status === 'partially_paid'
        ) {
          totalPending += parseFloat(invoice.pending_amount || 0)
        }
      })

      if (seq !== fetchInvoicesSeq.current) return

      setGroupedInvoices(grouped)
      setPendingFees(totalPending)
      setError('')
    } catch (err) {
      console.error('Error fetching all invoices:', err)
      if (seq === fetchInvoicesSeq.current) {
        setError(t('finance.invoiceManagement.loadFailed', { message: err.message || '—' }))
        setInvoices([])
        setGroupedInvoices({})
        setCollegeCurrencyMap({})
      }
    } finally {
      if (seq === fetchInvoicesSeq.current) setLoading(false)
    }
  }

  const searchStudent = async () => {
    if (!collegeId && userRole !== 'admin') return

    setLoading(true)
    try {
      let studentQuery = supabase
        .from('students')
        .select(`
          id,
          student_id,
          name_en,
          name_ar,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          email,
          phone,
          status,
          gpa,
          enrollment_date,
          college_id,
          study_type,
          study_load,
          study_approach,
          colleges (
            id,
            name_en,
            name_ar
          ),
          majors (
            id,
            name_en,
            name_ar,
            code,
            degree_level,
            departments (
              id,
              name_en,
              name_ar
            )
          )
        `)
        .ilike('student_id', `%${searchQuery}%`)
        .limit(1)

      if (userRole === 'user' && collegeId) {
        studentQuery = studentQuery.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        studentQuery = studentQuery.eq('college_id', collegeId)
      }

      const { data: studentRows, error: studentError } = await studentQuery

      if (studentError) {
        console.error('Error searching student:', studentError)
        setStudentData(null)
        return
      }

      if (!studentRows || studentRows.length === 0) {
        setStudentData(null)
        setInvoices([])
        setGroupedInvoices({})
        return
      }

      const student = studentRows[0]
      setStudentData(student)

      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('student_id', student.id)
        .single()

      setWalletBalance(walletData?.balance || 0)

      let invoiceQuery = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          invoice_type,
          status,
          subtotal,
          discount_amount,
          scholarship_amount,
          total_amount,
          paid_amount,
          pending_amount,
          currency,
          semester_id,
          semesters (
            id,
            name_en,
            name_ar,
            code,
            start_date,
            end_date
          )
        `)
        .eq('student_id', student.id)
        .order('invoice_date', { ascending: false })

      if (userRole === 'user' && collegeId) {
        invoiceQuery = invoiceQuery.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        invoiceQuery = invoiceQuery.eq('college_id', collegeId)
      }

      const { data: invoicesData, error: invoicesError } = await invoiceQuery

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError)
        return
      }

      setInvoices(invoicesData || [])

      const grouped = {}
      let totalPending = 0

      ;(invoicesData || []).forEach((invoice) => {
        const semesterKey = invoice.semester_id ? `semester_${invoice.semester_id}` : 'no_semester'

        if (!grouped[semesterKey]) {
          grouped[semesterKey] = {
            semester: invoice.semesters,
            invoices: [],
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
          }
        }

        grouped[semesterKey].invoices.push(invoice)
        grouped[semesterKey].totalAmount += parseFloat(invoice.total_amount || 0)
        grouped[semesterKey].paidAmount += parseFloat(invoice.paid_amount || 0)
        grouped[semesterKey].pendingAmount += parseFloat(invoice.pending_amount || 0)

        if (
          invoice.status === 'pending' ||
          invoice.status === 'overdue' ||
          invoice.status === 'partially_paid'
        ) {
          totalPending += parseFloat(invoice.pending_amount || 0)
        }
      })

      setGroupedInvoices(grouped)
      setPendingFees(totalPending)

      const code = await getCollegeCurrencyCode(student.college_id)
      setStudentViewCurrency(code)
    } catch (err) {
      console.error('Error in search:', err)
    } finally {
      setLoading(false)
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
        return <CheckCircle className="w-4 h-4 shrink-0" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4 shrink-0" />
      default:
        return <Clock className="w-4 h-4 shrink-0" />
    }
  }

  /** Prefer college financial settings when the UI is scoped to one college; else per-invoice college map. */
  const currencyForInvoice = (invoice) => {
    if (userRole === 'admin' && selectedCollegeId) return scopedCollegeCurrency
    if (userRole === 'user' && collegeId) return scopedCollegeCurrency
    if (invoice?.college_id && collegeCurrencyMap[invoice.college_id]) {
      return collegeCurrencyMap[invoice.college_id]
    }
    return normalizeCurrencyCode(invoice?.currency)
  }

  const formatCurrency = (amount, invoiceOrCode) => {
    const c =
      typeof invoiceOrCode === 'string' || invoiceOrCode == null
        ? normalizeCurrencyCode(invoiceOrCode)
        : currencyForInvoice(invoiceOrCode)
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: c }).format(amount || 0)
    } catch {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(amount || 0)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const semesterTitle = (sem) =>
    sem ? `${getLocalizedName(sem, isArabicLayout) || sem.code} (${sem.code})` : ''

  const alignStart = isArabicLayout ? 'text-right' : 'text-left'
  const iconRow = isArabicLayout ? 'flex-row-reverse' : ''

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={alignStart}>
          <h1 className="text-3xl font-bold text-gray-900">{t('finance.invoiceManagement.title')}</h1>
          <p className="text-gray-600 mt-1">{t('finance.invoiceManagement.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/finance/invoices/create')}
          className={`flex items-center gap-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all ${iconRow}`}
        >
          <FileText className="w-5 h-5 shrink-0" />
          <span>{t('finance.invoiceManagement.createInvoice')}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4" dir={isArabicLayout ? 'rtl' : 'ltr'}>
          <div className={`flex items-center gap-2 ${iconRow}`}>
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className={`text-red-800 ${alignStart}`}>{error}</p>
          </div>
        </div>
      )}

      {userRole === 'admin' && (
        <div
          className={`bg-white rounded-2xl shadow-sm border p-4 ${
            requiresCollegeSelection ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
          }`}
          dir={isArabicLayout ? 'rtl' : 'ltr'}
        >
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.invoiceManagement.filterByCollege')}{' '}
            {requiresCollegeSelection && (
              <span className="text-red-500">{t('finance.invoiceManagement.requiredMark')}</span>
            )}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => {
              const newCollegeId = e.target.value ? parseInt(e.target.value, 10) : null
              setSelectedCollegeId(newCollegeId)
              setSelectedSemesterId('')
              setError('')
            }}
            className={`w-full md:w-64 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${alignStart} ${
              requiresCollegeSelection ? 'border-yellow-300 bg-white' : 'border-gray-300'
            }`}
            required={requiresCollegeSelection}
          >
            <option value="">{t('finance.invoiceManagement.allColleges')}</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {getLocalizedName(college, isArabicLayout) || college.name_en}
              </option>
            ))}
          </select>
          {requiresCollegeSelection && (
            <p className="text-xs text-yellow-600 mt-1">{t('finance.invoiceManagement.selectCollegePrompt')}</p>
          )}
        </div>
      )}

      {(userRole === 'admin' || userRole === 'user') && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4" dir={isArabicLayout ? 'rtl' : 'ltr'}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-700">{t('finance.invoiceManagement.viewMode')}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('all')
                  setSearchQuery('')
                  setStudentData(null)
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('finance.invoiceManagement.allInvoices')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('student')
                  setInvoices([])
                  setGroupedInvoices({})
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'student'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('finance.invoiceManagement.searchByStudent')}
              </button>
            </div>
          </div>

          {viewMode === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                  {t('finance.invoiceManagement.filterByStatus')}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${alignStart}`}
                >
                  <option value="all">{t('finance.invoiceManagement.allStatuses')}</option>
                  <option value="pending">{t('finance.invoiceManagement.statusPending')}</option>
                  <option value="paid">{t('finance.invoiceManagement.statusPaid')}</option>
                  <option value="partially_paid">{t('finance.invoiceManagement.statusPartiallyPaid')}</option>
                  <option value="overdue">{t('finance.invoiceManagement.statusOverdue')}</option>
                  <option value="cancelled">{t('finance.invoiceManagement.statusCancelled')}</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                  {t('finance.invoiceManagement.filterBySemester')}
                </label>
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${alignStart}`}
                >
                  <option value="">{t('finance.invoiceManagement.allSemesters')}</option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {getLocalizedName(semester, isArabicLayout) || semester.code} ({semester.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className={`flex items-end ${alignStart}`}>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{t('finance.invoiceManagement.totalInvoices')}:</span>{' '}
                  <span dir="ltr" className="inline-block tabular-nums">
                    {invoices.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'student' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
          <div className="relative">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none ${
                isArabicLayout ? 'right-3' : 'left-3'
              }`}
            />
            <input
              type="text"
              placeholder={t('finance.invoiceManagement.searchStudentPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                isArabicLayout ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
              }`}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className={`flex items-center justify-center py-12 gap-3 ${iconRow}`}>
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 shrink-0" />
          <span className="text-gray-600">
            {viewMode === 'all' ? t('finance.invoiceManagement.loadingInvoices') : t('finance.invoiceManagement.searching')}
          </span>
        </div>
      )}

      {!loading && viewMode === 'all' && invoices.length === 0 && (userRole === 'admin' || userRole === 'user') && (
        <div
          className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-12 ${isArabicLayout ? 'text-right' : 'text-center'}`}
          dir={isArabicLayout ? 'rtl' : 'ltr'}
        >
          <FileText className={`w-16 h-16 text-gray-400 mb-4 ${isArabicLayout ? 'ms-auto' : 'mx-auto'}`} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('finance.invoiceManagement.noInvoicesFound')}</h3>
          <p className="text-gray-600 mb-4">
            {userRole === 'admin' && !selectedCollegeId
              ? t('finance.invoiceManagement.noInvoicesHintAdminAll')
              : userRole === 'admin' && selectedCollegeId
                ? t('finance.invoiceManagement.noInvoicesHintAdminCollege')
                : userRole === 'user'
                  ? t('finance.invoiceManagement.noInvoicesHintUser')
                  : t('finance.invoiceManagement.noInvoicesHintGeneric')}
          </p>
        </div>
      )}

      {studentData && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
          <h2 className={`text-xl font-bold text-gray-900 mb-4 ${alignStart}`}>
            {t('finance.invoiceManagement.studentInformation')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[
              {
                icon: User,
                label: t('finance.invoiceManagement.studentNumber'),
                value: <span dir="ltr">{studentData.student_id}</span>,
              },
              {
                icon: User,
                label: t('finance.invoiceManagement.studentName'),
                value: displayPersonName(studentData, isArabicLayout),
              },
              {
                icon: Building2,
                label: t('finance.invoiceManagement.faculty'),
                value: getLocalizedName(studentData.colleges, isArabicLayout) || '—',
              },
              {
                icon: GraduationCap,
                label: t('finance.invoiceManagement.major'),
                value: getLocalizedName(studentData.majors, isArabicLayout) || '—',
              },
              {
                icon: BookOpen,
                label: t('finance.invoiceManagement.studyType'),
                value: studentData.study_type || '—',
              },
              {
                icon: BookOpen,
                label: t('finance.invoiceManagement.studyLoad'),
                value: studentData.study_load || '—',
              },
              {
                icon: BookOpen,
                label: t('finance.invoiceManagement.studyApproach'),
                value: studentData.study_approach || '—',
              },
              {
                icon: GraduationCap,
                label: t('finance.invoiceManagement.degreeLevel'),
                value: studentData.majors?.degree_level || '—',
              },
              {
                icon: TrendingUp,
                label: t('finance.invoiceManagement.status'),
                value: studentData.status || '—',
              },
              {
                icon: TrendingUp,
                label: t('finance.invoiceManagement.gpa'),
                value: (
                  <span dir="ltr">{studentData.gpa != null ? Number(studentData.gpa).toFixed(2) : '—'}</span>
                ),
              },
              {
                icon: DollarSign,
                label: t('finance.invoiceManagement.pendingFees'),
                value: (
                  <RtlMoney isArabicLayout={isArabicLayout} className="text-red-600 font-semibold">
                    {formatCurrency(pendingFees, studentViewCurrency)}
                  </RtlMoney>
                ),
              },
              {
                icon: DollarSign,
                label: t('finance.invoiceManagement.walletBalance'),
                value: (
                  <RtlMoney isArabicLayout={isArabicLayout} className="text-green-600 font-semibold">
                    {formatCurrency(walletBalance, studentViewCurrency)}
                  </RtlMoney>
                ),
              },
            ].map(({ icon: Icon, label, value }, idx) => (
              <div key={idx} className={`flex items-start gap-3 ${iconRow}`}>
                <Icon className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                <div className={`min-w-0 flex-1 ${alignStart}`}>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="font-semibold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && Object.keys(groupedInvoices).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedInvoices).map(([key, group]) => {
            const firstInv = group.invoices[0]
            const groupCurrency = firstInv ? currencyForInvoice(firstInv) : scopedCollegeCurrency
            return (
            <div
              key={key}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              dir={isArabicLayout ? 'rtl' : 'ltr'}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className={`min-w-0 flex-1 ${alignStart}`}>
                  <h3 className="text-lg font-bold text-gray-900">
                    {group.semester ? semesterTitle(group.semester) : t('finance.invoiceManagement.noSemesterAssigned')}
                  </h3>
                  {group.semester && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span dir="ltr">
                        {formatDate(group.semester.start_date)} — {formatDate(group.semester.end_date)}
                      </span>
                    </p>
                  )}
                  {viewMode === 'all' && (
                    <p className="text-sm text-gray-500 mt-1">
                      {group.invoices.length === 1
                        ? t('finance.invoiceManagement.invoicesCountOne')
                        : t('finance.invoiceManagement.invoicesCount', { count: group.invoices.length })}
                    </p>
                  )}
                </div>
                <div className={`min-w-0 w-full sm:w-auto ${alignStart}`}>
                  <p className="text-sm text-gray-500">{t('finance.invoiceManagement.totalAmount')}</p>
                  <RtlMoney isArabicLayout={isArabicLayout} className="text-lg font-bold">
                    {formatCurrency(group.totalAmount, groupCurrency)}
                  </RtlMoney>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  {
                    bg: 'bg-blue-50',
                    label: t('finance.invoiceManagement.admissionFees'),
                    amount: group.invoices
                      .filter((inv) => inv.invoice_type === 'admission_fee')
                      .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0),
                    color: 'text-blue-600',
                  },
                  {
                    bg: 'bg-green-50',
                    label: t('finance.invoiceManagement.subjectFees'),
                    amount: group.invoices
                      .filter((inv) => inv.invoice_type === 'subject_fee' || inv.invoice_type === 'course_fee')
                      .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0),
                    color: 'text-green-600',
                  },
                  {
                    bg: 'bg-yellow-50',
                    label: t('finance.invoiceManagement.paidFees'),
                    amount: group.paidAmount,
                    color: 'text-yellow-600',
                  },
                ].map((box, i) => (
                  <div key={i} className={`${box.bg} p-4 rounded-xl ${alignStart}`}>
                    <p className="text-sm text-gray-600">{box.label}</p>
                    <RtlMoney isArabicLayout={isArabicLayout} className={`text-xl font-bold ${box.color}`}>
                      {formatCurrency(box.amount, groupCurrency)}
                    </RtlMoney>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className={`p-4 bg-red-50 rounded-xl ${alignStart}`}>
                  <span className="font-semibold text-red-900 block">
                    {t('finance.invoiceManagement.totalPendingFees')}
                  </span>
                  <RtlMoney isArabicLayout={isArabicLayout} className="text-xl font-bold text-red-600 mt-1">
                    {formatCurrency(group.pendingAmount, groupCurrency)}
                  </RtlMoney>
                </div>
              </div>

              <div className="space-y-3">
                {group.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                    dir={isArabicLayout ? 'rtl' : 'ltr'}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2 justify-start">
                          <span className="font-semibold" dir="ltr">
                            {invoice.invoice_number}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {getStatusIcon(invoice.status)}
                            <span>{statusLabel(invoice.status, t)}</span>
                          </span>
                          <span className="text-sm text-gray-600">{invoiceTypeLabel(invoice.invoice_type, t)}</span>
                          {viewMode === 'all' && invoice.students && (
                            <span className="text-sm text-gray-700 font-medium">
                              {t('finance.invoiceManagement.studentLine', {
                                id: invoice.students.student_id,
                                name: displayPersonName(invoice.students, isArabicLayout) || '—',
                              })}
                            </span>
                          )}
                          {viewMode === 'all' && invoice.colleges && (
                            <span className="text-sm text-gray-500">
                              {getLocalizedName(invoice.colleges, isArabicLayout) || invoice.colleges.name_en}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 justify-start">
                          <span>
                            {t('finance.invoiceManagement.date')}:{' '}
                            <span dir="ltr" className="tabular-nums">
                              {formatDate(invoice.invoice_date)}
                            </span>
                          </span>
                          {invoice.due_date && (
                            <span>
                              {t('finance.invoiceManagement.due')}:{' '}
                              <span dir="ltr" className="tabular-nums">
                                {formatDate(invoice.due_date)}
                              </span>
                            </span>
                          )}
                          <span>
                            {t('finance.invoiceManagement.total')}:{' '}
                            <RtlMoney
                              isArabicLayout={isArabicLayout}
                              inline
                              className="font-medium text-gray-900"
                            >
                              {formatCurrency(invoice.total_amount, invoice)}
                            </RtlMoney>
                          </span>
                          <span>
                            {t('finance.invoiceManagement.paid')}:{' '}
                            <RtlMoney
                              isArabicLayout={isArabicLayout}
                              inline
                              className="font-medium text-gray-900"
                            >
                              {formatCurrency(invoice.paid_amount, invoice)}
                            </RtlMoney>
                          </span>
                          <span className="text-red-600">
                            {t('finance.invoiceManagement.pending')}:{' '}
                            <RtlMoney
                              isArabicLayout={isArabicLayout}
                              inline
                              className="font-semibold text-red-600"
                            >
                              {formatCurrency(invoice.pending_amount, invoice)}
                            </RtlMoney>
                          </span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 shrink-0 ${iconRow}`}>
                        <button
                          type="button"
                          onClick={() => navigate(`/finance/invoices/${invoice.id}`)}
                          className="px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors whitespace-nowrap"
                        >
                          {t('finance.invoiceManagement.viewDetails')}
                        </button>
                        <button
                          type="button"
                          onClick={() => console.log('Export invoice', invoice.id)}
                          className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                          title={t('finance.invoiceManagement.exportInvoice')}
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
