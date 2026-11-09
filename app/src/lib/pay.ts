// Plata online cu cardul: funcția Edge „pay” întoarce linkul paginii de plată Stripe.
import { supabase } from "./supabase";

export async function startPayment(token: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("pay", { body: { token } });
  if (data?.url) { location.href = data.url; return ""; }
  let msg = (data as { error?: string } | null)?.error || "";
  // eroarea funcției vine în corpul răspunsului
  try { if (!msg && error && "context" in error) msg = (await (error as { context: Response }).context.json()).error; } catch { /* ignore */ }
  return msg || "Plata nu a putut fi pornită. Încearcă din nou sau alege plata la livrare.";
}
