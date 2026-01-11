import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

export default function CreateFeeType() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_ar: '',
    description: '',
    category: 'general',
    is_semester_based: true,
    requires_semester: true,
    is_active: true,
    is_university_wide: false,
    sort_order: 0,
  })

  useEffect(() => {
    if (isEdit) {
      fetchFeeType()
    }
  }, [id])

  const fetchFeeType = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fee_types')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        code: data.code || '',
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        description: data.description || '',
        category: data.category || 'general',
        is_semester_based: data.is_semester_based !== undefined ? data.is_semester_based : true,
        requires_semester: data.requires_semester !== undefined ? data.requires_semester : true,
        is_active: data.is_active !== undefined ? data.is_active : true,
        is_university_wide: data.is_university_wide || false,
        sort_order: data.sort_order || 0,
      })
    } catch (err) {
      console.error('Error fetching fee type:', err)
      setError('Failed to load fee type')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!formData.code || !formData.name_en) {
      setError('Please fill in all required fields (Code and Name English)')
      return
    }

    // Validate code format (lowercase, underscores only)
    const codeRegex = /^[a-z0-9_]+$/
    if (!codeRegex.test(formData.code)) {
      setError('Code must contain only lowercase letters, numbers, and underscores')
      return
    }

    if (!collegeId && !formData.is_university_wide && userRole !== 'admin') {
      setError('Please select a college or mark as university-wide')
      return
    }

    setLoading(true)

    try {
      const feeTypeData = {
        code: formData.code.trim().toLowerCase(),
        name_en: formData.name_en.trim(),
        name_ar: formData.name_ar.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category,
        is_semester_based: formData.is_semester_based,
        requires_semester: formData.requires_semester,
        is_active: formData.is_active,
        is_university_wide: formData.is_university_wide,
        sort_order: parseInt(formData.sort_order) || 0,
      }

      if (!formData.is_university_wide && collegeId) {
        feeTypeData.college_id = collegeId
      }

      if (isEdit) {
        const { error: updateError } = await supabase
          .from('fee_types')
          .update(feeTypeData)
          .eq('id', id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('fee_types')
          .insert(feeTypeData)

        if (insertError) {
          if (insertError.code === '23505') { // Unique violation
            setError(`Fee type with code "${formData.code}" already exists`)
          } else {
            throw insertError
          }
        }
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/finance/configuration?tab=types', { replace: true })
      }, 1500)
    } catch (err) {
      console.error('Error saving fee type:', err)
      setError(err.message || 'Failed to save fee type')
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { value: 'admission', label: 'Admission' },
    { value: 'tuition', label: 'Tuition' },
    { value: 'service', label: 'Service' },
    { value: 'penalty', label: 'Penalty' },
    { value: 'general', label: 'General' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/finance/configuration?tab=types')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Edit Fee Type' : 'Create Fee Type'}
            </h1>
            <p className="text-gray-600 mt-1">Configure fee types for invoice creation</p>
          </div>
        </div>
      </div>

      {userRole === 'admin' && (
        <div className={`bg-white rounded-2xl shadow-sm border p-4 ${
          requiresCollegeSelection && !formData.is_university_wide
            ? 'border-yellow-300 bg-yellow-50' 
            : 'border-gray-200'
        }`}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select College {requiresCollegeSelection && !formData.is_university_wide && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value) : null)}
            disabled={formData.is_university_wide}
            className={`w-full md:w-64 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 ${
              formData.is_university_wide 
                ? 'bg-gray-100 border-gray-300' 
                : requiresCollegeSelection
                ? 'border-yellow-300 bg-white'
                : 'border-gray-300'
            }`}
            required={requiresCollegeSelection && !formData.is_university_wide}
          >
            <option value="">Select College</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>{college.name_en}</option>
            ))}
          </select>
          {requiresCollegeSelection && !formData.is_university_wide && (
            <p className="text-xs text-yellow-600 mt-1">Please select a college or mark as university-wide</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., custom_fee"
              required
              disabled={isEdit} // Don't allow editing code after creation
            />
            <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and underscores only. Cannot be changed after creation.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name (English) *</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name (Arabic)</label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
            <input
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first in lists</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            rows="3"
            placeholder="Describe when and how this fee type should be used..."
          />
        </div>

        {/* Semester Settings */}
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold text-gray-900">Semester Settings</h3>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Semester Based</label>
              <p className="text-xs text-gray-500">Whether this fee type typically applies to semesters</p>
            </div>
            <input
              type="checkbox"
              checked={formData.is_semester_based}
              onChange={(e) => {
                const checked = e.target.checked
                setFormData({ 
                  ...formData, 
                  is_semester_based: checked,
                  requires_semester: checked ? formData.requires_semester : false // Auto-disable if not semester-based
                })
              }}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">Requires Semester</label>
              <p className="text-xs text-gray-500">Whether semester selection is mandatory when creating invoices with this fee type</p>
            </div>
            <input
              type="checkbox"
              checked={formData.requires_semester}
              onChange={(e) => setFormData({ ...formData, requires_semester: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              disabled={!formData.is_semester_based}
            />
          </div>
          {!formData.is_semester_based && (
            <p className="text-xs text-gray-500 italic">If not semester-based, "Requires Semester" will be automatically set to false.</p>
          )}
        </div>

        {/* Scope */}
        <div className="border-t border-gray-200 pt-4">
          <label className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              checked={formData.is_university_wide}
              onChange={(e) => setFormData({ ...formData, is_university_wide: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">University Wide (applies to all colleges)</span>
          </label>
        </div>

        {/* Active Status */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
            Fee type {isEdit ? 'updated' : 'created'} successfully! Redirecting...
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/finance/configuration?tab=types')}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{isEdit ? 'Update' : 'Create'} Fee Type</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

