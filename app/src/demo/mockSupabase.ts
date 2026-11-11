// Demo build only (vite --mode demo): an in-browser stand-in for the Supabase client.
// Same call shapes the pages use (from/rpc/auth/channel/storage), data kept in sessionStorage,
// so the showcase works on any static host with no backend and no real orders.
import categories from "./seed/categories.json";
import items from "./seed/items.json";
import settings from "./seed/settings.json";
import promos from "./seed/promos.json";
import banners from "./seed/banners.json";

type Row = Record<string, any>;
type DB = Record<string, Row[]>;
const KEY = "lyra-demo-db-v4";
const AUTH = "lyra-demo-session";
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const iso = (ms = Date.now()) => new Date(ms).toISOString();
const DEMO_USER = "00000000-0000-4000-8000-00000000c1ub";
const STAFF_USER = "00000000-0000-4000-8000-0000000057af";

function seedOrders(): Row[] {
  // a lived-in day for the staff screens: one new order ringing, kitchen and road busy, a few delivered
  const m = 60000, now = Date.now();
  const line = (id: string, qty = 1, extra: Row = {}) => {
    const it = (items as Row[]).find(x => x.id === id)!;
    const v = it.variants?.[0];
    return { id, name: it.name_ro, qty, unit: v ? v.p : it.price, variant: v?.l ?? null, grams: v?.g ?? it.grams, hot: it.hot, allergens: it.allergens, category: it.category_id, extras: [], note: "", ...extra };
  };
  const mk = (n: number, o: Row): Row => {
    const sub = o.items.reduce((a: number, l: Row) => a + l.unit * l.qty, 0);
    const fee = o.mode === "ridicare" || sub >= 100 ? 0 : 10;
    return {
      id: uid(), number: n, token: uid(), customer_id: null, email: null, payment: "card", note: null, allergies: [],
      subtotal: sub, discount: 0, discount_label: null, points_used: 0, points_value: 0, delivery_fee: fee, total: sub + fee,
      points_earned: Math.floor(sub + fee), source: "site", reject_reason: null, eta_min: null, accepted_at: null, road_at: null,
      done_at: null, rating: null, credited: false, courier_id: null, courier_name: null, mode: "livrare", ...o,
    };
  };
  return [
    mk(1036, { name: "Andreea M.", phone: "0745 112 908", address: "Str. Trandafirilor 12", status: "new", created_at: iso(now - 0.6 * m), source: "ig",
      items: [line("double-cheese", 2), line("cartofi", 2)], note: "Fără ceapă la un burger, vă rog", allergies: ["lactoza"] }),
    mk(1035, { name: "Bogdan P.", phone: "0722 455 019", address: "Str. Principală 88", status: "prep", eta_min: 35, accepted_at: iso(now - 9 * m), created_at: iso(now - 10 * m),
      items: [line("diavola"), line("classic-smash"), line("cartofi")] }),
    mk(1034, { name: "Ioana R.", phone: "0758 302 771", mode: "ridicare", address: "Ridicare din restaurant", status: "prep", eta_min: 20, accepted_at: iso(now - 14 * m), created_at: iso(now - 15 * m), payment: "cash",
      items: [line("poke-somon"), line("tiramisu")] }),
    mk(1033, { name: "Csaba K.", phone: "0740 980 114", address: "Str. Morii 4", status: "road", eta_min: 40, accepted_at: iso(now - 31 * m), road_at: iso(now - 6 * m), created_at: iso(now - 32 * m),
      courier_id: STAFF_USER, courier_name: "Vlad", items: [line("sushi-boat")] }),
    mk(1032, { name: "Maria S.", phone: "0733 640 210", address: "Str. Libertății 21", status: "done", eta_min: 40, accepted_at: iso(now - 80 * m), road_at: iso(now - 55 * m), done_at: iso(now - 41 * m), created_at: iso(now - 81 * m),
      courier_id: STAFF_USER, courier_name: "Vlad", rating: 5, items: [line("margherita", 2), line("aripioare")] }),
    mk(1031, { name: "Radu T.", phone: "0766 010 332", mode: "ridicare", address: "Ridicare din restaurant", status: "done", eta_min: 25, accepted_at: iso(now - 130 * m), done_at: iso(now - 100 * m), created_at: iso(now - 131 * m),
      rating: 4, items: [line("bbq-bacon", 2)] }),
  ];
}

