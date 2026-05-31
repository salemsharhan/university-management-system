import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
}

// Microsoft Teams configuration - stored securely in Edge Function


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

/** Settings applied when creating/patching onlineMeetings (not valid on calendar event POST). */
const OPEN_MEETING_ACCESS = {
  lobbyBypassSettings: {
    scope: 'everyone',
    isDialInBypassEnabled: true,
  },
  isEntryExitAnnounced: false,
  autoAdmittedUsers: 'everyone',
  allowedPresenters: 'everyone',
}

/** External emails invited on every meeting (testing). Same-org emails become co-organizers instead. */
const EXTERNAL_MEETING_HOSTS = ['smustafa0201@outlook.com']

function graphAuthHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'include-unknown-enum-members',
  }
}

function graphUserBase(organizerEmail: string) {
  return `${MICROSOFT_CONFIG.graphApiUrl}/users/${encodeURIComponent(organizerEmail)}`
}

function graphUserPath(userIdOrEmail: string) {
  return `${MICROSOFT_CONFIG.graphApiUrl}/users/${encodeURIComponent(userIdOrEmail)}`
}

function joinUrlFilterCandidates(joinUrl: string): string[] {
  const candidates = new Set<string>()
  candidates.add(joinUrl)
  try {
    candidates.add(encodeURIComponent(joinUrl))
  } catch {
    /* ignore */
  }
  try {
    candidates.add(decodeURIComponent(joinUrl))
  } catch {
    /* ignore */
  }
  return [...candidates]
}

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase()
}

function emailDomain(email: string): string {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf('@')
  return at >= 0 ? normalized.slice(at + 1) : ''
}

function isSameOrgEmail(email: string, organizerEmail: string): boolean {
  const a = emailDomain(email)
  const b = emailDomain(organizerEmail)
  return !!a && !!b && a === b
}

function parseEmailList(value: string | string[] | undefined | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeEmail).filter(Boolean))]
  }
  return [...new Set(String(value).split(/[,;]/).map(normalizeEmail).filter(Boolean))]
}

function getConfiguredExternalMeetingHosts(): string[] {
  return [...EXTERNAL_MEETING_HOSTS]
}

function resolveMeetingHostEmails(
  organizerEmail: string,
  options: { hostEmails?: string[]; instructorEmail?: string },
) {
  const candidates = parseEmailList([
    ...(options.hostEmails || []),
    ...getConfiguredExternalMeetingHosts(),
    options.instructorEmail || '',
  ].filter(Boolean).join(','))

  const externalHosts: string[] = []
  const coOrganizers: string[] = []

  for (const email of candidates) {
    if (isSameOrgEmail(email, organizerEmail)) {
      if (!coOrganizers.includes(email)) coOrganizers.push(email)
    } else if (!externalHosts.includes(email)) {
      externalHosts.push(email)
    }
  }

  return { externalHosts, coOrganizers }
}

function mergeAttendeeInvite(attendeesFormatted: any[], email: string, name?: string) {
  const normalized = normalizeEmail(email)
  if (!normalized) return
  if (attendeesFormatted.some((a) => normalizeEmail(a.emailAddress?.address) === normalized)) return
  attendeesFormatted.push({
    emailAddress: { address: email, name: name || email },
    type: 'required',
  })
}

function toOnlineMeetingIso(dateTime: string, timeZone = 'UTC'): string {
  const raw = String(dateTime || '').trim()
  if (!raw) throw new Error('Missing dateTime')
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) return raw

  try {
    const normalized = raw.length >= 19 ? raw.slice(0, 19) : raw
    const plain = Temporal.PlainDateTime.from(normalized)
    return plain.toZonedDateTime(timeZone).toInstant().toString()
  } catch {
    return raw.endsWith('Z') ? raw : `${raw}Z`
  }
}

async function fetchOnlineMeetingForEvent(
  accessToken: string,
  organizerEmail: string,
  eventId: string,
) {
  const res = await fetch(`${graphUserBase(organizerEmail)}/events/${eventId}/onlineMeeting`, {
    headers: graphAuthHeaders(accessToken),
  })
  if (!res.ok) return null
  return await res.json()
}

