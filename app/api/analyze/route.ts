import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_HOSTS = [
  "immobilienscout24.de","www.immobilienscout24.de",
  "immowelt.de","www.immowelt.de",
  "immonet.de","www.immonet.de",
  "kleinanzeigen.de","www.kleinanzeigen.de",
  "immobilien.de","www.immobilien.de",
];

type Listing = {
  title: string | null; address: string | null; purchasePrice: number | null;
  livingArea: number | null; rooms: number | null; monthlyColdRent: number | null;
  houseMoney: number | null; yearBuilt: number | null; energyClass: string | null;
  commission: string | null; description: string | null; source: string | null;
};

type Risk = { title: string; severity: "high" | "medium" | "info" | "positive"; context: string };

function cleanText(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(raw?: string | number | null) {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const normalized = raw.replace(/\s/g, "").replace(/€/g, "").replace(/[^\d,.-]/g, "");
  if (!normalized) return null;
  let value = normalized;
  const comma = value.lastIndexOf(",");
  const dot = value.lastIndexOf(".");
  if (comma > dot) value = value.replace(/\./g, "").replace(",", ".");
  else if (dot > comma && comma >= 0) value = value.replace(/,/g, "");
  else if (comma >= 0) value = value.replace(",", ".");
  else if ((value.match(/\./g) || []).length > 1) value = value.replace(/\./g, "");
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function findNumber(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const n = toNumber(match[1]);
      if (n != null) return n;
    }
  }
  return null;
}

function extractMeta(html: string, key: string) {
  const patterns = [
    new RegExp('<meta[^>]+(?:property|name)=["\\\']' + key + '["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\']', "i"),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+(?:property|name)=["\\\']' + key + '["\\\']', "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return cleanText(m[1]);
  }
  return null;
}

function walkJson(value: unknown, bucket: Record<string, unknown>[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { value.forEach((v) => walkJson(v, bucket)); return; }
  bucket.push(value as Record<string, unknown>);
  Object.values(value as Record<string, unknown>).forEach((v) => walkJson(v, bucket));
}

function parseJsonLd(html: string) {
  const objects: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try { walkJson(JSON.parse(match[1].trim()), objects); } catch {}
  }
  return objects;
}

function findJsonString(objects: Record<string, unknown>[], keys: string[]) {
  for (const obj of objects) for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function findJsonNumber(objects: Record<string, unknown>[], keys: string[]) {
  for (const obj of objects) for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = toNumber(v);
      if (n != null) return n;
    }
  }
  return null;
}

function detectSource(hostname: string) {
  if (hostname.includes("immobilienscout24")) return "ImmoScout24";
  if (hostname.includes("immowelt")) return "Immowelt";
  if (hostname.includes("immonet")) return "Immonet";
  if (hostname.includes("kleinanzeigen")) return "Kleinanzeigen";
  if (hostname.includes("immobilien.de")) return "immobilien.de";
  return null;
}

