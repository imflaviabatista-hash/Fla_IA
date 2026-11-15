import { cacheImage, imageKey, readImage } from "@/lib/media";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("k") ?? "";
  const src = url.searchParams.get("u") ?? "";
  if (!id) return new Response("faltou k", { status: 400 });

  const key = imageKey(id);
  const img = (await readImage(key)) ?? (src ? await cacheImage(key, src).catch(() => null) : null);
  if (!img) return new Response("imagem indisponível", { status: 404 });

  return new Response(new Uint8Array(img.buf), {
    headers: { "content-type": img.type, "cache-control": "public, max-age=604800, immutable" },
  });
}
