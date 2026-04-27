import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { syncApplicantProfile } from '../../utils/syncApplicantProfile'
import { useAuth } from '../../contexts/AuthContext'
import { Mail, KeyRound, Lock, ArrowRight, Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import LanguageToggle from '../../components/LanguageToggle'

export default function ApplicantRegister() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const { refreshUserRole, user, userRole } = useAuth()

  useEffect(() => {
    if (user && userRole === 'applicant') {
      navigate('/portal', { replace: true })
    }
  }, [user, userRole, navigate])

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // OTP-only flow: we do not rely on magic-link/PKCE redirects.

  const sendOtp = async (e) => {
    e.preventDefault()
    setError('')
    const em = email.trim().toLowerCase()
    if (!em || !em.includes('@')) {
      setError(t('applicantRegister.invalidEmail'))
      return
    }
    setLoading(true)
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: em,
        options: {
          shouldCreateUser: true,
        },
      })
      if (otpErr) throw otpErr
      setEmail(em)
      setStep(2)
    } catch (err) {
      setError(err.message || t('applicantRegister.otpSendFailed'))
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    const code = otp.trim().replace(/\s/g, '')
    if (code.length < 6) {
      setError(t('applicantRegister.invalidOtp'))
      return
    }
    setLoading(true)
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
      })
      if (vErr) throw vErr
      setStep(3)
    } catch (err) {
      setError(err.message || t('applicantRegister.otpVerifyFailed'))
    } finally {
      setLoading(false)
    }
  }

  const completeRegistration = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError(t('applicantRegister.passwordShort'))
      return
    }
    if (password !== password2) {
      setError(t('applicantRegister.passwordMismatch'))
      return
    }
    setLoading(true)
    try {
      const { error: uErr } = await supabase.auth.updateUser({ password })
      if (uErr) throw uErr

      await syncApplicantProfile({ name: displayName.trim() || undefined })
      await refreshUserRole()
      navigate('/portal', { replace: true })
    } catch (err) {
      setError(err.message || t('applicantRegister.completeFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative min-h-screen" style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}>
        <div className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} z-20`}>
          <LanguageToggle />
        </div>
        <Link
          to="/"
          className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} z-20 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur hover:bg-white transition ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {t('login.backToRoles', 'Back')}
        </Link>

        <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
          {/* Left: Brand/Visual */}
          <div className="relative hidden lg:flex flex-col justify-between p-10">
            <div className="absolute inset-0">
              <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-200 blur-3xl opacity-70" />
              <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-indigo-200 blur-3xl opacity-70" />
              <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230f172a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                }}
              />
            </div>

            <div className="relative">
              <img src="/assets/IBU Logo.png" alt="IBU Logo" className="h-20 w-auto object-contain" />
              <div className="mt-10 max-w-lg">
                <div className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200">
                  {t('applicantRegister.title')}
                </div>
                <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">
                  {t('applicantRegister.subtitle')}
                </h1>
                <p className="mt-3 text-slate-600">
                  {t('applicantRegister.noStudentRow')}
                </p>

                <div className="mt-7 grid grid-cols-1 gap-3">
                  <div className="rounded-2xl bg-white/70 ring-1 ring-slate-200 px-4 py-3">
                    <div className="text-xs font-extrabold text-slate-500">Step 1</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{t('applicantRegister.sendCode')}</div>
                  </div>
                  <div className="rounded-2xl bg-white/70 ring-1 ring-slate-200 px-4 py-3">
                    <div className="text-xs font-extrabold text-slate-500">Step 2</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{t('applicantRegister.verify')}</div>
                  </div>
                  <div className="rounded-2xl bg-white/70 ring-1 ring-slate-200 px-4 py-3">
                    <div className="text-xs font-extrabold text-slate-500">Step 3</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">{t('applicantRegister.finish')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative text-sm text-slate-500">University Management System • Imam Bukhari University (IBU)</div>
          </div>

          {/* Right: Form */}
          <div className="flex items-center justify-center p-6 lg:p-10">
            <div className="w-full max-w-md">
              <div className="lg:hidden mb-8 text-center">
                <img src="/assets/IBU Logo.png" alt="IBU Logo" className="h-16 w-auto object-contain mx-auto" />
              </div>

              <div className="rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 p-7 lg:p-8">
                <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-right' : ''}>
                    <h2 className="text-2xl font-black text-slate-900">{t('applicantRegister.title')}</h2>
                    <p className="mt-1 text-sm text-slate-600">{t('applicantRegister.subtitle')}</p>
                  </div>
                  <div className="hidden sm:flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200">
                    {t('applicantLogin.title', 'Applicant')}
                  </div>
                </div>

                <div className="mt-6 flex justify-center gap-2">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`h-2 flex-1 rounded-full max-w-[92px] ${step >= s ? 'bg-slate-900' : 'bg-slate-200'}`}
                    />
                  ))}
                </div>

                {error && (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <AlertCircle className="h-5 w-5 mt-0.5" />
                      <div className="leading-5">{error}</div>
                    </div>
                  </div>
                )}

        {step === 1 && (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className={`block text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t('applicantRegister.email')}</label>
              <div className="relative">
                <Mail className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${
                    isRTL ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3'
                  }`}
                  placeholder="name@university.edu"
                  autoComplete="email"
                  required
                />
              </div>
              <p className={`text-xs text-slate-500 mt-2 ${isRTL ? 'text-right' : ''}`}>{t('applicantRegister.emailHint')}</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {t('applicantRegister.sendCode')}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div>
              <label className={`block text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t('applicantRegister.otpLabel')}</label>
              <div className="relative">
                <KeyRound className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className={`w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm tracking-[0.35em] font-mono text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${
                    isRTL ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3'
                  }`}
                  placeholder="••••••"
                  required
                />
              </div>
              <p className={`text-xs text-slate-500 mt-2 ${isRTL ? 'text-right' : ''}`}>{t('applicantRegister.otpHint', { email })}</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {t('applicantRegister.verify')}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setOtp('')
                setError('')
              }}
              className="w-full text-sm text-slate-700 font-bold hover:text-slate-900 hover:underline transition-colors"
            >
              {t('applicantRegister.changeEmail')}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={completeRegistration} className="space-y-4">
            <div>
              <label className={`block text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t('applicantRegister.displayName')}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={`w-full rounded-2xl border border-slate-200 bg-white py-3 px-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${
                  isRTL ? 'text-right' : ''
                }`}
                placeholder={t('applicantRegister.displayNamePlaceholder')}
              />
            </div>
            <div>
              <label className={`block text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t('applicantRegister.password')}</label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${
                    isRTL ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3'
                  }`}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t('applicantRegister.passwordConfirm')}</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className={`w-full rounded-2xl border border-slate-200 bg-white py-3 px-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 ${
                  isRTL ? 'text-right' : ''
                }`}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <p className={`text-xs text-slate-500 ${isRTL ? 'text-right' : ''}`}>{t('applicantRegister.noStudentRow')}</p>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {t('applicantRegister.finish')}
            </button>
          </form>
        )}

                <p className="text-center text-sm text-slate-600 mt-6">
                  {t('applicantRegister.haveAccount')}{' '}
                  <Link to="/login/applicant" className="font-extrabold text-slate-900 hover:underline">
                    {t('applicantRegister.signIn')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
