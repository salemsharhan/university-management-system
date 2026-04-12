/**
 * Human-readable relative time for past timestamps (e.g. last modified).
 * @param {string} iso - ISO date string
 * @param {'en'|'ar'} language
 */
export function formatRelativeTimePast(iso, language = 'en') {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now - date
  const locale = language === 'ar' ? 'ar-SA' : 'en-US'
  if (diffMs < 0) return date.toLocaleString(locale)

  const diffSec = Math.floor(diffMs / 1000)
  const rtf = new Intl.RelativeTimeFormat(language === 'ar' ? 'ar' : 'en', { numeric: 'auto' })

  if (diffSec < 60) return rtf.format(-diffSec, 'second')
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return rtf.format(-diffMin, 'minute')
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return rtf.format(-diffHrs, 'hour')
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return rtf.format(-diffDays, 'day')
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return rtf.format(-diffWeeks, 'week')
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return rtf.format(-diffMonths, 'month')
  return date.toLocaleDateString(locale)
}
