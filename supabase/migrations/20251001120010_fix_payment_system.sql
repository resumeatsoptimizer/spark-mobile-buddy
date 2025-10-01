-- ============================================
-- PAYMENT SYSTEM FIXES & IMPROVEMENTS
-- Created: 2025-10-01
-- Purpose: Fix payment schema issues and add missing features
-- ============================================

-- ============================================
-- 1. FIX STATUS ENUM MISMATCH
-- ============================================

-- Update existing 'successful' to 'success' (database standard)
UPDATE public.payments
SET status = 'success'
WHERE status = 'successful';

-- Recreate constraint with correct values
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'processing'));

COMMENT ON CONSTRAINT payments_status_check ON public.payments IS
  'Valid payment statuses: pending, success, failed, refunded, processing';

-- ============================================
-- 2. ADD MISSING COLUMNS
-- ============================================

-- Card information (last 4 digits and brand)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS card_brand TEXT,
ADD COLUMN IF NOT EXISTS card_last4 TEXT;

-- Receipt and documentation
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- Refund tracking
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0;

-- Payment metadata (store full Omise response)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}';

-- Idempotency and retry tracking
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Failure tracking
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS failure_code TEXT,
ADD COLUMN IF NOT EXISTS failure_message TEXT;

-- 3D Secure information
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS require_3ds BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS authorize_uri TEXT;

COMMENT ON COLUMN public.payments.payment_metadata IS
  'Full payment gateway response for audit and debugging';

COMMENT ON COLUMN public.payments.idempotency_key IS
  'Unique key to prevent duplicate charges';

-- ============================================
-- 3. CREATE PAYMENT AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'authorized', 'captured', 'failed', 'refunded', 'cancelled')),
  previous_status TEXT,
  new_status TEXT,
  amount DECIMAL(10, 2),
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_payment_id
  ON public.payment_audit_log(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_audit_created_at
  ON public.payment_audit_log(created_at DESC);

ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.payment_audit_log IS
  'Audit trail for all payment-related actions';

-- ============================================
-- 4. CREATE PAYMENT WEBHOOKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed
  ON public.payment_webhooks(processed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_payment_id
  ON public.payment_webhooks(payment_id);

ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.payment_webhooks IS
  'Store and track payment gateway webhook events';

-- ============================================
-- 5. ADD PAYMENT CONSTRAINTS
-- ============================================

-- Refund amount cannot exceed original amount
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS check_refund_amount,
ADD CONSTRAINT check_refund_amount
  CHECK (refund_amount >= 0 AND refund_amount <= amount);

-- Card last 4 digits format
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS check_card_last4,
ADD CONSTRAINT check_card_last4
  CHECK (card_last4 IS NULL OR (card_last4 ~ '^\d{4}$'));

-- Idempotency key format
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS check_idempotency_key,
ADD CONSTRAINT check_idempotency_key
  CHECK (idempotency_key IS NULL OR length(idempotency_key) >= 16);

-- ============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for idempotency key lookups
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key
  ON public.payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for failed payments that need retry
CREATE INDEX IF NOT EXISTS idx_payments_failed_retry
  ON public.payments(created_at DESC)
  WHERE status = 'failed' AND retry_count < 3;

-- Index for pending payments
CREATE INDEX IF NOT EXISTS idx_payments_pending_created
  ON public.payments(created_at ASC)
  WHERE status = 'pending';

-- Index for refunded payments
CREATE INDEX IF NOT EXISTS idx_payments_refunded
  ON public.payments(refunded_at DESC)
  WHERE status = 'refunded';

-- Index for payment metadata queries
CREATE INDEX IF NOT EXISTS idx_payments_metadata
  ON public.payments USING GIN (payment_metadata);

-- ============================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to log payment actions
CREATE OR REPLACE FUNCTION public.log_payment_action(
  p_payment_id UUID,
  p_action_type TEXT,
  p_previous_status TEXT,
  p_new_status TEXT,
  p_amount DECIMAL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.payment_audit_log (
    payment_id,
    action_type,
    previous_status,
    new_status,
    amount,
    metadata,
    user_id
  )
  VALUES (
    p_payment_id,
    p_action_type,
    p_previous_status,
    p_new_status,
    p_amount,
    p_metadata,
    auth.uid()
  )
  RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$;

COMMENT ON FUNCTION public.log_payment_action IS
  'Logs payment actions to audit trail';

-- Function to check if payment can be refunded
CREATE OR REPLACE FUNCTION public.can_refund_payment(p_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  payment_record RECORD;
BEGIN
  SELECT status, amount, refund_amount, created_at
  INTO payment_record
  FROM public.payments
  WHERE id = p_payment_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Can only refund successful payments
  IF payment_record.status != 'success' THEN
    RETURN FALSE;
  END IF;

  -- Cannot refund if already fully refunded
  IF payment_record.refund_amount >= payment_record.amount THEN
    RETURN FALSE;
  END IF;

  -- Cannot refund payments older than 6 months (Omise limitation)
  IF payment_record.created_at < now() - INTERVAL '6 months' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.can_refund_payment IS
  'Checks if a payment can be refunded based on business rules';

-- Function to get payment statistics
CREATE OR REPLACE FUNCTION public.get_payment_statistics(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_payments BIGINT,
  successful_payments BIGINT,
  failed_payments BIGINT,
  pending_payments BIGINT,
  total_amount DECIMAL,
  successful_amount DECIMAL,
  refunded_amount DECIMAL,
  average_amount DECIMAL,
  success_rate DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_payments,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_payments,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_payments,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_payments,
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) as successful_amount,
    COALESCE(SUM(refund_amount), 0) as refunded_amount,
    COALESCE(AVG(amount) FILTER (WHERE status = 'success'), 0) as average_amount,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('success', 'failed')) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE status = 'success')::DECIMAL /
               COUNT(*) FILTER (WHERE status IN ('success', 'failed'))::DECIMAL * 100), 2)
      ELSE 0
    END as success_rate
  FROM public.payments
  WHERE (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date);
