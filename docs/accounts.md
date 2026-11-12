# Accounts, orders and software licences

Customers can make an account on vitalacoustica.com. They sign in with an email and password, or with Google. The account holds:

- their licence keys;
- the computers each key is active on (they can free one from here);
- the installers to download;
- their orders.

Payments go through **Paddle**. Paddle is the merchant of record: it takes the payment, handles tax worldwide, and sends the receipts.

All of this runs in the site's own Worker. The data is in **Cloudflare D1**, the free database. Everything below can be done on free plans. Until the database is set up, the account pages say accounts aren't available and the rest of the site works as normal.

| Piece | Where |
| --- | --- |
| Database tables | `migrations/0001_accounts.sql` |
| Sign-up, sign-in, Google, password reset | `server/accounts/auth.ts` |
| The activation server the apps call | `server/accounts/licences.ts` |
| Signed licence files (VANTA's format) | `server/accounts/licence.ts` |
| Paddle webhook: orders, keys, refunds | `server/accounts/paddle.ts` |
| Beta keys, testers and feedback (admin page) | `server/accounts/admin.ts`, `src/pages/Admin.tsx` |
| Private downloads from GitHub Releases | `server/accounts/downloads.ts` |
| The products we license | `server/accounts/products.ts` |
| Account pages | `src/pages/Account.tsx` and `src/account/api.ts` |
| Buy button (Paddle checkout) | `src/components/shop/Buy.tsx` |
| Tests | `tests/accounts.test.ts` (`npm test`) |

## Security in short

- **Passwords never reach us.**
  - The browser turns the password into a slow hash (PBKDF2, 600,000 rounds) before sending it.
  - The server stores only a salted HMAC of that hash.
  - A leaked database is still slow to crack, and the Worker stays inside its CPU allowance.
- **Sessions are protected.**
  - A session is a random token in an HttpOnly, Secure cookie. The database stores only the token's SHA-256.
  - Requests that change something must come from our own pages, as JSON.
- **Email links can't be reused.**
  - Verification links last 24 hours; reset links last 1 hour.
  - Each works once, and only the link's hash is stored.
  - A reset signs out every other session.
- **Attempts are rate-limited:** sign-in, sign-up, resets and activations.
- **Licence files are signed with RSA** in the same format VANTA already checks. The private signing keys are Worker secrets: never in the repository, never in an app.
- **Every Paddle webhook is checked.**
  - Its signature is verified, and it must be recent.
  - Each event is handled once.
  - A full refund or chargeback revokes the order's keys and frees their computers.
- **Installers stay private.** Only owners can download them, through short-lived links.

## 1. Create the database

```sh
npx wrangler d1 create vitalacoustica
```

It prints a `database_id`. Add the binding to `wrangler.jsonc` (top level, next to `"vars"`):

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "vitalacoustica", "database_id": "<the id it printed>" }
],
```

Then create the tables and deploy:

```sh
npx wrangler d1 migrations apply vitalacoustica --remote
```

After this, `https://vitalacoustica.com/api/licence/health` answers `{"ok":true,"configured":true}`.

## 2. Email

Account emails use the same Resend setup as the enquiry form: `RESEND_API_KEY` and `ENQUIRY_FROM`. They cover:

- confirming the email address;
- resetting the password;
- delivering licence keys.

To send them from another address, add a variable `ACCOUNT_FROM`, for example `Vital Acoustica <accounts@vitalacoustica.com>`.

## 3. Licence signing keys

Each app has a key pair. The app is built with the **public** key, and the website signs licences with the **private** key.

**VANTA** already has its pair: `private_key.json` from `tools/licensing/admin.py genkeys`. Convert it to the Worker secret and store it:

```sh
node scripts/licence-key.mjs convert path/to/private_key.json | npx wrangler secret put LICENCE_KEY_VANTA
```

Then build VANTA against this site:

```sh
cmake ... -DVANTA_LICENCE_SERVER=https://vitalacoustica.com/api/licence -DVANTA_LICENCE_PUBLIC_KEY_FILE=path/to/public_key.txt
```

The app adds `/v1/activate` and `/v1/deactivate` itself. The server answers exactly like `tools/licensing/server.py`:

- two computers per key;
- reinstalling on the same computer keeps its slot;
- a third computer is told which two are active.

**ORBIT** and **Lumière Link** need their own pairs, and so does any later product:

```sh
node scripts/licence-key.mjs new keys/orbit        # private_key.json (secret) + public_key.txt (for the app)
node scripts/licence-key.mjs convert keys/orbit/private_key.json | npx wrangler secret put LICENCE_KEY_ORBIT
```

Keep every `private_key.json` backed up offline. Never commit it or paste it into a chat. Every licence ever issued depends on it.

Product names, key prefixes and device limits are in `server/accounts/products.ts`.

- **VANTA Dynamics** signs with VANTA's key, with `"product": "VANTA Dynamics"` in its licence files.
- Each app must check its own product name. VANTA checks `"VANTA"`.

### Pixel Forge

