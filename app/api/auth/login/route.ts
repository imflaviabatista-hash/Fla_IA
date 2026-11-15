import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, authConfigured, signSession } from "@/lib/session";
import { checkLogin, registerFailure, tooManyAttempts } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!authConfigured())
    return NextResponse.json({ error: "O login ainda não foi configurado. Crie ADMIN_EMAIL e ADMIN_PASSWORD na Vercel." }, { status: 503 });

  const { email = "", password = "" } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (await tooManyAttempts(email))
    return NextResponse.json({ error: "Muitas tentativas erradas. Espera 15 minutos e tenta de novo." }, { status: 429 });

  const user = await checkLogin(email, password);
  if (!user) {
    await registerFailure(email);
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(SESSION_COOKIE, await signSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return res;
}