function fresh(): DB {
  return {
    categories: structuredClone(categories as Row[]),
    items: structuredClone(items as Row[]),
    settings: structuredClone(settings as Row[]),
    promos: structuredClone(promos as Row[]),
    banners: structuredClone(banners as Row[]),
    promo_codes: [
      { code: "LYRA10", percent: 10, category_id: null, label: "-10% la toată comanda", active: true },
      { code: "PRANZ15", percent: 15, category_id: "burger", label: "-15% la Lyra's Burger", active: true },
    ],
    // ca în restaurantul real: -10% la tot meniul la livrare, -15% la ridicare
    item_discounts: [
      { id: "d-liv", name: "10% la tot meniul · livrare", percent: 10, item_ids: [], active: true, starts_at: null, ends_at: null, mode: "livrare", all_items: true, created_at: iso() },
      { id: "d-rid", name: "15% la tot meniul · ridicare", percent: 15, item_ids: [], active: true, starts_at: null, ends_at: null, mode: "ridicare", all_items: true, created_at: iso() },
    ],
    // livratorii și ultima lor poziție (demo: în jurul Târgu Mureș)
    couriers: [{ id: "c-a", name: "Livrator A" }, { id: "c-b", name: "Livrator B" }],
    courier_locations: [
      { courier_id: "c-a", lat: 46.5455, lng: 24.5625, accuracy: 12, battery: 0.82, updated_at: iso() },
      { courier_id: "c-b", lat: 46.5280, lng: 24.5980, accuracy: 18, battery: 0.64, updated_at: iso() },
    ],
    staff: [{ user_id: STAFF_USER, email: "demo@lyrasdelivery.ro", name: "Vlad", role: "admin" }],
    customers: [],
    orders: seedOrders(),
    order_messages: [],
  };
}
let db: DB;
try { db = JSON.parse(sessionStorage.getItem(KEY) || "null") || fresh(); } catch { db = fresh(); }
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ } };

// ---------- realtime ----------
type Listener = { table: string; event: string; cb: (p: Row) => void };
const channels = new Set<Channel>();
class Channel {
  ls: Listener[] = [];
  on(_t: string, f: Row, cb: (p: Row) => void) { this.ls.push({ table: f.table, event: f.event, cb }); return this; }
  subscribe() { channels.add(this); return this; }
}
function emit(table: string, event: string, row: Row) {
  setTimeout(() => channels.forEach(c => c.ls.forEach(l => {
    if (l.table === table && (l.event === "*" || l.event === event)) l.cb({ new: row, eventType: event });
  })), 0);
}

