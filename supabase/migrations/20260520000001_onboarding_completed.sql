-- Add onboarding_completed flag to profiles.
-- New users (post-migration) start with false and are redirected to /setup.
-- All existing users are marked complete so they are never interrupted.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Every row that exists before this migration is already onboarded.
UPDATE profiles SET onboarding_completed = true WHERE onboarding_completed = false;
