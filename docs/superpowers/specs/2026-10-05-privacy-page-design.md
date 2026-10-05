# Privacy policy page — design

**Date:** 2026-10-05 · **Status:** approved in brainstorming, awaiting spec review
**Builds on:** `2026-09-27-genix-websites-design.md` §4a ("a Privacy page per site") — superseded here by **one group policy** (owner decision). The enquiry pipelines are documented in `2026-09-30-enquiry-pipeline-design.md` and `2026-10-04-homeupgrades-quote-form-design.md`.

## Understanding

The quote forms collect names, contact details and (Home Upgrades) photos, and their privacy line only links to an email address. California's online privacy law expects a site that collects personal details from visitors to post a conspicuous policy saying what is collected, who handles it, how "Do Not Track" is treated, and when it was last updated. The owner wants one real Privacy page that every form and footer links to.

## Decisions (owner, 2026-10-05)

- **One policy for the whole group**, at `https://thegenixgroup.com/privacy` (hub host). Division sites do not get their own copy.
- **Text lives in the code** (not an admin field). A visible "Last updated" date is bumped by hand when the text changes.
- The owner confirmed three commitments the text makes and that they can keep: **replies within 45 days** to data requests; **deleting a request and its photos on request** (deleting an inquiry in the admin already deletes its photos); **"we never sell your details."**
- Wording is plain-language. This is a draft for the owner to read; it is not legal advice, and a lawyer's review is recommended.

## What it covers (matches what the sites really do)

- Collected: quote-form fields (Logistics: ZIPs, date, load, notes; Home Upgrades: project, property type, timing, optional budget, ZIP, description, links, photos, optional call time) plus name and phone/email; a **hashed** IP (salted HMAC) for spam limiting; cookieless page-visit and page-speed counts (Vercel Analytics / Speed Insights).
- Processors: **Resend** (email), **Cloudinary** (photos, Home Upgrades), **Vercel** (hosting, analytics, bot check), **Neon** (database).
- No advertising or tracking cookies; no cookie banner. (Staff signing in to the admin get a login cookie; visitors get none.)

## The page

- Route: `web/src/app/(sites)/[site]/privacy/page.tsx`. On the **hub** it renders the policy; on any **division** host it permanently redirects (308) to `https://thegenixgroup.com/privacy` (`siteOrigin('hub')`).
- Layout: the hub's header and footer around a plain, readable article — `<h1>Privacy policy</h1>`, "Last updated October 5, 2026", then `<h2>` sections in the order of the appendix. Reading width ≈ 68ch, comfortable line height, left-aligned; works from 320 px up. The service-provider list is a small table on desktop that stacks into short blocks on phones. Styles are scoped (`.legal …`) and use the hub's tokens (black + gold); no new animation.
- Hub address (street, city, state, ZIP) from the `sites` record is added to the contact paragraph **only when all four are present**; otherwise omitted (no placeholders).
- Metadata: title "Privacy policy | The Genix Group", description one sentence, canonical `https://thegenixgroup.com/privacy`, indexable. Added to the hub's `pages` so it appears in `sitemap.xml`.
- Policy content lives in one module (`web/src/legal/privacy.tsx`: a typed data structure + a small renderer) so the page, tests and the "last updated" date share one source.

## Links

- Both quote forms' privacy line becomes "We use your details only to reply to this request. Read our privacy policy." (Home Upgrades keeps "details and photos"), the last words linking to `https://thegenixgroup.com/privacy`. Applies to the prototypes (`design/logistics-home.html`, `design/homeupgrades-home.html`) and the app (`Hero.tsx` for Logistics, `Quote.tsx` for Home Upgrades); the Logistics line drops the email address (the footer keeps it).
- A "Privacy policy" link in the bottom bar of **all four footers** (prototypes: hub, logistics, homeupgrades; app: `HubFooter.tsx`, `DivisionFooter.tsx`). Links use the hub origin so they work from every host. Multimedia (no home page yet) gets it through the shared division footer.

## Testing

