import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check, Plus, X } from 'lucide-react'

export default function CreateClass() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(authCollegeId)
  const [colleges, setColleges] = useState([])
  const [subjects, setSubjects] = useState([])
  const [semesters, setSemesters] = useState([])
  const [instructors, setInstructors] = useState([])
  const [isUniversityWide, setIsUniversityWide] = useState(false)

  const [formData, setFormData] = useState({
    subject_id: '',
    semester_id: '',
    section: '',
    instructor_id: '',
    capacity: 30,
    room: '',
    building: '',
    type: 'on_campus',
    notes: '',
    status: 'active',
    college_id: null,
    is_university_wide: false,
    schedules: [{ day: '', start_time: '', end_time: '', location: '' }],
  })

  useEffect(() => {
    // Check if college ID is passed via URL parameter
    const urlCollegeId = searchParams.get('collegeId')
    if (urlCollegeId && userRole === 'admin') {
      const collegeIdInt = parseInt(urlCollegeId)
      setCollegeId(collegeIdInt)
      setFormData(prev => ({ ...prev, college_id: collegeIdInt, is_university_wide: false }))
      setIsUniversityWide(false)
    } else if (authCollegeId) {
      setCollegeId(authCollegeId)
      setFormData(prev => ({ ...prev, college_id: authCollegeId }))
    } else if (userRole === 'user') {
      fetchUserCollege()
    }
    
    if (userRole === 'admin') {
      fetchColleges()
    }
    fetchSubjects()
    // Only fetch semesters if we have required data
    if (userRole === 'admin' || (userRole === 'user' && (collegeId || authCollegeId)) || (userRole === 'instructor' && (collegeId || authCollegeId))) {
      fetchSemesters()
    }
    fetchInstructors()
  }, [userRole, isUniversityWide, searchParams, authCollegeId])

  useEffect(() => {
    // Refetch semesters when collegeId changes (only if we have required data)
    if (userRole === 'admin' || (userRole === 'user' && collegeId) || (userRole === 'instructor' && collegeId)) {
      fetchSemesters()
    }
  }, [collegeId, isUniversityWide])

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

  const fetchSubjects = async () => {
    try {
      let query = supabase
        .from('subjects')
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
      setSubjects(data || [])
    } catch (err) {
      console.error('Error fetching subjects:', err)
    }
  }

  const fetchSemesters = async () => {
    // Don't fetch if we don't have required data
    if (userRole === 'user' && !collegeId && !authCollegeId) return
    if (userRole === 'instructor' && !collegeId && !authCollegeId) return

    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code')
        .order('start_date', { ascending: false })

      // Use collegeId or authCollegeId
      const effectiveCollegeId = collegeId || authCollegeId

      // Filter by college for college admins - include their college's semesters AND university-wide semesters
      if (userRole === 'user' && effectiveCollegeId) {
        query = query.or(`college_id.eq.${effectiveCollegeId},is_university_wide.eq.true`)
      }
      // Filter by college for instructors
      else if (userRole === 'instructor' && effectiveCollegeId) {
        query = query.or(`college_id.eq.${effectiveCollegeId},is_university_wide.eq.true`)
      }
      else if (!isUniversityWide && collegeId && userRole === 'admin') {
        // For super admin with selected college: show that college's semesters AND university-wide
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (isUniversityWide) {
        query = query.eq('is_university_wide', true)
      }
      // If no college selected and not university-wide, show all (for super admin)

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleScheduleChange = (index, field, value) => {
    const newSchedules = [...formData.schedules]
    newSchedules[index] = { ...newSchedules[index], [field]: value }
    setFormData(prev => ({ ...prev, schedules: newSchedules }))
  }

  const addSchedule = () => {
    setFormData(prev => ({
      ...prev,
      schedules: [...prev.schedules, { day: '', start_time: '', end_time: '', location: '' }]
    }))
  }

  const removeSchedule = (index) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Generate class code from subject code and section
      const subject = subjects.find(s => s.id === parseInt(formData.subject_id))
      const classCode = subject ? `${subject.code}-${formData.section}` : formData.section

      const submitData = {
        subject_id: parseInt(formData.subject_id),
        semester_id: parseInt(formData.semester_id),
        code: classCode,
        section: formData.section,
        instructor_id: formData.instructor_id ? parseInt(formData.instructor_id) : null,
        capacity: parseInt(formData.capacity),
        enrolled: 0,
        room: formData.room || null,
        building: formData.building || null,
        location: formData.room && formData.building ? `${formData.building} ${formData.room}` : (formData.room || formData.building || null),
        type: formData.type,
        notes: formData.notes || null,
        status: formData.status,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
      }

      const { data: classData, error: insertError } = await supabase
        .from('classes')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

      // Get semester dates for generating class sessions
      const { data: semesterData, error: semesterError } = await supabase
        .from('semesters')
        .select('start_date, end_date')
        .eq('id', parseInt(formData.semester_id))
        .single()

      if (semesterError) throw semesterError

      // Get college_id for class_sessions
      const finalCollegeId = isUniversityWide ? null : (formData.college_id || collegeId)
      if (!finalCollegeId && !isUniversityWide) {
        throw new Error('College ID is required for class sessions')
      }

      // Helper function to get day of week number (0 = Sunday, 1 = Monday, etc.)
      const getDayOfWeekNumber = (dayName) => {
        const days = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 }
        return days[dayName.toLowerCase()] ?? 0
      }

      // Helper function to generate all dates for a specific day of week within a date range
      const generateDatesForDay = (startDate, endDate, dayOfWeek) => {
        const dates = []
        const start = new Date(startDate)
        const end = new Date(endDate)
        const targetDay = getDayOfWeekNumber(dayOfWeek)

        // Find the first occurrence of the target day
        let currentDate = new Date(start)
        const currentDay = currentDate.getDay()
        const daysToAdd = (targetDay - currentDay + 7) % 7
        currentDate.setDate(currentDate.getDate() + daysToAdd)

        // Generate all dates for this day of week
        while (currentDate <= end) {
          dates.push(new Date(currentDate))
          currentDate.setDate(currentDate.getDate() + 7) // Move to next week
        }

        return dates
      }

      // Insert class schedules
      if (formData.schedules.length > 0 && formData.schedules[0].day) {
        const validSchedules = formData.schedules.filter(s => s.day && s.start_time && s.end_time)
        
        if (validSchedules.length > 0) {
          // Insert class_schedules (recurring schedule template)
          const scheduleData = validSchedules.map(schedule => ({
            class_id: classData.id,
            day_of_week: schedule.day,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            location: schedule.location || formData.room || null,
          }))

          const { error: scheduleError } = await supabase
            .from('class_schedules')
            .insert(scheduleData)

          if (scheduleError) throw scheduleError

          // Generate and insert class_sessions for each schedule
          if (semesterData && semesterData.start_date && semesterData.end_date && finalCollegeId) {
            const sessionData = []
            
            for (const schedule of validSchedules) {
              const dates = generateDatesForDay(
                semesterData.start_date,
                semesterData.end_date,
                schedule.day
              )

              for (const date of dates) {
                sessionData.push({
                  class_id: classData.id,
                  college_id: finalCollegeId,
                  semester_id: parseInt(formData.semester_id),
                  session_date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
                  start_time: schedule.start_time,
                  end_time: schedule.end_time,
                  location: schedule.location || formData.room || null,
                  room: formData.room || null,
                  building: formData.building || null,
                  instructor_id: formData.instructor_id ? parseInt(formData.instructor_id) : null,
                  status: 'scheduled',
                  notes: formData.notes || null,
                })
              }
            }

            if (sessionData.length > 0) {
              const { error: sessionError } = await supabase
                .from('class_sessions')
                .insert(sessionData)

              if (sessionError) throw sessionError
            }
          }
        }
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/classes')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to create class')
      console.error('Error creating class:', err)
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
          <h1 className="text-3xl font-bold text-gray-900">Add Class</h1>
          <p className="text-gray-600 mt-1">Create a new class for {formData.semester_id ? 'selected semester' : 'semester'}</p>
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
                <span>Class created successfully! Redirecting...</span>
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
                      fetchSubjects()
                      fetchSemesters()
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => handleChange('subject_id', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Subject...</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Semester *</label>
                  <select
                    value={formData.semester_id}
                    onChange={(e) => handleChange('semester_id', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Semester...</option>
                    {semesters.map(semester => (
                      <option key={semester.id} value={semester.id}>
                        {semester.name_en} ({semester.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section Number *</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => handleChange('section', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 001, A, B"
                  />
                  <p className="text-xs text-gray-500 mt-1">Section identifier (will be combined with subject code)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Capacity *</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => handleChange('capacity', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of students</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => handleChange('room', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={(e) => handleChange('building', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Engineering Building"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {instructor.name_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="on_campus">On Campus</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Class Schedule</h3>
                  <button
                    type="button"
                    onClick={addSchedule}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Time Slot</span>
                  </button>
                </div>
                {formData.schedules.map((schedule, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                      <select
                        value={schedule.day}
                        onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select Day...</option>
                        <option value="sunday">Sunday</option>
                        <option value="monday">Monday</option>
                        <option value="tuesday">Tuesday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="thursday">Thursday</option>
                        <option value="friday">Friday</option>
                        <option value="saturday">Saturday</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={schedule.location}
                        onChange={(e) => handleScheduleChange(index, 'location', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Optional"
                      />
                    </div>
                    <div className="flex items-end">
                      {formData.schedules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSchedule(index)}
                          className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-2">Add one or more time slots for this class</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Additional information..."
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
              <span>{loading ? 'Creating...' : 'Create Class'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


