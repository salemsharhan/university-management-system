import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check } from 'lucide-react'

export default function CreateDepartment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(null)
  const [colleges, setColleges] = useState([])
  const [instructors, setInstructors] = useState([])
  const [isUniversityWide, setIsUniversityWide] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    faculty_id: '', // Keep for backward compatibility, but we'll use head_id for instructor
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
    // Check if college ID is passed via URL parameter
    const urlCollegeId = searchParams.get('collegeId')
    if (urlCollegeId && userRole === 'admin') {
      const collegeIdInt = parseInt(urlCollegeId)
      setCollegeId(collegeIdInt)
      setFormData(prev => ({ ...prev, college_id: collegeIdInt, is_university_wide: false }))
      setIsUniversityWide(false)
    } else if (userRole === 'user' && authCollegeId) {
      // For college admins, use their college ID
      setCollegeId(authCollegeId)
      setFormData(prev => ({ ...prev, college_id: authCollegeId, is_university_wide: false }))
      setIsUniversityWide(false)
    } else if (userRole === 'admin') {
      fetchUserCollege()
    }
    
    if (userRole === 'admin') {
      fetchColleges()
    }
  }, [userRole, authCollegeId, searchParams])

  useEffect(() => {
    // Fetch instructors when collegeId or filters change
    if (collegeId || (userRole === 'user' && authCollegeId) || (userRole === 'admin' && isUniversityWide)) {
      fetchInstructors()
    }
  }, [collegeId, userRole, authCollegeId, isUniversityWide])

  const fetchUserCollege = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: userData } = await supabase
        .from('users')
        .select('college_id')
        .eq('email', user.email)
        .single()

      if (userData?.college_id) {
        setCollegeId(userData.college_id)
        setFormData(prev => ({ ...prev, college_id: userData.college_id }))
      }
    } catch (err) {
      console.error('Error fetching college ID:', err)
    }
  }

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

      // For college admins (user role), always filter by their college
      if (userRole === 'user' && authCollegeId) {
        query = query.eq('college_id', authCollegeId)
      } 
      // For super admins, filter by selected college if not university-wide
      else if (userRole === 'admin') {
        if (!isUniversityWide && collegeId) {
          query = query.eq('college_id', collegeId)
        }
        // If university-wide, show all instructors (no filter)
      }

      const { data, error } = await query

      if (error) throw error
      setInstructors(data || [])
    } catch (err) {
      console.error('Error fetching instructors:', err)
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
        faculty_id: null, // No longer required - departments can exist without faculties
        head_id: formData.head_id ? parseInt(formData.head_id) : null, // Instructor as head (optional)
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        status: formData.status,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
      }

      const { data, error: insertError } = await supabase
        .from('departments')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/departments')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to create department')
      console.error('Error creating department:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Department</h1>
          <p className="text-gray-600 mt-1">Add a new academic department</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center space-x-2">
                <Check className="w-5 h-5" />
                <span>Department created successfully! Redirecting...</span>
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
                  placeholder="e.g., CS, EE, ME"
                />
                <p className="text-xs text-gray-500 mt-1">Unique department code</p>
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
                <p className="text-xs text-gray-500 mt-1">You can assign a head later after creating the department</p>
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

          <div className="flex justify-end space-x-4">
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
              <span>{loading ? 'Creating...' : 'Create Department'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


