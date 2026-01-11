import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Plus, Edit, Trash2, DollarSign, Settings, Loader2, Tag, FileText } from 'lucide-react'

export default function FinanceConfiguration() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  // Get initial tab from URL query parameter
  const searchParams = new URLSearchParams(window.location.search)
  const initialTab = searchParams.get('tab') || 'structures'
  const [activeTab, setActiveTab] = useState(initialTab === 'types' ? 'types' : 'structures') // 'structures' or 'types'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feeStructures, setFeeStructures] = useState([])
  const [feeTypes, setFeeTypes] = useState([])
  const [majors, setMajors] = useState([])
  const [semesters, setSemesters] = useState([])

  useEffect(() => {
    if (activeTab === 'structures') {
      fetchFeeStructures()
    } else if (activeTab === 'types') {
      fetchFeeTypes()
    }
    if (collegeId || userRole === 'admin') {
      fetchMajors()
      fetchSemesters()
    }
  }, [collegeId, activeTab])

  const fetchFeeTypes = async () => {
    setLoading(true)
    setError('')
    try {
      let query = supabase
        .from('fee_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name_en', { ascending: true })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'admin' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'admin') {
        // University admin can see all fee types - no filter needed
        // Just show all active fee types
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching fee types:', error)
        // If table doesn't exist, show helpful message
        if (error.code === '42P01') {
          setError('Fee types table does not exist. Please run the database migration: 20250110000001_add_fee_types_table.sql')
        } else {
          setError(`Error loading fee types: ${error.message}`)
        }
        throw error
      }
      setFeeTypes(data || [])
    } catch (err) {
      console.error('Error fetching fee types:', err)
      setFeeTypes([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFeeStructures = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('finance_configuration')
        .select(`
          id,
          fee_type,
          fee_name_en,
          fee_name_ar,
          amount,
          currency,
          applies_to_degree_level,
          applies_to_major,
          applies_to_semester,
          is_active,
          valid_from,
          valid_to,
          description,
          college_id,
          is_university_wide,
          colleges (id, name_en)
        `)
        .order('created_at', { ascending: false })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setFeeStructures(data || [])
    } catch (err) {
      console.error('Error fetching fee structures:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMajors = async () => {
    try {
      let query = supabase
        .from('majors')
        .select('id, name_en, code')
        .eq('status', 'active')
        .order('name_en')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setMajors(data || [])
    } catch (err) {
      console.error('Error fetching majors:', err)
    }
  }

  const fetchSemesters = async () => {
    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code')
        .order('start_date', { ascending: false })
        .limit(20)

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
    }
  }

  const handleDelete = async (id) => {
    const entityName = activeTab === 'structures' ? 'fee structure' : 'fee type'
    if (!confirm(`Are you sure you want to delete this ${entityName}?`)) return

    try {
      const table = activeTab === 'structures' ? 'finance_configuration' : 'fee_types'
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error
      
      if (activeTab === 'structures') {
        fetchFeeStructures()
      } else {
        fetchFeeTypes()
      }
    } catch (err) {
      console.error(`Error deleting ${entityName}:`, err)
      alert(`Failed to delete ${entityName}`)
    }
  }

  const getFeeTypeLabel = (type) => {
    const labels = {
      'admission_fee': 'Admission Fee',
      'course_fee': 'Course Fee',
      'subject_fee': 'Subject Fee',
      'onboarding_fee': 'Onboarding Fee',
      'penalty': 'Penalty',
      'miscellaneous': 'Miscellaneous',
      'other': 'Other'
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Configuration</h1>
          <p className="text-gray-600 mt-1">Manage fee types and fee structures</p>
        </div>
        {activeTab === 'structures' && (
          <button
            onClick={() => navigate('/finance/configuration/create')}
            className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span>Add Fee Structure</span>
          </button>
        )}
        {activeTab === 'types' && (userRole === 'admin') && (
          <button
            onClick={() => navigate('/finance/configuration/types/create')}
            className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span>Add Fee Type</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => {
                setActiveTab('structures')
                navigate('/finance/configuration?tab=structures', { replace: true })
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'structures'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Fee Structures</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('types')
                navigate('/finance/configuration?tab=types', { replace: true })
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'types'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4" />
                <span>Fee Types</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {userRole === 'admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by College {requiresCollegeSelection && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => {
              setSelectedCollegeId(e.target.value ? parseInt(e.target.value) : null)
              // Refresh data when college changes
              setTimeout(() => {
                if (activeTab === 'structures') {
                  fetchFeeStructures()
                } else {
                  fetchFeeTypes()
                }
              }, 100)
            }}
            className={`w-full md:w-64 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 ${
              requiresCollegeSelection 
                ? 'border-yellow-300 bg-yellow-50' 
                : 'border-gray-300'
            }`}
            required={requiresCollegeSelection}
          >
            <option value="">All Colleges</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>{college.name_en}</option>
            ))}
          </select>
          {requiresCollegeSelection && (
            <p className="text-xs text-yellow-600 mt-1">Please select a college to view data</p>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : activeTab === 'structures' ? (
        // Fee Structures Tab
        feeStructures.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Fee Structures</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first fee structure</p>
            <button
              onClick={() => navigate('/finance/configuration/create')}
              className="inline-flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Add Fee Structure</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applies To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feeStructures.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{fee.fee_name_en}</div>
                        {fee.fee_name_ar && (
                          <div className="text-sm text-gray-500">{fee.fee_name_ar}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{getFeeTypeLabel(fee.fee_type)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="text-sm font-semibold text-primary-600">
                          {fee.currency} {parseFloat(fee.amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {fee.applies_to_semester && Array.isArray(fee.applies_to_semester) && fee.applies_to_semester.length > 0 ? (
                        <div className="font-semibold">{fee.applies_to_semester.length} semester{fee.applies_to_semester.length !== 1 ? 's' : ''} selected</div>
                      ) : (
                        <span className="text-gray-400">No semesters assigned</span>
                      )}
                      {fee.applies_to_degree_level && Array.isArray(fee.applies_to_degree_level) && fee.applies_to_degree_level.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Degree: {fee.applies_to_degree_level.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                        </div>
                      )}
                      {fee.applies_to_major && Array.isArray(fee.applies_to_major) && fee.applies_to_major.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Majors: {fee.applies_to_major.length} selected
                        </div>
                      )}
                    </div>
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {fee.is_university_wide ? 'University Wide' : (fee.colleges?.name_en || 'N/A')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        fee.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {fee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/finance/configuration/${fee.id}/edit`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(fee.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        // Fee Types Tab
        feeTypes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Fee Types</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first fee type</p>
            {userRole === 'admin' && (
              <button
                onClick={() => navigate('/finance/configuration/types/create')}
                className="inline-flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold"
              >
                <Plus className="w-5 h-5" />
                <span>Add Fee Type</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester Based</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requires Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {userRole === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feeTypes.map((feeType) => (
                  <tr key={feeType.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-gray-900">{feeType.code}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{feeType.name_en}</div>
                        {feeType.name_ar && (
                          <div className="text-sm text-gray-500">{feeType.name_ar}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                        {feeType.category || 'general'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        feeType.is_semester_based ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {feeType.is_semester_based ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        feeType.requires_semester ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {feeType.requires_semester ? 'Required' : 'Optional'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {feeType.is_university_wide ? 'University Wide' : 'College Specific'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        feeType.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {feeType.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/finance/configuration/types/${feeType.id}/edit`)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(feeType.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}



