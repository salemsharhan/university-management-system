export default function AcademicSettings({ formData, handleChange, handleGradingScaleChange }) {
  return (
    <div className="space-y-8">
      {/* Credit Hours Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Hours Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Credit Hours per Semester</label>
            <input
              type="number"
              value={formData.min_credit_hours}
              onChange={(e) => handleChange('min_credit_hours', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Credit Hours per Semester</label>
            <input
              type="number"
              value={formData.max_credit_hours}
              onChange={(e) => handleChange('max_credit_hours', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum with Permission</label>
            <input
              type="number"
              value={formData.max_with_permission}
              onChange={(e) => handleChange('max_with_permission', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum GPA for Overload</label>
            <input
              type="number"
              step="0.1"
              value={formData.min_gpa_for_overload}
              onChange={(e) => handleChange('min_gpa_for_overload', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* GPA Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">GPA Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Passing GPA</label>
            <input
              type="number"
              step="0.1"
              value={formData.min_passing_gpa}
              onChange={(e) => handleChange('min_passing_gpa', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum GPA Scale</label>
            <input
              type="number"
              step="0.1"
              value={formData.max_gpa_scale}
              onChange={(e) => handleChange('max_gpa_scale', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Honor Roll Minimum GPA</label>
            <input
              type="number"
              step="0.1"
              value={formData.honor_roll_min_gpa}
              onChange={(e) => handleChange('honor_roll_min_gpa', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Probation GPA Threshold</label>
            <input
              type="number"
              step="0.1"
              value={formData.probation_threshold}
              onChange={(e) => handleChange('probation_threshold', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Grading Scale */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grading Scale</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade Letter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade Points</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passing</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formData.grading_scale.map((grade, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={grade.letter}
                      onChange={(e) => handleGradingScaleChange(index, 'letter', e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={grade.minPercent}
                      onChange={(e) => handleGradingScaleChange(index, 'minPercent', parseInt(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={grade.maxPercent}
                      onChange={(e) => handleGradingScaleChange(index, 'maxPercent', parseInt(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.1"
                      value={grade.points}
                      onChange={(e) => handleGradingScaleChange(index, 'points', parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={grade.passing}
                      onChange={(e) => handleGradingScaleChange(index, 'passing', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Attendance Required</label>
              <p className="text-xs text-gray-500">Require attendance tracking for classes</p>
            </div>
            <input
              type="checkbox"
              checked={formData.attendance_required}
              onChange={(e) => handleChange('attendance_required', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Attendance Percentage</label>
              <input
                type="number"
                value={formData.min_attendance_percentage}
                onChange={(e) => handleChange('min_attendance_percentage', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Warning Threshold</label>
              <input
                type="number"
                value={formData.attendance_warning_threshold}
                onChange={(e) => handleChange('attendance_warning_threshold', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Absence Days</label>
              <input
                type="number"
                value={formData.max_absence_days}
                onChange={(e) => handleChange('max_absence_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Present Attendance Weight (%)</label>
              <input
                type="number"
                value={formData.present_weight}
                onChange={(e) => handleChange('present_weight', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Late Attendance Weight (%)</label>
              <input
                type="number"
                value={formData.late_weight}
                onChange={(e) => handleChange('late_weight', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excused Attendance Weight (%)</label>
              <input
                type="number"
                value={formData.excused_weight}
                onChange={(e) => handleChange('excused_weight', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Count Excused in Attendance Rate</label>
              </div>
              <input
                type="checkbox"
                checked={formData.count_excused_in_rate}
                onChange={(e) => handleChange('count_excused_in_rate', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Count Late as Full Attendance</label>
              </div>
              <input
                type="checkbox"
                checked={formData.count_late_as_full}
                onChange={(e) => handleChange('count_late_as_full', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Attendance Warnings</label>
              </div>
              <input
                type="checkbox"
                checked={formData.enable_warnings}
                onChange={(e) => handleChange('enable_warnings', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Send Warning Notifications</label>
              </div>
              <input
                type="checkbox"
                checked={formData.send_notifications}
                onChange={(e) => handleChange('send_notifications', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Enforce Max Absence Days</label>
              </div>
              <input
                type="checkbox"
                checked={formData.enforce_max_absence}
                onChange={(e) => handleChange('enforce_max_absence', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Create Alert at Max Absences</label>
              </div>
              <input
                type="checkbox"
                checked={formData.create_alert_at_max}
                onChange={(e) => handleChange('create_alert_at_max', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Attendance Editing Rules</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Edit Window Hours</label>
                <input
                  type="number"
                  value={formData.edit_window_hours}
                  onChange={(e) => handleChange('edit_window_hours', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Require Approval After Edit Window</label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.require_approval_after_window}
                  onChange={(e) => handleChange('require_approval_after_window', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Allow Instructor Override Edit Window</label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_instructor_override}
                  onChange={(e) => handleChange('allow_instructor_override', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Late Arrival Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Late Arrival Grace Minutes</label>
                <input
                  type="number"
                  value={formData.late_arrival_grace_minutes}
                  onChange={(e) => handleChange('late_arrival_grace_minutes', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Late Arrival Cutoff Minutes</label>
                <input
                  type="number"
                  value={formData.late_arrival_cutoff_minutes}
                  onChange={(e) => handleChange('late_arrival_cutoff_minutes', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Early Departure Minutes</label>
                <input
                  type="number"
                  value={formData.early_departure_minutes}
                  onChange={(e) => handleChange('early_departure_minutes', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Attendance Contest Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contest Submission Deadline (Days)</label>
                <input
                  type="number"
                  value={formData.contest_deadline_days}
                  onChange={(e) => handleChange('contest_deadline_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contest Review Deadline (Days)</label>
                <input
                  type="number"
                  value={formData.contest_review_deadline_days}
                  onChange={(e) => handleChange('contest_review_deadline_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Contest Document Size (MB)</label>
                <input
                  type="number"
                  value={formData.max_contest_document_size_mb}
                  onChange={(e) => handleChange('max_contest_document_size_mb', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto Reject Expired Contests</label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.auto_reject_expired}
                  onChange={(e) => handleChange('auto_reject_expired', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Require Document for Contests</label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.require_document_for_contests}
                  onChange={(e) => handleChange('require_document_for_contests', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Session Calendar Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Upcoming Sessions Days</label>
                <input
                  type="number"
                  value={formData.default_upcoming_sessions_days}
                  onChange={(e) => handleChange('default_upcoming_sessions_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Upcoming Sessions Days</label>
                <input
                  type="number"
                  value={formData.max_upcoming_sessions_days}
                  onChange={(e) => handleChange('max_upcoming_sessions_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto Exclude Weekends</label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.auto_exclude_weekends}
                  onChange={(e) => handleChange('auto_exclude_weekends', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Auto Drop Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto Drop Enabled</label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.auto_drop_enabled}
                  onChange={(e) => handleChange('auto_drop_enabled', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Auto Drop Threshold (%)</label>
                <input
                  type="number"
                  value={formData.auto_drop_threshold}
                  onChange={(e) => handleChange('auto_drop_threshold', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Registration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Registration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Prerequisite Checking</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_prerequisite_checking}
              onChange={(e) => handleChange('enable_prerequisite_checking', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow Course Waitlist</label>
            </div>
            <input
              type="checkbox"
              checked={formData.allow_waitlist}
              onChange={(e) => handleChange('allow_waitlist', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add/Drop Period (Days)</label>
            <input
              type="number"
              value={formData.add_drop_period_days}
              onChange={(e) => handleChange('add_drop_period_days', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  )
}




