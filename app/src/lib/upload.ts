import { supabase } from "./supabase";

/** Shrinks a photo in the browser before upload (max 1600 px, JPEG), so the site stays fast. */
export async function uploadImage(file: File, prefix: string): Promise<string> {
  const blob = await resizeImage(file);
  const path = `${prefix}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("menu").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return supabase.storage.from("menu").getPublicUrl(path).data.publicUrl;
}
async function resizeImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, err) => c.toBlob(b => (b ? ok(b) : err(new Error("Poza nu a putut fi procesată."))), "image/jpeg", 0.86));
  } finally { URL.revokeObjectURL(url); }
}

