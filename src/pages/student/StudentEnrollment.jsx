import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, ArrowRight, Check, Calendar, BookOpen, FileCheck, AlertCircle, Clock } from 'lucide-react'
import { getStudentSemesterMilestone, checkFinancePermission, getMilestoneInfo } from '../../utils/financePermissions'

export default function StudentEnrollment() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const { user, userRole } = useAuth()

  const steps = [
    { id: 1, name: t('enrollments.selectSemester'), icon: Calendar },
    { id: 2, name: t('enrollments.step3'), icon: BookOpen },
    { id: 3, name: t('enrollments.step4'), icon: FileCheck },
  ]
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fetching, setFetching] = useState(true)

  const [student, setStudent] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedClassObjs, setSelectedClassObjs] = useState([])
  const [validationWarnings, setValidationWarnings] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [currentSemesterCredits, setCurrentSemesterCredits] = useState(0)
  const [studentMajorSheet, setStudentMajorSheet] = useState(null)
  const [currentSemester, setCurrentSemester] = useState(null)
  const [registrationStatus, setRegistrationStatus] = useState(null) // { allowed: boolean, reason: string }
  const [creditHoursSource, setCreditHoursSource] = useState('semester') // 'semester' or 'major_sheet'

  const [formData, setFormData] = useState({
    semester_id: '',
    student_id: '',
    class_ids: [],
    status: 'enrolled',
  })
  const [courseGroups, setCourseGroups] = useState([])

  useEffect(() => {
    if (user?.email) {
      fetchStudent()
    }
  }, [user])

  useEffect(() => {
    if (student?.id) {
      setFormData(prev => ({ ...prev, student_id: student.id.toString() }))
      fetchSemesters()
      if (student.college_id) {
        fetchCollegeAcademicSettings(student.college_id)
      }
    }
  }, [student])

  useEffect(() => {
    if (formData.semester_id && student?.id) {
      fetchSemesterDetails()
      checkRegistrationDeadline()
      fetchClasses()
      fetchStudentMajorSheet()
      fetchCurrentSemesterEnrollments()
    }
  }, [formData.semester_id, student])

  useEffect(() => {
    if (formData.student_id && formData.semester_id && formData.class_ids.length > 0) {
      validateEnrollment()
    } else {
      setValidationWarnings([])
      setValidationErrors([])
    }
  }, [formData.student_id, formData.class_ids, formData.semester_id, studentMajorSheet, currentSemesterCredits])

  useEffect(() => {
    if (formData.semester_id && formData.student_id && studentMajorSheet) {
      fetchClasses()
    }
  }, [studentMajorSheet, formData.student_id, formData.semester_id])

  useEffect(() => {
    if (formData.class_ids && classes.length > 0) {
      const selected = classes.filter(c => formData.class_ids.includes(c.id.toString()))
      setSelectedClassObjs(selected)
    } else {
      setSelectedClassObjs([])
    }
  }, [formData.class_ids, classes])

  const fetchCollegeAcademicSettings = async (collegeId) => {
    try {
      if (!collegeId) return
      
      const { data, error } = await supabase
        .from('colleges')
        .select('academic_settings')
        .eq('id', collegeId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching college academic settings:', error)
        return
      }

      if (data?.academic_settings?.credit_hours_source) {
        setCreditHoursSource(data.academic_settings.credit_hours_source)
      }
    } catch (err) {
      console.error('Error fetching college academic settings:', err)
    }
  }

  const fetchStudent = async () => {
    try {
      if (!user?.email) return

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, first_name, last_name, email, major_id, enrollment_date, college_id')
        .eq('email', user.email)
        .eq('status', 'active')
        .single()

      if (studentError) throw studentError
      setStudent(studentData)
    } catch (err) {
      console.error('Error fetching student:', err)
      setError(err.message || 'Failed to load student data')
    } finally {
      setFetching(false)
    }
  }

  const fetchSemesters = async () => {
    if (!student?.college_id) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name_en, code, start_date, end_date, registration_start_date, registration_end_date, late_registration_end_date, status, college_id, is_university_wide')
        .or(`college_id.eq.${student.college_id},is_university_wide.eq.true`)
        .in('status', ['active', 'registration_open'])
        .order('start_date', { ascending: false })

      if (error) throw error

      // Filter semesters that are within registration period or have registration_open status
      const availableSemesters = (data || []).filter(semester => {
        // If status is registration_open, allow it
        if (semester.status === 'registration_open') return true
        
        // Check registration dates
        if (semester.registration_start_date && semester.registration_end_date) {
          return today >= semester.registration_start_date && today <= semester.registration_end_date
        }
        
        // Check late registration
        if (semester.late_registration_end_date && today <= semester.late_registration_end_date) {
          return true
        }
        
        // If no dates set but status is active, allow it
        if (semester.status === 'active') return true
        
        return false
      })

      setSemesters(availableSemesters)
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setError(err.message || 'Failed to load semesters')
    }
  }

  const checkRegistrationDeadline = async () => {
    if (!formData.semester_id || !currentSemester) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const status = {
      allowed: false,
      reason: '',
      isLateRegistration: false
    }

    try {
      // Check registration start date
      if (currentSemester.registration_start_date) {
        const startDate = new Date(currentSemester.registration_start_date)
        startDate.setHours(0, 0, 0, 0)
        if (today < startDate) {
          status.allowed = false
          status.reason = `Registration has not started yet. Registration opens on ${new Date(currentSemester.registration_start_date).toLocaleDateString()}.`
          setRegistrationStatus(status)
          return
        }
      }

      // Check regular registration end date
      if (currentSemester.registration_end_date) {
        const endDate = new Date(currentSemester.registration_end_date)
        endDate.setHours(23, 59, 59, 999)
        if (today <= endDate) {
          status.allowed = true
          status.reason = ''
          setRegistrationStatus(status)
          return
        }
      }

      // Check late registration
      if (currentSemester.late_registration_end_date) {
        const lateEndDate = new Date(currentSemester.late_registration_end_date)
        lateEndDate.setHours(23, 59, 59, 999)
        if (today <= lateEndDate) {
          status.allowed = true
          status.isLateRegistration = true
          status.reason = `Late registration period. Late registration ends on ${new Date(currentSemester.late_registration_end_date).toLocaleDateString()}.`
          setRegistrationStatus(status)
          return
        }
      }

      // If no dates set but status is registration_open or active, allow it
      if (currentSemester.status === 'registration_open' || currentSemester.status === 'active') {
        if (!currentSemester.registration_start_date && !currentSemester.registration_end_date) {
          status.allowed = true
          status.reason = ''
          setRegistrationStatus(status)
          return
        }
      }

      // Registration period has ended
      status.allowed = false
      const lastDeadline = currentSemester.late_registration_end_date || currentSemester.registration_end_date
      if (lastDeadline) {
        status.reason = `Registration period has ended. The deadline was ${new Date(lastDeadline).toLocaleDateString()}. Please contact the registrar's office.`
      } else {
        status.reason = 'Registration period has ended. Please contact the registrar\'s office.'
      }
      setRegistrationStatus(status)
    } catch (err) {
      console.error('Error checking registration deadline:', err)
      status.allowed = false
      status.reason = 'Error checking registration deadline. Please try again.'
      setRegistrationStatus(status)
    }
  }

  const fetchSemesterDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('id', formData.semester_id)
        .single()

      if (error) throw error
      setCurrentSemester(data)
    } catch (err) {
      console.error('Error fetching semester details:', err)
    }
  }

  const fetchStudentMajorSheet = async () => {
    try {
      if (!formData.student_id) return

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, major_id, enrollment_date')
        .eq('id', parseInt(formData.student_id))
        .single()

      if (studentError) throw studentError
      if (!studentData) return

      const admissionYear = studentData.enrollment_date 
        ? new Date(studentData.enrollment_date).getFullYear().toString()
        : new Date().getFullYear().toString()

      const { data: studentMajorSheetData, error: sheetError } = await supabase
        .from('student_major_sheets')
        .select(`
          *,
          major_sheets (
            *,
            major_id
          )
        `)
        .eq('student_id', parseInt(formData.student_id))
        .eq('is_active', true)
        .maybeSingle()

      if (sheetError && sheetError.code !== 'PGRST116') {
        console.error('Error fetching student major sheet:', sheetError)
        return
      }

      if (!studentMajorSheetData && studentData.major_id) {
        const { data: majorSheetData, error: majorSheetError } = await supabase
          .from('major_sheets')
          .select('*')
          .eq('major_id', studentData.major_id)
          .eq('is_active', true)
          .ilike('academic_year', `%${admissionYear}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!majorSheetError && majorSheetData) {
          setStudentMajorSheet({
            major_sheet: majorSheetData
          })
          await fetchCourseGroups(majorSheetData.id)
        }
      } else if (studentMajorSheetData) {
        setStudentMajorSheet(studentMajorSheetData)
        await fetchCourseGroups(studentMajorSheetData.major_sheet.id)
      }
    } catch (err) {
      console.error('Error fetching student major sheet:', err)
    }
  }

  const fetchCourseGroups = async (majorSheetId) => {
    try {
      const { data: groups, error } = await supabase
        .from('course_groups')
        .select(`
          *,
          major_sheet_courses (
            subject_id
          )
        `)
        .eq('major_sheet_id', majorSheetId)
        .eq('is_active', true)
        .order('group_number')

      if (error) throw error
      setCourseGroups(groups || [])
    } catch (err) {
      console.error('Error fetching course groups:', err)
      setCourseGroups([])
    }
  }

  const fetchCurrentSemesterEnrollments = async () => {
    try {
      if (!formData.student_id || !formData.semester_id) return

      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          classes (
            subjects (credit_hours)
          )
        `)
        .eq('student_id', parseInt(formData.student_id))
        .eq('semester_id', parseInt(formData.semester_id))
        .eq('status', 'enrolled')

      if (error) throw error

      const credits = (enrollments || []).reduce((sum, enrollment) => {
        if (enrollment.classes?.subjects?.credit_hours) {
          return sum + parseInt(enrollment.classes.subjects.credit_hours)
        }
        return sum
      }, 0) || 0

      setCurrentSemesterCredits(credits)
    } catch (err) {
      console.error('Error fetching current semester enrollments:', err)
    }
  }

  const fetchClasses = async () => {
    try {
      if (!formData.semester_id) return

      let query = supabase
        .from('classes')
        .select(`
          *,
          subjects (
            id, name_en, code, credit_hours
          ),
          instructors (
            id, name_en, first_name, last_name
          )
        `)
        .eq('semester_id', parseInt(formData.semester_id))
        .eq('status', 'active')

      // Filter by major sheet if available
      if (studentMajorSheet?.major_sheet) {
        const { data: majorSheetCourses, error: mscError } = await supabase
          .from('major_sheet_courses')
          .select('subject_id')
          .eq('major_sheet_id', studentMajorSheet.major_sheet.id)

        if (!mscError && majorSheetCourses && majorSheetCourses.length > 0) {
          const subjectIds = majorSheetCourses.map(c => c.subject_id)
          query = query.in('subject_id', subjectIds)
        }
      }

      const { data, error } = await query.order('code')

      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError(err.message || 'Failed to load classes')
    }
  }

  const validateEnrollment = async () => {
    if (!formData.student_id || !formData.class_ids || formData.class_ids.length === 0 || !formData.semester_id) {
      setValidationWarnings([])
      setValidationErrors([])
      return
    }

    const warnings = []
    const errors = []

    try {
      const selectedClasses = classes.filter(c => formData.class_ids.includes(c.id.toString()))
      if (selectedClasses.length === 0) {
        setValidationErrors(['Please select at least one class'])
        return
      }

      const selectedCredits = selectedClasses.reduce((sum, cls) => {
        return sum + (parseInt(cls.subjects?.credit_hours) || 0)
      }, 0)
      const newTotalCredits = currentSemesterCredits + selectedCredits

      // Check registration deadline
      if (!registrationStatus?.allowed) {
        errors.push(registrationStatus?.reason || 'Registration is not currently open for this semester.')
      }

      // Check financial milestone (requires PM30 for enrollment)
      if (currentSemester) {
        const { milestone, hold } = await getStudentSemesterMilestone(parseInt(formData.student_id), currentSemester.id)
        const financeCheck = checkFinancePermission('SE_REG', milestone, hold)
        if (!financeCheck.allowed) {
          errors.push(`Financial: ${financeCheck.reason}`)
        }
      }

      // Credit limits validation - check source from college settings
      if (currentSemester && studentMajorSheet) {
        let minCredits = 0
        let maxCredits = 999

        if (creditHoursSource === 'major_sheet' && studentMajorSheet?.major_sheet) {
          // Use major sheet limits
          minCredits = parseInt(studentMajorSheet.major_sheet.min_credits_per_semester) || 0
          maxCredits = parseInt(studentMajorSheet.major_sheet.max_credits_per_semester) || 999
        } else {
          // Use semester limits (default)
          minCredits = parseInt(currentSemester.min_credit_hours) || 0
          maxCredits = parseInt(currentSemester.max_credit_hours) || 999
        }

        if (newTotalCredits < minCredits) {
          warnings.push(`Total credits (${currentSemesterCredits} current + ${selectedCredits} new = ${newTotalCredits} total) will be below minimum required (${minCredits}) for this ${creditHoursSource === 'major_sheet' ? 'major' : 'semester'}.`)
        }

        if (newTotalCredits > maxCredits) {
          errors.push(`Total credits (${currentSemesterCredits} current + ${selectedCredits} new = ${newTotalCredits} total) exceeds maximum allowed (${maxCredits}) for this ${creditHoursSource === 'major_sheet' ? 'major' : 'semester'}.`)
        }
      }

      setValidationWarnings(warnings)
      setValidationErrors(errors)
    } catch (err) {
      console.error('Error validating enrollment:', err)
      setValidationErrors(['Error validating enrollment. Please try again.'])
    }
  }

  const handleClassToggle = (classId) => {
    const classIdStr = classId.toString()
    setFormData(prev => {
      const currentIds = prev.class_ids || []
      if (currentIds.includes(classIdStr)) {
        return { ...prev, class_ids: currentIds.filter(id => id !== classIdStr) }
      } else {
        return { ...prev, class_ids: [...currentIds, classIdStr] }
      }
    })
  }

  const handleSubmit = async () => {
    if (validationErrors.length > 0) {
      setError('Please fix the errors before submitting.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create enrollments for each selected class
      for (const classId of formData.class_ids) {
        // Check if enrollment already exists
        const { data: existingEnrollment, error: checkError } = await supabase
          .from('enrollments')
          .select('id, status')
          .eq('student_id', parseInt(formData.student_id))
          .eq('class_id', parseInt(classId))
          .eq('semester_id', parseInt(formData.semester_id))
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }

        if (existingEnrollment) {
          // Update existing enrollment
          const { error: updateError } = await supabase
            .from('enrollments')
            .update({
              status: 'enrolled',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEnrollment.id)

          if (updateError) throw updateError

          // Update class enrolled count if status was not enrolled
          if (existingEnrollment.status !== 'enrolled') {
            await updateClassEnrollmentCount(parseInt(classId), 1)
          }
        } else {
          // Create new enrollment
          const { error: insertError } = await supabase
            .from('enrollments')
            .insert({
              student_id: parseInt(formData.student_id),
              class_id: parseInt(classId),
              semester_id: parseInt(formData.semester_id),
              status: 'enrolled',
              enrolled_at: new Date().toISOString()
            })

          if (insertError) throw insertError

          // Update class enrolled count
          await updateClassEnrollmentCount(parseInt(classId), 1)
        }
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/courses')
      }, 2000)
    } catch (err) {
      console.error('Error creating enrollment:', err)
      setError(err.message || 'Failed to enroll in classes')
    } finally {
      setLoading(false)
    }
  }

  const updateClassEnrollmentCount = async (classId, increment) => {
    try {
      const { data: classDataArray, error } = await supabase
        .from('classes')
        .select('enrolled')
        .eq('id', classId)

      if (error) throw error

      const classData = classDataArray && classDataArray.length > 0 ? classDataArray[0] : null

      if (classData) {
        await supabase
          .from('classes')
          .update({ enrolled: (classData.enrolled || 0) + increment })
          .eq('id', classId)
      }
    } catch (err) {
      console.error('Error updating class enrollment count:', err)
    }
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.semester_id) {
        setError('Please select a semester')
        return
      }
      if (!registrationStatus?.allowed) {
        setError(registrationStatus?.reason || 'Registration is not open for the selected semester.')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (formData.class_ids.length === 0) {
        setError('Please select at least one class')
        return
      }
      if (validationErrors.length > 0) {
        setError('Please fix the errors before proceeding.')
        return
      }
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError('')
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('common.back')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Student not found or inactive. Please contact support.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-4'}`}>
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('common.back')}</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('enrollments.createTitle')}</h1>
          <p className="text-gray-600 mt-1">{t('enrollments.createSubtitle')}</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'}`}>
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStep >= step.id
                      ? 'bg-primary-gradient border-primary-600 text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}
                >
                  <step.icon className="w-6 h-6" />
                </div>
                <div className="mt-2 text-xs font-medium text-gray-600 text-center">
                  {step.name}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className={`bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
          <Check className="w-5 h-5" />
          <span>{t('enrollments.createdSuccess')}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Step 1: Select Semester */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('enrollments.semesterLabel')}</label>
              <select
                value={formData.semester_id}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, semester_id: e.target.value, class_ids: [] }))
                  setError('')
                  setRegistrationStatus(null)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{t('enrollments.semesterHint')}</option>
                {semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name_en} ({semester.code}) - {semester.academic_year || ''}
                  </option>
                ))}
              </select>
            </div>

            {registrationStatus && (
              <div className={`p-4 rounded-lg border ${
                registrationStatus.allowed 
                  ? registrationStatus.isLateRegistration 
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-start space-x-2">
                  {registrationStatus.allowed ? (
                    registrationStatus.isLateRegistration ? (
                      <Clock className="w-5 h-5 mt-0.5" />
                    ) : (
                      <Check className="w-5 h-5 mt-0.5" />
                    )
                  ) : (
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">
                      {registrationStatus.allowed 
                        ? registrationStatus.isLateRegistration 
                          ? 'Late Registration Period'
                          : 'Registration Open'
                        : 'Registration Closed'
                      }
                    </p>
                    {registrationStatus.reason && (
                      <p className="text-sm mt-1">{registrationStatus.reason}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentSemester && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Registration Dates</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  {currentSemester.registration_start_date && (
                    <p>Start: {new Date(currentSemester.registration_start_date).toLocaleDateString()}</p>
                  )}
                  {currentSemester.registration_end_date && (
                    <p>Regular End: {new Date(currentSemester.registration_end_date).toLocaleDateString()}</p>
                  )}
                  {currentSemester.late_registration_end_date && (
                    <p>Late Registration End: {new Date(currentSemester.late_registration_end_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Classes */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Classes</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {classes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No classes available for this semester.</p>
                ) : (
                  classes.map(cls => {
                    const isSelected = formData.class_ids.includes(cls.id.toString())
                    const availableSeats = (cls.capacity || 0) - (cls.enrolled || 0)
                    const isDisabled = availableSeats <= 0

                    return (
                      <label
                        key={cls.id}
                        className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : isDisabled
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !isDisabled && handleClassToggle(cls.id)}
                          disabled={isDisabled}
                          className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {cls.code} - {cls.subjects?.name_en || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Section: {cls.section} • {cls.subjects?.credit_hours || 0} credits
                              </p>
                              <p className="text-sm text-gray-500">
                                Instructor: {cls.instructors?.name_en || cls.instructors?.first_name + ' ' + cls.instructors?.last_name || 'TBA'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${isDisabled ? 'text-red-600' : 'text-green-600'}`}>
                                {availableSeats} seats available
                              </p>
                            </div>
                          </div>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {formData.class_ids.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900">
                  {formData.class_ids.length} class(es) selected
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Total Credits: {selectedClassObjs.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0)}
                </p>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">Errors</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationWarnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">Warnings</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Enrollment</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Selected Semester</h4>
                <p className="text-gray-900">
                  {currentSemester?.name_en} ({currentSemester?.code})
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Selected Classes ({selectedClassObjs.length})</h4>
                <div className="space-y-2">
                  {selectedClassObjs.map(cls => (
                    <div key={cls.id} className="border border-gray-200 rounded-lg p-3">
                      <p className="font-medium">{cls.code} - {cls.subjects?.name_en}</p>
                      <p className="text-sm text-gray-600">Section: {cls.section} • {cls.subjects?.credit_hours} credits</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-700">Total Credits: {selectedClassObjs.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className={`flex items-center justify-between mt-8 pt-6 border-t ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-4'}`}>
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`px-6 py-2 border border-gray-300 rounded-lg ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'} ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            {t('common.back')}
          </button>
          
          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-6 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {t('common.next')}
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || validationErrors.length > 0}
              className="px-6 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('enrollments.submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

