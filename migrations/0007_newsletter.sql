-- The Acoustica Edit, the weekly newsletter: subscribers and the editions sent to them. Kept here
-- rather than in a Resend audience, so there is nothing to set up. Every subscriber has a random
-- token: the confirm and unsubscribe links carry it instead of the address.
CREATE TABLE newsletter_subscribers (
  email TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,                    -- pending (not confirmed yet), active, unsubscribed
  created_at INTEGER NOT NULL,
  confirm_sent_at INTEGER,                 -- when the last confirmation email went (links last 7 days)
  confirmed_at INTEGER,
  unsubscribed_at INTEGER,
  last_edition TEXT,                       -- the id of the last edition sent to this address
  last_sent_at INTEGER
);
CREATE INDEX newsletter_subscribers_status ON newsletter_subscribers (status, last_edition);
CREATE INDEX newsletter_subscribers_sent ON newsletter_subscribers (last_sent_at);

-- One a week, made on Monday from the posts of the last seven days. A large list is sent over
-- several days, so the daily email allowance is never exceeded.
CREATE TABLE newsletter_editions (
  id TEXT PRIMARY KEY,                     -- the ISO week, e.g. 2026-W47
  subject TEXT NOT NULL,
  items TEXT NOT NULL,                     -- JSON: the posts in it (slug, title, excerpt, category, publishAt)
  status TEXT NOT NULL,                    -- sending, sent, empty (no new posts that week)
  sent INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
