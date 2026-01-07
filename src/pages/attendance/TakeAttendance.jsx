import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check, Plus, Calendar, Clock, Users } from 'lucide-react'

export default function TakeAttendance() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [classes, setClasses] = useState([])
  const [sessions, setSessions] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [attendance, setAttendance] = useState({})

  useEffect(() => {
    const classId = searchParams.get('classId')
    const sessionId = searchParams.get('sessionId')
    if (classId) {
      setSelectedClassId(parseInt(classId))
    }
    if (sessionId) {
      setSelectedSessionId(parseInt(sessionId))
    }
    fetchClasses()
  }, [collegeId, userRole, searchParams])

  useEffect(() => {
    if (selectedClassId) {
      fetchSessions()
      fetchEnrollments()
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedSessionId) {
      fetchExistingAttendance()
    }
  }, [selectedSessionId])

  const fetchClasses = async () => {
    try {
      let query = supabase
        .from('classes')
        .select('id, code, section, subjects(name_en, code), semesters(name_en)')
        .eq('status', 'active')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', selectedClassId)
        .order('session_date', { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error('Error fetching sessions:', err)
    }
  }

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, students(id, first_name, last_name, name_en, student_id)')
        .eq('class_id', selectedClassId)
        .eq('status', 'enrolled')

      if (error) throw error
      setEnrollments(data || [])
    } catch (err) {
      console.error('Error fetching enrollments:', err)
    }
  }

  const fetchExistingAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('session_id', selectedSessionId)

      if (error) throw error
      
      const attendanceMap = {}
      data?.forEach(record => {
        attendanceMap[record.student_id] = record.status
      })
      setAttendance(attendanceMap)
    } catch (err) {
      console.error('Error fetching existing attendance:', err)
    }
  }

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedClassId || !selectedSessionId) {
      setError('Please select a class and session')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Get class to find college_id
      const { data: classData } = await supabase
        .from('classes')
        .select('college_id')
        .eq('id', selectedClassId)
        .single()

      const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => {
        const enrollment = enrollments.find(e => e.student_id === parseInt(studentId))
        return {
          enrollment_id: enrollment?.id,
          class_id: selectedClassId,
          student_id: parseInt(studentId),
          session_id: selectedSessionId,
          college_id: classData?.college_id || collegeId,
          date: sessions.find(s => s.id === selectedSessionId)?.session_date,
          status: status,
        }
      })

      // Delete existing attendance for this session
      await supabase
        .from('attendance')
        .delete()
        .eq('session_id', selectedSessionId)

      // Insert new attendance records
      if (attendanceRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert(attendanceRecords)

        if (insertError) throw insertError
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/attendance/sessions')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to save attendance')
      console.error('Error saving attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const selectedSession = sessions.find(s => s.id === selectedSessionId)

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/attendance/sessions')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Sessions</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Take Attendance</h1>
          <p className="text-gray-600 mt-1">Record attendance for a class session</p>
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
              <span>Attendance saved successfully! Redirecting...</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
              <select
                value={selectedClassId || ''}
                onChange={(e) => {
                  setSelectedClassId(e.target.value ? parseInt(e.target.value) : null)
                  setSelectedSessionId(null)
                  setAttendance({})
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Choose class...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code}-{cls.section} - {cls.subjects?.name_en || cls.subjects?.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Session Selection */}
            {selectedClassId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Session</label>
                {sessions.length === 0 ? (
                  <div className="p-6 border border-gray-200 rounded-lg text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">No sessions available for this class</p>
                    <button
                      type="button"
                      onClick={() => navigate(`/attendance/sessions/create?classId=${selectedClassId}`)}
                      className="px-4 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center space-x-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Session</span>
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedSessionId || ''}
                    onChange={(e) => {
                      setSelectedSessionId(e.target.value ? parseInt(e.target.value) : null)
                      setAttendance({})
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select session...</option>
                    {sessions.map(session => (
                      <option key={session.id} value={session.id}>
                        {new Date(session.session_date).toLocaleDateString()} - {session.start_time} to {session.end_time}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Attendance Table */}
            {selectedSessionId && enrollments.length > 0 && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Student Attendance</h3>
                  <div className="text-sm text-gray-600">
                    {selectedSession && (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(selectedSession.session_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{selectedSession.start_time} - {selectedSession.end_time}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Present</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Absent</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Late</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Excused</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {enrollments.map((enrollment) => {
                        const student = enrollment.students
                        const studentId = student?.id || enrollment.student_id
                        const currentStatus = attendance[studentId] || 'absent'
                        return (
                          <tr key={enrollment.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {student?.student_id || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student?.name_en || `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="radio"
                                name={`attendance-${studentId}`}
                                checked={currentStatus === 'present'}
                                onChange={() => handleAttendanceChange(studentId, 'present')}
                                className="w-4 h-4 text-primary-600"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="radio"
                                name={`attendance-${studentId}`}
                                checked={currentStatus === 'absent'}
                                onChange={() => handleAttendanceChange(studentId, 'absent')}
                                className="w-4 h-4 text-primary-600"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="radio"
                                name={`attendance-${studentId}`}
                                checked={currentStatus === 'late'}
                                onChange={() => handleAttendanceChange(studentId, 'late')}
                                className="w-4 h-4 text-primary-600"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <input
                                type="radio"
                                name={`attendance-${studentId}`}
                                checked={currentStatus === 'excused'}
                                onChange={() => handleAttendanceChange(studentId, 'excused')}
                                className="w-4 h-4 text-primary-600"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedSessionId && enrollments.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No students enrolled in this class</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={() => navigate('/attendance/sessions')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedSessionId || enrollments.length === 0}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? 'Saving...' : 'Save Attendance'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

