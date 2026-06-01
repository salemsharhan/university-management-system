import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  getNationalityLabel,
  getNationalityOptions,
  isNationalityCode,
  normalizeNationalityCode,
} from '../../utils/nationalities'

/**
 * Standard nationality dropdown (stores ISO 3166-1 alpha-2 code).
 */
export default function NationalitySelect({
  value,
  onChange,
  name,
  id,
  className = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent',
  required = false,
  disabled = false,
  placeholder,
  dir,
}) {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabic = isRTL || language === 'ar'

  const options = useMemo(() => getNationalityOptions(isArabic), [isArabic])

  const normalizedValue = useMemo(() => {
    const v = String(value ?? '').trim()
    if (!v) return ''
    if (isNationalityCode(v)) return v.toUpperCase()
    return normalizeNationalityCode(v) || v
  }, [value])

  const legacyOption = useMemo(() => {
    const v = String(value ?? '').trim()
    if (!v || isNationalityCode(v) || normalizeNationalityCode(v)) return null
    return { value: v, label: getNationalityLabel(v, isArabic) }
  }, [value, isArabic])

  const selectDir = dir ?? (isArabic ? 'rtl' : 'ltr')
  const emptyLabel = placeholder ?? t('common.select', 'Select…')

  return (
    <select
      id={id}
      name={name}
      value={normalizedValue}
      required={required}
      disabled={disabled}
      dir={selectDir}
      className={className}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {legacyOption && (
        <option value={legacyOption.value}>
          {legacyOption.label} ({t('nationality.legacyValue', 'update required')})
        </option>
      )}
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
