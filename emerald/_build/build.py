#!/usr/bin/env python3
"""Static site generator for emeraldluxuryevents.ro.

Run:  python3 emerald/_build/build.py
Writes every page (clean URLs: /slug/index.html), sitemap.xml, robots.txt,
llms.txt, llms-full.txt and site.webmanifest into emerald/.
All copy lives in this file, so editing text = edit here + rebuild.
"""
import html
import json
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = "https://emeraldluxuryevents.ro"
UPDATED = "2026-10-18"
BRAND = "Emerald Luxury Events"
PHONE_H = "0745 998 018"
PHONE_E = "+40745998018"
WA = "https://wa.me/40745998018"
EMAIL = "casamuresana@gmail.com"
STREET = "Str. Gheorghe Doja nr. 155"
CITY = "Târgu Mureș"
REGION = "Mureș"
IG = "https://www.instagram.com/emerald.luxury.events/"
FB = "https://www.facebook.com/emeraldluxuryevents"
MAPS = "https://www.google.com/maps/search/?api=1&query=Emerald+Luxury+Events+Strada+Gheorghe+Doja+155+T%C3%A2rgu+Mure%C8%99"
MAP_EMBED = "https://maps.google.com/maps?q=Strada%20Gheorghe%20Doja%20155%2C%20T%C3%A2rgu%20Mure%C8%99&z=16&output=embed"
REVIEWS = "https://www.google.com/search?q=Emerald+Luxury+Events+T%C3%A2rgu+Mure%C8%99+recenzii"

e = html.escape

# ---------------------------------------------------------------- icons
ICON_PATHS = {
    "arrow": '<path d="M4 12h15M13 5l7 7-7 7"/>',
    "phone": '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    "pin": '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>',
    "mail": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    "users": '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    "glass": '<path d="M8 3h8l-1 7a3 3 0 0 1-6 0L8 3zM12 13v8M8.5 21h7"/><path d="M8.6 7h6.8"/>',
    "cake": '<path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7"/><path d="M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0M12 12V8"/><path d="M12 5.5c.8-.6 1-1.6 0-2.5-1 .9-.8 1.9 0 2.5z"/>',
    "sparkle": '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    "gift": '<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9S10.5 4 8 4a2.5 2.5 0 0 0 0 5h4zm0 0s1.5-5 4-5a2.5 2.5 0 0 1 0 5h-4z"/>',
    "leaf": '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15"/><path d="M5 19 14 10"/>',
    "bed": '<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-8v6"/><circle cx="6.5" cy="11" r="1.8"/>',
    "chef": '<path d="M4 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M6 12v9M17 21V3c-2.5 1-3.5 4-3.5 7.5S15 14 17 14"/>',
    "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    "heart": '<path d="M12 20s-7.5-4.6-9.2-9.4A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 9.2 4C19.5 15.4 12 20 12 20z"/>',
    "baby": '<circle cx="12" cy="9" r="5"/><path d="M10 9h.01M14 9h.01M10.5 11.2c.9.6 2.1.6 3 0M7 20c.8-3 2.6-5 5-5s4.2 2 5 5"/>',
    "briefcase": '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/>',
    "camera": '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.8"/>',
    "crown": '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
    "check": '<path d="M4 12.5l5 5L20 6.5"/>',
    "close": '<path d="M5 5l14 14M19 5 5 19"/>',
    "chev": '<path d="M6 9l6 6 6-6"/>',
    "left": '<path d="M15 5l-7 7 7 7"/>',
    "right": '<path d="M9 5l7 7-7 7"/>',
    "diamond": '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l-1.5 5L12 20l4.5-11L15 4"/>',
    "music": '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    "star": '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    "key": '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "light": '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    "play": '<path d="M7 4l13 8-13 8z"/>',
}
FILLED = {
    "wa": '<path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/>',
    "ig": '<path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM21.9 7.9a6.6 6.6 0 0 0-1.8-4.6A6.6 6.6 0 0 0 15.4 1.5C13.6 1.4 10.4 1.4 8.6 1.5a6.6 6.6 0 0 0-4.7 1.8A6.6 6.6 0 0 0 2.1 8C2 9.8 2 13 2.1 14.8a6.6 6.6 0 0 0 1.8 4.7 6.6 6.6 0 0 0 4.7 1.8c1.8.1 5 .1 6.8 0a6.6 6.6 0 0 0 4.7-1.8 6.6 6.6 0 0 0 1.8-4.7c.1-1.8.1-5 0-6.9zM19.7 17a3.4 3.4 0 0 1-1.9 1.9c-1.3.5-4.4.4-5.8.4s-4.5.1-5.8-.4A3.4 3.4 0 0 1 4.3 17c-.5-1.3-.4-4.4-.4-5.8s-.1-4.5.4-5.8a3.4 3.4 0 0 1 1.9-1.9C7.5 3 10.6 3.1 12 3.1s4.5-.1 5.8.4a3.4 3.4 0 0 1 1.9 1.9c.5 1.3.4 4.4.4 5.8s.1 4.5-.4 5.8z"/>',
    "fb": '<path fill="currentColor" d="M14 8.5V6.6c0-.9.6-1.1 1-1.1h2.6V1.6L14 1.5c-4 0-4.8 3-4.8 4.9v2.1H6.9v4h2.3V22.5H14V12.5h3.2l.4-4z"/>',
    "google": '<path fill="currentColor" d="M21.6 10.2H12v3.9h5.5a4.8 4.8 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5 0-.7 0-1.4-.2-2.1zM12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6a6 6 0 0 1-9-3.2H3v2.7A10 10 0 0 0 12 22zM6.4 13.8a6 6 0 0 1 0-3.8V7.3H3a10 10 0 0 0 0 9.2zM12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.3l3.4 2.7A6 6 0 0 1 12 6z"/>',
}


def ic(name, cls=""):
    c = f' class="{cls}"' if cls else ""
    if name in FILLED:
        return f'<svg{c} viewBox="0 0 24 24" aria-hidden="true">{FILLED[name]}</svg>'
    return (f'<svg{c} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON_PATHS[name]}</svg>')


# ---------------------------------------------------------------- images
_dims = {}


def dims(name):
    if name not in _dims:
        with Image.open(os.path.join(ROOT, "img", f"{name}.webp")) as im:
            _dims[name] = im.size
    return _dims[name]


def img(p, name, alt, cls="", eager=False, sizes="(max-width: 900px) 100vw, 50vw", priority=False):
    w, h = dims(name)
    attrs = [f'src="{p}img/{name}-sm.webp"',
             f'srcset="{p}img/{name}-sm.webp 800w, {p}img/{name}.webp {w}w"',
             f'sizes="{sizes}"', f'width="{w}" height="{h}"', f'alt="{e(alt)}"']
    if cls:
        attrs.append(f'class="{cls}"')
    attrs.append('loading="eager"' if eager else 'loading="lazy"')
    attrs.append('decoding="async"')
    if priority:
        attrs.append('fetchpriority="high"')
    return "<img " + " ".join(attrs) + ">"


def thumb_btn(p, name, alt, group, extra="", cls=""):
    c = f' class="{cls}"' if cls else ""
    return (f'<button type="button"{c} data-full="{p}img/{name}.webp" data-group="{group}" '
            f'data-alt="{e(alt)}"{extra} aria-label="Mărește fotografia: {e(alt)}">'
            f'{img(p, name, alt, sizes="(max-width: 640px) 50vw, 25vw")}</button>')


