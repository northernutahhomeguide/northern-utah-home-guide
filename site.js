const TOWNS = window.SITE_TOWNS||[];
const OUTDOORS = window.SITE_OUTDOORS||[];
const PAGE_OF = window.SITE_PAGES||{};
const ROOT = document.body.dataset.root||"";
const KW_URL = window.SITE_KW||"https://christinacacciacarne.kw.com/";
const REGIONS = [
  {key:"Cache Valley",label:"Cache Valley",color:"var(--r-cache)"},
  {key:"Bear Lake & Rich County",label:"Bear Lake",color:"var(--r-bear)"},
  {key:"Box Elder County",label:"Box Elder",color:"var(--r-box)"},
  {key:"Ogden & Weber County",label:"Ogden & Weber",color:"var(--r-weber)"}
];
const regionColor = r => (REGIONS.find(x=>x.key===r)||REGIONS[0]).color;
const esc = s => String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $ = id => document.getElementById(id);
const store = {get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

document.querySelectorAll("a.kw").forEach(a=>a.href=KW_URL);
TOWNS.sort((a,b)=>a.name.localeCompare(b.name));

const OUT_TYPES=[["lake","Lakes & reservoirs"],["ski","Ski resorts & nordic"],["fishing","Rivers & streams for fishing"],["trail","Hiking & biking trails"],["other","More outdoors"]];
function miles(a,b){const R=3958.8,r=Math.PI/180,dLa=(b.lat-a.lat)*r,dLo=(b.lng-a.lng)*r;const h=Math.sin(dLa/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function nearby(t,max){return OUTDOORS.map(o=>Object.assign({},o,{d:miles(t,o)})).filter(o=>o.d<=max).sort((a,b)=>a.d-b.d);}
function list(arr){return `<ul>${arr.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`}
function acc(title,count,inner,open){return inner?`<details class="acc"${open?" open":""}><summary>${esc(title)}${count?`<span class="n">${count}</span>`:""}</summary><div class="body">${inner}</div></details>`:""}
const ne=a=>Array.isArray(a)&&a.length;
async function copyText(text,statusEl,srcEl){
  try{await navigator.clipboard.writeText(text);$(statusEl).textContent="Copied";}
  catch(e){const r=document.createRange();r.selectNodeContents($(srcEl));const s=getSelection();s.removeAllRanges();s.addRange(r);$(statusEl).textContent="Selected. Press copy on your device.";}
  setTimeout(()=>$(statusEl).textContent="",3000);
}
if(document.getElementById("map")){
let region="All", selected=store.get("town")||"Logan";
if(!TOWNS.find(t=>t.name===selected)) selected="Logan";
const chipsEl=$("regionChips");
function renderChips(){
  chipsEl.innerHTML=[{key:"All",label:"All areas"}].concat(REGIONS).map(r=>
    `<button class="chip" type="button" data-r="${esc(r.key)}" aria-pressed="${region===r.key}">${r.color?`<span class="dot" style="background:${r.color}"></span>`:""}${esc(r.label)}</button>`).join("");
}
chipsEl.addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;region=b.dataset.r;renderChips();renderList();renderMap();});

function filtered(){
  const q=$("townSearch").value.trim().toLowerCase(), to=$("commuteTo").value, max=+$("commuteMax").value;
  return TOWNS.filter(t=>(region==="All"||t.region===region)&&(!q||t.name.toLowerCase().includes(q))&&(max>=999||(t.commute&&t.commute[to]!=null&&t.commute[to]<=max)));
}
function renderList(){
  const list=filtered();
  $("townCount").textContent=`${list.length} ${list.length===1?"town":"towns"}`;
  $("townList").innerHTML=list.map(t=>`<button class="tbtn" type="button" data-t="${esc(t.name)}" aria-current="${t.name===selected}"><span class="dot" style="background:${regionColor(t.region)}"></span>${esc(t.name)}</button>`).join("")||`<span class="note">No towns match. Try a longer drive time or another area.</span>`;
}
$("townList").addEventListener("click",e=>{const b=e.target.closest(".tbtn");if(b)select(b.dataset.t,true)});
["townSearch","commuteTo","commuteMax"].forEach(id=>$(id).addEventListener("input",()=>{renderList();renderMap();}));

// map projection
const lngs=TOWNS.map(t=>t.lng), lats=TOWNS.map(t=>t.lat);
const minLng=Math.min(...lngs)-.08,maxLng=Math.max(...lngs)+.08,minLat=Math.min(...lats)-.06,maxLat=Math.max(...lats)+.06;
const kx=Math.cos(41.6*Math.PI/180), W=560, H=420;
const sc=Math.min((W-40)/((maxLng-minLng)*kx),(H-40)/(maxLat-minLat));
const offX=(W-(maxLng-minLng)*kx*sc)/2, offY=(H-(maxLat-minLat)*sc)/2;
const px=t=>[offX+(t.lng-minLng)*kx*sc, offY+(maxLat-t.lat)*sc];
function renderMap(){
  const show=new Set(filtered().map(t=>t.name));
  const regLbl=[["Cache Valley",41.86,-111.62],["Bear Lake",41.95,-111.28],["Box Elder",41.9,-112.55],["Ogden & Weber",41.14,-111.72]];
  let s=regLbl.map(([n,la,ln])=>{const [x,y]=px({lat:la,lng:ln});return `<text class="reg" x="${x}" y="${y}" text-anchor="middle">${n}</text>`}).join("");
  const order=TOWNS.slice().sort((a,b)=>(a.name===selected)-(b.name===selected));
  s+=order.map(t=>{const [x,y]=px(t);const on=show.has(t.name), sel=t.name===selected;
    return `<g class="t" data-t="${esc(t.name)}" tabindex="${on?0:-1}" role="button" aria-label="${esc(t.name)}" opacity="${on?1:.18}"><title>${esc(t.name)}</title><circle cx="${x}" cy="${y}" r="${sel?8:5}" fill="${regionColor(t.region)}" ${sel?'stroke="var(--ink)" stroke-width="2"':''}/>${sel?`<text class="lbl" x="${x+12}" y="${y+4}">${esc(t.name)}</text>`:""}</g>`}).join("");
  $("map").innerHTML=s;
}
$("map").addEventListener("click",e=>{const g=e.target.closest(".t");if(g&&g.getAttribute("opacity")!=="0.18")select(g.dataset.t,false)});
$("map").addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.closest(".t")){e.preventDefault();select(e.target.closest(".t").dataset.t,false)}});

