# Genix Logistics home page — design

Date: 2026-09-27 · Status: approved in brainstorming, awaiting spec review
Scope: static prototype `design/logistics-home.html` (same stage as the Home
Upgrades prototype). The Next.js/Payload build comes later and reuses this.

## 1. Business context (from the owner)

- Services: **business freight** (pallets, part/full loads), **last-mile &
  courier** (same/next-day around San Diego), **moving** (home and office).
- Customers: roughly **even** between businesses and households, so the page
  splits early into two routes under one brand.
- How people get a price: **quote form, then a callback**. No instant pricing.
- Real media: **none yet**. Stock images are labelled "Stock photo"; proof
  (numbers, recent jobs, fleet) lives in clearly marked placeholders.
- Tagline (official): "San Diego Freight, Handled Right."

## 2. Visual direction: "Navy manifest"

The site borrows the language of a shipping label / freight manifest.

| Token | Value | Use |
|---|---|---|
| `--brand` / navy | `#022248` | hero and dark sections, headings on light |
| gold | `#C28A2C` | accents, primary buttons, lane markings |
| truck grey | `#37404A` | the truck, secondary text on paper |
| paper | `#F7F5EF` | label cards, light sections |
| ink on navy | `#FFFFFF`, muted `#B9C4D3` | text on navy |
| label brown | `#7A6A4A` | monospace field labels on paper |

Type:
- Display: **Archivo** 900, width ~118%, uppercase, tight leading. Headlines
  only, used with restraint.
- Body: Archivo 400/600, normal width.
- Utility: **IBM Plex Mono** 500, uppercase, tracked 0.1em. Field labels,
  reference lines, step numbers, "From / To" rows.

Signature devices (structure that means something):
- **The label**: dashed-edge paper card with a reference line and a barcode
  strip. Used for the quote form (hero) and the final quote section.
- **Lane markings**: gold dashed rules as section dividers.

Implementation: `[data-division="logistics"]` token block in
`shared/genix.css` (like Home Upgrades), plus a style layer
`shared/style-logistics.css` scoped to `[data-division="logistics"]`.
Home Upgrades' style layer is not reused. Logo: `assets/genix-logistics-logo.svg`.
Icons: `assets/logistics-icons/` (tags in section 7).

## 3. Page structure (phone-first)

1. **Header**: logo, nav (Services · How it works · Where we go), "Get a
   quote" button. On phones (≤960px), the pinned bottom quote bar from Home
   Upgrades, hidden over the hero form, the quote section and the footer.
2. **Hero = quote starter** (navy). Mono eyebrow, H1 "San Diego Freight,
   Handled Right." (gold on "Handled Right."), one line of lead copy, then
   the label form (section 5). Phones: headline and form step 1 fit the
   first screen.
3. **Two lanes** (paper). "For businesses" (freight; last-mile & courier)
   and "For moves" (home; office). Each lane ends with "Get a price", which
   scrolls to the hero form with that tab selected. Phones: cards swipe
   sideways (Home Upgrades pattern).
4. **How a job runs**: the signature (section 4).
5. **Where we go**: San Diego County areas as a list (placeholder until the
   owner supplies them) plus "Outside this? Ask us".
6. **Why Genix + proof slots**: only confirmed promises (a real person to
   call, clear timelines). Marked placeholders for numbers and recent jobs.
   No "licensed & insured" or similar claims until the owner confirms them.
7. **FAQ** (4 questions, native `<details>`): how soon, what areas, what we
   don't move, are loads insured. Answers are placeholders.
8. **Final quote section**: a label-styled card (not a second form) with a
   "Start a quote" button that scrolls to the hero form and focuses its first
   field, plus phone and email. Then the footer (group-shared, Logistics links).

Out of scope: shipment tracking, a pricing table, reviews/testimonials.

## 4. Signature: "One road, one section"

In "How a job runs" (navy section): a gold dashed road with four stops,
**01 Quote → 02 Scheduled → 03 Picked up → 04 Delivered**, each with a
one-line mono caption (placeholder wording until confirmed).

- The logo's truck (small, derived from the mark in
  `genix-logistics-logo.svg`, facing the direction of travel) drives along
  the road as the section scrolls through the viewport. Scrubbed
  ScrollTrigger, **no pinning, no extra scroll length**.
