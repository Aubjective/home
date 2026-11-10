(function(){
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'});
const safe=(s)=>String(s??'');
const fetchData=async(path)=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(path);return (await r.json()).entries||[]};
let characterNames={};
const readable=(value)=>String(value??'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
const dateLabel=(value)=>{if(!value)return '';const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!match)return '';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(+match[1],+match[2]-1,+match[3])));};
const dateRange=(a,b)=>[dateLabel(a),dateLabel(b)].filter(Boolean).join(' — ');
const reward=(r)=>{const type=readable(r.type)||'Reward';if(r.type==='Character')return characterNames[String(r.value)]?'Character: '+characterNames[String(r.value)]:'Character reward';const quantity=r.quantity??r.value;return quantity!==undefined&&quantity!==null&&quantity!==''?Number(quantity).toLocaleString('en-US')+' × '+type:type;};
const publicLabel=(label)=>typeof label==='string'&&label.trim()?label.trim():null;

// Only manually published codes are eligible. Missing files are not used for other games.
const dailySelection=(codes,date,game,count=3)=>{
  const pool=codes.slice().sort((a,b)=>a.code.localeCompare(b.code));
  if(pool.length<=count)return pool;
  let seed=2166136261;
  for(const ch of game+'|'+date)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
  const random=()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  return pool.slice(0,count);
};
const giftReward=(r)=>{
 const values={Currency:{1:'Coin',2:'Diamond',3:'Skip Tickets'},MaturityPotion:{1:'Small Maturity Potion',2:'Medium Maturity Potion',3:'Big Maturity Potion'},GachaTicket:{1:'Character Gacha Ticket',2:'Monster Gacha Ticket',3:'Equipment Gacha Ticket',4:'Resources Gacha Ticket',5:'Event Gacha Ticket'}};
 const name=values[r.type]?.[r.variant]||(r.type==='JobCrystal'?'Rarity '+r.variant+' Job Crystal':r.type);
 const quantity=Number(r.quantity||0).toLocaleString('en-US');
 return quantity+' × '+name;
};
function giftCard(c){
 const article=element('article','portal-card coupon');
 article.append(element('div','portal-meta','REDEMPTION CODE'),element('h3','code-text',c.code),element('p','',c.rewards.map(giftReward).join(' · ')),element('p','portal-small',c.longTerm===true?'Ongoing':('Expires '+dateLabel(c.expiryDate))));
 const button=element('button','copy-code','Copy Code');
 button.type='button';
 button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(c.code);button.textContent='Copied!';setTimeout(()=>button.textContent='Copy Code',1500)}catch(e){button.textContent='Unable to copy'}});
 article.append(button);
 return article;
}
function element(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=safe(txt);return el}
function card(title,meta,detail,cls=''){const outer=element('article','portal-card '+cls);outer.append(element('div','portal-meta',meta),element('h3','',title),element('p','',detail));return outer}
async function load(game,prefix){
const events=await fetchData(prefix+'data/public-'+game+'-events.json');
const codes=game==='isekaimania'?await fetchData(prefix+'data/public-isekaimania-codes.json'):[];
const published=events.filter(e=>e.published===true&&e.publishStatus!=='configuration-only');
const d=today();
const eligible=codes.filter(c=>c.published===true&&c.code&&c.expiryDate>=d&&(!c.startDate||c.startDate<=d));
return{
 codes:dailySelection(eligible,d,game,3),
 active:published.filter(e=>e.startDate&&e.endDate&&e.startDate<=d&&e.endDate>=d),
 upcoming:published.filter(e=>e.startDate&&e.startDate>d),
 past:published.filter(e=>e.endDate&&e.endDate<d)
};
}
function eventCard(e){const outer=card(e.title,dateRange(e.startDate,e.endDate),e.description||('A '+readable(e.type||'special').toLowerCase()+' featuring '+(e.featured||[]).join(', ')+'.'),'event-banner');if(e.featured&&e.featured.length)outer.append(element('p','portal-small','Featured: '+e.featured.join(', ')));if(e.eventPointLabel||e.eventPoint)outer.append(element('p','portal-small','Event currency: '+(publicLabel(e.eventPointLabel)||'Event currency')));if(e.miniGameLabel||e.miniGame)outer.append(element('p','portal-small','Activity: '+(publicLabel(e.miniGameLabel)||'Special activity')));return outer}
function renderPage(game,prefix){load(game,prefix).then(d=>{const render=(id,items,fn,empty)=>{const box=document.getElementById(id);if(!box)return;box.replaceChildren();if(!items.length)box.append(element('p','portal-empty',empty));else items.forEach(x=>box.append(fn(x)))};render('ongoing-events',d.active,eventCard,'No ongoing events with confirmed dates.');render('upcoming-events',d.upcoming,eventCard,'No upcoming events announced.');render('past-events',d.past,eventCard,'No past events recorded.');render('limited-codes',d.codes,giftCard,'No published redemption codes available.');}).catch(e=>console.warn('Portal content unavailable',e))}
function renderHome(game,key){load(game,'./').then(d=>{const evt=d.active[0]||d.upcoming[0];const title=document.getElementById(key+'-event-title'),sub=document.getElementById(key+'-event-subtitle');if(title&&sub){title.textContent=evt?evt.title:'No confirmed ongoing events';sub.textContent=evt?(dateRange(evt.startDate,evt.endDate)+(evt.eventPointLabel?' · '+evt.eventPointLabel:'')):'Visit Events & Announcements for details.'}}).catch(e=>console.warn('Home event information unavailable',e))}

