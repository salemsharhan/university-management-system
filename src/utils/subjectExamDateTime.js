/** Normalize DB `time` to `HH:mm` for `<input type="datetime-local" />` fragment. */
export function timeToHmFragment(t) {
  if (t == null || t === '') return '09:00'
  const s = String(t)
  return s.length >= 5 ? s.slice(0, 5) : s.padStart(5, '0')
}

/**
 * Build datetime-local values from `subject_exams` date + time columns.
 * @returns {{ start: string, end: string }}
 */
export function examRowToDatetimeLocalValues(scheduled_date, start_time, end_time) {
  if (!scheduled_date || !start_time) return { start: '', end: '' }
  const d = String(scheduled_date).slice(0, 10)
  const sh = timeToHmFragment(start_time)
  const eh = end_time ? timeToHmFragment(end_time) : sh
  return {
    start: `${d}T${sh}`,
    end: `${d}T${eh}`,
  }
}

/**
 * Map datetime-local strings + duration to DB fields (same convention as assessment authoring).
 * @param {string} startLocal
 * @param {string} endLocal
 * @param {number} durationMinutes - authoritative duration from form
 */
export function datetimeLocalsToExamPayload(startLocal, endLocal, durationMinutes) {
  const start = startLocal ? new Date(startLocal) : new Date()
  if (Number.isNaN(start.getTime())) {
    const now = new Date()
    return {
      scheduled_date: now.toISOString().slice(0, 10),
      start_time: now.toTimeString().slice(0, 8),
      end_time: new Date(now.getTime() + 90 * 60000).toTimeString().slice(0, 8),
      duration_minutes: Math.max(1, Number(durationMinutes) || 90),
    }
  }
  const fallbackDur = Math.max(1, Number(durationMinutes) || 90)
  let end = endLocal ? new Date(endLocal) : new Date(start.getTime() + fallbackDur * 60000)
  if (Number.isNaN(end.getTime()) || end <= start) {
    end = new Date(start.getTime() + fallbackDur * 60000)
  }
  return {
    scheduled_date: start.toISOString().slice(0, 10),
    start_time: start.toTimeString().slice(0, 8),
    end_time: end.toTimeString().slice(0, 8),
    duration_minutes: Math.max(1, Number(durationMinutes) || Math.round((end - start) / 60000) || fallbackDur),
  }
}
