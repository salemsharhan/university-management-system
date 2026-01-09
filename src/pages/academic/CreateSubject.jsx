import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check } from 'lucide-react'

export default function CreateSubject() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(null)
  const [selectedCollegeId, setSelectedCollegeId] = useState(null)
  const [colleges, setColleges] = useState([])
  const [majors, setMajors] = useState([])
  const [semesters, setSemesters] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [instructors, setInstructors] = useState([])
  const [gradeTypes, setGradeTypes] = useState([])
  const [gradeConfiguration, setGradeConfiguration] = useState([])

  const [formData, setFormData] = useState({
    major_id: '',
    code: '',
    name_en: '',
    name_ar: '',
    type: 'core',
    semester_id: '',
    credit_hours: 3,
    theory_hours: 3,
    lab_hours: 0,
    tutorial_hours: 0,
    lab_fee: '',
    material_fee: '',
    instructor_id: '',
    instructor_name: '',
    instructor_email: '',
    textbook: '',
    is_elective: false,
    description: '',
    description_ar: '',
    prerequisites: [],
    corequisites: [],
    status: 'active',
    college_id: null,
    is_university_wide: false,
  })

  useEffect(() => {
    // Check if college ID is passed via URL parameter
    const urlCollegeId = searchParams.get('collegeId')
    if (urlCollegeId && userRole === 'admin') {
      const collegeIdInt = parseInt(urlCollegeId)
      setCollegeId(collegeIdInt)
      setSelectedCollegeId(collegeIdInt)
      setFormData(prev => ({ ...prev, college_id: collegeIdInt, is_university_wide: false }))
    } else if (userRole === 'user' && authCollegeId) {
      // For college admins, use their college ID
      setCollegeId(authCollegeId)
      setSelectedCollegeId(authCollegeId)
      setFormData(prev => ({ ...prev, college_id: authCollegeId, is_university_wide: false }))
    } else {
      fetchUserCollege()
    }
    
    if (userRole === 'admin') {
      fetchColleges()
    }
    fetchMajors()
    fetchInstructors()
    fetchGradeTypes()
  }, [userRole, authCollegeId, collegeId, searchParams])

  useEffect(() => {
    if (collegeId || authCollegeId) {
      fetchSemesters()
    }
  }, [collegeId, authCollegeId, userRole])

  useEffect(() => {
    if (formData.semester_id && (collegeId || authCollegeId)) {
      fetchSubjects()
    } else {
      setAllSubjects([])
    }
  }, [formData.semester_id, collegeId, authCollegeId])

  const fetchUserCollege = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data: userData } = await supabase
        .from('users')
        .select('college_id')
        .eq('email', user.email)
        .single()

      if (userData?.college_id) {
        setCollegeId(userData.college_id)
        setSelectedCollegeId(userData.college_id)
        setFormData(prev => ({ ...prev, college_id: userData.college_id }))
      }
    } catch (err) {
      console.error('Error fetching college ID:', err)
    }
  }

  const fetchColleges = async () => {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name_en, code')
        .eq('status', 'active')
        .order('name_en')

      if (error) throw error
      setColleges(data || [])
    } catch (err) {
      console.error('Error fetching colleges:', err)
    }
  }

  const fetchMajors = async () => {
    try {
      let query = supabase
        .from('majors')
        .select('id, name_en, code')
        .order('name_en', { ascending: true })

      // For college admins (user role), filter by their college only
      if (userRole === 'user' && authCollegeId) {
        query = query.eq('college_id', authCollegeId)
      }
      // For super admins, filter by selected college
      else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId).eq('is_university_wide', false)
      }

      const { data, error } = await query
      if (error) throw error
      setMajors(data || [])
    } catch (err) {
      console.error('Error fetching majors:', err)
    }
  }

  const fetchSemesters = async () => {
    const targetCollegeId = collegeId || authCollegeId
    if (!targetCollegeId) return

    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, code, start_date, end_date, status, academic_year_number')
        .order('start_date', { ascending: false })

      // Filter by college - only show semesters for the selected college
      if (userRole === 'user' && authCollegeId) {
        query = query.eq('college_id', authCollegeId).eq('is_university_wide', false)
      } else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId).eq('is_university_wide', false)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setSemesters([])
    }
  }

  const fetchSubjects = async () => {
    try {
      // Need at least semester_id to determine which subjects to show
      if (!formData.semester_id) return

      // Determine the target college ID
      const targetCollegeId = collegeId || authCollegeId
      if (!targetCollegeId) {
        // No college selected yet, clear subjects
        setAllSubjects([])
        return
      }

      // Get the selected semester to find its academic_year_number
      const selectedSemester = semesters.find(s => s.id === parseInt(formData.semester_id))
      if (!selectedSemester) return

      // Fetch academic_year_number from the semester record
      const { data: semesterData, error: semesterError } = await supabase
        .from('semesters')
        .select('academic_year_number')
        .eq('id', formData.semester_id)
        .single()

      if (semesterError || !semesterData) {
        console.error('Error fetching semester data:', semesterError)
        return
      }

      const semesterNumber = semesterData.academic_year_number || 1

      // Fetch subjects from the selected college only
      // Allow subjects from any major within the same college
      // Show subjects from previous semesters (for prerequisites) and same semester (for corequisites)
      let query = supabase
        .from('subjects')
        .select('id, name_en, code, semester_number, major_id, majors(name_en)')
        .eq('status', 'active')
        .eq('college_id', targetCollegeId)
        .eq('is_university_wide', false)
        .lte('semester_number', semesterNumber) // Include same semester for corequisites
        .order('semester_number')
        .order('code')

      const { data, error } = await query
      if (error) throw error
      setAllSubjects(data || [])
    } catch (err) {
      console.error('Error fetching subjects:', err)
      setAllSubjects([])
    }
  }

  const fetchInstructors = async () => {
    try {
      let query = supabase
        .from('instructors')
        .select('id, name_en, name_ar, email, phone, title')
        .order('name_en', { ascending: true })

      // For college admins (user role), always filter by their college
      if (userRole === 'user' && authCollegeId) {
        query = query.eq('college_id', authCollegeId)
      }
      // For super admins, filter by selected college
      else if (userRole === 'admin' && collegeId) {
        query = query.eq('college_id', collegeId)
      }

      const { data, error } = await query
      if (error) throw error
      setInstructors(data || [])
    } catch (err) {
      console.error('Error fetching instructors:', err)
    }
  }

  const fetchGradeTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('university_settings')
        .select('grade_types')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data?.grade_types && Array.isArray(data.grade_types)) {
        setGradeTypes(data.grade_types)
      }
    } catch (err) {
      console.error('Error fetching grade types:', err)
    }
  }

  const handleAddGradeType = () => {
    const selectedTypeCode = document.getElementById('grade-type-select')?.value
    if (!selectedTypeCode) return

    const selectedType = gradeTypes.find(gt => gt.code === selectedTypeCode)
    if (!selectedType) return

    // Check if this type is already added
    if (gradeConfiguration.some(gc => gc.grade_type_code === selectedTypeCode)) {
      return
    }

    const newConfig = {
      grade_type_id: selectedType.id || selectedTypeCode,
      grade_type_code: selectedType.code,
      grade_type_name_en: selectedType.name_en,
      grade_type_name_ar: selectedType.name_ar,
      maximum: '',
      minimum: '',
      pass_score: '',
      fail_score: '',
      weight: ''
    }

    setGradeConfiguration([...gradeConfiguration, newConfig])
    // Reset select
    if (document.getElementById('grade-type-select')) {
      document.getElementById('grade-type-select').value = ''
    }
  }

  const handleRemoveGradeType = (index) => {
    setGradeConfiguration(gradeConfiguration.filter((_, i) => i !== index))
  }

  const handleGradeConfigChange = (index, field, value) => {
    const updated = [...gradeConfiguration]
    updated[index] = { ...updated[index], [field]: value }
    setGradeConfiguration(updated)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePrerequisiteChange = (subjectId, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        prerequisites: [...prev.prerequisites, parseInt(subjectId)]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        prerequisites: prev.prerequisites.filter(id => id !== parseInt(subjectId))
      }))
    }
  }

  const handleCorequisiteChange = (subjectId, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        corequisites: [...prev.corequisites, parseInt(subjectId)]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        corequisites: prev.corequisites.filter(id => id !== parseInt(subjectId))
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Get semester_number from the selected semester
      const selectedSemester = semesters.find(s => s.id === parseInt(formData.semester_id))
      if (!selectedSemester) {
        setError('Please select a valid semester')
        setLoading(false)
        return
      }

      // Fetch semester to get academic_year_number which represents the semester number (1, 2, 3, etc.)
      const { data: semesterData, error: semesterError } = await supabase
        .from('semesters')
        .select('academic_year_number')
        .eq('id', formData.semester_id)
        .single()

      if (semesterError || !semesterData) {
        setError('Failed to fetch semester information')
        setLoading(false)
        return
      }

      // Use academic_year_number as semester_number, or default to 1 if not set
      const semesterNumber = semesterData.academic_year_number || 1

      const submitData = {
        major_id: parseInt(formData.major_id),
        code: formData.code,
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        type: formData.type,
        semester_number: semesterNumber,
        credit_hours: parseInt(formData.credit_hours),
        theory_hours: parseInt(formData.theory_hours),
        lab_hours: parseInt(formData.lab_hours) || 0,
        tutorial_hours: parseInt(formData.tutorial_hours) || 0,
        lab_fee: formData.lab_fee ? parseFloat(formData.lab_fee) : null,
        material_fee: formData.material_fee ? parseFloat(formData.material_fee) : null,
        instructor_id: formData.instructor_id ? parseInt(formData.instructor_id) : null,
        instructor_name: formData.instructor_name || null,
        instructor_email: formData.instructor_email || null,
        textbook: formData.textbook || null,
        is_elective: formData.is_elective,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        status: formData.status,
        is_university_wide: false,
        college_id: formData.college_id || collegeId,
        grade_configuration: gradeConfiguration.map(gc => ({
          grade_type_id: gc.grade_type_id,
          grade_type_code: gc.grade_type_code,
          grade_type_name_en: gc.grade_type_name_en,
          grade_type_name_ar: gc.grade_type_name_ar,
          maximum: gc.maximum ? parseFloat(gc.maximum) : null,
          minimum: gc.minimum ? parseFloat(gc.minimum) : null,
          pass_score: gc.pass_score ? parseFloat(gc.pass_score) : null,
          fail_score: gc.fail_score ? parseFloat(gc.fail_score) : null,
          weight: gc.weight ? parseFloat(gc.weight) : null,
        })),
      }

      const { data: subject, error: insertError } = await supabase
        .from('subjects')
        .insert(submitData)
        .select()
        .single()

      if (insertError) throw insertError

      // Insert prerequisites
      if (formData.prerequisites.length > 0) {
        const prereqData = formData.prerequisites.map(prereqId => ({
          subject_id: subject.id,
          prerequisite_subject_id: prereqId
        }))
        await supabase.from('subject_prerequisites').insert(prereqData)
      }

      // Insert corequisites
      if (formData.corequisites.length > 0) {
        const coreqData = formData.corequisites.map(coreqId => ({
          subject_id: subject.id,
          corequisite_subject_id: coreqId
        }))
        await supabase.from('subject_corequisites').insert(coreqData)
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/academic/subjects')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to create subject')
      console.error('Error creating subject:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900 mb-4`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('universitySettings.back')}</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{t('subjectsForm.createTitle')}</h1>
          <p className="text-gray-600 mt-1">{t('subjectsForm.createSubtitle')}</p>
        </div>

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
                <span>{t('subjectsForm.created')}</span>
              </div>
            )}

            <div className="space-y-6">
              {userRole === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.college')} *</label>
                  <select
                    value={selectedCollegeId || ''}
                    onChange={(e) => {
                      const collegeIdValue = e.target.value ? parseInt(e.target.value) : null
                      setCollegeId(collegeIdValue)
                      setSelectedCollegeId(collegeIdValue)
                      setFormData(prev => ({ ...prev, college_id: collegeIdValue, semester_id: '' }))
                      // Clear major and semester selection when college changes
                      handleChange('major_id', '')
                      handleChange('semester_id', '')
                      fetchMajors()
                      fetchSemesters()
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{t('subjectsForm.selectCollege')}</option>
                    {colleges.map((college) => (
                      <option key={college.id} value={college.id}>
                        {college.name_en} ({college.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.major')} *</label>
                  <select
                    value={formData.major_id}
                    onChange={(e) => handleChange('major_id', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{t('subjectsForm.selectMajor')}</option>
                    {majors.map(major => (
                      <option key={major.id} value={major.id}>{major.name_en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.code')} *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., CS101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.name')} *</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={(e) => handleChange('name_en', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Introduction to Programming"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.nameAr')}</label>
                  <input
                    type="text"
                    value={formData.name_ar}
                    onChange={(e) => handleChange('name_ar', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="مقدمة في البرمجة"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.type')} *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="core">{t('subjectsForm.typeCore')}</option>
                    <option value="elective">{t('subjectsForm.typeElective')}</option>
                    <option value="general">{t('subjectsForm.typeGeneral')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.semester')} *</label>
                  <select
                    value={formData.semester_id}
                    onChange={(e) => {
                      handleChange('semester_id', e.target.value)
                      // Clear prerequisites/corequisites when semester changes
                      handleChange('prerequisites', [])
                      handleChange('corequisites', [])
                    }}
                    required
                    disabled={!collegeId && !authCollegeId}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">{t('subjectsForm.selectSemester')}</option>
                    {semesters.map(semester => (
                      <option key={semester.id} value={semester.id}>
                        {semester.name_en} ({semester.code}) {semester.status === 'active' ? `- ${t('common.active')}` : ''}
                      </option>
                    ))}
                  </select>
                  {(!collegeId && !authCollegeId) && (
                    <p className="text-xs text-gray-500 mt-1">{t('subjectsForm.selectCollegeFirst')}</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.semesters.creditHoursConfig')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.creditHours')} *</label>
                    <input
                      type="number"
                      value={formData.credit_hours}
                      onChange={(e) => handleChange('credit_hours', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.theoryHours')} *</label>
                    <input
                      type="number"
                      value={formData.theory_hours}
                      onChange={(e) => handleChange('theory_hours', e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.labHours')}</label>
                    <input
                      type="number"
                      value={formData.lab_hours}
                      onChange={(e) => handleChange('lab_hours', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.tutorialHours')}</label>
                    <input
                      type="number"
                      value={formData.tutorial_hours}
                      onChange={(e) => handleChange('tutorial_hours', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.prerequisitesCorequisites')}</h3>
                {formData.semester_id && (collegeId || authCollegeId) ? (
                  allSubjects.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.prerequisites')}</label>
                      <p className="text-xs text-gray-500 mb-2">{t('subjectsForm.selectMultipleHint')}</p>
                      <select
                        multiple
                        size={5}
                        value={formData.prerequisites.map(String)}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                          setFormData(prev => ({ ...prev, prerequisites: selected }))
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {allSubjects.map(subject => {
                          const majorName = subject.majors?.name_en || ''
                          return (
                            <option key={subject.id} value={subject.id}>
                              {subject.code} - {subject.name_en} {majorName ? `(${majorName})` : ''} - {t('academic.subjects.semester')} {subject.semester_number}
                            </option>
                          )
                        })}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        {t('subjectsForm.prerequisitesHint')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.corequisites')}</label>
                      <p className="text-xs text-gray-500 mb-2">{t('subjectsForm.selectMultipleHint')}</p>
                      <select
                        multiple
                        size={5}
                        value={formData.corequisites.map(String)}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                          setFormData(prev => ({ ...prev, corequisites: selected }))
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {allSubjects.map(subject => {
                          const majorName = subject.majors?.name_en || ''
                          return (
                            <option key={subject.id} value={subject.id}>
                              {subject.code} - {subject.name_en} {majorName ? `(${majorName})` : ''} - {t('academic.subjects.semester')} {subject.semester_number}
                            </option>
                          )
                        })}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        {t('subjectsForm.corequisitesHint')}
                      </p>
                    </div>
                  </div>
                  ) : (
                    <p className="text-sm text-gray-500">{t('subjectsForm.noSubjectsInCollege')}</p>
                  )
                ) : (
                  <p className="text-sm text-gray-500">{t('subjectsForm.selectSemesterToSee')}</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.optionalInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.instructor')}</label>
                    <select
                      value={formData.instructor_id}
                      onChange={(e) => {
                        const instructorId = e.target.value
                        handleChange('instructor_id', instructorId)
                        if (instructorId) {
                          const instructor = instructors.find(inst => inst.id === parseInt(instructorId))
                          if (instructor) {
                            handleChange('instructor_name', instructor.name_en || '')
                            handleChange('instructor_email', instructor.email || '')
                          }
                        } else {
                          handleChange('instructor_name', '')
                          handleChange('instructor_email', '')
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">{t('subjectsForm.selectInstructor')}</option>
                      {instructors.map(instructor => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.name_en} {instructor.title ? `(${instructor.title})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.labFee')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.lab_fee}
                      onChange={(e) => handleChange('lab_fee', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.materialFee')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.material_fee}
                      onChange={(e) => handleChange('material_fee', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.textbook')}</label>
                    <input
                      type="text"
                      value={formData.textbook}
                      onChange={(e) => handleChange('textbook', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Introduction to Programming, 5th Edition"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.gradeConfiguration')}</h3>
                <p className="text-sm text-gray-600 mb-4">{t('subjectsForm.gradeConfigurationDesc')}</p>
                
                {gradeTypes.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
                    <p>{t('subjectsForm.noGradeTypes')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Add Grade Type */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.selectGradeType')}</label>
                      <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                        <select
                          id="grade-type-select"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">{t('subjectsForm.selectGradeType')}</option>
                          {gradeTypes
                            .filter(gt => !gradeConfiguration.some(gc => gc.grade_type_code === gt.code))
                            .map(gradeType => (
                              <option key={gradeType.code} value={gradeType.code}>
                                {gradeType.name_en} ({gradeType.code})
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddGradeType}
                          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors`}
                        >
                          <span>{t('subjectsForm.addGradeType')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Configured Grade Types */}
                    {gradeConfiguration.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700">{t('subjectsForm.configuredTypes')}</h4>
                        {gradeConfiguration.map((config, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'} mb-4`}>
                              <h5 className="font-medium text-gray-900">
                                {config.grade_type_name_en} ({config.grade_type_code})
                              </h5>
                              <button
                                type="button"
                                onClick={() => handleRemoveGradeType(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                {t('subjectsForm.remove')}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t('subjectsForm.maximum')} *</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={config.maximum}
                                  onChange={(e) => handleGradeConfigChange(index, 'maximum', e.target.value)}
                                  required
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t('subjectsForm.minimum')}</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={config.minimum}
                                  onChange={(e) => handleGradeConfigChange(index, 'minimum', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t('subjectsForm.passScore')} *</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={config.pass_score}
                                  onChange={(e) => handleGradeConfigChange(index, 'pass_score', e.target.value)}
                                  required
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t('subjectsForm.failScore')}</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={config.fail_score}
                                  onChange={(e) => handleGradeConfigChange(index, 'fail_score', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t('subjectsForm.weight')}</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={config.weight}
                                  onChange={(e) => handleGradeConfigChange(index, 'weight', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  placeholder="%"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Brief description of the subject..."
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectsForm.descriptionAr')}</label>
                  <textarea
                    value={formData.description_ar}
                    onChange={(e) => handleChange('description_ar', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="وصف موجز للمادة..."
                  />
                </div>
              </div>

              <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                <input
                  type="checkbox"
                  checked={formData.is_elective}
                  onChange={(e) => handleChange('is_elective', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-gray-700">{t('subjectsForm.isElective')}</label>
              </div>

              <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                <input
                  type="checkbox"
                  checked={formData.status === 'active'}
                  onChange={(e) => handleChange('status', e.target.checked ? 'active' : 'inactive')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label className="text-sm font-medium text-gray-700">{t('subjectsForm.active')}</label>
              </div>
            </div>
          </div>

          <div className={`flex ${isRTL ? 'justify-start space-x-reverse space-x-4' : 'justify-end space-x-4'}`}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('subjectsForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Save className="w-5 h-5" />
              <span>{loading ? t('subjectsForm.creating') : t('subjectsForm.create')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


