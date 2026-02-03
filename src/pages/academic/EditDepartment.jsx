import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save, Check } from 'lucide-react'

export default function EditDepartment() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, collegeId: authCollegeId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collegeId, setCollegeId] = useState(null)
  const [colleges, setColleges] = useState([])
  const [instructors, setInstructors] = useState([])
  const [isUniversityWide, setIsUniversityWide] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    head_id: '',
    name_en: '',
    name_ar: '',
    description: '',
    description_ar: '',
    status: 'active',
    college_id: null,
    is_university_wide: false,
    email: '',
    phone: '',
    building: '',
    floor: '',
    room: '',
    established_date: '',
    can_offer_courses: true,
    can_have_majors: true,
    can_enroll_students: true,
    is_research: false,
    has_graduate_programs: false,
    has_external_partnerships: false,
    min_credit_hours: 12,
    max_credit_hours: 21,
    min_gpa_required: 2.0,
    max_students: 500,
    graduation_credits: 120,
    expected_duration: 8,
  })

  useEffect(() => {
    fetchDepartment()
    if (userRole === 'admin') fetchColleges()
  }, [id, userRole])

  useEffect(() => {
    if (collegeId || (userRole === 'user' && authCollegeId) || (userRole === 'admin' && isUniversityWide)) {
      fetchInstructors()
    }
  }, [collegeId, userRole, authCollegeId, isUniversityWide])

  const fetchColleges = async () => {
    try {
      const { data, error } = await supabase.from('colleges').select('id, name_en, name_ar, code').eq('status', 'active').order('name_en')
      if (error) throw error
      setColleges(data || [])
    } catch (err) {
      console.error('Error fetching colleges:', err)
    }
  }

  const fetchInstructors = async () => {
    try {
      let query = supabase.from('instructors').select('id, name_en, name_ar, email, phone, title').eq('status', 'active').order('name_en')
      if (userRole === 'user' && authCollegeId) query = query.eq('college_id', authCollegeId)
      else if (userRole === 'admin' && !isUniversityWide && collegeId) query = query.eq('college_id', collegeId)
      const { data, error } = await query
      if (error) throw error
      setInstructors(data || [])
    } catch (err) {
      console.error('Error fetching instructors:', err)
    }
  }

  const fetchDepartment = async () => {
    try {
      const { data, error } = await supabase.from('departments').select('*').eq('id', id).single()
      if (error) throw error
      setFormData({
        code: data.code || '',
        head_id: data.head_id || '',
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        description: data.description || '',
        description_ar: data.description_ar || '',
        status: data.status || 'active',
        college_id: data.college_id,
        is_university_wide: data.is_university_wide || false,
        email: data.email || '',
        phone: data.phone || '',
        building: data.building || '',
        floor: data.floor || '',
        room: data.room || '',
        established_date: data.established_date ? data.established_date.split('T')[0] : '',
        can_offer_courses: data.can_offer_courses !== false,
        can_have_majors: data.can_have_majors !== false,
        can_enroll_students: data.can_enroll_students !== false,
        is_research: data.is_research || false,
        has_graduate_programs: data.has_graduate_programs || false,
        has_external_partnerships: data.has_external_partnerships || false,
        min_credit_hours: data.min_credit_hours ?? 12,
        max_credit_hours: data.max_credit_hours ?? 21,
        min_gpa_required: data.min_gpa_required ?? 2.0,
        max_students: data.max_students ?? 500,
        graduation_credits: data.graduation_credits ?? 120,
        expected_duration: data.expected_duration ?? 8,
      })
      setCollegeId(data.college_id || authCollegeId)
      setIsUniversityWide(data.is_university_wide || false)
    } catch (err) {
      console.error('Error fetching department:', err)
      setError(err.message || 'Failed to load department')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const submitData = {
        code: formData.code,
        head_id: formData.head_id ? parseInt(formData.head_id) : null,
        name_en: formData.name_en,
        name_ar: formData.name_ar || formData.name_en,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        status: formData.status,
        is_university_wide: isUniversityWide,
        college_id: isUniversityWide ? null : (formData.college_id || collegeId),
        email: formData.email || null,
        phone: formData.phone || null,
        building: formData.building || null,
        floor: formData.floor || null,
        room: formData.room || null,
        established_date: formData.established_date || null,
        hod_appointed_date: formData.head_id ? new Date().toISOString().split('T')[0] : null,
        can_offer_courses: formData.can_offer_courses,
        can_have_majors: formData.can_have_majors,
        can_enroll_students: formData.can_enroll_students,
        is_research: formData.is_research,
        has_graduate_programs: formData.has_graduate_programs,
        has_external_partnerships: formData.has_external_partnerships,
        min_credit_hours: formData.min_credit_hours || null,
        max_credit_hours: formData.max_credit_hours || null,
        min_gpa_required: formData.min_gpa_required || null,
        max_students: formData.max_students || null,
        graduation_credits: formData.graduation_credits || null,
        expected_duration: formData.expected_duration || null,
        updated_by: user?.email || null,
      }

      const { error: updateError } = await supabase.from('departments').update(submitData).eq('id', id)
      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => navigate('/academic/departments'), 2000)
    } catch (err) {
      setError(err.message || 'Failed to update department')
      console.error('Error updating department:', err)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2'

  if (fetching) {
    return (
      <div className="flex justify-center min-h-[50vh] items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-500 hover:text-gray-900 text-sm font-medium mb-4`}>
        <ArrowLeft className="w-5 h-5" />
        <span>{t('common.back')}</span>
      </button>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('departmentsForm.editTitle', 'Edit Department')}</h1>
        <p className="text-gray-600 mt-1">{t('departmentsForm.editSubtitle', 'Update department information')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{error}</div>}
        {success && (
          <div className={`p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
            <Check className="w-5 h-5" />
            <span>{t('departmentsForm.updated')}</span>
          </div>
        )}

        {/* Scope Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-5">
            <label className={`flex items-center gap-3 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                checked={isUniversityWide}
                onChange={(e) => {
                  setIsUniversityWide(e.target.checked)
                  setFormData(prev => ({ ...prev, college_id: e.target.checked ? null : collegeId }))
                  fetchInstructors()
                }}
                className="w-5 h-5 rounded accent-primary-600"
              />
              <div>
                <div className="font-semibold text-gray-900">{t('departmentsForm.universityWide')}</div>
                <div className="text-sm text-gray-600">{t('departmentsForm.universityWideDesc')}</div>
              </div>
            </label>
          </div>
          {!isUniversityWide && (
            <div>
              <label className={labelClass}>{t('departmentsForm.college')}</label>
              <select
                value={formData.college_id || ''}
                onChange={(e) => {
                  handleChange('college_id', e.target.value ? parseInt(e.target.value) : null)
                  setCollegeId(e.target.value ? parseInt(e.target.value) : null)
                  fetchInstructors()
                }}
                className={inputClass}
                required={!isUniversityWide}
              >
                <option value="">{t('departmentsForm.selectCollege')}</option>
                {colleges.map(c => <option key={c.id} value={c.id}>{getLocalizedName(c, isRTL)} ({c.code})</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5">{t('departmentsForm.basicInfo')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className={labelClass}>{t('departmentsForm.code')} *</label>
              <input type="text" value={formData.code} onChange={(e) => handleChange('code', e.target.value)} required placeholder="e.g., CS, EE, ME" className={inputClass} />
              <div className="text-xs text-gray-500 mt-1">{t('departmentsForm.codeHint')}</div>
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.head')}</label>
              <select value={formData.head_id} onChange={(e) => handleChange('head_id', e.target.value)} className={inputClass}>
                <option value="">{t('departmentsForm.selectInstructor')}</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{getLocalizedName(i, isRTL)} {i.title ? `(${i.title})` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className={labelClass}>{t('departmentsForm.nameEn')} *</label>
              <input type="text" value={formData.name_en} onChange={(e) => handleChange('name_en', e.target.value)} required placeholder="e.g., Department of Computer Science" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.nameAr')}</label>
              <input type="text" value={formData.name_ar} onChange={(e) => handleChange('name_ar', e.target.value)} placeholder="قسم علوم الحاسب" dir="rtl" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t('departmentsForm.description')}</label>
              <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={4} placeholder="Brief description of this department..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.descriptionAr')}</label>
              <textarea value={formData.description_ar} onChange={(e) => handleChange('description_ar', e.target.value)} rows={4} placeholder="وصف مختصر للقسم..." dir="rtl" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5">{t('departmentsForm.contactInfo')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className={labelClass}>{t('departmentsForm.departmentEmail')}</label>
              <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="department@university.edu" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.phoneNumber')}</label>
              <input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+998 XX XXX XXXX" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>{t('departmentsForm.building')}</label>
              <input type="text" value={formData.building} onChange={(e) => handleChange('building', e.target.value)} placeholder="e.g., Building A" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.floor')}</label>
              <input type="text" value={formData.floor} onChange={(e) => handleChange('floor', e.target.value)} placeholder="e.g., 2nd Floor" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.roomNumber')}</label>
              <input type="text" value={formData.room} onChange={(e) => handleChange('room', e.target.value)} placeholder="e.g., 201" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Status & Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5">{t('departmentsForm.statusSettings')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className={labelClass}>{t('departmentsForm.initialStatus')} *</label>
              <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className={inputClass}>
                <option value="active">{t('departmentsForm.active')}</option>
                <option value="inactive">{t('departmentsForm.inactive')}</option>
                <option value="archived">{t('departmentsForm.archived', 'Archived')}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.establishedDate')}</label>
              <input type="date" value={formData.established_date} onChange={(e) => handleChange('established_date', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">{t('departmentsForm.departmentCapabilities')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ['can_offer_courses', t('departmentsForm.canOfferCourses')],
                ['can_have_majors', t('departmentsForm.canHaveMajors')],
                ['can_enroll_students', t('departmentsForm.canEnrollStudents')],
                ['is_research', t('departmentsForm.researchDepartment')],
                ['has_graduate_programs', t('departmentsForm.graduatePrograms')],
                ['has_external_partnerships', t('departmentsForm.externalPartnerships')],
              ].map(([key, label]) => (
                <label key={key} className={`flex items-center gap-2.5 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input type="checkbox" checked={formData[key]} onChange={(e) => handleChange(key, e.target.checked)} className="w-4 h-4 rounded accent-primary-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Academic Configuration */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5">{t('departmentsForm.academicConfig')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
            <div>
              <label className={labelClass}>{t('departmentsForm.minCreditHours')}</label>
              <input type="number" value={formData.min_credit_hours} onChange={(e) => handleChange('min_credit_hours', parseInt(e.target.value) || '')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.maxCreditHours')}</label>
              <input type="number" value={formData.max_credit_hours} onChange={(e) => handleChange('max_credit_hours', parseInt(e.target.value) || '')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.minGpaRequired')}</label>
              <input type="number" step="0.01" value={formData.min_gpa_required} onChange={(e) => handleChange('min_gpa_required', parseFloat(e.target.value) || '')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.maxStudents')}</label>
              <input type="number" value={formData.max_students} onChange={(e) => handleChange('max_students', parseInt(e.target.value) || '')} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>{t('departmentsForm.graduationCredits')}</label>
              <input type="number" value={formData.graduation_credits} onChange={(e) => handleChange('graduation_credits', parseInt(e.target.value) || '')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('departmentsForm.expectedDuration')}</label>
              <input type="number" value={formData.expected_duration} onChange={(e) => handleChange('expected_duration', parseInt(e.target.value) || '')} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className={`flex ${isRTL ? 'justify-start space-x-reverse' : 'justify-end'} gap-4 pt-4`}>
          <button type="button" onClick={() => navigate(-1)} className="px-8 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
            {t('departmentsForm.cancel')}
          </button>
          <button type="submit" disabled={loading} className={`flex items-center gap-2 px-8 py-3 bg-primary-gradient text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Save className="w-5 h-5" />
            <span>{loading ? t('departmentsForm.updating') : t('departmentsForm.update')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
