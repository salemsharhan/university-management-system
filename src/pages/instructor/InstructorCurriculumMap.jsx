import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'

export default function InstructorCurriculumMap() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [instructorId, setInstructorId] = useState(null)
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [clos, setClos] = useState([])
  const [lessons, setLessons] = useState([])

  const [editingClo, setEditingClo] = useState(null)
  const [form, setForm] = useState({ code: '', description: '', bloom_level: 'apply', difficulty_level: 'medium' })
  const [saving, setSaving] = useState(false)

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  )

  useEffect(() => {
    if (!user?.email) return
    loadInstructorClasses()
  }, [user?.email])

  useEffect(() => {
    if (!selectedClassId) return
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('classId', String(selectedClassId))
      return next
    })
    loadCurriculumData(selectedClassId)
  }, [selectedClassId])

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
        .select(`
          id,
          code,
          section,
          subject_id,
          subjects(id, code, name_en, name_ar),
          semesters(id, name_en, name_ar, code)
        `)
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

  const loadCurriculumData = async (classId) => {
    try {
      const currentClass = classes.find((c) => c.id === classId)
      const subjectId = currentClass?.subject_id

      if (!subjectId) {
        setClos([])
        setLessons([])
        setLoading(false)
        return
      }

      const [{ data: closData }, { data: lessonsData }] = await Promise.all([
        supabase
          .from('subject_learning_outcomes')
          .select('id, code, description, bloom_level, difficulty_level, display_order')
          .eq('subject_id', subjectId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('class_lessons')
          .select('id, title, unit_number, lesson_number, class_lesson_clos(clo_id)')
          .eq('class_id', classId)
          .order('unit_number', { ascending: true })
          .order('lesson_number', { ascending: true }),
      ])

      setClos(closData || [])
      setLessons(lessonsData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingClo(null)
    setForm({ code: '', description: '', bloom_level: 'apply', difficulty_level: 'medium' })
  }

  const onEdit = (clo) => {
    setEditingClo(clo)
    setForm({
      code: clo.code || '',
      description: clo.description || '',
      bloom_level: clo.bloom_level || 'apply',
      difficulty_level: clo.difficulty_level || 'medium',
    })
  }

  const saveClo = async () => {
    if (!selectedClass?.subject_id || !form.code.trim() || !form.description.trim()) return

    setSaving(true)
    try {
      if (editingClo?.id) {
        await supabase
          .from('subject_learning_outcomes')
          .update({
            code: form.code.trim(),
            description: form.description.trim(),
            bloom_level: form.bloom_level,
            difficulty_level: form.difficulty_level,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingClo.id)
      } else {
        await supabase
          .from('subject_learning_outcomes')
          .insert({
            subject_id: selectedClass.subject_id,
            code: form.code.trim(),
            description: form.description.trim(),
            bloom_level: form.bloom_level,
            difficulty_level: form.difficulty_level,
            display_order: clos.length + 1,
          })
      }

      resetForm()
      await loadCurriculumData(selectedClassId)
    } catch (err) {
      console.error(err)
      alert(t('common.error', 'Error'))
    } finally {
      setSaving(false)
    }
  }

  const coverageRows = useMemo(() => {
    const totalLessons = lessons.length || 0

    return clos.map((clo) => {
      let linked = 0
      for (const lesson of lessons) {
        const isMapped = (lesson.class_lesson_clos || []).some((x) => x.clo_id === clo.id)
        if (isMapped) linked += 1
      }
      const pct = totalLessons ? Math.round((linked / totalLessons) * 100) : 0
      return { ...clo, linked, pct }
    })
  }, [clos, lessons])

  const matrixRows = useMemo(() => {
    const grouped = {}
    for (const lesson of lessons) {
      if (!grouped[lesson.unit_number]) grouped[lesson.unit_number] = []
      grouped[lesson.unit_number].push(lesson)
    }

    return Object.keys(grouped)
      .map((unitKey) => {
        const unit = Number(unitKey)
        const unitLessons = grouped[unit]
        const cloMap = {}
        for (const clo of clos) {
          cloMap[clo.id] = unitLessons.some((lesson) =>
            (lesson.class_lesson_clos || []).some((m) => m.clo_id === clo.id)
          )
        }
        return { unit, cloMap }
      })
      .sort((a, b) => a.unit - b.unit)
  }, [lessons, clos])

  const uncovered = coverageRows.filter((r) => r.linked === 0)
  const subjectCode = selectedClass?.subjects?.code || '-'

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--bdr)', borderTopColor: 'var(--p)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <>
      <nav className="bc" aria-label={t('instructorPortal.curriculumMap')}>
        <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <Link to="/instructor/courses">{t('instructorPortal.myCourses')}</Link>
        <span className="bc-sep">›</span>
        <span>{t('instructorPortal.curriculumMap')}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t('instructorPortal.curriculumMap')}</h1>
          <p className="ph-sub">{subjectCode} — {t('instructorPortal.curriculumMapSubtitle')}</p>
        </div>
        <div className="ph-acts">
          <select
            className="fc"
            style={{ width: 'auto' }}
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.subjects?.code} - {getLocalizedName(cls.subjects, language === 'ar')} ({t('instructorPortal.section')} {cls.section})
              </option>
            ))}
          </select>
          <Link to={`/instructor/build-lessons?classId=${selectedClassId || ''}`} className="btn btn-p">+ {t('instructorPortal.buildLesson')}</Link>
        </div>
      </div>

      <div className="grid2">
        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.learningOutcomesClos')}</div>
            </div>

            <div className="fg">
              <label className="fl">Code</label>
              <input className="fc" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="CLO-1" />
            </div>
            <div className="fg">
              <label className="fl">{t('common.description', 'Description')}</label>
              <textarea className="fc" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="fr">
              <div className="fg">
                <label className="fl">{t('instructorPortal.bloomLevel')}</label>
                <select className="fc" value={form.bloom_level} onChange={(e) => setForm((p) => ({ ...p, bloom_level: e.target.value }))}>
                  <option value="remember">Remember</option>
                  <option value="understand">Understand</option>
                  <option value="apply">Apply</option>
                  <option value="analyze">Analyze</option>
                  <option value="evaluate">Evaluate</option>
                  <option value="create">Create</option>
                </select>
              </div>
              <div className="fg">
                <label className="fl">{t('instructorPortal.difficulty')}</label>
                <select className="fc" value={form.difficulty_level} onChange={(e) => setForm((p) => ({ ...p, difficulty_level: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button type="button" className="btn btn-p" onClick={saveClo} disabled={saving}>
                {editingClo ? t('common.update', 'Update') : t('common.add', 'Add')}
              </button>
              {editingClo && (
                <button type="button" className="btn btn-gh" onClick={resetForm}>{t('common.cancel', 'Cancel')}</button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clos.map((clo) => (
                <div key={clo.id} style={{ background: 'var(--bg)', borderRadius: 'var(--rs)', padding: 14, borderRight: '3px solid var(--ok)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ok)', background: 'var(--ok-bg)', padding: '2px 8px', borderRadius: 20 }}>
                        {clo.code}
                      </span>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{clo.description}</div>
                    </div>
                    <button type="button" className="btn btn-gh btn-sm" onClick={() => onEdit(clo)}>{t('instructorPortal.edit')}</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                    {t('instructorPortal.bloomLevel')}: {clo.bloom_level} | {t('instructorPortal.difficulty')}: {clo.difficulty_level}
                  </div>
                </div>
              ))}
              {clos.length === 0 && <div style={{ color: 'var(--muted)' }}>{t('instructorPortal.noData', 'No data available')}</div>}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.outcomeCoverageReport')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {coverageRows.map((row) => {
                const fillClass = row.pct >= 70 ? 'ok' : row.pct >= 40 ? 'warn' : 'err'
                return (
                  <div key={row.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{row.code}</span>
                      <span style={{ fontWeight: 700 }}>{row.linked} {t('instructorPortal.assessmentsCount')}</span>
                    </div>
                    <div className="prog-bar">
                      <div className={`prog-fill ${fillClass}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {uncovered.length > 0 && (
              <div className="alert alert-warn" style={{ marginTop: 16 }}>
                ? {uncovered.map((r) => r.code).join(', ')} {t('instructorPortal.clo4NoAssessment')}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.mappingMatrix')}</div>
            </div>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>{t('instructorPortal.unit')}</th>
                    {clos.map((clo) => (
                      <th key={clo.id}>{clo.code}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => (
                    <tr key={row.unit}>
                      <td>{t('instructorPortal.unit')} {row.unit}</td>
                      {clos.map((clo) => (
                        <td key={clo.id} style={{ textAlign: 'center' }}>
                          {row.cloMap[clo.id] ? '?' : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {matrixRows.length === 0 && (
                    <tr>
                      <td colSpan={Math.max(2, clos.length + 1)} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        {t('instructorPortal.noData', 'No data available')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

