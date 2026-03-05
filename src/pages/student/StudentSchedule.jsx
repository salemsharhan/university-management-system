import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { Calendar, Printer, Download } from 'lucide-react'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAY_NAMES_EN = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' }
const DAY_NAMES_AR = { sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت' }
const DEFAULT_TIME_SLOTS = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00']

const COLORS = ['bg-slate-700', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-orange-500', 'bg-rose-500']

export default function StudentSchedule() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [grid, setGrid] = useState({})
  const [courseList, setCourseList] = useState([])
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS)

  useEffect(() => {
    if (user?.email) fetchStudent()
  }, [user?.email])

  useEffect(() => {
    if (student?.id && selectedSemesterId) fetchSchedule()
  }, [student?.id, selectedSemesterId])

  const fetchStudent = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, name_en, name_ar')
        .eq('email', user.email)
        .eq('status', 'active')
        .single()
      if (error || !data) return
      setStudent(data)
      const { data: enrolls } = await supabase.from('enrollments').select('semester_id').eq('student_id', data.id).eq('status', 'enrolled')
      const ids = [...new Set((enrolls || []).map(e => e.semester_id))]
      if (ids.length) {
        const { data: sems } = await supabase.from('semesters').select('id, name_en, name_ar, start_date, end_date').in('id', ids).order('start_date', { ascending: false })
        setSemesters(sems || [])
        if (!selectedSemesterId && sems?.length) setSelectedSemesterId(String(sems[0].id))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedule = async () => {
    if (!student?.id || !selectedSemesterId) return
    setLoading(true)
    try {
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          classes(
            id,
            code,
            subjects(id, code, name_en, name_ar),
            class_schedules(day_of_week, start_time, end_time, location),
            room,
            building,
            instructors(name_en, name_ar)
          )
        `)
        .eq('student_id', student.id)
        .eq('semester_id', selectedSemesterId)
        .eq('status', 'enrolled')
      if (error) throw error
      const gridMap = {}
      const seen = new Set()
      const list = []
      const slotSet = new Set(DEFAULT_TIME_SLOTS)
      enrollments?.forEach((enr, idx) => {
        const cls = enr.classes
        if (!cls?.class_schedules?.length) return
        const sub = cls.subjects
        const code = sub?.code || '—'
        const name = getLocalizedName(sub, language === 'ar') || '—'
        const color = COLORS[idx % COLORS.length]
        cls.class_schedules.forEach(s => {
          const day = String(s.day_of_week || '').toLowerCase()
          if (!DAYS.includes(day)) return
          const startNorm = (s.start_time || '').slice(0, 5)
          if (startNorm) slotSet.add(startNorm)
          const key = `${day}_${startNorm}`
          if (!gridMap[key]) gridMap[key] = []
          const endNorm = (s.end_time || '').slice(0, 5)
          gridMap[key].push({
            code,
            name,
            location: s.location || [cls.building, cls.room].filter(Boolean).join(' ') || '—',
            instructor: getLocalizedName(cls.instructors, language === 'ar') || '—',
            time: `${startNorm} - ${endNorm}`,
            color,
          })
          const listKey = `${code}-${name}`
          if (!seen.has(listKey)) {
            seen.add(listKey)
            list.push({ code, name, color })
          }
        })
      })
      setTimeSlots([...slotSet].sort())
      setGrid(gridMap)
      setCourseList(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const currentSemester = semesters.find(s => String(s.id) === selectedSemesterId)
  const displayDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']

  if (loading && !student) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <p className="text-slate-500 text-sm">
        {t('studentPortal.classSchedule', 'Class schedule')} / {t('studentPortal.studentPortal', 'Student Portal')} / {t('studentPortal.main', 'Main')}
      </p>
      <div className={`flex flex-wrap items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('studentPortal.weeklySchedule', 'Weekly schedule')}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {currentSemester ? getLocalizedName(currentSemester, language === 'ar') : ''} {student ? `| ${getLocalizedName(student, language === 'ar')}` : ''}
          </p>
        </div>
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            {t('studentPortal.icsExport', 'ICS Export')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium">
            <Printer className="w-4 h-4" />
            {t('common.print', 'Print')}
          </button>
        </div>
      </div>

      {semesters.length > 0 && (
        <select
          value={selectedSemesterId}
          onChange={(e) => setSelectedSemesterId(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent"
        >
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>{getLocalizedName(s, language === 'ar')}</option>
          ))}
        </select>
      )}

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        <div className={`overflow-x-auto ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <table className="w-full min-w-[700px] border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr>
                <th className={`bg-slate-800 text-white px-3 py-3 text-sm font-semibold w-28 ${isRTL ? 'text-right' : 'text-left'}`}>{t('studentPortal.time', 'Time')}</th>
                {displayDays.map((day) => (
                  <th key={day} className={`bg-slate-800 text-white px-2 py-3 text-sm font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? DAY_NAMES_AR[day] : DAY_NAMES_EN[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, rowIdx) => (
                <tr key={slot} className="border-b border-slate-100">
                  <td className={`px-3 py-2 text-slate-600 text-sm font-medium bg-slate-50 align-top whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    {slot} – {timeSlots[rowIdx + 1] || '18:30'}
                  </td>
                  {displayDays.map((day) => {
                    const key = `${day}_${slot}`
                    const cells = grid[key] || []
                    return (
                      <td key={day} className={`p-1.5 align-top border-slate-100 min-w-[120px] ${isRTL ? 'text-right border-r' : 'text-left border-l'}`}>
                        {cells.length === 0 ? (
                          <span className="text-slate-300 text-sm">—</span>
                        ) : (
                          <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {cells.map((c, i) => (
                              <div key={i} className={`rounded-lg p-2.5 text-white text-xs shadow-sm ${c.color} ${isRTL ? 'text-right' : 'text-left'}`}>
                                <p className="font-semibold">{c.code}</p>
                                <p className="opacity-95 truncate mt-0.5">{c.name}</p>
                                <p className="opacity-90 mt-1 text-[11px]">{c.location}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {courseList.length > 0 && (
          <div className={`flex flex-wrap gap-4 p-4 bg-slate-50 border-t border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {courseList.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded flex-shrink-0 ${c.color}`} />
                <span className="text-sm text-slate-700">{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
