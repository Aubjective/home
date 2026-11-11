(function(){
'use strict';
const game=document.body.dataset.game;const cfg=JSON.parse(document.getElementById('game-config').textContent);
const $=id=>document.getElementById(id),base='../../data/',day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'});
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
const get=async url=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Unable to load '+url);return r.json();};
const range=e=>[e.startDate,e.endDate].filter(Boolean).join(' — ');
function makeCard(e,type){const card=node('article','portal-card '+(type==='event'?'event-banner':'coupon'));
 card.append(node('div','portal-meta',type==='event'?(e.publishStatus==='spotlight'?'EVENT SPOTLIGHT · DATES UNCONFIRMED':range(e)):(e.featured?'FEATURED · LIMITED-TIME CODE':'ONGOING CODE')));
 card.append(node('h3','',type==='event'?e.title:e.code));
 if(type==='event'){
  if(e.description)card.append(node('p','',e.description));
  if(e.featured?.length)card.append(node('p','portal-small','Featured: '+e.featured.join(', ')));
  if(e.eventPointLabel)card.append(node('p','portal-small','Event currency: '+e.eventPointLabel));
  if(e.miniGameLabel)card.append(node('p','portal-small','Activity: '+e.miniGameLabel));
 }else{
  const labels={Currency:{1:'Coin',2:'Diamond',3:'Skip Tickets'},MaturityPotion:{1:'Small Maturity Potion',2:'Medium Maturity Potion',3:'Big Maturity Potion'},GachaTicket:{1:'Character Gacha Ticket',2:'Monster Gacha Ticket',3:'Equipment Gacha Ticket',4:'Resources Gacha Ticket',5:'Event Gacha Ticket'}};
  const fmt=r=>{const name=r.type==='Crystal'?'Crystals':r.type==='Essence'?'Essence':r.type==='Character'?'Character ID '+r.value:(labels[r.type]?.[r.variant]||(r.type==='JobCrystal'?'Rarity '+r.variant+' Job Crystal':r.type));return (Number(r.quantity||0).toLocaleString('en-US'))+' × '+name;};
  card.append(node('p','',Array.isArray(e.rewards)?e.rewards.map(fmt).join(' · '):''));
  card.append(node('p','portal-small',e.featured?'Expires '+e.expiryDate:'Ongoing code'));
  const btn=node('button','code-copy','Copy Code');btn.type='button';btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(e.code);btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy Code',1500)}catch(_){btn.textContent='Copy unavailable';}});card.append(btn);
 }return card;}
function group(target,items,type,empty){target.replaceChildren();if(!items.length)target.append(node('p','portal-empty',empty));else items.forEach(e=>target.append(makeCard(e,type)));}
async function renderEvents(){
 try{const [ed,cd]=await Promise.all([get(base+'public-'+game+'-events.json'),get(base+'public-'+game+'-codes.json').catch(()=>({entries:[]}))]);
 const events=(ed.entries||[]).filter(e=>e.published===true&&e.publishStatus!=='configuration-only');
 const spot=events.filter(e=>e.publishStatus==='spotlight'&&e.displayUntil&&day<=e.displayUntil&&(!e.displayFrom||day>=e.displayFrom));
 const active=events.filter(e=>e.startDate&&e.endDate&&e.startDate<=day&&e.endDate>=day);
 const future=events.filter(e=>e.startDate&&e.startDate>day);
 const past=events.filter(e=>e.endDate&&e.endDate<day);
 group($('event-list'),[...spot,...active,...future],'event','No currently announced events.');
 group($('past-list'),past,'event','No recorded past events.');
 const codes=(cd.entries||[]).filter(c=>c.published===true&&c.code&&(!c.startDate||c.startDate<=day)&&(!c.expiryDate||c.expiryDate>=day));
 const featured=codes.filter(c=>c.featured===true&&c.publicationType==='limited'&&c.expiryDate&&c.expiryDate>=day);
 const pool=codes.filter(c=>c.publicationType==='ongoing'&&c.rotationApproved===true&&c.rotationEligible===true&&!c.featured).slice().sort((a,b)=>a.code.localeCompare(b.code));
 let seed=2166136261;for(const ch of game+'|'+day)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 const random=()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 group($('featured-codes'),featured,'code','No published limited-time codes.');
 group($('daily-codes'),pool.slice(0,3),'code','No approved ongoing codes.');
 }catch(err){$('event-list').textContent='Event data temporarily unavailable.';console.warn(err);}
}
async function renderLatest(){
 const grids=Object.fromEntries(cfg.categories.map(c=>[c[1],$('latest-'+c[1])]));
 try{
 const log=await get('https://raw.githubusercontent.com/Aubjective/'+game+'/main/data/version_log.json');
 const entries=(log.entries||[]).filter(e=>e.changeType==='added'&&e.status==='confirmed'&&['verified','synced'].includes(e.syncStatus)&&e.version&&e.date&&e.key&&cfg.categories.some(c=>c[1]===e.category));
 for(const c of cfg.categories){
  const recent=entries.filter(e=>e.category===c[1]).sort((a,b)=>b.date.localeCompare(a.date)||String(b.version).localeCompare(String(a.version))).slice(0,4);
  const grid=grids[c[1]];grid.replaceChildren();
  if(!recent.length){grid.append(node('p','category-empty','No verified dated additions in the current public change log. Browse the wiki for the full catalog.'));continue;}
  for(const e of recent)for(const name of String(e.key).split(';').map(x=>x.trim()).filter(Boolean).slice(0,6)){
   const card=node('article','content-card');card.append(node('div','portal-meta','NEW · v'+e.version));card.append(node('strong','',name));card.append(node('small','',e.date+' · ID/name verified'));grid.append(card);
  }
 }
 const status=log.publicStatus||{};$('verified-note').textContent='Latest published change-log entries only · Source review '+(status.lastReviewed||status.asOf||'not dated')+'. Verification does not imply a complete game-data audit.';
 }catch(err){Object.values(grids).forEach(grid=>grid.textContent='Latest entries unavailable. Browse the wiki for the full catalog.');console.warn(err);}
}
renderLatest();renderEvents();
})();