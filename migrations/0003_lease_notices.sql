-- Reminder emails for leased licences (Pixel Forge): 0 none sent since the computer last checked in,
-- 1 the first reminder, 2 the last one. Each check-in resets it.
ALTER TABLE activations ADD COLUMN lease_notice INTEGER NOT NULL DEFAULT 0;
