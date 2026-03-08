import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'

const emptyQuestion = {
  question_type: 'multiple_choice',
  difficulty_level: 3,
  bloom_level: 'understand',
  unit_number: 1,
  estimated_marks: 1,
  question_text: '',
  options_text: 'Option 1\nOption 2\nOption 3\nOption 4',
  correct_answers_text: '0',
  tags_text: '',
}

const QUESTION_TYPES = [
  { value: '', key: 'allTypes' },
  { value: 'multiple_choice', key: 'multipleChoice' },
  { value: 'true_false', key: 'trueFalse' },
  { value: 'matching', key: 'matching' },
  { value: 'order', key: 'order' },
  { value: 'fill_blank', key: 'fillBlank' },
  { value: 'short_answer', key: 'shortAnswer' },
  { value: 'essay', key: 'essay' },
  { value: 'numeric', key: 'numeric' },
  { value: 'file_upload', key: 'fileUpload' },
]

const DIFFICULTY_OPTIONS = [
  { value: '', key: 'allTypes' },
  { value: '1', key: 'difficulty1' },
  { value: '2', key: 'difficulty2' },
  { value: '3', key: 'difficulty3' },
  { value: '4', key: 'difficulty4' },
  { value: '5', key: 'difficulty5' },
]

const BLOOM_OPTIONS = [
  { value: '', key: 'allTypes' },
  { value: 'remember', key: 'bloomRemember' },
  { value: 'understand', key: 'bloomUnderstand' },
  { value: 'apply', key: 'bloomApply' },
  { value: 'analyze', key: 'bloomAnalyze' },
  { value: 'evaluate', key: 'bloomEvaluate' },
  { value: 'create', key: 'bloomCreate' },
]

function parseOptions(text) {
  return text.split('\n').map((x) => x.trim()).filter(Boolean)
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value
  return []
}

function getTypeLabel(t, type) {
  const map = {
    multiple_choice: 'multipleChoice',
    true_false: 'trueFalse',
    essay: 'essay',
    short_answer: 'shortAnswer',
    matching: 'matching',
    order: 'order',
    fill_blank: 'fillBlank',
    numeric: 'numeric',
    file_upload: 'fileUpload',
  }
  return t(`instructorPortal.${map[type] || 'multipleChoice'}`)
}

function getBloomLabel(t, bloom) {
  const map = {
    remember: 'bloomRemember',
    understand: 'bloomUnderstand',
    apply: 'bloomApply',
    analyze: 'bloomAnalyze',
    evaluate: 'bloomEvaluate',
    create: 'bloomCreate',
  }
  return t(`instructorPortal.${map[bloom] || 'bloomUnderstand'}`)
}

