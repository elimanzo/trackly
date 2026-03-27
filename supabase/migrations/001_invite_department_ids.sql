-- Add department_ids to invites so admins can pre-assign departments
-- when sending an invite. Applied in acceptInviteAction.
ALTER TABLE invites
  ADD COLUMN IF NOT EXISTS department_ids uuid[] NOT NULL DEFAULT '{}';
