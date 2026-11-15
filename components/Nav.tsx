"use client";

import { BookOpen, Flame, ScanSearch, Unlock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Analisar", icon: ScanSearch, match: (p: string) => p === "/" || p.startsWith("/perfil") },
  { href: "/radar", label: "Radar", icon: Flame, match: (p: string) => p.startsWith("/radar") },
  { href: "/conectar", label: "Opt-in", icon: Unlock, match: (p: string) => p.startsWith("/conectar") },
  { href: "/algoritmo", label: "Algoritmo", icon: BookOpen, match: (p: string) => p.startsWith("/algoritmo") },
];

export function Nav() {
  const path = usePathname();
  // a página de aceite é vista pelo criador convidado, sem o menu interno
  const guest = ["/conectar/aceite", "/conectar/obrigado", "/privacidade", "/exclusao-de-dados"].some((p) => path.startsWith(p));

  return (
    <>
      <header className="no-print mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight transition active:scale-95">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-sunset text-sm text-white shadow-lg shadow-pink-500/25">P</span>
          perfilab
        </Link>
        {!guest && (
          <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 text-sm font-semibold backdrop-blur md:flex">
            {ITEMS.map(({ href, label, icon: I, match }) => {
              const on = match(path);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 transition duration-200 active:scale-95 ${on ? "bg-white text-ink shadow" : "text-white/65 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  <I className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {!guest && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {ITEMS.map(({ href, label, icon: I, match }) => {
              const on = match(path);
              return (
                <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition active:scale-90">
                  <span className={`grid h-8 w-12 place-items-center rounded-full transition ${on ? "bg-sunset text-white" : "text-white/55"}`}>
                    <I className="h-[18px] w-[18px]" />
                  </span>
                  <span className={on ? "text-white" : "text-white/50"}>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
