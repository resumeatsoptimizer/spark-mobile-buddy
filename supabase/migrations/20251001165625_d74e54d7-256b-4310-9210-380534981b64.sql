-- ============================================
-- SECURITY FIX: Resolve security linter warnings
-- ============================================

-- Fix: Update functions to set search_path for security
CREATE OR REPLACE FUNCTION public.validate_event_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.calculate_event_popularity(event_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Note: archive_old_events already has SECURITY DEFINER SET search_path = public