-- Update handle_payment_completion function to support all successful payment statuses
CREATE OR REPLACE FUNCTION public.handle_payment_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reg_record RECORD;
  evt_record RECORD;
  old_status TEXT;
  new_status TEXT;
BEGIN
  old_status := OLD.status;
  new_status := NEW.status;
  
  -- Check if payment changed to any successful status
  IF new_status IN ('completed', 'success', 'successful') AND 
     (old_status IS NULL OR old_status NOT IN ('completed', 'success', 'successful')) THEN
    
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
    
    -- Only decrement seats if registration is confirmed or pending
    IF reg_record.status IN ('confirmed', 'pending') THEN
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
      
      RAISE LOG 'Seats decremented for event % after payment completion (status: %)', reg_record.event_id, new_status;
    END IF;
  
  -- Handle payment refund/cancellation - increment seats back
  ELSIF old_status IN ('completed', 'success', 'successful') AND 
        new_status IN ('refunded', 'failed', 'cancelled') THEN
    
    -- Get registration details
    SELECT * INTO reg_record
    FROM registrations
    WHERE id = NEW.registration_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Increment seats back
    UPDATE events
    SET seats_remaining = LEAST(seats_total, seats_remaining + 1)
    WHERE id = reg_record.event_id;
    
    -- Update ticket type seats if applicable
    IF reg_record.ticket_type_id IS NOT NULL THEN
      UPDATE ticket_types
      SET seats_remaining = LEAST(seats_allocated, seats_remaining + 1)
      WHERE id = reg_record.ticket_type_id;
    END IF;
    
    RAISE LOG 'Seats incremented back for event % after payment cancellation', reg_record.event_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on payments table to automatically update seats
DROP TRIGGER IF EXISTS on_payment_status_change ON public.payments;
CREATE TRIGGER on_payment_status_change
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_completion();

-- Also create trigger for new payments
DROP TRIGGER IF EXISTS on_payment_insert ON public.payments;
CREATE TRIGGER on_payment_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'success', 'successful'))
  EXECUTE FUNCTION public.handle_payment_completion();