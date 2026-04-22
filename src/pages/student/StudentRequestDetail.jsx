import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
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

function badge(status, t) {
  const s = String(status || '').toLowerCase()
  const map = {
    draft: { bg: UI.neuBg, fg: UI.neu, label: t('studentPortal.requests.statusDraft', 'Draft') },
    submitted: { bg: UI.infoBg, fg: UI.info, label: t('studentPortal.requests.statusSubmitted', 'Submitted') },
    processing: { bg: UI.warnBg, fg: UI.warn, label: t('studentPortal.requests.statusProcessing', 'Processing') },
    completed: { bg: UI.okBg, fg: UI.ok, label: t('studentPortal.requests.statusCompleted', 'Completed') },
    cancelled: { bg: UI.neuBg, fg: UI.neu, label: t('studentPortal.requests.statusCancelled', 'Cancelled') },
    rejected: { bg: UI.errBg, fg: UI.err, label: t('studentPortal.requests.statusRejected', 'Rejected') },
  }
  return map[s] || { bg: UI.neuBg, fg: UI.neu, label: s || t('common.unknown', 'Unknown') }
}

function stepsForStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') return 4
  if (s === 'processing') return 3
  if (s === 'submitted') return 2
  if (s === 'draft') return 1
  return 1
}

export default function StudentRequestDetail() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabic = isRTL || language === 'ar'
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [req, setReq] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.email || !id) return
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
        setStudent(studentData || null)

        const { data: rData, error: rErr } = await supabase
          .from('student_service_requests')
          .select('*')
          .eq('id', Number(id))
          .single()
        if (rErr) throw rErr
        setReq(rData)

        const { data: cData, error: cErr } = await supabase
          .from('student_service_request_comments')
          .select('id, author_role, message, created_at')
          .eq('request_id', Number(id))
          .order('created_at', { ascending: true })
        if (cErr) throw cErr
        setComments(cData || [])
      } catch (e) {
        console.error('StudentRequestDetail load error:', e)
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.email, id])

  const displayName = useMemo(() => getLocalizedName(student, isArabic) || student?.email?.split('@')?.[0] || '—', [student, isArabic])
  const b = useMemo(() => badge(req?.status, t), [req?.status, t])
  const step = useMemo(() => stepsForStatus(req?.status), [req?.status])
  const canCancel = useMemo(() => ['draft', 'submitted', 'processing'].includes(String(req?.status || '').toLowerCase()), [req?.status])

  const addComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !req?.id) return
    try {
      setSaving(true)
      setError('')
      const { data, error: insErr } = await supabase
        .from('student_service_request_comments')
        .insert({
          request_id: req.id,
          author_role: 'student',
          author_user_id: null,
          message: commentText.trim(),
        })
        .select('id, author_role, message, created_at')
        .single()
      if (insErr) throw insErr
      setComments((p) => [...p, data])
      setCommentText('')
    } catch (e2) {
      console.error('addComment error:', e2)
      setError(e2?.message || String(e2))
    } finally {
      setSaving(false)
    }
  }

  const cancelRequest = async () => {
    if (!req?.id || !canCancel) return
    if (!confirm(t('studentPortal.requests.cancelConfirm', 'Cancel this request?'))) return
    try {
      setSaving(true)
      setError('')
      const { data, error: updErr } = await supabase
        .from('student_service_requests')
        .update({ status: 'cancelled' })
        .eq('id', req.id)
        .select('*')
        .single()
      if (updErr) throw updErr
      setReq(data)
    } catch (e) {
      console.error('cancelRequest error:', e)
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  if (!req) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
        <p className="text-amber-800">{t('studentPortal.requests.notFound', 'Request not found.')}</p>
        <div className="mt-3">
          <Link className="underline" to="/student/requests">{t('common.back', 'Back')}</Link>
        </div>
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
        <Link to="/student/requests" className="no-underline hover:underline" style={{ color: UI.muted }}>{t('studentPortal.requests.title', { defaultValue: 'Requests center' })}</Link>
        <span style={{ color: UI.bdr }}>/</span>
        <span className="font-semibold" style={{ color: UI.p }}>{t('studentPortal.requests.detail', { defaultValue: 'Request details' })}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: UI.p }}>{t('studentPortal.requests.detail', { defaultValue: 'تفاصيل الطلب' })}</h1>
          <p className="text-sm" style={{ color: UI.muted }}>
            {t('studentPortal.requests.requestNumberLabel', { defaultValue: 'رقم الطلب:' })}{' '}
            <span className="font-extrabold" dir="ltr">{req.request_number}</span>
            {' '}
            <span className="font-bold">{displayName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg font-extrabold text-white"
            style={{ backgroundColor: UI.err, opacity: canCancel ? 1 : 0.5 }}
            onClick={cancelRequest}
            disabled={!canCancel || saving}
          >
            ❌ {t('studentPortal.requests.cancel', { defaultValue: 'إلغاء الطلب' })}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', backgroundColor: UI.errBg, color: UI.err }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
              <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('studentPortal.requests.info', { defaultValue: 'معلومات الطلب' })}</div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold" style={{ backgroundColor: b.bg, color: b.fg }}>
                {b.label}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div style={{ color: UI.muted }}>{t('studentPortal.requests.requestNumber', { defaultValue: 'رقم الطلب' })}</div>
                <div className="font-extrabold" dir="ltr">{req.request_number}</div>
              </div>
              <div>
                <div style={{ color: UI.muted }}>{t('studentPortal.requests.type', { defaultValue: 'نوع الطلب' })}</div>
                <div className="font-extrabold">{isArabic ? (req.title_ar || req.request_type) : (req.title_en || req.request_type)}</div>
              </div>
              <div>
                <div style={{ color: UI.muted }}>{t('studentPortal.requests.submittedAt', { defaultValue: 'تاريخ التقديم' })}</div>
                <div className="font-extrabold" dir="ltr">{req.created_at ? new Date(req.created_at).toISOString().slice(0, 10) : '—'}</div>
              </div>
              <div>
                <div style={{ color: UI.muted }}>{t('studentPortal.requests.expectedCompletion', { defaultValue: 'الوقت المتوقع للإنجاز' })}</div>
                <div className="font-extrabold">{req.expected_completion_days ? `${req.expected_completion_days} ${t('studentPortal.requests.businessDays', { defaultValue: 'أيام عمل' })}` : '—'}</div>
              </div>
              <div className="sm:col-span-2">
                <div style={{ color: UI.muted }}>{t('common.notes', { defaultValue: 'ملاحظات' })}</div>
                <div className="font-semibold" style={{ color: UI.txt }}>{req.description || '—'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
              <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('studentPortal.requests.timeline', { defaultValue: 'مراحل معالجة الطلب' })}</div>
            </div>
            <div className="space-y-4">
              {[
                { n: 1, title: t('studentPortal.requests.stepReceived', { defaultValue: 'تم استلام الطلب' }), desc: t('studentPortal.requests.stepReceivedDesc', { defaultValue: 'تم تسجيل طلبك وإحالته للمعالجة' }) },
                { n: 2, title: t('studentPortal.requests.stepVerify', { defaultValue: 'التحقق من البيانات' }), desc: t('studentPortal.requests.stepVerifyDesc', { defaultValue: 'تم التحقق من بياناتك الأكاديمية' }) },
                { n: 3, title: t('studentPortal.requests.stepPrepare', { defaultValue: 'إعداد الوثيقة' }), desc: t('studentPortal.requests.stepPrepareDesc', { defaultValue: 'يجري إعداد الوثيقة وتوقيعها' }) },
                { n: 4, title: t('studentPortal.requests.stepDeliver', { defaultValue: 'التسليم' }), desc: t('studentPortal.requests.stepDeliverDesc', { defaultValue: 'إرسال الوثيقة وإشعار الاستلام' }) },
              ].map((s) => {
                const state = step > s.n ? 'done' : step === s.n ? 'active' : 'pending'
                const dotBg = state === 'done' ? UI.ok : state === 'active' ? UI.info : UI.bg
                const dotBd = state === 'done' ? UI.ok : state === 'active' ? UI.info : UI.bdr
                const text = state === 'done' ? UI.ok : state === 'active' ? UI.info : UI.muted
                return (
                  <div key={s.n} className="flex gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold" style={{ backgroundColor: dotBg, color: state === 'pending' ? UI.muted : 'white', border: `2px solid ${dotBd}` }}>
                      {s.n}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="font-extrabold" style={{ color: UI.txt }}>{s.title}</div>
                      <div className="text-xs" style={{ color: text }}>
                        {state === 'active' ? t('studentPortal.requests.inProgress', { defaultValue: 'قيد التنفيذ' }) : state === 'pending' ? '—' : t('studentPortal.requests.done', { defaultValue: 'تم' })}
                      </div>
                      <div className="text-sm mt-1" style={{ color: UI.muted }}>{s.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
              <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('studentPortal.requests.comments', { defaultValue: 'التعليقات والمراسلات' })}</div>
            </div>

            <div className="space-y-3 mb-4">
              {comments.length === 0 ? (
                <div className="text-sm" style={{ color: UI.muted }}>{t('studentPortal.requests.noComments', { defaultValue: 'لا توجد تعليقات بعد.' })}</div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border"
                    style={{
                      borderColor: UI.bdr,
                      backgroundColor: c.author_role === 'student' ? UI.infoBg : UI.bg,
                    }}
                  >
                    <div className="font-extrabold text-sm" style={{ color: UI.txt }}>
                      {c.author_role === 'student' ? t('studentPortal.requests.you', { defaultValue: 'أنت' }) : t('studentPortal.requests.staff', { defaultValue: 'موظف شؤون التسجيل' })}
                    </div>
                    <div className="text-xs" style={{ color: UI.muted }} dir="ltr">
                      {c.created_at ? new Date(c.created_at).toLocaleString(isArabic ? 'ar-SA' : 'en-GB') : ''}
                    </div>
                    <div className="text-sm mt-2" style={{ color: UI.txt }}>{c.message}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={addComment} className="space-y-3">
              <div>
                <label className="block text-sm font-extrabold mb-1" style={{ color: UI.txt }}>
                  {t('studentPortal.requests.addComment', { defaultValue: 'إضافة تعليق أو استفسار' })}
                </label>
                <textarea
                  className="w-full px-3 py-2.5 rounded-md border bg-white text-sm"
                  style={{ borderColor: UI.bdr }}
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t('studentPortal.requests.commentPlaceholder', { defaultValue: 'اكتب استفسارك هنا...' })}
                />
              </div>
              <button
                type="submit"
                disabled={saving || !commentText.trim()}
                className="px-5 py-2.5 rounded-md font-extrabold text-white disabled:opacity-50"
                style={{ backgroundColor: UI.p }}
              >
                {t('studentPortal.requests.send', { defaultValue: 'إرسال' })}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
              <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('studentPortal.requests.quickActions', { defaultValue: 'إجراءات سريعة' })}</div>
            </div>
            <div className="space-y-2">
              <button type="button" className="w-full px-4 py-2 rounded-md border font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }} onClick={() => window.print()}>
                🖨️ {t('studentPortal.requests.print', { defaultValue: 'طباعة الطلب' })}
              </button>
              <button type="button" className="w-full px-4 py-2 rounded-md border font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }} disabled>
                ⬇ {t('studentPortal.requests.downloadReceipt', { defaultValue: 'تحميل إيصال الدفع' })}
              </button>
              <button type="button" className="w-full px-4 py-2 rounded-md border font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }} onClick={() => navigate('/student/requests')}>
                ← {t('studentPortal.requests.backToRequests', { defaultValue: 'العودة للطلبات' })}
              </button>
              <button type="button" className="w-full px-4 py-2 rounded-md font-extrabold text-white" style={{ backgroundColor: UI.err, opacity: canCancel ? 1 : 0.5 }} onClick={cancelRequest} disabled={!canCancel || saving}>
                ❌ {t('studentPortal.requests.cancel', { defaultValue: 'إلغاء الطلب' })}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
              <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('studentPortal.requests.sla', { defaultValue: 'مستوى الخدمة (SLA)' })}</div>
            </div>
            <div className="text-sm" style={{ color: UI.muted, lineHeight: 2 }}>
              <p><strong style={{ color: UI.txt }}>{t('studentPortal.requests.processingTime', { defaultValue: 'وقت المعالجة:' })}</strong> {req.expected_completion_days ? `${req.expected_completion_days} ${t('studentPortal.requests.businessDays', { defaultValue: 'أيام عمل' })}` : '—'}</p>
              <p><strong style={{ color: UI.txt }}>{t('studentPortal.requests.workingHours', { defaultValue: 'ساعات العمل:' })}</strong> {t('studentPortal.requests.workingHoursValue', { defaultValue: 'الأحد - الخميس 8:00 - 16:00' })}</p>
              <p><strong style={{ color: UI.txt }}>{t('studentPortal.requests.pickup', { defaultValue: 'الاستلام الشخصي:' })}</strong> {t('studentPortal.requests.pickupValue', { defaultValue: 'مكتب التسجيل — المبنى الرئيسي' })}</p>
              <p><strong style={{ color: UI.txt }}>{t('studentPortal.requests.contact', { defaultValue: 'للاستفسار:' })}</strong> registrar@ibu.edu.sa</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

