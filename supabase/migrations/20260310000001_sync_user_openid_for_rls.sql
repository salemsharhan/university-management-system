-- Sync users.openId with auth.uid() so RLS policies that check users."openId" = auth.uid()::text pass.
-- Also link instructors to the users row (user_id) so instructor RLS policies pass.
-- Call this after sign-in so the users row is linked to the current Supabase Auth session.

CREATE OR REPLACE FUNCTION public.sync_user_openid()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_email text;
  synced_user_id int;
BEGIN
  SELECT email INTO auth_email FROM auth.users WHERE id = auth.uid();
  IF auth_email IS NOT NULL THEN
    UPDATE public.users
    SET "openId" = auth.uid()::text
    WHERE email = auth_email
    RETURNING id INTO synced_user_id;
    -- Link instructors to this user so grade_components RLS (instructor path) passes
    IF synced_user_id IS NOT NULL THEN
      UPDATE public.instructors
      SET user_id = synced_user_id
      WHERE email = auth_email AND (user_id IS NULL OR user_id <> synced_user_id);
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.sync_user_openid() IS 'Updates the current user row so openId matches auth.uid(), enabling RLS policies that join on users.openId. Call after sign-in.';

GRANT EXECUTE ON FUNCTION public.sync_user_openid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_openid() TO service_role;
