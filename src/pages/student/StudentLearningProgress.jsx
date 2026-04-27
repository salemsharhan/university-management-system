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
  info: '#1d4ed8',
  infoBg: '#dbeafe',
  teams: '#6264a7',
  teamsBg: '#e8e8f5',
}

function pct(num, den) {
  const d = Number(den) || 0
  if (d <= 0) return 0
  const n = Number(num) || 0
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)))
}

function gradeLabel(gpa) {
  const v = Number(gpa)
  if (!Number.isFinite(v)) return null
  if (v >= 3.5) return { ar: 'ممتاز', en: 'Excellent', color: UI.ok }
  if (v >= 3.0) return { ar: 'جيد جداً', en: 'Very good', color: UI.info }
  if (v >= 2.5) return { ar: 'جيد', en: 'Good', color: UI.warn }
  return { ar: 'بحاجة لتحسين', en: 'Needs improvement', color: UI.err }
}

export default function StudentLearningProgress() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isRTL, language } = useLanguage()
  const isArabic = isRTL || language === 'ar'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [lessons, setLessons] = useState([])
  const [progressRows, setProgressRows] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.email) return
      setLoading(true)
      setError('')
      try {
        const { data: st, error: stErr } = await supabase
          .from('students')
          .select('id, student_id, gpa')
          .eq('email', user.email)
          .eq('status', 'active')
          .single()
        if (stErr) throw stErr
        if (cancelled) return
        setStudent(st)

        const { data: enr, error: eErr } = await supabase
          .from('enrollments')
          .select(
            `class_id, status, classes(
              id, code, section,
              subjects(id, code, name_en, name_ar, credit_hours)
            )`,
          )
          .eq('student_id', st.id)
          .eq('status', 'enrolled')
        if (eErr) throw eErr
        const cls = (enr || []).map((r) => r.classes).filter(Boolean)
        if (cancelled) return
        setEnrollments(cls)

        const classIds = cls.map((c) => c.id)
        if (!classIds.length) {
          setLessons([])
          setProgressRows([])
          return
        }

        const { data: lRows, error: lErr } = await supabase
          .from('class_lessons')
          .select('id, class_id, estimated_minutes, updated_at')
          .in('class_id', classIds)
        if (lErr) throw lErr
        if (cancelled) return
        setLessons(lRows || [])

        const lessonIds = (lRows || []).map((x) => x.id)
        if (!lessonIds.length) {
          setProgressRows([])
          return
        }

        const { data: pRows, error: pErr } = await supabase
          .from('class_lesson_progress')
          .select('lesson_id, status, progress_percent, last_activity_at, completed_at')
          .eq('student_id', st.id)
          .in('lesson_id', lessonIds)
        if (pErr) throw pErr
        if (!cancelled) setProgressRows(pRows || [])
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load progress')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.email])

  const computed = useMemo(() => {
    const lessonById = new Map((lessons || []).map((l) => [String(l.id), l]))
    const pByLesson = new Map((progressRows || []).map((p) => [String(p.lesson_id), p]))

    const byClass = new Map()
    for (const l of lessons || []) {
      const k = String(l.class_id)
      if (!byClass.has(k)) byClass.set(k, [])
      byClass.get(k).push(l)
    }

    const courseProgress = (cls) => {
      const ls = byClass.get(String(cls.id)) || []
      const totalLessons = ls.length
      const completedLessons = ls.filter((l) => String(pByLesson.get(String(l.id))?.status || '') === 'completed').length
      const totalMinutes = ls.reduce((s, l) => s + (Number(l.estimated_minutes) || 0), 0)
      const watchedMinutes = ls.reduce((s, l) => {
        const pr = pByLesson.get(String(l.id))
        const est = Number(l.estimated_minutes) || 0
        const p = Number(pr?.progress_percent) || 0
        return s + (est * p) / 100
      }, 0)
      const progressPct = totalMinutes ? Math.round((watchedMinutes / totalMinutes) * 100) : pct(completedLessons, totalLessons)

      const lastActivityTs = ls
        .map((l) => pByLesson.get(String(l.id))?.last_activity_at || pByLesson.get(String(l.id))?.completed_at || null)
        .filter(Boolean)
        .map((d) => new Date(d).getTime())
        .sort((a, b) => b - a)[0]

      return {
        totalLessons,
        completedLessons,
        progressPct,
        lastActivityTs: lastActivityTs || null,
      }
    }

    const courses = (enrollments || []).map((c) => ({ cls: c, pr: courseProgress(c) }))

    const allLessons = lessons?.length || 0
    const doneLessons = (lessons || []).filter((l) => String(pByLesson.get(String(l.id))?.status || '') === 'completed').length
    const totalMin = (lessons || []).reduce((s, l) => s + (Number(l.estimated_minutes) || 0), 0)
    const watchedMin = (lessons || []).reduce((s, l) => {
      const pr = pByLesson.get(String(l.id))
      const est = Number(l.estimated_minutes) || 0
      const p = Number(pr?.progress_percent) || 0
      return s + (est * p) / 100
    }, 0)

    return {
      courses,
      doneLessons,
      allLessons,
      overallPct: totalMin ? Math.round((watchedMin / totalMin) * 100) : pct(doneLessons, allLessons),
    }
  }, [lessons, progressRows, enrollments])

  const gLabel = useMemo(() => gradeLabel(student?.gpa), [student?.gpa])

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
        <span className="text-slate-700 font-semibold">{isArabic ? 'تقدمي الدراسي' : 'Learning progress'}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: UI.p }}>
            {isArabic ? 'تقدمي الدراسي' : 'Learning progress'}
          </h1>
          <p className="text-sm" style={{ color: UI.muted }}>
            {isArabic ? 'تحليل شامل لأدائك وتقدمك في جميع المقررات.' : 'A clear view of your progress across enrolled courses.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: UI.ok }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {isArabic ? 'المعدل التراكمي' : 'Cumulative GPA'}
          </div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>
            {Number.isFinite(Number(student?.gpa)) ? Number(student?.gpa).toFixed(2) : '—'}
          </div>
          <div className="text-xs font-bold" style={{ color: gLabel?.color || UI.muted }}>
            {gLabel ? (isArabic ? gLabel.ar : gLabel.en) : '—'}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: UI.info }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {isArabic ? 'الدروس المكتملة' : 'Lessons completed'}
          </div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>
            {computed.doneLessons}
          </div>
          <div className="text-xs" style={{ color: UI.muted }}>
            {isArabic ? `من ${computed.allLessons} درساً` : `of ${computed.allLessons} lessons`}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: UI.acc }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {isArabic ? 'نسبة التقدم' : 'Overall progress'}
          </div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>
            {computed.overallPct}%
          </div>
          <div className="h-2 rounded-full overflow-hidden mt-2" style={{ backgroundColor: UI.bdr }}>
            <div className="h-full" style={{ width: `${computed.overallPct}%`, backgroundColor: UI.teams }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: UI.warn }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {isArabic ? 'المقررات' : 'Courses'}
          </div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>
            {computed.courses.length}
          </div>
          <div className="text-xs" style={{ color: UI.muted }}>
            {isArabic ? 'مسجّل بها' : 'enrolled'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
        <div className="font-extrabold mb-4" style={{ color: UI.p }}>
          📊 {isArabic ? 'التقدم في كل مقرر' : 'Progress by course'}
        </div>

        {computed.courses.length === 0 ? (
          <div className="text-sm" style={{ color: UI.muted }}>
            {isArabic ? 'لا توجد مقررات مسجّلة حالياً.' : 'No enrolled courses found.'}
          </div>
        ) : (
          <div className="space-y-5">
            {computed.courses.map(({ cls, pr }) => {
              const code = cls?.subjects?.code || cls?.code || '—'
              const name = isArabic ? cls?.subjects?.name_ar || cls?.subjects?.name_en : cls?.subjects?.name_en || cls?.subjects?.name_ar
              const last = pr.lastActivityTs ? new Date(pr.lastActivityTs).toLocaleDateString(isArabic ? 'ar' : undefined) : '—'
              return (
                <div key={cls.id}>
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-extrabold" style={{ color: UI.txt }}>
                        {code} — {name || '—'}
                      </div>
                      <div className="text-xs" style={{ color: UI.muted }}>
                        {isArabic ? `${pr.completedLessons}/${pr.totalLessons} درساً` : `${pr.completedLessons}/${pr.totalLessons} lessons`} ·{' '}
                        {isArabic ? `آخر نشاط: ${last}` : `Last activity: ${last}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold" style={{ color: UI.teams }}>{pr.progressPct}%</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/student/elearning/courseware/${cls.id}`)}
                        className="px-3 py-1.5 rounded-md border text-sm font-extrabold"
                        style={{ borderColor: UI.bdr, backgroundColor: UI.bg }}
                      >
                        {isArabic ? 'فتح المحتوى' : 'Open'}
                      </button>
                    </div>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: UI.bdr }}>
                    <div className="h-full" style={{ width: `${pr.progressPct}%`, backgroundColor: pr.progressPct >= 60 ? UI.ok : pr.progressPct >= 30 ? UI.warn : UI.teams }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