async function renderHub(prefix='./'){
 const root=document.getElementById('game-sections');if(!root)return;root.replaceChildren();
 const registry=await fetch(prefix+'data/public-games.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Game registry unavailable');return r.json()});
 const d=today(),games=Array.isArray(registry.games)?registry.games:[];
 const mk=(tag,cl,tx)=>element(tag,cl,tx);
 function appendCard(parent,entry,kind){
  const article=mk('article','portal-card '+(kind==='code'?'coupon':kind==='spotlight'?'event-banner':''));
  if(kind==='code'){
   article.append(mk('div','portal-meta',entry.featured?'FEATURED · LIMITED-TIME CODE':'ONGOING CODE'),mk('h3','code-text',entry.code));
   const format=(r)=>r.type==='Character'?'Character ID '+r.value:r.type==='Crystal'?(Number(r.quantity).toLocaleString()+' Crystals'):r.type==='Essence'?(Number(r.quantity).toLocaleString()+' Essence'):giftReward(r);
   article.append(mk('p','',entry.rewards.map(format).join(' · ')));
   article.append(mk('p','portal-small',entry.featured?'Expires '+dateLabel(entry.expiryDate):'Ongoing code'));
   const button=mk('button','copy-code','Copy Code');button.type='button';
   button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(entry.code);button.textContent='Copied!';setTimeout(()=>button.textContent='Copy Code',1500)}catch(error){button.textContent='Unable to copy'}});
   article.append(button);
  }else{
   article.append(mk('div','portal-meta',kind==='spotlight'?'EVENT SPOTLIGHT · DATES UNCONFIRMED':dateRange(entry.startDate,entry.endDate)),mk('h3','',entry.title),mk('p','',entry.description||''));
   if(entry.featured?.length)article.append(mk('p','portal-small','Featured: '+entry.featured.join(', ')));
   if(entry.eventPointLabel)article.append(mk('p','portal-small','Event currency: '+entry.eventPointLabel));
   if(entry.miniGameLabel)article.append(mk('p','portal-small','Activity: '+entry.miniGameLabel));
  }
  parent.append(article);
 }
 const addGroup=(section,label,entries,kind)=>{if(!entries.length)return;const area=mk('div','hub-group'),header=mk('h3','',label),grid=mk('div','portal-grid');area.append(header,grid);entries.forEach(e=>appendCard(grid,e,e.publishStatus==='spotlight'?'spotlight':kind));section.append(area)};
 for(const game of games){
  const section=mk('section','hub-game');section.id=game.id;
  const head=mk('div','hub-game-heading');head.append(mk('div','hub-game-name',game.name),mk('div','hub-subtitle',game.subtitle));
  if(game.wiki){const a=mk('a','portal-link','Game Wiki');a.href=game.wiki;a.target='_blank';a.rel='noopener noreferrer';head.append(a)}
  section.append(head);root.append(section);
  try{
   const [eventData,codeData]=await Promise.all([fetch(prefix+'data/public-'+game.id+'-events.json',{cache:'no-store'}).then(r=>r.ok?r.json():{entries:[]}),fetch(prefix+'data/public-'+game.id+'-codes.json',{cache:'no-store'}).then(r=>r.ok?r.json():{entries:[]})]);
   const events=(eventData.entries||[]).filter(e=>e.published===true&&e.publishStatus!=='configuration-only');
   const codes=(codeData.entries||[]).filter(c=>c.published===true&&c.code&&(!c.startDate||c.startDate<=d)&&(!c.expiryDate||c.expiryDate>=d));
   const spotlight=events.filter(e=>e.publishStatus==='spotlight'&&e.displayUntil&&d<=e.displayUntil&&(!e.displayFrom||d>=e.displayFrom));
   const active=events.filter(e=>e.startDate&&e.endDate&&e.startDate<=d&&e.endDate>=d);
   const upcoming=events.filter(e=>e.startDate&&e.startDate>d);
   const featured=codes.filter(c=>c.featured===true&&c.publicationType==='limited'&&c.expiryDate&&c.expiryDate>=d);
   // A distant expiration or longTerm flag alone never permits ongoing rotation.
   const ongoingPool=codes.filter(c=>c.publicationType==='ongoing'&&c.rotationApproved===true&&c.rotationEligible===true&&!c.featured);
   const daily=dailySelection(ongoingPool,d,game.id,3);
   addGroup(section,'Featured Events & Announcements',[...spotlight,...active,...upcoming],'event');
   addGroup(section,'Featured Limited-Time Codes',featured,'code');
   addGroup(section,'Ongoing Codes · 3 Daily',daily,'code');
   const past=events.filter(e=>e.endDate&&e.endDate<d);
   if(past.length){const details=mk('details','hub-archive'),summary=mk('summary','','Past events ('+past.length+')'),grid=mk('div','portal-grid');past.forEach(e=>appendCard(grid,e,'event'));details.append(summary,grid);section.append(details)}
  }catch(error){section.append(mk('p','portal-empty','This game\'s announcements are temporarily unavailable.'));console.warn('Event hub game load failed',game.id,error)}
 }
}

window.AubjectivePortal={renderPage,renderHome,renderHub};
})();