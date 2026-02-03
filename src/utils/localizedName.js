/**
 * Returns the localized display name based on current language.
 * When isRTL (Arabic): uses name_ar, fallback to name_en
 * When LTR (English): uses name_en, fallback to name_ar
 *
 * @param {Object} item - Object with name_en and/or name_ar
 * @param {boolean} isRTL - True when language is Arabic
 * @returns {string} Localized display name
 */
export function getLocalizedName(item, isRTL) {
  if (!item) return ''
  const val = isRTL
    ? (item.name_ar || item.name_en || item.fee_name_ar || item.fee_name_en || item.item_name_ar || item.item_name_en || item.group_name_ar || item.group_name_en)
    : (item.name_en || item.name_ar || item.fee_name_en || item.fee_name_ar || item.item_name_en || item.item_name_ar || item.group_name_en || item.group_name_ar)
  return (val || '').toString().trim()
}
