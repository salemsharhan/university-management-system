import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check } from 'lucide-react'

export default function CreateMajor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(null)
  const [colleges, setColleges] = useState([])
  const [departments, setDepartments] = useState([])
  const [instructors, setInstructors] = useState([])
  const [isUniversityWide, setIsUniversityWide] = useState(false)

  const [formData, setFormData] = useState({
    faculty_id: '',
    department_id: '',
    code: '',
    name_en: '',
    name_ar: '',
    degree_level: 'bachelor',
    degree_title_en: '',
    degree_title_ar: '',
    total_credits: 120,
    core_credits: 90,
    elective_credits: 30,
    min_semesters: 8,
    max_semesters: 12,
    min_gpa: 2.0,
    tuition_fee: '',
    lab_fee: '',
    registration_fee: '',
    accreditation_date: '',
    accreditation_expiry: '',
    accrediting_body: '',
    head_of_major_id: '',
    head_of_major: '',
    head_email: '',
    head_phone: '',
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
    } else {
      fetchUserCollege()
    }
    
    if (userRole === 'admin') {
      fetchColleges()
    }
    fetchInstructors()
    fetchDepartments()
  }, [userRole, isUniversityWide, searchParams, collegeId])

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

  const fetchDepartments = async () => {
    try {
      let query = supabase
        .from('departments')
        .select('id, name_en, code')
        .eq('status', 'active')
        .order('name_en')

      if (!isUniversityWide && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (isUniversityWide) {
        query = query.eq('is_university_wide', true)
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
        faculty_id: null, // No longer required - majors use instructors instead
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
        code: formData.code,
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        degree_level: formData.degree_level,
        degree_title_en: formData.degree_title_en || null,
        degree_title_ar: formData.degree_title_ar || null,
        total_credits: parseInt(formData.total_credits),
        core_credits: parseInt(formData.core_credits),
        elective_credits: parseInt(formData.elective_credits),
        min_semesters: parseInt(formData.min_semesters),
        max_semesters: parseInt(formData.max_semesters),
        min_gpa: parseFloat(formData.min_gpa),
        tuition_fee: formData.tuition_fee ? parseFloat(formData.tuition_fee) : null,
        lab_fee: formData.lab_fee ? parseFloat(formData.lab_fee) : null,
        registration_fee: formData.registration_fee ? parseFloat(formData.registration_fee) : null,
        accreditation_date: formData.accreditation_date || null,
        accreditation_expiry: formData.accreditation_expiry || null,
        accrediting_body: formData.accrediting_body || null,
        head_of_major: formData.head_of_major || null,
        head_email: formData.head_email || null,
        head_phone: formData.head_phone || null,
        head_of_major_id: formData.head_of_major_id ? parseInt(formData.head_of_major_id) : null,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        status: formData.status,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
      }

      const { data, error: insertError } = await supabase
        .from('majors')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/majors')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to create major')
      console.error('Error creating major:', err)
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
          <h1 className="text-3xl font-bold text-gray-900">Create Major</h1>
          <p className="text-gray-600 mt-1">Add a new academic major to the system</p>
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
                <span>Major created successfully! Redirecting...</span>
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
                      fetchFaculties()
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
                      fetchFaculties()
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., CS, ENG, BUS"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Degree Level *</label>
                <select
                  value={formData.degree_level}
                  onChange={(e) => handleChange('degree_level', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="bachelor">Bachelor</option>
                  <option value="master">Master</option>
                  <option value="phd">PhD</option>
                  <option value="diploma">Diploma</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Degree Title</label>
                  <input
                    type="text"
                    value={formData.degree_title_en}
                    onChange={(e) => handleChange('degree_title_en', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Bachelor of Science in Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Degree Title (Arabic)</label>
                  <input
                    type="text"
                    value={formData.degree_title_ar}
                    onChange={(e) => handleChange('degree_title_ar', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Credits *</label>
                    <input
                      type="number"
                      value={formData.total_credits}
                      onChange={(e) => handleChange('total_credits', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Core Credits *</label>
                    <input
                      type="number"
                      value={formData.core_credits}
                      onChange={(e) => handleChange('core_credits', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Elective Credits *</label>
                    <input
                      type="number"
                      value={formData.elective_credits}
                      onChange={(e) => handleChange('elective_credits', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Semesters *</label>
                    <input
                      type="number"
                      value={formData.min_semesters}
                      onChange={(e) => handleChange('min_semesters', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Semesters *</label>
                    <input
                      type="number"
                      value={formData.max_semesters}
                      onChange={(e) => handleChange('max_semesters', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min GPA *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.min_gpa}
                      onChange={(e) => handleChange('min_gpa', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tuition Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tuition_fee}
                      onChange={(e) => handleChange('tuition_fee', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lab Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.lab_fee}
                      onChange={(e) => handleChange('lab_fee', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Registration Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.registration_fee}
                      onChange={(e) => handleChange('registration_fee', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Accreditation & Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accreditation Date</label>
                    <input
                      type="date"
                      value={formData.accreditation_date}
                      onChange={(e) => handleChange('accreditation_date', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accreditation Expiry</label>
                    <input
                      type="date"
                      value={formData.accreditation_expiry}
                      onChange={(e) => handleChange('accreditation_expiry', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accrediting Body</label>
                    <input
                      type="text"
                      value={formData.accrediting_body}
                      onChange={(e) => handleChange('accrediting_body', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Head of Major (Instructor)</label>
                    <select
                      value={formData.head_of_major_id}
                      onChange={(e) => {
                        const instructorId = e.target.value
                        handleChange('head_of_major_id', instructorId)
                        if (instructorId) {
                          const instructor = instructors.find(inst => inst.id === parseInt(instructorId))
                          if (instructor) {
                            handleChange('head_of_major', instructor.name_en || '')
                            handleChange('head_email', instructor.email || '')
                            handleChange('head_phone', instructor.phone || '')
                          }
                        } else {
                          handleChange('head_of_major', '')
                          handleChange('head_email', '')
                          handleChange('head_phone', '')
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select Instructor...</option>
                      {instructors.map(instructor => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.name_en} {instructor.title ? `(${instructor.title})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Head Email</label>
                    <input
                      type="email"
                      value={formData.head_email}
                      onChange={(e) => handleChange('head_email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      readOnly={!!formData.head_of_major_id}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Head Phone</label>
                    <input
                      type="tel"
                      value={formData.head_phone}
                      onChange={(e) => handleChange('head_phone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      readOnly={!!formData.head_of_major_id}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (English)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Arabic)</label>
                  <textarea
                    value={formData.description_ar}
                    onChange={(e) => handleChange('description_ar', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
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
              <span>{loading ? 'Creating...' : 'Create Major'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


