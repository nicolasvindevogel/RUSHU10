/* U10 Herseaux - PWA GitHub Pages + Supabase */
const cfg = window.APP_CONFIG || {};
const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('VOTRE-PROJET') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('VOTRE_CLE');
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const state = { user:null, profile:null, identity:null, membership:null, team:null, players:[], events:[], page:'dashboard', month:new Date(), installPrompt:null, loginMode:null, attendanceTab:'parents', attendanceWeek:null, selectedEvent:null };
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = (v='') => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmtDate = d => new Intl.DateTimeFormat('fr-BE',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(d+'T12:00:00'));
const fmtLong = d => new Intl.DateTimeFormat('fr-BE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00'));
const fmtFullDate = d => new Intl.DateTimeFormat('fr-BE',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00'));
const timeShort = t => t ? t.slice(0,5) : '';
const todayISO = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
function toast(msg, ok=true){ const t=$('#toast'); t.textContent=msg; t.style.borderColor=ok?'#2f6d42':'#7a3434'; t.classList.add('show'); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),2800); }
function setBusy(btn, busy, label='Enregistrement…'){ if(!btn)return; if(busy){btn.dataset.old=btn.textContent;btn.textContent=label;btn.disabled=true}else{btn.textContent=btn.dataset.old||btn.textContent;btn.disabled=false} }
function openModal(html){ $('#modalBody').innerHTML=html; $('#modal').classList.remove('hidden'); }
function closeModal(){ $('#modal').classList.add('hidden'); $('#modalBody').innerHTML=''; }

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); state.installPrompt=e; $('#installBtn')?.classList.remove('hidden'); });
$('#installBtn')?.addEventListener('click', async()=>{ if(state.installPrompt){ state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt=null; $('#installBtn').classList.add('hidden'); }});
$('#modalClose').addEventListener('click',closeModal); $('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
window.addEventListener('online',()=>$('#syncState').textContent='● En ligne');
window.addEventListener('offline',()=>$('#syncState').textContent='● Hors ligne');

const NAV_COACH = [
  ['dashboard','⌂','Tableau de bord'],
  ['calendar','▦','Calendrier'],
  ['attendance','✓','Présences'],
  ['matches','⚽','Matchs'],
  ['players','👥','Joueurs'],
  ['evaluations','★','Évaluations'],
  ['settings','⚙','Paramètres']
];
const isCoach = () => state.membership?.role === 'coach';

function setView(which){ ['authView','appView'].forEach(id=>$('#'+id)?.classList.add('hidden')); $('#'+which)?.classList.remove('hidden'); }
function pageMeta(page){
  const m={
    dashboard:['Tableau de bord','Vue d’ensemble de l’équipe'],
    calendar:['Calendrier','Entraînements, matchs et tournois'],
    attendance:['Présences','Prévisions parents et présence réelle'],
    matches:['Matchs','Championnat, amicaux, compositions et visuels'],
    players:['Joueurs','Effectif U10'],
    evaluations:['Évaluations','Technique, jeu, athlétique, mental & attitude'],
    settings:['Paramètres','Compte et accès à l’équipe']
  };
  return m[page]||m.dashboard;
}
function renderNav(){ const nav=NAV_COACH; $('#nav').innerHTML=nav.map(([id,ic,lab])=>`<button class="nav-btn ${state.page===id?'active':''}" data-page="${id}"><span class="nav-icon">${ic}</span>${lab}</button>`).join(''); $$('#nav .nav-btn').forEach(b=>b.onclick=()=>go(b.dataset.page)); }
async function go(page){
  state.page=page;
  renderNav();
  const [t,s]=pageMeta(page);
  $('#pageTitle').textContent=t;
  $('#pageSubtitle').textContent=s;
  $('#sidebar').classList.remove('open');
  if(page==='dashboard') await renderDashboard();
  if(page==='calendar') await renderCalendar();
  if(page==='attendance') await renderAttendance();
  if(page==='matches') await renderMatches();
  if(page==='players') await renderPlayers();
  if(page==='evaluations') await renderEvaluations();
  if(page==='settings') await renderSettings();
}

const COACH_KEYS = new Set(['coach-nicolas','coach-thibaut','coach-maxime']);

async function ensureSession(){
  let {data:{session}} = await sb.auth.getSession();
  if(session?.user) return session.user;
  const {data,error} = await sb.auth.signInAnonymously();
  if(error) throw error;
  return data.user;
}

async function init(){
  if(!configured){ $('#setupWarning').classList.remove('hidden'); return; }
  try{
    const user = await ensureSession();
    await loadUser(user);
  }catch(err){
    console.error(err);
    setView('authView');
    toast("Connexion impossible : " + (err.message || err), false);
  }

  sb.auth.onAuthStateChange(async(_e,session)=>{
    if(session?.user && session.user.id!==state.user?.id) await loadUser(session.user);
  });
}

async function loadUser(user){
  state.user=user;

  const {data:identity,error:identityError}=await sb
    .from('app_identities')
    .select('identity_key,display_name,identity_type,auth_user_id')
    .eq('auth_user_id',user.id)
    .maybeSingle();

  if(identityError && !String(identityError.message||'').includes('app_identities')){
    console.error(identityError);
  }

  if(!identity){
    state.identity=null;
    state.profile=null;
    state.membership=null;
    state.team=null;
    setView('authView');
    resetLoginForm();
    return;
  }

  state.identity=identity;

  const {data:memberships,error}=await sb
    .from('team_members')
    .select('team_id,role,teams(*)')
    .eq('user_id',user.id)
    .eq('role','coach')
    .limit(1);

  if(error) console.error(error);
  if(!memberships?.length){
    setView('authView');
    resetLoginForm();
    toast("L'accès coach n'est pas encore activé pour ce profil.", false);
    return;
  }

  state.membership=memberships[0];
  state.team=memberships[0].teams;
  state.profile={id:user.id,full_name:identity.display_name,role:'coach'};

  $('#seasonLabel').textContent=state.team.season||'';
  $('#userCard').innerHTML=`<strong>${esc(identity.display_name)}</strong><br><span class="muted">Coach</span>`;
  setView('appView');
  renderNav();
  await loadCore();
  await go(state.page);
}

async function loadCore(){
  const [{data:players},{data:events}] = await Promise.all([
    sb.from('players').select('*').eq('team_id',state.team.id).eq('active',true).order('first_name'),
    sb.from('events').select('*').eq('team_id',state.team.id).order('event_date').order('start_time')
  ]);
  state.players=players||[];
  state.events=events||[];
}

function logoutLocal(){
  state.user=state.profile=state.identity=state.membership=state.team=null;
  state.players=[];
  state.events=[];
  setView('authView');
  resetLoginForm();
}

function resetLoginForm(){
  const sel=$('#identitySelect');
  if(sel) sel.value='';
  $('#pinArea')?.classList.add('hidden');
  $('#parentPending')?.classList.add('hidden');
  $('#pinConfirmLabel')?.classList.add('hidden');
  if($('#pinInput')) $('#pinInput').value='';
  if($('#pinConfirm')) $('#pinConfirm').value='';
  state.loginMode=null;
}

async function prepareIdentityLogin(){
  const key=$('#identitySelect').value;
  $('#pinArea').classList.add('hidden');
  $('#parentPending').classList.add('hidden');
  $('#pinConfirmLabel').classList.add('hidden');
  $('#pinInput').value='';
  $('#pinConfirm').value='';
  state.loginMode=null;

  if(!key) return;

  if(key.startsWith('player-')){
    $('#parentPending').classList.remove('hidden');
    return;
  }

  const {data,error}=await sb.rpc('identity_login_status',{p_identity_key:key});
  if(error){
    console.error(error);
    return toast(error.message,false);
  }

  if(!data?.exists){
    return toast("Ce profil coach n'existe pas dans Supabase. Exécute SETUP_COACH.sql.", false);
  }

  state.loginMode = data.has_pin ? 'login' : 'activate';
  $('#pinArea').classList.remove('hidden');

  if(state.loginMode==='activate'){
    $('#pinHelp').textContent="Première connexion : choisissez votre code personnel à 6 chiffres. Vous ne devrez le créer qu'une seule fois.";
    $('#pinConfirmLabel').classList.remove('hidden');
    $('#pinConfirm').required=true;
    $('#identitySubmit').textContent='Créer mon accès coach';
  }else{
    $('#pinHelp').textContent='Saisissez votre code personnel à 6 chiffres.';
    $('#pinConfirm').required=false;
    $('#identitySubmit').textContent='Se connecter';
  }
}

$('#identitySelect').addEventListener('change',prepareIdentityLogin);

$('#identityForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const key=$('#identitySelect').value;
  if(!COACH_KEYS.has(key)) return toast("L'accès parent sera ajouté ensuite.",false);

  const pin=$('#pinInput').value.trim();
  if(!/^\d{6}$/.test(pin)) return toast('Le code doit contenir exactement 6 chiffres.',false);

  if(state.loginMode==='activate'){
    const confirmation=$('#pinConfirm').value.trim();
    if(pin!==confirmation) return toast('Les deux codes ne correspondent pas.',false);
  }

  const btn=e.submitter;
  setBusy(btn,true,state.loginMode==='activate'?'Création…':'Connexion…');

  const fn=state.loginMode==='activate'?'activate_identity':'login_identity';
  const {data,error}=await sb.rpc(fn,{p_identity_key:key,p_pin:pin});

  setBusy(btn,false);
  if(error) return toast(error.message,false);

  toast(state.loginMode==='activate'?'Accès coach créé.':'Connexion réussie.');
  await loadUser(state.user);
});