// ---------- the simulated restaurant: client orders move on by themselves ----------
function advance(o: Row) {
  if (!o.demo_auto || o.status === "done" || o.status === "rejected") return;
  const t = Date.now() - new Date(o.created_at).getTime();
  const msg = (body: string, at: number) => db.order_messages.push({ id: uid(), order_id: o.id, body, created_at: iso(new Date(o.created_at).getTime() + at) });
  if (o.status === "new" && !o.offered_at && t > 7000) {
    if (db.settings[0].confirm_eta === false) {
      o.status = "prep"; o.eta_min = 35; o.accepted_at = iso(new Date(o.created_at).getTime() + 7000);
      msg("Am primit comanda ta și am pornit grătarul. Mulțumim!", 7000);
    } else {   // restaurantul propune timpul; clientul răspunde din pagina comenzii
      o.offered_at = iso(new Date(o.created_at).getTime() + 7000); o.offer_eta = 35; o.eta_min = 35;
      msg(`Putem ${o.mode === "livrare" ? "livra" : "pregăti"} comanda în 35 de minute. Confirmă timpul sau anulează comanda.`, 7000);
    }
  }
  if (o.status === "new" && o.offered_at && Date.now() - new Date(o.offered_at).getTime() > (db.settings[0].offer_window_min || 5) * 60000) closeOffer(o, "auto_accepted");
  // după acceptare, restul pașilor curg de la ora acceptării
  const ta = o.accepted_at ? Date.now() - new Date(o.accepted_at).getTime() + 7000 : t;
  if (o.status === "prep" && ta > 30000 && o.mode === "livrare") {
    o.status = "road"; o.road_at = iso(); o.courier_name = "Vlad";
    msg("Vlad a preluat comanda și e pe drum spre tine.", 30000);
  }
  if ((o.status === "road" || o.status === "prep") && ta > 55000) setStatus(o, "done");
}
function closeOffer(o: Row, answer: string) {
  const say = (body: string) => db.order_messages.push({ id: uid(), order_id: o.id, body, created_at: iso() });
  o.offer_answer = answer; o.offer_answered_at = iso();
  if (answer === "cancelled") {
    o.status = "rejected"; o.cancelled_by = "client"; o.reject_reason = "Anulată de client: timpul de livrare nu convine";
    say("Ai anulat comanda. Nu ți-a fost reținută nicio sumă.");
  } else {
    o.status = "prep"; o.accepted_at = iso(); o.eta_min = o.offer_eta;
    say(answer === "accepted" ? "Mulțumim, ai confirmat timpul. Comanda e în bucătărie." : answer === "phone" ? "Timpul a fost confirmat telefonic." : "Timpul a fost confirmat automat.");
  }
  emit("orders", "UPDATE", o);
}
function setStatus(o: Row, status: string) {
  const was = o.status; o.status = status;
  if (status === "road" && !o.road_at) o.road_at = iso();
  if (status === "done" && !o.done_at) o.done_at = iso();
  if (status === "done" && was !== "done" && !o.credited && o.customer_id) {
    const c = db.customers.find(x => x.id === o.customer_id);
    if (c) {
      c.points += o.points_earned; c.lifetime += o.points_earned; c.orders_count += 1; c.spent += o.total;
      c.stars += 1; if (c.stars >= 6) { c.stars = 0; c.free_gift = true; }
    }
    o.credited = true;
  }
}
// demo: livratorul „confirmă” la câteva secunde după atribuire
const tick = () => { db.orders.forEach(advance); db.orders.forEach(o => { if (o.demo_ack && !o.courier_ack_at && Date.now() > o.demo_ack) o.courier_ack_at = iso(); }); save(); };

// ---------- query builder ----------
type Filter = (r: Row) => boolean;
const cmp = (op: string, a: any, b: any) => {
  switch (op) {
    case "eq": return a == b; case "neq": return a != b;
    case "gt": return a > b; case "gte": return a >= b; case "lt": return a < b; case "lte": return a <= b;
    case "is": return b === null || b === "null" ? a == null : a === b;
    case "in": return (b as any[]).map(String).includes(String(a));
  }
  return false;
};
function parseOr(expr: string): Filter {
  const parts: string[] = []; let depth = 0, cur = "";
  for (const ch of expr) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && !depth) { parts.push(cur); cur = ""; } else cur += ch; }
  parts.push(cur);
  const fs = parts.map(p => {
    const [col, op, ...rest] = p.split("."); let v: any = rest.join(".");
    if (op === "in") v = v.replace(/^\(|\)$/g, "").split(",");
    return (r: Row) => r[col] != null && cmp(op, r[col], v);
  });
  return r => fs.some(f => f(r));
}

