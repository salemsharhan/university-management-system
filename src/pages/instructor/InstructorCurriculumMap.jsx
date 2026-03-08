import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'

const DEFAULT_CLOS = [
  { id: '1', code: 'CLO-1', descKey: 'clo1Desc', bloomKey: 'bloomApply', difficultyKey: 'difficultyMedium', borderColor: 'var(--ok)' },
  { id: '2', code: 'CLO-2', descKey: 'clo2Desc', bloomKey: 'bloomAnalyze', difficultyKey: 'difficultyHigh', borderColor: 'var(--info)' },
  { id: '3', code: 'CLO-3', descKey: 'clo3Desc', bloomKey: 'bloomApply', difficultyKey: 'difficultyLow', borderColor: 'var(--warn)' },
  { id: '4', code: 'CLO-4', descKey: 'clo4Desc', bloomKey: 'bloomCreate', difficultyKey: 'difficultyHigh', borderColor: 'var(--purple)' },
]

const COVERAGE_KEYS = ['coverageClo1', 'coverageClo2', 'coverageClo3', 'coverageClo4']
const COVERAGE = [
  { count: 4, pct: 90, fillClass: 'ok' },
  { count: 3, pct: 75, fillClass: 'ok' },
  { count: 1, pct: 30, fillClass: 'warn' },
  { count: 0, pct: 5, fillClass: 'err' },
]

const MATRIX_KEYS = ['matrixUnit1', 'matrixUnit2', 'matrixUnit3', 'matrixUnit4']
const MATRIX = [
  { clos: [true, false, false, false] },
  { clos: [true, true, false, false] },
  { clos: [false, false, true, true] },
  { clos: [true, true, false, false] },
]

export default function InstructorCurriculumMap() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)

  useEffect(() => {
    if (!user?.email) return
    supabase
      .from('instructors')
      .select('id')
      .eq('email', user.email)
      .eq('status', 'active')
      .single()
      .then(({ data }) => {
        if (data) {
          supabase
            .from('classes')
            .select('id, subject_id, subjects(id, code, name_en, name_ar)')
            .eq('instructor_id', data.id)
            .eq('status', 'active')
            .then(({ data: classesData }) => {
              const list = (classesData || []).map((c) => c.subjects).filter(Boolean)
              const unique = list.filter((s, i, a) => a.findIndex((x) => x?.id === s?.id) === i)
              setSubjects(unique)
              if (unique.length && !selectedSubjectId) setSelectedSubjectId(unique[0].id)
            })
        }
      })
  }, [user?.email])

  useEffect(() => {
    const sub = subjects.find((s) => s.id === selectedSubjectId)
    setSelectedSubject(sub || null)
  }, [subjects, selectedSubjectId])

  const subjectCode = selectedSubject?.code || 'ENG101'

  return (
    <>
      <nav className="bc" aria-label={t('instructorPortal.curriculumMap')}>
        <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <Link to="/instructor/courses">{t('instructorPortal.myCourses')}</Link>
        <span className="bc-sep">›</span>
        <Link to="/instructor/courses">{subjectCode}</Link>
        <span className="bc-sep">›</span>
        <span>{t('instructorPortal.curriculumMap')}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t('instructorPortal.curriculumMap')}</h1>
          <p className="ph-sub">{subjectCode} — {t('instructorPortal.curriculumMapSubtitle')}</p>
        </div>
        <div className="ph-acts">
          <a href="#" className="btn btn-gh">📥 {t('instructorPortal.exportReport')}</a>
          <a href="#" className="btn btn-p">+ {t('instructorPortal.addLearningOutcome')}</a>
        </div>
      </div>

      <div className="grid2">
        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">🎯 {t('instructorPortal.learningOutcomesClos')}</div>
              <a href="#" className="btn btn-p btn-sm">+ {t('instructorPortal.add')}</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {DEFAULT_CLOS.map((clo) => (
                <div
                  key={clo.id}
                  style={{
                    background: 'var(--bg)',
                    borderRadius: 'var(--rs)',
                    padding: 14,
                    borderRight: `3px solid ${clo.borderColor}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: clo.borderColor,
                          background: clo.borderColor === 'var(--ok)' ? 'var(--ok-bg)' : clo.borderColor === 'var(--info)' ? 'var(--info-bg)' : clo.borderColor === 'var(--warn)' ? 'var(--warn-bg)' : 'var(--purple-bg)',
                          padding: '2px 8px',
                          borderRadius: 20,
                        }}
                      >
                        {clo.code}
                      </span>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{t(`instructorPortal.${clo.descKey}`)}</div>
                    </div>
                    <a href="#" className="btn btn-gh btn-sm">{t('instructorPortal.edit')}</a>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                    {t('instructorPortal.bloomLevel')}: {t(`instructorPortal.${clo.bloomKey}`)} | {t('instructorPortal.difficulty')}: {t(`instructorPortal.${clo.difficultyKey}`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">📊 {t('instructorPortal.outcomeCoverageReport')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {COVERAGE.map((row, idx) => (
                <div key={COVERAGE_KEYS[idx]}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{t(`instructorPortal.${COVERAGE_KEYS[idx]}`)}</span>
                    <span style={{ fontWeight: 700, color: row.fillClass === 'ok' ? 'var(--ok)' : row.fillClass === 'warn' ? 'var(--warn)' : 'var(--err)' }}>
                      {row.count} {t('instructorPortal.assessmentsCount')}
                    </span>
                  </div>
                  <div className="prog-bar">
                    <div className={`prog-fill ${row.fillClass}`} style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="alert alert-warn" style={{ marginTop: 16 }}>
              ⚠️ {t('instructorPortal.clo4NoAssessment')}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-title">🗺️ {t('instructorPortal.mappingMatrix')}</div>
            </div>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>{t('instructorPortal.unit')}</th>
                    <th>CLO-1</th>
                    <th>CLO-2</th>
                    <th>CLO-3</th>
                    <th>CLO-4</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row, i) => (
                    <tr key={i}>
                      <td>{t(`instructorPortal.${MATRIX_KEYS[i]}`)}</td>
                      {row.clos.map((v, j) => (
                        <td key={j} style={{ textAlign: 'center' }}>{v ? '✅' : '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
