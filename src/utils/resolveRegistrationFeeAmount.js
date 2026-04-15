import { supabase } from '../lib/supabase'

const DEFAULT_FEE = 100

async function fetchFinanceConfigAmount(collegeId, feeType) {
  const { data, error } = await supabase
    .from('finance_configuration')
    .select('amount')
    .eq('fee_type', feeType)
    .eq('is_active', true)
    .or(`college_id.eq.${collegeId},is_university_wide.eq.true`)
    .limit(1)
    .maybeSingle()
  if (error || data?.amount == null) return null
  const n = parseFloat(data.amount)
  return Number.isNaN(n) || n < 0 ? null : n
}

/**
 * Registration fee for an application:
 * 1) majors.registration_fee
 * 2) finance_configuration admission_fee (college or university-wide)
 * 3) finance_configuration registration_fee
 * 4) default
 *
 * @param {{ major_id?: number, college_id?: number }} application
 */
export async function resolveRegistrationFeeAmount(application) {
  if (application?.major_id) {
    const { data: maj, error: majErr } = await supabase
      .from('majors')
      .select('registration_fee')
      .eq('id', application.major_id)
      .maybeSingle()
    if (!majErr && maj?.registration_fee != null && maj.registration_fee !== '') {
      const n = parseFloat(maj.registration_fee)
      if (!Number.isNaN(n) && n >= 0) return n
    }
  }

  if (application?.college_id) {
    const admission = await fetchFinanceConfigAmount(application.college_id, 'admission_fee')
    if (admission != null) return admission
    const registration = await fetchFinanceConfigAmount(application.college_id, 'registration_fee')
    if (registration != null) return registration
  }

  return DEFAULT_FEE
}