# ---------------------------------------------------------------- content
SPACES = [
    dict(
        id="sapphire", slug="sapphire-ballroom", name="Sapphire Ballroom", kind="Salon de evenimente",
        cap=550, img="sapphire", hero="sapphire-2",
        tag="Grandoare pentru evenimente de anvergură",
        title="Sapphire Ballroom – salon de nuntă 550 locuri, Târgu Mureș",
        meta="Sapphire Ballroom, cel mai mare salon Emerald din Târgu Mureș: până la 550 de invitați, tavan drapat cu mii de lumini, candelabre de cristal. Nunți, gale, evenimente corporate.",
        short="Cel mai mare salon Emerald: tavan drapat cu mii de lumini, candelabre de cristal și aranjamente florale ample, pentru până la 550 de invitați.",
        body=[
            "Sapphire Ballroom este expresia luxului grandios și a rafinamentului contemporan. Cu un design spectaculos, tavan drapat elegant, candelabre impresionante și aranjamente florale ample, salonul creează un decor memorabil pentru evenimente de anvergură.",
            "Spațiul este ideal pentru nunți fastuoase, gale, recepții exclusiviste și evenimente corporate de mari dimensiuni, oferind o atmosferă sofisticată și un cadru perfect pentru momente care merită celebrate la cel mai înalt nivel.",
            "Sapphire Ballroom impresionează prin amplitudine, eleganță și atenția la detalii — locul unde fiecare eveniment devine o experiență de neuitat.",
        ],
        ideal=["Nunți fastuoase, cu sute de invitați", "Gale și recepții exclusiviste", "Evenimente corporate de mari dimensiuni", "Lansări de produs și petreceri de companie"],
        features=["Tavan drapat elegant, cu mii de lumini calde", "Candelabre impresionante de cristal", "Aranjamente florale ample și mobilier cu accente aurii", "Ring de dans generos pentru dansul mirilor cu fum greu și artificii"],
        gallery=["sapphire", "sapphire-3", "sapphire-4", "sapphire-5", "sapphire-6", "sapphire-7", "dance-3", "dance-4", "dance-1"],
        faq=[
            ("Câți invitați încap în Sapphire Ballroom?", "Sapphire Ballroom găzduiește până la 550 de invitați, fiind cel mai mare salon al complexului Emerald Luxury Events din Târgu Mureș."),
            ("Pentru ce tip de evenimente este potrivit Sapphire Ballroom?", "Pentru nunți mari, gale, recepții exclusiviste și evenimente corporate de mari dimensiuni, cum ar fi petreceri de companie sau lansări."),
        ],
    ),
    dict(
        id="gold", slug="gold-ballroom", name="Gold Ballroom", kind="Salon de evenimente",
        cap=300, img="gold", hero="gold-3",
        tag="Eleganță rafinată, atmosferă intimă",
        title="Gold Ballroom – salon evenimente 300 locuri, Târgu Mureș",
        meta="Gold Ballroom la Emerald Luxury Events, Târgu Mureș: până la 300 de invitați, accente aurii, iluminare caldă. Ideal pentru nunți elegante, botezuri, aniversări și corporate.",
        short="Accente aurii, arcade luminate și iluminare caldă: un salon distins pentru până la 300 de invitați.",
        body=[
            "Gold Ballroom este definiția eleganței rafinate și a atmosferei intime, creat special pentru evenimente care pun accent pe stil, detalii și emoție. Cu un design sofisticat, accente aurii și iluminare caldă, salonul oferă un cadru primitor și distins pentru momente speciale.",
            "Spațiul este ideal pentru nunți elegante, botezuri, aniversări și evenimente corporate exclusiviste, unde fiecare detaliu contribuie la o experiență memorabilă.",
            "Decorul atent ales, combinația de texturi fine și atmosfera echilibrată transformă Gold Ballroom într-un loc unde luxul se simte discret, dar profund.",
        ],
        ideal=["Nunți elegante", "Botezuri și aniversări", "Evenimente corporate exclusiviste", "Cine festive și recepții"],
        features=["Arcade cu lumină ambientală caldă", "Candelabre florale suspendate", "Perete floral pentru masa mirilor", "Ring de dans din parchet"],
        gallery=["gold", "gold-2", "gold-4", "gold-5", "gold-6", "gold-7", "table", "cake-1"],
        faq=[
            ("Câți invitați încap în Gold Ballroom?", "Gold Ballroom are o capacitate de până la 300 de invitați."),
            ("Este Gold Ballroom potrivit pentru botez?", "Da. Gold Ballroom este potrivit pentru botezuri și aniversări mai ample, păstrând o atmosferă caldă și intimă."),
        ],
    ),
    dict(
        id="diamond", slug="diamond-ballroom", name="Diamond Ballroom", kind="Salon de evenimente",
        cap=200, img="diamond", hero="diamond-5",
        tag="Rafinament modern, atmosferă exclusivistă",
        title="Diamond Ballroom – salon 200 locuri, Târgu Mureș",
        meta="Diamond Ballroom, Emerald Luxury Events Târgu Mureș: până la 200 de invitați, stil contemporan, iluminare ambientală. Nunți intime, botezuri, petreceri private, corporate premium.",
        short="Linii curate, lumini ambientale și un aer contemporan: salonul perfect pentru până la 200 de invitați.",
        body=[
            "Diamond Ballroom impresionează prin rafinament modern și o atmosferă exclusivistă, fiind creat pentru evenimente elegante, cu un stil contemporan și sofisticat. Designul său curat, accentele luminoase și liniile fine oferă un cadru aerisit, perfect pentru celebrarea momentelor speciale într-un mod discret și distins.",
            "Salonul este ideal pentru nunți intime, botezuri, petreceri private și evenimente corporate premium, punând accent pe confort, versatilitate și detalii atent alese.",
            "Iluminarea atent gândită și decorul echilibrat creează o ambianță plăcută, unde fiecare invitat se simte parte dintr-o experiență exclusivă.",
        ],
        ideal=["Nunți intime", "Botezuri și majorate", "Petreceri private", "Evenimente corporate premium"],
        features=["Iluminare ambientală personalizabilă", "Draperii elegante și candelabre de cristal", "Huse și mobilier elegant", "Spațiu versatil, ușor de personalizat tematic"],
        gallery=["diamond", "diamond-2", "diamond-3", "diamond-4", "diamond-6", "diamond-7"],
        faq=[
            ("Câți invitați încap în Diamond Ballroom?", "Diamond Ballroom găzduiește până la 200 de invitați."),
            ("Se poate schimba culoarea luminilor în Diamond Ballroom?", "Salonul are iluminare ambientală care poate fi adaptată tematicii evenimentului — discutați preferințele la vizionare."),
        ],
    ),
    dict(
        id="gourmet", slug="salonul-gourmet", name="Salonul Gourmet", kind="Salon de evenimente",
        cap=120, img="gourmet", hero="gourmet-2",
        tag="Evenimente intime și memorabile",
        title="Salonul Gourmet – sală botez și majorat, Târgu Mureș",
        meta="Salonul Gourmet la Emerald Luxury Events, Târgu Mureș: până la 120 de invitați, lumină naturală, verdeață și accente aurii. Ideal pentru botezuri, majorate și evenimente de familie.",
        short="Lumină naturală, verdeață suspendată și accente aurii: spațiul ideal pentru botezuri, majorate și evenimente de familie de până la 120 de invitați.",
        body=[
            "Salonul Gourmet este un spațiu elegant și rafinat, creat special pentru evenimente intime și memorabile, cu o capacitate de până la 120 de invitați.",
            "Amenajat cu accente moderne, tonuri calde și elemente naturale, Salonul Gourmet oferă o atmosferă primitoare, dar sofisticată.",
            "Lumina naturală, decorurile atent alese și flexibilitatea spațiului permit personalizarea fiecărui eveniment în funcție de tematică și dorințe. Fie că îți dorești un cadru festiv sau unul discret și rafinat, Salonul Gourmet transformă orice ocazie într-o experiență „wow”.",
        ],
        ideal=["Botezuri elegante și emoționante", "Majorate pline de stil", "Evenimente restrânse de familie", "Cine private și aniversări"],
        features=["Lumină naturală prin luminator", "Instalație de verdeață suspendată", "Mobilier cu accente aurii", "Capacitate de până la 120 de invitați"],
        gallery=["gourmet", "gourmet-2", "food-1", "food-2", "cake-2"],
        faq=[
            ("Câți invitați încap în Salonul Gourmet?", "Salonul Gourmet are o capacitate de până la 120 de invitați."),
            ("Este Salonul Gourmet potrivit pentru botez?", "Da, Salonul Gourmet este gândit special pentru botezuri, majorate și evenimente restrânse de familie."),
        ],
    ),
    dict(
        id="terasa", slug="terasa-emerald", name="Terasa Emerald", kind="Terasă în aer liber",
        cap=None, img="terasa", hero="terasa-3",
        tag="Eleganță în aer liber",
        title="Terasa Emerald – evenimente în aer liber, Târgu Mureș",
        meta="Terasa Emerald din Târgu Mureș: pergolă cu verdeață, lumini ambientale și mobilier cu accente aurii. Petreceri private, botezuri, majorate, cine festive în aer liber.",
        short="Pergolă cu verdeață luxuriantă, lumini ambientale și mobilier cu accente aurii: eleganță în aer liber, ziua și seara.",
        body=[
            "Un spațiu spectaculos în aer liber, unde eleganța se îmbină perfect cu natura și lumina caldă a serilor de poveste.",
            "Amenajată cu pergolă decorată cu verdeață luxuriantă, lumini ambientale și mobilier elegant cu accente aurii, terasa oferă un cadru rafinat și relaxant, ideal pentru evenimente cu personalitate.",
            "Atmosfera este una intimă, dar impresionantă, iar decorul poate fi personalizat în funcție de tematică și dorințe. Ziua, terasa te cucerește prin lumină naturală și prospețime, iar seara se transformă într-un spațiu magic, plin de farmec și rafinament.",
        ],
        ideal=["Petreceri private și aniversări speciale", "Mese festive în aer liber", "Botezuri, majorate sau evenimente restrânse", "Cine elegante și recepții exclusiviste"],
        features=["Pergolă cu verdeață luxuriantă", "Lumini ambientale pentru serile de vară", "Mese imperiale cu scaune aurii", "Decor personalizabil pe tematică"],
        gallery=["terasa", "terasa-2", "terasa-4", "terasa-5", "terasa-6", "terasa-7", "terasa-8"],
        faq=[
            ("Ce evenimente se pot organiza pe Terasa Emerald?", "Petreceri private, aniversări, mese festive în aer liber, botezuri, majorate, cine elegante și recepții."),
            ("Câți invitați încap pe terasă?", "Capacitatea terasei depinde de configurația meselor; vă comunicăm varianta potrivită la vizionare sau telefonic, la 0745 998 018."),
        ],
    ),
    dict(
        id="gradina", slug="gradina-emerald", name="Grădina Emerald", kind="Grădină pentru ședințe foto",
        cap=None, img="gradina", hero="gradina-2",
        tag="Un colț de natură elegant și romantic",
        title="Grădina Emerald – ședințe foto de nuntă, Târgu Mureș",
        meta="Grădina Emerald din Târgu Mureș: alei îngrijite, arcade verzi, flori și copaci maturi. Decor natural pentru ședințe foto cu mirii, first look și cadre artistice.",
        short="Alei îngrijite, arcade verzi, flori și copaci maturi: decorul natural pentru ședința foto a mirilor, chiar la locația evenimentului.",
        body=[
            "Grădina Emerald este un colț de natură elegant și romantic, creat special pentru ședințe foto memorabile cu mirii și momente pline de emoție.",
            "Aleile atent îngrijite, arcadele verzi, florile viu colorate și copacii maturi creează un decor natural spectaculos, ideal pentru cadre autentice și rafinate. Fiecare colț al grădinii oferă perspective diferite – de la zone intime și romantice, până la cadre ample, luminoase, perfecte pentru fotografii de impact.",
            "Lumina naturală, liniștea și armonia spațiului transformă Grădina Emerald într-un fundal ideal pentru amintiri elegante, pline de naturalețe.",
        ],
        ideal=["Ședințe foto cu mirii", "Fotografii de cuplu sau „first look”", "Cadre artistice înainte sau după eveniment", "Fotografii cu familia și nașii"],
        features=["Arcade florale și alei îngrijite", "Instalațiile LOVE pentru fotografii", "Copaci maturi și umbră naturală", "La câțiva pași de saloane — fără transport"],
        gallery=["gradina", "gradina-3", "gradina-4", "gradina-5", "gradina-6", "gradina-7", "gradina-8", "gradina-9", "gradina-10", "g03"],
        faq=[
            ("Se pot face fotografii de nuntă în Grădina Emerald?", "Da. Grădina este gândită special pentru ședința foto a mirilor, first look și fotografii cu familia, chiar la locația evenimentului."),
        ],
    ),
    dict(
        id="hotel", slug="emerald-boutique-hotel", name="Emerald Boutique Hotel", kind="Hotel boutique",
        cap=None, img="hotel", hero="hotel-2",
        tag="Cazare elegantă, la câțiva pași de petrecere",
        title="Emerald Boutique Hotel – cazare miri și invitați, Târgu Mureș",
        meta="Emerald Boutique Hotel, Târgu Mureș: camere elegante pentru miri, nași și invitații evenimentelor, chiar în complexul Emerald Luxury Events. Fără griji legate de transport.",
        short="Camere elegante pentru miri, nași și invitați, chiar în complexul Emerald — fără griji legate de transport.",
        body=[
            "Emerald Boutique Hotel completează perfect experiența oferită de Emerald Luxury Events, punând la dispoziție camere elegante și confortabile, ideale atât pentru miri și nași, cât și pentru invitații evenimentelor.",
            "Camerele sunt amenajate modern, cu atenție la detalii, oferind un ambient relaxant și primitor, perfect pentru momentele de liniște înainte sau după eveniment.",
            "Pentru miri și nași, hotelul oferă spații speciale, potrivite pentru pregătire, odihnă și clipe de intimitate într-o zi atât de importantă.",
        ],
        ideal=["Cazarea mirilor și nașilor", "Invitați veniți din alte orașe", "Familii și apropiați care își doresc confort și acces facil", "O experiență completă, fără griji legate de transport"],
        features=["Cameră de hotel pentru miri inclusă în pachetul all inclusive", "Spații pentru pregătirea mirilor", "Recepție elegantă, în același complex", "Acces direct la saloane, terasă și grădină"],
        gallery=["hotel", "hotel-3", "hotel-4", "hotel-5", "hotel-6", "hotel-7", "g15", "g20"],
        faq=[
            ("Are Emerald Luxury Events hotel propriu?", "Da. Emerald Boutique Hotel face parte din complex și oferă cazare pentru miri, nași și invitați."),
            ("Camera mirilor este inclusă?", "Da, pachetul all inclusive pentru nunți include o cameră de hotel pentru miri."),
        ],
    ),
]
HALLS = [s for s in SPACES if s["cap"]]
BY_ID = {s["id"]: s for s in SPACES}

INCLUSIVE = [
    ("chef", "Meniu", ["Preparate variate, atent selecționate pentru toate gusturile", "Degustarea meniului înainte de eveniment"]),
    ("glass", "Pachet băuturi", ["Băuturi alcoolice și nealcoolice nelimitat", "Cocktail bar și barmani", "Șampanie la întâmpinarea invitaților", "Cafea Illy"]),
    ("cake", "Torturi", ["Tortul miresei (felii sau monoporții)", "Tortul mirelui – tort de shoturi", "Artificii pentru tort"]),
    ("sparkle", "Momente speciale", ["Fum greu și artificii la dansul mirilor", "Candy bar & fruit bar", "Alune și saleuri pe mese"]),
    ("leaf", "Decorațiuni", ["Covor roșu la intrare", "Lumini arhitecturale", "Aranjamente florale pentru toată sala și masa mirilor"]),
    ("gift", "Accesorii", ["Plicuri și pixuri", "Cutie pentru dar", "Flipchart cu lista de invitați", "Numere pentru mese"]),
    ("bed", "Facilități", ["Cameră de hotel pentru miri", "Personal inclus pe toată durata evenimentului"]),
    ("crown", "Coordonare", ["Organizare și coordonare a evenimentului", "Suport dedicat de la prima discuție până la ultimul dans"]),
]

STEPS = [
    ("Vizionare", "Ne vizitați la str. Gheorghe Doja 155 și alegem împreună salonul potrivit."),
    ("Ofertă personalizată", "Primiți o ofertă clară, adaptată datei, salonului și numărului de invitați."),
    ("Degustare", "Gustați meniul înainte de eveniment și îl ajustăm după preferințe."),
    ("Detalii & decor", "Stabilim decorul, momentele speciale și programul serii."),
    ("Ziua cea mare", "Noi ne ocupăm de tot. Voi doar vă bucurați de fiecare clipă."),
]

TYPES = [
    ("heart", "Nunți", "Pachete all inclusive, 4 saloane între 120 și 550 de locuri, grădină pentru ședința foto și cameră de hotel pentru miri.", "nunti-targu-mures/"),
    ("baby", "Botezuri", "Salonul Gourmet, Diamond Ballroom sau Terasa Emerald — spații calde pentru petreceri de familie.", "botez-targu-mures/"),
    ("star", "Majorate & aniversări", "Petreceri pline de stil, cu lumini, muzică și decor personalizat pe tematică.", "botez-targu-mures/"),
    ("briefcase", "Evenimente corporate", "Conferințe, lansări, gale și petreceri de companie, de la întâlniri restrânse la sute de participanți.", "evenimente-corporate/"),
    ("glass", "Gale & recepții", "Sapphire Ballroom transformă orice recepție într-un eveniment de anvergură.", "sapphire-ballroom/"),
    ("camera", "Ședințe foto", "Grădina Emerald, cu arcade florale și alei îngrijite, este fundalul perfect pentru fotografii.", "gradina-emerald/"),
]

