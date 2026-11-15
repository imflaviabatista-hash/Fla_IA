"use client";

import type { Analysis } from "@/lib/types";

/**
 * Guarda as análises no navegador de quem usa. Na Vercel grátis o servidor
 * não guarda nada de forma permanente, então isso evita rodar a análise de novo
 * ao abrir a apresentação ou voltar no perfil.
 */

const KEY = (h: string) => `perfilab:analysis:${h}`;
const INDEX = "perfilab:index";
const MAX = 15;

export interface IndexItem {
  handle: string;
  name: string;
  avatar: string | null;
  followers: number;
  bubble: number;
  source: Analysis["source"];
  createdAt: string;
}

export function readLocal(handle: string): Analysis | null {
  try {
    const raw = localStorage.getItem(KEY(handle));
    return raw ? (JSON.parse(raw) as Analysis) : null;
  } catch {
    return null;
  }
}

export function readIndex(): IndexItem[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX) ?? "[]") as IndexItem[];
  } catch {
    return [];
  }
}

export function saveLocal(a: Analysis) {
  try {
    const item: IndexItem = {
      handle: a.handle,
      name: a.profile.name,
      avatar: a.profile.avatar,
      followers: a.profile.followers,
      bubble: a.bubble.profileScore,
      source: a.source,
      createdAt: a.createdAt,
    };
    const list = [item, ...readIndex().filter((i) => i.handle !== a.handle)];
    list.slice(MAX).forEach((old) => localStorage.removeItem(KEY(old.handle)));
    localStorage.setItem(INDEX, JSON.stringify(list.slice(0, MAX)));
    localStorage.setItem(KEY(a.handle), JSON.stringify(a));
  } catch {
    /* navegador sem espaço ou em modo privado: segue sem guardar */
  }
}
