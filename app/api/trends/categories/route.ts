import { NextResponse } from "next/server";
import { getCategories, saveCategory } from "@/lib/trends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getCategories());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { nome: string; hashtags?: string[]; perfis?: string[] };
    return NextResponse.json(await saveCategory(body));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar." }, { status: 400 });
  }
}
