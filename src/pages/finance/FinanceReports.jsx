import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { getCollegeCurrencyCode } from '../../utils/getCollegeSettings'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Download, FileText, TrendingUp, DollarSign, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function escapeCsvField(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(filename, csvContent) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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
  if (type === 'wallet_credit') return t('finance.creditWallet.title')
  const k = INVOICE_TYPE_TO_FEE_KEY[type]
  if (k) return t(`finance.feeTypes.${k}`)
  return (type || '').replace(/_/g, ' ')
}

function statusLabel(status, t) {
  const key = STATUS_I18N_KEYS[status]
  return key ? t(`finance.invoiceManagement.${key}`) : status
}

function RtlMoney({ isArabicLayout, className = '', inlineStat = false, children }) {
  const inner = (
    <span dir="ltr" className={`tabular-nums ${className}`}>
      {children}
    </span>
  )
  if (!isArabicLayout) return inner
  if (inlineStat) {
    return <span className="inline-flex w-full min-w-0 justify-start">{inner}</span>
  }
  return <div className="flex w-full min-w-0 justify-start">{inner}</div>
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

export default function FinanceReports() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabicLayout =
    isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')
  const alignStart = isArabicLayout ? 'text-right' : 'text-left'

  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [semesters, setSemesters] = useState([])
  const [displayCurrency, setDisplayCurrency] = useState('USD')
  const [filters, setFilters] = useState({
    semester_id: '',
    faculty_id: '',
    major_id: '',
    degree_level: '',
    student_status: '',
    pending_fees: '',
  })
  const [reportData, setReportData] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  const allRows = reportData?.data ?? []
  const totalRows = allRows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1)

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return allRows.slice(start, start + pageSize)
  }, [allRows, page, pageSize])

  const rangeFrom = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeTo = Math.min(page * pageSize, totalRows)

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [filters, collegeId, userRole])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  useEffect(() => {
    if (!collegeId) {
      setDisplayCurrency('USD')
      return
    }
    getCollegeCurrencyCode(collegeId)
      .then(setDisplayCurrency)
      .catch(() => setDisplayCurrency('USD'))
  }, [collegeId])

  useEffect(() => {
    const loadSemesters = async () => {
      try {
        let query = supabase.from('semesters').select('id, name_en, name_ar, code').order('start_date', { ascending: false }).limit(50)
        if (userRole === 'user' && collegeId) {
          query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
        } else if (userRole === 'instructor' && collegeId) {
          query = query.eq('college_id', collegeId)
        } else if (userRole === 'admin' && collegeId) {
          query = query.eq('college_id', collegeId)
        }
        const { data, error } = await query
        if (error) throw error
        setSemesters(data || [])
      } catch (e) {
        console.error(e)
        setSemesters([])
      }
    }
    loadSemesters()
  }, [collegeId, userRole])

  /**
   * When the report is scoped to a college (admin filter or user/instructor college),
   * show amounts in that college's financial_settings currency — invoice rows may still
   * store a legacy/default code (e.g. USD) while the college uses KWD.
   */
  const statsCurrency = useMemo(() => {
    if (collegeId && displayCurrency) return displayCurrency
    if (!reportData?.data?.length) return displayCurrency || 'USD'
    const codes = [...new Set(reportData.data.map((inv) => inv.currency || 'USD'))]
    if (codes.length === 1) return codes[0]
    return displayCurrency || 'USD'
  }, [reportData, displayCurrency, collegeId])

  const rowCurrency = (invoice) => {
    if (collegeId && displayCurrency) return displayCurrency
    return invoice?.currency || displayCurrency || 'USD'
  }

  const formatMoney = (amount, currency) => {
    const code = currency || statsCurrency || 'USD'
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(parseFloat(amount || 0))
    } catch {
      return `${code} ${parseFloat(amount || 0).toFixed(2)}`
    }
  }

  const pageIds = useMemo(() => paginatedRows.map((r) => r.id), [paginatedRows])
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id))

  const togglePageSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const toggleRowSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedIds(new Set(allRows.map((r) => r.id)))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const buildCsv = useCallback(
    (invoices) => {
      const headers = [
        t('finance.financeReports.table.invoice'),
        t('finance.financeReports.table.invoiceDate'),
        t('finance.financeReports.table.student'),
        t('finance.financeReports.table.type'),
        t('finance.financeReports.table.status'),
        t('finance.financeReports.table.currency'),
        t('finance.financeReports.table.total'),
        t('finance.financeReports.table.paid'),
        t('finance.financeReports.table.pending'),
      ]
      const lines = [headers.map(escapeCsvField).join(',')]
      for (const inv of invoices) {
        const st = inv.students
        const studentLabel = st
          ? `${st.student_id || ''} ${displayPersonName(st, isArabicLayout) || st.name_en || ''}`.trim()
          : ''
        lines.push(
          [
            inv.invoice_number,
            inv.invoice_date || '',
            studentLabel,
            invoiceTypeLabel(inv.invoice_type, t),
            statusLabel(inv.status, t),
            rowCurrency(inv),
            parseFloat(inv.total_amount || 0).toFixed(2),
            parseFloat(inv.paid_amount || 0).toFixed(2),
            parseFloat(inv.pending_amount || 0).toFixed(2),
          ]
            .map(escapeCsvField)
            .join(',')
        )
      }
      return lines.join('\r\n')
    },
    [t, isArabicLayout, collegeId, displayCurrency]
  )

  const handleExport = () => {
    if (!allRows.length) return
    const rows = selectedIds.size > 0 ? allRows.filter((r) => selectedIds.has(r.id)) : allRows
    const csv = buildCsv(rows)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`finance-report-${stamp}.csv`, csv)
  }

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from('invoices').select(`
          id,
          invoice_number,
          currency,
          total_amount,
          paid_amount,
          pending_amount,
          status,
          invoice_type,
          invoice_date,
          students (
            id,
            student_id,
            name_en,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            name_ar,
            status,
            gpa,
            majors (
              id,
              name_en,
              name_ar,
              degree_level,
              departments (
                id,
                name_en
              )
            ),
            colleges (
              id,
              name_en,
              name_ar
            )
          ),
          semesters (
            id,
            name_en
          )
        `)

      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      if (filters.semester_id) {
        query = query.eq('semester_id', parseInt(filters.semester_id, 10))
      }

      if (filters.pending_fees === 'yes') {
        query = query.gt('pending_amount', 0)
      } else if (filters.pending_fees === 'no') {
        query = query.eq('pending_amount', 0)
      }

      const { data, error } = await query
      if (error) throw error

      let filtered = data || []

      if (filters.major_id) {
        filtered = filtered.filter((inv) => inv.students?.majors?.id === parseInt(filters.major_id, 10))
      }

      if (filters.degree_level) {
        filtered = filtered.filter((inv) => inv.students?.majors?.degree_level === filters.degree_level)
      }

      if (filters.student_status) {
        filtered = filtered.filter((inv) => inv.students?.status === filters.student_status)
      }

      const stats = {
        totalInvoices: filtered.length,
        totalAmount: filtered.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0),
        totalPaid: filtered.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0),
        totalPending: filtered.reduce((sum, inv) => sum + parseFloat(inv.pending_amount || 0), 0),
        byStatus: {},
        byType: {},
      }

      filtered.forEach((inv) => {
        stats.byStatus[inv.status] = (stats.byStatus[inv.status] || 0) + 1
        stats.byType[inv.invoice_type] = (stats.byType[inv.invoice_type] || 0) + 1
      })

      setReportData({ data: filtered, stats })
    } catch (err) {
      console.error('Error fetching report:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, collegeId, userRole])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const th = `py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${alignStart}`
  const td = `py-3 px-4 ${alignStart}`

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className={alignStart}>
          <h1 className="text-3xl font-bold text-gray-900">{t('finance.financeReports.title')}</h1>
          <p className="text-gray-600 mt-1">{t('finance.financeReports.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!totalRows}
          title={
            selectedIds.size > 0
              ? t('finance.financeReports.selection.exportUsesSelection')
              : undefined
          }
          className="flex items-center gap-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          <Download className="w-5 h-5 shrink-0" />
          <span>
            {selectedIds.size > 0
              ? `${t('finance.financeReports.export')} (${selectedIds.size})`
              : t('finance.financeReports.export')}
          </span>
        </button>
      </div>

      {userRole === 'admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4" dir={isArabicLayout ? 'rtl' : 'ltr'}>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.financeReports.filterCollege')}
            {requiresCollegeSelection && <span className="text-red-500"> *</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className={`w-full md:max-w-md border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none ps-4 pe-10 py-2.5 ${alignStart} ${
              requiresCollegeSelection ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300 bg-white'
            }`}
          >
            <option value="">{t('finance.financeReports.allColleges')}</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {getLocalizedName(c, isArabicLayout) || c.name_en}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
        <h2 className={`text-lg font-semibold mb-4 ${alignStart}`}>{t('finance.financeReports.filters')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.financeReports.semester')}
            </label>
            <select
              value={filters.semester_id}
              onChange={(e) => setFilters({ ...filters, semester_id: e.target.value })}
              className={`w-full border border-gray-300 rounded-xl ps-4 pe-10 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 ${alignStart}`}
            >
              <option value="">{t('finance.financeReports.allSemesters')}</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {getLocalizedName(sem, isArabicLayout) || sem.code} ({sem.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.financeReports.degreeLevel')}
            </label>
            <select
              value={filters.degree_level}
              onChange={(e) => setFilters({ ...filters, degree_level: e.target.value })}
              className={`w-full border border-gray-300 rounded-xl ps-4 pe-10 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 ${alignStart}`}
            >
              <option value="">{t('finance.financeReports.allLevels')}</option>
              <option value="bachelor">{t('finance.financeReports.levelBachelor')}</option>
              <option value="master">{t('finance.financeReports.levelMaster')}</option>
              <option value="phd">{t('finance.financeReports.levelPhd')}</option>
              <option value="diploma">{t('finance.financeReports.levelDiploma')}</option>
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.financeReports.pendingFees')}
            </label>
            <select
              value={filters.pending_fees}
              onChange={(e) => setFilters({ ...filters, pending_fees: e.target.value })}
              className={`w-full border border-gray-300 rounded-xl ps-4 pe-10 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 ${alignStart}`}
            >
              <option value="">{t('finance.financeReports.all')}</option>
              <option value="yes">{t('finance.financeReports.yes')}</option>
              <option value="no">{t('finance.financeReports.no')}</option>
            </select>
          </div>
        </div>
      </div>

      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
            <div className="flex w-full items-center justify-between gap-3">
              <div className={`min-w-0 flex-1 ${alignStart}`}>
                <p className="text-sm text-gray-600">{t('finance.financeReports.stats.totalInvoices')}</p>
                <p className={`text-2xl font-bold tabular-nums ${isArabicLayout ? 'block w-full' : ''}`} dir="ltr">
                  {reportData.stats.totalInvoices}
                </p>
              </div>
              <FileText className="w-8 h-8 text-primary-600 shrink-0" aria-hidden />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
            <div className="flex w-full items-center justify-between gap-3">
              <div className={`min-w-0 flex-1 ${alignStart}`}>
                <p className="text-sm text-gray-600">{t('finance.financeReports.stats.totalAmount')}</p>
                <p className={`text-2xl font-bold ${alignStart}`}>
                  <RtlMoney isArabicLayout={isArabicLayout} inlineStat>
                    {formatMoney(reportData.stats.totalAmount, statsCurrency)}
                  </RtlMoney>
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 shrink-0" aria-hidden />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
            <div className="flex w-full items-center justify-between gap-3">
              <div className={`min-w-0 flex-1 ${alignStart}`}>
                <p className="text-sm text-gray-600">{t('finance.financeReports.stats.totalPaid')}</p>
                <p className={`text-2xl font-bold ${alignStart}`}>
                  <RtlMoney isArabicLayout={isArabicLayout} inlineStat>
                    {formatMoney(reportData.stats.totalPaid, statsCurrency)}
                  </RtlMoney>
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 shrink-0" aria-hidden />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
            <div className="flex w-full items-center justify-between gap-3">
              <div className={`min-w-0 flex-1 ${alignStart}`}>
                <p className="text-sm text-gray-600">{t('finance.financeReports.stats.totalPending')}</p>
                <p className={`text-2xl font-bold text-red-600 ${alignStart}`}>
                  <RtlMoney isArabicLayout={isArabicLayout} inlineStat className="text-red-600">
                    {formatMoney(reportData.stats.totalPending, statsCurrency)}
                  </RtlMoney>
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600 shrink-0" aria-hidden />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        reportData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
            <h2 className={`text-lg font-semibold mb-4 ${alignStart}`}>{t('finance.financeReports.reportData')}</h2>

            <div className={`flex flex-wrap items-center gap-3 mb-4 ${alignStart}`}>
              <label className={`flex items-center gap-2 text-sm text-gray-700 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                <span>{t('finance.financeReports.pagination.rowsPerPage')}</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg ps-2 pe-8 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-sm text-gray-600">
                {t('finance.financeReports.pagination.showing', {
                  from: rangeFrom,
                  to: rangeTo,
                  total: totalRows,
                })}
              </span>
              {totalRows > 0 && (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-sm font-medium text-primary-600 hover:text-primary-800"
                >
                  {t('finance.financeReports.selection.selectAllFiltered', { count: totalRows })}
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  {t('finance.financeReports.selection.clear')}
                </button>
              )}
              <span className="text-sm text-gray-500">
                {t('finance.financeReports.selection.selectedCount', { count: selectedIds.size })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="w-12 py-3 px-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={t('finance.financeReports.selection.selectPage')}
                        checked={allPageSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = somePageSelected && !allPageSelected
                        }}
                        onChange={togglePageSelection}
                        disabled={pageIds.length === 0}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className={th}>{t('finance.financeReports.table.invoice')}</th>
                    <th className={th}>{t('finance.financeReports.table.student')}</th>
                    <th className={th}>{t('finance.financeReports.table.type')}</th>
                    <th className={th}>{t('finance.financeReports.table.total')}</th>
                    <th className={th}>{t('finance.financeReports.table.paid')}</th>
                    <th className={th}>{t('finance.financeReports.table.pending')}</th>
                    <th className={th}>{t('finance.financeReports.table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={t('finance.financeReports.table.select')}
                          checked={selectedIds.has(invoice.id)}
                          onChange={() => toggleRowSelection(invoice.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className={td}>
                        <span dir="ltr" className="tabular-nums font-medium">
                          {invoice.invoice_number}
                        </span>
                      </td>
                      <td className={td}>
                        {isArabicLayout ? (
                          <>
                            <span>{displayPersonName(invoice.students, true) || invoice.students?.name_en || '—'}</span>
                            {' '}
                            <span dir="ltr" className="tabular-nums text-gray-600">
                              ({invoice.students?.student_id})
                            </span>
                          </>
                        ) : (
                          <>
                            <span dir="ltr" className="tabular-nums">
                              {invoice.students?.student_id}
                            </span>
                            {' — '}
                            {displayPersonName(invoice.students, false) || invoice.students?.name_en}
                          </>
                        )}
                      </td>
                      <td className={td}>{invoiceTypeLabel(invoice.invoice_type, t)}</td>
                      <td className={td}>
                        <RtlMoney isArabicLayout={isArabicLayout}>
                          {formatMoney(invoice.total_amount, rowCurrency(invoice))}
                        </RtlMoney>
                      </td>
                      <td className={td}>
                        <RtlMoney isArabicLayout={isArabicLayout}>
                          {formatMoney(invoice.paid_amount, rowCurrency(invoice))}
                        </RtlMoney>
                      </td>
                      <td className={td}>
                        <RtlMoney isArabicLayout={isArabicLayout} className="text-red-600">
                          {formatMoney(invoice.pending_amount, rowCurrency(invoice))}
                        </RtlMoney>
                      </td>
                      <td className={td}>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {statusLabel(invoice.status, t)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalRows > 0 && (
              <div
                className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 ${alignStart}`}
              >
                <span className="text-sm text-gray-600">
                  {t('finance.financeReports.pagination.pageOf', { current: page, total: totalPages })}
                </span>
                <div className={`flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isArabicLayout ? (
                      <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
                    ) : (
                      <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden />
                    )}
                    {t('finance.financeReports.pagination.prev')}
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('finance.financeReports.pagination.next')}
                    {isArabicLayout ? (
                      <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
