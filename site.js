const TOWNS = window.SITE_TOWNS||[];
const OUTDOORS = window.SITE_OUTDOORS||[];
const PAGE_OF = window.SITE_PAGES||{};
const ROOT = document.body.dataset.root||"";
const API_ORIGIN = /(^|\.)northernutahhomeguide\.com$/.test(location.hostname)?"":"https://northernutahhomeguide.com";
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

const LAKETAGS=window.SITE_LAKETAGS||{},ENERGY=window.SITE_ENERGY||null;
const ICONS={schools:'<path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M7 11.5V16c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5"/>',parks:'<path d="M12 3l5 8h-3l4 6H6l4-6H7z"/><path d="M12 17v4"/>',things:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',outdoors:'<path d="M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5S16 18 18 18s2-1.5 4-1.5"/><path d="M5 14l4-7 3 5 2-3 4 5"/>',dining:'<path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10"/><path d="M17 3c-2 2-2 6 0 8v10"/>',utilities:'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',health:'<path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z"/>',events:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',senior:'<circle cx="12" cy="7" r="3"/><path d="M6 21v-2a6 6 0 0112 0v2"/>',gtk:'<path d="M12 3a9 9 0 100 18 9 9 0 000-18z"/><path d="M12 8h.01M11 12h1v5h1"/>',new:'<path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/>'};
function ico(k){return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]||""}</svg>`}
function sec(id,k,title,count,inner,open){return inner?`<details class="acc" id="${id}-${k}"${open?" open":""}><summary>${ico(k)}<span class="st">${esc(title)}</span>${count?`<span class="n">${count}</span>`:""}</summary><div class="body">${inner}</div></details>`:""}
function lakeTag(n){const x=LAKETAGS[n];if(!x||!x.tag)return "";const l={free:"Free",fee:"Day-use fee",mixed:"Free & fee areas"}[x.tag];return `<span class="feetag ${x.tag}">${l}</span>`}
function itemHtml(s){const m=/^([^:]{2,60}):\s*(.+)$/.exec(s);return m?`<li><b>${esc(m[1])}</b> — ${esc(m[2])}</li>`:`<li>${esc(s)}</li>`}
function diningHtml(t){return (ne(t.dining)?`<div class="sublabel">Local favorites</div><ul>${t.dining.map(itemHtml).join("")}</ul>`:"")+(ne(t.shopping)?`<div class="sublabel">Groceries &amp; errands</div>${list(t.shopping)}`:"")+`<p class="note">Hours and seasons change, so check before you go. Know a local favorite we missed? <a href="${ROOT}ask?town=${encodeURIComponent(t.name)}">Tell Christina</a>.</p>`}
function utilHtml(t){const u=t.utilities;if(!u)return "";let h='<div class="util">'+u.rows.map(r=>`<div class="urow"><span class="uk">${esc(r.k)}</span><span>${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.provider)}</a>`:esc(r.provider)}${r.rate?`<small>${esc(r.rate)}</small>`:""}</span></div>`).join("")+(ne(u.internet)?`<div class="urow"><span class="uk">Internet</span><span>${esc(u.internet.join(", "))}<small>Availability varies by street; check your address with each provider.</small></span></div>`:"")+"</div>";
  if(u.start)h+=/^http/.test(u.start)?`<p class="note"><a href="${esc(u.start)}" target="_blank" rel="noopener">Start or transfer city utility service</a></p>`:`<p class="note">Start service: ${esc(u.start)}</p>`;
  if(ENERGY)h+=`<div class="energy"><b>Power bills here are low.</b> Utah homes paid about ${ENERGY.utahCents}¢ per kWh in ${ENERGY.year}, versus about ${ENERGY.caCents}¢ in California and ${ENERGY.usCents}¢ nationally. The average Utah electric bill was about $${ENERGY.utahBill} a month, versus about $${ENERGY.caBill} in California. <a href="${ENERGY.source}" target="_blank" rel="noopener">Source: U.S. EIA</a></div>`;
  return h+'<p class="note">Rates are as posted by each city or provider when this page was updated; confirm before you budget.</p>'}
