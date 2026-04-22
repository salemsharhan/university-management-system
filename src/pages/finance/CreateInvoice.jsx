import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { calculateFinancialMilestone } from '../../utils/financePermissions'
import { getCollegeCurrencyCode } from '../../utils/getCollegeSettings'
import { FEE_TYPES_USING_MAJOR_REGISTRATION, getMajorRegistrationFeeAmount } from '../../utils/feeHierarchy'
import { buildStudentSearchOrFilter } from '../../utils/studentSearchQuery'
import { normalizeFeeTypeCode, normalizeInvoiceTypeEnum } from '../../utils/invoiceTypeEnum'
import { ArrowLeft, ArrowRight, Save, Search, Plus, Trash2, Loader2 } from 'lucide-react'

const FEE_CODE_TO_I18N = {
  admission_fee: 'admissionFee',
  application_fee: 'applicationFee',
  registration_fee: 'registrationFee',
  course_fee: 'courseFee',
  subject_fee: 'subjectFee',
  tuition_fee: 'tuitionFee',
  onboarding_fee: 'onboardingFee',
  lab_fee: 'labFee',
  library_fee: 'libraryFee',
  sports_fee: 'sportsFee',
  late_payment_penalty: 'latePaymentPenalty',
  penalty: 'penalty',
  miscellaneous: 'miscellaneous',
  other: 'other',
}

function feeTypeI18nLabel(code, t) {
  const k = FEE_CODE_TO_I18N[code]
  return k ? t(`finance.feeTypes.${k}`) : (code || '').replace(/_/g, ' ')
}

