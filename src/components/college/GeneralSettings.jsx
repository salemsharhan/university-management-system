import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'

export default function GeneralSettings({ formData, handleChange, useUniversitySettings, setUseUniversitySettings, collegeTypes = [] }) {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  
  return (
    <div className="space-y-6">
      {setUseUniversitySettings && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
            <input
              type="checkbox"
              checked={useUniversitySettings}
              onChange={(e) => setUseUniversitySettings(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <label className="text-sm font-medium text-gray-900">{t('colleges.generalSettings.useUniversitySettings')}</label>
              <p className="text-xs text-gray-600">
                {t('colleges.generalSettings.useUniversitySettingsDesc') || 'Check this to auto-fill default values from university settings. All settings will still be saved per college and can be customized.'}
              </p>
            </div>
          </div>
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.basicInformation')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.nameEn')}</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => handleChange('name_en', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.nameAr')}</label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => handleChange('name_ar', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.code')}</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('colleges.generalSettings.codePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.type')}</label>
            <select
              value={formData.type || ''}
              onChange={(e) => handleChange('type', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">{t('colleges.generalSettings.selectType')}</option>
              {collegeTypes.length > 0 ? (
                collegeTypes.map((type) => (
                  <option key={type.code || type.id} value={type.code}>
                    {isRTL && type.name_ar ? type.name_ar : type.name_en}
                  </option>
                ))
              ) : (
                <>
                  <option value="sciences">Sciences</option>
                  <option value="engineering">Engineering</option>
                  <option value="business">Business</option>
                  <option value="arts">Arts</option>
                  <option value="medicine">Medicine</option>
                  <option value="other">Other</option>
                </>
              )}
            </select>
            {collegeTypes.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">{t('colleges.generalSettings.noCollegeTypes')}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.descriptionEn')}</label>
            <textarea
              value={formData.description_en || ''}
              onChange={(e) => handleChange('description_en', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.descriptionAr')}</label>
            <textarea
              value={formData.description_ar || ''}
              onChange={(e) => handleChange('description_ar', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.contactInformation')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.deanName')}</label>
            <input
              type="text"
              value={formData.dean_name || ''}
              onChange={(e) => handleChange('dean_name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.deanEmail')}</label>
            <input
              type="email"
              value={formData.dean_email || ''}
              onChange={(e) => handleChange('dean_email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.deanPhone')}</label>
            <input
              type="tel"
              value={formData.dean_phone || ''}
              onChange={(e) => handleChange('dean_phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.contactEmail')}</label>
            <input
              type="email"
              value={formData.contact_email || formData.official_email || ''}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.contactPhone')}</label>
            <input
              type="tel"
              value={formData.contact_phone || formData.phone_number || ''}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.officialEmail')}</label>
            <input
              type="email"
              value={formData.official_email}
              onChange={(e) => handleChange('official_email', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.phoneNumber')}</label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) => handleChange('phone_number', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.website')}</label>
            <input
              type="url"
              value={formData.website_url}
              onChange={(e) => handleChange('website_url', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('colleges.generalSettings.websitePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.addressEn')}</label>
            <textarea
              value={formData.address_en}
              onChange={(e) => handleChange('address_en', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.addressAr')}</label>
            <textarea
              value={formData.address_ar}
              onChange={(e) => handleChange('address_ar', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.location')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.building')}</label>
            <input
              type="text"
              value={formData.building || ''}
              onChange={(e) => handleChange('building', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.floor')}</label>
            <input
              type="text"
              value={formData.floor || ''}
              onChange={(e) => handleChange('floor', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.roomNumber')}</label>
            <input
              type="text"
              value={formData.room_number || ''}
              onChange={(e) => handleChange('room_number', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.locationDescription')}</label>
            <textarea
              value={formData.location_description || ''}
              onChange={(e) => handleChange('location_description', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.visionMission')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.vision')}</label>
            <textarea
              value={formData.vision || ''}
              onChange={(e) => handleChange('vision', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.mission')}</label>
            <textarea
              value={formData.mission || ''}
              onChange={(e) => handleChange('mission', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.additionalInformation')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.establishedDate')}</label>
            <input
              type="date"
              value={formData.established_date || ''}
              onChange={(e) => handleChange('established_date', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.accreditationInfo')}</label>
            <textarea
              value={formData.accreditation_info || ''}
              onChange={(e) => handleChange('accreditation_info', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('colleges.generalSettings.accreditationInfoPlaceholder')}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.collegeAdminAccount')}</h3>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} mb-4`}>
            <input
              type="checkbox"
              checked={formData.create_admin_account !== false}
              onChange={(e) => handleChange('create_admin_account', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-sm font-medium text-gray-900">
              {t('colleges.generalSettings.createLoginAccount')}
            </label>
          </div>
          <p className="text-xs text-gray-600 mb-4">
            {t('colleges.generalSettings.createLoginAccountDesc')}
          </p>
          
          {formData.create_admin_account !== false && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.adminName')}</label>
                <input
                  type="text"
                  value={formData.admin_name || ''}
                  onChange={(e) => handleChange('admin_name', e.target.value)}
                  placeholder={formData.dean_name || t('colleges.generalSettings.adminNamePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{t('colleges.generalSettings.adminNameHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.adminEmail')}</label>
                <input
                  type="email"
                  value={formData.admin_email || ''}
                  onChange={(e) => handleChange('admin_email', e.target.value)}
                  placeholder={formData.contact_email || formData.official_email || t('colleges.generalSettings.adminEmailPlaceholder')}
                  required={formData.create_admin_account !== false}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{t('colleges.generalSettings.adminEmailHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.adminPassword')}</label>
                <input
                  type="password"
                  value={formData.admin_password || ''}
                  onChange={(e) => handleChange('admin_password', e.target.value)}
                  required={formData.create_admin_account !== false}
                  placeholder={t('colleges.generalSettings.adminPasswordPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{t('colleges.generalSettings.adminPasswordHint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.brandingTheme')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.logoUrl')}</label>
            <input
              type="url"
              value={formData.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">{t('colleges.generalSettings.logoUrlHint')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.primaryColor')}</label>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.secondaryColor')}</label>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
              <input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={formData.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.studentIdConfiguration')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.studentIdPrefix')}</label>
            <input
              type="text"
              value={formData.student_id_prefix}
              onChange={(e) => handleChange('student_id_prefix', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.studentIdFormat')}</label>
            <input
              type="text"
              value={formData.student_id_format}
              onChange={(e) => handleChange('student_id_format', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="{prefix}{year}{sequence:D4}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.studentIdStartingNumber')}</label>
            <input
              type="number"
              value={formData.student_id_starting_number}
              onChange={(e) => handleChange('student_id_starting_number', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.instructorIdConfiguration')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.instructorIdPrefix')}</label>
            <input
              type="text"
              value={formData.instructor_id_prefix}
              onChange={(e) => handleChange('instructor_id_prefix', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.instructorIdFormat')}</label>
            <input
              type="text"
              value={formData.instructor_id_format}
              onChange={(e) => handleChange('instructor_id_format', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="{prefix}{year}{sequence:D4}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.instructorIdStartingNumber')}</label>
            <input
              type="number"
              value={formData.instructor_id_starting_number}
              onChange={(e) => handleChange('instructor_id_starting_number', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('colleges.generalSettings.localizationSettings')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.defaultLanguage')}</label>
            <select
              value={formData.default_language}
              onChange={(e) => handleChange('default_language', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.timeZone')}</label>
            <input
              type="text"
              value={formData.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="UTC"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('colleges.generalSettings.currency')}</label>
            <input
              type="text"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="USD"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

