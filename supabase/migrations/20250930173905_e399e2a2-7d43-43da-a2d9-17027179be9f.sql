-- Add event_type and meeting fields to events table
ALTER TABLE public.events 
ADD COLUMN event_type TEXT DEFAULT 'physical' CHECK (event_type IN ('physical', 'virtual', 'hybrid')),
ADD COLUMN meeting_url TEXT,
ADD COLUMN meeting_id TEXT,
ADD COLUMN meeting_platform TEXT CHECK (meeting_platform IN ('zoom', 'teams', 'google_meet'));

-- Create integration_settings table
CREATE TABLE public.integration_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('google_calendar', 'zoom', 'teams', 'mailchimp', 'sendgrid', 'facebook', 'twitter', 'linkedin', 'hubspot', 'salesforce')),
  config JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT false,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_type)
);

-- Create integration_logs table
CREATE TABLE public.integration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_type TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'retrying')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social_media_posts table
CREATE TABLE public.social_media_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin')),
  post_content TEXT NOT NULL,
  post_url TEXT,
  post_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed', 'scheduled')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  engagement_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_integration_logs_integration_type ON public.integration_logs(integration_type);
CREATE INDEX idx_integration_logs_status ON public.integration_logs(status);
CREATE INDEX idx_integration_logs_event_id ON public.integration_logs(event_id);
CREATE INDEX idx_social_media_posts_event_id ON public.social_media_posts(event_id);
CREATE INDEX idx_social_media_posts_status ON public.social_media_posts(status);
CREATE INDEX idx_social_media_posts_platform ON public.social_media_posts(platform);

-- Enable RLS
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for integration_settings
CREATE POLICY "Admins can manage integration settings"
  ON public.integration_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view integration settings"
  ON public.integration_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for integration_logs
CREATE POLICY "Admins and staff can view integration logs"
  ON public.integration_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "System can insert integration logs"
  ON public.integration_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for social_media_posts
CREATE POLICY "Admins and staff can manage social media posts"
  ON public.social_media_posts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins and staff can view social media posts"
  ON public.social_media_posts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_social_media_posts_updated_at
  BEFORE UPDATE ON public.social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();