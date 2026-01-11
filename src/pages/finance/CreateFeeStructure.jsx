import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'

export default function CreateFeeStructure() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [majors, setMajors] = useState([])
  const [semesters, setSemesters] = useState([])
  const [feeTypes, setFeeTypes] = useState([])
  const [selectedFeeType, setSelectedFeeType] = useState(null)

  const [formData, setFormData] = useState({
    fee_type: '',
    fee_name_en: '',
    fee_name_ar: '',
    amount: '',
    currency: 'USD',
    applies_to_semester: [], // Array of semester IDs - supports multiple semesters
    applies_to_degree_level: [],
    applies_to_major: [],
    is_university_wide: false,
    is_active: true,
    valid_from: '',
    valid_to: '',
    description: '',
    payment_portions: [], // Array of payment portions
  })

  useEffect(() => {
    fetchFeeTypes()
    fetchMajors()
    fetchSemesters()
    if (isEdit) {
      fetchFeeStructure()
    }
  }, [id, collegeId])

  const fetchFeeTypes = async () => {
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
        // University admin can see all fee types
        query = query.or('is_university_wide.eq.true,college_id.is.null')
      }

      const { data, error } = await query
      if (error) throw error
      setFeeTypes(data || [])
    } catch (err) {
      console.error('Error fetching fee types:', err)
    }
  }


  const fetchMajors = async () => {
    try {
      let query = supabase
        .from('majors')
        .select('id, name_en, code, degree_level')
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
        .limit(50)

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

  const fetchFeeStructure = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('finance_configuration')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      // Handle both old (semester_id) and new (applies_to_semester) formats
      const semesterIds = data.applies_to_semester || (data.semester_id ? [data.semester_id] : [])

      setFormData({
        fee_type: data.fee_type || '',
        fee_name_en: data.fee_name_en || '',
        fee_name_ar: data.fee_name_ar || '',
        amount: data.amount || '',
        currency: data.currency || 'USD',
        applies_to_semester: semesterIds,
        applies_to_degree_level: data.applies_to_degree_level || [],
        applies_to_major: data.applies_to_major || [],
        is_university_wide: data.is_university_wide || false,
        is_active: data.is_active !== undefined ? data.is_active : true,
        valid_from: data.valid_from ? data.valid_from.split('T')[0] : '',
        valid_to: data.valid_to ? data.valid_to.split('T')[0] : '',
        description: data.description || '',
        payment_portions: data.payment_portions || []
      })

      // Set selected fee type if exists
      if (data.fee_type) {
        const feeType = feeTypes.find(ft => ft.code === data.fee_type)
        if (feeType) {
          setSelectedFeeType(feeType)
        }
      }
    } catch (err) {
      console.error('Error fetching fee structure:', err)
      setError('Failed to load fee structure')
    } finally {
      setLoading(false)
    }
  }

  const handleDegreeLevelToggle = (level) => {
    const current = formData.applies_to_degree_level || []
    const updated = current.includes(level)
      ? current.filter(l => l !== level)
      : [...current, level]
    setFormData({ ...formData, applies_to_degree_level: updated })
  }

  const handleMajorToggle = (majorId) => {
    const current = formData.applies_to_major || []
    const updated = current.includes(majorId)
      ? current.filter(id => id !== majorId)
      : [...current, majorId]
    setFormData({ ...formData, applies_to_major: updated })
  }

  const handleSemesterToggle = (semesterId) => {
    const current = formData.applies_to_semester || []
    const updated = current.includes(semesterId)
      ? current.filter(id => id !== semesterId)
      : [...current, semesterId]
    setFormData({ ...formData, applies_to_semester: updated })
  }

  const handleFeeTypeChange = (feeTypeCode) => {
    const feeType = feeTypes.find(ft => ft.code === feeTypeCode)
    setSelectedFeeType(feeType || null)
    
    if (feeType) {
      setFormData({
        ...formData,
        fee_type: feeType.code,
        fee_name_en: formData.fee_name_en || feeType.name_en,
        fee_name_ar: formData.fee_name_ar || feeType.name_ar || ''
      })
    } else {
      setFormData({ ...formData, fee_type: feeTypeCode })
    }
  }

  const addPaymentPortion = () => {
    const newPortion = {
      portion_number: formData.payment_portions.length + 1,
      percentage: '',
      deadline_type: 'days_from_invoice', // 'days_from_invoice', 'days_from_previous', 'custom_date'
      days: '',
      custom_date: ''
    }
    setFormData({
      ...formData,
      payment_portions: [...formData.payment_portions, newPortion]
    })
  }

  const removePaymentPortion = (index) => {
    const updated = formData.payment_portions.filter((_, i) => i !== index)
    // Renumber portions
    const renumbered = updated.map((p, i) => ({ ...p, portion_number: i + 1 }))
    setFormData({ ...formData, payment_portions: renumbered })
  }

  const updatePaymentPortion = (index, field, value) => {
    const updated = [...formData.payment_portions]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, payment_portions: updated })
  }

  const calculateTotalPercentage = () => {
    return formData.payment_portions.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0)
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!formData.fee_type || !formData.fee_name_en || !formData.amount) {
      setError('Please fill in all required fields')
      return
    }

    // Check if semester is required for this fee type
    const requiresSemester = selectedFeeType?.requires_semester !== false
    if (requiresSemester && formData.applies_to_semester.length === 0) {
      setError('Please select at least one semester for this fee type')
      return
    }

    // Validate payment portions if defined
    if (formData.payment_portions.length > 0) {
      const totalPercentage = calculateTotalPercentage()
      if (Math.abs(totalPercentage - 100) > 0.01) {
        setError(`Payment portions must total 100%. Current total: ${totalPercentage.toFixed(2)}%`)
        return
      }

      // Validate each portion
      for (let i = 0; i < formData.payment_portions.length; i++) {
        const portion = formData.payment_portions[i]
        if (!portion.percentage || parseFloat(portion.percentage) <= 0) {
          setError(`Portion ${i + 1}: Percentage is required and must be greater than 0`)
          return
        }

        if (portion.deadline_type === 'days_from_invoice' || portion.deadline_type === 'days_from_previous') {
          if (!portion.days || parseInt(portion.days) < 0) {
            setError(`Portion ${i + 1}: Days must be specified and non-negative`)
            return
          }
        } else if (portion.deadline_type === 'custom_date') {
          if (!portion.custom_date) {
            setError(`Portion ${i + 1}: Custom date is required`)
            return
          }
        }
      }
    }

    if (!collegeId && !formData.is_university_wide && userRole !== 'admin') {
      setError('Please select a college or mark as university-wide')
      return
    }

    setLoading(true)

    try {
      // Prepare payment portions - convert to proper format
      const paymentPortions = formData.payment_portions.length > 0 
        ? formData.payment_portions.map(p => ({
            portion_number: p.portion_number,
            percentage: parseFloat(p.percentage),
            deadline_type: p.deadline_type,
            days: p.deadline_type !== 'custom_date' ? parseInt(p.days) : null,
            custom_date: p.deadline_type === 'custom_date' ? p.custom_date : null
          }))
        : null

      const feeData = {
        fee_type: formData.fee_type,
        fee_name_en: formData.fee_name_en.trim(),
        fee_name_ar: formData.fee_name_ar.trim() || null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        applies_to_semester: formData.applies_to_semester.length > 0 ? formData.applies_to_semester.map(id => parseInt(id)) : null,
        applies_to_degree_level: formData.applies_to_degree_level.length > 0 ? formData.applies_to_degree_level : null,
        applies_to_major: formData.applies_to_major.length > 0 ? formData.applies_to_major.map(id => parseInt(id)) : null,
        is_university_wide: formData.is_university_wide,
        is_active: formData.is_active,
        valid_from: formData.valid_from || null,
        valid_to: formData.valid_to || null,
        description: formData.description.trim() || null,
        payment_portions: paymentPortions
      }

      if (!formData.is_university_wide && collegeId) {
        feeData.college_id = collegeId
      }

      if (isEdit) {
        const { error: updateError } = await supabase
          .from('finance_configuration')
          .update(feeData)
          .eq('id', id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('finance_configuration')
          .insert(feeData)

        if (insertError) throw insertError
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/finance/configuration')
      }, 1500)
    } catch (err) {
      console.error('Error saving fee structure:', err)
      setError(err.message || 'Failed to save fee structure')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/finance/configuration')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Edit Fee Structure' : 'Create Fee Structure'}
            </h1>
            <p className="text-gray-600 mt-1">Configure base fees and fee structures</p>
          </div>
        </div>
      </div>

      {userRole === 'admin' && (
        <div className={`bg-white rounded-2xl shadow-sm border p-4 ${
          requiresCollegeSelection && !formData.is_university_wide
            ? 'border-yellow-300 bg-yellow-50' 
            : 'border-gray-200'
        }`}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select College {requiresCollegeSelection && !formData.is_university_wide && <span className="text-red-500">*</span>}
          </label>
          <select
            value={selectedCollegeId || ''}
            onChange={(e) => setSelectedCollegeId(e.target.value ? parseInt(e.target.value) : null)}
            disabled={formData.is_university_wide}
            className={`w-full md:w-64 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 ${
              formData.is_university_wide 
                ? 'bg-gray-100 border-gray-300' 
                : requiresCollegeSelection
                ? 'border-yellow-300 bg-white'
                : 'border-gray-300'
            }`}
            required={requiresCollegeSelection && !formData.is_university_wide}
          >
            <option value="">Select College</option>
            {colleges.map(college => (
              <option key={college.id} value={college.id}>{college.name_en}</option>
            ))}
          </select>
          {requiresCollegeSelection && !formData.is_university_wide && (
            <p className="text-xs text-yellow-600 mt-1">Please select a college or mark as university-wide</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type *</label>
            <select
              value={formData.fee_type}
              onChange={(e) => handleFeeTypeChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Type</option>
              {feeTypes.map(feeType => (
                <option key={feeType.id} value={feeType.code}>
                  {feeType.name_en} {feeType.category && `(${feeType.category})`}
                </option>
              ))}
            </select>
            {selectedFeeType && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedFeeType.description || `Category: ${selectedFeeType.category}`}
                {selectedFeeType.requires_semester && ' • Semester required'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fee Name (English) *</label>
            <input
              type="text"
              value={formData.fee_name_en}
              onChange={(e) => setFormData({ ...formData, fee_name_en: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fee Name (Arabic)</label>
            <input
              type="text"
              value={formData.fee_name_ar}
              onChange={(e) => setFormData({ ...formData, fee_name_ar: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {/* Semesters Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Semesters {selectedFeeType?.requires_semester !== false ? '*' : ''}
            {selectedFeeType?.requires_semester === false && ' (Optional)'}
          </label>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3">
            {semesters.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No semesters available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {semesters.map(semester => (
                  <label
                    key={semester.id}
                    className={`flex items-center space-x-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                      formData.applies_to_semester?.includes(semester.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.applies_to_semester?.includes(semester.id) || false}
                      onChange={() => handleSemesterToggle(semester.id)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{semester.name_en}</span>
                      <span className="text-xs text-gray-500 ml-1">({semester.code})</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          {formData.applies_to_semester.length > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              Selected {formData.applies_to_semester.length} semester{formData.applies_to_semester.length !== 1 ? 's' : ''}
            </p>
          )}
          {selectedFeeType?.requires_semester !== false && (
            <p className="text-xs text-gray-500 mt-1">
              Select one or more semesters. Financial milestones (30%, 60%, etc.) are calculated per semester.
            </p>
          )}
          {selectedFeeType?.requires_semester === false && (
            <p className="text-xs text-gray-500 mt-1">
              This fee type does not require a semester (e.g., Admission Fee, Application Fee)
            </p>
          )}
        </div>

        {/* Scope */}
        <div>
          <label className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              checked={formData.is_university_wide}
              onChange={(e) => setFormData({ ...formData, is_university_wide: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">University Wide (applies to all colleges)</span>
          </label>
        </div>

        {/* Applies To */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Applies To (Optional - leave empty for all)</h3>
          
          {/* Degree Levels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Degree Levels</label>
            <div className="flex flex-wrap gap-2">
              {['bachelor', 'master', 'phd', 'diploma'].map(level => (
                <label key={level} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.applies_to_degree_level?.includes(level)}
                    onChange={() => handleDegreeLevelToggle(level)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm capitalize">{level}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Majors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Majors</label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {majors.map(major => (
                <label key={major.id} className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.applies_to_major?.includes(major.id)}
                    onChange={() => handleMajorToggle(major.id)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm">{major.name_en} ({major.code})</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Validity Period */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valid From</label>
            <input
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valid To</label>
            <input
              type="date"
              value={formData.valid_to}
              onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Payment Portions */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Portions (Optional)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Define payment installments with percentages and deadlines. If not set, a single invoice will be created.
              </p>
            </div>
            <button
              type="button"
              onClick={addPaymentPortion}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
            >
              <Plus className="w-4 h-4" />
              <span>Add Portion</span>
            </button>
          </div>

          {formData.payment_portions.length > 0 && (
            <div className="space-y-4">
              {formData.payment_portions.map((portion, index) => (
                <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Portion {portion.portion_number}</h4>
                    {formData.payment_portions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePaymentPortion(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Percentage * (Total: {calculateTotalPercentage().toFixed(2)}%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={portion.percentage}
                        onChange={(e) => updatePaymentPortion(index, 'percentage', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                        placeholder="e.g., 10.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Deadline Type *</label>
                      <select
                        value={portion.deadline_type}
                        onChange={(e) => updatePaymentPortion(index, 'deadline_type', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      >
                        <option value="days_from_invoice">Days from Invoice Creation</option>
                        <option value="days_from_previous">Days from Previous Payment</option>
                        <option value="custom_date">Custom Date</option>
                      </select>
                    </div>

                    {portion.deadline_type !== 'custom_date' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Days *</label>
                        <input
                          type="number"
                          min="0"
                          value={portion.days}
                          onChange={(e) => updatePaymentPortion(index, 'days', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          required
                          placeholder="e.g., 10"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {portion.deadline_type === 'days_from_invoice' 
                            ? 'Days from invoice creation date'
                            : 'Days from previous portion payment date'}
                        </p>
                      </div>
                    )}

                    {portion.deadline_type === 'custom_date' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Date *</label>
                        <input
                          type="date"
                          value={portion.custom_date}
                          onChange={(e) => updatePaymentPortion(index, 'custom_date', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Total Percentage:</strong> {calculateTotalPercentage().toFixed(2)}% 
                  {Math.abs(calculateTotalPercentage() - 100) > 0.01 && (
                    <span className="text-red-600 ml-2">
                      (Must equal 100% - Current difference: {(100 - calculateTotalPercentage()).toFixed(2)}%)
                    </span>
                  )}
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  When an invoice is created using this fee structure, multiple invoices will be generated (one per portion).
                  Financial milestones will be calculated based on the total percentage paid across all portions.
                </p>
              </div>
            </div>
          )}

          {formData.payment_portions.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                No payment portions defined. A single invoice will be created when this fee structure is used.
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            rows="3"
          />
        </div>

        {/* Active Status */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
            Fee structure {isEdit ? 'updated' : 'created'} successfully! Redirecting...
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/finance/configuration')}
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
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{isEdit ? 'Update' : 'Create'} Fee Structure</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}



