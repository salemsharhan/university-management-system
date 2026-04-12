import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
/**
 * Teaching workload & schedule — matches IBU instructor portal reference (stats, assigned courses, week strip, summary).
 */
export default function InstructorWorkload() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = `${t('instructorPortal.workloadBreadcrumbLast')} — ${t('instructorPortal.instructorPortalAr')} | IBU`
  }, [t])

  const accentCard = (borderVar) => ({
    background: 'var(--bg)',
    borderRadius: 'var(--rs)',
    padding: 14,
    borderInlineStart: `3px solid ${borderVar}`,
  })

  const weekRow = (bgVar, borderVar) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    background: bgVar,
    borderRadius: 'var(--rs)',
    borderInlineStart: `3px solid ${borderVar}`,
    color: 'var(--txt)',
  })

  return (
    <>
      <nav className="bc" aria-label={t('instructorPortal.breadcrumbMain')}>
        <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <span>{t('instructorPortal.workloadBreadcrumbLast')}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t('instructorPortal.workloadPageTitle')}</h1>
          <p className="ph-sub">{t('instructorPortal.workloadPhSub')}</p>
        </div>
        <div className="ph-acts">
          <button type="button" className="btn btn-gh" onClick={() => {}}>
            📥 {t('instructorPortal.workloadExportSchedule')}
          </button>
        </div>
      </div>

      <div className="sg">
        <div className="sc acc">
          <div className="sc-lbl">{t('instructorPortal.workloadStatTotalHoursLabel')}</div>
          <div className="sc-val" data-field="total_hours">
            12
          </div>
          <div className="sc-sub">{t('instructorPortal.workloadStatTotalHoursSub')}</div>
        </div>
        <div className="sc info">
          <div className="sc-lbl">{t('instructorPortal.workloadStatCourseCountLabel')}</div>
          <div className="sc-val" data-field="course_count">
            3
          </div>
          <div className="sc-sub">{t('instructorPortal.workloadStatCourseCountSub')}</div>
        </div>
        <div className="sc ok">
          <div className="sc-lbl">{t('instructorPortal.workloadStatStudentsLabel')}</div>
          <div className="sc-val" data-field="total_students">
            112
          </div>
          <div className="sc-sub">{t('instructorPortal.workloadStatStudentsSub')}</div>
        </div>
        <div className="sc warn">
          <div className="sc-lbl">{t('instructorPortal.workloadStatOfficeLabel')}</div>
          <div className="sc-val" data-field="office_hours">
            4
          </div>
          <div className="sc-sub">{t('instructorPortal.workloadStatOfficeSub')}</div>
        </div>
      </div>

      <div className="grid2">
        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.workloadAssignedSectionTitle')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={accentCard('var(--p)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }} data-field="course_code">
                      ENG101
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadCourseEng101L1')}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadCourseEng101L2')}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--p)' }} data-field="credit_hours">
                      3
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('instructorPortal.workloadHoursUnit')}</div>
                  </div>
                </div>
              </div>
              <div style={accentCard('var(--info)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }} data-field="course_code">
                      ENG201
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadCourseEng201L1')}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadCourseEng201L2')}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--info)' }} data-field="credit_hours">
                      3
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('instructorPortal.workloadHoursUnit')}</div>
                  </div>
                </div>
              </div>
              <div style={accentCard('var(--ok)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }} data-field="course_code">
                      ENG301
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadCourseEng301L1')}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadCourseEng301L2')}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ok)' }} data-field="credit_hours">
                      3
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('instructorPortal.workloadHoursUnit')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.workloadWeekSectionTitle')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={weekRow('var(--p-bg)', 'var(--p)')}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--p)', width: 60, flexShrink: 0 }}>
                  {t('instructorPortal.workloadDaySun')}
                </div>
                <div style={{ fontSize: 13, flex: 1 }} data-field="class_title">
                  {t('instructorPortal.workloadWeekSunTitle')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadWeekSunTime')}</div>
              </div>
              <div style={weekRow('var(--info-bg)', 'var(--info)')}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)', width: 60, flexShrink: 0 }}>
                  {t('instructorPortal.workloadDayMon')}
                </div>
                <div style={{ fontSize: 13, flex: 1 }} data-field="class_title">
                  {t('instructorPortal.workloadWeekMonTitle')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadWeekMonTime')}</div>
              </div>
              <div style={weekRow('var(--p-bg)', 'var(--p)')}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--p)', width: 60, flexShrink: 0 }}>
                  {t('instructorPortal.workloadDayTue')}
                </div>
                <div style={{ fontSize: 13, flex: 1 }}>{t('instructorPortal.workloadWeekTueTitle')}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadWeekTueTime')}</div>
              </div>
              <div style={weekRow('var(--info-bg)', 'var(--info)')}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)', width: 60, flexShrink: 0 }}>
                  {t('instructorPortal.workloadDayWed')}
                </div>
                <div style={{ fontSize: 13, flex: 1 }}>{t('instructorPortal.workloadWeekWedTitle')}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadWeekWedTime')}</div>
              </div>
              <div style={weekRow('var(--ok-bg)', 'var(--ok)')}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ok)', width: 60, flexShrink: 0 }}>
                  {t('instructorPortal.workloadDayThu')}
                </div>
                <div style={{ fontSize: 13, flex: 1 }}>{t('instructorPortal.workloadWeekThuTitle')}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.workloadWeekThuTime')}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.workloadWorkloadSummaryTitle')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bdr)' }}>
                <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.workloadSumTeachingLabel')}</span>
                <strong>{t('instructorPortal.workloadSumTeachingVal')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bdr)' }}>
                <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.workloadSumOfficeLabel')}</span>
                <strong>{t('instructorPortal.workloadSumOfficeVal')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bdr)' }}>
                <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.workloadSumTotalLabel')}</span>
                <strong>{t('instructorPortal.workloadSumTotalVal')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.workloadSumMaxLabel')}</span>
                <strong style={{ color: 'var(--ok)' }}>{t('instructorPortal.workloadSumMaxVal')}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
