import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCollege } from '../contexts/CollegeContext'
import { ArrowLeft, ArrowRight, Check, Calendar, User, BookOpen, FileCheck, Building2 } from 'lucide-react'

const steps = [
  { id: 1, name: 'Select Semester', icon: Calendar },
  { id: 2, name: 'Select Student', icon: User },
  { id: 3, name: 'Select Class', icon: BookOpen },
  { id: 4, name: 'Review', icon: FileCheck },
]

export default function CreateEnrollment() {
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId, departmentId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [semesters, setSemesters] = useState([])
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')

  const [formData, setFormData] = useState({
    semester_id: '',
    student_id: '',
    class_id: '',
    status: 'enrolled',
  })

  useEffect(() => {
    fetchSemesters()
  }, [collegeId, userRole])

  useEffect(() => {
    if (formData.semester_id) {
      fetchStudents()
      fetchClasses()
    }
  }, [formData.semester_id, collegeId, userRole])

  const fetchSemesters = async () => {
    if (!collegeId) return
    
    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code, start_date, end_date, is_current')
        .order('start_date', { ascending: false })

      // Filter by college for college admins and instructors
      if (collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setError('Failed to load semesters')
    }
  }

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from('students')
        .select('id, first_name, last_name, student_id, email, majors(name_en, code), status')
        .eq('status', 'active')
        .order('first_name')

      if (userRole === 'instructor' && collegeId) {
        query = query.eq('college_id', collegeId)
        // Also filter by department if instructor has a department
        if (departmentId) {
          // Get majors that belong to this department
          const { data: departmentMajors } = await supabase
            .from('majors')
            .select('id')
            .eq('department_id', departmentId)
          
          if (departmentMajors && departmentMajors.length > 0) {
            const majorIds = departmentMajors.map(m => m.id)
            query = query.in('major_id', majorIds)
          } else {
            // No majors in this department, return empty
            query = query.eq('major_id', -1)
          }
        }
      } else if (collegeId) {
        query = query.eq('college_id', collegeId)
      }

      if (studentSearch) {
        query = query.or(`first_name.ilike.%${studentSearch}%,last_name.ilike.%${studentSearch}%,student_id.ilike.%${studentSearch}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      console.error('Error fetching students:', err)
    }
  }

  const fetchClasses = async () => {
    try {
      let query = supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          capacity,
          enrolled,
          instructor_id,
          subjects (
            id,
            name_en,
            code,
            credit_hours
          ),
          instructors (
            id,
            name_en,
            email
          ),
          class_schedules (
            day_of_week,
            start_time,
            end_time,
            location
          )
        `)
        .eq('semester_id', formData.semester_id)
        .eq('status', 'active')
        .order('code')

      if (collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError('Failed to load classes')
    }
  }

  useEffect(() => {
    if (studentSearch) {
      const timeoutId = setTimeout(() => {
        fetchStudents()
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      fetchStudents()
    }
  }, [studentSearch, formData.semester_id])

  const handleNext = () => {
    if (currentStep === 1 && !formData.semester_id) {
      setError('Please select a semester')
      return
    }
    if (currentStep === 2 && !formData.student_id) {
      setError('Please select a student')
      return
    }
    if (currentStep === 3 && !formData.class_id) {
      setError('Please select a class')
      return
    }
    setError('')
    setCurrentStep(prev => Math.min(prev + 1, steps.length))
  }

  const handleBack = () => {
    setError('')
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Check if student is already enrolled in this class
      const { data: existingEnrollments, error: checkError } = await supabase
        .from('enrollments')
        .select('id, status')
        .eq('student_id', parseInt(formData.student_id))
        .eq('class_id', parseInt(formData.class_id))
        .eq('semester_id', parseInt(formData.semester_id))
        .limit(1)

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      const existingEnrollment = existingEnrollments && existingEnrollments.length > 0 ? existingEnrollments[0] : null

      if (existingEnrollment) {
        if (existingEnrollment.status === 'enrolled') {
          setError('Student is already enrolled in this class')
          setLoading(false)
          return
        } else {
          // Update existing enrollment if it's dropped/withdrawn
          const { error: updateError } = await supabase
            .from('enrollments')
            .update({
              status: 'enrolled',
              enrollment_date: new Date().toISOString(),
            })
            .eq('id', existingEnrollment.id)

          if (updateError) throw updateError

          // Update class enrolled count
          await updateClassEnrollment(parseInt(formData.class_id), 1)

          setSuccess(true)
          setTimeout(() => {
            navigate('/enrollments')
          }, 2000)
          return
        }
      }

      // Create new enrollment
      const { data: enrollment, error: insertError } = await supabase
        .from('enrollments')
        .insert({
          student_id: parseInt(formData.student_id),
          class_id: parseInt(formData.class_id),
          semester_id: parseInt(formData.semester_id),
          status: formData.status,
          enrollment_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Update class enrolled count
      await updateClassEnrollment(parseInt(formData.class_id), 1)

      setSuccess(true)
      setTimeout(() => {
        navigate('/enrollments')
      }, 2000)
    } catch (err) {
      console.error('Error creating enrollment:', err)
      setError(err.message || 'Failed to create enrollment')
    } finally {
      setLoading(false)
    }
  }

  const updateClassEnrollment = async (classId, increment) => {
    try {
      const { data: classDataArray, error: classError } = await supabase
        .from('classes')
        .select('enrolled')
        .eq('id', classId)
        .limit(1)

      if (classError && classError.code !== 'PGRST116') {
        console.error('Error fetching class:', classError)
        return
      }

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

  const selectedSemester = semesters.find(s => s.id === parseInt(formData.semester_id))
  const selectedStudentObj = students.find(s => s.id === parseInt(formData.student_id))
  const selectedClassObj = classes.find(c => c.id === parseInt(formData.class_id))

  useEffect(() => {
    if (formData.class_id) {
      setSelectedClass(selectedClassObj)
    }
  }, [formData.class_id, selectedClassObj])

  useEffect(() => {
    if (formData.student_id) {
      setSelectedStudent(selectedStudentObj)
    }
  }, [formData.student_id, selectedStudentObj])

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Enrollment</h1>
          <p className="text-gray-600 mt-1">Enroll a student in a class for the selected semester</p>
        </div>
      </div>

      {/* College Selector for Admin - Must be selected first */}
      {userRole === 'admin' && (
        <div className={`rounded-lg p-6 ${requiresCollegeSelection ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center space-x-4">
            <Building2 className={`w-6 h-6 ${requiresCollegeSelection ? 'text-yellow-600' : 'text-blue-600'}`} />
            <div className="flex-1">
              <p className={`text-base font-semibold ${requiresCollegeSelection ? 'text-yellow-900' : 'text-blue-900'}`}>
                {requiresCollegeSelection ? 'College Selection Required' : 'Selected College'}
              </p>
              <p className={`text-sm ${requiresCollegeSelection ? 'text-yellow-700' : 'text-blue-700'}`}>
                {requiresCollegeSelection 
                  ? 'Please select a college before proceeding with enrollment' 
                  : `You are working with: ${colleges.find(c => c.id === selectedCollegeId)?.name_en || 'Unknown'}`}
              </p>
            </div>
            <select
              value={selectedCollegeId || ''}
              onChange={(e) => setSelectedCollegeId(parseInt(e.target.value))}
              className={`px-4 py-3 border rounded-lg text-sm bg-white focus:ring-2 focus:border-transparent min-w-[300px] ${
                requiresCollegeSelection 
                  ? 'border-yellow-300 focus:ring-yellow-500' 
                  : 'border-blue-300 focus:ring-blue-500'
              }`}
              required
            >
              <option value="">Select College...</option>
              {colleges.map(college => (
                <option key={college.id} value={college.id}>
                  {college.name_en} ({college.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
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
                <div className="mt-1 text-xs text-gray-500">
                  Step {step.id} of {steps.length}
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center space-x-2">
          <Check className="w-5 h-5" />
          <span>Enrollment created successfully! Redirecting...</span>
        </div>
      )}

      {/* Step Content */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-8 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Step 1: Select Semester */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semester *</label>
              <select
                value={formData.semester_id}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, semester_id: e.target.value, student_id: '', class_id: '' }))
                  setError('')
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select the semester for this enrollment</option>
                {semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name_en} ({semester.code}) {semester.is_current ? '[Current]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Select Student */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student *</label>
              <input
                type="text"
                placeholder="-- Search and Select Student --"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value)
                  setError('')
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Start typing to search for a student by name or ID</p>
            </div>

            {studentSearch && (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {students.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No students found</div>
                ) : (
                  students.map(student => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, student_id: student.id.toString() }))
                        setStudentSearch(`${student.first_name} ${student.last_name} (${student.student_id})`)
                        setError('')
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 ${
                        formData.student_id === student.id.toString() ? 'bg-primary-50 border-primary-200' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {student.first_name} {student.last_name} ({student.student_id})
                      </div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedStudent && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Student Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <span className="ml-2 font-medium">{selectedStudent.student_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Major:</span>
                    <span className="ml-2 font-medium">{selectedStudent.majors?.name_en || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2 font-medium">{selectedStudent.status || 'Active'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Class */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
              <select
                value={formData.class_id}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, class_id: e.target.value }))
                  setError('')
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Available classes for the selected semester</option>
                {classes.map(cls => {
                  const available = (cls.capacity || 0) - (cls.enrolled || 0)
                  return (
                    <option key={cls.id} value={cls.id} disabled={available <= 0}>
                      {cls.subjects?.code}-{cls.section} - {cls.subjects?.name_en} ({available} seats available)
                    </option>
                  )
                })}
              </select>
            </div>

            {selectedClass && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Class Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Subject:</span>
                    <span className="ml-2 font-medium">{selectedClass.subjects?.name_en}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Code:</span>
                    <span className="ml-2 font-medium">{selectedClass.code}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Instructor:</span>
                    <span className="ml-2 font-medium">{selectedClass.instructors?.name_en || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Credit Hours:</span>
                    <span className="ml-2 font-medium">{selectedClass.subjects?.credit_hours || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Capacity:</span>
                    <span className="ml-2 font-medium">{selectedClass.capacity || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Enrolled:</span>
                    <span className="ml-2 font-medium">{selectedClass.enrolled || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Available:</span>
                    <span className="ml-2 font-medium">{(selectedClass.capacity || 0) - (selectedClass.enrolled || 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Review Enrollment Details</h3>
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Semester:</span>
                <p className="text-gray-900">{selectedSemester?.name_en} ({selectedSemester?.code})</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Student:</span>
                <p className="text-gray-900">{selectedStudent?.first_name} {selectedStudent?.last_name} ({selectedStudent?.student_id})</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Class:</span>
                <p className="text-gray-900">{selectedClass?.subjects?.code}-{selectedClass?.section} - {selectedClass?.subjects?.name_en}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <p className="text-gray-900">{formData.status}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="flex items-center space-x-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        {currentStep < steps.length ? (
          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Enrolling...' : 'Complete Enrollment'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

