import { useTranslation } from 'react-i18next'

/** Default course home: units + stats + assessments + settings (grid2). */
export default function InstructorSubjectHomeDashboard({
  unitsGrouped,
  language,
  totalEnrolled,
  completionPct,
  gradePointsTotal,
  deliveryKey,
  recentAssessments,
  subjectId,
  classId,
  onPanel,
  COURSE_PANEL,
  onTemplatesClick,
}) {
  const { t } = useTranslation()

  const rowMeta = (a) => {
    if (a.kind === 'exam') {
      const graded = a.status === 'EX_GRD' || a.status === 'EX_REL'
      const upcoming = a.status === 'EX_SCH' || a.status === 'EX_OPN'
      if (graded) {
        return {
          badge: 'graded',
          sub: t('instructorPortal.subjectHome.submissionsAvg', {
            n: a.submissionCount || 0,
            pct: '—',
          }),
        }
      }
      if (upcoming && a.scheduled_date) {
        return {
          badge: 'upcoming',
          sub: t('instructorPortal.subjectHome.examDate', {
            date: new Date(a.scheduled_date).toLocaleDateString(),
          }),
        }
      }
      return { badge: 'upcoming', sub: '' }
    }
    const pend = (a.submissionCount || 0) - (a.gradedCount || 0)
    if (pend > 0) {
      return {
        badge: 'pending',
        sub: t('instructorPortal.subjectHome.pendingGradeCount', { n: pend }),
      }
    }
    return {
      badge: 'graded',
      sub: t('instructorPortal.subjectHome.submissionsAvg', {
        n: a.submissionCount || 0,
        pct: '—',
      }),
    }
  }

  const badgeLabel = (badge) => {
    if (badge === 'graded') return t('instructorPortal.subjectHome.gradedBadge')
    if (badge === 'upcoming') return t('instructorPortal.subjectHome.upcomingBadge')
    return t('instructorPortal.subjectHome.pendingGradingBadge')
  }

  const cid = classId || 0

  return (
    <div className="grid2">
      <div>
        <div className="card">
          <div className="card-hd">
            <div className="card-title">📖 {t('instructorPortal.subjectHome.unitsTitle')}</div>
            <button type="button" className="btn btn-p btn-sm" onClick={() => onPanel(COURSE_PANEL.lessons)}>
              {t('instructorPortal.subjectHome.newLessonBtn')}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {unitsGrouped.length === 0 ? (
              <p className="ts" style={{ color: 'var(--muted)' }}>
                {t('instructorPortal.subjectHome.noUnitsYet')}
              </p>
            ) : (
              unitsGrouped.map((u) => {
                const first = u.lessons[0]
                const unitTitle = language === 'ar' ? first?.title_ar || first?.title || '' : first?.title || ''
                const borderColor = u.allPublished ? 'var(--ok)' : u.anyDraft ? 'var(--warn)' : 'var(--bdr)'
                const statusKey = u.allPublished ? 'published' : u.anyDraft ? 'draft' : 'in-review'
                return (
                  <div
                    key={u.unitNum}
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 'var(--rs)',
                      padding: '12px 14px',
                      borderRight: `3px solid ${borderColor}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                          {t('instructorPortal.subjectHome.unitHeading', { n: u.unitNum, title: unitTitle })}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {t('instructorPortal.subjectHome.unitLine', { count: u.lessons.length, minutes: u.totalMin })}
                        </div>
                      </div>
                      <span data-status={statusKey} className="badge">
                        {u.allPublished
                          ? t('instructorPortal.publishedShort')
                          : u.anyDraft
                            ? t('instructorPortal.draft')
                            : t('instructorPortal.badgeUpcoming')}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="sg" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
          <div className="sc ok">
            <div className="sc-lbl">{t('instructorPortal.subjectHome.statsActiveStudents')}</div>
            <div className="sc-val">{totalEnrolled}</div>
            <div className="sc-sub">{t('instructorPortal.subjectHome.statsActiveStudentsSub', { total: totalEnrolled })}</div>
          </div>
          <div className="sc warn">
            <div className="sc-lbl">{t('instructorPortal.subjectHome.statsAvgCompletion')}</div>
            <div className="sc-val">{completionPct}%</div>
            <div className="sc-sub">{t('instructorPortal.subjectHome.statsAvgCompletionSub')}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <div className="card-title">📝 {t('instructorPortal.subjectHome.recentAssessments')}</div>
            <button type="button" className="btn btn-gh btn-sm" onClick={() => onPanel(COURSE_PANEL.assessments)}>
              {t('instructorPortal.manage')}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentAssessments.length === 0 ? (
              <p className="ts" style={{ color: 'var(--muted)' }}>
                {t('common.noData')}
              </p>
            ) : (
              recentAssessments.map((a) => {
                const { badge, sub } = rowMeta(a)
                return (
                  <div
                    key={`${a.kind}-${a.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'var(--bg)',
                      borderRadius: 'var(--rs)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                      {sub ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div> : null}
                    </div>
                    <span data-status={badge} className="badge">
                      {badgeLabel(badge)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <div className="card-title">⚙️ {t('instructorPortal.subjectHome.courseSettings')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bdr)' }}>
              <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.subjectHome.settingTeachingMode')}</span>
              <strong>{t(`instructorPortal.${deliveryKey}`)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bdr)' }}>
              <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.subjectHome.settingGradingScheme')}</span>
              <strong>{t('instructorPortal.subjectHome.gradeTotalPoints', { points: gradePointsTotal })}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bdr)' }}>
              <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.subjectHome.settingLatePolicy')}</span>
              <strong>{t('instructorPortal.subjectHome.latePolicyPercent', { pct: 10 })}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.subjectHome.settingIntegrity')}</span>
              <strong>{t('instructorPortal.subjectHome.integrityActive')}</strong>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-out btn-sm" onClick={() => onPanel(COURSE_PANEL.settings)}>
              {t('instructorPortal.subjectHome.editSettings')}
            </button>
            <button type="button" className="btn btn-gh btn-sm" onClick={onTemplatesClick}>
              {t('instructorPortal.subjectHome.copyCourse')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
