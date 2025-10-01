-- ============================================
-- DATABASE MONITORING & HEALTH CHECK VIEWS
-- Created: 2025-10-01
-- Purpose: Monitor database performance, health, and resource usage
-- ============================================

-- ============================================
-- 1. SLOW QUERY MONITORING
-- ============================================

-- Note: Requires pg_stat_statements extension
-- Enable with: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE OR REPLACE VIEW public.slow_queries AS
SELECT
  substring(query, 1, 100) as query_snippet,
  calls,
  ROUND(total_exec_time::numeric, 2) as total_time_ms,
  ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
  ROUND(max_exec_time::numeric, 2) as max_time_ms,
  ROUND(stddev_exec_time::numeric, 2) as stddev_time_ms,
  rows,
  ROUND((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) as cache_hit_ratio
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND mean_exec_time > 100  -- Queries slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 50;

COMMENT ON VIEW public.slow_queries IS
  'Top 50 slowest queries with execution statistics (requires pg_stat_statements)';

-- ============================================
-- 2. INDEX USAGE STATISTICS
-- ============================================

CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping'
    WHEN idx_scan < 100 THEN 'Low usage'
    WHEN idx_scan < 1000 THEN 'Moderate usage'
    ELSE 'High usage'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW public.index_usage_stats IS
  'Index usage statistics to identify unused or underutilized indexes';

-- ============================================
-- 3. TABLE BLOAT ANALYSIS
-- ============================================

CREATE OR REPLACE VIEW public.table_bloat_stats AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                 pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  ROUND((n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0))::numeric, 2) as dead_row_percent,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  CASE
    WHEN n_dead_tup > n_live_tup * 0.2 THEN 'VACUUM NEEDED'
    WHEN n_dead_tup > n_live_tup * 0.1 THEN 'Consider vacuuming'
    ELSE 'OK'
  END as health_status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

COMMENT ON VIEW public.table_bloat_stats IS
  'Table bloat analysis and vacuum recommendations';

-- ============================================
-- 4. CACHE HIT RATIO
-- ============================================

CREATE OR REPLACE VIEW public.cache_hit_ratio AS
SELECT
  'Tables' as object_type,
  ROUND((SUM(heap_blks_hit) * 100.0 / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0))::numeric, 2) as hit_ratio_percent,
  SUM(heap_blks_hit) as cache_hits,
  SUM(heap_blks_read) as disk_reads,
  CASE
    WHEN ROUND((SUM(heap_blks_hit) * 100.0 / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0))::numeric, 2) > 99 THEN 'Excellent'
    WHEN ROUND((SUM(heap_blks_hit) * 100.0 / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0))::numeric, 2) > 95 THEN 'Good'
    WHEN ROUND((SUM(heap_blks_hit) * 100.0 / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0))::numeric, 2) > 90 THEN 'Fair'
    ELSE 'Poor - Increase shared_buffers'
  END as status
FROM pg_statio_user_tables
WHERE schemaname = 'public'

UNION ALL

SELECT
  'Indexes' as object_type,
  ROUND((SUM(idx_blks_hit) * 100.0 / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0))::numeric, 2) as hit_ratio_percent,
  SUM(idx_blks_hit) as cache_hits,
  SUM(idx_blks_read) as disk_reads,
  CASE
    WHEN ROUND((SUM(idx_blks_hit) * 100.0 / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0))::numeric, 2) > 99 THEN 'Excellent'
    WHEN ROUND((SUM(idx_blks_hit) * 100.0 / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0))::numeric, 2) > 95 THEN 'Good'
    WHEN ROUND((SUM(idx_blks_hit) * 100.0 / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0))::numeric, 2) > 90 THEN 'Fair'
    ELSE 'Poor - Increase shared_buffers'
  END as status
FROM pg_statio_user_indexes
WHERE schemaname = 'public';

COMMENT ON VIEW public.cache_hit_ratio IS
  'Database cache hit ratio for tables and indexes';

-- ============================================
-- 5. DATABASE SIZE OVERVIEW
-- ============================================

CREATE OR REPLACE VIEW public.database_size_overview AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                 pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
  pg_total_relation_size(schemaname||'.'||tablename) as total_bytes,
  n_live_tup as row_count,
  ROUND((pg_total_relation_size(schemaname||'.'||tablename) * 100.0 /
         NULLIF(SUM(pg_total_relation_size(schemaname||'.'||tablename))
                OVER(), 0))::numeric, 2) as percent_of_total
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW public.database_size_overview IS
  'Overview of table sizes and their percentage of total database size';

-- ============================================
-- 6. ACTIVE CONNECTIONS MONITOR
-- ============================================

CREATE OR REPLACE VIEW public.active_connections AS
SELECT
  pid,
  usename as username,
  application_name,
  client_addr,
  client_port,
  backend_start,
  state,
  state_change,
  query_start,
  CASE
    WHEN state = 'active' THEN EXTRACT(EPOCH FROM (now() - query_start))
    ELSE NULL
  END as query_duration_seconds,
  substring(query, 1, 100) as current_query,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid()
ORDER BY query_start DESC NULLS LAST;

