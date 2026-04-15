import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { KeyRound, Loader2, X } from 'lucide-react'

export default function PasswordResetModal({ open, onClose, onSubmit, loading, error: externalError }) {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirm('')
      setLocalError('')
    }
  }, [open])

  if (!open) return null

  const err = externalError || localError

  const handleSubmit = (e) => {
    e.preventDefault()
    setLocalError('')
    if (password.length < 6) {
      setLocalError(t('adminAccount.passwordMin'))
      return
    }
    if (password !== confirm) {
      setLocalError(t('adminAccount.passwordMismatch'))
      return
    }
    onSubmit(password)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 rounded-lg hover:bg-gray-100`}
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>
        <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <KeyRound className="w-6 h-6 text-primary-600" />
          <h2 className={`text-xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('adminAccount.resetPasswordTitle')}
          </h2>
        </div>
        <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('adminAccount.resetPasswordHint')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('adminAccount.newPassword')}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
              dir="ltr"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('adminAccount.confirmPassword')}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
              dir="ltr"
            />
          </div>
          {err && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</div>
          )}
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('adminAccount.setPassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
