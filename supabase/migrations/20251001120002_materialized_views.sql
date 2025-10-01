-- ============================================
-- MATERIALIZED VIEWS for Analytics & Performance
-- Created: 2025-10-01
-- Purpose: Pre-compute expensive aggregations for dashboards
-- ============================================

-- ============================================
-- 1. EVENT STATISTICS VIEW
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_event_statistics AS
SELECT
  e.id as event_id,
  e.title,
  e.start_date,
  e.end_date,
  e.seats_total,
  e.seats_remaining,
  e.created_by,
  e.created_at,

  -- Registration statistics
  COUNT(DISTINCT r.id) as total_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'pending') as pending_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled') as cancelled_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'waitlist') as waitlist_count,

  -- Payment statistics
  COUNT(DISTINCT p.id) as total_payments,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'success') as successful_payments,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) as total_revenue,
  COALESCE(AVG(p.amount) FILTER (WHERE p.status = 'success'), 0) as average_ticket_price,

  -- Check-in statistics
  COUNT(DISTINCT ec.id) as total_checkins,
  COALESCE(
    COUNT(DISTINCT ec.id)::float / NULLIF(COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed'), 0) * 100,
    0
  ) as checkin_rate_percentage,

  -- Capacity metrics
  ROUND(
    (e.seats_total - e.seats_remaining)::numeric / NULLIF(e.seats_total, 0) * 100,
    2
  ) as capacity_utilization_percentage,

  -- Time metrics
  now() as last_refreshed

FROM public.events e
LEFT JOIN public.registrations r ON r.event_id = e.id
LEFT JOIN public.payments p ON p.registration_id = r.id
LEFT JOIN public.event_check_ins ec ON ec.event_id = e.id

GROUP BY e.id, e.title, e.start_date, e.end_date, e.seats_total,
         e.seats_remaining, e.created_by, e.created_at;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_event_stats_event_id
  ON public.mv_event_statistics(event_id);

CREATE INDEX IF NOT EXISTS idx_mv_event_stats_start_date
  ON public.mv_event_statistics(start_date DESC);

CREATE INDEX IF NOT EXISTS idx_mv_event_stats_revenue
  ON public.mv_event_statistics(total_revenue DESC);

COMMENT ON MATERIALIZED VIEW public.mv_event_statistics IS
  'Pre-computed event statistics for dashboard performance';

-- ============================================
-- 2. USER ACTIVITY SUMMARY
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_user_activity_summary AS
SELECT
  p.id as user_id,
  p.email,
  p.name,
  p.created_at as user_since,

  -- Registration metrics
  COUNT(DISTINCT r.id) as total_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled') as cancelled_registrations,

  -- Payment metrics
  COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'success') as successful_payments,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'success'), 0) as total_spent,

  -- Check-in metrics
  COUNT(DISTINCT ec.id) as total_checkins,

  -- Last activity
  MAX(r.created_at) as last_registration_date,
  MAX(ec.checked_in_at) as last_checkin_date,

  -- Engagement score (simple calculation)
  (
    COUNT(DISTINCT r.id) * 10 +
    COUNT(DISTINCT ec.id) * 5 +
    COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'success') * 15
  ) as engagement_score,

  now() as last_refreshed

FROM public.profiles p
LEFT JOIN public.registrations r ON r.user_id = p.id
LEFT JOIN public.payments pay ON pay.registration_id = r.id
LEFT JOIN public.event_check_ins ec ON ec.registration_id = r.id

GROUP BY p.id, p.email, p.name, p.created_at;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_activity_user_id
  ON public.mv_user_activity_summary(user_id);

CREATE INDEX IF NOT EXISTS idx_mv_user_activity_engagement
  ON public.mv_user_activity_summary(engagement_score DESC);

CREATE INDEX IF NOT EXISTS idx_mv_user_activity_total_spent
  ON public.mv_user_activity_summary(total_spent DESC);

COMMENT ON MATERIALIZED VIEW public.mv_user_activity_summary IS
  'User engagement and activity metrics';

-- ============================================
-- 3. DAILY REVENUE SUMMARY
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_daily_revenue AS
SELECT
  DATE(p.created_at) as date,
  COUNT(DISTINCT p.id) as payment_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'success') as successful_payments,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'failed') as failed_payments,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) as total_revenue,
  COALESCE(AVG(p.amount) FILTER (WHERE p.status = 'success'), 0) as average_payment,
  COUNT(DISTINCT p.registration_id) as unique_customers,

  now() as last_refreshed

FROM public.payments p
WHERE p.created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY DATE(p.created_at)
ORDER BY DATE(p.created_at) DESC;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_revenue_date
  ON public.mv_daily_revenue(date DESC);

COMMENT ON MATERIALIZED VIEW public.mv_daily_revenue IS
  'Daily revenue aggregations for financial dashboards';

