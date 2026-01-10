import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Save, X, Calendar, FileText, AlertCircle } from 'lucide-react'

export default function HomeworkManagement({ subjectId, classId, homeworkId, onClose, onSave }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    instructions: '',
    instructions_ar: '',
    total_points: 100,
    weight_percentage: 0,
    due_date: '',
    allow_late_submission: false,
    late_penalty_percentage: 0,
    attachment_url: '',
  })

  useEffect(() => {
    if (homeworkId) {
      fetchHomework()
    }
  }, [homeworkId])

  const fetchHomework = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('subject_homework')
        .select('*')
        .eq('id', homeworkId)
        .single()

      if (fetchError) throw fetchError

      setFormData({
        title: data.title || '',
        title_ar: data.title_ar || '',
        description: data.description || '',
        description_ar: data.description_ar || '',
        instructions: data.instructions || '',
        instructions_ar: data.instructions_ar || '',
        total_points: data.total_points || 100,
        weight_percentage: data.weight_percentage || 0,
        due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : '',
        allow_late_submission: data.allow_late_submission || false,
        late_penalty_percentage: data.late_penalty_percentage || 0,
        attachment_url: data.attachment_url || '',
      })
    } catch (err) {
      console.error('Error fetching homework:', err)
      setError('Failed to load homework')
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
        description: formData.description.trim(),
        description_ar: formData.description_ar.trim() || null,
        instructions: formData.instructions.trim() || null,
        instructions_ar: formData.instructions_ar.trim() || null,
        total_points: parseFloat(formData.total_points),
        weight_percentage: parseFloat(formData.weight_percentage) || 0,
        due_date: new Date(formData.due_date).toISOString(),
        allow_late_submission: formData.allow_late_submission,
        late_penalty_percentage: parseFloat(formData.late_penalty_percentage) || 0,
        attachment_url: formData.attachment_url.trim() || null,
        status: homeworkId ? undefined : 'HW_DRF',
      }

      if (homeworkId) {
        const { error: updateError } = await supabase
          .from('subject_homework')
          .update(submitData)
          .eq('id', homeworkId)

        if (updateError) throw updateError
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()

        const { error: insertError } = await supabase
          .from('subject_homework')
          .insert({
            ...submitData,
            created_by: userData.id,
          })

        if (insertError) throw insertError
      }

      if (onSave) onSave()
      if (onClose) onClose()
    } catch (err) {
      console.error('Error saving homework:', err)
      setError(err.message || 'Failed to save homework')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {homeworkId ? 'Edit Homework' : 'Create Homework'}
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
              placeholder="Homework assignment title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Homework description and requirements"
            />
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
                Weight Percentage
              </label>
              <input
                type="number"
                value={formData.weight_percentage}
                onChange={(e) => setFormData({ ...formData, weight_percentage: e.target.value })}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date *
            </label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.allow_late_submission}
              onChange={(e) => setFormData({ ...formData, allow_late_submission: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-sm font-medium text-gray-700">
              Allow late submission
            </label>
          </div>

          {formData.allow_late_submission && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Penalty Percentage
              </label>
              <input
                type="number"
                value={formData.late_penalty_percentage}
                onChange={(e) => setFormData({ ...formData, late_penalty_percentage: e.target.value })}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Percentage deducted per day late</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Additional instructions for students"
            />
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
              <span>{loading ? 'Saving...' : 'Save Homework'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}



