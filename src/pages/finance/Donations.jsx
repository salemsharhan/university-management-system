import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Plus, Edit, Trash2, DollarSign, Building2, Loader2 } from 'lucide-react'

export default function Donations() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [donations, setDonations] = useState([])

  useEffect(() => {
    fetchDonations()
  }, [collegeId])

  const fetchDonations = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('donations')
        .select('*')
        .order('donation_date', { ascending: false })

      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setDonations(data || [])
    } catch (err) {
      console.error('Error fetching donations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this donation?')) return

    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchDonations()
    } catch (err) {
      console.error('Error deleting donation:', err)
      alert('Failed to delete donation')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Donations Management</h1>
          <p className="text-gray-600 mt-1">Manage donation records</p>
        </div>
        <button
          onClick={() => navigate('/finance/donations/create')}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span>Add Donation</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donations.map((donation) => (
            <div key={donation.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{donation.institute_name_en}</h3>
                  {donation.institute_name_ar && (
                    <p className="text-sm text-gray-600">{donation.institute_name_ar}</p>
                  )}
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Amount</span>
                  <span className="text-xl font-bold text-green-600">
                    ${parseFloat(donation.donation_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Date</span>
                  <span className="text-sm font-medium">
                    {new Date(donation.donation_date).toLocaleDateString()}
                  </span>
                </div>
                {donation.reference_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reference ID</span>
                    <span className="text-sm font-medium">{donation.reference_id}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate(`/finance/donations/${donation.id}/edit`)}
                  className="flex-1 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(donation.id)}
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



