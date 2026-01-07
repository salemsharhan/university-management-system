import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check } from 'lucide-react'

export default function CreateSubject() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(null)
  const [colleges, setColleges] = useState([])
  const [majors, setMajors] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [instructors, setInstructors] = useState([])
  const [isUniversityWide, setIsUniversityWide] = useState(false)

  const [formData, setFormData] = useState({
    major_id: '',
    code: '',
    name_en: '',
    name_ar: '',
    type: 'core',
    semester_number: '',
    credit_hours: 3,
    theory_hours: 3,
    lab_hours: 0,
    tutorial_hours: 0,
    lab_fee: '',
    material_fee: '',
    instructor_id: '',
    instructor_name: '',
    instructor_email: '',
    textbook: '',
    is_elective: false,
    description: '',
    description_ar: '',
    prerequisites: [],
    corequisites: [],
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
    } else {
      fetchUserCollege()
    }
    
    if (userRole === 'admin') {
      fetchColleges()
    }
    fetchMajors()
    fetchInstructors()
  }, [userRole, authCollegeId, isUniversityWide, searchParams])

  useEffect(() => {
    if (formData.major_id && formData.semester_number) {
      fetchSubjects()
    }
  }, [formData.major_id, formData.semester_number, isUniversityWide])

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

  const fetchMajors = async () => {
    try {
      let query = supabase
        .from('majors')
        .select('id, name_en, code')
        .order('name_en', { ascending: true })

      // For college admins (user role), filter by their college or university-wide
      if (userRole === 'user' && authCollegeId) {
        query = query.or(`college_id.eq.${authCollegeId},is_university_wide.eq.true`)
      }
      // For super admins, filter by selected college if not university-wide
      else if (userRole === 'admin') {
        if (!isUniversityWide && collegeId) {
          query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
        } else if (isUniversityWide) {
          query = query.eq('is_university_wide', true)
        }
        // If no college filter, show all (only for super admin)
      }

      const { data, error } = await query
      if (error) throw error
      setMajors(data || [])
    } catch (err) {
      console.error('Error fetching majors:', err)
    }
  }

  const fetchSubjects = async () => {
    try {
      let query = supabase
        .from('subjects')
        .select('id, name_en, code, semester_number')
        .eq('status', 'active')
        .eq('major_id', formData.major_id)
        .lt('semester_number', parseInt(formData.semester_number) || 999)
        .order('semester_number')

      if (!isUniversityWide && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (isUniversityWide) {
        query = query.eq('is_university_wide', true)
      }

      const { data, error } = await query
      if (error) throw error
      setAllSubjects(data || [])
    } catch (err) {
      console.error('Error fetching subjects:', err)
    }
  }

  const fetchInstructors = async () => {
    try {
      let query = supabase
        .from('instructors')
        .select('id, name_en, name_ar, email, phone, title')
        .order('name_en', { ascending: true })

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

  const handlePrerequisiteChange = (subjectId, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        prerequisites: [...prev.prerequisites, parseInt(subjectId)]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        prerequisites: prev.prerequisites.filter(id => id !== parseInt(subjectId))
      }))
    }
  }

  const handleCorequisiteChange = (subjectId, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        corequisites: [...prev.corequisites, parseInt(subjectId)]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        corequisites: prev.corequisites.filter(id => id !== parseInt(subjectId))
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const submitData = {
        major_id: parseInt(formData.major_id),
        code: formData.code,
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        type: formData.type,
        semester_number: parseInt(formData.semester_number),
        credit_hours: parseInt(formData.credit_hours),
        theory_hours: parseInt(formData.theory_hours),
        lab_hours: parseInt(formData.lab_hours) || 0,
        tutorial_hours: parseInt(formData.tutorial_hours) || 0,
        lab_fee: formData.lab_fee ? parseFloat(formData.lab_fee) : null,
        material_fee: formData.material_fee ? parseFloat(formData.material_fee) : null,
        instructor_id: formData.instructor_id ? parseInt(formData.instructor_id) : null,
        instructor_name: formData.instructor_name || null,
        instructor_email: formData.instructor_email || null,
        textbook: formData.textbook || null,
        is_elective: formData.is_elective,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        status: formData.status,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
      }

      const { data: subject, error: insertError } = await supabase
        .from('subjects')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

      // Insert prerequisites
      if (formData.prerequisites.length > 0) {
        const prereqData = formData.prerequisites.map(prereqId => ({
          subject_id: subject.id,
          prerequisite_subject_id: prereqId
        }))
        await supabase.from('subject_prerequisites').insert(prereqData)
      }

      // Insert corequisites
      if (formData.corequisites.length > 0) {
        const coreqData = formData.corequisites.map(coreqId => ({
          subject_id: subject.id,
          corequisite_subject_id: coreqId
        }))
        await supabase.from('subject_corequisites').insert(coreqData)
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/subjects')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to create subject')
      console.error('Error creating subject:', err)
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
          <h1 className="text-3xl font-bold text-gray-900">Create Subject</h1>
          <p className="text-gray-600 mt-1">Add a new subject to the system</p>
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
                <span>Subject created successfully! Redirecting...</span>
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
                      fetchMajors()
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    University-wide (available to all colleges)
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., CS101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => handleChange('name_en', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Introduction to Programming"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name (Arabic)</label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => handleChange('name_ar', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="مقدمة في البرمجة"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="core">Core</option>
                    <option value="elective">Elective</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Semester Number *</label>
                  <input
                    type="number"
                    value={formData.semester_number}
                    onChange={(e) => handleChange('semester_number', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">The semester when this subject is typically offered</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Hours Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Credit Hours *</label>
                    <input
                      type="number"
                      value={formData.credit_hours}
                      onChange={(e) => handleChange('credit_hours', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Theory Hours *</label>
                    <input
                      type="number"
                      value={formData.theory_hours}
                      onChange={(e) => handleChange('theory_hours', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lab Hours</label>
                    <input
                      type="number"
                      value={formData.lab_hours}
                      onChange={(e) => handleChange('lab_hours', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tutorial Hours</label>
                    <input
                      type="number"
                      value={formData.tutorial_hours}
                      onChange={(e) => handleChange('tutorial_hours', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prerequisites & Corequisites</h3>
                {formData.semester_number && allSubjects.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisites</label>
                      <p className="text-xs text-gray-500 mb-2">Hold Ctrl (Cmd on Mac) to select multiple subjects. Only subjects from earlier semesters will be shown.</p>
                      <select
                        multiple
                        size={5}
                        value={formData.prerequisites.map(String)}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                          setFormData(prev => ({ ...prev, prerequisites: selected }))
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {allSubjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code} - {subject.name_en} (Semester {subject.semester_number})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Corequisites</label>
                      <p className="text-xs text-gray-500 mb-2">Courses that must be taken together. Hold Ctrl (Cmd on Mac) to select multiple.</p>
                      <select
                        multiple
                        size={5}
                        value={formData.corequisites.map(String)}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                          setFormData(prev => ({ ...prev, corequisites: selected }))
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {allSubjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.code} - {subject.name_en} (Semester {subject.semester_number})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Select a major and semester number to see available prerequisites/corequisites</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Optional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instructor</label>
                    <select
                      value={formData.instructor_id}
                      onChange={(e) => {
                        const instructorId = e.target.value
                        handleChange('instructor_id', instructorId)
                        if (instructorId) {
                          const instructor = instructors.find(inst => inst.id === parseInt(instructorId))
                          if (instructor) {
                            handleChange('instructor_name', instructor.name_en || '')
                            handleChange('instructor_email', instructor.email || '')
                          }
                        } else {
                          handleChange('instructor_name', '')
                          handleChange('instructor_email', '')
                        }
                      }}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Material Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.material_fee}
                      onChange={(e) => handleChange('material_fee', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Textbook</label>
                    <input
                      type="text"
                      value={formData.textbook}
                      onChange={(e) => handleChange('textbook', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Introduction to Programming, 5th Edition"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Brief description of the subject..."
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Arabic)</label>
                  <textarea
                    value={formData.description_ar}
                    onChange={(e) => handleChange('description_ar', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="وصف موجز للمادة..."
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_elective}
                  onChange={(e) => handleChange('is_elective', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-gray-700">This is an elective subject</label>
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
              <span>{loading ? 'Creating...' : 'Create Subject'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