async function lookupOnlineMeetingByJoinUrlForUser(
  accessToken: string,
  organizerUserId: string,
  joinUrl: string,
) {
  if (!joinUrl) return null

  for (const candidate of joinUrlFilterCandidates(joinUrl)) {
    const escaped = candidate.replace(/'/g, "''")
    const filter = encodeURIComponent(`JoinWebUrl eq '${escaped}'`)
    const res = await fetch(`${graphUserPath(organizerUserId)}/onlineMeetings?$filter=${filter}`, {
      headers: graphAuthHeaders(accessToken),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.value?.[0]) return data.value[0]
    } else {
      console.warn('lookupOnlineMeetingByJoinUrl failed:', res.status, await res.text(), 'candidateLen=', candidate.length)
    }
  }

  return null
}

async function lookupOnlineMeetingByConferenceId(accessToken: string, conferenceId: string) {
  if (!conferenceId) return null
  const escaped = conferenceId.replace(/'/g, "''")
  const filter = encodeURIComponent(`VideoTeleconferenceId eq '${escaped}'`)
  const res = await fetch(`${MICROSOFT_CONFIG.graphApiUrl}/communications/onlineMeetings?$filter=${filter}`, {
    headers: graphAuthHeaders(accessToken),
  })
  if (!res.ok) {
    console.warn('lookupOnlineMeetingByConferenceId failed:', res.status, await res.text())
    return null
  }
  const data = await res.json()
  return data.value?.[0] || null
}

async function resolveOnlineMeetingRecord(
  accessToken: string,
  organizerEmail: string,
  organizerUserId: string,
  eventId: string,
  calendarEvent?: any,
) {
  const fromSubResource = await fetchOnlineMeetingForEvent(accessToken, organizerEmail, eventId)
  if (fromSubResource?.id) return fromSubResource

  const joinUrl =
    calendarEvent?.onlineMeeting?.joinUrl ||
    fromSubResource?.joinUrl ||
    fromSubResource?.joinWebUrl ||
    calendarEvent?.onlineMeetingUrl ||
    null

  const conferenceId =
    calendarEvent?.onlineMeeting?.conferenceId ||
    fromSubResource?.conferenceId ||
    null

  if (joinUrl) {
    const byUrl = await lookupOnlineMeetingByJoinUrlForUser(accessToken, organizerUserId, joinUrl)
    if (byUrl) return byUrl
  }

  if (conferenceId) {
    const byConference = await lookupOnlineMeetingByConferenceId(accessToken, conferenceId)
    if (byConference) return byConference
  }

  return fromSubResource
}

async function lookupAzureUser(accessToken: string, email: string) {
  const res = await fetch(
    `${MICROSOFT_CONFIG.graphApiUrl}/users/${encodeURIComponent(email)}?$select=id,displayName,userPrincipalName`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) return null
  return await res.json()
}

async function resolveOrganizerUserId(accessToken: string, organizerEmail: string): Promise<string> {
  const user = await lookupAzureUser(accessToken, organizerEmail)
  if (user?.id) return user.id
  console.warn('Could not resolve organizer Azure object id, falling back to email:', organizerEmail)
  return organizerEmail
}

async function fetchCalendarEvent(accessToken: string, organizerEmail: string, eventId: string) {
  const res = await fetch(
    `${graphUserBase(organizerEmail)}/events/${eventId}?$select=id,subject,onlineMeeting,start,end,webLink`,
    { headers: graphAuthHeaders(accessToken) },
  )
  if (!res.ok) return null
  return await res.json()
}

async function createStandaloneOnlineMeeting(
  accessToken: string,
  organizerEmail: string,
  subject: string,
  startDateTime: string,
  endDateTime: string,
  timeZone: string,
) {
  const base = {
    subject,
    startDateTime: toOnlineMeetingIso(startDateTime, timeZone),
    endDateTime: toOnlineMeetingIso(endDateTime, timeZone),
    lobbyBypassSettings: OPEN_MEETING_ACCESS.lobbyBypassSettings,
    isEntryExitAnnounced: false,
  }

  const payloads = [
    { ...base, autoAdmittedUsers: 'everyone', allowedPresenters: 'everyone' },
    base,
  ]

  let lastError = ''
  for (const payload of payloads) {
    const res = await fetch(`${graphUserBase(organizerEmail)}/onlineMeetings`, {
      method: 'POST',
      headers: graphAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const meeting = await res.json()
      const joinUrl = meeting.joinWebUrl || meeting.joinUrl || null
      return {
        meeting,
        meetingId: meeting.id,
        joinUrl,
        eventId: meeting.id,
        subject: meeting.subject,
        start: { dateTime: meeting.startDateTime, timeZone },
        end: { dateTime: meeting.endDateTime, timeZone },
        webLink: joinUrl,
      }
    }

    lastError = await res.text()
    console.warn('onlineMeetings POST attempt failed:', res.status, lastError)
  }

  console.warn('onlineMeetings unavailable, will fall back to calendar event:', lastError)
  return null
}

async function configureMeetingAccess(
  accessToken: string,
  organizerEmail: string,
  organizerUserId: string,
  eventId: string,
  calendarEvent: any,
  hostOptions: { externalHosts: string[]; coOrganizers: string[] },
) {
  const { coOrganizers } = hostOptions
  let lastPatchError = ''

  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    const onlineMeeting = await resolveOnlineMeetingRecord(
      accessToken,
      organizerEmail,
      organizerUserId,
      eventId,
      calendarEvent,
    )
    const onlineMeetingId = onlineMeeting?.id
    if (!onlineMeetingId) {
      console.warn('configureMeetingAccess: onlineMeeting id not ready, attempt', attempt + 1)
      continue
    }

    const lobbyPatchRes = await fetch(
      `${graphUserPath(organizerUserId)}/onlineMeetings/${encodeURIComponent(onlineMeetingId)}`,
      {
        method: 'PATCH',
        headers: graphAuthHeaders(accessToken),
        body: JSON.stringify({
          lobbyBypassSettings: { scope: 'everyone', isDialInBypassEnabled: true },
          autoAdmittedUsers: 'everyone',
          allowedPresenters: 'everyone',
          isEntryExitAnnounced: false,
        }),
      },
    )

    if (!lobbyPatchRes.ok) {
      lastPatchError = await lobbyPatchRes.text()
      console.warn('configureMeetingAccess lobby PATCH failed:', lobbyPatchRes.status, lastPatchError)
      continue
    }

    let updated = await lobbyPatchRes.json().catch(() => onlineMeeting)

    if (coOrganizers.length > 0) {
      const attendees: any[] = [...(updated.participants?.attendees || onlineMeeting.participants?.attendees || [])]
      const tenantId = (MICROSOFT_CONFIG as { tenantId?: string }).tenantId

      for (const email of coOrganizers) {
        const normalized = normalizeEmail(email)
        const idx = attendees.findIndex((a) => normalizeEmail(a.upn) === normalized)
        const azureUser = await lookupAzureUser(accessToken, email)
        const entry: Record<string, unknown> = {
          upn: email,
          role: 'coorganizer',
        }
        if (azureUser?.id) {
          entry.identity = {
            user: {
              id: azureUser.id,
              displayName: azureUser.displayName || email,
              ...(tenantId ? { tenantId } : {}),
              identityProvider: 'AAD',
            },
          }
        }
        if (idx >= 0) attendees[idx] = { ...attendees[idx], ...entry }
        else attendees.push(entry)
      }

      const coOrgPatchRes = await fetch(
        `${graphUserPath(organizerUserId)}/onlineMeetings/${encodeURIComponent(onlineMeetingId)}`,
        {
          method: 'PATCH',
          headers: graphAuthHeaders(accessToken),
          body: JSON.stringify({ participants: { attendees } }),
        },
      )

      if (coOrgPatchRes.ok) {
        updated = await coOrgPatchRes.json().catch(() => updated)
      } else {
        console.warn('configureMeetingAccess co-organizer PATCH failed:', coOrgPatchRes.status, await coOrgPatchRes.text())
      }
    }

    console.log(
      'Meeting access configured',
      onlineMeetingId,
      'lobby=',
      updated?.lobbyBypassSettings?.scope,
      'coOrganizers=',
      coOrganizers.length,
      'externalHosts=',
      hostOptions.externalHosts.length,
      'optionsUrl=',
      updated?.meetingOptionsWebUrl || '',
    )
    return updated
  }

  console.warn('configureMeetingAccess: could not update meeting for event', eventId, lastPatchError)
  return null
}

async function resolveJoinUrl(
  accessToken: string,
  organizerEmail: string,
  eventId: string,
  meeting: any,
) {
  let joinUrl = meeting.onlineMeeting?.joinUrl || null

  if (!joinUrl && eventId) {
    const onlineMeeting = await fetchOnlineMeetingForEvent(accessToken, organizerEmail, eventId)
    joinUrl = onlineMeeting?.joinUrl || onlineMeeting?.joinWebUrl || null
  }

  if (!joinUrl) {
    joinUrl = meeting.joinUrl || meeting.joinWebUrl || null
  }

  return joinUrl
}

async function createCalendarTeamsEvent(
  accessToken: string,
  organizerEmail: string,
  params: {
    subject: string
    description?: string
    startDateTime: string
    endDateTime: string
    timeZone: string
    attendeesFormatted: any[]
    recurrence?: unknown
  },
) {
  const { subject, description, startDateTime, endDateTime, timeZone, attendeesFormatted, recurrence } = params

  const requestBody: any = {
    subject,
    body: {
      contentType: 'HTML',
      content: description || `Teams meeting for ${subject}`,
    },
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
  }

  if (attendeesFormatted.length > 0) {
    requestBody.attendees = attendeesFormatted
  }
  if (recurrence && typeof recurrence === 'object') {
    requestBody.recurrence = recurrence
  }

  const response = await fetch(`${graphUserBase(organizerEmail)}/events`, {
    method: 'POST',
    headers: graphAuthHeaders(accessToken),
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Graph API Error:', errorText)

    if (response.status === 403) {
      throw new Error('Access forbidden. Please ensure the organizer has proper permissions and admin consent is granted.')
    }
    if (response.status === 404) {
      throw new Error(`Organizer email not found: ${organizerEmail}. Please ensure the user exists in Azure AD.`)
    }

    throw new Error(`Failed to create Teams meeting: ${response.status} ${errorText}`)
  }

  const meeting = await response.json()
  return { meeting }
}

async function createTeamsMeeting(body: any) {
  try {
    const {
      organizerEmail,
      subject,
      description,
      startDateTime,
      endDateTime,
      timeZone = 'UTC',
      attendees = [],
      recurrence,
      hostEmails,
    } = body

    // Use default organizer email (always use the configured default)
    const finalOrganizerEmail = MICROSOFT_CONFIG.defaultOrganizerEmail
    const hostOptions = resolveMeetingHostEmails(finalOrganizerEmail, {
      hostEmails: parseEmailList(hostEmails),
      instructorEmail: organizerEmail,
    })

    if (!subject || !startDateTime || !endDateTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subject, startDateTime, endDateTime' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenResponse = await getAccessTokenInternal()
    if (!tokenResponse.access_token) {
      throw new Error('Failed to get access token')
    }

    const accessToken = tokenResponse.access_token
    const organizerUserId = await resolveOrganizerUserId(accessToken, finalOrganizerEmail)

    const attendeesFormatted = attendees.map((attendee: any) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.name || attendee.email,
      },
      type: attendee.type || 'required',
    }))

    for (const email of hostOptions.externalHosts) {
      mergeAttendeeInvite(attendeesFormatted, email)
    }

    if (!recurrence) {
      const standalone = await createStandaloneOnlineMeeting(
        accessToken,
        finalOrganizerEmail,
        subject,
        startDateTime,
        endDateTime,
        timeZone,
      )

      if (standalone) {
        return new Response(
          JSON.stringify({
            meetingId: standalone.meetingId,
            joinUrl: standalone.joinUrl,
            eventId: standalone.eventId,
            subject: standalone.subject,
            start: standalone.start,
            end: standalone.end,
            organizer: { address: finalOrganizerEmail },
            webLink: standalone.webLink,
            creationMethod: 'onlineMeetings',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    const { meeting: createdMeeting } = await createCalendarTeamsEvent(accessToken, finalOrganizerEmail, {
      subject,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      attendeesFormatted,
      recurrence,
    })

    const meeting =
      (await fetchCalendarEvent(accessToken, finalOrganizerEmail, createdMeeting.id)) || createdMeeting

    const meetingAccess = await configureMeetingAccess(
      accessToken,
      finalOrganizerEmail,
      organizerUserId,
      meeting.id,
      meeting,
      hostOptions,
    )
    const joinUrl = await resolveJoinUrl(accessToken, finalOrganizerEmail, meeting.id, meeting)

    return new Response(
      JSON.stringify({
        meetingId: meeting.id,
        joinUrl,
        eventId: meeting.id,
        subject: meeting.subject,
        start: meeting.start,
        end: meeting.end,
        organizer: { address: finalOrganizerEmail },
        webLink: meeting.webLink || meeting.onlineMeeting?.joinUrl,
        creationMethod: 'calendarEvent',
        externalHosts: hostOptions.externalHosts,
        coOrganizers: hostOptions.coOrganizers,
        meetingAccess: {
          configured: !!meetingAccess,
          lobbyScope: meetingAccess?.lobbyBypassSettings?.scope || null,
          meetingOptionsWebUrl: meetingAccess?.meetingOptionsWebUrl || null,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
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



