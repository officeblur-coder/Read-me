#!/usr/bin/env python3
"""Varianta 2 a site-ului Emerald (stil sobru, doar fotografii reale).

Refolosește datele, schema.org și fișierele SEO din emerald/_build/build.py
și schimbă doar alegerea pozelor, textele de prezentare și machetele.

Run:  python3 emerald-v2/_build/build.py
"""
import importlib.util
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
_spec = importlib.util.spec_from_file_location("base", os.path.join(HERE, "..", "..", "emerald", "_build", "build.py"))
base = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(base)

e, ic, dims = base.e, base.ic, base.dims
SITE, BRAND, CITY, REGION, STREET = base.SITE, base.BRAND, base.CITY, base.REGION, base.STREET
PHONE_H, PHONE_E, WA, EMAIL, IG, FB, MAPS = base.PHONE_H, base.PHONE_E, base.WA, base.EMAIL, base.IG, base.FB, base.MAPS
UPDATED = base.UPDATED

# ---------------------------------------------------------------- real photos only
PHOTOS = {
    "sapphire": dict(img="sapphire-6", hero="sapphire-7",
                     gallery=["sapphire-6", "sapphire-7", "dance-3", "dance-4", "g01", "g21", "g09", "dance-5", "g22"]),
    "gold": dict(img="gold-3", hero="gold-5", gallery=["gold-2", "gold-3", "gold-4", "gold-5", "gold-6", "gold-7", "g19", "table"]),
    "diamond": dict(img="diamond-2", hero="diamond-5", gallery=["diamond-2", "diamond-3", "diamond-4", "diamond-5", "diamond-6", "diamond-7", "g18"]),
    "gourmet": dict(img="gourmet", hero="gourmet", gallery=["gourmet", "food-1", "food-2", "cake-2"]),
    "terasa": dict(img="terasa-3", hero="terasa-2", gallery=["terasa-2", "terasa-3", "terasa-4", "terasa-5", "terasa-6", "terasa-7", "terasa-8"]),
    "gradina": dict(img="gradina-3", hero="gradina-2", gallery=["gradina-3", "gradina-4", "gradina-5", "gradina-6", "gradina-7", "gradina-8", "gradina-9", "gradina-10", "g03", "g16"]),
    "hotel": dict(img="hotel-2", hero="hotel-2", gallery=["hotel-2", "hotel-3", "hotel-4", "hotel-5", "hotel-6", "hotel-7", "g15", "g20"]),
}
for s in base.SPACES:
    s.update(PHOTOS[s["id"]])

base.GALLERY = [g for g in base.GALLERY if g[0] not in {"sapphire", "gold", "diamond", "hotel", "sapphire-5"}] + [
    ("sapphire-6", "Sapphire Ballroom pregătit pentru nuntă", "saloane"),
    ("gold-3", "Gold Ballroom", "saloane"),
    ("diamond-2", "Diamond Ballroom", "saloane"),
    ("hotel-2", "Intrarea în Emerald Boutique Hotel, seara", "hotel exterior"),
    ("dance-2", "Dansul mirilor în fum greu", "nunti"),
    ("g04", "Invitați la un eveniment privat", "evenimente"),
]

_org = base.org_node


def org_node():
    n = _org()
    n["image"] = [f"{SITE}/img/facade-night.webp", f"{SITE}/img/sapphire-6.webp", f"{SITE}/img/dance-1.webp"]
    return n


base.org_node = org_node

# ---------------------------------------------------------------- plainer copy
FIX = {
    "detalii — locul unde fiecare eveniment devine o experiență de neuitat.": "detalii. Aici încap cele mai mari nunți și gale din complex.",
    "în funcție de tematică și dorințe. Fie că îți dorești un cadru festiv sau unul discret și rafinat, Salonul Gourmet transformă orice ocazie într-o experiență „wow”.": "în funcție de tematică și dorințe.",
    "Salonul are iluminare ambientală care poate fi adaptată tematicii evenimentului — discutați": "Salonul are iluminare ambientală care poate fi adaptată tematicii evenimentului. Discutați",
    "La câțiva pași de saloane — fără transport": "La câțiva pași de saloane, fără transport",
    "chiar în complexul Emerald — fără griji legate de transport.": "chiar în complexul Emerald, deci fără drumuri cu mașina după petrecere.",
    "Salonul Gourmet, Diamond Ballroom sau Terasa Emerald — spații calde pentru petreceri de familie.": "Salonul Gourmet (120 de locuri), Diamond Ballroom (200) sau, vara, Terasa Emerald.",
    "după o discuție sau o vizionare — sunați": "după o discuție sau o vizionare. Sunați",
    "evenimente corporate — conferințe, lansări, team building-uri și petreceri de companie.": "evenimente corporate: conferințe, lansări, team building-uri și petreceri de companie.",
}


def fix(v):
    if isinstance(v, str):
        for a, b in FIX.items():
            v = v.replace(a, b)
        return v
    if isinstance(v, list):
        return [fix(x) for x in v]
    if isinstance(v, tuple):
        return tuple(fix(x) for x in v)
    return v


for s in base.SPACES:
    for k in ("short", "body", "ideal", "features", "faq", "tag"):
        s[k] = fix(s[k])
base.FAQ_GENERAL[:] = fix(base.FAQ_GENERAL)
base.TYPES[:] = fix(base.TYPES)
SPACES, HALLS, BY_ID, INCLUSIVE, FAQ = base.SPACES, base.HALLS, base.BY_ID, base.INCLUSIVE, base.FAQ_GENERAL
STEPS = [
    ("Vizionare", "Ne vizitați pe str. Gheorghe Doja 155 și vedeți saloanele, terasa și grădina."),
    ("Ofertă", "Primiți prețul pentru data, salonul și numărul vostru de invitați."),
    ("Degustare", "Gustați meniul înainte de eveniment și schimbăm ce nu vă place."),
    ("Detalii", "Stabilim decorul, programul serii și momentele speciale."),
    ("Ziua evenimentului", "Echipa noastră coordonează totul, de la primire până la final."),
]


# ---------------------------------------------------------------- helpers
def img(p, name, alt, cls="", eager=False, sizes="(max-width: 860px) 100vw, 50vw"):
    w, h = dims(name)
    c = f' class="{cls}"' if cls else ""
    load = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<img src="{p}img/{name}-sm.webp" srcset="{p}img/{name}-sm.webp 800w, {p}img/{name}.webp {w}w" '
            f'sizes="{sizes}" width="{w}" height="{h}" alt="{e(alt)}"{c} {load} decoding="async">')