class Query {
  op: "select" | "insert" | "update" | "delete" = "select";
  payload: any = null; filters: Filter[] = []; sorts: [string, boolean][] = [];
  lim = 0; one: "" | "single" | "maybe" = ""; ret = false;
  constructor(public table: string) {}
  select() { if (this.op !== "select") this.ret = true; return this; }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  upsert(p: any) { return this.insert(p); }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push(r => cmp("eq", r[c], v)); return this; }
  neq(c: string, v: any) { this.filters.push(r => cmp("neq", r[c], v)); return this; }
  gt(c: string, v: any) { this.filters.push(r => cmp("gt", r[c], v)); return this; }
  gte(c: string, v: any) { this.filters.push(r => cmp("gte", r[c], v)); return this; }
  lt(c: string, v: any) { this.filters.push(r => cmp("lt", r[c], v)); return this; }
  lte(c: string, v: any) { this.filters.push(r => cmp("lte", r[c], v)); return this; }
  is(c: string, v: any) { this.filters.push(r => cmp("is", r[c], v)); return this; }
  in(c: string, v: any[]) { this.filters.push(r => cmp("in", r[c], v)); return this; }
  or(expr: string) { this.filters.push(parseOr(expr)); return this; }
  order(c: string, o?: { ascending?: boolean }) { this.sorts.push([c, o?.ascending !== false]); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }
  then<A, B>(ok: (v: { data: any; error: any }) => A, bad?: (e: any) => B) {
    return new Promise<{ data: any; error: any }>(res => setTimeout(() => res(this.run()), 60)).then(ok, bad);
  }
  run(): { data: any; error: any } {
    if (this.table === "orders") tick();
    const t = (db[this.table] ||= []);
    const match = (r: Row) => this.filters.every(f => f(r));
    let out: Row[];
    if (this.op === "insert") {
      out = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(p => ({ id: uid(), created_at: iso(), active: true, ...p }));
      t.push(...out); out.forEach(r => emit(this.table, "INSERT", r));
    } else if (this.op === "update") {
      out = t.filter(match);
      out.forEach(r => {
        const { status, ...rest } = this.payload; Object.assign(r, rest);
        if (status && this.table === "orders") setStatus(r, status); else if (status) r.status = status;
        emit(this.table, "UPDATE", r);
      });
    } else if (this.op === "delete") {
      out = t.filter(match); db[this.table] = t.filter(r => !match(r)); out.forEach(r => emit(this.table, "DELETE", r));
    } else {
      out = t.filter(match);
      for (const [c, asc] of [...this.sorts].reverse()) out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
      if (this.lim) out = out.slice(0, this.lim);
    }
    if (this.op !== "select") save();
    const data = structuredClone(out);
    if (this.one) return data.length ? { data: data[0], error: null } : { data: null, error: this.one === "single" ? { message: "Nu există" } : null };
    return { data: this.op === "select" || this.ret ? data : null, error: null };
  }
}