function parseListing(html: string, url?: URL | null, fallbackText = ""): Listing {
  const plain = cleanText(html);
  const combined = [plain, fallbackText].filter(Boolean).join(" ");
  const ld = parseJsonLd(html);

  const title = extractMeta(html, "og:title") || findJsonString(ld, ["name","headline"]) || null;
  const description = extractMeta(html, "og:description") || findJsonString(ld, ["description"]) || (combined ? combined.slice(0, 1400) : null);
  const price = findJsonNumber(ld, ["price","lowPrice"]) || findNumber(combined, [
    /(?:kaufpreis|preis)\s*[:\-]?\s*([\d.]+(?:,\d+)?)\s*€/i,
    /([\d.]+(?:,\d+)?)\s*€\s*(?:kaufpreis|preis)/i,
  ]);
  const area = findJsonNumber(ld, ["floorSize","livingArea","area"]) || findNumber(combined, [
    /(?:wohnfläche|wohnflaeche|fläche|flaeche)\s*[:\-]?\s*([\d.,]+)\s*m(?:²|2)/i,
    /([\d.,]+)\s*m(?:²|2)\s*(?:wohnfläche|wohnflaeche)/i,
  ]);
  const rooms = findNumber(combined, [
    /(?:zimmer|anzahl zimmer)\s*[:\-]?\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:zimmer|zi\.)/i,
  ]);
  const rent = findNumber(combined, [
    /(?:kaltmiete|nettokaltmiete|monatsmiete)\s*[:\-]?\s*([\d.]+(?:,\d+)?)\s*€/i,
    /([\d.]+(?:,\d+)?)\s*€\s*(?:kaltmiete|nettokaltmiete)/i,
  ]);
  const houseMoney = findNumber(combined, [/(?:hausgeld|wohngeld)\s*[:\-]?\s*([\d.]+(?:,\d+)?)\s*€/i]);
  const yearBuiltNum = findNumber(combined, [/(?:baujahr|erbaut)\s*[:\-]?\s*((?:18|19|20)\d{2})/i]);
  const energy = combined.match(/(?:energieeffizienzklasse|energieklasse)\s*[:\-]?\s*([A-H][+]{0,2})\b/i)?.[1] || null;
  const commission = combined.match(/(?:provision|courtage|maklerprovision)\s*[:\-]?\s*([^.;]{2,90})/i)?.[1]?.trim() || null;
  const address = findJsonString(ld, ["streetAddress"]) || extractMeta(html, "og:locality") || null;

  return {
    title, address,
    purchasePrice: price && price > 1000 ? price : null,
    livingArea: area && area > 5 && area < 5000 ? area : null,
    rooms: rooms && rooms > 0 && rooms < 100 ? rooms : null,
    monthlyColdRent: rent && rent > 50 ? rent : null,
    houseMoney: houseMoney && houseMoney > 0 ? houseMoney : null,
    yearBuilt: yearBuiltNum && yearBuiltNum >= 1700 && yearBuiltNum <= new Date().getFullYear()+2 ? Math.round(yearBuiltNum) : null,
    energyClass: energy, commission, description,
    source: url ? detectSource(url.hostname) : null,
  };
}

const RISK_RULES: Array<{title:string;severity:Risk["severity"];terms:RegExp;message:string}> = [
  {title:"Sonderumlage",severity:"high",terms:/sonderumlage|sonderzahlung/i,message:"Sonderumlage oder Sonderzahlung erwähnt. Höhe, Beschluss und Fälligkeit prüfen."},
  {title:"Sanierungsstau",severity:"high",terms:/sanierungsstau|renovierungsstau|instandhaltungsstau/i,message:"Aufgeschobene Sanierungen möglich. Rücklagen und WEG-Protokolle genau prüfen."},
  {title:"Feuchtigkeit / Schimmel",severity:"high",terms:/feuchtig|schimmel|wasserschaden|nässe|naesse/i,message:"Möglicher Feuchtigkeits- oder Schimmelhinweis. Ursache fachlich klären."},
  {title:"Erbpacht / Erbbaurecht",severity:"high",terms:/erbpacht|erbbaurecht|erbbauzins/i,message:"Erbbaurecht erwähnt. Laufzeit, Erbbauzins und Anpassungsklauseln prüfen."},
  {title:"Heizung / Heizungsalter",severity:"medium",terms:/alte heizung|heizung.{0,30}(?:erneuer|sanier|tausch)|ölheizung|oelheizung|nachtspeicher/i,message:"Möglicher Investitionsbedarf bei der Heiztechnik."},
  {title:"Dach / Fassade",severity:"medium",terms:/dach.{0,30}(?:sanier|erneuer)|fassade.{0,30}(?:sanier|erneuer)|dachsanierung|fassadensanierung/i,message:"Mögliche Arbeiten an Dach oder Fassade. Kostenverteilung prüfen."},
  {title:"Fenster / Leitungen",severity:"medium",terms:/fenster.{0,30}(?:erneuer|sanier)|leitungen.{0,30}(?:erneuer|sanier)|steigleitungen|elektrik.{0,30}(?:alt|erneuer)/i,message:"Technische Erneuerungen möglich. Alter und Umfang prüfen."},
  {title:"Denkmalschutz",severity:"medium",terms:/denkmalschutz|denkmalgeschützt|denkmalgeschuetzt/i,message:"Denkmalschutz kann Umbauten und Kosten beeinflussen."},
  {title:"Vermietet",severity:"info",terms:/ist vermietet|vermietete wohnung|mietverhältnis|mietverhaeltnis/i,message:"Mietvertrag, Miethöhe, Kaution und bestehende Rechte prüfen."},
  {title:"Renovierungsbedarf",severity:"info",terms:/renovierungsbedürftig|renovierungsbeduerftig|sanierungsbedürftig|sanierungsbeduerftig|handwerkerobjekt/i,message:"Renovierungsbedarf erwähnt. Budget inklusive Reserve ansetzen."},
  {title:"Modernisiert",severity:"positive",terms:/kernsanier|vollständig saniert|komplett saniert|umfangreich modernisiert/i,message:"Modernisierung genannt. Jahr und Umfang nachweisen lassen."},
];