END;
$$;

COMMENT ON FUNCTION public.get_payment_statistics IS
  'Get payment statistics for a given date range';

-- ============================================
-- 8. CREATE TRIGGERS
-- ============================================

-- Trigger to auto-log payment status changes
CREATE OR REPLACE FUNCTION public.trigger_log_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_payment_action(
      NEW.id,
      CASE
        WHEN NEW.status = 'success' THEN 'captured'
        WHEN NEW.status = 'failed' THEN 'failed'
        WHEN NEW.status = 'refunded' THEN 'refunded'
        WHEN NEW.status = 'pending' THEN 'created'
        ELSE 'updated'
      END,
      OLD.status,
      NEW.status,
      NEW.amount,
      jsonb_build_object(
        'omise_charge_id', NEW.omise_charge_id,
        'failure_code', NEW.failure_code,
        'failure_message', NEW.failure_message
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_payment_status_change ON public.payments;

CREATE TRIGGER trigger_payment_status_change
  AFTER UPDATE OF status
  ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_log_payment_status_change();

-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Payment audit log policies
CREATE POLICY "Admins and staff can view audit logs"
  ON public.payment_audit_log FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'staff')
  );

-- Payment webhooks policies (system only)
CREATE POLICY "Service role can manage webhooks"
  ON public.payment_webhooks FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON public.payment_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_refund_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_statistics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ============================================
-- 11. CREATE VIEW FOR PAYMENT OVERVIEW
-- ============================================

CREATE OR REPLACE VIEW public.payment_overview AS
SELECT
  p.id,
  p.registration_id,
  p.amount,
  p.currency,
  p.status,
  p.omise_charge_id,
  p.card_brand,
  p.card_last4,
  p.receipt_url,
  p.refund_amount,
  p.created_at,
  p.updated_at,
  r.event_id,
  e.title as event_title,
  u.email as user_email,
  u.name as user_name,
  CASE
    WHEN p.status = 'success' AND p.refund_amount = 0 THEN 'paid'
    WHEN p.status = 'success' AND p.refund_amount > 0 AND p.refund_amount < p.amount THEN 'partially_refunded'
    WHEN p.status = 'refunded' OR p.refund_amount >= p.amount THEN 'fully_refunded'
    WHEN p.status = 'pending' THEN 'pending'
    WHEN p.status = 'failed' THEN 'failed'
    ELSE 'unknown'
  END as payment_state
FROM public.payments p
LEFT JOIN public.registrations r ON r.id = p.registration_id
LEFT JOIN public.events e ON e.id = r.event_id
LEFT JOIN public.profiles u ON u.id = r.user_id;

GRANT SELECT ON public.payment_overview TO authenticated;

COMMENT ON VIEW public.payment_overview IS
  'Comprehensive payment information with event and user details';

-- ============================================
-- Verification Queries
-- ============================================

-- Check new columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'payments' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Check payment statistics
-- SELECT * FROM public.get_payment_statistics(now() - interval '30 days', now());

-- Check audit log
-- SELECT * FROM public.payment_audit_log ORDER BY created_at DESC LIMIT 10;