$('#logoutBtn').onclick=async()=>{
  await sb.auth.signOut();
  state.user=null;
  try{
    const user=await ensureSession();
    await loadUser(user);
  }catch(err){
    toast(err.message||String(err),false);
  }
};
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');

function eventTypePill(type){ const x={training:['green','Entraînement'],match:['blue','Match'],tournament:['orange','Tournoi'],other:['gray','Autre']}[type]||['gray',type]; return `<span class="pill ${x[0]}">${x[1]}</span>`; }
function statusPill(s){ const m={present:['green','Présent'],absent:['red','Absent'],maybe:['orange','Incertain'],excused:['orange','Excusé'],late:['orange','Retard']}; const x=m[s]||['gray','Pas de réponse']; return `<span class="pill ${x[0]}">${x[1]}</span>`; }

async function renderDashboard(){
  await loadCore(); const now=todayISO(); const upcoming=state.events.filter(e=>e.event_date>=now).slice(0,6); const thisMonth=state.events.filter(e=>e.event_date.slice(0,7)===now.slice(0,7));
  let linked=[]; if(!isCoach()){ const {data}=await sb.from('player_guardians').select('player_id,players(*)').eq('user_id',state.user.id); linked=data||[]; }
  let html=`<div class="cards"><div class="stat"><div class="label">Joueurs actifs</div><div class="value">${state.players.length}</div></div><div class="stat"><div class="label">Événements ce mois</div><div class="value">${thisMonth.length}</div></div><div class="stat"><div class="label">Prochains matchs</div><div class="value">${upcoming.filter(e=>e.type==='match').length}</div></div><div class="stat"><div class="label">Profil</div><div class="value" style="font-size:1.2rem">${isCoach()?'Coach':'Parent'}</div></div></div>`;
  if(!isCoach() && !linked.length){ html+=`<div class="notice warning"><strong>Aucun enfant lié.</strong> Demande au coach de générer un code joueur, puis utilise “Lier mon enfant” dans Mon compte.</div>`; }
  html+=`<div class="section-head"><h3>Prochains rendez-vous</h3>${isCoach()?'<button class="btn primary small" id="addEventDash">+ Ajouter</button>':''}</div><div class="event-list">${upcoming.length?upcoming.map(eventCard).join(''):'<div class="empty panel">Aucun événement à venir.</div>'}</div>`;
  $('#content').innerHTML=html; $('#addEventDash')?.addEventListener('click',()=>eventModal()); bindEventButtons();
}
function eventCard(e){
  const opponent=e.opponent?` · vs ${esc(e.opponent)}`:'';
  const when=timeShort(e.start_time)||'Heure à préciser';
  return `<div class="event-card">
    <div class="event-title"><h4>${esc(e.title)}</h4>${eventTypePill(e.type)}</div>
    <div class="event-meta">
      <span>📅 ${fmtFullDate(e.event_date)}</span><span>🕒 ${when}</span>
      ${e.meeting_time?`<span>👥 RDV ${timeShort(e.meeting_time)}</span>`:''}
      ${e.location?`<span>📍 ${esc(e.location)}</span>`:''}${opponent}
    </div>
    ${e.notes?`<div class="muted">${esc(e.notes)}</div>`:''}
    <div class="event-actions">
      <button class="btn ghost small" data-event-presence="${e.id}">Présences</button>
      ${e.type==='match'?`<button class="btn ghost small" data-match-lineup="${e.id}">Composition</button>`:''}
      ${isCoach()?`<button class="btn secondary small" data-edit-event="${e.id}">Modifier</button>`:''}
    </div>
  </div>`;
}
function bindEventButtons(){
  $$('[data-event-presence]').forEach(b=>b.onclick=()=>{
    state.selectedEvent=b.dataset.eventPresence;
    state.attendanceTab='coach';
    go('attendance');
  });
  $$('[data-edit-event]').forEach(b=>b.onclick=()=>eventModal(state.events.find(e=>e.id===b.dataset.editEvent)));
  $$('[data-match-lineup]').forEach(b=>b.onclick=()=>matchLineupModal(state.events.find(e=>e.id===b.dataset.matchLineup)));
}

