import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function InstructorLessonPreview() {
  const { t } = useTranslation()

  return (
    <>
      <nav className="bc" aria-label={t('instructorPortal.curriculumMap')}>
        <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <Link to="/instructor/courses">ENG101</Link>
        <span className="bc-sep">›</span>
        <Link to="/instructor/build-lessons">{t('instructorPortal.buildLesson')}</Link>
        <span className="bc-sep">›</span>
        <span>{t('instructorPortal.previewBreadcrumb')}</span>
      </nav>

      <div className="alert alert-purple">
        👁️ {t('instructorPortal.previewModeAlert')}
      </div>

      <div className="ph">
        <div>
          <h1>{t('instructorPortal.clo3Desc')}</h1>
          <p className="ph-sub">{t('instructorPortal.lessonPreviewSubtitle', { unit: 3, lesson: 1, minutes: 45 })}</p>
        </div>
        <div className="ph-acts">
          <Link to="/instructor/build-lessons" className="btn btn-gh">← {t('instructorPortal.backToEdit')}</Link>
          <a href="#" className="btn btn-ok">🚀 {t('instructorPortal.publishNow')}</a>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="card">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 14, background: 'var(--bg)', borderRadius: 'var(--rs)', marginBottom: 20 }}>
            <div style={{ fontSize: 28 }}>📖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t('instructorPortal.clo3Desc')}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t('instructorPortal.lessonPreviewSubtitle', { unit: 3, lesson: 1, minutes: 45 })}</div>
            </div>
            <div style={{ marginRight: 'auto' }}>
              <div className="prog-bar" style={{ width: 120 }}>
                <div className="prog-fill" style={{ width: '0%' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, textAlign: 'center' }}>{t('instructorPortal.percentComplete', { percent: 0 })}</div>
            </div>
          </div>

          <div style={{ fontSize: 15, lineHeight: 1.9, marginBottom: 24, color: 'var(--txt)' }}>
            {t('instructorPortal.clo3Desc')}
          </div>

          <div style={{ background: 'var(--bg)', borderRadius: 'var(--r)', padding: 20, marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎬</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('instructorPortal.clo3Desc')}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{t('instructorPortal.videoDuration', { minutes: 8 })}</div>
            <div style={{ background: 'var(--p)', color: '#fff', borderRadius: 'var(--rs)', padding: 40, fontSize: 13, opacity: 0.7 }}>▶ {t('instructorPortal.videoPlayerPlaceholder')}</div>
          </div>

          <div style={{ background: 'var(--info-bg)', border: '1.5px solid var(--info)', borderRadius: 'var(--r)', padding: 20, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--info)', marginBottom: 14 }}>❓ {t('instructorPortal.verificationQuizTitle')}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t('instructorPortal.optionFocus')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="q-opt"><input type="radio" name="pq1" /> {t('instructorPortal.optionFocus')}</div>
              <div className="q-opt"><input type="radio" name="pq1" /> {t('instructorPortal.optionNotes')}</div>
              <div className="q-opt"><input type="radio" name="pq1" /> {t('instructorPortal.optionReply')}</div>
              <div className="q-opt"><input type="radio" name="pq1" /> {t('instructorPortal.optionQuestions')}</div>
            </div>
            <button type="button" className="btn btn-p btn-sm" style={{ marginTop: 12 }}>{t('instructorPortal.checkAnswer')}</button>
          </div>

          <div style={{ background: 'var(--warn-bg)', border: '1.5px solid var(--warn)', borderRadius: 'var(--r)', padding: 20, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--warn)', marginBottom: 14 }}>📊 {t('instructorPortal.pollTitle')}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t('instructorPortal.pollGood')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="q-opt"><input type="radio" name="pp1" /> {t('instructorPortal.pollExcellent')}</div>
              <div className="q-opt"><input type="radio" name="pp1" /> {t('instructorPortal.pollGood')}</div>
              <div className="q-opt"><input type="radio" name="pp1" /> {t('instructorPortal.pollNeedsImprovement')}</div>
            </div>
            <button type="button" className="btn btn-warn btn-sm" style={{ marginTop: 12 }}>{t('instructorPortal.submitAnswer')}</button>
          </div>

          <div style={{ background: 'var(--purple-bg)', border: '1.5px solid var(--purple)', borderRadius: 'var(--r)', padding: 20, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--purple)', marginBottom: 8 }}>📎 {t('instructorPortal.readingAttachmentTitle')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32 }}>📄</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>document.pdf</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>2.4 MB</div>
              </div>
              <a href="#" className="btn btn-purple btn-sm" style={{ marginRight: 'auto' }}>{t('instructorPortal.download')}</a>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--bdr)' }}>
            <button type="button" className="btn btn-gh">← {t('instructorPortal.previousLesson')}</button>
            <button type="button" className="btn btn-p">✓ {t('instructorPortal.completeLesson')} →</button>
          </div>
        </div>
      </div>
    </>
  )
}
