import { getCurrentContext } from "@/server/auth/session";
import { readPhoto } from "@/server/media/service";

// Fotografiile din panou sunt private: se servesc doar membrilor dealerului proprietar.
// Website-ul public (Etapa 2) va folosi URL-uri CDN pentru autoturismele publicate.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const size = new URL(req.url).searchParams.get("size") === "thumb" ? "thumb" : "full";
  const photo = await readPhoto(ctx, id, size);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