FAQ_GENERAL = [
    ("Unde se află Emerald Luxury Events?", f"Emerald Luxury Events se află în Târgu Mureș, pe {STREET}, județul Mureș. Complexul reunește patru saloane, o terasă, o grădină și un hotel boutique în aceeași locație."),
    ("Câți invitați pot fi găzduiți la Emerald?", "Complexul are patru saloane: Sapphire Ballroom (până la 550 de invitați), Gold Ballroom (până la 300), Diamond Ballroom (până la 200) și Salonul Gourmet (până la 120). Astfel, puteți organiza atât un eveniment intim, cât și o nuntă cu sute de invitați."),
    ("Ce include pachetul all inclusive pentru nuntă?", "Pachetul include meniul și degustarea, băuturi alcoolice și nealcoolice nelimitat, cocktail bar și barmani, tortul miresei și tortul mirelui (tort de shoturi), candy bar și fruit bar, fum greu și artificii la dansul mirilor, artificii pentru tort, șampanie la întâmpinare, cafea Illy, decor floral pentru sală și masa mirilor, covor roșu, lumini arhitecturale, accesorii (plicuri, pixuri, cutie pentru dar, flipchart, numere de masă), personal și cameră de hotel pentru miri."),
    ("Băuturile sunt incluse în preț?", "Da. Pachetul all inclusive include băuturi alcoolice și nealcoolice nelimitat, cocktail bar și barmani."),
    ("Cât costă o nuntă la Emerald Luxury Events?", "Prețul depinde de dată, salonul ales, numărul de invitați și meniu. Vă pregătim o ofertă personalizată după o discuție sau o vizionare — sunați la 0745 998 018 sau scrieți-ne pe WhatsApp."),
    ("Există cazare pentru miri și invitați?", "Da. Emerald Boutique Hotel face parte din complex și oferă camere pentru miri, nași și invitați. Camera mirilor este inclusă în pachetul all inclusive."),
    ("Se poate face degustarea meniului?", "Da, degustarea meniului este inclusă în serviciile all inclusive, înainte de eveniment."),
    ("Organizați și botezuri, majorate sau evenimente corporate?", "Da. Pe lângă nunți, găzduim botezuri, majorate, aniversări, petreceri private, gale și evenimente corporate — conferințe, lansări, team building-uri și petreceri de companie."),
    ("Pot face ședința foto de nuntă la locație?", "Da. Grădina Emerald, cu alei îngrijite, arcade florale și copaci maturi, este creată special pentru ședințe foto cu mirii, first look și fotografii cu familia."),
    ("Cum programez o vizionare?", "Sunați la 0745 998 018, scrieți-ne pe WhatsApp sau completați formularul de pe site cu data dorită și numărul estimat de invitați. Vă confirmăm rapid ora vizionării."),
]

GALLERY = [
    ("g03", "Mireasă cu voal în Grădina Emerald", "nunti exterior"),
    ("dance-1", "Dansul mirilor cu fum greu și artificii", "nunti"),
    ("sapphire", "Sapphire Ballroom pregătit pentru nuntă", "saloane"),
    ("g01", "Primul dans în Sapphire Ballroom", "nunti"),
    ("facade-night", "Fațada Emerald luminată noaptea", "exterior"),
    ("g16", "Cuplu la instalația LOVE din grădină", "nunti exterior"),
    ("gold", "Gold Ballroom cu candelabre florale", "saloane"),
    ("g21", "Dans în fum greu, Sapphire Ballroom", "nunti"),
    ("terasa-2", "Masă imperială pe Terasa Emerald", "exterior saloane"),
    ("cake-1", "Tortul mirilor cu artificii", "nunti"),
    ("diamond", "Diamond Ballroom în lumini violet", "saloane"),
    ("g11", "Petrecere de botez la Emerald", "evenimente"),
    ("hotel", "Intrarea Emerald Boutique Hotel", "hotel exterior"),
    ("g13", "Miri în Sapphire Ballroom", "nunti"),
    ("gradina-3", "Grădina Emerald cu arcade florale", "exterior"),
    ("g12", "Moment de dans cu artificii reci", "nunti evenimente"),
    ("gourmet", "Salonul Gourmet cu verdeață suspendată", "saloane"),
    ("g19", "Primul dans în Gold Ballroom", "nunti"),
    ("g15", "Miri la intrarea în Emerald Boutique Hotel", "nunti hotel"),
    ("terasa-4", "Detalii de decor pe terasă", "exterior"),
    ("g22", "Invitați pe ringul de dans", "nunti evenimente"),
    ("food-2", "Preparate servite la Emerald", "evenimente"),
    ("g17", "Mirii în fața salonului", "nunti exterior"),
    ("hotel-4", "Recepția Emerald Boutique Hotel", "hotel"),
    ("g09", "Primul dans în Sapphire Ballroom", "nunti"),
    ("sapphire-5", "Sapphire Ballroom, vedere de ansamblu", "saloane"),
    ("g10", "Cuplu în Grădina Emerald", "nunti exterior"),
    ("g14", "Petrecere cu baloane și confetti", "evenimente"),
    ("g05", "Petrecere de iarnă la Emerald", "evenimente"),
    ("g20", "Miri sosind la Emerald Boutique Hotel", "nunti hotel"),
    ("g23", "Dansul mirilor cu formație live", "nunti"),
    ("gradina-8", "Instalația LOVE din grădină", "exterior"),
    ("table", "Aranjament de masă elegant", "saloane"),
    ("hotel-6", "Cameră în Emerald Boutique Hotel", "hotel"),
    ("g18", "Dans în fum greu, Diamond Ballroom", "nunti"),
    ("dance-5", "Dans în Sapphire Ballroom cu formație", "nunti"),
    ("g06", "Invitați pe ringul de dans", "evenimente"),
    ("gold-5", "Gold Ballroom, masa mirilor", "saloane"),
    ("g07", "Invitați aplaudând la masă", "evenimente"),
    ("cake-2", "Momentul tortului", "nunti"),
]

# ---------------------------------------------------------------- schema
ADDRESS = {"@type": "PostalAddress", "streetAddress": "Strada Gheorghe Doja 155", "addressLocality": CITY,
           "addressRegion": REGION, "addressCountry": "RO"}


def org_node():
    return {
        "@type": ["EventVenue", "LocalBusiness"],
        "@id": f"{SITE}/#venue",
        "name": BRAND,
        "alternateName": ["Emerald Târgu Mureș", "Emerald Events", "Complex Emerald"],
        "description": "Complex de evenimente de lux în Târgu Mureș cu patru saloane (120–550 de locuri), terasă, grădină pentru ședințe foto și hotel boutique. Nunți, botezuri, majorate și evenimente corporate cu servicii all inclusive.",
        "url": f"{SITE}/",
        "logo": f"{SITE}/img/logo.png",
        "image": [f"{SITE}/img/facade-night.webp", f"{SITE}/img/sapphire.webp", f"{SITE}/img/hero-couple.webp"],
        "telephone": PHONE_E,
        "email": EMAIL,
        "address": ADDRESS,
        "hasMap": MAPS,
        "areaServed": [{"@type": "City", "name": CITY}, {"@type": "AdministrativeArea", "name": "Județul Mureș"}],
        "maximumAttendeeCapacity": 550,
        "priceRange": "$$$",
        "sameAs": [IG, FB],
        "slogan": "Evenimente care rămân",
        "knowsAbout": ["Nunți", "Botezuri", "Majorate", "Evenimente corporate", "Gale", "Servicii all inclusive"],
        "amenityFeature": [
            {"@type": "LocationFeatureSpecification", "name": n, "value": True}
            for n in ["Hotel boutique în incintă", "Terasă în aer liber", "Grădină pentru ședințe foto",
                      "Băuturi nelimitate", "Cocktail bar", "Fum greu și artificii", "Candy bar"]
        ],
        "containsPlace": [{"@id": f"{SITE}/{s['slug']}/#place"} for s in SPACES],
        "contactPoint": {"@type": "ContactPoint", "telephone": PHONE_E, "contactType": "reservations",
                         "availableLanguage": ["ro", "hu", "en"]},
    }


def space_node(s):
    t = "Hotel" if s["id"] == "hotel" else ("EventVenue" if s["cap"] else "Place")
    n = {"@type": t, "@id": f"{SITE}/{s['slug']}/#place", "name": s["name"], "description": s["short"],
         "url": f"{SITE}/{s['slug']}/", "image": [f"{SITE}/img/{x}.webp" for x in [s["img"]] + s["gallery"][:3]],
         "containedInPlace": {"@id": f"{SITE}/#venue"}, "address": ADDRESS}
    if s["cap"]:
        n["maximumAttendeeCapacity"] = s["cap"]
    if t == "Hotel":
        n["telephone"] = PHONE_E
    return n


