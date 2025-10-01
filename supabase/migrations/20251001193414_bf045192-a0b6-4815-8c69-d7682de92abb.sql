-- Create function to update seats when payment is completed
CREATE OR REPLACE FUNCTION public.handle_payment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg_record RECORD;
  evt_record RECORD;
BEGIN
  -- Only proceed if payment status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get registration details
    SELECT * INTO reg_record
    FROM registrations
    WHERE id = NEW.registration_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Get event details
    SELECT * INTO evt_record
    FROM events
    WHERE id = reg_record.event_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Only decrement seats if registration is confirmed and not already counted
    IF reg_record.status = 'confirmed' OR reg_record.status = 'pending' THEN
      -- Update event seats_remaining
      UPDATE events
      SET seats_remaining = GREATEST(0, seats_remaining - 1)
      WHERE id = reg_record.event_id
      AND seats_remaining > 0;
      
      -- Update ticket type seats if applicable
      IF reg_record.ticket_type_id IS NOT NULL THEN
        UPDATE ticket_types
        SET seats_remaining = GREATEST(0, seats_remaining - 1)
        WHERE id = reg_record.ticket_type_id
        AND seats_remaining > 0;
      END IF;
      
      RAISE LOG 'Seats decremented for event % after payment completion', reg_record.event_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on payments table
DROP TRIGGER IF EXISTS trigger_payment_completion ON public.payments;

CREATE TRIGGER trigger_payment_completion
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_completion();

-- Create function to recalculate and sync seats based on paid registrations
CREATE OR REPLACE FUNCTION public.recalculate_event_seats(event_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  confirmed_count INTEGER;
  evt_record RECORD;
BEGIN
  -- Get event details
  SELECT * INTO evt_record
  FROM events
  WHERE id = event_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Count confirmed and paid registrations
  SELECT COUNT(*) INTO confirmed_count
  FROM registrations
  WHERE event_id = event_id_param
  AND status IN ('confirmed', 'pending')
  AND payment_status = 'paid';
  
  -- Update seats_remaining
  UPDATE events
  SET seats_remaining = GREATEST(0, seats_total - confirmed_count)
  WHERE id = event_id_param;
  
  RAISE LOG 'Recalculated seats for event %: total=%, confirmed=%, remaining=%', 
    event_id_param, evt_record.seats_total, confirmed_count, 
    GREATEST(0, evt_record.seats_total - confirmed_count);
END;
$$;

COMMENT ON FUNCTION public.handle_payment_completion() IS 'Automatically decrements seat count when payment is completed';
COMMENT ON FUNCTION public.recalculate_event_seats(UUID) IS 'Recalculates and syncs event seats based on paid registrations';