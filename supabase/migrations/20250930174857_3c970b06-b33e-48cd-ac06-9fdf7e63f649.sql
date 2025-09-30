-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  logo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_memberships table
CREATE TABLE public.organization_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_memberships table
CREATE TABLE public.team_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create custom_roles table
CREATE TABLE public.custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Enhance profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN avatar_url TEXT,
ADD COLUMN timezone TEXT DEFAULT 'UTC',
ADD COLUMN preferences JSONB DEFAULT '{}',
ADD COLUMN social_links JSONB DEFAULT '{}';

-- Create user_interests table
CREATE TABLE public.user_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, interest_tag)
);

-- Create indexes
CREATE INDEX idx_organization_memberships_user_id ON public.organization_memberships(user_id);
CREATE INDEX idx_organization_memberships_org_id ON public.organization_memberships(organization_id);
CREATE INDEX idx_teams_org_id ON public.teams(organization_id);
CREATE INDEX idx_team_memberships_team_id ON public.team_memberships(team_id);
CREATE INDEX idx_team_memberships_user_id ON public.team_memberships(user_id);
CREATE INDEX idx_custom_roles_org_id ON public.custom_roles(organization_id);
CREATE INDEX idx_user_interests_user_id ON public.user_interests(user_id);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they are members of"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Organization owners and admins can update"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for organization_memberships
CREATE POLICY "Users can view memberships in their organizations"
  ON public.organization_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships om
      WHERE om.organization_id = organization_memberships.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners and admins can manage memberships"
  ON public.organization_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_id = organization_memberships.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for teams
CREATE POLICY "Users can view teams in their organizations"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_id = teams.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage teams"
  ON public.teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_id = teams.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for team_memberships
CREATE POLICY "Users can view team memberships in their organizations"
  ON public.team_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.organization_memberships om ON om.organization_id = t.organization_id
      WHERE t.id = team_memberships.team_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Team leaders and org admins can manage team memberships"
  ON public.team_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.organization_memberships om ON om.organization_id = t.organization_id
      WHERE t.id = team_memberships.team_id
      AND om.user_id = auth.uid()
      AND (om.role IN ('owner', 'admin') OR 
           EXISTS (SELECT 1 FROM public.team_memberships tm 
                   WHERE tm.team_id = t.id AND tm.user_id = auth.uid() AND tm.role = 'leader'))
    )
  );

-- RLS Policies for custom_roles
CREATE POLICY "Users can view roles in their organizations"
  ON public.custom_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_id = custom_roles.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners and admins can manage roles"
  ON public.custom_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships
      WHERE organization_id = custom_roles.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for user_interests
CREATE POLICY "Users can view all interests"
  ON public.user_interests FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own interests"
  ON public.user_interests FOR ALL
  USING (auth.uid() = user_id);

-- Update profiles RLS to allow updates to new fields
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Add triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();