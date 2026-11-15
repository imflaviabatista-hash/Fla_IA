import { NextResponse } from "next/server";
import { inviteUrl, listConnections, optinConfigured, removeConnection } from "@/lib/optin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = optinConfigured();
  return NextResponse.json({ configured, invite: configured ? inviteUrl() : null, items: await listConnections() });
}

export async function DELETE(req: Request) {
  const username = new URL(req.url).searchParams.get("u") ?? "";
  await removeConnection(username);
  return NextResponse.json({ ok: true });
}
