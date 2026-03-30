import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { ArrowLeft, ArrowRight, Save, Calendar, FileText, BookOpen, Calculator, Building2 } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'

export default function CreateExamination() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const { selectedCollegeId, requiresCollegeSelection, colleges, setSelectedCollegeId } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const isArabicLayout = isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')

  const [classes, setClasses] = useState([])
  const [semesters, setSemesters] = useState([])
  const [examTypes] = useState([
    'Midterm',
    'Final',
    'Quiz',
    'Assignment',
    'Project',
    'Lab Exam',
    'Oral Exam',
    'Practical',
    'Other'
  ])

  const [formData, setFormData] = useState({
    exam_name: '',
    exam_code: '',
    class_id: '',
    semester_id: '',
    exam_type: '',
    description: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    total_marks: '',
    passing_marks: '',
    weight_percentage: '',
    instructions: '',
    allow_calculator: false,
    allow_notes: false,
    allow_textbook: false,
    other_allowed_materials: '',
    is_university_wide: false,
  })

  useEffect(() => {
    if (requiresCollegeSelection) {
      return
    }
    if (collegeId) {
      fetchSemesters()
    }
  }, [collegeId, userRole, requiresCollegeSelection])

  useEffect(() => {
    if (formData.semester_id) {
      fetchClasses()
    }
  }, [formData.semester_id, collegeId, userRole])

  const fetchSemesters = async () => {
    if (!collegeId) return
    
    try {
      let query = supabase
        .from('semesters')
        .select('id, name_en, name_ar, code, start_date, end_date, status')
        .order('start_date', { ascending: false })

      // For instructors, filter by their college
      if (userRole === 'instructor' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setSemesters(data || [])
    } catch (err) {
      console.error('Error fetching semesters:', err)
      setError(t('examinations.create.messages.failedToLoadSemesters'))
    }
  }

  const fetchClasses = async () => {
    if (!collegeId) return
    
    try {
      let query = supabase
        .from('classes')
        .select(`
          id,
          code,
          section,
          subjects (
            id,
            name_en,
            name_ar,
            code
          )
        `)
        .eq('semester_id', formData.semester_id)
        .eq('status', 'active')
        .order('code')

      // For instructors, filter by their college
      if (userRole === 'instructor' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      } else if (collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError(t('examinations.create.messages.failedToLoadClasses'))
    }
  }

  const calculateDuration = () => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`)
      const end = new Date(`2000-01-01T${formData.end_time}`)
      if (end < start) {
        // Handle case where end time is next day
        end.setDate(end.getDate() + 1)
      }
      const diffMs = end - start
      const diffMinutes = Math.floor(diffMs / 60000)
      return diffMinutes
    }
    return 0
  }

  const getExamTypeLabel = (examType) => {
    if (!examType) return ''
    const lower = examType.toLowerCase()
    if (lower.includes('final')) return t('examinations.types.final')
    if (lower.includes('midterm')) return t('examinations.types.midterm')
    if (lower.includes('quiz')) return t('examinations.types.quiz')
    if (lower.includes('assignment')) return t('examinations.types.assignment')
    if (lower.includes('project')) return t('examinations.types.project')
    if (lower.includes('lab')) return t('examinations.types.lab')
    if (lower.includes('oral')) return t('examinations.types.oral')
    if (lower.includes('practical')) return t('examinations.types.practical')
    if (lower.includes('other')) return t('examinations.types.other')
    return examType
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validation
    if (!formData.exam_name || !formData.exam_code || !formData.class_id || 
        !formData.semester_id || !formData.exam_type || !formData.exam_date || 
        !formData.start_time || !formData.end_time || !formData.total_marks || 
        !formData.weight_percentage) {
      setError(t('examinations.create.messages.fillRequired'))
      return
    }

    // Validate dates
    const examDate = new Date(formData.exam_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (examDate < today) {
      setError(t('examinations.create.messages.datePast'))
      return
    }

    // Validate times
    if (formData.start_time >= formData.end_time) {
      setError(t('examinations.create.messages.endAfterStart'))
      return
    }

    // Validate marks
    if (parseFloat(formData.total_marks) <= 0) {
      setError(t('examinations.create.messages.totalMarksPositive'))
      return
    }

    if (formData.passing_marks && parseFloat(formData.passing_marks) > parseFloat(formData.total_marks)) {
      setError(t('examinations.create.messages.passingExceedsTotal'))
      return
    }

    // Validate weight percentage
    if (parseFloat(formData.weight_percentage) < 0 || parseFloat(formData.weight_percentage) > 100) {
      setError(t('examinations.create.messages.weightRange'))
      return
    }

    // Get college_id from selected class
    let examCollegeId = collegeId
    if (userRole === 'admin') {
      // For admin, get college_id from the selected class
      const selectedClass = classes.find(c => c.id === parseInt(formData.class_id))
      if (selectedClass) {
        const { data: classData } = await supabase
          .from('classes')
          .select('college_id')
          .eq('id', selectedClass.id)
          .limit(1)
        
        if (classData && classData.length > 0) {
          examCollegeId = classData[0].college_id
        }
      }
    }

    if (!examCollegeId) {
      setError(t('examinations.create.messages.collegeIdRequired'))
      return
    }

    setLoading(true)

    try {
      const duration = calculateDuration()

      // Map exam_type to the enum type value
      const mapExamTypeToEnum = (examType) => {
        const lowerType = examType.toLowerCase()
        if (lowerType.includes('midterm')) return 'midterm'
        if (lowerType.includes('final')) return 'final'
        if (lowerType.includes('quiz')) return 'quiz'
        if (lowerType.includes('assignment')) return 'assignment'
        if (lowerType.includes('project')) return 'project'
        return 'quiz' // Default fallback
      }

      const { error } = await supabase
        .from('examinations')
        .insert({
          // New columns
          exam_name: formData.exam_name.trim(),
          exam_code: formData.exam_code.trim().toUpperCase(),
          exam_type: formData.exam_type,
          exam_date: formData.exam_date,
          semester_id: parseInt(formData.semester_id),
          duration_minutes: duration,
          weight_percentage: parseFloat(formData.weight_percentage),
          allow_calculator: formData.allow_calculator,
          allow_notes: formData.allow_notes,
          allow_textbook: formData.allow_textbook,
          other_allowed_materials: formData.other_allowed_materials.trim() || null,
          college_id: examCollegeId,
          is_university_wide: formData.is_university_wide,
          // Old columns (required by initial schema)
          class_id: parseInt(formData.class_id),
          type: mapExamTypeToEnum(formData.exam_type), // Map to enum type
          title: formData.exam_name.trim(), // Use exam_name as title
          date: formData.exam_date, // Use exam_date as date
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: null, // Can be added later if needed
          total_marks: parseFloat(formData.total_marks),
          passing_marks: formData.passing_marks ? parseFloat(formData.passing_marks) : parseFloat(formData.total_marks) * 0.5, // Default to 50% if not provided
          weightage: parseFloat(formData.weight_percentage), // Use weight_percentage as weightage
          description: formData.description.trim() || null,
          instructions: formData.instructions.trim() || null,
          status: 'scheduled',
        })
        .select()
        .single()

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        navigate('/examinations')
      }, 1500)
    } catch (err) {
      console.error('Error creating examination:', err)
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className={`space-y-6 ${isArabicLayout ? 'text-right' : 'text-left'}`} dir={isArabicLayout ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'}`}>
          <button
            onClick={() => navigate('/examinations')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isArabicLayout ? (
              <ArrowRight className="w-5 h-5 text-gray-600" />
            ) : (
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            )}
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('examinations.create.title')}</h1>
            <p className="text-gray-600 mt-1">{t('examinations.create.subtitle')}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {t('examinations.create.messages.createdSuccess')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* College Selector for Admin - Must be selected first */}
        {userRole === 'admin' && (
          <div className={`rounded-lg p-6 ${requiresCollegeSelection ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-blue-50 border border-blue-200'}`}>
            <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-4' : 'space-x-4'}`}>
              <Building2 className={`w-6 h-6 ${requiresCollegeSelection ? 'text-yellow-600' : 'text-blue-600'}`} />
              <div className="flex-1">
                <p className={`text-base font-semibold ${requiresCollegeSelection ? 'text-yellow-900' : 'text-blue-900'}`}>
                  {requiresCollegeSelection ? t('examinations.create.collegeSelectionRequired') : t('examinations.create.selectedCollege')}
                </p>
                <p className={`text-sm ${requiresCollegeSelection ? 'text-yellow-700' : 'text-blue-700'}`}>
                  {requiresCollegeSelection 
                    ? t('examinations.create.selectCollegePrompt') 
                    : `${t('examinations.create.workingWith')}: ${getLocalizedName(colleges.find(c => c.id === selectedCollegeId), isArabicLayout) || t('common.unknown')}`}
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
                <option value="">{t('examinations.create.selectCollegePlaceholder')}</option>
                {colleges.map(college => (
                  <option key={college.id} value={college.id}>
                    {getLocalizedName(college, isArabicLayout)} ({college.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('examinations.create.basicInformation')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.examName')} *
              </label>
              <input
                type="text"
                name="exam_name"
                value={formData.exam_name}
                onChange={handleChange}
                placeholder={t('examinations.create.placeholders.examName')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.examCode')} *
              </label>
              <input
                type="text"
                name="exam_code"
                value={formData.exam_code}
                onChange={handleChange}
                placeholder={t('examinations.create.placeholders.examCode')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.class')} *
              </label>
              <select
                name="class_id"
                value={formData.class_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={!formData.semester_id || requiresCollegeSelection}
              >
                <option value="">{t('examinations.create.placeholders.selectClass')}</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.code} - {getLocalizedName(classItem.subjects, isArabicLayout) || t('common.notSelected')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.semester')} *
              </label>
              <select
                name="semester_id"
                value={formData.semester_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              >
                <option value="">{t('examinations.create.placeholders.selectSemester')}</option>
                {semesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    {getLocalizedName(semester, isArabicLayout)} ({semester.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.examType')} *
              </label>
              <select
                name="exam_type"
                value={formData.exam_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              >
                <option value="">{t('examinations.create.placeholders.examType')}</option>
                {examTypes.map(type => (
                  <option key={type} value={type}>{getExamTypeLabel(type)}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.description')}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t('examinations.create.placeholders.description')}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={requiresCollegeSelection}
              />
            </div>
          </div>
        </div>

        {/* Schedule Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} mb-6`}>
            <Calendar className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('examinations.create.scheduleInformation')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.examDate')} *
              </label>
              <input
                type="date"
                name="exam_date"
                value={formData.exam_date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.durationMinutes')}
              </label>
              <input
                type="number"
                value={calculateDuration()}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('examinations.create.durationHelp')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.startTime')} *
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.endTime')} *
              </label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>
          </div>
        </div>

        {/* Grading Information */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} mb-6`}>
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('examinations.create.gradingInformation')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.totalMarks')} *
              </label>
              <input
                type="number"
                name="total_marks"
                value={formData.total_marks}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.passingMarks')}
              </label>
              <input
                type="number"
                name="passing_marks"
                value={formData.passing_marks}
                onChange={handleChange}
                min="0"
                step="0.01"
                max={formData.total_marks || 100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={requiresCollegeSelection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.weightPercentage')} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="weight_percentage"
                  value={formData.weight_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={requiresCollegeSelection}
                />
                <span className={`absolute ${isArabicLayout ? 'left-4' : 'right-4'} top-1/2 transform -translate-y-1/2 text-gray-500`}>%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Instructions */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} mb-6`}>
            <BookOpen className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('examinations.create.examInstructions')}</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('examinations.create.instructionsHelp')}
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              placeholder={t('examinations.create.placeholders.instructions')}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={requiresCollegeSelection}
            />
          </div>
        </div>

        {/* Allowed Materials */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${requiresCollegeSelection ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'} mb-6`}>
            <Calculator className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">{t('examinations.create.materialsAllowed')}</h2>
          </div>
          
          <div className="space-y-4">
            <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'}`}>
              <input
                type="checkbox"
                name="allow_calculator"
                checked={formData.allow_calculator}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                disabled={requiresCollegeSelection}
              />
              <label className="text-sm font-medium text-gray-700">{t('examinations.create.fields.allowCalculator')}</label>
            </div>

            <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'}`}>
              <input
                type="checkbox"
                name="allow_notes"
                checked={formData.allow_notes}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                disabled={requiresCollegeSelection}
              />
              <label className="text-sm font-medium text-gray-700">{t('examinations.create.fields.allowNotes')}</label>
            </div>

            <div className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'}`}>
              <input
                type="checkbox"
                name="allow_textbook"
                checked={formData.allow_textbook}
                onChange={handleChange}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                disabled={requiresCollegeSelection}
              />
              <label className="text-sm font-medium text-gray-700">{t('examinations.create.fields.allowTextbook')}</label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('examinations.create.fields.otherMaterials')}
              </label>
              <input
                type="text"
                name="other_allowed_materials"
                value={formData.other_allowed_materials}
                onChange={handleChange}
                placeholder={t('examinations.create.placeholders.otherMaterials')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={requiresCollegeSelection}
              />
            </div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">{t('examinations.create.tipsTitle')}</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>{t('examinations.create.tips.conflicts')}</li>
            <li>{t('examinations.create.tips.weight')}</li>
            <li>{t('examinations.create.tips.gradingScheme')}</li>
            <li>{t('examinations.create.tips.clearInstructions')}</li>
          </ul>
        </div>

        {/* Submit Button */}
        <div className={`flex items-center justify-end ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-4' : 'space-x-4'}`}>
          <button
            type="button"
            onClick={() => navigate('/examinations')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-3 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'}`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('examinations.create.actions.creating')}</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{t('examinations.create.actions.create')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
