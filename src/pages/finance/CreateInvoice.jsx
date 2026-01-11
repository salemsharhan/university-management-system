import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { calculateFinancialMilestone } from '../../utils/financePermissions'
import { ArrowLeft, Save, Search, Plus, Trash2, DollarSign, Loader2 } from 'lucide-react'

export default function CreateInvoice() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId, user } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId
  const [currentUserId, setCurrentUserId] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [students, setStudents] = useState([])
  const [feeStructures, setFeeStructures] = useState([])
  const [studentData, setStudentData] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [feeTypes, setFeeTypes] = useState([])
  const [selectedFeeStructures, setSelectedFeeStructures] = useState([]) // Array of selected fee structure IDs

  const [formData, setFormData] = useState({
    student_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_type: '',
    semester_id: '', // Required for semester-based fees
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
    // Get current user ID from users table (for verified_by and created_by fields)
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
    fetchCurrentUserId()
  }, [user])

  useEffect(() => {
    if (studentSearch && studentSearch.length >= 3) {
      searchStudents()
    } else {
      setStudents([])
    }
  }, [studentSearch, collegeId])

  useEffect(() => {
    fetchFeeTypes()
  }, [collegeId])

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData()
      fetchSemesters()
    }
  }, [selectedStudent, collegeId])

  useEffect(() => {
    // Fetch fee structures when student data is loaded
    // Fee structures will be filtered based on semester selection in fetchFeeStructures
    if (selectedStudent && studentData) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        fetchFeeStructures()
      }, 100)
    }
  }, [selectedStudent, studentData, formData.semester_id, formData.invoice_type, collegeId])

  // Also fetch fee structures when invoice type changes (for non-semester fees)
  useEffect(() => {
    if (selectedStudent && studentData && formData.invoice_type && !formData.semester_id) {
      // Check if invoice type requires semester
      const selectedType = feeTypes.find(ft => {
        const typeMap = {
          'Admission Fees': 'admission_fee',
          'Application Fees': 'application_fee',
          'Registration Fees': 'registration_fee',
          'Course Fees': 'course_fee',
          'Subject Fees': 'subject_fee',
          'Tuition Fees': 'tuition_fee',
          'Onboarding Fees': 'onboarding_fee',
          'Laboratory Fees': 'lab_fee',
          'Library Fees': 'library_fee',
          'Sports Fees': 'sports_fee',
          'Late Payment Penalties': 'late_payment_penalty',
          'Penalties': 'penalty',
          'Miscellaneous': 'miscellaneous',
          'Other': 'other'
        }
        return ft.code === (typeMap[formData.invoice_type] || formData.invoice_type.toLowerCase().replace(' ', '_'))
      })
      
      // If invoice type doesn't require semester, fetch fee structures immediately
      if (selectedType?.requires_semester === false) {
        setTimeout(() => {
          fetchFeeStructures()
        }, 100)
      }
    }
  }, [formData.invoice_type, selectedStudent, studentData])

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
        query = query.or('is_university_wide.eq.true,college_id.is.null')
      }

      const { data, error } = await query
      if (error) throw error
      setFeeTypes(data || [])
    } catch (err) {
      console.error('Error fetching fee types:', err)
    }
  }

  const fetchSemesters = async () => {
    if (!collegeId && userRole !== 'admin') return

    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code, start_date')
        .order('start_date', { ascending: false })
        .limit(10)

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
    if (!collegeId && userRole !== 'admin') {
      setFeeStructures([])
      return
    }
    if (!selectedStudent || !studentData) {
      setFeeStructures([])
      return
    }

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
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (userRole === 'admin') {
        // University admin - show all university-wide structures
        query = query.or('is_university_wide.eq.true,college_id.is.null')
      }

      // Fetch all matching fee structures, then filter in JavaScript for array contains
      const { data: allStructures, error } = await query
      if (error) {
        console.error('Error fetching fee structures:', error)
        throw error
      }

      // Filter by student criteria in JavaScript (PostgREST array contains can be tricky)
      let filteredStructures = (allStructures || []).filter(fee => {
        // Filter by semester - fee structure must apply to selected semester or have no semester restriction
        // If no semester selected, only show fees that don't require semesters
        if (formData.semester_id) {
          const semesterIdInt = parseInt(formData.semester_id)
          if (fee.applies_to_semester && Array.isArray(fee.applies_to_semester) && fee.applies_to_semester.length > 0) {
            if (!fee.applies_to_semester.includes(semesterIdInt)) {
              return false
            }
          }
        } else {
          // If no semester selected, only show fees that don't require semesters (e.g., admission fees)
          // Check if fee type requires semester - fetch from feeTypes if available
          if (fee.applies_to_semester && Array.isArray(fee.applies_to_semester) && fee.applies_to_semester.length > 0) {
            // Fee has semesters assigned - check if current invoice type requires semester
            if (formData.invoice_type) {
              const selectedType = feeTypes.find(ft => {
                const typeMap = {
                  'Admission Fees': 'admission_fee',
                  'Application Fees': 'application_fee',
                  'Registration Fees': 'registration_fee',
                  'Course Fees': 'course_fee',
                  'Subject Fees': 'subject_fee',
                  'Tuition Fees': 'tuition_fee',
                  'Onboarding Fees': 'onboarding_fee',
                  'Laboratory Fees': 'lab_fee',
                  'Library Fees': 'library_fee',
                  'Sports Fees': 'sports_fee',
                  'Late Payment Penalties': 'late_payment_penalty',
                  'Penalties': 'penalty',
                  'Miscellaneous': 'miscellaneous',
                  'Other': 'other'
                }
                return ft.code === (typeMap[formData.invoice_type] || formData.invoice_type.toLowerCase().replace(' ', '_'))
              })
              
              // If invoice type requires semester, skip this fee structure
              if (selectedType?.requires_semester !== false) {
                return false
              }
            } else {
              // No invoice type selected yet - skip semester-based fees
              return false
            }
          }
        }

        // Filter by major - fee structure must apply to student's major or have no major restriction
        if (studentData?.major_id) {
          const majorIdInt = parseInt(studentData.major_id)
          if (fee.applies_to_major && Array.isArray(fee.applies_to_major) && fee.applies_to_major.length > 0) {
            if (!fee.applies_to_major.includes(majorIdInt)) {
              return false
            }
          }
        }

        // Filter by degree level - fee structure must apply to student's degree level or have no degree restriction
        if (studentData?.majors?.degree_level) {
          if (fee.applies_to_degree_level && Array.isArray(fee.applies_to_degree_level) && fee.applies_to_degree_level.length > 0) {
            if (!fee.applies_to_degree_level.includes(studentData.majors.degree_level)) {
              return false
            }
          }
        }

        // Filter by invoice type if selected
        if (formData.invoice_type) {
          const typeMap = {
            'Admission Fees': 'admission_fee',
            'Application Fees': 'application_fee',
            'Registration Fees': 'registration_fee',
            'Course Fees': 'course_fee',
            'Subject Fees': 'subject_fee',
            'Tuition Fees': 'tuition_fee',
            'Onboarding Fees': 'onboarding_fee',
            'Laboratory Fees': 'lab_fee',
            'Library Fees': 'library_fee',
            'Sports Fees': 'sports_fee',
            'Late Payment Penalties': 'late_payment_penalty',
            'Penalties': 'penalty',
            'Miscellaneous': 'miscellaneous',
            'Other': 'other'
          }
          const expectedFeeType = typeMap[formData.invoice_type] || formData.invoice_type.toLowerCase().replace(' ', '_')
          if (fee.fee_type !== expectedFeeType) {
            // Don't filter by type - allow showing all structures and let user choose
            // return false
          }
        }

        return true
      })

      console.log(`Found ${filteredStructures.length} fee structures for student ${selectedStudent.id}`)
      setFeeStructures(filteredStructures)
    } catch (err) {
      console.error('Error fetching fee structures:', err)
      setFeeStructures([])
    }
  }

  const applyFeeStructures = (feeStructureIds) => {
    if (!feeStructureIds || feeStructureIds.length === 0) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => !item.from_fee_structure) // Keep only manual items
      }))
      return
    }

    // Get selected fee structures
    const selectedStructures = feeStructures.filter(fs => feeStructureIds.includes(fs.id))
    
    if (selectedStructures.length === 0) return

    // Create items from fee structures
    const feeStructureItems = selectedStructures.map(feeStructure => ({
      from_fee_structure: true, // Flag to indicate this item came from a fee structure
      fee_structure_id: feeStructure.id, // Track which fee structure this came from
      item_type: feeStructure.fee_type,
      item_name_en: feeStructure.fee_name_en,
      item_name_ar: feeStructure.fee_name_ar || '',
      description: feeStructure.description || '',
      quantity: 1,
      unit_price: parseFloat(feeStructure.amount || 0),
      total_amount: parseFloat(feeStructure.amount || 0)
    }))

    // Get existing manual items (not from fee structures)
    const manualItems = formData.items.filter(item => !item.from_fee_structure)

    // Determine invoice type from first selected structure
    const firstStructure = selectedStructures[0]
    const typeMap = {
      'admission_fee': 'Admission Fees',
      'application_fee': 'Application Fees',
      'registration_fee': 'Registration Fees',
      'course_fee': 'Course Fees',
      'subject_fee': 'Subject Fees',
      'tuition_fee': 'Tuition Fees',
      'onboarding_fee': 'Onboarding Fees',
      'lab_fee': 'Laboratory Fees',
      'library_fee': 'Library Fees',
      'sports_fee': 'Sports Fees',
      'late_payment_penalty': 'Late Payment Penalties',
      'penalty': 'Penalties',
      'miscellaneous': 'Miscellaneous',
      'other': 'Other'
    }

    setFormData({
      ...formData,
      invoice_type: typeMap[firstStructure.fee_type] || 'Other',
      items: [...feeStructureItems, ...manualItems] // Fee structure items first, then manual items
    })
  }

  const handleFeeStructureSelection = (feeStructureIds) => {
    setSelectedFeeStructures(feeStructureIds)
    applyFeeStructures(feeStructureIds)
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

  // Calculate due date for a payment portion
  const calculatePortionDueDate = (portion, invoiceDate, previousPortionDate = null) => {
    if (portion.deadline_type === 'custom_date') {
      return portion.custom_date
    } else if (portion.deadline_type === 'days_from_previous' && previousPortionDate) {
      const date = new Date(previousPortionDate)
      date.setDate(date.getDate() + parseInt(portion.days))
      return date.toISOString().split('T')[0]
    } else {
      // days_from_invoice
      const date = new Date(invoiceDate)
      date.setDate(date.getDate() + parseInt(portion.days))
      return date.toISOString().split('T')[0]
    }
  }

  // Check if any selected fee structures have payment portions
  const hasPaymentPortions = () => {
    if (selectedFeeStructures.length === 0) return false
    const structuresWithPortions = feeStructures.filter(fs => 
      selectedFeeStructures.includes(fs.id) && 
      fs.payment_portions && 
      Array.isArray(fs.payment_portions) && 
      fs.payment_portions.length > 0
    )
    return structuresWithPortions.length > 0
  }

  const updateStudentFinancialMilestone = async (studentId, semesterId) => {
    if (!semesterId) {
      console.warn('No semester ID provided for milestone calculation')
      return
    }

    try {
      // Fetch all invoices for this student for the specific semester
      // Include parent_invoice_id to handle payment portions correctly
      const { data: semesterInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, status, invoice_type, parent_invoice_id, portion_percentage')
        .eq('student_id', studentId)
        .eq('semester_id', semesterId)
        .neq('invoice_type', 'admission_fee') // Exclude registration/admission fees from semester milestone

      if (invoicesError) {
        console.error('Error fetching invoices for milestone calculation:', invoicesError)
        return
      }

      // Calculate total due and total paid for this semester
      // For invoices with payment portions:
      // - If invoice has parent_invoice_id, it's a child invoice - count it
      // - If invoice has no parent_invoice_id but has child invoices, only count the parent (children are already counted)
      // - Otherwise, count the invoice normally
      let totalDue = 0
      let totalPaid = 0
      const parentInvoiceIds = new Set()

      // First, identify parent invoices (those with child invoices)
      semesterInvoices?.forEach(invoice => {
        if (!invoice.parent_invoice_id) {
          // Check if this invoice has children
          const hasChildren = semesterInvoices.some(inv => inv.parent_invoice_id === invoice.id)
          if (hasChildren) {
            parentInvoiceIds.add(invoice.id)
          }
        }
      })

      // Calculate totals
      semesterInvoices?.forEach(invoice => {
        // Skip parent invoices that have children (we'll count children instead)
        if (parentInvoiceIds.has(invoice.id)) {
          return
        }

        // Count child invoices and standalone invoices
        totalDue += parseFloat(invoice.total_amount || 0)
        if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
          totalPaid += parseFloat(invoice.paid_amount || 0)
        }
      })

      // Calculate new financial milestone for this semester
      const newMilestone = calculateFinancialMilestone(totalPaid, totalDue)

      // Update or insert student semester financial status
      // Check if record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('student_semester_financial_status')
        .select('id')
        .eq('student_id', studentId)
        .eq('semester_id', semesterId)
        .maybeSingle() // Use maybeSingle() to return null instead of throwing error when no record exists

      if (checkError) {
        console.error('Error checking existing record:', checkError)
      }

      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('student_semester_financial_status')
          .update({
            financial_milestone_code: newMilestone,
            total_due: totalDue,
            total_paid: totalPaid,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)

        if (updateError) {
          console.error('Error updating student semester financial milestone:', updateError)
        } else {
          console.log(`Student ${studentId} semester ${semesterId} milestone updated to ${newMilestone} (${totalPaid}/${totalDue})`)
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('student_semester_financial_status')
          .insert({
            student_id: studentId,
            semester_id: semesterId,
            financial_milestone_code: newMilestone,
            total_due: totalDue,
            total_paid: totalPaid
          })

        if (insertError) {
          console.error('Error creating student semester financial milestone:', insertError)
        } else {
          console.log(`Student ${studentId} semester ${semesterId} milestone created: ${newMilestone} (${totalPaid}/${totalDue})`)
        }
      }

      // If milestone changed, check for automatic status impact
      // PM10 → ENAC (Initial payment activates enrollment) - only for first semester
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

      // PM100 → Clear financial holds for this semester
      if (newMilestone === 'PM100') {
        // Check if all active semesters are paid
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

    // Check if selected invoice type requires semester
    const selectedType = feeTypes.find(ft => {
      const typeMap = {
        'Admission Fees': 'admission_fee',
        'Application Fees': 'application_fee',
        'Registration Fees': 'registration_fee',
        'Course Fees': 'course_fee',
        'Subject Fees': 'subject_fee',
        'Tuition Fees': 'tuition_fee',
        'Onboarding Fees': 'onboarding_fee',
        'Laboratory Fees': 'lab_fee',
        'Library Fees': 'library_fee',
        'Sports Fees': 'sports_fee',
        'Late Payment Penalties': 'late_payment_penalty',
        'Penalties': 'penalty',
        'Miscellaneous': 'miscellaneous',
        'Other': 'other'
      }
      return ft.code === (typeMap[formData.invoice_type] || formData.invoice_type.toLowerCase().replace(' ', '_'))
    })

    // For semester-based fees, require semester_id
    if (selectedType?.requires_semester && !formData.semester_id) {
      setError(`Please select a semester for ${formData.invoice_type}`)
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

      // Map invoice type to enum (use fee type code if available, otherwise map from display name)
      const typeMap = {
        'Admission Fees': 'admission_fee',
        'Application Fees': 'application_fee',
        'Registration Fees': 'registration_fee',
        'Course Fees': 'course_fee',
        'Subject Fees': 'subject_fee',
        'Tuition Fees': 'tuition_fee',
        'Onboarding Fees': 'onboarding_fee',
        'Laboratory Fees': 'lab_fee',
        'Library Fees': 'library_fee',
        'Sports Fees': 'sports_fee',
        'Late Payment Penalties': 'late_payment_penalty',
        'Penalties': 'penalty',
        'Miscellaneous': 'miscellaneous',
        'Other': 'other'
      }

      // Get invoice type enum from first item if available, otherwise from type selection
      let invoiceTypeEnum = formData.items[0]?.item_type || typeMap[formData.invoice_type] || 'other'
      
      // Ensure it's a valid enum value
      if (!invoiceTypeEnum || !typeMap[formData.invoice_type] && !formData.items[0]?.item_type) {
        invoiceTypeEnum = 'other'
      }
      const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
      const discount = parseFloat(formData.discount_amount) || 0
      const total = subtotal - discount

      // Determine payment status and method based on selection
      const isPaid = formData.payment_method === 'cash' || formData.payment_method === 'admin_payment'
      const paymentMethodValue = formData.payment_method === 'cash' ? 'cash' : 
                                 formData.payment_method === 'admin_payment' ? 'other' : null

      // Check if we need to create multiple invoices (payment portions)
      const structuresWithPortions = feeStructures.filter(fs => 
        selectedFeeStructures.includes(fs.id) && 
        fs.payment_portions && 
        Array.isArray(fs.payment_portions) && 
        fs.payment_portions.length > 0
      )

      // Add semester_id based on fee type requirements
      const selectedFeeTypeObj = feeTypes.find(ft => ft.code === invoiceTypeEnum)
      const semesterId = formData.semester_id && selectedFeeTypeObj?.requires_semester !== false 
        ? parseInt(formData.semester_id) 
        : null

      let parentInvoice = null
      let createdInvoices = []

      if (structuresWithPortions.length > 0) {
        // Create multiple invoices for payment portions
        // First, create a parent invoice (summary invoice)
        const parentInvoiceData = {
          invoice_number: invoiceNumber.data,
          student_id: selectedStudent.id,
          college_id: selectedStudent.college_id,
          invoice_date: formData.invoice_date,
          invoice_type: invoiceTypeEnum,
          status: 'pending', // Parent invoice status will be calculated from children
          subtotal: subtotal,
          discount_amount: discount,
          scholarship_amount: 0,
          tax_amount: 0,
          total_amount: total,
          paid_amount: 0,
          pending_amount: total,
          payment_method: paymentMethodValue,
          notes: formData.notes || null,
          semester_id: semesterId,
          fee_structure_id: structuresWithPortions[0].id // Link to first fee structure with portions
        }

        const { data: parent, error: parentError } = await supabase
          .from('invoices')
          .insert(parentInvoiceData)
          .select()
          .single()

        if (parentError) throw parentError
        parentInvoice = parent

        // Create child invoices for each portion
        const allPortions = structuresWithPortions.flatMap(fs => 
          fs.payment_portions.map(p => ({ ...p, fee_structure_id: fs.id }))
        )

        // Sort portions by portion_number
        allPortions.sort((a, b) => a.portion_number - b.portion_number)

        let previousPortionDate = formData.invoice_date

        for (const portion of allPortions) {
          const portionAmount = (total * portion.percentage) / 100
          const dueDate = calculatePortionDueDate(portion, formData.invoice_date, previousPortionDate)

          // Generate invoice number for child invoice
          const childInvoiceNumber = await supabase.rpc('generate_invoice_number', {
            college_id_param: selectedStudent.college_id
          })
          if (childInvoiceNumber.error) throw childInvoiceNumber.error

          const childInvoiceData = {
            invoice_number: childInvoiceNumber.data,
            student_id: selectedStudent.id,
            college_id: selectedStudent.college_id,
            invoice_date: formData.invoice_date,
            due_date: dueDate,
            invoice_type: invoiceTypeEnum,
            status: isPaid ? 'paid' : 'pending',
            subtotal: portionAmount,
            discount_amount: 0,
            scholarship_amount: 0,
            tax_amount: 0,
            total_amount: portionAmount,
            paid_amount: isPaid ? portionAmount : 0,
            pending_amount: isPaid ? 0 : portionAmount,
            payment_method: paymentMethodValue,
            notes: `Portion ${portion.portion_number} (${portion.percentage}%) - ${formData.notes || ''}`.trim() || null,
            semester_id: semesterId,
            parent_invoice_id: parent.id,
            fee_structure_id: portion.fee_structure_id,
            portion_number: portion.portion_number,
            portion_percentage: portion.percentage
          }

          const { data: childInvoice, error: childError } = await supabase
            .from('invoices')
            .insert(childInvoiceData)
            .select()
            .single()

          if (childError) throw childError
          createdInvoices.push(childInvoice)

          // Create invoice items for this portion
          const portionItems = formData.items
            .filter(item => item.from_fee_structure && item.fee_structure_id === portion.fee_structure_id)
            .map(item => ({
              invoice_id: childInvoice.id,
              item_type: item.item_type || invoiceTypeEnum,
              item_name_en: `${item.item_name_en} - Portion ${portion.portion_number}`,
              item_name_ar: item.item_name_ar || null,
              description: `Portion ${portion.portion_number} (${portion.percentage}%) - ${item.description || ''}`.trim() || null,
              quantity: parseInt(item.quantity) || 1,
              unit_price: (parseFloat(item.unit_price) || 0) * (portion.percentage / 100),
              discount_amount: 0,
              scholarship_amount: 0,
              total_amount: portionAmount
            }))

          // Also add manual items proportionally
          const manualItems = formData.items.filter(item => !item.from_fee_structure)
          if (manualItems.length > 0) {
            const manualTotal = manualItems.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
            const manualPortionAmount = (manualTotal * portion.percentage) / 100
            manualItems.forEach(item => {
              const itemPortionAmount = (parseFloat(item.total_amount) || 0) * (portion.percentage / 100)
              portionItems.push({
                invoice_id: childInvoice.id,
                item_type: item.item_type || invoiceTypeEnum,
                item_name_en: `${item.item_name_en} - Portion ${portion.portion_number}`,
                item_name_ar: item.item_name_ar || null,
                description: `Portion ${portion.portion_number} (${portion.percentage}%) - ${item.description || ''}`.trim() || null,
                quantity: parseInt(item.quantity) || 1,
                unit_price: (parseFloat(item.unit_price) || 0) * (portion.percentage / 100),
                discount_amount: 0,
                scholarship_amount: 0,
                total_amount: itemPortionAmount
              })
            })
          }

          if (portionItems.length > 0) {
            const { error: itemsError } = await supabase
              .from('invoice_items')
              .insert(portionItems)

            if (itemsError) throw itemsError
          }

          previousPortionDate = dueDate
        }

        // Update parent invoice status based on children
        const totalPaid = createdInvoices.reduce((sum, inv) => sum + (parseFloat(inv.paid_amount) || 0), 0)
        const totalPending = createdInvoices.reduce((sum, inv) => sum + (parseFloat(inv.pending_amount) || 0), 0)
        
        const parentStatus = totalPending === 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'pending'
        
        await supabase
          .from('invoices')
          .update({
            paid_amount: totalPaid,
            pending_amount: totalPending,
            status: parentStatus
          })
          .eq('id', parent.id)

      } else {
        // Create single invoice (no payment portions)
        const invoiceData = {
          invoice_number: invoiceNumber.data,
          student_id: selectedStudent.id,
          college_id: selectedStudent.college_id,
          invoice_date: formData.invoice_date,
          invoice_type: invoiceTypeEnum,
          status: isPaid ? 'paid' : 'pending',
          subtotal: subtotal,
          discount_amount: discount,
          scholarship_amount: 0,
          tax_amount: 0,
          total_amount: total,
          paid_amount: isPaid ? total : 0,
          pending_amount: isPaid ? 0 : total,
          payment_method: paymentMethodValue,
          notes: formData.notes || null,
          semester_id: semesterId
        }

        // Link to fee structure if available
        if (selectedFeeStructures.length > 0) {
          invoiceData.fee_structure_id = selectedFeeStructures[0]
        }

        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()

        if (invoiceError) throw invoiceError
        parentInvoice = invoice
        createdInvoices = [invoice]

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
      }

      // If cash payment or admin payment, create payment records for all created invoices
      if (isPaid) {
        // For admin payment, ensure we have currentUserId
        let adminUserId = currentUserId
        if (formData.payment_method === 'admin_payment' && !adminUserId) {
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
          if (!adminUserId) {
            setError('Unable to identify admin user. Please refresh and try again.')
            setLoading(false)
            return
          }
        }

        const verifiedBy = formData.payment_method === 'admin_payment' ? adminUserId : null
        const verifiedAt = formData.payment_method === 'admin_payment' ? new Date().toISOString() : 
                          formData.payment_method === 'cash' ? new Date().toISOString() : null
        const paymentStatus = (formData.payment_method === 'admin_payment' || formData.payment_method === 'cash') ? 'verified' : 'pending'

        // Create payment records for each invoice
        for (const invoice of createdInvoices) {
          const paymentNumber = await supabase.rpc('generate_payment_number', {
            college_id_param: selectedStudent.college_id
          })

          if (paymentNumber.error) throw paymentNumber.error

          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              payment_number: paymentNumber.data,
              invoice_id: invoice.id,
              student_id: selectedStudent.id,
              college_id: selectedStudent.college_id,
              payment_date: formData.invoice_date,
              payment_method: paymentMethodValue || 'cash',
              amount: invoice.total_amount,
              status: paymentStatus,
              verified_by: verifiedBy,
              verified_at: verifiedAt,
              created_by: currentUserId || adminUserId,
              notes: formData.payment_method === 'admin_payment' 
                ? `Admin Payment - Payment processed by ${userRole === 'admin' ? 'University Admin' : 'College Admin'}. ${formData.notes || ''}`.trim()
                : formData.payment_method === 'cash'
                ? `Cash Payment - ${formData.notes || ''}`.trim() || null
                : formData.notes || null
            })

          if (paymentError) throw paymentError
        }

        // Update student financial milestone after payment (per semester)
        // Use the first invoice's semester_id
        const invoiceSemesterId = createdInvoices[0]?.semester_id || semesterId
        if (invoiceSemesterId && invoiceTypeEnum !== 'admission_fee') {
          await updateStudentFinancialMilestone(selectedStudent.id, invoiceSemesterId)
        }
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
            <div className="mt-2 p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-green-800">
                Selected: {selectedStudent.student_id} - {selectedStudent.first_name && selectedStudent.last_name
                  ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                  : selectedStudent.name_en}
              </span>
            </div>
          )}
        </div>

        {/* Fee Structure Selection - Multiple Selection */}
        {selectedStudent && studentData && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Fee Structures (Optional - Multiple Selection)
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Select one or more fee structures to auto-fill invoice items. Item names and amounts are editable after selection.
              {!formData.semester_id && (
                <span className="block mt-1 text-yellow-700 font-medium">
                  Note: Select a semester to see semester-based fee structures, or fee structures will be shown for non-semester fees.
                </span>
              )}
            </p>
            
            {feeStructures.length > 0 ? (
              <>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                  {feeStructures.map(fee => (
                    <label
                      key={fee.id}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-2 ${
                        selectedFeeStructures.includes(fee.id)
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFeeStructures.includes(fee.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleFeeStructureSelection([...selectedFeeStructures, fee.id])
                          } else {
                            const updated = selectedFeeStructures.filter(id => id !== fee.id)
                            setSelectedFeeStructures(updated)
                            applyFeeStructures(updated)
                          }
                        }}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{fee.fee_name_en}</div>
                        <div className="text-xs text-gray-600">
                          {fee.currency} {parseFloat(fee.amount || 0).toFixed(2)} • {fee.fee_type.replace('_', ' ')}
                          {fee.applies_to_semester && Array.isArray(fee.applies_to_semester) && fee.applies_to_semester.length > 0 && (
                            <span> • {fee.applies_to_semester.length} semester{fee.applies_to_semester.length !== 1 ? 's' : ''}</span>
                          )}
                          {fee.payment_portions && Array.isArray(fee.payment_portions) && fee.payment_portions.length > 0 && (
                            <span> • {fee.payment_portions.length} payment portion{fee.payment_portions.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedFeeStructures.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    {selectedFeeStructures.length} fee structure{selectedFeeStructures.length !== 1 ? 's' : ''} selected. Items are editable below (highlighted in blue).
                  </p>
                )}
              </>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                {formData.semester_id ? (
                  <p className="text-sm text-gray-600 text-center py-2">
                    No fee structures found for this student matching the selected semester and criteria.
                    You can manually add invoice items below.
                  </p>
                ) : formData.invoice_type ? (
                  (() => {
                    const selectedType = feeTypes.find(ft => {
                      const typeMap = {
                        'Admission Fees': 'admission_fee',
                        'Application Fees': 'application_fee',
                        'Registration Fees': 'registration_fee',
                        'Course Fees': 'course_fee',
                        'Subject Fees': 'subject_fee',
                        'Tuition Fees': 'tuition_fee',
                        'Onboarding Fees': 'onboarding_fee',
                        'Laboratory Fees': 'lab_fee',
                        'Library Fees': 'library_fee',
                        'Sports Fees': 'sports_fee',
                        'Late Payment Penalties': 'late_payment_penalty',
                        'Penalties': 'penalty',
                        'Miscellaneous': 'miscellaneous',
                        'Other': 'other'
                      }
                      return ft.code === (typeMap[formData.invoice_type] || formData.invoice_type.toLowerCase().replace(' ', '_'))
                    })
                    const requiresSemester = selectedType?.requires_semester !== false
                    
                    return requiresSemester ? (
                      <p className="text-sm text-yellow-800 text-center py-2">
                        <strong>Note:</strong> Please select a semester first to see applicable fee structures for this invoice type.
                        Fee structures will appear here once a semester is selected.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 text-center py-2">
                        No fee structures found for this invoice type (non-semester based).
                        You can manually add invoice items below.
                      </p>
                    )
                  })()
                ) : (
                  <p className="text-sm text-gray-600 text-center py-2">
                    Select an invoice type and semester (if required) to see applicable fee structures.
                    You can also manually add invoice items below.
                  </p>
                )}
              </div>
            )}
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
              onChange={(e) => {
                const newType = e.target.value
                const selectedType = feeTypes.find(ft => {
                  const typeMap = {
                    'Admission Fees': 'admission_fee',
                    'Application Fees': 'application_fee',
                    'Registration Fees': 'registration_fee',
                    'Course Fees': 'course_fee',
                    'Subject Fees': 'subject_fee',
                    'Tuition Fees': 'tuition_fee',
                    'Onboarding Fees': 'onboarding_fee',
                    'Laboratory Fees': 'lab_fee',
                    'Library Fees': 'library_fee',
                    'Sports Fees': 'sports_fee',
                    'Late Payment Penalties': 'late_payment_penalty',
                    'Penalties': 'penalty',
                    'Miscellaneous': 'miscellaneous',
                    'Other': 'other'
                  }
                  return ft.code === (typeMap[newType] || newType.toLowerCase().replace(' ', '_'))
                })
                
                // Clear semester if the new type doesn't require it
                const needsSemester = selectedType?.requires_semester !== false
                setFormData({ 
                  ...formData, 
                  invoice_type: newType,
                  semester_id: needsSemester ? formData.semester_id : ''
                })
                
                // Refresh fee structures when semester changes
                if (needsSemester && formData.semester_id && selectedStudent) {
                  setTimeout(() => fetchFeeStructures(), 100)
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select Type</option>
              {feeTypes.map(feeType => {
                const displayNames = {
                  'admission_fee': 'Admission Fees',
                  'application_fee': 'Application Fees',
                  'registration_fee': 'Registration Fees',
                  'course_fee': 'Course Fees',
                  'subject_fee': 'Subject Fees',
                  'tuition_fee': 'Tuition Fees',
                  'onboarding_fee': 'Onboarding Fees',
                  'lab_fee': 'Laboratory Fees',
                  'library_fee': 'Library Fees',
                  'sports_fee': 'Sports Fees',
                  'late_payment_penalty': 'Late Payment Penalties',
                  'penalty': 'Penalties',
                  'miscellaneous': 'Miscellaneous',
                  'other': 'Other'
                }
                return (
                  <option key={feeType.id} value={displayNames[feeType.code] || feeType.name_en}>
                    {feeType.name_en} {feeType.requires_semester === false && '(No Semester Required)'}
                  </option>
                )
              })}
            </select>
          </div>
          {formData.invoice_type && (() => {
            const selectedType = feeTypes.find(ft => {
              const typeMap = {
                'Admission Fees': 'admission_fee',
                'Application Fees': 'application_fee',
                'Registration Fees': 'registration_fee',
                'Course Fees': 'course_fee',
                'Subject Fees': 'subject_fee',
                'Tuition Fees': 'tuition_fee',
                'Onboarding Fees': 'onboarding_fee',
                'Laboratory Fees': 'lab_fee',
                'Library Fees': 'library_fee',
                'Sports Fees': 'sports_fee',
                'Late Payment Penalties': 'late_payment_penalty',
                'Penalties': 'penalty',
                'Miscellaneous': 'miscellaneous',
                'Other': 'other'
              }
              return ft.code === (typeMap[formData.invoice_type] || formData.invoice_type.toLowerCase().replace(' ', '_'))
            })
            const requiresSemester = selectedType?.requires_semester !== false
            
            return requiresSemester && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Semester *</label>
                <select
                  value={formData.semester_id}
                  onChange={(e) => {
                    setFormData({ ...formData, semester_id: e.target.value })
                    // Refresh fee structures when semester changes
                    if (e.target.value && selectedStudent) {
                      setTimeout(() => fetchFeeStructures(), 100)
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select Semester...</option>
                  {semesters.map(semester => (
                    <option key={semester.id} value={semester.id}>
                      {semester.name_en} ({semester.code})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Fees are semester-specific. Financial milestones (30%, 60%, etc.) are calculated per semester.
                </p>
              </div>
            )
          })()}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="pending">Pending (Online/Bank Transfer)</option>
              <option value="cash">Cash Payment (Mark as Paid)</option>
              {(userRole === 'admin' || userRole === 'user') && (
                <option value="admin_payment">Admin Payment (Mark as Paid by Admin)</option>
              )}
            </select>
            {(userRole === 'admin' || userRole === 'user') && formData.payment_method === 'admin_payment' && (
              <p className="text-xs text-blue-600 mt-2">
                <strong>Note:</strong> This will mark the invoice as paid and record you as the verifier. 
                The student will be able to login and access the portal immediately.
              </p>
            )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name (EN) *
                      {item.from_fee_structure && (
                        <span className="ml-2 text-xs text-blue-600 font-normal">(from fee structure - editable)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={item.item_name_en}
                      onChange={(e) => handleItemChange(index, 'item_name_en', e.target.value)}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        item.from_fee_structure ? 'bg-blue-50 border-blue-200' : ''
                      }`}
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
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        item.from_fee_structure ? 'bg-blue-50 border-blue-200' : ''
                      }`}
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
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        item.from_fee_structure ? 'bg-blue-50 border-blue-200' : ''
                      }`}
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


