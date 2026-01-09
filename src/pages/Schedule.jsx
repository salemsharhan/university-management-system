import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Clock, MapPin, Users, Download } from 'lucide-react'

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAYS_OF_WEEK_NAMES = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
}

const DAYS_OF_WEEK_NAMES_AR = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
}

export default function Schedule() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const { user, userRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [semesters, setSemesters] = useState([])
  const [student, setStudent] = useState(null)

  useEffect(() => {
    if (userRole === 'student' && user?.email) {
      fetchStudentData()
    } else {
      // For other roles, fetch schedule differently
      setLoading(false)
    }
  }, [userRole, user])

  useEffect(() => {
    // Fetch schedule when semester is selected (for students)
    if (userRole === 'student' && selectedSemesterId && student?.id) {
      fetchSchedule()
    }
  }, [selectedSemesterId, student])

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, name_en, college_id')
        .eq('email', user.email)
        .eq('status', 'active')
        .single()

      if (studentError) throw studentError
      setStudent(studentData)

      // Fetch semesters where student has enrollments
      if (studentData?.id) {
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('semester_id')
          .eq('student_id', studentData.id)
          .eq('status', 'enrolled')

        const semesterIds = [...new Set((enrollmentsData || []).map(e => e.semester_id))]

        if (semesterIds.length > 0) {
          const { data: semestersData, error: semestersError } = await supabase
            .from('semesters')
            .select('id, name_en, code, start_date, end_date')
            .in('id', semesterIds)
            .order('start_date', { ascending: false })

          if (!semestersError && semestersData) {
            setSemesters(semestersData)
            if (!selectedSemesterId && semestersData.length > 0) {
              // Auto-select current or first semester
              const currentSemester = semestersData.find(s => s.status === 'active') || semestersData[0]
              setSelectedSemesterId(String(currentSemester.id))
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching student data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedule = async () => {
    if (userRole === 'student' && !student?.id) return
    if (userRole === 'student' && !selectedSemesterId) return

    try {
      setLoading(true)

      if (userRole === 'student') {
        // For students: Get class schedules from their enrollments
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select(`
            class_id,
            classes(
              id,
              code,
              section,
              subjects(id, name_en, code),
              instructors(id, name_en),
              class_schedules(day_of_week, start_time, end_time, location),
              room,
              building
            )
          `)
          .eq('student_id', student.id)
          .eq('semester_id', selectedSemesterId)
          .eq('status', 'enrolled')

        if (enrollmentsError) throw enrollmentsError

        // Group by day of week
        const scheduleByDay = {}
        DAYS_OF_WEEK.forEach(day => {
          scheduleByDay[day] = []
        })

        enrollments?.forEach(enrollment => {
          const classData = enrollment.classes
          if (classData?.class_schedules) {
            classData.class_schedules.forEach(scheduleItem => {
              const day = scheduleItem.day_of_week?.toLowerCase()
              if (day && scheduleByDay[day]) {
                scheduleByDay[day].push({
                  time: `${scheduleItem.start_time} - ${scheduleItem.end_time}`,
                  course: `${classData.subjects?.code || ''} - ${classData.subjects?.name_en || ''}`,
                  location: scheduleItem.location || `${classData.building || ''} ${classData.room || ''}`.trim() || 'TBA',
                  instructor: classData.instructors?.name_en || 'TBA',
                  classCode: classData.code,
                })
              }
            })
          }
        })

        // Sort by time for each day
        Object.keys(scheduleByDay).forEach(day => {
          scheduleByDay[day].sort((a, b) => {
            const timeA = a.time.split(' - ')[0] || '00:00'
            const timeB = b.time.split(' - ')[0] || '00:00'
            return timeA.localeCompare(timeB)
          })
        })

        // Convert to array format
        const scheduleArray = DAYS_OF_WEEK.map(day => ({
          day: language === 'ar' ? DAYS_OF_WEEK_NAMES_AR[day] : DAYS_OF_WEEK_NAMES[day],
          dayKey: day,
          classes: scheduleByDay[day],
        }))

        setSchedule(scheduleArray)
      } else {
        // For other roles (admin, user, instructor), show all classes
        // TODO: Implement for other roles if needed
        setSchedule([])
      }
    } catch (err) {
      console.error('Error fetching schedule:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export functionality will be implemented')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('navigation.scheduleTitle')}</h1>
          <p className="text-gray-600 mt-1">{t('navigation.scheduleSubtitle')}</p>
        </div>
        {userRole === 'student' && semesters.length > 0 && (
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'}`}>
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {semesters.map(semester => (
                <option key={semester.id} value={semester.id}>
                  {semester.name_en} ({semester.code})
                </option>
              ))}
            </select>
            <button
              onClick={handleExport}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
            >
              <Download className="w-5 h-5" />
              <span>{t('navigation.scheduleExport')}</span>
            </button>
          </div>
        )}
        {userRole !== 'student' && (
          <button
            onClick={handleExport}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
          >
            <Calendar className="w-5 h-5" />
            <span>{t('navigation.scheduleExport')}</span>
          </button>
        )}
      </div>

      {/* Schedule */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {schedule.map((daySchedule, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-primary-gradient px-6 py-4">
                <h2 className={`text-xl font-bold text-white ${isRTL ? 'text-right' : 'text-left'}`}>{daySchedule.day}</h2>
              </div>
              <div className="p-6">
                {daySchedule.classes.length > 0 ? (
                  <div className="space-y-4">
                    {daySchedule.classes.map((classItem, classIndex) => (
                      <div
                        key={classIndex}
                        className={`flex items-start ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-4'} p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors`}
                      >
                        <div className={`flex-shrink-0 ${isRTL ? 'text-left' : 'text-right'} w-32`}>
                          <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-primary-600`}>
                            <Clock className="w-4 h-4" />
                            <span className="font-semibold">{classItem.time}</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{classItem.course}</h3>
                          <div className={`flex flex-wrap items-center gap-4 text-sm text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-1'}`}>
                              <MapPin className="w-4 h-4" />
                              <span>{classItem.location}</span>
                            </div>
                            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-1'}`}>
                              <Users className="w-4 h-4" />
                              <span>{classItem.instructor}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-gray-500 text-center py-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('navigation.scheduleNoClassesScheduled')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}




