import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { getLocalizedName } from '../utils/localizedName'
import { getStudentSemesterMilestone, checkFinancePermission, getMilestoneInfo } from '../utils/financePermissions'
import {
  ArrowLeft,
  Edit,
  GraduationCap,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  BookOpen,
  Calendar,
  FileText,
  Heart,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Award,
  Stethoscope,
  Paperclip,
  ExternalLink,
} from 'lucide-react'

const TABS = [
  { id: 'overview', labelKey: 'viewStudent.tabs.overview', icon: GraduationCap },
  { id: 'personal', labelKey: 'viewStudent.tabs.personal', icon: User },
  { id: 'contact', labelKey: 'viewStudent.tabs.contact', icon: Mail },
  { id: 'academic', labelKey: 'viewStudent.tabs.academic', icon: BookOpen },
  { id: 'previous', labelKey: 'viewStudent.tabs.previousEducation', icon: Award },
  { id: 'identity', labelKey: 'viewStudent.tabs.identity', icon: FileText },
  { id: 'documents', labelKey: 'viewStudent.tabs.documents', icon: Paperclip },
  { id: 'emergency', labelKey: 'viewStudent.tabs.emergency', icon: Heart },
  { id: 'other', labelKey: 'viewStudent.tabs.other', icon: Stethoscope },
]

const STUDENT_DOCUMENT_LABELS = {
  id_photo: 'viewStudent.documents.idPhoto',
  transcript: 'viewStudent.documents.transcript',
}

function getInitials(student, isRTL) {
  if (!student) return '?'
  const nameForInitials = isRTL ? (student.name_ar || student.name_en) : (student.name_en || student.name_ar)
  const first = (student.first_name || student.name_en || '').trim().charAt(0)
  const last = (student.last_name || '').trim().charAt(0)
  if (first && last) return `${first}${last}`.toUpperCase()
  const name = (nameForInitials || '').trim()
  if (name.length >= 2) return name.slice(0, 2).toUpperCase()
  return (first || name.charAt(0) || '?').toUpperCase()
}