COMMENT ON VIEW public.active_connections IS
  'Currently active database connections and their queries';

-- ============================================
-- 7. LONG RUNNING QUERIES
-- ============================================

CREATE OR REPLACE VIEW public.long_running_queries AS
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  now() - query_start as duration,
  substring(query, 1, 200) as query
FROM pg_stat_activity
WHERE state != 'idle'
  AND pid != pg_backend_pid()
  AND (now() - query_start) > interval '30 seconds'
ORDER BY (now() - query_start) DESC;

COMMENT ON VIEW public.long_running_queries IS
  'Queries running longer than 30 seconds';

-- ============================================
-- 8. LOCK MONITORING
-- ============================================

CREATE OR REPLACE VIEW public.blocking_locks AS
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement,
  blocked_activity.application_name AS blocked_application,
  blocking_activity.application_name AS blocking_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

COMMENT ON VIEW public.blocking_locks IS
  'Queries that are blocking other queries';

-- ============================================
-- 9. REPLICATION LAG (if applicable)
-- ============================================

CREATE OR REPLACE VIEW public.replication_status AS
SELECT
  client_addr,
  client_hostname,
  state,
  sync_state,
  ROUND(EXTRACT(EPOCH FROM (now() - backend_start))::numeric, 2) as connection_duration_seconds,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)) as sent_lag,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn)) as write_lag,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)) as flush_lag,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) as replay_lag
FROM pg_stat_replication;

COMMENT ON VIEW public.replication_status IS
  'Replication status and lag information';

-- ============================================
-- 10. HEALTH CHECK DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW public.database_health_dashboard AS
SELECT
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value,
  'Info' as severity
UNION ALL
SELECT
  'Total Tables',
  COUNT(*)::text,
  'Info'
FROM pg_stat_user_tables
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Total Indexes',
  COUNT(*)::text,
  'Info'
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Active Connections',
  COUNT(*)::text,
  CASE WHEN COUNT(*) > 80 THEN 'Warning' ELSE 'OK' END
FROM pg_stat_activity
WHERE datname = current_database()
UNION ALL
SELECT
  'Long Running Queries (>30s)',
  COUNT(*)::text,
  CASE WHEN COUNT(*) > 0 THEN 'Warning' ELSE 'OK' END
FROM pg_stat_activity
WHERE state != 'idle'
  AND (now() - query_start) > interval '30 seconds'
  AND pid != pg_backend_pid()
UNION ALL
SELECT
  'Tables Needing Vacuum',
  COUNT(*)::text,
  CASE WHEN COUNT(*) > 5 THEN 'Warning' ELSE 'OK' END
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > n_live_tup * 0.2
UNION ALL
SELECT
  'Unused Indexes',
  COUNT(*)::text,
  CASE WHEN COUNT(*) > 10 THEN 'Warning' ELSE 'Info' END
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0;

COMMENT ON VIEW public.database_health_dashboard IS
  'Quick overview of database health metrics';

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================

-- Grant read access to authenticated users
GRANT SELECT ON public.slow_queries TO authenticated;
GRANT SELECT ON public.index_usage_stats TO authenticated;
GRANT SELECT ON public.table_bloat_stats TO authenticated;
GRANT SELECT ON public.cache_hit_ratio TO authenticated;
GRANT SELECT ON public.database_size_overview TO authenticated;
GRANT SELECT ON public.active_connections TO authenticated;
GRANT SELECT ON public.long_running_queries TO authenticated;
GRANT SELECT ON public.blocking_locks TO authenticated;
GRANT SELECT ON public.replication_status TO authenticated;
GRANT SELECT ON public.database_health_dashboard TO authenticated;

-- ============================================
-- 12. HELPER FUNCTION: Reset Query Statistics
-- ============================================

CREATE OR REPLACE FUNCTION public.reset_query_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset pg_stat_statements (if available)
  PERFORM pg_stat_statements_reset();

  -- Reset table statistics
  PERFORM pg_stat_reset();

  RAISE NOTICE 'Query statistics have been reset';
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_stat_statements extension not available';
END;
$$;

COMMENT ON FUNCTION public.reset_query_statistics() IS
  'Resets query statistics for fresh monitoring data';

-- ============================================
-- Usage Instructions
-- ============================================

-- View slow queries:
-- SELECT * FROM public.slow_queries;

-- Check index usage:
-- SELECT * FROM public.index_usage_stats WHERE usage_status = 'UNUSED - Consider dropping';

-- Check table bloat:
-- SELECT * FROM public.table_bloat_stats WHERE health_status != 'OK';

-- View cache hit ratio:
-- SELECT * FROM public.cache_hit_ratio;

-- Check database size:
-- SELECT * FROM public.database_size_overview LIMIT 10;

-- Monitor active connections:
-- SELECT * FROM public.active_connections;

-- Find long running queries:
-- SELECT * FROM public.long_running_queries;

-- Check for blocking locks:
-- SELECT * FROM public.blocking_locks;

-- Quick health check:
-- SELECT * FROM public.database_health_dashboard;

-- Reset statistics (for fresh monitoring):
-- SELECT public.reset_query_statistics();
