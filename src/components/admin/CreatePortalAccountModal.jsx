import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { createAuthUser } from '../../lib/createAuthUser'
import { supabase } from '../../lib/supabase'
import { UserPlus, Loader2, X } from 'lucide-react'

/** `create-auth-user` returns either nested (invoke) or flat (fetch fallback). */
function getCreatedUsersTableId(authResult) {
  if (!authResult) return null
  const nested = authResult.data?.user?.id
  if (nested != null) return Number(nested)
  const flat = authResult.user?.id
  if (flat != null) return Number(flat)
  return null
}

/**
 * Create Supabase auth + public.users row, then link students.user_id or instructors.user_id.
 */
export default function CreatePortalAccountModal({
  open,
  onClose,
  kind,
  recordId,
  email,
  collegeId,
  displayName,
  onLinked,
}) {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirm('')
      setLocalError('')
      setLoading(false)
    }
  }, [open])

  if (!open) return null

  const role = kind === 'instructor' ? 'instructor' : 'student'
  const table = kind === 'instructor' ? 'instructors' : 'students'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (!email?.trim()) {
      setLocalError(t('adminAccount.noEmailForAccount'))
      return
    }
    if (password.length < 6) {
      setLocalError(t('adminAccount.passwordMin'))
      return
    }
    if (password !== confirm) {
      setLocalError(t('adminAccount.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const authResult = await createAuthUser({
        email: email.trim(),
        password,
        role,
        college_id: collegeId ?? null,
        name: (displayName || email).trim(),
      })

      const body = authResult?.data ?? authResult
      if (body && typeof body === 'object' && body.error) {
        setLocalError(String(body.error))
        return
      }

      const usersTableId = getCreatedUsersTableId(authResult)
      if (usersTableId == null) {
        setLocalError(t('adminAccount.createAccountUnexpectedResponse'))
        return
      }

      const { error: updErr } = await supabase.from(table).update({ user_id: usersTableId }).eq('id', recordId)
      if (updErr) {
        setLocalError(updErr.message)
        return
      }

      onLinked?.()
      onClose()
    } catch (err) {
      const msg = err?.message || String(err)
      if (msg.includes('Failed to fetch') || msg.includes('Function not found')) {
        setLocalError(t('adminAccount.functionNotDeployedCreate'))
      } else {
        setLocalError(msg)
      }
    } finally {
      setLoading(false)
    }
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
          <UserPlus className="w-6 h-6 text-primary-600" />
          <h2 className={`text-xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('adminAccount.createPortalAccountTitle')}
          </h2>
        </div>
        <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('adminAccount.createPortalAccountHint')}
        </p>
        <div className="mb-4 space-y-1">
          <label className={`block text-xs font-medium text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('students.email')}
          </label>
          <p className="text-sm font-medium text-gray-900 break-all" dir="ltr">
            {email?.trim() || '—'}
          </p>
        </div>
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
          {localError && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{localError}</div>
          )}
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-xl hover:bg-gray-50">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('adminAccount.createPortalAccountSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
