import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import '../../styles/instructor-portal.css'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase, SUPABASE_STORAGE_BUCKET } from '../../lib/supabase'

const ELEMENT_TYPES = [
  { key: 'heading', label: 'Heading', icon: 'H' },
  { key: 'paragraph', label: 'Paragraph', icon: 'P' },
  { key: 'code', label: 'Code block', icon: '{ }' },
  { key: 'table', label: 'Table', icon: '▦' },
  { key: 'interactive_order', label: 'Interactive: order steps', icon: '⇅' },
  { key: 'video', label: 'Video', icon: 'VID' },
  { key: 'attachment', label: 'Attachment', icon: 'ATT' },
  { key: 'quiz', label: 'Quiz', icon: 'QZ' },
  { key: 'poll', label: 'Poll', icon: 'POL' },
  { key: 'discussion', label: 'Discussion', icon: 'DIS' },
]

const emptyLesson = {
  title: '',
  unit_number: 1,
  lesson_number: 1,
  estimated_minutes: 45,
  summary: '',
  prerequisite_subject_lesson_id: null,
  force_use_in_sessions: false,
  status: 'draft',
}

function createElement(type) {
  const defaults = (() => {
    if (type === 'heading') return { level: 3, text: '' }
    if (type === 'paragraph') return { text: '' }
    if (type === 'code') return { language: 'python', code: '', caption: '' }
    if (type === 'table') return { headers: [], rows: [] }
    if (type === 'interactive_order') return { prompt: '', items: [], correct_order: [], shuffle: true }
    if (type === 'video') return { url: '', caption: '', duration_minutes: null, start_time: '', end_time: '' }
    if (type === 'attachment') return { file_url: '', file_name: '' }
    if (type === 'quiz' || type === 'poll') return { question: '', options: [] }
    if (type === 'discussion') return { text: '' }
    return {}
  })()
  return {
    id: null,
    tempId: Math.random().toString(36).slice(2),
    element_type: type,
    title: '',
    content: defaults,
  }
}

