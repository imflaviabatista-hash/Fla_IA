import { Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { compact, pct, times } from "@/lib/format";
import type { Breakdown, PrivateData } from "@/lib/types";
import { Card, SectionTitle, Stat } from "./ui";

function Bars({ title, rows }: { title: string; rows: Breakdown[] }) {
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  return (
    <div>
      <p className="mb-3 text-sm font-bold">{title}</p>
      {rows.length ? (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const share = (r.value / total) * 100;
            return (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-white/75">{r.label}</span>
                  <span className="font-semibold">{pct(share, 0)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full bg-sunset" style={{ width: `${share}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-white/45">A Meta só mostra esse dado pra perfis com mais de 100 seguidores.</p>
      )}
    </div>
  );
}

export function PrivatePanel({ data }: { data: PrivateData }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-sunset">
          <Unlock className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-lg font-bold">Dados internos</h3>
        <span className="text-xs text-white/45">autorizados pelo perfil · últimos {data.periodDays} dias</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Alcance de não seguidores" value={pct(data.nonFollowerShare, 0)} hint={`${compact(data.reachNonFollowers)} pessoas de fora`} accent />
        <Stat label="Alcance médio por post" value={compact(data.avgReach)} hint={data.reachPerFollower != null ? `${times(data.reachPerFollower)} os seguidores` : undefined} />
        <Stat label="Envios por alcance" value={pct(data.sendsPerReach)} hint="quem viu e mandou pra alguém" />
        <Stat label="Salvamentos por alcance" value={pct(data.savesPerReach)} />
        <Stat label="Tempo médio assistido" value={data.avgWatchTimeSec != null ? `${data.avgWatchTimeSec.toLocaleString("pt-BR")}s` : "—"} hint="nos Reels" />
      </div>
      <Card>
        <SectionTitle title="Quem segue o perfil" />
        <div className="grid gap-8 md:grid-cols-3">
          <Bars title="Idade" rows={data.demographics.age} />
          <Bars title="Gênero" rows={data.demographics.gender} />
          <Bars title="Principais cidades" rows={data.demographics.city} />
        </div>
      </Card>
    </div>
  );
}

export function OptinCta() {
  return (
    <Link
      href="/conectar"
      className="card group flex items-center gap-4 p-5 transition hover:bg-white/[0.07] active:scale-[0.99]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.07] transition group-hover:bg-sunset">
        <Lock className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-bold">Quer ver alcance, envios e o público desse perfil?</p>
        <p className="text-sm text-white/55">Manda o link de autorização pro dono do perfil e libera a análise completa.</p>
      </div>
      <span className="hidden text-sm font-semibold text-white/60 group-hover:text-white sm:block">Gerar link →</span>
    </Link>
  );
}
