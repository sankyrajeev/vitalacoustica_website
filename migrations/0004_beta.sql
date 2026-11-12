-- Beta testing (VANTA): admin-issued beta keys, what beta builds report, and how often they're used.
-- Beta keys are ordinary licences with edition 'Beta', one computer, an end date and a note.
ALTER TABLE licences ADD COLUMN note TEXT;

-- "Send feedback" and crash reports from beta builds (POST /api/licence/v1/feedback)
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at INTEGER NOT NULL,
  product TEXT,
  key TEXT,
  machine TEXT,
  type TEXT,
  email TEXT,
  crash INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  system TEXT,
  logs TEXT
);
CREATE INDEX feedback_received ON feedback(received_at);

-- a beta build checking in when its editor opens (POST /api/licence/v1/ping)
CREATE TABLE pings (
  key TEXT NOT NULL DEFAULT '',
  machine TEXT NOT NULL,
  last_seen INTEGER NOT NULL,
  version TEXT,
  sessions INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, machine)
);
