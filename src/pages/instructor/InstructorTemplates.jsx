import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import '../../styles/instructor-portal.css'

/**
 * Hub for reusable teaching assets: points instructors to lesson authoring (admin shells + instructor content).
 * Replaces placeholder “coming soon” — no separate `lesson_templates` table until product defines it.
 */
export default function InstructorTemplates() {
  const { t } = useTranslation()
  const { userRole } = useAuth()
  const p = 'instructorPortal.templatesPage'

  return (
    <div className="instructor-portal">
      <nav className="bc" aria-label={t('instructorPortal.breadcrumbMain')}>
        <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <span>{t(`${p}.breadcrumb`)}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t(`${p}.title`)}</h1>
          <p className="ph-sub">{t(`${p}.subtitle`)}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-title">{t(`${p}.cardAuthoringTitle`)}</div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>{t(`${p}.cardAuthoringBody`)}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link to="/instructor/build-lessons" className="btn btn-p">
            {t(`${p}.openBuildLessons`)}
          </Link>
          <Link to="/instructor/content-release" className="btn btn-gh">
            {t(`${p}.openContentRelease`)}
          </Link>
        </div>
      </div>

      {userRole === 'admin' && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-hd">
            <div className="card-title">{t(`${p}.cardAdminTitle`)}</div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>{t(`${p}.cardAdminBody`)}</p>
          <Link to="/academic/classes/build-lessons" className="btn btn-ok">
            {t(`${p}.openAdminBuildLessons`)}
          </Link>
        </div>
      )}

      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 16 }}>{t(`${p}.footnote`)}</p>
    </div>
  )
}