function contextAround(text:string,re:RegExp){
  const m=text.match(re);
  if(!m||m.index==null) return "";
  return text.slice(Math.max(0,m.index-90),Math.min(text.length,m.index+m[0].length+130)).replace(/\s+/g," ").trim();
}
function scanRisks(text:string):Risk[]{
  const normalized=cleanText(text);
  return RISK_RULES.filter(r=>r.terms.test(normalized)).map(r=>({title:r.title,severity:r.severity,context:contextAround(normalized,r.terms)||r.message}));
}
function confidence(listing:Listing,fetched:boolean){
  const count=[listing.purchasePrice,listing.livingArea,listing.rooms,listing.yearBuilt,listing.monthlyColdRent,listing.houseMoney].filter(v=>v!=null).length;
  if(fetched&&count>=4) return "hoch" as const;
  if(count>=2) return "mittel" as const;
  return "niedrig" as const;
}

async function fetchListing(url:URL){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8500);
  try{
    const response=await fetch(url.toString(),{
      redirect:"follow",signal:controller.signal,cache:"no-store",
      headers:{
        "User-Agent":"Mozilla/5.0 (compatible; Buildloft/1.0; +https://buildloft.de)",
        "Accept":"text/html,application/xhtml+xml",
        "Accept-Language":"de-DE,de;q=0.9,en;q=0.7"
      }
    });
    if(!response.ok) throw new Error("HTTP "+response.status);
    const type=response.headers.get("content-type")||"";
    if(!type.includes("text/html")&&!type.includes("application/xhtml")) throw new Error("Kein HTML");
    const html=await response.text();
    return html.slice(0,2500000);
  } finally { clearTimeout(timer); }
}

export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const rawUrl=typeof body.url==="string"?body.url.trim():"";
    const fallbackText=typeof body.fallbackText==="string"?body.fallbackText.trim().slice(0,60000):"";
    if(!rawUrl&&!fallbackText) return NextResponse.json({error:"Bitte Immobilien-Link oder Anzeigentext eingeben."},{status:400});

    let parsedUrl:URL|null=null;
    if(rawUrl){
      try{parsedUrl=new URL(rawUrl)}catch{return NextResponse.json({error:"Der Link ist ungültig."},{status:400})}
      if(parsedUrl.protocol!=="https:"||!ALLOWED_HOSTS.includes(parsedUrl.hostname.toLowerCase())){
        return NextResponse.json({error:"Aktuell werden ImmoScout24, Immowelt, Immonet, Kleinanzeigen und immobilien.de unterstützt."},{status:400});
      }
    }

    let html=""; let fetchedFromUrl=false; let fetchWarning:string|undefined;
    if(parsedUrl){
      try{html=await fetchListing(parsedUrl);fetchedFromUrl=true}
      catch{fetchWarning="Das Portal hat den automatischen Abruf blockiert. Füge den Anzeigentext ein; Analyse und Rechner funktionieren dann trotzdem."}
    }
    if(!html&&!fallbackText){
      return NextResponse.json({error:"Das Portal blockiert den automatischen Abruf. Öffne „Link blockiert? Anzeigentext einfügen“ und füge die Anzeige dort ein."},{status:422});
    }

    const listing=parseListing(html,parsedUrl,fallbackText);
    const analysisText=[cleanText(html),fallbackText].filter(Boolean).join(" ");
    return NextResponse.json({listing,risks:scanRisks(analysisText),confidence:confidence(listing,fetchedFromUrl),fetchedFromUrl,fetchWarning});
  }catch{
    return NextResponse.json({error:"Die Anzeige konnte nicht verarbeitet werden."},{status:500});
  }
}