export default function ViewStudent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { isRTL } = useLanguage()
  const isArabicLayout = isRTL ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [enrollmentEligibility, setEnrollmentEligibility] = useState(null)
  const [activeSemester, setActiveSemester] = useState(null)
  const [studentDocuments, setStudentDocuments] = useState([])

  useEffect(() => {
    fetchStudent()
    fetchActiveSemester()
  }, [id])

  useEffect(() => {
    if (!id) return
    const fetchDocs = async () => {
      const { data, error } = await supabase
        .from('student_documents')
        .select('id, document_type, file_path, file_name, uploaded_at')
        .eq('student_id', id)
        .order('uploaded_at', { ascending: false })
      if (!error) setStudentDocuments(data || [])
      else setStudentDocuments([])
    }
    fetchDocs()
  }, [id])

  useEffect(() => {
    if (student && activeSemester) checkEnrollmentEligibility()
  }, [student, activeSemester])

  const fetchActiveSemester = async () => {
    try {
      const { data } = await supabase
        .from('semesters')
        .select('*')
        .in('status', ['active', 'registration_open'])
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      setActiveSemester(data)
    } catch (err) {
      console.error('Error fetching active semester:', err)
    }
  }

  const fetchStudent = async () => {
    try {
      const { data, error: err } = await supabase
        .from('students')
        .select('*, majors(id, name_en, name_ar, code), colleges(id, name_en, name_ar, code)')
        .eq('id', id)
        .single()
      if (err) throw err
      setStudent(data)
    } catch (err) {
      setError(err.message || 'Failed to load student')
    } finally {
      setLoading(false)
    }
  }

  const checkEnrollmentEligibility = async () => {
    if (!student || !activeSemester) return
    const eligibility = { allowed: true, reasons: [], warnings: [], financialMilestone: null, financialHold: null, outstandingInvoices: [], totalOutstanding: 0 }
    try {
      if (student.status !== 'active') {
        eligibility.allowed = false
        eligibility.reasons.push(`Student status is "${student.status}". Only active students can enroll.`)
      }
      const { milestone, hold } = await getStudentSemesterMilestone(parseInt(id), activeSemester.id)
      eligibility.financialMilestone = milestone
      eligibility.financialHold = hold
      const financeCheck = checkFinancePermission('SE_REG', milestone, hold)
      if (!financeCheck.allowed) {
        eligibility.allowed = false
        eligibility.reasons.push(`${t('viewStudent.financial')}: ${translateFinanceReason(financeCheck.reason)}`)
      }
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, paid_amount, pending_amount, status, due_date')
        .eq('student_id', parseInt(id))
        .eq('semester_id', activeSemester.id)
        .in('status', ['pending', 'overdue', 'partially_paid'])
      if (invoices?.length > 0) {
        eligibility.outstandingInvoices = invoices
        eligibility.totalOutstanding = invoices.reduce((sum, inv) => sum + parseFloat(inv.pending_amount || 0), 0)
        if (eligibility.totalOutstanding > 0) {
          const milestoneInfo = getMilestoneInfo(milestone)
          if (milestoneInfo.percentage < 30) {
            eligibility.warnings.push(
              `${t('viewStudent.outstandingBalance')}: ${eligibility.totalOutstanding.toFixed(2)}. ${t('viewStudent.min30Required')}`
            )
          }
        }
      }
      if (hold === 'FHCH') { eligibility.allowed = false; eligibility.reasons.push('Payment chargeback. Contact finance office.') }
      else if (hold === 'FHEX') { eligibility.allowed = false; eligibility.reasons.push('Payment deadline exceeded. Contact finance office.') }
      setEnrollmentEligibility(eligibility)
    } catch {
      eligibility.allowed = false
      eligibility.reasons.push('Error checking eligibility.')
      setEnrollmentEligibility(eligibility)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (error && !student) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" /> <span>{t('common.back')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
      </div>
    )
  }

  const collegeName = getLocalizedName(student?.colleges, isRTL) || student?.colleges?.name_en || 'N/A'
  const majorName = getLocalizedName(student?.majors, isRTL) || student?.majors?.name_en || 'N/A'
  const displayNameEn = [student?.first_name, student?.middle_name, student?.last_name].filter(Boolean).join(' ') || student?.name_en || '—'
  const displayNameAr = [student?.first_name_ar, student?.middle_name_ar, student?.last_name_ar].filter(Boolean).join(' ') || student?.name_ar || ''
  const primaryDisplayName = getLocalizedName(student, isRTL) || (isRTL ? (displayNameAr || displayNameEn) : (displayNameEn || displayNameAr)) || '—'
  const secondaryDisplayName = isRTL ? (displayNameEn || null) : (displayNameAr || null)
  const translateStudyType = (value) => {
    if (!value) return '—'
    const normalized = String(value).toLowerCase().replace(/\s+/g, '_')
    const map = {
      full_time: t('viewStudent.studyTypeFullTime'),
      part_time: t('viewStudent.studyTypePartTime'),
      distance: t('viewStudent.studyTypeDistance'),
      online: t('viewStudent.studyTypeOnline')
    }
    return map[normalized] || String(value).replace(/_/g, ' ')
  }
  const translateFinanceReason = (reason) => {
    if (!reason) return ''
    if (reason.toLowerCase().includes('at least 30% payment is required')) {
      return t('viewStudent.financeReasonMin30')
    }
    return reason
  }

  return (
    <div className="space-y-0">
      {/* Back + Edit */}
      <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" /> <span>{t('common.back')}</span>
        </button>
        <button
          onClick={() => navigate(`/students/${id}/edit`)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 shadow-md"
        >
          <Edit className="w-4 h-4" /> <span>{t('common.edit')}</span>
        </button>
      </div>

      {/* Profile header: compact avatar + name + major (no banner) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div
          dir={isArabicLayout ? 'rtl' : 'ltr'}
          className="flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xl font-bold text-white shadow-md flex-shrink-0">
            {getInitials(student, isRTL)}
          </div>
          <div className={`min-w-0 ${isArabicLayout ? 'text-right' : 'text-left'}`}>
            {secondaryDisplayName && (
              <p className={`text-base text-gray-600 ${isArabicLayout ? 'font-arabic' : ''}`}>{secondaryDisplayName}</p>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{primaryDisplayName}</h1>
            <p className="mt-1 text-primary-600 font-medium border-b-2 border-amber-400 pb-0.5 inline-block">
              {majorName}
            </p>
          </div>
        </div>
      </div>

      {/* Contact & affiliation card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <Building2 className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">{t('viewStudent.college')}</p>
                  <p className="font-medium">{collegeName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">{t('viewStudent.email')}</p>
                  <p className="font-medium break-all">{student?.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">{t('viewStudent.address')}</p>
                  <p className="font-medium">{student?.address || student?.city || '—'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <BookOpen className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">{t('viewStudent.major')}</p>
                  <p className="font-medium">{majorName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Phone className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">{t('viewStudent.phone')}</p>
                  <p className="font-medium">{student?.phone || student?.mobile_phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-primary-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">{t('viewStudent.enrollmentDate')}</p>
                  <p className="font-medium">{student?.enrollment_date || '—'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-gray-500">{t('viewStudent.studentId')}: <strong className="text-gray-800">{student?.student_id || '—'}</strong></span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${student?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
              {student?.status === 'active' ? t('common.active') : (student?.status || '—')}
            </span>
          </div>
        </div>

        {/* Spacer / divider between contact card and tabs */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{t('viewStudent.tabsLabel', 'Profile sections')}</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => {
            const TabIcon = tab.icon
            return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          )})}
        </div>

        {/* Tab content */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {activeTab === 'overview' && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-amber-400 rounded-full" />
                {t('viewStudent.academicOverview')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-primary-100 text-primary-800 rounded-lg px-3 py-2.5 text-center border border-primary-200">
                  <p className="text-base font-semibold">{student?.gpa != null ? Number(student.gpa).toFixed(2) : (student?.high_school_gpa != null ? Number(student.high_school_gpa).toFixed(2) : '—')}</p>
                  <p className="text-xs text-primary-600 mt-0.5">{t('viewStudent.gpa')}</p>
                </div>
                <div className="bg-primary-100 text-primary-800 rounded-lg px-3 py-2.5 text-center border border-primary-200">
                  <p className="text-base font-semibold">{student?.total_credits_earned ?? student?.credit_hours ?? '—'}</p>
                  <p className="text-xs text-primary-600 mt-0.5">{t('viewStudent.credits')}</p>
                </div>
                <div className="bg-amber-50 text-amber-900 rounded-lg px-3 py-2.5 text-center border border-amber-200">
                  <p className="text-base font-semibold">{translateStudyType(student?.study_type || 'full_time')}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{t('viewStudent.studyType')}</p>
                </div>
                <div className="bg-primary-100 text-primary-800 rounded-lg px-3 py-2.5 text-center border border-primary-200">
                  <p className="text-base font-semibold">{student?.enrollment_date || '—'}</p>
                  <p className="text-xs text-primary-600 mt-0.5">{t('viewStudent.enrolled')}</p>
                </div>
              </div>
              {enrollmentEligibility != null && (
                <div className={`rounded-xl p-4 ${enrollmentEligibility.allowed ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    {enrollmentEligibility.allowed ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
                    {t('viewStudent.enrollmentEligibility')}
                  </h3>
                  {!enrollmentEligibility.allowed && enrollmentEligibility.reasons?.length > 0 && (
                    <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
                      {enrollmentEligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                  {enrollmentEligibility.warnings?.length > 0 && (
                    <ul className="text-sm text-amber-700 mt-2 list-disc list-inside">
                      {enrollmentEligibility.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  )}
                  {enrollmentEligibility.allowed && enrollmentEligibility.reasons?.length === 0 && (
                    <p className="text-sm text-green-800">{t('viewStudent.eligibleToEnroll')}</p>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['firstName', (isRTL ? [student?.first_name_ar, student?.first_name] : [student?.first_name, student?.first_name_ar]).filter(Boolean).join(' / ') || '—'],
                ['lastName', (isRTL ? [student?.last_name_ar, student?.last_name] : [student?.last_name, student?.last_name_ar]).filter(Boolean).join(' / ') || '—'],
                ['dateOfBirth', student?.date_of_birth || '—'],
                ['gender', student?.gender || '—'],
                ['nationality', student?.nationality || '—'],
                ['religion', student?.religion || '—'],
                ['maritalStatus', student?.marital_status || '—'],
                ['bloodType', student?.blood_type || '—'],
                ['international', student?.is_international ? t('common.yes') : t('common.no')],
              ].map(([key, value]) => (
                <div key={key} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">{t(`viewStudent.${key}`)}</p>
                  <p className="mt-1 font-medium text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['email', student?.email],
                ['phone', student?.phone],
                ['mobilePhone', student?.mobile_phone],
                ['address', student?.address],
                ['city', student?.city],
                ['state', student?.state],
                ['country', student?.country],
                ['postalCode', student?.postal_code],
              ].map(([key, value]) => (
                <div key={key} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">{t(`viewStudent.${key}`)}</p>
                  <p className="mt-1 font-medium text-gray-900">{value || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['major', majorName],
                ['college', collegeName],
                ['studyType', translateStudyType(student?.study_type || '—')],
                ['studyLoad', (student?.study_load || '—').replace('_', ' ')],
                ['studyApproach', (student?.study_approach || '—').replace('_', ' ')],
                ['creditHours', student?.credit_hours ?? '—'],
                ['enrollmentDate', student?.enrollment_date],
                ['status', student?.status],
              ].map(([key, value]) => (
                <div key={key} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">{t(`viewStudent.${key}`)}</p>
                  <p className="mt-1 font-medium text-gray-900">{value || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'previous' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['highSchoolName', student?.high_school_name],
                ['highSchoolCountry', student?.high_school_country],
                ['graduationYear', student?.graduation_year],
                ['highSchoolGpa', student?.high_school_gpa != null ? Number(student.high_school_gpa).toFixed(2) : null],
              ].map(([key, value]) => (
                <div key={key} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">{t(`viewStudent.${key}`)}</p>
                  <p className="mt-1 font-medium text-gray-900">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'identity' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['nationalId', student?.national_id],
                ['passportNumber', student?.passport_number],
                ['passportExpiry', student?.passport_expiry],
                ['visaNumber', student?.visa_number],
                ['visaExpiry', student?.visa_expiry],
                ['residencePermitNumber', student?.residence_permit_number],
                ['residencePermitExpiry', student?.residence_permit_expiry],
              ].map(([key, value]) => (
                <div key={key} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">{t(`viewStudent.${key}`)}</p>
                  <p className="mt-1 font-medium text-gray-900">{value || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('viewStudent.documentsIntro', 'Documents submitted with the application (ID photo, transcript, etc.) are listed below.')}
              </p>
              {studentDocuments.length === 0 ? (
                <p className="text-gray-500 italic">{t('viewStudent.noDocuments', 'No documents on file.')}</p>
              ) : (
                <ul className="space-y-3">
                  {studentDocuments.map((doc) => {
                    const { data: urlData } = supabase.storage.from('qalam').getPublicUrl(doc.file_path)
                    const label = STUDENT_DOCUMENT_LABELS[doc.document_type]
                  return (
                    <li key={doc.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-4 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{t(label || doc.document_type)}</p>
                          {doc.file_name && <p className="text-sm text-gray-500">{doc.file_name}</p>}
                          {doc.uploaded_at && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={urlData?.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('viewStudent.viewDocument', 'View / Download')}
                      </a>
                    </li>
                  )
                  })}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'emergency' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['emergencyContactName', student?.emergency_contact_name],
                ['emergencyContactRelation', student?.emergency_contact_relation],
                ['emergencyPhone', student?.emergency_phone],
                ['emergencyContactEmail', student?.emergency_contact_email],
              ].map(([key, value]) => (
                <div key={key} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">{t(`viewStudent.${key}`)}</p>
                  <p className="mt-1 font-medium text-gray-900">{value || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'other' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">{t('viewStudent.scholarship')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500 uppercase">{t('viewStudent.hasScholarship')}</p><p className="font-medium">{student?.has_scholarship ? t('common.yes') : t('common.no')}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500 uppercase">{t('viewStudent.type')}</p><p className="font-medium">{student?.scholarship_type || '—'}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500 uppercase">{t('viewStudent.percentage')}</p><p className="font-medium">{student?.scholarship_percentage != null ? `${student.scholarship_percentage}%` : '—'}</p></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">{t('viewStudent.medical')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500 uppercase">{t('viewStudent.conditions')}</p><p className="font-medium">{student?.medical_conditions || '—'}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500 uppercase">{t('viewStudent.allergies')}</p><p className="font-medium">{student?.allergies || '—'}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4 sm:col-span-2"><p className="text-xs text-gray-500 uppercase">{t('viewStudent.medications')}</p><p className="font-medium">{student?.medications || '—'}</p></div>
                </div>
              </div>
              {student?.notes && (
                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase">{t('viewStudent.notes')}</p>
                  <p className="mt-2 text-gray-900 whitespace-pre-wrap">{student.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

      <div className="mt-8 text-center">
        <button onClick={() => navigate('/students')} className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> {t('viewStudent.backToList')}
        </button>
      </div>
    </div>
  )
}