- Stops fill gold as the truck passes. At the last stop a **"DELIVERED"
  rubber stamp** lands (short scale/rotate, once).
- Desktop: road runs left→right. Phones (<760px): road runs top→bottom
  beside the steps.
- Reduced motion / no JS: static finished state (truck at Delivered, all
  stops filled, stamp shown).
- GSAP + ScrollTrigger only (the existing stack). No new libraries.

## 5. Quote form

Markup: one `<form>` inside the label card; the tabs are a radio group
(`name="kind"`: `business` | `move`) styled as a segmented control.

Step 1 — the route:
- Pickup ZIP, drop-off ZIP: required, `^\d{5}$`, `inputmode="numeric"`.
  A ZIP outside the served list does **not** block: a note says "Outside our
  usual area, we'll still take a look." Served list = placeholder (San Diego
  County prefixes 919xx–921xx) until the owner supplies it.
- Date: `type="date"`, not in the past; "Flexible" checkbox clears/disables it.
- What's moving (select; options swap with the tab, choice reset on swap):
  business = pallets (with count), parcels/boxes, full truckload, same-day
  courier; move = studio, 1–2 bedroom, 3+ bedroom, office.
- Switching tabs keeps ZIPs and date.
- "Continue" validates step 1 and shows step 2 (no reload); focus moves to
  the step 2 heading.

Step 2 — contact:
- Name (required); phone **or** email (at least one, validated); notes
  (optional). "Back" returns with everything kept.
- Hidden honeypot field (checked in the real build).

After sending:
- Prototype: no network call; the label's reference line changes from "New
  request" to "Request received. We'll call you back [placeholder time]."
  Announced via `aria-live`. No fake reference numbers before submit.
- Real build: POST to the Payload `Inquiries` collection, tagged
  `division: logistics`, plus a Resend email to the team (per the
  architecture decision).

Errors:
- Inline, plain language ("Enter a 5-digit ZIP"), `aria-describedby` on the
  field, focus to the first invalid field, summary announced via `aria-live`.
- Send failure (real build): keep all input, show "Try again" plus the phone
  number.

No JS: both steps render as one ordinary form (both fieldsets visible, tabs
as plain radios).

## 6. Shared pieces reused

`shared/genix.css` + `genix.js` (header, footer, buttons, Lenis, SplitText
`[data-split]`, `[data-reveal]`), the pinned quote bar pattern, the swipe
cards pattern, the step/progress styles where they fit. Anything that turns
out Home-Upgrades-specific stays in that page; nothing is forked.

## 7. Head / assets

```html
<link rel="icon" href="assets/logistics-icons/favicon.ico" sizes="48x48" />
<link rel="icon" type="image/svg+xml" href="assets/logistics-icons/favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="assets/logistics-icons/apple-touch-icon.png" />
<link rel="manifest" href="assets/logistics-icons/site.webmanifest" />
<meta name="theme-color" content="#022248" />
```
Title "Genix Logistics — San Diego Freight, Handled Right.", canonical
`https://logistics.thegenixgroup.com/`, `<html data-division="logistics">`.
The hub's Logistics links keep pointing at the subdomain; the prototype is
linked from the hub panel for review.

## 8. Testing

A Playwright suite `test_logistics.py` in the style of `test_hu.py`:
- desktop 1440 and phone 390: no console errors or failed requests; first
  screen shows H1 and form step 1 on phones
- tabs: switching keeps ZIP/date, swaps options, lane "Get a price" selects
  the right tab
- validation: bad ZIP, past date, missing contact each show the right inline
  error and focus; outside-area ZIP shows the note and still continues
- keyboard-only walk through both steps; confirmation announced
- signature: truck position and filled stops advance with scroll; section
  height unchanged by the animation; stamp shown at the end; reduced motion
  shows the static finished state
- pinned bar visibility rules on phones; no horizontal page scroll at 390px
- no-JS: both form steps visible and usable

## 9. Open items for the owner (placeholders until supplied)

Served ZIPs/areas · callback time · step captions ("price in 1 business day"
etc.) · FAQ answers · insurance/licensing status · phone and email ·
numbers, photos, recent jobs.
