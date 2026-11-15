import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return NextResponse.json(s ? { email: s.email, name: s.name, role: s.role } : null);
}
