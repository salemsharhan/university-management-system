import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { ArrowLeft, Save, Calendar, Clock, FileText, BookOpen, Calculator, Building2 } from 'lucide-react'

export default function CreateExamination() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId, departmentId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [classes, setClasses] = useState([])
  const [semesters, setSemesters] = useState([])
  const [examTypes, setExamTypes] = useState([
    'Midterm',
    'Final',
    'Quiz',
    'Assignment',
    'Project',
    'Lab Exam',
    'Oral Exam',
    'Practical',
    'Other'
  ])

  const [formData, setFormData] = useState({
    exam_name: '',
    exam_code: '',
    class_id: '',
    semester_id: '',
    exam_type: '',
    description: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    total_marks: '',
    passing_marks: '',
    weight_percentage: '',
    instructions: '',
    allow_calculator: false,
    allow_notes: false,
    allow_textbook: false,
    other_allowed_materials: '',
    is_university_wide: false,
  })

  useEffect(() => {
    if (requiresCollegeSelection) {
      return
    }
    if (collegeId) {
      fetchSemesters()
    }
  }, [collegeId, userRole, requiresCollegeSelection])

  useEffect(() => {
    if (formData.semester_id) {
      fetchClasses()
    }
  }, [formData.semester_id, collegeId, userRole])

  const fetchSemesters = async () => {
    if (!collegeId) return
    
    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code, start_date, end_date, status')
        .order('start_date', { ascending: false })

      // For instructors, filter by their college
      if (userRole === 'instructor' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setError('Failed to load semesters')
    }
  }

  const fetchClasses = async () => {
    if (!collegeId) return
    
    try {
      let query = supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          subjects (
            id,
            name_en,
            code
          )
        `)
        .eq('semester_id', formData.semester_id)
        .eq('status', 'active')
        .order('code')

      // For instructors, filter by their college
      if (userRole === 'instructor' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError('Failed to load classes')
    }
  }

  const calculateDuration = () => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`)
      const end = new Date(`2000-01-01T${formData.end_time}`)
      if (end < start) {
        // Handle case where end time is next day
        end.setDate(end.getDate() + 1)
      }
      const diffMs = end - start
      const diffMinutes = Math.floor(diffMs / 60000)
      return diffMinutes
    }
    return 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validation
    if (!formData.exam_name || !formData.exam_code || !formData.class_id || 
        !formData.semester_id || !formData.exam_type || !formData.exam_date || 
        !formData.start_time || !formData.end_time || !formData.total_marks || 
        !formData.weight_percentage) {
      setError('Please fill in all required fields')
      return
    }

    // Validate dates
    const examDate = new Date(formData.exam_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (examDate < today) {
      setError('Exam date cannot be in the past')
      return
    }

    // Validate times
    if (formData.start_time >= formData.end_time) {
      setError('End time must be after start time')
      return
    }

    // Validate marks
    if (parseFloat(formData.total_marks) <= 0) {
      setError('Total marks must be greater than 0')
      return
    }

    if (formData.passing_marks && parseFloat(formData.passing_marks) > parseFloat(formData.total_marks)) {
      setError('Passing marks cannot exceed total marks')
      return
    }

    // Validate weight percentage
    if (parseFloat(formData.weight_percentage) < 0 || parseFloat(formData.weight_percentage) > 100) {
      setError('Weight percentage must be between 0 and 100')
      return
    }

    // Get college_id from selected class
    let examCollegeId = collegeId
    if (userRole === 'admin') {
      // For admin, get college_id from the selected class
      const selectedClass = classes.find(c => c.id === parseInt(formData.class_id))
      if (selectedClass) {
        const { data: classData } = await supabase
          .from('classes')
          .select('college_id')
          .eq('id', selectedClass.id)
          .limit(1)
        
        if (classData && classData.length > 0) {
          examCollegeId = classData[0].college_id
        }
      }
    }

    if (!examCollegeId) {
      setError('College ID is required')
      return
    }

    setLoading(true)

    try {
      const duration = calculateDuration()

      // Map exam_type to the enum type value
      const mapExamTypeToEnum = (examType) => {
        const lowerType = examType.toLowerCase()
        if (lowerType.includes('midterm')) return 'midterm'
        if (lowerType.includes('final')) return 'final'
        if (lowerType.includes('quiz')) return 'quiz'
        if (lowerType.includes('assignment')) return 'assignment'
        if (lowerType.includes('project')) return 'project'
        return 'quiz' // Default fallback
      }

      const { data, error } = await supabase
        .from('examinations')
        .insert({
          // New columns
          exam_name: formData.exam_name.trim(),
          exam_code: formData.exam_code.trim().toUpperCase(),
          exam_type: formData.exam_type,
          exam_date: formData.exam_date,
          semester_id: parseInt(formData.semester_id),
          duration_minutes: duration,
          weight_percentage: parseFloat(formData.weight_percentage),
          allow_calculator: formData.allow_calculator,
          allow_notes: formData.allow_notes,
          allow_textbook: formData.allow_textbook,
          other_allowed_materials: formData.other_allowed_materials.trim() || null,
          college_id: examCollegeId,
          is_university_wide: formData.is_university_wide,
          // Old columns (required by initial schema)
          class_id: parseInt(formData.class_id),
          type: mapExamTypeToEnum(formData.exam_type), // Map to enum type
          title: formData.exam_name.trim(), // Use exam_name as title
          date: formData.exam_date, // Use exam_date as date
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: null, // Can be added later if needed
          total_marks: parseFloat(formData.total_marks),
          passing_marks: formData.passing_marks ? parseFloat(formData.passing_marks) : parseFloat(formData.total_marks) * 0.5, // Default to 50% if not provided
          weightage: parseFloat(formData.weight_percentage), // Use weight_percentage as weightage
          description: formData.description.trim() || null,
          instructions: formData.instructions.trim() || null,
          status: 'scheduled',
        })
        .select()
        .single()

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        navigate('/examinations')
      }, 1500)
    } catch (err) {
      console.error('Error creating examination:', err)
      setError(err.message || 'Failed to create examination')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/examinations')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Examination</h1>
            <p className="text-gray-600 mt-1">Schedule a new examination for your class</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          Examination created successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* College Selector for Admin - Must be selected first */}
        {userRole === 'admin' && (
          <div className={`rounded-lg p-6 ${requiresCollegeSelection ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-center space-x-4">
              <Building2 className={`w-6 h-6 ${requiresCollegeSelection ? 'text-yellow-600' : 'text-blue-600'}`} />
              <div className="flex-1">
                <p className={`text-base font-semibold ${requiresCollegeSelection ? 'text-yellow-900' : 'text-blue-900'}`}>
                  {requiresCollegeSelection ? 'College Selection Required' : 'Selected College'}
                </p>
                <p className={`text-sm ${requiresCollegeSelection ? 'text-yellow-700' : 'text-blue-700'}`}>
                  {requiresCollegeSelection 
                    ? 'Please select a college before proceeding with the form' 
                    : `You are working with: ${colleges.find(c => c.id === selectedCollegeId)?.name_en || 'Unknown'}`}
                </p>
              </div>
              <select
                value={selectedCollegeId || ''}
                onChange={(e) => setSelectedCollegeId(parseInt(e.target.value))}
                className={`px-4 py-3 border rounded-lg text-sm bg-white focus:ring-2 focus:border-transparent min-w-[300px] ${
                  requiresCollegeSelection 
                    ? 'border-yellow-300 focus:ring-yellow-500' 
                    : 'border-blue-300 focus:ring-blue-500'
                }`}
                required
              >
                <option value="">Select College...</option>
                {colleges.map(college => (
                  <option key={college.id} value={college.id}>
                    {college.name_en} ({college.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Examination Name *
              </label>
              <input
                type="text"
                name="exam_name"
                value={formData.exam_name}
                onChange={handleChange}
                placeholder="e.g., Midterm Exam - Mathematics"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Code *
              </label>
              <input
                type="text"
                name="exam_code"
                value={formData.exam_code}
                onChange={handleChange}
                placeholder="e.g., MATH-MT-2024"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                name="class_id"
                value={formData.class_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={!formData.semester_id || requiresCollegeSelection}
              >
                <option value="">Select a class</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.code} - {classItem.subjects?.name_en || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semester *
              </label>
              <select
                name="semester_id"
                value={formData.semester_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              >
                <option value="">Select a semester</option>
                {semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name_en} ({semester.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Type *
              </label>
              <select
                name="exam_type"
                value={formData.exam_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              >
                <option value="">Select exam type</option>
                {examTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional description of the examination"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={requiresCollegeSelection}
              />
            </div>
          </div>
        </div>

        {/* Schedule Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Schedule Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Date *
              </label>
              <input
                type="date"
                name="exam_date"
                value={formData.exam_date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={calculateDuration()}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Duration will be automatically calculated based on start and end times
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time *
              </label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>
          </div>
        </div>

        {/* Grading Information */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center space-x-2 mb-6">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Grading Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Marks *
              </label>
              <input
                type="number"
                name="total_marks"
                value={formData.total_marks}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passing Marks (Optional)
              </label>
              <input
                type="number"
                name="passing_marks"
                value={formData.passing_marks}
                onChange={handleChange}
                min="0"
                step="0.01"
                max={formData.total_marks || 100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight Percentage *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="weight_percentage"
                  value={formData.weight_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={requiresCollegeSelection}
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Instructions */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center space-x-2 mb-6">
            <BookOpen className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Exam Instructions</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter instructions for students and invigilators
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              placeholder="Provide clear instructions about the examination format, rules, and requirements"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={requiresCollegeSelection}
            />
          </div>
        </div>

        {/* Allowed Materials */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center space-x-2 mb-6">
            <Calculator className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">Allowed Materials</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="allow_calculator"
                checked={formData.allow_calculator}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                disabled={requiresCollegeSelection}
              />
              <label className="text-sm font-medium text-gray-700">Allow Calculator</label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="allow_notes"
                checked={formData.allow_notes}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                disabled={requiresCollegeSelection}
              />
              <label className="text-sm font-medium text-gray-700">Allow Notes</label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="allow_textbook"
                checked={formData.allow_textbook}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                disabled={requiresCollegeSelection}
              />
              <label className="text-sm font-medium text-gray-700">Allow Textbook</label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Allowed Materials
              </label>
              <input
                type="text"
                name="other_allowed_materials"
                value={formData.other_allowed_materials}
                onChange={handleChange}
                placeholder="Specify other materials students can bring"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={requiresCollegeSelection}
              />
            </div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Guidelines</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Ensure the exam date and time do not conflict with other scheduled examinations</li>
            <li>Weight percentage represents how much this exam contributes to the final grade</li>
            <li>Total marks should match your grading scheme</li>
            <li>Clear instructions help students understand expectations and procedures</li>
          </ul>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/examinations')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Create Examination</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

