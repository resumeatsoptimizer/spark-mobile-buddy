-- Add missing columns to payments table for better payment tracking and 3D Secure support
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS authorize_uri TEXT,
ADD COLUMN IF NOT EXISTS card_brand TEXT,
ADD COLUMN IF NOT EXISTS failure_code TEXT,
ADD COLUMN IF NOT EXISTS failure_message TEXT,
ADD COLUMN IF NOT EXISTS require_3ds BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Add index on idempotency_key for faster lookups and duplicate prevention
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON public.payments(idempotency_key);

-- Add index on omise_charge_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_omise_charge_id ON public.payments(omise_charge_id);

-- Add comment to table
COMMENT ON COLUMN public.payments.authorize_uri IS '3D Secure authorization URL';
COMMENT ON COLUMN public.payments.card_brand IS 'Credit card brand (Visa, Mastercard, etc)';
COMMENT ON COLUMN public.payments.failure_code IS 'Omise failure code';
COMMENT ON COLUMN public.payments.failure_message IS 'Omise failure message';
COMMENT ON COLUMN public.payments.require_3ds IS 'Whether payment requires 3D Secure authentication';
COMMENT ON COLUMN public.payments.payment_metadata IS 'Full payment metadata from Omise';
COMMENT ON COLUMN public.payments.idempotency_key IS 'Unique key to prevent duplicate payments';