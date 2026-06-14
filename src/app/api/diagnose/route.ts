import { NextResponse } from "next/server";

const CATEGORIES = ["performance", "seo", "accessibility", "best-practices"];

type ScoreSet = Record<string, number | null>;

async function runStrategy(url: string, strategy: "mobile" | "desktop", key?: string) {
  const params = new URLSearchParams({ url, strategy });
  CATEGORIES.forEach((c) => params.append("category", c));
  if (key) params.set("key", key);

  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`PageSpeed retornou ${res.status}`);
  const json = await res.json();

  const scores: ScoreSet = {};
  const cats = json.lighthouseResult?.categories ?? {};
  for (const c of CATEGORIES) {
    const score = cats[c]?.score;
    scores[c] = typeof score === "number" ? Math.round(score * 100) : null;
  }
  return scores;
}

export async function POST(request: Request) {
  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ ok: false, error: "URL é obrigatória." }, { status: 400 });
  }

  try {
    const key = process.env.PAGESPEED_API_KEY;
    const [mobile, desktop] = await Promise.all([
      runStrategy(url, "mobile", key),
      runStrategy(url, "desktop", key),
    ]);

    return NextResponse.json({ ok: true, url, mobile, desktop });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "erro ao analisar" },
      { status: 502 },
    );
  }
}
