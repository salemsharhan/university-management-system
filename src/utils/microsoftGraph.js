/**
 * Microsoft Graph API Utility
 * Handles authentication and Teams meeting creation
 * 
 * ⚠️ SECURITY NOTE: This utility currently uses client credentials flow with client secret.
 * In production, the client secret should be stored server-side (Supabase Edge Function or secure database).
 * Never expose the client secret in frontend code or commit it to version control.
 */

import { supabase } from '../lib/supabase'

const TOKEN_CACHE_KEY = 'microsoft_graph_token'
const TOKEN_EXPIRY_CACHE_KEY = 'microsoft_graph_token_expiry'

/**
 * Get Microsoft Teams configuration from settings
 * 
 * ⚠️ SECURITY WARNING: Client secret should NOT be stored in frontend code!
 * 
 * For production, this should:
 * 1. Fetch from a Supabase Edge Function (server-side) - RECOMMENDED
 * 2. Or fetch from database with proper access controls
 * 3. Or use authorization code flow instead of client credentials
 * 
 * @returns {Promise<object>} Configuration object with tenant_id, client_id, client_secret, etc.
 */
export const getMicrosoftTeamsConfig = async () => {
  // Configuration is now handled server-side via Edge Function
  // This is just for reference - actual API calls go through Edge Function
  return {
    tenantId: 'a5925acf-4467-4376-b43c-97253f129d0a',
    clientId: '6542c633-3375-4030-a10c-898b0f6855b7',
    graphApiUrl: 'https://graph.microsoft.com/v1.0'
  }
}

/**
 * Get access token from Microsoft Graph API
 * Uses client credentials flow (server-to-server)
 * @returns {Promise<string>} Access token
 */
export const getAccessToken = async () => {
  try {
    // Check cache first
    const cachedToken = localStorage.getItem(TOKEN_CACHE_KEY)
    const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_CACHE_KEY)
    
    if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      return cachedToken
    }

    // Use Edge Function to get access token (solves CORS issue)
    const { data, error } = await supabase.functions.invoke('microsoft-teams', {
      body: { action: 'token' }
    })

    if (error) {
      throw new Error(`Failed to get access token: ${error.message}`)
    }

    if (!data || !data.access_token) {
      throw new Error('Invalid response from Edge Function')
    }

    // Cache the token (expires_in is in seconds)
    const expiryTime = Date.now() + ((data.expires_in || 3600) - 300) * 1000 // Refresh 5 minutes before expiry
    localStorage.setItem(TOKEN_CACHE_KEY, data.access_token)
    localStorage.setItem(TOKEN_EXPIRY_CACHE_KEY, expiryTime.toString())

    return data.access_token
  } catch (error) {
    console.error('Error getting access token:', error)
    throw error
  }
}

/**
 * Create a Teams meeting via Microsoft Graph API
 * @param {object} meetingData - Meeting details
 * @param {string} meetingData.organizerEmail - Email of the meeting organizer (instructor)
 * @param {string} meetingData.subject - Meeting subject/title
 * @param {string} meetingData.description - Meeting description
 * @param {string} meetingData.startDateTime - ISO 8601 format start datetime (e.g., "2026-01-20T10:00:00")
 * @param {string} meetingData.endDateTime - ISO 8601 format end datetime
 * @param {string} meetingData.timeZone - Time zone (e.g., "UTC", "America/New_York")
 * @param {Array<{email: string, name: string, type: 'required'|'optional'}>} meetingData.attendees - List of attendees
 * @returns {Promise<object>} Created meeting with join URL and event ID
 */
export const createTeamsMeeting = async (meetingData) => {
  try {
    const { organizerEmail, subject, description, startDateTime, endDateTime, timeZone = 'UTC', attendees = [] } = meetingData

    if (!organizerEmail || !subject || !startDateTime || !endDateTime) {
      throw new Error('Missing required meeting data: organizerEmail, subject, startDateTime, endDateTime')
    }

    // Use Edge Function to create Teams meeting (solves CORS issue)
    const { data, error } = await supabase.functions.invoke('dynamic-worker', {
      method: 'POST',
      body: {
        action: 'create-meeting',
        organizerEmail,
        subject,
        description,
        startDateTime,
        endDateTime,
        timeZone,
        attendees
      }
    })

    if (error) {
      throw new Error(`Failed to create Teams meeting: ${error.message}`)
    }

    if (!data) {
      throw new Error('Invalid response from Edge Function')
    }

    return {
      meetingId: data.meetingId,
      joinUrl: data.joinUrl,
      eventId: data.eventId,
      subject: data.subject,
      start: data.start,
      end: data.end,
      organizer: data.organizer,
      webLink: data.webLink
    }
  } catch (error) {
    console.error('Error creating Teams meeting:', error)
    throw error
  }
}

/**
 * Update a Teams meeting
 * @param {string} organizerEmail - Email of the meeting organizer
 * @param {string} eventId - Event ID from Microsoft Graph
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} Updated meeting
 */
export const updateTeamsMeeting = async (organizerEmail, eventId, updateData) => {
  try {
    // Use Edge Function to update Teams meeting (solves CORS issue)
    const { data, error } = await supabase.functions.invoke('microsoft-teams', {
      method: 'POST',
      body: {
        action: 'update-meeting',
        organizerEmail,
        eventId,
        updateData
      }
    })

    if (error) {
      throw new Error(`Failed to update Teams meeting: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error updating Teams meeting:', error)
    throw error
  }
}

/**
 * Delete a Teams meeting
 * @param {string} organizerEmail - Email of the meeting organizer
 * @param {string} eventId - Event ID from Microsoft Graph
 * @returns {Promise<void>}
 */
export const deleteTeamsMeeting = async (organizerEmail, eventId) => {
  try {
    // Use Edge Function to delete Teams meeting (solves CORS issue)
    const { data, error } = await supabase.functions.invoke('microsoft-teams', {
      method: 'POST',
      body: {
        action: 'delete-meeting',
        organizerEmail,
        eventId
      }
    })

    if (error) {
      throw new Error(`Failed to delete Teams meeting: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error deleting Teams meeting:', error)
    throw error
  }
}

/**
 * Format date to ISO 8601 for Microsoft Graph API
 * @param {Date|string} date - Date object or string
 * @param {number} durationMinutes - Duration in minutes
 * @returns {object} { startDateTime, endDateTime } in ISO 8601 format
 */
export const formatMeetingDateTime = (date, durationMinutes = 60) => {
  const startDate = new Date(date)
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

  return {
    startDateTime: startDate.toISOString().split('.')[0], // Remove milliseconds
    endDateTime: endDate.toISOString().split('.')[0]
  }
}