def faq_node(items, url):
    return {"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}


def crumbs_node(trail, url):
    items = [{"@type": "ListItem", "position": 1, "name": "Acasă", "item": f"{SITE}/"}]
    for i, (name, slug) in enumerate(trail, start=2):
        items.append({"@type": "ListItem", "position": i, "name": name, "item": f"{SITE}/{slug}" if slug else url})
    return {"@type": "BreadcrumbList", "@id": url + "#breadcrumb", "itemListElement": items}


# ---------------------------------------------------------------- layout
NAV_EVENTS = [("Nunți", "nunti-targu-mures/"), ("Botezuri", "botez-targu-mures/"),
              ("Corporate", "evenimente-corporate/"), ("Galerie", "galeria-foto-video/"),
              ("Despre noi", "despre-noi/"), ("Contact", "contact/")]


def header(p, active):
    sub = "".join(
        f'<a href="{p}{s["slug"]}/">{img(p, s["img"], s["name"], sizes="60px")}'
        f'<span><strong>{s["name"]}</strong><small>{("până la " + str(s["cap"]) + " invitați") if s["cap"] else s["kind"]}</small></span></a>'
        for s in SPACES)
    sub += (f'<a href="{p}servicii-all-inclusive/">{img(p, "food-1", "Servicii all inclusive", sizes="60px")}'
            f'<span><strong>Servicii all inclusive</strong><small>Tot ce include evenimentul</small></span></a>')
    items = "".join(
        f'<li{" class=\"active\"" if active == u else ""}><a class="top" href="{p}{u}">{n}</a></li>' for n, u in NAV_EVENTS)
    m_spaces = "".join(f'<li><a href="{p}{s["slug"]}/">{s["name"]}<small>{s["cap"] or ""}</small></a></li>' for s in SPACES)
    m_events = "".join(f'<li><a href="{p}{u}">{n}</a></li>' for n, u in NAV_EVENTS)
    return f'''<a class="skip" href="#main">Sari la conținut</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="{p or './'}" aria-label="{BRAND} – pagina principală"><img src="{p}img/logo.webp" alt="{BRAND}" width="700" height="296"></a>
    <nav class="nav" aria-label="Meniu principal">
      <ul>
        <li class="has-sub{' active' if active == 'spatii' else ''}"><button class="top" type="button" aria-expanded="false" aria-haspopup="true">Spații {ic("chev", "caret")}</button>
          <div class="sub">{sub}</div></li>
        {items}
      </ul>
    </nav>
    <div class="header-cta">
      <a class="phone" href="tel:{PHONE_E}">{ic("phone")}{PHONE_H}</a>
      <a class="btn btn-gold" href="{p}contact/#vizionare">Programează vizionare</a>
      <button class="burger" type="button" aria-label="Deschide meniul" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">
  <p class="m-label">Spații</p><ul>{m_spaces}</ul>
  <p class="m-label">Evenimente</p><ul>{m_events}<li><a href="{p}servicii-all-inclusive/">All inclusive</a></li><li><a href="{p}intrebari-frecvente/">Întrebări frecvente</a></li></ul>
  <div class="m-cta"><a class="btn btn-gold" href="{p}contact/#vizionare">Programează vizionare</a><a class="btn btn-ghost" href="tel:{PHONE_E}">{ic("phone")} {PHONE_H}</a></div>
</div>'''


def footer(p):
    spaces = "".join(f'<li><a href="{p}{s["slug"]}/">{s["name"]}</a></li>' for s in SPACES)
    return f'''<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="brand" href="{p or './'}"><img src="{p}img/logo.webp" alt="{BRAND}" width="700" height="296" loading="lazy"></a>
        <p>Complex de evenimente de lux în Târgu Mureș: patru saloane, terasă, grădină și hotel boutique. Nunți, botezuri, majorate și evenimente corporate, cu servicii all inclusive.</p>
        <div class="socials">
          <a href="{IG}" target="_blank" rel="noopener" aria-label="Instagram">{ic("ig")}</a>
          <a href="{FB}" target="_blank" rel="noopener" aria-label="Facebook">{ic("fb")}</a>
          <a href="{REVIEWS}" target="_blank" rel="noopener" aria-label="Recenzii Google">{ic("google")}</a>
          <a href="{WA}" target="_blank" rel="noopener" aria-label="WhatsApp">{ic("wa")}</a>
        </div>
      </div>
      <div><h3>Spații</h3><ul>{spaces}</ul></div>
      <div><h3>Evenimente</h3><ul>
        <li><a href="{p}nunti-targu-mures/">Nunți în Târgu Mureș</a></li>
        <li><a href="{p}botez-targu-mures/">Botezuri & majorate</a></li>
        <li><a href="{p}evenimente-corporate/">Evenimente corporate</a></li>
        <li><a href="{p}servicii-all-inclusive/">Servicii all inclusive</a></li>
        <li><a href="{p}galeria-foto-video/">Galerie foto</a></li>
        <li><a href="{p}intrebari-frecvente/">Întrebări frecvente</a></li>
        <li><a href="{p}despre-noi/">Despre noi</a></li></ul></div>
      <div><h3>Contact</h3>
        <address>
          <a href="{MAPS}" target="_blank" rel="noopener">{STREET}<br>{CITY}, jud. {REGION}</a>
          <a href="tel:{PHONE_E}">{PHONE_H}</a>
          <a href="mailto:{EMAIL}">{EMAIL}</a>
        </address>
        <p style="margin-top:18px"><a class="link-arrow" href="{p}contact/#vizionare">Programează o vizionare {ic("arrow")}</a></p>
      </div>
    </div>
    <div class="foot-bottom"><span>© <span data-year>2026</span> {BRAND} · {CITY} · România</span><span>Unele zile trec. Altele rămân cu voi.</span></div>
  </div>
</footer>
<a class="fab" href="{WA}?text={e("Bună ziua! Aș dori informații despre organizarea unui eveniment la Emerald.")}" target="_blank" rel="noopener" aria-label="Scrie-ne pe WhatsApp">{ic("wa")}</a>
<button class="to-top" type="button" aria-label="Înapoi sus">{ic("arrow")}</button>
<nav class="mobile-bar" aria-label="Contact rapid">
  <a href="tel:{PHONE_E}">{ic("phone")}Sună</a>
  <a href="{WA}" target="_blank" rel="noopener">{ic("wa")}WhatsApp</a>
  <a class="go" href="{p}contact/#vizionare">{ic("calendar")}Vizionare</a>
</nav>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Galerie foto" aria-hidden="true">
  <img alt="">
  <button class="lb-btn lb-close" type="button" aria-label="Închide">{ic("close")}</button>
  <button class="lb-btn lb-prev" type="button" aria-label="Fotografia anterioară">{ic("left")}</button>
  <button class="lb-btn lb-next" type="button" aria-label="Fotografia următoare">{ic("right")}</button>
  <div class="lb-count"></div>
</div>'''


def page(slug, title, desc, body, graph, active="", og_img="facade-night", preload=None, body_cls=""):
    depth = slug.count("/") if slug else 0
    p = "../" * depth
    url = f"{SITE}/{slug}"
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))
    pre = ""
    if preload:
        w, _ = dims(preload)
        pre = (f'<link rel="preload" as="image" href="{p}img/{preload}-sm.webp" '
               f'imagesrcset="{p}img/{preload}-sm.webp 800w, {p}img/{preload}.webp {w}w" imagesizes="100vw" fetchpriority="high">')
    return f'''<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="theme-color" content="#04100c">
<meta name="geo.region" content="RO-MS">
<meta name="geo.placename" content="{CITY}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ro_RO">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/img/{og_img}.webp">
<meta property="og:image:width" content="{dims(og_img)[0]}">
<meta property="og:image:height" content="{dims(og_img)[1]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{SITE}/img/{og_img}.webp">
<link rel="icon" type="image/png" sizes="32x32" href="{p}img/icon-32.png">
<link rel="apple-touch-icon" href="{p}img/icon-180.png">
<link rel="manifest" href="{p}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap">
<link rel="stylesheet" href="{p}assets/css/style.css">
{pre}
<script type="application/ld+json">{ld}</script>
</head>
<body class="{body_cls}">
{header(p, active)}
<main id="main">
{body(p)}
</main>
{footer(p)}
<script src="{p}assets/js/main.js" defer></script>
</body>
</html>
'''


def base_graph(slug, title, desc, trail=None, extra=()):
    url = f"{SITE}/{slug}"
    g = [
        {"@type": "WebSite", "@id": f"{SITE}/#website", "url": f"{SITE}/", "name": BRAND, "inLanguage": "ro-RO",
         "publisher": {"@id": f"{SITE}/#venue"}},
        org_node(),
        {"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": title, "description": desc,
         "isPartOf": {"@id": f"{SITE}/#website"}, "about": {"@id": f"{SITE}/#venue"}, "inLanguage": "ro-RO",
         "dateModified": UPDATED, **({"breadcrumb": {"@id": url + "#breadcrumb"}} if trail else {})},
    ]
    if trail:
        g.append(crumbs_node(trail, url))
    g.extend(extra)
    return g


# ---------------------------------------------------------------- shared blocks
def crumbs(p, trail):
    li = f'<li><a href="{p or "./"}">Acasă</a></li>'
    for name, href in trail[:-1]:
        li += f'<li><a href="{p}{href}">{name}</a></li>'
    li += f'<li aria-current="page">{trail[-1][0]}</li>'
    return f'<nav aria-label="Breadcrumb"><ol class="crumbs">{li}</ol></nav>'


def page_hero(p, image, eyebrow, h1, lead, trail, badge=None, short=False, actions=True):
    b = ""
    if badge:
        b = f'<div class="cap-badge" aria-hidden="true"><span>până la</span><strong>{badge}</strong><span>invitați</span></div>'
    acts = ""
    if actions:
        acts = (f'<div class="hero-actions"><a class="btn btn-gold" href="{p}contact/#vizionare">{ic("calendar")}Programează vizionare</a>'
                f'<a class="btn btn-ghost" href="{WA}" target="_blank" rel="noopener">{ic("wa")}WhatsApp</a></div>')
    return f'''<section class="page-hero{' short' if short else ''}">
  <div class="bg">{img(p, image, h1, eager=True, sizes="100vw", priority=True)}</div>
  <div class="wrap">
    {crumbs(p, trail)}
    <p class="eyebrow" style="margin-top:26px">{eyebrow}</p>
    <h1>{h1}</h1>
    <p class="lead">{lead}</p>
    {acts}
  </div>
  {b}
</section>'''


def faq_block(items, title="Întrebări frecvente", eyebrow="Răspunsuri rapide", cls="ivory", intro=None, link=None):
    qs = "".join(f'<details class="rv"><summary>{e(q)}<i aria-hidden="true"></i></summary><div class="answer"><p>{e(a)}</p></div></details>' for q, a in items)
    intro = intro or "Tot ce ne întreabă cel mai des viitorii miri și organizatorii de evenimente. Nu găsiți răspunsul? Sunați-ne."
    more = f'<p><a class="link-arrow" href="{link}">Toate întrebările {ic("arrow")}</a></p>' if link else ""
    return f'''<section class="section {cls}" id="faq">
  <div class="wrap faq-grid">
    <div class="sticky rv">
      <p class="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p class="lead">{intro}</p>
      <p><a class="btn btn-dark" href="tel:{PHONE_E}">{ic("phone")}{PHONE_H}</a></p>
      {more}
    </div>
    <div class="faq">{qs}</div>
  </div>
</section>'''


def contact_section(p, h2="Programează o vizionare", eyebrow="Hai să ne cunoaștem"):
    opts = "".join(f"<option>{x}</option>" for x in ["Nuntă", "Botez", "Majorat", "Aniversare", "Eveniment corporate", "Altul"])
    return f'''<section class="section dark grain" id="vizionare">
  <div class="wrap contact">
    <div class="rv">
      <p class="eyebrow">{eyebrow}</p>
      <h2>{h2}</h2>
      <p class="lead">Veniți să vedeți saloanele, terasa și grădina pe viu. Vă arătăm tot complexul și vă pregătim o ofertă personalizată pentru data voastră.</p>
      <div class="contact-info">
        <a href="tel:{PHONE_E}"><span class="ic">{ic("phone")}</span><span><small>Telefon</small>{PHONE_H}</span></a>
        <a href="{WA}" target="_blank" rel="noopener"><span class="ic">{ic("wa")}</span><span><small>WhatsApp</small>Scrie-ne acum</span></a>
        <a href="mailto:{EMAIL}"><span class="ic">{ic("mail")}</span><span><small>E-mail</small>{EMAIL}</span></a>
        <a href="{MAPS}" target="_blank" rel="noopener"><span class="ic">{ic("pin")}</span><span><small>Adresă</small>{STREET}, {CITY}</span></a>
      </div>
    </div>
    <form class="form enquiry rv" data-delay="120" novalidate>
      <h3>Cerere de vizionare</h3>
      <div class="row">
        <label><span>Nume</span><input name="nume" autocomplete="name" required></label>
        <label><span>Telefon</span><input name="telefon" type="tel" autocomplete="tel" required></label>
      </div>
      <div class="row">
        <label><span>Tip eveniment</span><select name="eveniment">{opts}</select></label>
        <label><span>Data evenimentului</span><input name="data" type="date"></label>
      </div>
      <label><span>Număr estimat de invitați</span><input name="invitati" type="number" min="10" max="1000" inputmode="numeric" placeholder="ex. 180"></label>
      <label><span>Mesaj (opțional)</span><textarea name="mesaj" placeholder="Spuneți-ne câteva cuvinte despre evenimentul visat…"></textarea></label>
      <div class="btns">
        <button class="btn btn-gold" type="submit">{ic("wa")}Trimite pe WhatsApp</button>
        <button class="btn btn-line" type="button" data-mail>{ic("mail")}Trimite pe e-mail</button>
      </div>
      <p class="note">Răspundem de obicei în aceeași zi. Datele sunt folosite doar pentru a vă contacta în legătură cu evenimentul.</p>
    </form>
  </div>
  <div class="wrap" style="margin-top:clamp(40px,6vw,70px)">
    <div class="map rv" style="background-image:url('{p}img/facade-night-sm.webp')">
      <button type="button" data-src="{MAP_EMBED}">{ic("pin")}<span>Vezi pe hartă · {STREET}</span></button>
    </div>
  </div>
</section>'''


def cta_band(p, image="hero-couple", title="Unele zile trec. <em>Altele rămân cu voi.</em>"):
    return f'''<section class="cta-band">
  {img(p, image, "Miri la Emerald Luxury Events", sizes="100vw")}
  <div class="wrap rv">
    <div class="divider">{ic("diamond")}</div>
    <h2>{title}</h2>
    <div class="hero-actions">
      <a class="btn btn-gold" href="{p}contact/#vizionare">{ic("calendar")}Programează vizionare</a>
      <a class="btn btn-ghost" href="tel:{PHONE_E}">{ic("phone")}{PHONE_H}</a>
    </div>
  </div>
</section>'''


def space_cards(p, ids, cls="ivory", title="Descoperă și alte spații", eyebrow="Complexul Emerald"):
    cards = ""
    for i in ids:
        s = BY_ID[i]
        tag = f'până la {s["cap"]} invitați' if s["cap"] else s["kind"]
        cards += f'''<a class="card rv" href="{p}{s["slug"]}/">{img(p, s["img"], s["name"], sizes="(max-width: 640px) 100vw, 33vw")}
  <div class="body"><span class="tag">{tag}</span><h3>{s["name"]}</h3><p>{s["short"]}</p><span class="link-arrow">Descoperă {ic("arrow")}</span></div></a>'''
    return f'''<section class="section {cls}">
  <div class="wrap">
    <div class="section-head center rv"><p class="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
    <div class="cards" data-stagger>{cards}</div>
  </div>
</section>'''


