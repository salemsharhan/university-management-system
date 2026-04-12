import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import '../../styles/instructor-portal.css'

/**
 * Student-style exam preview (instructor-only) — fullscreen shell without sidebar, matches IBU reference.
 */
export default function InstructorExamPagePreview() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()

  useEffect(() => {
    document.title = `${t('instructorPortal.previewExamPage')} — ${t('instructorPortal.instructorPortalAr')} | IBU`
  }, [t])

  const qOpt = (idSuffix, labelKey) => (
    <div className="q-opt" key={idSuffix}>
      <input type="radio" name="exam_preview_q3" id={`exam_preview_q3_${idSuffix}`} />
      <label htmlFor={`exam_preview_q3_${idSuffix}`} style={{ cursor: 'pointer', flex: 1 }}>
        {t(`instructorPortal.${labelKey}`)}
      </label>
    </div>
  )

  const navBtn = (n, variant) => {
    const base = {
      width: 36,
      height: 36,
      borderRadius: 'var(--rs)',
      border: 'none',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 13,
    }
    if (variant === 'answered') return { ...base, background: 'var(--ok)', color: '#fff' }
    if (variant === 'current') return { ...base, border: '2px solid var(--p)', background: 'var(--p)', color: '#fff' }
    if (variant === 'flagged') return { ...base, border: '1.5px solid var(--warn)', background: 'var(--warn-bg)', color: 'var(--warn)' }
    return { ...base, border: '1.5px solid var(--bdr)', background: 'var(--bg)', color: 'var(--txt)' }
  }

  return (
    <div
      className="instructor-portal"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ minHeight: '100vh', background: '#f0f4fb' }}
    >
      <div
        style={{
          background: 'var(--p)',
          color: '#fff',
          padding: '0 28px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/assets/IBU Logo.png"
            alt="IBU"
            style={{ width: 36, height: 36, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: 3 }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{t('instructorPortal.examPreviewExamBarTitle')}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{t('instructorPortal.examPreviewStudentDemo')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{t('instructorPortal.examPreviewProgressLabel')}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }} data-field="progress">
              3 / 10
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,.15)',
              borderRadius: 8,
              padding: '8px 16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.7 }}>{t('instructorPortal.examPreviewTimeLabel')}</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--acc)',
              }}
              data-field="time_remaining"
            >
              {t('instructorPortal.examPreviewTimeDemo')}
            </div>
          </div>
          <div style={{ background: 'var(--ok)', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
            {t('instructorPortal.examPreviewAutosave')}
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--warn-bg)',
          borderBottom: '2px solid var(--warn)',
          padding: '10px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: 'var(--warn)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
          <span aria-hidden>⚠️</span>
          <strong>{t('instructorPortal.examPreviewWarnLabel')}</strong>
          <span>{t('instructorPortal.examPreviewWarnBody')}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginInlineStart: 'auto' }}>
          {t('instructorPortal.examPreviewModeBadge')}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          maxWidth: 1200,
          margin: '0 auto',
          padding: '24px 20px',
        }}
      >
        <div style={{ flex: 1, marginInlineEnd: 24 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-hd">
              <div className="card-title">{t('instructorPortal.examPreviewInstructionsTitle')}</div>
            </div>
            <ul
              style={{
                fontSize: 13,
                color: 'var(--muted)',
                lineHeight: 2,
                paddingInlineStart: 20,
                margin: 0,
                listStyle: 'disc',
              }}
            >
              <li>
                {t('instructorPortal.examPreviewInst1Before')}
                <strong style={{ color: 'var(--txt)' }}>{t('instructorPortal.examPreviewInstMinutes')}</strong>
                {t('instructorPortal.examPreviewInst1After')}
              </li>
              <li>
                {t('instructorPortal.examPreviewInst2Before')}
                <strong style={{ color: 'var(--txt)' }}>{t('instructorPortal.examPreviewInst2Questions')}</strong>
                {t('instructorPortal.examPreviewInst2Mid')}
                <strong style={{ color: 'var(--txt)' }}>{t('instructorPortal.examPreviewInst2Points')}</strong>
                {t('instructorPortal.examPreviewInst2After')}
              </li>
              <li>{t('instructorPortal.examPreviewInst3')}</li>
              <li>{t('instructorPortal.examPreviewInst4')}</li>
              <li>{t('instructorPortal.examPreviewInst5')}</li>
            </ul>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.examPreviewQBadge')}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" className="btn btn-gh btn-sm" aria-label={t('instructorPortal.examPreviewFlag')}>
                  {t('instructorPortal.examPreviewFlag')}
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--p)' }}>
                  {t('instructorPortal.examPreviewPointsBadge')}
                </span>
              </div>
            </div>
            <div
              style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, lineHeight: 1.6 }}
              data-field="question_text"
            >
              {t('instructorPortal.examPreviewQuestionStem')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {qOpt('a', 'examPreviewOptA')}
              {qOpt('b', 'examPreviewOptB')}
              {qOpt('c', 'examPreviewOptC')}
              {qOpt('d', 'examPreviewOptD')}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid var(--bdr)',
              }}
            >
              <button type="button" className="btn btn-gh">
                {t('instructorPortal.examPreviewPrevQ')}
              </button>
              <button type="button" className="btn btn-p">
                {t('instructorPortal.examPreviewNextQ')}
              </button>
            </div>
          </div>
        </div>

        <div style={{ width: 220, flexShrink: 0 }}>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--p)', marginBottom: 14 }}>
              {t('instructorPortal.examPreviewNavTitle')}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 6,
                marginBottom: 16,
              }}
            >
              {[1, 2].map((n) => (
                <button key={n} type="button" style={navBtn(n, 'answered')}>
                  {n}
                </button>
              ))}
              <button type="button" style={navBtn(3, 'current')}>
                3
              </button>
              <button type="button" style={navBtn(4, 'default')}>
                4
              </button>
              <button type="button" style={navBtn(5, 'flagged')}>
                5
              </button>
              {[6, 7, 8, 9, 10].map((n) => (
                <button key={n} type="button" style={navBtn(n, 'default')}>
                  {n}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--ok)' }} />
                <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.examPreviewLegAnswered')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--p)' }} />
                <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.examPreviewLegCurrent')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: 'var(--warn-bg)',
                    border: '1px solid var(--warn)',
                  }}
                />
                <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.examPreviewLegFlagged')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: 'var(--bg)',
                    border: '1px solid var(--bdr)',
                  }}
                />
                <span style={{ color: 'var(--muted)' }}>{t('instructorPortal.examPreviewLegUnanswered')}</span>
              </div>
            </div>
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--p)' }} />
                {t('instructorPortal.examPreviewZoom')}
              </label>
            </div>
            <button type="button" className="btn btn-err btn-bl" style={{ marginTop: 8 }}>
              {t('instructorPortal.examPreviewSubmit')}
            </button>
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
              {t('instructorPortal.examPreviewSubmitHint')}
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: 16, fontSize: 12, color: 'var(--muted)' }}>
        <Link to="/instructor/exam-settings" className="btn btn-gh btn-sm">
          {t('instructorPortal.examPreviewBackSettings')}
        </Link>
      </div>
    </div>
  )
}
