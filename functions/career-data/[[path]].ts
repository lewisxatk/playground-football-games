const DATA_SITE = "https://florentfougeres.github.io/OpenFootballBase/";
const TRANSFER_CSV = "https://zenodo.org/records/17921143/files/football_transfers_dataset.csv?download=1";
const PARQUET_PLUGIN = "duckdb-ext/v1.4.3/wasm_eh/parquet.duckdb_extension.wasm";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { values.push(value); value = ""; }
    else value += char;
  }
  values.push(value);
  return values;
}

function normalisePlayerName(value: string): string {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

async function transferHints(names: string[]): Promise<Response> {
  const wanted = new Set(names.map(normalisePlayerName).filter(Boolean));
  if (!wanted.size) return Response.json({ error: "Supply at least one player name." }, { status: 400 });
  const upstream = await fetch(TRANSFER_CSV, { headers: { accept: "text/csv,*/*" } });
  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "The transfer dataset could not be reached (" + upstream.status + ")." }, { status: 502 });
  }
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let columns: string[] | null = null;
  let matched: Array<{ year: string; from: string; to: string; fee: string; league: string }> = [];
  const processLine = (rawLine: string) => {
    const line = rawLine.replace(/\r$/, "");
    if (!line) return;
    const values = parseCsvLine(line);
    if (!columns) {
      columns = values.map((value, index) => index === 0 ? value.replace(/^\uFEFF/, "").trim() : value.trim());
      return;
    }
    const row: Record<string, string> = {};
    columns.forEach((column, index) => { row[column] = values[index] ?? ""; });
    if (!wanted.has(normalisePlayerName(row.player_name ?? ""))) return;
    const rawFee = (row.fee ?? "").trim();
    const cleaned = (row.fee_cleaned ?? "").trim();
    const fee = rawFee && rawFee !== "?" && rawFee !== "-"
      ? rawFee
      : cleaned !== "" && Number.isFinite(Number(cleaned))
        ? "Approx. €" + Number(cleaned).toFixed(2) + "m"
        : "Not disclosed";
    matched.push({
      year: row.year ?? "",
      from: row.source_club ?? "",
      to: row.target_club ?? "",
      fee,
      league: row.source_league || row.target_league || row.league || ""
    });
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        processLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    if (buffer) processLine(buffer);
  } catch {
    return Response.json({ error: "The transfer dataset could not be parsed." }, { status: 502 });
  } finally {
    reader.releaseLock();
  }
  const unique = new Map<string, typeof matched[number]>();
  for (const item of matched) unique.set([item.year, item.from, item.to, item.fee].join("|"), item);
  return Response.json(Array.from(unique.values()).sort((a, b) => a.year.localeCompare(b.year)), {
    headers: { "cache-control": "public, max-age=3600" }
  });
}

export async function onRequest(context: {
  request: Request;
  params: { path?: string | string[] };
}): Promise<Response> {
  const raw = context.params.path;
  const path = Array.isArray(raw) ? raw.join("/") : String(raw ?? "");
  if (!path || path.includes("..") || path.startsWith("/") || !/^[A-Za-z0-9._/-]+$/.test(path))
    return new Response("Not found", { status: 404 });

  if (path === "transfer-hints") {
    const url = new URL(context.request.url);
    return transferHints(url.searchParams.getAll("name"));
  }

  let target: string;
  let contentType = "application/octet-stream";
  let cache = "public, max-age=3600";
  if (path === "transfers.csv") {
    target = TRANSFER_CSV; contentType = "text/csv; charset=utf-8"; cache = "public, max-age=86400";
  } else if (path === PARQUET_PLUGIN) {
    target = DATA_SITE + path; contentType = "application/wasm"; cache = "public, max-age=31536000, immutable";
  } else if (path === "data/manifest.json") {
    target = DATA_SITE + path; contentType = "application/json; charset=utf-8"; cache = "public, max-age=300";
  } else if (path.startsWith("data/") && path.endsWith(".parquet")) {
    target = DATA_SITE + path; cache = "public, max-age=86400";
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