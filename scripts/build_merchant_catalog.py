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
categories=json.loads((ROOT/'seo-categories.json').read_text())
def theme(page):
    page=page.replace('<head>', '<head><script src="/nls-ads-pixel.js"></script>', 1)
    listing='"@type": "CollectionPage"' in page
    page=page.replace('</head>','<link rel="stylesheet" href="/nls-store.css?v=2"></head>')
    page=page.replace('<body>', '<body class="nls-listing">' if listing else '<body class="nls-detail">')
    header='<div class="nls-shipping-bar">FREE SHIPPING ON QUALIFYING ORDERS $100+</div><header class="nls-header"><a class="nls-brand" href="/"><img src="/favicon.png" width="72" height="72" alt="NLS"><span>NATIONAL LOCKS SUPPLY<small>LOCKS &amp; DOOR HARDWARE</small></span></a><a class="nls-cart" href="/#cart">VIEW CART</a></header><nav class="nls-main-nav" aria-label="Store navigation"><a href="/">HOME</a><a href="/catalog.html">SHOP ALL</a><a href="/door-knobs.html">DOOR KNOBS</a><a href="/smart-keypad-door-locks.html">SMART LOCKS</a><a href="/commercial-door-hardware.html">COMMERCIAL</a></nav>'
    page=re.sub(r'<header>.*?</header>',lambda _:header,page,count=1,flags=re.S)
    if listing:
        page=re.sub(r'<main><p><a href="/catalog.html">Browse all locks and hardware</a></p>', '<main>',page,count=1)
        page=re.sub(r'<h1>(.*?)</h1><p class="intro">(.*?)</p>',r'<section class="nls-collection-hero"><span class="nls-eyebrow">FIND YOUR NEXT DOOR UPGRADE</span><h1>\1</h1><p>Shop locks and hardware. Get help choosing the right fit.</p></section><details class="nls-collection-info"><summary>About this collection</summary><p class="intro">\2</p></details>',page,count=1,flags=re.S)
    return page

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
    desc=p.get('description') or name+'.'
    if p.get('imageNote') and p['imageNote'] not in desc: desc+=' '+p['imageNote']
    offer={'@type':'Offer','url':url,'priceCurrency':'USD','price':f'{price:.2f}','availability':'https://schema.org/InStock','itemCondition':'https://schema.org/NewCondition','seller':{'@type':'Organization','name':'National Locks Supply'}}
    schema={'@context':'https://schema.org','@type':'Product','name':name,'sku':sku,'image':[image],'description':desc,'offers':offer}
    brand=p['type'].split(' • ',1)[1] if p.get('source')=='SELOCK' and ' • ' in p.get('type','') else None
    if not brand and sku in ('NLS-SMART-001','NLS-SMART-009'):
        brand='GHome' if sku=='NLS-SMART-001' else 'Homki'
    if brand: schema['brand']={'@type':'Brand','name':brand}
    if p.get('source')=='SELOCK': schema['mpn']=sku
    e=html.escape
    category=next(c for c in categories if p['category'] in c['cats'])
    details=f'<dt>Item number</dt><dd>{e(sku)}</dd><dt>Type</dt><dd>{e(p["type"])}</dd>'
    if brand: details+=f'<dt>Brand</dt><dd>{e(brand)}</dd>'
    text=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(name)} | National Locks Supply</title><meta name="description" content="{e(desc,quote=True)}"><link rel="canonical" href="{url}"><link rel="icon" type="image/png" sizes="192x192" href="/favicon.png"><link rel="shortcut icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">{json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')}</script>
<style>*{{box-sizing:border-box}}body{{margin:0;background:#f3f6f9;color:#172d40;font:16px/1.6 Arial,sans-serif}}header{{background:#102e47;padding:20px;color:white}}header a{{color:white;text-decoration:none;font-size:21px;font-weight:800}}main{{max-width:1080px;margin:30px auto;padding:28px;background:white;border-radius:14px}}a{{color:#08649b}}.layout{{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:24px}}img{{width:100%;height:430px;object-fit:contain}}h1{{font-size:29px;line-height:1.25}}.price{{font-size:32px;font-weight:800;margin:16px 0}}.stock{{color:#23673e;font-weight:bold}}dl{{display:grid;grid-template-columns:110px 1fr;gap:8px}}dt{{font-weight:bold}}dd{{margin:0}}button{{background:#d87512;color:white;border:0;border-radius:6px;padding:14px 25px;font:700 17px Arial;cursor:pointer}}input{{width:70px;padding:10px;font-size:17px;margin:0 12px}}footer{{border-top:1px solid #dbe2e8;margin-top:30px;padding-top:18px}}.policies a{{display:inline-block;margin-right:18px}}small{{color:#506374}}@media(max-width:700px){{main{{margin:12px;padding:20px}}.layout{{grid-template-columns:1fr;gap:10px}}img{{height:280px}}h1{{font-size:25px}}}}</style></head>
<body><header><a href="/">NATIONAL LOCKS SUPPLY</a></header><main><a href="/catalog.html">← Browse locks and hardware</a><nav aria-label="Product category"><a href="/{category['file']}">{e(category['title'])}</a></nav><div class="layout"><div><img src="/{asset}" alt="{e(name,quote=True)}"></div><section><small>{e(sku)}</small><h1>{e(name)}</h1><p class="price">${price:,.2f}</p><p class="stock">In stock — available to order</p><p>{e(desc)}</p><dl>{details}</dl>
<form action="/" method="get"><input type="hidden" name="product" value="{e(sku,quote=True)}"><input type="hidden" name="add" value="1"><label>Quantity <input type="number" name="quantity" value="1" min="1" max="25" required></label><button type="submit">Add to cart</button></form>
<p>Standard-size orders to the contiguous United States: $9 shipping below $100; free shipping at $100 or more, before tax. Special shipments require a quote.</p><p>Check door dimensions, handing and compatibility before ordering. Questions? <a href="tel:+14435781686">443-578-1686</a>.</p></section></div><footer><nav class="policies"><a href="/#nls-shipping-policy">Shipping policy</a><a href="/returns.html">Returns and refunds</a><a href="/#nls-privacy-policy">Privacy policy</a><a href="/#nls-contact-information">Contact NLS</a></nav><p>Need installation, repair or rekeying? <a href="/">View mobile locksmith services</a>.</p></footer></main></body></html>'''
    (ROOT/page).write_text(theme(text))
    item=ET.SubElement(channel,'item')
    fields={'g:id':sku,'title':name,'description':desc,'link':url,'g:image_link':image,'g:price':f'{price:.2f} USD','g:condition':'new','g:availability':'in_stock'}
    if brand: fields['g:brand']=brand
    if p.get('source')=='SELOCK': fields['g:mpn']=sku
    for tag,val in fields.items(): ET.SubElement(item,tag.replace('g:',f'{{{G}}}')).text=val
    links.append((name,page,asset,price))
ET.indent(rss); ET.ElementTree(rss).write(ROOT/'google-products.xml',encoding='utf-8',xml_declaration=True)
def cards(selected):
    output=[]
    for p in selected:
        slug=re.sub(r'[^a-z0-9]+','-',p['sku'].lower()).strip('-')
        asset=next(x[2] for x in links if x[1]==slug+'.html')
        output.append(f'<article><a href="/{slug}.html"><img loading="lazy" src="/{asset}" alt="{html.escape(p["name"],quote=True)}"><h2>{html.escape(p["name"])}</h2></a><p>${float(p["price"]):,.2f} · In stock</p><a href="/{slug}.html">View product details</a></article>')
    return ''.join(output)
category_labels={'knobs':'Door Knobs','deadbolts':'Deadbolts','levers':'Door Levers','decorative':'Handlesets','smart':'Smart Locks','cylinders':'Cylinders & Cores','keys':'Keys','commercial':'Commercial'}
nav='<nav class="categories" aria-label="Shop by category">'+''.join(f'<a href="/{c["file"]}">{html.escape(category_labels[c["id"]])}</a>' for c in categories)+'</nav>'
style='body{margin:0;background:#f3f6f9;color:#172d40;font:16px/1.6 Arial}header{background:#102e47;padding:22px}header a{color:white;font-weight:bold;text-decoration:none}main{max-width:1200px;margin:auto;padding:24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:22px}article{background:white;padding:20px;border-radius:10px}img{width:100%;height:210px;object-fit:contain}h1{line-height:1.2}h2{font-size:19px}a{color:#08649b}.categories{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0}.categories a{background:white;border:1px solid #d5dce6;padding:10px 14px;border-radius:6px}.intro{max-width:900px}.guide{background:white;padding:20px;margin:24px 0}footer{padding:24px 0}footer a{margin-right:20px}'
def listing_page(file,title,description,intro,guide,selected):
    itemlist={'@context':'https://schema.org','@type':'CollectionPage','name':title,'url':BASE+'/'+file,'description':description,'mainEntity':{'@type':'ItemList','itemListElement':[{'@type':'ListItem','position':i+1,'url':BASE+'/'+re.sub(r'[^a-z0-9]+','-',p['sku'].lower()).strip('-')+'.html','name':p['name']} for i,p in enumerate(selected)]}}
    e=html.escape
    return theme(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(title)} | National Locks Supply</title><meta name="description" content="{e(description,quote=True)}"><link rel="canonical" href="{BASE}/{file}"><link rel="icon" type="image/png" sizes="192x192" href="/favicon.png"><link rel="shortcut icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><script type="application/ld+json">{json.dumps(itemlist,ensure_ascii=False).replace('<',chr(92)+'u003c')}</script><style>{style}</style></head><body><header><a href="/">NATIONAL LOCKS SUPPLY · HOME AND CART</a></header><main><p><a href="/catalog.html">Browse all locks and hardware</a></p><h1>{e(title)}</h1><p class="intro">{e(intro)}</p>{nav}<p>{len(selected)} products · Standard shipping: $9 below $100; free at $100 or more for qualifying orders.</p><div class="grid">{cards(selected)}</div><section class="guide"><h2>Choosing the right door hardware</h2><p>{e(guide)}</p><p>Need help matching a part? Call <a href="tel:+14435781686">443-578-1686</a>. Ask about locksmith installation, repair or rekeying availability for your location.</p></section><footer><a href="/#nls-shipping-policy">Shipping</a><a href="/returns.html">Returns</a><a href="/#nls-contact-information">Contact NLS</a></footer></main></body></html>''')
for c in categories:
    selected=[p for p in products if p['category'] in c['cats'] or p['sku'] in c.get('skus',[])]
    (ROOT/c['file']).write_text(listing_page(c['file'],c['title'],c['description'],c['intro'],c['guide'],selected))
(ROOT/'catalog.html').write_text(listing_page('catalog.html','Shop Locks & Door Hardware','Shop door knobs, deadbolts, levers, smart keypad locks, entry handlesets and commercial lock cylinders. Compare 65 products at National Locks Supply.','Shop residential and commercial door hardware online at National Locks Supply. Browse keyed entry knobs, privacy and passage levers, deadbolt locks, decorative handlesets and smart keypad locks. Find listed commercial replacement parts from BEST, Schlage, Falcon, Kaba Ilco and Adams Rite.','Start with the lock function and door measurements, then compare the model and finish. For commercial replacement components, match the full part number, core format and keyway to the hardware being serviced.',products))
# Retain useful existing non-product sitemap entries; replace stale product paths.
NS='http://www.sitemaps.org/schemas/sitemap/0.9'
old=ET.parse(ROOT/'sitemap.xml')
keep=[]
for loc in old.findall(f'.//{{{NS}}}loc'):
    rel=(loc.text or '').replace(BASE+'/','')
    if rel and (ROOT/rel).is_file() and rel not in {x[1] for x in links} and not rel.startswith('products/') and not re.match(r'(nls-|[0-9]|alx|nd\d|f40|d271|r282)',rel): keep.append(loc.text)
ET.register_namespace('',NS)
sm=ET.Element(f'{{{NS}}}urlset')
for url in dict.fromkeys([BASE+'/',BASE+'/catalog.html',BASE+'/returns.html']+keep+[BASE+'/'+c['file'] for c in categories]+[BASE+'/'+x[1] for x in links]):
    u=ET.SubElement(sm,f'{{{NS}}}url');ET.SubElement(u,f'{{{NS}}}loc').text=url
ET.indent(sm);ET.ElementTree(sm).write(ROOT/'sitemap.xml',encoding='utf-8',xml_declaration=True)
(ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: https://nationallockssupply.com/sitemap.xml\n')
print(f'Built {len(products)} matching product pages, images and feed entries.')

# Consolidate legacy /products/ pages with the current catalog URLs.
legacy = ROOT/'products'
if legacy.is_dir():
    for old in legacy.glob('*.html'):
        current = ROOT/old.name
        if current.is_file() and old.name in {x[1] for x in links}:
            destination = BASE+'/'+old.name
            page = current.read_text().replace('</head>', '<meta http-equiv="refresh" content="0;url='+destination+'"></head>')
        else:
            page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Product no longer listed | National Locks Supply</title><link rel="stylesheet" href="/nls-store.css?v=2"></head><body class="nls-detail"><header class="nls-header"><a class="nls-brand" href="/">NATIONAL LOCKS SUPPLY</a></header><main><h1>This product is no longer in our current catalog</h1><p>Browse our current locks and door hardware, or call us for help finding a replacement.</p><p><a href="/catalog.html">Shop current locks and door hardware</a></p><p><a href="/smart-keypad-door-locks.html">Shop smart keypad locks</a></p><p><a href="tel:+14435781686">443-578-1686</a></p></main></body></html>'
        old.write_text(page)
