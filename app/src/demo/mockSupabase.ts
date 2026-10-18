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
const KEY = "lyra-demo-db-v1";
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
  if (o.status === "new" && t > 7000) {
    o.status = "prep"; o.eta_min = 35; o.accepted_at = iso(new Date(o.created_at).getTime() + 7000);
    msg("Am primit comanda ta și am pornit grătarul. Mulțumim!", 7000);
  }
  if (o.status === "prep" && t > 30000 && o.mode === "livrare") {
    o.status = "road"; o.road_at = iso(); o.courier_name = "Vlad";
    msg("Vlad a preluat comanda și e pe drum spre tine.", 30000);
  }
  if ((o.status === "road" || o.status === "prep") && t > 55000) setStatus(o, "done");
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
const tick = () => { db.orders.forEach(advance); save(); };

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
    free_gift: false, orders_count: 4, spent: 620, marketing_ok: false, created_at: iso(Date.now() - 40 * 864e5) });
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
  const lines: Row[] = []; let sub = 0;
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
    else (l.extras || []).forEach((id: string) => { const e = db.items.find(x => x.id === id && x.active && x.available); if (e) { unit += e.price; extras.push({ id, name: e.name_ro, price: e.price }); } });
    sub += unit * qty;
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
  const total = Math.max(sub - disc - ptsVal + fee, 0);
  const mult = !cust ? 1 : cust.lifetime >= 1500 ? 1.1 : cust.lifetime >= 500 ? 1.05 : 1;
  const number = Math.max(1036, ...db.orders.map(o => o.number)) + 1;
  const o: Row = {
    id: uid(), number, token: uid(), customer_id: cust?.id ?? null, name: p.name.trim(), phone: p.phone.trim(), email: p.email || cust?.email || null,
    address: p.mode === "livrare" ? p.address.trim() : "Ridicare din restaurant", mode: p.mode, payment: p.payment || "card", note: p.note || null,
    items: lines, allergies: cust?.allergies || [], subtotal: sub, discount: disc, discount_label: label, points_used: ptsVal * 10, points_value: ptsVal,
    delivery_fee: fee, total, points_earned: Math.floor(total * mult), source: p.source, status: "new", reject_reason: null, eta_min: null,
    created_at: iso(), accepted_at: null, road_at: null, done_at: null, rating: null, credited: false, courier_id: null, courier_name: null, demo_auto: true,
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
          return res({ data: structuredClone({ ...o, messages }), error: null });
        }
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
  removeChannel: (c: Channel) => { channels.delete(c); },
  storage: {
    from: () => ({
      upload: async () => ({ data: {}, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
} as any;