const TODAY=new Date().toLocaleDateString("en-CA");
function wnItem(w){return `<li><span class="wn-date">${esc(w.date)}</span><div><strong>${esc(w.title)}</strong><div class="note">${esc(w.desc)}${w.link?` <a href="${ROOT}${w.link}">${esc(w.linkText)} →</a>`:(w.url?` <a href="${esc(w.url)}" target="_blank" rel="noopener">Source</a>`:"")}</div></div></li>`}
function newHtml(t,id){const up=(t.upcoming||[]).filter(u=>!u.until||u.until>=TODAY);if(!ne(t.whatsNew)&&!up.length)return "";return `<section class="whatsnew" id="${id}-new" aria-label="What's new in ${esc(t.name)}"><div class="wn-h">${ico("new")}What's new in ${esc(t.name)}</div>${up.length?`<div class="wn-sub">Coming up</div><ul class="wn-up">${up.map(u=>`<li data-until="${esc(u.until||"")}"><span class="wn-date">${esc(u.date)}</span><div><strong>${esc(u.title)}</strong><div class="note">${esc(u.desc)}${u.url?` <a href="${esc(u.url)}" target="_blank" rel="noopener">Details</a>`:""}</div></div></li>`).join("")}</ul>${ne(t.whatsNew)?`<div class="wn-sub">News</div>`:""}`:""}${ne(t.whatsNew)?`<ul>${t.whatsNew.map(wnItem).join("")}</ul>`:""}</section>`}
// Town guide pages are pre-built: hide "Coming up" events whose date has passed.
document.querySelectorAll(".whatsnew li[data-until]").forEach(li=>{if(li.dataset.until&&li.dataset.until<TODAY)li.remove();});
document.querySelectorAll(".whatsnew ul.wn-up").forEach(ul=>{if(!ul.children.length){const a=ul.previousElementSibling,b=ul.nextElementSibling;ul.remove();if(a&&a.classList.contains("wn-sub"))a.remove();if(b&&b.classList.contains("wn-sub"))b.remove();}});
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
// Map view: zoom/pan by changing the SVG viewBox. Dots and labels keep the same on-screen size.
const MAP_W=560,MAP_H=420;let vb={x:0,y:0,w:MAP_W,h:MAP_H};
function renderMap(){
  const show=new Set(filtered().map(t=>t.name)),k=MAP_W/vb.w,zoomed=k>1.01,names=k>=2.2;
  $("map").setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const regLbl=[["Cache Valley",41.86,-111.62],["Bear Lake",41.95,-111.28],["Box Elder",41.9,-112.55],["Ogden & Weber",41.14,-111.72]];
  let s=regLbl.map(([n,la,ln])=>{const [x,y]=px({lat:la,lng:ln});return `<text class="reg" x="${x}" y="${y}" text-anchor="middle" style="font-size:${15/k}px">${n}</text>`}).join("");
  const order=TOWNS.slice().sort((a,b)=>(a.name===selected)-(b.name===selected));
  s+=order.map(t=>{const [x,y]=px(t);const on=show.has(t.name), sel=t.name===selected;
    return `<g class="t" data-t="${esc(t.name)}" tabindex="${on?0:-1}" role="button" aria-label="${esc(t.name)}" opacity="${on?1:.18}"><title>${esc(t.name)}</title><circle cx="${x}" cy="${y}" r="${(sel?8:5)/k}" fill="${regionColor(t.region)}" style="stroke-width:${(sel?2:1.5)/k}px" ${sel?'stroke="var(--ink)"':''}/>${sel||(names&&on)?`<text class="lbl${sel?"":" lbl-sm"}" x="${x+(sel?12:8)/k}" y="${y+4/k}" style="font-size:${(sel?11:10)/k}px;stroke-width:${3/k}px">${esc(t.name)}</text>`:""}</g>`}).join("");
  $("map").innerHTML=s;
  const w=$("map").parentElement;if(w&&w.classList.contains("mapwrap")){w.classList.toggle("zoomed",zoomed);$("mapReset").hidden=!zoomed;$("mapOut").disabled=!zoomed;$("mapIn").disabled=k>=7.9;}
}
(function(){
  const svg=$("map");
  const wrap=document.createElement("div");wrap.className="mapwrap";svg.parentNode.insertBefore(wrap,svg);wrap.appendChild(svg);
  wrap.insertAdjacentHTML("beforeend",`<div class="mapctl" role="group" aria-label="Map zoom"><button type="button" id="mapIn" aria-label="Zoom in">+</button><button type="button" id="mapOut" aria-label="Zoom out">−</button></div><button type="button" class="mapreset" id="mapReset" hidden>⤢ Full map</button><p class="maphint">Pinch or use + to zoom · drag to move</p>`);
  const clamp=v=>{const w=Math.min(MAP_W,Math.max(MAP_W/8,v.w)),h=w*MAP_H/MAP_W;return {w,h,x:Math.min(MAP_W-w,Math.max(0,v.x)),y:Math.min(MAP_H-h,Math.max(0,v.y))};};
  const toSvg=(cx,cy)=>{const r=svg.getBoundingClientRect();return [vb.x+(cx-r.left)/r.width*vb.w, vb.y+(cy-r.top)/r.height*vb.h];};
  function zoomAt(f,sx,sy){if(sx==null){sx=vb.x+vb.w/2;sy=vb.y+vb.h/2;}const w=vb.w/f,h=vb.h/f;vb=clamp({w,h,x:sx-(sx-vb.x)/f,y:sy-(sy-vb.y)/f});renderMap();}
  $("mapIn").addEventListener("click",()=>zoomAt(1.6));
  $("mapOut").addEventListener("click",()=>zoomAt(1/1.6));
  $("mapReset").addEventListener("click",()=>{vb={x:0,y:0,w:MAP_W,h:MAP_H};renderMap();});
  // Trackpad pinch and Ctrl/Cmd + wheel arrive as wheel events with ctrlKey: zoom the map, not the page.
  svg.addEventListener("wheel",e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const [sx,sy]=toSvg(e.clientX,e.clientY);zoomAt(Math.exp(-e.deltaY*0.01),sx,sy);},{passive:false});
  // Double-click / double-tap zooms in there. (Done by hand: selecting a town redraws the map between clicks.)
  let lastClick={t:0,x:0,y:0};
  svg.addEventListener("click",e=>{if(e.pointerType==="touch")return;const now=Date.now();
    if(now-lastClick.t<350&&Math.hypot(e.clientX-lastClick.x,e.clientY-lastClick.y)<10){const [sx,sy]=toSvg(e.clientX,e.clientY);zoomAt(2,sx,sy);lastClick={t:0,x:0,y:0};}
    else lastClick={t:now,x:e.clientX,y:e.clientY};});
  svg.addEventListener("dblclick",e=>e.preventDefault());
  // Drag to pan (when zoomed) and two-finger pinch, with pointer events.
  const pts=new Map();let start=null,moved=false,lastTap=0;
  svg.addEventListener("pointerdown",e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;
    if(pts.size===2){const [p1,p2]=[...pts.values()];start={d:Math.hypot(p1.x-p2.x,p1.y-p2.y),vb:{...vb},c:toSvg((p1.x+p2.x)/2,(p1.y+p2.y)/2)};}
    else start={x:e.clientX,y:e.clientY,vb:{...vb}};
    if(e.pointerType==="touch"&&pts.size===1){const now=Date.now();if(now-lastTap<300){const [sx,sy]=toSvg(e.clientX,e.clientY);zoomAt(2,sx,sy);moved=true;}lastTap=now;}
  });
  svg.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId)||!start)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const r=svg.getBoundingClientRect();
    if(pts.size===2&&start.d){const [p1,p2]=[...pts.values()];const d=Math.hypot(p1.x-p2.x,p1.y-p2.y);const f=d/start.d;const w=start.vb.w/f,h=start.vb.h/f;const [cx,cy]=start.c;
      vb=clamp({w,h,x:cx-(cx-start.vb.x)/f,y:cy-(cy-start.vb.y)/f});moved=true;renderMap();return;}
    if(pts.size===1&&MAP_W/vb.w>1.01){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(!moved&&Math.hypot(dx,dy)<4)return;moved=true;svg.setPointerCapture(e.pointerId);
      vb=clamp({...start.vb,x:start.vb.x-dx/r.width*start.vb.w,y:start.vb.y-dy/r.height*start.vb.h});svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);}
  });
  const end=e=>{pts.delete(e.pointerId);if(pts.size===1){const p=[...pts.values()][0];start={x:p.x,y:p.y,vb:{...vb}};}else if(!pts.size)start=null;};
  // Phones (iPhone Safari especially): stop the page from scrolling or zooming while a finger moves the map.
  svg.addEventListener("touchstart",e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
  svg.addEventListener("touchmove",e=>{if(e.touches.length>1||MAP_W/vb.w>1.01)e.preventDefault();},{passive:false});
  svg.addEventListener("gesturestart",e=>e.preventDefault());
  svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",end);
  // A drag or pinch shouldn't also select the town under the finger.
  svg.addEventListener("click",e=>{if(moved){e.stopImmediatePropagation();moved=false;}},true);
})();
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
  const outdoorHtml=OUT_TYPES.map(([k,label])=>{const items=near.filter(o=>o.type===k).slice(0,5);return items.length?`<div class="sublabel">${label}</div><ul class="outlist">${items.map(o=>`<li><div><strong>${o.url?`<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.name)}</a>`:esc(o.name)}</strong>${lakeTag(o.name)}<span class="mi num">${o.d<1?"in town":"~"+Math.round(o.d)+" mi"}</span></div><div class="note">${esc(o.desc)}</div></li>`).join("")}</ul>`:""}).join("");
  const shop=(ne(t.shopping)?`<div class="sublabel">Shopping</div>${list(t.shopping)}`:"")+(ne(t.dining)?`<div class="sublabel">Local dining</div>${list(t.dining)}`:"");
  const health=(ne(t.healthcare)?`<div class="sublabel">Healthcare</div>${list(t.healthcare)}`:"")+(t.library?`<div class="sublabel">Library</div><div>${esc(t.library)}</div>`:"");
  const events=ne(t.events)?t.events.map(ev=>`<div class="event"><b>${esc(ev.when)}</b><div><strong>${esc(ev.name)}</strong>${ev.desc?`<div class="note">${esc(ev.desc)}</div>`:""}</div></div>`).join(""):"";
  const senior=ne(t.seniorResources)?list(t.seniorResources):"";
  const gtk=ne(t.goodToKnow)?list(t.goodToKnow):"";
  const cm=t.commute||{};const maxC=90;
  const comm=["Logan","Brigham City","Ogden","Hill AFB","Salt Lake City"].filter(k=>cm[k]!=null).map(k=>{
    const v=cm[k];return `<div class="cm"><span>${k}</span><div class="bar"><i style="width:${Math.max(3,Math.min(100,v/maxC*100))}%"></i></div><span class="num">${v<=3?"in town":"~"+v+" min"+((k==="Salt Lake City"||(k==="Hill AFB"&&v>20))?"<small>busy "+(v+15)+"–"+(v+20)+"</small>":"")}</span></div>`}).join("");
  $("townDetail").innerHTML=`
    <div style="display:grid;gap:8px">
      <div class="eyebrow" style="color:${regionColor(t.region)}">${esc(t.region)} · ${esc(t.county)} County</div>
      <h3>${esc(t.name)}</h3>
      <div class="tags">${t.population?`<span class="tag">Population ${esc(t.population.replace(/^approx\.\s*/i,"≈ "))}</span>`:""}${t.schoolDistrict?`<span class="tag">${esc(t.schoolDistrict.split("(")[0].trim())}</span>`:""}</div>
    </div>
    ${(()=>{const has=k=>({schools:nSchools,outdoors:outdoorHtml,dining:1,utilities:t.utilities,events:events,gtk:gtk,commute:comm})[k];return `<nav class="jump" aria-label="Jump to a section">${(ne(t.whatsNew)||ne(t.upcoming))?`<a href="#x-new">What's new</a>`:""}${[["schools","Schools"],["outdoors","Lakes & trails"],["dining","Eat & shop"],["utilities","Utilities"],["events","Events"],["gtk","Good to know"],["commute","Commute"]].filter(([k])=>has(k)).map(([k,l])=>`<a href="#x-${k}">${esc(l)}</a>`).join("")}</nav>`})()}
    <p>${esc(t.overview)}</p>
    ${newHtml(t,"x")}
    ${comm?`<div class="commute" id="x-commute"><div class="sublabel" style="margin:0">Typical drive times</div>${comm}<p class="note cmnote">Normal traffic. Where I-15 backs up, the <b>busy</b> range is for weekdays 7–9 a.m. and 4–6 p.m. and Friday–Sunday afternoons. Crashes, weather and construction can add more; check the <a href="https://udottraffic.utah.gov" target="_blank" rel="noopener">UDOT Traffic</a> app before you go.</p></div>`:""}
    <div>
      <div class="band">Living here</div>
      ${sec("x","schools","Schools",nSchools||"",schoolsHtml+(/Cache County School District/.test(t.schoolDistrict||"")&&t.county==="Cache"?`<p class="more"><a href="${ROOT}school-changes">What changed for 2026–27 →</a></p>`:""),false)}
      ${sec("x","parks","Parks & playgrounds",ne(t.parks)?t.parks.length:"",parks,false)}
      ${sec("x","things","Things to do",ne(t.recreation)?t.recreation.length:"",rec,false)}
      ${sec("x","outdoors","Lakes, rivers & trails",near.length?near.filter(o=>o.d<=30).length+" nearby":"",outdoorHtml?outdoorHtml+`<p class="more"><a href="${ROOT}lakes">Lake access, fees &amp; boat ramps →</a></p>`:"",false)}
      <div class="band">Everyday life</div>
      ${sec("x","dining","Eat, shop & run errands","",diningHtml(t),false)}
      ${sec("x","utilities","New to town: utilities & internet","",utilHtml(t),false)}
      ${sec("x","health","Healthcare & library","",health,false)}
      <div class="band">Community</div>
      ${sec("x","events","Yearly traditions & events",ne(t.events)?t.events.length:"",events,false)}
      ${sec("x","senior","55+ & senior resources",ne(t.seniorResources)?t.seniorResources.length:"",senior,false)}
      ${sec("x","gtk","Before you buy: good to know",ne(t.goodToKnow)?t.goodToKnow.length:"",gtk,true)}
    </div>
    <div class="actions">
      ${PAGE_OF[t.name]?`<a class="btn btn-olive btn-sm" href="${ROOT}${PAGE_OF[t.name]}">Full ${esc(t.name)} guide</a>`:""}
      <a class="btn btn-ghost btn-sm" href="${KW_URL}" target="_blank" rel="noopener">Homes for sale</a>
      <a class="btn btn-ghost btn-sm" href="${ROOT}ask?town=${encodeURIComponent(t.name)}">Ask me about ${esc(t.name)}</a>
      <button class="btn btn-gold btn-sm" type="button" data-guide-town="${esc(t.name)}"><svg class="gico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></svg>Email me this guide</button>
      ${t.cityWebsite?`<a class="btn btn-ghost btn-sm" href="${esc(t.cityWebsite)}" target="_blank" rel="noopener">City website</a>`:""}
    </div>`;
}
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
  const c=(t,k)=>t.commute&&t.commute[k]!=null?(t.commute[k]<=3?"in town":`~${t.commute[k]} min`+((k==="Salt Lake City"||(k==="Hill AFB"&&t.commute[k]>20))?` (busy ${t.commute[k]+15}–${t.commute[k]+20})`:"")):"—";
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
const vStart=Date.now();
$("v_send").insertAdjacentHTML("beforebegin",'<label class="gok gok-dark"><input type="checkbox" id="v_ok"><span>Yes, it\'s okay for Christina to also send me new listings and local updates.</span></label>');
$("valueForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const v=id=>$(id).value.trim();
  if(!v("v_name")||!v("v_contact")){$("v_err").textContent="Add your name and a phone number or email so I can reach you.";return;}
  $("v_err").textContent="";
  const summaryText=`Hi Christina, this is ${v("v_name")}.\nI'm looking to: ${v("v_type")} (${v("v_when")})\n${v("v_addr")?"Property: "+v("v_addr")+"\n":""}${v("v_msg")?v("v_msg")+"\n":""}Best way to reach me: ${v("v_contact")}`;
  const btn=$("v_send");btn.disabled=true;const label=btn.textContent;btn.textContent="Sending…";
  let ok=false;
  try{
    const r=await fetch(API_ORIGIN+"/api/value",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:v("v_name"),contact:v("v_contact"),addr:v("v_addr"),type:v("v_type"),when:v("v_when"),msg:v("v_msg"),source:"value",consent:$("v_ok").checked,website:$("v_web")?$("v_web").value:"",t:vStart,page:location.href})});
    ok=r.ok&&(await r.json()).ok;
  }catch(_){ok=false}
  btn.disabled=false;btn.textContent=label;
  $("v_text").textContent=summaryText;
  if(ok){
    $("v_note").textContent="Sent! Christina will get back to you within one business day.";
    $("v_copy").hidden=true;
    $("valueForm").querySelectorAll("input,textarea").forEach(el=>{if(el.id!=="v_web")el.value=""});$("v_ok").checked=false;
  }else{
    $("v_note").textContent="It didn't go through. Copy your request and text or email it to the number or address above.";
    $("v_copy").hidden=false;
  }
  $("v_done").hidden=false;
});
$("v_copy").addEventListener("click",()=>copyText($("v_text").textContent,"v_copied","v_text"));


}