def compare_table(p):
    rows = ""
    for s in SPACES:
        cap = f'până la {s["cap"]}' if s["cap"] else "la cerere"
        rows += (f'<tr><th scope="row"><a href="{p}{s["slug"]}/">{s["name"]}</a></th><td>{s["kind"]}</td>'
                 f'<td class="num">{cap}</td><td>{", ".join(x[0].lower() + x[1:] for x in s["ideal"][:3])}</td></tr>')
    return f'''<div class="table-wrap rv"><table class="compare">
  <caption class="sr-only">Spațiile Emerald Luxury Events, capacitate și utilizare</caption>
  <thead><tr><th scope="col">Spațiu</th><th scope="col">Tip</th><th scope="col">Invitați</th><th scope="col">Ideal pentru</th></tr></thead>
  <tbody>{rows}</tbody></table></div>'''


def inclusive_grid(items=INCLUSIVE):
    out = ""
    for icon, h, lis in items:
        out += f'<div class="incl-item rv">{ic(icon)}<h3>{h}</h3><ul>{"".join(f"<li>{x}</li>" for x in lis)}</ul></div>'
    return f'<div class="incl" data-stagger>{out}</div>'


def steps_block():
    s = "".join(f'<div class="step rv"><div class="num">{i}</div><h3>{h}</h3><p>{t}</p></div>' for i, (h, t) in enumerate(STEPS, 1))
    return f'<div class="steps" data-stagger>{s}</div>'


def tldr(rows, title="Pe scurt"):
    dl = "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in rows)
    return f'<aside class="tldr rv" aria-label="{title}"><h2>{title}</h2><dl>{dl}</dl></aside>'


def ticks(items):
    return '<ul class="ticks">' + "".join(f"<li>{ic('check')}<span>{x}</span></li>" for x in items) + "</ul>"


# ---------------------------------------------------------------- pages
def home():
    slug = ""
    title = "Sală de nuntă și evenimente Târgu Mureș | Emerald Luxury Events"
    desc = "Complex de evenimente în Târgu Mureș: 4 saloane (120–550 invitați), terasă, grădină și boutique hotel. Nunți, botezuri, majorate și evenimente corporate all inclusive. Programează o vizionare."

    def body(p):
        facts = [("4", "saloane"), ("550", "invitați maxim"), ("7", "spații"), ("1", "boutique hotel")]
        hall_links = "".join(
            f'<li><a href="{p}{s["slug"]}/" data-hall="{s["id"]}"{" class=\"on\"" if i == 0 else ""}><span class="name">{s["name"]}</span>'
            f'<span class="cap"><b>{s["cap"]}</b>invitați</span></a></li>' for i, s in enumerate(HALLS))
        hall_figs = "".join(
            f'<figure data-hall="{s["id"]}"{" class=\"on\"" if i == 0 else ""}>{img(p, s["img"], s["name"] + " – salon de evenimente Târgu Mureș", sizes="(max-width: 900px) 100vw, 55vw")}'
            f'<figcaption><b>{s["name"]}</b>{s["tag"]}</figcaption></figure>' for i, s in enumerate(HALLS))
        planner_data = {
            "halls": [{"id": s["id"], "name": s["name"], "cap": s["cap"], "url": f'{p}{s["slug"]}/',
                       "img": f'{p}img/{s["img"]}-sm.webp', "blurb": s["short"]} for s in sorted(HALLS, key=lambda x: x["cap"])],
            "types": {"nunta": "Nuntă", "botez": "Botez", "majorat": "Majorat / aniversare", "corporate": "Eveniment corporate"},
            "prefer": {"botez": ["gourmet", "diamond"], "majorat": ["gourmet", "diamond"], "corporate": ["diamond", "gold", "sapphire"]},
        }
        types = "".join(
            f'<a class="type rv" href="{p}{u}">{ic(i)}<h3>{h}</h3><p>{t}</p><span class="link-arrow">Află mai mult {ic("arrow")}</span></a>'
            for i, h, t, u in TYPES)
        rail_items = ["g03", "dance-1", "g16", "sapphire-3", "g01", "terasa-2", "cake-1", "g10", "gradina-3", "g21", "hotel", "g13"]
        alts = {x[0]: x[1] for x in GALLERY}
        rail = "".join(thumb_btn(p, n, alts.get(n, "Eveniment la Emerald"), "rail") for n in rail_items)
        rail_dup = "".join(f'<button type="button" tabindex="-1" aria-hidden="true">{img(p, n, "", sizes="360px")}</button>' for n in rail_items)
        outdoor = "".join(
            f'''<a class="card rv" href="{p}{BY_ID[i]["slug"]}/">{img(p, BY_ID[i]["img"], BY_ID[i]["name"], sizes="(max-width: 640px) 100vw, 33vw")}
  <div class="body"><span class="tag">{BY_ID[i]["kind"]}</span><h3>{BY_ID[i]["name"]}</h3><p>{BY_ID[i]["short"]}</p><span class="link-arrow">Descoperă {ic("arrow")}</span></div></a>'''
            for i in ("terasa", "gradina", "hotel"))
        marquee_words = ["Nunți", "Botezuri", "Majorate", "Aniversări", "Gale", "Evenimente corporate", "Ședințe foto", "Recepții"]
        mq = "".join(f"<span>{w}</span>" for w in marquee_words)

        return f'''
<section class="hero">
  <div class="hero-media">
    <video muted loop playsinline autoplay preload="none" poster="{p}media/hero-poster.webp" data-lg="{p}media/hero.mp4" data-sm="{p}media/hero-sm.mp4" aria-hidden="true"></video>
  </div>
  <canvas id="sparkles" aria-hidden="true"></canvas>
  <div class="wrap hero-inner">
    <h1>
      <span class="eyebrow">Sală de nunți & evenimente · Târgu Mureș</span>
      <span class="display"><span class="line"><span>Evenimente</span></span><span class="line"><span><em class="gold-text">care rămân.</em></span></span></span>
    </h1>
    <div class="hero-row">
      <p class="lead">Patru saloane de lux, terasă, grădină și boutique hotel — într-un singur loc, pe str. Gheorghe Doja 155. De la sosirea invitaților până la ultimul dans, noi ne ocupăm de tot.</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="{p}contact/#vizionare">{ic("calendar")}Programează vizionare</a>
        <a class="btn btn-ghost" href="#saloane">{ic("diamond")}Descoperă saloanele</a>
      </div>
    </div>
    <div class="hero-facts">{"".join(f"<div><strong>{a}</strong><span>{b}</span></div>" for a, b in facts)}</div>
  </div>
  <div class="scroll-cue" aria-hidden="true">Scroll</div>
</section>

<div class="marquee" aria-hidden="true"><div class="track">{mq}{mq}</div></div>

<section class="section paper" id="poveste">
  <div class="wrap story">
    <div class="story-media">
      <figure class="f1 rv-img">{img(p, "facade-night", "Complexul Emerald Luxury Events din Târgu Mureș, luminat noaptea", sizes="(max-width: 900px) 90vw, 45vw")}</figure>
      <figure class="f2 rv-img" data-delay="200">{img(p, "g03", "Mireasă în Grădina Emerald", sizes="(max-width: 900px) 50vw, 24vw")}</figure>
      <svg class="stamp" viewBox="0 0 200 200" aria-hidden="true"><defs><path id="c" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs><circle cx="100" cy="100" r="99" fill="#06261c"/><text font-family="Jost" font-size="15" letter-spacing="5.5" fill="#e6cf97"><textPath href="#c">EMERALD · LUXURY EVENTS · TÂRGU MUREȘ ·</textPath></text><g transform="translate(76 74) scale(2)" fill="none" stroke="#c9a45c" stroke-width="1.2">{ICON_PATHS["diamond"]}</g></svg>
    </div>
    <div class="rv">
      <p class="eyebrow">Povestea Emerald</p>
      <h2>Un singur loc pentru <em>întreaga</em> poveste.</h2>
      <p class="lead">Emerald Luxury Events este un complex de evenimente din Târgu Mureș care reunește patru saloane elegante, o terasă în aer liber, o grădină pentru ședințe foto și un boutique hotel.</p>
      <p>Mai mult decât o locație, Emerald este un concept complet — design, servicii și atmosferă. Ne ocupăm de fiecare detaliu, de la primul pahar de șampanie la întâmpinare până la ultimul dans, ca voi să vă bucurați de zi fără grija organizării.</p>
      <blockquote class="quote">„Eleganța stă în detalii — iar detaliile sunt treaba noastră.”</blockquote>
      <a class="link-arrow" href="{p}despre-noi/">Despre noi {ic("arrow")}</a>
    </div>
  </div>
</section>

<section class="section dark grain" id="saloane">
  <div class="wrap">
    <div class="section-head rv"><p class="eyebrow">Saloanele noastre</p><h2>Patru saloane. <em class="gold-text">Patru stări.</em></h2>
      <p class="lead">De la 120 la 550 de invitați — fiecare salon are personalitatea lui. Alegeți salonul care vi se potrivește.</p></div>
    <div class="halls">
      <ul class="hall-list rv">{hall_links}</ul>
      <div class="hall-stage rv">{hall_figs}</div>
    </div>
    <div class="stats rv" style="margin-top:clamp(60px,8vw,110px)">
      <div class="stat"><strong class="gold-text" data-count="550">550</strong><span>locuri în Sapphire</span></div>
      <div class="stat"><strong class="gold-text" data-count="4">4</strong><span>saloane</span></div>
      <div class="stat"><strong class="gold-text" data-count="7">7</strong><span>spații într-un complex</span></div>
      <div class="stat"><strong class="gold-text" data-count="20">20</strong><span>+ servicii incluse</span></div>
    </div>
  </div>
</section>

<section class="section ivory">
  <div class="wrap">
    <div class="section-head center rv"><p class="eyebrow">Dincolo de saloane</p><h2>Terasă, grădină și <em>hotel</em></h2>
      <p class="lead">Ședința foto în grădină, cina pe terasă și cazarea în hotel — fără niciun drum în plus.</p></div>
    <div class="cards" data-stagger>{outdoor}</div>
  </div>
</section>

<section class="section paper" id="planificator">
  <div class="wrap">
    <div class="planner rv" id="planner">
      <div class="planner-form">
        <p class="eyebrow">Planificator</p>
        <h2>Găsește salonul <em>potrivit</em></h2>
        <p style="color:var(--muted)">Alegeți tipul evenimentului și numărul de invitați. Vă recomandăm instant spațiul ideal.</p>
        <div class="field"><div class="label">Tip eveniment</div>
          <div class="chips" role="group" aria-label="Tip eveniment">
            <button class="chip" type="button" data-type="nunta" aria-pressed="true">Nuntă</button>
            <button class="chip" type="button" data-type="botez" aria-pressed="false">Botez</button>
            <button class="chip" type="button" data-type="majorat" aria-pressed="false">Majorat / aniversare</button>
            <button class="chip" type="button" data-type="corporate" aria-pressed="false">Corporate</button>
          </div></div>
        <div class="field"><label for="guests">Număr de invitați <output for="guests">180</output></label>
          <input id="guests" type="range" min="20" max="550" step="10" value="180"></div>
        <p style="font-size:.85rem;color:var(--muted);margin:0">Pentru terasă, grădină și cazare, întrebați-ne la vizionare.</p>
      </div>
      <div class="planner-result" id="planner-result" aria-live="polite">
        <img src="{p}img/gold-sm.webp" alt="Gold Ballroom" width="800" height="800">
        <div class="inner">
          <span class="match">Nuntă · 180 invitați</span>
          <h3>Gold Ballroom</h3>
          <p>{BY_ID["gold"]["short"]}</p>
          <div class="space-meta"><span class="pill" style="background:transparent;color:var(--gold-2)">{ic("users")}<span class="cap-v">până la 300 de locuri</span></span></div>
          <div class="alts"></div>
          <div class="btns"><a class="btn btn-gold wa" href="{WA}" target="_blank" rel="noopener">{ic("wa")}Cere ofertă</a><a class="btn btn-ghost see" href="{p}gold-ballroom/">Vezi salonul</a></div>
        </div>
      </div>
    </div>
    <script type="application/json" id="planner-data">{json.dumps(planner_data, ensure_ascii=False)}</script>
  </div>
</section>

<section class="section emerald grain" id="experienta">
  <div class="wrap">
    <div class="section-head center rv"><p class="eyebrow">Servicii all inclusive</p><h2>Totul inclus. <em class="gold-text">Nimic lăsat la voia întâmplării.</em></h2>
      <p class="lead">Un singur pachet care acoperă fiecare detaliu: meniu, băuturi nelimitate, torturi, efecte speciale, decor și cameră de hotel pentru miri.</p></div>
    {inclusive_grid()}
    <p class="center rv" style="margin-top:44px"><a class="btn btn-ghost" href="{p}servicii-all-inclusive/">Vezi toate serviciile {ic("arrow")}</a></p>
  </div>
</section>

<section class="section ivory">
  <div class="wrap">
    <div class="section-head center rv"><p class="eyebrow">Cum lucrăm</p><h2>De la vizionare la <em>ultimul dans</em></h2></div>
    {steps_block()}
  </div>
</section>

<section class="section paper">
  <div class="wrap">
    <div class="section-head rv"><p class="eyebrow">Ce sărbătorim</p><h2>Orice ocazie merită <em>un cadru pe măsură</em></h2></div>
    <div class="types" data-stagger>{types}</div>
  </div>
</section>

<section class="section dark tight" id="galerie">
  <div class="wrap section-head" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:20px">
    <div class="rv"><p class="eyebrow">Galerie</p><h2 style="margin-bottom:0">Momente <em class="gold-text">Emerald</em></h2></div>
    <a class="link-arrow rv" href="{p}galeria-foto-video/">Toată galeria {ic("arrow")}</a>
  </div>
  <div class="photo-rail"><div class="track">{rail}{rail_dup}</div></div>
</section>

<section class="section paper">
  <div class="wrap">
    <div class="section-head rv"><p class="eyebrow">Pe scurt</p><h2>Spațiile Emerald <em>dintr-o privire</em></h2>
      <p class="lead">Capacitatea și utilizarea fiecărui spațiu din complexul Emerald Luxury Events, Târgu Mureș.</p></div>
    {compare_table(p)}
  </div>
</section>

{faq_block(FAQ_GENERAL[:7], link=p + "intrebari-frecvente/")}
{cta_band(p)}
{contact_section(p)}
'''

    graph = base_graph(slug, title, desc, extra=[faq_node(FAQ_GENERAL[:7], f"{SITE}/")] + [space_node(s) for s in SPACES])
    return slug, page(slug, title, desc, body, graph, og_img="hero-couple")


