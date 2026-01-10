import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

export default function CreateFeeStructure() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [majors, setMajors] = useState([])
  const [semesters, setSemesters] = useState([])

  const [formData, setFormData] = useState({
    fee_type: '',
    fee_name_en: '',
    fee_name_ar: '',
    amount: '',
    currency: 'USD',
    semester_id: '', // Required - fees are semester-specific
    applies_to_degree_level: [],
    applies_to_major: [],
    is_university_wide: false,
    is_active: true,
    valid_from: '',
    valid_to: '',
    description: '',
  })

  useEffect(() => {
    fetchMajors()
    fetchSemesters()
    if (isEdit) {
      fetchFeeStructure()
    }
  }, [id, collegeId])


  const fetchMajors = async () => {
    try {
      let query = supabase
        .from('majors')
        .select('id, name_en, code, degree_level')
        .eq('status', 'active')
        .order('name_en')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setMajors(data || [])
    } catch (err) {
      console.error('Error fetching majors:', err)
    }
  }

  const fetchSemesters = async () => {
    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code')
        .order('start_date', { ascending: false })
        .limit(50)

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
    }
  }

  const fetchFeeStructure = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('finance_configuration')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        fee_type: data.fee_type || '',
        fee_name_en: data.fee_name_en || '',
        fee_name_ar: data.fee_name_ar || '',
        amount: data.amount || '',
        currency: data.currency || 'USD',
        semester_id: data.semester_id || '',
        applies_to_degree_level: data.applies_to_degree_level || [],
        applies_to_major: data.applies_to_major || [],
        is_university_wide: data.is_university_wide || false,
        is_active: data.is_active !== undefined ? data.is_active : true,
        valid_from: data.valid_from || '',
        valid_to: data.valid_to || '',
        description: data.description || ''
      })
    } catch (err) {
      console.error('Error fetching fee structure:', err)
      setError('Failed to load fee structure')
    } finally {
      setLoading(false)
    }
  }

  const handleDegreeLevelToggle = (level) => {
    const current = formData.applies_to_degree_level || []
    const updated = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level]
    setFormData({ ...formData, applies_to_degree_level: updated })
  }

  const handleMajorToggle = (majorId) => {
    const current = formData.applies_to_major || []
    const updated = current.includes(majorId)
      ? current.filter(id => id !== majorId)
      : [...current, majorId]
    setFormData({ ...formData, applies_to_major: updated })
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!formData.fee_type || !formData.fee_name_en || !formData.amount || !formData.semester_id) {
      setError('Please fill in all required fields including semester')
      return
    }

    if (!collegeId && !formData.is_university_wide && userRole !== 'admin') {
      setError('Please select a college or mark as university-wide')
      return
    }

    setLoading(true)

    try {
      const feeData = {
        fee_type: formData.fee_type,
        fee_name_en: formData.fee_name_en.trim(),
        fee_name_ar: formData.fee_name_ar.trim() || null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        semester_id: parseInt(formData.semester_id),
        applies_to_degree_level: formData.applies_to_degree_level.length > 0 ? formData.applies_to_degree_level : null,
        applies_to_major: formData.applies_to_major.length > 0 ? formData.applies_to_major : null,
        is_university_wide: formData.is_university_wide,
        is_active: formData.is_active,
        valid_from: formData.valid_from || null,
        valid_to: formData.valid_to || null,
        description: formData.description.trim() || null
      }

      if (!formData.is_university_wide && collegeId) {
        feeData.college_id = collegeId
      }

      if (isEdit) {
        const { error: updateError } = await supabase
          .from('finance_configuration')
          .update(feeData)
          .eq('id', id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('finance_configuration')
          .insert(feeData)

        if (insertError) throw insertError
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/finance/configuration')
      }, 1500)
    } catch (err) {
      console.error('Error saving fee structure:', err)
      setError(err.message || 'Failed to save fee structure')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/finance/configuration')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Edit Fee Structure' : 'Create Fee Structure'}
            </h1>
            <p className="text-gray-600 mt-1">Configure base fees and fee structures</p>
          </div>
        </div>
      </div>

      {requiresCollegeSelection && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select College</label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value) : null)}
            disabled={formData.is_university_wide}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          >
            <option value="">Select College</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>{college.name_en}</option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type *</label>
            <select
              value={formData.fee_type}
              onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Type</option>
              <option value="admission_fee">Admission Fee</option>
              <option value="course_fee">Course Fee</option>
              <option value="subject_fee">Subject Fee</option>
              <option value="onboarding_fee">Onboarding Fee</option>
              <option value="penalty">Penalty</option>
              <option value="miscellaneous">Miscellaneous</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fee Name (English) *</label>
            <input
              type="text"
              value={formData.fee_name_en}
              onChange={(e) => setFormData({ ...formData, fee_name_en: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fee Name (Arabic)</label>
            <input
              type="text"
              value={formData.fee_name_ar}
              onChange={(e) => setFormData({ ...formData, fee_name_ar: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Semester *</label>
            <select
              value={formData.semester_id}
              onChange={(e) => setFormData({ ...formData, semester_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Semester...</option>
              {semesters.map(semester => (
                <option key={semester.id} value={semester.id}>
                  {semester.name_en} ({semester.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Fees are semester-specific. Financial milestones (30%, 60%, etc.) are calculated per semester.
            </p>
          </div>
        </div>

        {/* Scope */}
        <div>
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

        {/* Applies To */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Applies To (Optional - leave empty for all)</h3>
          
          {/* Degree Levels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Degree Levels</label>
            <div className="flex flex-wrap gap-2">
              {['bachelor', 'master', 'phd', 'diploma'].map(level => (
                <label key={level} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.applies_to_degree_level?.includes(level)}
                    onChange={() => handleDegreeLevelToggle(level)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm capitalize">{level}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Majors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Majors</label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {majors.map(major => (
                <label key={major.id} className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.applies_to_major?.includes(major.id)}
                    onChange={() => handleMajorToggle(major.id)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm">{major.name_en} ({major.code})</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Validity Period */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valid From</label>
            <input
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valid To</label>
            <input
              type="date"
              value={formData.valid_to}
              onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
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
          />
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
            Fee structure {isEdit ? 'updated' : 'created'} successfully! Redirecting...
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/finance/configuration')}
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
                <span>{isEdit ? 'Update' : 'Create'} Fee Structure</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}



