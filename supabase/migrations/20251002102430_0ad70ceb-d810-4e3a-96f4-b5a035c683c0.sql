-- Create trigger for profiles table to auto-refresh member statistics
CREATE TRIGGER refresh_member_stats_on_profile_change
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_member_stats();

-- Create trigger for registrations table to auto-refresh member statistics
CREATE TRIGGER refresh_member_stats_on_registration_change
AFTER INSERT OR UPDATE OR DELETE ON public.registrations
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_member_stats();

-- Create trigger for payments table to auto-refresh member statistics
CREATE TRIGGER refresh_member_stats_on_payment_change
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_member_stats();

-- Create trigger for user_roles table to auto-refresh member statistics
CREATE TRIGGER refresh_member_stats_on_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_member_stats();