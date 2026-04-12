import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { Calendar, Clock, Users, Save, Plus, Check } from 'lucide-react'

/**
 * Session-based attendance capture for a single class (instructor subject view).
 * Mirrors logic in pages/attendance/TakeAttendance.jsx.
 */
export default function InstructorAttendanceSessionTake({
  classId,
  classRow,
  canSave,
  platformUserId,
  onSaved,
}) {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const navigate = useNavigate()
  const isArabicLayout =
    isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')

  const [sessions, setSessions] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [attendanceMap, setAttendanceMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const sessionDateLocale = isArabicLayout ? 'ar-SA' : undefined

  const displayStudentName = (student) => {
    if (!student) return 'N/A'
    if (isArabicLayout) {
      const ar = [student.first_name_ar, student.last_name_ar].filter(Boolean).join(' ').trim()
      if (ar) return ar
      if (student.name_ar?.trim()) return student.name_ar.trim()
    }
    if (student.name_en?.trim()) return student.name_en.trim()
    const en = [student.first_name, student.last_name].filter(Boolean).join(' ').trim()
    return en || 'N/A'
  }

  const formatSessionOptionLabel = (session) => {
    const dateStr = new Date(session.session_date).toLocaleDateString(sessionDateLocale)
    return t('attendance.takeAttendance.sessionOptionLabel', {
      date: dateStr,
      start: session.start_time,
      end: session.end_time,
    })
  }

  const loadSessions = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .order('session_date', { ascending: false })

    if (err) throw err
    setSessions(data || [])
  }, [classId])

  const loadEnrollments = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('enrollments')
      .select('*, students(id, first_name, last_name, first_name_ar, last_name_ar, name_en, name_ar, student_id)')
      .eq('class_id', classId)
      .eq('status', 'enrolled')

    if (err) throw err
    setEnrollments(data || [])
  }, [classId])

  useEffect(() => {
    if (!classId) return
    let cancelled = false
    setLoading(true)
    setError('')
    setSuccess(false)
    setSelectedSessionId(null)
    setAttendanceMap({})
    ;(async () => {
      try {
        await Promise.all([loadSessions(), loadEnrollments()])
      } catch (e) {
        console.error(e)
        if (!cancelled) setError(e.message || t('common.error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [classId, loadSessions, loadEnrollments, t])

  useEffect(() => {
    if (!selectedSessionId || enrollments.length === 0) {
      setAttendanceMap({})
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error: err } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('session_id', selectedSessionId)

      if (err) {
        console.error(err)
        return
      }
      const next = {}
      enrollments.forEach((e) => {
        const student = e.students
        const sid = student?.id ?? e.student_id
        const row = data?.find((r) => r.student_id === sid)
        next[sid] = row?.status || 'absent'
      })
      if (!cancelled) setAttendanceMap(next)
    })()
    return () => {
      cancelled = true
    }
  }, [selectedSessionId, enrollments])

  const handleAttendanceChange = (studentId, status) => {
    if (!canSave) return
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSave || !classId || !selectedSessionId) {
      setError(t('attendance.takeAttendance.selectClassSessionError'))
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      let collegeId = classRow?.college_id
      if (collegeId == null && classId != null) {
        const { data: cls } = await supabase.from('classes').select('college_id').eq('id', classId).maybeSingle()
        collegeId = cls?.college_id
      }
      const session = sessions.find((s) => s.id === selectedSessionId)

      const attendanceRecords = enrollments.map((enrollment) => {
        const student = enrollment.students
        const studentId = student?.id ?? enrollment.student_id
        const status = attendanceMap[studentId] ?? 'absent'
        return {
          enrollment_id: enrollment.id,
          class_id: classId,
          student_id: studentId,
          session_id: selectedSessionId,
          college_id: collegeId,
          date: session?.session_date,
          status,
          recorded_by: platformUserId ?? null,
        }
      })

      await supabase.from('attendance').delete().eq('session_id', selectedSessionId)

      if (attendanceRecords.length > 0) {
        const { error: insertError } = await supabase.from('attendance').insert(attendanceRecords)
        if (insertError) throw insertError
      }

      setSuccess(true)
      if (onSaved) onSaved()
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError(err.message || t('common.error'))
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  if (classId == null) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('instructorPortal.subjectDetail.attendance.takeForSessionTitle')}
        </h3>
        <button
          type="button"
          className="text-sm text-primary-600 hover:text-primary-800 whitespace-nowrap self-start"
          onClick={() => navigate(`/attendance/take?classId=${classId}`)}
        >
          {t('instructorPortal.subjectDetail.attendance.openFullAttendancePage')}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          {t('attendance.takeAttendance.savedSuccess')}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('attendance.takeAttendance.selectSession')}
            </label>
            {sessions.length === 0 ? (
              <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center bg-white">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600 text-sm mb-3">{t('attendance.takeAttendance.noSessionsAvailable')}</p>
                <button
                  type="button"
                  onClick={() => navigate(`/attendance/sessions/create?classId=${classId}`)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-primary-gradient text-white rounded-lg text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t('attendance.takeAttendance.createSession')}
                </button>
              </div>
            ) : (
              <select
                value={selectedSessionId || ''}
                onChange={(e) => {
                  const v = e.target.value ? parseInt(e.target.value, 10) : null
                  setSelectedSessionId(v)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">{t('attendance.takeAttendance.selectSessionPlaceholder')}</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {formatSessionOptionLabel(session)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedSessionId && enrollments.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
              <div
                className={`flex flex-wrap items-center gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50 text-sm text-gray-600 ${
                  isArabicLayout ? 'flex-row-reverse justify-end' : ''
                }`}
              >
                {selectedSession && (
                  <>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(selectedSession.session_date).toLocaleDateString(sessionDateLocale)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {t('attendance.takeAttendance.sessionTimeOnly', {
                          start: selectedSession.start_time,
                          end: selectedSession.end_time,
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('attendance.takeAttendance.studentId')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('attendance.takeAttendance.name')}
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {t('attendance.takeAttendance.present')}
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {t('attendance.takeAttendance.absent')}
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {t('attendance.takeAttendance.late')}
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {t('attendance.takeAttendance.excused')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enrollments.map((enrollment) => {
                    const student = enrollment.students
                    const studentId = student?.id ?? enrollment.student_id
                    const currentStatus = attendanceMap[studentId] ?? 'absent'
                    return (
                      <tr key={enrollment.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap" dir="ltr">
                          {student?.student_id ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{displayStudentName(student)}</td>
                        {['present', 'absent', 'late', 'excused'].map((st) => (
                          <td key={st} className="px-2 py-3 text-center">
                            <input
                              type="radio"
                              name={`att-${classId}-${selectedSessionId}-${studentId}`}
                              checked={currentStatus === st}
                              onChange={() => handleAttendanceChange(studentId, st)}
                              disabled={!canSave}
                              className="w-4 h-4 text-primary-600 disabled:cursor-not-allowed"
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedSessionId && enrollments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('attendance.takeAttendance.noStudentsEnrolled')}</p>
            </div>
          )}

          {selectedSessionId && enrollments.length > 0 && (
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-end'}`}>
              <button
                type="submit"
                disabled={saving || !canSave}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-gradient text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? t('attendance.takeAttendance.saving') : t('attendance.takeAttendance.saveAttendance')}
              </button>
            </div>
          )}
        </>
      )}
    </form>
  )
}
