import { supabase } from '../lib/supabase'

/**
 * Effective payments toggle for a college.
 *
 * Precedence:
 * 1) If university_settings.financial_settings.payments_enabled is explicitly false, payments are disabled globally.
 * 2) If college.financial_settings.payments_enabled is explicitly set (true/false), use it (per-college override).
 * 3) Otherwise use university_settings.financial_settings.payments_enabled when set (university-wide default for all colleges).
 * 4) Default: true (payments enabled).
 *
 * Note: University-wide disable must apply even when a college does not set `use_university_settings`,
 * otherwise disabling payments only in University Settings would not affect most colleges.
 */
export async function getPaymentsEnabled(collegeId) {
  if (!collegeId) return true
  try {
    // Global kill-switch: if university disables payments, do not require payments anywhere.
    const { data: uni, error: uniErr } = await supabase
      .from('university_settings')
      .select('financial_settings')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!uniErr) {
      const uniFlag = uni?.financial_settings?.payments_enabled
      if (uniFlag === false) return false
    }

    const { data: college, error: collegeErr } = await supabase
      .from('colleges')
      .select('id, financial_settings')
      .eq('id', collegeId)
      .single()

    if (collegeErr || !college) {
      if (collegeErr) console.warn('getPaymentsEnabled: college fetch failed', collegeErr.message)
      return true
    }

    const collegeFlag = college?.financial_settings?.payments_enabled
    if (typeof collegeFlag === 'boolean') return collegeFlag

    if (!uniErr) {
      const uniFlag = uni?.financial_settings?.payments_enabled
      if (typeof uniFlag === 'boolean') return uniFlag
    }

    return true
  } catch (e) {
    console.error('getPaymentsEnabled error:', e)
    return true
  }
}

