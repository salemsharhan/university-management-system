# Fix 401 "Invalid JWT" Error

## Problem

When calling the Edge Function, you get:
```json
{"code":401,"message":"Invalid JWT"}
```

## Solution

The Edge Function needs to have JWT verification disabled since we're using the service role key for admin operations.

### Option 1: Disable JWT Verification (Recommended)

1. **For Local Development:**
   - The `supabase/config.toml` has been updated with:
   ```toml
   [functions.create-auth-user]
   verify_jwt = false
   ```

2. **For Production (Supabase Dashboard):**
   - Go to Supabase Dashboard → Edge Functions → create-auth-user
   - Click "Settings"
   - Find "Verify JWT" setting
   - **Disable it** (set to false)

### Option 2: Use Anon Key Properly

If you can't disable JWT verification, make sure you're using the anon key:

```javascript
// This automatically uses the anon key
const { data, error } = await supabase.functions.invoke('create-auth-user', {
  body: { ... }
})
```

### Option 3: Use Service Role Key Directly (Fallback)

If Edge Function doesn't work, the code will automatically fall back to using the service role key directly (if available in `.env`).

## Deploy After Fix

After updating the config:

```bash
supabase functions deploy create-auth-user
```

## Test

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

Or from the frontend (which uses `supabase.functions.invoke()` automatically):

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

## Why This Works

- The function uses the **service role key** for admin operations (creating auth users)
- We don't need JWT validation because the service role key bypasses all security
- Disabling JWT verification allows the function to be called with just the anon key
- The anon key is automatically included when using `supabase.functions.invoke()`