function renderDetail(){
  const t=TOWNS.find(x=>x.name===selected); if(!t)return;
  const sc=t.schools||{};
  const schoolParts=[["Elementary",sc.elementary],["Middle / junior high",sc.middle],["High school",sc.high],["Charter & private",sc.charterPrivate],["Colleges",sc.higherEd]].filter(([,a])=>ne(a));
  const schoolsHtml=(t.schoolDistrict?`<div><b>District:</b> ${esc(t.schoolDistrict)}</div>`:"")+schoolParts.map(([l,a])=>`<div class="sublabel">${l}</div>${list(a)}`).join("");
  const nSchools=schoolParts.reduce((s,[,a])=>s+a.length,0);
  const parks=ne(t.parks)?list(t.parks):"";
  const rec=ne(t.recreation)?list(t.recreation):"";
  const near=nearby(t,30);
  const outdoorHtml=OUT_TYPES.map(([k,label])=>{const items=near.filter(o=>o.type===k).slice(0,5);return items.length?`<div class="sublabel">${label}</div><ul class="outlist">${items.map(o=>`<li><div><strong>${o.url?`<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.name)}</a>`:esc(o.name)}</strong><span class="mi num">${o.d<1?"in town":"~"+Math.round(o.d)+" mi"}</span></div><div class="note">${esc(o.desc)}</div></li>`).join("")}</ul>`:""}).join("");
  const shop=(ne(t.shopping)?`<div class="sublabel">Shopping</div>${list(t.shopping)}`:"")+(ne(t.dining)?`<div class="sublabel">Local dining</div>${list(t.dining)}`:"");
  const health=(ne(t.healthcare)?`<div class="sublabel">Healthcare</div>${list(t.healthcare)}`:"")+(t.library?`<div class="sublabel">Library</div><div>${esc(t.library)}</div>`:"");
  const events=ne(t.events)?t.events.map(ev=>`<div class="event"><b>${esc(ev.when)}</b><div><strong>${esc(ev.name)}</strong>${ev.desc?`<div class="note">${esc(ev.desc)}</div>`:""}</div></div>`).join(""):"";
  const senior=ne(t.seniorResources)?list(t.seniorResources):"";
  const gtk=ne(t.goodToKnow)?list(t.goodToKnow):"";
  const cm=t.commute||{};const maxC=90;
  const comm=["Logan","Brigham City","Ogden","Hill AFB","Salt Lake City"].filter(k=>cm[k]!=null).map(k=>{
    const v=cm[k];return `<div class="cm"><span>${k}</span><div class="bar"><i style="width:${Math.max(3,Math.min(100,v/maxC*100))}%"></i></div><span class="num">${v<=3?"in town":"~"+v+" min"}</span></div>`}).join("");
  $("townDetail").innerHTML=`
    <div style="display:grid;gap:8px">
      <div class="eyebrow" style="color:${regionColor(t.region)}">${esc(t.region)} · ${esc(t.county)} County</div>
      <h3>${esc(t.name)}</h3>
      <div class="tags">${t.population?`<span class="tag">Population ${esc(t.population.replace(/^approx\.\s*/i,"≈ "))}</span>`:""}${t.schoolDistrict?`<span class="tag">${esc(t.schoolDistrict.split("(")[0].trim())}</span>`:""}</div>
    </div>
    <p>${esc(t.overview)}</p>
    ${comm?`<div class="commute"><div class="sublabel" style="margin:0">Typical drive times</div>${comm}</div>`:""}
    <div>
      ${acc("Schools",nSchools||"",schoolsHtml,false)}
      ${acc("Parks",ne(t.parks)?t.parks.length:"",parks,false)}
      ${acc("Recreation",ne(t.recreation)?t.recreation.length:"",rec,false)}
      ${acc("Lakes, rivers & the outdoors",near.length?near.filter(o=>o.d<=30).length+" nearby":"",outdoorHtml,false)}
      ${acc("Shopping & dining","",shop,false)}
      ${acc("Healthcare & library","",health,false)}
      ${acc("Yearly events",ne(t.events)?t.events.length:"",events,false)}
      ${acc("Senior centers & 55+",ne(t.seniorResources)?t.seniorResources.length:"",senior,false)}
      ${acc("Good to know before you buy",ne(t.goodToKnow)?t.goodToKnow.length:"",gtk,true)}
    </div>
    <div class="actions">
      ${PAGE_OF[t.name]?`<a class="btn btn-olive btn-sm" href="${ROOT}${PAGE_OF[t.name]}">Full ${esc(t.name)} guide</a>`:""}
      <a class="btn btn-ghost btn-sm" href="${KW_URL}" target="_blank" rel="noopener">Homes for sale</a>
      <a class="btn btn-ghost btn-sm" href="#value" data-ask="${esc(t.name)}">Ask me about ${esc(t.name)}</a>
      ${t.cityWebsite?`<a class="btn btn-ghost btn-sm" href="${esc(t.cityWebsite)}" target="_blank" rel="noopener">City website</a>`:""}
    </div>`;
}
$("townDetail").addEventListener("click",e=>{const a=e.target.closest("[data-ask]");if(a){const m=$("v_msg");if(!m.value)m.value=`I'd like to know more about ${a.dataset.ask}.`;}});
function select(name,fromList){
  selected=name;store.set("town",name);renderList();renderMap();renderDetail();
  if(window.innerWidth<900) $("townDetail").scrollIntoView({behavior:"smooth",block:"start"});
}

