import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
}

// Microsoft Teams configuration - stored securely in Edge Function
const MICROSOFT_CONFIG = {
  tenantId: 'a5925acf-4467-4376-b43c-97253f129d0a',
  clientId: '6542c633-3375-4030-a10c-898b0f6855b7',
  clientSecret: 'jFf8Q~5Slp2aC8i0nRBZ8RCkSQHaWvdA8wdAobcs', // Stored server-side only
  scope: 'https://graph.microsoft.com/.default',
  tokenUrl: 'https://login.microsoftonline.com/a5925acf-4467-4376-b43c-97253f129d0a/oauth2/v2.0/token',
  graphApiUrl: 'https://graph.microsoft.com/v1.0',
  defaultOrganizerEmail: 'e.alkhalaf@q8da.com' // Default organizer email
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    const url = new URL(req.url)
    
    // Try to read body first (for POST requests with action in body)
    let body: any = null
    let action = url.searchParams.get('action') || 'token' // Default to getting token
    
    if (req.method === 'POST') {
      try {
        body = await req.json()
        // If action is in body, use it instead of URL param
        if (body && typeof body === 'object' && 'action' in body) {
          action = body.action
        }
      } catch (e) {
        // Body might be empty or not JSON, that's okay
        body = null
      }
    }

    if (action === 'token') {
      // Get access token
      return await getAccessToken()
    } else if (action === 'create-meeting') {
      // Create Teams meeting - body should contain meeting data
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required for create-meeting action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Remove action from body before passing to createTeamsMeeting
      const { action: _, ...meetingData } = body as any
      return await createTeamsMeeting(meetingData)
    } else if (action === 'update-meeting') {
      // Update Teams meeting
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required for update-meeting action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Remove action from body before passing to updateTeamsMeeting
      const { action: _, ...updateData } = body as any
      return await updateTeamsMeeting(updateData)
    } else if (action === 'delete-meeting') {
      // Delete Teams meeting
      if (!body) {
        return new Response(
          JSON.stringify({ error: 'Request body is required for delete-meeting action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Remove action from body before passing to deleteTeamsMeeting
      const { action: _, ...deleteData } = body as any
      return await deleteTeamsMeeting(deleteData)
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use: token, create-meeting, update-meeting, delete-meeting' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getAccessToken() {
  try {
    const params = new URLSearchParams({
      client_id: MICROSOFT_CONFIG.clientId,
      client_secret: MICROSOFT_CONFIG.clientSecret,
      grant_type: 'client_credentials',
      scope: MICROSOFT_CONFIG.scope
    })

    const response = await fetch(MICROSOFT_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify({ 
        access_token: data.access_token,
        expires_in: data.expires_in,
        token_type: data.token_type
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function createTeamsMeeting(body: any) {
  try {
    const { organizerEmail, subject, description, startDateTime, endDateTime, timeZone = 'UTC', attendees = [] } = body

    // Use default organizer email (always use the configured default)
    const finalOrganizerEmail = MICROSOFT_CONFIG.defaultOrganizerEmail

    if (!subject || !startDateTime || !endDateTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, startDateTime, endDateTime' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get access token first
    const tokenResponse = await getAccessTokenInternal()
    if (!tokenResponse.access_token) {
      throw new Error('Failed to get access token')
    }

    // Prepare attendees array for Graph API
    const attendeesFormatted = attendees.map((attendee: any) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.name || attendee.email
      },
      type: attendee.type || 'required'
    }))

    const requestBody: any = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: description || `Teams meeting for ${subject}`
      },
      start: {
        dateTime: startDateTime,
        timeZone: timeZone
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone
      },
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    }

    // Add attendees only if provided
    if (attendeesFormatted.length > 0) {
      requestBody.attendees = attendeesFormatted
    }

    const graphApiUrl = `${MICROSOFT_CONFIG.graphApiUrl}/users/${encodeURIComponent(finalOrganizerEmail)}/events`

    const response = await fetch(graphApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResponse.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Graph API Error:', errorText)
      
      if (response.status === 403) {
        throw new Error('Access forbidden. Please ensure the organizer has proper permissions and admin consent is granted.')
      } else if (response.status === 404) {
        throw new Error(`Organizer email not found: ${finalOrganizerEmail}. Please ensure the user exists in Azure AD.`)
      }
      
      throw new Error(`Failed to create Teams meeting: ${response.status} ${errorText}`)
    }

    const meeting = await response.json()

    // Sometimes joinUrl might not be immediately available, try to fetch it
    let joinUrl = meeting.onlineMeeting?.joinUrl || null
    
    // If joinUrl is missing, try to get the online meeting details separately
    if (!joinUrl && meeting.id) {
      try {
        const onlineMeetingResponse = await fetch(
          `${MICROSOFT_CONFIG.graphApiUrl}/users/${encodeURIComponent(finalOrganizerEmail)}/events/${meeting.id}/onlineMeeting`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokenResponse.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (onlineMeetingResponse.ok) {
          const onlineMeeting = await onlineMeetingResponse.json()
          joinUrl = onlineMeeting.joinUrl || null
        }
      } catch (e) {
        console.error('Error fetching online meeting details:', e)
        // Continue without joinUrl, it might be available later
      }
    }

    // If still no joinUrl, check alternative locations in the response
    if (!joinUrl) {
      // Sometimes joinUrl is directly in the meeting object
      joinUrl = meeting.joinUrl || meeting.joinWebUrl || null
    }

    return new Response(
      JSON.stringify({
        meetingId: meeting.id,
        joinUrl: joinUrl,
        eventId: meeting.id,
        subject: meeting.subject,
        start: meeting.start,
        end: meeting.end,
        organizer: { address: finalOrganizerEmail },
        webLink: meeting.webLink || meeting.onlineMeeting?.joinUrl
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function updateTeamsMeeting(body: any) {
  try {
    const { organizerEmail, eventId, updateData } = body

    if (!organizerEmail || !eventId || !updateData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organizerEmail, eventId, updateData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get access token first
    const tokenResponse = await getAccessTokenInternal()
    if (!tokenResponse.access_token) {
      throw new Error('Failed to get access token')
    }

    const graphApiUrl = `${MICROSOFT_CONFIG.graphApiUrl}/users/${encodeURIComponent(organizerEmail)}/events/${eventId}`

    const response = await fetch(graphApiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenResponse.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update Teams meeting: ${response.status} ${errorText}`)
    }

    const meeting = await response.json()

    return new Response(
      JSON.stringify(meeting),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function deleteTeamsMeeting(body: any) {
  try {
    const { organizerEmail, eventId } = body

    if (!organizerEmail || !eventId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organizerEmail, eventId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get access token first
    const tokenResponse = await getAccessTokenInternal()
    if (!tokenResponse.access_token) {
      throw new Error('Failed to get access token')
    }

    const graphApiUrl = `${MICROSOFT_CONFIG.graphApiUrl}/users/${encodeURIComponent(organizerEmail)}/events/${eventId}`

    const response = await fetch(graphApiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokenResponse.access_token}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to delete Teams meeting: ${response.status} ${errorText}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// Internal function to get access token (returns object, not Response)
async function getAccessTokenInternal() {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CONFIG.clientId,
    client_secret: MICROSOFT_CONFIG.clientSecret,
    grant_type: 'client_credentials',
    scope: MICROSOFT_CONFIG.scope
  })

  const response = await fetch(MICROSOFT_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`)
  }

  return await response.json()
}

