-- Fix Bangkok Half Marathon 2025 seats based on actual paid registrations
UPDATE public.events
SET seats_remaining = seats_total - (
  SELECT COALESCE(COUNT(*), 0)
  FROM public.registrations r
  INNER JOIN public.payments p ON p.registration_id = r.id
  WHERE r.event_id = events.id
    AND p.status IN ('success', 'successful', 'completed')
    AND r.status IN ('confirmed', 'pending')
)
WHERE title = 'Bangkok Half Marathon 2025';