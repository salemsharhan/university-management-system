import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Search, Calendar, Users, Clock, FileText } from 'lucide-react'

export default function ClassSessions() {
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    fetchClasses()
  }, [collegeId, userRole])

  useEffect(() => {
    if (selectedClassId) {
      fetchSessions()
    }
  }, [selectedClassId, collegeId, userRole])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('classes')
        .select('id, code, section, subjects(name_en, code), semesters(name_en, code), capacity')
        .eq('status', 'active')

      // Filter by college for college admins - only their college's classes (exclude university-wide)
      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId).eq('is_university_wide', false)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      let query = supabase
        .from('class_sessions')
        .select('*, classes(code, section, subjects(name_en)), instructors(name_en)')
        .eq('class_id', selectedClassId)
        .order('session_date', { ascending: false })

      // Filter by college for college admins
      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error('Error fetching sessions:', err)
    }
  }

  const filteredClasses = classes.filter(cls =>
    cls.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.subjects?.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/attendance')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Sessions</h1>
          <p className="text-gray-600 mt-1">Select a class to view and manage its attendance sessions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Selection Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-primary-gradient text-white p-4 rounded-t-xl flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span className="font-semibold">Select a Class</span>
          </div>
          <div className="p-4">
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-4"
            />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : filteredClasses.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No classes found</p>
              ) : (
                filteredClasses.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedClassId === cls.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-900">{cls.code}-{cls.section}</p>
                        <p className="text-sm text-gray-600">Subject: {cls.subjects?.name_en || cls.subjects?.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{cls.capacity} Students</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{cls.semesters?.name_en || cls.semesters?.code}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sessions Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          {selectedClassId ? (
            <>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Class Sessions</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {classes.find(c => c.id === selectedClassId)?.code}-{classes.find(c => c.id === selectedClassId)?.section}
                </p>
              </div>
              <div className="p-6">
                {sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-900 mb-2">No sessions available</p>
                    <p className="text-sm text-gray-600 mb-4">Create sessions to start recording attendance</p>
                    <button
                      onClick={() => navigate(`/attendance/take?classId=${selectedClassId}`)}
                      className="px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Create Session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {new Date(session.session_date).toLocaleDateString()}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{session.start_time} - {session.end_time}</span>
                              </div>
                              {session.location && (
                                <span>{session.location}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/attendance/take?sessionId=${session.id}&classId=${selectedClassId}`)}
                            className="px-4 py-2 bg-primary-gradient text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                          >
                            Take Attendance
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">Select a class to view sessions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

