import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

/** Electronic exam settings — matches instructor portal reference. */
export default function InstructorExamSettings() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const classIdParam = searchParams.get('classId')
  const classId = classIdParam ? Number(classIdParam) : null

  const [loading, setLoading] = useState(!!classIdParam)
  const [classRow, setClassRow] = useState(null)

  useEffect(() => {
    if (!user?.email || !classId || Number.isNaN(classId)) {
      setLoading(false)
      setClassRow(null)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const { data: instructor } = await supabase
          .from('instructors')
          .select('id')
          .eq('email', user.email)
          .eq('status', 'active')
          .single()

        if (!instructor || cancelled) {
          setClassRow(null)
          return
        }

        const { data: cls, error } = await supabase
          .from('classes')
          .select(`id, subject_id, subjects ( id, code, name_en, name_ar )`)
          .eq('id', classId)
          .eq('instructor_id', instructor.id)
          .maybeSingle()

        if (error || !cls || cancelled) {
          setClassRow(null)
          return
        }
        setClassRow(cls)
      } catch {
        if (!cancelled) setClassRow(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.email, classId])

  const subjectCode = classRow?.subjects?.code || 'ENG101'
  const subjectId = classRow?.subject_id
  const crumbCourseHref = subjectId ? `/instructor/subjects/${subjectId}` : '/instructor/courses'

  if (loading) {
    return (
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
    )
  }

  const examName = t('instructorPortal.examSettingsMidtermName')
  const phSub = t('instructorPortal.examSettingsPageSubtitle', { exam: examName, code: subjectCode })

  const accent = { accentColor: 'var(--p)',
    width: 16,
    height: 16,
  }

  const chkSmall = { accentColor: 'var(--p)' }

  return (
    <>
      <nav className="bc" aria-label={t('instructorPortal.breadcrumbMain')}>
        <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <Link to={crumbCourseHref}>{subjectCode}</Link>
        <span className="bc-sep">›</span>
        <Link to="/instructor/assessments">{t('instructorPortal.examSettingsBcAuthoring')}</Link>
        <span className="bc-sep">›</span>
        <span>{t('instructorPortal.examSettingsBreadcrumb')}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t('instructorPortal.examSettingsPageTitle')}</h1>
          <p className="ph-sub">{phSub}</p>
        </div>
        <div className="ph-acts">
          <Link to="/instructor/assessments" className="btn btn-gh">
            ← {t('instructorPortal.examSettingsBack')}
          </Link>
          <Link to="/instructor/preview-exam" className="btn btn-out">
            👁️ {t('instructorPortal.previewExamPage')}
          </Link>
          <button type="button" className="btn btn-ok">
            ✅ {t('instructorPortal.examSettingsSaveActivate')}
          </button>
        </div>
      </div>

      <div className="grid2">
        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">⏱️ {t('instructorPortal.examSettingsWindowTitle')}</div>
            </div>
            <div className="fr">
              <div className="fg">
                <label className="fl">{t('instructorPortal.examSettingsStart')}</label>
                <input type="datetime-local" className="fc" defaultValue="2025-03-15T10:00" data-field="exam_start" />
              </div>
              <div className="fg">
                <label className="fl">{t('instructorPortal.examSettingsEnd')}</label>
                <input type="datetime-local" className="fc" defaultValue="2025-03-15T12:00" data-field="exam_end" />
              </div>
            </div>
            <div className="fr">
              <div className="fg">
                <label className="fl">{t('instructorPortal.examSettingsDuration')}</label>
                <input type="number" className="fc" defaultValue={90} data-field="duration_minutes" />
                <div className="fh">{t('instructorPortal.examSettingsDurationHint')}</div>
              </div>
              <div className="fg">
                <label className="fl">{t('instructorPortal.examSettingsTimezone')}</label>
                <select className="fc" data-field="timezone" defaultValue="riyadh">
                  <option value="riyadh">{t('instructorPortal.examSettingsTzRiyadh')}</option>
                  <option value="utc">{t('instructorPortal.examSettingsTzUtc')}</option>
                  <option value="dubai">{t('instructorPortal.examSettingsTzDubai')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-title">🔀 {t('instructorPortal.examSettingsShuffleTitle')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={accent} data-field="shuffle_questions" />
                <div>
                  <div style={{ fontWeight: 600 }}>{t('instructorPortal.examSettingsShuffleQuestions')}</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={accent} data-field="shuffle_answers" />
                <div>
                  <div style={{ fontWeight: 600 }}>{t('instructorPortal.examSettingsShuffleAnswers')}</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" style={accent} data-field="randomize_pool" />
                <div>
                  <div style={{ fontWeight: 600 }}>{t('instructorPortal.examSettingsRandomPool')}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.examSettingsRandomPoolHint')}</div>
                </div>
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-title">♿ {t('instructorPortal.examSettingsA11yTitle')}</div>
            </div>
            <div className="fg">
              <label className="fl">{t('instructorPortal.examSettingsExtraTime')}</label>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>{t('instructorPortal.examSettingsA11yColStudent')}</th>
                      <th>{t('instructorPortal.examSettingsA11yColPercent')}</th>
                      <th>{t('instructorPortal.examSettingsA11yColAction')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td data-field="student_name">{t('instructorPortal.examSettingsA11yDemoStudent')}</td>
                      <td>
                        <input type="number" className="fc" defaultValue={50} style={{ width: 80 }} data-field="extra_time_percent" /> %
                      </td>
                      <td>
                        <a href="#" className="btn btn-err btn-sm" onClick={(e) => e.preventDefault()}>
                          {t('instructorPortal.examSettingsDelete')}
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <a href="#" className="btn btn-gh btn-sm" style={{ marginTop: 8 }} onClick={(e) => e.preventDefault()}>
                + {t('instructorPortal.examSettingsAddStudent')}
              </a>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">🔒 {t('instructorPortal.examSettingsIntegrityCardTitle')}</div>
              <Link to="/instructor/integrity-settings" className="btn btn-gh btn-sm">
                {t('instructorPortal.examSettingsAdvancedIntegrity')}
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={accent} data-field="integrity_statement" />
                <div>
                  <div style={{ fontWeight: 600 }}>{t('instructorPortal.examSettingsIntegrityStatement')}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.examSettingsIntegrityStatementHint')}</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" style={accent} data-field="safe_browser" />
                <div>
                  <div style={{ fontWeight: 600 }}>{t('instructorPortal.examSettingsSafeBrowser')}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.examSettingsSafeBrowserHint')}</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" style={accent} data-field="webcam_monitoring" />
                <div>
                  <div style={{ fontWeight: 600 }}>{t('instructorPortal.examSettingsWebcam')}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.examSettingsWebcamHint')}</div>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" style={accent} data-field="plagiarism_check" />
                <div>
                  <div style={{ fontWeight: 600 }}>{t('instructorPortal.examSettingsPlagiarism')}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.examSettingsPlagiarismHint')}</div>
                </div>
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-title">📋 {t('instructorPortal.examSettingsPostTitle')}</div>
            </div>
            <div className="fg">
              <label className="fl">{t('instructorPortal.examSettingsResultPolicy')}</label>
              <select className="fc" data-field="result_policy" defaultValue="after_window">
                <option value="immediate">{t('instructorPortal.examSettingsResultImmediate')}</option>
                <option value="after_window">{t('instructorPortal.examSettingsResultAfterWindow')}</option>
                <option value="manual">{t('instructorPortal.examSettingsResultManual')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="fl">{t('instructorPortal.examSettingsSummaryLabel')}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" defaultChecked style={chkSmall} /> {t('instructorPortal.examSettingsSummaryTotal')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" style={chkSmall} /> {t('instructorPortal.examSettingsSummaryCorrect')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" style={chkSmall} /> {t('instructorPortal.examSettingsSummaryFeedback')}
                </label>
              </div>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">{t('instructorPortal.examSettingsResumePolicy')}</label>
              <select className="fc" data-field="resume_policy" defaultValue="resume_time_runs">
                <option value="resume_time_runs">{t('instructorPortal.examSettingsResumeOpt1')}</option>
                <option value="resume_pause">{t('instructorPortal.examSettingsResumeOpt2')}</option>
                <option value="no_resume">{t('instructorPortal.examSettingsResumeOpt3')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
