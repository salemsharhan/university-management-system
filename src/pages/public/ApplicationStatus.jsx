import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { getLocalizedName } from '../../utils/localizedName'
import PaymentModal from '../../components/payment/PaymentModal'
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  CreditCard,
  UserCheck,
  GraduationCap,
  AlertCircle,
  Upload,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  Building2,
  BookOpen,
  Calendar,
  LogIn,
} from 'lucide-react'

// Same document types as in register form; uploadable on track page if not filled at registration
const UPLOADABLE_DOCUMENT_TYPES = [
  { key: 'id_photo', labelKey: 'track.documents.idPhoto', accept: 'image/jpeg,image/png,image/webp,application/pdf' },
  { key: 'transcript', labelKey: 'track.documents.transcript', accept: 'image/jpeg,image/png,application/pdf' },
]
const MAX_FILE_SIZE_MB = 10

const STAGE_ORDER = [
  'APDR', 'APSB', 'APPN', 'APPC', 'RVQU', 'RVIN', 'RVDV', 'RVHL', 'RVRI', 'RVRC', 'RVIV', 'RVEX',
  'DCPN', 'DCCA', 'DCFA', 'DCWL', 'DCRJ', 'ENPN', 'ENCF', 'ENAC',
]

function getStageIndex(code) {
  const i = STAGE_ORDER.indexOf(code || '')
  return i >= 0 ? i : 0
}

function getApplicantInitials(application) {
  if (!application) return '?'
  const first = (application.first_name || '').trim().charAt(0)
  const last = (application.last_name || '').trim().charAt(0)
  if (first && last) return `${first}${last}`.toUpperCase()
  const arFirst = (application.first_name_ar || '').trim().charAt(0)
  const arLast = (application.last_name_ar || '').trim().charAt(0)
  if (arFirst && arLast) return `${arFirst}${arLast}`.toUpperCase()
  const name = (application.first_name || application.first_name_ar || '').trim()
  if (name.length >= 2) return name.slice(0, 2).toUpperCase()
  return (first || arFirst || '?').toUpperCase()
}

function getApplicantDisplayName(application, isRTL) {
  if (!application) return ''
  if (isRTL) {
    const ar = [application.first_name_ar, application.middle_name_ar, application.last_name_ar].filter(Boolean).join(' ').trim()
    if (ar) return ar
    return [application.first_name, application.middle_name, application.last_name].filter(Boolean).join(' ').trim()
  }
  const en = [application.first_name, application.middle_name, application.last_name].filter(Boolean).join(' ').trim()
  if (en) return en
  return [application.first_name_ar, application.middle_name_ar, application.last_name_ar].filter(Boolean).join(' ').trim()
}

function getApplicantSecondaryName(application, isRTL) {
  if (!application) return ''
  if (isRTL) {
    const en = [application.first_name, application.middle_name, application.last_name].filter(Boolean).join(' ').trim()
    return en || ''
  }
  const ar = [application.first_name_ar, application.middle_name_ar, application.last_name_ar].filter(Boolean).join(' ').trim()
  return ar || ''
}