-- ============================================
-- 4. ORGANIZATION STATISTICS
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_organization_statistics AS
SELECT
  o.id as organization_id,
  o.name,
  o.created_at,

  -- Member statistics
  COUNT(DISTINCT om.user_id) as total_members,
  COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'owner') as owner_count,
  COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'admin') as admin_count,
  COUNT(DISTINCT om.user_id) FILTER (WHERE om.role = 'member') as member_count,

  -- Team statistics
  COUNT(DISTINCT t.id) as total_teams,
  COUNT(DISTINCT tm.user_id) as total_team_members,

  -- API & Integration statistics
  COUNT(DISTINCT ak.id) as total_api_keys,
  COUNT(DISTINCT ak.id) FILTER (WHERE ak.is_active = true) as active_api_keys,
  COUNT(DISTINCT w.id) as total_webhooks,
  COUNT(DISTINCT w.id) FILTER (WHERE w.is_active = true) as active_webhooks,

  now() as last_refreshed

FROM public.organizations o
LEFT JOIN public.organization_memberships om ON om.organization_id = o.id
LEFT JOIN public.teams t ON t.organization_id = o.id
LEFT JOIN public.team_memberships tm ON tm.team_id = t.id
LEFT JOIN public.api_keys ak ON ak.organization_id = o.id
LEFT JOIN public.webhooks w ON w.organization_id = o.id

GROUP BY o.id, o.name, o.created_at;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_org_stats_org_id
  ON public.mv_organization_statistics(organization_id);

COMMENT ON MATERIALIZED VIEW public.mv_organization_statistics IS
  'Organization membership and resource statistics';

-- ============================================
-- 5. EVENT CATEGORY PERFORMANCE
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_category_performance AS
SELECT
  ec.id as category_id,
  ec.name as category_name,
  ec.description,

  -- Event statistics
  COUNT(DISTINCT ecm.event_id) as total_events,

  -- Registration statistics (via events)
  COUNT(DISTINCT r.id) as total_registrations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') as confirmed_registrations,

  -- Revenue statistics
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) as total_revenue,
  COALESCE(AVG(p.amount) FILTER (WHERE p.status = 'success'), 0) as average_revenue_per_event,

  -- Popularity metrics
  COALESCE(
    COUNT(DISTINCT r.id)::float / NULLIF(COUNT(DISTINCT ecm.event_id), 0),
    0
  ) as average_registrations_per_event,

  now() as last_refreshed

FROM public.event_categories ec
LEFT JOIN public.event_category_mapping ecm ON ecm.category_id = ec.id
LEFT JOIN public.registrations r ON r.event_id = ecm.event_id
LEFT JOIN public.payments p ON p.registration_id = r.id

GROUP BY ec.id, ec.name, ec.description;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_category_perf_category_id
  ON public.mv_category_performance(category_id);

CREATE INDEX IF NOT EXISTS idx_mv_category_perf_revenue
  ON public.mv_category_performance(total_revenue DESC);

COMMENT ON MATERIALIZED VIEW public.mv_category_performance IS
  'Event category performance metrics for trend analysis';

-- ============================================
-- REFRESH FUNCTIONS
-- ============================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_event_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_user_activity_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_organization_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_category_performance;

  RAISE NOTICE 'All materialized views refreshed successfully at %', now();
END;
$$;

COMMENT ON FUNCTION public.refresh_all_materialized_views() IS
  'Refresh all materialized views concurrently for dashboard data';

-- Function to refresh only event-related views (faster)
CREATE OR REPLACE FUNCTION public.refresh_event_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_event_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_category_performance;

  RAISE NOTICE 'Event materialized views refreshed at %', now();
END;
$$;

-- ============================================
-- SCHEDULED REFRESH (using pg_cron if available)
-- ============================================

-- Uncomment if pg_cron extension is enabled:
--
-- -- Refresh all views every hour
-- SELECT cron.schedule(
--   'refresh-materialized-views',
--   '0 * * * *',  -- Every hour at minute 0
--   'SELECT public.refresh_all_materialized_views();'
-- );
--
-- -- Refresh event views every 15 minutes
-- SELECT cron.schedule(
--   'refresh-event-views',
--   '*/15 * * * *',  -- Every 15 minutes
--   'SELECT public.refresh_event_views();'
-- );

-- ============================================
-- RLS POLICIES for Materialized Views
-- ============================================

ALTER MATERIALIZED VIEW public.mv_event_statistics OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_user_activity_summary OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_daily_revenue OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_organization_statistics OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_category_performance OWNER TO postgres;

-- Grant read access to authenticated users
GRANT SELECT ON public.mv_event_statistics TO authenticated;
GRANT SELECT ON public.mv_user_activity_summary TO authenticated;
GRANT SELECT ON public.mv_daily_revenue TO authenticated;
GRANT SELECT ON public.mv_organization_statistics TO authenticated;
GRANT SELECT ON public.mv_category_performance TO authenticated;

-- ============================================
-- Initial Refresh
-- ============================================

-- Perform initial refresh
SELECT public.refresh_all_materialized_views();

-- ============================================
-- Usage Instructions
-- ============================================

-- To manually refresh all views:
-- SELECT public.refresh_all_materialized_views();

-- To refresh only event views:
-- SELECT public.refresh_event_views();

-- To check when views were last refreshed:
-- SELECT 'mv_event_statistics', last_refreshed FROM mv_event_statistics LIMIT 1
-- UNION ALL
-- SELECT 'mv_user_activity_summary', last_refreshed FROM mv_user_activity_summary LIMIT 1
-- UNION ALL
-- SELECT 'mv_daily_revenue', last_refreshed FROM mv_daily_revenue LIMIT 1;
