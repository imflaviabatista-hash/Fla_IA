import { NextResponse } from "next/server";
import { authorizeUrl, newState, optinConfigured } from "@/lib/optin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!optinConfigured()) return NextResponse.redirect(new URL("/conectar?erro=config", req.url));
  const state = newState();
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("ig_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