def photo_btn(p, name, alt, group, cat=None, wide=False):
    extra = f' data-cat="{cat}"' if cat else ""
    cls = ' class="wide"' if wide else ""
    return (f'<button type="button"{cls} data-full="{p}img/{name}.webp" data-group="{group}" data-alt="{e(alt)}"{extra} '
            f'aria-label="Mărește: {e(alt)}">{img(p, name, alt, sizes="(max-width: 860px) 50vw, 25vw")}</button>')


def checks(items):
    return '<ul class="checks">' + "".join(f"<li>{x}</li>" for x in items) + "</ul>"


def crumbs(p, here):
    return (f'<nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="{p or "./"}">Acasă</a></li>'
            f'<li aria-current="page">{here}</li></ol></nav>')


NAV = [("Nunți", "nunti-targu-mures/"), ("Botezuri", "botez-targu-mures/"), ("Corporate", "evenimente-corporate/"),
       ("All inclusive", "servicii-all-inclusive/"), ("Galerie", "galeria-foto-video/"), ("Despre noi", "despre-noi/"),
       ("Contact", "contact/")]


def header(p, active):
    sub = "".join(f'<a href="{p}{s["slug"]}/">{s["name"]}<small>{(str(s["cap"]) + " locuri") if s["cap"] else ""}</small></a>' for s in SPACES)
    items = "".join(f'<li{" class=\"active\"" if active == u else ""}><a href="{p}{u}">{n}</a></li>' for n, u in NAV)
    m_sp = "".join(f'<li><a href="{p}{s["slug"]}/">{s["name"]}<small>{(str(s["cap"]) + " locuri") if s["cap"] else ""}</small></a></li>' for s in SPACES)
    m_ev = "".join(f'<li><a href="{p}{u}">{n}</a></li>' for n, u in NAV)
    return f'''<a class="skip" href="#main">Sari la conținut</a>
<div class="topbar"><div class="wrap">
  <span><a href="{MAPS}" target="_blank" rel="noopener">{STREET}, {CITY}</a><a class="hide-md" href="mailto:{EMAIL}">{EMAIL}</a></span>
  <span><a href="tel:{PHONE_E}">Telefon și WhatsApp: {PHONE_H}</a><a class="hide-md" href="{IG}" target="_blank" rel="noopener">Instagram</a><a class="hide-md" href="{FB}" target="_blank" rel="noopener">Facebook</a></span>
</div></div>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="{p or './'}" aria-label="{BRAND}, pagina principală"><img class="logo-dark" src="{p}img/logo-dark.webp" alt="{BRAND}" width="700" height="292"><img class="logo-light" src="{p}img/logo.webp" alt="" width="700" height="292"></a>
    <nav class="nav" aria-label="Meniu principal"><ul>
      <li class="has-sub{' active' if active == 'spatii' else ''}"><button type="button" aria-expanded="false">Saloane{ic("chev")}</button><div class="sub">{sub}</div></li>
      {items}
    </ul></nav>
    <div class="header-cta">
      <a class="btn btn-green" href="{p}contact/">Programează o vizionare</a>
      <button class="burger" type="button" aria-label="Meniu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">
  <p class="label">Saloane și spații</p><ul>{m_sp}</ul>
  <p class="label">Evenimente și informații</p><ul>{m_ev}<li><a href="{p}intrebari-frecvente/">Întrebări frecvente</a></li></ul>
  <p class="muted">{STREET}, {CITY}<br>Telefon: {PHONE_H}</p>
</div>'''


def footer(p):
    sp = "".join(f'<li><a href="{p}{s["slug"]}/">{s["name"]}</a></li>' for s in SPACES)
    return f'''<footer class="site-footer"><div class="wrap">
  <div class="foot-grid">
    <div>
      <a class="brand" href="{p or './'}"><img src="{p}img/logo.webp" alt="{BRAND}" width="700" height="292" loading="lazy"></a>
      <p>Complex de evenimente în Târgu Mureș: patru saloane, terasă, grădină și hotel, în aceeași curte.</p>
      <div class="socials"><a href="{IG}" target="_blank" rel="noopener">{ic("ig")}Instagram</a><a href="{FB}" target="_blank" rel="noopener">{ic("fb")}Facebook</a></div>
    </div>
    <div><h3>Saloane și spații</h3><ul>{sp}</ul></div>
    <div><h3>Evenimente</h3><ul>
      <li><a href="{p}nunti-targu-mures/">Nunți</a></li><li><a href="{p}botez-targu-mures/">Botezuri și majorate</a></li>
      <li><a href="{p}evenimente-corporate/">Evenimente corporate</a></li><li><a href="{p}servicii-all-inclusive/">Pachet all inclusive</a></li>
      <li><a href="{p}galeria-foto-video/">Galerie foto</a></li><li><a href="{p}intrebari-frecvente/">Întrebări frecvente</a></li><li><a href="{p}despre-noi/">Despre noi</a></li></ul></div>
    <div><h3>Contact</h3><address>
      <a href="{MAPS}" target="_blank" rel="noopener">{STREET}<br>{CITY}, jud. {REGION}</a>
      <a href="tel:{PHONE_E}">{PHONE_H}</a><a href="mailto:{EMAIL}">{EMAIL}</a></address></div>
  </div>
  <div class="foot-bottom"><span>© <span data-year>2026</span> {BRAND}</span><span>Evenimente care rămân.</span></div>
</div></footer>
<nav class="mobile-bar" aria-label="Contact rapid">
  <a href="tel:{PHONE_E}">{ic("phone")}Sună</a>
  <a href="{WA}" target="_blank" rel="noopener">{ic("wa")}WhatsApp</a>
  <a class="go" href="{p}contact/">Vizionare</a>
</nav>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Fotografie mărită" aria-hidden="true">
  <img alt="">
  <button class="lb-btn lb-close" type="button" aria-label="Închide">{ic("close")}</button>
  <button class="lb-btn lb-prev" type="button" aria-label="Fotografia anterioară">{ic("left")}</button>
  <button class="lb-btn lb-next" type="button" aria-label="Fotografia următoare">{ic("right")}</button>
  <div class="lb-count"></div>
</div>'''


