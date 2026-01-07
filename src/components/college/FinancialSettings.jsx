export default function FinancialSettings({ formData, handleChange }) {
  return (
    <div className="space-y-8">
      {/* Payment Gateway Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Gateway Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">TAP Payment API Key</label>
            <input
              type="text"
              value={formData.tap_api_key}
              onChange={(e) => handleChange('tap_api_key', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your TAP Payment API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">TAP Payment Secret Key</label>
            <input
              type="password"
              value={formData.tap_secret_key}
              onChange={(e) => handleChange('tap_secret_key', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your TAP Payment secret key"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Test Mode</label>
              <p className="text-xs text-gray-500">Enable test mode for payment gateway</p>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Discount Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Early Payment Discount</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Early Payment Discount %</label>
              <input
                type="number"
                value={formData.early_payment_percent}
                onChange={(e) => handleChange('early_payment_percent', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Early Payment Days</label>
              <input
                type="number"
                value={formData.early_payment_days}
                onChange={(e) => handleChange('early_payment_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Sibling Discount</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_sibling_discount}
              onChange={(e) => handleChange('enable_sibling_discount', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sibling Discount %</label>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Late Fee Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Late Fees</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Late Fee Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.late_fee_amount}
                onChange={(e) => handleChange('late_fee_amount', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Fixed late fee amount</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Late Fee Percentage</label>
              <input
                type="number"
                step="0.1"
                value={formData.late_fee_percentage}
                onChange={(e) => handleChange('late_fee_percentage', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Percentage-based late fee</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (Days)</label>
              <input
                type="number"
                value={formData.grace_period_days}
                onChange={(e) => handleChange('grace_period_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Days before late fees apply</p>
            </div>
          </div>
        </div>
      </div>

      {/* Installment Plan Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Installment Plan Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Installments</label>
            <input
              type="number"
              value={formData.min_installments}
              onChange={(e) => handleChange('min_installments', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Installments</label>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Reminder Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Days Before Due</label>
            <input
              type="number"
              value={formData.reminder_days_before_due}
              onChange={(e) => handleChange('reminder_days_before_due', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Days Between Reminders</label>
            <input
              type="number"
              value={formData.min_days_between_reminders}
              onChange={(e) => handleChange('min_days_between_reminders', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upcoming Due Date Window</label>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Prefix</label>
            <input
              type="text"
              value={formData.invoice_prefix}
              onChange={(e) => handleChange('invoice_prefix', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number Format</label>
            <input
              type="text"
              value={formData.invoice_format}
              onChange={(e) => handleChange('invoice_format', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="{prefix}-{year}-{sequence:D6}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Due Days</label>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency Code</label>
            <input
              type="text"
              value={formData.currency_code}
              onChange={(e) => handleChange('currency_code', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="USD"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency Symbol</label>
            <input
              type="text"
              value={formData.currency_symbol}
              onChange={(e) => handleChange('currency_symbol', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="$"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Decimal Places</label>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Refund Policy</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow Refunds</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Refund Period (Days)</label>
              <input
                type="number"
                value={formData.full_refund_period_days}
                onChange={(e) => handleChange('full_refund_period_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partial Refund Period (Days)</label>
              <input
                type="number"
                value={formData.partial_refund_period_days}
                onChange={(e) => handleChange('partial_refund_period_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partial Refund Percentage</label>
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
    </div>
  )
}




