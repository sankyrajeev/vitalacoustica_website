# Hosting on Cloudflare, and enquiry emails through Resend

Everything here is on free plans. The site is hosted on Cloudflare Pages, and the enquiry and
testimonial forms send their emails through Resend. The code is already in place:

- `functions/api/enquiry.ts` receives each form submission and sends the emails.
- `server/emails.ts` holds the designs of the four emails (team and client, for enquiries and testimonials).
- Until the steps below are done, the forms still work: they offer to send the message on WhatsApp.

## 1. A domain

Resend sends from a domain you own. Either:

- **Buy vitalacoustica.com.** A .com costs roughly ₹900–1,200 a year. Cloudflare Registrar sells
  domains at cost, and keeps the DNS in the same place as the site.
- **Or use thevitalvines.com**, which costs nothing if you can change its DNS settings. Emails then
  come from an address such as `hello@thevitalvines.com`.

## 2. Put the site on Cloudflare Pages

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free).
2. Go to **Workers & Pages → Create → Pages → Connect to Git** and pick
   `sankyrajeev/vitalacoustica_website`.
3. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
4. Deploy. The site appears at an address like `vitalacoustica.pages.dev`.
5. Once you have the domain: **the project → Custom domains → Set up a domain** and add
   `vitalacoustica.com`.

## 3. Set up Resend

1. Sign up at [resend.com](https://resend.com) (free: about 3,000 emails a month, 100 a day).
2. **Domains → Add domain**, and enter the domain from step 1.
3. Resend lists a few DNS records. Add them where the domain's DNS lives (Cloudflare, if you bought
   it there; Resend can add them for you automatically). Wait for the domain to show **Verified**.
4. **API Keys → Create API key**, with sending access. Copy it. It's a secret: don't paste it
   into the code or a chat.

## 4. Connect them

In Cloudflare: **the Pages project → Settings → Variables and Secrets** (Production), add:

| Name | Value | |
|---|---|---|
| `RESEND_API_KEY` | the key from Resend | type **Secret** |
| `ENQUIRY_FROM` | `Vital Acoustica <hello@vitalacoustica.com>` | the address must be on the verified domain |
| `ENQUIRY_TO` | `lakshmiranganatha@thevitalvines.com` | optional: this is already the default |
| `ENQUIRY_CC` | `sankarsh@thevitalvines.com` | optional: already the default; comma-separate several |
| `SITE_URL` | `https://vitalacoustica.com` | optional: for links and the logo in emails; use the pages.dev address until the domain is live |

Then **Deployments → Retry deployment** on the latest one, so the function picks them up.

## 5. Test

Send an enquiry from the Contact page with your own email address. You should get:

- **"New enquiry: …"** at the team address, with the CC. Replying goes straight to the person who wrote.
- **"We've got your enquiry, …"** at the address you entered. Replying goes to the team.

If nothing arrives, check spam first, then **Resend → Emails** (it shows every send and any error)
and **Cloudflare → the project → Functions → Logs**.

## Changing the emails

The designs are in `server/emails.ts`. The recipients can be changed at any time with
`ENQUIRY_TO` and `ENQUIRY_CC`, without touching the code.
