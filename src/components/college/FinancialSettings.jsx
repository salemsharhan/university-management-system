import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'

export default function FinancialSettings({ formData, handleChange }) {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()

  
  return (
    <div className="space-y-8">
      {/* Payment Gateway Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.financialSettings.paymentGatewaySettings')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.tapPaymentApiKey')}</label>
            <input
              type="text"
              value={formData.tap_api_key}
              onChange={(e) => handleChange('tap_api_key', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('colleges.financialSettings.tapPaymentApiKeyPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.tapPaymentSecretKey')}</label>
            <input
              type="password"
              value={formData.tap_secret_key}
              onChange={(e) => handleChange('tap_secret_key', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('colleges.financialSettings.tapPaymentSecretKeyPlaceholder')}
            />
          </div>
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('colleges.financialSettings.testMode')}</label>
              <p className="text-xs text-gray-500">{t('colleges.financialSettings.testModeDesc')}</p>
            </div>
            <input
              type="checkbox"
              checked={formData.test_mode}
              onChange={(e) => handleChange('test_mode', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Discount Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.financialSettings.discountConfiguration')}</h3>
        <div className="space-y-4">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('colleges.financialSettings.enableEarlyPaymentDiscount')}</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_early_payment_discount}
              onChange={(e) => handleChange('enable_early_payment_discount', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.earlyPaymentDiscountPercent')}</label>
              <input
                type="number"
                value={formData.early_payment_percent}
                onChange={(e) => handleChange('early_payment_percent', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.earlyPaymentDays')}</label>
              <input
                type="number"
                value={formData.early_payment_days}
                onChange={(e) => handleChange('early_payment_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('colleges.financialSettings.enableSiblingDiscount')}</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_sibling_discount}
              onChange={(e) => handleChange('enable_sibling_discount', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.siblingDiscountPercent')}</label>
            <input
              type="number"
              value={formData.sibling_discount_percent}
              onChange={(e) => handleChange('sibling_discount_percent', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Late Fee Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.financialSettings.lateFeeConfiguration')}</h3>
        <div className="space-y-4">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('colleges.financialSettings.enableLateFees')}</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_late_fees}
              onChange={(e) => handleChange('enable_late_fees', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.lateFeeAmount')}</label>
              <input
                type="number"
                step="0.01"
                value={formData.late_fee_amount}
                onChange={(e) => handleChange('late_fee_amount', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{t('colleges.financialSettings.lateFeeAmountDesc')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.lateFeePercentage')}</label>
              <input
                type="number"
                step="0.1"
                value={formData.late_fee_percentage}
                onChange={(e) => handleChange('late_fee_percentage', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{t('colleges.financialSettings.lateFeePercentageDesc')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.gracePeriodDays')}</label>
              <input
                type="number"
                value={formData.grace_period_days}
                onChange={(e) => handleChange('grace_period_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{t('colleges.financialSettings.gracePeriodDaysDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Installment Plan Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.financialSettings.installmentPlanConfiguration')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.minInstallments')}</label>
            <input
              type="number"
              value={formData.min_installments}
              onChange={(e) => handleChange('min_installments', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.maxInstallments')}</label>
            <input
              type="number"
              value={formData.max_installments}
              onChange={(e) => handleChange('max_installments', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Payment Reminder Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.financialSettings.paymentReminderConfiguration')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.reminderDaysBeforeDue')}</label>
            <input
              type="number"
              value={formData.reminder_days_before_due}
              onChange={(e) => handleChange('reminder_days_before_due', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.minDaysBetweenReminders')}</label>
            <input
              type="number"
              value={formData.min_days_between_reminders}
              onChange={(e) => handleChange('min_days_between_reminders', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.upcomingDueDateWindow')}</label>
            <input
              type="number"
              value={formData.upcoming_due_window}
              onChange={(e) => handleChange('upcoming_due_window', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.financialSettings.invoiceSettings')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.invoicePrefix')}</label>
            <input
              type="text"
              value={formData.invoice_prefix}
              onChange={(e) => handleChange('invoice_prefix', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.invoiceNumberFormat')}</label>
            <input
              type="text"
              value={formData.invoice_format}
              onChange={(e) => handleChange('invoice_format', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="{prefix}-{year}-{sequence:D6}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.invoiceDueDays')}</label>
            <input
              type="number"
              value={formData.invoice_due_days}
              onChange={(e) => handleChange('invoice_due_days', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Currency Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.financialSettings.currencySettings')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.currencyCode')}</label>
            <input
              type="text"
              value={formData.currency_code}
              onChange={(e) => handleChange('currency_code', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="USD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.currencySymbol')}</label>
            <input
              type="text"
              value={formData.currency_symbol}
              onChange={(e) => handleChange('currency_symbol', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="$"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.decimalPlaces')}</label>
            <input
              type="number"
              value={formData.decimal_places}
              onChange={(e) => handleChange('decimal_places', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Refund Policy */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.financialSettings.refundPolicy')}</h3>
        <div className="space-y-4">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('colleges.financialSettings.allowRefunds')}</label>
            </div>
            <input
              type="checkbox"
              checked={formData.allow_refunds}
              onChange={(e) => handleChange('allow_refunds', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.fullRefundPeriodDays')}</label>
              <input
                type="number"
                value={formData.full_refund_period_days}
                onChange={(e) => handleChange('full_refund_period_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.partialRefundPeriodDays')}</label>
              <input
                type="number"
                value={formData.partial_refund_period_days}
                onChange={(e) => handleChange('partial_refund_period_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.financialSettings.partialRefundPercentage')}</label>
              <input
                type="number"
                step="0.1"
                value={formData.partial_refund_percent}
                onChange={(e) => handleChange('partial_refund_percent', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Milestones Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.financialSettings.financialMilestones')}</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>{t('colleges.financialSettings.financialMilestonesTitle')}</strong>
          </p>
          <p className="text-xs text-blue-700 mb-3">
            {t('colleges.financialSettings.financialMilestonesDesc')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
            <div className="bg-white border border-blue-200 rounded p-2">
              <div className="text-xs font-semibold text-gray-900">PM10 - {t('finance.milestones.PM10')}</div>
              <div className="text-xs text-gray-600">10% - Login & Course Access</div>
            </div>
            <div className="bg-white border border-blue-200 rounded p-2">
              <div className="text-xs font-semibold text-gray-900">PM30 - {t('finance.milestones.PM30')}</div>
              <div className="text-xs text-gray-600">30% - Class Attendance</div>
            </div>
            <div className="bg-white border border-blue-200 rounded p-2">
              <div className="text-xs font-semibold text-gray-900">PM60 - {t('finance.milestones.PM60')}</div>
              <div className="text-xs text-gray-600">60% - Exams</div>
            </div>
            <div className="bg-white border border-blue-200 rounded p-2">
              <div className="text-xs font-semibold text-gray-900">PM100 - {t('finance.milestones.PM100')}</div>
              <div className="text-xs text-gray-600">100% - Full Access & Grades</div>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3 italic">
            {t('colleges.financialSettings.milestonesCalculatedPerSemester')}
          </p>
        </div>
      </div>
    </div>
  )
}




