import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, Plus, MoreVertical, Edit, Trash2, Eye, Mail, Phone } from 'lucide-react'

export default function Instructors() {
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showActions, setShowActions] = useState(null)

  useEffect(() => {
    fetchInstructors()
  }, [collegeId, userRole])

  const fetchInstructors = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('instructors')
        .select('*, departments(name_en, code)')
        .order('created_at', { ascending: false })

      // Filter by college_id for college admins - only show instructors from their college
      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      }
      // For super admins, show all instructors (no filter)

      const { data, error } = await query
      if (error) throw error
      setInstructors(data || [])
    } catch (err) {
      console.error('Error fetching instructors:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredInstructors = instructors.filter(instructor =>
    (instructor.name_en && instructor.name_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (instructor.email && instructor.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (instructor.employee_id && instructor.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Instructors</h1>
          <p className="text-gray-600 mt-1">Manage instructor records and information</p>
        </div>
        <button
          onClick={() => navigate('/instructors/create')}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Instructor</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Instructors Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstructors.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No instructors found
            </div>
          ) : (
            filteredInstructors.map((instructor) => (
              <div
                key={instructor.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {instructor.name_en}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{instructor.title || 'Instructor'}</p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowActions(showActions === instructor.id ? null : instructor.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {showActions === instructor.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowActions(null)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                          <button 
                            onClick={() => {
                              navigate(`/instructors/${instructor.id}`)
                              setShowActions(null)
                            }}
                            className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                          <button 
                            onClick={() => {
                              navigate(`/instructors/${instructor.id}/edit`)
                              setShowActions(null)
                            }}
                            className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="font-medium">ID:</span>
                    <span>{instructor.employee_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{instructor.email || 'N/A'}</span>
                  </div>
                  {instructor.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{instructor.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="font-medium">Department:</span>
                    <span>{instructor.departments?.name_en || 'N/A'}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        instructor.status || 'active'
                      )}`}
                    >
                      {(instructor.status || 'active').replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
