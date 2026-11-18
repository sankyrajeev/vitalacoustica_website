-- The site assistant's memory. chat_log keeps what visitors asked and what it answered, for 90 days
-- (the daily job deletes older rows), so the team can see what it couldn't answer. chat_knowledge
-- holds the answers the team teaches it on the admin page; it uses them from the next question.
CREATE TABLE chat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asked_at INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  unsure INTEGER NOT NULL DEFAULT 0,     -- 1: it said it didn't know
  page TEXT,                             -- the page the chat was opened on
  resolved INTEGER NOT NULL DEFAULT 0    -- 1: the team taught an answer, or dismissed it
);
CREATE INDEX chat_log_open ON chat_log (unsure, resolved, asked_at);

CREATE TABLE chat_knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
