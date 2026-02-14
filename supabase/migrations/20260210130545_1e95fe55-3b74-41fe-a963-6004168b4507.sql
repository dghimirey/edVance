
-- Auto-create approval request when a new user signs up
-- The requested_role comes from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_approval()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _requested_role text;
BEGIN
  _requested_role := NEW.raw_user_meta_data->>'requested_role';
  IF _requested_role IS NOT NULL AND _requested_role IN ('teacher', 'accountant', 'librarian', 'student') THEN
    INSERT INTO public.approval_requests (user_id, requested_role)
    VALUES (NEW.id, _requested_role::app_role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created_approval
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_approval();
