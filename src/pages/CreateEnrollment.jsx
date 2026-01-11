import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCollege } from '../contexts/CollegeContext'
import { ArrowLeft, ArrowRight, Check, Calendar, User, BookOpen, FileCheck, Building2 } from 'lucide-react'

export default function CreateEnrollment() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId: authCollegeId, departmentId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

  // Get student and semester from URL params
  const studentIdFromUrl = searchParams.get('student')
  const semesterIdFromUrl = searchParams.get('semester')

  const steps = [
    { id: 1, name: t('enrollments.selectSemester'), icon: Calendar },
    { id: 2, name: t('enrollments.step2'), icon: User },
    { id: 3, name: t('enrollments.step3'), icon: BookOpen },
    { id: 4, name: t('enrollments.step4'), icon: FileCheck },
  ]
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
  const [validationWarnings, setValidationWarnings] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [currentSemesterCredits, setCurrentSemesterCredits] = useState(0)
  const [studentMajorSheet, setStudentMajorSheet] = useState(null)
  const [currentSemester, setCurrentSemester] = useState(null)
  const [creditHoursSource, setCreditHoursSource] = useState('semester') // 'semester' or 'major_sheet'
  const [selectedStudentCollegeId, setSelectedStudentCollegeId] = useState(null)

  const [formData, setFormData] = useState({
    semester_id: semesterIdFromUrl || '',
    student_id: studentIdFromUrl || '',
    class_ids: [], // Changed to array for multiple selection
    status: 'enrolled',
  })
  const [courseGroups, setCourseGroups] = useState([]) // Store course groups for validation

  useEffect(() => {
    fetchSemesters()
  }, [collegeId, userRole])

  // Pre-fill student and semester if provided via URL params
  useEffect(() => {
    if (semesterIdFromUrl && semesters.length > 0) {
      const semesterExists = semesters.find(s => s.id.toString() === semesterIdFromUrl)
      if (semesterExists) {
        setFormData(prev => ({ ...prev, semester_id: semesterIdFromUrl }))
        setCurrentStep(2) // Skip to step 2 if semester is pre-filled
      }
    }
  }, [semesterIdFromUrl, semesters])

  useEffect(() => {
    if (studentIdFromUrl && students.length > 0) {
      const studentExists = students.find(s => s.id.toString() === studentIdFromUrl)
      if (studentExists) {
        setFormData(prev => ({ ...prev, student_id: studentIdFromUrl }))
        setStudentSearch(`${studentExists.first_name} ${studentExists.last_name} (${studentExists.student_id})`)
        setCurrentStep(3) // Skip to step 3 if student is pre-filled
      }
    }
  }, [studentIdFromUrl, students])

  useEffect(() => {
    if (formData.semester_id) {
      fetchStudents()
      fetchClasses()
      fetchSemesterDetails()
    }
  }, [formData.semester_id, collegeId, userRole])

  useEffect(() => {
    if (formData.student_id && formData.semester_id) {
      fetchStudentMajorSheet()
      fetchCurrentSemesterEnrollments()
      // Fetch student's college to get academic settings
      if (selectedStudent) {
        setSelectedStudentCollegeId(selectedStudent.college_id)
        fetchCollegeAcademicSettings(selectedStudent.college_id)
      } else {
        // Fetch student to get college_id
        fetchStudentForCollegeSettings()
      }
    } else {
      setValidationWarnings([])
      setValidationErrors([])
      setCurrentSemesterCredits(0)
    }
  }, [formData.student_id, formData.semester_id, selectedStudent])

  useEffect(() => {
    if (formData.student_id && formData.semester_id && formData.class_ids.length > 0) {
      validateEnrollment()
    } else {
      setValidationWarnings([])
      setValidationErrors([])
    }
  }, [formData.student_id, formData.class_ids, formData.semester_id, studentMajorSheet, currentSemesterCredits])

  // Refetch and filter classes when student major sheet is loaded
  useEffect(() => {
    if (formData.semester_id && formData.student_id && studentMajorSheet) {
      fetchClasses()
    }
  }, [studentMajorSheet, formData.student_id, formData.semester_id])

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

  const fetchStudentForCollegeSettings = async () => {
    try {
      if (!formData.student_id) return
      
      const { data, error } = await supabase
        .from('students')
        .select('college_id')
        .eq('id', parseInt(formData.student_id))
        .single()

      if (error) {
        console.error('Error fetching student college:', error)
        return
      }

      if (data?.college_id) {
        setSelectedStudentCollegeId(data.college_id)
        fetchCollegeAcademicSettings(data.college_id)
      }
    } catch (err) {
      console.error('Error fetching student college:', err)
    }
  }

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

  const fetchStudentMajorSheet = async () => {
    try {
      if (!formData.student_id) return

      // Fetch student's major
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, major_id, enrollment_date')
        .eq('id', parseInt(formData.student_id))
        .single()

      if (studentError) throw studentError
      if (!studentData) return

      // Get admission year from enrollment_date
      const admissionYear = studentData.enrollment_date 
        ? new Date(studentData.enrollment_date).getFullYear().toString()
        : new Date().getFullYear().toString()

      // Fetch student's assigned major sheet
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

      // If no major sheet assigned, try to find the active major sheet for the student's major and admission year
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
          // Fetch course groups for this major sheet
          await fetchCourseGroups(majorSheetData.id)
        }
      } else if (studentMajorSheetData) {
        setStudentMajorSheet(studentMajorSheetData)
        // Fetch course groups for this major sheet
        await fetchCourseGroups(studentMajorSheetData.major_sheet.id)
      }
    } catch (err) {
      console.error('Error fetching student major sheet:', err)
    }
  }

  const fetchCurrentSemesterEnrollments = async () => {
    try {
      if (!formData.student_id || !formData.semester_id) return

      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          classes (
            subjects (
              id,
              credit_hours
            )
          )
        `)
        .eq('student_id', parseInt(formData.student_id))
        .eq('semester_id', parseInt(formData.semester_id))
        .in('status', ['enrolled', 'completed'])

      if (error) throw error

      // Calculate current semester credits
      const credits = enrollments?.reduce((sum, enrollment) => {
        if (enrollment.status === 'enrolled' || enrollment.status === 'completed') {
          return sum + (parseInt(enrollment.classes?.subjects?.credit_hours) || 0)
        }
        return sum
      }, 0) || 0

      setCurrentSemesterCredits(credits)
    } catch (err) {
      console.error('Error fetching current semester enrollments:', err)
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

  const validateEnrollment = async () => {
    if (!formData.student_id || !formData.class_ids || formData.class_ids.length === 0 || !formData.semester_id) {
      setValidationWarnings([])
      setValidationErrors([])
      return
    }

    const warnings = []
    const errors = []

    try {
      // Get selected classes and calculate total credits
      const selectedClasses = classes.filter(c => formData.class_ids.includes(c.id.toString()))
      if (selectedClasses.length === 0) {
        setValidationErrors(['Please select at least one class'])
        return
      }

      // Calculate total credits from all selected classes
      const selectedCredits = selectedClasses.reduce((sum, cls) => {
        return sum + (parseInt(cls.subjects?.credit_hours) || 0)
      }, 0)
      const newTotalCredits = currentSemesterCredits + selectedCredits

      // Get all subject IDs from selected classes
      const selectedSubjectIds = selectedClasses.map(c => c.subjects?.id).filter(Boolean)

      // 1. Determine Effective Credit Limits based on college's academic settings
      let effectiveMinCredits = 0
      let effectiveMaxCredits = 999
      let effectiveMaxCreditsWithPermission = 999
      let limitSources = []

      // Use the source specified in college's academic settings
      if (creditHoursSource === 'major_sheet' && studentMajorSheet?.major_sheet) {
        // Use major sheet limits
        const majorSheet = studentMajorSheet.major_sheet
        const majorSheetMin = parseInt(majorSheet.min_credits_per_semester) || 0
        const majorSheetMax = parseInt(majorSheet.max_credits_per_semester) || 999

        effectiveMinCredits = majorSheetMin
        effectiveMaxCredits = majorSheetMax
        effectiveMaxCreditsWithPermission = majorSheetMax
        limitSources.push({ type: 'major_sheet', min: majorSheetMin, max: majorSheetMax })
      } else if (currentSemester) {
        // Use semester limits (default)
        const semesterMin = parseInt(currentSemester.min_credit_hours) || 0
        const semesterMax = parseInt(currentSemester.max_credit_hours) || 999
        const semesterMaxWithPermission = parseInt(currentSemester.max_credit_hours_with_permission) || semesterMax

        effectiveMinCredits = semesterMin
        effectiveMaxCredits = semesterMax
        effectiveMaxCreditsWithPermission = semesterMaxWithPermission
        limitSources.push({ type: 'semester', min: semesterMin, max: semesterMax, maxWithPermission: semesterMaxWithPermission })
      }

      // 2. Validate against effective limits
      const selectedCreditsOnly = selectedClasses.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0)
      
      if (newTotalCredits < effectiveMinCredits) {
        if (majorSheetMin !== null && majorSheetMin > (parseInt(currentSemester?.min_credit_hours) || 0)) {
          errors.push(`Total credits (${currentSemesterCredits} current + ${selectedCreditsOnly} new = ${newTotalCredits} total) is below program requirement (${effectiveMinCredits} credits minimum).`)
        } else {
          warnings.push(`Total credits (${currentSemesterCredits} current + ${selectedCreditsOnly} new = ${newTotalCredits} total) will be below minimum required (${effectiveMinCredits}) for this semester.`)
        }
      }

      if (newTotalCredits > effectiveMaxCredits) {
        if (newTotalCredits > effectiveMaxCreditsWithPermission) {
          if (majorSheetMax !== null && majorSheetMax < (parseInt(currentSemester?.max_credit_hours) || 999)) {
            errors.push(`Total credits (${currentSemesterCredits} current + ${selectedCreditsOnly} new = ${newTotalCredits} total) exceeds program maximum (${effectiveMaxCreditsWithPermission} credits).`)
          } else {
            errors.push(`Total credits (${currentSemesterCredits} current + ${selectedCreditsOnly} new = ${newTotalCredits} total) exceeds maximum allowed (${effectiveMaxCreditsWithPermission} with permission). Please reduce credits or get approval.`)
          }
        } else {
          if (majorSheetMax !== null && majorSheetMax < (parseInt(currentSemester?.max_credit_hours) || 999)) {
            warnings.push(`Total credits (${currentSemesterCredits} current + ${selectedCreditsOnly} new = ${newTotalCredits} total) exceeds program recommendation (${effectiveMaxCredits}).`)
          } else {
            warnings.push(`Total credits (${currentSemesterCredits} current + ${selectedCreditsOnly} new = ${newTotalCredits} total) exceeds standard maximum (${effectiveMaxCredits}). Permission may be required.`)
          }
        }
      }

      // Fetch student's completed enrollments with grade components for GPA points (for both prerequisites and co-requisites)
      const { data: completedEnrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          grade,
          numeric_grade,
          grade_points,
          classes (
            subjects (
              id,
              code,
              name_en
            )
          ),
          grade_components (
            gpa_points,
            numeric_grade,
            letter_grade,
            status
          )
        `)
        .eq('student_id', parseInt(formData.student_id))
        .in('status', ['completed'])

      if (enrollError) throw enrollError

      // Build list of passed subjects with their GPA points
      const passedSubjects = (completedEnrollments || [])
        .map(e => {
          // Use grade_components GPA points if available, otherwise use enrollment grade_points
          const gpaPoints = e.grade_components?.[0]?.gpa_points ?? e.grade_points ?? 0
          const subjId = e.classes?.subjects?.id
          if (subjId && gpaPoints >= 2.0) { // Minimum passing grade (C or 2.0 GPA)
            return {
              subject_id: subjId,
              gpa_points: gpaPoints,
              code: e.classes?.subjects?.code,
              name_en: e.classes?.subjects?.name_en
            }
          }
          return null
        })
        .filter(item => item !== null)

      const passedSubjectIds = passedSubjects.map(s => s.subject_id)

      // 3. Check Prerequisites for all selected classes
      const allPrereqMap = {} // Map: prerequisite_subject_id -> { subject_id, min_gpa, requires_grade, prerequisite_subject }

      for (const classItem of selectedClasses) {
        const subjectId = classItem.subjects?.id
        if (!subjectId) continue

        // Check both old subject_prerequisites and new course_prerequisites tables
        const { data: oldPrereqData, error: oldPrereqError } = await supabase
          .from('subject_prerequisites')
          .select('prerequisite_subject_id')
          .eq('subject_id', subjectId)

        const { data: newPrereqData, error: newPrereqError } = await supabase
          .from('course_prerequisites')
          .select('prerequisite_subject_id, min_gpa, requires_grade')
          .eq('subject_id', subjectId)
          .eq('prerequisite_type', 'prerequisite')

        // Collect prerequisites for this subject
        if (!oldPrereqError && oldPrereqData) {
          oldPrereqData.forEach(p => {
            if (!allPrereqMap[p.prerequisite_subject_id]) {
              allPrereqMap[p.prerequisite_subject_id] = {
                prerequisite_subject_id: p.prerequisite_subject_id,
                min_gpa: 2.0,
                required_for: [classItem.subjects?.code || `Subject ID ${subjectId}`]
              }
            } else {
              allPrereqMap[p.prerequisite_subject_id].required_for.push(classItem.subjects?.code || `Subject ID ${subjectId}`)
            }
          })
        }
        if (!newPrereqError && newPrereqData) {
          newPrereqData.forEach(p => {
            if (!allPrereqMap[p.prerequisite_subject_id]) {
              allPrereqMap[p.prerequisite_subject_id] = {
                prerequisite_subject_id: p.prerequisite_subject_id,
                min_gpa: parseFloat(p.min_gpa) || 2.0,
                requires_grade: p.requires_grade,
                required_for: [classItem.subjects?.code || `Subject ID ${subjectId}`]
              }
            } else {
              const existingMinGpa = allPrereqMap[p.prerequisite_subject_id].min_gpa
              const newMinGpa = parseFloat(p.min_gpa) || 2.0
              allPrereqMap[p.prerequisite_subject_id].min_gpa = Math.max(existingMinGpa, newMinGpa) // Take stricter requirement
              allPrereqMap[p.prerequisite_subject_id].required_for.push(classItem.subjects?.code || `Subject ID ${subjectId}`)
            }
          })
        }
      }

      // Fetch subject details for all prerequisites
      const uniquePrereqIds = Object.keys(allPrereqMap).map(id => parseInt(id))
      let prerequisiteSubjects = []
      if (uniquePrereqIds.length > 0) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, code, name_en')
          .in('id', uniquePrereqIds)
        
        if (!subjectsError && subjectsData) {
          prerequisiteSubjects = subjectsData
        }
      }

      // Validate prerequisites
      for (const prereqId in allPrereqMap) {
        const prereq = allPrereqMap[prereqId]
        const prereqSubjectId = parseInt(prereqId)
        const minGpa = parseFloat(prereq.min_gpa) || 2.0

        const subject = prerequisiteSubjects.find(s => s.id === prereqSubjectId)
        const prereqName = subject?.code || subject?.name_en || `Subject ID ${prereqSubjectId}`

        // Check if prerequisite is satisfied
        const passedSubject = passedSubjects.find(s => s.subject_id === prereqSubjectId)

        if (!passedSubject) {
          errors.push(`Prerequisite not met: ${prereqName} must be completed (min GPA ${minGpa.toFixed(1)}) before enrolling in: ${prereq.required_for.join(', ')}.`)
        } else if (passedSubject.gpa_points < minGpa) {
          errors.push(`Prerequisite grade insufficient: ${prereqName} was passed with GPA ${passedSubject.gpa_points.toFixed(2)}, but minimum required is ${minGpa.toFixed(1)} for: ${prereq.required_for.join(', ')}.`)
        }
      }

      // 4. Check Co-requisites for all selected classes
      const allCoreqMap = {} // Map: corequisite_subject_id -> { subject_id, required_for }

      for (const classItem of selectedClasses) {
        const subjectId = classItem.subjects?.id
        if (!subjectId) continue

        // Check both old subject_corequisites and new course_prerequisites tables
        const { data: oldCoreqData, error: oldCoreqError } = await supabase
          .from('subject_corequisites')
          .select('corequisite_subject_id')
          .eq('subject_id', subjectId)

        const { data: newCoreqData, error: newCoreqError } = await supabase
          .from('course_prerequisites')
          .select('prerequisite_subject_id')
          .eq('subject_id', subjectId)
          .eq('prerequisite_type', 'co_requisite')

        // Collect co-requisites for this subject
        if (!oldCoreqError && oldCoreqData) {
          oldCoreqData.forEach(c => {
            if (!allCoreqMap[c.corequisite_subject_id]) {
              allCoreqMap[c.corequisite_subject_id] = {
                corequisite_subject_id: c.corequisite_subject_id,
                required_for: [classItem.subjects?.code || `Subject ID ${subjectId}`]
              }
            } else {
              allCoreqMap[c.corequisite_subject_id].required_for.push(classItem.subjects?.code || `Subject ID ${subjectId}`)
            }
          })
        }
        if (!newCoreqError && newCoreqData) {
          newCoreqData.forEach(c => {
            const coreqId = c.prerequisite_subject_id
            if (!allCoreqMap[coreqId]) {
              allCoreqMap[coreqId] = {
                corequisite_subject_id: coreqId,
                required_for: [classItem.subjects?.code || `Subject ID ${subjectId}`]
              }
            } else {
              allCoreqMap[coreqId].required_for.push(classItem.subjects?.code || `Subject ID ${subjectId}`)
            }
          })
        }
      }

      // Fetch subject details for all co-requisites
      const uniqueCoreqIds = Object.keys(allCoreqMap).map(id => parseInt(id))
      let corequisiteSubjects = []
      if (uniqueCoreqIds.length > 0) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, code, name_en')
          .in('id', uniqueCoreqIds)
        
        if (!subjectsError && subjectsData) {
          corequisiteSubjects = subjectsData
        }
      }

      // Check if student is enrolled in co-requisites for the same semester (including currently selected)
      const { data: currentSemesterEnrollments, error: currentEnrollError } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          classes (
            subjects (
              id,
              code,
              name_en
            )
          )
        `)
        .eq('student_id', parseInt(formData.student_id))
        .eq('semester_id', parseInt(formData.semester_id))
        .in('status', ['enrolled'])

      if (currentEnrollError) throw currentEnrollError

      const enrolledSubjectIds = [
        ...(currentSemesterEnrollments || []).map(e => e.classes?.subjects?.id).filter(Boolean),
        ...selectedSubjectIds // Include currently selected subjects
      ]

      // Validate co-requisites
      for (const coreqId in allCoreqMap) {
        const coreq = allCoreqMap[coreqId]
        const coreqSubjectId = parseInt(coreqId)

        const subject = corequisiteSubjects.find(s => s.id === coreqSubjectId)
        const coreqName = subject?.code || subject?.name_en || `Subject ID ${coreqSubjectId}`

        // Check if co-requisite is already enrolled this semester (including selected), already completed, or being selected now
        const isEnrolledThisSemester = enrolledSubjectIds.includes(coreqSubjectId)
        const isCompleted = passedSubjectIds.includes(coreqSubjectId)

        if (!isEnrolledThisSemester && !isCompleted) {
          warnings.push(`Co-requisite recommended: ${coreqName} should be taken together with: ${coreq.required_for.join(', ')}`)
        }
      }

      // 5. Check Major Sheet Course Groups for all selected classes
      if (studentMajorSheet?.major_sheet?.id && courseGroups.length > 0) {
        const majorSheetId = studentMajorSheet.major_sheet.id

        // Map each selected subject to its course group
        const subjectToGroupMap = {}
        const subjectsNotInSheet = []

        for (const subjectId of selectedSubjectIds) {
          const { data: majorSheetCourses, error: mscError } = await supabase
            .from('major_sheet_courses')
            .select(`
              id,
              course_group_id,
              course_groups (
                id,
                group_type,
                group_name_en,
                group_number,
                rule_type,
                choose_count,
                total_options,
                min_credits_required,
                max_credits_allowed
              )
            `)
            .eq('major_sheet_id', majorSheetId)
            .eq('subject_id', subjectId)
            .limit(1)

          if (!mscError && majorSheetCourses && majorSheetCourses.length > 0) {
            const courseGroup = majorSheetCourses[0].course_groups
            if (courseGroup) {
              if (!subjectToGroupMap[courseGroup.id]) {
                subjectToGroupMap[courseGroup.id] = {
                  group: courseGroup,
                  subjects: []
                }
              }
              const classInfo = selectedClasses.find(c => c.subjects?.id === subjectId)
              subjectToGroupMap[courseGroup.id].subjects.push({
                subject_id: subjectId,
                credit_hours: parseInt(classInfo?.subjects?.credit_hours) || 0
              })
            }
          } else {
            const classInfo = selectedClasses.find(c => c.subjects?.id === subjectId)
            subjectsNotInSheet.push({
              subject_id: subjectId,
              code: classInfo?.subjects?.code || `Subject ID ${subjectId}`
            })
          }
        }

        // Warn about courses not in major sheet
        if (subjectsNotInSheet.length > 0) {
          warnings.push(`${subjectsNotInSheet.length} course(s) not in your major sheet degree plan. Enrollment may require approval.`)
        }

        // Validate course group rules
        for (const groupId in subjectToGroupMap) {
          const groupData = subjectToGroupMap[groupId]
          const group = groupData.group
          const selectedSubjectsInGroup = groupData.subjects
          const selectedCreditsInGroup = selectedSubjectsInGroup.reduce((sum, s) => sum + s.credit_hours, 0)

          // Check rule type and validate
          if (group.rule_type === 'all_required') {
            // All courses in this group are mandatory - fetch all courses in this group
            const { data: allGroupCourses, error: allGroupError } = await supabase
              .from('major_sheet_courses')
              .select('subject_id')
              .eq('course_group_id', parseInt(groupId))
            
            if (!allGroupError && allGroupCourses) {
              const allGroupSubjectIds = allGroupCourses.map(c => c.subject_id)
              const missingRequired = allGroupSubjectIds.filter(sid => !selectedSubjectIds.includes(sid))
              
              if (missingRequired.length > 0 && selectedSubjectsInGroup.length > 0) {
                warnings.push(`Group ${group.group_number} (${group.group_name_en}): You have selected some but not all required courses.`)
              }
            }
          } else if (group.rule_type === 'choose_n_from_m') {
            // Must choose exactly N from M options
            const n = parseInt(group.choose_count) || 0
            const selectedCount = selectedSubjectsInGroup.length
            
            if (selectedCount > n) {
              errors.push(`Group ${group.group_number} (${group.group_name_en}): You selected ${selectedCount} courses, but only ${n} are allowed.`)
            } else if (selectedCount < n && selectedCount > 0) {
              warnings.push(`Group ${group.group_number} (${group.group_name_en}): You selected ${selectedCount} of ${n} required courses.`)
            }
          } else if (group.rule_type === 'flexible') {
            // Flexible - just check credit limits
            if (group.min_credits_required && selectedCreditsInGroup < parseInt(group.min_credits_required)) {
              warnings.push(`Group ${group.group_number} (${group.group_name_en}): Selected credits (${selectedCreditsInGroup}) is below minimum (${group.min_credits_required}).`)
            }
            if (group.max_credits_allowed && selectedCreditsInGroup > parseInt(group.max_credits_allowed)) {
              errors.push(`Group ${group.group_number} (${group.group_name_en}): Selected credits (${selectedCreditsInGroup}) exceeds maximum (${group.max_credits_allowed}).`)
            }
          }

          // Check group credit limits
          if (group.min_credits_required && selectedCreditsInGroup < parseInt(group.min_credits_required) && group.rule_type !== 'flexible') {
            warnings.push(`Group ${group.group_number} (${group.group_name_en}): Minimum ${group.min_credits_required} credits required, selected ${selectedCreditsInGroup}.`)
          }
          if (group.max_credits_allowed && selectedCreditsInGroup > parseInt(group.max_credits_allowed)) {
            errors.push(`Group ${group.group_number} (${group.group_name_en}): Maximum ${group.max_credits_allowed} credits allowed, selected ${selectedCreditsInGroup}.`)
          }
        }
      }

      setValidationWarnings(warnings)
      setValidationErrors(errors)
    } catch (err) {
      console.error('Error validating enrollment:', err)
      setValidationErrors([`Validation error: ${err.message}`])
    }
  }

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
        .select('id, first_name, last_name, student_id, email, college_id, majors(name_en, code), status')
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
      if (!formData.semester_id) {
        setClasses([])
        return
      }

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

      const { data: allClasses, error } = await query
      if (error) throw error

      // Filter classes based on student's major sheet course groups if student is selected
      if (formData.student_id && studentMajorSheet?.major_sheet?.id) {
        const majorSheetId = studentMajorSheet.major_sheet.id

        // Fetch all subjects that are part of this major sheet's course groups
        const { data: majorSheetCourses, error: mscError } = await supabase
          .from('major_sheet_courses')
          .select('subject_id')
          .eq('major_sheet_id', majorSheetId)

        if (!mscError && majorSheetCourses && majorSheetCourses.length > 0) {
          const majorSheetSubjectIds = majorSheetCourses.map(c => c.subject_id)
          
          // Filter classes to only show those whose subjects are in the major sheet
          const filteredClasses = (allClasses || []).filter(classItem => {
            return classItem.subjects && majorSheetSubjectIds.includes(classItem.subjects.id)
          })

          setClasses(filteredClasses)
          
          // Show info if some classes were filtered out
          if (filteredClasses.length < (allClasses || []).length) {
            console.log(`Filtered classes: Showing ${filteredClasses.length} of ${allClasses?.length || 0} classes that match the student's major sheet`)
          }
        } else {
          // No major sheet courses found, show all classes (validation will warn)
          setClasses(allClasses || [])
        }
      } else {
        // No student selected or no major sheet, show all classes
        setClasses(allClasses || [])
      }
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
    if (currentStep === 3 && (!formData.class_ids || formData.class_ids.length === 0)) {
      setError('Please select at least one class')
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
      // Re-validate before submission
      await validateEnrollment()

      // Block enrollment if there are critical errors
      if (validationErrors.length > 0) {
        setError(`Cannot enroll: ${validationErrors.join(' ')}`)
        setLoading(false)
        return
      }

      // Check for existing enrollments and create/update enrollments for all selected classes
      const enrollmentPromises = []
      const classUpdatePromises = []

      for (const classIdStr of formData.class_ids) {
        const classId = parseInt(classIdStr)

        // Check if student is already enrolled in this class
        const { data: existingEnrollments, error: checkError } = await supabase
          .from('enrollments')
          .select('id, status')
          .eq('student_id', parseInt(formData.student_id))
          .eq('class_id', classId)
          .eq('semester_id', parseInt(formData.semester_id))
          .limit(1)

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }

        const existingEnrollment = existingEnrollments && existingEnrollments.length > 0 ? existingEnrollments[0] : null

        if (existingEnrollment) {
          if (existingEnrollment.status === 'enrolled') {
            setError(`Student is already enrolled in one or more selected classes`)
            setLoading(false)
            return
          } else {
            // Update existing enrollment if it's dropped/withdrawn
            enrollmentPromises.push(
              supabase
                .from('enrollments')
                .update({
                  status: 'enrolled',
                  enrollment_date: new Date().toISOString(),
                })
                .eq('id', existingEnrollment.id)
            )
            classUpdatePromises.push(updateClassEnrollment(classId, 1))
          }
        } else {
          // Create new enrollment
          enrollmentPromises.push(
            supabase
              .from('enrollments')
              .insert({
                student_id: parseInt(formData.student_id),
                class_id: classId,
                semester_id: parseInt(formData.semester_id),
                status: formData.status,
                enrollment_date: new Date().toISOString(),
              })
              .select()
              .single()
          )
          classUpdatePromises.push(updateClassEnrollment(classId, 1))
        }
      }

      // Execute all enrollment operations
      const enrollmentResults = await Promise.all(enrollmentPromises)
      const enrollmentErrors = enrollmentResults.filter(r => r.error).map(r => r.error)
      if (enrollmentErrors.length > 0) {
        throw enrollmentErrors[0]
      }

      // Update all class enrollment counts
      await Promise.all(classUpdatePromises)

      setSuccess(true)
      setTimeout(() => {
        navigate('/enrollments')
      }, 2000)
    } catch (err) {
      console.error('Error creating enrollment:', err)
      setError(err.message || t('enrollments.createdSuccess'))
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
  const selectedClassObjs = classes.filter(c => formData.class_ids.includes(c.id.toString()))

  useEffect(() => {
    if (formData.class_ids && formData.class_ids.length > 0) {
      setSelectedClass(selectedClassObjs[0] || null) // Keep for backward compatibility, but we'll use selectedClassObjs
    } else {
      setSelectedClass(null)
    }
  }, [formData.class_ids, selectedClassObjs])

  useEffect(() => {
    if (formData.student_id) {
      setSelectedStudent(selectedStudentObj)
    }
  }, [formData.student_id, selectedStudentObj])

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-4'}`}>
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('enrollments.back')}</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('enrollments.createTitle')}</h1>
          <p className="text-gray-600 mt-1">{t('enrollments.createSubtitle')}</p>
        </div>
      </div>

      {/* College Selector for Admin - Must be selected first */}
      {userRole === 'admin' && (
        <div className={`rounded-lg p-6 ${requiresCollegeSelection ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-blue-50 border border-blue-200'}`}>
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-4'}`}>
            <Building2 className={`w-6 h-6 ${requiresCollegeSelection ? 'text-yellow-600' : 'text-blue-600'}`} />
            <div className="flex-1">
              <p className={`text-base font-semibold ${requiresCollegeSelection ? 'text-yellow-900' : 'text-blue-900'}`}>
                {requiresCollegeSelection ? t('enrollments.collegeSelectionRequired') : t('enrollments.selectedCollege')}
              </p>
              <p className={`text-sm ${requiresCollegeSelection ? 'text-yellow-700' : 'text-blue-700'}`}>
                {requiresCollegeSelection 
                  ? t('enrollments.collegeSelectionMessage')
                  : `${t('enrollments.workingWith')}: ${colleges.find(c => c.id === selectedCollegeId)?.name_en || 'Unknown'}`}
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
              <option value="">{t('enrollments.selectCollege')}</option>
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
                <div className="mt-1 text-xs text-gray-500">
                  {t('common.step')} {step.id} {t('common.of')} {steps.length}
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
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-8 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Step 1: Select Semester */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('enrollments.semesterLabel')}</label>
              <select
                value={formData.semester_id}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, semester_id: e.target.value, student_id: '', class_ids: [] }))
                  setError('')
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{t('enrollments.semesterHint')}</option>
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
            {/* Current Semester Credit Hours Display */}
            {selectedStudent && currentSemester && (() => {
              const semesterMin = parseInt(currentSemester.min_credit_hours) || 0
              const semesterMax = parseInt(currentSemester.max_credit_hours) || 999
              const semesterMaxWithPermission = parseInt(currentSemester.max_credit_hours_with_permission) || semesterMax
              const majorSheetMin = studentMajorSheet?.major_sheet?.min_credits_per_semester 
                ? parseInt(studentMajorSheet.major_sheet.min_credits_per_semester) 
                : null
              const majorSheetMax = studentMajorSheet?.major_sheet?.max_credits_per_semester 
                ? parseInt(studentMajorSheet.major_sheet.max_credits_per_semester) 
                : null
              
              const effectiveMin = majorSheetMin !== null && majorSheetMin > semesterMin ? majorSheetMin : semesterMin
              const effectiveMax = majorSheetMax !== null && majorSheetMax < semesterMax ? majorSheetMax : semesterMax
              const effectiveMaxWithPermission = majorSheetMax !== null && majorSheetMax < semesterMaxWithPermission 
                ? majorSheetMax 
                : semesterMaxWithPermission
              
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-blue-900">Semester Credit Hours</h4>
                    <span className="text-lg font-bold text-blue-700">
                      {(() => {
                        const selectedCredits = selectedClassObjs.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0)
                        const total = currentSemesterCredits + selectedCredits
                        return selectedCredits > 0 
                          ? `${currentSemesterCredits} (current) + ${selectedCredits} (new) = ${total} / ${effectiveMax}`
                          : `${currentSemesterCredits} / ${effectiveMax}`
                      })()}
                    </span>
                  </div>
                  <div className="text-xs text-blue-700 space-y-1">
                    {(() => {
                      const selectedCredits = selectedClassObjs.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0)
                      return selectedCredits > 0 && (
                        <>
                          <p className="font-semibold text-blue-900 mb-1">Breakdown:</p>
                          <p>• Currently Enrolled: <span className="font-medium">{currentSemesterCredits}</span> credits</p>
                          <p>• New Selection: <span className="font-medium">{selectedCredits}</span> credits ({selectedClassObjs.length} class{selectedClassObjs.length !== 1 ? 'es' : ''})</p>
                          <p>• Total After Enrollment: <span className="font-medium">{currentSemesterCredits + selectedCredits}</span> credits</p>
                        </>
                      )
                    })()}
                    <p className="font-semibold text-blue-900 mb-1 mt-2">Effective Limits (Applied):</p>
                    <p>• Minimum Required: <span className="font-medium">{effectiveMin}</span> credits</p>
                    <p>• Maximum Allowed: <span className="font-medium">{effectiveMax}</span> credits</p>
                    {effectiveMaxWithPermission > effectiveMax && (
                      <p>• Maximum with Permission: <span className="font-medium">{effectiveMaxWithPermission}</span> credits</p>
                    )}
                    {(majorSheetMin !== null || majorSheetMax !== null) && (
                      <div className="mt-2 pt-2 border-t border-blue-300 text-xs text-blue-600">
                        <p className="font-semibold mb-1">Source Limits:</p>
                        <p>• Semester Policy: {semesterMin}-{semesterMax} credits {semesterMaxWithPermission > semesterMax && `(${semesterMaxWithPermission} with permission)`}</p>
                        <p>• Program Requirement: {majorSheetMin ?? 'Not set'}-{majorSheetMax ?? 'Not set'} credits</p>
                        <p className="mt-1 italic">System applies the stricter limits</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <h4 className="text-sm font-semibold text-red-900 mb-2">⚠️ Enrollment Blocked</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Warnings</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Classes * (You can select multiple classes)
              </label>
              {classes.length === 0 ? (
                <div className="p-4 text-center text-gray-500 border border-gray-200 rounded-lg">
                  No classes available for this semester
                </div>
              ) : (
                <div className={`border rounded-lg max-h-96 overflow-y-auto ${
                  validationErrors.length > 0 ? 'border-red-300' : 'border-gray-300'
                }`}>
                  {classes.map(cls => {
                    const available = (cls.capacity || 0) - (cls.enrolled || 0)
                    const isSelected = formData.class_ids.includes(cls.id.toString())
                    const isDisabled = available <= 0
                    
                    return (
                      <label
                        key={cls.id}
                        className={`flex items-start p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        } ${isSelected ? 'bg-primary-50 border-primary-200' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (isDisabled) return
                            const classIdStr = cls.id.toString()
                            setFormData(prev => {
                              if (e.target.checked) {
                                return { ...prev, class_ids: [...prev.class_ids, classIdStr] }
                              } else {
                                return { ...prev, class_ids: prev.class_ids.filter(id => id !== classIdStr) }
                              }
                            })
                            setError('')
                          }}
                          disabled={isDisabled || validationErrors.length > 0}
                          className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-gray-900">
                            {cls.subjects?.code}-{cls.section} - {cls.subjects?.name_en}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{cls.subjects?.credit_hours || 0} credits</span>
                            {' • '}
                            <span>Instructor: {cls.instructors?.name_en || 'TBA'}</span>
                            {' • '}
                            <span className={available > 0 ? 'text-green-600' : 'text-red-600'}>
                              {available} seats available
                            </span>
                          </div>
                          {isDisabled && (
                            <div className="text-xs text-red-600 mt-1">Class is full</div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
              {validationErrors.length > 0 && (
                <p className="text-xs text-red-600 mt-1">Please resolve the errors above before selecting classes.</p>
              )}
              {formData.class_ids.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {formData.class_ids.length} class(es) selected
                </p>
              )}
            </div>

            {selectedClassObjs && selectedClassObjs.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 mb-3">Selected Classes ({selectedClassObjs.length})</h3>
                <div className="space-y-3">
                  {selectedClassObjs.map((cls, idx) => {
                    const selectedCredits = selectedClassObjs.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0)
                    const newTotalCredits = currentSemesterCredits + selectedCredits
                    
                    return (
                      <div key={cls.id} className="border border-gray-200 rounded p-3 bg-white">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Subject:</span>
                            <span className="ml-2 font-medium">{cls.subjects?.name_en}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Code:</span>
                            <span className="ml-2 font-medium">{cls.code}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Instructor:</span>
                            <span className="ml-2 font-medium">{cls.instructors?.name_en || 'TBA'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Credit Hours:</span>
                            <span className="ml-2 font-medium">{cls.subjects?.credit_hours || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Total Credit Hours After Enrollment */}
                {selectedClassObjs.length > 0 && currentSemesterCredits !== undefined && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Credits After Enrollment:</span>
                      <span className={`text-lg font-bold ${
                        (() => {
                          const semesterMax = parseInt(currentSemester?.max_credit_hours) || 999
                          const majorSheetMax = studentMajorSheet?.major_sheet?.max_credits_per_semester 
                            ? parseInt(studentMajorSheet.major_sheet.max_credits_per_semester) 
                            : null
                          const effectiveMax = majorSheetMax !== null && majorSheetMax < semesterMax ? majorSheetMax : semesterMax
                          const selectedCredits = selectedClassObjs.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0)
                          return (currentSemesterCredits + selectedCredits) > effectiveMax
                        })()
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        {(() => {
                          const semesterMax = parseInt(currentSemester?.max_credit_hours) || 999
                          const majorSheetMax = studentMajorSheet?.major_sheet?.max_credits_per_semester 
                            ? parseInt(studentMajorSheet.major_sheet.max_credits_per_semester) 
                            : null
                          const effectiveMax = majorSheetMax !== null && majorSheetMax < semesterMax ? majorSheetMax : semesterMax
                          const selectedCredits = selectedClassObjs.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0)
                          return `${currentSemesterCredits + selectedCredits} / ${effectiveMax}`
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Review Enrollment Details</h3>
            
            {/* Validation Summary */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <h4 className="text-sm font-semibold text-red-900 mb-2">❌ Enrollment Cannot Proceed</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationWarnings.length > 0 && validationErrors.length === 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Warnings (Enrollment can proceed)</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationErrors.length === 0 && validationWarnings.length === 0 && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                <h4 className="text-sm font-semibold text-green-900 mb-2">✓ All Validations Passed</h4>
                <p className="text-sm text-green-700">This enrollment meets all academic requirements and credit hour limits.</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Semester:</span>
                <p className="text-gray-900">{selectedSemester?.name_en} ({selectedSemester?.code})</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Student:</span>
                <p className="text-gray-900">{selectedStudent?.first_name} {selectedStudent?.last_name} ({selectedStudent?.student_id})</p>
                <p className="text-xs text-gray-500 mt-1">Major: {selectedStudent?.majors?.name_en || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Selected Classes ({selectedClassObjs?.length || 0}):</span>
                <div className="mt-2 space-y-2">
                  {selectedClassObjs?.map((cls, idx) => (
                    <div key={cls.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-gray-900 font-medium">{cls.subjects?.code}-{cls.section} - {cls.subjects?.name_en}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Credit Hours: {cls.subjects?.credit_hours || 'N/A'} • Instructor: {cls.instructors?.name_en || 'TBA'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Credit Hours Summary:</span>
                <div className="mt-2 space-y-1 text-sm">
                  <p>Current Semester Credits: <span className="font-medium">{currentSemesterCredits}</span></p>
                  <p>New Course Credits: <span className="font-medium">
                    {selectedClassObjs?.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0) || 0}
                  </span></p>
                  <p className="border-t pt-2">Total After Enrollment: <span className="font-bold text-primary-600">
                    {currentSemesterCredits + (selectedClassObjs?.reduce((sum, c) => sum + (parseInt(c.subjects?.credit_hours) || 0), 0) || 0)}
                  </span></p>
                  {currentSemester && (
                    <>
                      {(() => {
                        const semesterMin = parseInt(currentSemester.min_credit_hours) || 0
                        const semesterMax = parseInt(currentSemester.max_credit_hours) || 999
                        const majorSheetMin = studentMajorSheet?.major_sheet?.min_credits_per_semester 
                          ? parseInt(studentMajorSheet.major_sheet.min_credits_per_semester) 
                          : null
                        const majorSheetMax = studentMajorSheet?.major_sheet?.max_credits_per_semester 
                          ? parseInt(studentMajorSheet.major_sheet.max_credits_per_semester) 
                          : null
                        
                        const effectiveMin = majorSheetMin !== null && majorSheetMin > semesterMin ? majorSheetMin : semesterMin
                        const effectiveMax = majorSheetMax !== null && majorSheetMax < semesterMax ? majorSheetMax : semesterMax
                        
                        return (
                          <>
                            <p className="text-xs font-medium text-gray-700">Effective Limits: Min {effectiveMin} / Max {effectiveMax}</p>
                            {(majorSheetMin !== null || majorSheetMax !== null) && (
                              <p className="text-xs text-gray-500">
                                (Semester: {semesterMin}-{semesterMax} | Program: {majorSheetMin ?? 'N/A'}-{majorSheetMax ?? 'N/A'})
                              </p>
                            )}
                          </>
                        )
                      })()}
                    </>
                  )}
                </div>
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
            disabled={loading || validationErrors.length > 0}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Enrolling...' : validationErrors.length > 0 ? 'Cannot Enroll - Fix Errors' : 'Complete Enrollment'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