// compare
function fillCmp(){
  const opts=TOWNS.map(t=>`<option>${esc(t.name)}</option>`).join("");
  $("cmpA").innerHTML=opts;$("cmpB").innerHTML=opts;$("cmpA").value="Logan";$("cmpB").value=TOWNS.find(t=>t.name==="Brigham City")?"Brigham City":TOWNS[1].name;
}
function renderCmp(){
  const a=TOWNS.find(t=>t.name===$("cmpA").value),b=TOWNS.find(t=>t.name===$("cmpB").value);
  const cnt=(t,k)=>ne(t[k])?t[k].length:"—";
  const sch=t=>{const s=t.schools||{};return ["elementary","middle","high"].map(k=>(s[k]||[]).length).reduce((x,y)=>x+y,0)||"—"};
  const c=(t,k)=>t.commute&&t.commute[k]!=null?(t.commute[k]<=3?"in town":`~${t.commute[k]} min`):"—";
  const rows=[["Area",t=>esc(t.region)],["Population",t=>esc((t.population||"—").replace(/^approx\.\s*/i,"≈ "))],["School district",t=>esc(t.schoolDistrict||"—")],["Public schools listed",sch],
    ["Parks listed",t=>cnt(t,"parks")],["Outdoor spots within 20 mi",t=>nearby(t,20).length||"—"],["Nearest lake or reservoir",t=>{const l=nearby(t,60).find(o=>o.type==="lake");return l?esc(l.name)+` (~${Math.max(1,Math.round(l.d))} mi)`:"—"}],["Nearest ski area",t=>{const l=nearby(t,80).find(o=>o.type==="ski");return l?esc(l.name)+` (~${Math.max(1,Math.round(l.d))} mi)`:"—"}],["Yearly events",t=>cnt(t,"events")],["Nearest healthcare",t=>esc(ne(t.healthcare)?t.healthcare[0]:"—")],
    ["Drive to Logan",t=>c(t,"Logan")],["Drive to Ogden",t=>c(t,"Ogden")],["Drive to Hill AFB",t=>c(t,"Hill AFB")],["Drive to Salt Lake City",t=>c(t,"Salt Lake City")]];
  $("cmpTable").innerHTML=`<thead><tr><th></th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead><tbody>${rows.map(([l,f])=>`<tr><th scope="row">${l}</th><td class="num">${f(a)}</td><td class="num">${f(b)}</td></tr>`).join("")}</tbody>`;
}
$("cmpA").addEventListener("change",renderCmp);$("cmpB").addEventListener("change",renderCmp);