// ---------- auth ----------
type Session = { user: { id: string; email: string }; access_token: string };
let session: Session | null = null;
try { session = JSON.parse(sessionStorage.getItem(AUTH) || "null"); } catch { /* none */ }
const authLs = new Set<(e: string, s: Session | null) => void>();
function setSession(s: Session | null) {
  session = s;
  try { s ? sessionStorage.setItem(AUTH, JSON.stringify(s)) : sessionStorage.removeItem(AUTH); } catch { /* ignore */ }
  authLs.forEach(f => f(s ? "SIGNED_IN" : "SIGNED_OUT", s));
}
function ensureDemoCustomer(email: string) {
  if (db.customers.some(c => c.id === DEMO_USER)) return;
  // a returning Silver member, so the Lyra Club screens have something to show
  db.customers.push({ id: DEMO_USER, email, name: "", phone: "", addresses: [], allergies: [], points: 340, lifetime: 620, stars: 4,
    free_gift: false, orders_count: 4, spent: 620, marketing_ok: false, created_at: iso(Date.now() - 40 * 864e5), welcome_credit: 50, welcome_used_at: null });
  const past = seedOrders().filter(o => o.status === "done");
  past.forEach((o, i) => { o.customer_id = DEMO_USER; o.number = 980 + i; o.created_at = iso(Date.now() - (6 + i * 9) * 864e5); o.credited = true; });
  db.orders.push(...past); save();
}
const auth = {
  getSession: async () => ({ data: { session }, error: null }),
  onAuthStateChange(cb: (e: string, s: Session | null) => void) { authLs.add(cb); return { data: { subscription: { unsubscribe: () => authLs.delete(cb) } } }; },
  signOut: async () => { setSession(null); return { error: null }; },
  signInWithOtp: async () => ({ data: {}, error: null }),
  verifyOtp: async ({ email }: { email: string }) => {
    ensureDemoCustomer(email);
    setSession({ user: { id: DEMO_USER, email }, access_token: "demo" });
    return { data: { session }, error: null };
  },
  signInWithPassword: async ({ email }: { email: string }) => {
    setSession({ user: { id: STAFF_USER, email }, access_token: "demo" });
    return { data: { session }, error: null };
  },
};

