-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS on_payment_status_change ON public.payments;
DROP TRIGGER IF EXISTS on_payment_insert ON public.payments;

-- Trigger for payment status changes (UPDATE)
CREATE TRIGGER on_payment_status_change
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_payment_completion();

-- Trigger for new payments (INSERT)
CREATE TRIGGER on_payment_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_completion();

-- Manually fix the Bangkok Marathon seats
UPDATE public.events
SET seats_remaining = seats_total - (
  SELECT COUNT(*)
  FROM public.registrations r
  JOIN public.payments p ON p.registration_id = r.id
  WHERE r.event_id = events.id
  AND r.status IN ('confirmed', 'pending')
  AND p.status IN ('success', 'successful', 'completed')
)
WHERE id = '615190e5-aeeb-4103-8d68-a11053c9726c';