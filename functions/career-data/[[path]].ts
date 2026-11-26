const DATA_SITE = "https://florentfougeres.github.io/OpenFootballBase/";
const TRANSFER_CSV = "https://zenodo.org/records/17921143/files/football_transfers_dataset.csv?download=1";
const PARQUET_PLUGIN = "duckdb-ext/v1.4.3/wasm_eh/parquet.duckdb_extension.wasm";

export async function onRequest(context: {
  request: Request;
  params: { path?: string | string[] };
}): Promise<Response> {
  const raw = context.params.path;
  const path = Array.isArray(raw) ? raw.join("/") : String(raw ?? "");
  if (!path || path.includes("..") || path.startsWith("/") || !/^[A-Za-z0-9._/-]+$/.test(path))
    return new Response("Not found", { status: 404 });

  let target: string;
  let contentType = "application/octet-stream";
  let cache = "public, max-age=3600";
  if (path === "transfers.csv") {
    target = TRANSFER_CSV;
    contentType = "text/csv; charset=utf-8";
    cache = "public, max-age=86400";
  } else if (path === PARQUET_PLUGIN) {
    target = DATA_SITE + path;
    contentType = "application/wasm";
    cache = "public, max-age=31536000, immutable";
  } else if (path === "data/manifest.json") {
    target = DATA_SITE + path;
    contentType = "application/json; charset=utf-8";
    cache = "public, max-age=300";
  } else if (path.startsWith("data/") && path.endsWith(".parquet")) {
    target = DATA_SITE + path;
    cache = "public, max-age=86400";
  } else {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers({ accept: "*/*" });
  const range = context.request.headers.get("range");
  if (range) headers.set("range", range);
  const upstream = await fetch(target, { method: context.request.method, headers });
  const out = new Headers();
  for (const key of ["content-range", "content-length", "accept-ranges", "etag", "last-modified"]) {
    const value = upstream.headers.get(key);
    if (value) out.set(key, value);
  }
  out.set("content-type", upstream.headers.get("content-type") || contentType);
  out.set("cache-control", cache);
  out.set("access-control-allow-origin", "*");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
