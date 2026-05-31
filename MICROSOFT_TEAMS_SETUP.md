# Microsoft Teams Integration Setup

This document explains how to set up Microsoft Teams meeting link generation for instructors and students.

## ⚠️ IMPORTANT SECURITY NOTE

**The Microsoft Teams client secret should NEVER be stored in frontend code or exposed to the browser.**

Current implementation uses environment variables as a placeholder. For production, you should:

1. **Use Supabase Edge Functions** (Recommended): Create an edge function that handles Microsoft Graph API calls server-side
2. **Use Database Storage**: Store the client secret in a secure database table with proper access controls
3. **Use Authorization Code Flow**: Instead of client credentials, use authorization code flow for user-specific authentication

## Current Implementation

### Database Schema

The `class_teams_meetings` table stores:
- Meeting details (title, description, date, duration)
- Microsoft Teams meeting ID and join URL
- Organizer email
- Class and subject associations

### Features

**For Instructors:**
- Create Teams meetings for their classes
- Schedule meetings with date, time, and duration
- Automatically send email invites to enrolled students
- View and manage all Teams meetings for their classes
- Delete meetings (soft delete)

**For Students:**
- View upcoming Teams meetings for enrolled classes
- Access Teams meeting join links
- See meeting details (date, time, duration, description)

## Setup Instructions

### 1. Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Create a new registration or use existing one
4. Note down:
   - **Tenant ID**: `a5925acf-4467-4376-b43c-97253f129d0a`
   - **Application (client) ID**: `6542c633-3375-4030-a10c-898b0f6855b7`
   - **Client Secret**: Generate a new secret in "Certificates & secrets"

### 2. API Permissions

Grant the following Microsoft Graph API permissions:

- `OnlineMeetings.ReadWrite.All` (Application permission)
- `Calendars.ReadWrite` (Application permission)
- `User.ReadWrite.All` (Application permission) - If needed for organizer access

**Important**: Click "Grant admin consent" after adding permissions.

### 2b. Application Access Policy (required for lobby settings)

Your logs show `403 No application access policy found for this app` — this is **expected** until an M365 admin completes this step.

`Calendars.ReadWrite` lets the app create calendar events with Teams links, but **changing lobby / open access** requires `GET` and `PATCH` on `/users/{organizer}/onlineMeetings`. Microsoft blocks that for app-only tokens unless you assign an **Application Access Policy** to the organizer service account.

**Who**: Global admin or Teams administrator with PowerShell access.

**Install Teams PowerShell** (once):

```powershell
Install-Module MicrosoftTeams -Scope CurrentUser
Connect-MicrosoftTeams
```

**Create policy** (use your app client ID from Azure App registration):

```powershell
New-CsApplicationAccessPolicy -Identity "UMS-Teams-Policy" `
  -AppIds "6542c633-3375-4030-a10c-898b0f6855b7" `
  -Description "University app: manage Teams online meetings for API organizer"
```

**Assign to the organizer mailbox** (replace with the UPN used as `defaultOrganizerEmail` in the edge function):

```powershell
Grant-CsApplicationAccessPolicy -PolicyName "UMS-Teams-Policy" -Identity "organizer@yourdomain.edu"
```

**Verify**:

```powershell
Get-CsApplicationAccessPolicy -Identity "UMS-Teams-Policy"
Get-CsOnlineUser -Identity "organizer@yourdomain.edu" | Select-Object ApplicationAccessPolicy
```

Policy propagation can take **30–60 minutes** (sometimes up to 24 hours). After it applies, create a new meeting and logs should show `Meeting access configured ... lobby= everyone` instead of `application access policy`.

**Alternative (Graph, beta):** some tenants use `POST /beta/communications/applicationAccessPolicies` — PowerShell above is the supported path for most universities.

### 3. Environment Variables (Development Only)

Create a `.env.local` file:

```env
VITE_MICROSOFT_TENANT_ID=a5925acf-4467-4376-b43c-97253f129d0a
VITE_MICROSOFT_CLIENT_ID=6542c633-3375-4030-a10c-898b0f6855b7
VITE_MICROSOFT_CLIENT_SECRET=your_client_secret_here
```

⚠️ **DO NOT commit this file to version control!**

### 4. Database Migration

Run the migration to create the necessary tables:

```sql
-- Run: supabase/migrations/20250109000004_add_teams_meetings.sql
```

### 5. Configuration Storage (Recommended for Production)

Store Microsoft Teams configuration in your database:

```sql
-- Update university/college settings with Microsoft Teams config
UPDATE colleges
SET system_settings = jsonb_set(
  COALESCE(system_settings, '{}'::jsonb),
  '{microsoft_teams}',
  '{
    "enabled": true,
    "tenant_id": "a5925acf-4467-4376-b43c-97253f129d0a",
    "client_id": "6542c633-3375-4030-a10c-898b0f6855b7",
    "scope": "https://graph.microsoft.com/.default",
    "graph_api_url": "https://graph.microsoft.com/v1.0"
  }'::jsonb
)
WHERE id = YOUR_COLLEGE_ID;
```

**Note**: Client secret should be stored encrypted or in a Supabase Edge Function environment.

## Meeting access (no lobby / no host wait)

New meetings created by the app configure lobby access via Microsoft Graph after the calendar event is created. The function looks up the linked `onlineMeeting` by join URL (required for PATCH to work).

**External host emails** (personal Outlook/Gmail, etc.) can bypass the lobby when invited on the calendar event. For testing, defaults are hard-coded in `dynamic-worker/index.ts` as `EXTERNAL_MEETING_HOSTS` (currently `smustafa0201@outlook.com`).

Instructors can also set an optional **External host email** when creating a meeting in the UI.

**Existing meeting links** (already stored in `class_teams_meetings` / `class_schedules`) keep their old Teams settings until you create new meetings.

If participants still see *“When the meeting starts, we'll let people know you're waiting”*, your **Teams meeting policy** for the organizer service account must also allow it. In **Teams admin center → Meetings → Meeting policies** (assigned to the API organizer user):

- **Who can bypass the lobby** → Everyone  
- **Anonymous users can join a meeting** → On  
- **Anonymous users and dial-in callers can start a meeting** → On (if students join without signing in)

Policy changes can take up to 24–48 hours to apply.

After deploying the Edge Function update:

```bash
supabase functions deploy dynamic-worker
```


1. Navigate to a subject: `/instructor/subjects/:id`
2. Click on the **"Teams Meetings"** tab
3. For each class, click **"Create Meeting"**
4. Fill in meeting details:
   - Title (required)
   - Description (optional)
   - Date and time (required)
   - Duration (required)
   - Option to send email invites to students
5. Click **"Create Meeting"**

The system will:
- Create a Teams meeting via Microsoft Graph API
- Generate a join URL
- Optionally send email invites to enrolled students
- Store meeting details in the database

### For Students

1. Navigate to a subject: `/student/subjects/:id`
2. Click on the **"Teams Meetings"** tab
3. View all upcoming Teams meetings
4. Click **"Join Teams Meeting"** to open the meeting link

## Requirements

### For Meeting Organizer (Instructor)

The instructor email used as the organizer must:
- ✅ Exist in Azure AD
- ✅ Have a Teams license
- ✅ Have an Exchange mailbox
- ✅ Have proper permissions granted

### Common Errors

**403 Forbidden:**
- Admin consent not granted for API permissions
- Solution: Grant admin consent in Azure Portal

**404 Not Found:**
- Organizer email doesn't exist in Azure AD
- Solution: Ensure instructor email exists in Azure AD

**401 Unauthorized:**
- Invalid client secret or expired token
- Solution: Check client secret and regenerate if needed

## Future Improvements

1. **Server-Side Implementation**: Create Supabase Edge Function to handle Microsoft Graph API calls securely
2. **Recurring Meetings**: Support for weekly, monthly recurring meetings
3. **Meeting Recordings**: Store and display Teams meeting recordings
4. **Attendance Tracking**: Link Teams meeting attendance with class attendance
5. **Meeting Analytics**: Track meeting participation and duration

## Security Best Practices

1. **Never expose client secrets** in frontend code or public repositories
2. **Use environment variables** for sensitive data (not committed to git)
3. **Implement rate limiting** for API calls
4. **Monitor API usage** for unusual activity
5. **Regularly rotate client secrets**
6. **Use least privilege principle** for API permissions

## API Endpoints Used

1. **Token Endpoint**: `https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token`
   - Method: POST
   - Flow: Client Credentials
   - Returns: Access token

2. **Create Meeting**: `https://graph.microsoft.com/v1.0/users/{organizer_email}/events`
   - Method: POST
   - Headers: `Authorization: Bearer {access_token}`
   - Returns: Event with Teams join URL

3. **Update Meeting**: `https://graph.microsoft.com/v1.0/users/{organizer_email}/events/{event_id}`
   - Method: PATCH
   - Updates meeting details

4. **Delete Meeting**: `https://graph.microsoft.com/v1.0/users/{organizer_email}/events/{event_id}`
   - Method: DELETE
   - Removes meeting from Teams calendar






