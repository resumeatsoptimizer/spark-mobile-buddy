-- ============================================
-- PERFORMANCE OPTIMIZATION: Additional Indexes
-- Created: 2025-10-01
-- Purpose: Improve query performance with strategic indexes
-- ============================================

-- ============================================
-- 1. COMPOSITE INDEXES for Complex Queries
-- ============================================

-- Events with status filtering (common in admin dashboard)
CREATE INDEX IF NOT EXISTS idx_registrations_event_status
  ON public.registrations(event_id, status);

-- User registrations by status (user dashboard)
CREATE INDEX IF NOT EXISTS idx_registrations_user_status
  ON public.registrations(user_id, status);

-- Payment queries by status and date
CREATE INDEX IF NOT EXISTS idx_payments_status_created
  ON public.payments(status, created_at DESC);

-- Events by date range (event listing)
CREATE INDEX IF NOT EXISTS idx_events_dates
  ON public.events(start_date, end_date);

-- Organization memberships by role
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_role
  ON public.organization_memberships(organization_id, role);

-- Analytics events by category and date
CREATE INDEX IF NOT EXISTS idx_analytics_category_date
  ON public.analytics_events(event_category, created_at DESC);

-- Check-ins by event and date
CREATE INDEX IF NOT EXISTS idx_checkins_event_date
  ON public.event_check_ins(event_id, checked_in_at DESC);

-- ============================================
-- 2. GIN INDEXES for JSONB Columns
-- ============================================

-- Events custom fields (searching/filtering)
CREATE INDEX IF NOT EXISTS idx_events_custom_fields
  ON public.events USING GIN (custom_fields);

-- Registration form data
CREATE INDEX IF NOT EXISTS idx_registrations_form_data
  ON public.registrations USING GIN (form_data);

-- Profile preferences
CREATE INDEX IF NOT EXISTS idx_profiles_preferences
  ON public.profiles USING GIN (preferences);

-- Profile social links
CREATE INDEX IF NOT EXISTS idx_profiles_social_links
  ON public.profiles USING GIN (social_links);

-- Integration settings encrypted_settings
CREATE INDEX IF NOT EXISTS idx_integration_settings_config
  ON public.integration_settings USING GIN (encrypted_settings);

-- Analytics event properties
CREATE INDEX IF NOT EXISTS idx_analytics_event_properties
  ON public.analytics_events USING GIN (event_properties);

-- AI insights data
CREATE INDEX IF NOT EXISTS idx_ai_insights_data
  ON public.ai_insights USING GIN (insight_data);

-- ============================================
-- 3. PARTIAL INDEXES for Active Records
-- ============================================

-- Active API keys only
CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON public.api_keys(organization_id, is_active)
  WHERE is_active = true;

-- Active webhooks only
CREATE INDEX IF NOT EXISTS idx_webhooks_active
  ON public.webhooks(organization_id, is_active)
  WHERE is_active = true;

-- Active push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
  ON public.push_subscriptions(user_id)
  WHERE is_active = true;

-- Pending payments (for processing)
CREATE INDEX IF NOT EXISTS idx_payments_pending
  ON public.payments(created_at DESC)
  WHERE status = 'pending';

-- Confirmed registrations (most common status)
CREATE INDEX IF NOT EXISTS idx_registrations_confirmed
  ON public.registrations(event_id, user_id)
  WHERE status = 'confirmed';

-- Upcoming events (future events only)
CREATE INDEX IF NOT EXISTS idx_events_upcoming
  ON public.events(start_date ASC)
  WHERE start_date > CURRENT_TIMESTAMP;

-- Pending scheduled tasks
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_pending_v2
  ON public.scheduled_tasks(task_type, scheduled_for ASC)
  WHERE status = 'pending';

-- ============================================
-- 4. COVERING INDEXES (Include columns)
-- ============================================

-- Event listing with basic info (avoid table lookups)
CREATE INDEX IF NOT EXISTS idx_events_list_covering
  ON public.events(start_date DESC)
  INCLUDE (title, seats_remaining, created_by);

-- Registration list with status
CREATE INDEX IF NOT EXISTS idx_registrations_list_covering
  ON public.registrations(event_id)
  INCLUDE (user_id, status, created_at);

-- ============================================
-- 5. TEXT PATTERN INDEXES for Search
-- ============================================

-- Email search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_email_pattern
  ON public.profiles(LOWER(email) text_pattern_ops);

-- Event title search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_events_title_pattern
  ON public.events(LOWER(title) text_pattern_ops);

-- Organization name search
CREATE INDEX IF NOT EXISTS idx_organizations_name_pattern
  ON public.organizations(LOWER(name) text_pattern_ops);

-- ============================================
-- 6. HASH INDEXES for Equality Comparisons
-- ============================================

-- Omise charge ID lookups (exact match only)
CREATE INDEX IF NOT EXISTS idx_payments_omise_hash
  ON public.payments USING HASH (omise_charge_id);

-- API key lookups (exact match)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON public.api_keys USING HASH (api_key);

-- Confirm token lookups
CREATE INDEX IF NOT EXISTS idx_registrations_token_hash
  ON public.registrations USING HASH (confirm_token);

-- ============================================
-- Analysis & Verification
-- ============================================

COMMENT ON INDEX idx_registrations_event_status IS
  'Composite index for filtering registrations by event and status';

COMMENT ON INDEX idx_events_custom_fields IS
  'GIN index for JSONB queries on event custom fields';

COMMENT ON INDEX idx_api_keys_active IS
  'Partial index for active API keys only, reduces index size';

-- ============================================
-- Index Statistics
-- ============================================

-- Run this to verify index usage after deployment:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;