def page(slug, title, desc, body, graph, active="", og="facade-night", hero=True):
    p = "../" * slug.count("/")
    url = f"{SITE}/{slug}"
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))
    ow, oh = dims(og)
    return f'''<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="theme-color" content="#163f30">
<meta name="geo.region" content="RO-MS"><meta name="geo.placename" content="{CITY}">
<meta property="og:type" content="website"><meta property="og:locale" content="ro_RO"><meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/img/{og}.webp"><meta property="og:image:width" content="{ow}"><meta property="og:image:height" content="{oh}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="{p}img/icon-32.png">
<link rel="apple-touch-icon" href="{p}img/icon-180.png">
<link rel="manifest" href="{p}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Libre+Caslon+Display&display=swap">
<link rel="stylesheet" href="{p}assets/css/style.css">
<script type="application/ld+json">{ld}</script>
</head>
<body class="{'has-hero' if hero else ''}">
{header(p, active)}
<main id="main">
{body(p)}
</main>
{footer(p)}
<script src="{p}assets/js/main.js" defer></script>
</body>
</html>
'''


# ---------------------------------------------------------------- shared blocks
def page_head(p, here, h1, intro, photo, alt, cap=None):
    capline = f'<div class="cap-line"><strong>{cap}</strong><span>de locuri</span></div>' if cap else ""
    return f'''<section class="page-hero">
  {img(p, photo, alt, eager=True, sizes="100vw")}
  <div class="wrap">
    {crumbs(p, here)}
    <div class="head-grid"><h1>{h1}</h1><div><p class="intro">{intro}</p>{capline}</div></div>
  </div>
</section>'''


def faq_block(items, title="Întrebări frecvente", cls="", link=None):
    qs = "".join(f'<details><summary>{e(q)}</summary><div class="answer"><p>{e(a)}</p></div></details>' for q, a in items)
    more = f'<p><a class="more" href="{link}">Toate întrebările</a></p>' if link else ""
    return f'''<section class="section {cls}" id="intrebari"><div class="wrap faq-grid">
  <div><h2>{title}</h2><p class="muted">Dacă nu găsiți răspunsul aici, sunați la {PHONE_H}.</p>{more}</div>
  <div class="faq">{qs}</div>
</div></section>'''


def contact_block(p, title="Programează o vizionare"):
    opts = "".join(f"<option>{x}</option>" for x in ["Nuntă", "Botez", "Majorat", "Aniversare", "Eveniment corporate", "Altul"])
    return f'''<section class="section green" id="vizionare"><div class="wrap contact">
  <div>
    <h2>{title}</h2>
    <p class="intro">Vizionările se fac cu programare. Vă arătăm saloanele, terasa, grădina și camerele de hotel, apoi vă dăm o ofertă pentru data voastră.</p>
    <dl class="contact-list">
      <div><dt>Telefon</dt><dd><a href="tel:{PHONE_E}">{PHONE_H}</a></dd></div>
      <div><dt>WhatsApp</dt><dd><a href="{WA}" target="_blank" rel="noopener">{PHONE_H}</a></dd></div>
      <div><dt>E-mail</dt><dd><a href="mailto:{EMAIL}">{EMAIL}</a></dd></div>
      <div><dt>Adresă</dt><dd>{STREET}, {CITY}</dd></div>
    </dl>
    <a class="map-link" href="{MAPS}" target="_blank" rel="noopener">{img(p, "facade-night", "Fațada Emerald seara", sizes="120px")}<span><strong>Deschide în Google Maps</strong><br><span class="small">Indicații de drum până la {STREET}</span></span></a>
  </div>
  <form class="form enquiry" novalidate>
    <h3>Cerere de vizionare</h3>
    <div class="row">
      <label for="f-nume"><span>Nume</span><input id="f-nume" name="nume" autocomplete="name" required></label>
      <label for="f-tel"><span>Telefon</span><input id="f-tel" name="telefon" type="tel" autocomplete="tel" required></label>
    </div>
    <div class="row">
      <label for="f-ev"><span>Tip de eveniment</span><select id="f-ev" name="eveniment">{opts}</select></label>
      <label for="f-data"><span>Data evenimentului</span><input id="f-data" name="data" type="date"></label>
    </div>
    <label for="f-inv"><span>Câți invitați estimați</span><input id="f-inv" name="invitati" type="number" min="10" max="1000" inputmode="numeric"></label>
    <label for="f-msg"><span>Mesaj (opțional)</span><textarea id="f-msg" name="mesaj"></textarea></label>
    <div class="actions"><button class="btn btn-green" type="submit">{ic("wa")}Trimite pe WhatsApp</button><button class="btn btn-line" type="button" data-mail>{ic("mail")}Trimite pe e-mail</button></div>
    <p class="note">Mesajul se deschide în WhatsApp sau în aplicația de e-mail, unde îl puteți verifica înainte de trimitere.</p>
  </form>
</div></section>'''


def compare(p):
    rows = "".join(
        f'<tr><th scope="row"><a href="{p}{s["slug"]}/">{s["name"]}</a></th><td>{s["kind"]}</td>'
        f'<td class="num">{("până la " + str(s["cap"])) if s["cap"] else "la cerere"}</td>'
        f'<td>{", ".join(x[0].lower() + x[1:] for x in s["ideal"][:3])}</td></tr>' for s in SPACES)
    return f'''<div class="table-wrap"><table class="compare"><caption class="sr-only">Spațiile Emerald Luxury Events, capacitate și utilizare</caption>
<thead><tr><th scope="col">Spațiu</th><th scope="col">Tip</th><th scope="col">Invitați</th><th scope="col">Potrivit pentru</th></tr></thead><tbody>{rows}</tbody></table></div>'''


def menu_card():
    return '<div class="menu-card">' + "".join(
        f'<div class="menu-group"><h3>{h}</h3><ul>{"".join(f"<li>{x}</li>" for x in lis)}</ul></div>' for _, h, lis in INCLUSIVE) + "</div>"


def cols(p, ids):
    out = ""
    for i in ids:
        s = BY_ID[i]
        sub = f'Până la {s["cap"]} de locuri. ' if s["cap"] else ""
        out += (f'<div class="col"><a class="wrapper" href="{p}{s["slug"]}/">{img(p, s["img"], s["name"], sizes="(max-width: 600px) 100vw, 33vw")}'
                f'<h3>{s["name"]}</h3></a><p>{sub}{s["short"]}</p></div>')
    return f'<div class="cols">{out}</div>'


