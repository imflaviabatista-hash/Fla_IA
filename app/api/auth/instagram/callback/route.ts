import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { completeLogin } from "@/lib/optin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.replace(/#_$/, "");
  const state = url.searchParams.get("state");
  const saved = (await cookies()).get("ig_state")?.value;

  if (url.searchParams.get("error")) return NextResponse.redirect(new URL("/conectar/aceite?erro=negado", req.url));
  if (!code || !state || state !== saved) return NextResponse.redirect(new URL("/conectar/aceite?erro=sessao", req.url));

  try {
    const conns = await completeLogin(code);
    const res = NextResponse.redirect(new URL(`/conectar/obrigado?u=${conns.map((c) => c.username).join(",")}`, req.url));
    res.cookies.delete("ig_state");
    return res;
  } catch (e) {
    console.error("instagram login", e);
    return NextResponse.redirect(new URL("/conectar/aceite?erro=meta", req.url));
  }
}
