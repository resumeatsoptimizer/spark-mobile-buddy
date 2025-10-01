-- Create member_notes table
CREATE TABLE IF NOT EXISTS public.member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create member_tags table
CREATE TABLE IF NOT EXISTS public.member_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create member_status_history table
CREATE TABLE IF NOT EXISTS public.member_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

-- Create materialized view for member statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_member_statistics AS
SELECT 
  p.id as user_id,
  p.email,
  p.name,
  'active' as status,
  'medium' as activity_level,
  COUNT(DISTINCT r.id) as total_registrations,
  COALESCE(SUM(pay.amount), 0) as total_amount_paid,
  p.created_at,
  MAX(r.created_at) as last_registration_at
FROM public.profiles p
LEFT JOIN public.registrations r ON r.user_id = p.id
LEFT JOIN public.payments pay ON pay.registration_id = r.id
GROUP BY p.id, p.email, p.name, p.created_at;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS mv_member_statistics_user_id_idx ON public.mv_member_statistics(user_id);

-- Function to refresh member statistics view
CREATE OR REPLACE FUNCTION public.refresh_member_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
END;
$$;

-- Function to get member statistics
CREATE OR REPLACE FUNCTION public.get_member_statistics()
RETURNS TABLE (
  total_members BIGINT,
  active_members BIGINT,
  inactive_members BIGINT,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_members,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_members,
    COUNT(*) FILTER (WHERE status = 'inactive')::BIGINT as inactive_members,
    COALESCE(SUM(total_amount_paid), 0) as total_revenue
  FROM public.mv_member_statistics;
END;
$$;

-- Function to get member details
CREATE OR REPLACE FUNCTION public.get_member_details(member_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', user_id,
    'email', email,
    'name', name,
    'status', status,
    'activity_level', activity_level,
    'total_registrations', total_registrations,
    'total_amount_paid', total_amount_paid,
    'created_at', created_at,
    'last_registration_at', last_registration_at
  )
  INTO result
  FROM public.mv_member_statistics
  WHERE user_id = member_id;
  
  RETURN result;
END;
$$;

-- Function to update member status
CREATE OR REPLACE FUNCTION public.update_member_status(
  member_id UUID,
  new_status TEXT,
  changed_by_id UUID,
  reason_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_status_val TEXT;
BEGIN
  -- Get current status from materialized view
  SELECT status INTO old_status_val
  FROM public.mv_member_statistics
  WHERE user_id = member_id;
  
  -- Insert into status history
  INSERT INTO public.member_status_history (user_id, old_status, new_status, changed_by, reason)
  VALUES (member_id, old_status_val, new_status, changed_by_id, reason_text);
  
  -- Refresh the materialized view
  PERFORM public.refresh_member_statistics();
  
  RETURN TRUE;
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for member_notes
CREATE POLICY "Admins and staff can view all notes"
  ON public.member_notes FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can manage notes"
  ON public.member_notes FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- RLS policies for member_tags
CREATE POLICY "Admins and staff can view all tags"
  ON public.member_tags FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can manage tags"
  ON public.member_tags FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- RLS policies for member_status_history
CREATE POLICY "Admins and staff can view status history"
  ON public.member_status_history FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can insert status history"
  ON public.member_status_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));