Pixel Forge has its own key format: `PF1.<payload>.<signature>`, signed with Ed25519, from `pixel_forge/pixelforge/licensing.py`.

**How the licence works.** The demo runs on any number of computers. A licence turns on output to the lights on **one computer at a time**, with no channel limit.

**What the website does.** It issues `PXFG-…` keys. When the app activates a key, the server answers with a PF1 token locked to that computer, carrying a refresh date (`"r"`) 90 days ahead.
- The app asks again (the same `/v1/activate` call) whenever it's online. This renews the 90 days.
- If the server answers that the computer was removed, or the key is in use elsewhere, the app goes back to demo.
- A computer freed from the account page therefore stops outputting within 90 days, even if it never comes online.

**Reminder emails.** If a licensed computer hasn't checked in, its owner gets an email 14 days before its output would pause, and a last one 3 days before.
- They're sent by a daily job: the `triggers` cron in `wrangler.jsonc`, running `server/accounts/reminders.ts`. Cron triggers are free.
- Checking in resets the reminders.

**Moving the licence.** As with Lightkey, a key moves by freeing the old computer first: "Deactivate" in the app, or removing that computer in the account page. Activating on a second computer while the first still holds the key is refused, and the message names that computer.

**Turning it on:**
1. On the owner's Mac, open Pixel Forge's `Licence Manager.command` and click "Create signing keys". This makes `~/Documents/Vital Acoustica Licensing/private_key.pem`.
2. Store that same file as the website's secret:

   ```sh
   npx wrangler secret put LICENCE_KEY_PIXELFORGE < ~/Documents/Vital\ Acoustica\ Licensing/private_key.pem
   ```

   Keys made by hand in the Licence Manager and keys from the website then check against the same public key.
3. Never make a new key pair after this: every licence depends on the current one.

**Update notices.** The app checks `GET /api/pixelforge/v1/latest?platform=…&version=…` (public, no licence needed) when it starts and once a day.
- The website answers with the latest GitHub Release of `sankyrajeev/pixel_forge`:
  - the tag `vX.Y.Z` is the version;
  - the release notes' bullet points become the "what's new" list;
  - writing `[critical]` anywhere in the notes makes the app open its update window instead of only showing a button.
- The download link goes to the buyer's account.
- It uses the same `GITHUB_RELEASES_TOKEN` as downloads (step 6), and the answer is cached for 10 minutes.

### "Tell me when it's out"

Products not on sale yet show "Launching soon" and an email field. People who sign up get a confirmation email.
- On the admin page, **Waiting for launch** shows how many are waiting for each product.
- Once a product is on sale, press **Tell them it's out**. Everyone waiting gets one email with a link to it, and is marked as told.

### Beta testing (VANTA)

The website is VANTA's only licence server, betas included. Beta builds also send feedback, crash reports and a check-in to the website. You manage all of it on the **admin page**, at `vitalacoustica.com/account/admin`.

**Requests.** Testing is free and by invitation:
1. On VANTA's shop page, people press "Request beta access" and fill in their name, email, computer, DAW and what they make.
2. They get a "we've got your request" email, and each address in `ADMIN_EMAILS` gets one with their details. Reply to that email to answer them directly.
3. On the admin page, under **Requests to join**, choose the date betas end, then press **Approve and send key**. That issues their beta key and emails the invitation. **Decline** sends nothing.

**Before the database is set up,** beta requests and "Tell me when it's out" sign-ups still work, by email only.
- They go to `ADMIN_EMAILS`, or to the enquiry inbox (`ENQUIRY_TO` / `ENQUIRY_CC`) if that isn't set.
- The person still gets their confirmation email.
- Nothing is stored. Once the database exists, they're kept and listed on the admin page.

Which products have an open beta is set in `server/accounts/beta.ts` (`OPEN_BETAS`) and in the product's `beta` text in `src/content/shop.ts`.

**Setting it up:**
1. Add the variable `ADMIN_EMAILS` to the Worker: your email address, or several separated by commas. Make an account on the site with that address and confirm it. An **Admin** link then appears in your account.
2. Make sure replies to beta invitations reach you:
   - Invitations are sent with "Reply-To: beta@vitalacoustica.com". Set up that address, for example with Cloudflare Email Routing (free) forwarding it to your inbox.
   - Or set `BETA_REPLY_TO` to another address.
3. Optionally, set `BETA_GUIDE_URL` to a link to the testers' guide. The invitation includes it if set.

**On the admin page you can:**
- issue a beta key: email, name, end date and a note. Tick "Email the invitation" to send the tester their key and download link, using the wording from VANTA's `docs/email/beta-invite.txt`;
- see each tester: whether their computer is activated, which terms they accepted and when, when they last opened VANTA, on which version, and how many times;
- read feedback, filter to crash reports only, and open each report's logs;
- revoke a key, which stops it working.

**How beta keys behave.** Beta keys are VANTA licences with edition "Beta":
- one computer only;
- the end date is written into the signed licence;
- after the end date, activation is refused.

