#!/usr/bin/env python3
"""Varianta 3 a site-ului Emerald: "Ivoire & champagne".

Refolosește conținutul din emerald-v2 (care la rândul lui citește datele din
emerald/_build/build.py) și înlocuiește machetele: antet, subsol, paginile
de start și de salon, plus blocurile comune.

Run:  python3 emerald-v3/_build/build.py
"""
import importlib.util
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
_spec = importlib.util.spec_from_file_location("v2", os.path.join(HERE, "..", "..", "emerald-v2", "_build", "build.py"))
v2 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(v2)
base = v2.base

e, ic, img, photo_btn, checks = v2.e, v2.ic, v2.img, v2.photo_btn, v2.checks
SITE, BRAND, CITY, REGION, STREET = v2.SITE, v2.BRAND, v2.CITY, v2.REGION, v2.STREET
PHONE_H, PHONE_E, WA, EMAIL, IG, FB, MAPS = v2.PHONE_H, v2.PHONE_E, v2.WA, v2.EMAIL, v2.IG, v2.FB, v2.MAPS
SPACES, HALLS, BY_ID, INCLUSIVE, FAQ = v2.SPACES, v2.HALLS, v2.BY_ID, v2.INCLUSIVE, v2.FAQ

ORN = f'<div class="orn" aria-hidden="true">{ic("diamond")}</div>'
NAV_L = [("Nunți", "nunti-targu-mures/"), ("Botezuri", "botez-targu-mures/"), ("Corporate", "evenimente-corporate/")]
NAV_R = [("All inclusive", "servicii-all-inclusive/"), ("Galerie", "galeria-foto-video/"), ("Despre", "despre-noi/"), ("Contact", "contact/")]


def arch(p, name, alt, cls="", sizes="(max-width: 860px) 100vw, 50vw", eager=False, zoom=False):
    c = "arch" + (" " + cls if cls else "") + (" zoom" if zoom else "")
    return f'<figure class="{c}">{img(p, name, alt, sizes=sizes, eager=eager)}</figure>'


# ---------------------------------------------------------------- layout
def header(p, active):
    sub = "".join(f'<a href="{p}{s["slug"]}/">{s["name"]}<small>{(str(s["cap"]) + " locuri") if s["cap"] else ""}</small></a>' for s in SPACES)
    left = f'<li class="has-sub{" active" if active == "spatii" else ""}"><button type="button" aria-expanded="false">Saloane{ic("chev")}</button><div class="sub">{sub}</div></li>'
    left += "".join(f'<li{" class=\"active\"" if active == u else ""}><a href="{p}{u}">{n}</a></li>' for n, u in NAV_L)
    right = "".join(f'<li{" class=\"active\"" if active == u else ""}><a href="{p}{u}">{n}</a></li>' for n, u in NAV_R)
    m_sp = "".join(f'<li><a href="{p}{s["slug"]}/">{s["name"]}</a></li>' for s in SPACES)
    m_ev = "".join(f'<li><a href="{p}{u}">{n}</a></li>' for n, u in NAV_L + NAV_R)
    return f'''<a class="skip" href="#main">Sari la conținut</a>
<header class="site-header">
  <div class="wrap bar">
    <nav class="nav" aria-label="Meniu principal, stânga"><ul>{left}</ul></nav>
    <a class="brand" href="{p or './'}" aria-label="{BRAND}, pagina principală"><img src="{p}img/logo-dark.webp" alt="{BRAND}" width="700" height="292"></a>
    <nav class="nav right" aria-label="Meniu principal, dreapta"><ul>{right}</ul></nav>
    <button class="burger" type="button" aria-label="Meniu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">
  <p class="label">Saloane</p><ul>{m_sp}</ul>
  {ORN}
  <ul>{m_ev}<li><a href="{p}intrebari-frecvente/">Întrebări frecvente</a></li></ul>
  <a class="btn btn-green" href="tel:{PHONE_E}">{ic("phone")}{PHONE_H}</a>
</div>'''


