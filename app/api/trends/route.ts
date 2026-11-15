import { NextResponse } from "next/server";
import { getTrends } from "@/lib/trends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  try {
    const result = await getTrends(url.searchParams.get("categoria") ?? "", url.searchParams.get("refresh") === "1");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao buscar trends." }, { status: 400 });
  }
}
