-- Create event_categories table
CREATE TABLE public.event_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_tags table
CREATE TABLE public.event_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_category_mapping table
CREATE TABLE public.event_category_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.event_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, category_id)
);

-- Create event_tag_mapping table
CREATE TABLE public.event_tag_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.event_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, tag_id)
);

-- Create event_series table
CREATE TABLE public.event_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  recurrence_rule JSONB NOT NULL, -- frequency, interval, end_date, etc.
  template_data JSONB NOT NULL, -- base event configuration
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create event_templates table
CREATE TABLE public.event_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL, -- full event configuration
  category_id UUID REFERENCES public.event_categories(id),
  created_by UUID NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link events to series
ALTER TABLE public.events ADD COLUMN series_id UUID REFERENCES public.event_series(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN template_id UUID REFERENCES public.event_templates(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_event_categories_name ON public.event_categories(name);
CREATE INDEX idx_event_tags_name ON public.event_tags(name);
CREATE INDEX idx_event_category_mapping_event ON public.event_category_mapping(event_id);
CREATE INDEX idx_event_category_mapping_category ON public.event_category_mapping(category_id);
CREATE INDEX idx_event_tag_mapping_event ON public.event_tag_mapping(event_id);
CREATE INDEX idx_event_tag_mapping_tag ON public.event_tag_mapping(tag_id);
CREATE INDEX idx_event_series_active ON public.event_series(is_active);
CREATE INDEX idx_event_templates_public ON public.event_templates(is_public);
CREATE INDEX idx_events_series ON public.events(series_id);
CREATE INDEX idx_events_template ON public.events(template_id);

-- Enable RLS
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_category_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tag_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_categories
CREATE POLICY "Anyone can view categories"
  ON public.event_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins and staff can manage categories"
  ON public.event_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for event_tags
CREATE POLICY "Anyone can view tags"
  ON public.event_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins and staff can manage tags"
  ON public.event_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for event_category_mapping
CREATE POLICY "Anyone can view event category mappings"
  ON public.event_category_mapping FOR SELECT
  USING (true);

CREATE POLICY "Admins and staff can manage event category mappings"
  ON public.event_category_mapping FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for event_tag_mapping
CREATE POLICY "Anyone can view event tag mappings"
  ON public.event_tag_mapping FOR SELECT
  USING (true);

CREATE POLICY "Admins and staff can manage event tag mappings"
  ON public.event_tag_mapping FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for event_series
CREATE POLICY "Anyone can view active series"
  ON public.event_series FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins and staff can manage series"
  ON public.event_series FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for event_templates
CREATE POLICY "Anyone can view public templates"
  ON public.event_templates FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON public.event_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON public.event_templates FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all templates"
  ON public.event_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_event_categories_updated_at
  BEFORE UPDATE ON public.event_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_event_series_updated_at
  BEFORE UPDATE ON public.event_series
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_event_templates_updated_at
  BEFORE UPDATE ON public.event_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();