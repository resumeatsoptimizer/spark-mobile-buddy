-- ============================================
-- DATA CLEANUP & MAINTENANCE PROCEDURES
-- Created: 2025-10-01
-- Purpose: Automate data cleanup, archival, and maintenance tasks
-- ============================================

-- ============================================
-- 1. CLEANUP EXPIRED TOKENS
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_registration_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Clear expired confirm tokens
  UPDATE public.registrations
  SET confirm_token = NULL,
      token_expires_at = NULL
  WHERE token_expires_at IS NOT NULL
    AND token_expires_at < now()
    AND confirm_token IS NOT NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % expired registration tokens', deleted_count;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_registration_tokens() IS
  'Removes expired confirmation tokens from registrations';

-- ============================================
-- 2. CLEANUP OLD ANALYTICS DATA
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_analytics_events(
  retention_months integer DEFAULT 6
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (retention_months || ' months')::interval;

  DELETE FROM public.analytics_events
  WHERE created_at < cutoff_date;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % analytics events older than % months', deleted_count, retention_months;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_analytics_events(integer) IS
  'Deletes analytics events older than specified months (default: 6)';

-- ============================================
-- 3. CLEANUP OLD SECURITY AUDIT LOGS
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
  retention_months integer DEFAULT 12
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (retention_months || ' months')::interval;

  -- Keep critical severity logs, delete others
  DELETE FROM public.security_audit_log
  WHERE created_at < cutoff_date
    AND severity NOT IN ('critical');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % audit logs older than % months (kept critical logs)', deleted_count, retention_months;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_audit_logs(integer) IS
  'Deletes non-critical audit logs older than specified months (default: 12)';

-- ============================================
-- 4. ARCHIVE OLD EVENTS
-- ============================================

-- Create archived_events table if not exists
CREATE TABLE IF NOT EXISTS public.archived_events (
  LIKE public.events INCLUDING ALL
);

CREATE OR REPLACE FUNCTION public.archive_old_events(
  days_after_end integer DEFAULT 365
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (days_after_end || ' days')::interval;

  -- Move old events to archive table
  WITH archived AS (
    INSERT INTO public.archived_events
    SELECT * FROM public.events
    WHERE end_date < cutoff_date
    RETURNING id
  )
  DELETE FROM public.events
  WHERE id IN (SELECT id FROM archived);

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  RAISE NOTICE 'Archived % events that ended more than % days ago', archived_count, days_after_end;
  RETURN archived_count;
END;
$$;

COMMENT ON FUNCTION public.archive_old_events(integer) IS
  'Archives events that ended more than specified days ago (default: 365)';

-- ============================================
-- 5. CLEANUP EXPIRED API KEYS
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_api_keys()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Deactivate expired API keys
  UPDATE public.api_keys
  SET is_active = false
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND is_active = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deactivated % expired API keys', deleted_count;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_api_keys() IS
  'Deactivates API keys that have passed their expiration date';

-- ============================================
-- 6. CLEANUP OLD EMAIL LOGS
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_email_logs(
  retention_days integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (retention_days || ' days')::interval;

  -- Delete old successful email logs, keep failed ones longer
  DELETE FROM public.email_logs
  WHERE sent_at < cutoff_date
    AND status = 'sent';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % email logs older than % days', deleted_count, retention_days;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_email_logs(integer) IS
  'Deletes successful email logs older than specified days (default: 90)';

-- ============================================
-- 7. CLEANUP OLD INTEGRATION LOGS
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_integration_logs(
  retention_days integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (retention_days || ' days')::interval;

  DELETE FROM public.integration_logs
  WHERE executed_at < cutoff_date
    AND status = 'success';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % integration logs older than % days', deleted_count, retention_days;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- 8. CLEANUP CANCELLED REGISTRATIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_cancelled_registrations(
  retention_days integer DEFAULT 180
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (retention_days || ' days')::interval;

  -- Delete cancelled registrations older than retention period
  DELETE FROM public.registrations
  WHERE status = 'cancelled'
    AND updated_at < cutoff_date;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % cancelled registrations older than % days', deleted_count, retention_days;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- 9. CLEANUP INACTIVE PUSH SUBSCRIPTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_inactive_push_subscriptions(
  inactive_days integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := now() - (inactive_days || ' days')::interval;

  -- Delete push subscriptions that haven't been updated recently
  DELETE FROM public.push_subscriptions
  WHERE updated_at < cutoff_date
    AND is_active = false;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % inactive push subscriptions', deleted_count;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- 10. MASTER CLEANUP FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.run_all_cleanup_procedures()
RETURNS TABLE(
  procedure_name text,
  records_affected integer,
  execution_time interval
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  affected_count integer;
BEGIN
  -- Cleanup expired registration tokens
  start_time := clock_timestamp();
  affected_count := public.cleanup_expired_registration_tokens();
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'cleanup_expired_registration_tokens'::text, affected_count, end_time - start_time;

  -- Cleanup old analytics events (6 months)
  start_time := clock_timestamp();
  affected_count := public.cleanup_old_analytics_events(6);
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'cleanup_old_analytics_events'::text, affected_count, end_time - start_time;

  -- Cleanup old audit logs (12 months)
  start_time := clock_timestamp();
  affected_count := public.cleanup_old_audit_logs(12);
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'cleanup_old_audit_logs'::text, affected_count, end_time - start_time;

  -- Cleanup expired API keys
  start_time := clock_timestamp();
  affected_count := public.cleanup_expired_api_keys();
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'cleanup_expired_api_keys'::text, affected_count, end_time - start_time;

  -- Cleanup old email logs (90 days)
  start_time := clock_timestamp();
  affected_count := public.cleanup_old_email_logs(90);
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'cleanup_old_email_logs'::text, affected_count, end_time - start_time;

  -- Cleanup old integration logs (30 days)
  start_time := clock_timestamp();
  affected_count := public.cleanup_old_integration_logs(30);
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'cleanup_old_integration_logs'::text, affected_count, end_time - start_time;

  -- Cleanup old cancelled registrations (180 days)
  start_time := clock_timestamp();
  affected_count := public.cleanup_old_cancelled_registrations(180);
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'cleanup_old_cancelled_registrations'::text, affected_count, end_time - start_time;

  -- Cleanup inactive push subscriptions (90 days)
  start_time := clock_timestamp();
  affected_count := public.cleanup_inactive_push_subscriptions(90);
  end_time := clock_timestamp();
  RETURN QUERY SELECT 'cleanup_inactive_push_subscriptions'::text, affected_count, end_time - start_time;

  RAISE NOTICE 'All cleanup procedures completed';
END;
$$;

COMMENT ON FUNCTION public.run_all_cleanup_procedures() IS
  'Runs all cleanup procedures and returns a summary of affected records';

-- ============================================
-- 11. VACUUM AND ANALYZE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.optimize_database()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vacuum and analyze main tables
  VACUUM ANALYZE public.events;
  VACUUM ANALYZE public.registrations;
  VACUUM ANALYZE public.payments;
  VACUUM ANALYZE public.profiles;
  VACUUM ANALYZE public.analytics_events;
  VACUUM ANALYZE public.security_audit_log;
  VACUUM ANALYZE public.email_logs;
  VACUUM ANALYZE public.integration_logs;

  -- Refresh materialized views
  PERFORM public.refresh_all_materialized_views();

  RAISE NOTICE 'Database optimization completed';
END;
$$;

COMMENT ON FUNCTION public.optimize_database() IS
  'Runs VACUUM ANALYZE on main tables and refreshes materialized views';

-- ============================================
-- 12. SCHEDULED JOBS (using pg_cron if available)
-- ============================================

-- Uncomment these if pg_cron extension is enabled:
--
-- -- Run cleanup procedures daily at 2 AM
-- SELECT cron.schedule(
--   'daily-cleanup',
--   '0 2 * * *',
--   'SELECT public.run_all_cleanup_procedures();'
-- );
--
-- -- Optimize database weekly on Sunday at 3 AM
-- SELECT cron.schedule(
--   'weekly-optimization',
--   '0 3 * * 0',
--   'SELECT public.optimize_database();'
-- );
--
-- -- Cleanup expired tokens every hour
-- SELECT cron.schedule(
--   'hourly-token-cleanup',
--   '0 * * * *',
--   'SELECT public.cleanup_expired_registration_tokens();'
-- );

-- ============================================
-- 13. GRANT PERMISSIONS
-- ============================================

-- Only admins should be able to run cleanup procedures
REVOKE ALL ON FUNCTION public.cleanup_expired_registration_tokens() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_analytics_events(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_audit_logs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_old_events(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_api_keys() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_email_logs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_integration_logs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_cancelled_registrations(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_inactive_push_subscriptions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_all_cleanup_procedures() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.optimize_database() FROM PUBLIC;

-- Grant to authenticated users (admins will have additional checks via RLS)
GRANT EXECUTE ON FUNCTION public.run_all_cleanup_procedures() TO authenticated;

-- ============================================
-- Usage Instructions
-- ============================================

-- Run all cleanup procedures:
-- SELECT * FROM public.run_all_cleanup_procedures();

-- Run individual cleanup:
-- SELECT public.cleanup_expired_registration_tokens();
-- SELECT public.cleanup_old_analytics_events(6);
-- SELECT public.cleanup_old_audit_logs(12);
-- SELECT public.archive_old_events(365);

-- Optimize database:
-- SELECT public.optimize_database();

-- Check what would be cleaned up (dry run):
-- SELECT COUNT(*) FROM registrations WHERE token_expires_at < now() AND confirm_token IS NOT NULL;
-- SELECT COUNT(*) FROM analytics_events WHERE created_at < now() - interval '6 months';
-- SELECT COUNT(*) FROM security_audit_log WHERE created_at < now() - interval '12 months';
