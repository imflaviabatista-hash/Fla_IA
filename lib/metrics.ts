import type { FormatStat, MediaFormat, Post, PostMetrics, Profile, Quantitative } from "./types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TZ = "America/Sao_Paulo";
const CTA_RE =
  /\b(salv[ae]|compartilh[ae]|mand[ae] (pra|para)|envi[ae] (pra|para)|marc[ae]|coment[ae]|link na bio|clica|segue|me conta|me fala)\b/i;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function firstLine(caption: string) {
  const line = caption.split("\n").find((l) => l.trim()) ?? "";
  return line.trim().slice(0, 160);
}

function localParts(iso: string) {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { weekday: dayIdx, hour: Number(parts.hour) % 24 };
}

export function computeQuant(profile: Profile, posts: Post[]): Quantitative {
  const followers = Math.max(profile.followers, 1);

  const ers = posts.map((p) => (((p.likes ?? 0) + (p.comments ?? 0)) / followers) * 100);
  const med = median(ers) || 0.0001;

  const perPost: Record<string, PostMetrics> = {};
  posts.forEach((p, i) => {
    perPost[p.id] = {
      id: p.id,
      engagementRate: round(ers[i], 3),
      viewsPerFollower: p.views != null ? round(p.views / followers, 3) : null,
      relativeToMedian: round(ers[i] / med, 2),
      commentRatio: p.likes && p.comments != null ? round(p.comments / p.likes, 3) : null,
      captionLength: p.caption.length,
      hashtags: (p.caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length,
      hasCta: CTA_RE.test(p.caption),
      hook: firstLine(p.caption),
    };
  });

  const times = posts.map((p) => new Date(p.timestamp).getTime());
  const periodDays = posts.length > 1 ? Math.max(1, (Math.max(...times) - Math.min(...times)) / 86_400_000) : 1;

  const formats: MediaFormat[] = ["REEL", "CAROUSEL", "IMAGE", "VIDEO"];
  const byFormat: FormatStat[] = formats
    .map((format) => {
      const group = posts.filter((p) => p.format === format);
      if (!group.length) return null;
      const views = group.map((p) => p.views).filter((v): v is number => v != null);
      return {
        format,
        count: group.length,
        share: round((group.length / posts.length) * 100, 1),
        avgEngagement: round(mean(group.map((p) => perPost[p.id].engagementRate)), 2),
        avgViews: views.length ? Math.round(mean(views)) : null,
        avgViewsPerFollower: views.length ? round(mean(views) / followers, 2) : null,
      };
    })
    .filter((x): x is FormatStat => x !== null);

  const byWeekday = WEEKDAYS.map((day, idx) => {
    const group = posts.filter((p) => localParts(p.timestamp).weekday === idx);
    return { day, posts: group.length, avgEngagement: round(mean(group.map((p) => perPost[p.id].engagementRate)), 2) };
  });

  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const group = posts.filter((p) => localParts(p.timestamp).hour === hour);
    return { hour, posts: group.length, avgEngagement: round(mean(group.map((p) => perPost[p.id].engagementRate)), 2) };
  }).filter((h) => h.posts > 0);

  const likes = posts.map((p) => p.likes).filter((v): v is number => v != null);
  const comments = posts.map((p) => p.comments).filter((v): v is number => v != null);
  const reelViews = posts.filter((p) => p.format === "REEL" && p.views != null).map((p) => p.views!);

  const metricsList = Object.values(perPost);

  return {
    postsAnalyzed: posts.length,
    periodDays: Math.round(periodDays),
    postsPerWeek: round((posts.length / periodDays) * 7, 1),
    avgEngagement: round(mean(ers), 2),
    medianEngagement: round(med, 2),
    avgLikes: likes.length ? Math.round(mean(likes)) : null,
    avgComments: comments.length ? Math.round(mean(comments)) : null,
    avgReelViews: reelViews.length ? Math.round(mean(reelViews)) : null,
    reelsReachRatio: reelViews.length ? round(mean(reelViews) / followers, 2) : null,
    hiddenLikesShare: round(((posts.length - likes.length) / Math.max(posts.length, 1)) * 100, 1),
    byFormat,
    byWeekday,
    byHour,
    timeline: [...posts]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((p) => ({ id: p.id, date: p.timestamp, engagement: perPost[p.id].engagementRate, format: p.format })),
    avgCaptionLength: Math.round(mean(metricsList.map((m) => m.captionLength))),
    avgHashtags: round(mean(metricsList.map((m) => m.hashtags)), 1),
    ctaShare: round((metricsList.filter((m) => m.hasCta).length / Math.max(posts.length, 1)) * 100, 1),
    posts: perPost,
    outliers: metricsList.filter((m) => m.relativeToMedian >= 2).map((m) => m.id),
  };
}
