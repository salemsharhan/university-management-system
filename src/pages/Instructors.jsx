import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, Plus, Edit, Eye, Mail, Phone, User, Building2, BadgeInfo } from 'lucide-react'
import { getLocalizedName } from '../utils/localizedName'

export default function Instructors() {
  const { t, i18n } = useTranslation()
  const { isRTL } = useLanguage()
  const isArabicLayout = isRTL ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchInstructors = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('instructors')
        .select('*, departments(name_en, name_ar, code)')
        .order('created_at', { ascending: false })

      // Filter by college_id for college admins - only show instructors from their college
      if (userRole === 'user' && collegeId) {
        query = query.eq('college_id', collegeId)
      }
      // For super admins, show all instructors (no filter)

      const { data, error } = await query
      if (error) throw error
      setInstructors(data || [])
    } catch (err) {
      console.error('Error fetching instructors:', err)
    } finally {
      setLoading(false)
    }
  }, [collegeId, userRole])

  useEffect(() => {
    fetchInstructors()
  }, [fetchInstructors])

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    const normalized = status || 'active'
    if (isArabicLayout) {
      const map = {
        active: 'نشط',
        on_leave: 'في إجازة',
        inactive: 'غير نشط'
      }
      return map[normalized] || normalized
    }
    return normalized.replace('_', ' ')
  }

  const getInstructorDisplayName = (instructor) => {
    if (isArabicLayout) {
      return (instructor?.name_ar || '').trim() || '-'
    }
    return (instructor?.name_en || instructor?.name_ar || '').trim() || '-'
  }

  const filteredInstructors = instructors.filter(instructor =>
    (instructor.name_en && instructor.name_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (instructor.name_ar && instructor.name_ar.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (instructor.email && instructor.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (instructor.employee_id && instructor.employee_id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        dir={isArabicLayout ? 'rtl' : 'ltr'}
        className="flex items-center justify-between"
      >
        <div className={isArabicLayout ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold text-gray-900">{t('navigation.instructors')}</h1>
          <p className="text-gray-600 mt-1">{t('instructors.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/instructors/create')}
          className={`flex items-center ${isArabicLayout ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
        >
          <Plus className="w-5 h-5" />
          <span>{t('instructors.addInstructor')}</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute ${isArabicLayout ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400`} />
            <input
              type="text"
              placeholder={t('instructors.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isArabicLayout ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
            />
          </div>
        </div>
      </div>

      {/* Instructors Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstructors.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              {t('instructors.noInstructorsFound')}
            </div>
          ) : (
            filteredInstructors.map((instructor) => (
              <div
                key={instructor.id}
                dir={isArabicLayout ? 'rtl' : 'ltr'}
                className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${isArabicLayout ? 'text-right' : 'text-left'}`}
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-14 h-14 bg-primary-gradient rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`min-w-0 ${isArabicLayout ? 'text-right' : 'text-left'}`}>
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {getInstructorDisplayName(instructor)}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{instructor.employee_id || '-'}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                          instructor.status || 'active'
                        )}`}
                      >
                        {getStatusLabel(instructor.status || 'active')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-2 text-sm text-gray-600 justify-start">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{instructor.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 justify-start">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{instructor.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 justify-start">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{isArabicLayout ? 'القسم:' : `${t('instructors.department')}:`}</span>
                    <span className="truncate">{isArabicLayout ? (instructor.departments?.name_ar || '-') : (getLocalizedName(instructor.departments, false) || '-')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 justify-start">
                    <BadgeInfo className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">
                      {isArabicLayout
                        ? (instructor.title_ar || '-')
                        : (instructor.title || '-')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate(`/instructors/${instructor.id}`)}
                    className="flex items-center justify-center gap-1.5 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    {t('common.view')}
                  </button>
                  <button
                    onClick={() => navigate(`/instructors/${instructor.id}/edit`)}
                    className="flex items-center justify-center gap-1.5 py-3 bg-primary-gradient text-white rounded-lg hover:shadow-lg text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    {t('common.edit')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
