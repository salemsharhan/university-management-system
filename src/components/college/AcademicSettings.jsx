import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'

export default function AcademicSettings({ formData, handleChange, handleGradingScaleChange, readOnlyCreditsAndGrading = false }) {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const ns = readOnlyCreditsAndGrading ? 'colleges.academicSettings' : 'universitySettings.academic'
  
  return (
    <div className="space-y-8">
      {/* University-wide settings - Grading Scale & Semester Credits: only show "blocked" message in College Create, not in University Settings */}
      {readOnlyCreditsAndGrading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">{t('colleges.academicSettings.fromUniversitySettings') || 'From University Settings (Common for All Colleges)'}</h3>
          <p className="text-sm text-blue-800">
            {t('colleges.academicSettings.gradingScaleAndCreditsNote') || 'Grading scale and semester credit limits are configured in University Settings and apply to all colleges. Configure these in University Settings → Academic.'}
          </p>
        </div>
      )}

      {/* Grading Scale & Semester Credits - editable only in University Settings */}
      {!readOnlyCreditsAndGrading && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t(`${ns}.semesterCreditLimits`) || t('colleges.academicSettings.semesterCreditLimits') || 'Semester Credit Limits'}</h3>
            <p className="text-sm text-gray-600 mb-4">{t(`${ns}.semesterCreditLimitsDesc`) || t('colleges.academicSettings.semesterCreditLimitsDesc') || 'These apply to all colleges.'}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t(`${ns}.minCreditHours`) || t('colleges.academicSettings.minCreditHours') || 'Min Credit Hours'}</label>
                <input type="number" value={formData.min_credit_hours ?? 12} onChange={(e) => handleChange('min_credit_hours', parseInt(e.target.value) || 12)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t(`${ns}.maxCreditHours`) || t('colleges.academicSettings.maxCreditHours') || 'Max Credit Hours'}</label>
                <input type="number" value={formData.max_credit_hours ?? 18} onChange={(e) => handleChange('max_credit_hours', parseInt(e.target.value) || 18)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t(`${ns}.maxWithPermission`) || t('colleges.academicSettings.maxWithPermission') || 'Max with Permission'}</label>
                <input type="number" value={formData.max_with_permission ?? 21} onChange={(e) => handleChange('max_with_permission', parseInt(e.target.value) || 21)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t(`${ns}.minGpaForOverload`) || t('colleges.academicSettings.minGpaForOverload') || 'Min GPA for Overload'}</label>
                <input type="number" step="0.1" value={formData.min_gpa_for_overload ?? 3} onChange={(e) => handleChange('min_gpa_for_overload', parseFloat(e.target.value) || 3)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t(`${ns}.gradingScale`) || t('colleges.academicSettings.gradingScale') || 'Grading Scale'}</h3>
            <p className="text-sm text-gray-600 mb-4">{t(`${ns}.gradingScaleDesc`) || t('colleges.academicSettings.gradingScaleDesc') || 'Letter grades and grade points. These apply to all colleges.'}</p>
            {formData.grading_scale && Array.isArray(formData.grading_scale) && handleGradingScaleChange && (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">{t(`${ns}.letter`) || t('colleges.academicSettings.letter') || 'Letter'}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">{t(`${ns}.minPercent`) || t('colleges.academicSettings.minPercent') || 'Min %'}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">{t(`${ns}.maxPercent`) || t('colleges.academicSettings.maxPercent') || 'Max %'}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">{t(`${ns}.points`) || t('colleges.academicSettings.points') || 'Points'}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">{t(`${ns}.passing`) || t('colleges.academicSettings.passing') || 'Passing'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.grading_scale.map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-200">
                        <td className="px-4 py-2"><input type="text" value={row.letter ?? ''} onChange={(e) => handleGradingScaleChange(idx, 'letter', e.target.value)} className="w-20 px-2 py-1 border rounded" /></td>
                        <td className="px-4 py-2"><input type="number" value={row.minPercent ?? 0} onChange={(e) => handleGradingScaleChange(idx, 'minPercent', parseFloat(e.target.value))} className="w-20 px-2 py-1 border rounded" /></td>
                        <td className="px-4 py-2"><input type="number" value={row.maxPercent ?? 0} onChange={(e) => handleGradingScaleChange(idx, 'maxPercent', parseFloat(e.target.value))} className="w-20 px-2 py-1 border rounded" /></td>
                        <td className="px-4 py-2"><input type="number" step="0.1" value={row.points ?? 0} onChange={(e) => handleGradingScaleChange(idx, 'points', parseFloat(e.target.value))} className="w-20 px-2 py-1 border rounded" /></td>
                        <td className="px-4 py-2"><input type="checkbox" checked={row.passing ?? false} onChange={(e) => handleGradingScaleChange(idx, 'passing', e.target.checked)} className="rounded" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

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




