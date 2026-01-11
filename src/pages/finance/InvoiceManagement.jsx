import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Search, FileText, Download, CheckCircle, XCircle, Clock, DollarSign, Calendar, Building2, GraduationCap, BookOpen, User, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'

export default function InvoiceManagement() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(true) // Start with loading true for initial fetch
  const [searchQuery, setSearchQuery] = useState('')
  const [studentData, setStudentData] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [groupedInvoices, setGroupedInvoices] = useState({})
  const [walletBalance, setWalletBalance] = useState(0)
  const [pendingFees, setPendingFees] = useState(0)
  const [viewMode, setViewMode] = useState('all') // Default to 'all' for admins
  const [statusFilter, setStatusFilter] = useState('all')
  const [semesters, setSemesters] = useState([])
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // For admins and college admins, fetch all invoices on load
    if (viewMode === 'all') {
      if (userRole === 'admin') {
        // University admin can view all invoices regardless of college selection
        fetchAllInvoices()
        fetchSemesters()
      } else if (userRole === 'user') {
        // College admin needs collegeId to fetch invoices
        if (collegeId) {
          fetchAllInvoices()
          fetchSemesters()
        } else {
          // Wait for collegeId to be set
          setLoading(false)
        }
      } else {
        // Not admin or college admin - no invoices to show
        setLoading(false)
      }
    } else {
      // Student view mode - don't load invoices on mount
      setLoading(false)
    }
  }, [userRole, collegeId, selectedCollegeId, statusFilter, selectedSemesterId, viewMode])

  useEffect(() => {
    if (viewMode === 'student' && searchQuery && searchQuery.length >= 3) {
      const timeoutId = setTimeout(() => {
        searchStudent()
      }, 500)
      return () => clearTimeout(timeoutId)
    } else if (viewMode === 'student') {
      setStudentData(null)
      setInvoices([])
      setGroupedInvoices({})
    }
  }, [searchQuery, collegeId, viewMode])

  const fetchSemesters = async () => {
    // For university admin, fetch all semesters
    // For college admin, fetch semesters for their college
    if (userRole !== 'admin' && userRole !== 'user') return
    if (userRole === 'user' && !collegeId) return

    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code, start_date, end_date')
        .order('start_date', { ascending: false })
        .limit(50)

      if (userRole === 'user' && collegeId) {
        // College admin: show their college's semesters and university-wide
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'admin' && selectedCollegeId) {
        // University admin with college selected: show that college's semesters
        query = query.eq('college_id', selectedCollegeId).eq('is_university_wide', false)
      }
      // University admin without college selected: show all semesters (no filter)

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
    }
  }

  const fetchAllInvoices = async () => {
    // Only fetch for admins and college admins in 'all' view mode
    if (viewMode !== 'all' || (userRole !== 'admin' && userRole !== 'user')) {
      setLoading(false)
      return
    }
    
    // For college admin, need collegeId
    if (userRole === 'user' && !collegeId) {
      setLoading(false)
      setInvoices([])
      setGroupedInvoices({})
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          invoice_type,
          status,
          subtotal,
          discount_amount,
          scholarship_amount,
          total_amount,
          paid_amount,
          pending_amount,
          semester_id,
          student_id,
          college_id,
          students (
            id,
            student_id,
            name_en,
            first_name,
            last_name,
            email
          ),
          semesters (
            id,
            name_en,
            code,
            start_date,
            end_date
          ),
          colleges (
            id,
            name_en,
            code
          )
        `)
        .order('invoice_date', { ascending: false })
        .limit(500) // Limit to recent 500 invoices

      // Filter by college if selected (for university admin) or if user is college admin
      if (userRole === 'admin' && selectedCollegeId) {
        query = query.eq('college_id', selectedCollegeId)
      } else if (userRole === 'user' && collegeId) {
        // College admin - always filter by their college
        query = query.eq('college_id', collegeId)
      }
      // If userRole === 'admin' and selectedCollegeId is null/empty, show all invoices (no filter)

      // Filter by status
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Filter by semester if selected
      if (selectedSemesterId) {
        query = query.eq('semester_id', selectedSemesterId)
      }

      const { data: invoicesData, error: invoicesError } = await query

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError)
        console.error('Error details:', JSON.stringify(invoicesError, null, 2))
        setError(`Failed to fetch invoices: ${invoicesError.message || 'Unknown error'}`)
        setInvoices([])
        setGroupedInvoices({})
        return
      }

      console.log('Fetched invoices:', invoicesData?.length || 0, 'invoices')
      setInvoices(invoicesData || [])

      // Group invoices by semester
      const grouped = {}
      let totalPending = 0

      ;(invoicesData || []).forEach(invoice => {
        const semesterKey = invoice.semester_id 
          ? `semester_${invoice.semester_id}` 
          : 'no_semester'
        
        if (!grouped[semesterKey]) {
          grouped[semesterKey] = {
            semester: invoice.semesters,
            invoices: [],
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0
          }
        }

        grouped[semesterKey].invoices.push(invoice)
        grouped[semesterKey].totalAmount += parseFloat(invoice.total_amount || 0)
        grouped[semesterKey].paidAmount += parseFloat(invoice.paid_amount || 0)
        grouped[semesterKey].pendingAmount += parseFloat(invoice.pending_amount || 0)
        
        if (invoice.status === 'pending' || invoice.status === 'overdue' || invoice.status === 'partially_paid') {
          totalPending += parseFloat(invoice.pending_amount || 0)
        }
      })

      console.log('Grouped invoices:', Object.keys(grouped).length, 'groups')
      setGroupedInvoices(grouped)
      setPendingFees(totalPending)
      setError('') // Clear any previous errors

    } catch (err) {
      console.error('Error fetching all invoices:', err)
      setError(`Failed to load invoices: ${err.message || 'Unknown error'}`)
      setInvoices([])
      setGroupedInvoices({})
    } finally {
      setLoading(false)
    }
  }

  const searchStudent = async () => {
    if (!collegeId && userRole !== 'admin') return
    
    setLoading(true)
    try {
      // Search by student_id
      let studentQuery = supabase
        .from('students')
        .select(`
          id,
          student_id,
          name_en,
          first_name,
          last_name,
          email,
          phone,
          status,
          gpa,
          enrollment_date,
          college_id,
          colleges (
            id,
            name_en
          ),
          majors (
            id,
            name_en,
            code,
            departments (
              id,
              name_en
            )
          )
        `)
        .ilike('student_id', `%${searchQuery}%`)
        .limit(1)

      if (userRole === 'user' && collegeId) {
        studentQuery = studentQuery.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        studentQuery = studentQuery.eq('college_id', collegeId)
      }

      const { data: studentData, error: studentError } = await studentQuery

      if (studentError) {
        console.error('Error searching student:', studentError)
        setStudentData(null)
        return
      }

      if (!studentData || studentData.length === 0) {
        setStudentData(null)
        setInvoices([])
        setGroupedInvoices({})
        return
      }

      const student = studentData[0]
      setStudentData(student)

      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('student_id', student.id)
        .single()

      setWalletBalance(walletData?.balance || 0)

      // Fetch all invoices for this student
      let invoiceQuery = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          invoice_type,
          status,
          subtotal,
          discount_amount,
          scholarship_amount,
          total_amount,
          paid_amount,
          pending_amount,
          semester_id,
          semesters (
            id,
            name_en,
            code,
            start_date,
            end_date
          )
        `)
        .eq('student_id', student.id)
        .order('invoice_date', { ascending: false })

      if (userRole === 'user' && collegeId) {
        invoiceQuery = invoiceQuery.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        invoiceQuery = invoiceQuery.eq('college_id', collegeId)
      }

      const { data: invoicesData, error: invoicesError } = await invoiceQuery

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError)
        return
      }

      setInvoices(invoicesData || [])

      // Group invoices by semester
      const grouped = {}
      let totalPending = 0

      ;(invoicesData || []).forEach(invoice => {
        const semesterKey = invoice.semester_id 
          ? `semester_${invoice.semester_id}` 
          : 'no_semester'
        
        if (!grouped[semesterKey]) {
          grouped[semesterKey] = {
            semester: invoice.semesters,
            invoices: [],
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0
          }
        }

        grouped[semesterKey].invoices.push(invoice)
        grouped[semesterKey].totalAmount += parseFloat(invoice.total_amount || 0)
        grouped[semesterKey].paidAmount += parseFloat(invoice.paid_amount || 0)
        grouped[semesterKey].pendingAmount += parseFloat(invoice.pending_amount || 0)
        
        if (invoice.status === 'pending' || invoice.status === 'overdue' || invoice.status === 'partially_paid') {
          totalPending += parseFloat(invoice.pending_amount || 0)
        }
      })

      setGroupedInvoices(grouped)
      setPendingFees(totalPending)

    } catch (err) {
      console.error('Error in search:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'partially_paid':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-gray-600 mt-1">Search and manage student invoices</p>
        </div>
        <button
          onClick={() => navigate('/finance/invoices/create')}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
        >
          <FileText className="w-5 h-5" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* College Selection for Admin */}
      {userRole === 'admin' && (
        <div className={`bg-white rounded-2xl shadow-sm border p-4 ${
          requiresCollegeSelection
            ? 'border-yellow-300 bg-yellow-50' 
            : 'border-gray-200'
        }`}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by College {requiresCollegeSelection && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => {
              const newCollegeId = e.target.value ? parseInt(e.target.value) : null
              setSelectedCollegeId(newCollegeId)
              setSelectedSemesterId('') // Reset semester filter when college changes
              setError('') // Clear errors
              // Refresh invoices when college changes
              if (viewMode === 'all') {
                fetchAllInvoices()
              }
            }}
            className={`w-full md:w-64 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              requiresCollegeSelection
                ? 'border-yellow-300 bg-white'
                : 'border-gray-300'
            }`}
            required={requiresCollegeSelection}
          >
            <option value="">All Colleges</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>
                {college.name_en}
              </option>
            ))}
          </select>
          {requiresCollegeSelection && (
            <p className="text-xs text-yellow-600 mt-1">Please select a college to view invoices</p>
          )}
        </div>
      )}

      {/* View Mode Toggle and Filters (for admins) */}
      {(userRole === 'admin' || userRole === 'user') && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">View Mode:</label>
              <button
                onClick={() => {
                  setViewMode('all')
                  setSearchQuery('')
                  setStudentData(null)
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Invoices
              </button>
              <button
                onClick={() => {
                  setViewMode('student')
                  setInvoices([])
                  setGroupedInvoices({})
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'student'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Search by Student
              </button>
            </div>
          </div>

          {viewMode === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Semester</label>
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Semesters</option>
                  {semesters.map(semester => (
                    <option key={semester.id} value={semester.id}>
                      {semester.name_en} ({semester.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Invoices:</span> {invoices.length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search by Student */}
      {viewMode === 'student' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Student Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-3 text-gray-600">{viewMode === 'all' ? 'Loading invoices...' : 'Searching...'}</span>
        </div>
      )}

      {/* No Invoices Message for All View */}
      {!loading && viewMode === 'all' && invoices.length === 0 && (userRole === 'admin' || userRole === 'user') && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices Found</h3>
          <p className="text-gray-600 mb-4">
            {userRole === 'admin' && !selectedCollegeId 
              ? 'No invoices found. Try selecting a specific college or adjust your filters.' 
              : userRole === 'admin' && selectedCollegeId
              ? 'No invoices found for the selected college. Try adjusting your filters.'
              : userRole === 'user'
              ? 'No invoices found for your college. Try adjusting your filters.'
              : 'No invoices found for the selected filters.'}
          </p>
        </div>
      )}

      {/* Student Information */}
      {studentData && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Student Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Student Number</p>
                <p className="font-semibold">{studentData.student_id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Student Name</p>
                <p className="font-semibold">
                  {studentData.first_name && studentData.last_name
                    ? `${studentData.first_name} ${studentData.last_name}`
                    : studentData.name_en}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Faculty</p>
                <p className="font-semibold">{studentData.colleges?.name_en || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Major</p>
                <p className="font-semibold">{studentData.majors?.name_en || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Study Type</p>
                <p className="font-semibold">{studentData.study_type || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Study Load</p>
                <p className="font-semibold">{studentData.study_load || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Study Approach</p>
                <p className="font-semibold">{studentData.study_approach || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Degree Level</p>
                <p className="font-semibold">{studentData.majors?.degree_level || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-semibold capitalize">{studentData.status || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">GPA</p>
                <p className="font-semibold">{studentData.gpa?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Pending Fees</p>
                <p className="font-semibold text-red-600">{formatCurrency(pendingFees)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Wallet Balance</p>
                <p className="font-semibold text-green-600">{formatCurrency(walletBalance)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices by Semester */}
      {!loading && Object.keys(groupedInvoices).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedInvoices).map(([key, group]) => (
            <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {group.semester 
                      ? `${group.semester.name_en} (${group.semester.code})`
                      : 'No Semester Assigned'}
                  </h3>
                  {group.semester && (
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(group.semester.start_date)} - {formatDate(group.semester.end_date)}
                    </p>
                  )}
                  {viewMode === 'all' && (
                    <p className="text-sm text-gray-500 mt-1">
                      {group.invoices.length} invoice{group.invoices.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(group.totalAmount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">Admission Fees</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(
                      group.invoices
                        .filter(inv => inv.invoice_type === 'admission_fee')
                        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)
                    )}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">Subject Fees</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(
                      group.invoices
                        .filter(inv => inv.invoice_type === 'subject_fee' || inv.invoice_type === 'course_fee')
                        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)
                    )}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600">Paid Fees</p>
                  <p className="text-xl font-bold text-yellow-600">{formatCurrency(group.paidAmount)}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <span className="font-semibold text-red-900">Total Pending Fees</span>
                  <span className="text-xl font-bold text-red-600">{formatCurrency(group.pendingAmount)}</span>
                </div>
              </div>

              {/* Invoice List */}
              <div className="space-y-3">
                {group.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2 flex-wrap">
                          <span className="font-semibold">{invoice.invoice_number}</span>
                          <span
                            className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {getStatusIcon(invoice.status)}
                            <span className="capitalize">{invoice.status.replace('_', ' ')}</span>
                          </span>
                          <span className="text-sm text-gray-500 capitalize">
                            {invoice.invoice_type.replace('_', ' ')}
                          </span>
                          {viewMode === 'all' && invoice.students && (
                            <span className="text-sm text-gray-700 font-medium">
                              Student: {invoice.students.student_id} - {invoice.students.first_name && invoice.students.last_name
                                ? `${invoice.students.first_name} ${invoice.students.last_name}`
                                : invoice.students.name_en}
                            </span>
                          )}
                          {viewMode === 'all' && invoice.colleges && (
                            <span className="text-sm text-gray-500">
                              {invoice.colleges.name_en}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 flex-wrap gap-2">
                          <span>Date: {formatDate(invoice.invoice_date)}</span>
                          {invoice.due_date && (
                            <span>Due: {formatDate(invoice.due_date)}</span>
                          )}
                          <span>Total: {formatCurrency(invoice.total_amount)}</span>
                          <span>Paid: {formatCurrency(invoice.paid_amount)}</span>
                          <span className="text-red-600">
                            Pending: {formatCurrency(invoice.pending_amount)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/finance/invoices/${invoice.id}`)}
                          className="px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement export
                            console.log('Export invoice', invoice.id)
                          }}
                          className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Additional Invoices (No Semester) */}
      {groupedInvoices['no_semester'] && groupedInvoices['no_semester'].invoices.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Additional Invoices</h3>
          <div className="space-y-3">
            {groupedInvoices['no_semester'].invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{invoice.invoice_number}</span>
                    <span className="ml-3 text-sm text-gray-500 capitalize">
                      {invoice.invoice_type.replace('_', ' ')}
                    </span>
                    <span
                      className={`ml-3 inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        invoice.status
                      )}`}
                    >
                      {getStatusIcon(invoice.status)}
                      <span className="capitalize">{invoice.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span>{formatCurrency(invoice.total_amount)}</span>
                    <button
                      onClick={() => navigate(`/finance/invoices/${invoice.id}`)}
                      className="px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



