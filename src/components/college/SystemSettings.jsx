export default function SystemSettings({ formData, handleChange }) {
  return (
    <div className="space-y-8">
      {/* Security Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (Minutes)</label>
            <input
              type="number"
              value={formData.session_timeout_minutes}
              onChange={(e) => handleChange('session_timeout_minutes', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">User session will expire after this period of inactivity</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (Days)</label>
            <input
              type="number"
              value={formData.password_expiry_days}
              onChange={(e) => handleChange('password_expiry_days', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Login Attempts</label>
            <input
              type="number"
              value={formData.max_login_attempts}
              onChange={(e) => handleChange('max_login_attempts', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Lockout Duration (Minutes)</label>
            <input
              type="number"
              value={formData.account_lockout_minutes}
              onChange={(e) => handleChange('account_lockout_minutes', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Two-Factor Authentication</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_two_factor}
              onChange={(e) => handleChange('enable_two_factor', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* File Upload Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">File Upload Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum File Upload Size (MB)</label>
            <input
              type="number"
              value={formData.max_file_upload_size_mb}
              onChange={(e) => handleChange('max_file_upload_size_mb', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum size for file uploads in megabytes</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File Storage Provider</label>
            <select
              value={formData.storage_provider}
              onChange={(e) => handleChange('storage_provider', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="local">Local Storage</option>
              <option value="s3">AWS S3</option>
              <option value="cloudinary">Cloudinary</option>
            </select>
          </div>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Mode</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Maintenance Mode</label>
            </div>
            <input
              type="checkbox"
              checked={formData.maintenance_enabled}
              onChange={(e) => handleChange('maintenance_enabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Message</label>
            <textarea
              value={formData.maintenance_message}
              onChange={(e) => handleChange('maintenance_message', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="System is under maintenance..."
            />
          </div>
        </div>
      </div>

      {/* Backup Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Automatic Backups</label>
            </div>
            <input
              type="checkbox"
              checked={formData.backup_enabled}
              onChange={(e) => handleChange('backup_enabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Backup Retention (Days)</label>
              <input
                type="number"
                value={formData.backup_retention_days}
                onChange={(e) => handleChange('backup_retention_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Backup Schedule (Cron)</label>
              <input
                type="text"
                value={formData.backup_schedule}
                onChange={(e) => handleChange('backup_schedule', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0 2 * * *"
              />
              <p className="text-xs text-gray-500 mt-1">Use cron format: 0 2 * * * (Daily at 2 AM)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Localization Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Localization Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Language</label>
            <select
              value={formData.default_language}
              onChange={(e) => handleChange('default_language', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Auto-Detect User Language</label>
            </div>
            <input
              type="checkbox"
              checked={formData.auto_detect_language}
              onChange={(e) => handleChange('auto_detect_language', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Right-to-Left Support</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_rtl}
              onChange={(e) => handleChange('enable_rtl', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}




