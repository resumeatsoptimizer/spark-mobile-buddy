-- ============================================
-- BUSINESS LOGIC CONSTRAINTS
-- Created: 2025-10-01
-- Purpose: Enforce data integrity at database level
-- ============================================

-- ============================================
-- 1. DATE & TIME CONSTRAINTS
-- ============================================

-- Events: end_date must be after start_date
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS check_event_dates,
ADD CONSTRAINT check_event_dates
  CHECK (end_date > start_date);

-- Events: start_date cannot be in the far past (data quality)
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS check_event_start_date_reasonable,
ADD CONSTRAINT check_event_start_date_reasonable
  CHECK (start_date > '2020-01-01'::timestamptz);

-- Registrations: token expiry must be in future when created
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS check_token_expiry,
ADD CONSTRAINT check_token_expiry
  CHECK (token_expires_at IS NULL OR token_expires_at > created_at);

-- API Keys: expiry must be in future when set
ALTER TABLE public.api_keys
DROP CONSTRAINT IF EXISTS check_api_key_expiry,
ADD CONSTRAINT check_api_key_expiry
  CHECK (expires_at IS NULL OR expires_at > created_at);

-- AI Insights: expiry must be in future when set
ALTER TABLE public.ai_insights
DROP CONSTRAINT IF EXISTS check_insight_expiry,
ADD CONSTRAINT check_insight_expiry
  CHECK (expires_at IS NULL OR expires_at > created_at);

-- ============================================
-- 2. CAPACITY CONSTRAINTS
-- ============================================

-- Events: seats_remaining cannot exceed seats_total
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS check_seats_capacity,
ADD CONSTRAINT check_seats_capacity
  CHECK (seats_remaining <= seats_total);

-- Events: seats_total must be positive
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS check_seats_total_positive;

ALTER TABLE public.events
ADD CONSTRAINT check_seats_total_positive
  CHECK (seats_total > 0);

-- Events: seats_remaining must be non-negative
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS check_seats_remaining_non_negative;

ALTER TABLE public.events
ADD CONSTRAINT check_seats_remaining_non_negative
  CHECK (seats_remaining >= 0);

-- Ticket types: available_quantity must be non-negative
ALTER TABLE public.ticket_types
DROP CONSTRAINT IF EXISTS check_ticket_quantity,
ADD CONSTRAINT check_ticket_quantity
  CHECK (available_quantity >= 0);

-- ============================================
-- 3. FINANCIAL CONSTRAINTS
-- ============================================

-- Payments: amount must be positive
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS check_amount_positive;

ALTER TABLE public.payments
ADD CONSTRAINT check_amount_positive
  CHECK (amount > 0);

-- Ticket types: price must be non-negative
ALTER TABLE public.ticket_types
DROP CONSTRAINT IF EXISTS check_ticket_price,
ADD CONSTRAINT check_ticket_price
  CHECK (price >= 0);

-- API Keys: rate_limit must be positive
ALTER TABLE public.api_keys
DROP CONSTRAINT IF EXISTS check_rate_limit,
ADD CONSTRAINT check_rate_limit
  CHECK (rate_limit > 0);

-- ============================================
-- 4. EMAIL & TEXT FORMAT CONSTRAINTS
-- ============================================

-- Profiles: email format validation
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_email_format,
ADD CONSTRAINT check_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Profiles: email cannot be empty
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_email_not_empty,
ADD CONSTRAINT check_email_not_empty
  CHECK (length(trim(email)) > 0);

-- Events: title cannot be empty or whitespace
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS check_title_not_empty,
ADD CONSTRAINT check_title_not_empty
  CHECK (length(trim(title)) > 0);

-- Organizations: name cannot be empty
ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS check_org_name_not_empty,
ADD CONSTRAINT check_org_name_not_empty
  CHECK (length(trim(name)) > 0);

-- Organizations: slug format (lowercase, alphanumeric, hyphens only)
ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS check_slug_format,
ADD CONSTRAINT check_slug_format
  CHECK (slug ~* '^[a-z0-9-]+$' AND length(slug) >= 3);

-- ============================================
-- 5. ENUM-LIKE CONSTRAINTS
-- ============================================

