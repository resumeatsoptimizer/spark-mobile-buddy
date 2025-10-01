-- ============================================
-- FULL-TEXT SEARCH Implementation
-- Created: 2025-10-01
-- Purpose: Enable fast text search across events, profiles, and organizations
-- ============================================

-- ============================================
-- 1. ADD TSVECTOR COLUMNS
-- ============================================

-- Events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Event categories
ALTER TABLE public.event_categories
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ============================================
-- 2. CREATE GIN INDEXES for Full-Text Search
-- ============================================

CREATE INDEX IF NOT EXISTS idx_events_search_vector
  ON public.events USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_profiles_search_vector
  ON public.profiles USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_organizations_search_vector
  ON public.organizations USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_event_categories_search_vector
  ON public.event_categories USING GIN (search_vector);

-- ============================================
-- 3. UPDATE FUNCTIONS for Search Vectors
-- ============================================

-- Function to update events search vector
CREATE OR REPLACE FUNCTION public.update_events_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_events_search_vector() IS
  'Updates search_vector for events with weighted text from title, description, and location';

-- Function to update profiles search vector
CREATE OR REPLACE FUNCTION public.update_profiles_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'C');

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_profiles_search_vector() IS
  'Updates search_vector for profiles with weighted text from name, email, and bio';

-- Function to update organizations search vector
CREATE OR REPLACE FUNCTION public.update_organizations_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.slug, '')), 'B');

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_organizations_search_vector() IS
  'Updates search_vector for organizations with weighted text from name and slug';

-- Function to update event categories search vector
CREATE OR REPLACE FUNCTION public.update_event_categories_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');

  RETURN NEW;
END;
$$;

-- ============================================
-- 4. CREATE TRIGGERS
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_events_search_vector_update ON public.events;
DROP TRIGGER IF EXISTS trigger_profiles_search_vector_update ON public.profiles;
DROP TRIGGER IF EXISTS trigger_organizations_search_vector_update ON public.organizations;
DROP TRIGGER IF EXISTS trigger_event_categories_search_vector_update ON public.event_categories;

-- Create triggers to auto-update search vectors
CREATE TRIGGER trigger_events_search_vector_update
  BEFORE INSERT OR UPDATE OF title, description, location
  ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_events_search_vector();

CREATE TRIGGER trigger_profiles_search_vector_update
  BEFORE INSERT OR UPDATE OF name, email, bio
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_search_vector();

CREATE TRIGGER trigger_organizations_search_vector_update
  BEFORE INSERT OR UPDATE OF name, slug
  ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organizations_search_vector();

CREATE TRIGGER trigger_event_categories_search_vector_update
  BEFORE INSERT OR UPDATE OF name, description
  ON public.event_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_categories_search_vector();

-- ============================================
-- 5. POPULATE EXISTING DATA
-- ============================================

-- Update all existing records with search vectors
UPDATE public.events
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(location, '')), 'C');

UPDATE public.profiles
SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(bio, '')), 'C');

UPDATE public.organizations
SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(slug, '')), 'B');

UPDATE public.event_categories
SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B');

-- ============================================
-- 6. SEARCH HELPER FUNCTIONS
-- ============================================

