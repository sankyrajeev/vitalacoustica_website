# The chat assistant

The "Ask us" chat on every page. Typed questions are answered by a language model running on
Cloudflare Workers AI (free within the account's daily allowance), from the site's own content.
The suggestion buttons keep their written answers.

## How it answers

1. The page sends the question, the last few turns and the page it's on to `POST /api/chat`
   (`server/assistant/chat.ts`).
2. The Worker searches the site's knowledge (`server/assistant/knowledge.ts`) for the passages that
   match. The knowledge is built from:
   - the shop's products (`src/content/shop.ts`), VANTA included, with their status (on sale,
     free beta, coming soon);
   - the equipment, services and testimonials (`src/content/`);
   - every live blog post, daily roundups included;
   - a few fixed facts (how hiring works, prices, payment, accounts);
   - the answers taught on the admin page.
3. The model writes a short answer from only those passages, with links to the right pages. If the
   passages don't answer it, the model says so and the chat offers WhatsApp.

Anything published is in its knowledge from the next deploy. Nothing needs retraining.

## Teaching it

**Account → Admin → Chat assistant** lists the questions it couldn't answer this week. Click
**Teach the answer**, write what it should say, and it uses that from the next question on. Taught
answers can be edited or removed there. **Teach it something new** adds one without waiting for
someone to ask.

Questions and answers are kept for 90 days (the daily job deletes older ones); the privacy notice
says so. Replies never include phone numbers or outside email addresses.

## When the model isn't there

Without the AI binding (a review copy of the site), when the model fails, or when the day's free
allowance is used up, `/api/chat` answers 503 and the page's own small model (`src/assistant`,
trained with `npm run train:assistant`) answers instead. Each address can ask 40 questions an hour.

## Settings

- `wrangler.jsonc` → `"ai": { "binding": "AI" }`: nothing to set up in the dashboard.
- `CHAT_MODEL` (optional variable): another Workers AI text model, e.g.
  `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for better answers. It uses the free allowance faster:
  roughly 80 questions a day instead of about 500.
