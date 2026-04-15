/**
 * Maps fee_types / finance_configuration codes to Postgres enum `invoice_type`
 * (see supabase/migrations finance_affairs_schema). Catalog codes are varchar;
 * invoice rows must use enum labels.
 */
const INVOICE_ENUM = new Set([
  'admission_fee',
  'course_fee',
  'subject_fee',
  'onboarding_fee',
  'penalty',
  'miscellaneous',
  'wallet_credit',
  'other',
])

const FEE_CODE_TO_INVOICE_ENUM = {
  admission_fee: 'admission_fee',
  application_fee: 'admission_fee',
  registration_fee: 'admission_fee',
  registration_fees: 'admission_fee',
  regestration_fees: 'admission_fee',
  course_fee: 'course_fee',
  subject_fee: 'subject_fee',
  tuition_fee: 'course_fee',
  onboarding_fee: 'onboarding_fee',
  lab_fee: 'subject_fee',
  library_fee: 'miscellaneous',
  sports_fee: 'miscellaneous',
  late_payment_penalty: 'penalty',
  penalty: 'penalty',
  miscellaneous: 'miscellaneous',
  other: 'other',
  wallet_credit: 'wallet_credit',
}

export function normalizeInvoiceTypeEnum(code) {
  const c = (code == null ? '' : String(code)).trim().toLowerCase()
  if (!c) return 'other'
  if (INVOICE_ENUM.has(c)) return c
  return FEE_CODE_TO_INVOICE_ENUM[c] ?? 'other'
}

/** Fix common typos in fee_type strings (structures / line items). */
export function normalizeFeeTypeCode(code) {
  const c = (code == null ? '' : String(code)).trim()
  if (!c) return 'other'
  if (c === 'regestration_fees' || c === 'registration_fees') return 'registration_fee'
  return c
}
