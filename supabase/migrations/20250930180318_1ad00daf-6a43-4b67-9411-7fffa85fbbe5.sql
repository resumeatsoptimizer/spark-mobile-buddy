-- Phase 5 Step 5: Advanced Mobile & Enterprise Features

-- 1. QR Code Check-In System
CREATE TABLE IF NOT EXISTS public.event_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_in_by UUID REFERENCES auth.users(id),
  check_in_method TEXT NOT NULL DEFAULT 'qr_code',
  station_id TEXT,
  device_info JSONB DEFAULT '{}',
  location_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Two-Factor Authentication
CREATE TABLE IF NOT EXISTS public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  secret TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  backup_codes JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. In-App Messaging System
CREATE TABLE IF NOT EXISTS public.event_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_announcement BOOLEAN DEFAULT false,
  read_by JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. API Keys for Enterprise Integration
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Webhook Configurations
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  secret_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  retry_config JSONB DEFAULT '{"max_retries": 3, "retry_delay": 60}',
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Audit Trail for Security
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  action_data JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Push Notification Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,
  device_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Indexes
CREATE INDEX idx_check_ins_registration ON public.event_check_ins(registration_id);
CREATE INDEX idx_check_ins_event ON public.event_check_ins(event_id);
CREATE INDEX idx_check_ins_time ON public.event_check_ins(checked_in_at);
CREATE INDEX idx_messages_event ON public.event_messages(event_id);
CREATE INDEX idx_messages_sender ON public.event_messages(sender_id);
CREATE INDEX idx_messages_created ON public.event_messages(created_at);
CREATE INDEX idx_api_keys_org ON public.api_keys(organization_id);
CREATE INDEX idx_webhooks_org ON public.webhooks(organization_id);
CREATE INDEX idx_audit_log_user ON public.security_audit_log(user_id);
CREATE INDEX idx_audit_log_time ON public.security_audit_log(created_at);
CREATE INDEX idx_push_sub_user ON public.push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE public.event_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Check-Ins
CREATE POLICY "Admins and staff can view all check-ins"
  ON public.event_check_ins FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins and staff can manage check-ins"
  ON public.event_check_ins FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- RLS Policies for 2FA
CREATE POLICY "Users can manage their own 2FA"
  ON public.user_2fa FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for Messages
CREATE POLICY "Users can view messages for their events"
  ON public.event_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations
      WHERE registrations.event_id = event_messages.event_id
      AND registrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and staff can manage messages"
  ON public.event_messages FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- RLS Policies for API Keys
CREATE POLICY "Organization admins can manage API keys"
  ON public.api_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = api_keys.organization_id
      AND organization_memberships.user_id = auth.uid()
      AND organization_memberships.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for Webhooks
CREATE POLICY "Organization admins can manage webhooks"
  ON public.webhooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_memberships.organization_id = webhooks.organization_id
      AND organization_memberships.user_id = auth.uid()
      AND organization_memberships.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for Security Audit Log
CREATE POLICY "Admins can view audit logs"
  ON public.security_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
  ON public.security_audit_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for Push Subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_2fa_updated_at
  BEFORE UPDATE ON public.user_2fa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();