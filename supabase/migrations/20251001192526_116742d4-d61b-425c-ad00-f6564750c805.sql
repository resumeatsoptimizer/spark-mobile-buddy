-- Add payment method columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'card' CHECK (payment_method IN ('card', 'promptpay')),
ADD COLUMN IF NOT EXISTS source_id text,
ADD COLUMN IF NOT EXISTS qr_code_data jsonb DEFAULT '{}'::jsonb;

-- Add comments for new columns
COMMENT ON COLUMN public.payments.payment_method IS 'Payment method used: card or promptpay';
COMMENT ON COLUMN public.payments.source_id IS 'Omise Source ID for PromptPay payments';
COMMENT ON COLUMN public.payments.qr_code_data IS 'QR code data and metadata for PromptPay payments';

-- Add index for source_id lookups
CREATE INDEX IF NOT EXISTS idx_payments_source_id ON public.payments(source_id) WHERE source_id IS NOT NULL;