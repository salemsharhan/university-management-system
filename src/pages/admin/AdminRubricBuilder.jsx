import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_WRITING_TEMPLATE, ORAL_PRESENTATION_TEMPLATE } from '../../data/rubricTemplates'
import '../../styles/instructor-portal.css'

function newCriterionKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random()}`
}

function normalizeCriteria(raw) {
  const arr = raw?.criteria
  if (!Array.isArray(arr)) return []
  return arr.map((c) => ({
    key: newCriterionKey(),
    title: c.title || '',
    weight_marks: Number(c.weight_marks) || 0,
    l1: c.l1 || '',
    l2: c.l2 || '',
    l3: c.l3 || '',
    l4: c.l4 || '',
  }))
}

function sumWeights(criteria) {
  return criteria.reduce((s, c) => s + (Number(c.weight_marks) || 0), 0)
}

/** Admin rubric matrix — persisted to `rubrics` (Supabase). */
export default function AdminRubricBuilder() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { user } = useAuth()
  const p = 'admin.rubricBuilder'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [list, setList] = useState([])
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [platformUserId, setPlatformUserId] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [code, setCode] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [rubricType, setRubricType] = useState('analytic')
  const [criteria, setCriteria] = useState([])

  const totalMarks = useMemo(() => sumWeights(criteria), [criteria])
  const weightsOk = totalMarks > 0

  const applyFormFromRow = useCallback(
    (row) => {
      if (!row) {
        setEditingId(null)
        setCode('')
        setNameEn(t(`${p}.defaultRubricName`))
        setRubricType('analytic')
        setCriteria(normalizeCriteria(ACADEMIC_WRITING_TEMPLATE))
        return
      }
      setEditingId(row.id)
      setCode(row.code)
      setNameEn(row.name_en)
      setRubricType(row.rubric_type || 'analytic')
      setCriteria(normalizeCriteria(row.matrix))
    },
    [t, p]
  )

  const refreshList = useCallback(async () => {
    const { data, error } = await supabase.from('rubrics').select('id, code, name_en, total_marks').order('name_en')
    if (error) throw error
    setList(data || [])
    return data || []
  }, [])

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError('')
      try {
        const { data: urow } = await supabase.from('users').select('id').eq('email', user.email).maybeSingle()
        if (cancelled) return
        setPlatformUserId(urow?.id ?? null)

        const { data: rows, error } = await supabase.from('rubrics').select('*').order('name_en')
        if (error) throw error
        if (cancelled) return

        const short = (rows || []).map((r) => ({
          id: r.id,
          code: r.code,
          name_en: r.name_en,
          total_marks: r.total_marks,
        }))
        setList(short)

        if (rows?.length) {
          applyFormFromRow(rows[0])
        } else {
          applyFormFromRow(null)
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setLoadError(e.message || 'Failed to load rubrics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.email, applyFormFromRow])

  const selectRubric = async (idOrNull) => {
    if (idOrNull == null || idOrNull === '') {
      applyFormFromRow(null)
      setCode('')
      return
    }
    try {
      const { data, error } = await supabase.from('rubrics').select('*').eq('id', idOrNull).single()
      if (error) throw error
      applyFormFromRow(data)
    } catch (e) {
      console.error(e)
      setLoadError(e.message)
    }
  }

  const applyTemplate = (which) => {
    const tpl = which === 'oral' ? ORAL_PRESENTATION_TEMPLATE : ACADEMIC_WRITING_TEMPLATE
    setCriteria(normalizeCriteria(tpl))
    if (which === 'oral') {
      setNameEn('Oral presentation rubric')
      setCode((c) => (c === 'academic_writing_default' ? 'oral_presentation_default' : c))
    } else {
      setNameEn(t(`${p}.defaultRubricName`))
      setCode((c) => (c === 'oral_presentation_default' ? 'academic_writing_default' : c))
    }
  }

  const addCriterion = () => {
    setCriteria((rows) => [
      ...rows,
      { key: newCriterionKey(), title: '', weight_marks: 0, l1: '', l2: '', l3: '', l4: '' },
    ])
  }

  const removeCriterion = (key) => {
    setCriteria((rows) => rows.filter((r) => r.key !== key))
  }

  const updateCriterion = (key, patch) => {
    setCriteria((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const saveRubric = async () => {
    if (!user?.email) return
    const codeTrim = code.trim()
    if (!codeTrim) {
      setSaveError(t(`${p}.errCodeRequired`, { defaultValue: 'Rubric code is required (unique, e.g. academic_writing_default).' }))
      return
    }
    if (!nameEn.trim()) {
      setSaveError(t(`${p}.errNameRequired`, { defaultValue: 'Rubric name is required.' }))
      return
    }
    const matrix = {
      criteria: criteria.map(({ title, weight_marks, l1, l2, l3, l4 }) => ({
        title: title.trim(),
        weight_marks: Number(weight_marks) || 0,
        l1: l1 || '',
        l2: l2 || '',
        l3: l3 || '',
        l4: l4 || '',
      })),
    }
    const total = sumWeights(criteria)

    setSaving(true)
    setSaveError('')
    try {
      const payload = {
        code: codeTrim,
        name_en: nameEn.trim(),
        rubric_type: rubricType,
        total_marks: total,
        matrix,
        updated_at: new Date().toISOString(),
      }

      let savedId = editingId
      if (editingId) {
        const { error } = await supabase.from('rubrics').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('rubrics')
          .insert({ ...payload, created_by: platformUserId })
          .select('id')
          .single()
        if (error) throw error
        savedId = data.id
        setEditingId(data.id)
      }
      await refreshList()
      if (savedId) {
        const { data: full } = await supabase.from('rubrics').select('*').eq('id', savedId).single()
        if (full) applyFormFromRow(full)
      }
    } catch (e) {
      console.error(e)
      setSaveError(e.message || e.details || t(`${p}.saveFailed`, { defaultValue: 'Save failed' }))
    } finally {
      setSaving(false)
    }
  }

  const deleteRubric = async () => {
    if (!editingId) return
    if (!window.confirm(t(`${p}.confirmDelete`))) return
    setSaving(true)
    setSaveError('')
    try {
      const { error } = await supabase.from('rubrics').delete().eq('id', editingId)
      if (error) throw error
      const rows = await refreshList()
      if (rows?.length) {
        const { data: full } = await supabase.from('rubrics').select('*').eq('id', rows[0].id).single()
        applyFormFromRow(full)
      } else {
        applyFormFromRow(null)
      }
    } catch (e) {
      console.error(e)
      setSaveError(e.message || t(`${p}.deleteFailed`, { defaultValue: 'Delete failed' }))
    } finally {
      setSaving(false)
    }
  }

  const thOk = { background: 'var(--ok-bg)', color: 'var(--ok)' }
  const thInfo = { background: 'var(--info-bg)', color: 'var(--info)' }
  const thWarn = { background: 'var(--warn-bg)', color: 'var(--warn)' }
  const thErr = { background: 'var(--err-bg)', color: 'var(--err)' }

  const barFillClass = (idx) => {
    const fills = ['ok', 'info', 'warn', 'err']
    return fills[idx % 4]
  }

  if (loading) {
    return (
      <div className="instructor-portal p-8" dir={isRTL ? 'rtl' : 'ltr'}>
        <p>{t('common.loading', 'Loading…')}</p>
      </div>
    )
  }

  return (
    <div className="instructor-portal" dir={isRTL ? 'rtl' : 'ltr'}>
      <nav className="bc" aria-label={t('instructorPortal.breadcrumbMain')}>
        <Link to="/dashboard">{t('navigation.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <span>{t(`${p}.breadcrumb`)}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t(`${p}.pageTitle`)}</h1>
          <p className="ph-sub">{t(`${p}.pageSubtitle`)}</p>
          {loadError && (
            <p className="alert alert-err" style={{ marginTop: 8 }}>
              {loadError}
            </p>
          )}
        </div>
        <div className="ph-acts">
          <select
            className="fc"
            style={{ minWidth: 220 }}
            value={editingId ?? ''}
            onChange={(e) => {
              const v = e.target.value
              if (v === '') selectRubric(null)
              else selectRubric(Number(v))
            }}
            aria-label={t(`${p}.selectRubric`)}
          >
            <option value="">{t(`${p}.newRubric`)}</option>
            {list.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name_en} ({r.code})
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-gh" onClick={() => applyTemplate('academic')} disabled={saving}>
            📋 {t(`${p}.useTemplate`)} (Academic)
          </button>
          <button type="button" className="btn btn-gh" onClick={() => applyTemplate('oral')} disabled={saving}>
            📋 Oral
          </button>
          <button type="button" className="btn btn-ok" onClick={saveRubric} disabled={saving}>
            {saving ? '…' : `💾 ${t(`${p}.saveRubric`)}`}
          </button>
          {editingId ? (
            <button type="button" className="btn btn-err" onClick={deleteRubric} disabled={saving}>
              {t(`${p}.deleteRubric`)}
            </button>
          ) : null}
        </div>
      </div>

      {saveError && (
        <div className="alert alert-err" style={{ marginBottom: 16 }}>
          {saveError}
        </div>
      )}

      <div className="card">
        <div className="card-hd">
          <div className="card-title">⚙️ {t(`${p}.settingsTitle`)}</div>
        </div>
        <div className="fr3">
          <div className="fg">
            <label className="fl">{t(`${p}.rubricCode`)}</label>
            <input
              type="text"
              className="fc"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="academic_writing_default"
              data-field="rubric_code"
            />
          </div>
          <div className="fg">
            <label className="fl">{t(`${p}.rubricName`)}</label>
            <input type="text" className="fc" value={nameEn} onChange={(e) => setNameEn(e.target.value)} data-field="rubric_name" />
          </div>
          <div className="fg">
            <label className="fl">{t(`${p}.rubricType`)}</label>
            <select className="fc" value={rubricType} onChange={(e) => setRubricType(e.target.value)} data-field="rubric_type">
              <option value="analytic">{t(`${p}.typeAnalytic`)}</option>
              <option value="holistic">{t(`${p}.typeHolistic`)}</option>
              <option value="single">{t(`${p}.typeSingle`)}</option>
            </select>
          </div>
          <div className="fg">
            <label className="fl">{t(`${p}.totalMarks`)}</label>
            <input type="number" className="fc" readOnly value={totalMarks} data-field="total_marks" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">📐 {t(`${p}.matrixTitle`)}</div>
          <button type="button" className="btn btn-p btn-sm" onClick={addCriterion}>
            + {t(`${p}.addCriterion`)}
          </button>
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{ width: 180 }}>{t(`${p}.colCriterion`)}</th>
                <th style={thOk}>
                  {t(`${p}.colExcellent`)}
                  <br />
                  <small>{t(`${p}.range4`)}</small>
                </th>
                <th style={thInfo}>
                  {t(`${p}.colVeryGood`)}
                  <br />
                  <small>{t(`${p}.range3`)}</small>
                </th>
                <th style={thWarn}>
                  {t(`${p}.colGood`)}
                  <br />
                  <small>{t(`${p}.range2`)}</small>
                </th>
                <th style={thErr}>
                  {t(`${p}.colWeak`)}
                  <br />
                  <small>{t(`${p}.range1`)}</small>
                </th>
                <th>{t(`${p}.colAction`)}</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((row, idx) => (
                <tr key={row.key}>
                  <td>
                    <input
                      className="fc"
                      style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}
                      value={row.title}
                      onChange={(e) => updateCriterion(row.key, { title: e.target.value })}
                      data-field="criterion_name"
                    />
                    <div className="fg" style={{ marginBottom: 6 }}>
                      <label className="fl" style={{ fontSize: 11 }}>
                        {t(`${p}.weightMarks`)}
                      </label>
                      <input
                        type="number"
                        className="fc"
                        min={0}
                        value={row.weight_marks}
                        onChange={(e) => updateCriterion(row.key, { weight_marks: Number(e.target.value) })}
                      />
                    </div>
                    <div className="prog-bar" style={{ marginTop: 6 }}>
                      <div
                        className={`prog-fill ${barFillClass(idx)}`}
                        style={{
                          width: totalMarks > 0 ? `${Math.min(100, ((Number(row.weight_marks) || 0) / totalMarks) * 100)}%` : '0%',
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <textarea
                      className="fc"
                      rows={3}
                      style={{ fontSize: 12 }}
                      value={row.l4}
                      onChange={(e) => updateCriterion(row.key, { l4: e.target.value })}
                      data-field="level_4_desc"
                    />
                  </td>
                  <td>
                    <textarea
                      className="fc"
                      rows={3}
                      style={{ fontSize: 12 }}
                      value={row.l3}
                      onChange={(e) => updateCriterion(row.key, { l3: e.target.value })}
                      data-field="level_3_desc"
                    />
                  </td>
                  <td>
                    <textarea
                      className="fc"
                      rows={3}
                      style={{ fontSize: 12 }}
                      value={row.l2}
                      onChange={(e) => updateCriterion(row.key, { l2: e.target.value })}
                      data-field="level_2_desc"
                    />
                  </td>
                  <td>
                    <textarea
                      className="fc"
                      rows={3}
                      style={{ fontSize: 12 }}
                      value={row.l1}
                      onChange={(e) => updateCriterion(row.key, { l1: e.target.value })}
                      data-field="level_1_desc"
                    />
                  </td>
                  <td>
                    <button type="button" className="btn btn-err btn-sm" onClick={() => removeCriterion(row.key)}>
                      {t(`${p}.delete`)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--bdr)',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {t(`${p}.weightsTotal`)}{' '}
            <strong style={{ color: weightsOk ? 'var(--ok)' : 'var(--warn)' }}>
              {totalMarks} {t(`${p}.marksUnit`)}
              {weightsOk ? ' ✓' : ''}
            </strong>
          </div>
          <button type="button" className="btn btn-p" onClick={addCriterion}>
            + {t(`${p}.addCriterionFooter`)}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>{t(`${p}.instructorHint`)}</p>
    </div>
  )
}
