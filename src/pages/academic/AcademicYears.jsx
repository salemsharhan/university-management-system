import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, CalendarDays, Search, Eye, Edit } from 'lucide-react'

export default function AcademicYears() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const [academicYears, setAcademicYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAcademicYears()
  }, [collegeId, userRole])

  const fetchAcademicYears = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false })

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setAcademicYears(data || [])
    } catch (err) {
      console.error('Error fetching academic years:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredYears = academicYears.filter(year =>
    year.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    year.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('academicYears.title')}</h1>
          <p className="text-gray-600 mt-1">{t('academicYears.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/academic/years/create')}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
        >
          <Plus className="w-5 h-5" />
          <span>{t('academicYears.create')}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400`} />
          <input
            type="text"
            placeholder={t('academicYears.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredYears.map((year) => (
            <div
              key={year.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'} mb-4`}>
                <div className="w-12 h-12 bg-primary-gradient rounded-lg flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{year.name_en}</h3>
                  <p className="text-sm text-gray-500">{year.code}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>{t('academicYears.start')}:</strong> {new Date(year.start_date).toLocaleDateString()}</p>
                <p><strong>{t('academicYears.end')}:</strong> {new Date(year.end_date).toLocaleDateString()}</p>
                {year.is_university_wide && (
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {t('academicYears.universityWideLabel')}
                  </span>
                )}
              </div>
              <div className={`mt-4 flex items-center ${isRTL ? 'space-x-reverse' : 'space-x-2'}`}>
                <button
                  onClick={() => navigate(`/academic/years/${year.id}`)}
                  className={`flex-1 flex items-center justify-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors`}
                >
                  <Eye className="w-4 h-4" />
                  <span>{t('common.view')}</span>
                </button>
                <button
                  onClick={() => navigate(`/academic/years/${year.id}/edit`)}
                  className={`flex-1 flex items-center justify-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-3 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all`}
                >
                  <Edit className="w-4 h-4" />
                  <span>{t('common.edit')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