def steps():
    return '<ol class="steps">' + "".join(f"<li><h3>{h}</h3><p>{t}</p></li>" for h, t in STEPS) + "</ol>"


# ---------------------------------------------------------------- pages
def home():
    slug = ""
    title = "Sală de nuntă și evenimente Târgu Mureș | Emerald Luxury Events"
    desc = "Complex de evenimente în Târgu Mureș: 4 saloane (120–550 invitați), terasă, grădină și boutique hotel. Nunți, botezuri, majorate și evenimente corporate all inclusive."

    def body(p):
        halls = ""
        for s in HALLS:
            halls += f'''<article class="hall">
  <a class="hall-photo zoom" href="{p}{s["slug"]}/">{img(p, s["img"], s["name"] + ", salon de evenimente în Târgu Mureș", sizes="(max-width: 860px) 100vw, 60vw")}</a>
  <div><p class="cap-big">{s["cap"]}<small>de locuri</small></p><h3>{s["name"]}</h3><p>{s["body"][0]}</p>
  <p class="ideal">Potrivit pentru: {", ".join(x[0].lower() + x[1:] for x in s["ideal"])}.</p>
  <a class="more" href="{p}{s["slug"]}/">Fotografii și detalii despre {s["name"]}</a></div>
</article>'''
        pdata = {"halls": [{"id": s["id"], "name": s["name"], "cap": s["cap"], "url": f'{p}{s["slug"]}/', "img": f'{p}img/{s["img"]}-sm.webp'}
                           for s in sorted(HALLS, key=lambda x: x["cap"])],
                 "types": {"nunta": "Nuntă", "botez": "Botez", "majorat": "Majorat sau aniversare", "corporate": "Eveniment corporate"},
                 "prefer": {"botez": ["gourmet", "diamond"], "majorat": ["gourmet", "diamond"], "corporate": ["diamond", "gold", "sapphire"]}}
        alts = {g[0]: g[1] for g in base.GALLERY}
        grid_names = ["g03", "dance-1", "sapphire-6", "g16", "terasa-2", "cake-1", "g13", "gradina-8"]
        grid_names = ["g03", "dance-1", "g16", "sapphire-6", "g13", "terasa-2", "cake-1", "g10", "gradina-8", "g21", "hotel-2", "g01"]
        grid = "".join(f'<button type="button" data-full="{p}img/{n}.webp" data-group="home" data-alt="{e(alts.get(n, "Eveniment la Emerald"))}" aria-label="Mărește: {e(alts.get(n, "Eveniment la Emerald"))}">{img(p, n, alts.get(n, "Eveniment la Emerald"), sizes="560px")}</button>' for n in grid_names)
        return f'''
<section class="hero">
  <figure class="hero-bg">
    <video muted loop playsinline autoplay preload="none" poster="{p}media/hero-poster.webp" data-lg="{p}media/hero.mp4" data-sm="{p}media/hero-sm.mp4" aria-label="Filmare din Sapphire Ballroom"></video>
  </figure>
  <div class="wrap">
  <div class="hero-text">
    <p class="label">Târgu Mureș, str. Gheorghe Doja 155</p>
    <h1>Nunți, botezuri și evenimente în Târgu Mureș</h1>
    <p class="intro">Emerald are patru saloane, de la 120 la 550 de locuri, plus terasă, grădină pentru fotografii și hotel, toate în aceeași curte. Pachetul all inclusive acoperă meniul, băuturile, tortul și decorul.</p>
    <div class="actions"><a class="btn btn-green" href="{p}contact/">Programează o vizionare</a><a class="btn btn-light" href="tel:{PHONE_E}">{ic("phone")}{PHONE_H}</a></div>
  </div>
    <dl class="quick">
      <div><dt>Saloane</dt><dd>4, între 120 și 550 de locuri</dd></div>
      <div><dt>În aer liber</dt><dd>Terasă și grădină</dd></div>
      <div><dt>Cazare</dt><dd><a href="{p}emerald-boutique-hotel/">Emerald Boutique Hotel</a></dd></div>
      <div><dt>Vizionări</dt><dd><a href="tel:{PHONE_E}">{PHONE_H}</a></dd></div>
    </dl>
  </div>
</section>

<section class="section deep" id="saloane"><div class="wrap">
  <div class="head"><div><p class="label">Patru saloane</p><h2>Alegeți salonul după numărul de invitați</h2></div></div>
  {halls}
</div></section>

<section class="section"><div class="wrap">
  <div class="head"><div><h2>Terasă, grădină și hotel</h2><p class="muted">Ședința foto, cina în aer liber și cazarea se fac fără să plecați de la locație.</p></div></div>
  {cols(p, ["terasa", "gradina", "hotel"])}
</div></section>

<section class="band zoom">
  {img(p, "dance-2", "Dansul mirilor în fum greu la Emerald", sizes="100vw")}
  <div class="wrap"><blockquote>Unele zile trec. Altele rămân cu voi.</blockquote>
  <p>Fum greu și artificii la dansul mirilor sunt incluse în pachetul de nuntă.</p></div>
</section>

<section class="section green"><div class="wrap included">
  <figure class="included-photo" style="margin:0">{img(p, "food-1", "Masă servită la un eveniment Emerald")}</figure>
  <div>
    <p class="label">Pachet all inclusive</p>
    <h2>Ce intră în preț</h2>
    <p class="intro" style="margin-bottom:30px">Lista de mai jos este inclusă în pachetul pentru nunți. Pentru alte evenimente, oferta se face la cerere.</p>
    {menu_card()}
    <a class="btn btn-light" href="{p}servicii-all-inclusive/">Detalii despre pachet</a>
  </div>
</div></section>

<section class="section" id="planificator"><div class="wrap">
  <div class="planner" id="planner">
    <div class="planner-form">
      <h2>Ce salon vi se potrivește?</h2>
      <p class="muted">Alegeți tipul evenimentului și câți invitați aveți.</p>
      <div class="field"><div class="flabel">Tip de eveniment</div>
        <div class="choices" role="group" aria-label="Tip de eveniment">
          <button class="choice" type="button" data-type="nunta" aria-pressed="true">Nuntă</button>
          <button class="choice" type="button" data-type="botez" aria-pressed="false">Botez</button>
          <button class="choice" type="button" data-type="majorat" aria-pressed="false">Majorat sau aniversare</button>
          <button class="choice" type="button" data-type="corporate" aria-pressed="false">Corporate</button>
        </div></div>
      <div class="field"><label class="flabel" for="guests">Invitați <output for="guests">180</output></label>
        <input id="guests" type="range" min="20" max="550" step="10" value="180"></div>
      <p class="small muted" style="margin:0">Terasa, grădina și hotelul se discută la vizionare.</p>
    </div>
    <div class="planner-result" id="planner-result" aria-live="polite">
      <img src="{p}img/diamond-2-sm.webp" alt="Diamond Ballroom" width="800" height="450">
      <div class="inner">
        <p class="match">Nuntă, 180 de invitați</p>
        <h3>Diamond Ballroom</h3>
        <p class="seats">Până la 200 de locuri.</p>
        <p class="alts"></p>
        <div class="actions"><a class="btn btn-green wa" href="{WA}" target="_blank" rel="noopener">{ic("wa")}Cere ofertă</a><a class="btn btn-line see" href="{p}diamond-ballroom/">Vezi salonul</a></div>
      </div>
    </div>
  </div>
  <script type="application/json" id="planner-data">{json.dumps(pdata, ensure_ascii=False)}</script>
</div></section>

<section class="section stone"><div class="wrap">
  <div class="head"><div><h2>Cum se face rezervarea</h2></div></div>
  {steps()}
</div></section>

<section class="section"><div class="wrap">
  <div class="head"><div><h2>Fotografii de la evenimente</h2><p class="muted">Nunți și petreceri organizate la Emerald.</p></div><a class="more" href="{p}galeria-foto-video/">Toată galeria</a></div>
</div>
  <div class="rail-wrap"><div class="rail" id="rail">{grid}</div>
  <div class="wrap rail-nav"><button type="button" data-rail="-1" aria-label="Fotografiile anterioare">{ic("left")}</button><button type="button" data-rail="1" aria-label="Fotografiile următoare">{ic("right")}</button></div></div>
  <div>
</div></section>

<section class="section stone"><div class="wrap">
  <div class="head"><div><h2>Toate spațiile, pe scurt</h2></div></div>
  {compare(p)}
</div></section>

{faq_block(FAQ[:7], link=p + "intrebari-frecvente/")}
{contact_block(p)}
'''

    graph = base.base_graph(slug, title, desc, extra=[base.faq_node(FAQ[:7], f"{SITE}/")] + [base.space_node(s) for s in SPACES])
    return slug, page(slug, title, desc, body, graph, og="sapphire-6")