export default function InstructorQuestionBank() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { language } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [platformUserId, setPlatformUserId] = useState(null)
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyQuestion)
  const [typeFilter, setTypeFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [bloomFilter, setBloomFilter] = useState('')
  const [showForm, setShowForm] = useState(false)

  const selectedClass = useMemo(() => classes.find((c) => c.id === selectedClassId) || null, [classes, selectedClassId])
  const subjectCode = selectedClass?.subjects?.code || 'ENG101'

  const stats = useMemo(() => {
    const total = questions.length
    const mcq = questions.filter((q) => q.question_type === 'multiple_choice').length
    const essay = questions.filter((q) => q.question_type === 'essay' || q.question_type === 'short_answer').length
    const other = total - mcq - essay
    const pctMcq = total ? Math.round((mcq / total) * 100) : 0
    const pctEssay = total ? Math.round((essay / total) * 100) : 0
    const pctOther = total ? Math.round((other / total) * 100) : 0
    return { total, mcq, essay, other, pctMcq, pctEssay, pctOther }
  }, [questions])

  useEffect(() => {
    if (!user?.email) return
    initialize()
  }, [user?.email])

  useEffect(() => {
    if (!selectedClassId || !classes.length) return
    loadQuestions(selectedClassId)
  }, [selectedClassId, classes, typeFilter, difficultyFilter, bloomFilter])

  const initialize = async () => {
    setLoading(true)
    try {
      const [{ data: instructor }, { data: userRow }] = await Promise.all([
        supabase.from('instructors').select('id').eq('email', user.email).eq('status', 'active').single(),
        supabase.from('users').select('id').eq('email', user.email).maybeSingle(),
      ])

      setPlatformUserId(userRow?.id || null)

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

      const queryClassId = Number(searchParams.get('classId'))
      const classId = list.find((c) => c.id === queryClassId)?.id || list[0]?.id || null
      setSelectedClassId(classId)
      if (!classId) setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const loadQuestions = async (classId) => {
    setLoading(true)
    try {
      const classObj = classes.find((c) => c.id === classId)
      if (!classObj?.subject_id) {
        setQuestions([])
        return
      }

      let query = supabase
        .from('subject_question_bank')
        .select('*')
        .eq('subject_id', classObj.subject_id)
        .eq('is_active', true)
        .order('id', { ascending: false })

      if (typeFilter) query = query.eq('question_type', typeFilter)
      if (difficultyFilter) query = query.eq('difficulty_level', Number(difficultyFilter))
      if (bloomFilter) query = query.eq('bloom_level', bloomFilter)

      const { data } = await query
      setQuestions(data || [])

      const next = new URLSearchParams(searchParams)
      next.set('classId', String(classId))
      setSearchParams(next)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyQuestion)
    setShowForm(false)
  }

  const saveQuestion = async () => {
    if (!selectedClass || !platformUserId || !form.question_text.trim()) return

    setSaving(true)
    try {
      const payload = {
        subject_id: selectedClass.subject_id,
        class_id: selectedClass.id,
        question_type: form.question_type,
        difficulty_level: Number(form.difficulty_level || 3),
        bloom_level: form.bloom_level,
        unit_number: Number(form.unit_number || 1),
        estimated_marks: Number(form.estimated_marks || 1),
        question_text: form.question_text.trim(),
        options: parseOptions(form.options_text),
        correct_answers: parseOptions(form.correct_answers_text).map((x) => Number(x)).filter((x) => !Number.isNaN(x)),
        tags: parseOptions(form.tags_text),
        updated_at: new Date().toISOString(),
      }

      if (editingId) {
        await supabase.from('subject_question_bank').update(payload).eq('id', editingId)
      } else {
        await supabase.from('subject_question_bank').insert({ ...payload, created_by: platformUserId })
      }

      resetForm()
      await loadQuestions(selectedClass.id)
    } catch (err) {
      console.error(err)
      alert(t('common.error', 'Error'))
    } finally {
      setSaving(false)
    }
  }

  const editQuestion = (q) => {
    setShowForm(true)
    setEditingId(q.id)
    setForm({
      question_type: q.question_type || 'multiple_choice',
      difficulty_level: q.difficulty_level || 3,
      bloom_level: q.bloom_level || 'understand',
      unit_number: q.unit_number || 1,
      estimated_marks: q.estimated_marks || 1,
      question_text: q.question_text || '',
      options_text: parseJsonArray(q.options).join('\n'),
      correct_answers_text: parseJsonArray(q.correct_answers).join('\n'),
      tags_text: (q.tags || []).join('\n'),
    })
  }

  const copyQuestion = (q) => {
    setEditingId(null)
    setForm({
      question_type: q.question_type || 'multiple_choice',
      difficulty_level: q.difficulty_level || 3,
      bloom_level: q.bloom_level || 'understand',
      unit_number: q.unit_number || 1,
      estimated_marks: q.estimated_marks || 1,
      question_text: q.question_text || '',
      options_text: parseJsonArray(q.options).join('\n'),
      correct_answers_text: parseJsonArray(q.correct_answers).join('\n'),
      tags_text: (q.tags || []).join('\n'),
    })
  }

  const deleteQuestion = async (id) => {
    if (!confirm(t('instructorPortal.deleteQuestion') + '?')) return
    await supabase.from('subject_question_bank').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (selectedClassId) loadQuestions(selectedClassId)
  }

  if (loading && !selectedClass) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--bdr)', borderTopColor: 'var(--p)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <>
      <nav className="bc" aria-label={t('instructorPortal.dashboard')}>
        <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <Link to={`/instructor/assessments?classId=${selectedClassId || ''}`}>{subjectCode}</Link>
        <span className="bc-sep">›</span>
        <span>{t('instructorPortal.questionBankTitle')}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t('instructorPortal.questionBankTitle')} — {subjectCode}</h1>
          <p className="ph-sub">{t('instructorPortal.questionBankSubtitle', { code: subjectCode })}</p>
        </div>
        <div className="ph-acts">
          <select
            className="fc"
            style={{ width: 'auto' }}
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(Number(e.target.value))}
            aria-label={t('instructorPortal.questionType')}
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.subjects?.code} — {getLocalizedName(cls.subjects, language === 'ar')} ({t('instructorPortal.section')} {cls.section})
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-gh">
            📥 {t('instructorPortal.importQuestions')}
          </button>
          <button type="button" className="btn btn-p" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyQuestion); setTimeout(() => document.getElementById('qb-form-card')?.scrollIntoView?.({ behavior: 'smooth' }), 100) }}>
            + {t('instructorPortal.newQuestion')}
          </button>
        </div>
      </div>

      <div className="sg">
        <div className="sc acc">
          <div className="sc-lbl">{t('instructorPortal.totalQuestionsInCourse')}</div>
          <div className="sc-val" data-field="total_questions">{stats.total}</div>
          <div className="sc-sub">{t('instructorPortal.inThisCourse')}</div>
        </div>
        <div className="sc ok">
          <div className="sc-lbl">{t('instructorPortal.multipleChoice')}</div>
          <div className="sc-val">{stats.mcq}</div>
          <div className="sc-sub">{stats.pctMcq}%</div>
        </div>
        <div className="sc info">
          <div className="sc-lbl">{t('instructorPortal.essay')} / {t('instructorPortal.shortAnswer')}</div>
          <div className="sc-val">{stats.essay}</div>
          <div className="sc-sub">{stats.pctEssay}%</div>
        </div>
        <div className="sc warn">
          <div className="sc-lbl">{t('instructorPortal.allTypes')}</div>
          <div className="sc-val">{stats.other}</div>
          <div className="sc-sub">{stats.pctOther}%</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">🔍 {t('instructorPortal.filterAndSearch')}</div>
        </div>
        <div className="fr3">
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">{t('instructorPortal.questionType')}</label>
            <select className="fc" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} data-field="question_type_filter">
              {QUESTION_TYPES.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{t(`instructorPortal.${opt.key}`)}</option>
              ))}
            </select>
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">{t('instructorPortal.difficultyLevel')}</label>
            <select className="fc" value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} data-field="difficulty_filter">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{t(`instructorPortal.${opt.key}`)}</option>
              ))}
            </select>
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">{t('instructorPortal.bloomLevel')}</label>
            <select className="fc" value={bloomFilter} onChange={(e) => setBloomFilter(e.target.value)} data-field="bloom_filter">
              {BLOOM_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{t(`instructorPortal.${opt.key}`)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {(showForm || editingId) && (
        <div id="qb-form-card" className="card" style={{ marginBottom: 24 }}>
          <div className="card-hd">
            <div className="card-title">{editingId ? t('instructorPortal.edit') : '+'} {t('instructorPortal.newQuestion')}</div>
          </div>
          <div className="fg">
            <label className="fl">{t('instructorPortal.questionLabel')}</label>
            <textarea className="fc" rows={3} value={form.question_text} onChange={(e) => setForm((p) => ({ ...p, question_text: e.target.value }))} placeholder={t('instructorPortal.optionFocus')} />
          </div>
          <div className="fr">
            <div className="fg">
              <label className="fl">{t('instructorPortal.questionType')}</label>
              <select className="fc" value={form.question_type} onChange={(e) => setForm((p) => ({ ...p, question_type: e.target.value }))}>
                <option value="multiple_choice">{t('instructorPortal.multipleChoice')}</option>
                <option value="true_false">{t('instructorPortal.trueFalse')}</option>
                <option value="essay">{t('instructorPortal.essay')}</option>
                <option value="short_answer">{t('instructorPortal.shortAnswer')}</option>
                <option value="matching">{t('instructorPortal.matching')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="fl">{t('instructorPortal.difficultyLevel')}</label>
              <input type="number" className="fc" min={1} max={5} value={form.difficulty_level} onChange={(e) => setForm((p) => ({ ...p, difficulty_level: Number(e.target.value) || 3 }))} />
            </div>
          </div>
          <div className="fr">
            <div className="fg">
              <label className="fl">{t('instructorPortal.bloomLevel')}</label>
              <select className="fc" value={form.bloom_level} onChange={(e) => setForm((p) => ({ ...p, bloom_level: e.target.value }))}>
                <option value="remember">{t('instructorPortal.bloomRemember')}</option>
                <option value="understand">{t('instructorPortal.bloomUnderstand')}</option>
                <option value="apply">{t('instructorPortal.bloomApply')}</option>
                <option value="analyze">{t('instructorPortal.bloomAnalyze')}</option>
                <option value="evaluate">{t('instructorPortal.bloomEvaluate')}</option>
                <option value="create">{t('instructorPortal.bloomCreate')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="fl">{t('instructorPortal.unitLabel')}</label>
              <input type="number" className="fc" min={1} value={form.unit_number} onChange={(e) => setForm((p) => ({ ...p, unit_number: Number(e.target.value) || 1 }))} />
            </div>
          </div>
          <div className="fg">
            <label className="fl">Options (one per line)</label>
            <textarea className="fc" rows={4} value={form.options_text} onChange={(e) => setForm((p) => ({ ...p, options_text: e.target.value }))} />
          </div>
          <div className="fg">
            <label className="fl">Correct answer index(es)</label>
            <input type="text" className="fc" value={form.correct_answers_text} onChange={(e) => setForm((p) => ({ ...p, correct_answers_text: e.target.value }))} placeholder="0" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-p" onClick={saveQuestion} disabled={saving}>{editingId ? t('instructorPortal.edit') : t('instructorPortal.add')}</button>
            <button type="button" className="btn btn-gh" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-hd">
          <div className="card-title">📋 {t('instructorPortal.questionList')}</div>
        </div>

        {questions.map((q, idx) => (
          <div key={q.id} className="q-card">
            <div className="q-card-hd">
              <div className="q-num">{idx + 1}</div>
              <div className="q-text" data-field="question_text">{q.question_text}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    background: q.question_type === 'multiple_choice' ? 'var(--info-bg)' : q.question_type === 'true_false' ? 'var(--ok-bg)' : 'var(--purple-bg)',
                    color: q.question_type === 'multiple_choice' ? 'var(--info)' : q.question_type === 'true_false' ? 'var(--ok)' : 'var(--purple)',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  {getTypeLabel(t, q.question_type)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    background: Number(q.difficulty_level) >= 4 ? 'var(--err-bg)' : 'var(--warn-bg)',
                    color: Number(q.difficulty_level) >= 4 ? 'var(--err)' : 'var(--warn)',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  {t('instructorPortal.difficultyLevel')}: {q.difficulty_level}
                </span>
              </div>
            </div>
            {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && Array.isArray(q.options) && q.options.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {q.options.map((opt, oi) => (
                  <div key={oi} className={`q-opt ${q.correct_answers?.includes(oi) ? 'correct' : ''}`}>
                    <input type="radio" disabled checked={q.correct_answers?.includes(oi)} />
                    {opt} {q.correct_answers?.includes(oi) ? '✓' : ''}
                  </div>
                ))}
              </div>
            )}
            {q.question_type === 'essay' && (
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--rs)', padding: 10, fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                {t('instructorPortal.essayRequiresManual')}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
              <div>
                {t('instructorPortal.unitLabel')} {q.unit_number || '-'} · CLO · {getBloomLabel(t, q.bloom_level)} · {t('instructorPortal.usedTimes', { count: q.usage_count || 0 })} · {t('instructorPortal.avgCorrectRate', { pct: 72 })}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-gh btn-sm" onClick={() => editQuestion(q)}>{t('instructorPortal.edit')}</button>
                <button type="button" className="btn btn-gh btn-sm" onClick={() => copyQuestion(q)}>{t('instructorPortal.copy')}</button>
                <button type="button" className="btn btn-err btn-sm" onClick={() => deleteQuestion(q.id)}>{t('instructorPortal.deleteQuestion')}</button>
              </div>
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div style={{ color: 'var(--muted)', padding: 24, textAlign: 'center' }}>{t('instructorPortal.noData')}</div>
        )}
      </div>
    </>
  )
}