async function renderCalendar(){
  await loadCore();
  const d=state.month;
  const y=d.getFullYear(),m=d.getMonth();
  const monthEvents=state.events.filter(e=>{
    const x=new Date(e.event_date+'T12:00:00');
    return x.getFullYear()===y&&x.getMonth()===m;
  });
  $('#content').innerHTML=`
    <div class="calendar-toolbar">
      <div class="toolbar-group">
        <button class="btn ghost small" id="prevMonth">←</button>
        <button class="btn ghost small" id="todayMonth">Aujourd'hui</button>
        <button class="btn ghost small" id="nextMonth">→</button>
      </div>
      <strong>${new Intl.DateTimeFormat('fr-BE',{month:'long',year:'numeric'}).format(d)}</strong>
      <button class="btn primary small" id="addEvent">+ Événement</button>
    </div>
    ${calendarHTML(y,m)}
    <div class="section-head"><h3>Événements du mois</h3></div>
    <div class="event-list">${monthEvents.map(eventCard).join('')||'<div class="empty panel">Aucun événement.</div>'}</div>`;
  $('#prevMonth').onclick=()=>{state.month=new Date(y,m-1,1);renderCalendar()};
  $('#nextMonth').onclick=()=>{state.month=new Date(y,m+1,1);renderCalendar()};
  $('#todayMonth').onclick=()=>{state.month=new Date();renderCalendar()};
  $('#addEvent').onclick=()=>eventModal();
  $$('[data-cal-event]').forEach(b=>b.onclick=()=>eventModal(state.events.find(e=>e.id===b.dataset.calEvent)));
  bindEventButtons();
}

function calendarHTML(y,m){
  const first=new Date(y,m,1), start=new Date(y,m,1-((first.getDay()+6)%7));
  let cells='';
  const names=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  for(let i=0;i<42;i++){
    const dd=new Date(start);
    dd.setDate(start.getDate()+i);
    const iso=[dd.getFullYear(),String(dd.getMonth()+1).padStart(2,'0'),String(dd.getDate()).padStart(2,'0')].join('-');
    const evs=state.events.filter(e=>e.event_date===iso);
    cells+=`<div class="cal-day ${dd.getMonth()!==m?'other':''}">
      <span class="day-num">${dd.getDate()}</span>
      ${evs.map(e=>`<button type="button" class="cal-event ${e.type}" data-cal-event="${e.id}" title="Cliquer pour modifier">${timeShort(e.start_time)||''} ${esc(e.title)}</button>`).join('')}
    </div>`;
  }
  return `<div class="calendar">${names.map(n=>`<div class="cal-head">${n}</div>`).join('')}${cells}</div>`;
}

