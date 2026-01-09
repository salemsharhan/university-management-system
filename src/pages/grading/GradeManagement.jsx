import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { GraduationCap, BookOpen, Users, Calendar, Award, Info } from 'lucide-react'

export default function GradeManagement() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, colleges, setSelectedCollegeId } = useCollege()
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [collegeId, setCollegeId] = useState(null)

  useEffect(() => {
    // Set college ID based on role first
    if (userRole === 'admin' && selectedCollegeId) {
      setCollegeId(selectedCollegeId)
    } else if (userRole === 'user' && authCollegeId) {
      setCollegeId(authCollegeId)
    } else if (userRole === 'instructor' && authCollegeId) {
      setCollegeId(authCollegeId)
    } else if (userRole === 'admin' && !selectedCollegeId) {
      setCollegeId(null)
    }
  }, [userRole, selectedCollegeId, authCollegeId])

  useEffect(() => {
    // Only fetch when we have the necessary data based on role
    if (userRole === 'admin') {
      // Admin can fetch (with or without college filter)
      fetchSemesters()
    } else if (userRole === 'user' && authCollegeId) {
      // College admin needs collegeId
      fetchSemesters()
    } else if (userRole === 'instructor' && authCollegeId) {
      // Instructor needs collegeId
      fetchSemesters()
    }
    // Don't fetch if we don't have required data
  }, [userRole, authCollegeId, selectedCollegeId])

  useEffect(() => {
    if (selectedSemester) {
      fetchClasses()
    } else {
      setClasses([])
    }
  }, [selectedSemester, collegeId])

  const fetchSemesters = async () => {
    // Don't fetch if we don't have required data
    if (userRole === 'user' && !authCollegeId) return
    if (userRole === 'instructor' && !authCollegeId) return

    try {
      setLoading(true)
      let query = supabase
        .from('semesters')
        .select('id, name_en, code, start_date, end_date, status')
        .order('start_date', { ascending: false })

      // Filter by college for college admins - only their college's semesters
      if (userRole === 'user' && authCollegeId) {
        query = query.eq('college_id', authCollegeId).eq('is_university_wide', false)
      }
      // Filter by college for instructors
      else if (userRole === 'instructor' && authCollegeId) {
        query = query.eq('college_id', authCollegeId).eq('is_university_wide', false)
      }
      // Filter by selected college for super admins
      else if (userRole === 'admin' && selectedCollegeId) {
        query = query.eq('college_id', selectedCollegeId).eq('is_university_wide', false)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
      
      // Auto-select current semester if available
      const currentSemester = data?.find(s => s.status === 'active' || s.is_current)
      if (currentSemester) {
        setSelectedSemester(String(currentSemester.id))
      }
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setSemesters([]) // Set empty array on error to prevent showing stale data
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          capacity,
          enrolled,
          subjects(id, name_en, code, grade_configuration),
          instructors(id, name_en),
          class_schedules(day_of_week, start_time, end_time)
        `)
        .eq('semester_id', selectedSemester)
        .eq('status', 'active')
        .order('code')

      // Filter by college
      if (collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'user' && authCollegeId) {
        query = query.eq('college_id', authCollegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatSchedule = (schedules) => {
    if (!schedules || schedules.length === 0) return 'TBA'
    return schedules.map(s => {
      const day = s.day_of_week?.charAt(0).toUpperCase() + s.day_of_week?.slice(1) || ''
      const start = s.start_time || ''
      const end = s.end_time || ''
      return `${day} ${start}-${end}`
    }).join(', ')
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('grading.gradeManagement.title')}</h1>
          <p className="text-gray-600 mt-1">{t('grading.gradeManagement.subtitle')}</p>
        </div>
      </div>

      {/* College Selector for Admin */}
      {userRole === 'admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.gradeManagement.selectCollege')}</label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => {
              const newCollegeId = e.target.value ? parseInt(e.target.value) : null
              setSelectedCollegeId(newCollegeId)
              setCollegeId(newCollegeId)
            }}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">{t('grading.gradeManagement.allColleges')}</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>
                {college.name_en}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Semester Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.gradeManagement.selectSemester')}</label>
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{t('grading.gradeManagement.selectSemesterPlaceholder')}</option>
          {semesters.map(semester => (
            <option key={semester.id} value={semester.id}>
              {semester.name_en} {semester.status === 'active' ? t('grading.gradeManagement.current') : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Classes List */}
      {selectedSemester && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('grading.gradeManagement.classes')}</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>{t('grading.gradeManagement.noClassesFound')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  onClick={() => navigate(`/grading/classes/${classItem.id}/grades`)}
                  className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                >
                  <div className={`flex items-start ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'} mb-4`}>
                    <div>
                      <h3 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{classItem.code}</h3>
                      <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {classItem.subjects?.name_en || 'N/A'}
                      </p>
                    </div>
                    <BookOpen className="w-8 h-8 text-primary-600" />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className={`flex items-center text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Users className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      <span>{t('grading.gradeManagement.instructor')}: {classItem.instructors?.name_en || t('grading.classGrades.tba')}</span>
                    </div>
                    <div className={`flex items-center text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Calendar className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      <span>{t('grading.gradeManagement.schedule')}: {formatSchedule(classItem.class_schedules)}</span>
                    </div>
                    <div className={`flex items-center text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <GraduationCap className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      <span>{t('grading.gradeManagement.capacity')}: {classItem.enrolled || 0}/{classItem.capacity || 0}</span>
                    </div>
                    {classItem.subjects?.grade_configuration && 
                     Array.isArray(classItem.subjects.grade_configuration) && 
                     classItem.subjects.grade_configuration.length > 0 && (
                      <div className={`flex items-start text-gray-600 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Award className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} mt-0.5`} />
                        <div className="flex-1">
                          <span className="text-xs font-medium text-gray-700 block mb-1">
                            {t('grading.gradeManagement.gradeTypes')}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {classItem.subjects.grade_configuration.map((config, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                                title={`${t('grading.gradeManagement.max')}: ${config.maximum || 'N/A'}, ${t('grading.gradeManagement.pass')}: ${config.pass_score || 'N/A'}, ${t('grading.gradeManagement.weight')}: ${config.weight || 0}%`}
                              >
                                {config.grade_type_name_en || config.grade_type_code}
                                {config.weight && ` (${config.weight}%)`}
                              </span>
                            ))}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {classItem.subjects.grade_configuration.map((config, idx) => (
                              <div key={idx} className="truncate">
                                <span className="font-medium">{config.grade_type_name_en || config.grade_type_code}:</span>
                                {' '}
                                {t('grading.gradeManagement.max')} {config.maximum || 'N/A'}, 
                                {' '}
                                {t('grading.gradeManagement.pass')} {config.pass_score || 'N/A'}
                                {config.fail_score && `, ${t('grading.gradeManagement.fail')} ${config.fail_score}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

