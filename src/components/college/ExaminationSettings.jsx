export default function ExaminationSettings({ formData, handleChange }) {
  return (
    <div className="space-y-8">
      {/* Grading Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grading Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Passing Percentage</label>
            <input
              type="number"
              value={formData.min_passing_percentage}
              onChange={(e) => handleChange('min_passing_percentage', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Passing Grade Points</label>
            <input
              type="number"
              step="0.1"
              value={formData.min_passing_grade_points}
              onChange={(e) => handleChange('min_passing_grade_points', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Excellence Percentage</label>
            <input
              type="number"
              value={formData.min_excellence_percentage}
              onChange={(e) => handleChange('min_excellence_percentage', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Good Percentage</label>
            <input
              type="number"
              value={formData.min_good_percentage}
              onChange={(e) => handleChange('min_good_percentage', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Exam Type Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Type Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Midterm Weight (%)</label>
            <input
              type="number"
              value={formData.default_midterm_weight}
              onChange={(e) => handleChange('default_midterm_weight', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Final Weight (%)</label>
            <input
              type="number"
              value={formData.default_final_weight}
              onChange={(e) => handleChange('default_final_weight', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Quiz Weight (%)</label>
            <input
              type="number"
              value={formData.default_quiz_weight}
              onChange={(e) => handleChange('default_quiz_weight', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Assignment Weight (%)</label>
            <input
              type="number"
              value={formData.default_assignment_weight}
              onChange={(e) => handleChange('default_assignment_weight', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enforce Weight Sum 100%</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enforce_weight_sum_100}
              onChange={(e) => handleChange('enforce_weight_sum_100', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow Custom Exam Types</label>
            </div>
            <input
              type="checkbox"
              checked={formData.allow_custom_exam_types}
              onChange={(e) => handleChange('allow_custom_exam_types', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Scheduling Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduling Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exam Schedule Generation Window (Days)</label>
            <input
              type="number"
              value={formData.exam_schedule_generation_window_days}
              onChange={(e) => handleChange('exam_schedule_generation_window_days', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Upcoming Exams Window (Days)</label>
            <input
              type="number"
              value={formData.default_upcoming_exams_window_days}
              onChange={(e) => handleChange('default_upcoming_exams_window_days', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Preparation Days</label>
            <input
              type="number"
              value={formData.min_preparation_days}
              onChange={(e) => handleChange('min_preparation_days', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Exams Per Day</label>
            <input
              type="number"
              value={formData.max_exams_per_day}
              onChange={(e) => handleChange('max_exams_per_day', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow Weekend Exams</label>
            </div>
            <input
              type="checkbox"
              checked={formData.allow_weekend_exams}
              onChange={(e) => handleChange('allow_weekend_exams', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow Overlapping Exams</label>
            </div>
            <input
              type="checkbox"
              checked={formData.allow_overlapping_exams}
              onChange={(e) => handleChange('allow_overlapping_exams', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Makeup Exam Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Makeup Exam Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow Makeup Exams</label>
            </div>
            <input
              type="checkbox"
              checked={formData.allow_makeup_exams}
              onChange={(e) => handleChange('allow_makeup_exams', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Makeup Request Deadline (Days)</label>
              <input
                type="number"
                value={formData.makeup_request_deadline_days}
                onChange={(e) => handleChange('makeup_request_deadline_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Makeup Attempts</label>
              <input
                type="number"
                value={formData.max_makeup_attempts}
                onChange={(e) => handleChange('max_makeup_attempts', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Makeup Exam Penalty Percentage</label>
              <input
                type="number"
                step="0.1"
                value={formData.makeup_exam_penalty_percentage}
                onChange={(e) => handleChange('makeup_exam_penalty_percentage', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Room Allocation Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Allocation Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Require Room Allocation</label>
            </div>
            <input
              type="checkbox"
              checked={formData.require_room_allocation}
              onChange={(e) => handleChange('require_room_allocation', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Students Per Room</label>
            <input
              type="number"
              value={formData.students_per_room}
              onChange={(e) => handleChange('students_per_room', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Social Distancing Capacity (%)</label>
            <input
              type="number"
              value={formData.social_distancing_capacity_percent}
              onChange={(e) => handleChange('social_distancing_capacity_percent', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enforce Social Distancing</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enforce_social_distancing}
              onChange={(e) => handleChange('enforce_social_distancing', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Invigilator Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invigilator Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Require Invigilators</label>
            </div>
            <input
              type="checkbox"
              checked={formData.require_invigilators}
              onChange={(e) => handleChange('require_invigilators', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Invigilators Per Room</label>
            <input
              type="number"
              value={formData.min_invigilators_per_room}
              onChange={(e) => handleChange('min_invigilators_per_room', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Invigilator Assignments Per Day</label>
            <input
              type="number"
              value={formData.max_invigilator_assignments_per_day}
              onChange={(e) => handleChange('max_invigilator_assignments_per_day', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Students Per Invigilator</label>
            <input
              type="number"
              value={formData.students_per_invigilator}
              onChange={(e) => handleChange('students_per_invigilator', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Conflict Detection Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conflict Detection Configuration</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Conflict Detection</label>
            </div>
            <input
              type="checkbox"
              checked={formData.enable_conflict_detection}
              onChange={(e) => handleChange('enable_conflict_detection', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Check Student Conflicts</label>
              </div>
              <input
                type="checkbox"
                checked={formData.check_student_conflicts}
                onChange={(e) => handleChange('check_student_conflicts', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Check Invigilator Conflicts</label>
              </div>
              <input
                type="checkbox"
                checked={formData.check_invigilator_conflicts}
                onChange={(e) => handleChange('check_invigilator_conflicts', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Check Room Conflicts</label>
              </div>
              <input
                type="checkbox"
                checked={formData.check_room_conflicts}
                onChange={(e) => handleChange('check_room_conflicts', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}




