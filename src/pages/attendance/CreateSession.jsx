import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check, Calendar, Clock, MapPin } from 'lucide-react'

export default function CreateSession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId, departmentId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [classes, setClasses] = useState([])
  const [instructors, setInstructors] = useState([])

  const classIdFromUrl = searchParams.get('classId')
  const [selectedClassId, setSelectedClassId] = useState(classIdFromUrl ? parseInt(classIdFromUrl) : '')

  const [formData, setFormData] = useState({
    class_id: classIdFromUrl ? parseInt(classIdFromUrl) : '',
    semester_id: '',
    session_date: '',
    start_time: '',
    end_time: '',
    location: '',
    room: '',
    building: '',
    instructor_id: '',
    notes: '',
    status: 'scheduled',
  })

  useEffect(() => {
    fetchClasses()
    fetchInstructors()
    if (classIdFromUrl) {
      fetchClassDetails()
    } else {
      setFetching(false)
    }
  }, [classIdFromUrl, collegeId, userRole])

  const fetchClassDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*, subjects(name_en, code), semesters(id, name_en)')
        .eq('id', classIdFromUrl)
        .single()

      if (error) throw error

      if (data) {
        setFormData(prev => ({
          ...prev,
          class_id: data.id,
          semester_id: data.semester_id,
          instructor_id: data.instructor_id || '',
        }))
      }
    } catch (err) {
      console.error('Error fetching class details:', err)
      setError('Failed to load class details')
    } finally {
      setFetching(false)
    }
  }

  const fetchClasses = async () => {
    try {
      let query = supabase
        .from('classes')
        .select('id, code, section, subjects(name_en, code), semesters(name_en)')
        .eq('status', 'active')
        .order('code')

      // Filter by college for college admins - only their college's classes (exclude university-wide)
      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId).eq('is_university_wide', false)
      }
      // For instructors, filter by their college
      else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId).eq('is_university_wide', false)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }

  const fetchInstructors = async () => {
    try {
      let query = supabase
        .from('instructors')
        .select('id, name_en, email')
        .eq('status', 'active')
        .order('name_en')

      // Filter by college for college admins
      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }
      // For instructors, filter by their college
      else if (userRole === 'instructor' && collegeId) {
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

  const handleClassChange = (classId) => {
    const selectedClass = classes.find(c => c.id === parseInt(classId))
    if (selectedClass) {
      // Fetch class details to get semester_id and instructor_id
      supabase
        .from('classes')
        .select('semester_id, instructor_id')
        .eq('id', classId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setFormData(prev => ({
              ...prev,
              class_id: parseInt(classId),
              semester_id: data.semester_id || '',
              instructor_id: data.instructor_id || '',
            }))
          }
        })
    }
    setSelectedClassId(classId)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Get college_id from the selected class
      const { data: classData } = await supabase
        .from('classes')
        .select('college_id')
        .eq('id', formData.class_id)
        .single()

      const submitData = {
        class_id: parseInt(formData.class_id),
        college_id: classData?.college_id || collegeId,
        semester_id: formData.semester_id ? parseInt(formData.semester_id) : null,
        session_date: formData.session_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location || (formData.building && formData.room ? `${formData.building} ${formData.room}` : formData.building || formData.room || null),
        room: formData.room || null,
        building: formData.building || null,
        instructor_id: formData.instructor_id ? parseInt(formData.instructor_id) : null,
        notes: formData.notes || null,
        status: formData.status || 'scheduled',
      }

      const { data, error: insertError } = await supabase
        .from('class_sessions')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        navigate(`/attendance/take?sessionId=${data.id}&classId=${formData.class_id}`)
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to create session')
      console.error('Error creating session:', err)
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

  const selectedClass = classes.find(c => c.id === parseInt(formData.class_id))

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Session</h1>
          <p className="text-gray-600 mt-1">Create a new class session for attendance tracking</p>
        </div>
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
              <span>Session created successfully! Redirecting to take attendance...</span>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
              <select
                value={formData.class_id}
                onChange={(e) => handleClassChange(e.target.value)}
                required
                disabled={!!classIdFromUrl}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Class...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code}-{cls.section} - {cls.subjects?.name_en || cls.subjects?.code}
                  </option>
                ))}
              </select>
              {selectedClass && (
                <p className="text-sm text-gray-500 mt-1">
                  Semester: {selectedClass.semesters?.name_en || 'N/A'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Session Date *</span>
                </label>
                <input
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => handleChange('session_date', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Start Time *</span>
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>End Time *</span>
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>Building</span>
                </label>
                <input
                  type="text"
                  value={formData.building}
                  onChange={(e) => handleChange('building', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Engineering Building"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>Room</span>
                </label>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => handleChange('room', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 101"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Full location description (optional, will auto-fill from building + room if not provided)"
              />
              <p className="text-xs text-gray-500 mt-1">
                If left empty, will be generated from Building + Room
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructor</label>
              <select
                value={formData.instructor_id}
                onChange={(e) => handleChange('instructor_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Select Instructor --</option>
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name_en} ({instructor.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Optional: Will auto-fill from class if class has an instructor assigned
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Additional notes about this session..."
              />
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
            <span>{loading ? 'Creating...' : 'Create Session'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

