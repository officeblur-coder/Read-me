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
};

export type Settings = {
  accepting_orders: boolean;
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
};

export type OrderStatus = "new" | "prep" | "road" | "done" | "rejected";

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
};

export type PublicOrder = Pick<
  Order,
  | "number" | "status" | "mode" | "address" | "items" | "subtotal" | "discount" | "discount_label"
  | "points_value" | "delivery_fee" | "total" | "points_earned" | "eta_min" | "created_at"
  | "accepted_at" | "road_at" | "done_at" | "reject_reason" | "rating"
> & { messages: { body: string; at: string }[] };

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
