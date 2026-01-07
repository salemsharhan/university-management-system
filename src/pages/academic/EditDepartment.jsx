import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check } from 'lucide-react'

export default function EditDepartment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(authCollegeId)
  const [colleges, setColleges] = useState([])
  const [instructors, setInstructors] = useState([])
  const [isUniversityWide, setIsUniversityWide] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    head_id: '',
    name_en: '',
    name_ar: '',
    description: '',
    description_ar: '',
    status: 'active',
    college_id: null,
    is_university_wide: false,
  })

  useEffect(() => {
    fetchDepartment()
    if (userRole === 'admin') {
      fetchColleges()
    }
  }, [id, userRole])

  useEffect(() => {
    if (collegeId || isUniversityWide) {
      fetchInstructors()
    }
  }, [collegeId, isUniversityWide])

  const fetchColleges = async () => {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name_en, code')
        .eq('status', 'active')
        .order('name_en')

      if (error) throw error
      setColleges(data || [])
    } catch (err) {
      console.error('Error fetching colleges:', err)
    }
  }

  const fetchInstructors = async () => {
    try {
      let query = supabase
        .from('instructors')
        .select('id, name_en, name_ar, email, phone, title')
        .eq('status', 'active')
        .order('name_en')

      if (!isUniversityWide && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setInstructors(data || [])
    } catch (err) {
      console.error('Error fetching instructors:', err)
    }
  }

  const fetchDepartment = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        code: data.code || '',
        head_id: data.head_id || '',
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        description: data.description || '',
        description_ar: data.description_ar || '',
        status: data.status || 'active',
        college_id: data.college_id,
        is_university_wide: data.is_university_wide || false,
      })
      setCollegeId(data.college_id || authCollegeId)
      setIsUniversityWide(data.is_university_wide || false)
    } catch (err) {
      console.error('Error fetching department:', err)
      setError(err.message || 'Failed to load department')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const submitData = {
        code: formData.code,
        head_id: formData.head_id ? parseInt(formData.head_id) : null,
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        status: formData.status,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
      }

      const { error: updateError } = await supabase
        .from('departments')
        .update(submitData)
        .eq('id', id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/departments')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to update department')
      console.error('Error updating department:', err)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Department</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center space-x-2">
              <Check className="w-5 h-5" />
              <span>Department updated successfully! Redirecting...</span>
            </div>
          )}

          <div className="space-y-6">
            {userRole === 'admin' && (
              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={isUniversityWide}
                  onChange={(e) => {
                    setIsUniversityWide(e.target.checked)
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, college_id: null }))
                    } else {
                      setFormData(prev => ({ ...prev, college_id: collegeId }))
                    }
                    fetchInstructors()
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  University-wide (available to all colleges)
                </label>
              </div>
            )}

            {userRole === 'admin' && !isUniversityWide && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">College</label>
                <select
                  value={formData.college_id || ''}
                  onChange={(e) => {
                    handleChange('college_id', e.target.value ? parseInt(e.target.value) : null)
                    setCollegeId(e.target.value ? parseInt(e.target.value) : null)
                    fetchInstructors()
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select College...</option>
                  {colleges.map(college => (
                    <option key={college.id} value={college.id}>{college.name_en}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Head of Department (Instructor)</label>
              <select
                value={formData.head_id}
                onChange={(e) => handleChange('head_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Instructor (Optional)...</option>
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name_en} {instructor.title ? `(${instructor.title})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name (English) *</label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => handleChange('name_en', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name (Arabic)</label>
              <input
                type="text"
                value={formData.name_ar}
                onChange={(e) => handleChange('name_ar', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (Arabic)</label>
              <textarea
                value={formData.description_ar}
                onChange={(e) => handleChange('description_ar', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.status === 'active'}
                onChange={(e) => handleChange('status', e.target.checked ? 'active' : 'inactive')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="text-sm font-medium text-gray-700">Active</label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? 'Updating...' : 'Update Department'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}



