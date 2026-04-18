import { supabase } from '../lib/supabase'

/**
 * Ask the send-smtp-test edge function to send a test message.
 * @param {object} params
 * @param {'university'|'college'} params.scope
 * @param {number} [params.collegeId] — required for college + useSaved
 * @param {string} params.to
 * @param {boolean} [params.useSaved] — load SMTP from DB; default false uses smtp from body
 * @param {object} [params.smtp] — when useSaved is false: flat shape matching DB / UI
 */
export async function sendSmtpTestEmail({ scope, collegeId, to, useSaved = false, smtp }) {
  const { data, error } = await supabase.functions.invoke('send-smtp-test', {
    body: {
      scope,
      collegeId: collegeId ?? undefined,
      to,
      useSaved,
      smtp: smtp ?? undefined,
    },
  })
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'SMTP test failed')
  }
  if (error) {
    throw new Error(error.message || 'Failed to invoke send-smtp-test')
  }
  return data
}
