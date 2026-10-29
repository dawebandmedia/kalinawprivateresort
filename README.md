# Kalinaw Private Resort website (concept)

A static website for **Kalinaw Private Resort**, Block 3 Lot 20 Buliran Road, Assumption Subdivision, Antipolo City. Built by DA Web & Media as a concept to present to the resort.

Live preview: https://dawebandmedia.github.io/kalinawprivateresort/

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Hero with the courtyard by day or night (it follows the clock in Antipolo, with a Day/Night switch and moving water), the "day and a night at Kalinaw" timeline, spaces, occasions, heated-pool section, guest reviews, photo marquee, quick date check |
| `resort.html` | Day/night comparison slider, every space with photos, what's included, the 12 house rules |
| `occasions.html` | Celebrations, weddings, teambuilding and seminars, staycations and reunions, suppliers, year-end bookings |
| `gallery.html` | 48 photos with filters and a full-screen viewer |
| `plan.html` | Inquiry builder that writes the message and sends it by Viber, Messenger, text or email; booking steps, FAQ, map and directions, sister resort |
| `404.html` | Not-found page |

## How it's built

- Plain HTML, CSS and JavaScript. No build step is needed to publish; GitHub Pages serves the files as they are.
- Motion: GSAP 3.13 (ScrollTrigger, SplitText) and Lenis smooth scrolling, loaded from jsDelivr. The hero water is a small WebGL shader written for this site.
- Fonts: Gloock (headlines) and Hanken Grotesk (text) from Google Fonts.
- Images: AVIF and WebP in several sizes, with JPEG fallbacks and blurred placeholders.
- Everything still works without JavaScript or with "reduce motion" turned on: the timeline becomes a swipeable row and the hero shows a still photo.

## Before launch

1. **Remove the `noindex` line** in `_source/templates/base.html` (and rebuild), and delete `robots.txt`, so search engines can list the site.
2. Confirm with Kalinaw that the guest reviews and the event photos (which show guests) may be shown.
3. Ask Kalinaw for rates, capacity and payment terms if they want them on the site. Right now the site sends people to message for rates, which matches how they work on Facebook.
4. Ask for the original logo files and full-resolution photos. The current images come from Kalinaw's public Facebook page.

## Editing

Content lives in `_source/data.py` and the page templates in `_source/templates/`. To rebuild after editing:

```
pip install jinja2 pillow
python3 _source/build.py
```

Contact settings for the inquiry form are in `assets/js/config.js`.

## Sources

Facts, photos and reviews come from Kalinaw's public Facebook page (facebook.com/kalinawprivateresort), its Instagram bio (@kalinawprivateresort), its Google Site and the staycations.ph listing, as of October 2026.
