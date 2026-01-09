import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Library, Search, Eye, Edit } from 'lucide-react'

export default function Classes() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()
  const { userRole, collegeId } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchClasses()
  }, [collegeId, userRole])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('classes')
        .select('*, subjects(name_en, code), semesters(name_en, code)')
        .eq('status', 'active')
        .order('code')

      if (userRole === 'user' && collegeId) {
        query = query.or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = classes.filter(cls =>
    cls.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.subjects?.name_en.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('classes.title')}</h1>
          <p className="text-gray-600 mt-1">{t('classes.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/academic/classes/create')}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all`}
        >
          <Plus className="w-5 h-5" />
          <span>{t('classes.create')}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400`} />
          <input
            type="text"
            placeholder={t('classes.searchPlaceholder')}
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
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'} mb-4`}>
                <div className="w-12 h-12 bg-primary-gradient rounded-lg flex items-center justify-center">
                  <Library className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{cls.code}</h3>
                  <p className="text-sm text-gray-500">{cls.subjects?.name_en}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>{t('classes.subject')}:</strong> {cls.subjects?.code} - {cls.subjects?.name_en}</p>
                <p><strong>{t('classes.semester')}:</strong> {cls.semesters?.name_en}</p>
                <p><strong>{t('classes.section')}:</strong> {cls.section}</p>
                <p><strong>{t('classes.capacity')}:</strong> {cls.enrolled || 0}/{cls.capacity}</p>
                {cls.is_university_wide && (
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {t('classes.universityWideLabel')}
                  </span>
                )}
              </div>
              <div className={`mt-4 flex items-center ${isRTL ? 'space-x-reverse' : 'space-x-2'}`}>
                <button
                  onClick={() => navigate(`/academic/classes/${cls.id}`)}
                  className={`flex-1 flex items-center justify-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors`}
                >
                  <Eye className="w-4 h-4" />
                  <span>{t('common.view')}</span>
                </button>
                <button
                  onClick={() => navigate(`/academic/classes/${cls.id}/edit`)}
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