export default function ApplicationStatus() {
  const { t } = useTranslation()
  const { isRTL, language, changeLanguage } = useLanguage()
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [application, setApplication] = useState(location.state?.application || null)
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null)
  const [studentInvoices, setStudentInvoices] = useState([])
  const [student, setStudent] = useState(null)
  const [hasStudentPortalAccess, setHasStudentPortalAccess] = useState(false)
  const [applicationDocuments, setApplicationDocuments] = useState([])
  const [uploadingDocType, setUploadingDocType] = useState(null)
  const [documentError, setDocumentError] = useState('')
  const applicationFetchInProgressRef = useRef(false)
  const studentInvoicesFetchedForRef = useRef(null)

  // Single effect: fetch application by id once, then fetch activity log when we have the matching application
  useEffect(() => {
    if (!id) return
    const idNum = parseInt(id, 10)
    const hasMatchingApplication = application && application.id === idNum

    if (hasMatchingApplication) {
      fetchActivityLog(application.id)
      setLoading(false)
      return
    }

    // Stale or missing: clear if we have wrong application so we refetch for current id
    if (application && application.id !== idNum) {
      setApplication(null)
    }
    if (applicationFetchInProgressRef.current) return
    applicationFetchInProgressRef.current = true
    fetchApplication().finally(() => {
      applicationFetchInProgressRef.current = false
    })
  }, [id, application])

  // Fetch application documents when we have application
  useEffect(() => {
    const appId = application?.id
    if (!appId) {
      setApplicationDocuments([])
      return
    }
    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from('application_documents')
        .select('document_type, file_path, file_name, uploaded_at')
        .eq('application_id', appId)
      if (error) {
        console.error('Application documents fetch error:', error.message, error.code)
        setApplicationDocuments([])
        return
      }
      setApplicationDocuments(data ?? [])
    }
    fetchDocs()
  }, [application?.id])

  // Fetch student + invoices by application email once per email (avoids duplicate students/invoices calls)
  useEffect(() => {
    const email = application?.email
    if (!email) {
      setStudent(null)
      setStudentInvoices([])
      setHasStudentPortalAccess(false)
      studentInvoicesFetchedForRef.current = null
      return
    }
    if (studentInvoicesFetchedForRef.current === email) return
    studentInvoicesFetchedForRef.current = email
    fetchStudentAndInvoices(email)
  }, [application?.email])

  const fetchStudentAndInvoices = async (email) => {
    if (!email) return
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, email, college_id')
        .eq('email', email)
        .eq('status', 'active')
        .maybeSingle()
      if (studentError || !studentData) {
        setStudent(null)
        setStudentInvoices([])
        setHasStudentPortalAccess(false)
        return
      }
      setStudent(studentData)
      const { data: invoicesData, error: invError } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_type, status, total_amount, paid_amount, pending_amount, due_date, student_id, college_id, semester_id')
        .eq('student_id', studentData.id)
        .order('invoice_date', { ascending: false })
      if (!invError) setStudentInvoices(invoicesData || [])
      else setStudentInvoices([])
      // Check if student has login access per finance rules (PM10+ milestone)
      const { data: statusRows } = await supabase
        .from('student_semester_financial_status')
        .select('financial_milestone_code')
        .eq('student_id', studentData.id)
        .in('financial_milestone_code', ['PM10', 'PM30', 'PM60', 'PM90', 'PM100'])
        .limit(1)
      setHasStudentPortalAccess(Array.isArray(statusRows) && statusRows.length > 0)
    } catch (err) {
      setStudent(null)
      setStudentInvoices([])
      setHasStudentPortalAccess(false)
    }
  }

  const fetchApplication = async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('applications')
        .select(`
          *,
          majors (name_en, name_ar, code),
          semesters (name_en, name_ar, code),
          colleges (name_en, name_ar, code)
        `)
        .eq('id', parseInt(id))
        .single()

      if (fetchError) throw fetchError
      setApplication(data)
    } catch (err) {
      console.error('Error fetching application:', err)
      setError('Failed to load application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchActivityLog = async (appId = null) => {
    const applicationId = appId || application?.id
    if (!applicationId) return
    try {
      const { data: logEntries, error: logError } = await supabase
        .from('status_change_audit_log')
        .select('*')
        .eq('entity_type', 'application')
        .eq('entity_id', applicationId)
        .order('created_at', { ascending: false })

      if (logError) throw logError

      if (application?.created_at) {
        const initialEntry = {
          id: 'initial',
          from_status_code: null,
          to_status_code: application.status_code || 'APDR',
          trigger_code: 'TRSB',
          triggered_by: null,
          notes: 'Application created',
          created_at: application.created_at,
        }
        setActivityLog([initialEntry, ...(logEntries || [])])
      } else {
        setActivityLog(logEntries || [])
      }
    } catch (err) {
      console.error('Error fetching activity log:', err)
    }
  }

  const getStatusInfo = (statusCode) => {
    const statusMap = {
      'APDR': { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText },
      'APSB': { label: 'Submitted', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
      'APIV': { label: 'Invalid', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      'APPN': { label: 'Payment Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: CreditCard },
      'APPC': { label: 'Payment Confirmed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'RVQU': { label: 'Review Queue', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
      'RVIN': { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: RefreshCw },
      'RVHL': { label: 'On Hold', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle },
      'RVRI': { label: 'Additional Info Required', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: FileText },
      'RVRC': { label: 'Info Received', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
      'RVDV': { label: 'Documents Verification', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: FileText },
      'RVIV': { label: 'Interview Required', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: UserCheck },
      'RVEX': { label: 'Entrance Exam Required', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: GraduationCap },
      'DCPN': { label: 'Decision Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'DCCA': { label: 'Accepted (Conditional)', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'DCFA': { label: 'Accepted (Final)', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'DCWL': { label: 'Waitlisted', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
      'DCRJ': { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      'ENPN': { label: 'Enrollment Pending', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
      'ENCF': { label: 'Enrollment Confirmed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      'ENAC': { label: 'Enrolled (Active)', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    }
    return statusMap[statusCode] || { label: statusCode, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock }
  }

  const getProcessingStages = () => {
    const code = application?.status_code || 'APDR'
    const currentIdx = getStageIndex(code)
    const applicationDate = application?.created_at
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'

    const stages = [
      {
        key: 1,
        title: t('track.stages.orderReceipt', 'Order receipt'),
        desc: t('track.stages.orderReceiptDesc', 'Your request has been received and registered in the system'),
        date: applicationDate,
        status: currentIdx >= getStageIndex('APSB') ? 'completed' : 'pending',
      },
      {
        key: 2,
        title: t('track.stages.documentVerification', 'Document verification'),
        desc: t('track.stages.documentVerificationDesc', 'Uploaded documents are being verified'),
        date: currentIdx >= getStageIndex('APPC') ? applicationDate : null,
        status: currentIdx > getStageIndex('APPC') ? 'completed' : currentIdx === getStageIndex('APPC') ? 'in_progress' : 'pending',
      },
      {
        key: 3,
        title: t('track.stages.academicReview', 'Academic Review'),
        desc: t('track.stages.academicReviewDesc', 'Under review — expected to be completed within 5-7 business days'),
        date: null,
        status: currentIdx > getStageIndex('RVRC') ? 'completed' : currentIdx >= getStageIndex('RVQU') ? 'in_progress' : 'pending',
      },
      {
        key: 4,
        title: t('track.stages.admissionDecision', 'Admission decision'),
        desc: currentIdx >= getStageIndex('DCFA') ? t('track.stages.decisionMade', 'Decision made') : t('track.stages.awaitingReview', 'Awaiting completion of review'),
        date: null,
        status: currentIdx >= getStageIndex('DCFA') ? 'completed' : currentIdx === getStageIndex('DCPN') ? 'in_progress' : 'pending',
      },
      {
        key: 5,
        title: t('track.stages.acceptanceLetter', 'Sending the acceptance letter'),
        desc: currentIdx >= getStageIndex('ENCF') ? t('track.stages.sent', 'Sent') : t('track.stages.awaitingAcceptance', 'Awaiting acceptance decision'),
        date: null,
        status: currentIdx >= getStageIndex('ENCF') ? 'completed' : 'pending',
      },
    ]
    return stages
  }

  const hasDoc = (type) => applicationDocuments.some((d) => d.document_type === type)

  const documentItems = () => {
    const code = application?.status_code
    const pastDoc = getStageIndex(code) >= getStageIndex('RVDV')
    const idPhotoDone = hasDoc('id_photo')
    const transcriptDone = hasDoc('transcript')
    const allUploadableDone = idPhotoDone && transcriptDone
    return [
      { key: 'application', label: t('track.documents.applicationForm', 'Application form'), done: true, uploadable: false },
      { key: 'docVerification', label: t('track.documents.documentVerification', 'Documents verification'), done: pastDoc || allUploadableDone, uploadable: false },
      { key: 'id_photo', label: t('track.documents.idPhoto', 'ID photo'), done: idPhotoDone, uploadable: true },
      { key: 'transcript', label: t('track.documents.transcript', 'Transcript / Grades'), done: transcriptDone, uploadable: true },
    ]
  }

  const handleDocumentUpload = async (documentType, file) => {
    if (!application?.id || !file) return
    setDocumentError('')
    setUploadingDocType(documentType)
    try {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const storagePath = `${application.id}/${documentType}/${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('qalam')
        .upload(storagePath, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('application_documents').upsert(
        {
          application_id: application.id,
          document_type: documentType,
          file_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          content_type: file.type,
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: 'application_id,document_type' }
      )
      if (insertError) throw insertError

      setApplicationDocuments((prev) => {
        const rest = prev.filter((d) => d.document_type !== documentType)
        return [...rest, { document_type: documentType, file_path: storagePath, file_name: file.name, uploaded_at: new Date().toISOString() }]
      })
    } catch (err) {
      setDocumentError(err.message || t('track.documentUploadError', 'Upload failed. Please try again.'))
    } finally {
      setUploadingDocType(null)
    }
  }

  const pendingInvoices = studentInvoices.filter(inv => inv.status === 'pending' || inv.status === 'partially_paid')
  const hasPendingInvoices = pendingInvoices.length > 0

  if (loading && !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('track.notFound', 'Application Not Found')}</h2>
          <p className="text-gray-600 mb-6">{error || t('track.notFoundDesc', 'The application you are looking for does not exist.')}</p>
          <button
            onClick={() => navigate('/track')}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            {t('track.backToTracking', 'Back to Tracking')}
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(application.status_code)
  const StatusIcon = statusInfo.icon
  const showRegistrationPayment = (application.status_code === 'APPN' || application.status_code === 'APSB') && !showPaymentModal
  const programName = getLocalizedName(application.majors, isRTL) || application.majors?.name_en || 'N/A'
  const applicationDate = application.created_at ? new Date(application.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'

  const handlePaymentSuccess = async () => {
    await fetchApplication()
    setShowPaymentModal(false)
    if (application?.email) await fetchStudentAndInvoices(application.email)
  }

  const handlePayInvoice = (inv) => {
    setSelectedInvoiceForPayment(inv)
  }

  const handleInvoicePaymentSuccess = () => {
    setSelectedInvoiceForPayment(null)
    if (application?.email) fetchStudentAndInvoices(application.email)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 py-8 px-4 sm:px-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Registration fee payment modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        application={application}
        onPaymentSuccess={handlePaymentSuccess}
      />
      {/* Invoice payment modal (track page – no login required) */}
      <PaymentModal
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        invoice={selectedInvoiceForPayment}
        student={student}
        onPaymentSuccess={handleInvoicePaymentSuccess}
      />

      <div className="max-w-6xl mx-auto">
        <div className={`flex items-center justify-between gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate('/track')}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('track.backToTracking', 'Back to Tracking')}</span>
          </button>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white/90 shadow-sm p-0.5">
            <button
              type="button"
              onClick={() => changeLanguage('en')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${language === 'en' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('ar')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${language === 'ar' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              العربية
            </button>
          </div>
        </div>

        {/* Top success banner */}
        <div className={`rounded-2xl bg-emerald-500/10 border border-emerald-200 px-5 py-4 mb-8 flex items-center gap-4 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <p className={`text-emerald-800 text-sm sm:text-base flex-1 ${isRTL ? 'text-right' : ''}`}>
            {t('track.bannerReceived', 'Your order has been successfully received. Order number:')}{' '}
            <span className="font-mono font-semibold text-emerald-900">{application.application_number}</span>
          </p>
        </div>

        {/* Applicant profile card */}
        <div className={`mb-8 overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/50 border border-slate-200/80 ${isRTL ? 'text-right' : ''}`}>
          <div className="bg-gradient-to-br from-slate-50/80 via-white to-primary-50/30">
            <div className={`flex flex-col sm:flex-row sm:items-center gap-6 p-6 sm:p-8 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-4 sm:gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl shadow-primary-900/20 ring-4 ring-white">
                  {getApplicantInitials(application)}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    {getApplicantDisplayName(application, isRTL)}
                  </h1>
                  {getApplicantSecondaryName(application, isRTL) && getApplicantSecondaryName(application, isRTL) !== getApplicantDisplayName(application, isRTL) && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">
                      {getApplicantSecondaryName(application, isRTL)}
                    </p>
                  )}
                  <div className={`mt-2 ${isRTL ? 'flex justify-end' : ''}`}>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${statusInfo.color} ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`flex-1 grid grid-cols-1 min-[480px]:grid-cols-2 gap-4 sm:gap-5 ${isRTL ? 'sm:border-r sm:border-slate-200/80 sm:pr-8' : 'sm:border-l sm:border-slate-200/80 sm:pl-8'}`}>
                <div className={`flex items-center gap-3 text-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('track.profileEmail', 'Email')}</p>
                    <p className="font-medium text-slate-900 truncate">{application.email || '—'}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-3 text-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('track.profilePhone', 'Phone')}</p>
                    <p className="font-medium text-slate-900 truncate">{application.phone || '—'}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-3 text-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('track.profileCollege', 'College')}</p>
                    <p className="font-medium text-slate-900 truncate">{getLocalizedName(application.colleges, isRTL) || application.colleges?.name_en || '—'}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-3 text-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('track.profileProgram', 'Program')}</p>
                    <p className="font-medium text-slate-900 truncate">{programName}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-3 text-slate-700 min-[480px]:col-span-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('track.applicationDate', 'Application date')}</p>
                    <p className="font-medium text-slate-900">{applicationDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${isRTL ? 'lg:direction-rtl' : ''}`}>
          {/* Left column: Summary, Portal CTA, Documents, Invoices */}
          <div className="lg:col-span-1 space-y-6">
            {/* Application Summary */}
            <div className={`bg-white rounded-2xl shadow-md shadow-slate-200/40 border border-slate-200/60 p-6 transition-shadow hover:shadow-lg hover:shadow-slate-200/50 ${isRTL ? 'text-right' : ''}`}>
              <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="w-1 h-6 rounded-full bg-primary-500" />
                <h2 className="text-base font-bold text-slate-900">{t('track.summaryTitle', 'Application Summary')}</h2>
              </div>
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('track.orderNumber', 'Order number')}</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-1">{application.application_number}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('track.program', 'The program')}</dt>
                  <dd className="font-medium text-slate-900 mt-1">{programName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('track.applicationDate', 'Application date')}</dt>
                  <dd className="font-medium text-slate-900 mt-1">{applicationDate}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('track.currentSituation', 'Current situation')}</dt>
                  <dd className={`mt-2 ${isRTL ? 'flex justify-end' : ''}`}>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${statusInfo.color} ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <StatusIcon className="w-4 h-4" />
                      {statusInfo.label}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Login to student portal (shown when finance status allows per PM rules) */}
            {student && hasStudentPortalAccess && (
              <div className="rounded-2xl bg-gradient-to-br from-primary-500/8 to-primary-600/12 border border-primary-200/80 p-6 shadow-md shadow-slate-200/30 transition-shadow hover:shadow-lg">
                <div className={`flex flex-col gap-4 ${isRTL ? 'text-right' : ''}`}>
                  <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                      <LogIn className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">{t('track.studentPortalTitle', 'Student portal access')}</h3>
                      <p className="text-sm text-slate-600 mt-1">{t('track.studentPortalDesc', 'You can log in to the student portal for grades, courses, and more.')}</p>
                    </div>
                  </div>
                  <Link
                    to="/login/student"
                    className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all shadow-md shadow-primary-900/20 hover:shadow-lg hover:shadow-primary-900/25 ${isRTL ? 'sm:mr-0' : ''}`}
                  >
                    <LogIn className="w-4 h-4" />
                    {t('track.loginToStudentPortal', 'Login to student portal')}
                  </Link>
                </div>
              </div>
            )}

            {/* Documents */}
            <div className="bg-white rounded-2xl shadow-md shadow-slate-200/40 border border-slate-200/60 p-6 transition-shadow hover:shadow-lg hover:shadow-slate-200/50">
              <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="w-1 h-6 rounded-full bg-primary-500" />
                <h2 className="text-base font-bold text-slate-900">{t('track.documentsTitle', 'Documents')}</h2>
              </div>
              {documentError && (
                <p className="text-sm text-red-600 mb-3">{documentError}</p>
              )}
              <ul className="space-y-1">
                {documentItems().map((item) => (
                  <li key={item.key} className={`flex flex-col gap-2 rounded-xl py-2.5 px-3 -mx-3 ${item.done ? 'bg-slate-50/80' : ''} ${isRTL ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {item.done ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        </div>
                      )}
                      <span className={`text-sm font-medium ${item.done ? 'text-slate-800' : 'text-slate-600'}`}>{item.label}</span>
                    </div>
                    {item.uploadable && !item.done && (
                      <div className={`flex flex-wrap items-center gap-2 ${isRTL ? 'pl-0 pr-11 justify-end' : 'pl-11'}`}>
                        <input
                          type="file"
                          accept={UPLOADABLE_DOCUMENT_TYPES.find((d) => d.key === item.key)?.accept || '*'}
                          className="text-sm text-slate-600 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-100 file:text-primary-700 file:font-medium file:cursor-pointer"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) {
                              if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                                setDocumentError(t('track.documentFileTooBig', `File must be under ${MAX_FILE_SIZE_MB} MB`))
                                return
                              }
                              handleDocumentUpload(item.key, f)
                              e.target.value = ''
                            }
                          }}
                          disabled={uploadingDocType !== null}
                        />
                        {uploadingDocType === item.key && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {showRegistrationPayment && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="mt-5 w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  {t('track.payRegistrationFee', 'Pay registration fee')}
                </button>
              )}
            </div>

            {/* Invoices (for students with pending invoices) */}
            {student && studentInvoices.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md shadow-slate-200/40 border border-slate-200/60 p-6 transition-shadow hover:shadow-lg hover:shadow-slate-200/50">
                <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="w-1 h-6 rounded-full bg-primary-500" />
                  <h2 className="text-base font-bold text-slate-900">{t('track.invoicesTitle', 'Invoices')}</h2>
                </div>
                <ul className="space-y-2">
                  {studentInvoices.map((inv) => {
                    const isPending = inv.status === 'pending' || inv.status === 'partially_paid'
                    return (
                      <li key={inv.id} className={`flex items-center justify-between gap-3 rounded-xl py-3 px-3 -mx-3 bg-slate-50/60 border border-transparent ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-3 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {inv.status === 'paid' ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            </div>
                          )}
                          <div className={`min-w-0 ${isRTL ? 'text-right' : ''}`}>
                            <p className="font-medium text-slate-900 truncate">{inv.invoice_number}</p>
                            <p className="text-sm text-slate-500">
                              {inv.invoice_type?.replace(/_/g, ' ')} — {inv.status === 'paid' ? t('payments.paid', 'Paid') : `${inv.pending_amount ?? inv.total_amount} ${t('track.currency', 'SAR')}`}
                            </p>
                          </div>
                        </div>
                        {isPending && (
                          <button
                            onClick={() => handlePayInvoice(inv)}
                            className="flex-shrink-0 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
                          >
                            {t('track.payNow', 'Pay')}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Right column: Application processing stages */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md shadow-slate-200/40 border border-slate-200/60 p-6 sm:p-8 transition-shadow hover:shadow-lg hover:shadow-slate-200/50">
              <div className={`flex items-center gap-2 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="w-1 h-6 rounded-full bg-primary-500" />
                <h2 className="text-base font-bold text-slate-900">{t('track.stagesTitle', 'Application processing stages')}</h2>
              </div>
              <div className="relative">
                {/* Vertical line behind steps (centered under circle: 20px - 1px = 19px) */}
                <div className={`absolute top-5 bottom-5 w-0.5 bg-slate-200 rounded-full hidden sm:block ${isRTL ? 'right-[19px] left-auto' : 'left-[19px]'}`} />
                <div className="space-y-0">
                  {getProcessingStages().map((stage, idx) => (
                    <div
                      key={stage.key}
                      className={`relative flex gap-5 sm:gap-6 ${idx < getProcessingStages().length - 1 ? 'pb-8' : ''} ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="relative z-10 flex flex-col items-center flex-shrink-0">
                        {stage.status === 'completed' && (
                          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-900/20">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {stage.status === 'in_progress' && (
                          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-md shadow-primary-900/20 animate-pulse">
                            <RefreshCw className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {stage.status === 'pending' && (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold text-xs">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className={`flex-1 min-w-0 pt-1 pb-1 ${isRTL ? 'text-right' : ''}`}>
                        <p className="font-semibold text-slate-900">{stage.title}</p>
                        {stage.date && (
                          <p className="text-sm text-slate-500 mt-0.5">{stage.date}</p>
                        )}
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{stage.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