renderChips();renderList();renderMap();renderDetail();fillCmp();renderCmp();

}
if(document.getElementById("tabs")){
const money=v=>(v<0?"−":"")+"$"+Math.round(Math.abs(v)).toLocaleString("en-US");
const val=id=>{const n=parseFloat($(id).value);return isFinite(n)?n:0};
function pmt(principal,ratePct,years){const r=ratePct/100/12,n=years*12;if(principal<=0)return 0;if(r===0)return principal/n;return principal*r/(1-Math.pow(1+r,-n));}
function lines(el,rows){$(el).innerHTML=rows.map(([l,v,strong])=>`<div${strong?' style="font-weight:700"':""}><span>${l}</span><span>${v}</span></div>`).join("")}
function stack(el,leg,parts){const tot=parts.reduce((s,p)=>s+Math.max(0,p[1]),0)||1;
  $(el).innerHTML=parts.map(p=>`<i style="display:block;width:${Math.max(0,p[1])/tot*100}%;background:${p[2]}"></i>`).join("");
  $(leg).innerHTML=parts.map(p=>`<span><span class="dot" style="background:${p[2]}"></span>${p[0]}</span>`).join("");}

function calcNet(){
  const P=val("n_price"),pay=val("n_payoff")+val("n_heloc"),comm=P*(val("n_list")+val("n_buy"))/100;
  const fees=val("n_title")+val("n_conc")+val("n_tax")+val("n_rep")+val("n_other");
  const net=P-pay-comm-fees;
  $("n_out").textContent=money(net);$("n_out").classList.toggle("neg",net<0);
  stack("n_stack","n_legend",[["Your net",Math.max(0,net),"var(--olive)"],["Loan payoff",pay,"var(--sage)"],["Commissions",comm,"var(--gold)"],["Fees & costs",fees,"var(--coral)"]]);
  lines("n_lines",[["Sale price",money(P)],["Loan payoff & liens","−"+money(pay)],[`Commissions (${(val("n_list")+val("n_buy")).toFixed(2)}%)`,"−"+money(comm)],["Title & settlement","−"+money(val("n_title"))],["Concessions","−"+money(val("n_conc"))],["Tax proration","−"+money(val("n_tax"))],["Repairs & prep","−"+money(val("n_rep"))],["Other fees","−"+money(val("n_other"))],["Estimated net",money(net),true]]);
}
function calcMort(){
  const P=val("m_price"),dp=val("m_down"),loan=P*(1-dp/100);
  const pi=pmt(loan,val("m_rate"),+$("m_term").value),tax=val("m_tax")/12,ins=val("m_ins")/12,hoa=val("m_hoa"),pmi=dp<20?loan*val("m_pmi")/100/12:0;
  const tot=pi+tax+ins+hoa+pmi;
  $("m_out").textContent=money(tot);
  stack("m_stack","m_legend",[["Principal & interest",pi,"var(--olive)"],["Taxes",tax,"var(--gold)"],["Insurance",ins,"var(--teal)"],["Mortgage ins.",pmi,"var(--coral)"],["HOA",hoa,"var(--sage)"]].filter(p=>p[1]>0));
  lines("m_lines",[["Down payment",money(P*dp/100)],["Loan amount",money(loan)],["Principal & interest",money(pi)],["Property tax",money(tax)],["Insurance",money(ins)],["Mortgage insurance",money(pmi)],["HOA",money(hoa)],["Total per month",money(tot),true]]);
}
function calcAfford(){
  const inc=val("a_inc")/12,maxTotal=inc*(+$("a_dti").value)/100,housing=Math.max(0,maxTotal-val("a_debt")),pi=Math.max(0,housing-val("a_tx"));
  const r=val("a_rate")/100/12,n=360,loan=r?pi*(1-Math.pow(1+r,-n))/r:pi*n,price=loan+val("a_downamt");
  $("a_out").textContent=money(Math.round(price/5000)*5000);
  lines("a_lines",[["Gross monthly income",money(inc)],["Max total debt payments",money(maxTotal)],["Existing debts","−"+money(val("a_debt"))],["Room for housing",money(housing)],["Principal & interest portion",money(pi)],["Loan amount",money(loan)],["Plus down payment",money(val("a_downamt"))],["Approximate price",money(price),true]]);
}
function calcRB(){
  const yrs=Math.max(1,Math.round(val("r_yrs"))),P=val("r_price"),loan=P*(1-val("r_down")/100),rate=val("r_rate")/100/12,pay=pmt(loan,val("r_rate"),30);
  let rent=val("r_rent"),rentTot=0,bal=loan,interest=0;
  for(let m=0;m<yrs*12;m++){rentTot+=rent;if((m+1)%12===0)rent*=1+val("r_rentup")/100;const i=bal*rate;interest+=i;bal-=Math.min(bal,pay-i);}
  const value=P*Math.pow(1+val("r_app")/100,yrs),sell=value*.07,own=val("r_own")*12*yrs;
  const ownCost=interest+own+sell, gain=value-P;
  const buyCost=ownCost-gain, adv=rentTot-buyCost;
  $("r_yrslbl").textContent=yrs;
  $("r_out").textContent=(adv>=0?"":"")+money(Math.abs(adv))+(adv>=0?" ahead":" behind");
  $("r_out").classList.toggle("neg",adv<0);
  lines("r_lines",[["Total rent paid",money(rentTot)],["Mortgage interest",money(interest)],["Taxes, insurance, upkeep",money(own)],["Cost to sell (≈7%)",money(sell)],["Home value growth","+"+money(gain)],["Principal paid down",money(loan-bal)],["Net cost of owning",money(buyCost)],[adv>=0?"Buying comes out ahead by":"Renting comes out ahead by",money(Math.abs(adv)),true]]);
}
function calcInv(){
  const P=val("i_price"),down=P*val("i_down")/100,loan=P-down,pi=pmt(loan,val("i_rate"),30),rent=val("i_rent");
  const vac=rent*val("i_vac")/100,mg=rent*val("i_mgmt")/100,opex=vac+mg+val("i_exp")+val("i_maint");
  const noi=(rent-opex)*12,cf=rent-opex-pi,cash=down+val("i_close");
  $("i_out").textContent=money(cf);$("i_out").classList.toggle("neg",cf<0);
  lines("i_lines",[["Rent",money(rent)],["Vacancy","−"+money(vac)],["Management","−"+money(mg)],["Taxes + insurance","−"+money(val("i_exp"))],["Repairs & capex","−"+money(val("i_maint"))],["Mortgage (P&I)","−"+money(pi)],["Cap rate",P?(noi/P*100).toFixed(2)+"%":"—"],["Cash-on-cash return",cash?(cf*12/cash*100).toFixed(2)+"%":"—"],["Cash invested",money(cash),true]]);
}
const calcs={net:calcNet,mortgage:calcMort,afford:calcAfford,rentbuy:calcRB,invest:calcInv};
document.querySelectorAll(".tool").forEach(p=>p.addEventListener("input",()=>calcs[p.dataset.panel]()));
function showTab(k){document.querySelectorAll(".tab").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===k));document.querySelectorAll(".tool").forEach(p=>p.hidden=p.dataset.panel!==k);calcs[k]();}
$("tabs").addEventListener("click",e=>{const b=e.target.closest(".tab");if(b)showTab(b.dataset.tab)});
Object.values(calcs).forEach(f=>f());
const h0=(location.hash||"").slice(1);if(calcs[h0])showTab(h0);
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(calcs[h])showTab(h)});


}
function accGroup(el,groups){if(!$(el))return;$(el).insertAdjacentHTML("beforeend",groups.map(([t,items],i)=>acc(t,items.length,list(items),i===0)).join(""))}
accGroup("sellerTips",[
 ["Before the photos",["Declutter every room and closet; buyers open doors","Deep clean, including windows, grout, baseboards and the oven","Repaint bold or scuffed walls in a light, warm neutral","Replace burned-out bulbs and use one color of bulb throughout","Fix the small things: dripping faucets, sticky doors, loose handles, cracked switch plates","Take down most personal photos so buyers can picture their own life there"]],
 ["Curb appeal",["Mow, edge and add fresh mulch or bark to beds","Paint or refinish the front door and update house numbers","Power-wash the driveway, walks and siding","Add planters by the entry; in winter, keep the walks shoveled and the porch lights on","Make sure the garage door and doorbell work"]],
 ["Repairs that pay off",["Consider a pre-listing home inspection so there are no surprises during due diligence","Service the furnace and AC and keep the receipt to show buyers","Re-caulk tubs and showers and fix any active leaks","Test for radon; it's common in northern Utah, and a mitigation system with a recent passing test removes a common objection","Skip big remodels; fresh paint, new fixtures and flooring repairs return more"]],
 ["Paperwork to gather",["Utility averages for the last 12 months","Water share certificates and the irrigation company's contact, if shares transfer with the home","Secondary water details and any well or septic records","Warranties, permits and receipts for recent upgrades","HOA documents and fees, if applicable"]],
 ["Pricing and showings",["Price it right on day one; the first two weeks bring the most attention","Spring and early summer are busiest here, but serious buyers shop year-round","Keep the home ready: lights on, blinds open, comfortable temperature","Plan to be away for showings and take pets with you if you can","Respond quickly to feedback and offers"]]
]);
accGroup("waterGuide",[
 ["Culinary vs. secondary water",["Culinary water is treated drinking water from the city or a water company","Many towns also have secondary (pressurized irrigation) water for lawns and gardens, billed separately","Some areas use irrigation ditches on a schedule, and some homes have neither, so ask how the yard is watered"]],
 ["Water shares",["Rural and older properties may come with shares in a local irrigation company","Shares are usually transferred separately from the deed, so they must be named in the contract","Ask how many shares come with the home, the yearly assessment and the delivery schedule"]],
 ["Private wells",["A well needs a valid water right on file with the Utah Division of Water Rights","Test water quality (bacteria, nitrates) and the flow rate during due diligence","Ask for the well log, pump age and any treatment equipment details"]],
 ["Septic systems",["Septic systems are permitted through the local health department (Bear River Health Department covers Box Elder, Cache and Rich counties)","Request the permit and pumping records and consider a septic inspection","Know where the tank and drain field are before you plan a shop, pool or addition"]],
 ["Radon",["Radon is common across northern Utah and is invisible and odorless","A short-term test during due diligence is inexpensive","If levels are high, a mitigation system is a common, fixable request"]]
]);
accGroup("newBuildGuide",[
 ["Bring me on the first visit",["Many builders only work with a buyer's agent who is registered at your first visit or sign-in","The sales rep in the model home works for the builder; I work for you","Builder incentives are often negotiable, especially on homes already under construction"]],
 ["Questions to ask the builder",["What is included in the base price, and what are the upgrade costs?","Are there lot premiums, HOA dues or special assessments?","What is the realistic completion date, and what happens if it slips?","Is the incentive tied to using the builder's lender or title company?","Is secondary water available, and who installs landscaping and fencing?"]],
 ["Protect yourself",["Get a pre-drywall inspection and a final inspection, even on a new home","Read the warranty: what's covered, for how long and how to file a claim","Spend on things that are hard to change later (structure, layout, insulation, windows) before cosmetic upgrades","Walk the lot and check grading and drainage away from the foundation"]]
]);
if($("investGuide"))$("investGuide").insertAdjacentHTML("beforeend",acc("What I help investors with",4,list(["Finding rentals, duplexes, land and fix-and-flip opportunities across Cache, Box Elder, Rich and Weber counties","Running rent and cash-flow numbers on every property we consider","Checking zoning, accessory dwelling unit (ADU) rules and rental licensing for each city","Connecting you with local lenders, property managers, inspectors and contractors"]),true)
 +acc("Short-term and vacation rentals",3,list(["Short-term rental rules differ by city and county, including at Bear Lake and in Ogden Valley","Some cities require a business license, permit or owner on site","Confirm the rules and any HOA restrictions before you write an offer"]),false)
 +acc("Rentals near Utah State",3,list(["Logan has steady rental demand from the university and local employers","Logan limits how many unrelated people can live in a single-family zone, so check the zoning for each address","Confirm whether a basement apartment is approved as a legal unit before counting its rent"]),false)
 +acc("Taxes and financing",3,list(["Non-owner-occupied homes don't get Utah's 45% primary-residence tax exemption","Investment loans usually need 15–25% down and carry higher rates","Talk with a tax professional about depreciation and 1031 exchanges"]),false)
 +`<div class="actions" style="padding:14px 0 6px"><a class="btn btn-olive btn-sm" href="${ROOT}calculators#invest">Open the cash-flow calculator</a></div>`);

