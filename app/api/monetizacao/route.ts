import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { claudeConfigured } from "@/lib/ai";
import { normalizeHandle, readCached } from "@/lib/analyze";
import { SECOES, readMonet, runMonet, type Secao } from "@/lib/monetizacao";
import type { Analysis } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const isSecao = (s: unknown): s is Secao => SECOES.includes(s as Secao);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const handle = normalizeHandle(url.searchParams.get("handle") ?? "");
  const out = await Promise.all(SECOES.map((s) => readMonet(handle, s)));
  return NextResponse.json(Object.fromEntries(SECOES.map((s, i) => [s, out[i]])));
}

export async function POST(req: Request) {
  if (!claudeConfigured()) return NextResponse.json({ error: "A IA não está configurada." }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { handle?: string; secao?: string; analysis?: Analysis };
  const handle = normalizeHandle(body.handle ?? "");
  if (!isSecao(body.secao)) return NextResponse.json({ error: "Seção inválida." }, { status: 400 });

  // A análise vem do armazenamento; se não estiver lá, aceita a que o navegador guardou.
  const analysis = (await readCached(handle)) ?? (body.analysis?.handle === handle ? body.analysis : null);
  if (!analysis) return NextResponse.json({ error: "Rode a análise do perfil de novo antes de gerar essa parte." }, { status: 404 });
  if (analysis.source === "demo") return NextResponse.json({ error: "A pesquisa de monetização só funciona com perfis reais." }, { status: 400 });

  try {
    return NextResponse.json(await runMonet(analysis, body.secao));
  } catch (err) {
    console.error("monetização", err);
    const msg =
      err instanceof Anthropic.RateLimitError
        ? "Limite da Anthropic atingido. Espera um pouco e tenta de novo."
        : err instanceof Anthropic.APIError
          ? `Erro da Anthropic (${err.status}): ${String(err.message).slice(0, 200)}`
          : err instanceof Error
            ? err.message
            : "Erro na pesquisa.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