// ---------- server functions ----------
function placeOrder(p: Row) {
  const s = db.settings[0];
  if (!p.name?.trim() || !p.phone?.trim()) throw new Error("Completează numele și telefonul.");
  if (p.mode === "livrare" && !p.address?.trim()) throw new Error("Completează adresa de livrare.");
  if (!p.items?.length) throw new Error("Coșul e gol.");
  const cust = session ? db.customers.find(c => c.id === session!.user.id) : null;
  const lines: Row[] = []; let sub = 0, pack = 0, sgr = 0;
  const dpct = (id: string) => Math.max(0, ...(db.item_discounts || []).filter(d => d.active && (d.all_items || d.item_ids.includes(id)) && (d.mode === "all" || d.mode === p.mode)).map(d => d.percent));
  for (const l of p.items) {
    const it = db.items.find(x => x.id === l.id && x.active);
    if (!it) throw new Error(`Produsul ${l.id} nu mai există în meniu.`);
    if (!it.available) throw new Error(`${it.name_ro} este epuizat azi.`);
    const qty = Math.min(Math.max(l.qty || 1, 1), 50);
    let unit = it.price, variant = null, vi = null, grams = it.grams;
    if (it.variants?.length) { vi = Math.min(Math.max(l.vi || 0, 0), it.variants.length - 1); unit = it.variants[vi].p; variant = it.variants[vi].l; grams = it.variants[vi].g; }
    const pr = l.promo ? db.promos.find(x => x.id === l.promo && x.active && x.item_id === it.id && x.price != null) : null;
    const extras: Row[] = [];
    if (pr) { unit = pr.price; (pr.extras || []).forEach((id: string) => { const e = db.items.find(x => x.id === id); if (e) extras.push({ id, name: e.name_ro, price: 0 }); }); }
    else if (it.kind !== "gift") { const dp = dpct(it.id); if (dp > 0) unit = Math.round(unit * (100 - dp)) / 100; }
    if (!pr) (l.extras || []).forEach((id: string) => { const e = db.items.find(x => x.id === id && x.active && x.available); if (e) { unit += e.price; extras.push({ id, name: e.name_ro, price: e.price }); } });
    sub += unit * qty;
    sgr += (it.sgr ?? 0) * qty;
    pack += ((it.packaging ?? 2) + extras.reduce((t: number, e: Row) => t + (db.items.find(x => x.id === e.id)?.packaging ?? 2), 0)) * qty;
    lines.push({ id: it.id, name: it.name_ro, qty, unit, variant, vi, grams, hot: it.hot, allergens: it.allergens, category: it.category_id, extras, note: (l.note || "").slice(0, 200), promo: pr ? pr.title : null });
  }
  let disc = 0, label = null;
  const pc = p.code ? db.promo_codes.find(c => c.code === String(p.code).toUpperCase() && c.active) : null;
  if (pc) {
    const base = pc.category_id ? lines.filter(l => l.category === pc.category_id && !l.promo).reduce((a, l) => a + l.unit * l.qty, 0) : sub;
    disc = Math.round(base * pc.percent) / 100; label = pc.label;
  }
  if (cust?.free_gift) {
    const g = db.items.find(x => x.id === s.gift_item_id);
    if (g) { lines.push({ id: g.id, name: g.name_ro, qty: 1, unit: 0, gift: true, grams: g.grams, allergens: g.allergens, category: g.category_id, extras: [], note: "" }); cust.free_gift = false; }
  }
  const fee = p.mode === "livrare" && sub < s.free_delivery_over && !(cust && cust.lifetime >= 1500) ? s.delivery_fee : 0;
  let ptsVal = 0;
  if (cust && p.use_points) { ptsVal = Math.min(Math.floor(cust.points / 100) * 10, Math.floor((sub - disc) * 0.5 / 10) * 10); if (ptsVal > 0) cust.points -= ptsVal * 10; }
  let welc = 0;
  if (p.use_welcome && cust && cust.welcome_credit > 0 && !cust.welcome_used_at) {
    if (disc > 0) throw new Error("Bonusul de bun venit nu se cumulează cu un cod de reducere.");
    if (sub < (s.welcome_min ?? 150)) throw new Error(`Bonusul se folosește la o comandă de minim ${s.welcome_min ?? 150} lei.`);
    welc = Math.min(cust.welcome_credit, Math.max(0, sub - disc - ptsVal)); cust.welcome_used_at = iso();
  }
  const total = Math.max(sub - disc - ptsVal - welc + fee, 0) + pack + sgr;
  const mult = !cust ? 1 : cust.lifetime >= 1500 ? 1.1 : cust.lifetime >= 500 ? 1.05 : 1;
  const number = Math.max(1036, ...db.orders.map(o => o.number)) + 1;
  const o: Row = {
    id: uid(), number, token: uid(), customer_id: cust?.id ?? null, name: p.name.trim(), phone: p.phone.trim(), email: p.email || cust?.email || null,
    address: p.mode === "livrare" ? p.address.trim() : "Ridicare din restaurant", mode: p.mode, payment: p.payment || "card", note: p.note || null,
    items: lines, allergies: cust?.allergies || [], subtotal: sub, discount: disc, discount_label: label, points_used: ptsVal * 10, points_value: ptsVal,
    delivery_fee: fee, packaging: pack, sgr, total, points_earned: Math.floor((total - pack - sgr) * mult), source: p.source, status: "new", reject_reason: null, eta_min: null,
    created_at: iso(), accepted_at: null, road_at: null, done_at: null, rating: null, credited: false, courier_id: null, courier_name: null, demo_auto: true, scheduled_for: p.scheduled_for || null, welcome_value: welc,
  };
  db.orders.push(o); save(); emit("orders", "INSERT", o);
  return { id: o.id, number, token: o.token, total };
}

