import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, BookMarked, Search, Eye, Edit } from 'lucide-react'

export default function Majors() {
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const [majors, setMajors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMajors()
  }, [collegeId, userRole])

  const fetchMajors = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('majors')
        .select('*, faculties(name_en)')
        .eq('status', 'active')
        .order('name_en')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setMajors(data || [])
    } catch (err) {
      console.error('Error fetching majors:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredMajors = majors.filter(major =>
    major.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    major.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Majors</h1>
          <p className="text-gray-600 mt-1">Manage academic majors</p>
        </div>
        <button
          onClick={() => navigate('/academic/majors/create')}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Create Major</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search majors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMajors.map((major) => (
            <div
              key={major.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-primary-gradient rounded-lg flex items-center justify-center">
                  <BookMarked className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{major.name_en}</h3>
                  <p className="text-sm text-gray-500">{major.code}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Faculty:</strong> {major.faculties?.name_en}</p>
                <p><strong>Total Credits:</strong> {major.total_credits}</p>
                <p><strong>Degree Level:</strong> {major.degree_level}</p>
                {major.is_university_wide && (
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    University-wide
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center space-x-2">
                <button
                  onClick={() => navigate(`/academic/majors/${major.id}`)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>
                <button
                  onClick={() => navigate(`/academic/majors/${major.id}/edit`)}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


