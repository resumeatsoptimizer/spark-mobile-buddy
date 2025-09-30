-- Phase 1: Database Schema Enhancement & Payment Infrastructure

-- 1.1 เพิ่ม fields สำหรับ registration workflow ใน registrations table
ALTER TABLE public.registrations 
ADD COLUMN confirm_token TEXT,
ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN promoted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN ticket_generated_at TIMESTAMP WITH TIME ZONE;

-- 1.2 เพิ่ม fields สำหรับ payment integration ใน payments table
ALTER TABLE public.payments 
ADD COLUMN card_last4 TEXT,
ADD COLUMN receipt_url TEXT,
ADD COLUMN webhook_data JSONB DEFAULT '{}',
ADD COLUMN refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN refund_amount NUMERIC DEFAULT 0;

-- 1.3 สร้างตาราง email_logs สำหรับติดตาม email notifications
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('confirmation', 'waitlist', 'promotion', 'ticket', 'reminder', 'payment_success', 'payment_failed')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_logs
CREATE POLICY "Admins and staff can view all email logs"
ON public.email_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins and staff can manage email logs"
ON public.email_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- 1.4 สร้างตาราง google_sheets_sync สำหรับติดตาม Google Sheets integration
CREATE TABLE public.google_sheets_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  sheet_id TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on google_sheets_sync
ALTER TABLE public.google_sheets_sync ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_sheets_sync
CREATE POLICY "Admins and staff can view all sheet sync records"
ON public.google_sheets_sync
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins and staff can manage sheet sync records"
ON public.google_sheets_sync
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Add trigger for google_sheets_sync updated_at
CREATE TRIGGER update_google_sheets_sync_updated_at
BEFORE UPDATE ON public.google_sheets_sync
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- 1.5 เพิ่ม index สำหรับ performance
CREATE INDEX idx_email_logs_registration_id ON public.email_logs(registration_id);
CREATE INDEX idx_email_logs_event_id ON public.email_logs(event_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX idx_google_sheets_sync_event_id ON public.google_sheets_sync(event_id);
CREATE INDEX idx_registrations_confirm_token ON public.registrations(confirm_token);
CREATE INDEX idx_registrations_token_expires_at ON public.registrations(token_expires_at);
CREATE INDEX idx_payments_omise_charge_id ON public.payments(omise_charge_id);