function openTarget(id){const el=document.getElementById(id);if(!el)return;if(el.tagName==="DETAILS")el.open=true;el.scrollIntoView({behavior:"smooth",block:"start"});}
document.addEventListener("click",e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute("href").slice(1);const el=id&&document.getElementById(id);if(el&&(el.tagName==="DETAILS"||a.closest(".jump"))){e.preventDefault();openTarget(id);history.replaceState(null,"","#"+id);}});
if(location.hash.length>1)setTimeout(()=>openTarget(decodeURIComponent(location.hash.slice(1))),60);

// Ask Christina page
if(document.getElementById("askForm")){
const aStart=Date.now();const qs=new URLSearchParams(location.search);
const towns=(window.SITE_TOWNS||[]).map(t=>t.name).sort((a,b)=>a.localeCompare(b));
$("a_town").innerHTML='<option value="">Not sure yet / several</option>'+towns.map(n=>`<option>${esc(n)}</option>`).join("");
if(qs.get("town")&&towns.includes(qs.get("town"))){$("a_town").value=qs.get("town");$("askTitle").textContent=`Ask me about ${qs.get("town")}`;}
if(qs.get("topic")){const o=[...$("a_topic").options].find(o=>o.text===qs.get("topic"));if(o)$("a_topic").value=o.value;}
$("a_send").insertAdjacentHTML("beforebegin",'<label class="gok"><input type="checkbox" id="a_ok"><span>Yes, it\'s okay for Christina to also send me new listings and local updates.</span></label>');
$("askForm").addEventListener("submit",async e=>{
  e.preventDefault();const v=id=>$(id).value.trim();
  if(!v("a_name")||!v("a_contact")||!v("a_msg")){$("a_err").textContent="Add your name, a phone number or email, and your question.";return;}
  $("a_err").textContent="";const btn=$("a_send");btn.disabled=true;const label=btn.textContent;btn.textContent="Sending…";
  let ok=false;
  try{const r=await fetch(API_ORIGIN+"/api/value",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:v("a_name"),contact:v("a_contact"),type:"Question: "+v("a_topic"),when:"",addr:"",msg:(v("a_town")?"Town: "+v("a_town")+"\n":"")+v("a_msg"),source:"ask",town:v("a_town"),topic:v("a_topic"),consent:$("a_ok").checked,website:$("a_web").value,t:aStart,page:location.href})});ok=r.ok&&(await r.json()).ok;}catch(_){ok=false}
  btn.disabled=false;btn.textContent=label;
  $("a_done").hidden=false;
  if(ok){$("a_note").textContent="Sent! I'll get back to you within one business day.";$("askForm").querySelectorAll("input,textarea").forEach(el=>{if(el.id!=="a_web")el.value=""});$("a_ok").checked=false;}
  else{$("a_note").innerHTML=`It didn't go through. Please text or call <a href="tel:+14359945449">(435) 994-5449</a> or email <a href="mailto:christina@northernutahhomeguide.com">christina@northernutahhomeguide.com</a>.`;}
});
}

