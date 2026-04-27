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
  purple: '#7c3aed',
  purpleBg: '#ede9fe',
}

function normalizeOptions(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split('\n').map((x) => x.trim()).filter(Boolean)
  return []
}

export default function StudentLessonViewer() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabic = isRTL || language === 'ar'
  const { user } = useAuth()
  const navigate = useNavigate()
  const { classId, lessonId } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  const [cls, setCls] = useState(null)
  const [lessons, setLessons] = useState([])
  const [lesson, setLesson] = useState(null)
  const [elements, setElements] = useState([])
  const [progress, setProgress] = useState(null)
  const [progressMap, setProgressMap] = useState({})
  const [orderState, setOrderState] = useState({})
  const [orderResult, setOrderResult] = useState({})

  useEffect(() => {
    if (!user?.email || !classId) return
    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const { data: st, error: stErr } = await supabase
          .from('students')
          .select('id, student_id, name_en, name_ar, email')
          .eq('email', user.email)
          .eq('status', 'active')
          .single()
        if (stErr) throw stErr
        setStudent(st)

        const { data: enroll, error: eErr } = await supabase
          .from('enrollments')
          .select(
            `
            id,
            class_id,
            status,
            classes(
              id,
              code,
              section,
              subject_id,
              instructors(name_en, name_ar),
              subjects(id, code, name_en, name_ar)
            )
          `,
          )
          .eq('student_id', st.id)
          .eq('class_id', Number(classId))
          .eq('status', 'enrolled')
          .single()
        if (eErr) throw eErr
        setCls(enroll?.classes || null)

        const { data: lRows, error: lErr } = await supabase
          .from('class_lessons')
          .select('id, class_id, title, title_ar, unit_number, lesson_number, estimated_minutes, summary, prerequisite_lesson_id')
          .eq('class_id', Number(classId))
          .order('unit_number', { ascending: true })
          .order('lesson_number', { ascending: true })
        if (lErr) throw lErr
        setLessons(lRows || [])

        const lessonIds = (lRows || []).map((x) => x.id)
        if (lessonIds.length) {
          const { data: prog, error: pErr } = await supabase
            .from('class_lesson_progress')
            .select('lesson_id, status, progress_percent, last_activity_at, completed_at')
            .eq('student_id', st.id)
            .in('lesson_id', lessonIds)
          if (pErr) throw pErr
          const map = {}
          ;(prog || []).forEach((r) => {
            map[String(r.lesson_id)] = r
          })
          setProgressMap(map)
        } else {
          setProgressMap({})
        }

        const first = (lRows || [])[0]?.id || null
        const selected = lessonId ? Number(lessonId) : first
        if (selected) {
          navigate(`/student/elearning/courseware/${classId}/lesson/${selected}`, { replace: true })
        }
      } catch (e) {
        console.error('StudentLessonViewer load error:', e)
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.email, classId])

  useEffect(() => {
    if (!student?.id || !lessonId) return
    const loadLesson = async () => {
      try {
        setLoading(true)
        setError('')

        const lid = Number(lessonId)
        const { data: l, error: lErr } = await supabase
          .from('class_lessons')
          .select('id, class_id, title, title_ar, unit_number, lesson_number, estimated_minutes, summary, prerequisite_lesson_id')
          .eq('id', lid)
          .single()
        if (lErr) throw lErr
        setLesson(l)

        const { data: el, error: elErr } = await supabase
          .from('class_lesson_elements')
          .select('id, element_type, title, content, display_order')
          .eq('lesson_id', lid)
          .order('display_order', { ascending: true })
        if (elErr) throw elErr
        setElements(el || [])

        const { data: p, error: pErr } = await supabase
          .from('class_lesson_progress')
          .select('id, status, progress_percent, started_at, completed_at, last_activity_at')
          .eq('lesson_id', lid)
          .eq('student_id', student.id)
          .maybeSingle()
        if (pErr) throw pErr
        setProgress(p || null)

        // Ensure started marker
        if (!p) {
          const startedIso = new Date().toISOString()
          const { data: created, error: insErr } = await supabase
            .from('class_lesson_progress')
            .insert({
            lesson_id: lid,
            student_id: student.id,
            class_id: Number(classId),
            status: 'in_progress',
            progress_percent: 1,
              started_at: startedIso,
              last_activity_at: startedIso,
            })
            .select('id, status, progress_percent, started_at, completed_at, last_activity_at')
            .single()
          if (insErr) throw insErr
          setProgress(created || null)
          setProgressMap((m) => ({ ...(m || {}), [String(lid)]: { ...(m?.[String(lid)] || {}), ...(created || {}), lesson_id: lid } }))
        } else if (String(p.status) === 'not_started') {
          const { data: updated, error: upErr } = await supabase
            .from('class_lesson_progress')
            .update({
              status: 'in_progress',
              started_at: p.started_at || new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            })
            .eq('id', p.id)
            .select('id, status, progress_percent, started_at, completed_at, last_activity_at')
            .single()
          if (upErr) throw upErr
          setProgress(updated || p)
          setProgressMap((m) => ({ ...(m || {}), [String(lid)]: { ...(m?.[String(lid)] || {}), ...(updated || {}), lesson_id: lid } }))
        }
      } catch (e) {
        console.error('StudentLessonViewer loadLesson error:', e)
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    loadLesson()
  }, [student?.id, lessonId])

  const lessonTitle = useMemo(() => {
    return (isArabic ? lesson?.title_ar : lesson?.title) || lesson?.title_ar || lesson?.title || '—'
  }, [lesson, isArabic])

  const canOpenLesson = (l) => {
    if (!l?.prerequisite_lesson_id) return true
    const st = progressMap[String(l.prerequisite_lesson_id)]?.status
    return String(st) === 'completed'
  }

  const grouped = useMemo(() => {
    const map = new Map()
    ;(lessons || []).forEach((l) => {
      const k = Number(l.unit_number || 1)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(l)
    })
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [lessons])

  const courseCode = cls?.subjects?.code || cls?.code || '—'
  const courseName = getLocalizedName(cls?.subjects, isArabic) || '—'

  const markComplete = async () => {
    if (!student?.id || !lesson?.id) return
    try {
      const nowIso = new Date().toISOString()
      const upsertRow = {
        lesson_id: lesson.id,
        student_id: student.id,
        class_id: Number(classId),
        status: 'completed',
        progress_percent: 100,
        started_at: progress?.started_at || nowIso,
        completed_at: nowIso,
        last_activity_at: nowIso,
      }

      const { data: saved, error: saveErr } = await supabase
        .from('class_lesson_progress')
        .upsert(upsertRow, { onConflict: 'lesson_id,student_id' })
        .select('id, lesson_id, status, progress_percent, started_at, completed_at, last_activity_at')
        .single()
      if (saveErr) throw saveErr

      setProgress(saved || null)
      setProgressMap((m) => ({ ...(m || {}), [String(lesson.id)]: { ...(m?.[String(lesson.id)] || {}), ...(saved || {}), lesson_id: lesson.id } }))

      // go next
      const idx = lessons.findIndex((x) => x.id === lesson.id)
      const next = idx >= 0 ? lessons[idx + 1] : null
      if (next) navigate(`/student/elearning/courseware/${classId}/lesson/${next.id}`)
    } catch (e) {
      console.error('markComplete error:', e)
      setError(e?.message || String(e))
    }
  }

  if (loading && !cls) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <nav className="flex flex-wrap items-center gap-2 text-sm" style={{ color: UI.muted }}>
        <Link to="/dashboard" className="hover:underline" style={{ color: UI.muted }}>{t('studentPortal.dashboard', 'Dashboard')}</Link>
        <span style={{ color: UI.bdr }}>›</span>
        <Link to="/student/elearning/courseware" className="hover:underline" style={{ color: UI.muted }}>{t('studentPortal.elearning.courseware', 'Courseware')}</Link>
        <span style={{ color: UI.bdr }}>›</span>
        <span className="font-semibold" style={{ color: UI.p }}>{courseCode}</span>
      </nav>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', backgroundColor: UI.errBg, color: UI.err }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-0 rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: UI.bdr }}>
        {/* TOC */}
        <div className="bg-[#f4f6fb] border-l overflow-y-auto" style={{ borderColor: UI.bdr }}>
          <div className="px-4 py-4 font-extrabold text-sm text-white" style={{ backgroundColor: UI.p }}>
            📋 {courseCode} — {t('studentPortal.elearning.tableOfContents', 'Table of contents')}
          </div>
          {grouped.map(([unitNum, unitLessons]) => {
            const doneCount = unitLessons.filter((l) => String(progressMap[String(l.id)]?.status || '') === 'completed').length
            return (
              <div key={unitNum} className="border-b" style={{ borderColor: UI.bdr }}>
                <div className="px-4 py-3 bg-white font-extrabold text-sm" style={{ color: UI.p }}>
                  {t('studentPortal.elearning.unit', { defaultValue: 'Unit {{n}}', n: unitNum })}{' '}
                  <span className="text-xs" style={{ color: UI.muted }}>
                    {doneCount}/{unitLessons.length}
                  </span>
                </div>
                {unitLessons.map((l) => {
                  const active = Number(lessonId) === l.id
                  const locked = !canOpenLesson(l)
                  const done = String(progressMap[String(l.id)]?.status || '') === 'completed'
                  const title = (isArabic ? l.title_ar : l.title) || l.title_ar || l.title
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={`w-full text-right px-4 py-2.5 border-t text-sm flex items-center gap-2 ${
                        active ? 'font-extrabold' : 'font-semibold'
                      }`}
                      style={{
                        borderColor: UI.bdr,
                        backgroundColor: active ? UI.infoBg : 'transparent',
                        color: active ? UI.info : UI.muted,
                        opacity: locked ? 0.6 : 1,
                      }}
                      onClick={() => {
                        if (!locked) navigate(`/student/elearning/courseware/${classId}/lesson/${l.id}`)
                      }}
                    >
                      <span className="text-base">{active ? '▶' : locked ? '🔒' : done ? '✅' : '•'}</span>
                      <span className="flex-1">{title}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Main */}
        <div className="bg-white p-7 overflow-y-auto">
          <div className="mb-5">
            <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: UI.pl }}>
              {courseCode} — {t('studentPortal.elearning.unitLessonLabel', { defaultValue: 'Unit {{u}} — Lesson {{l}}', u: lesson?.unit_number || 1, l: lesson?.lesson_number || 1 })}
            </div>
            <h2 className="text-2xl font-extrabold" style={{ color: UI.p }}>{lessonTitle}</h2>
            <div className="mt-1 flex flex-wrap gap-3 text-sm" style={{ color: UI.muted }}>
              <span>⏱️ {lesson?.estimated_minutes || 0} {t('studentPortal.elearning.minutes', 'minutes')}</span>
              <span>📚 {courseName}</span>
            </div>
          </div>

          {lesson?.summary && (
            <div className="text-sm mb-5" style={{ color: UI.txt }}>
              {lesson.summary}
            </div>
          )}

          {/* Elements */}
          <div className="space-y-4">
            {elements.map((el) => {
              const c = el.content || {}
              if (el.element_type === 'heading') {
                const level = Number(c.level || 3)
                const text = c.text || el.title || '—'
                const style = level === 2 ? 'text-xl' : level === 4 ? 'text-base' : 'text-lg'
                return (
                  <div key={el.id} className="pt-2">
                    <div className={`${style} font-extrabold`} style={{ color: UI.p }}>
                      {text}
                    </div>
                  </div>
                )
              }

              if (el.element_type === 'paragraph' || el.element_type === 'discussion') {
                return (
                  <div key={el.id} className="rounded-xl border p-5" style={{ borderColor: UI.bdr }}>
                    {el.title && (
                      <div className="text-base font-extrabold mb-2" style={{ color: UI.txt }}>
                        {el.title}
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap" style={{ color: UI.txt }}>
                      {c.text || ''}
                    </div>
                  </div>
                )
              }

              if (el.element_type === 'code') {
                return (
                  <div key={el.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1e2a3a' }}>
                    <div className="px-5 py-4" style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 13, direction: 'ltr', textAlign: 'left' }}>
                      {c.caption && <div style={{ color: '#64b5f6', marginBottom: 8, fontWeight: 700 }}>{c.caption}</div>}
                      <pre style={{ margin: 0, whiteSpace: 'pre', overflowX: 'auto' }}>
                        <code>{c.code || ''}</code>
                      </pre>
                    </div>
                  </div>
                )
              }

              if (el.element_type === 'table') {
                const headers = Array.isArray(c.headers) ? c.headers : []
                const rows = Array.isArray(c.rows) ? c.rows : []
                return (
                  <div key={el.id} className="rounded-xl border overflow-x-auto" style={{ borderColor: UI.bdr }}>
                    <table className="min-w-[720px] w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: UI.p, color: '#fff' }}>
                          {headers.map((h, i) => (
                            <th key={i} className="px-4 py-3 font-extrabold text-right whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, ri) => (
                          <tr key={ri} className="border-b last:border-b-0" style={{ borderColor: UI.bdr }}>
                            {(Array.isArray(r) ? r : []).map((cell, ci) => (
                              <td key={ci} className="px-4 py-3 whitespace-nowrap">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }

              if (el.element_type === 'interactive_order') {
                const items = Array.isArray(c.items) ? c.items : []
                const correct = Array.isArray(c.correct_order) ? c.correct_order : items.map((_, i) => i)
                const stateKey = String(el.id)
                const current = orderState[stateKey] || (() => {
                  const base = items.map((txt, idx) => ({ idx, txt }))
                  if (c.shuffle) base.sort(() => Math.random() - 0.5)
                  return base
                })()

                const setCurrent = (next) => setOrderState((m) => ({ ...(m || {}), [stateKey]: next }))
                const move = (from, dir) => {
                  const to = from + dir
                  if (to < 0 || to >= current.length) return
                  const copy = [...current]
                  const [it] = copy.splice(from, 1)
                  copy.splice(to, 0, it)
                  setCurrent(copy)
                }
                const check = () => {
                  const ok = current.map((x) => x.idx).join(',') === correct.join(',')
                  setOrderResult((m) => ({ ...(m || {}), [stateKey]: ok }))
                }

                return (
                  <div key={el.id} className="rounded-xl border p-5" style={{ borderColor: UI.info, background: UI.infoBg }}>
                    <div className="text-base font-extrabold mb-2" style={{ color: UI.info }}>
                      🎯 {el.title || t('studentPortal.elearning.interactiveExercise', 'Interactive exercise')}
                    </div>
                    {c.prompt && (
                      <div className="text-sm mb-3" style={{ color: UI.info }}>
                        {c.prompt}
                      </div>
                    )}
                    <div className="space-y-2">
                      {current.map((it, i) => (
                        <div key={it.idx} className="bg-white rounded-md border px-3 py-2 flex items-center gap-3" style={{ borderColor: UI.info }}>
                          <span style={{ color: UI.muted }}>⠿</span>
                          <div className="flex-1 text-sm font-semibold" style={{ color: UI.txt }}>
                            {it.txt}
                          </div>
                          <div className="flex gap-1">
                            <button type="button" className="px-2 py-1 rounded border text-xs" style={{ borderColor: UI.bdr }} onClick={() => move(i, -1)}>
                              ↑
                            </button>
                            <button type="button" className="px-2 py-1 rounded border text-xs" style={{ borderColor: UI.bdr }} onClick={() => move(i, 1)}>
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button type="button" className="px-4 py-2 rounded-md font-extrabold text-white" style={{ backgroundColor: UI.p }} onClick={check}>
                        ✅ {t('studentPortal.elearning.checkAnswer', 'Check answer')}
                      </button>
                      {orderResult[stateKey] === true && (
                        <span className="text-sm font-extrabold" style={{ color: UI.ok }}>
                          {t('studentPortal.elearning.correct', 'Correct')}
                        </span>
                      )}
                      {orderResult[stateKey] === false && (
                        <span className="text-sm font-extrabold" style={{ color: UI.err }}>
                          {t('studentPortal.elearning.tryAgain', 'Try again')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              }
              if (el.element_type === 'video') {
                const url = c.url || ''
                return (
                  <div key={el.id} className="rounded-xl border p-5" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }}>
                    <div className="text-base font-extrabold mb-2" style={{ color: UI.txt }}>
                      {el.title || t('studentPortal.elearning.video', 'Video')}
                    </div>
                    {c.caption && (
                      <div className="text-sm mb-3" style={{ color: UI.muted }}>
                        {c.caption}
                      </div>
                    )}
                    <a className="px-4 py-2 rounded-md font-extrabold text-white inline-flex" style={{ backgroundColor: UI.p }} href={url || '#'} target="_blank" rel="noreferrer">
                      ▶ {t('studentPortal.elearning.openVideo', 'Open video')}
                    </a>
                  </div>
                )
              }
              if (el.element_type === 'attachment') {
                const href = c.file_url || ''
                return (
                  <div key={el.id} className="rounded-xl border p-5" style={{ borderColor: UI.purple, backgroundColor: UI.purpleBg }}>
                    <div className="text-base font-extrabold mb-2" style={{ color: UI.purple }}>
                      {el.title || t('studentPortal.elearning.attachment', 'Attachment')}
                    </div>
                    <a className="px-4 py-2 rounded-md font-extrabold text-white inline-flex" style={{ backgroundColor: UI.pl }} href={href || '#'} target="_blank" rel="noreferrer">
                      📥 {t('studentPortal.elearning.download', 'Download')}
                    </a>
                  </div>
                )
              }
              if (el.element_type === 'quiz' || el.element_type === 'poll') {
                const options = normalizeOptions(c.options)
                return (
                  <div key={el.id} className="rounded-xl border p-5" style={{ borderColor: UI.bdr, backgroundColor: el.element_type === 'quiz' ? UI.infoBg : UI.warnBg }}>
                    <div className="text-base font-extrabold mb-3" style={{ color: UI.txt }}>
                      {el.title || el.element_type}
                    </div>
                    <div className="text-sm font-semibold mb-3" style={{ color: UI.txt }}>
                      {c.question || ''}
                    </div>
                    <div className="space-y-2">
                      {options.map((opt, idx) => (
                        <label key={idx} className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`opt-${el.id}`} />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              }
              return null
            })}
            {elements.length === 0 && (
              <div className="text-sm" style={{ color: UI.muted }}>
                {t('common.noData', 'No data found')}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t" style={{ borderColor: UI.bdr }}>
            <button
              type="button"
              className="px-4 py-2 rounded-md border text-sm font-semibold"
              style={{ borderColor: UI.bdr, backgroundColor: UI.bg, color: UI.txt }}
              onClick={() => {
                const idx = lessons.findIndex((x) => x.id === lesson?.id)
                const prev = idx > 0 ? lessons[idx - 1] : null
                if (prev) navigate(`/student/elearning/courseware/${classId}/lesson/${prev.id}`)
              }}
            >
              ← {t('studentPortal.elearning.prevLesson', 'Previous lesson')}
            </button>
            <button
              type="button"
              className="px-6 py-2.5 rounded-md font-extrabold text-white"
              style={{ backgroundColor: UI.ok }}
              onClick={markComplete}
            >
              ✅ {t('studentPortal.elearning.markComplete', 'Mark complete and continue')}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md border text-sm font-semibold"
              style={{ borderColor: UI.p, color: UI.p, backgroundColor: 'transparent' }}
              onClick={() => {
                const idx = lessons.findIndex((x) => x.id === lesson?.id)
                const next = idx >= 0 ? lessons[idx + 1] : null
                if (next) navigate(`/student/elearning/courseware/${classId}/lesson/${next.id}`)
              }}
            >
              {t('studentPortal.elearning.nextLesson', 'Next lesson')} →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