function feeTypeDisplayLabel(code, feeTypes, isArabic, t) {
  const ft = feeTypes.find((f) => f.code === code)
  if (ft) {
    const primary = isArabic ? ft.name_ar || ft.name_en : ft.name_en || ft.name_ar
    return (primary || '').trim() || feeTypeI18nLabel(code, t)
  }
  return feeTypeI18nLabel(code, t)
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

export default function CreateInvoice() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const isArabicLayout = isRTL
  const alignStart = isArabicLayout ? 'text-right' : 'text-left'
  const iconRow = isArabicLayout ? 'flex-row-reverse' : ''
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId, user } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId
  const [currentUserId, setCurrentUserId] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [students, setStudents] = useState([])
  const [feeStructures, setFeeStructures] = useState([])
  const [studentData, setStudentData] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [feeTypes, setFeeTypes] = useState([])
  const [selectedFeeStructures, setSelectedFeeStructures] = useState([]) // Array of selected fee structure IDs
  const [collegeCurrencyCode, setCollegeCurrencyCode] = useState('USD')
  const [invoiceMode, setInvoiceMode] = useState('single') // single | bulk

  // Bulk generation
  const [academicYears, setAcademicYears] = useState([])
  const [majors, setMajors] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ total: 0, done: 0, skipped: 0, failed: 0 })
  const [bulkResult, setBulkResult] = useState([])
  const [bulkForm, setBulkForm] = useState({
    academic_year_id: '',
    major_id: '',
    semester_id: '',
    send_email: true,
  })

  const [formData, setFormData] = useState({
    student_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_type: '',
    semester_id: '', // Required for semester-based fees
    payment_method: 'pending',
    items: [
      {
        item_type: '',
        item_name_en: '',
        item_name_ar: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_amount: 0
      }
    ],
    discount_amount: 0,
    notes: ''
  })

  useEffect(() => {
    if (!collegeId) return
    fetchAcademicYears()
    fetchMajorsForBulk()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId])

  const fetchAcademicYears = async () => {
    try {
      if (!collegeId && userRole !== 'admin') return
      let q = supabase
        .from('academic_years')
        .select('id, name_en, name_ar, code, status, start_date, end_date, is_university_wide, college_id')
        .order('start_date', { ascending: false })
        .limit(30)
      if (collegeId) q = q.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      const { data, error } = await q
      if (!error) setAcademicYears(data || [])
    } catch (e) {
      console.error('fetchAcademicYears error:', e)
      setAcademicYears([])
    }
  }

  const fetchMajorsForBulk = async () => {
    try {
      let q = supabase.from('majors').select('id, name_en, name_ar, code, college_id, is_university_wide').eq('status', 'active').order('name_en')
      if (collegeId) q = q.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      const { data, error } = await q
      if (!error) setMajors(data || [])
    } catch (e) {
      console.error('fetchMajorsForBulk error:', e)
      setMajors([])
    }
  }

  const computeSemesterFeesFromConfig = async ({ semesterId, majorId }) => {
    if (!collegeId || !semesterId) return { total: 0, items: [], portionsSource: null }
    const { data: majorRow } = majorId
      ? await supabase.from('majors').select('id, degree_level').eq('id', majorId).maybeSingle()
      : { data: null }
    const degreeLevel = majorRow?.degree_level || null

    const { data: cfg } = await supabase
      .from('finance_configuration')
      .select('id, fee_type, fee_name_en, fee_name_ar, amount, semester_id, applies_to_semester, applies_to_major, applies_to_degree_level, is_active, payment_portions')
      .eq('is_active', true)
      .or(`college_id.eq.${collegeId},is_university_wide.eq.true`)

    const matchesArray = (arr, value) => {
      if (!Array.isArray(arr) || arr.length === 0) return true
      if (value == null) return false
      return arr.includes(value)
    }

    const applicable = (cfg || []).filter((row) => {
      const feeType = String(row?.fee_type || '').toLowerCase()
      if (feeType === 'admission_fee' || feeType === 'registration_fee' || feeType === 'application_fee' || feeType === 'wallet_credit') return false
      const semOk =
        (row?.semester_id != null && Number(row.semester_id) === Number(semesterId)) ||
        (Array.isArray(row?.applies_to_semester) && row.applies_to_semester.includes(Number(semesterId)))
      if (!semOk) return false
      if (!matchesArray(row?.applies_to_major, Number(majorId))) return false
      if (!matchesArray(row?.applies_to_degree_level, degreeLevel)) return false
      return true
    })

    const num = (v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'))
      return Number.isFinite(n) ? n : 0
    }
    const total = applicable.reduce((acc, row) => acc + num(row?.amount), 0)
    const portionsSource = applicable.find((r) => Array.isArray(r?.payment_portions) && r.payment_portions.length > 0) || null
    return { total, items: applicable, portionsSource }
  }

  const calcDue = (portion, invoiceDate, previousPortionDate = null) => {
    if (portion?.deadline_type === 'custom_date') return portion.custom_date
    const days = parseInt(portion?.days || 0)
    if (portion?.deadline_type === 'days_from_previous' && previousPortionDate) {
      const d = new Date(previousPortionDate)
      d.setDate(d.getDate() + days)
      return d.toISOString().split('T')[0]
    }
    const d = new Date(invoiceDate)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const sendInvoiceEmail = async ({ to, invoiceNumber, semesterName, amount }) => {
    if (!to) return
    const subject = t('finance.bulkInvoice.emailSubject', { defaultValue: 'Payment invoice available' })
    const message = t('finance.bulkInvoice.emailMessage', {
      defaultValue:
        'A new invoice ({{invoiceNumber}}) is available in your student portal for {{semester}}. Amount due: {{amount}}. Please log in to Student Portal → Invoices & fees to pay.',
      invoiceNumber,
      semester: semesterName || '—',
      amount,
    })
    await supabase.functions.invoke('send-admission-notification', {
      body: { to, subject, message, type: 'finance_invoice' },
    })
  }

  const handleBulkGenerate = async () => {
    setError('')
    setBulkResult([])
    setBulkProgress({ total: 0, done: 0, skipped: 0, failed: 0 })
    if (!collegeId) {
      setError(t('finance.createInvoicePage.selectCollegeContinue'))
      return
    }
    if (!bulkForm.academic_year_id || !bulkForm.major_id || !bulkForm.semester_id) {
      setError(t('finance.bulkInvoice.required', { defaultValue: 'Select academic year, major, and semester.' }))
      return
    }
    try {
      setBulkLoading(true)

      const semesterId = parseInt(bulkForm.semester_id)
      const majorId = parseInt(bulkForm.major_id)

      // Build target student list
      const { data: st } = await supabase
        .from('students')
        .select('id')
        .eq('status', 'active')
        .eq('college_id', collegeId)
        .eq('major_id', majorId)
      const studentIds = (st || []).map((r) => r.id)

      setBulkProgress((p) => ({ ...p, total: studentIds.length }))
      if (studentIds.length === 0) return

      const { total, items, portionsSource } = await computeSemesterFeesFromConfig({ semesterId, majorId })
      if (!total || total <= 0) {
        setError(t('finance.bulkInvoice.noConfig', { defaultValue: 'No semester fee configuration found for this selection.' }))
        return
      }

      const semesterObj = semesters.find((s) => String(s.id) === String(semesterId))
      const semesterName = semesterObj ? getLocalizedName(semesterObj, isArabicLayout) : ''

      // portion definition
      const portions = Array.isArray(portionsSource?.payment_portions) ? portionsSource.payment_portions.slice() : []
      const portionsToCreate =
        portions.length > 0
          ? portions.sort((a, b) => (a.portion_number || 0) - (b.portion_number || 0))
          : [{ portion_number: 1, percentage: 100, deadline_type: 'days_from_invoice', days: 0 }]

      const invoiceDate = new Date().toISOString().split('T')[0]

      const results = []
      for (const sid of studentIds) {
        try {
          // Skip if already has a payable invoice (child/standalone) for this semester
          const { data: existing } = await supabase
            .from('invoices')
            .select('id')
            .eq('student_id', sid)
            .eq('semester_id', semesterId)
            .neq('invoice_type', 'admission_fee')
            .limit(1)
            .maybeSingle()
          if (existing?.id) {
            results.push({ student_id: sid, status: 'skipped', reason: 'invoice_exists' })
            setBulkProgress((p) => ({ ...p, done: p.done + 1, skipped: p.skipped + 1 }))
            continue
          }

          const { data: parentNum } = await supabase.rpc('generate_invoice_number', { college_id_param: collegeId })
          const { data: parent, error: parentErr } = await supabase
            .from('invoices')
            .insert({
              invoice_number: parentNum,
              student_id: sid,
              college_id: collegeId,
              invoice_date: invoiceDate,
              due_date: invoiceDate,
              invoice_type: 'course_fee',
              status: 'pending',
              subtotal: total,
              discount_amount: 0,
              scholarship_amount: 0,
              tax_amount: 0,
              total_amount: total,
              paid_amount: 0,
              pending_amount: total,
              currency: collegeCurrencyCode,
              payment_method: null,
              notes: 'Bulk generated semester fees',
              semester_id: semesterId,
              fee_structure_id: portionsSource?.id || null,
            })
            .select('id, invoice_number')
            .single()
          if (parentErr) throw parentErr

          let previousDue = invoiceDate
          let firstPayableInvoiceNumber = null
          for (const portion of portionsToCreate) {
            const pct = parseFloat(portion?.percentage || 0)
            const portionAmount = (total * pct) / 100
            const dueDate = calcDue(portion, invoiceDate, previousDue)
            const { data: childNum } = await supabase.rpc('generate_invoice_number', { college_id_param: collegeId })

            const { data: child, error: childErr } = await supabase
              .from('invoices')
              .insert({
                invoice_number: childNum,
                student_id: sid,
                college_id: collegeId,
                invoice_date: invoiceDate,
                due_date: dueDate,
                invoice_type: 'course_fee',
                status: 'pending',
                subtotal: portionAmount,
                discount_amount: 0,
                scholarship_amount: 0,
                tax_amount: 0,
                total_amount: portionAmount,
                paid_amount: 0,
                pending_amount: portionAmount,
                currency: collegeCurrencyCode,
                payment_method: null,
                notes: `Portion ${portion?.portion_number || 1} (${pct}%) - Bulk generated`,
                semester_id: semesterId,
                parent_invoice_id: parent.id,
                fee_structure_id: portionsSource?.id || null,
                portion_number: portion?.portion_number || 1,
                portion_percentage: pct,
              })
              .select('id, invoice_number')
              .single()
            if (childErr) throw childErr
            if (!firstPayableInvoiceNumber) firstPayableInvoiceNumber = child.invoice_number

            const lines = (items || []).map((row) => {
              const amt = parseFloat(row?.amount || 0) || 0
              const lineTotal = (amt * pct) / 100
              return {
                invoice_id: child.id,
                item_type: normalizeFeeTypeCode(row?.fee_type || 'other'),
                item_name_en: row?.fee_name_en || 'Fee',
                item_name_ar: row?.fee_name_ar || null,
                description: `Portion ${portion?.portion_number || 1} (${pct}%)`,
                quantity: 1,
                unit_price: lineTotal,
                discount_amount: 0,
                scholarship_amount: 0,
                total_amount: lineTotal,
                reference_id: row?.id || null,
                reference_type: 'finance_configuration',
              }
            })
            if (lines.length > 0) {
              const { error: itemsErr } = await supabase.from('invoice_items').insert(lines)
              if (itemsErr) throw itemsErr
            }

            previousDue = dueDate
          }

          if (bulkForm.send_email) {
            const { data: stu } = await supabase.from('students').select('email').eq('id', sid).maybeSingle()
            await sendInvoiceEmail({
              to: stu?.email,
              invoiceNumber: firstPayableInvoiceNumber || parent.invoice_number,
              semesterName,
              amount: new Intl.NumberFormat(isArabicLayout ? 'ar' : 'en-US', { style: 'currency', currency: collegeCurrencyCode }).format(
                portionsToCreate?.[0]?.percentage ? (total * parseFloat(portionsToCreate[0].percentage)) / 100 : total
              ),
            })
          }

          results.push({ student_id: sid, status: 'created', invoice_number: parent.invoice_number })
          setBulkProgress((p) => ({ ...p, done: p.done + 1 }))
        } catch (e) {
          console.error('bulk student error:', sid, e)
          results.push({ student_id: sid, status: 'failed', reason: e?.message || String(e) })
          setBulkProgress((p) => ({ ...p, done: p.done + 1, failed: p.failed + 1 }))
        }
      }

      setBulkResult(results)
    } finally {
      setBulkLoading(false)
    }
  }

  useEffect(() => {
    // Get current user ID from users table (for verified_by and created_by fields)
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
    fetchCurrentUserId()
  }, [user])

  useEffect(() => {
    if (studentSearch && studentSearch.length >= 2) {
      searchStudents()
    } else {
      setStudents([])
    }
  }, [studentSearch, collegeId])

  useEffect(() => {
    const cid = selectedStudent?.college_id || collegeId
    if (!cid) {
      setCollegeCurrencyCode('USD')
      return
    }
    let cancelled = false
    getCollegeCurrencyCode(cid).then((code) => {
      if (!cancelled) setCollegeCurrencyCode(code)
    })
    return () => {
      cancelled = true
    }
  }, [selectedStudent?.college_id, collegeId])

  useEffect(() => {
    fetchFeeTypes()
  }, [collegeId])

  useEffect(() => {
    if (selectedStudent) {
      setFormData((prev) => ({ ...prev, semester_id: '' }))
      fetchStudentData()
      fetchSemesters()
    } else {
      // In bulk mode we still need semesters (based on selected college/year)
      if (invoiceMode !== 'bulk') setSemesters([])
      setStudentData(null)
    }
  }, [selectedStudent, invoiceMode])

  // Bulk mode: fetch semesters for the selected college + chosen academic year
  useEffect(() => {
    if (invoiceMode !== 'bulk') return
    if (!collegeId) {
      setSemesters([])
      return
    }
    fetchSemesters({ collegeIdOverride: collegeId, academicYearId: bulkForm.academic_year_id || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceMode, collegeId, bulkForm.academic_year_id])

  useEffect(() => {
    // Fetch fee structures when student data is loaded
    // Fee structures will be filtered based on semester selection in fetchFeeStructures
    if (selectedStudent && studentData) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        fetchFeeStructures()
      }, 100)
    }
  }, [selectedStudent, studentData, formData.semester_id, formData.invoice_type, collegeId])

  // Also fetch fee structures when invoice type changes (for non-semester fees)
  useEffect(() => {
    if (selectedStudent && studentData && formData.invoice_type && !formData.semester_id) {
      const selectedType = feeTypes.find((ft) => ft.code === formData.invoice_type)
      if (selectedType?.requires_semester === false) {
        setTimeout(() => {
          fetchFeeStructures()
        }, 100)
      }
    }
  }, [formData.invoice_type, selectedStudent, studentData])

  const fetchFeeTypes = async () => {
    try {
      let query = supabase
        .from('fee_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name_en', { ascending: true })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'admin' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'admin') {
        query = query.or('is_university_wide.eq.true,college_id.is.null')
      }

      const { data, error } = await query
      if (error) throw error
      setFeeTypes(data || [])
    } catch (err) {
      console.error('Error fetching fee types:', err)
    }
  }

  const fetchSemesters = async ({ collegeIdOverride = null, academicYearId = null } = {}) => {
    const cid = collegeIdOverride || selectedStudent?.college_id || collegeId
    if (!cid) {
      setSemesters([])
      return
    }

    try {
      let q = supabase
        .from('semesters')
        .select('id, name_en, name_ar, code, start_date, academic_year_id')
        .or(`college_id.eq.${cid},is_university_wide.eq.true`)
        .order('start_date', { ascending: false })
        .limit(50)

      if (academicYearId) {
        q = q.eq('academic_year_id', Number(academicYearId))
      }

      const { data, error } = await q
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setSemesters([])
    }
  }

  const fetchStudentData = async () => {
    try {
      const { data, error } = await supabase
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
          college_id,
          major_id,
          majors (
            id,
            name_en,
            name_ar,
            degree_level,
            registration_fee,
            tuition_fee,
            lab_fee
          )
        `)
        .eq('id', selectedStudent.id)
        .single()

      if (error) throw error
      setStudentData(data)
    } catch (err) {
      console.error('Error fetching student data:', err)
    }
  }

  const fetchFeeStructures = async () => {
    const scopedCollegeId = selectedStudent?.college_id ?? collegeId
    if (!scopedCollegeId && userRole !== 'admin') {
      setFeeStructures([])
      return
    }
    if (!selectedStudent || !studentData) {
      setFeeStructures([])
      return
    }

    try {
      let query = supabase
        .from('finance_configuration')
        .select('*')
        .eq('is_active', true)

      if (userRole === 'user' && scopedCollegeId) {
        query = query.or(`college_id.eq.${scopedCollegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && scopedCollegeId) {
        query = query.or(`college_id.eq.${scopedCollegeId},is_university_wide.eq.true`)
      } else if (userRole === 'admin' && scopedCollegeId) {
        query = query.or(`college_id.eq.${scopedCollegeId},is_university_wide.eq.true`)
      } else if (userRole === 'admin') {
        // University admin - show all university-wide structures
        query = query.or('is_university_wide.eq.true,college_id.is.null')
      }

      // Fetch all matching fee structures, then filter in JavaScript for array contains
      const { data: allStructures, error } = await query
      if (error) {
        console.error('Error fetching fee structures:', error)
        throw error
      }

      // Filter by student criteria in JavaScript (PostgREST array contains can be tricky)
      let filteredStructures = (allStructures || []).filter(fee => {
        // Filter by semester - fee structure must apply to selected semester or have no semester restriction
        // If no semester selected, only show fees that don't require semesters
        if (formData.semester_id) {
          const semesterIdInt = parseInt(formData.semester_id)
          if (fee.applies_to_semester && Array.isArray(fee.applies_to_semester) && fee.applies_to_semester.length > 0) {
            if (!fee.applies_to_semester.includes(semesterIdInt)) {
              return false
            }
          }
        } else {
          // If no semester selected, only show fees that don't require semesters (e.g., admission fees)
          // Check if fee type requires semester - fetch from feeTypes if available
          if (fee.applies_to_semester && Array.isArray(fee.applies_to_semester) && fee.applies_to_semester.length > 0) {
            // Fee has semesters assigned - check if current invoice type requires semester
            if (formData.invoice_type) {
              const selectedType = feeTypes.find((ft) => ft.code === formData.invoice_type)
              if (selectedType?.requires_semester !== false) {
                return false
              }
            } else {
              // No invoice type selected yet - skip semester-based fees
              return false
            }
          }
        }

        // Filter by major - fee structure must apply to student's major or have no major restriction
        if (studentData?.major_id) {
          const majorIdInt = parseInt(studentData.major_id)
          if (fee.applies_to_major && Array.isArray(fee.applies_to_major) && fee.applies_to_major.length > 0) {
            if (!fee.applies_to_major.includes(majorIdInt)) {
              return false
            }
          }
        }

        // Filter by degree level - fee structure must apply to student's degree level or have no degree restriction
        if (studentData?.majors?.degree_level) {
          if (fee.applies_to_degree_level && Array.isArray(fee.applies_to_degree_level) && fee.applies_to_degree_level.length > 0) {
            if (!fee.applies_to_degree_level.includes(studentData.majors.degree_level)) {
              return false
            }
          }
        }

        return true
      })

      console.log(`Found ${filteredStructures.length} fee structures for student ${selectedStudent.id}`)
      setFeeStructures(filteredStructures)
    } catch (err) {
      console.error('Error fetching fee structures:', err)
      setFeeStructures([])
    }
  }

  const applyFeeStructures = (feeStructureIds) => {
    if (!feeStructureIds || feeStructureIds.length === 0) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => !item.from_fee_structure && !item.from_major_catalog),
      }))
      return
    }

    // Get selected fee structures
    const selectedStructures = feeStructures.filter(fs => feeStructureIds.includes(fs.id))
    
    if (selectedStructures.length === 0) return

    // Create items from fee structures
    const feeStructureItems = selectedStructures.map(feeStructure => ({
      from_fee_structure: true, // Flag to indicate this item came from a fee structure
      fee_structure_id: feeStructure.id, // Track which fee structure this came from
      item_type: feeStructure.fee_type,
      item_name_en: feeStructure.fee_name_en,
      item_name_ar: feeStructure.fee_name_ar || '',
      description: feeStructure.description || '',
      quantity: 1,
      unit_price: parseFloat(feeStructure.amount || 0),
      total_amount: parseFloat(feeStructure.amount || 0)
    }))

    const manualItems = formData.items.filter(
      (item) => !item.from_fee_structure && !item.from_major_catalog
    )

    const firstStructure = selectedStructures[0]

    setFormData({
      ...formData,
      invoice_type: firstStructure.fee_type || 'other',
      items: [...feeStructureItems, ...manualItems]
    })
  }

  const handleFeeStructureSelection = (feeStructureIds) => {
    setSelectedFeeStructures(feeStructureIds)
    applyFeeStructures(feeStructureIds)
  }

  const searchStudents = async () => {
    const orFilter = buildStudentSearchOrFilter(studentSearch)
    if (!orFilter) {
      setStudents([])
      return
    }
    if (!collegeId && userRole !== 'admin') return

    try {
      let query = supabase
        .from('students')
        .select(
          'id, student_id, name_en, name_ar, first_name, last_name, first_name_ar, last_name_ar, email, phone, mobile_phone, college_id'
        )
        .or(orFilter)
        .limit(10)

      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error('Error searching students:', err)
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value

    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(newItems[index].quantity) || 0
      const unitPrice = parseFloat(newItems[index].unit_price) || 0
      newItems[index].total_amount = quantity * unitPrice
    }

    setFormData({ ...formData, items: newItems })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          item_type: '',
          item_name_en: '',
          item_name_ar: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          total_amount: 0
        }
      ]
    })
  }

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index)
      setFormData({ ...formData, items: newItems })
    }
  }

  const applyMajorRegistrationFee = () => {
    const maj = studentData?.majors
    const amt = getMajorRegistrationFeeAmount(maj)
    if (amt == null) return
    const invType = formData.invoice_type || 'admission_fee'
    setSelectedFeeStructures([])
    setFormData((prev) => ({
      ...prev,
      invoice_type: prev.invoice_type || invType,
      items: [
        {
          from_major_catalog: true,
          from_fee_structure: false,
          item_type: invType,
          item_name_en: t('finance.createInvoicePage.lineFromMajorRegistration'),
          item_name_ar: '',
          description: t('finance.createInvoicePage.lineFromMajorRegistrationDesc'),
          quantity: 1,
          unit_price: amt,
          total_amount: amt,
        },
      ],
    }))
  }

  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
    const discount = parseFloat(formData.discount_amount) || 0
    return Math.max(0, subtotal - discount)
  }

  // Calculate due date for a payment portion
  const calculatePortionDueDate = (portion, invoiceDate, previousPortionDate = null) => {
    if (portion.deadline_type === 'custom_date') {
      return portion.custom_date
    } else if (portion.deadline_type === 'days_from_previous' && previousPortionDate) {
      const date = new Date(previousPortionDate)
      date.setDate(date.getDate() + parseInt(portion.days))
      return date.toISOString().split('T')[0]
    } else {
      // days_from_invoice
      const date = new Date(invoiceDate)
      date.setDate(date.getDate() + parseInt(portion.days))
      return date.toISOString().split('T')[0]
    }
  }

  // Check if any selected fee structures have payment portions
  const hasPaymentPortions = () => {
    if (selectedFeeStructures.length === 0) return false
    const structuresWithPortions = feeStructures.filter(fs => 
      selectedFeeStructures.includes(fs.id) && 
      fs.payment_portions && 
      Array.isArray(fs.payment_portions) && 
      fs.payment_portions.length > 0
    )
    return structuresWithPortions.length > 0
  }

  const updateStudentFinancialMilestone = async (studentId, semesterId) => {
    if (!semesterId) {
      console.warn('No semester ID provided for milestone calculation')
      return
    }

    try {
      // Fetch all invoices for this student for the specific semester
      // Include parent_invoice_id to handle payment portions correctly
      const { data: semesterInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, status, invoice_type, parent_invoice_id, portion_percentage')
        .eq('student_id', studentId)
        .eq('semester_id', semesterId)
        .neq('invoice_type', 'admission_fee') // Exclude registration/admission fees from semester milestone

      if (invoicesError) {
        console.error('Error fetching invoices for milestone calculation:', invoicesError)
        return
      }

      // Calculate total due and total paid for this semester
      // For invoices with payment portions:
      // - If invoice has parent_invoice_id, it's a child invoice - count it
      // - If invoice has no parent_invoice_id but has child invoices, only count the parent (children are already counted)
      // - Otherwise, count the invoice normally
      let totalDue = 0
      let totalPaid = 0
      const parentInvoiceIds = new Set()

      // First, identify parent invoices (those with child invoices)
      semesterInvoices?.forEach(invoice => {
        if (!invoice.parent_invoice_id) {
          // Check if this invoice has children
          const hasChildren = semesterInvoices.some(inv => inv.parent_invoice_id === invoice.id)
          if (hasChildren) {
            parentInvoiceIds.add(invoice.id)
          }
        }
      })

      // Calculate totals
      semesterInvoices?.forEach(invoice => {
        // Skip parent invoices that have children (we'll count children instead)
        if (parentInvoiceIds.has(invoice.id)) {
          return
        }

        // Count child invoices and standalone invoices
        totalDue += parseFloat(invoice.total_amount || 0)
        if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
          totalPaid += parseFloat(invoice.paid_amount || 0)
        }
      })

      // Calculate new financial milestone for this semester
      const newMilestone = calculateFinancialMilestone(totalPaid, totalDue)

      // Update or insert student semester financial status
      // Check if record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('student_semester_financial_status')
        .select('id')
        .eq('student_id', studentId)
        .eq('semester_id', semesterId)
        .maybeSingle() // Use maybeSingle() to return null instead of throwing error when no record exists

      if (checkError) {
        console.error('Error checking existing record:', checkError)
      }

      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('student_semester_financial_status')
          .update({
            financial_milestone_code: newMilestone,
            total_due: totalDue,
            total_paid: totalPaid,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)

        if (updateError) {
          console.error('Error updating student semester financial milestone:', updateError)
        } else {
          console.log(`Student ${studentId} semester ${semesterId} milestone updated to ${newMilestone} (${totalPaid}/${totalDue})`)
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('student_semester_financial_status')
          .insert({
            student_id: studentId,
            semester_id: semesterId,
            financial_milestone_code: newMilestone,
            total_due: totalDue,
            total_paid: totalPaid
          })

        if (insertError) {
          console.error('Error creating student semester financial milestone:', insertError)
        } else {
          console.log(`Student ${studentId} semester ${semesterId} milestone created: ${newMilestone} (${totalPaid}/${totalDue})`)
        }
      }

      // If milestone changed, check for automatic status impact
      // PM10 → ENAC (Initial payment activates enrollment) - only for first semester
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

      // PM100 → Clear financial holds for this semester
      if (newMilestone === 'PM100') {
        // Check if all active semesters are paid
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedStudent) {
      setError(t('finance.createInvoicePage.errors.selectStudent'))
      return
    }

    if (!formData.invoice_type) {
      setError(t('finance.createInvoicePage.errors.selectInvoiceType'))
      return
    }

    const selectedType = feeTypes.find((ft) => ft.code === formData.invoice_type)

    if (selectedType?.requires_semester && !formData.semester_id) {
      setError(t('finance.createInvoicePage.errors.selectSemester'))
      return
    }

    if (formData.items.some((item) => !item.item_name_en || item.unit_price === '' || item.unit_price == null)) {
      setError(t('finance.createInvoicePage.errors.fillItems'))
      return
    }

    setLoading(true)

    try {
      // Generate invoice number
      const invoiceNumber = await supabase.rpc('generate_invoice_number', {
        college_id_param: selectedStudent.college_id
      })

      if (invoiceNumber.error) throw invoiceNumber.error

      const rawFeeCode = formData.invoice_type || formData.items[0]?.item_type || 'other'
      const invoiceTypeEnum = normalizeInvoiceTypeEnum(rawFeeCode)
      const selectedFeeTypeObj =
        feeTypes.find((ft) => ft.code === formData.invoice_type) ||
        feeTypes.find((ft) => ft.code === rawFeeCode) ||
        feeTypes.find((ft) => ft.code === normalizeFeeTypeCode(rawFeeCode))
      const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
      const discount = parseFloat(formData.discount_amount) || 0
      const total = subtotal - discount

      // Determine payment status and method based on selection
      const isPaid = formData.payment_method === 'cash' || formData.payment_method === 'admin_payment'
      const paymentMethodValue = formData.payment_method === 'cash' ? 'cash' : 
                                 formData.payment_method === 'admin_payment' ? 'other' : null

      // Check if we need to create multiple invoices (payment portions)
      const structuresWithPortions = feeStructures.filter(fs => 
        selectedFeeStructures.includes(fs.id) && 
        fs.payment_portions && 
        Array.isArray(fs.payment_portions) && 
        fs.payment_portions.length > 0
      )

      // Add semester_id based on fee type requirements
      const semesterId = formData.semester_id && selectedFeeTypeObj?.requires_semester !== false 
        ? parseInt(formData.semester_id) 
        : null

      let parentInvoice = null
      let createdInvoices = []

      if (structuresWithPortions.length > 0) {
        // Create multiple invoices for payment portions
        // First, create a parent invoice (summary invoice)
        const parentInvoiceData = {
          invoice_number: invoiceNumber.data,
          student_id: selectedStudent.id,
          college_id: selectedStudent.college_id,
          invoice_date: formData.invoice_date,
          invoice_type: invoiceTypeEnum,
          status: 'pending', // Parent invoice status will be calculated from children
          subtotal: subtotal,
          discount_amount: discount,
          scholarship_amount: 0,
          tax_amount: 0,
          total_amount: total,
          paid_amount: 0,
          pending_amount: total,
          currency: collegeCurrencyCode,
          payment_method: paymentMethodValue,
          notes: formData.notes || null,
          semester_id: semesterId,
          fee_structure_id: structuresWithPortions[0].id // Link to first fee structure with portions
        }

        const { data: parent, error: parentError } = await supabase
          .from('invoices')
          .insert(parentInvoiceData)
          .select()
          .single()

        if (parentError) throw parentError
        parentInvoice = parent

        // Create child invoices for each portion
        const allPortions = structuresWithPortions.flatMap(fs => 
          fs.payment_portions.map(p => ({ ...p, fee_structure_id: fs.id }))
        )

        // Sort portions by portion_number
        allPortions.sort((a, b) => a.portion_number - b.portion_number)

        let previousPortionDate = formData.invoice_date

        for (const portion of allPortions) {
          const portionAmount = (total * portion.percentage) / 100
          const dueDate = calculatePortionDueDate(portion, formData.invoice_date, previousPortionDate)

          // Generate invoice number for child invoice
          const childInvoiceNumber = await supabase.rpc('generate_invoice_number', {
            college_id_param: selectedStudent.college_id
          })
          if (childInvoiceNumber.error) throw childInvoiceNumber.error

          const childInvoiceData = {
            invoice_number: childInvoiceNumber.data,
            student_id: selectedStudent.id,
            college_id: selectedStudent.college_id,
            invoice_date: formData.invoice_date,
            due_date: dueDate,
            invoice_type: invoiceTypeEnum,
            status: isPaid ? 'paid' : 'pending',
            subtotal: portionAmount,
            discount_amount: 0,
            scholarship_amount: 0,
            tax_amount: 0,
            total_amount: portionAmount,
            paid_amount: isPaid ? portionAmount : 0,
            pending_amount: isPaid ? 0 : portionAmount,
            currency: collegeCurrencyCode,
            payment_method: paymentMethodValue,
            notes: `Portion ${portion.portion_number} (${portion.percentage}%) - ${formData.notes || ''}`.trim() || null,
            semester_id: semesterId,
            parent_invoice_id: parent.id,
            fee_structure_id: portion.fee_structure_id,
            portion_number: portion.portion_number,
            portion_percentage: portion.percentage
          }

          const { data: childInvoice, error: childError } = await supabase
            .from('invoices')
            .insert(childInvoiceData)
            .select()
            .single()

          if (childError) throw childError
          createdInvoices.push(childInvoice)

          // Create invoice items for this portion
          const portionItems = formData.items
            .filter(item => item.from_fee_structure && item.fee_structure_id === portion.fee_structure_id)
            .map(item => ({
              invoice_id: childInvoice.id,
              item_type: normalizeFeeTypeCode(item.item_type || rawFeeCode),
              item_name_en: `${item.item_name_en} - Portion ${portion.portion_number}`,
              item_name_ar: item.item_name_ar || null,
              description: `Portion ${portion.portion_number} (${portion.percentage}%) - ${item.description || ''}`.trim() || null,
              quantity: parseInt(item.quantity) || 1,
              unit_price: (parseFloat(item.unit_price) || 0) * (portion.percentage / 100),
              discount_amount: 0,
              scholarship_amount: 0,
              total_amount: portionAmount
            }))

          // Also add manual items proportionally
          const manualItems = formData.items.filter(
            (item) => !item.from_fee_structure && !item.from_major_catalog
          )
          if (manualItems.length > 0) {
            const manualTotal = manualItems.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
            const manualPortionAmount = (manualTotal * portion.percentage) / 100
            manualItems.forEach(item => {
              const itemPortionAmount = (parseFloat(item.total_amount) || 0) * (portion.percentage / 100)
              portionItems.push({
                invoice_id: childInvoice.id,
                item_type: normalizeFeeTypeCode(item.item_type || rawFeeCode),
                item_name_en: `${item.item_name_en} - Portion ${portion.portion_number}`,
                item_name_ar: item.item_name_ar || null,
                description: `Portion ${portion.portion_number} (${portion.percentage}%) - ${item.description || ''}`.trim() || null,
                quantity: parseInt(item.quantity) || 1,
                unit_price: (parseFloat(item.unit_price) || 0) * (portion.percentage / 100),
                discount_amount: 0,
                scholarship_amount: 0,
                total_amount: itemPortionAmount
              })
            })
          }

          if (portionItems.length > 0) {
            const { error: itemsError } = await supabase
              .from('invoice_items')
              .insert(portionItems)

            if (itemsError) throw itemsError
          }

          previousPortionDate = dueDate
        }

        // Update parent invoice status based on children
        const totalPaid = createdInvoices.reduce((sum, inv) => sum + (parseFloat(inv.paid_amount) || 0), 0)
        const totalPending = createdInvoices.reduce((sum, inv) => sum + (parseFloat(inv.pending_amount) || 0), 0)
        
        const parentStatus = totalPending === 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'pending'
        
        await supabase
          .from('invoices')
          .update({
            paid_amount: totalPaid,
            pending_amount: totalPending,
            status: parentStatus
          })
          .eq('id', parent.id)

      } else {
        // Create single invoice (no payment portions)
        const invoiceData = {
          invoice_number: invoiceNumber.data,
          student_id: selectedStudent.id,
          college_id: selectedStudent.college_id,
          invoice_date: formData.invoice_date,
          invoice_type: invoiceTypeEnum,
          status: isPaid ? 'paid' : 'pending',
          subtotal: subtotal,
          discount_amount: discount,
          scholarship_amount: 0,
          tax_amount: 0,
          total_amount: total,
          paid_amount: isPaid ? total : 0,
          pending_amount: isPaid ? 0 : total,
          currency: collegeCurrencyCode,
          payment_method: paymentMethodValue,
          notes: formData.notes || null,
          semester_id: semesterId
        }

        // Link to fee structure if available
        if (selectedFeeStructures.length > 0) {
          invoiceData.fee_structure_id = selectedFeeStructures[0]
        }

        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()

        if (invoiceError) throw invoiceError
        parentInvoice = invoice
        createdInvoices = [invoice]

        // Create invoice items
        const invoiceItems = formData.items.map(item => ({
          invoice_id: invoice.id,
          item_type: normalizeFeeTypeCode(item.item_type || rawFeeCode),
          item_name_en: item.item_name_en,
          item_name_ar: item.item_name_ar || null,
          description: item.description || null,
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          discount_amount: 0,
          scholarship_amount: 0,
          total_amount: parseFloat(item.total_amount) || 0
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems)

        if (itemsError) throw itemsError
      }

      // If cash payment or admin payment, create payment records for all created invoices
      if (isPaid) {
        // For admin payment, ensure we have currentUserId
        let adminUserId = currentUserId
        if (formData.payment_method === 'admin_payment' && !adminUserId) {
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
          if (!adminUserId) {
            setError(t('finance.createInvoicePage.errors.adminUser'))
            setLoading(false)
            return
          }
        }

        const verifiedBy = formData.payment_method === 'admin_payment' ? adminUserId : null
        const verifiedAt = formData.payment_method === 'admin_payment' ? new Date().toISOString() : 
                          formData.payment_method === 'cash' ? new Date().toISOString() : null
        const paymentStatus = (formData.payment_method === 'admin_payment' || formData.payment_method === 'cash') ? 'verified' : 'pending'

        // Create payment records for each invoice
        for (const invoice of createdInvoices) {
          const paymentNumber = await supabase.rpc('generate_payment_number', {
            college_id_param: selectedStudent.college_id
          })

          if (paymentNumber.error) throw paymentNumber.error

          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              payment_number: paymentNumber.data,
              invoice_id: invoice.id,
              student_id: selectedStudent.id,
              college_id: selectedStudent.college_id,
              payment_date: formData.invoice_date,
              payment_method: paymentMethodValue || 'cash',
              amount: invoice.total_amount,
              currency: collegeCurrencyCode,
              status: paymentStatus,
              verified_by: verifiedBy,
              verified_at: verifiedAt,
              created_by: currentUserId || adminUserId,
              notes: formData.payment_method === 'admin_payment' 
                ? `Admin Payment - Payment processed by ${userRole === 'admin' ? 'University Admin' : 'College Admin'}. ${formData.notes || ''}`.trim()
                : formData.payment_method === 'cash'
                ? `Cash Payment - ${formData.notes || ''}`.trim() || null
                : formData.notes || null
            })

          if (paymentError) throw paymentError
        }

        // Update student financial milestone after payment (per semester).
        // Run for admission_fee too: milestone math still excludes admission from tuition totals;
        // if only admission exists for the semester, totals are 0/0 → PM100 and the row is created.
        const invoiceSemesterId = createdInvoices[0]?.semester_id || semesterId
        if (invoiceSemesterId) {
          await updateStudentFinancialMilestone(selectedStudent.id, invoiceSemesterId)
        }
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/finance/invoices')
      }, 2000)
    } catch (err) {
      console.error('Error creating invoice:', err)
      setError(err.message || t('finance.createInvoicePage.errors.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fieldInputClass = `w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${isArabicLayout ? 'text-right' : 'text-left'}`
  const fieldInputClassSm = `w-full px-4 py-2 border border-gray-300 rounded-lg ${isArabicLayout ? 'text-right' : 'text-left'}`

  const localeForMoney = isArabicLayout ? 'ar' : 'en-US'
  let grandTotalFormatted
  try {
    grandTotalFormatted = new Intl.NumberFormat(localeForMoney, {
      style: 'currency',
      currency: collegeCurrencyCode,
    }).format(calculateTotal())
  } catch {
    grandTotalFormatted = `${calculateTotal().toFixed(2)} ${collegeCurrencyCode}`
  }

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className={`flex items-center gap-4 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={() => navigate('/finance/invoices')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          aria-label={t('common.back')}
        >
          {isArabicLayout ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <h1 className={`text-3xl font-bold text-gray-900 ${alignStart}`}>
            {t('finance.createInvoicePage.title')}
          </h1>
          <p className={`text-gray-600 mt-1 ${alignStart}`}>{t('finance.createInvoicePage.subtitle')}</p>
        </div>
      </div>

      {userRole === 'admin' && (
        <div
          className={`bg-white rounded-2xl shadow-sm border p-4 ${
            requiresCollegeSelection ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
          }`}
          dir={isArabicLayout ? 'rtl' : 'ltr'}
        >
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInvoicePage.selectCollege')}{' '}
            {requiresCollegeSelection && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className={`w-full md:w-64 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${
              isArabicLayout ? 'text-right' : 'text-left'
            }`}
            required={requiresCollegeSelection}
          >
            <option value="">{t('finance.createInvoicePage.selectCollegePlaceholder')}</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {getLocalizedName(college, isArabicLayout) || college.name_en}
              </option>
            ))}
          </select>
          {requiresCollegeSelection && (
            <p className={`text-xs text-yellow-600 mt-1 ${alignStart}`}>
              {t('finance.createInvoicePage.selectCollegeContinue')}
            </p>
          )}
        </div>
      )}

      {userRole === 'admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInvoiceMode('single')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                invoiceMode === 'single' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('finance.bulkInvoice.singleMode', { defaultValue: 'Single invoice' })}
            </button>
            <button
              type="button"
              onClick={() => setInvoiceMode('bulk')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                invoiceMode === 'bulk' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('finance.bulkInvoice.bulkMode', { defaultValue: 'Bulk generate invoices' })}
            </button>
          </div>
          <p className={`text-xs text-gray-500 mt-2 ${alignStart}`}>
            {t('finance.bulkInvoice.modeHint', {
              defaultValue: 'Bulk mode generates portion-based semester invoices for all students enrolled in the selected semester and emails them.',
            })}
          </p>
        </div>
      )}

      {invoiceMode === 'bulk' && userRole === 'admin' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                {t('finance.bulkInvoice.academicYear', { defaultValue: 'Academic year' })} *
              </label>
              <select
                value={bulkForm.academic_year_id}
                onChange={(e) => setBulkForm((p) => ({ ...p, academic_year_id: e.target.value }))}
                className={fieldInputClassSm}
              >
                <option value="">{t('common.select', { defaultValue: 'Select' })}</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={String(y.id)}>
                    {getLocalizedName(y, isArabicLayout) || y.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                {t('finance.bulkInvoice.major', { defaultValue: 'Major' })} *
              </label>
              <select
                value={bulkForm.major_id}
                onChange={(e) => setBulkForm((p) => ({ ...p, major_id: e.target.value }))}
                className={fieldInputClassSm}
              >
                <option value="">{t('common.select', { defaultValue: 'Select' })}</option>
                {majors.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {getLocalizedName(m, isArabicLayout) || m.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                {t('finance.bulkInvoice.semester', { defaultValue: 'Semester' })} *
              </label>
              <select
                value={bulkForm.semester_id}
                onChange={(e) => setBulkForm((p) => ({ ...p, semester_id: e.target.value }))}
                className={fieldInputClassSm}
              >
                <option value="">{t('common.select', { defaultValue: 'Select' })}</option>
                {semesters.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {getLocalizedName(s, isArabicLayout) || s.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleBulkGenerate}
                disabled={bulkLoading}
                className={`w-full px-4 py-2 rounded-xl text-sm font-semibold ${
                  bulkLoading ? 'bg-gray-100 text-gray-400' : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {bulkLoading ? t('finance.bulkInvoice.generating', { defaultValue: 'Generating...' }) : t('finance.bulkInvoice.generate', { defaultValue: 'Generate invoices' })}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={bulkForm.send_email}
                onChange={(e) => setBulkForm((p) => ({ ...p, send_email: e.target.checked }))}
              />
              {t('finance.bulkInvoice.sendEmail', { defaultValue: 'Send email notification' })}
            </label>
          </div>

          {bulkLoading && (
            <div className="text-sm text-gray-600">
              {t('finance.bulkInvoice.progress', { defaultValue: 'Progress' })}: {bulkProgress.done}/{bulkProgress.total} • {t('finance.bulkInvoice.skipped', { defaultValue: 'Skipped' })}:{' '}
              {bulkProgress.skipped} • {t('finance.bulkInvoice.failed', { defaultValue: 'Failed' })}:{' '}
              {bulkProgress.failed}
            </div>
          )}

          {bulkResult.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className={`p-3 ${alignStart}`}>{t('finance.bulkInvoice.studentId', { defaultValue: 'Student ID' })}</th>
                    <th className={`p-3 ${alignStart}`}>{t('common.status', { defaultValue: 'Status' })}</th>
                    <th className={`p-3 ${alignStart}`}>{t('finance.bulkInvoice.details', { defaultValue: 'Details' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResult.map((r, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="p-3 font-mono text-xs">{r.student_id}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          r.status === 'created' ? 'bg-green-100 text-green-800' : r.status === 'skipped' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-gray-600">{r.invoice_number || r.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6"
        dir={isArabicLayout ? 'rtl' : 'ltr'}
      >
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInvoicePage.studentNumber')} *
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
              placeholder={t('finance.createInvoicePage.searchStudentPlaceholder')}
              dir="ltr"
              className={`w-full py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 ${
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
                  {(student.phone || student.mobile_phone) && (
                    <div className="text-xs text-gray-500 mt-0.5" dir="ltr">
                      {[student.phone, student.mobile_phone].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedStudent && (
            <div className={`mt-2 p-3 bg-green-50 rounded-lg ${alignStart}`}>
              <span className="text-sm text-green-800">
                {t('finance.createInvoicePage.selectedStudent', {
                  id: selectedStudent.student_id,
                  name: displayPersonName(selectedStudent, isArabicLayout) || '—',
                })}
              </span>
            </div>
          )}
        </div>

        {selectedStudent && studentData && (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <h3 className={`text-sm font-semibold text-slate-900 ${alignStart}`}>
                {t('finance.createInvoicePage.feeHierarchyTitle')}
              </h3>
              <p className={`text-xs text-slate-600 ${alignStart}`}>{t('finance.createInvoicePage.feeHierarchyIntro')}</p>
              <ul className={`list-disc text-xs text-slate-700 space-y-1.5 ms-5 ${alignStart}`}>
                <li>{t('finance.createInvoicePage.feeHierarchyBullet1')}</li>
                <li>{t('finance.createInvoicePage.feeHierarchyBullet2')}</li>
                <li>{t('finance.createInvoicePage.feeHierarchyBullet3')}</li>
                <li>{t('finance.createInvoicePage.feeHierarchyBullet4')}</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className={`block text-sm font-semibold text-gray-900 mb-1 ${alignStart}`}>
              {t('finance.createInvoicePage.feeStructuresTitle')}
            </label>
            <p className={`text-xs text-gray-600 mb-3 ${alignStart}`}>
              {t('finance.createInvoicePage.feeStructuresHint')}
              {!formData.semester_id && (
                <span className="block mt-2 text-yellow-800 font-medium">
                  {t('finance.createInvoicePage.feeStructuresSemesterNote')}
                </span>
              )}
            </p>

            {feeStructures.length > 0 ? (
              <>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                  {feeStructures.map((fee) => (
                    <label
                      key={fee.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-2 ${
                        selectedFeeStructures.includes(fee.id)
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFeeStructures.includes(fee.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleFeeStructureSelection([...selectedFeeStructures, fee.id])
                          } else {
                            const updated = selectedFeeStructures.filter((id) => id !== fee.id)
                            setSelectedFeeStructures(updated)
                            applyFeeStructures(updated)
                          }
                        }}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${alignStart}`}>
                          {getLocalizedName(
                            { name_en: fee.fee_name_en, name_ar: fee.fee_name_ar },
                            isArabicLayout
                          ) || fee.fee_name_en}
                        </div>
                        <div className={`text-xs text-gray-600 ${alignStart}`}>
                          <span dir="ltr" className="tabular-nums inline-block">
                            {fee.currency} {parseFloat(fee.amount || 0).toFixed(2)}
                          </span>
                          <span> • {feeTypeDisplayLabel(fee.fee_type, feeTypes, isArabicLayout, t)}</span>
                          {fee.applies_to_semester &&
                            Array.isArray(fee.applies_to_semester) &&
                            fee.applies_to_semester.length > 0 && (
                              <span>
                                {' '}
                                •{' '}
                                {fee.applies_to_semester.length === 1
                                  ? t('finance.createInvoicePage.semestersCountOne')
                                  : t('finance.createInvoicePage.semestersCount', {
                                      count: fee.applies_to_semester.length,
                                    })}
                              </span>
                            )}
                          {fee.payment_portions &&
                            Array.isArray(fee.payment_portions) &&
                            fee.payment_portions.length > 0 && (
                              <span>
                                {' '}
                                •{' '}
                                {fee.payment_portions.length === 1
                                  ? t('finance.createInvoicePage.paymentPortionsCountOne')
                                  : t('finance.createInvoicePage.paymentPortionsCount', {
                                      count: fee.payment_portions.length,
                                    })}
                              </span>
                            )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedFeeStructures.length > 0 && (
                  <p className={`text-xs text-blue-700 mt-2 font-medium ${alignStart}`}>
                    {selectedFeeStructures.length === 1
                      ? t('finance.createInvoicePage.feeStructuresSelectedOne')
                      : t('finance.createInvoicePage.feeStructuresSelectedMany', {
                          count: selectedFeeStructures.length,
                        })}
                  </p>
                )}
              </>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                {formData.semester_id ? (
                  <p className={`text-sm text-gray-600 py-2 ${isArabicLayout ? 'text-right' : 'text-center'}`}>
                    {t('finance.createInvoicePage.noFeeStructuresSemester')}
                  </p>
                ) : formData.invoice_type ? (
                  (() => {
                    const st = feeTypes.find((ft) => ft.code === formData.invoice_type)
                    const requiresSemester = st?.requires_semester !== false
                    return requiresSemester ? (
                      <p className={`text-sm text-yellow-900 py-2 ${alignStart}`}>
                        {t('finance.createInvoicePage.noFeeStructuresNeedSemester')}
                      </p>
                    ) : (
                      <p className={`text-sm text-gray-600 py-2 ${alignStart}`}>
                        {t('finance.createInvoicePage.noFeeStructuresNonSemester')}
                      </p>
                    )
                  })()
                ) : (
                  <p className={`text-sm text-gray-600 py-2 ${alignStart}`}>
                    {t('finance.createInvoicePage.noFeeStructuresPrompt')}
                  </p>
                )}
              </div>
            )}
          </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInvoicePage.invoiceDate')} *
            </label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              className={fieldInputClass}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInvoicePage.invoiceType')} *
            </label>
            <select
              value={formData.invoice_type}
              onChange={(e) => {
                const newType = e.target.value
                const st = feeTypes.find((ft) => ft.code === newType)
                const needsSemester = st?.requires_semester !== false
                setFormData({
                  ...formData,
                  invoice_type: newType,
                  semester_id: needsSemester ? formData.semester_id : '',
                })
                if (needsSemester && formData.semester_id && selectedStudent) {
                  setTimeout(() => fetchFeeStructures(), 100)
                }
              }}
              className={fieldInputClass}
              required
            >
              <option value="">{t('finance.createInvoicePage.selectTypePlaceholder')}</option>
              {feeTypes.map((feeType) => (
                <option key={feeType.id} value={feeType.code}>
                  {feeTypeDisplayLabel(feeType.code, feeTypes, isArabicLayout, t)}
                  {feeType.requires_semester === false
                    ? ` ${t('finance.createInvoicePage.noSemesterRequired')}`
                    : ''}
                </option>
              ))}
            </select>
          </div>
          {formData.invoice_type &&
            selectedStudent &&
            (() => {
              const st = feeTypes.find((ft) => ft.code === formData.invoice_type)
              const requiresSemester = st?.requires_semester !== false
              return (
                requiresSemester && (
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                      {t('finance.createInvoicePage.semester')} *
                    </label>
                    <select
                      value={formData.semester_id}
                      onChange={(e) => {
                        setFormData({ ...formData, semester_id: e.target.value })
                        if (e.target.value && selectedStudent) {
                          setTimeout(() => fetchFeeStructures(), 100)
                        }
                      }}
                      className={fieldInputClass}
                      required
                    >
                      <option value="">{t('finance.createInvoicePage.selectSemesterPlaceholder')}</option>
                      {semesters.map((semester) => (
                        <option key={semester.id} value={semester.id}>
                          {getLocalizedName(semester, isArabicLayout) || semester.name_en} ({semester.code})
                        </option>
                      ))}
                    </select>
                    <p className={`text-xs text-gray-500 mt-1 ${alignStart}`}>
                      {t('finance.createInvoicePage.semesterHelp')}
                    </p>
                  </div>
                )
              )
            })()}
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
              {t('finance.createInvoicePage.paymentMethod')} *
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className={fieldInputClass}
              required
            >
              <option value="pending">{t('finance.createInvoicePage.paymentPending')}</option>
              <option value="cash">{t('finance.createInvoicePage.paymentCash')}</option>
              {(userRole === 'admin' || userRole === 'user') && (
                <option value="admin_payment">{t('finance.createInvoicePage.paymentAdmin')}</option>
              )}
            </select>
            {(userRole === 'admin' || userRole === 'user') && formData.payment_method === 'admin_payment' && (
              <p className={`text-xs text-blue-700 mt-2 ${alignStart}`}>
                {t('finance.createInvoicePage.adminPaymentNote')}
              </p>
            )}
          </div>
        </div>

        {selectedStudent &&
          studentData &&
          formData.invoice_type &&
          FEE_TYPES_USING_MAJOR_REGISTRATION.includes(formData.invoice_type) && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4">
              <div className={`flex flex-wrap items-center justify-between gap-3 ${iconRow}`}>
                <p className={`text-sm text-emerald-950 flex-1 min-w-0 ${alignStart}`}>
                  {getMajorRegistrationFeeAmount(studentData.majors) != null
                    ? t('finance.createInvoicePage.majorCatalogHint', {
                        amount: getMajorRegistrationFeeAmount(studentData.majors).toFixed(2),
                        currency: collegeCurrencyCode,
                      })
                    : t('finance.createInvoicePage.majorCatalogNone')}
                </p>
                {getMajorRegistrationFeeAmount(studentData.majors) != null && (
                  <button
                    type="button"
                    onClick={applyMajorRegistrationFee}
                    className="shrink-0 px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 transition-colors"
                  >
                    {t('finance.createInvoicePage.applyMajorRegistrationFee')}
                  </button>
                )}
              </div>
            </div>
          )}

        <div>
          <div className={`flex flex-wrap items-center justify-between gap-3 mb-4 ${iconRow}`}>
            <label className={`block text-sm font-semibold text-gray-900 ${alignStart}`}>
              {t('finance.createInvoicePage.invoiceItems')} *
            </label>
            <button
              type="button"
              onClick={addItem}
              className={`inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 ${iconRow}`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{t('finance.createInvoicePage.addItem')}</span>
            </button>
          </div>
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                      {t('finance.createInvoicePage.itemNameEn')} *
                      {item.from_fee_structure && (
                        <span className="ms-2 text-xs text-blue-600 font-normal">
                          {t('finance.createInvoicePage.itemNameEnHint')}
                        </span>
                      )}
                      {item.from_major_catalog && !item.from_fee_structure && (
                        <span className="ms-2 text-xs text-emerald-700 font-normal">
                          {t('finance.createInvoicePage.itemNameEnHintMajor')}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={item.item_name_en}
                      onChange={(e) => handleItemChange(index, 'item_name_en', e.target.value)}
                      dir="ltr"
                      className={`${fieldInputClassSm} ${
                        item.from_fee_structure
                          ? 'bg-blue-50 border-blue-200'
                          : item.from_major_catalog
                            ? 'bg-emerald-50 border-emerald-200'
                            : ''
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                      {t('finance.createInvoicePage.quantity')} *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      dir="ltr"
                      className={`${fieldInputClassSm} ${
                        item.from_fee_structure
                          ? 'bg-blue-50 border-blue-200'
                          : item.from_major_catalog
                            ? 'bg-emerald-50 border-emerald-200'
                            : ''
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                      {t('finance.createInvoicePage.unitPrice')} *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      dir="ltr"
                      className={`${fieldInputClassSm} ${
                        item.from_fee_structure
                          ? 'bg-blue-50 border-blue-200'
                          : item.from_major_catalog
                            ? 'bg-emerald-50 border-emerald-200'
                            : ''
                      }`}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                      {t('finance.createInvoicePage.itemNameAr')}
                    </label>
                    <input
                      type="text"
                      value={item.item_name_ar}
                      onChange={(e) => handleItemChange(index, 'item_name_ar', e.target.value)}
                      className={fieldInputClassSm}
                      dir={isArabicLayout ? 'rtl' : 'ltr'}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                      {t('finance.createInvoicePage.lineTotal')}
                    </label>
                    <input
                      type="number"
                      value={item.total_amount}
                      readOnly
                      dir="ltr"
                      className={`${fieldInputClassSm} bg-gray-50`}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
                    {t('finance.createInvoicePage.description')}
                  </label>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className={fieldInputClassSm}
                    rows={2}
                    dir="auto"
                  />
                </div>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className={`inline-flex items-center gap-2 text-red-600 hover:text-red-700 ${iconRow}`}
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>{t('finance.createInvoicePage.removeItem')}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInvoicePage.discountAmount')}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.discount_amount}
            onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
            dir="ltr"
            className={fieldInputClass}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>
            {t('finance.createInvoicePage.notes')}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={fieldInputClass}
            rows={3}
            dir="auto"
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-xl">
          <div
            className={`flex flex-wrap items-center justify-between gap-2 text-lg font-bold ${isArabicLayout ? 'flex-row-reverse' : ''}`}
          >
            <span className={alignStart}>{t('finance.createInvoicePage.grandTotal')}</span>
            <RtlMoney isArabicLayout={isArabicLayout} inline className="text-primary-600 font-bold">
              {grandTotalFormatted}
            </RtlMoney>
          </div>
        </div>

        {error && (
          <div className={`bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl ${alignStart}`}>
            {error}
          </div>
        )}
        {success && (
          <div className={`bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl ${alignStart}`}>
            {t('finance.createInvoicePage.successRedirect')}
          </div>
        )}

        <div className={`flex flex-wrap items-center justify-end gap-4 ${iconRow}`}>
          <button
            type="button"
            onClick={() => navigate('/finance/invoices')}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {t('finance.createInvoicePage.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${iconRow}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span>{t('finance.createInvoicePage.creating')}</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5 shrink-0" />
                <span>{t('finance.createInvoicePage.submit')}</span>
              </>
            )}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}


