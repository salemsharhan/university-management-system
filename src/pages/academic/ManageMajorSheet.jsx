import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check, GraduationCap, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export default function ManageMajorSheet() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams() // major_id
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [major, setMajor] = useState(null)
  const [collegeId, setCollegeId] = useState(null)
  const [isUniversityWide, setIsUniversityWide] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [existingMajorSheet, setExistingMajorSheet] = useState(null)
  const [showMajorSheetConfig, setShowMajorSheetConfig] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState({})
  const addingCourseRef = useRef(false)
  const [creditHoursSource, setCreditHoursSource] = useState('semester') // 'semester' or 'major_sheet'

  // Major Sheet Configuration State
  const [majorSheet, setMajorSheet] = useState({
    version: '',
    academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    sheet_type: 'rule_based',
    total_credits_required: 120,
    min_credits_per_semester: 12,
    max_credits_per_semester: 18,
    min_gpa_for_graduation: 2.0,
    description: ''
  })

  const [courseGroups, setCourseGroups] = useState([
    {
      group_type: 'university_requirements',
      group_name_en: 'University Requirements',
      group_name_ar: 'متطلبات الجامعة',
      group_number: 1,
      min_credits_required: 0,
      max_credits_allowed: null,
      rule_type: 'choose_n_from_m',
      choose_count: null,
      total_options: null,
      allows_substitution: false,
      requires_approval_for_substitution: true,
      min_gpa_required: null,
      description: '',
      courses: []
    },
    {
      group_type: 'college_requirements',
      group_name_en: 'College Requirements',
      group_name_ar: 'متطلبات الكلية',
      group_number: 2,
      min_credits_required: 0,
      max_credits_allowed: null,
      rule_type: 'all_required',
      choose_count: null,
      total_options: null,
      allows_substitution: false,
      requires_approval_for_substitution: true,
      min_gpa_required: null,
      description: '',
      courses: []
    },
    {
      group_type: 'major_core',
      group_name_en: 'Major Core Courses',
      group_name_ar: 'مقررات التخصص الأساسية',
      group_number: 3,
      min_credits_required: 0,
      max_credits_allowed: null,
      rule_type: 'all_required',
      choose_count: null,
      total_options: null,
      allows_substitution: false,
      requires_approval_for_substitution: true,
      min_gpa_required: null,
      description: '',
      courses: []
    },
    {
      group_type: 'major_electives',
      group_name_en: 'Major Electives',
      group_name_ar: 'مقررات التخصص الاختيارية',
      group_number: 4,
      min_credits_required: 0,
      max_credits_allowed: null,
      rule_type: 'choose_n_from_m',
      choose_count: null,
      total_options: null,
      allows_substitution: true,
      requires_approval_for_substitution: true,
      min_gpa_required: null,
      description: '',
      courses: []
    },
    {
      group_type: 'free_electives',
      group_name_en: 'Free Electives',
      group_name_ar: 'المقررات الحرة',
      group_number: 5,
      min_credits_required: 0,
      max_credits_allowed: null,
      rule_type: 'flexible',
      choose_count: null,
      total_options: null,
      allows_substitution: true,
      requires_approval_for_substitution: false,
      min_gpa_required: null,
      description: '',
      courses: []
    }
  ])

  useEffect(() => {
    if (id) {
      fetchMajor()
      fetchAcademicYears()
    }
  }, [id, userRole])

  useEffect(() => {
    // Fetch college academic settings to determine credit hours source
    if (collegeId && !isUniversityWide && major) {
      fetchCollegeAcademicSettings()
    } else if (isUniversityWide) {
      fetchUniversityAcademicSettings()
    }
  }, [collegeId, isUniversityWide, major])

  useEffect(() => {
    if (collegeId || isUniversityWide || major?.college_id) {
      fetchSubjects()
    }
  }, [collegeId, isUniversityWide, major?.college_id])

  const fetchCollegeAcademicSettings = async () => {
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

  const fetchUniversityAcademicSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('university_settings')
        .select('academic_settings')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching university academic settings:', error)
        return
      }

      if (data?.academic_settings?.credit_hours_source) {
        setCreditHoursSource(data.academic_settings.credit_hours_source)
      }
    } catch (err) {
      console.error('Error fetching university academic settings:', err)
    }
  }

  const fetchMajor = async () => {
    try {
      const { data, error } = await supabase
        .from('majors')
        .select('*, colleges(id, name_en)')
        .eq('id', id)
        .single()

      if (error) throw error
      setMajor(data)
      setCollegeId(data.college_id)
      setIsUniversityWide(data.is_university_wide || false)
      
      // Fetch existing major sheet if any
      const { data: sheetData, error: sheetError } = await supabase
        .from('major_sheets')
        .select('*')
        .eq('major_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!sheetError && sheetData) {
        setExistingMajorSheet(sheetData)
        setMajorSheet({
          version: sheetData.version || '',
          academic_year: sheetData.academic_year || '',
          effective_from: sheetData.effective_from || new Date().toISOString().split('T')[0],
          effective_to: sheetData.effective_to || '',
          sheet_type: sheetData.sheet_type || 'rule_based',
          total_credits_required: sheetData.total_credits_required || 120,
          min_credits_per_semester: sheetData.min_credits_per_semester || 12,
          max_credits_per_semester: sheetData.max_credits_per_semester || 18,
          min_gpa_for_graduation: sheetData.min_gpa_for_graduation || 2.0,
          description: sheetData.description || ''
        })

        // Fetch course groups and courses
        fetchMajorSheetDetails(sheetData.id)
      }
    } catch (err) {
      console.error('Error fetching major:', err)
      setError(err.message || 'Failed to load major')
    } finally {
      setFetching(false)
    }
  }

  const fetchMajorSheetDetails = async (majorSheetId) => {
    try {
      const { data: groups, error: groupsError } = await supabase
        .from('course_groups')
        .select('*')
        .eq('major_sheet_id', majorSheetId)
        .order('group_number')

      if (groupsError) throw groupsError

      if (groups && groups.length > 0) {
        // Fetch courses for each group
        const groupsWithCourses = await Promise.all(
          groups.map(async (group) => {
            const { data: courses, error: coursesError } = await supabase
              .from('major_sheet_courses')
              .select('*, subjects(id, code, name_en, name_ar, credit_hours)')
              .eq('course_group_id', group.id)
              .order('display_order')

            if (coursesError) throw coursesError

            return {
              ...group,
              courses: courses.map(c => ({
                subject_id: c.subject_id,
                is_mandatory: c.is_mandatory,
                is_capstone: c.is_capstone || false,
                academic_year: c.academic_year,
                semester_number: c.semester_number,
                display_order: c.display_order,
                notes: c.notes || ''
              }))
            }
          })
        )

        setCourseGroups(groupsWithCourses)
      }
    } catch (err) {
      console.error('Error fetching major sheet details:', err)
      setError(err.message || 'Failed to load major sheet details')
    }
  }

  const fetchSubjects = async () => {
    try {
      if (!id) return
      
      const currentCollegeId = major?.college_id || collegeId
      
      let query = supabase
        .from('subjects')
        .select('id, code, name_en, name_ar, credit_hours, type, major_id')
        .eq('status', 'active')
        .eq('major_id', parseInt(id)) // Only subjects for this major
        .order('code')

      if (!isUniversityWide && currentCollegeId) {
        query = query.or(`college_id.eq.${currentCollegeId},is_university_wide.eq.true`)
      } else if (isUniversityWide) {
        query = query.eq('is_university_wide', true)
      }

      const { data, error } = await query
      if (error) throw error
      setSubjects(data || [])
    } catch (err) {
      console.error('Error fetching subjects:', err)
      setSubjects([])
    }
  }

  const fetchAcademicYears = async () => {
    try {
      const currentCollegeId = major?.college_id || collegeId
      
      let query = supabase
        .from('academic_years')
        .select('id, name_en, code, start_date, end_date')
        .order('start_date', { ascending: false })

      if (userRole === 'user' && currentCollegeId) {
        query = query.eq('college_id', currentCollegeId).eq('is_university_wide', false)
      } else if (isUniversityWide) {
        query = query.eq('is_university_wide', true)
      } else if (currentCollegeId && userRole === 'admin') {
        query = query.or(`college_id.eq.${currentCollegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setAcademicYears(data || [])
      
      if (data && data.length > 0 && !majorSheet.academic_year) {
        setMajorSheet(prev => {
          const currentYear = new Date().getFullYear()
          const defaultFormat = `${currentYear}-${currentYear + 1}`
          if (!prev.academic_year || prev.academic_year === defaultFormat) {
            return { ...prev, academic_year: data[0].name_en || data[0].code }
          }
          return prev
        })
      }
    } catch (err) {
      console.error('Error fetching academic years:', err)
      setAcademicYears([])
    }
  }

  const handleMajorSheetChange = (field, value) => {
    setMajorSheet(prev => ({ ...prev, [field]: value }))
  }

  const handleCourseGroupChange = (groupIndex, field, value) => {
    setCourseGroups(prev => {
      const updated = [...prev]
      updated[groupIndex] = { ...updated[groupIndex], [field]: value }
      return updated
    })
  }

  const toggleGroupExpanded = (groupIndex) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupIndex]: !prev[groupIndex]
    }))
  }

  const addCourseToGroup = (groupIndex, subjectId) => {
    if (addingCourseRef.current) return
    
    const subject = subjects.find(s => s.id === subjectId)
    if (!subject) return

    addingCourseRef.current = true

    setCourseGroups(prev => {
      const updated = [...prev]
      const courseExists = updated[groupIndex].courses.some(c => c.subject_id === subjectId)
      if (courseExists) {
        addingCourseRef.current = false
        return prev
      }
      
      const course = {
        subject_id: subjectId,
        is_mandatory: updated[groupIndex].rule_type === 'all_required',
        is_capstone: false,
        academic_year: majorSheet.sheet_type === 'fixed_by_year' ? null : null,
        semester_number: majorSheet.sheet_type === 'fixed_by_year' ? null : null,
        display_order: updated[groupIndex].courses.length,
        notes: ''
      }
      
      updated[groupIndex] = {
        ...updated[groupIndex],
        courses: [...updated[groupIndex].courses, course]
      }
      
      if (updated[groupIndex].rule_type === 'choose_n_from_m') {
        updated[groupIndex].total_options = updated[groupIndex].courses.length
      }
      
      setTimeout(() => {
        addingCourseRef.current = false
      }, 300)
      
      return updated
    })
  }

  const removeCourseFromGroup = (groupIndex, courseIndex) => {
    setCourseGroups(prev => {
      const updated = [...prev]
      updated[groupIndex] = {
        ...updated[groupIndex],
        courses: updated[groupIndex].courses.filter((_, i) => i !== courseIndex)
      }
      if (updated[groupIndex].rule_type === 'choose_n_from_m') {
        updated[groupIndex].total_options = updated[groupIndex].courses.length
      }
      return updated
    })
  }

  const updateCourseInGroup = (groupIndex, courseIndex, field, value) => {
    setCourseGroups(prev => {
      const updated = [...prev]
      updated[groupIndex].courses[courseIndex] = {
        ...updated[groupIndex].courses[courseIndex],
        [field]: value
      }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      if (!majorSheet.version) {
        throw new Error('Version is required')
      }

      // Deactivate existing major sheet if updating
      if (existingMajorSheet) {
        await supabase
          .from('major_sheets')
          .update({ is_active: false })
          .eq('id', existingMajorSheet.id)
      }

      // Create new major sheet
      const majorSheetData = {
        major_id: parseInt(id),
        version: majorSheet.version,
        academic_year: majorSheet.academic_year,
        effective_from: majorSheet.effective_from,
        effective_to: majorSheet.effective_to || null,
        sheet_type: majorSheet.sheet_type,
        total_credits_required: parseInt(majorSheet.total_credits_required),
        min_credits_per_semester: parseInt(majorSheet.min_credits_per_semester),
        max_credits_per_semester: parseInt(majorSheet.max_credits_per_semester),
        min_gpa_for_graduation: parseFloat(majorSheet.min_gpa_for_graduation),
        description: majorSheet.description || null,
        is_active: true
      }

      const { data: sheetData, error: sheetError } = await supabase
        .from('major_sheets')
        .insert(majorSheetData)
        .select()
        .single()

      if (sheetError) throw sheetError

      // Delete old course groups and courses if updating
      if (existingMajorSheet) {
        const { data: oldGroups } = await supabase
          .from('course_groups')
          .select('id')
          .eq('major_sheet_id', existingMajorSheet.id)

        if (oldGroups && oldGroups.length > 0) {
          const groupIds = oldGroups.map(g => g.id)
          await supabase
            .from('major_sheet_courses')
            .delete()
            .in('course_group_id', groupIds)
          
          await supabase
            .from('course_groups')
            .delete()
            .in('id', groupIds)
        }
      }

      // Create course groups
      for (const group of courseGroups) {
        if (group.courses.length === 0 && group.rule_type === 'all_required') continue
        
        const groupData = {
          major_sheet_id: sheetData.id,
          group_type: group.group_type,
          group_name_en: group.group_name_en,
          group_name_ar: group.group_name_ar || null,
          group_number: group.group_number,
          min_credits_required: parseInt(group.min_credits_required) || 0,
          max_credits_allowed: group.max_credits_allowed ? parseInt(group.max_credits_allowed) : null,
          rule_type: group.rule_type,
          choose_count: group.choose_count ? parseInt(group.choose_count) : null,
          total_options: group.total_options ? parseInt(group.total_options) : null,
          allows_substitution: group.allows_substitution,
          requires_approval_for_substitution: group.requires_approval_for_substitution,
          min_gpa_required: group.min_gpa_required ? parseFloat(group.min_gpa_required) : null,
          description: group.description || null,
          display_order: group.group_number,
          is_active: true
        }

        const { data: groupDataResult, error: groupError } = await supabase
          .from('course_groups')
          .insert(groupData)
          .select()
          .single()

        if (groupError) throw groupError

        // Add courses to group
        for (const course of group.courses) {
          const courseData = {
            major_sheet_id: sheetData.id,
            course_group_id: groupDataResult.id,
            subject_id: parseInt(course.subject_id),
            is_mandatory: course.is_mandatory,
            is_capstone: course.is_capstone || false,
            academic_year: course.academic_year ? parseInt(course.academic_year) : null,
            semester_number: course.semester_number ? parseInt(course.semester_number) : null,
            display_order: course.display_order || 0,
            notes: course.notes || null
          }

          const { error: courseError } = await supabase
            .from('major_sheet_courses')
            .insert(courseData)

          if (courseError) throw courseError
        }
      }

      setSuccess(true)
      setExistingMajorSheet({ ...sheetData })
      setTimeout(() => {
        navigate(`/academic/majors/${id}`)
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to save degree plan')
      console.error('Error saving major sheet:', err)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!major) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Major not found
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/academic/majors/${id}`)}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900 mb-4`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Major</span>
          </button>
          <h1 className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            Configure Degree Plan - {major.name_en}
          </h1>
          <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            Define the academic structure and course requirements for this major
          </p>
        </div>

        {subjects.length === 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded">
            <p className="text-sm font-medium text-amber-800 mb-2">
              ⚠️ No Subjects Found for This Major
            </p>
            <p className="text-xs text-amber-700">
              You need to create subjects for this major first before configuring the degree plan. 
              <button
                onClick={() => navigate('/academic/subjects/create', { state: { majorId: id } })}
                className="ml-2 text-amber-900 underline font-semibold"
              >
                Create Subjects Now
              </button>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className={`mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                <Check className="w-5 h-5" />
                <span>Degree plan saved successfully! Redirecting...</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Major Sheet Basic Info */}
              <div className="border-t pt-6">
                <h4 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Major Sheet Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Version * (e.g., "2024-2025" or "v2.1")
                    </label>
                    <input
                      type="text"
                      value={majorSheet.version}
                      onChange={(e) => handleMajorSheetChange('version', e.target.value)}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder="2024-2025"
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Academic Year *
                    </label>
                    {academicYears.length > 0 ? (
                      <select
                        value={majorSheet.academic_year}
                        onChange={(e) => handleMajorSheetChange('academic_year', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      >
                        <option value="">Select Academic Year...</option>
                        {academicYears.map(year => (
                          <option key={year.id} value={year.name_en || year.code}>
                            {year.name_en || year.code} ({new Date(year.start_date).getFullYear()}-{new Date(year.end_date).getFullYear()})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={majorSheet.academic_year}
                          onChange={(e) => handleMajorSheetChange('academic_year', e.target.value)}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
                          placeholder="2024-2025"
                          required
                        />
                        <p className="text-xs text-yellow-600 mt-1">
                          No academic years found. Please create academic years first or enter manually.
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Sheet Type *
                    </label>
                    <select
                      value={majorSheet.sheet_type}
                      onChange={(e) => handleMajorSheetChange('sheet_type', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="rule_based">Rule-Based (Flexible - Choose N from M)</option>
                      <option value="fixed_by_year">Fixed-by-Year (No Student Choice)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {majorSheet.sheet_type === 'rule_based' 
                        ? 'Students can choose courses based on rules (e.g., choose 3 from 10)'
                        : 'All courses are predefined by year/semester, no student choice'}
                    </p>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Effective From *
                    </label>
                    <input
                      type="date"
                      value={majorSheet.effective_from}
                      onChange={(e) => handleMajorSheetChange('effective_from', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Effective To (Optional)
                    </label>
                    <input
                      type="date"
                      value={majorSheet.effective_to}
                      onChange={(e) => handleMajorSheetChange('effective_to', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Total Credits Required *
                    </label>
                    <input
                      type="number"
                      value={majorSheet.total_credits_required}
                      onChange={(e) => handleMajorSheetChange('total_credits_required', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  {/* Show credit hour fields only if source is 'major_sheet' */}
                  {creditHoursSource === 'major_sheet' && (
                    <>
                      <div>
                        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                          Min Credits per Semester *
                        </label>
                        <input
                          type="number"
                          value={majorSheet.min_credits_per_semester}
                          onChange={(e) => handleMajorSheetChange('min_credits_per_semester', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum credit hours required per semester for this major</p>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                          Max Credits per Semester *
                        </label>
                        <input
                          type="number"
                          value={majorSheet.max_credits_per_semester}
                          onChange={(e) => handleMajorSheetChange('max_credits_per_semester', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum credit hours allowed per semester for this major</p>
                      </div>
                    </>
                  )}

                  {/* Show info message if using semester source */}
                  {creditHoursSource === 'semester' && (
                    <div className="md:col-span-2">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> This college uses Semester Settings as the source for credit hour rules.
                          Credit hour limits are configured per semester (Create/Edit Semester), not in the major sheet.
                          These fields are shown for reference but will not be used for validation.
                        </p>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Min GPA for Graduation
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={majorSheet.min_gpa_for_graduation}
                      onChange={(e) => handleMajorSheetChange('min_gpa_for_graduation', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Course Groups */}
              <div className="border-t pt-6">
                <h4 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Course Groups Configuration
                </h4>
                <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Configure the 5 course groups with their rules and courses. Each group defines what students must complete.
                </p>

                {courseGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="mb-6 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpanded(groupIndex)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedGroups[groupIndex] ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <h5 className="font-semibold text-gray-900">
                            Group {group.group_number}: {group.group_name_en}
                          </h5>
                          <p className="text-xs text-gray-500">
                            {group.group_type.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {group.courses.length} course{group.courses.length !== 1 ? 's' : ''} added
                      </div>
                    </div>

                    {expandedGroups[groupIndex] && (
                      <div className="space-y-4 pl-8">
                        {/* Group Rules */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Group Name (English) *</label>
                            <input
                              type="text"
                              value={group.group_name_en}
                              onChange={(e) => handleCourseGroupChange(groupIndex, 'group_name_en', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Group Name (Arabic)</label>
                            <input
                              type="text"
                              value={group.group_name_ar}
                              onChange={(e) => handleCourseGroupChange(groupIndex, 'group_name_ar', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type *</label>
                            <select
                              value={group.rule_type}
                              onChange={(e) => {
                                handleCourseGroupChange(groupIndex, 'rule_type', e.target.value)
                                if (e.target.value === 'all_required') {
                                  setCourseGroups(prev => {
                                    const updated = [...prev]
                                    updated[groupIndex].courses = updated[groupIndex].courses.map(c => ({
                                      ...c,
                                      is_mandatory: true
                                    }))
                                    return updated
                                  })
                                }
                              }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              required
                            >
                              <option value="all_required">All Required (Mandatory)</option>
                              <option value="choose_n_from_m">Choose N from M</option>
                              <option value="flexible">Flexible (Minimum Credits)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Min Credits Required *</label>
                            <input
                              type="number"
                              value={group.min_credits_required}
                              onChange={(e) => handleCourseGroupChange(groupIndex, 'min_credits_required', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              required
                            />
                          </div>
                          {group.rule_type === 'choose_n_from_m' && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Choose Count (N) *</label>
                                <input
                                  type="number"
                                  value={group.choose_count || ''}
                                  onChange={(e) => handleCourseGroupChange(groupIndex, 'choose_count', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                  placeholder="e.g., 3"
                                  required={group.rule_type === 'choose_n_from_m'}
                                />
                                <p className="text-xs text-gray-500 mt-1">Number of courses student must choose</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Total Options (M)</label>
                                <input
                                  type="number"
                                  value={group.total_options || group.courses.length}
                                  onChange={(e) => handleCourseGroupChange(groupIndex, 'total_options', e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-50"
                                  placeholder="Auto-calculated from courses"
                                  readOnly
                                />
                                <p className="text-xs text-gray-500 mt-1">Total courses available (auto-updated when courses are added)</p>
                              </div>
                            </>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Credits Allowed</label>
                            <input
                              type="number"
                              value={group.max_credits_allowed || ''}
                              onChange={(e) => handleCourseGroupChange(groupIndex, 'max_credits_allowed', e.target.value || null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Min GPA Required</label>
                            <input
                              type="number"
                              step="0.1"
                              value={group.min_gpa_required || ''}
                              onChange={(e) => handleCourseGroupChange(groupIndex, 'min_gpa_required', e.target.value || null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              placeholder="Optional"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={group.allows_substitution}
                              onChange={(e) => handleCourseGroupChange(groupIndex, 'allows_substitution', e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">Allows Substitution</span>
                          </label>
                          {group.allows_substitution && (
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={group.requires_approval_for_substitution}
                                onChange={(e) => handleCourseGroupChange(groupIndex, 'requires_approval_for_substitution', e.target.checked)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">Requires Approval for Substitution</span>
                            </label>
                          )}
                        </div>

                        {/* Add Course to Group */}
                        <div className="border-t pt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Add Course to This Group</label>
                          <div className="flex space-x-2">
                            <select
                              value=""
                              onChange={(e) => {
                                const selectedValue = e.target.value
                                if (selectedValue && !addingCourseRef.current) {
                                  const subjectId = parseInt(selectedValue)
                                  addCourseToGroup(groupIndex, subjectId)
                                  e.target.value = ''
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="">Select a course...</option>
                              {subjects
                                .filter(s => !group.courses.some(c => c.subject_id === s.id))
                                .map(subject => (
                                  <option key={subject.id} value={subject.id}>
                                    {subject.code} - {subject.name_en} ({subject.credit_hours} credits)
                                  </option>
                                ))}
                            </select>
                          </div>
                          {subjects.length === 0 && (
                            <div className="text-xs text-amber-600 mt-2 space-y-1">
                              <p className="font-medium">
                                ⚠️ No subjects found for this major.
                              </p>
                              <p>
                                Please create subjects for this major first before configuring the degree plan.
                                <button
                                  type="button"
                                  onClick={() => navigate('/academic/subjects/create', { state: { majorId: parseInt(id) } })}
                                  className="ml-2 text-amber-900 underline font-semibold"
                                >
                                  Create Subjects Now
                                </button>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Courses in Group */}
                        {group.courses.length > 0 && (
                          <div className="border-t pt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Courses in This Group ({group.courses.length})
                            </label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {group.courses.map((course, courseIndex) => {
                                const subject = subjects.find(s => s.id === course.subject_id)
                                return (
                                  <div key={courseIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">
                                        {subject ? `${subject.code} - ${subject.name_en}` : `Subject ID: ${course.subject_id}`}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {subject ? `${subject.credit_hours} credits` : 'Subject not found'}
                                      </div>
                                      {majorSheet.sheet_type === 'fixed_by_year' && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                          <div>
                                            <label className="text-xs text-gray-600">Academic Year</label>
                                            <input
                                              type="number"
                                              min="1"
                                              max="10"
                                              value={course.academic_year || ''}
                                              onChange={(e) => updateCourseInGroup(groupIndex, courseIndex, 'academic_year', e.target.value)}
                                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                              placeholder="Year 1-4"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-gray-600">Semester</label>
                                            <select
                                              value={course.semester_number || ''}
                                              onChange={(e) => updateCourseInGroup(groupIndex, courseIndex, 'semester_number', e.target.value)}
                                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                            >
                                              <option value="">Select...</option>
                                              <option value="1">Semester 1</option>
                                              <option value="2">Semester 2</option>
                                              <option value="3">Summer</option>
                                            </select>
                                          </div>
                                        </div>
                                      )}
                                      {group.rule_type !== 'all_required' && (
                                        <label className="flex items-center space-x-2 mt-2">
                                          <input
                                            type="checkbox"
                                            checked={course.is_mandatory}
                                            onChange={(e) => updateCourseInGroup(groupIndex, courseIndex, 'is_mandatory', e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                          />
                                          <span className="text-xs text-gray-700">Mandatory</span>
                                        </label>
                                      )}
                                      <label className="flex items-center space-x-2 mt-2">
                                        <input
                                          type="checkbox"
                                          checked={course.is_capstone || false}
                                          onChange={(e) => updateCourseInGroup(groupIndex, courseIndex, 'is_capstone', e.target.checked)}
                                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-xs text-gray-700">Capstone/Final Year Course</span>
                                      </label>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeCourseFromGroup(groupIndex, courseIndex)}
                                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                            {group.rule_type === 'choose_n_from_m' && (
                              <p className="text-xs text-blue-600 mt-2">
                                Total options: {group.courses.length}. Students must choose {group.choose_count || 'N'} from these.
                              </p>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                          <textarea
                            value={group.description}
                            onChange={(e) => handleCourseGroupChange(groupIndex, 'description', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            rows="2"
                            placeholder="Optional description for this course group"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`flex ${isRTL ? 'justify-start space-x-reverse' : 'justify-end space-x-4'}`}>
            <button
              type="button"
              onClick={() => navigate(`/academic/majors/${id}`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || subjects.length === 0}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Saving...' : existingMajorSheet ? 'Update Degree Plan' : 'Save Degree Plan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

