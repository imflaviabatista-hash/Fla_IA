import { NextResponse } from "next/server";
import { listCached } from "@/lib/analyze";
import { claudeConfigured } from "@/lib/ai";
import { instagramConfigured } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    items: await listCached(),
    status: { instagram: instagramConfigured(), ai: claudeConfigured() },
  });
}
