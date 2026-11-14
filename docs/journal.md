# The Vital Acoustica Blog

The blog (formerly the Journal) lives at `/blog`, with each post at `/blog/<slug>`; old `/journal`
links redirect there. The newest daily roundup leads the blog page, and three stories also appear
on the homepage. The code and folders keep the old name (`journal`). Everything is driven by files in this repository; there is no
separate CMS to log into.

- **Articles:** Markdown files in `content/journal/`.
- **Cover photos:** `public/media/journal/`.
- **Server side:** the Cloudflare Worker serves the articles (`server/journal.ts`), the news feed
  (`server/pulse.ts`), the newsletter sign-up (`server/newsletter.ts`) and the sitemap
  (`server/sitemap.ts`).
- **Publishing tool:** `scripts/journal.mjs`, run with `npm run journal`.

## The publishing schedule

**Every morning: the Daily Roundup.** A scheduled Claude session researches the last day or two
of news in sound, lighting and visuals from around the world and writes a short roundup of 3 to 5
stories, in its own words, each one credited and linked to its source. It is saved as
`content/journal/roundup-YYYY-MM-DD.md`, category *Daily Roundup*, status `published`, and pushed;
the site deploys it within minutes. A roundup needs no cover photo (the date stands in) but must
list at least two sources. If there isn't enough real news that day, it skips the day. To stop it,
turn off the scheduled task in Claude (claude.ai/code → Scheduled).

**Features**, two a week when there are approved ones:

- **Tuesday:** an evergreen guide, educational article or production insight. Use the categories
  *Guides & Insights*, *Audio Engineering* or *Lighting & Production*.
- **Friday:** industry news analysis, a technical development or a production story. Use
  *Industry News* or *Production Notes*.

`npm run journal -- new` and `npm run journal -- schedule` pick the next free Tuesday or Friday
for you.

## An article's life

| Status | What it means | Who sees it |
|---|---|---|
| `draft` | Being written | Nobody |
| `review` | Written, waiting for sign-off | Only people with the preview key |
| `scheduled` | Approved; goes live by itself at `publishAt` | Everyone, from that moment |
| `published` | Approved and live (from `publishAt`) | Everyone |

A scheduled article appears on the Journal, the homepage and the sitemap at its time **without a
redeploy**. The Worker checks the clock on every request. Times are written in Indian time, e.g.
`2026-11-03T09:00:00+05:30`.

### Rules the build enforces

`npm run build` runs `npm run journal -- check` first, so a deploy fails rather than publishing
something that breaks these:

- An article with items on its `verify:` list must have `verified: true` before it can be
  `scheduled` or `published`.
- An *Industry News* article needs at least one entry under `sources:` and `verified: true`.
  Unverified news can never go out.
- A live article needs its cover photo (all three sizes) and `coverAlt`.

### Protected publishing

- **Publishing is a change to this repository.** Only people with write access to the GitHub
  repository can do it. For an extra check, turn on branch protection for the deploy branch
  (GitHub → Settings → Branches), so changes need a pull request and an approval.
- **Previews are protected by a secret.** Set `JOURNAL_PREVIEW_TOKEN` (see below), then open
  `https://vitalacoustica.com/blog?preview=<token>`. You'll see every article in review,
  clearly marked, with its open checks listed. Preview pages are never indexed, cached or put in
  the sitemap. Without the token, an unpublished article is a plain 404.
- **Nothing in review reaches the public files.** Articles are served only by the Worker, and the
  website bundle never contains them.

## Writing and publishing an article

```bash
npm run journal                                   # what's in the pipeline: status, date, open checks
npm run journal -- new "Title of the piece" --category "Guides & Insights"
# … write content/journal/<slug>.md, set status: review, push, read it with the preview link …
# … check every item on its verify list, then set verified: true …
npm run journal -- schedule <slug>                # next free Tuesday/Friday, 09:00 IST
npm run journal -- schedule <slug> 2026-11-10 --time 08:30
```

Then commit and push. The article goes live at its time.

### The article file

```markdown
---
title: How to Choose the Right Sound System for Your Venue
slug: how-to-choose-a-sound-system        # the address: /blog/how-to-choose-a-sound-system
excerpt: One or two sentences for cards, search results and link previews (under ~200 characters).
category: Guides & Insights               # Audio Engineering · Lighting & Production · Industry News · Production Notes · Guides & Insights
status: review
publishAt: 2026-10-27T09:00:00+05:30
updatedAt:                                # optional, when you revise a published article
author: The Acoustica Journal             # or a person's name
featured: true                            # optional: puts it first on the Journal and the homepage
cover: venue-system                       # photo name in public/media/journal (see below)
coverAlt: What the photo shows, for people who can't see it
coverCredit: Photo: Name / Unsplash       # optional
coverCreditUrl: https://…                 # optional
services:                                 # links to service pages: sound, light, visuals, production, installations
  - sound
related:                                  # optional; otherwise related articles are picked by category
  - line-array-vs-point-source
sources:                                  # required for Industry News
  - title: The original story's headline
    url: https://…
    publisher: Publication name
    date: 2026-10-20
verify:                                   # what must be checked before it can go out
  - Confirm the figures with the manufacturer
verified: false
---

The article, in Markdown: ## and ### headings, **bold**, *italic*, [links](/capabilities/sound),
- lists, 1. numbered lists, > quotes, and | tables |.
<!-- Notes like this are for the reviewer and are never published. -->
```

