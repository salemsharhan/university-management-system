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
  teams: '#6264a7',
  teamsBg: '#e8e8f5',
}

export default function StudentSessionLobby() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabic = isRTL || language === 'ar'
  const { user } = useAuth()
  const navigate = useNavigate()
  const { classScheduleId, sessionDate } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  const [session, setSession] = useState(null)
  const [materials, setMaterials] = useState([])
  const [joinUrl, setJoinUrl] = useState('')

  useEffect(() => {
    if (!user?.email || !classScheduleId || !sessionDate) return
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

        const { data: sc, error: scErr } = await supabase
          .from('class_schedules')
          .select(
            `
            id,
            class_id,
            day_of_week,
            start_time,
            end_time,
            location,
            teams_meeting_url,
            classes(
              id,
              code,
              semester_id,
              room,
              building,
              instructors(name_en, name_ar),
              subjects(id, code, name_en, name_ar)
            )
          `,
          )
          .eq('id', Number(classScheduleId))
          .single()
        if (scErr) throw scErr

        setSession({
          ...sc,
          session_date: sessionDate,
        })

        // Prefer one-time meeting created by instructor for this class/date; fallback to recurring link on schedule.
        const { data: mtg, error: mtgErr } = await supabase
          .from('class_teams_meetings')
          .select('id, teams_join_url, meeting_date')
          .eq('class_id', sc.class_id)
          .eq('is_active', true)
          .gte('meeting_date', `${sessionDate}T00:00:00.000Z`)
          .lt('meeting_date', `${sessionDate}T23:59:59.999Z`)
          .order('meeting_date', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (mtgErr) throw mtgErr
        setJoinUrl(mtg?.teams_join_url || sc.teams_meeting_url || '')

        const { data: m, error: mErr } = await supabase
          .from('elearning_schedule_materials')
          .select('id, title_en, title_ar, material_type, file_path, external_url, mime_type, file_size, created_at, session_date')
          .eq('class_schedule_id', Number(classScheduleId))
          .or(`session_date.is.null,session_date.eq.${sessionDate}`)
          .order('created_at', { ascending: false })
        if (mErr) throw mErr
        setMaterials(m || [])
      } catch (e) {
        console.error('StudentSessionLobby load error:', e)
        setError(e?.message || String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.email, classScheduleId, sessionDate])

  const title = useMemo(() => {
    const sub = session?.classes?.subjects
    const code = sub?.code || '—'
    const name = getLocalizedName(sub, isArabic) || '—'
    return isArabic ? `جلسة ${code} — ${name}` : `Session ${code} — ${name}`
  }, [session, isArabic])
  const courseLine = useMemo(() => {
    const code = session?.classes?.subjects?.code || session?.classes?.code || '—'
    const name = getLocalizedName(session?.classes?.subjects, isArabic) || '—'
    return `${code} — ${name}`
  }, [session, isArabic])
  const instructor = useMemo(() => getLocalizedName(session?.classes?.instructors, isArabic) || '—', [session, isArabic])

  const joinTeams = async () => {
    if (!student?.id || !session?.id || !sessionDate) return
    try {
      const nowIso = new Date().toISOString()
      await supabase
        .from('elearning_schedule_attendance')
        .upsert(
          { class_schedule_id: session.id, session_date: sessionDate, student_id: student.id, status: 'attended', joined_at: nowIso },
          { onConflict: 'class_schedule_id,session_date,student_id' },
        )
      // Join URL can be stored later (e.g., in materials as a link).
      if (joinUrl) window.open(joinUrl, '_blank', 'noreferrer')
    } catch (e) {
      console.error('joinTeams error:', e)
      setError(e?.message || String(e))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
        <p className="text-amber-800">{t('studentPortal.elearning.sessionNotFound', 'Session not found.')}</p>
        <div className="mt-3">
          <button className="underline" onClick={() => navigate('/student/elearning/sessions')}>{t('common.back', 'Back')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <nav className="flex flex-wrap items-center gap-2 text-sm" style={{ color: UI.muted }}>
        <Link to="/dashboard" className="hover:underline" style={{ color: UI.muted }}>{t('studentPortal.dashboard', 'Dashboard')}</Link>
        <span style={{ color: UI.bdr }}>›</span>
        <Link to="/student/elearning/sessions" className="hover:underline" style={{ color: UI.muted }}>{t('studentPortal.elearning.teamsSessions', 'Teams sessions')}</Link>
        <span style={{ color: UI.bdr }}>›</span>
        <span className="font-semibold" style={{ color: UI.p }}>{t('studentPortal.elearning.lobby', 'Lobby')}</span>
      </nav>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', backgroundColor: UI.errBg, color: UI.err }}>
          {error}
        </div>
      )}

      <div className="rounded-xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${UI.p}, ${UI.pl})` }}>
        <div className="text-6xl mb-3">🎥</div>
        <div className="text-xs font-extrabold uppercase tracking-wider" style={{ color: UI.acc }}>{courseLine}</div>
        <div className="text-2xl font-extrabold mt-2">{title}</div>
        <div className="text-sm opacity-90 mt-2">
          {instructor} &nbsp;|&nbsp; {sessionDate ? new Date(sessionDate).toLocaleDateString(isArabic ? 'ar-SA' : undefined) : '—'}
        </div>
        <div className="mt-5">
          <button
            type="button"
            className="px-8 py-3 rounded-md font-extrabold text-white disabled:opacity-50"
            style={{ backgroundColor: UI.teams }}
            onClick={joinTeams}
            disabled={!joinUrl}
          >
            ⊞ {t('studentPortal.elearning.joinTeams', 'Join via Microsoft Teams')}
          </button>
          <div className="text-xs opacity-70 mt-2">{t('studentPortal.elearning.teamsAutoOpen', 'Teams app or browser will open automatically')}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: UI.bdr }}>
        <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: UI.bdr }}>
          <div className="text-base font-extrabold" style={{ color: UI.p }}>📎 {t('studentPortal.elearning.sessionMaterials', 'Session materials')}</div>
        </div>

        {materials.length === 0 ? (
          <div className="text-sm" style={{ color: UI.muted }}>{t('studentPortal.elearning.noMaterials', 'No materials yet.')}</div>
        ) : (
          <div className="space-y-2">
            {materials.map((m) => {
              const label = (isArabic ? m.title_ar : m.title_en) || m.title_ar || m.title_en || (m.material_type === 'link' ? t('common.link', 'Link') : t('common.file', 'File'))
              const href =
                m.material_type === 'link'
                  ? m.external_url
                  : supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(m.file_path || '').data?.publicUrl
              return (
                <a
                  key={m.id}
                  href={href || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg px-4 py-3 hover:bg-slate-50 border"
                  style={{ borderColor: UI.bdr, color: UI.pl }}
                >
                  <div className="font-extrabold" style={{ color: UI.txt }}>{label}</div>
                  <div className="text-xs" style={{ color: UI.muted }} dir="ltr">
                    {m.created_at ? new Date(m.created_at).toLocaleString(isArabic ? 'ar-SA' : 'en-GB') : ''}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border px-4 py-3 text-sm flex items-start gap-2" style={{ borderColor: '#bfdbfe', backgroundColor: UI.infoBg, color: UI.info }}>
        <span>ℹ️</span>
        <div>
          {t(
            'studentPortal.elearning.attendanceNote',
            'Your attendance will be recorded automatically when joining via Teams. Minimum attendance is 80% of the session duration.',
          )}
        </div>
      </div>
    </div>
  )
}

