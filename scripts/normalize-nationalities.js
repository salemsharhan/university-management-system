/**
 * One-time script: normalize nationality free-text to ISO codes in Supabase.
 * Run: node scripts/normalize-nationalities.js
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const TABLES = ['applications', 'students', 'instructors', 'applicant_profiles']

// Inline alias map (keep in sync with src/utils/nationalities.js)
const ALIASES = {
  filipino: 'PH', philippines: 'PH', philippine: 'PH',
  gambian: 'GM', gambia: 'GM', 'غامبيا': 'GM',
  nigeria: 'NG', nigerian: 'NG', nigéria: 'NG', nigería: 'NG', نجيري: 'NG', نيجيريا: 'NG',
  syria: 'SY', syrian: 'SY', سوريا: 'SY',
  tanzania: 'TZ', tanzanian: 'TZ', تنزاني: 'TZ', تنزانية: 'TZ',
  thai: 'TH', thailand: 'TH', تايلاند: 'TH', تايلاندي: 'TH', تايلاندية: 'TH', تايلادن: 'TH',
  'الجنسية التايلاندية': 'TH', 'بان خو': 'TH',
  mali: 'ML', مالي: 'ML',
  egypt: 'EG', egyptian: 'EG', مصر: 'EG', مصري: 'EG',
  morocco: 'MA', moroccan: 'MA', مغربية: 'MA', مغربي: 'MA',
  niger: 'NE', nigerien: 'NE', النيجر: 'NE',
  kuwait: 'KW', kuwaiti: 'KW', الكويت: 'KW', كويت: 'KW', كويتي: 'KW', كويتية: 'KW',
}

function normalize(raw) {
  const t = String(raw ?? '').trim()
  if (!t) return null
  const up = t.toUpperCase()
  if (/^[A-Z]{2}$/.test(up)) return up
  const k = t.toLowerCase().replace(/\s+/g, ' ')
  return ALIASES[k] || null
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

for (const table of TABLES) {
  const { data: rows, error } = await supabase.from(table).select('id, nationality').not('nationality', 'is', null)
  if (error) {
    console.warn(`Skip ${table}:`, error.message)
    continue
  }
  let updated = 0
  for (const row of rows || []) {
    const code = normalize(row.nationality)
    if (!code || code === row.nationality) continue
    const { error: uErr } = await supabase.from(table).update({ nationality: code }).eq('id', row.id)
    if (uErr) console.error(`${table} id=${row.id}:`, uErr.message)
    else updated++
  }
  console.log(`${table}: updated ${updated} row(s)`)
}

console.log('Done.')
