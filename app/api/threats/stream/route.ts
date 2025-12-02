// app/api/threats/stream/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ThreatEvent = {
  id: string;
  ts: string;
  source: "urlhaus";
  indicator: string;
  family?: string;
  status?: string;
  confidence?: number;
  cve?: string[];
  kev?: boolean;
  geo?: { lat: number; lon: number; country?: string };
  severity: "low" | "med" | "high" | "critical";
};

const POLL_MS = 20_000;
const URLHAUS_ENDPOINT = "https://urlhaus-api.abuse.ch/v1/urls/recent/";
const IPAPI_BATCH = "http://ip-api.com/batch?fields=status,country,lat,lon,query";
const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

const seen = new Set<string>();
let kevSet: Set<string> | null = null;
const geoCache = new Map<string, { lat: number; lon: number; country?: string }>();

function hashId(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

async function loadKEV() {
  try {
    const r = await fetch(KEV_URL, { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    const set = new Set<string>();
    for (const item of j?.vulnerabilities ?? []) {
      if (item?.cveID) set.add(String(item.cveID).toUpperCase().trim());
    }
    kevSet = set;
  } catch {}
}

function parseCVEs(text: string): string[] {
  const re = /\bCVE-\d{4}-\d{4,7}\b/gi;
  const m = text.match(re) ?? [];
  const set = new Set(m.map(s => s.toUpperCase()));
  return Array.from(set);
}

function severityFrom(urlhaus: any): ThreatEvent["severity"] {
  if (urlhaus?.url_status === "online" && urlhaus?.signature) return "critical";
  if (urlhaus?.url_status === "online") return "high";
  if (urlhaus?.signature) return "med";
  return "low";
}

async function fetchURLHaus(limit = 150): Promise<any[]> {
  const body = new URLSearchParams({ limit: String(limit) });
  const r = await fetch(URLHAUS_ENDPOINT, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j?.urls ?? [];
}

async function batchGeo(queries: string[]): Promise<Record<string, {lat:number;lon:number;country?:string}>> {
  const resp: Record<string, any> = {};
  const toQuery = queries.filter(q => !geoCache.has(q));
  if (toQuery.length) {
    const chunks = Array.from({length: Math.ceil(toQuery.length/100)}, (_,i) => toQuery.slice(i*100,(i+1)*100));
    for (const ch of chunks) {
      try {
        const rr = await fetch(IPAPI_BATCH, {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(ch),
        });
        if (rr.ok) {
          const arr = await rr.json();
          arr.forEach((row: any, idx: number) => {
            const q = ch[idx];
            if (row?.status === "success" && typeof row.lat === "number" && typeof row.lon === "number") {
              const val = { lat: row.lat, lon: row.lon, country: row.country };
              geoCache.set(q, val);
            }
          });
        }
      } catch {}
    }
  }
  for (const q of queries) {
    const v = geoCache.get(q);
    if (v) resp[q] = v;
  }
  if (geoCache.size > 5000) {
    const drop = Math.floor(geoCache.size * 0.2);
    const keys = Array.from(geoCache.keys());
    for (let i = 0; i < drop && i < keys.length; i++) {
      geoCache.delete(keys[i]);
    }
  }
  return resp;
}

function normalizeUrlhaus(u: any): ThreatEvent {
  const indicator = u?.url ?? u?.host ?? "unknown";
  const id = hashId(`urlhaus|${indicator}|${u?.date_added || ""}`);
  const cves = parseCVEs([u?.url, u?.signature, u?.threat, u?.url_status].filter(Boolean).join(" "));
  const e: ThreatEvent = {
    id,
    ts: new Date(u?.date_added || Date.now()).toISOString(),
    source: "urlhaus",
    indicator,
    family: u?.signature || undefined,
    status: u?.url_status || undefined,
    confidence: u?.url_status === "online" ? 0.9 : 0.6,
    cve: cves.length ? cves : undefined,
    kev: false,
    severity: severityFrom(u),
  };
  return e;
}

async function enrichGeo(events: ThreatEvent[]) {
  const qs = events.map(e => {
    try {
      const url = new URL(e.indicator);
      return url.hostname;
    } catch {
      return e.indicator;
    }
  });
  const uniq = Array.from(new Set(qs));
  const batch = await batchGeo(uniq);
  events.forEach((e, i) => {
    const key = uniq[i] ?? qs[i];
    const g = batch[key];
    if (g) e.geo = g;
  });
}

function tagKEV(events: ThreatEvent[]) {
  if (!kevSet) return;
  events.forEach(e => {
    if (!e.cve?.length) return;
    e.kev = e.cve.some(c => kevSet!.has(c));
    if (e.kev && e.severity !== "critical") e.severity = "high";
  });
}

async function pollOnce(push: (e: ThreatEvent)=>void) {
  if (!kevSet) await loadKEV();
  const rows = await fetchURLHaus(150);
  const normalized = rows.map(normalizeUrlhaus).filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  if (!normalized.length) return;
  await enrichGeo(normalized);
  tagKEV(normalized);
  normalized.forEach(push);
}

export async function GET(_req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      function send(event: ThreatEvent) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      pollOnce(send).catch(()=>{});
      const h = setInterval(() => { pollOnce(send).catch(()=>{}); }, POLL_MS);

      const heart = setInterval(() => {
        controller.enqueue(enc.encode(":keepalive\n\n"));
      }, 15000);

      return () => { clearInterval(h); clearInterval(heart); };
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
