import { NextResponse } from "next/server";
import { addUser, listUsers, removeUser } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O middleware já garante que só a administradora chega aqui.

export async function GET() {
  const users = await listUsers();
  return NextResponse.json({
    admin: process.env.ADMIN_EMAIL ?? null,
    users: users.map(({ email, name, role, createdAt }) => ({ email, name, role, createdAt })),
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email: string; name: string; password: string };
    const u = await addUser(body);
    return NextResponse.json({ email: u.email, name: u.name });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao salvar." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const email = new URL(req.url).searchParams.get("email") ?? "";
  await removeUser(email);
  return NextResponse.json({ ok: true });
}
