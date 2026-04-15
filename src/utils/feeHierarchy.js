/**
 * How fees fit together (single source of truth for product behavior):
 *
 * 1) fee_types — Catalog of invoice categories + rules (requires_semester, semester_based).
 *    Used when picking "Invoice type" on Create Invoice and for validation.
 *
 * 2) finance_configuration — Priced "fee structures" for a college (and optional scope:
 *    semesters, majors, degree levels). Used for manual invoices and as fallback when
 *    major catalog does not define an amount.
 *
 * 3) majors.registration_fee / tuition_fee / lab_fee — Program defaults (especially
 *    registration at application time). Public registration payment uses these first,
 *    then finance_configuration, then a safe default.
 *
 * Invoice rows always store amounts on the invoice; they are not live-linked to major
 * or fee_structure after save (changes to major/config do not retro-edit old invoices).
 */

/** Fee type codes that correspond to major.registration_fee (catalog). */
export const FEE_TYPES_USING_MAJOR_REGISTRATION = ['admission_fee', 'registration_fee', 'application_fee']

/**
 * @param {object|null|undefined} major - majors row (may be nested under student)
 * @returns {number|null}
 */
export function getMajorRegistrationFeeAmount(major) {
  if (!major || major.registration_fee == null || major.registration_fee === '') return null
  const n = parseFloat(major.registration_fee)
  return Number.isNaN(n) || n < 0 ? null : n
}

/**
 * @param {object|null|undefined} major
 * @returns {{ tuition: number|null, lab: number|null, registration: number|null }}
 */
export function getMajorCatalogFeeAmounts(major) {
  const num = (v) => {
    if (v == null || v === '') return null
    const n = parseFloat(v)
    return Number.isNaN(n) || n < 0 ? null : n
  }
  return {
    registration: num(major?.registration_fee),
    tuition: num(major?.tuition_fee),
    lab: num(major?.lab_fee),
  }
}
