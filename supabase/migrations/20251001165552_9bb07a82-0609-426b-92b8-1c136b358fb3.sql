-- ============================================
-- DATABASE OPTIMIZATION MIGRATION (FINAL)
-- Phase 1: Security, Data Integrity & Performance
-- ============================================

-- ============================================
-- 1. AUDIT TRAIL SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit trail"
  ON public.audit_trail FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
  ON public.audit_trail FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_audit_trail_table_record ON public.audit_trail(table_name, record_id);
CREATE INDEX idx_audit_trail_changed_at ON public.audit_trail(changed_at DESC);

-- ============================================
-- 2. DATA INTEGRITY CONSTRAINTS
-- ============================================

ALTER TABLE public.events
ADD CONSTRAINT events_date_order_check
CHECK (end_date > start_date);

ALTER TABLE public.events
ADD CONSTRAINT events_capacity_check
CHECK (seats_remaining <= seats_total AND seats_remaining >= 0);

ALTER TABLE public.events
ADD CONSTRAINT events_registration_window_check
CHECK (
  registration_close_date IS NULL OR
  registration_close_date <= start_date
);

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_email_format_check
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_phone_format_check
CHECK (phone IS NULL OR phone ~ '^[+]?[0-9]{8,15}$');

ALTER TABLE public.payments
ADD CONSTRAINT payments_amount_positive_check
CHECK (amount > 0);

ALTER TABLE public.payments
ADD CONSTRAINT payments_refund_limit_check
CHECK (refund_amount IS NULL OR refund_amount <= amount);

-- ============================================
-- 3. PERFORMANCE OPTIMIZATION INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_registrations_user_status
ON public.registrations(user_id, status);

CREATE INDEX IF NOT EXISTS idx_registrations_event_status
ON public.registrations(event_id, status);

CREATE INDEX IF NOT EXISTS idx_events_date_visibility
ON public.events(start_date, visibility);

CREATE INDEX IF NOT EXISTS idx_events_upcoming
ON public.events(start_date, seats_remaining) WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_payments_registration_status
ON public.payments(registration_id, status);

CREATE INDEX IF NOT EXISTS idx_events_search
ON public.events USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================
-- 4. MONITORING VIEWS
-- ============================================

CREATE OR REPLACE VIEW public.registration_health AS
SELECT
  e.id AS event_id,
  e.title AS event_title,
  e.start_date,
  e.seats_total,
  e.seats_remaining,
  COUNT(DISTINCT r.id) AS total_registrations,
  COUNT(DISTINCT CASE WHEN r.status = 'confirmed' THEN r.id END) AS confirmed_count,
  COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id END) AS pending_count,
  COUNT(DISTINCT CASE WHEN r.payment_status = 'paid' THEN r.id END) AS paid_count,
  ROUND((e.seats_total - e.seats_remaining)::NUMERIC / NULLIF(e.seats_total, 0) * 100, 2) AS capacity_utilization_pct,
  COUNT(DISTINCT w.id) AS waitlist_count
FROM public.events e
LEFT JOIN public.registrations r ON r.event_id = e.id
LEFT JOIN public.waitlist w ON w.event_id = e.id
WHERE e.start_date >= NOW() - INTERVAL '30 days'
GROUP BY e.id, e.title, e.start_date, e.seats_total, e.seats_remaining;

CREATE OR REPLACE VIEW public.payment_analytics AS
SELECT
  e.id AS event_id,
  e.title AS event_title,
  COUNT(p.id) AS total_payments,
  COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) AS successful_payments,
  COUNT(CASE WHEN p.status = 'failed' THEN 1 END) AS failed_payments,
  SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END) AS total_revenue,
  SUM(COALESCE(p.refund_amount, 0)) AS total_refunds,
  ROUND(AVG(CASE WHEN p.status = 'succeeded' THEN p.amount END), 2) AS avg_payment_amount
FROM public.events e
LEFT JOIN public.registrations r ON r.event_id = e.id
LEFT JOIN public.payments p ON p.registration_id = r.id
GROUP BY e.id, e.title;

-- ============================================
-- 5. DATA VALIDATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.seats_total < 0 THEN
    RAISE EXCEPTION 'Total seats cannot be negative';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.seats_remaining IS NULL THEN
    NEW.seats_remaining := NEW.seats_total;
  END IF;

  IF NEW.registration_open_date IS NOT NULL 
     AND NEW.registration_close_date IS NOT NULL 
     AND NEW.registration_open_date >= NEW.registration_close_date THEN
    RAISE EXCEPTION 'Registration open date must be before close date';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_event_data_trigger ON public.events;
CREATE TRIGGER validate_event_data_trigger
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_event_data();

-- ============================================
-- 6. EVENT POPULARITY SCORING
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_event_popularity(event_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  popularity_score NUMERIC := 0;
  registration_count INTEGER;
  capacity_utilization NUMERIC;
  check_in_rate NUMERIC;
  days_until_event INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    CASE 
      WHEN e.seats_total > 0 THEN (e.seats_total - e.seats_remaining)::NUMERIC / e.seats_total
      ELSE 0
    END,
    EXTRACT(DAY FROM (e.start_date - NOW()))
  INTO registration_count, capacity_utilization, days_until_event
  FROM public.events e
  LEFT JOIN public.registrations r ON r.event_id = e.id
  WHERE e.id = event_id
  GROUP BY e.id, e.seats_total, e.seats_remaining, e.start_date;

  SELECT 
    CASE 
      WHEN COUNT(r.id) > 0 THEN COUNT(c.id)::NUMERIC / COUNT(r.id)
      ELSE 0
    END
  INTO check_in_rate
  FROM public.registrations r
  LEFT JOIN public.event_check_ins c ON c.registration_id = r.id
  WHERE r.event_id = event_id;

  popularity_score := 
    (COALESCE(registration_count, 0) * 2) +
    (COALESCE(capacity_utilization, 0) * 50) +
    (COALESCE(check_in_rate, 0) * 30) +
    (CASE WHEN days_until_event > 0 AND days_until_event <= 7 THEN 10 ELSE 0 END);

  RETURN popularity_score;
END;
$$;

-- ============================================
-- 7. CLEANUP PROCEDURES
-- ============================================

CREATE OR REPLACE FUNCTION public.archive_old_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  WITH archived AS (
    DELETE FROM public.events
    WHERE end_date < NOW() - INTERVAL '1 year'
      AND id NOT IN (
        SELECT DISTINCT event_id 
        FROM public.registrations 
        WHERE status = 'pending'
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM archived;
  
  RETURN archived_count;
END;
$$;

GRANT SELECT ON public.registration_health TO authenticated;
GRANT SELECT ON public.payment_analytics TO authenticated;