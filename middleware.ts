import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/** Caminhos abertos: login, páginas que a criadora vê no opt-in e páginas legais. */
const PUBLIC = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/instagram", // início e retorno do login da Meta
  "/conectar/aceite",
  "/conectar/obrigado",
  "/privacidade",
  "/exclusao-de-dados",
  "/icon.png",
];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) {
    if (pathname.startsWith("/equipe") || pathname.startsWith("/api/users")) {
      if (session.role !== "admin") {
        return pathname.startsWith("/api/")
          ? NextResponse.json({ error: "Só a administradora pode fazer isso." }, { status: 403 })
          : NextResponse.redirect(new URL("/", req.url));
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Faça login pra continuar." }, { status: 401 });
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