def footer(p):
    sp = "".join(f'<li><a href="{p}{s["slug"]}/">{s["name"]}</a></li>' for s in SPACES)
    return f'''<footer class="site-footer"><div class="wrap">
  <a class="brand" href="{p or './'}"><img src="{p}img/logo.webp" alt="{BRAND}" width="700" height="292" loading="lazy"></a>
  <p class="foot-tag">Evenimente care rămân</p>
  <div class="socials"><a href="{IG}" target="_blank" rel="noopener">{ic("ig")}Instagram</a><a href="{FB}" target="_blank" rel="noopener">{ic("fb")}Facebook</a><a href="{WA}" target="_blank" rel="noopener">{ic("wa")}WhatsApp</a></div>
  <div class="foot-grid">
    <div><h3>Saloane și spații</h3><ul>{sp}</ul></div>
    <div><h3>Evenimente</h3><ul>
      <li><a href="{p}nunti-targu-mures/">Nunți</a></li><li><a href="{p}botez-targu-mures/">Botezuri și majorate</a></li>
      <li><a href="{p}evenimente-corporate/">Evenimente corporate</a></li><li><a href="{p}servicii-all-inclusive/">Pachet all inclusive</a></li>
      <li><a href="{p}galeria-foto-video/">Galerie foto</a></li><li><a href="{p}intrebari-frecvente/">Întrebări frecvente</a></li><li><a href="{p}despre-noi/">Despre noi</a></li></ul></div>
    <div><h3>Vizionări</h3><address>
      <a href="{MAPS}" target="_blank" rel="noopener">{STREET}<br>{CITY}, jud. {REGION}</a>
      <a href="tel:{PHONE_E}">{PHONE_H}</a><a href="mailto:{EMAIL}">{EMAIL}</a></address></div>
  </div>
  <p class="foot-bottom">© <span data-year>2026</span> {BRAND} · {CITY}</p>
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
    h = v2._orig_page(slug, title, desc, body, graph, active=active, og=og, hero=hero)
    h = h.replace('family=Hanken+Grotesk:wght@400;500;600&family=Libre+Caslon+Display',
                  'family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;1,6..96,400&family=Figtree:wght@400;500;600&family=Pinyon+Script')
    h = h.replace('<meta name="theme-color" content="#163f30">', '<meta name="theme-color" content="#faf6ef">')
    return h.replace(' class="has-hero"', "")


def page_head(p, here, h1, intro, photo, alt, cap=None):
    capline = f'<div class="cap-line"><strong>{cap}</strong><span>de locuri</span></div>' if cap else ""
    return f'''<section class="page-hero"><div class="wrap">
  {v2.crumbs(p, here)}
  <h1>{h1}</h1>
  {ORN}
  <p class="intro">{intro}</p>{capline}
  {arch(p, photo, alt, sizes="(max-width: 1100px) 100vw, 1040px", eager=True)}
</div></section>'''


def faq_block(items, title="Întrebări frecvente", cls="", link=None):
    qs = "".join(f'<details><summary>{e(q)}</summary><div class="answer"><p>{e(a)}</p></div></details>' for q, a in items)
    more = f'<p><a class="more" href="{link}">Toate întrebările</a></p>' if link else ""
    return f'''<section class="section {cls}" id="intrebari"><div class="wrap faq-grid">
  <div><p class="label">Răspunsuri</p><h2>{title}</h2><p class="muted">Pentru orice altă întrebare, sunați la {PHONE_H}.</p>{more}</div>
  <div class="faq">{qs}</div>
</div></section>'''


def contact_block(p, title="Programează o vizionare"):
    opts = "".join(f"<option>{x}</option>" for x in ["Nuntă", "Botez", "Majorat", "Aniversare", "Eveniment corporate", "Altul"])
    return f'''<section class="section green" id="vizionare"><div class="wrap contact">
  <div>
    <p class="label">Vizionări cu programare</p>
    <h2>{title}</h2>
    <p class="intro">Vă arătăm saloanele, terasa, grădina și camerele de hotel, apoi primiți oferta pentru data voastră.</p>
    <dl class="contact-list">
      <div><dt>Telefon</dt><dd><a href="tel:{PHONE_E}">{PHONE_H}</a></dd></div>
      <div><dt>WhatsApp</dt><dd><a href="{WA}" target="_blank" rel="noopener">{PHONE_H}</a></dd></div>
      <div><dt>E-mail</dt><dd><a href="mailto:{EMAIL}">{EMAIL}</a></dd></div>
      <div><dt>Adresă</dt><dd>{STREET}, {CITY}</dd></div>
    </dl>
    <a class="map-link" href="{MAPS}" target="_blank" rel="noopener">{img(p, "facade-night", "Fațada Emerald seara", sizes="96px")}<span><strong>Deschide în Google Maps</strong><br><span class="small">Indicații până la {STREET}</span></span></a>
  </div>
  <form class="form enquiry" novalidate>
    <h3>Cerere de vizionare</h3>
    {ORN}
    <div class="row">
      <label for="f-nume"><span>Nume</span><input id="f-nume" name="nume" autocomplete="name" required></label>
      <label for="f-tel"><span>Telefon</span><input id="f-tel" name="telefon" type="tel" autocomplete="tel" required></label>
    </div>
    <div class="row">
      <label for="f-ev"><span>Eveniment</span><select id="f-ev" name="eveniment">{opts}</select></label>
      <label for="f-data"><span>Data</span><input id="f-data" name="data" type="date"></label>
    </div>
    <label for="f-inv"><span>Număr de invitați</span><input id="f-inv" name="invitati" type="number" min="10" max="1000" inputmode="numeric"></label>
    <label for="f-msg"><span>Mesaj</span><textarea id="f-msg" name="mesaj"></textarea></label>
    <div class="actions"><button class="btn btn-green" type="submit">{ic("wa")}Trimite pe WhatsApp</button><button class="btn btn-line" type="button" data-mail>Trimite pe e-mail</button></div>
    <p class="note">Mesajul se deschide în WhatsApp sau în aplicația de e-mail, unde îl verificați înainte de trimitere.</p>
  </form>
