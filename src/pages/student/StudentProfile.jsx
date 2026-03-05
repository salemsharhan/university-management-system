import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { User, Edit } from 'lucide-react'

export default function StudentProfile() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)

  useEffect(() => {
    if (user?.email) fetchProfile()
  }, [user?.email])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          name_en,
          name_ar,
          date_of_birth,
          email,
          phone,
          gpa,
          college_id,
          major_id,
          status,
          national_id,
          nationality,
          gender,
          colleges(id, name_en, name_ar),
          majors(id, name_en, name_ar)
        `)
        .eq('email', user.email)
        .eq('status', 'active')
        .single()
      if (error || !data) return
      setStudent(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !student) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
        <p className="text-amber-800">{t('studentPortal.noStudentData')}</p>
      </div>
    )
  }

  const college = getLocalizedName(student.colleges, isRTL)
  const major = getLocalizedName(student.majors, isRTL)
  const displayName = getLocalizedName(student, isRTL) || [student.first_name, student.last_name].filter(Boolean).join(' ') || student.email

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <div className="bg-slate-800 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 text-2xl font-bold flex-shrink-0">
            {(displayName || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            <p className="text-slate-300 text-sm">{major} — {t('studentPortal.bachelors', 'Bachelor\'s')} | {t('studentPortal.currentSemester')}</p>
            <p className="text-slate-400 text-xs mt-1">{t('studentPortal.universityId', 'University ID')}: {student.student_id}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium">
              {student.status === 'active' ? t('studentPortal.activeStudent', 'Active student') : student.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic data */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 text-center">{t('studentPortal.academicData', 'Academic data')}</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.universityId')}</dt>
              <dd className="font-semibold text-slate-900">{student.student_id}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.college', 'College')}</dt>
              <dd className="font-semibold text-slate-900">{college || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.specialization', 'Specialization')}</dt>
              <dd className="font-semibold text-slate-900">{major || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.academicLevel', 'Academic level')}</dt>
              <dd className="font-semibold text-slate-900">—</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.academicStatus', 'Academic status')}</dt>
              <dd className="font-semibold text-green-600">{student.status === 'active' ? t('studentPortal.activeStudent') : student.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.cumulativeGpa')}</dt>
              <dd className="font-semibold text-slate-900">{(student.gpa != null ? Number(student.gpa) : 0).toFixed(2)} / 4.00</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.completedHours')}</dt>
              <dd className="font-semibold text-slate-900">—</dd>
            </div>
          </dl>
        </div>

        {/* Personal data */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h2 className="text-lg font-bold text-slate-900 text-center flex-1">{t('studentPortal.personalData', 'Personal data')}</h2>
            <button className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 flex items-center gap-1 text-sm">
              <Edit className="w-4 h-4" />
              {t('common.edit')}
            </button>
          </div>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.firstName', 'First name')}</dt>
              <dd className="font-semibold text-slate-900">{student.first_name || student.name_en || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.lastName', 'Last name')}</dt>
              <dd className="font-semibold text-slate-900">{student.last_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.dateOfBirth', 'Date of birth')}</dt>
              <dd className="font-semibold text-slate-900">{student.date_of_birth || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.nationalId', 'National ID')}</dt>
              <dd className="font-semibold text-slate-900">{student.national_id || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.nationality', 'Nationality')}</dt>
              <dd className="font-semibold text-slate-900">{student.nationality || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('studentPortal.gender', 'Gender')}</dt>
              <dd className="font-semibold text-slate-900">{student.gender || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('common.email')}</dt>
              <dd className="font-semibold text-slate-900">{student.email || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">{t('common.phone')}</dt>
              <dd className="font-semibold text-slate-900">{student.phone || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