export default function AdminSubjectLessonBuilder() {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [colleges, setColleges] = useState([])
  const [majors, setMajors] = useState([])
  const [subjects, setSubjects] = useState([])

  const [selectedCollegeId, setSelectedCollegeId] = useState(null)
  const [selectedMajorId, setSelectedMajorId] = useState(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)

  const [clos, setClos] = useState([])
  const [lessons, setLessons] = useState([])
  const [selectedLessonId, setSelectedLessonId] = useState(null)

  const [lessonForm, setLessonForm] = useState(emptyLesson)
  const [selectedCloIds, setSelectedCloIds] = useState([])
  const [elements, setElements] = useState([])
  const [lessonMediaUploadKey, setLessonMediaUploadKey] = useState(null)
  const [tableHeadersDraft, setTableHeadersDraft] = useState({})

  const portalClass = 'instructor-portal lesson-builder-root'
  const listSep = isRTL ? '، ' : ', '
  const splitList = (raw) =>
    String(raw || '')
      .split(/[,،]/g)
      .map((x) => x.trim())
      .filter(Boolean)

  const filteredMajors = useMemo(() => {
    if (!selectedCollegeId) return []
    return (majors || []).filter((m) => m.is_university_wide || Number(m.college_id) === Number(selectedCollegeId))
  }, [majors, selectedCollegeId])

  const filteredSubjects = useMemo(() => {
    if (!selectedCollegeId) return []
    const cid = Number(selectedCollegeId)
    const mid = selectedMajorId != null ? Number(selectedMajorId) : null
    return (subjects || []).filter((s) => {
      const subjectCollegeId = s.college_id != null ? Number(s.college_id) : null
      const inCollege = s.is_university_wide || subjectCollegeId === cid
      if (!inCollege) return false
      // No major filter => show all subjects for the college + university-wide
      if (!Number.isFinite(mid)) return true

      // Major filter => show only subjects relevant to that major.
      // University-wide subjects must also be explicitly linked to the major (direct or via junction).
      const direct = s.major_id != null && Number(s.major_id) === mid
      const viaJunction =
        Array.isArray(s.subject_majors) && s.subject_majors.some((x) => x?.major_id != null && Number(x.major_id) === mid)
      const allMajorsOfCollege = Boolean(s.applies_to_all_majors_of_college) && subjectCollegeId === cid
      // College-wide shared subjects (major_id NULL) should still show for all majors of that college
      const collegeWideNoMajor = s.major_id == null && subjectCollegeId === cid && !s.is_university_wide

      return direct || viaJunction || allMajorsOfCollege || collegeWideNoMajor
    })
  }, [subjects, selectedCollegeId, selectedMajorId])

  const selectedSubject = useMemo(
    () => filteredSubjects.find((s) => s.id === selectedSubjectId) || null,
    [filteredSubjects, selectedSubjectId],
  )

  useEffect(() => {
    loadBootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedCollegeId) {
      setSelectedMajorId(null)
      setSelectedSubjectId(null)
      setClos([])
      setLessons([])
      setSelectedLessonId(null)
      return
    }
    if (selectedMajorId && !filteredMajors.some((m) => m.id === selectedMajorId)) {
      setSelectedMajorId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollegeId])

  useEffect(() => {
    if (!selectedSubjectId) {
      setClos([])
      setLessons([])
      setSelectedLessonId(null)
      return
    }
    loadSubjectData(selectedSubjectId)
  }, [selectedSubjectId])

  useEffect(() => {
    if (!selectedLessonId) {
      setLessonForm(emptyLesson)
      setSelectedCloIds([])
      setElements([])
      return
    }
    loadLesson(selectedLessonId)
  }, [selectedLessonId])

  const loadBootstrap = async () => {
    setLoading(true)
    try {
      const [{ data: collegeRows }, { data: majorRows }, { data: subjectRows }] = await Promise.all([
        supabase.from('colleges').select('id, name_en, name_ar, code').eq('status', 'active').order('name_en'),
        supabase
          .from('majors')
          .select('id, name_en, name_ar, code, college_id, is_university_wide')
          .eq('status', 'active')
          .order('name_en'),
        supabase
          .from('subjects')
          .select('id, code, name_en, name_ar, status, college_id, is_university_wide, major_id, applies_to_all_majors_of_college, subject_majors(major_id)')
          .eq('status', 'active')
          .order('code'),
      ])

      const collegeList = collegeRows || []
      setColleges(collegeList)
      setMajors(majorRows || [])
      setSubjects(subjectRows || [])

      const cidFromQuery = Number(searchParams.get('collegeId'))
      const midFromQueryRaw = searchParams.get('majorId')
      const sidFromQuery = Number(searchParams.get('subjectId'))

      const initialCollegeId = collegeList.find((c) => c.id === cidFromQuery)?.id || collegeList[0]?.id || null
      setSelectedCollegeId(initialCollegeId)

      const initialMajorId =
        midFromQueryRaw != null && midFromQueryRaw !== '' && !Number.isNaN(Number(midFromQueryRaw))
          ? Number(midFromQueryRaw)
          : null
      setSelectedMajorId(initialMajorId)

      // subject selection needs college/filters; set later if it exists
      setSelectedSubjectId(Number.isFinite(sidFromQuery) ? sidFromQuery : null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadSubjectData = async (subjectId) => {
    setLoading(true)
    try {
      const [{ data: closData }, { data: lessonsData }] = await Promise.all([
        supabase
          .from('subject_learning_outcomes')
          .select('id, code, description')
          .eq('subject_id', subjectId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('subject_lessons')
          .select('id, title, unit_number, lesson_number, status')
          .eq('subject_id', subjectId)
          .order('unit_number', { ascending: true })
          .order('lesson_number', { ascending: true }),
      ])

      setClos(closData || [])
      setLessons(lessonsData || [])

      const qLessonId = Number(searchParams.get('subjectLessonId'))
      const initialLesson = (lessonsData || []).find((l) => l.id === qLessonId) || null
      setSelectedLessonId(initialLesson?.id ?? null)
    } catch (e) {
      console.error(e)
      setClos([])
      setLessons([])
      setSelectedLessonId(null)
    } finally {
      setLoading(false)
    }
  }

  const loadLesson = async (subjectLessonId) => {
    setLoading(true)
    try {
      const [{ data: lessonData }, { data: mapData }, { data: elementData }] = await Promise.all([
        supabase
          .from('subject_lessons')
          .select('id, subject_id, title, unit_number, lesson_number, estimated_minutes, summary, prerequisite_subject_lesson_id, force_use_in_sessions, status')
          .eq('id', subjectLessonId)
          .single(),
        supabase.from('subject_lesson_clos').select('clo_id').eq('subject_lesson_id', subjectLessonId),
        supabase
          .from('subject_lesson_elements')
          .select('id, element_type, title, content, display_order')
          .eq('subject_lesson_id', subjectLessonId)
          .order('display_order', { ascending: true }),
      ])

      if (!lessonData) return

      setLessonForm({
        ...emptyLesson,
        ...lessonData,
      })
      setSelectedCloIds((mapData || []).map((m) => m.clo_id))
      setElements((elementData || []).map((e) => ({ ...e, tempId: Math.random().toString(36).slice(2) })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const updateElement = (idx, next) => {
    setElements((prev) => prev.map((el, i) => (i === idx ? { ...el, ...next } : el)))
  }

  const moveElement = (idx, direction) => {
    const to = idx + direction
    if (to < 0 || to >= elements.length) return
    const copy = [...elements]
    const [item] = copy.splice(idx, 1)
    copy.splice(to, 0, item)
    setElements(copy)
  }

  const uploadLessonMedia = async (idx, kind, file) => {
    if (!file || !selectedSubjectId) return
    const key = `${kind}-${idx}`
    setLessonMediaUploadKey(key)
    try {
      const rawExt = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const ext = String(rawExt).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin'
      const path = `lesson_templates/subject_${selectedSubjectId}/${kind}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(path, file)
      if (upErr) throw upErr
      const {
        data: { publicUrl },
      } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path)
      setElements((prev) =>
        prev.map((el, i) => {
          if (i !== idx) return el
          const c = el.content || {}
          if (kind === 'video') return { ...el, content: { ...c, url: publicUrl } }
          return { ...el, content: { ...c, file_url: publicUrl, file_name: file.name } }
        }),
      )
    } catch (e) {
      console.error(e)
      alert(t('common.error', 'Error'))
    } finally {
      setLessonMediaUploadKey(null)
    }
  }

  const saveLesson = async (publish = false) => {
    if (!selectedSubjectId || !lessonForm.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        subject_id: selectedSubjectId,
        title: lessonForm.title.trim(),
        unit_number: Number(lessonForm.unit_number) || 1,
        lesson_number: Number(lessonForm.lesson_number) || 1,
        estimated_minutes: Number(lessonForm.estimated_minutes) || 45,
        summary: lessonForm.summary || null,
        prerequisite_subject_lesson_id: lessonForm.prerequisite_subject_lesson_id || null,
        force_use_in_sessions: Boolean(lessonForm.force_use_in_sessions),
        status: publish ? 'published' : 'draft',
        published_at: publish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }

      let subjectLessonId = selectedLessonId
      if (subjectLessonId) {
        const { error } = await supabase.from('subject_lessons').update(payload).eq('id', subjectLessonId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('subject_lessons').insert(payload).select('id').single()
        if (error) throw error
        subjectLessonId = data.id
        setSelectedLessonId(subjectLessonId)
      }

      await supabase.from('subject_lesson_clos').delete().eq('subject_lesson_id', subjectLessonId)
      if (selectedCloIds.length) {
        const rows = selectedCloIds.map((cloId) => ({ subject_lesson_id: subjectLessonId, clo_id: cloId }))
        const { error } = await supabase.from('subject_lesson_clos').insert(rows)
        if (error) throw error
      }

      await supabase.from('subject_lesson_elements').delete().eq('subject_lesson_id', subjectLessonId)
      if (elements.length) {
        const rows = elements.map((el, index) => ({
          subject_lesson_id: subjectLessonId,
          element_type: el.element_type,
          title: el.title || null,
          content: el.content || {},
          display_order: index,
        }))
        const { error } = await supabase.from('subject_lesson_elements').insert(rows)
        if (error) throw error
      }

      await loadSubjectData(selectedSubjectId)
      await loadLesson(subjectLessonId)

      if (!publish) alert(t('instructorPortal.saveDraft', 'Saved draft'))
      else alert(t('instructorPortal.publishLesson', 'Publish Lesson'))

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (selectedCollegeId) next.set('collegeId', String(selectedCollegeId))
        if (selectedMajorId) next.set('majorId', String(selectedMajorId))
        if (selectedSubjectId) next.set('subjectId', String(selectedSubjectId))
        if (subjectLessonId) next.set('subjectLessonId', String(subjectLessonId))
        return next
      })
    } catch (e) {
      console.error(e)
      alert(e?.message || t('common.error', 'Error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading && !colleges.length) {
    return (
      <div className={portalClass} dir={isRTL ? 'rtl' : 'ltr'}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid var(--bdr)',
              borderTopColor: 'var(--p)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={portalClass} dir={isRTL ? 'rtl' : 'ltr'}>
      <nav className="bc" aria-label={t('navigation.buildLessonsAdmin', 'Build lessons')}>
        <Link to="/dashboard">{t('navigation.dashboard')}</Link>
        <span className="bc-sep">&rsaquo;</span>
        <Link to="/academic/subjects">{t('navigation.subjects', 'Subjects')}</Link>
        <span className="bc-sep">&rsaquo;</span>
        <span>{t('navigation.buildLessonsAdmin', 'Build lessons')}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t('instructorPortal.buildInteractiveLesson', 'Building an Interactive Lesson')}</h1>
          <p className="ph-sub">
            {selectedSubject?.code ? `${selectedSubject.code} — ` : ''}
            {selectedSubject ? getLocalizedName(selectedSubject, language === 'ar') : t('common.select', 'Select')}
          </p>
        </div>
        <div className="ph-acts" style={{ gap: 8 }}>
          <button type="button" className="btn btn-gh" onClick={() => saveLesson(false)} disabled={saving || !selectedSubjectId}>
            {t('instructorPortal.saveDraft', 'Save draft')}
          </button>
          <button type="button" className="btn btn-ok" onClick={() => saveLesson(true)} disabled={saving || !selectedSubjectId}>
            {t('instructorPortal.publishLesson', 'Publish Lesson')}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="fr">
          <div className="fg">
            <label className="fl">{t('navigation.colleges', 'Colleges')}</label>
            <select
              className="fc"
              value={selectedCollegeId || ''}
              onChange={(e) => {
                const nextCollegeId = e.target.value ? Number(e.target.value) : null
                setSelectedCollegeId(nextCollegeId)
                setSelectedMajorId(null)
                setSelectedSubjectId(null)
                setSelectedLessonId(null)
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('collegeId')
                  next.delete('majorId')
                  next.delete('subjectId')
                  next.delete('subjectLessonId')
                  if (nextCollegeId) next.set('collegeId', String(nextCollegeId))
                  return next
                }, { replace: true })
              }}
            >
              <option value="">{t('common.select', 'Select')}</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} - ` : ''}{getLocalizedName(c, language === 'ar')}
                </option>
              ))}
            </select>
          </div>

          <div className="fg">
            <label className="fl">{t('navigation.majors', 'Majors')}</label>
            <select
              className="fc"
              value={selectedMajorId || ''}
              onChange={(e) => {
                const nextMajorId = e.target.value ? Number(e.target.value) : null
                setSelectedMajorId(nextMajorId)
                setSelectedSubjectId(null)
                setSelectedLessonId(null)
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('majorId')
                  next.delete('subjectId')
                  next.delete('subjectLessonId')
                  if (selectedCollegeId) next.set('collegeId', String(selectedCollegeId))
                  if (nextMajorId) next.set('majorId', String(nextMajorId))
                  return next
                }, { replace: true })
              }}
              disabled={!selectedCollegeId}
            >
              <option value="">{t('common.all', 'All')}</option>
              {filteredMajors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code ? `${m.code} - ` : ''}{getLocalizedName(m, language === 'ar')}
                </option>
              ))}
            </select>
          </div>

          <div className="fg">
            <label className="fl">{t('navigation.subjects', 'Subjects')}</label>
            <select
              className="fc"
              value={selectedSubjectId || ''}
              onChange={(e) => {
                const nextSubjectId = e.target.value ? Number(e.target.value) : null
                setSelectedSubjectId(nextSubjectId)
                setSelectedLessonId(null)
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('subjectId')
                  next.delete('subjectLessonId')
                  if (selectedCollegeId) next.set('collegeId', String(selectedCollegeId))
                  if (selectedMajorId) next.set('majorId', String(selectedMajorId))
                  if (nextSubjectId) next.set('subjectId', String(nextSubjectId))
                  return next
                }, { replace: true })
              }}
              disabled={!selectedCollegeId}
            >
              <option value="">{t('common.select', 'Select')}</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {getLocalizedName(s, language === 'ar')}
                </option>
              ))}
            </select>
          </div>

          <div className="fg">
            <label className="fl">{t('instructorPortal.lesson', 'Lesson')}</label>
            <select
              className="fc"
              disabled={!selectedSubjectId}
              value={selectedLessonId || ''}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null
                setSelectedLessonId(v)
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  if (selectedCollegeId) next.set('collegeId', String(selectedCollegeId))
                  if (selectedMajorId) next.set('majorId', String(selectedMajorId))
                  if (selectedSubjectId) next.set('subjectId', String(selectedSubjectId))
                  if (v) next.set('subjectLessonId', String(v))
                  else next.delete('subjectLessonId')
                  return next
                }, { replace: true })
              }}
            >
              <option value="">{t('common.new', 'New')}</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  U{l.unit_number} L{l.lesson_number} - {l.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.lessonInformation', 'Lesson Information')}</div>
            </div>
            <div className="fg">
              <label className="fl" htmlFor="lesson-title">
                <span className="req">*</span>
                {t('instructorPortal.lessonTitle', 'Lesson Title')}
              </label>
              <input
                id="lesson-title"
                type="text"
                className="fc"
                disabled={!selectedSubjectId}
                value={lessonForm.title}
                onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="fr">
              <div className="fg">
                <label className="fl">{t('instructorPortal.unit', 'Unit')}</label>
                <input
                  type="number"
                  className="fc"
                  min={1}
                  disabled={!selectedSubjectId}
                  value={lessonForm.unit_number}
                  onChange={(e) => setLessonForm((p) => ({ ...p, unit_number: Number(e.target.value) || 1 }))}
                />
              </div>
              <div className="fg">
                <label className="fl">{t('instructorPortal.lessonNumber', 'Lesson')}</label>
                <input
                  type="number"
                  className="fc"
                  min={1}
                  disabled={!selectedSubjectId}
                  value={lessonForm.lesson_number}
                  onChange={(e) => setLessonForm((p) => ({ ...p, lesson_number: Number(e.target.value) || 1 }))}
                />
              </div>
              <div className="fg">
                <label className="fl">{t('instructorPortal.estimatedTimeMinutes', 'Estimated minutes')}</label>
                <input
                  type="number"
                  className="fc"
                  min={1}
                  disabled={!selectedSubjectId}
                  value={lessonForm.estimated_minutes}
                  onChange={(e) => setLessonForm((p) => ({ ...p, estimated_minutes: Number(e.target.value) || 45 }))}
                />
              </div>
            </div>
            <div className="fg">
              <label className="fl">{t('common.description', 'Description')}</label>
              <textarea
                className="fc"
                rows={3}
                disabled={!selectedSubjectId}
                value={lessonForm.summary || ''}
                onChange={(e) => setLessonForm((p) => ({ ...p, summary: e.target.value }))}
              />
            </div>
            <div className="fg">
              <label className="fl">{t('instructorPortal.linkToLearningOutcomes', 'Link to learning outcomes')}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {clos.map((clo) => (
                  <label
                    key={clo.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      style={{ accentColor: 'var(--p)' }}
                      disabled={!selectedSubjectId}
                      checked={selectedCloIds.includes(clo.id)}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setSelectedCloIds((prev) => (checked ? [...prev, clo.id] : prev.filter((id) => id !== clo.id)))
                      }}
                    />
                    {clo.code}
                  </label>
                ))}
              </div>
            </div>

            <div className="fg" style={{ marginTop: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ accentColor: 'var(--p)' }}
                  disabled={!selectedSubjectId}
                  checked={Boolean(lessonForm.force_use_in_sessions)}
                  onChange={(e) => setLessonForm((p) => ({ ...p, force_use_in_sessions: e.target.checked }))}
                />
                {t(
                  'admin.subjectLessons.forceUseInSessions',
                  'Force sessions/classes to use this template content (lock instructors from editing)',
                )}
              </label>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.addLessonElement', 'Add lesson element')}</div>
            </div>
            <div className="lb-element-picker">
              {ELEMENT_TYPES.map((el) => (
                <button
                  key={el.key}
                  type="button"
                  className="btn btn-gh btn-bl lb-element-btn"
                  style={{ padding: 14, flexDirection: 'column', gap: 4, height: 'auto' }}
                  disabled={!selectedSubjectId}
                  onClick={() => setElements((prev) => [...prev, createElement(el.key)])}
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
              <div className="card-title">{t('instructorPortal.lessonContent', 'Lesson Content')}</div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.dragToReorder', 'Drag to reorder')}</span>
            </div>

            {elements.map((element, idx) => (
              <div key={element.id || element.tempId} className="lb-block">
                <div className="lb-block-hd">
                  <span className="lb-block-type">
                    {ELEMENT_TYPES.find((x) => x.key === element.element_type)?.icon}{' '}
                    {ELEMENT_TYPES.find((x) => x.key === element.element_type)?.label || element.element_type}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-gh btn-sm" disabled={!selectedSubjectId} onClick={() => moveElement(idx, -1)}>
                      Up
                    </button>
                    <button type="button" className="btn btn-gh btn-sm" disabled={!selectedSubjectId} onClick={() => moveElement(idx, 1)}>
                      Down
                    </button>
                    <button
                      type="button"
                      className="btn btn-err btn-sm"
                      disabled={!selectedSubjectId}
                      onClick={() => setElements((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      {t('instructorPortal.delete', 'Delete')}
                    </button>
                  </div>
                </div>

                {!(element.element_type === 'heading' || element.element_type === 'paragraph') && (
                  <div className="fg" style={{ marginBottom: 8 }}>
                    <label className="fl" style={{ fontSize: 12 }}>
                      {t('common.title', 'Title')}
                    </label>
                    <input
                      className="fc"
                      disabled={!selectedSubjectId}
                      value={element.title || ''}
                      onChange={(e) => updateElement(idx, { title: e.target.value })}
                    />
                  </div>
                )}

                {element.element_type === 'heading' && (
                  <div className="fr">
                    <div className="fg">
                      <label className="fl" style={{ fontSize: 12 }}>
                        Level
                      </label>
                      <select
                        className="fc"
                        disabled={!selectedSubjectId}
                        value={element.content?.level ?? 3}
                        onChange={(e) => updateElement(idx, { content: { ...element.content, level: Number(e.target.value) } })}
                      >
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                        <option value={4}>H4</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label className="fl" style={{ fontSize: 12 }}>
                        {t('common.title', 'Title')}
                      </label>
                      <input
                        className="fc"
                        disabled={!selectedSubjectId}
                        value={element.content?.text || ''}
                        onChange={(e) => updateElement(idx, { content: { ...element.content, text: e.target.value } })}
                      />
                    </div>
                  </div>
                )}

                {element.element_type === 'paragraph' && (
                  <textarea
                    className="fc"
                    rows={4}
                    disabled={!selectedSubjectId}
                    value={element.content?.text || ''}
                    onChange={(e) => updateElement(idx, { content: { ...element.content, text: e.target.value } })}
                  />
                )}

                {element.element_type === 'discussion' && (
                  <textarea
                    className="fc"
                    rows={3}
                    disabled={!selectedSubjectId}
                    value={element.content?.text || ''}
                    onChange={(e) => updateElement(idx, { content: { ...element.content, text: e.target.value } })}
                  />
                )}

                {element.element_type === 'code' && (
                  <>
                    <div className="fr">
                      <div className="fg">
                        <label className="fl" style={{ fontSize: 12 }}>
                          Language
                        </label>
                        <select
                          className="fc"
                          disabled={!selectedSubjectId}
                          value={element.content?.language || 'python'}
                          onChange={(e) => updateElement(idx, { content: { ...element.content, language: e.target.value } })}
                        >
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="typescript">TypeScript</option>
                          <option value="java">Java</option>
                          <option value="csharp">C#</option>
                          <option value="sql">SQL</option>
                          <option value="text">Plain</option>
                        </select>
                      </div>
                      <div className="fg">
                        <label className="fl" style={{ fontSize: 12 }}>
                          Caption (optional)
                        </label>
                        <input
                          className="fc"
                          disabled={!selectedSubjectId}
                          value={element.content?.caption || ''}
                          onChange={(e) => updateElement(idx, { content: { ...element.content, caption: e.target.value } })}
                        />
                      </div>
                    </div>
                    <textarea
                      className="fc"
                      rows={8}
                      style={{ fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' }}
                      disabled={!selectedSubjectId}
                      value={element.content?.code || ''}
                      onChange={(e) => updateElement(idx, { content: { ...element.content, code: e.target.value } })}
                      placeholder="Paste code here..."
                    />
                  </>
                )}

                {element.element_type === 'table' && (
                  <>
                    <div className="fr">
                      <div className="fg">
                        <label className="fl" style={{ fontSize: 12 }}>
                          Caption (optional)
                        </label>
                        <input
                          className="fc"
                          disabled={!selectedSubjectId}
                          value={element.title || ''}
                          onChange={(e) => updateElement(idx, { title: e.target.value })}
                          placeholder="e.g. Time complexity comparison"
                        />
                      </div>
                      <div className="fg">
                        <label className="fl" style={{ fontSize: 12 }}>
                          Columns
                        </label>
                        <input
                          className="fc"
                          disabled={!selectedSubjectId}
                          value={
                            tableHeadersDraft[String(element.id || element.tempId)] ??
                            (element.content?.headers || []).join(listSep)
                          }
                          onChange={(e) => {
                            const raw = e.target.value
                            const draftKey = String(element.id || element.tempId)
                            setTableHeadersDraft((m) => ({ ...(m || {}), [draftKey]: raw }))

                            const headers = splitList(raw)
                            const oldRows = Array.isArray(element.content?.rows) ? element.content.rows : []
                            const nextRows = oldRows.map((r) => {
                              const row = Array.isArray(r) ? r : []
                              const trimmed = row.slice(0, headers.length)
                              while (trimmed.length < headers.length) trimmed.push('')
                              return trimmed
                            })
                            updateElement(idx, { content: { ...element.content, headers, rows: nextRows } })
                          }}
                          onBlur={() => {
                            const draftKey = String(element.id || element.tempId)
                            setTableHeadersDraft((m) => {
                              const next = { ...(m || {}) }
                              delete next[draftKey]
                              return next
                            })
                          }}
                        />
                        <div className="fh">Use comma separated names. Rows below will match the number of columns.</div>
                      </div>
                    </div>
                  </>
                )}

                {element.element_type === 'video' && (
                  <div className="fg" style={{ marginBottom: 0 }}>
                    <label className="fl" style={{ fontSize: 12 }}>
                      {t('instructorPortal.uploadLessonVideo', 'Upload video')}
                    </label>
                    <input
                      type="file"
                      className="fc"
                      accept="video/*"
                      disabled={!selectedSubjectId || lessonMediaUploadKey === `video-${idx}`}
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
                    <label className="fl" style={{ fontSize: 12, marginTop: 10 }}>
                      {t('instructorPortal.orPasteMediaUrl', 'Or paste URL')}
                    </label>
                    <input
                      type="url"
                      className="fc"
                      placeholder="https://"
                      disabled={!selectedSubjectId}
                      value={element.content?.url || ''}
                      onChange={(e) => updateElement(idx, { content: { ...element.content, url: e.target.value } })}
                    />
                  </div>
                )}

                {element.element_type === 'attachment' && (
                  <div className="fg" style={{ marginBottom: 0 }}>
                    <label className="fl" style={{ fontSize: 12 }}>
                      {t('instructorPortal.uploadLessonAttachment', 'Upload attachment')}
                    </label>
                    <input
                      type="file"
                      className="fc"
                      disabled={!selectedSubjectId || lessonMediaUploadKey === `attachment-${idx}`}
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
                    <label className="fl" style={{ fontSize: 12, marginTop: 10 }}>
                      {t('instructorPortal.orPasteMediaUrl', 'Or paste URL')}
                    </label>
                    <input
                      type="url"
                      className="fc"
                      placeholder="https://"
                      disabled={!selectedSubjectId}
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
                      placeholder={t('instructorPortal.questionLabel', 'Question')}
                      disabled={!selectedSubjectId}
                      value={element.content?.question || ''}
                      onChange={(e) => updateElement(idx, { content: { ...element.content, question: e.target.value } })}
                    />
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Options</div>
                        <button
                          type="button"
                          className="btn btn-gh btn-sm"
                          disabled={!selectedSubjectId}
                          onClick={() => {
                            const options = Array.isArray(element.content?.options) ? [...element.content.options] : []
                            options.push('')
                            updateElement(idx, { content: { ...element.content, options } })
                          }}
                        >
                          + Add option
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(Array.isArray(element.content?.options) ? element.content.options : []).map((opt, oi) => (
                          <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ width: 26, textAlign: 'center', fontWeight: 800, color: 'var(--muted)' }}>
                              {oi + 1}
                            </span>
                            <input
                              className="fc"
                              disabled={!selectedSubjectId}
                              value={opt || ''}
                              placeholder={`Option ${oi + 1}`}
                              onChange={(e) => {
                                const options = Array.isArray(element.content?.options) ? [...element.content.options] : []
                                options[oi] = e.target.value
                                updateElement(idx, { content: { ...element.content, options } })
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-err btn-sm"
                              disabled={!selectedSubjectId}
                              onClick={() => {
                                const options = (Array.isArray(element.content?.options) ? element.content.options : []).filter(
                                  (_, x) => x !== oi,
                                )
                                updateElement(idx, { content: { ...element.content, options } })
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {elements.length === 0 && (
              <div style={{ color: 'var(--muted)' }}>{t('instructorPortal.noData', 'No data available')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

