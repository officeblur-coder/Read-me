// Newsletter: blocurile din editor → HTML de email (tabele + stiluri inline, ca să arate la fel în Gmail, Outlook, iPhone).
// Baza de date înlocuiește apoi {{prenume}}, {{nume}}, {{email}}, {{dezabonare}} pentru fiecare client și adaugă dezabonarea.
import type { Item } from "./types";
import { imgUrl } from "./format";

export type Block =
  | { t: "heading"; text: string; size?: "big" | "mid" }
  | { t: "text"; text: string; align?: "left" | "center" }
  | { t: "image"; src: string; href?: string; alt?: string }
  | { t: "button"; label: string; href: string }
  | { t: "products"; ids: string[]; cta?: string }
  | { t: "coupon"; code: string; note?: string }
  | { t: "divider" }
  | { t: "spacer" };

export type Content = { blocks?: Block[]; text?: string; button?: { label: string; href: string }; html?: string };
export type Mode = "blocks" | "text" | "html";
export type Ctx = { site: string; byId: Record<string, Item>; pct: Record<string, number> };

const C = { bg: "#0b0806", card: "#16110d", ink: "#fbf3ea", mut: "#bba897", dim: "#86756a", o: "#ff7a1a", o2: "#ffb24a", line: "#2a211b" };
const FONT = "Arial,Helvetica,sans-serif";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** href kept byte-identical to links[] so the database can swap it for the tracked link */
const attr = (u: string) => u.trim().replace(/"/g, "%22").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/\s/g, "%20");
const lei = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(".", ",") + " lei";
const cut = (p: number, pct: number) => (pct > 0 ? Math.round(p * (100 - pct)) / 100 : p);

export function absUrl(site: string, u: string) {
  if (!u) return u;
  if (/^(https?:|mailto:|tel:|\{\{)/i.test(u)) return u;
  return site.replace(/\/$/, "") + (u.startsWith("/") ? u : "/" + u);
}
export const productUrl = (site: string, id: string) => `${site.replace(/\/$/, "")}/?s=newsletter&p=${encodeURIComponent(id)}`;

/** **bold**, [text](link), bare links, new lines; variables are left as {{…}} */
function rich(text: string, site: string, color = C.ink) {
  let h = esc(text);
  h = h.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t, u) => `<a href="${attr(absUrl(site, u.replace(/&amp;/g, "&")))}" style="color:${C.o2};text-decoration:underline">${t}</a>`);
  h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_m, pre, u) => `${pre}<a href="${attr(u.replace(/&amp;/g, "&"))}" style="color:${C.o2};text-decoration:underline">${u}</a>`);
  return `<span style="color:${color}">${h.replace(/\n/g, "<br>")}</span>`;
}
const btn = (label: string, href: string, site: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="border-radius:999px;background:${C.o}">` +
  `<a href="${attr(absUrl(site, href))}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`;

function product(it: Item, ctx: Ctx, cta: string, w: number) {
  const full = it.variants?.length ? Math.min(...it.variants.map(v => v.p)) : Number(it.price);
  const pct = ctx.pct[it.id] || 0, price = cut(full, pct);
  const img = imgUrl(it.image), href = productUrl(ctx.site, it.id);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1f1813;border-radius:18px;overflow:hidden">` +
    (img ? `<tr><td style="position:relative"><a href="${attr(href)}"><img src="${attr(absUrl(ctx.site, img))}" width="${w}" alt="${esc(it.name_ro)}" style="display:block;width:100%;max-width:${w}px;height:auto;border:0;border-radius:18px 18px 0 0"></a></td></tr>` : "") +
    `<tr><td style="padding:14px 16px 16px;font-family:${FONT}">` +
    (pct ? `<span style="display:inline-block;background:#e2231a;color:#fff;font-size:12px;font-weight:bold;padding:3px 9px;border-radius:999px;margin-bottom:6px">−${pct}%</span><br>` : "") +
    `<span style="font-size:17px;font-weight:bold;color:${C.ink}">${esc(it.name_ro)}</span><br>` +
    `<span style="font-size:18px;font-weight:bold;color:${pct ? "#ff5a4a" : C.o2}">${it.variants?.length ? "de la " : ""}${lei(price)}</span>` +
    (pct ? ` <span style="font-size:13px;color:${C.dim};text-decoration:line-through">${lei(full)}</span>` : "") +
    `<br><a href="${attr(href)}" style="display:inline-block;margin-top:10px;font-size:14px;font-weight:bold;color:${C.o};text-decoration:none">${esc(cta)} →</a></td></tr></table>`;
}

function block(b: Block, ctx: Ctx): string {
  const pad = (inner: string, p = "10px 32px") => `<tr><td style="padding:${p}">${inner}</td></tr>`;
  switch (b.t) {
    case "heading": return pad(`<h1 style="margin:0;font-family:${FONT};font-size:${b.size === "mid" ? 22 : 30}px;line-height:1.2;font-weight:bold;color:${C.ink};text-align:center">${rich(b.text, ctx.site)}</h1>`, "16px 32px 6px");
    case "text": return pad(`<div style="font-family:${FONT};font-size:16px;line-height:1.6;color:${C.mut};text-align:${b.align || "left"}">${rich(b.text, ctx.site, C.mut)}</div>`);
    case "image": {
      if (!b.src) return "";
      const img = `<img src="${attr(absUrl(ctx.site, b.src))}" width="536" alt="${esc(b.alt || "")}" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:18px">`;
      return pad(b.href ? `<a href="${attr(absUrl(ctx.site, b.href))}">${img}</a>` : img, "12px 32px");
    }
    case "button": return b.label && b.href ? pad(btn(b.label, b.href, ctx.site), "16px 32px") : "";
    case "products": {
      const its = b.ids.map(id => ctx.byId[id]).filter(Boolean);
      if (!its.length) return "";
      const cta = b.cta || "Comandă acum";
      if (its.length === 1) return pad(product(its[0], ctx, cta, 536), "12px 32px");
      let rows = "";
      for (let i = 0; i < its.length; i += 2) {
        rows += `<tr><td width="50%" valign="top" style="padding:6px">${product(its[i], ctx, cta, 260)}</td><td width="50%" valign="top" style="padding:6px">${its[i + 1] ? product(its[i + 1], ctx, cta, 260) : ""}</td></tr>`;
      }
      return pad(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`, "8px 26px");
    }
    case "coupon": return b.code ? pad(`<div style="border:2px dashed ${C.o};border-radius:18px;padding:18px;text-align:center;font-family:${FONT}">` +
      `<div style="font-size:12px;letter-spacing:3px;color:${C.o2};font-weight:bold">COD DE REDUCERE</div>` +
      `<div style="font-size:30px;font-weight:bold;letter-spacing:4px;color:${C.ink};margin:6px 0">${esc(b.code.toUpperCase())}</div>` +
      (b.note ? `<div style="font-size:14px;color:${C.mut}">${rich(b.note, ctx.site, C.mut)}</div>` : "") + `</div>`, "14px 32px") : "";
    case "divider": return pad(`<div style="height:1px;background:${C.line};line-height:1px;font-size:1px">&nbsp;</div>`, "14px 32px");
    case "spacer": return `<tr><td style="height:24px;line-height:24px;font-size:1px">&nbsp;</td></tr>`;
  }
}

function shell(inner: string, preheader: string, site: string) {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Lyra's Delivery</title></head>` +
    `<body style="margin:0;padding:0;background:${C.bg}">` +
    (preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>` : "") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 10px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${C.card};border-radius:24px">` +
    `<tr><td align="center" style="padding:30px 24px 10px"><a href="${attr(site)}" style="text-decoration:none"><div style="font-family:${FONT};font-size:30px;font-weight:bold;letter-spacing:2px;color:${C.ink}">LYRA’S</div>` +
    `<div style="font-family:${FONT};font-size:11px;font-weight:bold;letter-spacing:7px;color:${C.o}">DELIVERY</div></a></td></tr>` +
    inner + `<tr><td style="height:22px;line-height:22px;font-size:1px">&nbsp;</td></tr></table></td></tr></table></body></html>`;
}

/** final HTML, text version and the links to track */
export function renderEmail(mode: Mode, content: Content, preheader: string, ctx: Ctx): { html: string; text: string; links: string[] } {
  let html = "", text = "";
  if (mode === "html") {
    html = content.html || "";
    if (!/<html/i.test(html)) html = `<!doctype html><html><body>${html}</body></html>`;
    text = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h\d|tr|li)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  } else {
    const blocks: Block[] = mode === "text"
      ? [{ t: "text", text: content.text || "" }, ...(content.button?.label && content.button?.href ? [{ t: "button", ...content.button } as Block] : [])]
      : content.blocks || [];
    html = shell(blocks.map(b => block(b, ctx)).join(""), preheader, ctx.site);
    text = blocks.map(b => {
      switch (b.t) {
        case "heading": return b.text.toUpperCase();
        case "text": return b.text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");
        case "button": return `${b.label}: ${absUrl(ctx.site, b.href)}`;
        case "image": return b.href ? absUrl(ctx.site, b.href) : "";
        case "products": return b.ids.map(id => ctx.byId[id]).filter(Boolean).map(it => {
          const full = it.variants?.length ? Math.min(...it.variants.map(v => v.p)) : Number(it.price);
          return `• ${it.name_ro} – ${lei(cut(full, ctx.pct[it.id] || 0))}: ${productUrl(ctx.site, it.id)}`;
        }).join("\n");
        case "coupon": return `Cod de reducere: ${b.code.toUpperCase()}${b.note ? " – " + b.note : ""}`;
        default: return "";
      }
    }).filter(Boolean).join("\n\n");
  }
  const links: string[] = [];
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/gi)) if (!links.includes(m[1]) && !m[1].includes("/dezabonare")) links.push(m[1]);
  return { html, text, links };
}

export const sample = (s: string) => s.replace(/\{\{prenume\}\}/g, "Ana").replace(/\{\{nume\}\}/g, "Ana Pop").replace(/\{\{email\}\}/g, "ana@exemplu.ro").replace(/\{\{dezabonare\}\}/g, "#");

/** starting points for a new campaign */
export const TEMPLATES: { key: string; name: string; desc: string; subject: string; preheader: string; mode: Mode; content: Content }[] = [
  { key: "empty", name: "Gol", desc: "Pornești de la zero", subject: "", preheader: "", mode: "blocks", content: { blocks: [{ t: "heading", text: "Salut, {{prenume}}!" }, { t: "text", text: "" }] } },
  { key: "offer", name: "Ofertă / reducere", desc: "Titlu, text, produse reduse, buton", subject: "{{prenume}}, avem reduceri doar pentru tine 🔥", preheader: "Prețuri mai mici la preferatele tale, doar câteva zile.",
    mode: "blocks", content: { blocks: [
      { t: "heading", text: "Reduceri la preferatele tale 🔥" },
      { t: "text", text: "Salut, {{prenume}}! Săptămâna asta ai **prețuri mai mici** la câteva dintre cele mai comandate preparate Lyra.", align: "center" },
      { t: "products", ids: [], cta: "Comandă acum" },
      { t: "button", label: "Vezi tot meniul", href: "/?s=newsletter" },
    ] } },
  { key: "new", name: "Produs nou", desc: "Poză mare, descriere, buton", subject: "Nou la Lyra: îl încerci primul? 🍔", preheader: "Abia l-am pus în meniu.",
    mode: "blocks", content: { blocks: [
      { t: "image", src: "", href: "/?s=newsletter" },
      { t: "heading", text: "Nou în meniul Lyra" },
      { t: "text", text: "{{prenume}}, l-am gustat de zeci de ori până a ieșit perfect. Acum e rândul tău.", align: "center" },
      { t: "products", ids: [], cta: "Comandă acum" },
    ] } },
  { key: "bonus", name: "Bonus 50 lei", desc: "Invitație să comande, cu bonusul de cont", subject: "{{prenume}}, ai 50 de lei de folosit 🎁", preheader: "Bonusul de bun venit te așteaptă la prima comandă.",
    mode: "blocks", content: { blocks: [
      { t: "heading", text: "Ai 50 de lei cadou 🎁" },
      { t: "text", text: "Salut, {{prenume}}! Bonusul tău de bun venit te așteaptă: **50 de lei reducere** la prima comandă de minim 150 de lei. Se scade automat când comanzi din contul tău.", align: "center" },
      { t: "button", label: "Comandă acum", href: "/?s=newsletter" },
      { t: "text", text: "Livrăm în Târgu Mureș și împrejurimi, zilnic între 11:00 și 22:00. Poți face și precomandă.", align: "center" },
    ] } },
  { key: "text", name: "Mesaj simplu", desc: "Doar text, ca o scrisoare", subject: "", preheader: "", mode: "text", content: { text: "Salut, {{prenume}}!\n\n", button: { label: "", href: "" } } },
];
