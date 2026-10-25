"""Build Merchant Center pages/feed from the exact storefront catalog.
Availability confirmed by the owner on 2026-10-25 for these 65 products.
Run from the repository root with Python 3.
"""
import base64, html, json, re
from pathlib import Path
import xml.etree.ElementTree as ET
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://nationallockssupply.com'
s = (ROOT/'index.html').read_text()
start = s.index('const products = ') + len('const products = ')
products, _ = json.JSONDecoder().raw_decode(s[start:])
assert len(products) == 65 and len({p['sku'] for p in products}) == 65
G = 'http://base.google.com/ns/1.0'
ET.register_namespace('g', G)
rss = ET.Element('rss', {'version':'2.0'})
channel = ET.SubElement(rss, 'channel')
for tag, val in [('title','National Locks Supply'), ('link',BASE+'/'), ('description','Residential and commercial door locks and hardware')]:
    ET.SubElement(channel,tag).text = val
assets=ROOT/'merchant-images'; assets.mkdir(exist_ok=True)
links=[]
for p in products:
    sku=p['sku']; name=p['name']; price=float(p['price'])
    assert price>0
    slug=re.sub(r'[^a-z0-9]+','-',sku.lower()).strip('-')
    match=re.fullmatch(r'data:image/(webp|jpeg|png);base64,(.*)',p['image'],re.S)
    if match:
        ext={'jpeg':'jpg','webp':'webp','png':'png'}[match[1]]
        asset=f'merchant-images/{slug}.{ext}'
        (ROOT/asset).write_bytes(base64.b64decode(match[2],validate=True))
    else:
        asset=p['image'].lstrip('/')
        assert asset.startswith('merchant-images/') and (ROOT/asset).is_file(), sku
    page=f'{slug}.html'; url=f'{BASE}/{page}'; image=f'{BASE}/{asset}'
    desc=name+'.'
    if p.get('imageNote'): desc+=' '+p['imageNote']
    offer={'@type':'Offer','url':url,'priceCurrency':'USD','price':f'{price:.2f}','availability':'https://schema.org/InStock','itemCondition':'https://schema.org/NewCondition','seller':{'@type':'Organization','name':'National Locks Supply'}}
    schema={'@context':'https://schema.org','@type':'Product','name':name,'sku':sku,'image':[image],'description':desc,'offers':offer}
    brand=p['type'].split(' • ',1)[1] if p.get('source')=='SELOCK' and ' • ' in p.get('type','') else None
    if brand: schema['brand']={'@type':'Brand','name':brand}; schema['mpn']=sku
    e=html.escape
    details=f'<dt>Item number</dt><dd>{e(sku)}</dd><dt>Type</dt><dd>{e(p["type"])}</dd>'
    if brand: details+=f'<dt>Brand</dt><dd>{e(brand)}</dd>'
    text=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(name)} | National Locks Supply</title><meta name="description" content="{e(desc,quote=True)}"><link rel="canonical" href="{url}">