- **E2E** (`tests/e2e/privacy.e2e.spec.ts`): hub `/privacy` shows the h1, the "Last updated" date and the section headings in order, a table with the four providers, a `mailto:hello@thegenixgroup.com` link; a division host `/privacy` redirects with 308 to the hub page; `sitemap.xml` on the hub lists it and a division sitemap does not.
- **Links:** each of the four home pages' footers has a Privacy link that resolves (`links.e2e.spec.ts` already follows in-app links); both forms' privacy line contains the link.
- **Quality:** add the hub `/privacy` URL to the axe + console tests; `parity` stays green for the three home pages (footer/form text changed in prototype and app together).
- **Unit:** the policy module renders every section, includes the date, and the hub-address helper omits partial addresses; `seo.test.ts` sitemap expectations updated.
- README note: "when a new service provider or new kind of data is added, update `web/src/legal/privacy.tsx` and its date."

## Out of scope

Per-site policies; admin-editable text; a cookie banner (nothing to consent to); terms of service; a Multimedia home page; translating the policy.

## Appendix — policy text (what the page will say)

**Privacy policy**
Last updated October 5, 2026

This policy explains what The Genix Group collects when you use thegenixgroup.com and the sites of our businesses, what we do with it, and your choices. We've kept it short on purpose.

**Who we are**
The Genix Group runs three businesses: Genix Logistics (freight, courier runs and moves), Genix Home Upgrades (accent walls, TV units, outdoor builds and handyman work) and Genix Multimedia. In this policy, "we" means The Genix Group and those businesses. You can reach us at hello@thegenixgroup.com{, or by mail at *address, if set*}.

**What we collect**
When you send a request through a form, we collect what you type: your name, your phone number or email, and the details of your request.
- Genix Logistics: where something is going from and to (ZIP codes), the date, what's moving, and any notes.
- Genix Home Upgrades: the kind of project, whether it's for a home or a business, when you'd like to start, a rough budget if you give one, your property ZIP, your description, any links you add, the photos you upload, and a best time to call if you choose one.
- Genix Multimedia doesn't have a request form yet. If you email us, we keep your message.

We also collect two technical things. To limit spam, we keep a scrambled (hashed) version of your IP address; it can't be turned back into your address. And our host counts visits and page speed in a way that doesn't use cookies and doesn't identify you.

**How we use it**
We use your details only to reply to your request: to send you a confirmation, answer your questions, arrange a visit, give you a quote and do the work. We keep a record of the request so we can follow up. We use scrambled IP addresses only to limit spam. We don't send marketing emails, we don't use your details for advertising, and we never sell them.

**Who handles it for us**
| Service | What it does for us | What it receives |
|---|---|---|
| Resend | Sends our emails, including your confirmation | Your name, email address and a summary of your request |
| Cloudinary | Stores the photos you upload (Home Upgrades) privately | Your photos |
| Vercel | Hosts our sites, counts visits without cookies, and checks that forms aren't filled in by bots | Technical details such as your IP address and browser, and the pages you open |
| Neon | Our database, where requests are saved | Everything you submit in a form |

These companies handle your information to provide those services to us, under their own terms and privacy policies. We read your request in our own email inbox. We don't give your details to anyone else unless the law requires it.

**Cookies and tracking**
We don't use advertising or tracking cookies, and there is no cookie banner because there is nothing to ask you about. (Our own staff get a login cookie when they sign in to manage the sites; visitors don't.) We don't track you across other websites, so a "Do Not Track" signal from your browser doesn't change how our sites work.

**How long we keep it**
We keep a request for as long as we need it to follow up and for our business records. If you ask us to delete it, we will, including any photos you uploaded. Photos that were uploaded but never sent with a request are removed automatically within a couple of days.

**Your choices**
You can ask us what we hold about you, to correct it, or to delete it. Email hello@thegenixgroup.com from the address you used and tell us what you need. We'll reply within 45 days. California law gives California residents these rights, and we'll honor a request from anyone. We won't treat you differently for asking.

**Children**
Our sites are for adults arranging work. They aren't directed to children under 13, and we don't knowingly collect their information.

**Changes**
If we change this policy, we'll update the date at the top. If the change is significant, we'll say so on this page.

**Questions**
Write to hello@thegenixgroup.com.
