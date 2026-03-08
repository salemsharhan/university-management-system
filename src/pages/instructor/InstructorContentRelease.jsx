import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { getLocalizedName } from '../../utils/localizedName'
import { Settings, Calendar, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const PORTAL_BG = '#1a3a6b'

const defaultSettings = {
  default_release_mode: 'scheduled',
  completion_tracking: true,
  show_progress_to_students: true,
}

export default function InstructorContentRelease() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [instructorId, setInstructorId] = useState(null)
  const [settingsId, setSettingsId] = useState(null)
  const [settings, setSettings] = useState(defaultSettings)
  const [schedule, setSchedule] = useState([])
  const [students, setStudents] = useState([])
  const [progressRows, setProgressRows] = useState([])

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  )

  useEffect(() => {
    if (!user?.email) return
    loadInstructorClasses()
  }, [user?.email])

  useEffect(() => {
    if (!selectedClassId || !instructorId) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('classId', String(selectedClassId))
      return next
    })
    loadClassData(selectedClassId, instructorId)
  }, [selectedClassId, instructorId])

  const loadInstructorClasses = async () => {
    setLoading(true)
    try {
      const { data: instructor } = await supabase
        .from('instructors')
        .select('id')
        .eq('email', user.email)
        .eq('status', 'active')
        .single()

      if (!instructor) {
        setLoading(false)
        return
      }

      setInstructorId(instructor.id)

      const { data: cls } = await supabase
        .from('classes')
        .select('id, section, subject_id, subjects(id, code, name_en, name_ar)')
        .eq('instructor_id', instructor.id)
        .eq('status', 'active')
        .order('id', { ascending: false })

      const list = cls || []
      setClasses(list)

      const fromQuery = Number(searchParams.get('classId'))
      const initialClassId = list.find((c) => c.id === fromQuery)?.id || list[0]?.id || null
      setSelectedClassId(initialClassId)

      if (!initialClassId) setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const loadClassData = async (classId, insId) => {
    try {
      const [{ data: settingsData }, { data: lessonData }, { data: enrollmentData }, { data: progressData }] = await Promise.all([
        supabase
          .from('instructor_course_settings')
          .select('id, default_release_mode, completion_tracking, show_progress_to_students')
          .eq('class_id', classId)
          .eq('instructor_id', insId)
          .maybeSingle(),
        supabase
          .from('class_lessons')
          .select('id, title, unit_number, lesson_number, release_mode, release_at, release_condition, status')
          .eq('class_id', classId)
          .order('unit_number', { ascending: true })
          .order('lesson_number', { ascending: true }),
        supabase
          .from('enrollments')
          .select('id, student_id, students(id, name_en, name_ar)')
          .eq('class_id', classId)
          .eq('status', 'enrolled'),
        supabase
          .from('class_lesson_progress')
          .select('lesson_id, student_id, progress_percent, status')
          .eq('class_id', classId),
      ])

      if (settingsData) {
        setSettingsId(settingsData.id)
        setSettings({
          default_release_mode: settingsData.default_release_mode,
          completion_tracking: settingsData.completion_tracking,
          show_progress_to_students: settingsData.show_progress_to_students,
        })
      } else {
        setSettingsId(null)
        setSettings(defaultSettings)
      }

      setSchedule(
        (lessonData || []).map((l) => ({
          ...l,
          release_at_input: l.release_at ? l.release_at.slice(0, 16) : '',
          saving: false,
        }))
      )
      setStudents(enrollmentData || [])
      setProgressRows(progressData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveCourseSettings = async () => {
    if (!selectedClassId || !instructorId) return

    setSavingSettings(true)
    try {
      if (settingsId) {
        await supabase
          .from('instructor_course_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settingsId)
      } else {
        const { data } = await supabase
          .from('instructor_course_settings')
          .insert({
            class_id: selectedClassId,
            instructor_id: instructorId,
            ...settings,
          })
          .select('id')
          .single()
        if (data) setSettingsId(data.id)
      }
    } catch (err) {
      console.error(err)
      alert(t('common.error', 'Error'))
    } finally {
      setSavingSettings(false)
    }
  }

  const updateScheduleField = (lessonId, patch) => {
    setSchedule((prev) => prev.map((row) => (row.id === lessonId ? { ...row, ...patch } : row)))
  }

  const saveLessonSchedule = async (lessonId) => {
    const lesson = schedule.find((x) => x.id === lessonId)
    if (!lesson) return

    updateScheduleField(lessonId, { saving: true })
    try {
      await supabase
        .from('class_lessons')
        .update({
          release_mode: lesson.release_mode,
          release_at: lesson.release_at_input ? new Date(lesson.release_at_input).toISOString() : null,
          release_condition: lesson.release_condition || null,
          status: lesson.status,
          published_at: lesson.status === 'published' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId)

      updateScheduleField(lessonId, { saving: false })
    } catch (err) {
      console.error(err)
      updateScheduleField(lessonId, { saving: false })
      alert(t('common.error', 'Error'))
    }
  }

  const unitNumbers = useMemo(() => {
    const units = [...new Set(schedule.map((l) => l.unit_number))]
    return units.sort((a, b) => a - b)
  }, [schedule])

  const completionTable = useMemo(() => {
    if (!students.length) return []

    const unitLessons = {}
    for (const lesson of schedule) {
      if (!unitLessons[lesson.unit_number]) unitLessons[lesson.unit_number] = []
      unitLessons[lesson.unit_number].push(lesson.id)
    }

    const progressMap = {}
    for (const row of progressRows) {
      progressMap[`${row.student_id}:${row.lesson_id}`] = Number(row.progress_percent || 0)
    }

    return students.map((enrollment) => {
      const studentId = enrollment.student_id
      let totalPct = 0
      let unitCount = 0
      const byUnit = {}

      for (const unit of unitNumbers) {
        const lessonIds = unitLessons[unit] || []
        const sum = lessonIds.reduce((acc, lessonId) => acc + (progressMap[`${studentId}:${lessonId}`] || 0), 0)
        const pct = lessonIds.length ? Math.round(sum / lessonIds.length) : 0
        byUnit[unit] = pct
        totalPct += pct
        unitCount += 1
      }

      return {
        studentId,
        name: getLocalizedName(enrollment.students, language === 'ar'),
        byUnit,
        total: unitCount ? Math.round(totalPct / unitCount) : 0,
      }
    })
  }, [students, progressRows, schedule, language, unitNumbers])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--bdr)', borderTopColor: 'var(--p)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <p className="text-sm text-slate-500">
        {t('instructorPortal.breadcrumbMain')} › {t('instructorPortal.dashboard')} › {t('instructorPortal.contentRelease')}
      </p>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{t('instructorPortal.contentReleaseScheduling', 'Content Release and Scheduling')}</h1>
        <select
          value={selectedClassId || ''}
          onChange={(e) => setSelectedClassId(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.subjects?.code} - {getLocalizedName(cls.subjects, language === 'ar')} ({t('instructorPortal.section')} {cls.section})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Settings className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">{t('instructorPortal.defaultReleaseSettings', 'Default Release Settings for the Course')}</h3>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-white text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: PORTAL_BG }}
            onClick={saveCourseSettings}
            disabled={savingSettings}
          >
            {t('common.save', 'Save')}
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructorPortal.defaultReleaseMode', 'Default Release Mode')}</label>
            <select
              value={settings.default_release_mode}
              onChange={(e) => setSettings((p) => ({ ...p, default_release_mode: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="scheduled">Scheduled</option>
              <option value="immediate">Immediate</option>
              <option value="conditional">Conditional</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructorPortal.completionTracking', 'Completion Tracking')}</label>
            <select
              value={settings.completion_tracking ? 'enabled' : 'disabled'}
              onChange={(e) => setSettings((p) => ({ ...p, completion_tracking: e.target.value === 'enabled' }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructorPortal.showProgressToStudents', 'Show Progress to Students')}</label>
            <select
              value={settings.show_progress_to_students ? 'yes' : 'no'}
              onChange={(e) => setSettings((p) => ({ ...p, show_progress_to_students: e.target.value === 'yes' }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`flex items-center gap-2 px-4 py-3 border-b border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Calendar className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">{t('instructorPortal.lessonsReleaseSchedule', 'Lessons Release Schedule')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.lesson', 'Lesson')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.unit', 'Unit')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.releaseMode', 'Release Mode')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.releaseDate', 'Release Date')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.condition', 'Condition')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.status')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className={`py-3 px-4 text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{row.title}</td>
                  <td className={`py-3 px-4 text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.unit')} {row.unit_number}</td>
                  <td className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <select
                      className="rounded border border-slate-300 px-2 py-1"
                      value={row.release_mode}
                      onChange={(e) => updateScheduleField(row.id, { release_mode: e.target.value })}
                    >
                      <option value="immediate">Immediate</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="conditional">Conditional</option>
                    </select>
                  </td>
                  <td className={`py-3 px-4 text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <input
                      type="datetime-local"
                      className="rounded border border-slate-300 px-2 py-1"
                      value={row.release_at_input || ''}
                      onChange={(e) => updateScheduleField(row.id, { release_at_input: e.target.value })}
                    />
                  </td>
                  <td className={`py-3 px-4 text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <input
                      className="rounded border border-slate-300 px-2 py-1"
                      value={row.release_condition || ''}
                      onChange={(e) => updateScheduleField(row.id, { release_condition: e.target.value })}
                    />
                  </td>
                  <td className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <select
                      className="rounded border border-slate-300 px-2 py-1"
                      value={row.status}
                      onChange={(e) => updateScheduleField(row.id, { status: e.target.value })}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                  <td className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-white text-sm font-medium hover:opacity-90"
                      style={{ backgroundColor: PORTAL_BG }}
                      onClick={() => saveLessonSchedule(row.id)}
                      disabled={row.saving}
                    >
                      {row.saving ? '...' : t('common.save', 'Save')}
                    </button>
                  </td>
                </tr>
              ))}
              {schedule.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">{t('instructorPortal.noData', 'No data available')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="font-semibold text-slate-800">{t('instructorPortal.contentCompletionReport', 'Content Completion Report')}</h3>
          <button type="button" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50">
            <Download className="w-4 h-4" />
            {t('instructorPortal.export', 'Export')}
          </button>
        </div>
        <div className="overflow-x-auto p-4">
          <p className="text-slate-500 text-sm mb-4">{selectedClass ? `${selectedClass.subjects?.code} - ${getLocalizedName(selectedClass.subjects, language === 'ar')}` : ''}</p>
          <table className="w-full border-collapse text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className={`py-2 px-3 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.student', 'Student')}</th>
                {unitNumbers.map((unit) => (
                  <th key={unit} className={`py-2 px-3 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.unit')} {unit}</th>
                ))}
                <th className={`py-2 px-3 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.total', 'Total')}</th>
              </tr>
            </thead>
            <tbody>
              {completionTable.map((row) => (
                <tr key={row.studentId} className="border-b border-slate-100">
                  <td className={`py-2 px-3 text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{row.name}</td>
                  {unitNumbers.map((unit) => (
                    <td key={unit} className={`py-2 px-3 ${isRTL ? 'text-right' : 'text-left'}`}>{row.byUnit[unit] || 0}%</td>
                  ))}
                  <td className={`py-2 px-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${row.total}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              {completionTable.length === 0 && (
                <tr>
                  <td colSpan={Math.max(2, unitNumbers.length + 2)} className="py-6 text-center text-slate-500">{t('instructorPortal.noData', 'No data available')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