</div></section>'''


def menu_card():
    return '<div class="menu-card">' + "".join(
        f'<div class="menu-group"><h3>{h}</h3><ul>{"".join(f"<li>{x}</li>" for x in lis)}</ul></div>' for _, h, lis in INCLUSIVE) + "</div>"


def head(title, sub=None, label=None, more=None):
    lab = f'<p class="label">{label}</p>' if label else ""
    s = f'<p class="muted">{sub}</p>' if sub else ""
    m = f'<a class="more" href="{more[1]}">{more[0]}</a>' if more else ""
    return f'<div class="head">{lab}<div><h2>{title}</h2>{s}</div>{m}</div>'


# plug the new layout into the v2 page builders
v2._orig_page = v2.page
for name, fn in {"header": header, "footer": footer, "page": page, "page_head": page_head, "faq_block": faq_block,
                 "contact_block": contact_block, "menu_card": menu_card}.items():
    setattr(v2, name, fn)


# ---------------------------------------------------------------- home
def home():
    slug = ""
    title = "Sală de nuntă și evenimente Târgu Mureș | Emerald Luxury Events"
    desc = "Complex de evenimente în Târgu Mureș: 4 saloane (120–550 invitați), terasă, grădină și boutique hotel. Nunți, botezuri, majorate și evenimente corporate all inclusive."

    def body(p):
        halls = "".join(
            f'''<a class="hall-card" href="{p}{s["slug"]}/">{arch(p, s["img"], s["name"] + ", salon de evenimente în Târgu Mureș", sizes="(max-width: 600px) 50vw, 25vw")}
  <span class="num">{s["cap"]}<small>de locuri</small></span><h3>{s["name"]}</h3><p>{s["tag"]}.</p><span class="more">Descoperă</span></a>'''
            for s in HALLS)
        pdata = {"halls": [{"id": s["id"], "name": s["name"], "cap": s["cap"], "url": f'{p}{s["slug"]}/', "img": f'{p}img/{s["img"]}-sm.webp'}
                           for s in sorted(HALLS, key=lambda x: x["cap"])],
                 "types": {"nunta": "Nuntă", "botez": "Botez", "majorat": "Majorat sau aniversare", "corporate": "Eveniment corporate"},
                 "prefer": {"botez": ["gourmet", "diamond"], "majorat": ["gourmet", "diamond"], "corporate": ["diamond", "gold", "sapphire"]}}
        alts = {g[0]: g[1] for g in base.GALLERY}
        rail_names = ["g03", "dance-1", "g16", "sapphire-6", "g13", "terasa-2", "cake-1", "g10", "gradina-8", "g21", "hotel-2", "g01"]
        rail = "".join(f'<button type="button" data-full="{p}img/{n}.webp" data-group="home" data-alt="{e(alts.get(n, "Eveniment la Emerald"))}" aria-label="Mărește: {e(alts.get(n, "Eveniment la Emerald"))}">{img(p, n, alts.get(n, "Eveniment la Emerald"), sizes="480px")}</button>' for n in rail_names)
        return f'''