// "Email me this guide" / "Email me this comparison": emails the visitor a summary through /api/guide.
// Only visitors who tick the box are saved as leads for Christina.
(function(){
const API=/(^|\.)northernutahhomeguide\.com$/.test(location.hostname)?"/api/guide":"https://northernutahhomeguide.com/api/guide";
const MAIL='<svg class="gico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></svg>';
let dlg,cur,start;
function dialog(){
  if(dlg)return dlg;
  dlg=document.createElement("dialog");dlg.className="gdlg";dlg.setAttribute("aria-labelledby","g_title");
  dlg.innerHTML=`<form class="gform" novalidate>
  <button class="gx" type="button" aria-label="Close">&times;</button>
  <div class="eyebrow">Save it for later</div>
  <h3 id="g_title"></h3>
  <p class="gsub" id="g_sub"></p>
  <div class="field"><label for="g_name">First name</label><input type="text" id="g_name" autocomplete="given-name" maxlength="40"></div>
  <div class="field"><label for="g_email">Email</label><input type="email" id="g_email" autocomplete="email" inputmode="email" maxlength="120" required></div>
  <label class="gok"><input type="checkbox" id="g_ok"><span id="g_oklbl"></span></label>
  <div class="hp" aria-hidden="true"><label for="g_web">Leave this empty</label><input type="text" id="g_web" tabindex="-1" autocomplete="off"></div>
  <button class="btn btn-gold" type="submit" id="g_send">Send it</button>
  <p class="gmsg" id="g_msg" role="status"></p>
  <p class="gfine">You'll get this one email. You're only added to Christina's list if you tick the box.</p>
</form>`;
  document.body.appendChild(dlg);
  dlg.querySelector(".gx").addEventListener("click",()=>dlg.close());
  dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close()});
  dlg.querySelector("form").addEventListener("submit",send);
  return dlg;
}
function open(kind,towns){
  const d=dialog();cur={kind,towns};start=Date.now();
  const where=towns.join(" and ");
  $("g_title").textContent=kind==="compare"?`Email me ${towns[0]} vs. ${towns[1]}`:`Email me the ${towns[0]} guide`;
  $("g_sub").textContent=kind==="compare"?"Both towns side by side, with links to each full guide. Handy for talking it over at home.":`Schools, drive times, parks and what's new in ${towns[0]}, with a link back to the full guide.`;
  $("g_oklbl").textContent=`Yes, it's okay for Christina to follow up with homes and local updates for ${where}.`;
  $("g_ok").checked=false;$("g_msg").textContent="";$("g_msg").className="gmsg";
  const f=d.querySelector("form");f.hidden=false;$("g_send").disabled=false;$("g_send").textContent="Send it";
  const saved=store.get("guideContact")||{};if(saved.name&&!$("g_name").value)$("g_name").value=saved.name;if(saved.email&&!$("g_email").value)$("g_email").value=saved.email;
  d.showModal();(($("g_email").value)?$("g_send"):$("g_name")).focus();
}
async function send(e){
  e.preventDefault();
  const email=$("g_email").value.trim(),name=$("g_name").value.trim(),msg=$("g_msg");
  if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)){msg.textContent="Please enter a valid email address.";msg.className="gmsg err";$("g_email").focus();return;}
  const consent=$("g_ok").checked;
  $("g_send").disabled=true;$("g_send").textContent="Sending…";msg.textContent="";
  let ok=false,err="";
  try{const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:cur.kind,towns:cur.towns,name,email,consent,website:$("g_web").value,t:start,page:location.href.split("#")[0]})});
    const j=await r.json().catch(()=>({}));ok=r.ok&&j.ok;err=j.error||"";}catch(_){ok=false}
  if(ok){
    store.set("guideContact",{name,email});
    msg.innerHTML=`Sent! Check your inbox for ${cur.kind==="compare"?"the comparison":`the ${esc(cur.towns[0])} guide`} (and your spam folder, just in case).`;msg.className="gmsg ok";
    $("g_send").textContent="Sent";
    if(window.gtag)gtag("event","guide_email",{guide_kind:cur.kind,guide_towns:cur.towns.join(" vs "),follow_up:consent?"yes":"no"});
  }else{
    msg.innerHTML=err==="email"?"Please check your email address.":err==="busy"?"Too many requests from this connection. Please try again in a little while.":`That didn't go through. Please try again, or call or text Christina at <a href="tel:+14359945449">(435) 994-5449</a>.`;
    msg.className="gmsg err";$("g_send").disabled=false;$("g_send").textContent="Send it";
  }
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-guide-town],[data-guide-compare]");if(!b)return;
  if(b.dataset.guideTown){open("town",[b.dataset.guideTown]);return;}
  const a=$("cmpA")&&$("cmpA").value,c=$("cmpB")&&$("cmpB").value;
  if(!a||!c||a===c){const n=$("g_cmpnote");if(n){n.textContent="Pick two different towns to compare.";setTimeout(()=>n.textContent="",3000);}return;}
  open("compare",[a,c]);
});
// Town guide pages: a button under each town's jump menu and in its button row at the bottom.
document.querySelectorAll("article.town").forEach(art=>{
  const h=art.querySelector(".townh");if(!h)return;
  const name=h.textContent.replace(/^Living in\s+/,"").trim();
  const top=document.createElement("div");top.className="gsave";
  top.innerHTML=`<button class="btn btn-gold btn-sm" type="button" data-guide-town="${esc(name)}">${MAIL}Email me this guide</button><span class="note">Get ${esc(name)} in your inbox to read later.</span>`;
  const jump=art.querySelector(".jump");
  if(jump)jump.after(top);else h.parentElement.after(top);
  const acts=art.querySelector(":scope > .actions");
  if(acts){const b=document.createElement("button");b.className="btn btn-gold btn-sm";b.type="button";b.dataset.guideTown=name;b.innerHTML=MAIL+"Email me this guide";acts.prepend(b);}
});
// Home page comparison tool
const tw=document.getElementById("cmpTable");
if(tw){const w=tw.closest(".tablewrap")||tw;const d=document.createElement("div");d.className="gsave";
  d.innerHTML=`<button class="btn btn-gold btn-sm" type="button" data-guide-compare="1">${MAIL}Email me this comparison</button><span class="note" id="g_cmpnote">Send both towns side by side to your inbox.</span>`;w.after(d);}
})();

