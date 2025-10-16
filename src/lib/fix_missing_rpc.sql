-- RPC function to get all users (admin only)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF users AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can access this function';
  END IF;
  
  -- Return all users
  RETURN QUERY SELECT * FROM users ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;