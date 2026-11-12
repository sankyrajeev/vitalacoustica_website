-- "Tell me when it's out": people waiting for a product to launch. The owner emails them all from the
-- admin page when it's on sale; notified_at marks who has had that email.
CREATE TABLE launch_alerts (
  product TEXT NOT NULL,                   -- the shop's product id (src/content/shop.ts)
  email TEXT NOT NULL,
  detail TEXT,                             -- e.g. the colour and size, for merch
  created_at INTEGER NOT NULL,
  notified_at INTEGER,
  PRIMARY KEY (product, email)
);
