# Setting up the shop

The shop page is built and shows **sample products** (marked "Sample") until the real ones are added.
Products live in `src/content/shop.ts`. A product with an empty `checkout` shows "Coming soon" and a
"Tell me when it's out" WhatsApp button; paste a checkout link in and it becomes buyable.

## Audio packs and VJ loops: Gumroad (sold worldwide)

Why Gumroad: it hosts the files, emails the download link, takes cards, PayPal and UPI, and acts as
the *merchant of record*, so it charges and pays the sales tax/VAT owed in each buyer's country. It
can pay out to an Indian bank account. Its fee is about 10% + $0.50 per sale (check their pricing page).

1. Create an account at gumroad.com with the business email, and add the bank account for payouts.
2. For each pack or loop set: **New product → Digital product**. Upload the zip, set the price in USD,
   add the cover and preview.
3. Copy the product link (e.g. `https://vitalacoustica.gumroad.com/l/warehouse-hours`) into that
   product's `checkout` in `src/content/shop.ts`, and remove `sample: true`.
4. The site loads Gumroad's checkout script on its own, so the Buy button opens the checkout over our page.

Previews:
- Audio: put a 30-second MP3 in `public/shop/` and set `preview: 'shop/warehouse-hours.mp3'`.
  Until then, the site plays a short demo it makes in the browser.
- VJ loops: put a short, small MP4 (720p, a few MB) in `public/shop/` and set `preview: 'shop/beam-study.mp4'`.
  Until then, the site draws a live preview.

Keep the files you upload to Gumroad as zips: `Pack Name/Drums/...wav`, plus a `LICENSE.txt` matching
the licence in the Legal page ("Shop" section).

## Merch: print on demand with Qikink (India)

Qikink prints and ships each order, so there's no stock to hold. There are two ways to take orders:

**Start here: payment page and manual orders (no monthly fee).**
1. Create a Qikink account and design each product there (upload the logo files from `public/brand/`).
2. Make a Razorpay Payment Page for each product, with fields for colour, size and delivery address.
   Razorpay takes UPI and cards and charges about 2% per payment.
3. Paste the payment page link into the product's `checkout`.
4. When an order comes in, place it in the Qikink dashboard. Qikink prints and ships it.

**When orders pick up: a Shopify store with the Qikink app.** Orders flow to Qikink automatically.
Shopify costs a monthly fee (check Shopify India's pricing page). Paste each Shopify product link into `checkout`.

Real product photos: put them in `public/shop/` and set `photo: 'shop/mark-tee.webp'`. Until then the site
shows a drawn mock-up in the product's colours.

## Before going live

- GST: digital sales to Indian buyers and merch sales are taxable. Ask the accountant how Gumroad's tax
  handling and the GSTIN should be set up.
- Check the "Shop" section of the Legal page (refunds, licence) matches what you want, ideally with a lawyer.
- Delete the sample products you don't sell.
