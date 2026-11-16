import sys, os, html as H
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from posts import POSTS
D=os.path.dirname(os.path.abspath(__file__))
F=D+'/fonts'
MONTH={'11':'Nov','12':'Dec'}
CSS=f"""
@font-face{{font-family:Corm;src:url(file://{F}/fontsource-cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2);font-weight:500}}
@font-face{{font-family:Corm;src:url(file://{F}/fontsource-cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2);font-weight:500;font-style:italic}}
@font-face{{font-family:Corm;src:url(file://{F}/fontsource-cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2);font-weight:600}}
@font-face{{font-family:Man;src:url(file://{F}/fontsource-manrope/files/manrope-latin-400-normal.woff2);font-weight:400}}
@font-face{{font-family:Man;src:url(file://{F}/fontsource-manrope/files/manrope-latin-600-normal.woff2);font-weight:600}}
@font-face{{font-family:Man;src:url(file://{F}/fontsource-manrope/files/manrope-latin-700-normal.woff2);font-weight:700}}
*{{margin:0;padding:0;box-sizing:border-box}}
:root{{--peak:#ecdcb4;--cream:#f6f1e7;--ink:#1d1f1e;--gold:#d8bf8a;--gold2:#c7a56c}}
body{{width:1080px;height:1350px;overflow:hidden;font-family:Man;color:#fff;background:var(--ink)}}
.post{{position:relative;width:1080px;height:1350px;overflow:hidden}}
.bg{{position:absolute;inset:0;background-size:cover}}
.shade{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,17,16,.55) 0%,rgba(15,17,16,0) 22%,rgba(15,17,16,0) 42%,rgba(15,17,16,.78) 72%,rgba(15,17,16,.94) 100%)}}
.top{{position:absolute;top:56px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:flex-start}}
.mark{{line-height:0;color:#fff}}
.logo{{width:330px;height:80px;display:block;filter:drop-shadow(0 1px 10px rgba(0,0,0,.35));margin-left:-4px;margin-top:-8px}}
.strip .logo{{filter:none}}
.strip{{--peak:#a5813f}}
.mark b{{display:block;font-family:Corm;font-weight:600;font-size:40px;letter-spacing:.22em}}
.mark i{{display:block;font-style:normal;font-family:Man;font-weight:600;font-size:13px;letter-spacing:.42em;margin-top:8px;opacity:.85}}
.num{{font-family:Man;font-weight:600;font-size:15px;letter-spacing:.3em;opacity:.85;text-align:right;padding-top:6px}}
.num span{{display:block;font-family:Corm;font-size:54px;letter-spacing:0;font-weight:500;line-height:.9;margin-top:6px}}
.bottom{{position:absolute;left:64px;right:64px;bottom:64px}}
.tag{{display:inline-flex;align-items:center;gap:14px;font-weight:700;font-size:19px;letter-spacing:.26em;text-transform:uppercase;color:var(--gold);text-shadow:0 1px 12px rgba(0,0,0,.6)}}
.tag:before{{content:"";width:46px;height:2px;background:var(--gold)}}
h1{{text-shadow:0 2px 24px rgba(0,0,0,.35);font-variant-numeric:lining-nums;font-family:Corm;font-weight:500;font-size:104px;line-height:.98;letter-spacing:-.01em;margin:26px 0 22px}}
h1 em{{font-style:italic;color:var(--gold)}}
.sub{{font-size:28px;line-height:1.4;opacity:.92;max-width:900px}}
.chips{{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}}
.chip{{border:1.5px solid rgba(255,255,255,.55);border-radius:999px;padding:13px 24px;font-size:20px;font-weight:600;letter-spacing:.02em;backdrop-filter:blur(6px);background:rgba(255,255,255,.08)}}
.foot{{margin-top:22px;font-size:17px;opacity:.7;font-style:italic}}
.bar{{margin-top:38px;padding-top:24px;border-top:1px solid rgba(255,255,255,.28);display:flex;justify-content:space-between;font-size:18px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;opacity:.85}}
.cta{{display:inline-block;margin-top:34px;background:var(--gold);color:var(--ink);font-weight:700;font-size:24px;letter-spacing:.14em;text-transform:uppercase;padding:22px 40px;border-radius:999px}}
/* strip */
.strip{{background:var(--cream);color:var(--ink)}}
.strip .mark,.strip .num{{color:var(--ink)}}
.strip .photo{{position:absolute;left:64px;right:64px;top:430px;height:500px;background-size:cover;border-radius:6px;box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}}
.strip .head{{position:absolute;left:64px;right:64px;top:180px}}
.strip h1{{text-shadow:none;font-size:92px;margin:22px 0 0}}
.strip .tag,.strip h1 em{{color:#a5813f;text-shadow:none}}
.strip .tag:before{{background:#a5813f}}
.strip .bottom{{top:975px;bottom:auto}}
.strip .chip{{border-color:rgba(29,31,30,.35);background:none}}
.strip .bar{{border-color:rgba(29,31,30,.2);position:absolute;left:64px;right:64px;bottom:56px;margin:0}}
.strip .sub{{opacity:.8}}
/* stats */
.dense .shade{{background:linear-gradient(180deg,rgba(15,17,16,.55) 0%,rgba(15,17,16,0) 16%,rgba(15,17,16,.25) 32%,rgba(15,17,16,.8) 52%,rgba(15,17,16,.95) 100%)}}
.stats{{display:flex;gap:0;margin:34px 0 10px;border-top:1px solid rgba(255,255,255,.3);border-bottom:1px solid rgba(255,255,255,.3)}}
.stat{{flex:1;padding:26px 0}}
.stat+.stat{{border-left:1px solid rgba(255,255,255,.3);padding-left:30px}}
.stat b{{font-variant-numeric:lining-nums;display:block;font-family:Corm;font-weight:500;font-size:96px;line-height:1;color:var(--gold)}}
.stat span{{font-size:19px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;opacity:.85}}
.rows{{margin-top:22px;display:grid;grid-template-columns:1fr 1fr;column-gap:56px}}
.rows.one{{grid-template-columns:1fr}}
.row{{display:flex;justify-content:space-between;align-items:baseline;padding:13px 0;border-bottom:1px dashed rgba(255,255,255,.28);font-size:24px}}
.row b{{font-weight:600}}
.row span{{color:var(--gold);font-weight:700}}
.rows.one .row{{justify-content:flex-start;gap:34px;font-size:32px;padding:20px 0}}
.rows.one .row span{{font-variant-numeric:lining-nums;font-family:Corm;font-size:54px;font-weight:500;width:190px;line-height:1}}
"""
def page(p):
    img=f"file://{D}/img/{p['img']}"
    dd=p['date'].split('-'); dlabel=f"{int(dd[2])} {MONTH[dd[1]]}"
    top=f"""<div class=top><div class=mark><svg class=logo viewBox="0 0 330 80" role="img" aria-label="KitzAlpen – Pension &amp; Chalet"><g transform="translate(0 12)"><path d="M4 46 L24 18 L32 28 L44 8 L64 46" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"></path><path d="M38 17 L44 8 L50 17 L46 15 L44 18 L41 15 Z" fill="var(--peak)"></path></g><text x="84" y="45" font-family="Corm" font-weight="600" font-size="35" letter-spacing="5.4" fill="currentColor">KITZALPEN</text><line x1="85" y1="59" x2="108" y2="59" stroke="var(--peak)" stroke-width="1.3"></line><text x="116" y="64" font-family="Man" font-weight="700" font-size="13" letter-spacing="3.2" fill="currentColor" opacity=".85">PENSION · CHALET</text></svg></div>
<div class=num>{p['n']:02d} / 15<span></span></div></div>"""
    chips=''.join(f'<div class=chip>{H.escape(c)}</div>' for c in p.get('chips',[]))
    chips=f'<div class=chips>{chips}</div>' if chips else ''
    foot=f"<div class=foot>{H.escape(p['foot'])}</div>" if p.get('foot') else ''
    cta=f"<div class=cta>{p['cta']} →</div>" if p.get('cta') else ''
    bar='<div class=bar><span>Hollersbach im Pinzgau</span><span>kitzalpen.at</span></div>'
    sub=f"<p class=sub>{H.escape(p['sub'])}</p>" if p.get('sub') else ''
    if p['layout']=='strip':
        body=f"""<div class="post strip">{top}
<div class=head><div class=tag>{H.escape(p['tag'])}</div><h1>{p['h1']}</h1></div>
<div class=photo style="background-image:url({img});background-position:{p['pos']}"></div>
<div class=bottom>{sub}{chips}{foot}</div>{bar}</div>"""
    else:
        extra=''
        if p['layout']=='stats':
            if p.get('stats'):
                extra+='<div class=stats>'+''.join(f'<div class=stat><b>{a}</b><span>{b}</span></div>' for a,b in p['stats'])+'</div>'
                extra+='<div class=rows>'+''.join(f'<div class=row><b>{a}</b><span>{b}</span></div>' for a,b in p['rows'])+'</div>'
            else:
                extra+='<div class="rows one">'+''.join(f'<div class=row><span>{a}</span><b>{b}</b></div>' for a,b in p['rows'])+'</div>'
        cls="post dense" if p["layout"]=="stats" else "post"
        body=f"""<div class="{cls}"><div class=bg style="background-image:url({img});background-position:{p['pos']}"></div><div class=shade></div>{top}
<div class=bottom><div class=tag>{H.escape(p['tag'])}</div><h1>{p['h1']}</h1>{sub}{extra}{chips}{foot}{cta}{bar}</div></div>"""
    return f"<!doctype html><html><head><meta charset=utf-8><style>{CSS}</style></head><body>{body}</body></html>"

out=sys.argv[1]; os.makedirs(D+'/html',exist_ok=True)
only=set(int(x) for x in sys.argv[2:])
for p in POSTS:
    if only and p['n'] not in only: continue
    f=f"{D}/html/{p['n']:02d}_{p['date']}.html"; open(f,'w').write(page(p)); print(f)
