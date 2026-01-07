import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check } from 'lucide-react'

export default function EditSubject() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [majors, setMajors] = useState([])
  const [instructors, setInstructors] = useState([])

  const [formData, setFormData] = useState({
    code: '',
    major_id: '',
    name_en: '',
    name_ar: '',
    type: 'core',
    credit_hours: 3,
    instructor_id: '',
    status: 'active',
  })

  useEffect(() => {
    fetchSubject()
    fetchMajors()
    fetchInstructors()
  }, [id])

  const fetchMajors = async () => {
    try {
      let query = supabase
        .from('majors')
        .select('id, name_en, code')
        .eq('status', 'active')
        .order('name_en')

      if (userRole === 'user' && authCollegeId) {
        query = query.or(`college_id.eq.${authCollegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setMajors(data || [])
    } catch (err) {
      console.error('Error fetching majors:', err)
    }
  }

  const fetchInstructors = async () => {
    try {
      let query = supabase
        .from('instructors')
        .select('id, name_en, email')
        .eq('status', 'active')
        .order('name_en')

      if (userRole === 'user' && authCollegeId) {
        query = query.eq('college_id', authCollegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setInstructors(data || [])
    } catch (err) {
      console.error('Error fetching instructors:', err)
    }
  }

  const fetchSubject = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        code: data.code || '',
        major_id: data.major_id || '',
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        type: data.type || 'core',
        credit_hours: data.credit_hours || 3,
        instructor_id: data.instructor_id || '',
        status: data.status || 'active',
      })
    } catch (err) {
      console.error('Error fetching subject:', err)
      setError(err.message || 'Failed to load subject')
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
        major_id: parseInt(formData.major_id),
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        type: formData.type,
        credit_hours: parseInt(formData.credit_hours),
        instructor_id: formData.instructor_id ? parseInt(formData.instructor_id) : null,
        status: formData.status,
      }

      const { error: updateError } = await supabase
        .from('subjects')
        .update(submitData)
        .eq('id', id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/subjects')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to update subject')
      console.error('Error updating subject:', err)
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
        <h1 className="text-3xl font-bold text-gray-900">Edit Subject</h1>
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
              <span>Subject updated successfully! Redirecting...</span>
            </div>
          )}

          <div className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Major *</label>
              <select
                value={formData.major_id}
                onChange={(e) => handleChange('major_id', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Major...</option>
                {majors.map(major => (
                  <option key={major.id} value={major.id}>{major.name_en}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructor</label>
              <select
                value={formData.instructor_id}
                onChange={(e) => handleChange('instructor_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Instructor...</option>
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name_en}
                  </option>
                ))}
              </select>
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
            <span>{loading ? 'Updating...' : 'Update Subject'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}