<section class="hero">
  {img(p, "g03", "Mireasă cu voal în Grădina Emerald, Târgu Mureș", sizes="100vw", eager=True)}
  <div class="wrap">
    <p class="label">Târgu Mureș · str. Gheorghe Doja 155</p>
    <h1><span class="big">Evenimente</span><span class="script">care rămân</span><span class="sub-h">Nunți, botezuri și evenimente în Târgu Mureș</span></h1>
    <div class="actions"><a class="btn btn-ivory" href="{p}contact/">Programează o vizionare</a><a class="btn btn-light" href="tel:{PHONE_E}">{PHONE_H}</a></div>
  </div>
</section>

<section class="hero-after"><div class="wrap">
  {ORN}
  <p class="intro">Patru saloane de la 120 la 550 de locuri, o terasă, o grădină pentru fotografii și un hotel, toate în aceeași curte. Pachetul all inclusive cuprinde meniul, băuturile, tortul și decorul.</p>
  <div class="hero-facts"><span>4 saloane</span><span>Până la 550 de invitați</span><span>Terasă & grădină</span><span>Boutique hotel</span></div>
</div></section>

<section class="section blush" id="saloane"><div class="wrap">
  {head("Saloanele Emerald", "Alegeți salonul după numărul de invitați. Fiecare are decorul și lumina lui.", "Patru saloane")}
  <div class="halls">{halls}</div>
</div></section>

<section class="section"><div class="wrap split">
  {arch(p, "g10", "Miri în Grădina Emerald", zoom=True)}
  <div>
    <p class="label">Dincolo de saloane</p>
    <h2>Grădina, terasa <em>și hotelul</em></h2>
    <p class="intro">Ședința foto se face în grădina cu arcade de flori, cina de vară pe terasa cu pergolă, iar mirii și nașii dorm la hotelul din aceeași curte.</p>
    {checks([f'<a href="{p}gradina-emerald/">Grădina Emerald</a>: alei, arcade florale și literele LOVE', f'<a href="{p}terasa-emerald/">Terasa Emerald</a>: mese imperiale sub pergolă', f'<a href="{p}emerald-boutique-hotel/">Emerald Boutique Hotel</a>: camera mirilor e inclusă'])}
  </div>
</div></section>

<section class="band zoom">
  {img(p, "dance-2", "Dansul mirilor în fum greu la Emerald", sizes="100vw")}
  <div class="wrap"><blockquote>Unele zile trec,<br>altele rămân cu voi.</blockquote><p>Fum greu și artificii la dansul mirilor, incluse</p></div>
</section>

<section class="section ivory2"><div class="wrap">
  <div class="menu-frame">
    <p class="label">Pachet all inclusive</p>
    <h2>Ce intră în preț</h2>
    {ORN}
    <p class="muted">Lista de mai jos este inclusă în pachetul pentru nunți. Pentru alte evenimente, oferta se face la cerere.</p>
    {menu_card()}
    <a class="more" href="{p}servicii-all-inclusive/">Detalii despre pachet</a>
  </div>
</div></section>

<section class="section" id="planificator"><div class="wrap">
  {head("Ce salon vi se potrivește?", "Alegeți evenimentul și numărul de invitați.", "Planificator")}
  <div class="planner" id="planner">
    <div class="planner-form">
      <div class="field"><div class="flabel">Evenimentul</div>
        <div class="choices" role="group" aria-label="Tip de eveniment">
          <button class="choice" type="button" data-type="nunta" aria-pressed="true">Nuntă</button>
          <button class="choice" type="button" data-type="botez" aria-pressed="false">Botez</button>
          <button class="choice" type="button" data-type="majorat" aria-pressed="false">Majorat</button>
          <button class="choice" type="button" data-type="corporate" aria-pressed="false">Corporate</button>
        </div></div>
      <div class="field"><label class="flabel" for="guests">Invitați <output for="guests">180</output></label>
        <input id="guests" type="range" min="20" max="550" step="10" value="180"></div>
      <p class="small muted">Terasa, grădina și hotelul se discută la vizionare.</p>
    </div>
    <div class="planner-result" id="planner-result" aria-live="polite">
      <figure class="arch"><img src="{p}img/diamond-2-sm.webp" alt="Diamond Ballroom" width="800" height="450"></figure>
      <p class="match">Nuntă, 180 de invitați</p>
      <h3>Diamond Ballroom</h3>
      <p class="seats">Până la 200 de locuri.</p>
      <p class="alts"></p>
      <div class="actions"><a class="btn btn-green wa" href="{WA}" target="_blank" rel="noopener">{ic("wa")}Cere ofertă</a><a class="btn btn-line see" href="{p}diamond-ballroom/">Vezi salonul</a></div>
    </div>
  </div>
  <script type="application/json" id="planner-data">{json.dumps(pdata, ensure_ascii=False)}</script>