-- Registrations: status validation
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE public.registrations
ADD CONSTRAINT registrations_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'waitlist'));

-- Registrations: payment_status validation
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_payment_status_check;

ALTER TABLE public.registrations
ADD CONSTRAINT registrations_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid', 'failed'));

-- Payments: status validation
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'success', 'failed'));

-- Event check-ins: method validation
ALTER TABLE public.event_check_ins
DROP CONSTRAINT IF EXISTS check_in_method_valid,
ADD CONSTRAINT check_in_method_valid
  CHECK (check_in_method IN ('qr_code', 'manual', 'nfc', 'facial_recognition'));

-- Security audit log: severity validation
ALTER TABLE public.security_audit_log
DROP CONSTRAINT IF EXISTS check_severity_valid,
ADD CONSTRAINT check_severity_valid
  CHECK (severity IN ('info', 'warning', 'error', 'critical'));

-- ============================================
-- 6. RELATIONSHIP CONSTRAINTS
-- ============================================

-- Payments: must have positive or zero amount (refunds handled separately)
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS check_no_negative_amounts;

ALTER TABLE public.payments
ADD CONSTRAINT check_no_negative_amounts
  CHECK (amount >= 0);

-- Organization memberships: role validation
ALTER TABLE public.organization_memberships
DROP CONSTRAINT IF EXISTS organization_memberships_role_check;

ALTER TABLE public.organization_memberships
ADD CONSTRAINT organization_memberships_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

-- Team memberships: role validation
ALTER TABLE public.team_memberships
DROP CONSTRAINT IF EXISTS team_memberships_role_check;

ALTER TABLE public.team_memberships
ADD CONSTRAINT team_memberships_role_check
  CHECK (role IN ('leader', 'member'));

-- ============================================
-- 7. CONFIDENCE & SCORE CONSTRAINTS
-- ============================================

-- AI Insights: confidence_score between 0 and 1
ALTER TABLE public.ai_insights
DROP CONSTRAINT IF EXISTS check_confidence_score,
ADD CONSTRAINT check_confidence_score
  CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

-- ============================================
-- 8. URL FORMAT CONSTRAINTS
-- ============================================

-- Webhooks: URL must be HTTPS for security
ALTER TABLE public.webhooks
DROP CONSTRAINT IF EXISTS check_webhook_url_secure,
ADD CONSTRAINT check_webhook_url_secure
  CHECK (webhook_url ~* '^https://.*');

-- Organizations: logo_url must be valid URL format if provided
ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS check_logo_url_format,
ADD CONSTRAINT check_logo_url_format
  CHECK (logo_url IS NULL OR logo_url ~* '^https?://.*');

-- Profiles: avatar_url must be valid URL if provided
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_avatar_url_format,
ADD CONSTRAINT check_avatar_url_format
  CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://.*');

-- ============================================
-- 9. PHONE NUMBER CONSTRAINTS (Optional)
-- ============================================

-- Profiles: phone format (basic validation)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_phone_format,
ADD CONSTRAINT check_phone_format
  CHECK (phone IS NULL OR length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 9);

-- ============================================
-- 10. TIMEZONE CONSTRAINTS
-- ============================================

-- Profiles: timezone must be valid (basic check)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_timezone_not_empty,
ADD CONSTRAINT check_timezone_not_empty
  CHECK (timezone IS NULL OR length(trim(timezone)) > 0);

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON CONSTRAINT check_event_dates ON public.events IS
  'Ensures event end date is after start date';

COMMENT ON CONSTRAINT check_seats_capacity ON public.events IS
  'Ensures seats_remaining never exceeds seats_total';

COMMENT ON CONSTRAINT check_amount_positive ON public.payments IS
  'Ensures payment amounts are positive';

COMMENT ON CONSTRAINT check_email_format ON public.profiles IS
  'Validates email format using regex pattern';

COMMENT ON CONSTRAINT check_webhook_url_secure ON public.webhooks IS
  'Enforces HTTPS URLs for webhook security';

-- ============================================
-- Verification Query
-- ============================================

-- Run this to verify all constraints:
-- SELECT conname, contype, conrelid::regclass, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE connamespace = 'public'::regnamespace
-- AND contype = 'c'
-- ORDER BY conrelid::regclass::text, conname;
