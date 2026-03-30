import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { getLocalizedName } from '../utils/localizedName'
import { ArrowLeft, Edit, User, Mail, Phone, Briefcase, GraduationCap, Award, BookOpen, Languages, FileText, BadgeCheck } from 'lucide-react'

export default function ViewInstructor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { isRTL } = useLanguage()
  const isArabicLayout = isRTL ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')

  const [instructor, setInstructor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchInstructor = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('instructors')
        .select('*, departments(id, name_en, name_ar, code), colleges(id, name_en, name_ar, code), academic_years(id, name_en, name_ar, code)')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      setInstructor(data)
    } catch (err) {
      console.error('Error fetching instructor:', err)
      setError(err.message || (isArabicLayout ? 'تعذر تحميل بيانات المدرس' : 'Failed to load instructor'))
    } finally {
      setLoading(false)
    }
  }, [id, isArabicLayout])

  useEffect(() => {
    fetchInstructor()
  }, [fetchInstructor])

  const txt = (ar, en) => (isArabicLayout ? ar : en)
  const valueOrDash = (value) => (value === null || value === undefined || value === '' ? '-' : value)
  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString(isArabicLayout ? 'ar-SA' : 'en-US')
  }

  const statusMeta = {
    active: { cls: 'bg-green-100 text-green-800', label: txt('نشط', 'Active') },
    on_leave: { cls: 'bg-yellow-100 text-yellow-800', label: txt('في إجازة', 'On Leave') },
    inactive: { cls: 'bg-gray-100 text-gray-700', label: txt('غير نشط', 'Inactive') }
  }
  const statusKey = instructor?.status || 'active'
  const status = statusMeta[statusKey] || statusMeta.active

  const titleLabel = (value) => {
    const map = {
      professor: txt('أستاذ', 'Professor'),
      associate_professor: txt('أستاذ مشارك', 'Associate Professor'),
      assistant_professor: txt('أستاذ مساعد', 'Assistant Professor'),
      lecturer: txt('محاضر', 'Lecturer')
    }
    return map[value] || valueOrDash(value)
  }

  const primaryName = isArabicLayout
    ? (instructor?.name_ar || '').trim() || '-'
    : (instructor?.name_en || instructor?.name_ar || '').trim() || '-'

  const secondaryName = isArabicLayout
    ? ''
    : (instructor?.name_ar || '').trim()

  const infoItems = [
    { label: txt('الاسم (إنجليزي)', 'Name (English)'), value: valueOrDash(instructor?.name_en) },
    { label: txt('الاسم (عربي)', 'Name (Arabic)'), value: valueOrDash(instructor?.name_ar) },
    { label: txt('الرقم الوظيفي', 'Employee ID'), value: valueOrDash(instructor?.employee_id) },
    { label: txt('الحالة', 'Status'), value: status.label, className: status.cls },
    { label: txt('البريد الإلكتروني', 'Email'), value: valueOrDash(instructor?.email), dir: 'ltr' },
    { label: txt('الهاتف', 'Phone'), value: valueOrDash(instructor?.phone), dir: 'ltr' },
    { label: txt('القسم', 'Department'), value: valueOrDash(getLocalizedName(instructor?.departments, isArabicLayout)) },
    { label: txt('الكلية', 'College'), value: valueOrDash(getLocalizedName(instructor?.colleges, isArabicLayout)) },
    { label: txt('العام الأكاديمي', 'Academic Year'), value: valueOrDash(getLocalizedName(instructor?.academic_years, isArabicLayout)) },
    { label: txt('اللقب الأكاديمي', 'Title'), value: titleLabel(instructor?.title) },
    { label: txt('تاريخ التعيين', 'Hire Date'), value: formatDate(instructor?.hire_date) },
    { label: txt('التخصص', 'Specialization'), value: valueOrDash(instructor?.specialization) }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !instructor) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('common.back')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('common.back')}</span>
        </button>
        <button
          onClick={() => navigate(`/instructors/${id}/edit`)}
          className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all`}
        >
          <Edit className="w-4 h-4" />
          <span>{t('common.edit')}</span>
        </button>
      </div>

      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-8 ${isArabicLayout ? 'text-right' : 'text-left'}`}>
        <div className="flex items-start gap-4 mb-7">
          <div className="w-20 h-20 bg-primary-gradient rounded-2xl flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <div className={`flex items-center gap-3 mb-2 ${isArabicLayout ? 'flex-row-reverse justify-end' : ''}`}>
              <h1 className="text-3xl font-bold text-gray-900">{primaryName}</h1>
              <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${status.cls}`}>{status.label}</span>
            </div>
            {!!secondaryName && (
              <p className="text-gray-500 text-base">{secondaryName}</p>
            )}
            <p className="text-gray-600 mt-1">
              {txt('الرقم الوظيفي', 'Employee ID')}: {valueOrDash(instructor?.employee_id)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {infoItems.map((item, idx) => (
            <div key={idx} className={isArabicLayout ? 'text-right' : 'text-left'}>
              <div className="text-xs text-gray-500 mb-1.5">{item.label}</div>
              <div
                dir={item.dir || 'auto'}
                className={`text-sm font-semibold ${item.className || 'text-gray-900'}`}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse justify-end text-right' : ''}`}>
            <Mail className="w-5 h-5" />
            <span>{txt('معلومات التواصل', 'Contact Information')}</span>
          </h2>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm ${isArabicLayout ? 'text-right' : 'text-left'}`}>
            <p><span className="text-gray-500">{txt('البريد:', 'Email:')}</span> <span dir="ltr">{valueOrDash(instructor?.email)}</span></p>
            <p><span className="text-gray-500">{txt('الهاتف:', 'Phone:')}</span> <span dir="ltr">{valueOrDash(instructor?.phone)}</span></p>
            <p><span className="text-gray-500">{txt('العنوان:', 'Address:')}</span> {valueOrDash(instructor?.address)}</p>
            <p><span className="text-gray-500">{txt('المدينة:', 'City:')}</span> {valueOrDash(instructor?.city)}</p>
            <p><span className="text-gray-500">{txt('الدولة:', 'Country:')}</span> {valueOrDash(instructor?.country)}</p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse justify-end text-right' : ''}`}>
            <BadgeCheck className="w-5 h-5" />
            <span>{txt('البيانات الشخصية', 'Personal Information')}</span>
          </h2>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm ${isArabicLayout ? 'text-right' : 'text-left'}`}>
            <p><span className="text-gray-500">{txt('تاريخ الميلاد:', 'Date of Birth:')}</span> {formatDate(instructor?.date_of_birth)}</p>
            <p><span className="text-gray-500">{txt('الجنس:', 'Gender:')}</span> {valueOrDash(instructor?.gender)}</p>
            <p><span className="text-gray-500">{txt('الجنسية:', 'Nationality:')}</span> {valueOrDash(instructor?.nationality)}</p>
            <p><span className="text-gray-500">{txt('الهوية الوطنية:', 'National ID:')}</span> {valueOrDash(instructor?.national_id)}</p>
            <p><span className="text-gray-500">{txt('رقم الجواز:', 'Passport Number:')}</span> {valueOrDash(instructor?.passport_number)}</p>
          </div>
        </section>
      </div>

      {(Array.isArray(instructor?.education) && instructor.education.length > 0) && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse justify-end text-right' : ''}`}>
            <GraduationCap className="w-5 h-5" />
            <span>{txt('المؤهلات العلمية', 'Education')}</span>
          </h2>
          <div className={`grid grid-cols-1 ${instructor.education.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
            {instructor.education.map((edu, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{valueOrDash(edu.degree)}</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">{txt('التخصص:', 'Field:')}</span> {valueOrDash(edu.field)}</p>
                  <p><span className="text-gray-500">{txt('الجهة:', 'Institution:')}</span> {valueOrDash(edu.institution)}</p>
                  <p><span className="text-gray-500">{txt('بلد الدراسة:', 'Country:')}</span> {valueOrDash(edu.country)}</p>
                  <p><span className="text-gray-500">{txt('سنة التخرج:', 'Graduation Year:')}</span> {valueOrDash(edu.graduation_year)}</p>
                  <p><span className="text-gray-500">{txt('المعدل:', 'GPA:')}</span> {valueOrDash(edu.gpa)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(Array.isArray(instructor?.work_experience) && instructor.work_experience.length > 0) && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse justify-end text-right' : ''}`}>
            <Briefcase className="w-5 h-5" />
            <span>{txt('الخبرات العملية', 'Work Experience')}</span>
          </h2>
          <div className="space-y-4">
            {instructor.work_experience.map((exp, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4">
                <div className={`flex items-center justify-between mb-2 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                  <h4 className="font-semibold text-gray-900">{valueOrDash(exp.position)}</h4>
                  {exp.current && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {txt('حالي', 'Current')}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">{txt('الجهة:', 'Organization:')}</span> {valueOrDash(exp.organization)}</p>
                  <p>
                    <span className="text-gray-500">{txt('الفترة:', 'Period:')}</span>{' '}
                    {formatDate(exp.start_date)} - {exp.current ? txt('حتى الآن', 'Present') : formatDate(exp.end_date)}
                  </p>
                  {exp.description && <p className="text-gray-700">{exp.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(instructor?.languages) && instructor.languages.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse justify-end text-right' : ''}`}>
            <Languages className="w-5 h-5" />
            <span>{txt('اللغات', 'Languages')}</span>
          </h2>
          <div className={`flex flex-wrap gap-2 ${isArabicLayout ? 'justify-end' : 'justify-start'}`}>
            {instructor.languages.map((lang, index) => (
              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {valueOrDash(lang.language)} {lang.proficiency ? `(${lang.proficiency})` : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      {(instructor?.research_interests || instructor?.bio || instructor?.bio_ar) && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse justify-end text-right' : ''}`}>
            <BookOpen className="w-5 h-5" />
            <span>{txt('ملف أكاديمي', 'Academic Profile')}</span>
          </h2>
          {instructor?.research_interests && (
            <div className="mb-4">
              <h3 className="text-sm text-gray-500 mb-1">{txt('الاهتمامات البحثية', 'Research Interests')}</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{instructor.research_interests}</p>
            </div>
          )}
          {instructor?.bio && !isArabicLayout && (
            <div className="mb-4">
              <h3 className="text-sm text-gray-500 mb-1">{txt('السيرة الذاتية (إنجليزي)', 'Biography (English)')}</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{instructor.bio}</p>
            </div>
          )}
          {instructor?.bio_ar && (
            <div>
              <h3 className="text-sm text-gray-500 mb-1">{txt('السيرة الذاتية (عربي)', 'Biography (Arabic)')}</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap" dir="rtl">{instructor.bio_ar}</p>
            </div>
          )}
        </section>
      )}

      {(Array.isArray(instructor?.publications) && instructor.publications.length > 0) && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse justify-end text-right' : ''}`}>
            <FileText className="w-5 h-5" />
            <span>{txt('المنشورات', 'Publications')}</span>
          </h2>
          <div className="space-y-2">
            {instructor.publications.map((pub, index) => (
              <div key={index} className={`border-s-4 border-primary-500 ps-4 py-2 ${isArabicLayout ? 'text-right' : ''}`}>
                <p className="text-sm text-gray-900 break-all">{typeof pub === 'string' ? pub : JSON.stringify(pub)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(Array.isArray(instructor?.certifications) && instructor.certifications.length > 0) && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isArabicLayout ? 'flex-row-reverse justify-end text-right' : ''}`}>
            <Award className="w-5 h-5" />
            <span>{txt('الشهادات المهنية', 'Certifications')}</span>
          </h2>
          <div className="space-y-2">
            {instructor.certifications.map((cert, index) => (
              <div key={index} className={`border-s-4 border-primary-500 ps-4 py-2 ${isArabicLayout ? 'text-right' : ''}`}>
                <p className="text-sm text-gray-900 break-all">{typeof cert === 'string' ? cert : JSON.stringify(cert)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
