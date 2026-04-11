import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import '../../styles/instructor-portal.css'

/** Full rubric matrix editor — admin-only; instructors attach rubrics on the assessment page. */
export default function AdminRubricBuilder() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const p = 'admin.rubricBuilder'

  const rows = [
    {
      key: 'content',
      nameKey: `${p}.crit1Name`,
      marksKey: `${p}.crit1Marks`,
      bar: { fill: 'ok', w: '33%' },
      l4: `${p}.crit1L4`,
      l3: `${p}.crit1L3`,
      l2: `${p}.crit1L2`,
      l1: `${p}.crit1L1`,
    },
    {
      key: 'structure',
      nameKey: `${p}.crit2Name`,
      marksKey: `${p}.crit2Marks`,
      bar: { fill: 'info', w: '27%' },
      l4: `${p}.crit2L4`,
      l3: `${p}.crit2L3`,
      l2: `${p}.crit2L2`,
      l1: `${p}.crit2L1`,
    },
    {
      key: 'language',
      nameKey: `${p}.crit3Name`,
      marksKey: `${p}.crit3Marks`,
      bar: { fill: 'warn', w: '23%' },
      l4: `${p}.crit3L4`,
      l3: `${p}.crit3L3`,
      l2: `${p}.crit3L2`,
      l1: `${p}.crit3L1`,
    },
    {
      key: 'citations',
      nameKey: `${p}.crit4Name`,
      marksKey: `${p}.crit4Marks`,
      bar: { fill: 'err', w: '17%' },
      l4: `${p}.crit4L4`,
      l3: `${p}.crit4L3`,
      l2: `${p}.crit4L2`,
      l1: `${p}.crit4L1`,
    },
  ]

  const thOk = { background: 'var(--ok-bg)', color: 'var(--ok)' }
  const thInfo = { background: 'var(--info-bg)', color: 'var(--info)' }
  const thWarn = { background: 'var(--warn-bg)', color: 'var(--warn)' }
  const thErr = { background: 'var(--err-bg)', color: 'var(--err)' }

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
        </div>
        <div className="ph-acts">
          <button type="button" className="btn btn-gh">
            📋 {t(`${p}.useTemplate`)}
          </button>
          <button type="button" className="btn btn-ok">
            💾 {t(`${p}.saveRubric`)}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">⚙️ {t(`${p}.settingsTitle`)}</div>
        </div>
        <div className="fr3">
          <div className="fg">
            <label className="fl">{t(`${p}.rubricName`)}</label>
            <input type="text" className="fc" defaultValue={t(`${p}.defaultRubricName`)} data-field="rubric_name" />
          </div>
          <div className="fg">
            <label className="fl">{t(`${p}.rubricType`)}</label>
            <select className="fc" data-field="rubric_type" defaultValue="analytic">
              <option value="analytic">{t(`${p}.typeAnalytic`)}</option>
              <option value="holistic">{t(`${p}.typeHolistic`)}</option>
              <option value="single">{t(`${p}.typeSingle`)}</option>
            </select>
          </div>
          <div className="fg">
            <label className="fl">{t(`${p}.totalMarks`)}</label>
            <input type="number" className="fc" defaultValue={30} data-field="total_marks" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">📐 {t(`${p}.matrixTitle`)}</div>
          <button type="button" className="btn btn-p btn-sm">
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
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }} data-field="criterion_name">
                      {t(row.nameKey)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t(row.marksKey)}</div>
                    <div className="prog-bar" style={{ marginTop: 6 }}>
                      <div className={`prog-fill ${row.bar.fill}`} style={{ width: row.bar.w }} />
                    </div>
                  </td>
                  <td>
                    <textarea className="fc" rows={3} style={{ fontSize: 12 }} data-field="level_4_desc" defaultValue={t(row.l4)} />
                  </td>
                  <td>
                    <textarea className="fc" rows={3} style={{ fontSize: 12 }} data-field="level_3_desc" defaultValue={t(row.l3)} />
                  </td>
                  <td>
                    <textarea className="fc" rows={3} style={{ fontSize: 12 }} data-field="level_2_desc" defaultValue={t(row.l2)} />
                  </td>
                  <td>
                    <textarea className="fc" rows={3} style={{ fontSize: 12 }} data-field="level_1_desc" defaultValue={t(row.l1)} />
                  </td>
                  <td>
                    <button type="button" className="btn btn-err btn-sm">
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
            <strong style={{ color: 'var(--ok)' }}>{t(`${p}.weightsOk`)}</strong>
          </div>
          <button type="button" className="btn btn-p">
            + {t(`${p}.addCriterionFooter`)}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>{t(`${p}.instructorHint`)}</p>
    </div>
  )
}
