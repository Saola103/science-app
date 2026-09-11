-- ============================================================
-- POCKET DIVE: Anonymous feedback (マイページ「ご意見」欄)
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor.
--
-- Anonymous by design: no user_id / email column at all, so there is
-- nothing identifying to leak even if the table were ever misconfigured.
-- Same shape as `inquiries` in 003_row_level_security.sql — public can
-- insert, nobody (not even authenticated) can read; only the service
-- role key (used by /api/admin/feedback) bypasses RLS to list rows.

CREATE TABLE IF NOT EXISTS feedback (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_public_insert" ON feedback;
CREATE POLICY "feedback_public_insert"
  ON feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(message) > 0 AND length(message) <= 1000
  );

-- Intentionally no SELECT/UPDATE/DELETE policy: with RLS enabled and no
-- such policy, anon/authenticated get nothing back — only the service
-- role (which bypasses RLS) can read or remove rows.