function eventModal(e=null){
  openModal(`<h2>${e?'Modifier':'Ajouter'} un événement</h2>
  <form id="eventForm" class="form-grid">
    <label>Type
      <select id="evType">
        <option value="training">Entraînement</option>
        <option value="match">Match</option>
        <option value="tournament">Tournoi</option>
        <option value="other">Événement du club</option>
      </select>
    </label>
    <label>Titre<input id="evTitle" required value="${esc(e?.title||'')}" placeholder="Ex. Entraînement U10" /></label>
    <label>Date<input id="evDate" type="date" required value="${e?.event_date||todayISO()}" /></label>
    <label>Heure début<input id="evStart" type="time" value="${timeShort(e?.start_time)}" /></label>
    <label>Heure fin<input id="evEnd" type="time" value="${timeShort(e?.end_time)}" /></label>
    <label>Heure de rendez-vous<input id="evMeet" type="time" value="${timeShort(e?.meeting_time)}" /></label>
    <label>Lieu<input id="evLocation" value="${esc(e?.location||'')}" /></label>
    <label>Adversaire<input id="evOpponent" value="${esc(e?.opponent||'')}" /></label>
    <label id="matchKindLabel">Type de match
      <select id="evMatchKind">
        <option value="championship">Championnat</option>
        <option value="friendly">Amical</option>
      </select>
    </label>
    <label class="full">Adresse<input id="evAddress" value="${esc(e?.address||'')}" /></label>
    <label class="full">Informations<textarea id="evNotes">${esc(e?.notes||'')}</textarea></label>
    <div class="full" style="display:flex;gap:8px;justify-content:flex-end">
      ${e?'<button type="button" id="deleteEvent" class="btn danger">Supprimer</button>':''}
      <button class="btn primary">Enregistrer</button>
    </div>
  </form>`);
  $('#evType').value=e?.type||'training';
  $('#evMatchKind').value=e?.match_kind||'championship';
  const syncKind=()=>$('#matchKindLabel').classList.toggle('hidden',$('#evType').value!=='match');
  $('#evType').onchange=syncKind; syncKind();

  $('#eventForm').onsubmit=async ev=>{
    ev.preventDefault();
    const btn=ev.submitter; setBusy(btn,true);
    const payload={
      team_id:state.team.id,
      type:$('#evType').value,
      title:$('#evTitle').value.trim(),
      event_date:$('#evDate').value,
      start_time:$('#evStart').value||null,
      end_time:$('#evEnd').value||null,
      meeting_time:$('#evMeet').value||null,
      location:$('#evLocation').value.trim()||null,
      address:$('#evAddress').value.trim()||null,
      opponent:$('#evOpponent').value.trim()||null,
      notes:$('#evNotes').value.trim()||null,
      match_kind:$('#evType').value==='match'?$('#evMatchKind').value:null,
      created_by:state.user.id
    };
    let q=e?sb.from('events').update(payload).eq('id',e.id):sb.from('events').insert(payload);
    const {error}=await q;
    setBusy(btn,false);
    if(error)return toast(error.message,false);
    closeModal(); toast('Événement enregistré');
    await loadCore(); await go(state.page);
  };
  $('#deleteEvent')?.addEventListener('click',async()=>{
    if(!confirm('Supprimer cet événement ?'))return;
    const {error}=await sb.from('events').delete().eq('id',e.id);
    if(error)return toast(error.message,false);
    closeModal(); toast('Événement supprimé');
    await loadCore(); await go(state.page);
  });
}

