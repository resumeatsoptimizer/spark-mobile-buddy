-- ============================================
-- SECURITY FIX: Fix views to use SECURITY INVOKER
-- ============================================

-- Recreate views with SECURITY INVOKER to fix security definer warnings
DROP VIEW IF EXISTS public.registration_health;
CREATE VIEW public.registration_health
WITH (security_invoker = true)
AS
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

DROP VIEW IF EXISTS public.payment_analytics;
CREATE VIEW public.payment_analytics
WITH (security_invoker = true)
AS
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

-- Re-grant permissions
GRANT SELECT ON public.registration_health TO authenticated;
GRANT SELECT ON public.payment_analytics TO authenticated;