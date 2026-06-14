import { NextResponse } from "next/server";

/**
 * Dispara actors do Apify de forma assíncrona para varrer a internet
 * sobre o negócio. Retorna os runIds para acompanhamento posterior.
 *
 * Actors usados (configuráveis):
 * - apify/website-content-crawler  → conteúdo do site
 * - compass/crawler-google-places  → Google Maps
 * - apify/instagram-scraper        → Instagram
 */
const ACTORS: { key: string; actor: string; input: (d: ScrapeInput) => object | null }[] = [
  {
    key: "website",
    actor: "apify~website-content-crawler",
    input: (d) => (d.website ? { startUrls: [{ url: d.website }], maxCrawlPages: 5 } : null),
  },
  {
    key: "googleMaps",
    actor: "compass~crawler-google-places",
    input: (d) => (d.googleMaps ? { startUrls: [{ url: d.googleMaps }], maxCrawledPlaces: 1 } : null),
  },
  {
    key: "instagram",
    actor: "apify~instagram-scraper",
    input: (d) => (d.instagram ? { usernames: [d.instagram.replace(/^@/, "")] } : null),
  },
];

type ScrapeInput = {
  website?: string;
  googleMaps?: string;
  instagram?: string;
};

export async function POST(request: Request) {
  const data: ScrapeInput = await request.json();
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: true, started: false, note: "APIFY_TOKEN não configurado." },
      { status: 200 },
    );
  }

  const runs: Record<string, string> = {};

  for (const { key, actor, input } of ACTORS) {
    const payload = input(data);
    if (!payload) continue;

    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/${actor}/runs?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        const json = await res.json();
        runs[key] = json.data?.id ?? "iniciado";
      }
    } catch {
      // falha em um actor não derruba os demais
    }
  }

  return NextResponse.json({ ok: true, started: true, runs });
}
