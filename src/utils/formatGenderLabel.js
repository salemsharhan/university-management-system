/**
 * Localized gender label for exports and display (stored values: male, female, other).
 */
export function formatGenderLabel(value, isArabic = false) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const v = raw.toLowerCase()
  if (v === 'male') return isArabic ? 'ذكر' : 'Male'
  if (v === 'female') return isArabic ? 'أنثى' : 'Female'
  if (v === 'other') return isArabic ? 'آخر' : 'Other'
  return raw
}