Links to other pages of the site (starting with `/`) open inside the site; external links open
in a new tab.

### Cover photos

Each cover is a WebP photo in three widths:
`public/media/journal/<name>-480.webp`, `<name>-800.webp` and `<name>-1600.webp`. The 1600-pixel
version is also the image shown when the article is shared.

Use photographs you own or have a licence for, a different one for each article, and credit them
in `coverCredit`. Landscape works best: cards crop to 3:2 and the article page to 16:9.

## Industry Pulse: the live news feed

`/api/pulse` reads the public RSS/Atom feeds of trade publications (listed in `SOURCES` in
`server/pulse.ts`). It keeps only:

- stories that mention something relevant to live sound, lighting or production;
- stories dated within the last 45 days;
- one copy of each story, even when two publications run it.

For each story it shows the headline, the source, the source's own date, a short excerpt of the
source's own summary (at most about 30 words) and a link to the original. It shows no images and
no full text.

**Refresh:** results are cached for 2 hours per Cloudflare data centre. The first visitor after
that triggers a refresh. If every feed fails, the last good copy (up to 7 days old) is shown.
Otherwise the page shows a "no headlines right now" message. It never shows invented headlines.

**Configuration:** none needed, and no API keys. Optional variables:

| Variable | Purpose |
|---|---|
| `PULSE_FEEDS` | A JSON list replacing the default sources: `[{"name":"FOH","url":"https://fohonline.com/feed/","home":"https://fohonline.com"}]` |
| `PULSE_OFF` | `1` turns the section off |

Check `https://vitalacoustica.com/api/pulse` after a deploy. Its `sources` list shows which
feeds worked. Before adding a source, check its terms of use, and prefer official feeds.

### Turning a news story into an article

```bash
npm run journal -- pulse         # numbered list of current Industry Pulse stories (from the live site)
npm run journal -- promote 3     # starts a draft "Industry News" analysis of story 3
```

The draft records the original as its source and adds checks to its `verify` list. It can't be
scheduled until someone has:

- read the original;
- written the analysis in our own words;
- confirmed the facts;
- set `verified: true`.

## The Acoustica Edit: the weekly newsletter

Every Monday morning (the Worker's daily cron, 08:47 India time) the week's edition is made from
the posts of the previous seven days, roundups first, and emailed to every confirmed subscriber.
A week with no new posts sends nothing. Nothing needs doing by hand.

- **Sign-up:** the full form on the blog, and a one-line form in the footer of every page.
- **Double opt-in:** nobody is on the list until they click the link in the confirmation email
  (it works for seven days). The form gives the same answer whether or not the address is already
  on the list, and a repeat sign-up within 15 minutes sends nothing.
- **Where the list is kept:** the site's own database (D1, tables `newsletter_subscribers` and
  `newsletter_editions`). Nothing to set up in Resend; emails go through the same Resend account.
- **Unsubscribing:** every edition has an unsubscribe link and the one-click unsubscribe header
  mail apps show beside the sender. Opening the link asks "Leave The Acoustica Edit?" first, so a
  mail scanner opening links can't unsubscribe anyone.
- **The daily allowance:** at most 80 emails a day (Resend's free plan allows 100, leaving room
  for account emails). A longer list is finished on the following days. Change it with the
  `NEWSLETTER_DAILY_LIMIT` variable; set `NEWSLETTER_FROM` for another sender (optional).
- **Admin page:** subscriber counts, each edition and how many it went to, and **Send me this
  week's edition** to see it in your own inbox first.

`JOURNAL_PREVIEW_TOKEN` (a secret, optional) turns on article previews.

## Search engines and sharing

- **Page metadata.** Every blog page is served with its own title, description, canonical
  address, Open Graph and Twitter tags. Articles also get `article:*` tags and structured data
  (`Article` and `BreadcrumbList`). The blog page gets `Blog` structured data.
- **Sitemap.** `/sitemap.xml` lists the site's pages and every live article. `robots.txt` points
  to it.
- **Addresses.** Article addresses have no trailing slash; `/blog/<slug>/` redirects there.
- **Unpublished articles** return 404 and are never listed.
- **Analytics.** The site has no analytics script, so none was added.
