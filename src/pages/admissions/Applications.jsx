import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Search, Plus, Filter, Eye, CheckCircle, XCircle, Clock, Calendar, Mail, Phone, MapPin, GraduationCap, FileText } from 'lucide-react'

export default function Applications() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId: authCollegeId, loading: authLoading } = useAuth()
  const { selectedCollegeId, loading: collegeLoading } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all') // all, pending, accepted, rejected
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
  })

  const fetchApplications = useCallback(async () => {
    // Don't fetch if auth is still loading or userRole is not yet determined
    if (authLoading || userRole === null || userRole === undefined) {
      return
    }

    // Compute collegeId based on user role
    const effectiveCollegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

    // For non-admin users, we need collegeId to be available
    if (userRole !== 'admin' && !authCollegeId) {
      setLoading(false)
      return
    }

    // For admin users, we can fetch all applications if no college is selected
    // Or we can wait for college selection - let's allow fetching all if no college selected
    setLoading(true)
    try {
      let query = supabase
        .from('applications')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          status_code,
          application_number,
          created_at,
          majors (
            name_en,
            code
          ),
          semesters (
            name_en,
            code
          ),
          colleges (
            name_en
          )
        `)
        .order('created_at', { ascending: false })

      // Apply college filter only if collegeId is available
      if (effectiveCollegeId) {
        query = query.eq('college_id', effectiveCollegeId)
      }

      const { data, error } = await query
      if (error) throw error

      setApplications(data || [])
      
      // Calculate stats based on status_code
      const total = data?.length || 0
      const pending = data?.filter(a => ['APSB', 'APPN', 'RVQU', 'RVIN', 'DCPN', 'ENPN'].includes(a.status_code)).length || 0
      const accepted = data?.filter(a => ['DCFA', 'DCCA', 'ENCF', 'ENAC'].includes(a.status_code)).length || 0
      const rejected = data?.filter(a => a.status_code === 'DCRJ').length || 0
      
      setStats({ total, pending, accepted, rejected })
    } catch (err) {
      console.error('Error fetching applications:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedCollegeId, userRole, authCollegeId, authLoading])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  useEffect(() => {
    filterApplications()
  }, [applications, searchQuery, statusFilter])

  const filterApplications = () => {
    let filtered = [...applications]

    // Filter by status_code
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(app => ['APSB', 'APPN', 'RVQU', 'RVIN', 'DCPN', 'ENPN'].includes(app.status_code))
      } else if (statusFilter === 'accepted') {
        filtered = filtered.filter(app => ['DCFA', 'DCCA', 'ENCF', 'ENAC'].includes(app.status_code))
      } else if (statusFilter === 'rejected') {
        filtered = filtered.filter(app => app.status_code === 'DCRJ')
      } else if (statusFilter === 'waitlisted') {
        filtered = filtered.filter(app => app.status_code === 'DCWL')
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(app => 
        app.first_name?.toLowerCase().includes(query) ||
        app.last_name?.toLowerCase().includes(query) ||
        app.email?.toLowerCase().includes(query) ||
        app.phone?.includes(query)
      )
    }

    setFilteredApplications(filtered)
  }

  const getStatusColor = (statusCode) => {
    // Map status codes to colors
    const statusMap = {
      'APDR': 'bg-gray-100 text-gray-800 border-gray-200',
      'APSB': 'bg-blue-100 text-blue-800 border-blue-200',
      'APPN': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'APPC': 'bg-green-100 text-green-800 border-green-200',
      'RVQU': 'bg-blue-100 text-blue-800 border-blue-200',
      'RVIN': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'RVHL': 'bg-orange-100 text-orange-800 border-orange-200',
      'DCPN': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'DCFA': 'bg-green-100 text-green-800 border-green-200',
      'DCCA': 'bg-green-100 text-green-800 border-green-200',
      'DCWL': 'bg-blue-100 text-blue-800 border-blue-200',
      'DCRJ': 'bg-red-100 text-red-800 border-red-200',
      'ENPN': 'bg-blue-100 text-blue-800 border-blue-200',
      'ENCF': 'bg-green-100 text-green-800 border-green-200',
      'ENAC': 'bg-green-100 text-green-800 border-green-200',
    }
    return statusMap[statusCode] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusLabel = (statusCode) => {
    const statusMap = {
      'APDR': 'Draft',
      'APSB': 'Submitted',
      'APPN': 'Payment Pending',
      'APPC': 'Payment Confirmed',
      'RVQU': 'Review Queue',
      'RVIN': 'Under Review',
      'RVHL': 'On Hold',
      'DCPN': 'Decision Pending',
      'DCFA': 'Accepted (Final)',
      'DCCA': 'Accepted (Conditional)',
      'DCWL': 'Waitlisted',
      'DCRJ': 'Rejected',
      'ENPN': 'Enrollment Pending',
      'ENCF': 'Enrollment Confirmed',
      'ENAC': 'Enrolled (Active)',
    }
    return statusMap[statusCode] || statusCode
  }

  const getStatusIcon = (statusCode) => {
    if (['DCFA', 'DCCA', 'ENCF', 'ENAC', 'APPC'].includes(statusCode)) {
      return <CheckCircle className="w-4 h-4" />
    }
    if (statusCode === 'DCRJ') {
      return <XCircle className="w-4 h-4" />
    }
    return <Clock className="w-4 h-4" />
  }

  // Show loading if auth is still loading or if we're fetching applications
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // For non-admin users without a college, show message
  if (userRole !== 'admin' && !authCollegeId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">College Not Assigned</h2>
          <p className="text-gray-600">Please contact your administrator to assign you to a college.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">Manage student admission applications</p>
        </div>
        <button
          onClick={() => navigate('/admissions/applications/create')}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>New Application</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Applications</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Accepted</p>
              <p className="text-3xl font-bold text-green-600">{stats.accepted}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rejected</p>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="waitlisted">Waitlisted</option>
          </select>
        </div>
      </div>

      {/* Applications Grid */}
      {filteredApplications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((application) => (
            <div
              key={application.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/admissions/applications/${application.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {application.first_name} {application.last_name}
                  </h3>
                  <p className="text-sm text-gray-600">{application.email}</p>
                </div>
                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(application.status_code)}`}>
                  {getStatusIcon(application.status_code)}
                  <span>{getStatusLabel(application.status_code)}</span>
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {application.application_number && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span className="font-mono">{application.application_number}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <GraduationCap className="w-4 h-4" />
                  <span>{application.majors?.name_en || 'N/A'}</span>
                </div>
                {application.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{application.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Applied: {new Date(application.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/admissions/applications/${application.id}`)
                  }}
                  className="w-full bg-primary-50 text-primary-600 py-2 rounded-xl font-medium hover:bg-primary-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Applications Found</h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'No applications have been submitted yet'}
          </p>
        </div>
      )}
    </div>
  )
}

