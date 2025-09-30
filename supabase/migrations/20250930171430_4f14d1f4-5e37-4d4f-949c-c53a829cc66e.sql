-- Add fields to registrations table for promotion tracking
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS promoted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS promotion_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 0;

-- Create scheduled_tasks table for managing automated workflows
CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE CASCADE,
  scheduled_for timestamp with time zone NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create notification_settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  enabled boolean DEFAULT true,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, notification_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_scheduled_for ON public.scheduled_tasks(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_event_id ON public.scheduled_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_promotion_expires ON public.registrations(promotion_expires_at) WHERE promotion_expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_tasks
CREATE POLICY "Admins and staff can manage scheduled tasks"
ON public.scheduled_tasks
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins and staff can view scheduled tasks"
ON public.scheduled_tasks
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for notification_settings
CREATE POLICY "Admins and staff can manage notification settings"
ON public.notification_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins and staff can view notification settings"
ON public.notification_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_tasks_updated_at
BEFORE UPDATE ON public.scheduled_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();