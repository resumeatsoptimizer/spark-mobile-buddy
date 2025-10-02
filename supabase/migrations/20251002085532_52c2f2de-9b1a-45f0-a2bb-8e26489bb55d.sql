-- Create function to check if a payment can be refunded
CREATE OR REPLACE FUNCTION public.can_refund_payment(p_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record RECORD;
  can_refund BOOLEAN;
BEGIN
  -- Get payment details
  SELECT 
    status,
    amount,
    COALESCE(refund_amount, 0) as refund_amount,
    created_at
  INTO payment_record
  FROM public.payments
  WHERE id = p_payment_id;
  
  -- Check if payment exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check refund conditions:
  -- 1. Payment must be successful
  -- 2. Not already fully refunded
  -- 3. Within 6 months of payment
  can_refund := (
    payment_record.status IN ('success', 'successful', 'completed') AND
    payment_record.refund_amount < payment_record.amount AND
    payment_record.created_at > NOW() - INTERVAL '6 months'
  );
  
  RETURN can_refund;
END;
$$;

-- Create function to log payment actions for audit trail
CREATE OR REPLACE FUNCTION public.log_payment_action(
  p_payment_id UUID,
  p_action TEXT,
  p_user_id UUID,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  -- Insert into audit trail
  INSERT INTO public.audit_trail (
    table_name,
    action,
    record_id,
    changed_by,
    new_data
  )
  VALUES (
    'payments',
    p_action,
    p_payment_id,
    p_user_id,
    p_details
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;