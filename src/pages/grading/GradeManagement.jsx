import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { getGradeTypesFromUniversitySettings, mergeGradeConfigWithTypes } from '../../utils/getCollegeSettings'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { GraduationCap, BookOpen, Users, Calendar, Award, Info } from 'lucide-react'

export default function GradeManagement() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabicLayout = isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, colleges, setSelectedCollegeId } = useCollege()
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [collegeId, setCollegeId] = useState(null)
  const [gradeTypes, setGradeTypes] = useState([])

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

  useEffect(() => {
    getGradeTypesFromUniversitySettings().then(setGradeTypes)
  }, [])

  const semesterOptionsForSelect = useMemo(() => {
    if (userRole !== 'admin' || !selectedCollegeId) return semesters
    return semesters.filter(
      (s) => s.is_university_wide || String(s.college_id || '') === String(selectedCollegeId)
    )
  }, [userRole, selectedCollegeId, semesters])

  useEffect(() => {
    if (!selectedSemester) return
    if (!semesterOptionsForSelect.some((s) => String(s.id) === String(selectedSemester))) {
      setSelectedSemester('')
    }
  }, [semesterOptionsForSelect, selectedSemester])

  useEffect(() => {
    if (selectedSemester) return
    const opts = semesterOptionsForSelect
    if (opts.length === 0) return
    const cur = opts.find((s) => s.status === 'active')
    setSelectedSemester(String((cur || opts[0]).id))
  }, [semesterOptionsForSelect, selectedSemester])

  const fetchSemesters = async () => {
    // Don't fetch if we don't have required data
    if (userRole === 'user' && !authCollegeId) return
    if (userRole === 'instructor' && !authCollegeId) return

    try {
      setLoading(true)
      let query = supabase
        .from('semesters')
        .select('id, name_en, name_ar, code, start_date, end_date, status, college_id, is_university_wide')
        .order('start_date', { ascending: false })

      // Filter by college for college admins: college's semesters OR university-wide
      if (userRole === 'user' && authCollegeId) {
        query = query.or(`college_id.eq.${authCollegeId},is_university_wide.eq.true`)
      }
      // Filter by college for instructors: college's semesters OR university-wide
      else if (userRole === 'instructor' && authCollegeId) {
        query = query.or(`college_id.eq.${authCollegeId},is_university_wide.eq.true`)
      }
      // Filter by selected college for super admins: college's semesters OR university-wide
      else if (userRole === 'admin' && selectedCollegeId) {
        query = query.or(`college_id.eq.${selectedCollegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
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
          subjects(id, name_en, name_ar, code, grade_configuration),
          instructors(id, name_en, name_ar),
          class_schedules(day_of_week, start_time, end_time)
        `)
        .eq('semester_id', selectedSemester)
        .eq('status', 'active')
        .order('code')

      // Filter by college: show college's classes OR university-wide classes
      const effectiveCollegeId = collegeId || (userRole === 'user' && authCollegeId) || (userRole === 'admin' && selectedCollegeId) || authCollegeId
      if (effectiveCollegeId) {
        query = query.or(`college_id.eq.${effectiveCollegeId},is_university_wide.eq.true`)
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
    if (!schedules || schedules.length === 0) return t('grading.classGrades.tba')
    return schedules.map((s) => {
      const dayKey = (s.day_of_week || '').toLowerCase()
      const dayLabel = dayKey ? t(`classes.${dayKey}`, { defaultValue: s.day_of_week }) : ''
      const start = s.start_time || ''
      const end = s.end_time || ''
      return t('grading.gradeManagement.scheduleSlot', { day: dayLabel, start, end })
    }).join(isArabicLayout ? '، ' : ', ')
  }

  const gradeTypeDisplayName = (config) => {
    const gt = gradeTypes.find((g) => g.code === config.grade_type_code)
    if (isArabicLayout) {
      return gt?.name_ar || gt?.name_en || config.grade_type_name_en || config.grade_type_code
    }
    return gt?.name_en || config.grade_type_name_en || config.grade_type_code
  }

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className={isArabicLayout ? 'text-right' : 'text-left'} dir={isArabicLayout ? 'rtl' : 'ltr'}>
        <h1 className="text-3xl font-bold text-gray-900">{t('grading.gradeManagement.title')}</h1>
        <p className="text-gray-600 mt-1">{t('grading.gradeManagement.subtitle')}</p>
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
            className={`w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${isArabicLayout ? 'text-right' : 'text-left'}`}
          >
            <option value="">{t('grading.gradeManagement.allColleges')}</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>
                {getLocalizedName(college, isArabicLayout)}
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
          className={`w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${isArabicLayout ? 'text-right' : 'text-left'}`}
        >
          <option value="">{t('grading.gradeManagement.selectSemesterPlaceholder')}</option>
          {semesterOptionsForSelect.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {getLocalizedName(semester, isArabicLayout)} ({semester.code})
              {semester.status === 'active' ? ` ${t('grading.gradeManagement.current')}` : ''}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" dir={isArabicLayout ? 'rtl' : 'ltr'}>
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/grading/classes/${classItem.id}/grades`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/grading/classes/${classItem.id}/grades`)
                  }}
                  className="p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                  dir={isArabicLayout ? 'rtl' : 'ltr'}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <BookOpen className="w-8 h-8 text-primary-600 flex-shrink-0" />
                    <div className={`min-w-0 flex-1 ${isArabicLayout ? 'text-right' : 'text-left'}`}>
                      <h3 className="text-lg font-bold text-gray-900">{classItem.code}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {getLocalizedName(classItem.subjects, isArabicLayout) || classItem.subjects?.code || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className={`space-y-2 text-sm ${isArabicLayout ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 text-gray-600 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {t('grading.gradeManagement.instructor')}:{' '}
                        {getLocalizedName(classItem.instructors, isArabicLayout) || t('grading.classGrades.tba')}
                      </span>
                    </div>
                    <div className={`flex items-center gap-2 text-gray-600 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {t('grading.gradeManagement.schedule')}: {formatSchedule(classItem.class_schedules)}
                      </span>
                    </div>
                    <div className={`flex items-center gap-2 text-gray-600 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                      <GraduationCap className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {t('grading.gradeManagement.capacity')}: {classItem.enrolled || 0}/{classItem.capacity || 0}
                      </span>
                    </div>
                    {classItem.subjects?.grade_configuration && 
                     Array.isArray(classItem.subjects.grade_configuration) && 
                     classItem.subjects.grade_configuration.length > 0 && (() => {
                      const mergedConfig = mergeGradeConfigWithTypes(classItem.subjects.grade_configuration, gradeTypes)
                      return (
                      <div className={`flex items-start gap-2 text-gray-600 mt-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                        <Award className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-gray-700 block mb-1">
                            {t('grading.gradeManagement.gradeTypes')}:
                          </span>
                          <div className={`flex flex-wrap gap-1 ${isArabicLayout ? 'justify-end' : 'justify-start'}`}>
                            {mergedConfig.map((config, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                                title={`${t('grading.gradeManagement.max')}: ${config.maximum || 'N/A'}, ${t('grading.gradeManagement.pass')}: ${config.pass_score || 'N/A'}, ${t('grading.gradeManagement.weight')}: ${config.weight || 0}%`}
                              >
                                {gradeTypeDisplayName(config)}
                                {config.weight && ` (${config.weight}%)`}
                              </span>
                            ))}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {mergedConfig.map((config, idx) => (
                              <div key={idx} className="truncate">
                                <span className="font-medium">{gradeTypeDisplayName(config)}:</span>
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
                    )})()}
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