def space_page(s):
    slug = s["slug"] + "/"
    others = [x["id"] for x in SPACES if x["id"] != s["id"]][:3]
    if s["id"] in ("terasa", "gradina", "hotel"):
        others = [x for x in ("sapphire", "gold", "terasa", "gradina", "hotel") if x != s["id"]][:3]
    rows = [("Tip", s["kind"]), ("Capacitate", f'până la {s["cap"]} de invitați' if s["cap"] else "la cerere, în funcție de configurație"),
            ("Ideal pentru", ", ".join(x[0].lower() + x[1:] for x in s["ideal"])),
            ("Locație", f"{STREET}, {CITY}"), ("Servicii", f'<a href="../servicii-all-inclusive/" style="border-bottom:1px solid">All inclusive</a> · cazare în hotel')]

    def body(p):
        gal = "".join(thumb_btn(p, n, f'{s["name"]} – fotografie {i}', s["id"]) for i, n in enumerate(s["gallery"], 1))
        paras = "".join(f"<p>{x}</p>" for x in s["body"][1:])
        return f'''
{page_hero(p, s["hero"], s["kind"] + " · " + CITY, s["name"], s["tag"] + ". " + s["short"], [(s["name"], slug)], badge=s["cap"])}
<section class="section paper">
  <div class="wrap facts">
    <div class="prose rv">
      <p class="eyebrow">Despre spațiu</p>
      <h2>{s["tag"]}</h2>
      <p class="lead">{s["body"][0]}</p>
      {paras}
      <h3>Ideal pentru</h3>
      {ticks(s["ideal"])}
      <h3>Ce face diferența</h3>
      {ticks(s["features"])}
    </div>
    <div>
      {tldr(rows, f'{s["name"]} pe scurt')}
      <p class="updated" style="margin-top:14px">Actualizat: {UPDATED}</p>
    </div>
  </div>
</section>
<section class="section ivory tight">
  <div class="wrap">
    <div class="section-head rv"><p class="eyebrow">Galerie</p><h2>{s["name"]} <em>în imagini</em></h2></div>
    <div class="gal-grid rv">{gal}</div>
  </div>
</section>
{faq_block(s["faq"] + FAQ_GENERAL[9:10], title=f'Întrebări despre {s["name"]}', cls="paper", link=p + "intrebari-frecvente/")}
{space_cards(p, others)}
{contact_section(p, h2=f'Vizitează {s["name"]}')}
'''

    title = s["title"]
    trail = [(s["name"], slug)]
    graph = base_graph(slug, title, s["meta"], trail=trail, extra=[space_node(s), faq_node(s["faq"], f"{SITE}/{slug}")])
    return slug, page(slug, title, s["meta"], body, graph, active="spatii", og_img=s["hero"], preload=s["hero"])


def services_page():
    slug = "servicii-all-inclusive/"
    title = "Servicii all inclusive nunți Târgu Mureș | Emerald"
    desc = "Ce include pachetul all inclusive Emerald: meniu și degustare, băuturi nelimitate, cocktail bar, torturi, fum greu și artificii, decor floral, cameră de hotel pentru miri."

    def body(p):
        return f'''
{page_hero(p, "food-1", "Servicii all inclusive", "Totul inclus. <em>Fără griji.</em>", "Transformăm organizarea nunții într-o experiență lipsită de griji: un singur pachet care acoperă fiecare detaliu, de la primele idei până la ultimul moment al petrecerii.", [("Servicii all inclusive", slug)])}
<section class="section paper">
  <div class="wrap facts">
    <div class="prose rv">
      <p class="eyebrow">Ce înseamnă all inclusive la Emerald</p>
      <h2>Un singur partener pentru <em>întreaga zi</em></h2>
      <p class="lead">Pachetul all inclusive Emerald include locația (salon, terasă, grădină), meniul și degustarea, băuturi nelimitate, torturile, efectele speciale, decorul, accesoriile, personalul și cazarea mirilor.</p>
      <p>Fiecare nuntă este unică, iar echipa noastră se ocupă de tot: logistică, atmosferă, timing și detalii, astfel încât voi să vă bucurați pe deplin de ziua cea mare, fără stres și compromisuri.</p>
      {ticks(["Locații elegante: salon, terasă și grădină", "Meniuri atent create, adaptate gusturilor voastre", "Decoruri personalizate și aranjamente florale", "Coordonare și organizare a evenimentului", "Cazare pentru miri, nași și invitați la Emerald Hotel", "Suport dedicat pe tot parcursul evenimentului"])}
    </div>
    {tldr([("Băuturi", "Alcoolice și nealcoolice, nelimitat"), ("Bar", "Cocktail bar și barmani"), ("Torturi", "Tortul miresei + tortul mirelui (shoturi)"), ("Efecte", "Fum greu, artificii la dans și la tort"), ("Decor", "Flori pentru sală și masa mirilor, covor roșu, lumini"), ("Cazare", "Cameră de hotel pentru miri"), ("Extra", "Degustarea meniului inclusă")], "Pachetul pe scurt")}
  </div>
</section>
<section class="section emerald grain">
  <div class="wrap">
    <div class="section-head center rv"><p class="eyebrow">Lista completă</p><h2>Ce include <em class="gold-text">pachetul</em></h2></div>
    {inclusive_grid()}
  </div>
</section>
<section class="section paper">
  <div class="wrap split">
    <div class="split-media rv-img">{img(p, "dance-1", "Dansul mirilor cu fum greu și artificii la Emerald")}</div>
    <div class="rv">
      <p class="eyebrow">Momente speciale</p>
      <h2>Dansul mirilor, <em>ca în filme</em></h2>
      <p class="lead">Fum greu și artificii reci la dansul mirilor, artificii pentru tort și un ring de dans pregătit pentru fotografiile de neuitat.</p>
      <p>Tortul miresei — în felii sau monoporții — și tortul mirelui, un tort de shoturi, sunt incluse. La fel și candy bar-ul, fruit bar-ul și cafeaua Illy pentru invitați.</p>
    </div>
  </div>
</section>
<section class="section ivory">
  <div class="wrap split rev">
    <div class="split-media rv-img">{img(p, "food-2", "Preparate gourmet servite la Emerald Luxury Events")}</div>
    <div class="rv">
      <p class="eyebrow">Gastronomie & servire</p>
      <h2>Meniuri create <em>pentru toate gusturile</em></h2>
      <p class="lead">Preparatele incluse în meniu sunt variate și atent selecționate. Înainte de eveniment, vă invităm la degustarea meniului.</p>
      <p>Șampanie la întâmpinarea invitaților, alune și saleuri pe mese, cocktail bar și barmani — servire impecabilă de la primul la ultimul invitat.</p>
    </div>
  </div>
</section>
<section class="section paper">
  <div class="wrap"><div class="section-head center rv"><p class="eyebrow">Cum lucrăm</p><h2>Pașii până la <em>ziua cea mare</em></h2></div>{steps_block()}</div>
</section>
{faq_block([FAQ_GENERAL[2], FAQ_GENERAL[3], FAQ_GENERAL[6], FAQ_GENERAL[5], FAQ_GENERAL[4]], link=p + "intrebari-frecvente/")}
{contact_section(p)}
'''

    items = [x for _, _, lis in INCLUSIVE for x in lis]
    svc = {"@type": "Service", "@id": f"{SITE}/{slug}#service", "name": "Pachet all inclusive pentru nunți și evenimente",
           "provider": {"@id": f"{SITE}/#venue"}, "areaServed": {"@type": "City", "name": CITY}, "serviceType": "Organizare nunți și evenimente",
           "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Servicii incluse", "itemListElement": [
               {"@type": "Offer", "itemOffered": {"@type": "Service", "name": x}} for x in items]}}
    faqs = [FAQ_GENERAL[i] for i in (2, 3, 6, 5, 4)]
    graph = base_graph(slug, title, desc, trail=[("Servicii all inclusive", slug)], extra=[svc, faq_node(faqs, f"{SITE}/{slug}")])
    return slug, page(slug, title, desc, body, graph, active="spatii", og_img="food-1", preload="food-1")


def corporate_page():
    slug = "evenimente-corporate/"
    title = "Evenimente corporate Târgu Mureș | Emerald Luxury Events"
    desc = "Locație pentru evenimente corporate în Târgu Mureș: conferințe, lansări, seminarii, gale și petreceri de companie, în saloane de 120–550 de locuri. Organizare, decor și servicii premium."
    faqs = [
        ("Ce tipuri de evenimente corporate organizați?", "Evenimente corporate mici și mari: lansări de produse și branduri, conferințe, seminarii și workshop-uri, petreceri de firmă, aniversări corporate și gale, prezentări, networking și evenimente private de business."),
        ("Câți participanți pot fi găzduiți la un eveniment corporate?", "În funcție de salon, între aproximativ 120 de participanți (Salonul Gourmet) și 550 de participanți (Sapphire Ballroom)."),
        ("Oferiți cazare pentru participanți?", "Da, participanții veniți din alte orașe pot fi cazați la Emerald Boutique Hotel, în același complex."),
    ]

    def body(p):
        uses = ["Evenimente corporate mici și mari", "Lansări de produse și branduri", "Conferințe, seminarii și workshop-uri", "Petreceri de firmă (Crăciun, final de an, team building)", "Aniversări corporate și gale", "Prezentări, networking și evenimente private de business"]
        return f'''
{page_hero(p, "corporate", "Evenimente corporate · " + CITY, "Business, <em>cu stil.</em>", "Un spațiu pentru evenimente corporate de orice dimensiune — de la întâlniri restrânse la evenimente ample, cu vizibilitate ridicată.", [("Evenimente corporate", slug)])}
<section class="section paper">
  <div class="wrap facts">
    <div class="prose rv">
      <p class="eyebrow">Pentru companii</p>
      <h2>Locația care <em>reprezintă brandul</em> vostru</h2>
      <p class="lead">Emerald Luxury Events oferă o locație modernă în Târgu Mureș, care îmbină eleganța cu funcționalitatea, pentru evenimente corporate cu 20 până la 550 de participanți.</p>
      <p>Fiecare eveniment beneficiază de organizare profesionistă, decor personalizat, servicii premium și suport dedicat.</p>
      <h3>Potrivit pentru</h3>
      {ticks(uses)}
    </div>
    {tldr([("Capacitate", "120 – 550 de participanți, în 4 saloane"), ("Formate", "Conferință, gală, lansare, petrecere"), ("Servicii", "Catering, băuturi, decor, coordonare"), ("Cazare", "Emerald Boutique Hotel, în incintă"), ("Locație", f"{STREET}, {CITY}")], "Corporate pe scurt")}
  </div>
</section>
{space_cards(p, ["sapphire", "gold", "diamond"], cls="ivory", title="Saloane pentru evenimente corporate", eyebrow="Alegeți formatul")}
{faq_block(faqs, cls="paper")}
{contact_section(p, h2="Cere o ofertă corporate", eyebrow="Hai să discutăm")}
'''

    ev = {"@type": "Service", "@id": f"{SITE}/{slug}#service", "name": "Organizare evenimente corporate în Târgu Mureș",
          "provider": {"@id": f"{SITE}/#venue"}, "areaServed": {"@type": "City", "name": CITY}, "serviceType": "Evenimente corporate"}
    graph = base_graph(slug, title, desc, trail=[("Evenimente corporate", slug)], extra=[ev, faq_node(faqs, f"{SITE}/{slug}")])
    return slug, page(slug, title, desc, body, graph, active=slug, og_img="corporate", preload="corporate")


