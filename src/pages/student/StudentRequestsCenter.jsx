import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getLocalizedName } from '../../utils/localizedName'

const UI = {
  p: '#1a3a6b',
  pl: '#2a5298',
  acc: '#c8a84b',
  bg: '#f4f6fb',
  sur: '#ffffff',
  bdr: '#dde3ef',
  txt: '#1e2a3a',
  muted: '#6b7a99',
  ok: '#1a7a4a',
  okBg: '#e6f7ef',
  warn: '#b45309',
  warnBg: '#fef3c7',
  err: '#b91c1c',
  errBg: '#fee2e2',
  info: '#1d4ed8',
  infoBg: '#dbeafe',
  neu: '#4b5563',
  neuBg: '#f3f4f6',
}

const SERVICE_CATEGORIES = [
  { type: 'transcript', icon: '📜', nameAr: 'كشف الدرجات الرسمي', nameEn: 'Official transcript', descAr: 'كشف درجات موقّع ومختوم', descEn: 'Signed and stamped transcript' },
  { type: 'enrollment-cert', icon: '🎓', nameAr: 'شهادة التسجيل', nameEn: 'Enrollment certificate', descAr: 'إثبات التسجيل في الجامعة', descEn: 'Proof of enrollment' },
  { type: 'embassy-letter', icon: '📋', nameAr: 'خطاب للسفارة', nameEn: 'Embassy letter', descAr: 'خطاب رسمي لأغراض التأشيرة', descEn: 'Official letter for visa purposes' },
  { type: 'scholarship', icon: '🏆', nameAr: 'طلب منحة دراسية', nameEn: 'Scholarship request', descAr: 'التقدم لمنحة أكاديمية', descEn: 'Apply for a scholarship' },
  { type: 'major-change', icon: '🔄', nameAr: 'تغيير التخصص', nameEn: 'Major change', descAr: 'طلب تحويل إلى تخصص آخر', descEn: 'Request major transfer' },
  { type: 'deferral', icon: '⏸️', nameAr: 'تأجيل الدراسة', nameEn: 'Deferral', descAr: 'طلب إيقاف مؤقت للدراسة', descEn: 'Temporary study deferral' },
  { type: 'id-replacement', icon: '🆔', nameAr: 'استبدال الهوية الجامعية', nameEn: 'ID replacement', descAr: 'بدل فاقد أو تالف', descEn: 'Lost/damaged replacement' },
  { type: 'contact-update', icon: '📧', nameAr: 'تحديث بيانات التواصل', nameEn: 'Contact update', descAr: 'تغيير البريد أو الهاتف', descEn: 'Update email/phone' },
]

function statusBadge(status, t) {
  const s = String(status || '').toLowerCase()
  const map = {
    draft: { key: 'draft', bg: UI.neuBg, fg: UI.neu, label: t('studentPortal.requests.statusDraft', 'Draft') },
    submitted: { key: 'submitted', bg: UI.infoBg, fg: UI.info, label: t('studentPortal.requests.statusSubmitted', 'Submitted') },
    processing: { key: 'processing', bg: UI.warnBg, fg: UI.warn, label: t('studentPortal.requests.statusProcessing', 'Processing') },
    completed: { key: 'completed', bg: UI.okBg, fg: UI.ok, label: t('studentPortal.requests.statusCompleted', 'Completed') },
    cancelled: { key: 'cancelled', bg: UI.neuBg, fg: UI.neu, label: t('studentPortal.requests.statusCancelled', 'Cancelled') },
    rejected: { key: 'rejected', bg: UI.errBg, fg: UI.err, label: t('studentPortal.requests.statusRejected', 'Rejected') },
  }
  return map[s] || { key: s || 'unknown', bg: UI.neuBg, fg: UI.neu, label: s || t('common.unknown', 'Unknown') }
}