// ---------------------------------------------------------------------------
// Shared sign-up helpers (listing alerts, school alerts, town quiz) -> /api/signup
// ---------------------------------------------------------------------------
const ALL_TOWNS=["Amalga","Brigham City","Clarkston","Cornish","Eden","Farr West","Garden City","Harrisville","Huntsville","Hyde Park","Hyrum","Laketown","Lewiston","Liberty","Logan","Marriott-Slaterville","Mendon","Millville","Newton","Nibley","North Logan","North Ogden","Ogden","Paradise","Perry","Plain City","Pleasant View","Providence","Randolph","Richmond","River Heights","Riverdale","Roy","Smithfield","South Ogden","Trenton","Wellsville","West Haven","Woodruff"];
const MAIN_TOWNS=["Logan","North Logan","Hyde Park","Smithfield","Providence","Brigham City","Ogden","North Ogden","Garden City","Huntsville"];
const EMAIL_OK=s=>/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s);
async function postSignup(body){
  try{const r=await fetch(API_ORIGIN+"/api/signup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.assign({page:location.href.split("#")[0]},body))});
    const j=await r.json().catch(()=>({}));return {ok:r.ok&&j.ok,error:j.error||""};}catch(_){return {ok:false,error:""}}
}
const chip=(n,on)=>`<button type="button" class="tchip" aria-pressed="${on?"true":"false"}" data-town="${esc(n)}">${esc(n)}</button>`;
function chipPicker(el,preselect){
  const pre=new Set(preselect||[]);
  const main=MAIN_TOWNS.concat([...pre].filter(n=>!MAIN_TOWNS.includes(n)));
  const rest=ALL_TOWNS.filter(n=>!main.includes(n));
  el.innerHTML=`<div class="tchips">${main.map(n=>chip(n,pre.has(n))).join("")}</div>
  <button type="button" class="tmore" aria-expanded="false">More towns ▾</button>
  <div class="tchips" hidden>${rest.map(n=>chip(n,false)).join("")}</div>`;
  el.addEventListener("click",e=>{
    const c=e.target.closest(".tchip");if(c){c.setAttribute("aria-pressed",c.getAttribute("aria-pressed")==="true"?"false":"true");return;}
    const m=e.target.closest(".tmore");if(m){const box=m.nextElementSibling;box.hidden=!box.hidden;m.setAttribute("aria-expanded",String(!box.hidden));m.textContent=box.hidden?"More towns ▾":"Fewer towns ▴";}
  });
  return ()=>[...el.querySelectorAll('.tchip[aria-pressed="true"]')].map(b=>b.dataset.town);
}

// ---------------------------------------------------------------------------
// "Search homes" listing-alerts prompt: shows once per visitor, then always goes straight to the listings.
// ---------------------------------------------------------------------------
(function(){
  const KEY="nuhg_listings_prompt";
  const seen=()=>{try{return !!localStorage.getItem(KEY)}catch(_){return true}};
  const mark=v=>{try{localStorage.setItem(KEY,v)}catch(_){}};
  let dlg,href,getTowns,started;
  function build(pre){
    dlg=document.createElement("dialog");dlg.className="gdlg ldlg";dlg.setAttribute("aria-labelledby","l_title");
    dlg.innerHTML=`<form class="gform" novalidate>
      <button class="gx" type="button" aria-label="Close">&times;</button>
      <div class="eyebrow">Before you search</div>
      <h3 id="l_title">Want new listings sent to you?</h3>
      <p class="gsub">Christina will email you homes as they hit the market in the towns you pick. Unsubscribe anytime.</p>
      <div class="field"><label for="l_email">Email</label><input type="email" id="l_email" autocomplete="email" inputmode="email" maxlength="120"></div>
      <div class="field"><label for="l_name">First name <span class="opt">(optional)</span></label><input type="text" id="l_name" autocomplete="given-name" maxlength="40"></div>
      <div class="field"><span class="flabel">Which towns? <span class="opt">(optional)</span></span><div id="l_towns"></div></div>
      <div class="hp" aria-hidden="true"><label for="l_web">Leave this empty</label><input type="text" id="l_web" tabindex="-1" autocomplete="off"></div>
      <button class="btn btn-gold" type="submit" id="l_send">Yes, send me listings</button>
      <button class="btn btn-ghost" type="button" id="l_skip">No thanks, take me to the listings</button>
      <p class="gmsg" id="l_msg" role="status"></p>
    </form>`;
    document.body.appendChild(dlg);
    getTowns=chipPicker(dlg.querySelector("#l_towns"),pre);
    const go=()=>{dlg.close();window.open(href,"_blank","noopener");};
    dlg.querySelector(".gx").addEventListener("click",()=>{mark("closed");go();});
    dlg.addEventListener("cancel",e=>{e.preventDefault();mark("closed");go();});
    dlg.querySelector("#l_skip").addEventListener("click",()=>{mark("no");go();});
    dlg.querySelector("form").addEventListener("submit",e=>{
      e.preventDefault();
      const email=$("l_email").value.trim(),msg=$("l_msg");
      if(!EMAIL_OK(email)){msg.textContent="Please enter a valid email, or tap “No thanks” to go straight to the listings.";msg.className="gmsg err";$("l_email").focus();return;}
      mark("yes");store.set("guideContact",{name:$("l_name").value.trim(),email});
      const body={kind:"listings",email,name:$("l_name").value.trim(),towns:getTowns(),website:$("l_web").value,t:started};
      window.open(href,"_blank","noopener");   // open the listings now, while the click still counts as the visitor's
      dlg.close();
      postSignup(body).then(r=>{if(window.gtag)gtag("event","listing_alerts_signup",{towns:body.towns.join(", ")||"any",ok:r.ok?"yes":"no"});});
    });
  }
  document.addEventListener("click",e=>{
    const a=e.target.closest('a[href*="christinacacciacarne.kw.com"]');
    if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button>0||seen()||typeof HTMLDialogElement==="undefined")return;
    e.preventDefault();href=a.href;started=Date.now();
    const art=a.closest("article.town"),h=art&&art.querySelector(".townh");
    const pre=h?[h.textContent.replace(/^Living in\s+/,"").trim()]:[];
    if(dlg)dlg.remove();build(pre.filter(n=>ALL_TOWNS.includes(n)));
    const saved=store.get("guideContact")||{};if(saved.email)$("l_email").value=saved.email;if(saved.name)$("l_name").value=saved.name;
    dlg.showModal();$("l_email").focus();
  },true);
})();

