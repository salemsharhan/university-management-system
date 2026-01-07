import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit, Library } from 'lucide-react'

export default function ViewClass() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchClass()
  }, [id])

  const fetchClass = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*, subjects(id, name_en, code), semesters(id, name_en, code), instructors(id, name_en, email), class_schedules(day_of_week, start_time, end_time, location), colleges(id, name_en, code)')
        .eq('id', id)
        .single()

      if (error) throw error
      setClassData(data)
    } catch (err) {
      console.error('Error fetching class:', err)
      setError(err.message || 'Failed to load class')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !classData) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
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
        <button
          onClick={() => navigate(`/academic/classes/${id}/edit`)}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-gradient rounded-lg flex items-center justify-center">
            <Library className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{classData?.code}</h1>
            <p className="text-gray-600">{classData?.subjects?.name_en}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Subject</h3>
              <p className="text-gray-900">{classData?.subjects?.code} - {classData?.subjects?.name_en}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Semester</h3>
              <p className="text-gray-900">{classData?.semesters?.name_en || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Section</h3>
              <p className="text-gray-900">{classData?.section || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Instructor</h3>
              <p className="text-gray-900">{classData?.instructors?.name_en || 'Not assigned'}</p>
              {classData?.instructors?.email && (
                <p className="text-sm text-gray-600">{classData.instructors.email}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Capacity</h3>
              <p className="text-gray-900">{classData?.enrolled || 0}/{classData?.capacity || 0}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Class Type</h3>
              <p className="text-gray-900 capitalize">{classData?.type?.replace('_', ' ') || 'On Campus'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Room</h3>
              <p className="text-gray-900">{classData?.room || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Building</h3>
              <p className="text-gray-900">{classData?.building || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">College</h3>
              <p className="text-gray-900">
                {classData?.colleges?.name_en || (classData?.is_university_wide ? 'University-wide' : 'N/A')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                classData?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {classData?.status || 'active'}
              </span>
            </div>
          </div>

          {classData?.class_schedules && classData.class_schedules.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Schedule</h3>
              <div className="space-y-3">
                {classData.class_schedules.map((schedule, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Day:</span>
                        <p className="text-gray-900 capitalize">{schedule.day_of_week || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Start Time:</span>
                        <p className="text-gray-900">{schedule.start_time || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">End Time:</span>
                        <p className="text-gray-900">{schedule.end_time || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Location:</span>
                        <p className="text-gray-900">{schedule.location || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {classData?.notes && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{classData.notes}</p>
            </div>
          )}

          {classData?.is_university_wide && (
            <div className="border-t pt-6">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                University-wide (available to all colleges)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

