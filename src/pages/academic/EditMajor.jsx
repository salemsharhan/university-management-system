import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check } from 'lucide-react'

export default function EditMajor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(authCollegeId)
  const [colleges, setColleges] = useState([])
  const [departments, setDepartments] = useState([])
  const [instructors, setInstructors] = useState([])
  const [isUniversityWide, setIsUniversityWide] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    department_id: '',
    name_en: '',
    name_ar: '',
    degree_level: 'bachelor',
    total_credits: 120,
    head_of_major_id: '',
    status: 'active',
    college_id: null,
    is_university_wide: false,
  })

  useEffect(() => {
    fetchMajor()
    if (userRole === 'admin') {
      fetchColleges()
    }
  }, [id, userRole])

  useEffect(() => {
    if (collegeId || isUniversityWide) {
      fetchDepartments()
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

  const fetchDepartments = async () => {
    try {
      let query = supabase
        .from('departments')
        .select('id, name_en, code')
        .eq('status', 'active')
        .order('name_en')

      if (!isUniversityWide && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setDepartments(data || [])
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const fetchInstructors = async () => {
    try {
      let query = supabase
        .from('instructors')
        .select('id, name_en, email')
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

  const fetchMajor = async () => {
    try {
      const { data, error } = await supabase
        .from('majors')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        code: data.code || '',
        department_id: data.department_id || '',
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        degree_level: data.degree_level || 'bachelor',
        total_credits: data.total_credits || 120,
        head_of_major_id: data.head_of_major_id || '',
        status: data.status || 'active',
        college_id: data.college_id,
        is_university_wide: data.is_university_wide || false,
      })
      setCollegeId(data.college_id || authCollegeId)
      setIsUniversityWide(data.is_university_wide || false)
    } catch (err) {
      console.error('Error fetching major:', err)
      setError(err.message || 'Failed to load major')
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
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        degree_level: formData.degree_level,
        total_credits: parseInt(formData.total_credits),
        head_of_major_id: formData.head_of_major_id ? parseInt(formData.head_of_major_id) : null,
        status: formData.status,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
      }

      const { error: updateError } = await supabase
        .from('majors')
        .update(submitData)
        .eq('id', id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/majors')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to update major')
      console.error('Error updating major:', err)
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
        <h1 className="text-3xl font-bold text-gray-900">Edit Major</h1>
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
              <span>Major updated successfully! Redirecting...</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={formData.department_id}
                onChange={(e) => handleChange('department_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select Department...</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name_en}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Head of Major (Instructor)</label>
              <select
                value={formData.head_of_major_id}
                onChange={(e) => handleChange('head_of_major_id', e.target.value)}
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
            <span>{loading ? 'Updating...' : 'Update Major'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}



