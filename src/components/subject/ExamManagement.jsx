import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Save, X, Calendar, Clock, AlertCircle } from 'lucide-react'

export default function ExamManagement({ subjectId, classId, examId, onClose, onSave }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    exam_type: 'midterm',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: '',
    location: '',
    online_link: '',
    total_points: 100,
    passing_points: '',
    weight_percentage: 0,
    instructions: '',
    instructions_ar: '',
    allow_calculator: false,
    allow_notes: false,
  })

  useEffect(() => {
    if (examId) {
      fetchExam()
    }
  }, [examId])

  const fetchExam = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('subject_exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (fetchError) throw fetchError

      const scheduledDate = data.scheduled_date ? new Date(data.scheduled_date).toISOString().split('T')[0] : ''
      setFormData({
        title: data.title || '',
        title_ar: data.title_ar || '',
        description: data.description || '',
        description_ar: data.description_ar || '',
        exam_type: data.exam_type || 'midterm',
        scheduled_date: scheduledDate,
        start_time: data.start_time || '',
        end_time: data.end_time || '',
        duration_minutes: data.duration_minutes?.toString() || '',
        location: data.location || '',
        online_link: data.online_link || '',
        total_points: data.total_points || 100,
        passing_points: data.passing_points?.toString() || '',
        weight_percentage: data.weight_percentage || 0,
        instructions: data.instructions || '',
        instructions_ar: data.instructions_ar || '',
        allow_calculator: data.allow_calculator || false,
        allow_notes: data.allow_notes || false,
      })
    } catch (err) {
      console.error('Error fetching exam:', err)
      setError('Failed to load exam')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const submitData = {
        subject_id: subjectId,
        class_id: classId || null,
        title: formData.title.trim(),
        title_ar: formData.title_ar.trim() || null,
        description: formData.description.trim() || null,
        description_ar: formData.description_ar.trim() || null,
        exam_type: formData.exam_type,
        scheduled_date: formData.scheduled_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        location: formData.location.trim() || null,
        online_link: formData.online_link.trim() || null,
        total_points: parseFloat(formData.total_points),
        passing_points: formData.passing_points ? parseFloat(formData.passing_points) : null,
        weight_percentage: parseFloat(formData.weight_percentage) || 0,
        instructions: formData.instructions.trim() || null,
        instructions_ar: formData.instructions_ar.trim() || null,
        allow_calculator: formData.allow_calculator,
        allow_notes: formData.allow_notes,
        status: examId ? undefined : 'EX_DRF',
      }

      if (examId) {
        const { error: updateError } = await supabase
          .from('subject_exams')
          .update(submitData)
          .eq('id', examId)

        if (updateError) throw updateError
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()

        const { error: insertError } = await supabase
          .from('subject_exams')
          .insert({
            ...submitData,
            created_by: userData.id,
          })

        if (insertError) throw insertError
      }

      if (onSave) onSave()
      if (onClose) onClose()
    } catch (err) {
      console.error('Error saving exam:', err)
      setError(err.message || 'Failed to save exam')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {examId ? 'Edit Exam' : 'Create Exam'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Exam title"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Type *
              </label>
              <select
                value={formData.exam_type}
                onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="project">Project</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Date *
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time *
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Points *
              </label>
              <input
                type="number"
                value={formData.total_points}
                onChange={(e) => setFormData({ ...formData, total_points: e.target.value })}
                required
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passing Points
              </label>
              <input
                type="number"
                value={formData.passing_points}
                onChange={(e) => setFormData({ ...formData, passing_points: e.target.value })}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Room number or location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Online Link (if online)
              </label>
              <input
                type="url"
                value={formData.online_link}
                onChange={(e) => setFormData({ ...formData, online_link: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Exam instructions for students"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.allow_calculator}
                onChange={(e) => setFormData({ ...formData, allow_calculator: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Allow calculator
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.allow_notes}
                onChange={(e) => setFormData({ ...formData, allow_notes: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Allow notes
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Saving...' : 'Save Exam'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}




