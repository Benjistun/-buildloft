"use client";

import { FormEvent, useMemo, useState } from "react";

type Risk = { title: string; severity: "high" | "medium" | "info" | "positive"; context: string };
type Listing = {
  title: string | null; address: string | null; purchasePrice: number | null; livingArea: number | null;
  rooms: number | null; monthlyColdRent: number | null; houseMoney: number | null; yearBuilt: number | null;
  energyClass: string | null; commission: string | null; description: string | null; source: string | null;
};
type Result = { listing: Listing; risks: Risk[]; confidence: "hoch" | "mittel" | "niedrig"; fetchedFromUrl: boolean; fetchWarning?: string };

const euro = new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const num = new Intl.NumberFormat("de-DE",{maximumFractionDigits:1});

export default function Home() {
  const [url,setUrl]=useState("");
  const [text,setText]=useState("");
  const [showText,setShowText]=useState(false);
  const [result,setResult]=useState<Result|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [equity,setEquity]=useState(30000);
  const [interest,setInterest]=useState(3.8);
  const [repayment,setRepayment]=useState(2);
  const [closing,setClosing]=useState(10.5);
  const [rent,setRent]=useState("");
  const [nonRecoverable,setNonRecoverable]=useState(120);
  const [maintenance,setMaintenance]=useState(80);
  const [vacancy,setVacancy]=useState(3);

  async function analyze(e:FormEvent){
    e.preventDefault(); setLoading(true); setError("");
    try{
      const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.trim(),fallbackText:text.trim()})});
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||"Analyse fehlgeschlagen.");
      setResult(data);
      if(data.listing.monthlyColdRent) setRent(String(data.listing.monthlyColdRent));
    }catch(e){setError(e instanceof Error?e.message:"Analyse fehlgeschlagen.");}
    finally{setLoading(false);}
  }

  const f=useMemo(()=>{
    const price=result?.listing.purchasePrice||0;
    const monthlyRent=Number(rent)||result?.listing.monthlyColdRent||0;
    const area=result?.listing.livingArea||0;
    const total=price*(1+closing/100);
    const loan=Math.max(0,total-equity);
    const rate=loan*((interest+repayment)/100)/12;
    const cash=monthlyRent-rate-nonRecoverable-maintenance-monthlyRent*(vacancy/100);
    return {
      price,monthlyRent,total,loan,rate,cash,
      yield:price&&monthlyRent?(monthlyRent*12/price)*100:0,
      factor:monthlyRent?price/(monthlyRent*12):0,
      sqm:price&&area?price/area:0
    };
  },[result,rent,closing,equity,interest,repayment,nonRecoverable,maintenance,vacancy]);

  return <main className="site">
    <header className="nav">
      <a className="logo" href="/"><span>B</span>Buildloft</a>
      <div className="navtag">Immobilien Analyzer</div>
    </header>

    <section className="hero">
      <div className="intro">
        <div className="eyebrow">IMMOBILIEN SCHNELLER VERSTEHEN</div>
        <h1>Link rein.<br/>Objekt prüfen.<br/><em>Zahlen verstehen.</em></h1>
        <p>Buildloft bündelt Objektdaten, rechnet dein Investment durch und sucht den Anzeigentext nach möglichen Risiken wie Sanierungsstau, Sonderumlagen, Erbpacht oder Feuchtigkeit ab.</p>
      </div>

      <form className="searchcard" onSubmit={analyze}>
        <label htmlFor="url">Immobilien-Link</label>
        <div className="searchrow">
          <input id="url" type="url" placeholder="https://www.immobilienscout24.de/expose/..." value={url} onChange={e=>setUrl(e.target.value)}/>
          <button disabled={loading||(!url.trim()&&!text.trim())}>{loading?"Analysiere…":"Analysieren →"}</button>
        </div>
        <div className="portals">ImmoScout24 · Immowelt · Immonet · Kleinanzeigen · immobilien.de</div>
        <button className="linkbtn" type="button" onClick={()=>setShowText(v=>!v)}>{showText?"Textfeld schließen":"Link blockiert? Anzeigentext einfügen"}</button>
        {showText&&<textarea rows={7} placeholder="Beschreibung und Eckdaten der Anzeige hier einfügen…" value={text} onChange={e=>setText(e.target.value)}/>}
        {error&&<div className="error">{error}</div>}
      </form>
    </section>

    {!result&&<section className="features">
      <article><b>01</b><h2>Objektdaten</h2><p>Kaufpreis, Fläche, Zimmer, Baujahr, Hausgeld, Miete und weitere Angaben kompakt bündeln.</p></article>
      <article><b>02</b><h2>Risiko-Scan</h2><p>Sanierungen, Sonderumlagen, Erbpacht, Feuchtigkeit, alte Technik und weitere Hinweise markieren.</p></article>
      <article><b>03</b><h2>Investment</h2><p>Rendite, Kaufpreisfaktor, Finanzierung, Rate und monatlichen Cashflow direkt durchspielen.</p></article>
    </section>}

    {result&&<section className="results">
      <div className="resulttop">
        <div><div className="eyebrow">ANALYSE</div><h2>{result.listing.title||"Immobilienangebot"}</h2><p>{result.listing.address||"Adresse nicht eindeutig erkannt"}</p></div>
        <span className={"confidence "+result.confidence}>Datenqualität: {result.confidence}</span>
      </div>
      {result.fetchWarning&&<div className="notice">{result.fetchWarning}</div>}

      <div className="stats">
        <Stat label="Kaufpreis" value={result.listing.purchasePrice?euro.format(result.listing.purchasePrice):"—"} strong/>
        <Stat label="Wohnfläche" value={result.listing.livingArea?num.format(result.listing.livingArea)+" m²":"—"}/>
        <Stat label="Preis / m²" value={f.sqm?euro.format(f.sqm):"—"}/>
        <Stat label="Zimmer" value={result.listing.rooms?num.format(result.listing.rooms):"—"}/>
        <Stat label="Baujahr" value={result.listing.yearBuilt?String(result.listing.yearBuilt):"—"}/>
        <Stat label="Hausgeld" value={result.listing.houseMoney?euro.format(result.listing.houseMoney)+" / M.":"—"}/>
        <Stat label="Kaltmiete" value={result.listing.monthlyColdRent?euro.format(result.listing.monthlyColdRent)+" / M.":"—"}/>
        <Stat label="Energieklasse" value={result.listing.energyClass||"—"}/>
      </div>

      <div className="columns">
        <section className="panel">
          <div className="panelhead"><div><small>INVESTMENT</small><h3>Finanzierung & Cashflow</h3></div>
          <span className={"cash "+(f.cash>=0?"plus":"minus")}>{f.price&&f.monthlyRent?(f.cash>=0?"+":"")+euro.format(f.cash)+" / M.":"Miete ergänzen"}</span></div>
          <div className="inputs">
            <Field label="Eigenkapital" value={equity} set={setEquity} unit="€"/>
            <Field label="Kaufnebenkosten" value={closing} set={setClosing} unit="%" step=".1"/>
            <Field label="Sollzins" value={interest} set={setInterest} unit="%" step=".1"/>
            <Field label="Tilgung" value={repayment} set={setRepayment} unit="%" step=".1"/>
            <label>Kaltmiete<div className="unit"><input type="number" min="0" value={rent} onChange={e=>setRent(e.target.value)}/><span>€</span></div></label>
            <Field label="Nicht umlagefähig" value={nonRecoverable} set={setNonRecoverable} unit="€"/>
            <Field label="Instandhaltung" value={maintenance} set={setMaintenance} unit="€"/>
            <Field label="Leerstandsreserve" value={vacancy} set={setVacancy} unit="%" step=".5"/>
          </div>
          <div className="calcs">
            <Calc label="Gesamtaufwand" value={f.price?euro.format(f.total):"—"}/>
            <Calc label="Kreditbedarf" value={f.price?euro.format(f.loan):"—"}/>
            <Calc label="Kreditrate" value={f.price?euro.format(f.rate)+" / M.":"—"}/>
            <Calc label="Bruttorendite" value={f.yield?num.format(f.yield)+" %":"—"}/>
            <Calc label="Kaufpreisfaktor" value={f.factor?num.format(f.factor):"—"}/>
            <Calc label="Cashflow" value={f.price&&f.monthlyRent?euro.format(f.cash)+" / M.":"—"}/>
          </div>
        </section>

        <section className="panel">
          <div className="panelhead"><div><small>TEXTPRÜFUNG</small><h3>Risiken & Sanierungen</h3></div><span className="count">{result.risks.length} Treffer</span></div>
          <div className="risks">
            {result.risks.length?result.risks.map((r,i)=><article key={r.title+i} className={"risk "+r.severity}><i/><div><b>{r.title}</b><p>{r.context}</p></div></article>)
              :<div className="empty">Keine typischen Risiko-Schlagwörter erkannt. Das ersetzt keine Unterlagenprüfung.</div>}
          </div>
        </section>
      </div>

      <section className="details">
        <div><small>WEITERE ANGABEN</small><h3>Erkannte Informationen</h3></div>
        <dl>
          <div><dt>Provision</dt><dd>{result.listing.commission||"Nicht erkannt"}</dd></div>
          <div><dt>Quelle</dt><dd>{result.listing.source||"Manueller Text"}</dd></div>
          <div><dt>Import</dt><dd>{result.fetchedFromUrl?"Direkt aus Link":"Aus eingefügtem Text"}</dd></div>
        </dl>
        {result.listing.description&&<p className="preview">{result.listing.description}</p>}
      </section>
      <p className="disclaimer">Automatische Voranalyse, keine Kauf-, Steuer-, Rechts- oder Finanzierungsberatung. WEG-Protokolle, Rücklagen, Sonderumlagen, Energieausweis, Mietvertrag und Gebäudetechnik vor einem Kauf separat prüfen.</p>
    </section>}
  </main>;
}

function Stat({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <article className={"stat "+(strong?"strong":"")}><span>{label}</span><b>{value}</b></article>}
function Calc({label,value}:{label:string;value:string}){return <div><span>{label}</span><b>{value}</b></div>}
function Field({label,value,set,unit,step="1"}:{label:string;value:number;set:(v:number)=>void;unit:string;step?:string}){return <label>{label}<div className="unit"><input type="number" min="0" step={step} value={value} onChange={e=>set(Number(e.target.value))}/><span>{unit}</span></div></label>}
