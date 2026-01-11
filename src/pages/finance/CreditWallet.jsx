import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { ArrowLeft, Save, Search, DollarSign, Wallet, Loader2 } from 'lucide-react'

export default function CreditWallet() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [students, setStudents] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [creditAmount, setCreditAmount] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (studentSearch && studentSearch.length >= 3) {
      searchStudents()
    } else {
      setStudents([])
    }
  }, [studentSearch, collegeId])

  useEffect(() => {
    if (selectedStudent) {
      fetchWalletBalance()
    }
  }, [selectedStudent])

  const searchStudents = async () => {
    if (!collegeId && userRole !== 'admin') return

    try {
      let query = supabase
        .from('students')
        .select('id, student_id, name_en, first_name, last_name, email, college_id')
        .ilike('student_id', `%${studentSearch}%`)
        .limit(10)

      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      } else if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error('Error searching students:', err)
    }
  }

  const fetchWalletBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('student_id', selectedStudent.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setWalletBalance(data?.balance || 0)
    } catch (err) {
      console.error('Error fetching wallet balance:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedStudent) {
      setError('Please select a student')
      return
    }

    const amount = parseFloat(creditAmount)
    if (!amount || amount <= 0) {
      setError('Please enter a valid credit amount')
      return
    }

    setLoading(true)

    try {
      // Get or create wallet
      let { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('student_id', selectedStudent.id)
        .single()

      if (walletError && walletError.code === 'PGRST116') {
        // Wallet doesn't exist, create it
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({
            student_id: selectedStudent.id,
            college_id: selectedStudent.college_id,
            balance: 0
          })
          .select()
          .single()

        if (createError) throw createError
        wallet = newWallet
      } else if (walletError) {
        throw walletError
      }

      const balanceBefore = parseFloat(wallet.balance || 0)
      const balanceAfter = balanceBefore + amount

      // Create wallet transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          student_id: selectedStudent.id,
          transaction_type: 'credit',
          amount: amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: description || 'Wallet top-up'
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // Generate invoice for wallet credit (audit trail)
      const invoiceNumber = await supabase.rpc('generate_invoice_number', {
        college_id_param: selectedStudent.college_id
      })

      if (invoiceNumber.error) throw invoiceNumber.error

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber.data,
          student_id: selectedStudent.id,
          college_id: selectedStudent.college_id,
          invoice_date: new Date().toISOString().split('T')[0],
          invoice_type: 'wallet_credit',
          status: 'paid',
          subtotal: amount,
          discount_amount: 0,
          scholarship_amount: 0,
          tax_amount: 0,
          total_amount: amount,
          paid_amount: amount,
          pending_amount: 0,
          notes: `Wallet credit transaction: ${transaction.id}`
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice item
      await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          item_type: 'wallet_credit',
          item_name_en: 'Wallet Credit',
          item_name_ar: 'رصيد المحفظة',
          description: description || 'Wallet top-up',
          quantity: 1,
          unit_price: amount,
          discount_amount: 0,
          scholarship_amount: 0,
          total_amount: amount
        })

      // Update transaction with invoice reference
      await supabase
        .from('wallet_transactions')
        .update({ reference_invoice_id: invoice.id })
        .eq('id', transaction.id)

      setSuccess(true)
      setCreditAmount('')
      setDescription('')
      fetchWalletBalance()
      
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Error crediting wallet:', err)
      setError(err.message || 'Failed to credit wallet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/finance')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Credit Wallet</h1>
            <p className="text-gray-600 mt-1">Add credit to student wallet</p>
          </div>
        </div>
      </div>

      {userRole === 'admin' && (
        <div className={`bg-white rounded-2xl shadow-sm border p-4 ${
          requiresCollegeSelection
            ? 'border-yellow-300 bg-yellow-50' 
            : 'border-gray-200'
        }`}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select College {requiresCollegeSelection && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value) : null)}
            className={`w-full md:w-64 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 ${
              requiresCollegeSelection
                ? 'border-yellow-300 bg-white'
                : 'border-gray-300'
            }`}
            required={requiresCollegeSelection}
          >
            <option value="">Select College</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>{college.name_en}</option>
            ))}
          </select>
          {requiresCollegeSelection && (
            <p className="text-xs text-yellow-600 mt-1">Please select a college to continue</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Student Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Student Number *</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by student number..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {students.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-xl bg-white shadow-lg max-h-60 overflow-y-auto">
              {students.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => {
                    setSelectedStudent(student)
                    setStudentSearch(student.student_id)
                    setStudents([])
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-semibold">{student.student_id}</div>
                  <div className="text-sm text-gray-600">
                    {student.first_name && student.last_name
                      ? `${student.first_name} ${student.last_name}`
                      : student.name_en}
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedStudent && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Selected Student</p>
                  <p className="font-semibold">
                    {selectedStudent.student_id} - {selectedStudent.first_name && selectedStudent.last_name
                      ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                      : selectedStudent.name_en}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Current Balance</p>
                  <p className="text-2xl font-bold text-primary-600">
                    <Wallet className="w-6 h-6 inline mr-2" />
                    {walletBalance.toFixed(2)} USD
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Credit Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Credit Amount (USD) *</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this transaction..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            rows="3"
          />
        </div>

        {/* New Balance Preview */}
        {selectedStudent && creditAmount && parseFloat(creditAmount) > 0 && (
          <div className="bg-primary-50 p-4 rounded-xl">
            <p className="text-sm text-gray-600">New Balance After Credit</p>
            <p className="text-2xl font-bold text-primary-600">
              {(walletBalance + parseFloat(creditAmount || 0)).toFixed(2)} USD
            </p>
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
            Wallet credited successfully! Invoice has been generated for audit purposes.
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/finance')}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedStudent}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Credit Wallet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}



