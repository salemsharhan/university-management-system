export default function OnboardingSettings({ formData, handleChange }) {
  return (
    <div className="space-y-8">
      {/* Application Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Online Applications</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_online_applications}
              onChange={(e) => handleChange('enable_online_applications', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Application Deadline (Days)</label>
              <input
                type="number"
                value={formData.application_deadline_days}
                onChange={(e) => handleChange('application_deadline_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Require Document Upload</label>
              </div>
              <input
                type="checkbox"
                checked={formData.require_document_upload}
                onChange={(e) => handleChange('require_document_upload', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Application Fee</label>
              <input
                type="number"
                step="0.01"
                value={formData.application_fee}
                onChange={(e) => handleChange('application_fee', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Offer Acceptance Days</label>
              <input
                type="number"
                value={formData.offer_acceptance_days}
                onChange={(e) => handleChange('offer_acceptance_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Submission Days</label>
              <input
                type="number"
                value={formData.document_submission_days}
                onChange={(e) => handleChange('document_submission_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Auto Archive Days</label>
              <input
                type="number"
                value={formData.auto_archive_days}
                onChange={(e) => handleChange('auto_archive_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Applicant Requirements */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Applicant Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Applicant Age</label>
            <input
              type="number"
              value={formData.min_applicant_age}
              onChange={(e) => handleChange('min_applicant_age', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Applicant Age</label>
            <input
              type="number"
              value={formData.max_applicant_age}
              onChange={(e) => handleChange('max_applicant_age', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Scholarship Percentage</label>
            <input
              type="number"
              value={formData.min_scholarship_percent}
              onChange={(e) => handleChange('min_scholarship_percent', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Scholarship Percentage</label>
            <input
              type="number"
              value={formData.max_scholarship_percent}
              onChange={(e) => handleChange('max_scholarship_percent', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Personal Statement Min Length</label>
            <input
              type="number"
              value={formData.personal_statement_min_length}
              onChange={(e) => handleChange('personal_statement_min_length', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Personal Statement Max Length</label>
            <input
              type="number"
              value={formData.personal_statement_max_length}
              onChange={(e) => handleChange('personal_statement_max_length', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scholarship Justification Min Length</label>
            <input
              type="number"
              value={formData.scholarship_justification_min_length}
              onChange={(e) => handleChange('scholarship_justification_min_length', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scholarship Justification Max Length</label>
            <input
              type="number"
              value={formData.scholarship_justification_max_length}
              onChange={(e) => handleChange('scholarship_justification_max_length', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Priority</label>
            <select
              value={formData.default_priority}
              onChange={(e) => handleChange('default_priority', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Interview Type</label>
            <select
              value={formData.default_interview_type}
              onChange={(e) => handleChange('default_interview_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="in_person">In Person</option>
              <option value="online">Online</option>
              <option value="phone">Phone</option>
            </select>
          </div>
        </div>
      </div>

      {/* Document Requirements */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Document Size (MB)</label>
            <input
              type="number"
              value={formData.max_document_size_mb}
              onChange={(e) => handleChange('max_document_size_mb', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum file size in megabytes</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed File Types</label>
            <div className="space-y-2">
              {['PDF', 'JPG', 'JPEG', 'PNG', 'DOC', 'DOCX'].map((type) => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.allowed_file_types.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleChange('allowed_file_types', [...formData.allowed_file_types, type])
                      } else {
                        handleChange('allowed_file_types', formData.allowed_file_types.filter(t => t !== type))
                      }
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admission Committee Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Admission Committee Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Committee Members</label>
            <input
              type="number"
              value={formData.min_committee_members}
              onChange={(e) => handleChange('min_committee_members', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Require Unanimous Decision</label>
            </div>
            <input
              type="checkbox"
              checked={formData.require_unanimous}
              onChange={(e) => handleChange('require_unanimous', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Decision Timeout (Days)</label>
            <input
              type="number"
              value={formData.decision_timeout_days}
              onChange={(e) => handleChange('decision_timeout_days', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  )
}




