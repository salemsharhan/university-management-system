import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { AlertTriangle, Calendar, Clock, MapPin, Users, XCircle, CheckCircle } from 'lucide-react'

export default function ExaminationConflicts() {
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [conflicts, setConflicts] = useState([])
  const [conflictStats, setConflictStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  })

  useEffect(() => {
    fetchConflicts()
  }, [collegeId, userRole])

  const fetchConflicts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('examinations')
        .select(`
          id,
          exam_name,
          exam_code,
          exam_date,
          start_time,
          end_time,
          exam_type,
          status,
          classes (
            id,
            code,
            capacity,
            enrolled,
            subjects (
              name_en
            )
          )
        `)
        .eq('status', 'scheduled')
        .order('exam_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data } = await query

      if (data) {
        const detectedConflicts = []
        
        // Check for time conflicts (same date, overlapping times)
        for (let i = 0; i < data.length; i++) {
          for (let j = i + 1; j < data.length; j++) {
            const exam1 = data[i]
            const exam2 = data[j]
            
            // Same date
            if (exam1.exam_date === exam2.exam_date) {
              const start1 = exam1.start_time
              const end1 = exam1.end_time
              const start2 = exam2.start_time
              const end2 = exam2.end_time
              
              // Check for time overlap
              if ((start1 <= start2 && end1 > start2) || (start2 <= start1 && end2 > start1)) {
                // Determine severity
                let severity = 'low'
                const overlapMinutes = Math.min(
                  Math.max(0, (new Date(`2000-01-01T${end1}`) - new Date(`2000-01-01T${start2}`)) / 60000),
                  Math.max(0, (new Date(`2000-01-01T${end2}`) - new Date(`2000-01-01T${start1}`)) / 60000)
                )
                
                if (overlapMinutes > 60) severity = 'critical'
                else if (overlapMinutes > 30) severity = 'high'
                else if (overlapMinutes > 15) severity = 'medium'
                
                detectedConflicts.push({
                  id: `${exam1.id}-${exam2.id}`,
                  exam1,
                  exam2,
                  severity,
                  type: 'time_overlap',
                  overlapMinutes: Math.round(overlapMinutes),
                })
              }
            }
          }
        }

        // Check for class conflicts (same class, different exams on same day)
        const classExams = {}
        data.forEach(exam => {
          if (exam.classes?.id) {
            const key = `${exam.classes.id}-${exam.exam_date}`
            if (!classExams[key]) {
              classExams[key] = []
            }
            classExams[key].push(exam)
          }
        })

        Object.entries(classExams).forEach(([key, exams]) => {
          if (exams.length > 1) {
            exams.forEach((exam1, i) => {
              exams.slice(i + 1).forEach(exam2 => {
                detectedConflicts.push({
                  id: `class-${exam1.id}-${exam2.id}`,
                  exam1,
                  exam2,
                  severity: 'critical',
                  type: 'same_class',
                })
              })
            })
          }
        })

        setConflicts(detectedConflicts)
        
        // Calculate statistics
        const stats = {
          critical: detectedConflicts.filter(c => c.severity === 'critical').length,
          high: detectedConflicts.filter(c => c.severity === 'high').length,
          medium: detectedConflicts.filter(c => c.severity === 'medium').length,
          low: detectedConflicts.filter(c => c.severity === 'low').length,
        }
        setConflictStats(stats)
      }
    } catch (err) {
      console.error('Error fetching conflicts:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Examination Conflicts</h1>
          <p className="text-gray-600 mt-1">Detect and resolve scheduling conflicts</p>
        </div>
      </div>

      {/* Conflict Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Critical</p>
              <p className="text-3xl font-bold text-red-600">{conflictStats.critical}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">High</p>
              <p className="text-3xl font-bold text-orange-600">{conflictStats.high}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Medium</p>
              <p className="text-3xl font-bold text-yellow-600">{conflictStats.medium}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Low</p>
              <p className="text-3xl font-bold text-blue-600">{conflictStats.low}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Conflicts List */}
      {conflicts.length > 0 ? (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`bg-white rounded-2xl shadow-sm border-2 ${getSeverityColor(conflict.severity)} p-6`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getSeverityIcon(conflict.severity)}
                  <div>
                    <h3 className="font-bold text-gray-900 capitalize">
                      {conflict.severity} {conflict.type === 'time_overlap' ? 'Time Overlap' : 'Same Class Conflict'}
                    </h3>
                    {conflict.overlapMinutes && (
                      <p className="text-sm text-gray-600">
                        Overlap: {conflict.overlapMinutes} minutes
                      </p>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getSeverityColor(conflict.severity)}`}>
                  {conflict.severity}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Exam 1 */}
                <div className="p-4 bg-white bg-opacity-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Exam 1</h4>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{conflict.exam1.exam_name}</p>
                    <p className="text-gray-600">{conflict.exam1.exam_code}</p>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(conflict.exam1.exam_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{conflict.exam1.start_time?.substring(0, 5)} - {conflict.exam1.end_time?.substring(0, 5)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{conflict.exam1.classes?.code} - {conflict.exam1.classes?.subjects?.name_en || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Exam 2 */}
                <div className="p-4 bg-white bg-opacity-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Exam 2</h4>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{conflict.exam2.exam_name}</p>
                    <p className="text-gray-600">{conflict.exam2.exam_code}</p>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(conflict.exam2.exam_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{conflict.exam2.start_time?.substring(0, 5)} - {conflict.exam2.end_time?.substring(0, 5)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{conflict.exam2.classes?.code} - {conflict.exam2.classes?.subjects?.name_en || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-300">
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => navigate(`/examinations/${conflict.exam1.id}/edit`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                  >
                    Edit Exam 1
                  </button>
                  <button
                    onClick={() => navigate(`/examinations/${conflict.exam2.id}/edit`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                  >
                    Edit Exam 2
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Conflicts Detected</h3>
          <p className="text-gray-600">
            All examinations are scheduled without conflicts
          </p>
        </div>
      )}
    </div>
  )
}



