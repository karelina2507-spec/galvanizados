/*
  # Setup User Profiles for Existing Users

  ## Overview
  This migration automatically creates user_profile records for all existing auth users,
  linking them to the existing empresa.

  ## What it does
  1. Links all existing auth.users to the existing empresa
  2. Sets the first user as 'admin' and others as 'user'
  3. Handles cases where profiles might already exist (idempotent)

  ## Safety
  - Uses ON CONFLICT to prevent duplicate entries
  - Only creates profiles for users that don't have one yet
*/

-- Link all existing auth users to the empresa
-- First user gets admin role, others get user role
INSERT INTO user_profiles (user_id, empresa_id, role)
SELECT 
  u.id as user_id,
  e.id as empresa_id,
  CASE 
    WHEN u.created_at = (SELECT MIN(created_at) FROM auth.users) THEN 'admin'
    ELSE 'user'
  END as role
FROM auth.users u
CROSS JOIN empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up 
  WHERE up.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
