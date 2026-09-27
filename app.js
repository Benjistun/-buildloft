const $=id=>document.getElementById(id);
const euro=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const num=new Intl.NumberFormat("de-DE",{maximumFractionDigits:1});
let listing={purchasePrice:null,livingArea:null,rooms:null,monthlyColdRent:null,houseMoney:null,yearBuilt:null,energyClass:null,commission:null,title:null};

const SUPPORTED_HOSTS=["immobilienscout24.de","immowelt.de","immonet.de","kleinanzeigen.de","immobilien.de"];

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
    /([\d.]+(?:,\d+)?)\s*€\s*(?:kaufpreis|preis)/i,
    /(?:kaufpreis|preis)\s*[:\-]?\s*€?\s*([\d.]+(?:,\d+)?)/i
  ]);
  const area=findNumber(t,[
    /(?:wohnfläche|wohnflaeche|fläche|flaeche)\s*[:\-]?\s*([\d.,]+)\s*m(?:²|2)/i,
    /([\d.,]+)\s*m(?:²|2)\s*(?:wohnfläche|wohnflaeche)/i
  ]);
  const rooms=findNumber(t,[
    /(?:zimmer|anzahl zimmer)\s*[:\-]?\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:zimmer|zi\.)/i
  ]);
  const rent=findNumber(t,[
    /(?:kaltmiete|nettokaltmiete|monatsmiete|mieteinnahmen?)\s*[:\-]?\s*([\d.]+(?:,\d+)?)\s*€/i,
    /([\d.]+(?:,\d+)?)\s*€\s*(?:kaltmiete|nettokaltmiete)/i
  ]);
  const houseMoney=findNumber(t,[/(?:hausgeld|wohngeld)\s*[:\-]?\s*([\d.]+(?:,\d+)?)\s*€/i]);
  const year=findNumber(t,[/(?:baujahr|erbaut|baujahr ca\.)\s*[:\-]?\s*((?:18|19|20)\d{2})/i]);
  const energy=(t.match(/(?:energieeffizienzklasse|energieklasse|effizienzklasse)\s*[:\-]?\s*([A-H][+]{0,2})\b/i)||[])[1]||null;
  const commission=(t.match(/(?:provision|courtage|maklerprovision)\s*[:\-]?\s*([^.;\n]{2,90})/i)||[])[1]||null;
  let title=(t.match(/(?:^|\n)(?:title|titel)\s*[:\-]\s*([^\n|]{8,140})/im)||[])[1]||null;
  if(!title){
    const firstLine=text.split("\n").map(x=>x.trim()).find(x=>x.length>12&&x.length<160&&!/^url source:/i.test(x));
    title=firstLine||null;
  }
  return{
    purchasePrice:price&&price>1000?price:null,
    livingArea:area&&area>5&&area<5000?area:null,
    rooms:rooms&&rooms>0&&rooms<100?rooms:null,
    monthlyColdRent:rent&&rent>50?rent:null,
    houseMoney:houseMoney&&houseMoney>0?houseMoney:null,
    yearBuilt:year&&year>=1700&&year<=2030?Math.round(year):null,
    energyClass:energy,
    commission:commission?commission.trim():null,
    title:title?title.trim():null
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
  ["Vermietet","info",/ist vermietet|vermietete wohnung|mietverhältnis|mietverhaeltnis|kapitalanlage/i],
  ["Renovierungsbedarf","info",/renovierungsbedürftig|renovierungsbeduerftig|sanierungsbedürftig|sanierungsbeduerftig|handwerkerobjekt/i],
  ["Modernisiert","positive",/kernsanier|vollständig saniert|komplett saniert|umfangreich modernisiert/i]
];
function scan(text){
  return rules.flatMap(([title,severity,re])=>{
    const m=text.match(re);if(!m||m.index==null)return[];
    const start=Math.max(0,m.index-85),end=Math.min(text.length,m.index+m[0].length+150);
    return[{title,severity,context:text.slice(start,end).replace(/\s+/g," ").trim()}];
  });
}
function updateFinance(){
  const price=listing.purchasePrice||0,area=listing.livingArea||0;
  const rent=Number($("rentOverride").value)||listing.monthlyColdRent||0;
  const equity=Number($("equity").value)||0,closing=Number($("closing").value)||0;
  const interest=Number($("interest").value)||0,repayment=Number($("repayment").value)||0;
  const nonRec=Number($("nonRecoverable").value)||0,maintenance=Number($("maintenance").value)||0;
  const vacancy=Number($("vacancy").value)||0;
  const total=price*(1+closing/100),loan=Math.max(0,total-equity);
  const rate=loan*((interest+repayment)/100)/12;
  const cash=rent-rate-nonRec-maintenance-rent*(vacancy/100);
  $("calcTotal").textContent=price?euro.format(total):"—";
  $("calcLoan").textContent=price?euro.format(loan):"—";
  $("calcRate").textContent=price?euro.format(rate)+" / M.":"—";
  $("calcYield").textContent=price&&rent?num.format(rent*12/price*100)+" %":"—";
  $("calcFactor").textContent=price&&rent?num.format(price/(rent*12)):"—";
  $("calcCashflow").textContent=price&&rent?euro.format(cash)+" / M.":"—";
  $("statSqm").textContent=price&&area?euro.format(price/area):"—";
  const badge=$("cashBadge");badge.className="cash "+(cash>=0?"plus":"minus");
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
  $("preview").textContent=text.slice(0,1200)+(text.length>1200?" …":"");
  if(listing.monthlyColdRent)$("rentOverride").value=listing.monthlyColdRent;
  const count=[listing.purchasePrice,listing.livingArea,listing.rooms,listing.monthlyColdRent,listing.houseMoney,listing.yearBuilt].filter(v=>v!==null).length;
  const quality=count>=4?"hoch":count>=2?"mittel":"niedrig";
  const q=$("qualityBadge");q.className="confidence "+quality;q.textContent="Datenqualität: "+quality;
  $("riskCount").textContent=risks.length+" Treffer";
  $("riskList").innerHTML=risks.length?risks.map(r=>`<article class="risk ${r.severity}"><i></i><div><b>${escapeHtml(r.title)}</b><p>${escapeHtml(r.context)}</p></div></article>`).join(""):'<div class="empty">Keine typischen Risiko-Schlagwörter erkannt. Das ersetzt keine Unterlagenprüfung.</div>';
  $("features").classList.add("hidden");$("results").classList.remove("hidden");
  updateFinance();$("results").scrollIntoView({behavior:"smooth",block:"start"});
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function validateUrl(raw){
  let u;try{u=new URL(raw)}catch{return null}
  if(u.protocol!=="https:"&&u.protocol!=="http:")return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,"");
  if(!SUPPORTED_HOSTS.some(h=>host===h||host.endsWith("."+h)))return null;
  return u;
}
function setLoading(on,text="Daten werden ausgelesen und geprüft."){
  $("loadingBox").classList.toggle("hidden",!on);
  $("loadingText").textContent=text;
  $("analyzeButton").disabled=on;
  $("analyzeButton").textContent=on?"Analysiere …":"Link analysieren →";
}
function showError(message){
  $("formError").textContent=message;$("formError").classList.remove("hidden");
}
async function analyzeUrl(raw){
  const u=validateUrl(raw);
  if(!u){showError("Bitte füge einen gültigen Link von ImmoScout24, Immowelt, Immonet, Kleinanzeigen oder immobilien.de ein.");return}
  $("formError").classList.add("hidden");
  setLoading(true,"Anzeige wird vom Portal geladen …");
  try{
    const readerUrl="https://r.jina.ai/"+u.href;
    const response=await fetch(readerUrl,{headers:{"Accept":"text/plain"}});
    if(!response.ok)throw new Error("Reader HTTP "+response.status);
    const content=await response.text();
    if(!content||content.trim().length<120)throw new Error("Zu wenig Inhalt");
    setLoading(true,"Kennzahlen und mögliche Risiken werden erkannt …");
    render(content,u.href);
  }catch(err){
    console.error(err);
    showError("Die Anzeige konnte nicht automatisch ausgelesen werden. Öffne unten den manuellen Fallback und füge den Anzeigentext ein.");
    $("fallbackDetails").open=true;
  }finally{setLoading(false)}
}
$("analyzerForm").addEventListener("submit",e=>{e.preventDefault();analyzeUrl($("listingUrl").value.trim())});
$("manualAnalyze").addEventListener("click",()=>{
  const text=$("listingText").value.trim(),url=$("listingUrl").value.trim();
  if(!text){showError("Bitte füge den Text der Immobilienanzeige ein.");return}
  $("formError").classList.add("hidden");render(text,url);
});
$("demoButton").addEventListener("click",()=>{
  $("listingUrl").value="";
  const demo="Titel: 2-Zimmer-Wohnung als Kapitalanlage\nKaufpreis: 149.000 €\nWohnfläche: 52 m²\nZimmer: 2\nBaujahr: 1978\nHausgeld: 285 € monatlich\nKaltmiete: 690 €\nEnergieeffizienzklasse: D\nMaklerprovision: 3,57 %\nDie Wohnung ist vermietet. Laut Eigentümerversammlung ist in den nächsten Jahren eine Fassadensanierung geplant. Eine Sonderumlage ist derzeit nicht beschlossen.";
  render(demo,"Demo-Angebot");
});
["equity","closing","interest","repayment","rentOverride","nonRecoverable","maintenance","vacancy"].forEach(id=>$(id).addEventListener("input",updateFinance));
