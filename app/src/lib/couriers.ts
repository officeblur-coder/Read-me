// Livratori: tipuri și mici utilitare comune (recepție + hartă).
export type CourierLoc = { courier_id: string; lat: number; lng: number; accuracy: number | null; battery: number | null; updated_at: string };
export type CourierInfo = { id: string; name: string };
const COLORS = ["#ff7a1a", "#3b82f6", "#16a34a", "#a855f7"];
export const courierColor = (i: number) => COLORS[i % COLORS.length];
export const ago = (iso: string, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 60 ? `acum ${s} s` : s < 3600 ? `acum ${Math.round(s / 60)} min` : `acum ${Math.round(s / 3600)} h`;
};