-- Function to search events
CREATE OR REPLACE FUNCTION public.search_events(search_query text)
RETURNS TABLE(
  event_id uuid,
  title text,
  description text,
  start_date timestamptz,
  relevance_rank real
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.id,
    e.title,
    e.description,
    e.start_date,
    ts_rank(e.search_vector, websearch_to_tsquery('english', search_query)) AS relevance_rank
  FROM public.events e
  WHERE e.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY relevance_rank DESC, e.start_date DESC
  LIMIT 50;
$$;

COMMENT ON FUNCTION public.search_events(text) IS
  'Search events by text query, returns top 50 results ranked by relevance';

-- Function to search profiles
CREATE OR REPLACE FUNCTION public.search_profiles(search_query text)
RETURNS TABLE(
  user_id uuid,
  name text,
  email text,
  relevance_rank real
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    p.email,
    ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) AS relevance_rank
  FROM public.profiles p
  WHERE p.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY relevance_rank DESC
  LIMIT 50;
$$;

COMMENT ON FUNCTION public.search_profiles(text) IS
  'Search user profiles by text query, returns top 50 results ranked by relevance';

-- Function to search organizations
CREATE OR REPLACE FUNCTION public.search_organizations(search_query text)
RETURNS TABLE(
  organization_id uuid,
  name text,
  slug text,
  relevance_rank real
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    o.id,
    o.name,
    o.slug,
    ts_rank(o.search_vector, websearch_to_tsquery('english', search_query)) AS relevance_rank
  FROM public.organizations o
  WHERE o.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY relevance_rank DESC
  LIMIT 50;
$$;

-- Global search function (searches across all entities)
CREATE OR REPLACE FUNCTION public.global_search(search_query text)
RETURNS TABLE(
  result_type text,
  result_id uuid,
  title text,
  description text,
  relevance_rank real
)
LANGUAGE sql
STABLE
AS $$
  -- Search events
  SELECT
    'event'::text as result_type,
    e.id as result_id,
    e.title,
    COALESCE(e.description, '') as description,
    ts_rank(e.search_vector, websearch_to_tsquery('english', search_query)) as relevance_rank
  FROM public.events e
  WHERE e.search_vector @@ websearch_to_tsquery('english', search_query)

  UNION ALL

  -- Search organizations
  SELECT
    'organization'::text as result_type,
    o.id as result_id,
    o.name as title,
    COALESCE(o.slug, '') as description,
    ts_rank(o.search_vector, websearch_to_tsquery('english', search_query)) as relevance_rank
  FROM public.organizations o
  WHERE o.search_vector @@ websearch_to_tsquery('english', search_query)

  UNION ALL

  -- Search profiles (only admins should see this)
  SELECT
    'profile'::text as result_type,
    p.id as result_id,
    COALESCE(p.name, p.email) as title,
    COALESCE(p.email, '') as description,
    ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) as relevance_rank
  FROM public.profiles p
  WHERE p.search_vector @@ websearch_to_tsquery('english', search_query)

  ORDER BY relevance_rank DESC
  LIMIT 100;
$$;

COMMENT ON FUNCTION public.global_search(text) IS
  'Global search across events, organizations, and profiles. Returns top 100 results.';

-- ============================================
-- 7. RLS POLICIES for Search Functions
-- ============================================

-- Grant execute permissions on search functions
GRANT EXECUTE ON FUNCTION public.search_events(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_organizations(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search(text) TO authenticated;

-- ============================================
-- 8. SEARCH STATISTICS VIEW
-- ============================================

-- Create a view to monitor search performance
CREATE OR REPLACE VIEW public.search_statistics AS
SELECT
  'events' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE search_vector IS NOT NULL) as indexed_records,
  pg_size_pretty(pg_total_relation_size('idx_events_search_vector')) as index_size
FROM public.events

UNION ALL

SELECT
  'profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE search_vector IS NOT NULL) as indexed_records,
  pg_size_pretty(pg_total_relation_size('idx_profiles_search_vector')) as index_size
FROM public.profiles

UNION ALL

SELECT
  'organizations' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE search_vector IS NOT NULL) as indexed_records,
  pg_size_pretty(pg_total_relation_size('idx_organizations_search_vector')) as index_size
FROM public.organizations;

GRANT SELECT ON public.search_statistics TO authenticated;

-- ============================================
-- Usage Examples
-- ============================================

-- Search events:
-- SELECT * FROM public.search_events('workshop tech');

-- Search profiles:
-- SELECT * FROM public.search_profiles('john doe');

-- Search organizations:
-- SELECT * FROM public.search_organizations('tech startup');

-- Global search:
-- SELECT * FROM public.global_search('javascript');

-- Check search statistics:
-- SELECT * FROM public.search_statistics;

-- ============================================
-- Performance Tips
-- ============================================

-- 1. Use websearch_to_tsquery for natural language queries
-- 2. Use plainto_tsquery for simpler queries
-- 3. Use to_tsquery for advanced boolean queries (AND, OR, NOT)
-- 4. Regularly VACUUM and ANALYZE tables to maintain index performance
-- 5. Monitor query performance with EXPLAIN ANALYZE