function mondayOf(dateLike){
  const d=dateLike?new Date(dateLike+'T12:00:00'):new Date();
  const day=(d.getDay()+6)%7;
  d.setDate(d.getDate()-day);
  return new Date(d.getFullYear(),d.getMonth(),d.getDate());
}
function isoLocal(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function availabilityCell(a){
  if(!a) return `<span class="availability-box pending">Non rempli</span>`;
  if(a.status==='present') return `<span class="availability-box present">Présent</span>`;
  if(a.status==='absent') return `<span class="availability-box absent">Absent</span>`;
  return `<span class="availability-box maybe">Incertain</span>`;
}

async function renderAttendance(){
  await loadCore();
  $('#content').innerHTML=`
    <div class="attendance-tabs">
      <button class="tab-btn ${state.attendanceTab==='parents'?'active':''}" id="tabParents">Prévisions parents</button>
      <button class="tab-btn ${state.attendanceTab==='coach'?'active':''}" id="tabCoach">Présence coach</button>
    </div>
    <div id="attendanceBody"></div>`;
  $('#tabParents').onclick=()=>{state.attendanceTab='parents';renderAttendance()};
  $('#tabCoach').onclick=()=>{state.attendanceTab='coach';renderAttendance()};
  if(state.attendanceTab==='parents') await renderParentForecast();
  else await renderCoachCheckin();
}

async function renderParentForecast(){
  let monday=state.attendanceWeek?mondayOf(state.attendanceWeek):mondayOf();
  state.attendanceWeek=isoLocal(monday);
  const tue=isoLocal(addDays(monday,1)), thu=isoLocal(addDays(monday,3)), sat=isoLocal(addDays(monday,5));
  const wanted=[tue,thu,sat];
  const weekEvents=state.events.filter(e=>wanted.includes(e.event_date));
  const tueEvent=weekEvents.find(e=>e.event_date===tue&&e.type==='training');
  const thuEvent=weekEvents.find(e=>e.event_date===thu&&e.type==='training');
  const satEvent=weekEvents.find(e=>e.event_date===sat&&e.type==='match');
  const ids=[tueEvent?.id,thuEvent?.id,satEvent?.id].filter(Boolean);
  let avail=[];
  if(ids.length){
    const {data,error}=await sb.from('availability').select('*').in('event_id',ids);
    if(error) toast(error.message,false);
    avail=data||[];
  }
  const map=new Map(avail.map(x=>[`${x.event_id}:${x.player_id}`,x]));
  const commentsFor=(pid)=>{
    const arr=[
      tueEvent&&map.get(`${tueEvent.id}:${pid}`),
      thuEvent&&map.get(`${thuEvent.id}:${pid}`),
      satEvent&&map.get(`${satEvent.id}:${pid}`)
    ].filter(x=>x?.comment);
    return arr.map((x,i)=>esc(x.comment)).join('<br>')||'<span class="muted">—</span>';
  };
  const label=(ev,date,base)=>ev?`${base}<small>${fmtDate(date)}</small>`:`${base}<small>${fmtDate(date)} · pas d’événement</small>`;
  $('#attendanceBody').innerHTML=`
    <div class="panel week-toolbar">
      <button class="btn ghost small" id="prevWeek">← Semaine</button>
      <strong>Semaine du ${fmtLong(isoLocal(monday))}</strong>
      <button class="btn ghost small" id="nextWeek">Semaine →</button>
    </div>
    <div class="section-head">
      <div><h3>Réponses des parents</h3><span class="muted">Vue de préparation des entraînements et du match</span></div>
    </div>
    <div class="table-wrap forecast-table"><table>
      <thead><tr>
        <th>Joueur</th>
        <th>${label(tueEvent,tue,'Mardi')}</th>
        <th>${label(thuEvent,thu,'Jeudi')}</th>
        <th>${label(satEvent,sat,'Match')}</th>
        <th>Remarques</th>
      </tr></thead>
      <tbody>${state.players.map(p=>{
        const a=tueEvent?map.get(`${tueEvent.id}:${p.id}`):null;
        const b=thuEvent?map.get(`${thuEvent.id}:${p.id}`):null;
        const c=satEvent?map.get(`${satEvent.id}:${p.id}`):null;
        return `<tr><td><strong>${esc(p.first_name)}</strong></td>
          <td>${tueEvent?availabilityCell(a):'<span class="muted">—</span>'}</td>
          <td>${thuEvent?availabilityCell(b):'<span class="muted">—</span>'}</td>
          <td>${satEvent?availabilityCell(c):'<span class="muted">—</span>'}</td>
          <td class="remarks-cell">${commentsFor(p.id)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
  $('#prevWeek').onclick=()=>{state.attendanceWeek=isoLocal(addDays(monday,-7));renderParentForecast()};
  $('#nextWeek').onclick=()=>{state.attendanceWeek=isoLocal(addDays(monday,7));renderParentForecast()};
}

async function renderCoachCheckin(){
  const recent=state.events.filter(e=>e.event_date>=isoLocal(addDays(new Date(),-21))).slice().reverse();
  const selected=state.selectedEvent||recent[0]?.id||state.events.at(-1)?.id;
  state.selectedEvent=selected;
  if(!selected){
    $('#attendanceBody').innerHTML='<div class="empty panel">Aucun événement disponible.</div>';
    return;
  }
  const e=state.events.find(x=>x.id===selected);
  const {data:actual,error}=await sb.from('attendance').select('*').eq('event_id',selected);
  if(error) toast(error.message,false);
  const presentIds=new Set((actual||[]).filter(x=>x.status==='present').map(x=>x.player_id));
  const opts=state.events.slice().reverse().map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${fmtFullDate(x.event_date)} · ${esc(x.title)}</option>`).join('');
  $('#attendanceBody').innerHTML=`
    <div class="panel">
      <div class="form-grid">
        <label>Entraînement / match<select id="attendanceEvent">${opts}</select></label>
        <div><strong>${esc(e.title)}</strong><div class="muted">${fmtLong(e.event_date)} · ${timeShort(e.start_time)||'heure à préciser'}</div></div>
      </div>
    </div>
    <div class="section-head">
      <div><h3>Présence réelle</h3><span class="muted">Touchez un joueur pour le mettre présent. Case vide = absent.</span></div>
      <div class="toolbar-group"><button class="btn ghost small" id="clearPresence">Tout vider</button><button class="btn primary" id="savePresence">Enregistrer</button></div>
    </div>
    <div class="player-check-grid">
      ${state.players.map(p=>`<button type="button" class="player-check ${presentIds.has(p.id)?'present':''}" data-check-player="${p.id}">
        <span class="check-dot">${presentIds.has(p.id)?'✓':''}</span><strong>${esc(p.first_name)}</strong>
      </button>`).join('')}
    </div>
    <div class="panel presence-summary"><strong id="presenceCount">${presentIds.size}</strong> présent(s) sur ${state.players.length}</div>`;
  $('#attendanceEvent').onchange=ev=>{state.selectedEvent=ev.target.value;renderCoachCheckin()};
  const refreshCount=()=>{$('#presenceCount').textContent=$$('.player-check.present').length};
  $$('[data-check-player]').forEach(b=>b.onclick=()=>{b.classList.toggle('present');b.querySelector('.check-dot').textContent=b.classList.contains('present')?'✓':'';refreshCount()});
  $('#clearPresence').onclick=()=>{$$('[data-check-player]').forEach(b=>{b.classList.remove('present');b.querySelector('.check-dot').textContent=''});refreshCount()};
  $('#savePresence').onclick=async()=>{
    const btn=$('#savePresence');setBusy(btn,true);
    const selectedIds=new Set($$('.player-check.present').map(b=>b.dataset.checkPlayer));
    const rows=state.players.map(p=>({
      event_id:selected,
      player_id:p.id,
      status:selectedIds.has(p.id)?'present':'absent',
      marked_by:state.user.id,
      updated_at:new Date().toISOString()
    }));
    const {error}=await sb.from('attendance').upsert(rows,{onConflict:'event_id,player_id'});
    setBusy(btn,false);
    if(error)return toast(error.message,false);
    toast(`Présences enregistrées : ${selectedIds.size} présent(s)`);
  };
}

async function renderMatches(){
  await loadCore();
  const matches=state.events.filter(e=>e.type==='match').sort((a,b)=>a.event_date.localeCompare(b.event_date));
  $('#content').innerHTML=`
    <div class="section-head">
      <div><h3>Matchs U10</h3><span class="muted">Championnat et matchs amicaux</span></div>
      <button class="btn primary" id="addMatch">+ Ajouter un match</button>
    </div>
    <div class="match-list">
      ${matches.length?matches.map(e=>`
        <div class="match-card">
          <div class="match-date"><span>${new Date(e.event_date+'T12:00:00').getDate()}</span><small>${new Intl.DateTimeFormat('fr-BE',{month:'short'}).format(new Date(e.event_date+'T12:00:00'))}</small></div>
          <div class="match-main">
            <div class="event-title"><h3>Herseaux ${e.opponent?`- ${esc(e.opponent)}`:''}</h3><span class="match-kind ${e.match_kind==='friendly'?'friendly':''}">${e.match_kind==='friendly'?'Amical':'Championnat'}</span></div>
            <div class="event-meta">
              <span>📅 ${fmtFullDate(e.event_date)}</span>
              <span>🕒 ${timeShort(e.start_time)||'Heure à préciser'}</span>
              ${e.meeting_time?`<span>👥 RDV ${timeShort(e.meeting_time)}</span>`:''}
              ${e.location?`<span>📍 ${esc(e.location)}</span>`:''}
            </div>
          </div>
          <div class="match-actions">
            <button class="btn ghost small" data-match-lineup="${e.id}">Composition</button>
            <button class="btn secondary small" data-edit-event="${e.id}">Modifier</button>
          </div>
        </div>`).join(''):'<div class="empty panel">Aucun match.</div>'}
    </div>`;
  $('#addMatch').onclick=()=>eventModal({type:'match',title:'Match',event_date:todayISO(),match_kind:'championship'});
  bindEventButtons();
}

async function matchLineupModal(match){
  if(!match)return;
  const {data:sel,error}=await sb.from('match_players').select('player_id').eq('event_id',match.id);
  if(error)return toast(error.message,false);
  const chosen=new Set((sel||[]).map(x=>x.player_id));
  openModal(`
    <h2>Composition · ${esc(match.opponent||'Match')}</h2>
    <p class="muted">${fmtLong(match.event_date)} · ${timeShort(match.start_time)||'heure à préciser'} ${match.location?'· '+esc(match.location):''}</p>
    <p>Sélectionne les joueurs convoqués.</p>
    <div class="player-check-grid compact">
      ${state.players.map(p=>`<button type="button" class="player-check ${chosen.has(p.id)?'present':''}" data-lineup-player="${p.id}">
        <span class="check-dot">${chosen.has(p.id)?'✓':''}</span><strong>${esc(p.first_name)}</strong>
      </button>`).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn secondary" id="saveLineup">Enregistrer la composition</button>
      <button class="btn primary" id="generateMatchImage">Générer l'image</button>
    </div>
    <div id="matchImageArea"></div>`);
  $$('[data-lineup-player]').forEach(b=>b.onclick=()=>{b.classList.toggle('present');b.querySelector('.check-dot').textContent=b.classList.contains('present')?'✓':''});
  $('#saveLineup').onclick=()=>saveLineup(match.id);
  $('#generateMatchImage').onclick=async()=>{
    const ok=await saveLineup(match.id,true);
    if(ok!==false) await generateMatchImage(match);
  };
}

async function saveLineup(matchId,silent=false){
  const btn=$('#saveLineup');
  if(btn)setBusy(btn,true);
  const ids=$$('[data-lineup-player].present').map(b=>b.dataset.lineupPlayer);
  const {error:delError}=await sb.from('match_players').delete().eq('event_id',matchId);
  if(delError){if(btn)setBusy(btn,false);toast(delError.message,false);return false}
  if(ids.length){
    const rows=ids.map((pid,i)=>({event_id:matchId,player_id:pid,position_order:i+1,selected_by:state.user.id}));
    const {error}=await sb.from('match_players').insert(rows);
    if(error){if(btn)setBusy(btn,false);toast(error.message,false);return false}
  }
  if(btn)setBusy(btn,false);
  if(!silent)toast(`Composition enregistrée : ${ids.length} joueur(s)`);
  return true;
}

function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}

async function loadCanvasImage(src){
  return await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src});
}

async function generateMatchImage(match){
  const selectedIds=$$('[data-lineup-player].present').map(b=>b.dataset.lineupPlayer);
  const players=state.players.filter(p=>selectedIds.includes(p.id));
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=1350;
  const ctx=canvas.getContext('2d');

  // background
  ctx.fillStyle='#07130c';ctx.fillRect(0,0,1080,1350);
  const grad=ctx.createLinearGradient(0,0,1080,1350);
  grad.addColorStop(0,'rgba(28,173,82,.32)');grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1350);

  try{
    const logo=await loadCanvasImage('./logo.png');
    ctx.drawImage(logo,60,55,170,170);
  }catch(_){}

  ctx.fillStyle='#fff';ctx.font='700 40px system-ui, sans-serif';ctx.fillText('U10 HERSEAUX',260,110);
  ctx.fillStyle='#43d56f';ctx.font='700 28px system-ui, sans-serif';
  ctx.fillText(match.match_kind==='friendly'?'MATCH AMICAL':'CHAMPIONNAT',260,158);

  ctx.fillStyle='#fff';ctx.font='800 64px system-ui, sans-serif';
  ctx.fillText('HERSEAUX',60,310);
  ctx.fillStyle='#43d56f';ctx.font='700 34px system-ui, sans-serif';ctx.fillText('VS',60,360);
  ctx.fillStyle='#fff';ctx.font='800 64px system-ui, sans-serif';
  const opp=(match.opponent||'ADVERSAIRE').toUpperCase();
  ctx.fillText(opp.length>22?opp.slice(0,22)+'…':opp,60,430);

  const infoY=500;
  roundRect(ctx,60,infoY,960,160,28);ctx.fillStyle='rgba(255,255,255,.08)';ctx.fill();
  ctx.fillStyle='#fff';ctx.font='600 27px system-ui, sans-serif';
  ctx.fillText(`📅 ${fmtLong(match.event_date)}`,90,550);
  ctx.fillText(`🕒 Match : ${timeShort(match.start_time)||'à préciser'}`,90,600);
  ctx.fillText(`👥 Rendez-vous : ${timeShort(match.meeting_time)||'à préciser'}`,540,600);
  ctx.fillText(`📍 ${match.location||match.address||'Lieu à préciser'}`,90,645);

  ctx.fillStyle='#43d56f';ctx.font='800 36px system-ui, sans-serif';ctx.fillText('JOUEURS CONVOQUÉS',60,735);
  ctx.fillStyle='#fff';ctx.font='650 31px system-ui, sans-serif';
  const cols=2, colW=470, startY=790, rowH=58;
  players.forEach((p,i)=>{
    const col=i%cols,row=Math.floor(i/cols);
    const x=60+col*colW,y=startY+row*rowH;
    ctx.fillStyle='#43d56f';ctx.beginPath();ctx.arc(x+12,y-9,7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillText(p.first_name+(p.last_name?' '+p.last_name:''),x+35,y);
  });
  if(!players.length){
    ctx.fillStyle='#bbb';ctx.fillText('Composition à compléter',60,startY);
  }
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.font='500 22px system-ui, sans-serif';
  ctx.fillText('Royale Union Sportive Herseautoise · U10',60,1290);

  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
  const url=URL.createObjectURL(blob);
  $('#matchImageArea').innerHTML=`
    <div class="generated-image">
      <img src="${url}" alt="Composition du match" />
      <div class="modal-actions">
        <a class="btn secondary" href="${url}" download="U10-Herseaux-${match.event_date}-${(match.opponent||'match').replace(/[^a-z0-9]+/gi,'-')}.png">Télécharger l'image</a>
        <button class="btn primary" id="shareMatchImage">Partager</button>
      </div>
    </div>`;
  $('#shareMatchImage').onclick=async()=>{
    try{
      const file=new File([blob],`U10-Herseaux-${match.event_date}.png`,{type:'image/png'});
      if(navigator.share&&navigator.canShare?.({files:[file]})){
        await navigator.share({title:'U10 Herseaux - Composition',files:[file]});
      }else{
        toast("Le partage direct n'est pas disponible ici. Utilise Télécharger.",false);
      }
    }catch(err){if(err.name!=='AbortError')toast(err.message||String(err),false)}
  };
}

async function renderPlayers(){ if(!isCoach()){go('dashboard');return;} await loadCore(); const {data:links}=await sb.from('player_guardians').select('player_id,user_id,profiles(full_name)'); const counts={};(links||[]).forEach(l=>counts[l.player_id]=(counts[l.player_id]||0)+1); $('#content').innerHTML=`<div class="section-head"><h3>Effectif U10</h3><button class="btn primary small" id="addPlayer">+ Joueur</button></div><div class="table-wrap"><table><thead><tr><th>Joueur</th><th>N°</th><th>Parents liés</th><th>Code parent</th><th>Action</th></tr></thead><tbody>${state.players.map(p=>`<tr><td><strong>${esc(p.first_name)} ${esc(p.last_name||'')}</strong></td><td>${p.number||'—'}</td><td>${counts[p.id]||0}</td><td><button class="btn ghost small" data-pin="${p.id}">Générer / remplacer</button></td><td><button class="btn danger small" data-disable="${p.id}">Désactiver</button></td></tr>`).join('')}</tbody></table></div>`; $('#addPlayer').onclick=()=>playerModal(); $$('[data-pin]').forEach(b=>b.onclick=()=>generatePin(b.dataset.pin)); $$('[data-disable]').forEach(b=>b.onclick=async()=>{if(!confirm('Désactiver ce joueur ?'))return;const{error}=await sb.from('players').update({active:false}).eq('id',b.dataset.disable);if(error)return toast(error.message,false);await loadCore();renderPlayers()}); }
function playerModal(){openModal(`<h2>Ajouter un joueur</h2><form id="playerForm" class="stack"><label>Prénom<input id="plFirst" required /></label><label>Nom (optionnel)<input id="plLast" /></label><label>Numéro (optionnel)<input id="plNumber" type="number" min="0" max="99" /></label><button class="btn primary">Ajouter</button></form>`);$('#playerForm').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;setBusy(btn,true);const{error}=await sb.from('players').insert({team_id:state.team.id,first_name:$('#plFirst').value.trim(),last_name:$('#plLast').value.trim()||null,number:$('#plNumber').value?Number($('#plNumber').value):null});setBusy(btn,false);if(error)return toast(error.message,false);closeModal();toast('Joueur ajouté');await loadCore();renderPlayers()}}
async function generatePin(pid){ const p=state.players.find(x=>x.id===pid); const {data,error}=await sb.rpc('generate_player_pin',{p_player_id:pid}); if(error)return toast(error.message,false); openModal(`<h2>Code parent · ${esc(p?.first_name||'Joueur')}</h2><p>Communique ce code au parent. Il lui permettra de lier son compte à l'enfant.</p><div class="link-code">${esc(data)}</div><p class="muted">Un nouveau code remplace immédiatement l'ancien.</p><button class="btn primary full" id="copyPin">Copier le code</button>`); $('#copyPin').onclick=async()=>{await navigator.clipboard.writeText(String(data));toast('Code copié')}; }

async function renderEvaluations(){ if(!isCoach()){go('dashboard');return;} const date=state.evalDate||todayISO(); const {data:evals}=await sb.from('evaluations').select('*').eq('eval_date',date).in('player_id',state.players.map(p=>p.id)); const map=new Map((evals||[]).map(x=>[x.player_id,x])); const sel=(pid,field,val)=>`<select class="eval-select" data-eval="${pid}" data-field="${field}"><option value=""></option>${['A','B','C'].map(x=>`<option ${val===x?'selected':''}>${x}</option>`).join('')}</select>`; $('#content').innerHTML=`<div class="panel"><div class="form-grid"><label>Date d'évaluation<input id="evalDate" type="date" value="${date}" /></label><div><strong>Barème</strong><div class="muted">A = 3 points · B = 2 · C = 1 · Score /12</div></div></div></div><div class="section-head"><h3>Grille d'évaluation</h3><button class="btn primary" id="saveEvals">Enregistrer toutes les évaluations</button></div><div class="table-wrap"><table><thead><tr><th>Joueur</th><th>Technique<br><small>Contrôle, passe, dribble</small></th><th>Intelligence de jeu<br><small>Tête levée, choix</small></th><th>Athlétique<br><small>Vitesse, coordination</small></th><th>Mental & attitude<br><small>Écoute, engagement</small></th><th>Score /12</th><th>Niveau</th><th>Remarque</th></tr></thead><tbody>${state.players.map(p=>{const v=map.get(p.id)||{};return `<tr data-eval-row="${p.id}"><td><strong>${esc(p.first_name)}</strong></td><td>${sel(p.id,'technique',v.technique)}</td><td>${sel(p.id,'game_intelligence',v.game_intelligence)}</td><td>${sel(p.id,'athletic',v.athletic)}</td><td>${sel(p.id,'attitude',v.attitude)}</td><td class="score" data-score="${p.id}">${v.score_total??'—'}</td><td>${sel(p.id,'overall_level',v.overall_level)}</td><td><input data-remark="${p.id}" value="${esc(v.remarks||'')}" /></td></tr>`}).join('')}</tbody></table></div>`; $('#evalDate').onchange=e=>{state.evalDate=e.target.value;renderEvaluations()}; $$('[data-eval]').forEach(s=>s.onchange=()=>updateEvalScore(s.dataset.eval)); $('#saveEvals').onclick=saveEvaluations; state.players.forEach(p=>updateEvalScore(p.id)); }
function evalPoints(v){return v==='A'?3:v==='B'?2:v==='C'?1:0} function updateEvalScore(pid){ const vals=$$(`[data-eval="${pid}"]`).filter(x=>x.dataset.field!=='overall_level').map(x=>x.value); const score=vals.some(Boolean)?vals.reduce((a,v)=>a+evalPoints(v),0):'—'; $(`[data-score="${pid}"]`).textContent=score; }
async function saveEvaluations(){ const btn=$('#saveEvals');setBusy(btn,true);const date=$('#evalDate').value; const rows=state.players.map(p=>{const get=f=>$(`[data-eval="${p.id}"][data-field="${f}"]`).value||null;const vals=['technique','game_intelligence','athletic','attitude'].map(get);const any=vals.some(Boolean)||get('overall_level')||$(`[data-remark="${p.id}"]`).value.trim(); if(!any)return null; return {player_id:p.id,eval_date:date,technique:vals[0],game_intelligence:vals[1],athletic:vals[2],attitude:vals[3],score_total:vals.reduce((a,v)=>a+evalPoints(v),0),overall_level:get('overall_level'),remarks:$(`[data-remark="${p.id}"]`).value.trim()||null,evaluated_by:state.user.id,updated_at:new Date().toISOString()}; }).filter(Boolean); const {error}=rows.length?await sb.from('evaluations').upsert(rows,{onConflict:'player_id,eval_date'}):{error:null};setBusy(btn,false);if(error)return toast(error.message,false);toast('Évaluations enregistrées'); }

async function renderSettings(){
  $('#content').innerHTML=`
    <div class="grid2">
      <div class="panel stack">
        <h3>Mon accès coach</h3>
        <label>Profil<input value="${esc(state.identity?.display_name||'')}" disabled /></label>
        <p class="muted">Le téléphone conserve automatiquement la session Supabase. Tant que vous ne vous déconnectez pas et que les données du navigateur ne sont pas effacées, l'application s'ouvre directement.</p>
      </div>
      <div class="panel">
        <h3>Équipe</h3>
        <p><strong>${esc(state.team.name)}</strong><br><span class="muted">Saison ${esc(state.team.season)}</span></p>
        <p class="muted">Rôle : Coach</p>
        <p class="muted">L'accès parent sera ajouté dans une prochaine version avec des droits réduits.</p>
      </div>
    </div>`;
}



if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
init();
