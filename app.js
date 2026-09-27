const $=id=>document.getElementById(id);
const euro=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("de-DE",{maximumFractionDigits:1});
let listing={purchasePrice:null,livingArea:null,rooms:null,monthlyColdRent:null,houseMoney:null,yearBuilt:null,energyClass:null,commission:null,title:null};

function toNumber(raw){
  if(!raw)return null;
  let s=String(raw).replace(/\s/g,"").replace(/€/g,"").replace(/[^\d,.-]/g,"");
  if(!s)return null;
  const c=s.lastIndexOf(","),d=s.lastIndexOf(".");
  if(c>d)s=s.replace(/\./g,"").replace(",",".");
  else if(d>c&&c>=0)s=s.replace(/,/g,"");
  else if(c>=0)s=s.replace(",",".");
  else if((s.match(/\./g)||[]).length>1)s=s.replace(/\./g,"");
  const n=Number(s);return Number.isFinite(n)?n:null;
}
function findNumber(text,patterns){
  for(const p of patterns){const m=text.match(p);if(m&&m[1]){const n=toNumber(m[1]);if(n!==null)return n}}
  return null;
}
function parse(text){
  const t=text.replace(/\s+/g," ").trim();
  const price=findNumber(t,[
    /(?:kaufpreis|preis)\s*[:\-]?\s*([\d.]+(?:,\d+)?)\s*€/i,
    /([\d.]+(?:,\d+)?)\s*€\s*(?:kaufpreis|preis)/i
  ]);
  const area=findNumber(t,[
    /(?:wohnfläche|wohnflaeche|fläche|flaeche)\s*[:\-]?\s*([\d.,]+)\s*m(?:²|2)/i,
    /([\d.,]+)\s*m(?:²|2)\s*(?:wohnfläche|wohnflaeche)/i
  ]);
  const rooms=findNumber(t,[/(?:zimmer|anzahl zimmer)\s*[:\-]?\s*([\d.,]+)/i,/([\d.,]+)\s*(?:zimmer|zi\.)/i]);
  const rent=findNumber(t,[
    /(?:kaltmiete|nettokaltmiete|monatsmiete)\s*[:\-]?\s*([\d.]+(?:,\d+)?)\s*€/i,
    /([\d.]+(?:,\d+)?)\s*€\s*(?:kaltmiete|nettokaltmiete)/i
  ]);
  const houseMoney=findNumber(t,[/(?:hausgeld|wohngeld)\s*[:\-]?\s*([\d.]+(?:,\d+)?)\s*€/i]);
  const year=findNumber(t,[/(?:baujahr|erbaut)\s*[:\-]?\s*((?:18|19|20)\d{2})/i]);
  const energy=(t.match(/(?:energieeffizienzklasse|energieklasse)\s*[:\-]?\s*([A-H][+]{0,2})\b/i)||[])[1]||null;
  const commission=(t.match(/(?:provision|courtage|maklerprovision)\s*[:\-]?\s*([^.;]{2,90})/i)||[])[1]||null;
  const title=(t.match(/(?:titel|überschrift)\s*[:\-]\s*([^|]{8,120})/i)||[])[1]||null;
  return{
    purchasePrice:price&&price>1000?price:null,
    livingArea:area&&area>5&&area<5000?area:null,
    rooms:rooms&&rooms>0&&rooms<100?rooms:null,
    monthlyColdRent:rent&&rent>50?rent:null,
    houseMoney:houseMoney&&houseMoney>0?houseMoney:null,
    yearBuilt:year&&year>=1700&&year<=2030?Math.round(year):null,
    energyClass:energy,commission:commission?commission.trim():null,title:title?title.trim():null
  };
}
const rules=[
  ["Sonderumlage","high",/sonderumlage|sonderzahlung/i],
  ["Sanierungsstau","high",/sanierungsstau|renovierungsstau|instandhaltungsstau/i],
  ["Feuchtigkeit / Schimmel","high",/feuchtig|schimmel|wasserschaden|nässe|naesse/i],
  ["Erbpacht / Erbbaurecht","high",/erbpacht|erbbaurecht|erbbauzins/i],
  ["Heizung / Heizungsalter","medium",/alte heizung|heizung.{0,30}(?:erneuer|sanier|tausch)|ölheizung|oelheizung|nachtspeicher/i],
  ["Dach / Fassade","medium",/dach.{0,30}(?:sanier|erneuer)|fassade.{0,30}(?:sanier|erneuer)|dachsanierung|fassadensanierung/i],
  ["Fenster / Leitungen","medium",/fenster.{0,30}(?:erneuer|sanier)|leitungen.{0,30}(?:erneuer|sanier)|steigleitungen|elektrik.{0,30}(?:alt|erneuer)/i],
  ["Denkmalschutz","medium",/denkmalschutz|denkmalgeschützt|denkmalgeschuetzt/i],
  ["Vermietet","info",/ist vermietet|vermietete wohnung|mietverhältnis|mietverhaeltnis/i],
  ["Renovierungsbedarf","info",/renovierungsbedürftig|renovierungsbeduerftig|sanierungsbedürftig|sanierungsbeduerftig|handwerkerobjekt/i],
  ["Modernisiert","positive",/kernsanier|vollständig saniert|komplett saniert|umfangreich modernisiert/i]
];
function scan(text){
  return rules.flatMap(([title,severity,re])=>{
    const m=text.match(re);if(!m||m.index==null)return[];
    const start=Math.max(0,m.index-85),end=Math.min(text.length,m.index+m[0].length+130);
    return[{title,severity,context:text.slice(start,end).replace(/\s+/g," ").trim()}];
  });
}
function updateFinance(){
  const price=listing.purchasePrice||0;
  const area=listing.livingArea||0;
  const rent=Number($("rentOverride").value)||listing.monthlyColdRent||0;
  const equity=Number($("equity").value)||0;
  const closing=Number($("closing").value)||0;
  const interest=Number($("interest").value)||0;
  const repayment=Number($("repayment").value)||0;
  const nonRec=Number($("nonRecoverable").value)||0;
  const maintenance=Number($("maintenance").value)||0;
  const vacancy=Number($("vacancy").value)||0;
  const total=price*(1+closing/100);
  const loan=Math.max(0,total-equity);
  const rate=loan*((interest+repayment)/100)/12;
  const cash=rent-rate-nonRec-maintenance-rent*(vacancy/100);
  $("calcTotal").textContent=price?euro.format(total):"—";
  $("calcLoan").textContent=price?euro.format(loan):"—";
  $("calcRate").textContent=price?euro.format(rate)+" / M.":"—";
  $("calcYield").textContent=price&&rent?num.format(rent*12/price*100)+" %":"—";
  $("calcFactor").textContent=rent?num.format(price/(rent*12)):"—";
  $("calcCashflow").textContent=price&&rent?euro.format(cash)+" / M.":"—";
  $("statSqm").textContent=price&&area?euro.format(price/area):"—";
  const badge=$("cashBadge");
  badge.className="cash "+(cash>=0?"plus":"minus");
  badge.textContent=price&&rent?(cash>=0?"+":"")+euro.format(cash)+" / M.":"Miete ergänzen";
}
function render(text,url){
  listing=parse(text);
  const risks=scan(text);
  $("resultTitle").textContent=listing.title||"Immobilienangebot";
  $("resultSource").textContent=url||"Manuell eingefügter Text";
  $("statPrice").textContent=listing.purchasePrice?euro.format(listing.purchasePrice):"—";
  $("statArea").textContent=listing.livingArea?num.format(listing.livingArea)+" m²":"—";
  $("statRooms").textContent=listing.rooms?num.format(listing.rooms):"—";
  $("statYear").textContent=listing.yearBuilt||"—";
  $("statHouseMoney").textContent=listing.houseMoney?euro.format(listing.houseMoney)+" / M.":"—";
  $("statRent").textContent=listing.monthlyColdRent?euro.format(listing.monthlyColdRent)+" / M.":"—";
  $("statEnergy").textContent=listing.energyClass||"—";
  $("detailCommission").textContent=listing.commission||"Nicht erkannt";
  $("detailSource").textContent=url||"Manueller Text";
  $("preview").textContent=text.slice(0,1000)+(text.length>1000?" …":"");
  if(listing.monthlyColdRent)$("rentOverride").value=listing.monthlyColdRent;
  const count=[listing.purchasePrice,listing.livingArea,listing.rooms,listing.monthlyColdRent,listing.houseMoney,listing.yearBuilt].filter(v=>v!==null).length;
  const quality=count>=4?"hoch":count>=2?"mittel":"niedrig";
  const q=$("qualityBadge");q.className="confidence "+quality;q.textContent="Datenqualität: "+quality;
  $("riskCount").textContent=risks.length+" Treffer";
  $("riskList").innerHTML=risks.length?risks.map(r=>`<article class="risk ${r.severity}"><i></i><div><b>${escapeHtml(r.title)}</b><p>${escapeHtml(r.context)}</p></div></article>`).join(""):'<div class="empty">Keine typischen Risiko-Schlagwörter erkannt. Das ersetzt keine Unterlagenprüfung.</div>';
  $("features").classList.add("hidden");
  $("results").classList.remove("hidden");
  updateFinance();
  $("results").scrollIntoView({behavior:"smooth",block:"start"});
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
$("analyzerForm").addEventListener("submit",e=>{
  e.preventDefault();
  const text=$("listingText").value.trim(),url=$("listingUrl").value.trim();
  if(!text){$("formError").textContent="Bitte füge den Text der Immobilienanzeige ein."; $("formError").classList.remove("hidden"); return}
  $("formError").classList.add("hidden");render(text,url);
});
$("demoButton").addEventListener("click",()=>{
  $("listingUrl").value="https://www.immobilienscout24.de/expose/beispiel";
  $("listingText").value="Titel: 2-Zimmer-Wohnung als Kapitalanlage. Kaufpreis: 149.000 €. Wohnfläche: 52 m². Zimmer: 2. Baujahr: 1978. Hausgeld: 285 € monatlich. Kaltmiete: 690 €. Energieeffizienzklasse: D. Maklerprovision: 3,57 %. Die Wohnung ist vermietet. Laut Eigentümerversammlung ist in den nächsten Jahren eine Fassadensanierung geplant. Eine Sonderumlage ist derzeit nicht beschlossen.";
});
["equity","closing","interest","repayment","rentOverride","nonRecoverable","maintenance","vacancy"].forEach(id=>$(id).addEventListener("input",updateFinance));
