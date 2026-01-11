import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { calculateFinancialMilestone } from '../../utils/financePermissions'
import { ArrowLeft, DollarSign, CheckCircle, XCircle, Clock, Calendar, User, Building2, GraduationCap, Plus, Loader2, AlertCircle } from 'lucide-react'

export default function ViewInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { userRole, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [invoiceItems, setInvoiceItems] = useState([])
  const [payments, setPayments] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [relatedInvoices, setRelatedInvoices] = useState([]) // Parent or child invoices
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'other',
    amount: '',
    transaction_reference: '',
    notes: ''
  })

  useEffect(() => {
    fetchCurrentUserId()
    fetchInvoice()
  }, [id])

  const fetchCurrentUserId = async () => {
    if (!user?.email) return
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single()
      if (!error && userData) {
        setCurrentUserId(userData.id)
      }
    } catch (err) {
      console.error('Error fetching current user ID:', err)
    }
  }

  const fetchInvoice = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          students (
            id,
            student_id,
            name_en,
            first_name,
            last_name,
            email,
            college_id
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
        .eq('id', id)
        .single()

      if (invoiceError) throw invoiceError

      setInvoice(invoiceData)

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('id', { ascending: true })

      if (itemsError) throw itemsError
      setInvoiceItems(itemsData || [])

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          users:verified_by (
            id,
            email,
            name
          ),
          created_by_user:created_by (
            id,
            email,
            name
          )
        `)
        .eq('invoice_id', id)
        .order('payment_date', { ascending: false })

      if (paymentsError) throw paymentsError
      setPayments(paymentsData || [])

      // Set default payment amount to pending amount
      if (invoiceData) {
        setPaymentForm(prev => ({
          ...prev,
          amount: invoiceData.pending_amount || invoiceData.total_amount
        }))
      }

      // Fetch related invoices (parent or children)
      if (invoiceData.parent_invoice_id) {
        // This is a child invoice - fetch parent and siblings
        const { data: relatedData, error: relatedError } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            total_amount,
            paid_amount,
            pending_amount,
            status,
            due_date,
            portion_number,
            portion_percentage,
            students (student_id, name_en)
          `)
          .or(`id.eq.${invoiceData.parent_invoice_id},parent_invoice_id.eq.${invoiceData.parent_invoice_id}`)
          .order('portion_number', { ascending: true, nullsFirst: false })
          .order('invoice_date', { ascending: true })

        if (!relatedError && relatedData) {
          setRelatedInvoices(relatedData)
        }
      } else {
        // This might be a parent invoice - check for children
        const { data: childrenData, error: childrenError } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            total_amount,
            paid_amount,
            pending_amount,
            status,
            due_date,
            portion_number,
            portion_percentage,
            students (student_id, name_en)
          `)
          .eq('parent_invoice_id', invoiceData.id)
          .order('portion_number', { ascending: true })

        if (!childrenError && childrenData && childrenData.length > 0) {
          // Include parent in the list
          setRelatedInvoices([invoiceData, ...childrenData])
        }
      }

    } catch (err) {
      console.error('Error fetching invoice:', err)
      setError(err.message || 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  const updateStudentFinancialMilestone = async (studentId, semesterId) => {
    if (!semesterId) return

    try {
      const { data: semesterInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount, status, invoice_type')
        .eq('student_id', studentId)
        .eq('semester_id', semesterId)
        .neq('invoice_type', 'admission_fee')

      if (invoicesError) {
        console.error('Error fetching invoices for milestone calculation:', invoicesError)
        return
      }

      let totalDue = 0
      let totalPaid = 0

      semesterInvoices?.forEach(invoice => {
        totalDue += parseFloat(invoice.total_amount || 0)
        if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
          totalPaid += parseFloat(invoice.paid_amount || 0)
        }
      })

      const newMilestone = calculateFinancialMilestone(totalPaid, totalDue)

      const { data: existingRecord } = await supabase
        .from('student_semester_financial_status')
        .select('id')
        .eq('student_id', studentId)
        .eq('semester_id', semesterId)
        .maybeSingle()

      if (existingRecord) {
        await supabase
          .from('student_semester_financial_status')
          .update({
            financial_milestone_code: newMilestone,
            total_due: totalDue,
            total_paid: totalPaid,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
      } else {
        await supabase
          .from('student_semester_financial_status')
          .insert({
            student_id: studentId,
            semester_id: semesterId,
            financial_milestone_code: newMilestone,
            total_due: totalDue,
            total_paid: totalPaid
          })
      }

      // PM10 → ENAC (Initial payment activates enrollment)
      if (newMilestone === 'PM10') {
        const { data: student } = await supabase
          .from('students')
          .select('current_status_code')
          .eq('id', studentId)
          .single()

        if (student && student.current_status_code === 'ENPN') {
          await supabase
            .from('students')
            .update({
              current_status_code: 'ENAC',
              status_updated_at: new Date().toISOString()
            })
            .eq('id', studentId)
        }
      }

      // PM100 → Clear financial holds
      if (newMilestone === 'PM100') {
        const { data: allSemesterStatuses } = await supabase
          .from('student_semester_financial_status')
          .select('financial_milestone_code')
          .eq('student_id', studentId)

        const allPaid = allSemesterStatuses?.every(status => status.financial_milestone_code === 'PM100')

        if (allPaid) {
          await supabase
            .from('students')
            .update({
              financial_hold_reason_code: null
            })
            .eq('id', studentId)
        }
      }
    } catch (err) {
      console.error('Error updating student financial milestone:', err)
    }
  }

  const handleAddPayment = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    if (!invoice) return

    try {
      const paymentAmount = parseFloat(paymentForm.amount)
      if (!paymentAmount || paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than 0')
      }

      if (paymentAmount > parseFloat(invoice.pending_amount || 0)) {
        throw new Error(`Payment amount cannot exceed pending amount of ${invoice.pending_amount}`)
      }

      // Ensure we have currentUserId for admin payments
      let adminUserId = currentUserId
      if (!adminUserId && (userRole === 'admin' || userRole === 'user')) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.email) {
          const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('email', authUser.email)
            .single()
          if (userData?.id) {
            adminUserId = userData.id
            setCurrentUserId(userData.id)
          }
        }
      }

      // Generate payment number
      const paymentNumber = await supabase.rpc('generate_payment_number', {
        college_id_param: invoice.college_id
      })

      if (paymentNumber.error) throw paymentNumber.error

      // Create payment record
      const paymentData = {
        payment_number: paymentNumber.data,
        invoice_id: invoice.id,
        student_id: invoice.student_id,
        college_id: invoice.college_id,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        amount: paymentAmount,
        currency: invoice.currency || 'USD',
        status: 'verified', // Admin payments are automatically verified
        transaction_reference: paymentForm.transaction_reference || null,
        verified_by: adminUserId, // Admin who created the payment
        verified_at: new Date().toISOString(),
        created_by: adminUserId,
        notes: paymentForm.notes || `Admin Payment - Payment processed by ${userRole === 'admin' ? 'University Admin' : 'College Admin'}`
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)

      if (paymentError) throw paymentError

      // Update student financial milestone if semester exists
      if (invoice.semester_id && invoice.invoice_type !== 'admission_fee') {
        await updateStudentFinancialMilestone(invoice.student_id, invoice.semester_id)
      }

      setSuccess('Payment recorded successfully!')
      setShowPaymentForm(false)
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'other',
        amount: '',
        transaction_reference: '',
        notes: ''
      })

      // Refresh invoice and payments
      await fetchInvoice()

    } catch (err) {
      console.error('Error adding payment:', err)
      setError(err.message || 'Failed to record payment')
    } finally {
      setSubmitting(false)
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
      currency: invoice?.currency || 'USD'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600">Loading invoice...</span>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/finance/invoices')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Invoices</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/finance/invoices')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Invoices</span>
        </button>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-600">Invoice not found</p>
        </div>
      </div>
    )
  }

  const pendingAmount = parseFloat(invoice.pending_amount || 0)
  const canAddPayment = (userRole === 'admin' || userRole === 'user') && pendingAmount > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/finance/invoices')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Details</h1>
            <p className="text-gray-600 mt-1">Invoice #{invoice.invoice_number}</p>
          </div>
        </div>
        {canAddPayment && (
          <button
            onClick={() => setShowPaymentForm(!showPaymentForm)}
            className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span>{showPaymentForm ? 'Cancel' : 'Add Payment'}</span>
          </button>
        )}
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* Add Payment Form */}
      {showPaymentForm && canAddPayment && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add Payment</h2>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online_payment">Online Payment</option>
                  <option value="wallet">Wallet</option>
                  <option value="check">Check</option>
                  <option value="other">Other (Admin Payment)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount * (Pending: {formatCurrency(pendingAmount)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={pendingAmount}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Reference</label>
                <input
                  type="text"
                  value={paymentForm.transaction_reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                rows="3"
                placeholder="Optional notes about this payment"
              />
            </div>
            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentForm(false)
                  setError('')
                  setSuccess('')
                }}
                className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    <span>Record Payment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Invoice Information</h2>
            <p className="text-sm text-gray-600 mt-1">Invoice #{invoice.invoice_number}</p>
          </div>
          <span
            className={`inline-flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
              invoice.status
            )}`}
          >
            {getStatusIcon(invoice.status)}
            <span className="capitalize">{invoice.status.replace('_', ' ')}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-500">Invoice Date</p>
            <p className="font-semibold">{formatDate(invoice.invoice_date)}</p>
          </div>
          {invoice.due_date && (
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="font-semibold">{formatDate(invoice.due_date)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Invoice Type</p>
            <p className="font-semibold capitalize">{invoice.invoice_type.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="font-semibold text-lg">{formatCurrency(invoice.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Paid Amount</p>
            <p className="font-semibold text-green-600">{formatCurrency(invoice.paid_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Amount</p>
            <p className="font-semibold text-red-600">{formatCurrency(invoice.pending_amount)}</p>
          </div>
        </div>

        {/* Student Information */}
        {invoice.students && (
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Student Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Student Number</p>
                  <p className="font-semibold">{invoice.students.student_id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Student Name</p>
                  <p className="font-semibold">
                    {invoice.students.first_name && invoice.students.last_name
                      ? `${invoice.students.first_name} ${invoice.students.last_name}`
                      : invoice.students.name_en}
                  </p>
                </div>
              </div>
              {invoice.colleges && (
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">College</p>
                    <p className="font-semibold">{invoice.colleges.name_en}</p>
                  </div>
                </div>
              )}
              {invoice.semesters && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Semester</p>
                    <p className="font-semibold">{invoice.semesters.name_en} ({invoice.semesters.code})</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Items */}
      {invoiceItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Invoice Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Item</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Unit Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{item.item_name_en}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500">{item.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">{item.quantity}</td>
                    <td className="text-right py-3 px-4">{formatCurrency(item.unit_price)}</td>
                    <td className="text-right py-3 px-4 font-semibold">{formatCurrency(item.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan="3" className="text-right py-3 px-4 font-semibold">Subtotal:</td>
                  <td className="text-right py-3 px-4 font-semibold">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                {invoice.discount_amount > 0 && (
                  <tr>
                    <td colSpan="3" className="text-right py-3 px-4">Discount:</td>
                    <td className="text-right py-3 px-4 text-red-600">-{formatCurrency(invoice.discount_amount)}</td>
                  </tr>
                )}
                {invoice.scholarship_amount > 0 && (
                  <tr>
                    <td colSpan="3" className="text-right py-3 px-4">Scholarship:</td>
                    <td className="text-right py-3 px-4 text-green-600">-{formatCurrency(invoice.scholarship_amount)}</td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td colSpan="3" className="text-right py-3 px-4 font-bold text-lg">Total:</td>
                  <td className="text-right py-3 px-4 font-bold text-lg">{formatCurrency(invoice.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Related Invoices (Payment Portions) */}
      {relatedInvoices.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {invoice.parent_invoice_id ? 'Payment Plan Overview' : 'Payment Portions'}
          </h2>
          <div className="space-y-3">
            {relatedInvoices.map((relatedInvoice) => {
              const isCurrent = relatedInvoice.id === invoice.id
              const portionInfo = relatedInvoice.portion_number 
                ? `Portion ${relatedInvoice.portion_number} (${relatedInvoice.portion_percentage}%)`
                : 'Parent Invoice'
              
              return (
                <div
                  key={relatedInvoice.id}
                  className={`border rounded-xl p-4 transition-colors ${
                    isCurrent 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold text-gray-900">{relatedInvoice.invoice_number}</span>
                        {isCurrent && (
                          <span className="text-xs px-2 py-1 bg-primary-600 text-white rounded">Current</span>
                        )}
                        {relatedInvoice.portion_number && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {portionInfo}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(relatedInvoice.status)}`}>
                          {relatedInvoice.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Total: {formatCurrency(relatedInvoice.total_amount)}</span>
                        <span className="text-green-600">Paid: {formatCurrency(relatedInvoice.paid_amount)}</span>
                        <span className="text-red-600">Pending: {formatCurrency(relatedInvoice.pending_amount)}</span>
                        {relatedInvoice.due_date && (
                          <span>Due: {formatDate(relatedInvoice.due_date)}</span>
                        )}
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => navigate(`/finance/invoices/${relatedInvoice.id}`)}
                        className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Payments History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No payments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-semibold">{payment.payment_number}</span>
                      <span
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : payment.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {payment.status === 'verified' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : payment.status === 'rejected' ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span className="capitalize">{payment.status}</span>
                      </span>
                      <span className="text-sm text-gray-500 capitalize">
                        {payment.payment_method.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Date: {formatDate(payment.payment_date)}</span>
                      <span className="font-semibold text-lg">Amount: {formatCurrency(payment.amount)}</span>
                      {payment.transaction_reference && (
                        <span>Reference: {payment.transaction_reference}</span>
                      )}
                      {payment.verified_by && payment.users && (
                        <span>Verified by: {payment.users.email || payment.users.name || 'Admin'}</span>
                      )}
                    </div>
                    {payment.notes && (
                      <p className="text-sm text-gray-500 mt-2">{payment.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

