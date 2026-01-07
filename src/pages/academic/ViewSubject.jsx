import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit, BookOpen } from 'lucide-react'

export default function ViewSubject() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubject()
  }, [id])

  const fetchSubject = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*, majors(id, name_en, code), instructors(id, name_en, email), colleges(id, name_en, code)')
        .eq('id', id)
        .single()

      if (error) throw error
      setSubject(data)
    } catch (err) {
      console.error('Error fetching subject:', err)
      setError(err.message || 'Failed to load subject')
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

  if (error && !subject) {
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
          onClick={() => navigate(`/academic/subjects/${id}/edit`)}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-gradient rounded-lg flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{subject?.name_en}</h1>
            <p className="text-gray-600">{subject?.code}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Name (Arabic)</h3>
            <p className="text-gray-900">{subject?.name_ar || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Major</h3>
            <p className="text-gray-900">{subject?.majors?.name_en || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Credit Hours</h3>
            <p className="text-gray-900">{subject?.credit_hours || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Type</h3>
            <p className="text-gray-900">{subject?.type || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Instructor</h3>
            <p className="text-gray-900">{subject?.instructors?.name_en || 'Not assigned'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              subject?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {subject?.status || 'active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

