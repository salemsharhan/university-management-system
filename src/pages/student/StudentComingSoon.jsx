import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { FolderOpen } from 'lucide-react'

export default function StudentComingSoon() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  return (
    <div className={`flex flex-col items-center justify-center min-h-[50vh] text-center ${isRTL ? 'text-right' : 'text-left'}`}>
      <FolderOpen className="w-16 h-16 text-slate-300 mb-4" />
      <h2 className="text-xl font-bold text-slate-700">{t('studentPortal.comingSoon', 'Coming soon')}</h2>
      <p className="text-slate-500 mt-2 max-w-md">{t('studentPortal.comingSoonDesc', 'This section is under development and will be available soon.')}</p>
    </div>
  )
}