<script type="application/ld+json">{json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')}</script>
<style>*{{box-sizing:border-box}}body{{margin:0;background:#f3f6f9;color:#172d40;font:16px/1.6 Arial,sans-serif}}header{{background:#102e47;padding:20px;color:white}}header a{{color:white;text-decoration:none;font-size:21px;font-weight:800}}main{{max-width:1080px;margin:30px auto;padding:28px;background:white;border-radius:14px}}a{{color:#08649b}}.layout{{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:24px}}img{{width:100%;height:430px;object-fit:contain}}h1{{font-size:29px;line-height:1.25}}.price{{font-size:32px;font-weight:800;margin:16px 0}}.stock{{color:#23673e;font-weight:bold}}dl{{display:grid;grid-template-columns:110px 1fr;gap:8px}}dt{{font-weight:bold}}dd{{margin:0}}button{{background:#d87512;color:white;border:0;border-radius:6px;padding:14px 25px;font:700 17px Arial;cursor:pointer}}input{{width:70px;padding:10px;font-size:17px;margin:0 12px}}footer{{border-top:1px solid #dbe2e8;margin-top:30px;padding-top:18px}}.policies a{{display:inline-block;margin-right:18px}}small{{color:#506374}}@media(max-width:700px){{main{{margin:12px;padding:20px}}.layout{{grid-template-columns:1fr;gap:10px}}img{{height:280px}}h1{{font-size:25px}}}}</style></head>
<body><header><a href="/">NATIONAL LOCKS SUPPLY</a></header><main><a href="/catalog.html">← Browse locks and hardware</a><div class="layout"><div><img src="/{asset}" alt="{e(name,quote=True)}"></div><section><small>{e(sku)}</small><h1>{e(name)}</h1><p class="price">${price:,.2f}</p><p class="stock">In stock — available to order</p><p>{e(desc)}</p><dl>{details}</dl>
<form action="/" method="get"><input type="hidden" name="product" value="{e(sku,quote=True)}"><input type="hidden" name="add" value="1"><label>Quantity <input type="number" name="quantity" value="1" min="1" max="25" required></label><button type="submit">Add to cart</button></form>
<p>Standard-size orders to the contiguous United States: $9 shipping below $100; free shipping at $100 or more, before tax. Special shipments require a quote.</p><p>Check door dimensions, handing and compatibility before ordering. Questions? <a href="tel:+14435781686">443-578-1686</a>.</p></section></div><footer><nav class="policies"><a href="/#nls-shipping-policy">Shipping policy</a><a href="/returns.html">Returns and refunds</a><a href="/#nls-privacy-policy">Privacy policy</a><a href="/#nls-contact-information">Contact NLS</a></nav><p>Need installation, repair or rekeying? <a href="/">View mobile locksmith services</a>.</p></footer></main></body></html>'''
    (ROOT/page).write_text(text)
    item=ET.SubElement(channel,'item')
    fields={'g:id':sku,'title':name,'description':desc,'link':url,'g:image_link':image,'g:price':f'{price:.2f} USD','g:condition':'new','g:availability':'in_stock'}
    if brand: fields.update({'g:brand':brand,'g:mpn':sku})
    for tag,val in fields.items(): ET.SubElement(item,tag.replace('g:',f'{{{G}}}')).text=val
    links.append((name,page,asset,price))
ET.indent(rss); ET.ElementTree(rss).write(ROOT/'google-products.xml',encoding='utf-8',xml_declaration=True)
rows=''.join(f'<article><a href="/{page}"><img loading="lazy" src="/{asset}" alt="{html.escape(name,quote=True)}"><h2>{html.escape(name)}</h2></a><p>${price:,.2f} · In stock</p><a href="/{page}">View details and order</a></article>' for name,page,asset,price in links)
(ROOT/'catalog.html').write_text('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shop Door Locks and Hardware | National Locks Supply</title><link rel="canonical" href="https://nationallockssupply.com/catalog.html"><style>body{margin:0;background:#f3f6f9;color:#172d40;font:16px/1.5 Arial}header{background:#102e47;padding:22px}header a{color:white;font-weight:bold;text-decoration:none}main{max-width:1200px;margin:auto;padding:24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px}article{background:white;padding:20px;border-radius:10px}img{width:100%;height:210px;object-fit:contain}h2{font-size:18px}a{color:#08649b}</style></head><body><header><a href="/">NATIONAL LOCKS SUPPLY · HOME AND CART</a></header><main><h1>Shop door locks and hardware</h1><p>65 products available to order. Standard shipping: $9 below $100; free at $100 or more for qualifying orders.</p><div class="grid">'''+rows+'''</div></main></body></html>''')
# Retain useful existing non-product sitemap entries; replace stale product paths.
NS='http://www.sitemaps.org/schemas/sitemap/0.9'
old=ET.parse(ROOT/'sitemap.xml')
keep=[]
for loc in old.findall(f'.//{{{NS}}}loc'):
    rel=(loc.text or '').replace(BASE+'/','')
    if rel and (ROOT/rel).is_file() and rel not in {x[1] for x in links} and not rel.startswith('products/') and not re.match(r'(nls-|[0-9]|alx|nd\d|f40|d271|r282)',rel): keep.append(loc.text)
ET.register_namespace('',NS)
sm=ET.Element(f'{{{NS}}}urlset')
for url in dict.fromkeys([BASE+'/',BASE+'/catalog.html',BASE+'/returns.html']+keep+[BASE+'/'+x[1] for x in links]):
    u=ET.SubElement(sm,f'{{{NS}}}url');ET.SubElement(u,f'{{{NS}}}loc').text=url
ET.indent(sm);ET.ElementTree(sm).write(ROOT/'sitemap.xml',encoding='utf-8',xml_declaration=True)
(ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: https://nationallockssupply.com/sitemap.xml\n')
print(f'Built {len(products)} matching product pages, images and feed entries.')
