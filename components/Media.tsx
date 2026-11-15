"use client";

import { Clapperboard, GalleryHorizontal, Image as ImageIcon, Play } from "lucide-react";
import { useState } from "react";
import type { MediaFormat } from "@/lib/types";

const ICON: Record<MediaFormat, typeof Clapperboard> = {
  REEL: Clapperboard,
  VIDEO: Clapperboard,
  CAROUSEL: GalleryHorizontal,
  IMAGE: ImageIcon,
};

/** Passa a imagem pelo cache da plataforma (os links da Meta expiram). */
export function proxied(id: string, url: string | null) {
  if (!url) return null;
  return `/api/img?k=${encodeURIComponent(id)}&u=${encodeURIComponent(url)}`;
}

/** Link de embed oficial do Instagram, quando o permalink é de um post. */
export function embedUrl(permalink: string) {
  const m = permalink.match(/instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const kind = m[1] === "reels" ? "reel" : m[1];
  return `https://www.instagram.com/${kind}/${m[2]}/embed/captioned/`;
}

interface ThumbPost {
  id: string;
  caption: string;
  format: MediaFormat;
  thumbnail: string | null;
}

const COVERS = [
  "from-[#ff8a5b] via-[#e1306c] to-[#5b2a86]",
  "from-[#3b2667] via-[#7b3fa0] to-[#e1306c]",
  "from-[#f7b733] via-[#fc4a1a] to-[#8a1f4f]",
  "from-[#1f4068] via-[#5b3e96] to-[#ff5f6d]",
  "from-[#0f9b8e] via-[#2c6b8f] to-[#5b2a86]",
];

/** Capa do post. Sem imagem, vira uma capa desenhada com o hook. */
export function Thumb({ post, className = "", showPlay = false, small = false }: { post: ThumbPost; className?: string; showPlay?: boolean; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const Icon = ICON[post.format];
  const src = proxied(post.id, post.thumbnail);
  const cover = COVERS[[...post.id].reduce((a, c) => a + c.charCodeAt(0), 0) % COVERS.length];
  const isVideo = post.format === "REEL" || post.format === "VIDEO";

  return (
    <div className={`relative overflow-hidden bg-ink-3 ${className}`}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className={`flex h-full w-full items-end bg-gradient-to-br ${small ? "p-1.5" : "p-3"} ${cover}`}>
          <p className={`font-extrabold text-white drop-shadow ${small ? "line-clamp-3 text-[9px] leading-tight" : "line-clamp-4 text-[13px] leading-snug"}`}>
            {post.caption.split("\n")[0]}
          </p>
        </div>
      )}
      <Icon className={`absolute ${small ? "right-1 top-1 h-3 w-3" : "right-2 top-2 h-4 w-4"} text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]`} />
      {showPlay && isVideo && (
        <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur">
            <Play className="h-5 w-5 fill-white text-white" />
          </span>
        </span>
      )}
    </div>
  );
}

/** Post do Instagram rodando dentro da plataforma (Reels, carrossel ou foto). */
export function InstagramEmbed({ permalink, fallback }: { permalink: string; fallback: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const src = embedUrl(permalink);
  if (!src) return <>{fallback}</>;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white" style={{ minHeight: 560 }}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-ink-3">{fallback}</div>}
      <iframe
        src={src}
        title="Post do Instagram"
        className="block w-full border-0"
        style={{ height: 640 }}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