if(document.getElementById("checklist")){
const CHECK=[
 ["The home",["Single-level living","Main-floor primary bedroom","Basement (finished or ready to finish)","Home office or flex room","Separate apartment or mother-in-law suite","Open kitchen and living area","Plenty of storage","Newer construction (built in the last 10 years)"]],
 ["Garage and land",["2+ car garage","3+ car garage or extra-deep bays","RV or trailer parking","Shop or outbuilding","Fenced yard","Larger lot (half acre or more)","Animal rights (horses, chickens, etc.)","Garden space or established trees"]],
 ["Utilities and costs",["City water and sewer (no well or septic)","Secondary water for the yard","Water shares included","No HOA","Solar or energy-efficient features","Natural gas heat"]],
 ["Location",["Short commute to work","Near trails, canyons or parks","Near shopping and services","Mountain or valley views","Quiet street with little through traffic","Specific school district or school (your choice)"]]
];
let cstate=store.get("checklist")||{};
function renderChecklist(){
  $("checklist").innerHTML=CHECK.map(([g,items],gi)=>acc(g,"",`<div class="check">${items.map(it=>{const v=cstate[it]||"";return `<div class="ci"><span>${esc(it)}</span><span class="seg" role="group" aria-label="${esc(it)}"><button type="button" data-i="${esc(it)}" data-v="must" aria-pressed="${v==="must"}">Must</button><button type="button" class="nice" data-i="${esc(it)}" data-v="nice" aria-pressed="${v==="nice"}">Nice</button></span></div>`}).join("")}</div>`,gi===0)).join("");
}
function keepOpen(){return [...$("checklist").querySelectorAll("details")].map(d=>d.open)}
$("checklist").addEventListener("click",e=>{const b=e.target.closest(".seg button");if(!b)return;const it=b.dataset.i,v=b.dataset.v;cstate[it]=cstate[it]===v?"":v;store.set("checklist",cstate);
  const open=keepOpen();renderChecklist();[...$("checklist").querySelectorAll("details")].forEach((d,i)=>d.open=open[i]);summary();});
["b_beds","b_baths","b_budget","b_towns"].forEach(id=>{const saved=store.get(id);if(saved!=null)$(id).value=saved;$(id).addEventListener("input",()=>{store.set(id,$(id).value);summary();})});
function summary(){
  const must=Object.keys(cstate).filter(k=>cstate[k]==="must"),nice=Object.keys(cstate).filter(k=>cstate[k]==="nice");
  const basics=[$("b_beds").value!=="Any"?$("b_beds").value+" bedrooms":"",$("b_baths").value!=="Any"?$("b_baths").value+" bathrooms":"",$("b_budget").value?"up to "+money(+$("b_budget").value):""].filter(Boolean).join(", ");
  const out=[basics?"Basics: "+basics:"",$("b_towns").value?"Towns: "+$("b_towns").value:"",must.length?"Must-haves: "+must.join("; "):"",nice.length?"Nice to have: "+nice.join("; "):""].filter(Boolean).join("\n");
  $("b_summary").textContent=out||"Mark a few items above and your list will appear here.";
}
$("b_copy").addEventListener("click",()=>copyText($("b_summary").textContent,"b_copied","b_summary"));
$("b_reset").addEventListener("click",()=>{cstate={};store.set("checklist",cstate);["b_beds","b_baths"].forEach(id=>{$(id).value="Any";store.set(id,"Any")});["b_budget","b_towns"].forEach(id=>{$(id).value="";store.set(id,"")});renderChecklist();summary();});


renderChecklist();summary();

}
if(document.getElementById("valueForm")){
$("valueForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(!$("v_name").value.trim()||!$("v_contact").value.trim()){$("v_err").textContent="Add your name and a phone number or email so I can reach you.";return;}
  $("v_err").textContent="";
  $("v_text").textContent=`Hi Christina, this is ${$("v_name").value.trim()}.\nI'm looking to: ${$("v_type").value} (${$("v_when").value})\n${$("v_addr").value.trim()?"Property: "+$("v_addr").value.trim()+"\n":""}${$("v_msg").value.trim()?$("v_msg").value.trim()+"\n":""}Best way to reach me: ${$("v_contact").value.trim()}`;
  $("v_done").hidden=false;
});
$("v_copy").addEventListener("click",()=>copyText($("v_text").textContent,"v_copied","v_text"));


}