def space_page(s):
    slug = s["slug"] + "/"
    others = [x["id"] for x in HALLS if x["id"] != s["id"]][:3] if s["cap"] else [x for x in ("terasa", "gradina", "hotel", "sapphire") if x != s["id"]][:3]
    facts = [("Tip", s["kind"]), ("Capacitate", f'până la {s["cap"]} de invitați' if s["cap"] else "la cerere"),
             ("Adresă", f"{STREET}, {CITY}"), ("Pachet", '<a class="more" href="../servicii-all-inclusive/">All inclusive</a>'),
             ("Actualizat", UPDATED)]

    def body(p):
        dl = "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in facts)
        gal = "".join(photo_btn(p, n, f'{s["name"]}, fotografia {i}', s["id"]) for i, n in enumerate(s["gallery"], 1))
        return f'''
{page_head(p, s["name"], s["name"], s["short"], s["hero"], s["name"] + " la Emerald Luxury Events", cap=s["cap"])}
<section class="section"><div class="wrap text-facts">
  <div class="text">
    {"".join(f"<p>{x}</p>" for x in s["body"])}
    <h3>Potrivit pentru</h3>{checks(s["ideal"])}
    <h3>Ce găsiți în {s["name"]}</h3>{checks(s["features"])}
  </div>
  <dl class="facts">{dl}</dl>
</div></section>
<section class="section stone tight"><div class="wrap">
  <div class="head"><div><h2>Fotografii</h2></div></div>
  <div class="photo-grid">{gal}</div>
</div></section>
{faq_block(s["faq"] + FAQ[9:10], title=f'Întrebări despre {s["name"]}', link=p + "intrebari-frecvente/")}
<section class="section stone"><div class="wrap"><div class="head"><div><h2>Alte spații Emerald</h2></div></div>{cols(p, others)}</div></section>
{contact_block(p, f'Vino să vezi {s["name"]}')}
'''

    graph = base.base_graph(slug, s["title"], s["meta"], trail=[(s["name"], slug)],
                            extra=[base.space_node(s), base.faq_node(s["faq"], f"{SITE}/{slug}")])
    return slug, page(slug, s["title"], s["meta"], body, graph, active="spatii", og=s["hero"])


def simple_page(slug, here, title, desc, h1, intro, photo, content, graph_extra=(), active=None, og=None):
    def body(p):
        return page_head(p, here, h1, intro, photo, h1) + content(p)
    graph = base.base_graph(slug, title, desc, trail=[(here, slug)], extra=list(graph_extra))
    return slug, page(slug, title, desc, body, graph, active=active or slug, og=og or photo)


