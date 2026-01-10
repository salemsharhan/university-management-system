import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Plus, Edit, Trash2, DollarSign, Settings, Loader2 } from 'lucide-react'

export default function FinanceConfiguration() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [feeStructures, setFeeStructures] = useState([])
  const [majors, setMajors] = useState([])
  const [semesters, setSemesters] = useState([])

  useEffect(() => {
    fetchFeeStructures()
    if (collegeId || userRole === 'admin') {
      fetchMajors()
      fetchSemesters()
    }
  }, [collegeId])

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
          semester_id,
          is_active,
          valid_from,
          valid_to,
          description,
          college_id,
          is_university_wide,
          colleges (id, name_en),
          semesters (id, name_en, code)
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
    if (!confirm('Are you sure you want to delete this fee structure?')) return

    try {
      const { error } = await supabase
        .from('finance_configuration')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchFeeStructures()
    } catch (err) {
      console.error('Error deleting fee structure:', err)
      alert('Failed to delete fee structure')
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
          <h1 className="text-3xl font-bold text-gray-900">Fee Structure Configuration</h1>
          <p className="text-gray-600 mt-1">Manage base fees and fee structures</p>
        </div>
        <button
          onClick={() => navigate('/finance/configuration/create')}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span>Add Fee Structure</span>
        </button>
      </div>

      {requiresCollegeSelection && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select College</label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Colleges</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>{college.name_en}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : feeStructures.length === 0 ? (
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
                      {fee.semesters ? (
                        <div className="font-semibold">{fee.semesters.name_en} ({fee.semesters.code})</div>
                      ) : (
                        <span className="text-gray-400">No semester assigned</span>
                      )}
                      {fee.applies_to_degree_level && fee.applies_to_degree_level.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Degree: {fee.applies_to_degree_level.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                        </div>
                      )}
                      {fee.applies_to_major && fee.applies_to_major.length > 0 && (
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
      )}
    </div>
  )
}



