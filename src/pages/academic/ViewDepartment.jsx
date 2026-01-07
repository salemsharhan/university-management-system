import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit, Building2, Trash2 } from 'lucide-react'

export default function ViewDepartment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [department, setDepartment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchDepartment()
  }, [id])

  const fetchDepartment = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*, instructors:head_id(id, name_en, email, title), colleges(id, name_en, code)')
        .eq('id', id)
        .single()

      if (error) throw error
      setDepartment(data)
    } catch (err) {
      console.error('Error fetching department:', err)
      setError(err.message || 'Failed to load department')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

      if (error) throw error
      navigate('/academic/departments')
    } catch (err) {
      console.error('Error deleting department:', err)
      setError(err.message || 'Failed to delete department')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !department) {
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
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/academic/departments/${id}/edit`)}
            className="flex items-center space-x-2 bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-gradient rounded-lg flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{department?.name_en}</h1>
            <p className="text-gray-600">{department?.code}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Name (Arabic)</h3>
            <p className="text-gray-900">{department?.name_ar || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              department?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {department?.status || 'active'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Head of Department</h3>
            <p className="text-gray-900">
              {department?.instructors?.name_en || 'Not assigned'}
              {department?.instructors?.title && ` (${department.instructors.title})`}
            </p>
            {department?.instructors?.email && (
              <p className="text-sm text-gray-600">{department.instructors.email}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">College</h3>
            <p className="text-gray-900">
              {department?.colleges?.name_en || (department?.is_university_wide ? 'University-wide' : 'N/A')}
            </p>
          </div>
          {department?.description && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              <p className="text-gray-900">{department.description}</p>
            </div>
          )}
          {department?.description_ar && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description (Arabic)</h3>
              <p className="text-gray-900">{department.description_ar}</p>
            </div>
          )}
          {department?.is_university_wide && (
            <div className="md:col-span-2">
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



