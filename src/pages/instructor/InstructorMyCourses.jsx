import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'

const COURSE_GRADIENTS = [
  'linear-gradient(135deg, var(--p), var(--pl))',
  'linear-gradient(135deg, #1a5276, #2e86c1)',
  'linear-gradient(135deg, #1a4a2e, #27ae60)',
  'linear-gradient(135deg, #6c3483, #9b59b6)',
]

export default function InstructorMyCourses() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [instructor, setInstructor] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState(null)
  const [courses, setCourses] = useState([])
  const [previousCourses, setPreviousCourses] = useState([])
  const [lessonStats, setLessonStats] = useState({})
  const [enrollmentCounts, setEnrollmentCounts] = useState({})

  useEffect(() => {
    if (user?.email) fetchInstructor()
  }, [user?.email])

  useEffect(() => {
    if (instructor?.college_id) fetchSemesters()
  }, [instructor?.college_id])

  useEffect(() => {
    if (instructor?.id && selectedSemesterId) {
      fetchCourses()
      fetchPreviousCourses()
    }
  }, [instructor?.id, selectedSemesterId])

  const fetchInstructor = async () => {
    const { data } = await supabase
      .from('instructors')
      .select('id, name_en, name_ar, college_id')
      .eq('email', user.email)
      .eq('status', 'active')
      .single()

    if (data) setInstructor(data)
  }

  const fetchSemesters = async () => {
    const { data } = await supabase
      .from('semesters')
      .select('id, name_en, name_ar, code, start_date')
      .eq('college_id', instructor.college_id)
      .order('start_date', { ascending: false })
      .limit(10)

    setSemesters(data || [])
    if (data?.length && !selectedSemesterId) setSelectedSemesterId(data[0].id)
  }

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          subject_id,
          semester_id,
          status,
          subjects(id, code, name_en, name_ar, credit_hours)
        `)
        .eq('instructor_id', instructor.id)
        .eq('semester_id', selectedSemesterId)
        .eq('status', 'active')

      if (error) throw error

      const classIds = (classesData || []).map((c) => c.id)
      setCourses(classesData || [])

      if (!classIds.length) {
        setLessonStats({})
        setEnrollmentCounts({})
        return
      }

      const [{ data: lessonsData }, { data: enrollmentsData }] = await Promise.all([
        supabase
          .from('class_lessons')
          .select('class_id, status')
          .in('class_id', classIds),
        supabase
          .from('enrollments')
          .select('class_id, id')
          .in('class_id', classIds)
          .eq('status', 'enrolled'),
      ])

      const nextLessonStats = {}
      for (const classId of classIds) {
        nextLessonStats[classId] = { total: 0, published: 0 }
      }

      for (const lesson of lessonsData || []) {
        if (!nextLessonStats[lesson.class_id]) {
          nextLessonStats[lesson.class_id] = { total: 0, published: 0 }
        }
        nextLessonStats[lesson.class_id].total += 1
        if (lesson.status === 'published') nextLessonStats[lesson.class_id].published += 1
      }

      const nextEnrollmentCounts = {}
      for (const classId of classIds) {
        nextEnrollmentCounts[classId] = 0
      }
      for (const enrollment of enrollmentsData || []) {
        nextEnrollmentCounts[enrollment.class_id] = (nextEnrollmentCounts[enrollment.class_id] || 0) + 1
      }

      setLessonStats(nextLessonStats)
      setEnrollmentCounts(nextEnrollmentCounts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPreviousCourses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          subject_id,
          semester_id,
          status,
          subjects(id, code, name_en, name_ar),
          semesters(id, name_en, name_ar, code, start_date)
        `)
        .eq('instructor_id', instructor.id)
        .neq('semester_id', selectedSemesterId)
        .order('id', { ascending: false })
        .limit(30)

      const list = data || []
      const classIds = list.map((c) => c.id)

      if (!classIds.length) {
        setPreviousCourses([])
        return
      }

      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('class_id, id')
        .in('class_id', classIds)
        .eq('status', 'enrolled')

      const counts = {}
      for (const id of classIds) counts[id] = 0
      for (const row of enrollmentsData || []) counts[row.class_id] = (counts[row.class_id] || 0) + 1

      setPreviousCourses(
        list.map((row) => ({
          ...row,
          enrolled_count: counts[row.id] || 0,
        }))
      )
    } catch (err) {
      console.error(err)
    }
  }

  const currentSemester = useMemo(
    () => semesters.find((s) => s.id === selectedSemesterId),
    [semesters, selectedSemesterId]
  )

  const semesterLabel = currentSemester ? getLocalizedName(currentSemester, language === 'ar') : ''

  if (loading && !instructor) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--bdr)', borderTopColor: 'var(--p)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <>
      <nav className="bc" aria-label={t('instructorPortal.breadcrumbMain')}>
        <Link to="/">{t('instructorPortal.breadcrumbPortal')}</Link>
        <span className="bc-sep">›</span>
        <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <span>{t('instructorPortal.myCourses')}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t('instructorPortal.myCourses')}</h1>
          <p className="ph-sub">
            {semesterLabel ? `${semesterLabel} — ` : ''}
            {t('instructorPortal.activeCoursesCount', { count: courses.length })}
          </p>
        </div>
        <div className="ph-acts">
          <select
            className="fc"
            style={{ width: 'auto' }}
            value={selectedSemesterId || ''}
            onChange={(e) => setSelectedSemesterId(e.target.value ? Number(e.target.value) : null)}
            aria-label={t('instructorPortal.filterSemester')}
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>{getLocalizedName(s, language === 'ar')}</option>
            ))}
            {semesters.length === 0 && <option>{semesterLabel || ''}</option>}
          </select>
          <Link to="/instructor/templates" className="btn btn-gh">{t('instructorPortal.templates')}</Link>
        </div>
      </div>

      <div className="course-grid">
        {courses.map((cls, index) => {
          const stats = lessonStats[cls.id] || { total: 0, published: 0 }
          const total = Math.max(stats.total, 0)
          const published = Math.min(stats.published || 0, total)
          const pct = total ? Math.round((published / total) * 100) : 0
          const isComplete = total > 0 && pct >= 100
          const gradient = COURSE_GRADIENTS[index % COURSE_GRADIENTS.length]
          const hours = cls.subjects?.credit_hours || 0
          const students = enrollmentCounts[cls.id] || 0
          const courseName = getLocalizedName(cls.subjects, language === 'ar')

          return (
            <div key={cls.id} className="course-card">
              <div className="course-top" style={{ background: gradient }}>
                <div className="course-code">{cls.subjects?.code} — {t('instructorPortal.section')} {cls.section}</div>
                <h3>{courseName}</h3>
                <div className="course-term">{t('instructorPortal.semesterCol')}: {semesterLabel || '-'}</div>
              </div>
              <div className="course-body">
                <div className="course-meta">
                  <div className="course-mi"><strong>{students}</strong>{t('instructorPortal.studentsLabel')}</div>
                  <div className="course-mi"><strong>{total}</strong>{t('instructorPortal.lessonsLabel')}</div>
                  <div className="course-mi"><strong>{hours}</strong>{t('instructorPortal.hours')}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{t('instructorPortal.contentPublishProgress')}</span>
                    <span style={{ fontWeight: 700 }}>{published}/{total}</span>
                  </div>
                  <div className="prog-bar">
                    <div className={`prog-fill ${isComplete ? 'ok' : pct >= 60 ? 'acc' : 'warn'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span data-status="active" className="badge">{t('instructorPortal.badgeActive')}</span>
                  {isComplete ? (
                    <span style={{ background: 'var(--ok-bg)', color: 'var(--ok)', fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>? {t('instructorPortal.contentComplete')}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.outOfLessons', { total })}</span>
                  )}
                </div>
                <div className="course-actions">
                  <Link to={`/instructor/subjects/${cls.subject_id}`} className="btn btn-p btn-sm">{t('instructorPortal.openCourse')}</Link>
                  <Link to={`/instructor/curriculum-map?classId=${cls.id}`} className="btn btn-gh btn-sm">{t('instructorPortal.curriculumMap')}</Link>
                  <Link to={`/instructor/build-lessons?classId=${cls.id}`} className="btn btn-gh btn-sm">{t('instructorPortal.buildLesson')}</Link>
                  <Link to={`/instructor/content-release?classId=${cls.id}`} className="btn btn-gh btn-sm">{t('instructorPortal.contentRelease')}</Link>
                  <Link to={`/instructor/question-bank?classId=${cls.id}`} className="btn btn-gh btn-sm">{t('instructorPortal.questionBankTitle')}</Link>
                  <Link to={`/instructor/gradebook?classId=${cls.id}`} className="btn btn-gh btn-sm">{t('instructorPortal.gradebook')}</Link>
                  <Link to={`/instructor/assessments?classId=${cls.id}`} className="btn btn-gh btn-sm">{t('instructorPortal.createAssessments')}</Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-hd">
          <div className="card-title">{t('instructorPortal.previousSemestersCourses')}</div>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>{t('instructorPortal.courseCode')}</th>
                <th>{t('instructorPortal.courseName')}</th>
                <th>{t('instructorPortal.semesterCol')}</th>
                <th>{t('instructorPortal.studentsLabel')}</th>
                <th>{t('instructorPortal.statusCol')}</th>
                <th>{t('instructorPortal.actionsCol')}</th>
              </tr>
            </thead>
            <tbody>
              {previousCourses.map((row) => (
                <tr key={row.id}>
                  <td>{row.subjects?.code || row.code}</td>
                  <td>{getLocalizedName(row.subjects, language === 'ar')}</td>
                  <td>{getLocalizedName(row.semesters, language === 'ar') || row.semesters?.code || '-'}</td>
                  <td>{row.enrolled_count}</td>
                  <td>
                    <span data-status="closed" className="badge">
                      {row.status === 'active' ? t('instructorPortal.badgeActive') : t('instructorPortal.closed')}
                    </span>
                  </td>
                  <td>
                    <Link to={`/instructor/subjects/${row.subject_id}`} className="btn btn-gh btn-sm">{t('instructorPortal.view')}</Link>
                  </td>
                </tr>
              ))}
              {previousCourses.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    {t('instructorPortal.noData', 'No data available')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

