import { supabase } from '../lib/supabase'

/**
 * Creates a paid admission/registration invoice tied to an application (no student yet).
 * Idempotent: returns existing invoice if one already exists for this application.
 */
export async function createApplicationRegistrationInvoice(application, paidAmount, paymentMethod = 'online_payment') {
  const collegeId = application?.college_id
  const applicationId = application?.id
  if (!collegeId || !applicationId) {
    throw new Error('Application must have college_id and id')
  }

  const feeAmount = Math.max(0, parseFloat(paidAmount) || 0)
  if (feeAmount <= 0) {
    throw new Error('Paid amount must be greater than zero')
  }

  const { data: existing, error: existingErr } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('application_id', applicationId)
    .maybeSingle()

  if (existingErr && existingErr.code !== 'PGRST116') throw existingErr
  if (existing?.id) {
    return { invoice: existing, duplicate: true }
  }

  const { data: invNum, error: invNumErr } = await supabase.rpc('generate_invoice_number', {
    college_id_param: collegeId,
  })
  if (invNumErr) throw invNumErr

  const paymentDate = new Date().toISOString().split('T')[0]
  const paymentTs = new Date().toISOString()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invNum,
      student_id: null,
      application_id: applicationId,
      college_id: collegeId,
      semester_id: null,
      invoice_date: paymentDate,
      invoice_type: 'admission_fee',
      status: 'paid',
      subtotal: feeAmount,
      discount_amount: 0,
      scholarship_amount: 0,
      tax_amount: 0,
      total_amount: feeAmount,
      paid_amount: feeAmount,
      pending_amount: 0,
      payment_method: paymentMethod,
      notes: `Registration fee — application ${application.application_number || applicationId}`,
    })
    .select()
    .single()

  if (invoiceError) throw invoiceError

  const { error: itemError } = await supabase.from('invoice_items').insert({
    invoice_id: invoice.id,
    item_type: 'registration_fee',
    item_name_en: 'Registration Fee',
    item_name_ar: 'رسوم التسجيل',
    description: 'Registration fee (application)',
    quantity: 1,
    unit_price: feeAmount,
    discount_amount: 0,
    scholarship_amount: 0,
    total_amount: feeAmount,
    reference_id: applicationId,
    reference_type: 'application',
  })

  if (itemError) throw itemError

  const { data: payNum, error: payNumErr } = await supabase.rpc('generate_payment_number', {
    college_id_param: collegeId,
  })
  if (payNumErr) throw payNumErr

  const { error: paymentError } = await supabase.from('payments').insert({
    payment_number: payNum,
    invoice_id: invoice.id,
    student_id: null,
    college_id: collegeId,
    payment_date: paymentDate,
    payment_method: paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'online_payment',
    amount: feeAmount,
    status: 'verified',
    verified_at: paymentTs,
    notes: `Registration fee — application ${application.application_number || applicationId}`,
  })

  if (paymentError) throw paymentError

  return { invoice, duplicate: false }
}
