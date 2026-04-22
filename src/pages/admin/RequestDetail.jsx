import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, SUPABASE_STORAGE_BUCKET } from '../../lib/supabase'
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

export default function RequestDetail() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabic = isRTL || language === 'ar' || i18n?.language?.toLowerCase()?.startsWith('ar')
  const { userRole } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [req, setReq] = useState(null)
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [replyText, setReplyText] = useState('')
  const [statusDraft, setStatusDraft] = useState('')

  useEffect(() => {
    if (userRole !== 'admin' && userRole !== 'user') return
    if (!id) return
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        setToast('')

        const { data: rData, error: rErr } = await supabase
          .from('student_service_requests')
          .select(
            `
            *,
            students(id, student_id, name_en, name_ar, first_name, last_name, email, college_id),
            semesters(id, name_en, name_ar, code)
          `,
          )
          .eq('id', Number(id))
          .single()
        if (rErr) throw rErr
        setReq(rData)
        setStatusDraft(String(rData.status || ''))

        const { data: cData, error: cErr } = await supabase
          .from('student_service_request_comments')
          .select('id, author_role, message, created_at')
          .eq('request_id', Number(id))
          .order('created_at', { ascending: true })
        if (cErr) throw cErr
        setComments(cData || [])

        const { data: aData, error: aErr } = await supabase
          .from('student_service_request_attachments')
          .select('id, file_path, file_name, mime_type, file_size, created_at')
          .eq('request_id', Number(id))
          .order('created_at', { ascending: false })
        if (aErr) throw aErr
        setAttachments(aData || [])
      } catch (e) {
        console.error('Admin RequestDetail load error:', e)
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, userRole])

  const b = useMemo(() => badge(req?.status, t), [req?.status, t])
  const studentName = useMemo(() => getLocalizedName(req?.students, isArabic) || req?.students?.email || '—', [req?.students, isArabic])

  const addReply = async () => {
    if (!replyText.trim() || !req?.id) return
    try {
      setSaving(true)
      setError('')
      const { data, error: insErr } = await supabase
        .from('student_service_request_comments')
        .insert({
          request_id: req.id,
          author_role: userRole === 'admin' ? 'admin' : 'college',
          author_user_id: null,
          message: replyText.trim(),
        })
        .select('id, author_role, message, created_at')
        .single()
      if (insErr) throw insErr
      setComments((p) => [...p, data])
      setReplyText('')
      setToast(t('common.success', 'Success'))
      setTimeout(() => setToast(''), 1500)
    } catch (e) {
      console.error('addReply error:', e)
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const saveStatus = async () => {
    if (!req?.id || !statusDraft) return
    try {
      setSaving(true)
      setError('')
      const { data, error: updErr } = await supabase
        .from('student_service_requests')
        .update({ status: statusDraft })
        .eq('id', req.id)
        .select('*')
        .single()
      if (updErr) throw updErr
      setReq((p) => ({ ...(p || {}), ...data }))
      setToast(t('common.success', 'Success'))
      setTimeout(() => setToast(''), 1500)
    } catch (e) {
      console.error('saveStatus error:', e)
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const uploadAttachment = async (file) => {
    if (!file || !req?.id) return
    try {
      setSaving(true)
      setError('')

      const safeName = String(file.name || 'attachment.pdf').replace(/[^\w.\-() ]+/g, '_')
      const path = `request_attachments/req_${req.id}/${Date.now()}_${safeName}`

      const { error: upErr } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/pdf',
      })
      if (upErr) throw upErr

      const { data, error: insErr } = await supabase
        .from('student_service_request_attachments')
        .insert({
          request_id: req.id,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size || null,
          uploaded_by_user_id: null,
        })
        .select('id, file_path, file_name, mime_type, file_size, created_at')
        .single()
      if (insErr) throw insErr
      setAttachments((p) => [data, ...p])
      setToast(t('common.success', 'Success'))
      setTimeout(() => setToast(''), 1500)
    } catch (e) {
      console.error('uploadAttachment error:', e)
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  if (userRole !== 'admin' && userRole !== 'user') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
        <p className="text-amber-800">{t('common.error', 'Forbidden')}</p>
      </div>
    )
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
        <p className="text-amber-800">{t('admin.requests.notFound', 'Request not found.')}</p>
        <div className="mt-3">
          <button className="underline" onClick={() => navigate('/admin/requests')}>{t('common.back', 'Back')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <nav className="flex flex-wrap items-center gap-2 text-sm" style={{ color: UI.muted }}>
        <Link to="/dashboard" className="no-underline hover:underline" style={{ color: UI.muted }}>{t('navigation.dashboard', 'Dashboard')}</Link>
        <span style={{ color: UI.bdr }}>/</span>
        <Link to="/admin/requests" className="no-underline hover:underline" style={{ color: UI.muted }}>{t('navigation.studentRequests', 'Student requests')}</Link>
        <span style={{ color: UI.bdr }}>/</span>
        <span className="font-semibold" style={{ color: UI.p }}>{req.request_number}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: UI.p }}>{t('admin.requests.detailTitle', 'Request detail')}</h1>
          <p className="text-sm" style={{ color: UI.muted }}>
            <span className="font-extrabold" dir="ltr">{req.request_number}</span> — {studentName}
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold" style={{ backgroundColor: b.bg, color: b.fg }}>
          {b.label}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', backgroundColor: UI.errBg, color: UI.err }}>
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#bbf7d0', backgroundColor: UI.okBg, color: UI.ok }}>
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
              <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('admin.requests.requestInfo', 'Request information')}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div style={{ color: UI.muted }}>{t('studentPortal.requests.type', 'Type')}</div>
                <div className="font-extrabold">{req.request_type}</div>
              </div>
              <div>
                <div style={{ color: UI.muted }}>{t('common.date', 'Date')}</div>
                <div className="font-extrabold" dir="ltr">{req.created_at ? new Date(req.created_at).toISOString().slice(0, 10) : '—'}</div>
              </div>
              <div className="sm:col-span-2">
                <div style={{ color: UI.muted }}>{t('common.notes', 'Notes')}</div>
                <div className="font-semibold" style={{ color: UI.txt }}>{req.description || '—'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
              <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('admin.requests.comments', 'Comments')}</div>
            </div>
            <div className="space-y-3 mb-4">
              {comments.length === 0 ? (
                <div className="text-sm" style={{ color: UI.muted }}>{t('studentPortal.requests.noComments', 'No comments yet.')}</div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border"
                    style={{
                      borderColor: UI.bdr,
                      backgroundColor: c.author_role === 'student' ? UI.bg : UI.infoBg,
                    }}
                  >
                    <div className="font-extrabold text-sm" style={{ color: UI.txt }}>
                      {c.author_role === 'student'
                        ? t('studentPortal.requests.student', 'Student')
                        : t('studentPortal.requests.staff', 'Staff')}
                    </div>
                    <div className="text-xs" style={{ color: UI.muted }} dir="ltr">
                      {c.created_at ? new Date(c.created_at).toLocaleString(isArabic ? 'ar-SA' : 'en-GB') : ''}
                    </div>
                    <div className="text-sm mt-2" style={{ color: UI.txt }}>{c.message}</div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <textarea
                className="w-full px-3 py-2.5 rounded-md border bg-white text-sm"
                style={{ borderColor: UI.bdr }}
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('admin.requests.replyPlaceholder', 'Write a reply to the student...')}
              />
              <button
                type="button"
                onClick={addReply}
                disabled={saving || !replyText.trim()}
                className="px-5 py-2.5 rounded-md font-extrabold text-white disabled:opacity-50"
                style={{ backgroundColor: UI.p }}
              >
                {t('admin.requests.sendReply', 'Send reply')}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
              <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('admin.requests.actions', 'Actions')}</div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-extrabold" style={{ color: UI.txt }}>{t('common.status', 'Status')}</label>
              <select
                className="w-full px-3 py-2.5 rounded-md border bg-white text-sm"
                style={{ borderColor: UI.bdr }}
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                disabled={saving}
              >
                <option value="submitted">{t('studentPortal.requests.statusSubmitted', 'Submitted')}</option>
                <option value="processing">{t('studentPortal.requests.statusProcessing', 'Processing')}</option>
                <option value="completed">{t('studentPortal.requests.statusCompleted', 'Completed')}</option>
                <option value="rejected">{t('studentPortal.requests.statusRejected', 'Rejected')}</option>
                <option value="cancelled">{t('studentPortal.requests.statusCancelled', 'Cancelled')}</option>
              </select>
              <button
                type="button"
                className="w-full px-4 py-2 rounded-md font-extrabold text-white disabled:opacity-50"
                style={{ backgroundColor: UI.p }}
                onClick={saveStatus}
                disabled={saving || statusDraft === String(req.status)}
              >
                {t('common.save', 'Save')}
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 rounded-md font-extrabold text-white disabled:opacity-50"
                style={{ backgroundColor: UI.ok }}
                onClick={() => {
                  setStatusDraft('completed')
                  saveStatus()
                }}
                disabled={saving}
              >
                {t('admin.requests.markCompleted', 'Mark completed')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
              <div className="text-base font-extrabold" style={{ color: UI.p }}>{t('admin.requests.attachments', 'Attachments')}</div>
            </div>

            <label className="block text-sm font-extrabold mb-2" style={{ color: UI.txt }}>
              {t('admin.requests.attachPdf', 'Attach PDF')}
            </label>
            <input
              type="file"
              accept="application/pdf"
              disabled={saving}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadAttachment(f)
                e.target.value = ''
              }}
            />

            <div className="mt-4 space-y-2">
              {attachments.length === 0 ? (
                <div className="text-sm" style={{ color: UI.muted }}>{t('admin.requests.noAttachments', 'No attachments yet.')}</div>
              ) : (
                attachments.map((a) => {
                  const { data: urlData } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(a.file_path)
                  return (
                    <a
                      key={a.id}
                      href={urlData?.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                      style={{ borderColor: UI.bdr, color: UI.pl }}
                    >
                      <div className="font-extrabold" style={{ color: UI.txt }}>{a.file_name || a.file_path}</div>
                      <div className="text-xs" style={{ color: UI.muted }} dir="ltr">
                        {a.created_at ? new Date(a.created_at).toLocaleString(isArabic ? 'ar-SA' : 'en-GB') : ''}
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

