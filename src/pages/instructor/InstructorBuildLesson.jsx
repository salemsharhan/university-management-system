import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase, SUPABASE_STORAGE_BUCKET } from '../../lib/supabase'

const ELEMENT_TYPES = [
  { key: 'text', label: 'Text / Headings', icon: 'TXT' },
  { key: 'video', label: 'Video', icon: 'VID' },
  { key: 'quiz', label: 'Quiz', icon: 'QZ' },
  { key: 'poll', label: 'Poll', icon: 'POL' },
  { key: 'discussion', label: 'Discussion', icon: 'DIS' },
  { key: 'attachment', label: 'Attachment', icon: 'ATT' },
]

const emptyLesson = {
  title: '',
  unit_number: 1,
  lesson_number: 1,
  estimated_minutes: 45,
  summary: '',
  prerequisite_lesson_id: null,
  release_mode: 'scheduled',
  release_at: '',
  release_condition: '',
  status: 'draft',
}

function createElement(type) {
  return {
    id: null,
    tempId: Math.random().toString(36).slice(2),
    element_type: type,
    title: '',
    content: {},
  }
}

/** @param {'instructor'|'admin'} variant — admin: create lessons + metadata; instructor: elements only */
export default function InstructorBuildLesson({ embedded = false, embedClassId = null, variant = 'instructor' } = {}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { language } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAdmin = variant === 'admin'
  const elementsOnly = !isAdmin

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [classes, setClasses] = useState([])
  const [clos, setClos] = useState([])
  const [lessons, setLessons] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [selectedLessonId, setSelectedLessonId] = useState(null)

  const [lessonForm, setLessonForm] = useState(emptyLesson)
  const [selectedCloIds, setSelectedCloIds] = useState([])
  const [elements, setElements] = useState([])
  const [lessonMediaUploadKey, setLessonMediaUploadKey] = useState(null)

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  )

  useEffect(() => {
    if (!user?.email) return
    if (isAdmin) loadAdminClasses()
    else loadInstructorClasses()
  }, [user?.email, isAdmin])

  useEffect(() => {
    if (!selectedClassId) return
    loadClassData(selectedClassId)
  }, [selectedClassId, embedded, searchParams])

  useEffect(() => {
    if (!selectedLessonId) {
      setLessonForm(emptyLesson)
      setSelectedCloIds([])
      setElements([])
      return
    }
    loadLesson(selectedLessonId)
  }, [selectedLessonId])

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

      const { data: cls } = await supabase
        .from('classes')
        .select('id, section, subject_id, subjects(id, code, name_en, name_ar)')
        .eq('instructor_id', instructor.id)
        .eq('status', 'active')
        .order('id', { ascending: false })

      const list = cls || []
      setClasses(list)

      const classIdFromQuery = embedded && embedClassId ? embedClassId : Number(searchParams.get('classId'))
      const initialClassId = list.find((c) => c.id === classIdFromQuery)?.id || list[0]?.id || null
      setSelectedClassId(initialClassId)

      if (!initialClassId) setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const loadAdminClasses = async () => {
    setLoading(true)
    try {
      const { data: cls } = await supabase
        .from('classes')
        .select('id, section, subject_id, subjects(id, code, name_en, name_ar)')
        .eq('status', 'active')
        .order('id', { ascending: false })
        .limit(500)

      const list = cls || []
      setClasses(list)

      const classIdFromQuery = embedded && embedClassId ? embedClassId : Number(searchParams.get('classId'))
      const initialClassId = list.find((c) => c.id === classIdFromQuery)?.id || list[0]?.id || null
      setSelectedClassId(initialClassId)

      if (!initialClassId) setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const loadClassData = async (classId) => {
    try {
      const currentClass = classes.find((c) => c.id === classId)
      if (!currentClass?.subject_id) {
        setClos([])
        setLessons([])
        setLoading(false)
        return
      }

      const [{ data: closData }, { data: lessonsData }] = await Promise.all([
        supabase
          .from('subject_learning_outcomes')
          .select('id, code, description')
          .eq('subject_id', currentClass.subject_id)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('class_lessons')
          .select('id, title, unit_number, lesson_number, status')
          .eq('class_id', classId)
          .order('unit_number', { ascending: true })
          .order('lesson_number', { ascending: true }),
      ])

      setClos(closData || [])
      setLessons(lessonsData || [])

      const rawLesson = searchParams.get('lessonId')
      const lessonIdFromQuery =
        rawLesson != null && rawLesson !== '' && !Number.isNaN(Number(rawLesson)) ? Number(rawLesson) : null
      const nextLesson = lessonIdFromQuery != null ? (lessonsData || []).find((l) => l.id === lessonIdFromQuery) : null
      setSelectedLessonId(nextLesson?.id ?? null)

      if (lessonIdFromQuery != null && !nextLesson && !embedded) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('lessonId')
          return next
        }, { replace: true })
      }

      if (!nextLesson) {
        setLessonForm(emptyLesson)
        setSelectedCloIds([])
        setElements([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadLesson = async (lessonId) => {
    try {
      const [{ data: lessonData }, { data: mapData }, { data: elementData }] = await Promise.all([
        supabase
          .from('class_lessons')
          .select('id, title, unit_number, lesson_number, estimated_minutes, summary, prerequisite_lesson_id, release_mode, release_at, release_condition, status')
          .eq('id', lessonId)
          .single(),
        supabase
          .from('class_lesson_clos')
          .select('clo_id')
          .eq('lesson_id', lessonId),
        supabase
          .from('class_lesson_elements')
          .select('id, element_type, title, content, display_order')
          .eq('lesson_id', lessonId)
          .order('display_order', { ascending: true }),
      ])

      if (!lessonData) return

      setLessonForm({
        ...emptyLesson,
        ...lessonData,
        release_at: lessonData.release_at ? lessonData.release_at.slice(0, 16) : '',
      })
      setSelectedCloIds((mapData || []).map((m) => m.clo_id))
      setElements((elementData || []).map((e) => ({ ...e, tempId: Math.random().toString(36).slice(2) })))
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddElement = (type) => {
    if (elementsOnly && !selectedLessonId) return
    setElements((prev) => [...prev, createElement(type)])
  }

  const moveElement = (idx, direction) => {
    const to = idx + direction
    if (to < 0 || to >= elements.length) return
    const copy = [...elements]
    const [item] = copy.splice(idx, 1)
    copy.splice(to, 0, item)
    setElements(copy)
  }

  const updateElement = (idx, next) => {
    setElements((prev) => prev.map((el, i) => (i === idx ? { ...el, ...next } : el)))
  }

  const uploadLessonMedia = async (idx, kind, file) => {
    if (!file || !selectedClass?.id) return
    const key = `${kind}-${idx}`
    setLessonMediaUploadKey(key)
    try {
      const rawExt = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const ext = String(rawExt).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin'
      const path = `lessons/class_${selectedClass.id}/${kind}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(path, file)
      if (upErr) throw upErr
      const {
        data: { publicUrl },
      } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path)
      setElements((prev) =>
        prev.map((el, i) => {
          if (i !== idx) return el
          const c = el.content || {}
          if (kind === 'video') {
            return { ...el, content: { ...c, url: publicUrl } }
          }
          return { ...el, content: { ...c, file_url: publicUrl, file_name: file.name } }
        })
      )
    } catch (err) {
      console.error(err)
      alert(t('instructorPortal.lessonMediaUploadFailed', 'Upload failed'))
    } finally {
      setLessonMediaUploadKey(null)
    }
  }

  const saveLessonElementsOnly = async () => {
    if (!selectedClass || !selectedLessonId) return

    setSaving(true)
    try {
      await supabase.from('class_lesson_elements').delete().eq('lesson_id', selectedLessonId)
      if (elements.length) {
        const rows = elements.map((el, index) => ({
          lesson_id: selectedLessonId,
          element_type: el.element_type,
          title: el.title || null,
          content: el.content || {},
          display_order: index,
        }))
        const { error } = await supabase.from('class_lesson_elements').insert(rows)
        if (error) throw error
      }
      await supabase
        .from('class_lessons')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedLessonId)
      await loadLesson(selectedLessonId)
      alert(t('instructorPortal.saveLessonContentDone', 'Lesson content saved.'))
    } catch (err) {
      console.error(err)
      alert(t('common.error', 'Error'))
    } finally {
      setSaving(false)
    }
  }

  const saveLesson = async (publish = false) => {
    if (elementsOnly) return
    if (!selectedClass || !lessonForm.title.trim()) return

    setSaving(true)
    try {
      const payload = {
        class_id: selectedClass.id,
        subject_id: selectedClass.subject_id,
        title: lessonForm.title.trim(),
        unit_number: Number(lessonForm.unit_number) || 1,
        lesson_number: Number(lessonForm.lesson_number) || 1,
        estimated_minutes: Number(lessonForm.estimated_minutes) || 45,
        summary: lessonForm.summary || null,
        prerequisite_lesson_id: lessonForm.prerequisite_lesson_id || null,
        release_mode: lessonForm.release_mode || 'scheduled',
        release_at: lessonForm.release_at ? new Date(lessonForm.release_at).toISOString() : null,
        release_condition: lessonForm.release_condition || null,
        status: publish ? 'published' : 'draft',
        published_at: publish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }

      let lessonId = selectedLessonId

      if (lessonId) {
        const { error } = await supabase.from('class_lessons').update(payload).eq('id', lessonId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('class_lessons')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        lessonId = data.id
        setSelectedLessonId(lessonId)
        if (!embedded) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('classId', String(selectedClass.id))
            next.set('lessonId', String(lessonId))
            return next
          }, { replace: true })
        }
      }

      await supabase.from('class_lesson_clos').delete().eq('lesson_id', lessonId)
      if (selectedCloIds.length) {
        const rows = selectedCloIds.map((cloId) => ({ lesson_id: lessonId, clo_id: cloId }))
        await supabase.from('class_lesson_clos').insert(rows)
      }

      await supabase.from('class_lesson_elements').delete().eq('lesson_id', lessonId)
      if (elements.length) {
        const rows = elements.map((el, index) => ({
          lesson_id: lessonId,
          element_type: el.element_type,
          title: el.title || null,
          content: el.content || {},
          display_order: index,
        }))
        await supabase.from('class_lesson_elements').insert(rows)
      }

      await loadClassData(selectedClass.id)
      await loadLesson(lessonId)
      alert(publish ? t('instructorPortal.publishLesson') : t('instructorPortal.saveDraft'))
    } catch (err) {
      console.error(err)
      alert(t('common.error', 'Error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--bdr)', borderTopColor: 'var(--p)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <>
      {!embedded && (
        <>
          <nav className="bc" aria-label={t('instructorPortal.curriculumMap')}>
            <Link to="/dashboard">{t('navigation.dashboard')}</Link>
            <span className="bc-sep">&rsaquo;</span>
            {isAdmin ? (
              <>
                <Link to="/admin/colleges">{t('navigation.colleges')}</Link>
                <span className="bc-sep">&rsaquo;</span>
              </>
            ) : (
              <>
                <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
                <span className="bc-sep">&rsaquo;</span>
                <Link to="/instructor/courses">{t('instructorPortal.myCourses')}</Link>
                <span className="bc-sep">&rsaquo;</span>
              </>
            )}
            <span>{isAdmin ? t('navigation.buildLessonsAdmin') : t('instructorPortal.lessonContentOnlyTitle')}</span>
          </nav>

          <div className="ph">
            <div>
              <h1>{isAdmin ? t('instructorPortal.buildInteractiveLesson') : t('instructorPortal.lessonContentOnlyTitle')}</h1>
              <p className="ph-sub">
                {isAdmin ? (
                  <>
                    {selectedClass?.subjects?.code || '-'} -{' '}
                    {t('instructorPortal.unitLessonSubtitle', {
                      unit: lessonForm.unit_number || 1,
                      lesson: lessonForm.lesson_number || 1,
                      title: lessonForm.title || '',
                    })}
                  </>
                ) : (
                  t('instructorPortal.lessonContentOnlySubtitle')
                )}
              </p>
            </div>
            <div className="ph-acts" style={{ gap: 8 }}>
              {isAdmin && (
                <>
                  <span
                    data-status={lessonForm.status === 'published' ? 'active' : 'draft'}
                    className="badge"
                    style={{ fontSize: 13, padding: '6px 14px' }}
                  >
                    {lessonForm.status === 'published' ? t('instructorPortal.badgeActive') : t('instructorPortal.draft')}
                  </span>
                  <Link
                    to={`/instructor/lesson-preview?classId=${selectedClassId || ''}&lessonId=${selectedLessonId || ''}`}
                    className="btn btn-gh"
                  >
                    {t('instructorPortal.preview')}
                  </Link>
                  <button type="button" className="btn btn-ok" onClick={() => saveLesson(true)} disabled={saving}>
                    {t('instructorPortal.publishLesson')}
                  </button>
                </>
              )}
              {elementsOnly && (
                <>
                  <Link
                    to={`/instructor/lesson-preview?classId=${selectedClassId || ''}&lessonId=${selectedLessonId || ''}`}
                    className={`btn btn-gh${!selectedLessonId ? ' disabled' : ''}`}
                    style={!selectedLessonId ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
                  >
                    {t('instructorPortal.preview')}
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ok"
                    onClick={() => saveLessonElementsOnly()}
                    disabled={saving || !selectedLessonId}
                  >
                    {t('instructorPortal.saveLessonContent')}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {embedded && (
        <div className="ph" style={{ marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20 }}>{t('instructorPortal.lessonContentOnlyTitle')}</h1>
            <p className="ph-sub">
              {selectedClass?.subjects?.code || '-'} — {t('instructorPortal.section')}{' '}
              {selectedClass?.section}
            </p>
          </div>
          <div className="ph-acts" style={{ gap: 8 }}>
            {selectedLessonId && (
              <span
                data-status={lessonForm.status === 'published' ? 'active' : 'draft'}
                className="badge"
                style={{ fontSize: 13, padding: '6px 14px' }}
              >
                {lessonForm.status === 'published' ? t('instructorPortal.badgeActive') : t('instructorPortal.draft')}
              </span>
            )}
            <Link
              to={`/instructor/lesson-preview?classId=${selectedClassId || ''}&lessonId=${selectedLessonId || ''}`}
              className={`btn btn-gh${!selectedLessonId ? ' disabled' : ''}`}
              style={!selectedLessonId ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
            >
              {t('instructorPortal.preview')}
            </Link>
            <button
              type="button"
              className="btn btn-ok"
              onClick={() => saveLessonElementsOnly()}
              disabled={saving || !selectedLessonId}
            >
              {t('instructorPortal.saveLessonContent')}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="fr">
          <div className="fg">
            <label className="fl">{t('instructorPortal.courseName')}</label>
            <select
              className="fc"
              value={selectedClassId || ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                setSelectedClassId(id)
                if (!embedded) {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('classId', String(id))
                    next.delete('lessonId')
                    return next
                  }, { replace: true })
                }
              }}
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.subjects?.code} - {getLocalizedName(cls.subjects, language === 'ar')} ({t('instructorPortal.section')} {cls.section})
                </option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label className="fl">{t('instructorPortal.lesson', 'Lesson')}</label>
            <select
              className="fc"
              value={selectedLessonId || ''}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null
                setSelectedLessonId(v)
                if (!embedded) {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('classId', String(selectedClassId))
                    if (v) next.set('lessonId', String(v))
                    else next.delete('lessonId')
                    return next
                  }, { replace: true })
                }
              }}
            >
              {isAdmin ? (
                <option value="">{t('common.new', 'New')}</option>
              ) : (
                <option value="">{t('instructorPortal.selectLessonPlaceholder')}</option>
              )}
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  U{l.unit_number} L{l.lesson_number} - {l.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {elementsOnly && lessons.length === 0 && selectedClassId && (
        <div className="card" style={{ marginBottom: 16, color: 'var(--muted)' }}>
          {t('instructorPortal.noLessonsContactAdmin')}
        </div>
      )}

      {elementsOnly && !selectedLessonId && lessons.length > 0 && (
        <div className="card" style={{ marginBottom: 16, color: 'var(--muted)' }}>
          {t('instructorPortal.selectLessonToEditElements')}
        </div>
      )}

      <div className="grid2" style={{ alignItems: 'flex-start' }}>
        <div>
          {isAdmin && (
          <div className="card">
            <div className="card-hd"><div className="card-title">{t('instructorPortal.lessonInformation')}</div></div>
            <div className="fg">
              <label className="fl" htmlFor="lesson-title"><span className="req">*</span>{t('instructorPortal.lessonTitle')}</label>
              <input id="lesson-title" type="text" className="fc" value={lessonForm.title} onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="fr">
              <div className="fg">
                <label className="fl">{t('instructorPortal.unit')}</label>
                <input type="number" className="fc" min={1} value={lessonForm.unit_number} onChange={(e) => setLessonForm((p) => ({ ...p, unit_number: Number(e.target.value) || 1 }))} />
              </div>
              <div className="fg">
                <label className="fl">{t('instructorPortal.lessonNumber')}</label>
                <input type="number" className="fc" min={1} value={lessonForm.lesson_number} onChange={(e) => setLessonForm((p) => ({ ...p, lesson_number: Number(e.target.value) || 1 }))} />
              </div>
              <div className="fg">
                <label className="fl">{t('instructorPortal.estimatedTimeMinutes')}</label>
                <input type="number" className="fc" min={1} value={lessonForm.estimated_minutes} onChange={(e) => setLessonForm((p) => ({ ...p, estimated_minutes: Number(e.target.value) || 45 }))} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">{t('common.description', 'Description')}</label>
              <textarea className="fc" rows={3} value={lessonForm.summary || ''} onChange={(e) => setLessonForm((p) => ({ ...p, summary: e.target.value }))} />
            </div>
            <div className="fr">
              <div className="fg">
                <label className="fl">{t('instructorPortal.prerequisiteCondition')}</label>
                <select className="fc" value={lessonForm.prerequisite_lesson_id || ''} onChange={(e) => setLessonForm((p) => ({ ...p, prerequisite_lesson_id: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">{t('instructorPortal.noCondition')}</option>
                  {lessons.filter((l) => l.id !== selectedLessonId).map((l) => (
                    <option key={l.id} value={l.id}>U{l.unit_number} L{l.lesson_number} - {l.title}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="fl">{t('instructorPortal.releaseMode', 'Release Mode')}</label>
                <select className="fc" value={lessonForm.release_mode} onChange={(e) => setLessonForm((p) => ({ ...p, release_mode: e.target.value }))}>
                  <option value="immediate">Immediate</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="conditional">Conditional</option>
                </select>
              </div>
            </div>
            {lessonForm.release_mode === 'scheduled' && (
              <div className="fg">
                <label className="fl">{t('instructorPortal.releaseDate', 'Release Date')}</label>
                <input type="datetime-local" className="fc" value={lessonForm.release_at || ''} onChange={(e) => setLessonForm((p) => ({ ...p, release_at: e.target.value }))} />
              </div>
            )}
            {lessonForm.release_mode === 'conditional' && (
              <div className="fg">
                <label className="fl">{t('instructorPortal.condition', 'Condition')}</label>
                <input className="fc" value={lessonForm.release_condition || ''} onChange={(e) => setLessonForm((p) => ({ ...p, release_condition: e.target.value }))} />
              </div>
            )}
            <div className="fg">
              <label className="fl">{t('instructorPortal.linkToLearningOutcomes')}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {clos.map((clo) => (
                  <label key={clo.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: 'var(--p)' }}
                      checked={selectedCloIds.includes(clo.id)}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setSelectedCloIds((prev) => checked ? [...prev, clo.id] : prev.filter((id) => id !== clo.id))
                      }}
                    />
                    {clo.code}
                  </label>
                ))}
              </div>
            </div>
          </div>
          )}

          <div className="card">
            <div className="card-hd"><div className="card-title">{t('instructorPortal.addLessonElement')}</div></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ELEMENT_TYPES.map((el) => (
                <button
                  key={el.key}
                  type="button"
                  className="btn btn-gh btn-bl"
                  style={{ padding: 14, flexDirection: 'column', gap: 4, height: 'auto' }}
                  disabled={elementsOnly && !selectedLessonId}
                  onClick={() => handleAddElement(el.key)}
                >
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{el.icon}</span>
                  <span style={{ fontSize: 13 }}>{el.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.lessonContent')}</div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.dragToReorder')}</span>
            </div>

            {elements.map((element, idx) => (
              <div key={element.id || element.tempId} className="lb-block">
                <div className="lb-block-hd">
                  <span className="lb-block-type">{ELEMENT_TYPES.find((x) => x.key === element.element_type)?.icon} {element.element_type}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-gh btn-sm" onClick={() => moveElement(idx, -1)}>Up</button>
                    <button type="button" className="btn btn-gh btn-sm" onClick={() => moveElement(idx, 1)}>Down</button>
                    <button type="button" className="btn btn-err btn-sm" onClick={() => setElements((prev) => prev.filter((_, i) => i !== idx))}>{t('instructorPortal.delete')}</button>
                  </div>
                </div>

                <div className="fg" style={{ marginBottom: 8 }}>
                  <label className="fl" style={{ fontSize: 12 }}>{t('common.title', 'Title')}</label>
                  <input className="fc" value={element.title || ''} onChange={(e) => updateElement(idx, { title: e.target.value })} />
                </div>

                {(element.element_type === 'text' || element.element_type === 'discussion') && (
                  <textarea
                    className="fc"
                    rows={3}
                    value={element.content?.text || ''}
                    onChange={(e) => updateElement(idx, { content: { ...element.content, text: e.target.value } })}
                  />
                )}

                {element.element_type === 'video' && (
                  <div className="fg" style={{ marginBottom: 0 }}>
                    <label className="fl" style={{ fontSize: 12 }}>{t('instructorPortal.uploadLessonVideo')}</label>
                    <input
                      type="file"
                      className="fc"
                      accept="video/*"
                      disabled={lessonMediaUploadKey === `video-${idx}`}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (f) uploadLessonMedia(idx, 'video', f)
                      }}
                    />
                    {element.content?.url && (
                      <div style={{ fontSize: 12, marginTop: 6, wordBreak: 'break-all', color: 'var(--muted)' }}>
                        {element.content.url}
                      </div>
                    )}
                    <label className="fl" style={{ fontSize: 12, marginTop: 10 }}>{t('instructorPortal.orPasteMediaUrl')}</label>
                    <input
                      type="url"
                      className="fc"
                      placeholder="https://"
                      value={element.content?.url || ''}
                      onChange={(e) => updateElement(idx, { content: { ...element.content, url: e.target.value } })}
                    />
                  </div>
                )}

                {element.element_type === 'attachment' && (
                  <div className="fg" style={{ marginBottom: 0 }}>
                    <label className="fl" style={{ fontSize: 12 }}>{t('instructorPortal.uploadLessonAttachment')}</label>
                    <input
                      type="file"
                      className="fc"
                      disabled={lessonMediaUploadKey === `attachment-${idx}`}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (f) uploadLessonMedia(idx, 'attachment', f)
                      }}
                    />
                    {(element.content?.file_url || element.content?.file_name) && (
                      <div style={{ fontSize: 12, marginTop: 6, wordBreak: 'break-all', color: 'var(--muted)' }}>
                        {element.content?.file_name || element.content?.file_url}
                      </div>
                    )}
                    <label className="fl" style={{ fontSize: 12, marginTop: 10 }}>{t('instructorPortal.orPasteMediaUrl')}</label>
                    <input
                      type="url"
                      className="fc"
                      placeholder="https://"
                      value={element.content?.file_url || ''}
                      onChange={(e) =>
                        updateElement(idx, { content: { ...element.content, file_url: e.target.value, file_name: '' } })
                      }
                    />
                  </div>
                )}

                {(element.element_type === 'quiz' || element.element_type === 'poll') && (
                  <>
                    <input
                      className="fc"
                      placeholder={t('instructorPortal.questionLabel')}
                      value={element.content?.question || ''}
                      onChange={(e) => updateElement(idx, { content: { ...element.content, question: e.target.value } })}
                    />
                    <textarea
                      className="fc"
                      rows={3}
                      style={{ marginTop: 8 }}
                      placeholder="Option 1\nOption 2\nOption 3"
                      value={(element.content?.options || []).join('\n')}
                      onChange={(e) => updateElement(idx, { content: { ...element.content, options: e.target.value.split('\n').filter(Boolean) } })}
                    />
                  </>
                )}
              </div>
            ))}

            {elements.length === 0 && <div style={{ color: 'var(--muted)' }}>{t('instructorPortal.noData', 'No data available')}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {isAdmin ? (
                <>
                  <button type="button" className="btn btn-gh" onClick={() => saveLesson(false)} disabled={saving}>
                    {t('instructorPortal.saveDraft')}
                  </button>
                  <Link to={`/instructor/lesson-preview?classId=${selectedClassId || ''}&lessonId=${selectedLessonId || ''}`} className="btn btn-out">
                    {t('instructorPortal.preview')}
                  </Link>
                  <button type="button" className="btn btn-ok" onClick={() => saveLesson(true)} disabled={saving}>
                    {t('instructorPortal.publishLesson')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-ok"
                    onClick={() => saveLessonElementsOnly()}
                    disabled={saving || !selectedLessonId}
                  >
                    {t('instructorPortal.saveLessonContent')}
                  </button>
                  <Link
                    to={`/instructor/lesson-preview?classId=${selectedClassId || ''}&lessonId=${selectedLessonId || ''}`}
                    className={`btn btn-out${!selectedLessonId ? ' disabled' : ''}`}
                    style={!selectedLessonId ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
                  >
                    {t('instructorPortal.preview')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
