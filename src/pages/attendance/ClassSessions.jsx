import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, ArrowRight, Search, Calendar, Users, Clock, FileText } from 'lucide-react'

export default function ClassSessions() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const isArabicLayout = isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')

  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    fetchClasses()
  }, [collegeId, userRole])

  useEffect(() => {
    if (selectedClassId) {
      fetchSessions()
    }
  }, [selectedClassId, collegeId, userRole])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          college_id,
          subjects(name_en, name_ar, code),
          semesters(name_en, name_ar, code),
          colleges(name_en, name_ar, code),
          capacity
        `)
        .eq('status', 'active')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
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

  const fetchSessions = async () => {
    try {
      let query = supabase
        .from('class_sessions')
        .select(`
          *,
          classes(code, section, subjects(name_en, name_ar), colleges(name_en, name_ar)),
          instructors(name_en, name_ar)
        `)
        .eq('class_id', selectedClassId)
        .order('session_date', { ascending: false })

      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error('Error fetching sessions:', err)
    }
  }

  const subjectName = (cls) => getLocalizedName(cls.subjects, isArabicLayout) || cls.subjects?.code || ''
  const semesterName = (cls) => getLocalizedName(cls.semesters, isArabicLayout) || cls.semesters?.code || ''
  const collegeName = (cls) => getLocalizedName(cls.colleges, isArabicLayout) || cls.colleges?.code || ''

  const filteredClasses = classes.filter((cls) => {
    const q = searchQuery.toLowerCase()
    const subj = subjectName(cls).toLowerCase()
    return (
      cls.code?.toLowerCase().includes(q) ||
      subj.includes(q) ||
      semesterName(cls).toLowerCase().includes(q) ||
      collegeName(cls).toLowerCase().includes(q)
    )
  })

  const sessionDateLocale = isArabicLayout ? 'ar-SA' : undefined

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className="flex items-start justify-between gap-4 w-full" dir="ltr">
        {isArabicLayout ? (
          <>
            <div className="flex-1 min-w-0 text-right" dir="rtl">
              <h1 className="text-3xl font-bold text-gray-900">{t('attendance.classSessions.title')}</h1>
              <p className="text-gray-600 mt-1">{t('attendance.classSessions.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/attendance')}
              className="flex items-center gap-2 flex-row-reverse flex-shrink-0 text-gray-600 hover:text-gray-900"
            >
              <ArrowRight className="w-5 h-5" />
              <span>{t('attendance.classSessions.back')}</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate('/attendance')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('attendance.classSessions.back')}</span>
            </button>
            <div className="flex-1 min-w-0 text-left">
              <h1 className="text-3xl font-bold text-gray-900">{t('attendance.classSessions.title')}</h1>
              <p className="text-gray-600 mt-1">{t('attendance.classSessions.subtitle')}</p>
            </div>
          </>
        )}
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        dir={isArabicLayout ? 'rtl' : 'ltr'}
      >
        {/* Class list: first column in DOM → appears on the right in RTL */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div
            className="bg-primary-gradient text-white p-4 rounded-t-xl flex items-center gap-2"
            dir={isArabicLayout ? 'rtl' : 'ltr'}
          >
            <Search className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{t('attendance.classSessions.selectClass')}</span>
          </div>
          <div className="p-4">
            <input
              type="text"
              placeholder={t('attendance.classSessions.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-4 ${isArabicLayout ? 'text-right' : 'text-left'}`}
            />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                </div>
              ) : filteredClasses.length === 0 ? (
                <p className={`text-gray-500 py-8 ${isArabicLayout ? 'text-right' : 'text-center'}`}>
                  {t('attendance.classSessions.noClassesFound')}
                </p>
              ) : (
                filteredClasses.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      selectedClassId === cls.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${isArabicLayout ? 'text-right' : 'text-left'}`}
                  >
                    <div className="flex items-start gap-3 mb-2" dir={isArabicLayout ? 'rtl' : 'ltr'}>
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">{cls.code}-{cls.section}</p>
                        <p className="text-sm text-gray-600">
                          {t('attendance.classSessions.subjectLabel')}: {subjectName(cls)}
                        </p>
                        {collegeName(cls) ? (
                          <p className="text-xs text-gray-500 mt-0.5">{collegeName(cls)}</p>
                        ) : null}
                      </div>
                    </div>
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500"
                      dir={isArabicLayout ? 'rtl' : 'ltr'}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {t('attendance.classSessions.studentsCount', { count: cls.capacity ?? 0 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{semesterName(cls)}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 min-h-[20rem]">
          {selectedClassId ? (
            <>
              <div className={`p-6 border-b border-gray-200 ${isArabicLayout ? 'text-right' : 'text-left'}`}>
                <h2 className="text-xl font-bold text-gray-900">{t('attendance.classSessions.sessionsTitle')}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {classes.find((c) => c.id === selectedClassId)?.code}-
                  {classes.find((c) => c.id === selectedClassId)?.section}
                </p>
              </div>
              <div className="p-6">
                {sessions.length === 0 ? (
                  <div className={`py-12 ${isArabicLayout ? 'text-right' : 'text-center'}`}>
                    <Calendar className={`w-16 h-16 mb-4 text-gray-400 ${isArabicLayout ? 'mr-0 ml-auto' : 'mx-auto'}`} />
                    <p className="text-lg font-medium text-gray-900 mb-2">{t('attendance.classSessions.noSessionsTitle')}</p>
                    <p className="text-sm text-gray-600 mb-4">{t('attendance.classSessions.noSessionsDesc')}</p>
                    <button
                      type="button"
                      onClick={() => navigate(`/attendance/sessions/create?classId=${selectedClassId}`)}
                      className="px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      {t('attendance.classSessions.createSession')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div
                          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                          dir={isArabicLayout ? 'rtl' : 'ltr'}
                        >
                          <div className={`min-w-0 ${isArabicLayout ? 'text-right' : 'text-left'}`}>
                            <p className="font-semibold text-gray-900">
                              {new Date(session.session_date).toLocaleDateString(sessionDateLocale)}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1" dir="ltr">
                                <Clock className="w-4 h-4 flex-shrink-0" />
                                <span>
                                  {t('attendance.classSessions.sessionTimeInline', {
                                    start: session.start_time,
                                    end: session.end_time,
                                  })}
                                </span>
                              </div>
                              {session.location ? <span>{session.location}</span> : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/attendance/take?sessionId=${session.id}&classId=${selectedClassId}`)
                            }
                            className="px-4 py-2 bg-primary-gradient text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all flex-shrink-0"
                          >
                            {t('attendance.classSessions.takeAttendance')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={`p-12 ${isArabicLayout ? 'text-right' : 'text-center'}`}>
              <Calendar className={`w-16 h-16 mb-4 text-gray-400 ${isArabicLayout ? 'mr-0 ml-auto' : 'mx-auto'}`} />
              <p className="text-lg font-medium text-gray-900">{t('attendance.classSessions.selectClassPrompt')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
