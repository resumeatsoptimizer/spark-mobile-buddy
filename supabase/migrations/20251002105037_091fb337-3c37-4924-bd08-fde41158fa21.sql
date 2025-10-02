-- Phase 1: Create trigger to auto-update seats_remaining on check-in

-- Function: Update seats_remaining automatically when check-ins happen
CREATE OR REPLACE FUNCTION update_seats_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Decrease seats_remaining when someone checks in
    UPDATE events 
    SET seats_remaining = GREATEST(0, seats_remaining - 1)
    WHERE id = NEW.event_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Increase seats_remaining when check-in is deleted
    UPDATE events 
    SET seats_remaining = LEAST(seats_total, seats_remaining + 1)
    WHERE id = OLD.event_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: Bind function to event_check_ins table
CREATE TRIGGER trigger_update_seats_on_checkin
AFTER INSERT OR DELETE ON event_check_ins
FOR EACH ROW
EXECUTE FUNCTION update_seats_on_checkin();