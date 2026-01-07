import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Plus, Edit, Trash2, Calendar, DollarSign, Loader2 } from 'lucide-react'

export default function InstallmentPlans() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState([])

  useEffect(() => {
    fetchPlans()
  }, [collegeId])

  const fetchPlans = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('installment_plans')
        .select(`
          id,
          plan_code,
          name_en,
          name_ar,
          number_of_installments,
          total_amount,
          late_payment_penalty_percentage,
          late_payment_penalty_fixed,
          grace_period_days,
          is_active,
          valid_from,
          valid_to,
          degree_level,
          major_id,
          semester_id,
          majors (id, name_en),
          semesters (id, name_en),
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
      setPlans(data || [])
    } catch (err) {
      console.error('Error fetching installment plans:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this installment plan?')) return

    try {
      const { error } = await supabase
        .from('installment_plans')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchPlans()
    } catch (err) {
      console.error('Error deleting plan:', err)
      alert('Failed to delete installment plan')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Installment Plans</h1>
          <p className="text-gray-600 mt-1">Manage payment installment plans</p>
        </div>
        <button
          onClick={() => navigate('/finance/installments/create')}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span>Create Plan</span>
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
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Installment Plans</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first installment plan</p>
          <button
            onClick={() => navigate('/finance/installments/create')}
            className="inline-flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Create Plan</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name_en}</h3>
                  {plan.name_ar && (
                    <p className="text-sm text-gray-600">{plan.name_ar}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Code: {plan.plan_code}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Installments</span>
                  <span className="font-semibold">{plan.number_of_installments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="text-lg font-bold text-primary-600">
                    ${parseFloat(plan.total_amount || 0).toFixed(2)}
                  </span>
                </div>
                {plan.degree_level && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Degree Level</span>
                    <span className="text-sm font-medium capitalize">{plan.degree_level}</span>
                  </div>
                )}
                {plan.majors && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Major</span>
                    <span className="text-sm font-medium">{plan.majors.name_en}</span>
                  </div>
                )}
                {plan.colleges && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">College</span>
                    <span className="text-sm font-medium">{plan.colleges.name_en}</span>
                  </div>
                )}
                {plan.late_payment_penalty_percentage > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Late Fee</span>
                    <span className="text-sm font-medium text-red-600">
                      {plan.late_payment_penalty_percentage}%
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate(`/finance/installments/${plan.id}`)}
                  className="flex-1 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
                >
                  View Details
                </button>
                <button
                  onClick={() => navigate(`/finance/installments/${plan.id}/edit`)}
                  className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



