# Edge Function Setup Guide

## The 401 "Invalid JWT" Error

This error occurs because Supabase Edge Functions automatically validate JWT tokens. Since we're using the service role key for admin operations, we don't need JWT validation.

## Solution

The Edge Function has been updated to:
- ✅ Not require JWT validation (uses service role key instead)
- ✅ Properly handle CORS
- ✅ Use environment variables for Supabase URL and service role key

## Deploy the Updated Function

```bash
supabase functions deploy create-auth-user
```

## Set Environment Variables

The function needs these environment variables (automatically available in Supabase):

1. **SUPABASE_URL** - Automatically set by Supabase
2. **SUPABASE_SERVICE_ROLE_KEY** - Automatically set by Supabase

To verify they're set:
1. Go to Supabase Dashboard → Edge Functions → create-auth-user
2. Click "Settings" → "Secrets"
3. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present

If they're missing, add them:
- `SUPABASE_URL`: Your project URL (e.g., `https://xgavrsqjlgvxvexeptdw.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key from Settings → API

## Test the Function

After deployment, test with:

```bash
curl -X POST https://xgavrsqjlgvxvexeptdw.supabase.co/functions/v1/create-auth-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "test@gmail.com",
    "password": "123456",
    "role": "user",
    "college_id": 4,
    "name": "Test User"
  }'
```

## Using from Frontend

The frontend now uses `supabase.functions.invoke()` which automatically:
- ✅ Adds the correct Authorization header
- ✅ Handles CORS properly
- ✅ Uses the anon key for authentication

Example:
```javascript
const { data, error } = await supabase.functions.invoke('create-auth-user', {
  body: {
    email: 'test@gmail.com',
    password: '123456',
    role: 'user',
    college_id: 4,
    name: 'Test User'
  }
})
```

## Troubleshooting

**401 Invalid JWT:**
- Make sure you're using `supabase.functions.invoke()` from the frontend
- Or ensure the Authorization header has a valid anon key token
- The function doesn't validate JWT anymore, but Supabase still requires the header

**500 Server Error:**
- Check that environment variables are set in Supabase Dashboard
- Verify service role key is correct

**CORS Error:**
- Make sure the function is deployed with the latest CORS headers
- The function should handle OPTIONS requests properly



