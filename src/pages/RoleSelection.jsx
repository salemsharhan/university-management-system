import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { GraduationCap, Shield, User, BookOpen, ArrowLeft } from 'lucide-react'

export default function RoleSelection() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()

  const roles = [
    {
      id: 'admin',
      name: t('roleSelection.superAdmin'),
      description: t('roleSelection.superAdminDesc'),
      icon: Shield,
      route: '/login/admin',
      accent: 'from-indigo-500 to-sky-500',
    },
    {
      id: 'user',
      name: t('roleSelection.collegeAdmin'),
      description: t('roleSelection.collegeAdminDesc'),
      icon: GraduationCap,
      route: '/login/college',
      accent: 'from-fuchsia-500 to-purple-500',
    },
    {
      id: 'instructor',
      name: t('roleSelection.instructor'),
      description: t('roleSelection.instructorDesc'),
      icon: User,
      route: '/login/instructor',
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'student',
      name: t('roleSelection.student'),
      description: t('roleSelection.studentDesc'),
      icon: BookOpen,
      route: '/login/student',
      accent: 'from-orange-500 to-red-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 -left-28 h-[420px] w-[420px] rounded-full bg-orange-200/70 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-indigo-200/70 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230f172a' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} z-20 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur hover:bg-white transition ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          {t('login.backToRoles', 'Back to roles')}
        </button>

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-14 lg:py-16">
          {/* Header */}
          <div className={`mx-auto w-full max-w-3xl text-center ${isRTL ? 'text-right' : ''}`}>
            <div className="flex justify-center">
              <img
                src="/assets/IBU Logo.png"
                alt="IBU Logo"
                className="h-24 sm:h-28 lg:h-32 w-auto object-contain"
              />
            </div>

            <div className="mt-6 inline-flex items-center rounded-full bg-white/80 px-4 py-1.5 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200">
              {t('roleSelection.subtitle')}
            </div>

            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
              {t('roleSelection.title')}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600">{t('roleSelection.selectRole')}</p>
          </div>

          {/* Cards */}
          <div className="mx-auto mt-10 w-full max-w-5xl">
            <div className="rounded-[28px] bg-white/80 backdrop-blur shadow-xl ring-1 ring-slate-200 p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                {roles.map((role) => {
                  const Icon = role.icon
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => navigate(role.route)}
                      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:shadow-md hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100 ${
                        isRTL ? 'text-right' : ''
                      }`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${role.accent}`} />
                      <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${role.accent} p-[1px] shadow-sm`}>
                            <div className="h-full w-full rounded-[1rem] bg-white flex items-center justify-center">
                              <Icon className="h-6 w-6 text-slate-900" />
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-slate-900">{role.name}</div>
                            <div className="mt-1 text-sm text-slate-600 leading-6">{role.description}</div>
                          </div>
                        </div>

                        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200 text-slate-700 transition group-hover:bg-white">
                          <svg
                            className={`h-5 w-5 ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'} transition-transform`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      <div className={`mt-5 flex items-center text-sm font-extrabold text-slate-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span>{t('roleSelection.continue')}</span>
                        <svg
                          className={`w-5 h-5 ${isRTL ? 'mr-2 group-hover:-translate-x-0.5 rotate-180' : 'ml-2 group-hover:translate-x-0.5'} transition-transform`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto rounded-2xl bg-slate-900 text-white px-6 py-3 font-extrabold shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
                >
                  {t('roleSelection.applyForAdmission')}
                </button>
                <p className="text-center sm:text-right text-xs text-slate-500">{t('roleSelection.copyright')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



