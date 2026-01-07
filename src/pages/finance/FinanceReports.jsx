import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { Download, FileText, TrendingUp, DollarSign, Loader2 } from 'lucide-react'

export default function FinanceReports() {
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    semester_id: '',
    faculty_id: '',
    major_id: '',
    degree_level: '',
    student_status: '',
    pending_fees: ''
  })
  const [reportData, setReportData] = useState(null)

  const fetchReport = async () => {
    setLoading(true)
    try {
      // Build query based on filters
      let query = supabase
        .from('invoices')
        .select(`
          id,
          total_amount,
          paid_amount,
          pending_amount,
          status,
          invoice_type,
          invoice_date,
          students (
            id,
            student_id,
            name_en,
            status,
            gpa,
            majors (
              id,
              name_en,
              degree_level,
              departments (
                id,
                name_en
              )
            ),
            colleges (
              id,
              name_en
            )
          ),
          semesters (
            id,
            name_en
          )
        `)

      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      if (filters.semester_id) {
        query = query.eq('semester_id', parseInt(filters.semester_id))
      }

      if (filters.pending_fees === 'yes') {
        query = query.gt('pending_amount', 0)
      } else if (filters.pending_fees === 'no') {
        query = query.eq('pending_amount', 0)
      }

      const { data, error } = await query
      if (error) throw error

      // Filter in memory for complex filters
      let filtered = data || []

      if (filters.major_id) {
        filtered = filtered.filter(inv => inv.students?.majors?.id === parseInt(filters.major_id))
      }

      if (filters.degree_level) {
        filtered = filtered.filter(inv => inv.students?.majors?.degree_level === filters.degree_level)
      }

      if (filters.student_status) {
        filtered = filtered.filter(inv => inv.students?.status === filters.student_status)
      }

      // Calculate statistics
      const stats = {
        totalInvoices: filtered.length,
        totalAmount: filtered.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0),
        totalPaid: filtered.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0),
        totalPending: filtered.reduce((sum, inv) => sum + parseFloat(inv.pending_amount || 0), 0),
        byStatus: {},
        byType: {}
      }

      filtered.forEach(inv => {
        stats.byStatus[inv.status] = (stats.byStatus[inv.status] || 0) + 1
        stats.byType[inv.invoice_type] = (stats.byType[inv.invoice_type] || 0) + 1
      })

      setReportData({ data: filtered, stats })
    } catch (err) {
      console.error('Error fetching report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [filters, collegeId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Reports</h1>
          <p className="text-gray-600 mt-1">View and export financial reports</p>
        </div>
        <button
          onClick={() => {
            // TODO: Implement export
            console.log('Export report')
          }}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl"
        >
          <Download className="w-5 h-5" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
            <select
              value={filters.semester_id}
              onChange={(e) => setFilters({ ...filters, semester_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
            >
              <option value="">All Semesters</option>
              {/* TODO: Fetch semesters */}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Degree Level</label>
            <select
              value={filters.degree_level}
              onChange={(e) => setFilters({ ...filters, degree_level: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
            >
              <option value="">All Levels</option>
              <option value="bachelor">Bachelor</option>
              <option value="master">Master</option>
              <option value="phd">PhD</option>
              <option value="diploma">Diploma</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pending Fees</label>
            <select
              value={filters.pending_fees}
              onChange={(e) => setFilters({ ...filters, pending_fees: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl"
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold">{reportData.stats.totalInvoices}</p>
              </div>
              <FileText className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">${reportData.stats.totalAmount.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold">${reportData.stats.totalPaid.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-2xl font-bold text-red-600">${reportData.stats.totalPending.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Report Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : reportData && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Report Data</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">Invoice #</th>
                  <th className="text-left py-3 px-4">Student</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Total</th>
                  <th className="text-left py-3 px-4">Paid</th>
                  <th className="text-left py-3 px-4">Pending</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.data.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{invoice.invoice_number}</td>
                    <td className="py-3 px-4">
                      {invoice.students?.student_id} - {invoice.students?.name_en}
                    </td>
                    <td className="py-3 px-4 capitalize">{invoice.invoice_type.replace('_', ' ')}</td>
                    <td className="py-3 px-4">${parseFloat(invoice.total_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">${parseFloat(invoice.paid_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">${parseFloat(invoice.pending_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}



