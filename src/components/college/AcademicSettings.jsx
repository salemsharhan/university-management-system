import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'

export default function AcademicSettings({ formData, handleChange, handleGradingScaleChange }) {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  
  return (
    <div className="space-y-8">
      {/* Credit Hours Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.academicSettings.creditHoursConfiguration')}</h3>
        
        {/* Credit Hours Source Selection */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Credit Hours Rules Source *
          </label>
          <select
            value={formData.credit_hours_source || 'semester'}
            onChange={(e) => handleChange('credit_hours_source', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="semester">From Semester Settings</option>
            <option value="major_sheet">From Major Sheet (Degree Plan)</option>
          </select>
          <p className="text-xs text-gray-600 mt-2">
            {formData.credit_hours_source === 'semester' 
              ? 'Credit hour limits will be defined per semester. Configure in Create/Edit Semester.'
              : 'Credit hour limits will be defined in the major sheet. Configure in Manage Major Sheet.'}
          </p>
        </div>

        {/* Show these fields only if using semester source (default/legacy behavior) */}
        {(!formData.credit_hours_source || formData.credit_hours_source === 'semester') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Min Credit Hours per Semester
              </label>
              <input
                type="number"
                value={formData.min_credit_hours}
                onChange={(e) => handleChange('min_credit_hours', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Default value used when creating semesters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Max Credit Hours per Semester
              </label>
              <input
                type="number"
                value={formData.max_credit_hours}
                onChange={(e) => handleChange('max_credit_hours', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Default value used when creating semesters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.maxWithPermission')}</label>
              <input
                type="number"
                value={formData.max_with_permission}
                onChange={(e) => handleChange('max_with_permission', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.minGpaForOverload')}</label>
              <input
                type="number"
                step="0.1"
                value={formData.min_gpa_for_overload}
                onChange={(e) => handleChange('min_gpa_for_overload', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Show message if using major_sheet source */}
        {formData.credit_hours_source === 'major_sheet' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              When using Major Sheet as the source, credit hour limits are configured in each major's degree plan (Manage Major Sheet).
              The fields above are used as defaults but individual major sheets override them.
            </p>
          </div>
        )}
      </div>

      {/* GPA Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.academicSettings.gpaConfiguration')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.minPassingGpa')}</label>
            <input
              type="number"
              step="0.1"
              value={formData.min_passing_gpa}
              onChange={(e) => handleChange('min_passing_gpa', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.maxGpaScale')}</label>
            <input
              type="number"
              step="0.1"
              value={formData.max_gpa_scale}
              onChange={(e) => handleChange('max_gpa_scale', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.honorRollMinGpa')}</label>
            <input
              type="number"
              step="0.1"
              value={formData.honor_roll_min_gpa}
              onChange={(e) => handleChange('honor_roll_min_gpa', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.academicProbationGpaThreshold')}</label>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.academicSettings.gradingScale')}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t('colleges.academicSettings.gradeLetter')}</th>
                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t('colleges.academicSettings.minPercent')}</th>
                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t('colleges.academicSettings.maxPercent')}</th>
                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t('colleges.academicSettings.gradePoints')}</th>
                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase`}>{t('colleges.academicSettings.passing')}</th>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.academicSettings.attendanceConfiguration')}</h3>
        <div className="space-y-4">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.attendanceRequired')}</label>
              <p className="text-xs text-gray-500">{t('colleges.academicSettings.attendanceRequiredDesc')}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.minAttendancePercentage')}</label>
              <input
                type="number"
                value={formData.min_attendance_percentage}
                onChange={(e) => handleChange('min_attendance_percentage', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.attendanceWarningThreshold')}</label>
              <input
                type="number"
                value={formData.attendance_warning_threshold}
                onChange={(e) => handleChange('attendance_warning_threshold', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.maxAbsenceDays')}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.presentAttendanceWeight')}</label>
              <input
                type="number"
                value={formData.present_weight}
                onChange={(e) => handleChange('present_weight', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.lateAttendanceWeight')}</label>
              <input
                type="number"
                value={formData.late_weight}
                onChange={(e) => handleChange('late_weight', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.excusedAttendanceWeight')}</label>
              <input
                type="number"
                value={formData.excused_weight}
                onChange={(e) => handleChange('excused_weight', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.countExcusedInRate')}</label>
              </div>
              <input
                type="checkbox"
                checked={formData.count_excused_in_rate}
                onChange={(e) => handleChange('count_excused_in_rate', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.countLateAsFull')}</label>
              </div>
              <input
                type="checkbox"
                checked={formData.count_late_as_full}
                onChange={(e) => handleChange('count_late_as_full', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.enableAttendanceWarnings')}</label>
              </div>
              <input
                type="checkbox"
                checked={formData.enable_warnings}
                onChange={(e) => handleChange('enable_warnings', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.sendWarningNotifications')}</label>
              </div>
              <input
                type="checkbox"
                checked={formData.send_notifications}
                onChange={(e) => handleChange('send_notifications', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.enforceMaxAbsenceDays')}</label>
              </div>
              <input
                type="checkbox"
                checked={formData.enforce_max_absence}
                onChange={(e) => handleChange('enforce_max_absence', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.createAlertAtMaxAbsences')}</label>
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
            <h4 className="text-md font-semibold text-gray-900 mb-3">{t('colleges.academicSettings.attendanceEditingRules')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.editWindowHours')}</label>
                <input
                  type="number"
                  value={formData.edit_window_hours}
                  onChange={(e) => handleChange('edit_window_hours', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.requireApprovalAfterEditWindow')}</label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.require_approval_after_window}
                  onChange={(e) => handleChange('require_approval_after_window', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.allowInstructorOverrideEditWindow')}</label>
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
            <h4 className="text-md font-semibold text-gray-900 mb-3">{t('colleges.academicSettings.lateArrivalConfiguration')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.lateArrivalGraceMinutes')}</label>
                <input
                  type="number"
                  value={formData.late_arrival_grace_minutes}
                  onChange={(e) => handleChange('late_arrival_grace_minutes', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.lateArrivalCutoffMinutes')}</label>
                <input
                  type="number"
                  value={formData.late_arrival_cutoff_minutes}
                  onChange={(e) => handleChange('late_arrival_cutoff_minutes', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.earlyDepartureMinutes')}</label>
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
            <h4 className="text-md font-semibold text-gray-900 mb-3">{t('colleges.academicSettings.attendanceContestConfiguration')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.contestSubmissionDeadline')}</label>
                <input
                  type="number"
                  value={formData.contest_deadline_days}
                  onChange={(e) => handleChange('contest_deadline_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.contestReviewDeadline')}</label>
                <input
                  type="number"
                  value={formData.contest_review_deadline_days}
                  onChange={(e) => handleChange('contest_review_deadline_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.maxContestDocumentSize')}</label>
                <input
                  type="number"
                  value={formData.max_contest_document_size_mb}
                  onChange={(e) => handleChange('max_contest_document_size_mb', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.autoRejectExpiredContests')}</label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.auto_reject_expired}
                  onChange={(e) => handleChange('auto_reject_expired', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.requireDocumentForContests')}</label>
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
            <h4 className="text-md font-semibold text-gray-900 mb-3">{t('colleges.academicSettings.sessionCalendarConfiguration')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.defaultUpcomingSessionsDays')}</label>
                <input
                  type="number"
                  value={formData.default_upcoming_sessions_days}
                  onChange={(e) => handleChange('default_upcoming_sessions_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.maxUpcomingSessionsDays')}</label>
                <input
                  type="number"
                  value={formData.max_upcoming_sessions_days}
                  onChange={(e) => handleChange('max_upcoming_sessions_days', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.autoExcludeWeekends')}</label>
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
            <h4 className="text-md font-semibold text-gray-900 mb-3">{t('colleges.academicSettings.autoDropConfiguration')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.autoDropEnabled')}</label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.auto_drop_enabled}
                  onChange={(e) => handleChange('auto_drop_enabled', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.autoDropThreshold')}</label>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.academicSettings.courseRegistration')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.enablePrerequisiteChecking')}</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_prerequisite_checking}
              onChange={(e) => handleChange('enable_prerequisite_checking', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-gray-50 rounded-lg`}>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('colleges.academicSettings.allowCourseWaitlist')}</label>
            </div>
            <input
              type="checkbox"
              checked={formData.allow_waitlist}
              onChange={(e) => handleChange('allow_waitlist', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.academicSettings.addDropPeriod')}</label>
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




