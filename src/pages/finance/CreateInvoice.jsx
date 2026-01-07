import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { ArrowLeft, Save, Search, Plus, Trash2, DollarSign, Loader2 } from 'lucide-react'

export default function CreateInvoice() {
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
  const [feeStructures, setFeeStructures] = useState([])
  const [studentData, setStudentData] = useState(null)
  const [invoiceTypes, setInvoiceTypes] = useState([
    'Admission Fees',
    'Course Fees',
    'Subject Fees',
    'Onboarding Fees',
    'Penalties',
    'Miscellaneous',
    'Other'
  ])

  const [formData, setFormData] = useState({
    student_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_type: '',
    payment_method: 'pending',
    items: [
      {
        item_type: '',
        item_name_en: '',
        item_name_ar: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_amount: 0
      }
    ],
    discount_amount: 0,
    notes: ''
  })

  useEffect(() => {
    if (studentSearch && studentSearch.length >= 3) {
      searchStudents()
    } else {
      setStudents([])
    }
  }, [studentSearch, collegeId])

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData()
      fetchFeeStructures()
    }
  }, [selectedStudent, collegeId])

  const fetchStudentData = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          name_en,
          college_id,
          major_id,
          majors (
            id,
            name_en,
            degree_level
          )
        `)
        .eq('id', selectedStudent.id)
        .single()

      if (error) throw error
      setStudentData(data)
    } catch (err) {
      console.error('Error fetching student data:', err)
    }
  }

  const fetchFeeStructures = async () => {
    if (!collegeId && userRole !== 'admin') return

    try {
      let query = supabase
        .from('finance_configuration')
        .select('*')
        .eq('is_active', true)

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
    }
  }

  const applyFeeStructure = (feeStructure) => {
    if (!feeStructure) return

    const newItem = {
      item_type: feeStructure.fee_type,
      item_name_en: feeStructure.fee_name_en,
      item_name_ar: feeStructure.fee_name_ar || '',
      description: feeStructure.description || '',
      quantity: 1,
      unit_price: parseFloat(feeStructure.amount || 0),
      total_amount: parseFloat(feeStructure.amount || 0)
    }

    setFormData({
      ...formData,
      invoice_type: feeStructure.fee_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      items: [newItem]
    })
  }

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

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value

    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(newItems[index].quantity) || 0
      const unitPrice = parseFloat(newItems[index].unit_price) || 0
      newItems[index].total_amount = quantity * unitPrice
    }

    setFormData({ ...formData, items: newItems })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          item_type: '',
          item_name_en: '',
          item_name_ar: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          total_amount: 0
        }
      ]
    })
  }

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index)
      setFormData({ ...formData, items: newItems })
    }
  }

  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
    const discount = parseFloat(formData.discount_amount) || 0
    return Math.max(0, subtotal - discount)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedStudent) {
      setError('Please select a student')
      return
    }

    if (!formData.invoice_type) {
      setError('Please select an invoice type')
      return
    }

    if (formData.items.some(item => !item.item_name_en || !item.unit_price)) {
      setError('Please fill in all required item fields')
      return
    }

    setLoading(true)

    try {
      // Generate invoice number
      const invoiceNumber = await supabase.rpc('generate_invoice_number', {
        college_id_param: selectedStudent.college_id
      })

      if (invoiceNumber.error) throw invoiceNumber.error

      // Map invoice type to enum
      const typeMap = {
        'Admission Fees': 'admission_fee',
        'Course Fees': 'course_fee',
        'Subject Fees': 'subject_fee',
        'Onboarding Fees': 'onboarding_fee',
        'Penalties': 'penalty',
        'Miscellaneous': 'miscellaneous',
        'Other': 'other'
      }

      const invoiceTypeEnum = typeMap[formData.invoice_type] || 'other'
      const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
      const discount = parseFloat(formData.discount_amount) || 0
      const total = subtotal - discount

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber.data,
          student_id: selectedStudent.id,
          college_id: selectedStudent.college_id,
          invoice_date: formData.invoice_date,
          invoice_type: invoiceTypeEnum,
          status: formData.payment_method === 'cash' ? 'paid' : 'pending',
          subtotal: subtotal,
          discount_amount: discount,
          scholarship_amount: 0,
          tax_amount: 0,
          total_amount: total,
          paid_amount: formData.payment_method === 'cash' ? total : 0,
          pending_amount: formData.payment_method === 'cash' ? 0 : total,
          payment_method: formData.payment_method === 'cash' ? 'cash' : null,
          notes: formData.notes || null
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice items
      const invoiceItems = formData.items.map(item => ({
        invoice_id: invoice.id,
        item_type: item.item_type || invoiceTypeEnum,
        item_name_en: item.item_name_en,
        item_name_ar: item.item_name_ar || null,
        description: item.description || null,
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        discount_amount: 0,
        scholarship_amount: 0,
        total_amount: parseFloat(item.total_amount) || 0
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) throw itemsError

      // If cash payment, create payment record
      if (formData.payment_method === 'cash') {
        const paymentNumber = await supabase.rpc('generate_payment_number', {
          college_id_param: selectedStudent.college_id
        })

        if (paymentNumber.error) throw paymentNumber.error

        await supabase
          .from('payments')
          .insert({
            payment_number: paymentNumber.data,
            invoice_id: invoice.id,
            student_id: selectedStudent.id,
            college_id: selectedStudent.college_id,
            payment_date: formData.invoice_date,
            payment_method: 'cash',
            amount: total,
            status: 'verified',
            verified_by: null, // Will be set by trigger or manually
            verified_at: new Date().toISOString()
          })
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/finance/invoices')
      }, 2000)
    } catch (err) {
      console.error('Error creating invoice:', err)
      setError(err.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/finance/invoices')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
            <p className="text-gray-600 mt-1">Create a new invoice for a student</p>
          </div>
        </div>
      </div>

      {requiresCollegeSelection && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select College</label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select College</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>{college.name_en}</option>
            ))}
          </select>
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
            <div className="mt-2 p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-800">
                Selected: {selectedStudent.student_id} - {selectedStudent.first_name && selectedStudent.last_name
                  ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                  : selectedStudent.name_en}
              </span>
            </div>
          )}
        </div>

        {/* Fee Structure Selection */}
        {selectedStudent && feeStructures.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apply Fee Structure (Optional)
            </label>
            <select
              onChange={(e) => {
                const feeId = e.target.value
                if (feeId) {
                  const fee = feeStructures.find(f => f.id === parseInt(feeId))
                  if (fee) {
                    // Check if fee applies to this student
                    const appliesToStudent = 
                      (!fee.applies_to_degree_level || fee.applies_to_degree_level.length === 0 || 
                       (studentData?.majors?.degree_level && fee.applies_to_degree_level.includes(studentData.majors.degree_level))) &&
                      (!fee.applies_to_major || fee.applies_to_major.length === 0 || 
                       (studentData?.major_id && fee.applies_to_major.includes(studentData.major_id)))

                    if (appliesToStudent) {
                      applyFeeStructure(fee)
                    } else {
                      alert('This fee structure does not apply to this student based on their degree level or major.')
                    }
                  }
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Fee Structure...</option>
              {feeStructures.map(fee => (
                <option key={fee.id} value={fee.id}>
                  {fee.fee_name_en} - {fee.currency} {parseFloat(fee.amount || 0).toFixed(2)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select a pre-configured fee structure to auto-fill invoice items
            </p>
          </div>
        )}

        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date *</label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type *</label>
            <select
              value={formData.invoice_type}
              onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Type</option>
              {invoiceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="pending">Pending (Online/Bank Transfer)</option>
              <option value="cash">Cash (Mark as Paid)</option>
            </select>
          </div>
        </div>

        {/* Invoice Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">Invoice Items *</label>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Name (EN) *</label>
                    <input
                      type="text"
                      value={item.item_name_en}
                      onChange={(e) => handleItemChange(index, 'item_name_en', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Name (AR)</label>
                    <input
                      type="text"
                      value={item.item_name_ar}
                      onChange={(e) => handleItemChange(index, 'item_name_ar', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount</label>
                    <input
                      type="number"
                      value={item.total_amount}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows="2"
                  />
                </div>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Item</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Discount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Discount Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.discount_amount}
            onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            rows="3"
          />
        </div>

        {/* Total */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total Amount:</span>
            <span className="text-primary-600">{calculateTotal().toFixed(2)} USD</span>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
            Invoice created successfully! Redirecting...
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/finance/invoices')}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-gradient text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Create Invoice</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

