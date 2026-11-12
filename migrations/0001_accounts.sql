-- Customer accounts, orders and software licences (Cloudflare D1). Apply with:
--   npx wrangler d1 migrations apply vitalacoustica --remote
-- See docs/accounts.md.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,              -- lower case
  name TEXT,
  password_hash TEXT,                      -- null for Google-only accounts
  google_sub TEXT UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- signed-in sessions: only the SHA-256 of the cookie's token is stored
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- one-time email links (verify the address, reset the password): hashed, short-lived
CREATE TABLE email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  expires_at INTEGER NOT NULL
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL,                  -- 'paddle', or 'manual' for keys issued by hand
  provider_ref TEXT NOT NULL UNIQUE,       -- Paddle transaction id
  status TEXT NOT NULL,                    -- 'completed', 'refunded'
  currency TEXT,
  total INTEGER,                           -- in the currency's smallest unit
  invoice_number TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX orders_user ON orders(user_id);
CREATE INDEX orders_email ON orders(email);

CREATE TABLE order_items (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  amount INTEGER
);

CREATE TABLE licences (
  key TEXT PRIMARY KEY,
  product TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  edition TEXT NOT NULL DEFAULT 'Full',
  max_devices INTEGER NOT NULL DEFAULT 2,
  expires TEXT,                            -- YYYY-MM-DD, null for perpetual
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX licences_user ON licences(user_id);
CREATE INDEX licences_email ON licences(email);

-- the computers each key is active on (machine: the app's anonymous computer id)
CREATE TABLE activations (
  key TEXT NOT NULL REFERENCES licences(key) ON DELETE CASCADE,
  machine TEXT NOT NULL,
  machine_name TEXT,
  activated_at INTEGER NOT NULL,
  PRIMARY KEY (key, machine)
);

-- fixed-window rate limits (sign-in attempts, licence activations)
CREATE TABLE rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

-- webhooks already handled, so a retried delivery is never processed twice
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL
);