def services():
    slug = "servicii-all-inclusive/"
    faqs = [FAQ[i] for i in (2, 3, 6, 5, 4)]

    def c(p):
        return f'''
<section class="section"><div class="wrap text-facts">
  <div class="text">
    <p class="intro">Pachetul all inclusive pentru nunți cuprinde locația, meniul cu degustare, băuturile nelimitate, torturile, efectele speciale, decorul, accesoriile, personalul și camera mirilor.</p>
    <p>Fiecare nuntă e diferită, așa că detaliile se stabilesc împreună. Echipa noastră se ocupă de logistică, de programul serii și de servire, ca voi să stați cu invitații.</p>
    {checks(["Salon, terasă și grădină pentru fotografii", "Meniu ales împreună cu voi, cu degustare înainte", "Decor și aranjamente florale", "Coordonarea evenimentului în ziua respectivă", "Cazare pentru miri, nași și invitați la Emerald Hotel"])}
  </div>
  <dl class="facts">
    <div><dt>Băuturi</dt><dd>Alcoolice și nealcoolice, nelimitat</dd></div>
    <div><dt>Bar</dt><dd>Cocktail bar și barmani</dd></div>
    <div><dt>Torturi</dt><dd>Tortul miresei și tortul mirelui (shoturi)</dd></div>
    <div><dt>Efecte</dt><dd>Fum greu și artificii la dans, artificii la tort</dd></div>
    <div><dt>Cazare</dt><dd>Cameră de hotel pentru miri</dd></div>
  </dl>
</div></section>
<section class="section green"><div class="wrap">
  <div class="head"><div><p class="label">Lista completă</p><h2>Ce include pachetul</h2></div></div>
  {menu_card()}
</div></section>
<section class="section"><div class="wrap split">
  {img(p, "dance-1", "Dansul mirilor cu fum greu și artificii")}
  <div><h2>Dansul mirilor și tortul</h2>
    <p>La dansul mirilor folosim fum greu și artificii reci. Tortul miresei vine în felii sau monoporții, cu artificii, iar tortul mirelui este un tort de shoturi.</p>
    <p>Pe lângă acestea sunt incluse candy bar, fruit bar, cafea Illy și șampanie la sosirea invitaților.</p></div>
</div></section>
<section class="section stone"><div class="wrap"><div class="head"><div><h2>Cum se face rezervarea</h2></div></div>{steps()}</div></section>
{faq_block(faqs, link=p + "intrebari-frecvente/")}
{contact_block(p)}
'''
    items = [x for _, _, lis in INCLUSIVE for x in lis]
    svc = {"@type": "Service", "@id": f"{SITE}/{slug}#service", "name": "Pachet all inclusive pentru nunți și evenimente",
           "provider": {"@id": f"{SITE}/#venue"}, "areaServed": {"@type": "City", "name": CITY},
           "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Servicii incluse",
                               "itemListElement": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": x}} for x in items]}}
    return simple_page(slug, "Pachet all inclusive", "Servicii all inclusive nunți Târgu Mureș | Emerald",
                       "Ce include pachetul all inclusive Emerald: meniu și degustare, băuturi nelimitate, cocktail bar, torturi, fum greu și artificii, decor floral, cameră de hotel pentru miri.",
                       "Pachetul all inclusive", "Un singur preț pentru locație, meniu, băuturi, torturi, decor și camera mirilor.",
                       "food-1", c, [svc, base.faq_node(faqs, f"{SITE}/{slug}")])


def weddings():
    slug = "nunti-targu-mures/"
    faqs = [FAQ[i] for i in (1, 2, 4, 5, 8, 9)]
    day = [("Sosirea invitaților", "Covor roșu, lumini pe fațadă și șampanie la intrare."),
           ("Ședința foto", "În Grădina Emerald, cu arcade de flori și literele LOVE."),
           ("Intrarea mirilor", "În salonul ales, cu flori pe toate mesele și la masa mirilor."),
           ("Dansul mirilor", "Cu fum greu și artificii reci pe ring."),
           ("Tortul", "Tortul miresei cu artificii și tortul de shoturi al mirelui."),
           ("După petrecere", "Camera mirilor este la hotelul din aceeași curte.")]

    def c(p):
        tl = '<ol class="steps three">' + "".join(f"<li><h3>{h}</h3><p>{t}</p></li>" for h, t in day) + "</ol>"
        return f'''
<section class="section"><div class="wrap text-facts">
  <div class="text">
    <p class="intro">Emerald este o locație de nuntă din Târgu Mureș cu pachet all inclusive. Voi alegeți salonul și meniul, iar noi ne ocupăm de băuturi, torturi, decor, efecte și coordonare.</p>
    {checks(["Patru saloane: Sapphire (550), Gold (300), Diamond (200) și Gourmet (120 de invitați)", "Băuturi alcoolice și nealcoolice nelimitat, cu cocktail bar", "Fum greu și artificii la dansul mirilor", "Grădină pentru ședința foto, la locație", "Cameră de hotel pentru miri și cazare pentru invitați", "Degustarea meniului înainte de nuntă"])}
  </div>
  <dl class="facts">
    <div><dt>Invitați</dt><dd>120 – 550, în funcție de salon</dd></div>
    <div><dt>Pachet</dt><dd>All inclusive</dd></div>
    <div><dt>Ședința foto</dt><dd>Grădina Emerald</dd></div>
    <div><dt>Cazare</dt><dd>Emerald Boutique Hotel</dd></div>
    <div><dt>Telefon</dt><dd><a href="tel:{PHONE_E}">{PHONE_H}</a></dd></div>
  </dl>
</div></section>
<section class="section stone"><div class="wrap"><div class="head"><div><h2>Cum decurge seara</h2></div></div>{tl}</div></section>
<section class="section"><div class="wrap"><div class="head"><div><h2>Saloanele pentru nuntă</h2></div></div>{compare(p)}</div></section>
{faq_block(faqs, cls="stone", link=p + "intrebari-frecvente/")}
{contact_block(p)}
'''
    svc = {"@type": "Service", "@id": f"{SITE}/{slug}#service", "name": "Organizare nunți all inclusive în Târgu Mureș",
           "provider": {"@id": f"{SITE}/#venue"}, "areaServed": {"@type": "City", "name": CITY}}
    return simple_page(slug, "Nunți", "Nuntă în Târgu Mureș, all inclusive | Emerald Luxury Events",
                       "Nunta în Târgu Mureș la Emerald: 4 saloane (120–550 invitați), pachet all inclusive cu băuturi nelimitate, fum greu și artificii, grădină pentru ședința foto și cameră de hotel pentru miri.",
                       "Nunți la Emerald", "Patru saloane, pachet all inclusive, grădină pentru fotografii și hotel pentru miri, în aceeași locație.",
                       "dance-2", c, [svc, base.faq_node(faqs, f"{SITE}/{slug}")])


def baptism():
    slug = "botez-targu-mures/"
    faqs = [("Ce salon recomandați pentru un botez?", "Salonul Gourmet (până la 120 de invitați) sau Diamond Ballroom (până la 200). Pentru botezuri mai mari, Gold Ballroom are până la 300 de locuri, iar vara se poate folosi Terasa Emerald."),
            ("Pot organiza un majorat la Emerald?", "Da. Majoratele și aniversările se pot face în Salonul Gourmet, în Diamond Ballroom sau pe Terasa Emerald, cu decor pe tema aleasă."),
            ("Decorul poate fi personalizat?", "Da. Stabilim împreună decorul, de la baloane și flori până la culoarea luminilor."),
            FAQ[9]]

    def c(p):
        gal = "".join(photo_btn(p, n, a, "botez") for n, a in [("g11", "Petrecere de botez"), ("gourmet", "Salonul Gourmet"), ("g14", "Majorat cu baloane"), ("terasa-2", "Terasa Emerald"), ("diamond-3", "Diamond Ballroom"), ("cake-2", "Momentul tortului"), ("terasa-4", "Decor pe terasă"), ("diamond-6", "Diamond Ballroom, detalii")])
        return f'''
<section class="section"><div class="wrap text-facts">
  <div class="text">
    <p class="intro">Pentru botez, majorat sau aniversare aveți la dispoziție saloane de 120, 200 și 300 de locuri și o terasă în aer liber.</p>
    <p>Decorul se face pe tema voastră, iar meniul și tortul se aleg la degustare.</p>
    {checks(["Salonul Gourmet: până la 120 de invitați, lumină naturală", "Diamond Ballroom: până la 200 de invitați", "Gold Ballroom: până la 300 de invitați", "Terasa Emerald: petreceri în aer liber, vara"])}
  </div>
  <dl class="facts">
    <div><dt>Saloane</dt><dd>Gourmet (120), Diamond (200), Gold (300)</dd></div>
    <div><dt>În aer liber</dt><dd>Terasa Emerald</dd></div>
    <div><dt>Decor</dt><dd>Pe tema aleasă</dd></div>
    <div><dt>Adresă</dt><dd>{STREET}, {CITY}</dd></div>
  </dl>
</div></section>
<section class="section stone tight"><div class="wrap"><div class="photo-grid">{gal}</div></div></section>
{faq_block(faqs, link=p + "intrebari-frecvente/")}
{contact_block(p)}
'''
    return simple_page(slug, "Botezuri și majorate", "Botez și majorat în Târgu Mureș | Emerald Luxury Events",
                       "Sală pentru botez și majorat în Târgu Mureș: Salonul Gourmet (120), Diamond Ballroom (200), Gold Ballroom (300) și Terasa Emerald. Meniu, tort și decor incluse.",
                       "Botezuri, majorate și aniversări", "Saloane de 120, 200 și 300 de locuri și o terasă pentru petrecerile de familie.",
                       "gourmet", c, [base.faq_node(faqs, f"{SITE}/{slug}")])


def corporate():
    slug = "evenimente-corporate/"
    faqs = [("Ce evenimente corporate organizați?", "Lansări de produse, conferințe, seminarii și workshop-uri, petreceri de firmă, aniversări corporate, gale, prezentări și evenimente de networking."),
            ("Câți participanți pot fi găzduiți?", "Între aproximativ 120 de participanți în Salonul Gourmet și 550 în Sapphire Ballroom."),
            ("Oferiți cazare pentru participanți?", "Da, la Emerald Boutique Hotel, în același complex.")]

    def c(p):
        return f'''
<section class="section"><div class="wrap text-facts">
  <div class="text">
    <p class="intro">Găzduim evenimente de firmă cu 20 până la 550 de participanți, în patru saloane și pe terasă.</p>
    <p>Ne ocupăm de organizare, decor, catering, băuturi și de un coordonator pe toată durata evenimentului.</p>
    {checks(["Lansări de produse și branduri", "Conferințe, seminarii și workshop-uri", "Petreceri de firmă de Crăciun sau de final de an", "Aniversări corporate și gale", "Prezentări și evenimente de networking"])}
  </div>
  <dl class="facts">
    <div><dt>Participanți</dt><dd>20 – 550</dd></div>
    <div><dt>Servicii</dt><dd>Catering, băuturi, decor, coordonare</dd></div>
    <div><dt>Cazare</dt><dd>Emerald Boutique Hotel</dd></div>
    <div><dt>Adresă</dt><dd>{STREET}, {CITY}</dd></div>
  </dl>
</div></section>
<section class="section stone"><div class="wrap"><div class="head"><div><h2>Saloane potrivite</h2></div></div>{cols(p, ["sapphire", "gold", "diamond"])}</div></section>
{faq_block(faqs)}
{contact_block(p, "Cere o ofertă pentru firmă")}
'''
    svc = {"@type": "Service", "@id": f"{SITE}/{slug}#service", "name": "Evenimente corporate în Târgu Mureș",
           "provider": {"@id": f"{SITE}/#venue"}, "areaServed": {"@type": "City", "name": CITY}}
    return simple_page(slug, "Evenimente corporate", "Evenimente corporate Târgu Mureș | Emerald Luxury Events",
                       "Locație pentru evenimente corporate în Târgu Mureș: conferințe, lansări, gale și petreceri de firmă, în saloane de 120–550 de locuri. Organizare, decor și catering.",
                       "Evenimente corporate", "Conferințe, lansări, gale și petreceri de firmă, cu 20 până la 550 de participanți.",
                       "g05", c, [svc, base.faq_node(faqs, f"{SITE}/{slug}")])


def gallery():
    slug = "galeria-foto-video/"

    def c(p):
        chips = "".join(f'<button class="choice" type="button" data-filter="{k}" aria-pressed="{"true" if k == "all" else "false"}">{v}</button>'
                        for k, v in [("all", "Toate"), ("nunti", "Nunți"), ("saloane", "Saloane"), ("exterior", "Terasă și grădină"), ("hotel", "Hotel"), ("evenimente", "Alte evenimente")])
        items = "".join(photo_btn(p, n, a, "gal", cat=cat) for n, a, cat in base.GALLERY)
        return f'''
<section class="section tight"><div class="wrap">
  <div class="filters" role="group" aria-label="Filtrează fotografiile">{chips}</div>
  <div class="photo-grid">{items}</div>
  <p style="margin-top:30px"><a class="more" href="{IG}" target="_blank" rel="noopener">Mai multe fotografii pe Instagram</a></p>
</div></section>
<section class="section stone"><div class="wrap split">
  <video controls preload="none" playsinline poster="{p}media/hero-poster.webp" style="width:100%;aspect-ratio:16/9;object-fit:cover"><source src="{p}media/hero.mp4" type="video/mp4"></video>
  <div><h2>Filmare din Sapphire Ballroom</h2><p class="muted">Salonul pregătit pentru o nuntă: mesele, aranjamentele florale și lumina de seară.</p></div>
</div></section>
'''
    imgs = {"@type": "ImageGallery", "@id": f"{SITE}/{slug}#gallery", "name": "Galerie Emerald Luxury Events",
            "image": [{"@type": "ImageObject", "contentUrl": f"{SITE}/img/{n}.webp", "caption": a} for n, a, _ in base.GALLERY]}
    return simple_page(slug, "Galerie foto", "Galerie foto nunți și evenimente | Emerald Târgu Mureș",
                       "Fotografii de la nunți, botezuri și evenimente organizate la Emerald Luxury Events în Târgu Mureș: saloane, terasă, grădină și hotel.",
                       "Galerie foto", "Fotografii de la nunți, botezuri și petreceri organizate la Emerald.", "g01", c, [imgs])


def about():
    slug = "despre-noi/"
    values = [("Excelență", "Aceleași standarde la meniu, servire și decor, indiferent de mărimea evenimentului."),
              ("Eleganță", "Un stil care arată bine și în fotografiile de peste ani."),
              ("Profesionalism", "Un coordonator care se ocupă de program, ca voi să nu vă faceți griji."),
              ("Personalizare", "Meniul, decorul și programul se stabilesc împreună cu voi."),
              ("Respect", "Pentru invitați, pentru bugetul vostru și pentru încrederea acordată.")]

    def c(p):
        v = '<ol class="steps">' + "".join(f"<li><h3>{h}</h3><p>{t}</p></li>" for h, t in values) + "</ol>"
        return f'''
<section class="section"><div class="wrap split">
  {img(p, "facade-sign", "Intrarea în complexul Emerald")}
  <div>
    <p class="intro">Emerald Luxury Events organizează nunți, botezuri, aniversări și evenimente corporate în Târgu Mureș.</p>
    <p>Pe str. Gheorghe Doja 155 sunt patru saloane (Sapphire, Gold, Diamond și Gourmet), Terasa Emerald, Grădina Emerald și Emerald Boutique Hotel. Invitații ajung, petrec și pot dormi în același loc.</p>
  </div>
</div></section>
<section class="section stone"><div class="wrap"><div class="head"><div><h2>Ce ne ghidează</h2></div></div>{v}</div></section>
<section class="section"><div class="wrap split rev">
  {img(p, "family", "Echipa Emerald")}
  <div><h2>Echipa</h2><p>Ne cunoașteți la vizionare. Aceeași echipă care vă arată saloanele se ocupă și de ziua evenimentului.</p>
  <a class="btn btn-green" href="{p}contact/">Programează o vizionare</a></div>
</div></section>
'''
    return simple_page(slug, "Despre noi", "Despre noi | Emerald Luxury Events Târgu Mureș",
                       "Emerald Luxury Events, complex de evenimente în Târgu Mureș: patru saloane, terasă, grădină și hotel. Nunți, botezuri, aniversări și evenimente corporate.",
                       "Despre Emerald", "Un complex de evenimente cu saloane, terasă, grădină și hotel, pe str. Gheorghe Doja 155.", "facade-night", c,
                       [{"@type": "AboutPage", "@id": f"{SITE}/{slug}#about", "url": f"{SITE}/{slug}", "about": {"@id": f"{SITE}/#venue"}}])


def contact():
    slug = "contact/"

    def c(p):
        return contact_block(p, "Cerere de vizionare") + faq_block([FAQ[0], FAQ[9], FAQ[4]])
    return simple_page(slug, "Contact", "Contact și vizionări | Emerald Luxury Events Târgu Mureș",
                       f"Programează o vizionare la Emerald Luxury Events: {STREET}, {CITY}. Telefon și WhatsApp {PHONE_H}, e-mail {EMAIL}.",
                       "Contact", f"Telefon și WhatsApp: {PHONE_H}. Vizionările se fac cu programare.", "facade-night", c,
                       [{"@type": "ContactPage", "@id": f"{SITE}/{slug}#contact", "url": f"{SITE}/{slug}", "about": {"@id": f"{SITE}/#venue"}}])


def faq_page():
    slug = "intrebari-frecvente/"
    allq = list(FAQ)
    for s in SPACES:
        allq += [q for q in s["faq"] if q not in allq]

    def c(p):
        return faq_block(allq, title="Întrebări și răspunsuri") + contact_block(p)
    return simple_page(slug, "Întrebări frecvente", "Întrebări frecvente | Emerald Luxury Events Târgu Mureș",
                       "Răspunsuri despre Emerald Luxury Events: capacitatea saloanelor, ce include pachetul all inclusive, prețuri, cazare, degustare și vizionări.",
                       "Întrebări frecvente", "Capacități, prețuri, ce include pachetul și cum se face o vizionare.", "sapphire-6", c,
                       [base.faq_node(allq, f"{SITE}/{slug}")])


def not_found():
    def body(p):
        return f'''<section class="section"><div class="wrap"><h1>Pagina nu există</h1>
<p class="intro">Adresa poate fi greșită sau pagina a fost mutată.</p>
<div class="actions"><a class="btn btn-green" href="/">Pagina principală</a><a class="btn btn-line" href="/contact/">Contact</a></div></div></section>'''
    h = page("", "Pagina nu a fost găsită | Emerald Luxury Events", "Pagina căutată nu există.", body, [org_node()], hero=False)
    h = h.replace('index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1', 'noindex, follow')
    h = h.replace('<link rel="canonical" href="https://emeraldluxuryevents.ro/">', '').replace('href="./"', 'href="/"')
    h = re.sub(r'(href|src)="((?:assets|img|media)/)', r'\1="/\2', h).replace(", img/", ", /img/").replace('href="site.webmanifest"', 'href="/site.webmanifest"')
    return re.sub(r'href="((?:[a-z0-9-]+/)+(?:#[a-z]+)?)"', r'href="/\1"', h)


def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    pages = [home(), *[space_page(s) for s in SPACES], services(), weddings(), baptism(), corporate(), gallery(), about(), contact(), faq_page()]
    for slug, html_ in pages:
        write(os.path.join(slug, "index.html"), html_)
    write("404.html", not_found())
    write("sitemap.xml", base.sitemap([s for s, _ in pages]))
    write("robots.txt", base.ROBOTS)
    write("llms.txt", base.llms_txt())
    write("llms-full.txt", base.llms_full())
    write("site.webmanifest", base.MANIFEST.replace("#04100c", "#163f30"))
    write(".htaccess", base.HTACCESS)
    print(f"Built {len(pages)} pages + 404 (varianta 2)")


if __name__ == "__main__":
    main()