</div></section>

<section class="section blush"><div class="wrap">
  {head("De la vizionare la ziua cea mare", label="Cum lucrăm")}
  {v2.steps()}
</div></section>

<section class="section"><div class="wrap">
  {head("Momente de la Emerald", "Nunți și petreceri organizate la noi.", "Galerie", ("Toată galeria", p + "galeria-foto-video/"))}
</div>
  <div class="rail-wrap"><div class="rail" id="rail">{rail}</div>
  <div class="rail-nav"><button type="button" data-rail="-1" aria-label="Fotografiile anterioare">{ic("left")}</button><button type="button" data-rail="1" aria-label="Fotografiile următoare">{ic("right")}</button></div></div>
</section>

<section class="section ivory2"><div class="wrap">
  {head("Toate spațiile, pe scurt", label="Capacități")}
  {v2.compare(p)}
</div></section>

{faq_block(FAQ[:7], link=p + "intrebari-frecvente/")}
{contact_block(p)}
'''

    graph = base.base_graph(slug, title, desc, extra=[base.faq_node(FAQ[:7], f"{SITE}/")] + [base.space_node(s) for s in SPACES])
    return slug, page(slug, title, desc, body, graph, og="g03")


def space_page(s):
    slug = s["slug"] + "/"
    others = [x["id"] for x in HALLS if x["id"] != s["id"]][:3] if s["cap"] else [x for x in ("terasa", "gradina", "hotel", "sapphire") if x != s["id"]][:3]
    facts = [("Tip", s["kind"]), ("Capacitate", f'până la {s["cap"]} de invitați' if s["cap"] else "la cerere"),
             ("Adresă", f"{STREET}, {CITY}"), ("Pachet", f'<a href="../servicii-all-inclusive/">All inclusive</a>'), ("Vizionări", PHONE_H)]

    def body(p):
        dl = "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in facts)
        gal = "".join(photo_btn(p, n, f'{s["name"]}, fotografia {i}', s["id"]) for i, n in enumerate(s["gallery"], 1))
        return f'''
{page_head(p, s["name"], s["name"], s["short"], s["hero"], s["name"] + " la Emerald Luxury Events", cap=s["cap"])}
<section class="section"><div class="wrap text-facts">
  <div class="text">
    <p class="label">{s["tag"]}</p>
    {"".join(f"<p>{x}</p>" for x in s["body"])}
    <h3>Potrivit pentru</h3>{checks(s["ideal"])}
    <h3>Ce găsiți aici</h3>{checks(s["features"])}
  </div>
  <dl class="facts">{dl}</dl>
</div></section>
<section class="section blush tight"><div class="wrap">
  {head("În imagini", label=s["name"])}
  <div class="photo-grid">{gal}</div>
</div></section>
{faq_block(s["faq"] + FAQ[9:10], title=f'Despre {s["name"]}', link=p + "intrebari-frecvente/")}
<section class="section ivory2"><div class="wrap">{head("Alte spații Emerald", label="Complexul")}{v2.cols(p, others)}</div></section>
{contact_block(p, f'Vino să vezi {s["name"]}')}
'''

    graph = base.base_graph(slug, s["title"], s["meta"], trail=[(s["name"], slug)],
                            extra=[base.space_node(s), base.faq_node(s["faq"], f"{SITE}/{slug}")])
    return slug, page(slug, s["title"], s["meta"], body, graph, active="spatii", og=s["hero"])


def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    pages = [home(), *[space_page(s) for s in SPACES], v2.services(), v2.weddings(), v2.baptism(), v2.corporate(),
             v2.gallery(), v2.about(), v2.contact(), v2.faq_page()]
    for slug, html_ in pages:
        write(os.path.join(slug, "index.html"), html_)
    write("404.html", v2.not_found())
    write("sitemap.xml", base.sitemap([s for s, _ in pages]))
    write("robots.txt", base.ROBOTS)
    write("llms.txt", base.llms_txt())
    write("llms-full.txt", base.llms_full())
    write("site.webmanifest", base.MANIFEST.replace("#04100c", "#faf6ef"))
    write(".htaccess", base.HTACCESS)
    print(f"Built {len(pages)} pages + 404 (varianta 3, ivoire)")


if __name__ == "__main__":
    main()
