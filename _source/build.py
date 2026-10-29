"""Render the static site from templates + data. Run: python3 _source/build.py"""
import json, os, sys, time, re
from jinja2 import Environment, FileSystemLoader, select_autoescape
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import data as D
manifest = json.load(open(os.path.join(HERE, 'manifest.json')))
env = Environment(loader=FileSystemLoader(os.path.join(HERE, 'templates')), autoescape=select_autoescape(['html']),
                  trim_blocks=True, lstrip_blocks=True)
svg = open(os.path.join(HERE, 'mark-outline.svg')).read()
mark_paths = re.sub(r'^<svg[^>]*>|</svg>$', '', svg)
v = str(int(time.time()))
jsonld = json.dumps({
    '@context': 'https://schema.org', '@type': ['LodgingBusiness', 'EventVenue'],
    'name': D.SITE['name'], 'url': D.SITE['url'], 'image': D.SITE['url'] + 'assets/img/share.jpg',
    'telephone': D.SITE['phone_e164'], 'email': D.SITE['email'],
    'address': {'@type': 'PostalAddress', 'streetAddress': 'Block 3 Lot 20 Buliran Road, Assumption Subdivision',
                'addressLocality': 'Antipolo', 'addressRegion': 'Rizal', 'postalCode': '1870', 'addressCountry': 'PH'},
    'geo': {'@type': 'GeoCoordinates', 'latitude': D.SITE['lat'], 'longitude': D.SITE['lng']},
    'checkinTime': '14:00', 'checkoutTime': '11:00',
    'amenityFeature': [{'@type': 'LocationFeatureSpecification', 'name': a, 'value': True} for a, _ in D.AMENITIES],
    'sameAs': [D.SITE['facebook'], D.SITE['instagram']],
}, indent=1, ensure_ascii=False)
counts = {'all': len(D.GALLERY)}
for _, c, _ in D.GALLERY: counts[c] = counts.get(c, 0) + 1
common = dict(site=D.SITE, nav=D.NAV, manifest=manifest, mark_paths=mark_paths, v=v, jsonld=jsonld,
              day=D.DAY, spaces=D.SPACES, occasions=D.OCCASIONS, reviews=D.REVIEWS, amenities=D.AMENITIES,
              rules=D.HOUSE_RULES, gallery=D.GALLERY, filters=D.GALLERY_FILTERS, counts=counts, faq=D.FAQ, steps=D.STEPS)
PAGES = [
    ('index.html', 'home', 'Kalinaw Private Resort, Antipolo | Your own resort in the hills',
     'A modern Filipino-inspired private resort in Antipolo with a heated pool, garden, three bedrooms and event spaces, booked by one group at a time.', 'has-hero'),
    ('resort.html', 'resort', 'The resort | Kalinaw Private Resort, Antipolo',
     'Every space at Kalinaw: heated pool and kiddie pool, garden and nipa pavilion, living and dining hall, three bedrooms, videoke room, conference room and kitchen.', 'has-hero'),
    ('occasions.html', 'occasions', 'Occasions | Kalinaw Private Resort, Antipolo',
     'Birthdays, weddings, teambuilding, seminars, reunions and staycations at a private resort in Antipolo. Bring your own caterer and suppliers.', 'has-hero'),
    ('gallery.html', 'gallery', 'Gallery | Kalinaw Private Resort, Antipolo',
     'Photos of Kalinaw Private Resort by day and by night, and of the birthdays, weddings and gatherings held there.', ''),
    ('plan.html', 'plan', 'Plan your visit | Kalinaw Private Resort, Antipolo',
     'Ask Kalinaw Private Resort for rates and open dates by Viber, Messenger, text or email. Directions, house rules and answers to common questions.', ''),
    ('404.html', 'notfound', 'Page not found | Kalinaw Private Resort', 'This page could not be found.', 'has-hero'),
]
def fix(html):
    # unicode escapes typed in templates -> real characters
    html = html.replace('\\u2019', '’').replace('\\u2026', '…').replace('\\u201c', '“').replace('\\u201d', '”')
    return html
for fn, pid, title, desc, bc in PAGES:
    html = env.get_template(fn).render(page=fn, page_id=pid, title=title, description=desc, body_class=bc, **common)
    open(os.path.join(ROOT, fn), 'w').write(fix(html))
    print('built', fn, len(html))
