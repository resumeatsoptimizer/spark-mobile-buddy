-- Step 1: Drop the existing unique constraint that allows multiple roles per user
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Step 2: Clean up existing data - keep only the highest role per user
-- Role hierarchy: admin > staff > participant
WITH ranked_roles AS (
  SELECT 
    id,
    user_id,
    role,
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'staff' THEN 2
      WHEN 'participant' THEN 3
      ELSE 4
    END as role_rank,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY 
      CASE role::text
        WHEN 'admin' THEN 1
        WHEN 'staff' THEN 2
        WHEN 'participant' THEN 3
        ELSE 4
      END
    ) as rn
  FROM public.user_roles
),
roles_to_delete AS (
  SELECT id 
  FROM ranked_roles 
  WHERE rn > 1
)
DELETE FROM public.user_roles
WHERE id IN (SELECT id FROM roles_to_delete);

-- Step 3: Add unique constraint on user_id to enforce single role per user
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Step 4: Add comment explaining the constraint
COMMENT ON CONSTRAINT user_roles_user_id_unique ON public.user_roles IS 'Ensures each user has only one role (hierarchical: admin > staff > participant)';