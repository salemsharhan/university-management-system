import { useState, useEffect } from 'react'
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
const TERM_KEYS = ['courseTypeOnline', 'courseTypeBlended', 'courseTypeInPerson', 'courseTypeOnline']

export default function InstructorMyCourses() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [instructor, setInstructor] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState(null)
  const [courses, setCourses] = useState([])
  const [materialsCount, setMaterialsCount] = useState({})
  const [enrollmentCounts, setEnrollmentCounts] = useState({})

  useEffect(() => {
    if (user?.email) fetchInstructor()
  }, [user?.email])

  useEffect(() => {
    if (instructor?.college_id) fetchSemesters()
  }, [instructor?.college_id])

  useEffect(() => {
    if (instructor?.id && selectedSemesterId) fetchCourses()
  }, [instructor?.id, selectedSemesterId])

  const fetchInstructor = async () => {
    if (!user?.email) return
    const { data, error } = await supabase
      .from('instructors')
      .select('id, name_en, name_ar, college_id')
      .eq('email', user.email)
      .eq('status', 'active')
      .single()
    if (!error && data) setInstructor(data)
  }

  const fetchSemesters = async () => {
    if (!instructor?.college_id) return
    const { data } = await supabase
      .from('semesters')
      .select('id, name_en, name_ar, code')
      .eq('college_id', instructor.college_id)
      .order('start_date', { ascending: false })
      .limit(10)
    setSemesters(data || [])
    if (data?.length && !selectedSemesterId) setSelectedSemesterId(data[0].id)
  }

  const fetchCourses = async () => {
    if (!instructor?.id || !selectedSemesterId) return
    setLoading(true)
    try {
      const { data: classesData, error } = await supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          subject_id,
          subjects(id, code, name_en, name_ar, credit_hours)
        `)
        .eq('instructor_id', instructor.id)
        .eq('semester_id', selectedSemesterId)
        .eq('status', 'active')
      if (error) throw error
      setCourses(classesData || [])

      const matCounts = {}
      const enrollCounts = {}
      for (const c of classesData || []) {
        const [matRes, enrollRes] = await Promise.all([
          supabase.from('class_materials').select('*', { count: 'exact', head: true }).eq('class_id', c.id),
          supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('class_id', c.id),
        ])
        matCounts[c.id] = matRes.count ?? 0
        enrollCounts[c.id] = enrollRes.count ?? 0
      }
      setMaterialsCount(matCounts)
      setEnrollmentCounts(enrollCounts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const currentSemester = semesters.find(s => s.id === selectedSemesterId)
  const semesterLabel = currentSemester ? getLocalizedName(currentSemester, language === 'ar') : ''
  const getProgress = (classId) => {
    const total = 14
    const published = Math.min(materialsCount[classId] || 0, total)
    return { published, total }
  }

  const previousCourses = [
    { code: 'ENG101', nameAr: 'مهارات اللغة الإنجليزية', semester: 'الفصل الأول 2024-2025', students: 38, status: 'closed' },
    { code: 'CS201', nameAr: 'هياكل البيانات', semester: 'الفصل الأول 2024-2025', students: 30, status: 'closed' },
  ]

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
          <p className="ph-sub">{semesterLabel ? `${semesterLabel} — ` : ''}{t('instructorPortal.activeCoursesCount', { count: courses.length })}</p>
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
          <Link to="/instructor/templates" className="btn btn-gh">📋 {t('instructorPortal.templates')}</Link>
        </div>
      </div>

      <div className="course-grid">
        {courses.map((cls, index) => {
          const { published, total } = getProgress(cls.id)
          const pct = total ? Math.round((published / total) * 100) : 0
          const isComplete = pct >= 100
          const gradient = COURSE_GRADIENTS[index % COURSE_GRADIENTS.length]
          const termKey = TERM_KEYS[index % TERM_KEYS.length]
          const hours = (cls.subjects?.credit_hours || 3)
          const students = enrollmentCounts[cls.id] ?? 0
          const courseName = getLocalizedName(cls.subjects, language === 'ar')
          return (
            <div key={cls.id} className="course-card">
              <div className="course-top" style={{ background: gradient }}>
                <div className="course-code">{cls.subjects?.code} — {t('instructorPortal.section')} {cls.section}</div>
                <h3>{courseName}</h3>
                <div className="course-term">{t(`instructorPortal.${termKey}`)}</div>
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
                  {index === 1 && (
                    <span style={{ background: 'var(--err-bg)', color: 'var(--err)', fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>⚠️ {t('instructorPortal.integrityIssue')}</span>
                  )}
                  {isComplete && (
                    <span style={{ background: 'var(--ok-bg)', color: 'var(--ok)', fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>✓ {t('instructorPortal.contentComplete')}</span>
                  )}
                  {!isComplete && index !== 1 && (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.lastModified', { time: t('instructorPortal.yesterday') })}</span>
                  )}
                </div>
                <div className="course-actions">
                  <Link to={`/instructor/subjects/${cls.subject_id}`} className="btn btn-p btn-sm">{t('instructorPortal.openCourse')}</Link>
                  <Link to="/instructor/gradebook" className="btn btn-gh btn-sm">{t('instructorPortal.grades')}</Link>
                  <Link to="/instructor/analytics" className="btn btn-gh btn-sm">{t('instructorPortal.analytics')}</Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-hd">
          <div className="card-title">📚 {t('instructorPortal.previousSemestersCourses')}</div>
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
              {previousCourses.map((row, i) => (
                <tr key={i}>
                  <td>{row.code}</td>
                  <td>{row.nameAr}</td>
                  <td>{row.semester}</td>
                  <td>{row.students}</td>
                  <td><span data-status={row.status} className="badge">{t('instructorPortal.closed')}</span></td>
                  <td><Link to="/instructor/courses" className="btn btn-gh btn-sm">{t('instructorPortal.view')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