// ---------------------------------------------------------------------------
// School boundary alerts (school-changes page)
// ---------------------------------------------------------------------------
if(document.getElementById("schoolAlertForm")){
  const sStart=Date.now();
  $("schoolAlertForm").addEventListener("submit",async e=>{
    e.preventDefault();const msg=$("s_msg"),email=$("s_email").value.trim();
    const districts=[...document.querySelectorAll('#schoolAlertForm input[name="district"]:checked')].map(i=>i.value);
    if(!EMAIL_OK(email)){msg.textContent="Please enter a valid email address.";msg.className="gmsg err";return;}
    if(!districts.length){msg.textContent="Pick at least one school district.";msg.className="gmsg err";return;}
    const btn=$("s_send");btn.disabled=true;btn.textContent="Signing you up…";
    const r=await postSignup({kind:"schools",email,name:$("s_name").value.trim(),districts,website:$("s_web").value,t:sStart});
    btn.disabled=false;btn.textContent="Send me school alerts";
    if(r.ok){msg.textContent="You're signed up! Check your inbox for a confirmation.";msg.className="gmsg ok";store.set("guideContact",{name:$("s_name").value.trim(),email});if(window.gtag)gtag("event","school_alerts_signup",{districts:districts.join(", ")});}
    else{msg.innerHTML=`That didn't go through. Please try again, or email <a href="mailto:christina@northernutahhomeguide.com">christina@northernutahhomeguide.com</a>.`;msg.className="gmsg err";}
  });
}

