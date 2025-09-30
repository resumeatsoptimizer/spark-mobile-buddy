-- Create ai_insights table for storing AI-generated insights
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('prediction', 'recommendation', 'trend', 'anomaly', 'optimization')),
  insight_data JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'implemented')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Create predictive_models table for storing model data and predictions
CREATE TABLE public.predictive_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_type TEXT NOT NULL CHECK (model_type IN ('attendance', 'revenue', 'conversion', 'churn', 'engagement')),
  model_version TEXT NOT NULL,
  training_data JSONB NOT NULL DEFAULT '{}',
  accuracy_metrics JSONB DEFAULT '{}',
  last_trained_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_behavior_analytics table for tracking user behavior
CREATE TABLE public.user_behavior_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'register', 'cancel', 'payment', 'share', 'search', 'filter')),
  action_data JSONB DEFAULT '{}',
  session_id TEXT,
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom_reports table for storing user-created reports
CREATE TABLE public.custom_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  report_name TEXT NOT NULL,
  report_config JSONB NOT NULL DEFAULT '{}',
  schedule_config JSONB DEFAULT '{}',
  last_generated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_ai_insights_event_id ON public.ai_insights(event_id);
CREATE INDEX idx_ai_insights_type ON public.ai_insights(insight_type);
CREATE INDEX idx_ai_insights_created_at ON public.ai_insights(created_at DESC);
CREATE INDEX idx_predictive_models_type ON public.predictive_models(model_type);
CREATE INDEX idx_predictive_models_active ON public.predictive_models(is_active);
CREATE INDEX idx_user_behavior_user_id ON public.user_behavior_analytics(user_id);
CREATE INDEX idx_user_behavior_event_id ON public.user_behavior_analytics(event_id);
CREATE INDEX idx_user_behavior_action_type ON public.user_behavior_analytics(action_type);
CREATE INDEX idx_user_behavior_created_at ON public.user_behavior_analytics(created_at DESC);
CREATE INDEX idx_custom_reports_created_by ON public.custom_reports(created_by);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_insights
CREATE POLICY "Admins and staff can view all insights"
  ON public.ai_insights FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins and staff can manage insights"
  ON public.ai_insights FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for predictive_models
CREATE POLICY "Admins and staff can view models"
  ON public.predictive_models FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admins can manage models"
  ON public.predictive_models FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_behavior_analytics
CREATE POLICY "Admins and staff can view behavior analytics"
  ON public.user_behavior_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "System can insert behavior analytics"
  ON public.user_behavior_analytics FOR INSERT
  WITH CHECK (true);

-- RLS Policies for custom_reports
CREATE POLICY "Users can view their own reports"
  ON public.custom_reports FOR SELECT
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own reports"
  ON public.custom_reports FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own reports"
  ON public.custom_reports FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own reports"
  ON public.custom_reports FOR DELETE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_predictive_models_updated_at
  BEFORE UPDATE ON public.predictive_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_custom_reports_updated_at
  BEFORE UPDATE ON public.custom_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();