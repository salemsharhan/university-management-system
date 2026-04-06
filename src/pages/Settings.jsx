import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { Save, User, Bell, Shield } from 'lucide-react'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabicLayout =
    isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')
  const alignStart = isArabicLayout ? 'text-right' : 'text-left'
  const iconRow = isArabicLayout ? 'flex-row-reverse' : ''

  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    profile: {
      name: 'Admin User',
      email: 'admin@university.edu',
      language: 'en',
      timezone: 'Asia/Riyadh',
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
    },
  })

  const handleSave = () => {
    alert(t('settings.savedAlert'))
  }

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className={alignStart}>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-1">{t('settings.pageSubtitle')}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className={`flex items-center gap-3 mb-6 w-full ${isArabicLayout ? 'justify-start' : ''}`}>
          {isArabicLayout ? (
            <>
              <h2 className={`text-xl font-bold text-gray-900 ${alignStart}`}>{t('settings.profileTitle')}</h2>
              <User className="w-6 h-6 text-primary-600 shrink-0" />
            </>
          ) : (
            <>
              <User className="w-6 h-6 text-primary-600 shrink-0" />
              <h2 className={`text-xl font-bold text-gray-900 ${alignStart}`}>{t('settings.profileTitle')}</h2>
            </>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>{t('settings.fullName')}</label>
            <input
              type="text"
              value={settings.profile.name}
              onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, name: e.target.value } })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${alignStart}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>{t('settings.email')}</label>
            <input
              type="email"
              value={settings.profile.email}
              onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, email: e.target.value } })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${alignStart}`}
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>{t('settings.language')}</label>
              <select
                value={settings.profile.language}
                onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, language: e.target.value } })}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${alignStart}`}
              >
                <option value="en">{t('settings.langEn')}</option>
                <option value="ar">{t('settings.langAr')}</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>{t('settings.timezone')}</label>
              <select
                value={settings.profile.timezone}
                onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, timezone: e.target.value } })}
                className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${alignStart}`}
                dir="ltr"
              >
                <option value="Asia/Riyadh">{t('settings.tzRiyadh')}</option>
                <option value="UTC">{t('settings.tzUtc')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className={`flex items-center gap-3 mb-6 w-full ${isArabicLayout ? 'justify-start' : ''}`}>
          {isArabicLayout ? (
            <>
              <h2 className={`text-xl font-bold text-gray-900 ${alignStart}`}>{t('settings.notificationsTitle')}</h2>
              <Bell className="w-6 h-6 text-primary-600 shrink-0" />
            </>
          ) : (
            <>
              <Bell className="w-6 h-6 text-primary-600 shrink-0" />
              <h2 className={`text-xl font-bold text-gray-900 ${alignStart}`}>{t('settings.notificationsTitle')}</h2>
            </>
          )}
        </div>
        <div className="space-y-4">
          <label
            className={`flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors ${iconRow}`}
          >
            <div className={`min-w-0 flex-1 ${alignStart}`}>
              <p className="font-medium text-gray-900">{t('settings.emailNotif')}</p>
              <p className="text-sm text-gray-600">{t('settings.emailNotifHint')}</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={(e) =>
                setSettings({ ...settings, notifications: { ...settings.notifications, email: e.target.checked } })
              }
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 shrink-0"
            />
          </label>
          <label
            className={`flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors ${iconRow}`}
          >
            <div className={`min-w-0 flex-1 ${alignStart}`}>
              <p className="font-medium text-gray-900">{t('settings.smsNotif')}</p>
              <p className="text-sm text-gray-600">{t('settings.smsNotifHint')}</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.sms}
              onChange={(e) =>
                setSettings({ ...settings, notifications: { ...settings.notifications, sms: e.target.checked } })
              }
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 shrink-0"
            />
          </label>
          <label
            className={`flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors ${iconRow}`}
          >
            <div className={`min-w-0 flex-1 ${alignStart}`}>
              <p className="font-medium text-gray-900">{t('settings.pushNotif')}</p>
              <p className="text-sm text-gray-600">{t('settings.pushNotifHint')}</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.push}
              onChange={(e) =>
                setSettings({ ...settings, notifications: { ...settings.notifications, push: e.target.checked } })
              }
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 shrink-0"
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className={`flex items-center gap-3 mb-6 w-full ${isArabicLayout ? 'justify-start' : ''}`}>
          {isArabicLayout ? (
            <>
              <h2 className={`text-xl font-bold text-gray-900 ${alignStart}`}>{t('settings.securityTitle')}</h2>
              <Shield className="w-6 h-6 text-primary-600 shrink-0" />
            </>
          ) : (
            <>
              <Shield className="w-6 h-6 text-primary-600 shrink-0" />
              <h2 className={`text-xl font-bold text-gray-900 ${alignStart}`}>{t('settings.securityTitle')}</h2>
            </>
          )}
        </div>
        <div className="space-y-4">
          <label
            className={`flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors ${iconRow}`}
          >
            <div className={`min-w-0 flex-1 ${alignStart}`}>
              <p className="font-medium text-gray-900">{t('settings.twoFactor')}</p>
              <p className="text-sm text-gray-600">{t('settings.twoFactorHint')}</p>
            </div>
            <input
              type="checkbox"
              checked={settings.security.twoFactor}
              onChange={(e) =>
                setSettings({ ...settings, security: { ...settings.security, twoFactor: e.target.checked } })
              }
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 shrink-0"
            />
          </label>
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${alignStart}`}>{t('settings.sessionTimeout')}</label>
            <input
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) =>
                setSettings({ ...settings, security: { ...settings.security, sessionTimeout: parseInt(e.target.value, 10) } })
              }
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${alignStart}`}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      <div className={`flex ${isArabicLayout ? 'justify-start' : 'justify-end'}`}>
        <button
          type="button"
          onClick={handleSave}
          className={`flex items-center gap-2 bg-primary-gradient text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all ${iconRow}`}
        >
          <Save className="w-5 h-5 shrink-0" />
          <span>{t('settings.saveChanges')}</span>
        </button>
      </div>
    </div>
  )
}
