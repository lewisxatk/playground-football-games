const SOURCE_URL = "https://quiz-fc.com/data/pl-history.v2.json";

export async function onRequestGet(): Promise<Response> {
  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: { accept: "application/json" },
      // Cache the public source at Cloudflare's edge for one day. The browser
      // also receives a shorter cache lifetime so source corrections propagate.
      cf: { cacheTtl: 86400, cacheEverything: true }
    } as RequestInit);

    if (!upstream.ok) {
      return Response.json(
        { error: "Premier League history source unavailable", status: upstream.status },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
      "X-Data-Source": "Quiz FC / Wikipedia / Wikidata / OpenFootball",
      "X-Data-License": "CC-BY-SA-4.0",
      "X-Data-Attribution": "https://quiz-fc.com/data/ATTRIBUTION.md"
    });
    const etag = upstream.headers.get("etag");
    if (etag) headers.set("ETag", etag);
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return Response.json(
      { error: "Could not reach the Premier League history source" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