function rpc(fn: string, args: Row = {}): Promise<{ data: any; error: any }> {
  return new Promise(res => setTimeout(() => {
    try {
      tick();
      switch (fn) {
        case "place_order": return res({ data: placeOrder(args.p), error: null });
        case "check_code": {
          const c = db.promo_codes.find(x => x.code === String(args.p_code).trim().toUpperCase() && x.active);
          return res({ data: c ? { code: c.code, percent: c.percent, category_id: c.category_id, label: c.label } : null, error: null });
        }
        case "get_order": {
          const o = db.orders.find(x => x.token === args.p_token);
          if (!o) return res({ data: null, error: { message: "Nu există" } });
          const messages = db.order_messages.filter(m => m.order_id === o.id).map(m => ({ body: m.body, at: m.created_at }));
          const st = db.settings[0];
          return res({ data: structuredClone({ ...o, messages, offer_window: st.offer_window_min || 5, offer_timeout: st.offer_timeout || "accept", server_now: iso() }), error: null });
        }
        case "answer_offer": {
          const o = db.orders.find(x => x.token === args.p_token);
          if (!o || o.status !== "new" || !o.offered_at) return res({ data: null, error: { message: "Ai răspuns deja." } });
          closeOffer(o, args.p_accept ? "accepted" : "cancelled"); save();
          return res({ data: { status: o.status }, error: null });
        }
        case "offer_eta": {
          const o = db.orders.find(x => x.id === args.p_id);
          if (!o || o.status !== "new") return res({ data: null, error: { message: "Comanda a primit deja răspuns." } });
          o.offered_at = iso(); o.offer_eta = args.p_eta; o.eta_min = args.p_eta;
          db.order_messages.push({ id: uid(), order_id: o.id, body: `Putem ${o.mode === "livrare" ? "livra" : "pregăti"} comanda în ${args.p_eta} de minute. Confirmă timpul sau anulează comanda.`, created_at: iso() });
          save(); emit("orders", "UPDATE", o); return res({ data: null, error: null });
        }
        case "couriers": return res({ data: structuredClone(db.couriers || []), error: null });
        case "courier_assign": {
          const o = db.orders.find(x => x.id === args.p_order); const c = (db.couriers || []).find(x => x.id === args.p_courier);
          if (o) { o.courier_id = c ? c.id : null; o.courier_name = c ? c.name : null; o.courier_assigned_at = c ? iso() : null; o.courier_ack_at = null; o.demo_ack = c ? Date.now() + 6000 : null; save(); emit("orders", "UPDATE", o); }
          return res({ data: { courier: c?.name }, error: null });
        }
        case "courier_ack": case "courier_late": case "courier_delivered": {
          const o = db.orders.find(x => x.id === args.p_order);
          if (o) { if (fn === "courier_ack") o.courier_ack_at = iso(); if (fn === "courier_late") { o.courier_late_at = iso(); o.courier_late_count = (o.courier_late_count || 0) + 1; } if (fn === "courier_delivered") setStatus(o, "done"); save(); }
          return res({ data: null, error: null });
        }
        case "courier_ping": return res({ data: null, error: null });
        case "admin_push_overview": return res({ data: { subscribers: 214, with_account: 87, configured: true, recent: [{ title: "Smash Week: -20% la burgeri", body: "", url: "/", sent_to: 209, test: false, created_at: iso(Date.now() - 2 * 864e5) }] }, error: null });
        case "admin_push_send": return res({ data: { sent_to: args.p_test ? 1 : 214 }, error: null });
        case "confirm_offer_phone": { const o = db.orders.find(x => x.id === args.p_id); if (o && o.status === "new" && o.offered_at) { closeOffer(o, "phone"); save(); } return res({ data: null, error: null }); }
        case "rate_order": { const o = db.orders.find(x => x.token === args.p_token); if (o) o.rating = args.p_rating; save(); return res({ data: null, error: null }); }
        case "list_staff": return res({ data: structuredClone(db.staff), error: null });
        case "admin_set_staff": db.staff.push({ user_id: uid(), email: args.p_email, name: args.p_name, role: args.p_role }); save(); return res({ data: null, error: null });
      }
      res({ data: null, error: null });
    } catch (e) { res({ data: null, error: { message: (e as Error).message } }); }
  }, 350));
}

export const supabase = {
  from: (t: string) => new Query(t),
  rpc,
  auth,
  channel: () => new Channel(),
  functions: { invoke: async () => ({ data: null, error: { message: "Plata online nu e disponibilă în demo." } }) },
  removeChannel: (c: Channel) => { channels.delete(c); },
  storage: {
    from: () => ({
      upload: async () => ({ data: {}, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
} as any;