def weddings_page():
    slug = "nunti-targu-mures/"
    title = "Nuntă în Târgu Mureș, all inclusive | Emerald Luxury Events"
    desc = "Organizează nunta în Târgu Mureș la Emerald: 4 saloane (120–550 invitați), pachet all inclusive cu băuturi nelimitate, fum greu și artificii, grădină pentru ședința foto și cameră de hotel pentru miri."
    faqs = [FAQ_GENERAL[1], FAQ_GENERAL[2], FAQ_GENERAL[4], FAQ_GENERAL[5], FAQ_GENERAL[8], FAQ_GENERAL[9]]
    day = [
        ("Sosirea invitaților", "Covor roșu, lumini arhitecturale și șampanie la întâmpinare."),
        ("Ședința foto", "Grădina Emerald, cu arcade florale și instalațiile LOVE, la câțiva pași."),
        ("Intrarea mirilor", "Salonul ales, decorat cu aranjamente florale pentru toată sala și masa mirilor."),
        ("Dansul mirilor", "Fum greu și artificii reci — momentul pe care îl veți revedea toată viața."),
        ("Tortul", "Tortul miresei cu artificii și tortul mirelui — un tort de shoturi."),
        ("Noapte bună", "Camera de hotel pentru miri vă așteaptă în același complex."),
    ]

    def body(p):
        tl = "".join(f'<div class="step rv"><div class="num">{i}</div><h3>{h}</h3><p>{t}</p></div>' for i, (h, t) in enumerate(day, 1))
        return f'''
{page_hero(p, "dance-2", "Nunți · " + CITY, "Nunta voastră, <em>fără compromisuri.</em>", "Patru saloane între 120 și 550 de invitați, pachet all inclusive, grădină pentru ședința foto și hotel pentru miri — totul într-un singur loc din Târgu Mureș.", [("Nunți în Târgu Mureș", slug)])}
<section class="section paper">
  <div class="wrap facts">
    <div class="prose rv">
      <p class="eyebrow">De ce Emerald</p>
      <h2>Locația de nuntă care <em>face totul pentru voi</em></h2>
      <p class="lead">Emerald Luxury Events este o locație de nuntă din Târgu Mureș cu servicii all inclusive: alegeți salonul, iar noi ne ocupăm de meniu, băuturi, torturi, decor, efecte speciale și coordonare.</p>
      {ticks(["4 saloane: Sapphire (550), Gold (300), Diamond (200) și Gourmet (120 de invitați)", "Băuturi alcoolice și nealcoolice nelimitat, cocktail bar și barmani", "Fum greu și artificii la dansul mirilor, artificii pentru tort", "Grădină pentru ședința foto chiar la locație", "Cameră de hotel pentru miri, cazare pentru nași și invitați", "Degustarea meniului inclusă"])}
    </div>
    {tldr([("Invitați", "120 – 550, în funcție de salon"), ("Pachet", "All inclusive"), ("Ședință foto", "Grădina Emerald, în incintă"), ("Cazare", "Emerald Boutique Hotel"), ("Vizionare", f'<a href="tel:{PHONE_E}">{PHONE_H}</a>')], "Nunta pe scurt")}
  </div>
</section>
<section class="section ivory">
  <div class="wrap">
    <div class="section-head center rv"><p class="eyebrow">Ziua cea mare</p><h2>Cum arată o nuntă <em>la Emerald</em></h2></div>
    <div class="steps" data-stagger style="grid-template-columns:repeat(3,1fr);row-gap:44px">{tl}</div>
  </div>
</section>
<section class="section paper">
  <div class="wrap">
    <div class="section-head rv"><p class="eyebrow">Alegeți salonul</p><h2>Saloane de nuntă <em>în Târgu Mureș</em></h2></div>
    {compare_table(p)}
  </div>
</section>
{space_cards(p, ["sapphire", "gold", "diamond"], cls="ivory", title="Saloanele pentru nunți", eyebrow="De la 200 la 550 de invitați")}
{faq_block(faqs, cls="paper", link=p + "intrebari-frecvente/")}
{cta_band(p, image="g01", title="Spuneți <em>„da”</em>. Noi ne ocupăm de rest.")}
{contact_section(p)}
'''

    svc = {"@type": "Service", "@id": f"{SITE}/{slug}#service", "name": "Organizare nunți all inclusive în Târgu Mureș",
           "provider": {"@id": f"{SITE}/#venue"}, "areaServed": {"@type": "City", "name": CITY}, "serviceType": "Locație de nuntă"}
    graph = base_graph(slug, title, desc, trail=[("Nunți în Târgu Mureș", slug)], extra=[svc, faq_node(faqs, f"{SITE}/{slug}")])
    return slug, page(slug, title, desc, body, graph, active=slug, og_img="dance-2", preload="dance-2")


def baptism_page():
    slug = "botez-targu-mures/"
    title = "Botez și majorat în Târgu Mureș | Emerald Luxury Events"
    desc = "Restaurant pentru botez și majorat în Târgu Mureș: Salonul Gourmet (120), Diamond Ballroom (200), Gold Ballroom (300) și Terasa Emerald. Meniu, tort, decor și servicii incluse."
    faqs = [
        ("Ce salon recomandați pentru un botez?", "Pentru botezuri recomandăm Salonul Gourmet (până la 120 de invitați) sau Diamond Ballroom (până la 200). Pentru botezuri mai mari, Gold Ballroom găzduiește până la 300 de invitați, iar vara Terasa Emerald oferă o variantă în aer liber."),
        ("Pot organiza un majorat la Emerald?", "Da. Majoratele și aniversările pot fi organizate în Salonul Gourmet, Diamond Ballroom sau pe Terasa Emerald, cu decor personalizat pe tematică."),
        ("Decorul poate fi personalizat pe tematică?", "Da. Spațiile pot fi personalizate în funcție de tematică și dorințe — de la baloane și aranjamente florale până la iluminare ambientală."),
        FAQ_GENERAL[9],
    ]

    def body(p):
        return f'''
{page_hero(p, "gourmet-2", "Botezuri · Majorate · Aniversări", "Petreceri de familie, <em>cu stil.</em>", "Spații calde și elegante pentru botezuri, majorate și aniversări în Târgu Mureș — de la 120 de invitați în Salonul Gourmet la 300 în Gold Ballroom.", [("Botezuri & majorate", slug)])}
<section class="section paper">
  <div class="wrap facts">
    <div class="prose rv">
      <p class="eyebrow">Pentru momentele de familie</p>
      <h2>Botezul și majoratul, <em>într-un cadru de poveste</em></h2>
      <p class="lead">Pentru botez, majorat sau aniversare, Emerald Luxury Events din Târgu Mureș vă pune la dispoziție saloane de 120, 200 și 300 de locuri, plus o terasă în aer liber.</p>
      <p>Lumina naturală, decorurile atent alese și flexibilitatea spațiilor permit personalizarea fiecărui eveniment în funcție de tematică — fie că vă doriți un cadru festiv, fie unul discret și rafinat.</p>
      {ticks(["Salonul Gourmet – până la 120 de invitați, lumină naturală și verdeață", "Diamond Ballroom – până la 200 de invitați, iluminare ambientală", "Gold Ballroom – până la 300 de invitați, accente aurii", "Terasa Emerald – petreceri în aer liber, vara", "Meniu, tort și decor personalizat pe tematică"])}
    </div>
    {tldr([("Saloane", "Gourmet (120), Diamond (200), Gold (300)"), ("În aer liber", "Terasa Emerald"), ("Decor", "Personalizat pe tematică"), ("Locație", f"{STREET}, {CITY}")], "Pe scurt")}
  </div>
</section>
<section class="section ivory tight">
  <div class="wrap gal-grid rv">
    {thumb_btn(p, "g11", "Petrecere de botez la Emerald", "botez")}{thumb_btn(p, "gourmet", "Salonul Gourmet pregătit pentru botez", "botez")}{thumb_btn(p, "g14", "Majorat cu baloane la Emerald", "botez")}{thumb_btn(p, "terasa-2", "Terasa Emerald pentru petreceri de familie", "botez")}{thumb_btn(p, "diamond-2", "Diamond Ballroom", "botez")}{thumb_btn(p, "cake-2", "Moment de tort", "botez")}{thumb_btn(p, "terasa-4", "Detalii de decor", "botez")}
  </div>
</section>
{space_cards(p, ["gourmet", "diamond", "terasa"], cls="paper", title="Spații pentru botez și majorat", eyebrow="Alegeți spațiul")}
{faq_block(faqs, cls="ivory", link=p + "intrebari-frecvente/")}
{contact_section(p)}
'''

    graph = base_graph(slug, title, desc, trail=[("Botezuri & majorate", slug)], extra=[faq_node(faqs, f"{SITE}/{slug}")])
    return slug, page(slug, title, desc, body, graph, active=slug, og_img="gourmet-2", preload="gourmet-2")


def gallery_page():
    slug = "galeria-foto-video/"
    title = "Galerie foto nunți și evenimente | Emerald Târgu Mureș"
    desc = "Fotografii reale de la nunți, botezuri și evenimente organizate la Emerald Luxury Events în Târgu Mureș: saloane, terasă, grădină și hotel."

    def body(p):
        chips = "".join(f'<button class="chip" type="button" data-filter="{k}" aria-pressed="{"true" if k == "all" else "false"}">{v}</button>'
                        for k, v in [("all", "Toate"), ("nunti", "Nunți"), ("saloane", "Saloane"), ("exterior", "Terasă & grădină"), ("hotel", "Hotel"), ("evenimente", "Evenimente")])
        items = "".join(thumb_btn(p, n, a, "gal", extra=f' data-cat="{c}"', cls="rv") for n, a, c in GALLERY)
        return f'''
{page_hero(p, "g01", "Galerie foto & video", "Momente <em>care rămân.</em>", "Câteva dintre poveștile scrise la Emerald — nunți, botezuri, petreceri și seri de neuitat.", [("Galerie foto", slug)], short=True, actions=False)}
<section class="section paper">
  <div class="wrap">
    <div class="filters" role="group" aria-label="Filtrează galeria">{chips}</div>
    <div class="masonry">{items}</div>
    <p class="center rv" style="margin-top:40px"><a class="btn btn-line" href="{IG}" target="_blank" rel="noopener">{ic("ig")}Mai multe pe Instagram</a></p>
  </div>
</section>
<section class="section dark">
  <div class="wrap split">
    <div class="split-media wide rv" style="aspect-ratio:16/9">
      <video controls preload="none" playsinline poster="{p}media/hero-poster.webp" style="width:100%;height:100%;object-fit:cover"><source src="{p}media/hero.mp4" type="video/mp4"></video>
    </div>
    <div class="rv"><p class="eyebrow">Video</p><h2>Sapphire Ballroom <em class="gold-text">în mișcare</em></h2>
      <p class="lead">Detaliile care fac diferența: aranjamentele florale, masa pregătită, lumina caldă a salonului.</p></div>
  </div>
</section>
{cta_band(p, image="dance-3")}
'''

    imgs = {"@type": "ImageGallery", "@id": f"{SITE}/{slug}#gallery", "name": "Galerie Emerald Luxury Events",
            "image": [{"@type": "ImageObject", "contentUrl": f"{SITE}/img/{n}.webp", "caption": a} for n, a, _ in GALLERY]}
    video = {"@type": "VideoObject", "name": "Sapphire Ballroom – Emerald Luxury Events", "description": "Prezentare video a salonului Sapphire Ballroom din Târgu Mureș.",
             "thumbnailUrl": f"{SITE}/media/hero-poster.webp", "contentUrl": f"{SITE}/media/hero.mp4", "uploadDate": "2026-01-15"}
    graph = base_graph(slug, title, desc, trail=[("Galerie foto", slug)], extra=[imgs, video])
    return slug, page(slug, title, desc, body, graph, active=slug, og_img="g01", preload="g01")


