import { supabase } from '../lib/supabase'

/**
 * Reset password for a student or instructor login (auth user linked via users.user_id).
 * Requires Edge Function `admin-reset-password` deployed with service role.
 */
export async function invokeAdminPasswordReset({ studentId, instructorId, newPassword }) {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', {
    body: { studentId, instructorId, newPassword },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
