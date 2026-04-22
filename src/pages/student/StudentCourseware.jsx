import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  info: '#1d4ed8',
  infoBg: '#dbeafe',
  purple: '#7c3aed',
  purpleBg: '#ede9fe',
  teams: '#6264a7',
  teamsBg: '#e8e8f5',
}

function pct(num, den) {
  const d = Number(den) || 0
  if (d <= 0) return 0
  const n = Number(num) || 0
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)))
}

export default function StudentCourseware() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabic = isRTL || language === 'ar'
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  const [classes, setClasses] = useState([])
  const [lessonsByClass, setLessonsByClass] = useState({})
  const [progressByLessonId, setProgressByLessonId] = useState({})

  useEffect(() => {
    if (!user?.email) return
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

        const { data: enrolls, error: eErr } = await supabase
          .from('enrollments')
          .select(
            `
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
          .eq('status', 'enrolled')
        if (eErr) throw eErr
        const cls = (enrolls || []).map((e) => e.classes).filter(Boolean)
        setClasses(cls)

        const classIds = cls.map((c) => c.id)
        if (!classIds.length) {
          setLessonsByClass({})
          setProgressByLessonId({})
          return
        }

        // Published lessons (visible to student via RLS)
        const { data: lessons, error: lErr } = await supabase
          .from('class_lessons')
          .select('id, class_id, title, title_ar, unit_number, lesson_number, estimated_minutes, updated_at, prerequisite_lesson_id')
          .in('class_id', classIds)
          .order('unit_number', { ascending: true })
          .order('lesson_number', { ascending: true })
        if (lErr) throw lErr

        const byClass = {}
        ;(lessons || []).forEach((l) => {
          const k = String(l.class_id)
          if (!byClass[k]) byClass[k] = []
          byClass[k].push(l)
        })
        setLessonsByClass(byClass)

        const lessonIds = (lessons || []).map((l) => l.id)
        if (!lessonIds.length) {
          setProgressByLessonId({})
          return
        }

        const { data: prog, error: pErr } = await supabase
          .from('class_lesson_progress')
          .select('lesson_id, status, progress_percent, last_activity_at, completed_at')
          .eq('student_id', st.id)
          .in('lesson_id', lessonIds)
        if (pErr) throw pErr
        const pMap = {}
        ;(prog || []).forEach((r) => {
          pMap[String(r.lesson_id)] = r
        })
        setProgressByLessonId(pMap)
      } catch (e) {
        console.error('StudentCourseware load error:', e)
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.email])

  const courseCount = classes.length

  const stats = useMemo(() => {
    const lessons = Object.values(lessonsByClass || {}).flat()
    const totalLessons = lessons.length
    const completed = lessons.filter((l) => String(progressByLessonId[String(l.id)]?.status || '') === 'completed').length

    const watchedMinutes = lessons.reduce((sum, l) => {
      const pctVal = Number(progressByLessonId[String(l.id)]?.progress_percent) || 0
      const mins = Number(l.estimated_minutes) || 0
      return sum + (mins * pctVal) / 100
    }, 0)

    const newContent = lessons.filter((l) => {
      const u = l.updated_at ? new Date(l.updated_at).getTime() : 0
      return u && u >= Date.now() - 7 * 24 * 60 * 60 * 1000
    }).length

    const avgProgress = totalLessons ? Math.round((watchedMinutes / (lessons.reduce((s, l) => s + (Number(l.estimated_minutes) || 0), 0) || 1)) * 100) : 0

    return {
      completed,
      totalLessons,
      watchHours: Math.round((watchedMinutes / 60) * 10) / 10,
      avgProgress,
      newContent,
    }
  }, [lessonsByClass, progressByLessonId])

  const cardTheme = (idx) => {
    const themes = [
      { top: UI.teams, icBg: UI.teamsBg, ic: '💻' },
      { top: UI.ok, icBg: UI.okBg, ic: '📖' },
      { top: UI.acc, icBg: '#fef9ec', ic: '📐' },
      { top: UI.purple, icBg: UI.purpleBg, ic: '💼' },
    ]
    return themes[idx % themes.length]
  }

  const titleFor = (lesson) => (isArabic ? lesson?.title_ar : lesson?.title) || lesson?.title_ar || lesson?.title || '—'

  const computeCourseProgress = (classId) => {
    const lessons = lessonsByClass[String(classId)] || []
    const total = lessons.length
    const done = lessons.filter((l) => String(progressByLessonId[String(l.id)]?.status || '') === 'completed').length
    return { done, total, percent: pct(done, total) }
  }

  const lastLessonText = (classId) => {
    const lessons = lessonsByClass[String(classId)] || []
    const recent = lessons
      .map((l) => ({ l, ts: progressByLessonId[String(l.id)]?.last_activity_at || progressByLessonId[String(l.id)]?.completed_at || null }))
      .filter((x) => x.ts)
      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))[0]
    if (!recent) return '—'
    return titleFor(recent.l)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <nav className="flex flex-wrap items-center gap-2 text-sm" style={{ color: UI.muted }}>
        <Link to="/dashboard" className="hover:underline" style={{ color: UI.muted }}>
          {t('studentPortal.dashboard', 'Dashboard')}
        </Link>
        <span style={{ color: UI.bdr }}>›</span>
        <span className="font-semibold" style={{ color: UI.p }}>
          {t('studentPortal.elearning.courseware', 'Courseware')}
        </span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: UI.p }}>
            {t('studentPortal.elearning.courseware', 'Courseware')}
          </h1>
          <p className="text-sm" style={{ color: UI.muted }}>
            {t('studentPortal.elearning.coursewareSubtitle', {
              defaultValue: 'Current semester — {{count}} enrolled courses',
              count: courseCount,
            })}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm px-5 py-4" style={{ borderColor: UI.bdr, borderTop: `3px solid ${UI.ok}` }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {t('studentPortal.elearning.completedLessons', 'Completed lessons')}
          </div>
          <div className="text-3xl font-extrabold" style={{ color: UI.p }}>{stats.completed}</div>
          <div className="text-xs" style={{ color: UI.muted }}>
            {t('studentPortal.elearning.outOfLessons', { defaultValue: 'Out of {{total}} lessons', total: stats.totalLessons })}
          </div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm px-5 py-4" style={{ borderColor: UI.bdr, borderTop: `3px solid ${UI.info}` }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {t('studentPortal.elearning.watchHours', 'Watch hours')}
          </div>
          <div className="text-3xl font-extrabold" style={{ color: UI.p }}>{stats.watchHours}</div>
          <div className="text-xs" style={{ color: UI.muted }}>{t('studentPortal.elearning.thisWeek', 'This week')}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm px-5 py-4" style={{ borderColor: UI.bdr, borderTop: `3px solid ${UI.acc}` }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {t('studentPortal.elearning.avgProgress', 'Average progress')}
          </div>
          <div className="text-3xl font-extrabold" style={{ color: UI.p }}>{stats.avgProgress}%</div>
          <div className="text-xs" style={{ color: UI.muted }}>{t('studentPortal.elearning.allCourses', 'All courses')}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm px-5 py-4" style={{ borderColor: UI.bdr, borderTop: `3px solid ${UI.warn}` }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {t('studentPortal.elearning.newContent', 'New content')}
          </div>
          <div className="text-3xl font-extrabold" style={{ color: UI.p }}>{stats.newContent}</div>
          <div className="text-xs" style={{ color: UI.muted }}>{t('studentPortal.elearning.addedThisWeek', 'Added this week')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(classes || []).map((cls, idx) => {
          const theme = cardTheme(idx)
          const pr = computeCourseProgress(cls.id)
          const last = lastLessonText(cls.id)
          const instructor = getLocalizedName(cls.instructors, isArabic) || '—'
          const subjectName = getLocalizedName(cls.subjects, isArabic) || '—'
          return (
            <div key={cls.id} className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr, borderTop: `4px solid ${theme.top}` }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: theme.icBg }}>
                  {theme.ic}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: theme.top }}>
                    {cls.subjects?.code || cls.code || '—'}
                  </div>
                  <div className="text-base font-extrabold" style={{ color: UI.txt }}>{subjectName}</div>
                  <div className="text-xs" style={{ color: UI.muted }}>
                    {instructor} — {t('studentPortal.elearning.unitsLessons', { defaultValue: '{{units}} units — {{lessons}} lessons', units: new Set((lessonsByClass[String(cls.id)] || []).map((l) => l.unit_number)).size, lessons: pr.total })}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: UI.muted }}>{t('studentPortal.elearning.progress', 'Progress')}</span>
                  <strong>{pr.percent}% ({pr.done}/{pr.total})</strong>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: UI.bdr }}>
                  <div className="h-full" style={{ width: `${pr.percent}%`, backgroundColor: theme.top }} />
                </div>
              </div>

              <div className="text-sm mb-4" style={{ color: UI.muted }}>
                📍 {t('studentPortal.elearning.lastLesson', 'Last lesson')}: {last}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate(`/student/elearning/courseware/${cls.id}`)}
                  className="px-4 py-2 rounded-md font-extrabold text-white"
                  style={{ backgroundColor: UI.p, flex: 1 }}
                >
                  ▶ {t('studentPortal.elearning.continueLearning', 'Continue learning')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/student/elearning/courseware/${cls.id}`)}
                  className="px-3 py-2 rounded-md border text-sm font-semibold"
                  style={{ borderColor: UI.bdr, backgroundColor: UI.bg, color: UI.txt }}
                >
                  📋 {t('studentPortal.elearning.tableOfContents', 'Table of contents')}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

