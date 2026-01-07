/**
 * Helper function to create auth user via Edge Function
 * This properly handles CORS and authentication
 */
export async function createAuthUser({ email, password, role, college_id, name }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not set')
  }

  try {
    // Use Supabase functions.invoke for proper CORS handling
    const { data, error } = await supabase.functions.invoke('create-auth-user', {
      body: {
        email,
        password,
        role,
        college_id,
        name,
      },
    })

    if (error) {
      throw new Error(error.message || 'Failed to create auth user')
    }

    return { success: true, data }
  } catch (err) {
    // Fallback to direct fetch if functions.invoke fails
    console.warn('functions.invoke failed, trying direct fetch:', err)
    
    const response = await fetch(`${supabaseUrl}/functions/v1/create-auth-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        role,
        college_id,
        name,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create auth user')
    }

    return await response.json()
  }
}



