-- What the app reports when it activates: its system, and which version of the terms the customer
-- accepted on first launch, and when (VANTA sends these; other apps may not).
ALTER TABLE activations ADD COLUMN os TEXT;
ALTER TABLE activations ADD COLUMN terms_version TEXT;
ALTER TABLE activations ADD COLUMN terms_accepted TEXT;
