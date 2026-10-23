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
function element(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=safe(txt);return el}
function card(title,meta,detail,cls=''){const outer=element('article','portal-card '+cls);outer.append(element('div','portal-meta',meta),element('h3','',title),element('p','',detail));return outer}
async function load(game,prefix){
const events=await fetchData(prefix+'data/public-'+game+'-events.json');
const published=events.filter(e=>e.published===true&&e.publishStatus!=='configuration-only');
const d=today();
return{
 active:published.filter(e=>e.startDate&&e.endDate&&e.startDate<=d&&e.endDate>=d),
 upcoming:published.filter(e=>e.startDate&&e.startDate>d),
 past:published.filter(e=>e.endDate&&e.endDate<d)
};
}
function eventCard(e){const outer=card(e.title,dateRange(e.startDate,e.endDate),e.description||('A '+readable(e.type||'special').toLowerCase()+' featuring '+(e.featured||[]).join(', ')+'.'),'event-banner');if(e.featured&&e.featured.length)outer.append(element('p','portal-small','Featured: '+e.featured.join(', ')));if(e.eventPointLabel||e.eventPoint)outer.append(element('p','portal-small','Event currency: '+(publicLabel(e.eventPointLabel)||'Event currency')));if(e.miniGameLabel||e.miniGame)outer.append(element('p','portal-small','Activity: '+(publicLabel(e.miniGameLabel)||'Special activity')));return outer}
function renderPage(game,prefix){load(game,prefix).then(d=>{const render=(id,items,fn,empty)=>{const box=document.getElementById(id);if(!box)return;box.replaceChildren();if(!items.length)box.append(element('p','portal-empty',empty));else items.forEach(x=>box.append(fn(x)))};render('ongoing-events',d.active,eventCard,'No ongoing events with confirmed dates.');render('upcoming-events',d.upcoming,eventCard,'No upcoming events announced.');render('past-events',d.past,eventCard,'No past events recorded.');}).catch(e=>console.warn('Portal content unavailable',e))}
function renderHome(game,key){load(game,'./').then(d=>{const evt=d.active[0]||d.upcoming[0];const title=document.getElementById(key+'-event-title'),sub=document.getElementById(key+'-event-subtitle');if(title&&sub){title.textContent=evt?evt.title:'No confirmed ongoing events';sub.textContent=evt?(dateRange(evt.startDate,evt.endDate)+(evt.eventPointLabel?' · '+evt.eventPointLabel:'')):'Visit Events & Announcements for details.'}}).catch(e=>console.warn('Home event information unavailable',e))}
window.AubjectivePortal={renderPage,renderHome};
})();