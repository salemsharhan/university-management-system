import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react'

export default function CollegeTypesSettings({ collegeTypes = [], onCollegeTypesChange }) {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const [editingIndex, setEditingIndex] = useState(null)
  const [newType, setNewType] = useState({ name_en: '', name_ar: '', code: '' })

  const handleAdd = () => {
    if (!newType.name_en || !newType.code) {
      return
    }
    const updated = [...collegeTypes, { ...newType, id: Date.now() }]
    onCollegeTypesChange(updated)
    setNewType({ name_en: '', name_ar: '', code: '' })
  }

  const handleEdit = (index) => {
    setEditingIndex(index)
    setNewType({ ...collegeTypes[index] })
  }

  const handleSave = () => {
    if (!newType.name_en || !newType.code) {
      return
    }
    const updated = [...collegeTypes]
    updated[editingIndex] = { ...newType }
    onCollegeTypesChange(updated)
    setEditingIndex(null)
    setNewType({ name_en: '', name_ar: '', code: '' })
  }

  const handleDelete = (index) => {
    if (window.confirm(t('universitySettings.collegeTypes.confirmDelete'))) {
      const updated = collegeTypes.filter((_, i) => i !== index)
      onCollegeTypesChange(updated)
    }
  }

  const handleCancel = () => {
    setEditingIndex(null)
    setNewType({ name_en: '', name_ar: '', code: '' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('universitySettings.collegeTypes.title')}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          {t('universitySettings.collegeTypes.description')}
        </p>

        {/* Add/Edit Form */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('universitySettings.collegeTypes.nameEn')} *
              </label>
              <input
                type="text"
                value={newType.name_en}
                onChange={(e) => setNewType({ ...newType, name_en: e.target.value })}
                placeholder={t('universitySettings.collegeTypes.nameEnPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('universitySettings.collegeTypes.nameAr')}
              </label>
              <input
                type="text"
                value={newType.name_ar}
                onChange={(e) => setNewType({ ...newType, name_ar: e.target.value })}
                placeholder={t('universitySettings.collegeTypes.nameArPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('universitySettings.collegeTypes.code')} *
              </label>
              <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                <input
                  type="text"
                  value={newType.code}
                  onChange={(e) => setNewType({ ...newType, code: e.target.value.toUpperCase() })}
                  placeholder={t('universitySettings.collegeTypes.codePlaceholder')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {editingIndex === null ? (
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newType.name_en || !newType.code}
                    className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <Plus className="w-5 h-5" />
                    <span>{t('universitySettings.collegeTypes.add')}</span>
                  </button>
                ) : (
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!newType.name_en || !newType.code}
                      className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                      <Check className="w-5 h-5" />
                      <span>{t('common.save')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors`}
                    >
                      <X className="w-5 h-5" />
                      <span>{t('common.cancel')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Types List */}
        {collegeTypes.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {t('universitySettings.collegeTypes.existingTypes')} ({collegeTypes.length})
            </h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('universitySettings.collegeTypes.code')}
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('universitySettings.collegeTypes.nameEn')}
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('universitySettings.collegeTypes.nameAr')}
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {collegeTypes.map((type, index) => (
                    <tr key={type.id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {type.code}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {type.name_en}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {type.name_ar || '-'}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                          <button
                            type="button"
                            onClick={() => handleEdit(index)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">{t('universitySettings.collegeTypes.noTypes')}</p>
          </div>
        )}
      </div>
    </div>
  )
}



