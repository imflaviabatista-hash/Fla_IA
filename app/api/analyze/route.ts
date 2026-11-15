import { NextResponse } from "next/server";
import { normalizeHandle, readCached, runAnalysis } from "@/lib/analyze";
import { InstagramError } from "@/lib/instagram";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const handle = normalizeHandle(new URL(req.url).searchParams.get("handle") ?? "");
  const cached = handle ? await readCached(handle) : null;
  if (!cached) return NextResponse.json({ error: "Ainda não tem análise desse perfil." }, { status: 404 });
  return NextResponse.json(cached);
}

export async function POST(req: Request) {
  try {
    const { handle } = (await req.json()) as { handle?: string };
    const analysis = await runAnalysis(handle ?? "");
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof InstagramError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Deu um erro inesperado. Tenta de novo em instantes." }, { status: 500 });
  }
}
