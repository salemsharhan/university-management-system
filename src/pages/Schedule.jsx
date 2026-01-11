import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Clock, MapPin, Users, Download, Video, ExternalLink } from 'lucide-react'

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
  const [selectedCollegeId, setSelectedCollegeId] = useState('')
  const [semesters, setSemesters] = useState([])
  const [colleges, setColleges] = useState([])
  const [student, setStudent] = useState(null)
  const [instructor, setInstructor] = useState(null)

  useEffect(() => {
    if (userRole === 'student' && user?.email) {
      fetchStudentData()
    } else if (userRole === 'instructor' && user?.email) {
      fetchInstructorData()
    } else if (userRole === 'admin') {
      fetchAdminData()
    } else {
      // For other roles, fetch schedule differently
      setLoading(false)
    }
  }, [userRole, user])

  useEffect(() => {
    // Fetch schedule when semester is selected or when data is ready
    if (userRole === 'student' && selectedSemesterId && student?.id) {
      fetchSchedule()
    } else if (userRole === 'instructor' && instructor?.id) {
      fetchSchedule()
    } else if (userRole === 'admin' && colleges.length > 0) {
      // Admin: Fetch schedule when filters change (only if colleges are loaded)
      // This will trigger on initial load when colleges are set, and on filter changes
      fetchSchedule()
    }
  }, [selectedSemesterId, selectedCollegeId, student, instructor, userRole, colleges])

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

  const fetchInstructorData = async () => {
    try {
      setLoading(true)
      const { data: instructorData, error: instructorError } = await supabase
        .from('instructors')
        .select('id, name_en, email, college_id')
        .eq('email', user.email)
        .eq('status', 'active')
        .single()

      if (instructorError) throw instructorError
      setInstructor(instructorData)

      // Fetch semesters for the instructor's college
      if (instructorData?.college_id) {
        const { data: semestersData, error: semestersError } = await supabase
          .from('semesters')
          .select('id, name_en, code, start_date, end_date, status')
          .eq('college_id', instructorData.college_id)
          .eq('is_university_wide', false)
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
    } catch (err) {
      console.error('Error fetching instructor data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      
      // Fetch all semesters for admin (can filter later)
      const { data: semestersData, error: semestersError } = await supabase
        .from('semesters')
        .select('id, name_en, code, start_date, end_date, status, college_id')
        .order('start_date', { ascending: false })

      if (!semestersError && semestersData) {
        setSemesters(semestersData)
      }

      // Fetch all colleges for admin
      const { data: collegesData, error: collegesError } = await supabase
        .from('colleges')
        .select('id, name_en, code')
        .eq('status', 'active')
        .order('name_en')

      if (!collegesError && collegesData) {
        setColleges(collegesData)
        // Set colleges in state first, then trigger schedule fetch via useEffect
        // The useEffect will detect colleges.length change and fetch schedules
      }
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedule = async () => {
    if (userRole === 'student' && !student?.id) return
    if (userRole === 'student' && !selectedSemesterId) return
    if (userRole === 'instructor' && !instructor?.id) return
    // Admin can fetch schedules even without semesters/colleges loaded (will show all)

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
              class_schedules(day_of_week, start_time, end_time, location, teams_meeting_url),
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
                  teamsMeetingUrl: scheduleItem.teams_meeting_url || null,
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
      } else if (userRole === 'instructor') {
        // For instructors: Get classes where they are the instructor
        let query = supabase
          .from('classes')
          .select(`
            id,
            code,
            section,
            subjects(id, name_en, code),
            instructors(id, name_en),
            class_schedules(day_of_week, start_time, end_time, location, teams_meeting_url),
            room,
            building,
            semesters(id, name_en, code)
          `)
          .eq('instructor_id', instructor.id)
          .eq('status', 'active')

        // Filter by semester if selected
        if (selectedSemesterId) {
          query = query.eq('semester_id', selectedSemesterId)
        }

        const { data: classes, error: classesError } = await query

        if (classesError) throw classesError

        // Group by day of week
        const scheduleByDay = {}
        DAYS_OF_WEEK.forEach(day => {
          scheduleByDay[day] = []
        })

        classes?.forEach(classData => {
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
                  section: classData.section,
                  semester: classData.semesters?.name_en || 'N/A',
                  teamsMeetingUrl: scheduleItem.teams_meeting_url || null,
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
      } else if (userRole === 'admin') {
        // For admin: Get all classes across all colleges (or filter by college/semester)
        let query = supabase
          .from('classes')
          .select(`
            id,
            code,
            section,
            college_id,
            subjects(id, name_en, code),
            instructors(id, name_en),
            class_schedules(day_of_week, start_time, end_time, location, teams_meeting_url),
            room,
            building,
            semesters(id, name_en, code)
          `)
          .eq('status', 'active')

        // Filter by semester if selected
        if (selectedSemesterId) {
          query = query.eq('semester_id', selectedSemesterId)
        }

        // Filter by college if selected
        if (selectedCollegeId) {
          query = query.eq('college_id', selectedCollegeId)
        }

        const { data: classes, error: classesError } = await query

        if (classesError) throw classesError

        // Create a map of college IDs to names
        const collegeMap = {}
        colleges.forEach(college => {
          collegeMap[college.id] = college.name_en
        })

        // Group by day of week
        const scheduleByDay = {}
        DAYS_OF_WEEK.forEach(day => {
          scheduleByDay[day] = []
        })

        classes?.forEach(classData => {
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
                  section: classData.section,
                  semester: classData.semesters?.name_en || 'N/A',
                  college: classData.college_id ? (collegeMap[classData.college_id] || 'N/A') : 'N/A',
                  teamsMeetingUrl: scheduleItem.teams_meeting_url || null,
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
        // For other roles (user), show empty schedule
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
        {((userRole === 'student' || userRole === 'instructor' || userRole === 'admin') && (semesters.length > 0 || colleges.length > 0)) && (
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'} flex-wrap gap-3`}>
            {userRole === 'admin' && colleges.length > 0 && (
              <select
                value={selectedCollegeId}
                onChange={(e) => setSelectedCollegeId(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Colleges</option>
                {colleges.map(college => (
                  <option key={college.id} value={college.id}>
                    {college.name_en} ({college.code})
                  </option>
                ))}
              </select>
            )}
            {semesters.length > 0 && (
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Semesters</option>
                {semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name_en} ({semester.code})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleExport}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
            >
              <Download className="w-5 h-5" />
              <span>{t('navigation.scheduleExport')}</span>
            </button>
          </div>
        )}
        {userRole !== 'student' && userRole !== 'instructor' && userRole !== 'admin' && (
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
                          <h3 className={`text-lg font-bold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {classItem.course}
                            {classItem.section && <span className="text-sm font-normal text-gray-600 ml-2">(Section {classItem.section})</span>}
                          </h3>
                          <div className={`flex flex-wrap items-center gap-4 text-sm text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-1'}`}>
                              <MapPin className="w-4 h-4" />
                              <span>{classItem.location}</span>
                            </div>
                            {userRole === 'student' && (
                              <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-1'}`}>
                                <Users className="w-4 h-4" />
                                <span>{classItem.instructor}</span>
                              </div>
                            )}
                            {(userRole === 'instructor' || userRole === 'admin') && classItem.semester && (
                              <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-1'}`}>
                                <Calendar className="w-4 h-4" />
                                <span>{classItem.semester}</span>
                              </div>
                            )}
                            {userRole === 'admin' && classItem.instructor && (
                              <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-1'}`}>
                                <Users className="w-4 h-4" />
                                <span>{classItem.instructor}</span>
                              </div>
                            )}
                            {userRole === 'admin' && classItem.college && (
                              <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-1'}`}>
                                <MapPin className="w-4 h-4" />
                                <span className="font-medium">{classItem.college}</span>
                              </div>
                            )}
                          </div>
                          {classItem.teamsMeetingUrl && (
                            <div className={`mt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                              <a
                                href={classItem.teamsMeetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm`}
                              >
                                <Video className="w-4 h-4" />
                                <span>{t('navigation.joinTeamsMeeting') || 'Join Teams Meeting'}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
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




