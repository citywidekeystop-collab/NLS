"""Build the ChatGPT Ads CSV from current merchant pages, without guessing brands.

Run after scripts/build_merchant_catalog.py whenever catalog details change.
Items missing a brand are excluded, not relabeled as the seller's own brand.
"""
import csv
import json
import re
from decimal import Decimal
from pathlib import Path
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
BASE = 'https://nationallockssupply.com'
G = {'g': 'http://base.google.com/ns/1.0'}
FIELDS = ['item_id', 'title', 'description', 'url', 'brand', 'seller_name',
          'image_url', 'availability', 'price', 'seller_url', 'return_policy',
          'target_countries', 'store_country', 'is_eligible_search',
          'is_eligible_checkout', 'is_ads_eligible']

def build():
    rows, excluded, seen = [], [], set()
    for item in ET.parse(ROOT / 'google-products.xml').findall('./channel/item'):
        def value(name):
            return (item.findtext(name, '', G) or '').strip()
        sku = value('g:id')
        assert sku and sku not in seen, f'Duplicate/missing item ID: {sku}'
        seen.add(sku)
        brand = value('g:brand')
        if not brand:
            excluded.append(sku)
            continue
        url = value('link')
        parsed = urlparse(url)
        assert parsed.scheme == 'https' and parsed.netloc == 'nationallockssupply.com'
        page = (ROOT / parsed.path.lstrip('/')).read_text()
        match = re.search(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)
        assert match, f'Missing product schema: {sku}'
        product = json.loads(match[1])
        assert product['sku'] == sku and product['brand']['name'] == brand, sku
        price = value('g:price')
        assert re.fullmatch(r'\d+\.\d{2} USD', price), sku
        assert Decimal(price.split()[0]) == Decimal(product['offers']['price']), sku
        assert Decimal(price.split()[0]) > 0, sku
        image = value('g:image_link')
        image_path = urlparse(image)
        assert image_path.scheme == 'https' and image_path.netloc == parsed.netloc
        assert (ROOT / image_path.path.lstrip('/')).is_file(), sku
        availability = value('g:availability')
        assert availability in {'in_stock', 'out_of_stock', 'pre_order', 'backorder', 'unknown'}, sku
        row = dict(zip(FIELDS, [sku, value('title'), value('description'), url,
            brand, 'National Locks Supply', image, availability, price,
            BASE + '/', BASE + '/returns.html', 'US', 'US', 'false', 'false', 'true']))
        assert all(row.values()) and len(row['title']) <= 150 and len(row['description']) <= 5000, sku
        rows.append(row)
    assert rows, 'No products have enough verified data for export'
    with (ROOT / 'chatgpt-products.csv').open('w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f'Exported {len(rows)} products; excluded {len(excluded)} without a verified brand.')
    print('Excluded item IDs: ' + ', '.join(excluded))
    return rows, excluded

if __name__ == '__main__':
    build()