**Downloads for testers.** A tester signs in, or creates an account, with the email address the key was sent to. The key appears in their account with a Download button.
- That button lists the files of the latest GitHub Release of `sankyrajeev/vanta_vitalacoustica`.
- Releases are published when CI builds a `vX.Y.Z` tag.
- The website needs `GITHUB_RELEASES_TOKEN` (step 6) with read access to that repository.

## 4. Paddle

1. Create a Paddle account at paddle.com.
   - Start in the **sandbox** (sandbox-vendors.paddle.com), which uses test cards.
   - The live account needs Paddle's website and business checks before it can take payments.
2. In **Catalog → Products**, create each product (VANTA, ORBIT, …) with a one-time price.
   Paddle's website review looks for terms, a privacy notice and a refund policy. They are:
   - terms: `https://vitalacoustica.com/legal`;
   - privacy notice: `/privacy`;
   - refund policy: `/legal#refunds`, a 14-day no-questions refund for software, which is within Paddle's required 14–90 days.
3. In **Checkout → Checkout settings**, set the default payment link to `https://vitalacoustica.com/shop`. Paddle asks you to approve the domain.
4. In **Developer tools → Notifications**, add a destination:
   - URL: `https://vitalacoustica.com/api/paddle/webhook`
   - Events: `transaction.completed`, `adjustment.created`, `adjustment.updated`

   Copy its secret key.
5. In **Developer tools → Authentication**, create:
   - an **API key** with permission to read customers;
   - a **client-side token**.
6. Add these to the Worker (Cloudflare dashboard → the Worker → Settings → Variables and secrets):

   | Name | Type | Value |
   | --- | --- | --- |
   | `PADDLE_WEBHOOK_SECRET` | secret | the notification destination's secret key |
   | `PADDLE_API_KEY` | secret | the API key |
   | `PADDLE_PRODUCTS` | variable | which Paddle product is which of ours, e.g. `{"pro_01h…":"vanta","pro_01j…":"orbit"}` |
   | `PADDLE_ENV` | variable | `sandbox` while testing; remove it for live |

7. Add these **build** variables (Cloudflare → the Worker → Settings → Build → Variables):
   - `VITE_PADDLE_CLIENT_TOKEN` = the client-side token. This one is public by design: it can only open checkouts.
   - `VITE_PADDLE_ENV=sandbox` while testing.
8. In `src/content/shop.ts`, give each software product its price, and its Paddle price id as `paddlePrice: 'pri_…'`.
   - Its Buy button then opens Paddle's checkout over the page, in place of "Launching soon".
   - If the buyer is signed in, the order joins their account.
   - If not, the key is emailed to them. It also appears in the account they make (or already have) with the same email address, once that address is confirmed.

**Lumière Resident** is hardware, and Paddle only sells digital products. It stays as an enquiry, or gets its own `checkout` link like the merch.

To issue a key by hand (a gift, a reviewer, a replacement):

```sh
npx wrangler d1 execute vitalacoustica --remote --command "INSERT INTO licences (key, product, email, created_at) VALUES ('VNTA-XXXXX-XXXXX-XXXXX-XXXXX', 'vanta', 'their@email', unixepoch())"
```

Use a key made by the site's format: 20 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. It appears in their account once they sign up with that email.

## 5. Sign in with Google (optional)

1. In Google Cloud Console → APIs & Services → Credentials, create an **OAuth client ID** of type *Web application*.
2. Set the authorised redirect URI to `https://vitalacoustica.com/api/account/google/callback`.
3. On the OAuth consent screen, set the app name, logo and privacy link (`https://vitalacoustica.com/privacy`). Publish it.
4. Add the secrets `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Without them, the Google button says Google sign-in isn't available yet.

How Google sign-ins join accounts:

- A Google sign-in joins an existing account with the same email address.
- If that account's email was never confirmed, its password is removed, because someone else could have set it. The owner can set a new one in their account.

Facebook sign-in isn't included. It needs Meta's app review and a business verification. It can be added later in the same way.

## 6. Downloads

Installers are kept private on GitHub:

1. Make a private repository for installers, e.g. `vitalacoustica/vanta-releases`.
2. Publish each version as a **release** with the installers attached (`.pkg`, `.dmg`, `.exe`, …).
3. Put the repository in `releases` for that product in `server/accounts/products.ts`.
4. Make a fine-grained GitHub token with **Contents: read-only** on those repositories. Save it as the secret `GITHUB_RELEASES_TOKEN`.

What owners see:

- Owners see the latest release's files under **Download** in their account.
- Each click gives them GitHub's short-lived link to that file.

## Testing

- `npm test` runs the whole flow against an in-memory database:
  - sign-up, verify, sign-in, reset;
  - Google;
  - a Paddle purchase and a refund;
  - activations.
- To click through it locally:
  1. Run `npx wrangler dev` with the D1 binding.
  2. Add `DEV_EMAIL_LOG=1` in `.dev.vars`. Emails are then printed in the terminal instead of sent.
  3. Apply the migrations with `npx wrangler d1 migrations apply vitalacoustica --local`.
- For Paddle, use the sandbox and its test card `4242 4242 4242 4242`.
