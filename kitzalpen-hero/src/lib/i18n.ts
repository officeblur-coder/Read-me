/**
 * Site languages. German and English are authored in the content files; the other six languages are a
 * central dictionary per language (src/i18n/<code>.json) keyed by the English source text. When one of
 * them is active the components render English and this layer swaps every text node and text attribute
 * for its translation (numbers become {0}, {1} … so counts, dates and distances keep working).
 * Anything a dictionary does not contain falls back to English. Elements marked translate="no" or
 * data-i18n-skip are left alone (logo, word-split headings that are translated with tr() first).
 */
import type { Lang } from '../content/hero';

export type SiteLang = 'de' | 'en' | 'nl' | 'ro' | 'hu' | 'cs' | 'pl' | 'sv';
export const SITE_LANGS: { code: SiteLang; name: string; locale: string }[] = [
  { code: 'de', name: 'Deutsch', locale: 'de-AT' },
  { code: 'en', name: 'English', locale: 'en-GB' },
  { code: 'nl', name: 'Nederlands', locale: 'nl-NL' },
  { code: 'ro', name: 'Română', locale: 'ro-RO' },
  { code: 'hu', name: 'Magyar', locale: 'hu-HU' },
  { code: 'cs', name: 'Čeština', locale: 'cs-CZ' },
  { code: 'pl', name: 'Polski', locale: 'pl-PL' },
  { code: 'sv', name: 'Svenska', locale: 'sv-SE' },
];
const CODES = SITE_LANGS.map((l) => l.code);
export const isSiteLang = (x: unknown): x is SiteLang => typeof x === 'string' && (CODES as string[]).includes(x);
/** the authored content language behind a site language */
export const baseLang = (l: SiteLang): Lang => (l === 'de' ? 'de' : 'en');

const loaders = import.meta.glob<{ default: Record<string, string> }>('../i18n/*.json');
let current: SiteLang = 'de';
let dict: Record<string, string> | null = null;

/** locale for dates and numbers, following the active site language */
export const locale = (lang?: Lang) => (lang === 'de' ? 'de-AT' : SITE_LANGS.find((l) => l.code === current)?.locale ?? 'en-GB');
export const siteLang = () => current;

const NUM = /\d+(?:[.,:]\d+)*/g;
/** translate one English string (used directly by word-split headings, and by the DOM layer) */
export function tr(s: string): string {
  if (!dict || !s) return s;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s)!;
  const body = m[2].replace(/\s+/g, ' ');
  if (!body) return s;
  const hit = dict[body];
  if (hit !== undefined) return m[1] + hit + m[3];
  const nums: string[] = [];
  const key = body.replace(NUM, (x) => `{${nums.push(x) - 1}}`);
  if (!nums.length) return s;
  const t = dict[key];
  if (t === undefined) return s;
  return m[1] + t.replace(/\{(\d+)\}/g, (_, i) => nums[Number(i)] ?? '') + m[3];
}

// ---- DOM layer -------------------------------------------------------------------------------------
const ATTRS = ['alt', 'aria-label', 'placeholder', 'title'];
const textOrig = new WeakMap<Text, { src: string; out: string }>();
const attrOrig = new WeakMap<Element, Record<string, { src: string; out: string }>>();
let observer: MutationObserver | null = null;
let titleOrig: { src: string; out: string } | null = null;

const skipped = (el: Element | null) => !!el?.closest('script,style,noscript,[translate="no"],[data-i18n-skip]');

function doText(n: Text) {
  const v = n.nodeValue ?? '';
  const prev = textOrig.get(n);
  if (prev && v === prev.out) return; // our own write
  if (skipped(n.parentElement)) return;
  const out = tr(v);
  textOrig.set(n, { src: v, out });
  if (out !== v) n.nodeValue = out;
}
function doAttr(el: Element, a: string) {
  const v = el.getAttribute(a);
  if (v == null) return;
  const rec = attrOrig.get(el) ?? {};
  if (rec[a] && v === rec[a].out) return;
  if (skipped(el)) return;
  const out = tr(v);
  rec[a] = { src: v, out };
  attrOrig.set(el, rec);
  if (out !== v) el.setAttribute(a, out);
}
function walk(root: Node) {
  if (root.nodeType === 3) { doText(root as Text); return; }
  if (root.nodeType !== 1) return;
  const el = root as Element;
  if (el.closest('[translate="no"],[data-i18n-skip]')) return;
  ATTRS.forEach((a) => el.hasAttribute(a) && doAttr(el, a));
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) doText(n as Text);
    else ATTRS.forEach((a) => (n as Element).hasAttribute(a) && doAttr(n as Element, a));
  }
}
function doTitle() {
  const v = document.title;
  if (titleOrig && v === titleOrig.out) return;
  const out = tr(v);
  titleOrig = { src: v, out };
  if (out !== v) document.title = out;
}
/** put every node back to the English the components rendered */
function restore() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) { const r = textOrig.get(n as Text); if (r && n.nodeValue === r.out) n.nodeValue = r.src; textOrig.delete(n as Text); }
    else { const r = attrOrig.get(n as Element); if (r) { Object.entries(r).forEach(([a, x]) => { if ((n as Element).getAttribute(a) === x.out) (n as Element).setAttribute(a, x.src); }); attrOrig.delete(n as Element); } }
  }
  if (titleOrig && document.title === titleOrig.out) document.title = titleOrig.src;
  titleOrig = null;
}

function start() {
  if (observer) return;
  observer = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target as Text);
      else if (m.type === 'attributes') doAttr(m.target as Element, m.attributeName!);
      else m.addedNodes.forEach((n) => (n.parentNode === document.head || n.parentElement?.tagName === 'TITLE' ? doTitle() : walk(n)));
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  const t = document.querySelector('title');
  if (t) observer.observe(t, { childList: true, characterData: true, subtree: true });
  walk(document.body);
  doTitle();
}
function stop() { observer?.disconnect(); observer = null; }

const cache: Partial<Record<SiteLang, Record<string, string>>> = {};
/** load a language's dictionary (no-op for German/English or when already loaded) */
export async function prepareSiteLang(l: SiteLang) {
  if (l === 'de' || l === 'en' || cache[l]) return;
  const load = loaders[`../i18n/${l}.json`];
  if (load) cache[l] = (await load()).default;
}
/** set the active language's dictionary (call before the components render), the DOM layer is paused */
export function activateSiteLang(l: SiteLang) {
  stop(); restore();
  current = l;
  document.documentElement.lang = l;
  dict = cache[l] ?? null;
}
/** start translating the rendered page (call right after the components rendered) */
export function startSiteLang() { if (dict) start(); }

const STORE = 'kitzalpen-lang';
/** ?lang= → saved choice → browser language → German */
export function initialSiteLang(): SiteLang {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (isSiteLang(q)) return q;
    const s = localStorage.getItem(STORE);
    if (isSiteLang(s)) return s;
  } catch { /* storage blocked */ }
  for (const n of navigator.languages ?? [navigator.language]) {
    const c = n?.slice(0, 2).toLowerCase();
    if (isSiteLang(c)) return c;
  }
  return 'de';
}
export function saveSiteLang(l: SiteLang) { try { localStorage.setItem(STORE, l); } catch { /* ignore */ } }