// ---------------------------------------------------------------------------
// "Which town fits you?" quiz
// ---------------------------------------------------------------------------
if(document.getElementById("quiz")&&TOWNS.length){
  const qStart=Date.now();
  const popOf=t=>{const m=/([\d,]+)/.exec(String(t.population||""));return m?parseInt(m[1].replace(/,/g,""),10):0};
  const val=n=>{const el=document.querySelector(`#quiz [name="${n}"]:checked`);return el?el.value:""};
  const vals=n=>[...document.querySelectorAll(`#quiz [name="${n}"]:checked`)].map(i=>i.value);
  document.querySelectorAll('#quiz [name="commute"]').forEach(r=>r.addEventListener("change",()=>{$("q_limit_wrap").hidden=val("commute")==="none";}));
  let last=null;
  function score(){
    const to=val("commute"),limit=+val("limit")||40,size=val("size"),want=vals("outdoors"),schools=val("schools");
    return TOWNS.map(t=>{
      let s=0;const why=[];
      if(to&&to!=="none"){const m=t.commute&&t.commute[to];
        if(m==null)s-=2;else if(m<=limit){s+=4;why.push(m<=3?`in ${to}`:`~${m} min to ${to}`);}else if(m<=limit+15){s+=1;why.push(`~${m} min to ${to}`);}else s-=4;}
      const p=popOf(t),band=p<5000?"small":p<20000?"mid":"city";
      if(size&&size!=="any"){if(band===size){s+=2;why.push(band==="small"?"small-town feel":band==="mid"?"mid-size town":"city amenities");}else if(Math.abs(["small","mid","city"].indexOf(band)-["small","mid","city"].indexOf(size))===1)s+=0.5;}
      const near=nearby(t,40);
      const lake=near.find(o=>o.type==="lake"),ski=near.find(o=>o.type==="ski"),trails=near.filter(o=>o.type==="trail"&&o.d<=10).length;
      if(want.includes("lake")&&lake){if(lake.d<=12){s+=2;why.push(`${lake.name} ~${Math.max(1,Math.round(lake.d))} mi`);}else if(lake.d<=25)s+=1;}
      if(want.includes("ski")&&ski){if(ski.d<=20){s+=2;why.push(`${ski.name} ~${Math.max(1,Math.round(ski.d))} mi`);}else if(ski.d<=35)s+=1;}
      if(want.includes("trails")&&trails){s+=Math.min(2,trails/2);if(trails>=2)why.push(`${trails} trails within 10 mi`);}
      const sc=t.schools||{},nSch=["elementary","middle","high"].reduce((n,k)=>n+((sc[k]||[]).length),0);
      if(schools==="in-town"){if(nSch>0){s+=1.5;why.push("public schools in town");}else s-=1;}
      return {t,s,why};
    }).sort((a,b)=>b.s-a.s||popOf(b.t)-popOf(a.t)).slice(0,5);
  }
  $("quiz").addEventListener("submit",e=>{
    e.preventDefault();
    if(!val("commute")||!val("size")){$("q_err").textContent="Answer the commute and town-size questions to see your matches.";return;}
    $("q_err").textContent="";
    last=score();
    $("q_list").innerHTML=last.map((r,i)=>{const pg=PAGE_OF[r.t.name];const href=pg?`${ROOT}${pg}#${r.t.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`:`${ROOT}areas/`;
      return `<li class="qres"><span class="qn">${i+1}</span><div><a class="qt" href="${href}">${esc(r.t.name)}</a><span class="note">${esc(r.t.region)}</span>${r.why.length?`<div class="qwhy">${r.why.slice(0,4).map(esc).join(" · ")}</div>`:""}</div></li>`;}).join("");
    $("q_results").hidden=false;$("q_results").scrollIntoView({behavior:"smooth",block:"start"});
    if(window.gtag)gtag("event","town_quiz_done",{top_town:last[0].t.name});
  });
  $("q_lead").addEventListener("submit",async e=>{
    e.preventDefault();const msg=$("q_msg"),email=$("q_email").value.trim();
    if(!last)return;
    if(!EMAIL_OK(email)){msg.textContent="Please enter a valid email address.";msg.className="gmsg err";return;}
    const answers={commute:val("commute"),limit:val("commute")==="none"?"":val("limit"),size:val("size"),outdoors:vals("outdoors"),schools:val("schools"),budget:$("q_budget").value,timeline:$("q_timeline").value};
    const btn=$("q_send");btn.disabled=true;btn.textContent="Sending…";
    const r=await postSignup({kind:"quiz",email,name:$("q_name").value.trim(),phone:$("q_phone").value.trim(),consent:$("q_ok").checked,answers,matches:last.map(x=>x.t.name),website:$("q_web").value,t:qStart});
    btn.disabled=false;btn.textContent="Send me Christina's picks";
    if(r.ok){msg.textContent="Sent! Your matches are on their way to your inbox, and Christina will follow up personally.";msg.className="gmsg ok";store.set("guideContact",{name:$("q_name").value.trim(),email});if(window.gtag)gtag("event","town_quiz_lead",{top_town:last[0].t.name});}
    else{msg.innerHTML=`That didn't go through. Please try again, or call or text <a href="tel:+14359945449">(435) 994-5449</a>.`;msg.className="gmsg err";}
  });
  const saved=store.get("guideContact")||{};if(saved.email)$("q_email").value=saved.email;if(saved.name)$("q_name").value=saved.name;
}