export default function StudentRequestsCenter() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabic = isRTL || language === 'ar'
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.email) return
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const { data: studentData, error: sErr } = await supabase
          .from('students')
          .select('id, student_id, name_en, name_ar, first_name, last_name, email, college_id')
          .eq('email', user.email)
          .eq('status', 'active')
          .maybeSingle()
        if (sErr) throw sErr
        if (!studentData) {
          setStudent(null)
          setRequests([])
          return
        }
        setStudent(studentData)

        const { data: reqData, error: rErr } = await supabase
          .from('student_service_requests')
          .select('id, request_number, request_type, status, description, created_at, last_status_at')
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: false })
          .limit(50)
        if (rErr) throw rErr
        setRequests(reqData || [])
      } catch (e) {
        console.error('StudentRequestsCenter load error:', e)
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.email])

  const displayName = useMemo(() => getLocalizedName(student, isArabic) || student?.email?.split('@')?.[0] || '—', [student, isArabic])

  const svcLabel = (type) => {
    const item = SERVICE_CATEGORIES.find((x) => x.type === type)
    if (!item) return type
    return isArabic ? item.nameAr : item.nameEn
  }

  const createAndOpen = async (type) => {
    if (!student?.id) return
    try {
      setLoading(true)
      const item = SERVICE_CATEGORIES.find((x) => x.type === type)
      const title_en = item?.nameEn || type
      const title_ar = item?.nameAr || type
      const { data, error: insErr } = await supabase
        .from('student_service_requests')
        .insert({
          student_id: student.id,
          college_id: student.college_id,
          request_type: type,
          title_en,
          title_ar,
          description: item?.descEn || null,
          payload: { requested_from: 'student_portal' },
          status: 'submitted',
        })
        .select('id')
        .single()
      if (insErr) throw insErr
      navigate(`/student/requests/${data.id}`)
    } catch (e) {
      console.error('create request error:', e)
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  if (loading && !student) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
        <p className="text-amber-800">{t('studentPortal.noStudentData', 'Student data not found.')}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isArabic ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <nav className="flex flex-wrap items-center gap-2 text-sm" style={{ color: UI.muted }}>
        <a href="/" className="no-underline hover:underline" style={{ color: UI.muted }}>{t('studentPortal.profile.breadcrumbHome', { defaultValue: 'Home' })}</a>
        <span style={{ color: UI.bdr }}>/</span>
        <a href="/dashboard" className="no-underline hover:underline" style={{ color: UI.muted }}>{t('studentPortal.studentPortal', { defaultValue: 'Student Portal' })}</a>
        <span style={{ color: UI.bdr }}>/</span>
        <span className="font-semibold" style={{ color: UI.p }}>{t('studentPortal.requests.title', { defaultValue: 'Requests center' })}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: UI.p }}>{t('studentPortal.requests.titleAr', { defaultValue: 'مركز الطلبات والخدمات' })}</h1>
        <p className="text-sm" style={{ color: UI.muted }}>
          {t('studentPortal.requests.subtitleAr', { defaultValue: 'تقديم طلبات الوثائق والخدمات الأكاديمية' })}
          {' '}
          <span className="font-bold">{displayName}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', backgroundColor: UI.errBg, color: UI.err }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SERVICE_CATEGORIES.map((svc) => (
          <div key={svc.type} className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: UI.bdr }}>
            <div className="text-3xl mb-2">{svc.icon}</div>
            <div className="font-extrabold" style={{ color: UI.p }}>{isArabic ? svc.nameAr : svc.nameEn}</div>
            <div className="text-sm mt-1" style={{ color: UI.muted }}>{isArabic ? svc.descAr : svc.descEn}</div>
            <button
              type="button"
              onClick={() => createAndOpen(svc.type)}
              className="mt-4 w-full px-4 py-2 rounded-lg font-extrabold text-white"
              style={{ backgroundColor: UI.p }}
              disabled={loading}
            >
              {t('studentPortal.requests.apply', { defaultValue: 'تقدّم' })}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('studentPortal.requests.myRequests', { defaultValue: 'طلباتي السابقة' })}</div>
        </div>
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: UI.bdr }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: UI.p, color: 'white' }}>
                <th className="px-4 py-3 whitespace-nowrap">{t('studentPortal.requests.requestNumber', { defaultValue: 'رقم الطلب' })}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t('studentPortal.requests.type', { defaultValue: 'نوع الطلب' })}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t('studentPortal.requests.submittedAt', { defaultValue: 'تاريخ التقديم' })}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t('studentPortal.requests.status', { defaultValue: 'الحالة' })}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t('common.notes', { defaultValue: 'ملاحظات' })}</th>
                <th className="px-4 py-3 whitespace-nowrap">{t('common.actions', { defaultValue: 'إجراء' })}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center" style={{ color: UI.muted }}>
                    {t('studentPortal.requests.noRequests', { defaultValue: 'لا توجد طلبات بعد.' })}
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const badge = statusBadge(r.status, t)
                  return (
                    <tr key={r.id} className="border-b hover:bg-slate-50" style={{ borderColor: UI.bdr }}>
                      <td className="px-4 py-3" dir="ltr">
                        <strong>{r.request_number}</strong>
                      </td>
                      <td className="px-4 py-3">{svcLabel(r.request_type)}</td>
                      <td className="px-4 py-3" dir="ltr">
                        {r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold" style={{ backgroundColor: badge.bg, color: badge.fg }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: UI.muted }}>
                        {r.description || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/student/requests/${r.id}`)}
                          className="px-3 py-1.5 rounded-md border text-xs font-extrabold"
                          style={{ backgroundColor: UI.bg, borderColor: UI.bdr, color: UI.txt }}
                        >
                          {t('common.view', { defaultValue: 'عرض' })}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