def about_page():
    slug = "despre-noi/"
    title = "Despre noi | Emerald Luxury Events Târgu Mureș"
    desc = "Emerald Luxury Events: un concept complet de evenimente în Târgu Mureș – design, servicii și atmosferă. Valorile noastre: excelență, eleganță atemporală, profesionalism, personalizare și respect."
    values = [("star", "Excelență", "Standarde înalte în fiecare detaliu, de la meniu la decor."), ("diamond", "Eleganță atemporală", "Un stil care rămâne frumos și peste ani, în fotografii și în amintiri."),
              ("briefcase", "Profesionalism", "O echipă care coordonează totul, ca voi să nu vă faceți griji."), ("sparkle", "Personalizare", "Fiecare eveniment este construit în jurul vostru."),
              ("heart", "Respect", "Pentru oaspeți, pentru timpul vostru și pentru încrederea acordată.")]

    def body(p):
        v = "".join(f'<div class="type rv">{ic(i)}<h3>{h}</h3><p>{t}</p></div>' for i, h, t in values)
        return f'''
{page_hero(p, "facade-night", "Despre noi", "Mai mult decât <em>o locație.</em>", "Emerald Luxury Events este un concept complet de evenimente — design, servicii și atmosferă — în inima Târgu Mureșului.", [("Despre noi", slug)])}
<section class="section paper">
  <div class="wrap split">
    <div class="split-media rv-img">{img(p, "facade-sign", "Intrarea în complexul Emerald Luxury Events")}</div>
    <div class="rv">
      <p class="eyebrow">Povestea noastră</p>
      <h2>Am creat locul în care <em>ne-am dori</em> să sărbătorim</h2>
      <p class="lead">Emerald Luxury Events găzduiește nunți, botezuri, aniversări și evenimente corporate, punând accent pe eleganță, atenție la detalii și experiențe personalizate.</p>
      <p>Complexul de pe str. Gheorghe Doja 155 reunește patru saloane — Sapphire, Gold, Diamond și Gourmet — Terasa Emerald, Grădina Emerald și Emerald Boutique Hotel. Totul a fost gândit ca o experiență completă: de la sosire până la ultimul dans, oaspeții se bucură de zi, fără grija organizării.</p>
    </div>
  </div>
</section>
<section class="section ivory">
  <div class="wrap">
    <div class="section-head center rv"><p class="eyebrow">Valorile noastre</p><h2>Ce ne <em>definește</em></h2></div>
    <div class="types" data-stagger>{v}</div>
  </div>
</section>
<section class="section dark grain" id="familia">
  <div class="wrap split rev">
    <div class="split-media rv-img">{img(p, "family", "Familia Emerald")}</div>
    <div class="rv">
      <p class="eyebrow">Familia Emerald</p>
      <h2>O echipă, <em class="gold-text">o familie</em></h2>
      <p class="lead">În spatele fiecărui eveniment reușit stă o echipă care pune suflet. Ne cunoașteți la vizionare — și veți vedea de ce oaspeții noștri devin prieteni.</p>
      <p><a class="btn btn-gold" href="{p}contact/#vizionare">{ic("calendar")}Programează vizionare</a></p>
    </div>
  </div>
</section>
{space_cards(p, ["sapphire", "gradina", "hotel"])}
'''

    graph = base_graph(slug, title, desc, trail=[("Despre noi", slug)],
                       extra=[{"@type": "AboutPage", "@id": f"{SITE}/{slug}#about", "url": f"{SITE}/{slug}", "about": {"@id": f"{SITE}/#venue"}}])
    return slug, page(slug, title, desc, body, graph, active=slug, preload="facade-night")


def contact_page():
    slug = "contact/"
    title = "Contact & vizionări | Emerald Luxury Events Târgu Mureș"
    desc = f"Programează o vizionare la Emerald Luxury Events: {STREET}, {CITY}. Telefon și WhatsApp {PHONE_H}, e-mail {EMAIL}."

    def body(p):
        return f'''
{page_hero(p, "hero-couple", "Contact", "Hai să ne <em>cunoaștem.</em>", f"Sunați la {PHONE_H}, scrieți-ne pe WhatsApp sau trimiteți formularul — vă confirmăm rapid o vizionare.", [("Contact", slug)], short=True)}
{contact_section(p)}
{faq_block([FAQ_GENERAL[0], FAQ_GENERAL[9], FAQ_GENERAL[4]], cls="paper")}
'''

    cp = {"@type": "ContactPage", "@id": f"{SITE}/{slug}#contact", "url": f"{SITE}/{slug}", "about": {"@id": f"{SITE}/#venue"}}
    graph = base_graph(slug, title, desc, trail=[("Contact", slug)], extra=[cp])
    return slug, page(slug, title, desc, body, graph, active=slug, og_img="hero-couple", preload="hero-couple")


def faq_page():
    slug = "intrebari-frecvente/"
    title = "Întrebări frecvente | Emerald Luxury Events Târgu Mureș"
    desc = "Răspunsuri despre Emerald Luxury Events: capacitatea saloanelor, ce include pachetul all inclusive, prețuri, cazare, degustare, botezuri, evenimente corporate și vizionări."
    allq = list(FAQ_GENERAL)
    for s in SPACES:
        for q in s["faq"]:
            if q not in allq:
                allq.append(q)

    def body(p):
        return f'''
{page_hero(p, "sapphire-3", "Întrebări frecvente", "Tot ce vreți <em>să știți.</em>", "Răspunsuri clare la cele mai frecvente întrebări despre saloane, servicii, prețuri și vizionări.", [("Întrebări frecvente", slug)], short=True, actions=False)}
{faq_block(allq, title="Întrebări & răspunsuri", eyebrow="FAQ", cls="paper")}
{contact_section(p)}
'''

    graph = base_graph(slug, title, desc, trail=[("Întrebări frecvente", slug)], extra=[faq_node(allq, f"{SITE}/{slug}")])
    return slug, page(slug, title, desc, body, graph, og_img="sapphire-3", preload="sapphire-3")


def not_found():
    def body(p):
        return f'''<section class="page-404 emerald grain"><div class="wrap">
<p class="eyebrow">Pagina nu există</p><h1 class="gold-text">404</h1>
<p class="lead" style="margin:20px auto 30px">Se pare că ați rătăcit drumul spre petrecere. Vă conducem înapoi.</p>
<div class="hero-actions" style="opacity:1;animation:none;justify-content:center"><a class="btn btn-gold" href="/">Pagina principală</a><a class="btn btn-ghost" href="/contact/">Contact</a></div>
</div></section>'''
    html_ = page("", "Pagina nu a fost găsită | Emerald Luxury Events", "Pagina căutată nu există.", body, [org_node()])
    # 404 is served from any depth, so use absolute asset URLs and keep it out of the index
    html_ = html_.replace('href="assets/', 'href="/assets/').replace('src="assets/', 'src="/assets/').replace('="img/', '="/img/') \
                 .replace(', img/', ', /img/').replace('href="site.webmanifest"', 'href="/site.webmanifest"') \
                 .replace('<link rel="canonical" href="https://emeraldluxuryevents.ro/">', '') \
                 .replace("index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", "noindex, follow") \
                 .replace('href="./"', 'href="/"')
    html_ = __import__("re").sub(r'href="((?:[a-z0-9-]+/)+(?:#[a-z]+)?)"', r'href="/\1"', html_)
    return html_


# ---------------------------------------------------------------- extras (SEO / GEO / AEO)
def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def sitemap(slugs):
    imgs_for = {"": ["hero-couple", "facade-night", "sapphire", "gold", "diamond", "gourmet"], "galeria-foto-video/": [g[0] for g in GALLERY]}
    for s in SPACES:
        imgs_for[s["slug"] + "/"] = [s["img"]] + s["gallery"]
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for slug in slugs:
        pr = "1.0" if slug == "" else ("0.9" if slug in ("nunti-targu-mures/", "servicii-all-inclusive/") else "0.8")
        out.append(f"  <url><loc>{SITE}/{slug}</loc><lastmod>{UPDATED}</lastmod><priority>{pr}</priority>")
        for n in imgs_for.get(slug, []):
            out.append(f"    <image:image><image:loc>{SITE}/img/{n}.webp</image:loc></image:image>")
        out.append("  </url>")
    out.append("</urlset>\n")
    return "\n".join(out)


ROBOTS = f"""# Emerald Luxury Events
User-agent: *
Allow: /
Disallow: /_build/

# AI / answer engines are welcome to read and cite this site
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Bingbot
Allow: /

Sitemap: {SITE}/sitemap.xml
"""


def llms_txt():
    spaces = "\n".join(f"- [{s['name']}]({SITE}/{s['slug']}/): {s['kind']}" + (f", până la {s['cap']} de invitați" if s['cap'] else "") + f". {s['short']}" for s in SPACES)
    return f"""# {BRAND}

> Complex de evenimente de lux în {CITY}, România ({STREET}). Patru saloane între 120 și 550 de invitați, terasă în aer liber, grădină pentru ședințe foto și boutique hotel. Nunți, botezuri, majorate, aniversări și evenimente corporate, cu servicii all inclusive.

Contact: telefon/WhatsApp {PHONE_H} ({PHONE_E}), e-mail {EMAIL}. Instagram: {IG} · Facebook: {FB}

## Spații
{spaces}

## Servicii și evenimente
- [Servicii all inclusive]({SITE}/servicii-all-inclusive/): meniu și degustare, băuturi nelimitate, cocktail bar, torturi, fum greu și artificii, decor, cameră de hotel pentru miri.
- [Nunți în Târgu Mureș]({SITE}/nunti-targu-mures/)
- [Botezuri, majorate și aniversări]({SITE}/botez-targu-mures/)
- [Evenimente corporate]({SITE}/evenimente-corporate/)

## Informații
- [Întrebări frecvente]({SITE}/intrebari-frecvente/)
- [Despre noi]({SITE}/despre-noi/)
- [Contact și vizionări]({SITE}/contact/)
- [Galerie foto]({SITE}/galeria-foto-video/)
"""


def llms_full():
    parts = [llms_txt(), "\n## Detalii spații\n"]
    for s in SPACES:
        parts.append(f"### {s['name']}\n" + (f"Capacitate: până la {s['cap']} de invitați.\n" if s["cap"] else "") +
                     "\n".join(s["body"]) + "\nIdeal pentru: " + "; ".join(s["ideal"]) + ".\n")
    parts.append("\n## Ce include pachetul all inclusive\n")
    for _, h, lis in INCLUSIVE:
        parts.append(f"- {h}: " + "; ".join(lis))
    parts.append("\n\n## Întrebări frecvente\n")
    for q, a in FAQ_GENERAL:
        parts.append(f"**{q}**\n{a}\n")
    parts.append(f"\nUltima actualizare: {UPDATED}\n")
    return "\n".join(parts)


MANIFEST = json.dumps({
    "name": BRAND, "short_name": "Emerald", "lang": "ro", "start_url": "/", "display": "standalone",
    "background_color": "#04100c", "theme_color": "#04100c",
    "icons": [{"src": "/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "/img/icon-512.png", "sizes": "512x512", "type": "image/png"}],
}, ensure_ascii=False, indent=2)

HTACCESS = """# Apache: caching, compression, clean URLs
ErrorDocument 404 /404.html
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml text/plain application/xml
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType video/mp4 "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
"""


def main():
    pages = [home(), *[space_page(s) for s in SPACES], services_page(), weddings_page(), baptism_page(),
             corporate_page(), gallery_page(), about_page(), contact_page(), faq_page()]
    for slug, content in pages:
        write(os.path.join(slug, "index.html"), content)
    write("404.html", not_found())
    write("sitemap.xml", sitemap([s for s, _ in pages]))
    write("robots.txt", ROBOTS)
    write("llms.txt", llms_txt())
    write("llms-full.txt", llms_full())
    write("site.webmanifest", MANIFEST)
    write(".htaccess", HTACCESS)
    print(f"Built {len(pages)} pages + 404, sitemap, robots, llms.txt")


if __name__ == "__main__":
    main()
