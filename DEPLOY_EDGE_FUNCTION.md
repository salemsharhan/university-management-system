# Deploy Edge Function to Fix CORS

## Quick Deploy

```bash
# Make sure you're in the project root
cd d:\Work\Uni

# Deploy the function
supabase functions deploy create-auth-user
```

## If you don't have Supabase CLI installed:

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref xgavrsqjlgvxvexeptdw
   ```

4. **Deploy the function:**
   ```bash
   supabase functions deploy create-auth-user
   ```

## Alternative: Manual Deployment via Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. Click "Create a new function"
3. Name it: `create-auth-user`
4. Copy the code from `supabase/functions/create-auth-user/index.ts`
5. Paste and deploy

## Test After Deployment

The function should now handle CORS properly. Test with:

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

## What Was Fixed

- ✅ Added proper CORS headers
- ✅ Fixed OPTIONS preflight response (now returns 204)
- ✅ Added `Access-Control-Allow-Methods`
- ✅ Updated frontend to use `supabase.functions.invoke()` for better CORS handling



