export type Variant = { l: string; lh?: string; p: number; g: string };

export type Category = {
  id: string;
  name_ro: string;
  name_hu: string | null;
  note_ro: string | null;
  note_hu: string | null;
  sort: number;
  active: boolean;
};

export type Item = {
  id: string;
  category_id: string;
  num: number | null;
  name_ro: string;
  name_hu: string | null;
  desc_ro: string | null;
  desc_hu: string | null;
  price: number;
  grams: string | null;
  allergens: string[];
  meat: string | null;
  hot: boolean;
  tags: string[];
  wine: string | null;
  image: string | null;
  variants: Variant[] | null;
  available: boolean;
  active: boolean;
  sort: number;
  packaging: number;     // ambalaj, lei pe bucată
  sgr?: number;          // garanție SGR, lei pe bucată
};

export type Settings = import("./schedule").Hours & {
  welcome_on?: boolean; welcome_lei?: number; welcome_min?: number;   // bonus de bun venit la cont nou
  accepting_orders: boolean;
  confirm_eta?: boolean;
  online_pay_on?: boolean;                     // plata online cu cardul (Stripe) e configurată și pornită                       // clientul confirmă timpul propus de recepție
  offer_window_min?: number;                   // minute pentru răspuns
  offer_timeout?: "accept" | "cancel";         // ce se întâmplă fără răspuns
  delivery_fee: number;
  free_delivery_over: number;
  min_order: number;
};

export type Promo = {
  id: string;
  kicker: string | null;
  title: string;
  body: string | null;
  item_id: string | null;
  extras: string[];
  price: number | null;
  code: string | null;
  image: string | null;
  active: boolean;
  popup: boolean;
  pushed_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type Banner = {
  id: string;
  chip: string | null;
  title: string | null;
  body: string | null;
  cta: string | null;
  image: string | null;
  category_id: string | null;
  active: boolean;
  sort: number;
};

export type OrderLine = {
  id: string;
  name: string;
  qty: number;
  unit: number;
  variant: string | null;
  grams: string | null;
  hot?: boolean;
  allergens: string[];
  extras: { id: string; name: string; price: number }[];
  note: string;
  gift?: boolean;
  promo?: string | null;
  pack?: number;   // ambalaj pe bucată
};

export type OrderStatus = "new" | "prep" | "road" | "done" | "rejected" | "refunded";

export type Order = {
  id: string;
  number: number;
  token: string;
  customer_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  mode: "livrare" | "ridicare";
  payment: "card" | "cash" | "online";
  note: string | null;
  items: OrderLine[];
  allergies: string[];
  subtotal: number;
  discount: number;
  discount_label: string | null;
  points_used: number;
  points_value: number;
  delivery_fee: number;
  packaging?: number;
  sgr?: number;
  total: number;
  points_earned: number;
  source: string | null;
  status: OrderStatus;
  reject_reason: string | null;
  eta_min: number | null;
  created_at: string;
  accepted_at: string | null;
  road_at: string | null;
  done_at: string | null;
  rating: number | null;
  courier_id?: string | null;
  courier_name?: string | null;
  lat?: number | null;
  lng?: number | null;
  zone_name?: string | null;
  scheduled_for?: string | null;   // precomandă: ora aleasă de client
  welcome_value?: number;          // bonus de bun venit folosit (lei)
  offered_at?: string | null;      // recepția a propus timpul și așteaptă clientul
  offer_eta?: number | null;
  offer_answer?: OfferAnswer | null;
  cancelled_by?: string | null;    // 'client' / 'sistem'
  pay_status?: "none" | "pending" | "paid" | "failed" | "refunding" | "refunded";
};

export type OfferAnswer = "accepted" | "cancelled" | "auto_accepted" | "auto_cancelled" | "phone";

export type PublicOrder = Pick<
  Order,
  | "number" | "status" | "mode" | "address" | "items" | "subtotal" | "discount" | "discount_label"
  | "points_value" | "delivery_fee" | "packaging" | "sgr" | "total" | "points_earned" | "eta_min" | "created_at"
  | "accepted_at" | "road_at" | "done_at" | "reject_reason" | "rating" | "scheduled_for" | "welcome_value"
  | "offered_at" | "offer_eta" | "offer_answer" | "cancelled_by" | "payment" | "pay_status"
> & { messages: { body: string; at: string }[]; offer_window?: number; offer_timeout?: "accept" | "cancel"; server_now?: string };

export type CartLine = {
  key: string;
  id: string;
  qty: number;
  vi?: number;
  extras: string[];
  note: string;
  promo?: string;
  promoPrice?: number;
  promoTitle?: string;
};
