-- People asking to join a free beta (the form on the product page). The owner approves each one on
-- the admin page, which issues a beta key and sends the invitation; or declines it.
CREATE TABLE beta_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  about TEXT,                              -- what they make, in their words
  system TEXT,                             -- macOS / Windows
  daw TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  licence_key TEXT,                        -- the beta key, once approved
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE INDEX beta_requests_status ON beta_requests(status, created_at);
CREATE UNIQUE INDEX beta_requests_open ON beta_requests(product, email) WHERE status = 'pending';
