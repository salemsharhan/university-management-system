export default function EmailSettings({ formData, handleChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SMTP Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
            <input
              type="text"
              value={formData.smtp_host}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
            <input
              type="number"
              value={formData.smtp_port}
              onChange={(e) => handleChange('smtp_port', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="587"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable SSL/TLS</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_ssl}
              onChange={(e) => handleChange('enable_ssl', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
            <input
              type="text"
              value={formData.smtp_username}
              onChange={(e) => handleChange('smtp_username', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
            <input
              type="password"
              value={formData.smtp_password}
              onChange={(e) => handleChange('smtp_password', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Email Address</label>
            <input
              type="email"
              value={formData.from_email}
              onChange={(e) => handleChange('from_email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="noreply@university.edu"
            />
            <p className="text-xs text-gray-500 mt-1">Email address that will appear as sender</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
            <input
              type="text"
              value={formData.from_name}
              onChange={(e) => handleChange('from_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="University Name"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-sm font-medium text-gray-700">Enable Email Notifications</label>
            <p className="text-xs text-gray-500">Send email notifications for system events</p>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Email Configuration</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Test Email Address</label>
          <input
            type="email"
            value={formData.test_email}
            onChange={(e) => handleChange('test_email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="test@example.com"
          />
        </div>
      </div>
    </div>
  )
}




