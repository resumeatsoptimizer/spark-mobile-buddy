-- Create function to refresh member statistics materialized view
CREATE OR REPLACE FUNCTION public.refresh_member_stats_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;
  RAISE LOG 'Member statistics materialized view refreshed at %', NOW();
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to refresh member statistics: %', SQLERRM;
END;
$$;

-- Create trigger function to auto-refresh on registration changes
CREATE OR REPLACE FUNCTION public.trigger_refresh_member_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Perform refresh in background (non-blocking)
  PERFORM public.refresh_member_stats_mv();
  RETURN NEW;
END;
$$;

-- Create triggers on registrations table
DROP TRIGGER IF EXISTS refresh_member_stats_on_registration_insert ON public.registrations;
CREATE TRIGGER refresh_member_stats_on_registration_insert
AFTER INSERT ON public.registrations
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_member_stats();

DROP TRIGGER IF EXISTS refresh_member_stats_on_registration_update ON public.registrations;
CREATE TRIGGER refresh_member_stats_on_registration_update
AFTER UPDATE ON public.registrations
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_member_stats();

-- Create triggers on payments table
DROP TRIGGER IF EXISTS refresh_member_stats_on_payment_insert ON public.payments;
CREATE TRIGGER refresh_member_stats_on_payment_insert
AFTER INSERT ON public.payments
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_member_stats();

DROP TRIGGER IF EXISTS refresh_member_stats_on_payment_update ON public.payments;
CREATE TRIGGER refresh_member_stats_on_payment_update
AFTER UPDATE ON public.payments
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_member_stats();

-- Initial refresh
SELECT public.refresh_member_stats_mv();