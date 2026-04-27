import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'

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
}

function startOfWeek(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  // Sunday as start (0)
  const diff = x.getDay()
  x.setDate(x.getDate() - diff)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function toIsoLocalInput(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

export default function StudentStudyPlanner() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isRTL, language } = useLanguage()
  const isArabic = isRTL || language === 'ar'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  const [tasks, setTasks] = useState([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ id: null, title: '', description: '', course_code: '', due_at: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.email) return
      setLoading(true)
      setError('')
      try {
        const { data: st, error: stErr } = await supabase
          .from('students')
          .select('id')
          .eq('email', user.email)
          .eq('status', 'active')
          .single()
        if (stErr) throw stErr
        if (cancelled) return
        setStudent(st)

        const { data: rows, error: tErr } = await supabase
          .from('student_study_tasks')
          .select('id, title, description, course_code, due_at, status, created_at')
          .eq('student_id', st.id)
          .order('due_at', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
        if (tErr) throw tErr
        if (!cancelled) setTasks(rows || [])
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load study planner')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.email])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  }, [weekStart])

  const tasksByDay = useMemo(() => {
    const map = new Map()
    for (const d of weekDays) {
      const key = d.toISOString().slice(0, 10)
      map.set(key, [])
    }
    for (const task of tasks) {
      const due = task.due_at ? new Date(task.due_at) : null
      if (!due) continue
      const key = new Date(due.getFullYear(), due.getMonth(), due.getDate()).toISOString().slice(0, 10)
      if (map.has(key)) map.get(key).push(task)
    }
    // also show tasks without due date in a special bucket
    const undated = tasks.filter((t) => !t.due_at)
    return { map, undated }
  }, [tasks, weekDays])

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'done').length
    const pending = tasks.filter((t) => t.status === 'pending').length
    const urgent = tasks.filter((t) => {
      if (t.status !== 'pending' || !t.due_at) return false
      const ms = new Date(t.due_at).getTime() - Date.now()
      return ms <= 24 * 60 * 60 * 1000 && ms >= 0
    }).length
    const plannedHours = Math.round((pending * 1.5 + urgent * 0.5) * 10) / 10
    return { done, pending, urgent, plannedHours }
  }, [tasks])

  const openCreate = () => {
    setForm({ id: null, title: '', description: '', course_code: '', due_at: '' })
    setShowModal(true)
  }

  const openEdit = (row) => {
    setForm({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      course_code: row.course_code || '',
      due_at: toIsoLocalInput(row.due_at),
    })
    setShowModal(true)
  }

  const saveTask = async () => {
    if (!student?.id) return
    const title = String(form.title || '').trim()
    if (!title) {
      setError(isArabic ? 'عنوان المهمة مطلوب' : 'Task title is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        student_id: student.id,
        title,
        description: String(form.description || '').trim() || null,
        course_code: String(form.course_code || '').trim() || null,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      }
      if (form.id) {
        const { error: upErr } = await supabase.from('student_study_tasks').update(payload).eq('id', form.id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase.from('student_study_tasks').insert({ ...payload, status: 'pending' })
        if (insErr) throw insErr
      }

      const { data: rows, error: tErr } = await supabase
        .from('student_study_tasks')
        .select('id, title, description, course_code, due_at, status, created_at')
        .eq('student_id', student.id)
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (tErr) throw tErr
      setTasks(rows || [])
      setShowModal(false)
    } catch (e) {
      setError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const toggleDone = async (row) => {
    const next = row.status === 'done' ? 'pending' : 'done'
    try {
      const { error: upErr } = await supabase.from('student_study_tasks').update({ status: next }).eq('id', row.id)
      if (upErr) throw upErr
      setTasks((prev) => prev.map((t) => (t.id === row.id ? { ...t, status: next } : t)))
    } catch (e) {
      setError(e?.message || 'Failed to update task')
    }
  }

  const deleteTask = async (row) => {
    if (!confirm(isArabic ? 'حذف المهمة؟' : 'Delete task?')) return
    try {
      const { error: delErr } = await supabase.from('student_study_tasks').delete().eq('id', row.id)
      if (delErr) throw delErr
      setTasks((prev) => prev.filter((t) => t.id !== row.id))
    } catch (e) {
      setError(e?.message || 'Failed to delete task')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>}

      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <button type="button" className="hover:text-slate-900" onClick={() => navigate('/student/elearning/courseware')}>
          {isArabic ? 'التعلم الإلكتروني' : 'e‑Learning'}
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-semibold">{isArabic ? 'مخطط الدراسة' : 'Study planner'}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: UI.p }}>
            {isArabic ? 'مخطط الدراسة الأسبوعي' : 'Weekly study planner'}
          </h1>
          <p className="text-sm" style={{ color: UI.muted }}>
            {isArabic ? 'خطّط مهامك الدراسية وأدِرها خلال الأسبوع.' : 'Plan and track your study tasks for the week.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="px-4 py-2 rounded-lg font-extrabold text-white" style={{ backgroundColor: UI.p }} onClick={openCreate}>
            + {isArabic ? 'إضافة مهمة' : 'Add task'}
          </button>
          <button type="button" className="px-3 py-2 rounded-lg border font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }} onClick={() => setWeekStart(startOfWeek(addDays(weekStart, -7)))}>
            {isArabic ? '◀ الأسبوع السابق' : '◀ Prev'}
          </button>
          <button type="button" className="px-3 py-2 rounded-lg border font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }} onClick={() => setWeekStart(startOfWeek(addDays(weekStart, 7)))}>
            {isArabic ? 'الأسبوع القادم ▶' : 'Next ▶'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: UI.ok }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>{isArabic ? 'مهام مكتملة' : 'Done tasks'}</div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>{stats.done}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: UI.warn }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>{isArabic ? 'مهام متبقية' : 'Pending tasks'}</div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: UI.err }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>{isArabic ? 'مهام عاجلة' : 'Urgent'}</div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>{stats.urgent}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: UI.info }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>{isArabic ? 'ساعات مخططة' : 'Planned hours'}</div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>{stats.plannedHours}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {weekDays.map((d) => {
          const key = d.toISOString().slice(0, 10)
          const dayLabel = d.toLocaleDateString(isArabic ? 'ar' : undefined, { weekday: 'long' })
          const dateLabel = d.toLocaleDateString(isArabic ? 'ar' : undefined, { year: 'numeric', month: 'short', day: 'numeric' })
          const dayTasks = tasksByDay.map.get(key) || []
          return (
            <div key={key} className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: UI.bdr }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-extrabold" style={{ color: UI.p }}>{dayLabel}</div>
                  <div className="text-xs" style={{ color: UI.muted }}>{dateLabel}</div>
                </div>
                <button type="button" className="px-3 py-1.5 rounded-md border text-xs font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }} onClick={openCreate}>
                  + {isArabic ? 'مهمة' : 'Task'}
                </button>
              </div>

              {dayTasks.length === 0 ? (
                <div className="text-sm" style={{ color: UI.muted }}>{isArabic ? 'لا توجد مهام لهذا اليوم.' : 'No tasks for this day.'}</div>
              ) : (
                <div className="space-y-2">
                  {dayTasks.map((row) => {
                    const done = row.status === 'done'
                    return (
                      <div key={row.id} className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: UI.bdr, backgroundColor: done ? UI.okBg : UI.bg }}>
                        <input type="checkbox" checked={done} onChange={() => toggleDone(row)} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm" style={{ color: done ? UI.ok : UI.txt }}>
                            {row.title}
                            {row.course_code ? <span className="text-xs font-bold" style={{ color: UI.muted }}> — {row.course_code}</span> : null}
                          </div>
                          {row.description && <div className="text-xs mt-1" style={{ color: UI.muted }}>{row.description}</div>}
                        </div>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openEdit(row)} className="px-2 py-1 rounded-md border text-xs font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.sur }}>
                            {isArabic ? 'تعديل' : 'Edit'}
                          </button>
                          <button type="button" onClick={() => deleteTask(row)} className="px-2 py-1 rounded-md border text-xs font-extrabold" style={{ borderColor: '#fecaca', backgroundColor: UI.errBg, color: UI.err }}>
                            {isArabic ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {tasksByDay.undated.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: UI.bdr }}>
          <div className="font-extrabold mb-3" style={{ color: UI.p }}>
            {isArabic ? 'مهام بدون تاريخ' : 'Undated tasks'}
          </div>
          <div className="space-y-2">
            {tasksByDay.undated.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }}>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm" style={{ color: UI.txt }}>{row.title}</div>
                  {row.course_code && <div className="text-xs" style={{ color: UI.muted }}>{row.course_code}</div>}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(row)} className="px-2 py-1 rounded-md border text-xs font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.sur }}>
                    {isArabic ? 'تعديل' : 'Edit'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="text-lg font-extrabold" style={{ color: UI.p }}>
                {form.id ? (isArabic ? 'تعديل المهمة' : 'Edit task') : isArabic ? 'إضافة مهمة' : 'Add task'}
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-slate-100">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold mb-1">{isArabic ? 'عنوان المهمة' : 'Task title'}</label>
                <input className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: UI.bdr }} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">{isArabic ? 'الوصف' : 'Description'}</label>
                <textarea className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: UI.bdr }} rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">{isArabic ? 'المقرر (اختياري)' : 'Course (optional)'}</label>
                  <input className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: UI.bdr }} value={form.course_code} onChange={(e) => setForm((p) => ({ ...p, course_code: e.target.value }))} placeholder="CS201" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">{isArabic ? 'التاريخ والوقت' : 'Date & time'}</label>
                  <input className="w-full px-3 py-2 rounded-lg border" style={{ borderColor: UI.bdr }} type="datetime-local" value={form.due_at} onChange={(e) => setForm((p) => ({ ...p, due_at: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }}>
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" onClick={saveTask} disabled={saving} className="px-4 py-2 rounded-lg font-extrabold text-white disabled:opacity-60" style={{ backgroundColor: UI.p }}>
                {saving ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : isArabic ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

