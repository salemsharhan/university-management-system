import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { Send } from 'lucide-react'

export default function EmailSettings({
  formData,
  handleChange,
  onSendTestEmail,
  testEmailSending = false,
  testEmailFeedback = null,
}) {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()

  const testAddress = formData.test_email_address ?? ''

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.emailSettings.smtpConfiguration')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.emailSettings.smtpHost')}</label>
            <input
              type="text"
              value={formData.smtp_host}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.emailSettings.smtpPort')}</label>
            <input
              type="number"
              value={formData.smtp_port}
              onChange={(e) => handleChange('smtp_port', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="587"
            />
          </div>
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('colleges.emailSettings.enableSslTls')}</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_ssl}
              onChange={(e) => handleChange('enable_ssl', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.emailSettings.smtpUsername')}</label>
            <input
              type="text"
              value={formData.smtp_username}
              onChange={(e) => handleChange('smtp_username', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.emailSettings.smtpPassword')}</label>
            <input
              type="password"
              value={formData.smtp_password}
              onChange={(e) => handleChange('smtp_password', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.emailSettings.fromEmailAddress')}</label>
            <input
              type="email"
              value={formData.from_email}
              onChange={(e) => handleChange('from_email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('colleges.emailSettings.fromEmailAddressPlaceholder')}
            />
            <p className="text-xs text-gray-500 mt-1">{t('colleges.emailSettings.fromEmailAddressHint')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.emailSettings.fromName')}</label>
            <input
              type="text"
              value={formData.from_name}
              onChange={(e) => handleChange('from_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('colleges.emailSettings.fromNamePlaceholder')}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.emailSettings.notificationSettings')}</h3>
        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
          <div>
            <label className="text-sm font-medium text-gray-700">{t('colleges.emailSettings.enableEmailNotifications')}</label>
            <p className="text-xs text-gray-500">{t('colleges.emailSettings.enableEmailNotificationsDesc')}</p>
          </div>
          <input
            type="checkbox"
            checked={formData.enable_email_notifications}
            onChange={(e) => handleChange('enable_email_notifications', e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.emailSettings.testEmailConfiguration')}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.emailSettings.testEmailAddress')}</label>
            <input
              type="email"
              value={testAddress}
              onChange={(e) => handleChange('test_email_address', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('colleges.emailSettings.testEmailAddressPlaceholder')}
            />
          </div>
          {onSendTestEmail && (
            <div className={`flex flex-wrap items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={onSendTestEmail}
                disabled={testEmailSending}
                className={`inline-flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-4 py-2 rounded-lg font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Send className="w-4 h-4" />
                <span>{t('colleges.emailSettings.sendTestEmail')}</span>
              </button>
              {testEmailFeedback?.kind === 'success' && (
                <p className="text-sm text-green-700">{testEmailFeedback.text}</p>
              )}
              {testEmailFeedback?.kind === 'error' && (
                <p className="text-sm text-red-700">{testEmailFeedback.text}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




