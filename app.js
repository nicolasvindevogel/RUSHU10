/* U10 Herseaux - PWA GitHub Pages + Supabase */
const cfg = window.APP_CONFIG || {};
const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('VOTRE-PROJET') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('VOTRE_CLE');
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
}) : null;

const state = { user:null, profile:null, identity:null, membership:null, team:null, players:[], events:[], page:'dashboard', month:new Date(), installPrompt:null, loginMode:null, attendanceTab:'parents', attendanceWeek:null, selectedEvent:null, calendarView:(window.innerWidth<760?'agenda':'month'), trainingDocs:[], parentPlayerId:null, messageChannel:null };
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
  ['traininghub','📋','Entraînements'],
  ['players','👥','Joueurs'],
  ['evaluations','★','Évaluations'],
  ['messages','💬','Messages'],
  ['settings','⚙','Paramètres']
];
const NAV_PARENT = [
  ['dashboard','⌂','Accueil'],
  ['attendance','✓','Présences'],
  ['contact','💬','Contacter les coachs'],
  ['settings','⚙','Mon accès']
];
const isCoach = () => state.membership?.role === 'coach';

function setView(which){ ['authView','appView'].forEach(id=>$('#'+id)?.classList.add('hidden')); $('#'+which)?.classList.remove('hidden'); }
function pageMeta(page){
  const coach={
    dashboard:['Tableau de bord','Vue d’ensemble de l’équipe'],
    calendar:['Calendrier','Entraînements, matchs et événements du club'],
    attendance:['Présences','Prévisions parents et présence réelle'],
    matches:['Matchs','Championnat, amicaux, compositions et visuels'],
    traininghub:['Entraînements','Programme, thèmes et fichiers de séance'],
    players:['Joueurs','Effectif U10'],
    evaluations:['Évaluations','Technique, jeu, athlétique, mental & attitude'],
    messages:['Messages','Conversations privées avec les parents'],
    settings:['Paramètres','Compte et accès à l’équipe']
  };
  const parent={
    dashboard:['Accueil','Calendrier et événements U10'],
    attendance:['Présences','Disponibilités de votre enfant'],
    contact:['Contacter les coachs','Conversation privée avec le staff U10'],
    settings:['Mon accès','Accès parent et notifications']
  };
  return (isCoach()?coach:parent)[page] || (isCoach()?coach.dashboard:parent.dashboard);
}
function renderNav(){
  const nav=isCoach()?NAV_COACH:NAV_PARENT;
  $('#nav').innerHTML=nav.map(([id,ic,lab])=>`<button class="nav-btn ${state.page===id?'active':''}" data-page="${id}"><span class="nav-icon">${ic}</span>${lab}</button>`).join('');
  $$('#nav .nav-btn').forEach(b=>b.onclick=()=>go(b.dataset.page));
}
async function go(page){
  const allowed=(isCoach()?NAV_COACH:NAV_PARENT).map(x=>x[0]);
  if(!allowed.includes(page)) page='dashboard';
  state.page=page;
  renderNav();
  const [t,s]=pageMeta(page);
  $('#pageTitle').textContent=t;
  $('#pageSubtitle').textContent=s;
  $('#sidebar').classList.remove('open');

  if(page==='dashboard') await (isCoach()?renderDashboard():renderParentHome());
  if(page==='calendar' && isCoach()) await renderCalendar();
  if(page==='attendance') await (isCoach()?renderAttendance():renderParentAttendance());
  if(page==='matches' && isCoach()) await renderMatches();
  if(page==='traininghub' && isCoach()) await renderTrainingHub();
  if(page==='players' && isCoach()) await renderPlayers();
  if(page==='evaluations' && isCoach()) await renderEvaluations();
  if(page==='messages' && isCoach()) await renderCoachMessages();
  if(page==='contact' && !isCoach()) await renderParentContact();
  if(page==='settings') await renderSettings();
}

const COACH_KEYS = new Set(['coach-nicolas','coach-thibaut','coach-maxime']);

async function ensureRpcSession(){
  const user=await ensureSession();
  if(!user?.id) throw new Error("Session requise");
  state.user=user;
  return user;
}

async function ensureSession(){
  if(!sb) throw new Error("Supabase n'est pas configuré.");

  let {data:{session},error:getError} = await sb.auth.getSession();
  if(getError) console.warn('getSession',getError);

  if(session?.user){
    state.user=session.user;
    return session.user;
  }

  const {data,error} = await sb.auth.signInAnonymously();
  if(error) throw error;

  // Sur certains smartphones, la session n'est pas immédiatement relue
  // après signInAnonymously(). On attend brièvement puis on la vérifie.
  for(let i=0;i<6;i++){
    const {data:{session:newSession}} = await sb.auth.getSession();
    if(newSession?.user){
      state.user=newSession.user;
      return newSession.user;
    }
    await new Promise(r=>setTimeout(r,150));
  }

  if(data?.user){
    state.user=data.user;
    return data.user;
  }

  throw new Error("Impossible de créer la session sur ce téléphone.");
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
    .select('identity_key,display_name,identity_type,auth_user_id,player_id')
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
    state.parentPlayerId=null;
    setView('authView');
    resetLoginForm();
    return;
  }

  state.identity=identity;

  const {data:memberships,error}=await sb
    .from('team_members')
    .select('team_id,role,teams(*)')
    .eq('user_id',user.id)
    .limit(1);

  if(error) console.error(error);
  if(!memberships?.length){
    setView('authView');
    resetLoginForm();
    toast("L'accès n'est pas encore activé pour ce profil.", false);
    return;
  }

  state.membership=memberships[0];
  state.team=memberships[0].teams;
  state.parentPlayerId=identity.identity_type==='player'?identity.player_id:null;
  state.profile={id:user.id,full_name:identity.display_name,role:memberships[0].role};

  $('#seasonLabel').textContent=state.team.season||'';
  $('#userCard').innerHTML=`<strong>${esc(identity.display_name)}</strong><br><span class="muted">${isCoach()?'Coach':'Parent'}</span>`;
  setView('appView');
  await loadCore();

  // Les parents arrivent toujours sur l'accueil. Les coachs gardent leur page si elle est autorisée.
  state.page=isCoach() ? (NAV_COACH.some(x=>x[0]===state.page)?state.page:'dashboard') : 'dashboard';
  renderNav();
  setupMessageRealtime();
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
  }

  try{
    await ensureRpcSession();
  }catch(err){
    console.error(err);
    return toast("Impossible d'ouvrir une session sur ce téléphone : "+(err.message||err),false);
  }

  const {data,error}=await sb.rpc('identity_login_status',{p_identity_key:key});
  if(error){
    console.error(error);
    // Une session mobile peut parfois être expirée/stale : on retente une fois.
    if(String(error.message||'').toLowerCase().includes('session requise')){
      try{
        await sb.auth.signOut({scope:'local'});
      }catch(_){}
      try{
        await ensureRpcSession();
        const retry=await sb.rpc('identity_login_status',{p_identity_key:key});
        if(!retry.error){
          return applyIdentityStatus(retry.data);
        }
      }catch(_){}
    }
    return toast(error.message,false);
  }

  return applyIdentityStatus(data);

}

function applyIdentityStatus(data){
  if(!data?.exists){
    return toast("Ce profil n’existe pas encore dans Supabase. Exécute UPGRADE_PARENTS_MESSAGES_V10.sql.", false);
  }

  state.loginMode = data.has_pin ? 'login' : 'activate';
  $('#pinArea').classList.remove('hidden');

  if(state.loginMode==='activate'){
    $('#pinHelp').textContent="Première connexion : choisissez votre code personnel à 6 chiffres. Il servira pour vos prochaines connexions.";
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
  if(!key) return toast("Choisissez d'abord un profil.",false);

  const pin=$('#pinInput').value.trim();
  if(!/^\d{6}$/.test(pin)) return toast('Le code doit contenir exactement 6 chiffres.',false);

  if(state.loginMode==='activate'){
    const confirmation=$('#pinConfirm').value.trim();
    if(pin!==confirmation) return toast('Les deux codes ne correspondent pas.',false);
  }

  const btn=e.submitter;
  setBusy(btn,true,state.loginMode==='activate'?'Création…':'Connexion…');

  try{
    await ensureRpcSession();
  }catch(err){
    setBusy(btn,false);
    return toast("Session impossible sur ce téléphone : "+(err.message||err),false);
  }

  const fn=state.loginMode==='activate'?'activate_identity':'login_identity';
  const {data,error}=await sb.rpc(fn,{p_identity_key:key,p_pin:pin});

  setBusy(btn,false);
  if(error) return toast(error.message,false);

  toast(state.loginMode==='activate'?'Accès créé.':'Connexion réussie.');
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

function eventTypePill(type){ const x={training:['green','Entraînement'],match:['blue','Match'],tournament:['orange','Tournoi'],other:['gray','Événement du club']}[type]||['gray',type]; return `<span class="pill ${x[0]}">${x[1]}</span>`; }
function statusPill(s){ const m={present:['green','Présent'],absent:['red','Absent'],maybe:['orange','Incertain'],excused:['orange','Excusé'],late:['orange','Retard']}; const x=m[s]||['gray','Pas de réponse']; return `<span class="pill ${x[0]}">${x[1]}</span>`; }

function parentWeekMonday(){
  const now=new Date();
  const day=now.getDay(); // 0 = dimanche
  const d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const offset=day===0?1:1-day;
  d.setDate(d.getDate()+offset);
  return d;
}

function parentEventCard(e){
  const when=timeShort(e.start_time)||'Heure à préciser';
  const type=eventTypePill(e.type);
  return `<div class="event-card parent-event-card">
    <div class="event-title"><h4>${esc(e.title)}</h4>${type}</div>
    <div class="event-meta">
      <span>📅 ${fmtFullDate(e.event_date)}</span>
      <span>🕒 ${when}</span>
      ${e.meeting_time?`<span>👥 RDV ${timeShort(e.meeting_time)}</span>`:''}
      ${e.opponent?`<span>⚽ ${esc(e.opponent)}</span>`:''}
      ${e.location?`<span>📍 ${esc(e.location)}</span>`:''}
    </div>
    ${e.notes?`<div class="muted">${esc(e.notes)}</div>`:''}
  </div>`;
}

async function renderParentHome(){
  await loadCore();
  const now=new Date();
  const y=now.getFullYear(),m=now.getMonth();
  const monthEvents=state.events.filter(e=>{
    const d=new Date(e.event_date+'T12:00:00');
    return d.getFullYear()===y&&d.getMonth()===m;
  }).sort((a,b)=>a.event_date.localeCompare(b.event_date)||(a.start_time||'').localeCompare(b.start_time||''));

  const upcoming=state.events.filter(e=>e.event_date>=todayISO()).slice(0,4);
  const child=state.players.find(p=>p.id===state.parentPlayerId);

  $('#content').innerHTML=`
    <div class="parent-welcome">
      <div><small>ACCÈS PARENT</small><h2>${esc(child?.first_name||state.identity?.display_name||'U10 Herseaux')}</h2>
      <p>Retrouvez les prochains rendez-vous et indiquez les présences directement dans l'application.</p></div>
      <button class="btn primary" id="homePresence">Remplir les présences</button>
    </div>

    <div class="section-head"><div><h3>Prochains rendez-vous</h3><span class="muted">${new Intl.DateTimeFormat('fr-BE',{month:'long',year:'numeric'}).format(now)}</span></div></div>
    <div class="event-list">${upcoming.length?upcoming.map(parentEventCard).join(''):'<div class="empty panel">Aucun événement à venir.</div>'}</div>

    <div class="section-head"><div><h3>Calendrier du mois</h3><span class="muted">Touchez les présences pour répondre aux événements.</span></div></div>
    ${agendaCalendarHTML(monthEvents)}

    <div class="parent-contact-cta">
      <div><strong>Une information privée concernant ${esc(child?.first_name||'votre enfant')} ?</strong>
      <span>Écrivez directement aux trois coachs.</span></div>
      <button class="btn secondary" id="homeContact">Contacter les coachs</button>
    </div>`;

  $('#homePresence').onclick=()=>go('attendance');
  $('#homeContact').onclick=()=>go('contact');
  $$('[data-cal-event]').forEach(b=>b.onclick=()=>{go('attendance')});
}

async function renderParentAttendance(){
  await loadCore();
  const pid=state.parentPlayerId;
  const child=state.players.find(p=>p.id===pid);
  if(!pid){
    $('#content').innerHTML='<div class="notice warning">Aucun enfant n’est lié à cet accès.</div>';
    return;
  }

  let monday=state.parentWeek ? mondayOf(state.parentWeek) : parentWeekMonday();
  state.parentWeek=isoLocal(monday);
  const sunday=addDays(monday,6);
  const start=isoLocal(monday), end=isoLocal(sunday);

  const events=state.events.filter(e=>e.event_date>=start&&e.event_date<=end)
    .sort((a,b)=>a.event_date.localeCompare(b.event_date)||(a.start_time||'').localeCompare(b.start_time||''));

  let avail=[];
  if(events.length){
    const {data,error}=await sb.from('availability').select('*')
      .eq('player_id',pid)
      .in('event_id',events.map(e=>e.id));
    if(error) toast(error.message,false);
    avail=data||[];
  }
  const amap=new Map(avail.map(x=>[x.event_id,x]));

  $('#content').innerHTML=`
    <div class="panel parent-week-head">
      <button class="btn ghost small" id="parentPrevWeek">←</button>
      <div><small>SEMAINE</small><strong>${fmtFullDate(start)} → ${fmtFullDate(end)}</strong></div>
      <button class="btn ghost small" id="parentNextWeek">→</button>
    </div>

    <div class="notice"><strong>${esc(child?.first_name||'Votre enfant')}</strong> · indiquez Présent ou Absent pour chaque événement de la semaine.</div>

    <div class="parent-presence-list">
      ${events.length?events.map(e=>{
        const a=amap.get(e.id);
        return `<div class="parent-presence-card">
          <div class="parent-presence-info">
            <div class="event-title"><h4>${esc(e.title)}</h4>${eventTypePill(e.type)}</div>
            <div class="event-meta">
              <span>📅 ${fmtFullDate(e.event_date)}</span>
              <span>🕒 ${timeShort(e.start_time)||'Heure à préciser'}</span>
              ${e.opponent?`<span>⚽ ${esc(e.opponent)}</span>`:''}
              ${e.location?`<span>📍 ${esc(e.location)}</span>`:''}
            </div>
          </div>
          <div class="parent-choice" data-parent-event="${e.id}">
            <button class="parent-choice-btn present ${a?.status==='present'?'selected':''}" data-status="present">✓ Présent</button>
            <button class="parent-choice-btn absent ${a?.status==='absent'?'selected':''}" data-status="absent">✕ Absent</button>
          </div>
          <input class="parent-presence-comment" data-parent-comment="${e.id}" value="${esc(a?.comment||'')}" placeholder="Remarque éventuelle / raison d'absence" />
        </div>`;
      }).join(''):'<div class="empty panel">Aucun événement prévu cette semaine.</div>'}
    </div>`;

  $('#parentPrevWeek').onclick=()=>{state.parentWeek=isoLocal(addDays(monday,-7));renderParentAttendance()};
  $('#parentNextWeek').onclick=()=>{state.parentWeek=isoLocal(addDays(monday,7));renderParentAttendance()};

  $$('[data-parent-event] .parent-choice-btn').forEach(b=>b.onclick=async()=>{
    const wrap=b.closest('[data-parent-event]');
    const eventId=wrap.dataset.parentEvent;
    const status=b.dataset.status;
    const comment=$(`[data-parent-comment="${eventId}"]`)?.value.trim()||null;
    $$('button',wrap).forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected');
    const {error}=await sb.from('availability').upsert({
      event_id:eventId,player_id:pid,status,comment,set_by:state.user.id,updated_at:new Date().toISOString()
    },{onConflict:'event_id,player_id'});
    if(error){
      b.classList.remove('selected');
      return toast(error.message,false);
    }
    toast(status==='present'?'Présence enregistrée':'Absence enregistrée');
  });

  $$('.parent-presence-comment').forEach(inp=>inp.onchange=async()=>{
    const eventId=inp.dataset.parentComment;
    const current=amap.get(eventId);
    const selected=$(`[data-parent-event="${eventId}"] .parent-choice-btn.selected`);
    const status=selected?.dataset.status||current?.status;
    if(!status)return;
    const {error}=await sb.from('availability').upsert({
      event_id:eventId,player_id:pid,status,comment:inp.value.trim()||null,set_by:state.user.id,updated_at:new Date().toISOString()
    },{onConflict:'event_id,player_id'});
    if(error)return toast(error.message,false);
    toast('Remarque enregistrée');
  });
}

async function getOrCreateConversation(){
  const pid=state.parentPlayerId;
  if(!pid)return null;
  let {data,error}=await sb.from('conversations').select('*').eq('player_id',pid).maybeSingle();
  if(error)return toast(error.message,false),null;
  if(data)return data;
  const created=await sb.from('conversations').insert({team_id:state.team.id,player_id:pid}).select().single();
  if(created.error)return toast(created.error.message,false),null;
  return created.data;
}

function messageBubble(m){
  const mine=m.sender_user_id===state.user.id;
  const sender=m.sender_role==='coach'?(m.sender_name||'Coach'):'Parent';
  const dt=new Date(m.created_at);
  const time=new Intl.DateTimeFormat('fr-BE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(dt);
  return `<div class="chat-row ${mine?'mine':'theirs'}">
    <div class="chat-bubble">
      ${!mine?`<small>${esc(sender)}</small>`:''}
      <div>${esc(m.body).replace(/\n/g,'<br>')}</div>
      <time>${time}</time>
    </div>
  </div>`;
}

async function loadConversationMessages(conversationId){
  const {data,error}=await sb.from('messages').select('*').eq('conversation_id',conversationId).order('created_at');
  if(error){toast(error.message,false);return []}
  return data||[];
}

async function renderParentContact(){
  const conv=await getOrCreateConversation();
  if(!conv){
    $('#content').innerHTML='<div class="notice warning">Impossible d’ouvrir la conversation.</div>';
    return;
  }
  const messages=await loadConversationMessages(conv.id);
  const child=state.players.find(p=>p.id===state.parentPlayerId);

  $('#content').innerHTML=`
    <div class="chat-shell">
      <div class="chat-header">
        <div class="coach-avatars"><span>N</span><span>T</span><span>M</span></div>
        <div><strong>Coachs U10 Herseaux</strong><small>Conversation privée concernant ${esc(child?.first_name||'votre enfant')}</small></div>
        <button class="btn ghost small" id="enableNotifications">🔔 Notifications</button>
      </div>
      <div class="chat-messages" id="chatMessages">
        ${messages.length?messages.map(messageBubble).join(''):'<div class="chat-empty">Vous pouvez envoyer ici une information privée concernant votre enfant.<br>Les trois coachs ont accès à cette conversation.</div>'}
      </div>
      <form class="chat-compose" id="chatForm">
        <textarea id="chatInput" rows="1" placeholder="Écrire un message…" required></textarea>
        <button class="btn primary" type="submit">Envoyer</button>
      </form>
    </div>`;

  const box=$('#chatMessages'); box.scrollTop=box.scrollHeight;
  $('#enableNotifications').onclick=requestNotifications;
  $('#chatForm').onsubmit=async e=>{
    e.preventDefault();
    const btn=e.submitter, body=$('#chatInput').value.trim();
    if(!body)return;
    setBusy(btn,true,'Envoi…');
    const {error}=await sb.from('messages').insert({
      conversation_id:conv.id,
      sender_user_id:state.user.id,
      sender_role:'parent',
      sender_name:`Parent de ${child?.first_name||state.identity?.display_name||''}`,
      body
    });
    setBusy(btn,false);
    if(error)return toast(error.message,false);
    $('#chatInput').value='';
    await renderParentContact();
  };
}

async function renderCoachMessages(){
  const {data:convs,error}=await sb.from('conversations')
    .select('id,player_id,updated_at,players(first_name,last_name)')
    .eq('team_id',state.team.id)
    .order('updated_at',{ascending:false});
  if(error)return toast(error.message,false);

  const conversations=convs||[];
  let latest={};
  if(conversations.length){
    const {data:msgs}=await sb.from('messages').select('*').in('conversation_id',conversations.map(c=>c.id)).order('created_at',{ascending:false});
    (msgs||[]).forEach(m=>{if(!latest[m.conversation_id])latest[m.conversation_id]=m});
  }

  $('#content').innerHTML=`
    <div class="coach-message-layout">
      <div class="conversation-list">
        <div class="conversation-list-head"><strong>Messages parents</strong><button class="btn ghost small compact-notif" id="coachNotif" title="Notifications">🔔</button></div>
        ${conversations.length?conversations.map(c=>{
          const last=latest[c.id];
          return `<button class="conversation-item" data-conversation="${c.id}">
            <span class="conversation-avatar">${esc((c.players?.first_name||'?').slice(0,1).toUpperCase())}</span>
            <span class="conversation-text"><strong>${esc(c.players?.first_name||'Joueur')}</strong>
              <small>${last?esc(last.body.slice(0,65)):'Aucun message'}</small></span>
          </button>`;
        }).join(''):'<div class="empty panel">Aucune conversation parent pour le moment.</div>'}
      </div>
      <div class="coach-chat-placeholder" id="coachChatPanel"><div>💬</div><strong>Sélectionnez une conversation</strong><span>Les messages envoyés par les parents sont visibles par les trois coachs.</span></div>
    </div>`;

  $('#coachNotif').onclick=requestNotifications;
  $$('[data-conversation]').forEach(b=>b.onclick=()=>openCoachConversation(b.dataset.conversation,conversations.find(c=>c.id===b.dataset.conversation)));
}

async function openCoachConversation(id,conv){
  const messages=await loadConversationMessages(id);
  const layout=$('.coach-message-layout');
  layout?.classList.add('chat-open');
  $('#coachChatPanel').innerHTML=`
    <div class="chat-shell coach-chat">
      <div class="chat-header coach-chat-header">
        <button class="icon-btn coach-chat-back" id="coachChatBack" aria-label="Retour">←</button>
        <div>
          <strong>${esc(conv?.players?.first_name||'Joueur')}</strong>
          <small>Parent ↔ les 3 coachs U10</small>
        </div>
      </div>
      <div class="chat-messages" id="chatMessages">${messages.map(messageBubble).join('')||'<div class="chat-empty">Aucun message.</div>'}</div>
      <form class="chat-compose" id="coachChatForm">
        <textarea id="coachChatInput" rows="1" placeholder="Répondre…" required></textarea>
        <button class="btn primary">Envoyer</button>
      </form>
    </div>`;
  $('#coachChatBack').onclick=()=>renderCoachMessages();
  const box=$('#chatMessages');box.scrollTop=box.scrollHeight;
  $('#coachChatForm').onsubmit=async e=>{
    e.preventDefault();
    const btn=e.submitter,body=$('#coachChatInput').value.trim();if(!body)return;
    setBusy(btn,true,'Envoi…');
    const {error}=await sb.from('messages').insert({
      conversation_id:id,
      sender_user_id:state.user.id,
      sender_role:'coach',
      sender_name:state.identity?.display_name||'Coach',
      body
    });
    setBusy(btn,false);
    if(error)return toast(error.message,false);
    $('#coachChatInput').value='';
    await openCoachConversation(id,conv);
  };
}

function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
}
function isStandalonePWA(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
}

async function requestNotifications(){
  if(isIOS() && !isStandalonePWA()){
    openModal(`
      <h2>🔔 Notifications sur iPhone</h2>
      <p>Sur iPhone, les notifications Web ne sont disponibles que lorsque <strong>U10 Herseaux est installée sur l’écran d’accueil</strong> et ouverte depuis son icône.</p>
      <div class="panel stack">
        <strong>Installation :</strong>
        <span>1. Ouvrez le site dans Safari.</span>
        <span>2. Appuyez sur <strong>Partager</strong>.</span>
        <span>3. Choisissez <strong>Sur l’écran d’accueil</strong>.</span>
        <span>4. Ouvrez ensuite U10 Herseaux depuis l’icône créée.</span>
        <span>5. Revenez sur ce bouton pour autoriser les notifications.</span>
      </div>
      <p class="muted">iOS 16.4 ou une version plus récente est nécessaire.</p>
    `);
    return;
  }

  if(!('Notification' in window)){
    return toast("Les notifications ne sont pas disponibles dans ce mode. Sur iPhone, ouvrez l'application installée depuis l'écran d'accueil.",false);
  }

  if(Notification.permission==='granted'){
    return toast('Notifications déjà activées.');
  }
  if(Notification.permission==='denied'){
    return toast("Les notifications sont bloquées. Vérifiez Réglages > Notifications > U10 Herseaux.",false);
  }

  const perm=await Notification.requestPermission();
  if(perm==='granted') toast('Notifications activées.');
  else toast("Notifications non autorisées.",false);
}

async function showAppNotification(title,body){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{
    const reg=await navigator.serviceWorker?.ready;
    if(reg) await reg.showNotification(title,{body,icon:'./assets/icons/icon-192.png',badge:'./assets/icons/icon-192.png',tag:'u10-message'});
    else new Notification(title,{body,icon:'./assets/icons/icon-192.png'});
  }catch(_){}
}

function setupMessageRealtime(){
  if(!sb||!state.team)return;
  if(state.messageChannel){sb.removeChannel(state.messageChannel);state.messageChannel=null;}
  state.messageChannel=sb.channel(`u10-messages-${state.user.id}-${Date.now()}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},async payload=>{
      const m=payload.new;
      if(m.sender_user_id===state.user.id)return;

      if(isCoach()){
        const {data:conv}=await sb.from('conversations').select('team_id,players(first_name)').eq('id',m.conversation_id).maybeSingle();
        if(conv?.team_id!==state.team.id)return;
        await showAppNotification(`Message parent · ${conv?.players?.first_name||'U10'}`,m.body);
        if(state.page==='messages')renderCoachMessages();
      }else{
        const conv=await getOrCreateConversation();
        if(conv?.id!==m.conversation_id)return;
        await showAppNotification('Coachs U10 Herseaux',m.body);
        if(state.page==='contact')renderParentContact();
      }
    }).subscribe();
}

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
  }).sort((a,b)=>a.event_date.localeCompare(b.event_date)||(a.start_time||'').localeCompare(b.start_time||''));

  const view=state.calendarView||'agenda';
  $('#content').innerHTML=`
    <div class="calendar-toolbar calendar-toolbar-v9">
      <div class="toolbar-group">
        <button class="btn ghost small" id="prevMonth">←</button>
        <button class="btn ghost small" id="todayMonth">Aujourd'hui</button>
        <button class="btn ghost small" id="nextMonth">→</button>
      </div>
      <strong class="calendar-month-title">${new Intl.DateTimeFormat('fr-BE',{month:'long',year:'numeric'}).format(d)}</strong>
      <div class="toolbar-group">
        <button class="btn ${view==='agenda'?'primary':'ghost'} small" id="agendaView">Agenda</button>
        <button class="btn ${view==='month'?'primary':'ghost'} small" id="monthView">Mois</button>
        <button class="btn primary small" id="addEvent">+ Événement</button>
      </div>
    </div>

    <div class="calendar-legend">
      <span><i class="dot training"></i>Entraînement</span>
      <span><i class="dot match"></i>Match</span>
      <span><i class="dot tournament"></i>Tournoi</span>
      <span><i class="dot other"></i>Club</span>
    </div>

    ${view==='month'
      ? calendarHTML(y,m)
      : agendaCalendarHTML(monthEvents)
    }`;

  $('#prevMonth').onclick=()=>{state.month=new Date(y,m-1,1);renderCalendar()};
  $('#nextMonth').onclick=()=>{state.month=new Date(y,m+1,1);renderCalendar()};
  $('#todayMonth').onclick=()=>{state.month=new Date();renderCalendar()};
  $('#agendaView').onclick=()=>{state.calendarView='agenda';renderCalendar()};
  $('#monthView').onclick=()=>{state.calendarView='month';renderCalendar()};
  $('#addEvent').onclick=()=>eventModal();
  $$('[data-cal-event]').forEach(b=>b.onclick=()=>eventModal(state.events.find(e=>e.id===b.dataset.calEvent)));
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
    const isToday=iso===todayISO();
    cells+=`<div class="cal-day ${dd.getMonth()!==m?'other-month':''} ${isToday?'today':''}">
      <span class="day-num">${dd.getDate()}</span>
      <div class="cal-events">
        ${evs.map(e=>`<button type="button" class="cal-event ${e.type}" data-cal-event="${e.id}">
          <span>${timeShort(e.start_time)||''}</span>${esc(e.title)}
        </button>`).join('')}
      </div>
    </div>`;
  }
  return `<div class="calendar">${names.map(n=>`<div class="cal-head">${n}</div>`).join('')}${cells}</div>`;
}

function agendaCalendarHTML(events){
  if(!events.length)return `<div class="empty panel">Aucun événement ce mois-ci.</div>`;
  const grouped=new Map();
  events.forEach(e=>{
    if(!grouped.has(e.event_date))grouped.set(e.event_date,[]);
    grouped.get(e.event_date).push(e);
  });
  return `<div class="agenda-calendar">
    ${[...grouped.entries()].map(([date,items])=>{
      const d=new Date(date+'T12:00:00');
      const day=new Intl.DateTimeFormat('fr-BE',{weekday:'short'}).format(d).replace('.','');
      const month=new Intl.DateTimeFormat('fr-BE',{month:'short'}).format(d).replace('.','');
      return `<section class="agenda-day ${date===todayISO()?'today':''}">
        <div class="agenda-date">
          <small>${day}</small><strong>${String(d.getDate()).padStart(2,'0')}</strong><span>${month}</span>
        </div>
        <div class="agenda-items">
          ${items.map(e=>`<button class="agenda-event ${e.type}" data-cal-event="${e.id}">
            <div class="agenda-event-top">
              <strong>${esc(e.title)}</strong>
              <span>${timeShort(e.start_time)||'Heure à préciser'}</span>
            </div>
            <div class="agenda-event-meta">
              ${e.opponent?`<span>⚽ ${esc(e.opponent)}</span>`:''}
              ${e.location?`<span>📍 ${esc(e.location)}</span>`:''}
              ${e.meeting_time?`<span>👥 RDV ${timeShort(e.meeting_time)}</span>`:''}
            </div>
          </button>`).join('')}
        </div>
      </section>`;
    }).join('')}
  </div>`;
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
  const eligible=state.events.filter(e=>e.type==='training'||e.type==='match');
  const today=todayISO();
  let selected=state.selectedEvent && eligible.some(e=>e.id===state.selectedEvent) ? state.selectedEvent : null;

  if(!selected && eligible.length){
    const todayEvent=eligible.find(e=>e.event_date===today);
    if(todayEvent){
      selected=todayEvent.id;
    }else{
      const todayMs=new Date(today+'T12:00:00').getTime();
      const nearest=eligible.slice().sort((a,b)=>{
        const da=Math.abs(new Date(a.event_date+'T12:00:00').getTime()-todayMs);
        const db=Math.abs(new Date(b.event_date+'T12:00:00').getTime()-todayMs);
        if(da!==db)return da-db;
        return a.event_date.localeCompare(b.event_date);
      })[0];
      selected=nearest?.id||null;
    }
  }

  state.selectedEvent=selected;
  if(!selected){
    $('#attendanceBody').innerHTML='<div class="empty panel">Aucun événement disponible.</div>';
    return;
  }
  const e=state.events.find(x=>x.id===selected);
  const {data:actual,error}=await sb.from('attendance').select('*').eq('event_id',selected);
  if(error) toast(error.message,false);
  const presentIds=new Set((actual||[]).filter(x=>x.status==='present').map(x=>x.player_id));
  const opts=eligible.slice().sort((a,b)=>b.event_date.localeCompare(a.event_date)).map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${fmtFullDate(x.event_date)} · ${esc(x.title)}</option>`).join('');
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

async function renderTrainingHub(){
  const month=new Date().getMonth()+1;
  const [{data:program,error:programError},{data:docs,error:docsError}]=await Promise.all([
    sb.from('training_program').select('*').eq('team_id',state.team.id).order('month_num'),
    sb.from('training_documents').select('*').eq('team_id',state.team.id).order('session_date',{ascending:false}).order('created_at',{ascending:false})
  ]);
  if(programError)console.warn(programError);
  if(docsError)console.warn(docsError);
  state.trainingDocs=docs||[];

  const programme=program||[];
  const current=programme.find(x=>x.month_num===month);
  const upcomingTraining=state.events
    .filter(e=>e.type==='training'&&e.event_date>=todayISO())
    .sort((a,b)=>a.event_date.localeCompare(b.event_date))[0];

  $('#content').innerHTML=`
    ${current?`<div class="training-theme-card">
      <div class="training-theme-month">${esc(current.month_label)}</div>
      <div>
        <small>THÈME DU MOIS</small>
        <h2>${esc(current.theme)}</h2>
        <p>${esc(current.objectives)}</p>
      </div>
    </div>`:''}

    <div class="grid2 training-top-grid">
      <div class="panel">
        <h3>Prochain entraînement</h3>
        ${upcomingTraining?`
          <p class="training-next-date">${fmtFullDate(upcomingTraining.event_date)}</p>
          <div class="muted">${timeShort(upcomingTraining.start_time)||'Heure à préciser'} ${upcomingTraining.location?'· '+esc(upcomingTraining.location):''}</div>
        `:'<p class="muted">Aucun entraînement planifié.</p>'}
      </div>
      <div class="panel">
        <h3>Ajouter une séance</h3>
        <p class="muted">PDF, image, document Word, Excel ou autre fichier utile à la séance.</p>
        <button class="btn primary" id="uploadTrainingBtn">+ Ajouter des fichiers</button>
      </div>
    </div>

    <div class="section-head">
      <div><h3>Programme annuel</h3><span class="muted">Thèmes pédagogiques U10</span></div>
    </div>
    <div class="programme-strip">
      ${programme.map(p=>`<div class="programme-card ${p.month_num===month?'current':''}">
        <small>${esc(p.month_label)}</small>
        <strong>${esc(p.theme)}</strong>
        <span>${esc(p.objectives)}</span>
      </div>`).join('')}
    </div>

    <div class="section-head">
      <div><h3>Fichiers de séances</h3><span class="muted">${state.trainingDocs.length} fichier(s)</span></div>
    </div>
    <div class="training-doc-list">
      ${state.trainingDocs.length?state.trainingDocs.map(trainingDocCard).join(''):'<div class="empty panel">Aucun fichier de séance pour le moment.</div>'}
    </div>`;

  $('#uploadTrainingBtn').onclick=trainingUploadModal;
  $$('[data-training-open]').forEach(b=>b.onclick=()=>openTrainingDocument(b.dataset.trainingOpen));
  $$('[data-training-delete]').forEach(b=>b.onclick=()=>deleteTrainingDocument(b.dataset.trainingDelete));
}

function trainingDocCard(doc){
  const ext=(doc.original_name||'').split('.').pop()?.toUpperCase()||'FICHIER';
  return `<div class="training-doc-card">
    <div class="file-badge">${esc(ext.slice(0,4))}</div>
    <div class="training-doc-main">
      <div class="event-title">
        <h4>${esc(doc.title||doc.original_name)}</h4>
        <span class="pill">${fmtFullDate(doc.session_date)}</span>
      </div>
      <div class="muted">${esc(doc.original_name)}${doc.notes?' · '+esc(doc.notes):''}</div>
    </div>
    <div class="training-doc-actions">
      <button class="btn secondary small" data-training-open="${doc.id}">Ouvrir</button>
      <button class="btn danger small" data-training-delete="${doc.id}">Supprimer</button>
    </div>
  </div>`;
}

function trainingUploadModal(){
  const nearest=state.events
    .filter(e=>e.type==='training'&&e.event_date>=todayISO())
    .sort((a,b)=>a.event_date.localeCompare(b.event_date))[0];

  openModal(`<h2>Ajouter une séance d'entraînement</h2>
    <form id="trainingUploadForm" class="stack">
      <label>Date de la séance
        <input id="trainingDate" type="date" required value="${nearest?.event_date||todayISO()}" />
      </label>
      <label>Titre
        <input id="trainingTitle" required placeholder="Ex. Séance dribble 1v1" />
      </label>
      <label>Remarque / objectif
        <textarea id="trainingNotes" placeholder="Optionnel"></textarea>
      </label>
      <label>Fichiers
        <input id="trainingFiles" type="file" multiple required />
      </label>
      <div class="notice">Tu peux sélectionner plusieurs fichiers en une fois. Ils resteront accessibles aux coachs depuis ce menu.</div>
      <button class="btn primary" type="submit">Uploader la séance</button>
    </form>`);

  $('#trainingUploadForm').onsubmit=async e=>{
    e.preventDefault();
    const btn=e.submitter;
    const files=[...$('#trainingFiles').files];
    if(!files.length)return toast('Choisis au moins un fichier.',false);
    setBusy(btn,true,'Upload…');

    const date=$('#trainingDate').value;
    const title=$('#trainingTitle').value.trim();
    const notes=$('#trainingNotes').value.trim()||null;

    for(const file of files){
      const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');
      const path=`${state.team.id}/${date}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
      const {error:uploadError}=await sb.storage.from('training-files').upload(path,file,{upsert:false,contentType:file.type||undefined});
      if(uploadError){
        setBusy(btn,false);
        return toast(`Upload impossible : ${uploadError.message}`,false);
      }
      const {error:insertError}=await sb.from('training_documents').insert({
        team_id:state.team.id,
        session_date:date,
        title,
        notes,
        storage_path:path,
        original_name:file.name,
        file_type:file.type||null,
        size_bytes:file.size,
        uploaded_by:state.user.id
      });
      if(insertError){
        await sb.storage.from('training-files').remove([path]);
        setBusy(btn,false);
        return toast(insertError.message,false);
      }
    }
    setBusy(btn,false);
    closeModal();
    toast(`${files.length} fichier(s) ajouté(s)`);
    await renderTrainingHub();
  };
}

async function openTrainingDocument(id){
  const doc=state.trainingDocs.find(x=>x.id===id);
  if(!doc)return;
  const {data,error}=await sb.storage.from('training-files').createSignedUrl(doc.storage_path,60*10);
  if(error)return toast(error.message,false);
  window.open(data.signedUrl,'_blank','noopener');
}

async function deleteTrainingDocument(id){
  const doc=state.trainingDocs.find(x=>x.id===id);
  if(!doc||!confirm(`Supprimer "${doc.original_name}" ?`))return;
  const {error:storageError}=await sb.storage.from('training-files').remove([doc.storage_path]);
  if(storageError)return toast(storageError.message,false);
  const {error}=await sb.from('training_documents').delete().eq('id',id);
  if(error)return toast(error.message,false);
  toast('Fichier supprimé');
  await renderTrainingHub();
}

async function renderPlayers(){ if(!isCoach()){go('dashboard');return;} await loadCore(); const {data:links}=await sb.from('player_guardians').select('player_id,user_id,profiles(full_name)'); const counts={};(links||[]).forEach(l=>counts[l.player_id]=(counts[l.player_id]||0)+1); $('#content').innerHTML=`<div class="section-head"><h3>Effectif U10</h3><button class="btn primary small" id="addPlayer">+ Joueur</button></div><div class="table-wrap"><table><thead><tr><th>Joueur</th><th>N°</th><th>Parents liés</th><th>Code parent</th><th>Action</th></tr></thead><tbody>${state.players.map(p=>`<tr><td><strong>${esc(p.first_name)} ${esc(p.last_name||'')}</strong></td><td>${p.number||'—'}</td><td>${counts[p.id]||0}</td><td><button class="btn ghost small" data-pin="${p.id}">Générer / remplacer</button></td><td><button class="btn danger small" data-disable="${p.id}">Désactiver</button></td></tr>`).join('')}</tbody></table></div>`; $('#addPlayer').onclick=()=>playerModal(); $$('[data-pin]').forEach(b=>b.onclick=()=>generatePin(b.dataset.pin)); $$('[data-disable]').forEach(b=>b.onclick=async()=>{if(!confirm('Désactiver ce joueur ?'))return;const{error}=await sb.from('players').update({active:false}).eq('id',b.dataset.disable);if(error)return toast(error.message,false);await loadCore();renderPlayers()}); }
function playerModal(){openModal(`<h2>Ajouter un joueur</h2><form id="playerForm" class="stack"><label>Prénom<input id="plFirst" required /></label><label>Nom (optionnel)<input id="plLast" /></label><label>Numéro (optionnel)<input id="plNumber" type="number" min="0" max="99" /></label><button class="btn primary">Ajouter</button></form>`);$('#playerForm').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;setBusy(btn,true);const{error}=await sb.from('players').insert({team_id:state.team.id,first_name:$('#plFirst').value.trim(),last_name:$('#plLast').value.trim()||null,number:$('#plNumber').value?Number($('#plNumber').value):null});setBusy(btn,false);if(error)return toast(error.message,false);closeModal();toast('Joueur ajouté');await loadCore();renderPlayers()}}
async function generatePin(pid){ const p=state.players.find(x=>x.id===pid); const {data,error}=await sb.rpc('generate_player_pin',{p_player_id:pid}); if(error)return toast(error.message,false); openModal(`<h2>Code parent · ${esc(p?.first_name||'Joueur')}</h2><p>Communique ce code au parent. Il lui permettra de lier son compte à l'enfant.</p><div class="link-code">${esc(data)}</div><p class="muted">Un nouveau code remplace immédiatement l'ancien.</p><button class="btn primary full" id="copyPin">Copier le code</button>`); $('#copyPin').onclick=async()=>{await navigator.clipboard.writeText(String(data));toast('Code copié')}; }

function evalPoints(v){return v==='A'?3:v==='B'?2:v==='C'?1:0}
function pointsToGrade(v){
  if(v==null || Number.isNaN(Number(v))) return '—';
  const n=Number(v);
  return n>=2.5?'A':n>=1.5?'B':'C';
}
function scoreToLevel(score){
  if(score==null || Number.isNaN(Number(score))) return {code:'—',label:'Non évalué',cls:'pending'};
  const s=Number(score);
  if(s>=10) return {code:'A',label:'Confirmé',cls:'present'};
  if(s>=7) return {code:'B',label:'Intermédiaire',cls:'maybe'};
  return {code:'C',label:'Apprentissage',cls:'absent'};
}
function evalTypeLabel(v){
  return ({
    small_game:'Jeu réduit 3v3 / 4v4',
    technical:'Atelier technique',
    match:'Match',
    training:'Entraînement général',
    other:'Autre'
  })[v]||'Entraînement général';
}
function monthKey(d){return d.slice(0,7)}
function monthLabel(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-BE',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
}

async function renderEvaluations(){
  if(!isCoach()){go('dashboard');return;}
  state.evalTab=state.evalTab||'summary';
  state.evalMonth=state.evalMonth||todayISO().slice(0,7);

  $('#content').innerHTML=`
    <div class="attendance-tabs">
      <button class="tab-btn ${state.evalTab==='summary'?'active':''}" data-eval-tab="summary">Synthèse</button>
      <button class="tab-btn ${state.evalTab==='session'?'active':''}" data-eval-tab="session">Nouvelle séance</button>
      <button class="tab-btn ${state.evalTab==='history'?'active':''}" data-eval-tab="history">Historique</button>
      <button class="btn ghost small" id="evalGuide" style="margin-left:auto">Guide des critères</button>
    </div>
    <div id="evalBody"></div>`;

  $$('[data-eval-tab]').forEach(b=>b.onclick=()=>{state.evalTab=b.dataset.evalTab;renderEvaluations()});
  $('#evalGuide').onclick=openEvaluationGuide;

  if(state.evalTab==='summary') await renderEvaluationSummary();
  if(state.evalTab==='session') await renderEvaluationSession();
  if(state.evalTab==='history') await renderEvaluationHistory();
}

async function renderEvaluationSummary(){
  const start=state.evalMonth+'-01';
  const [y,m]=state.evalMonth.split('-').map(Number);
  const endDate=new Date(y,m,0);
  const end=`${y}-${String(m).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`;

  const {data:evals,error}=await sb.from('evaluations')
    .select('*')
    .gte('eval_date',start)
    .lte('eval_date',end)
    .in('player_id',state.players.map(p=>p.id));
  if(error) toast(error.message,false);

  const all=evals||[];
  const sessions=[...new Set(all.map(x=>x.eval_date))].sort();
  const byPlayer=new Map();
  state.players.forEach(p=>byPlayer.set(p.id,[]));
  all.forEach(x=>byPlayer.get(x.player_id)?.push(x));

  const prevMonth=()=>{
    const d=new Date(y,m-2,1);state.evalMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;renderEvaluationSummary();
  };
  const nextMonth=()=>{
    const d=new Date(y,m,1);state.evalMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;renderEvaluationSummary();
  };

  $('#evalBody').innerHTML=`
    <div class="panel week-toolbar">
      <button class="btn ghost small" id="prevEvalMonth">← Mois</button>
      <strong>${monthLabel(state.evalMonth)}</strong>
      <button class="btn ghost small" id="nextEvalMonth">Mois →</button>
    </div>
    <div class="cards">
      <div class="stat"><div class="label">Séances d'évaluation</div><div class="value">${sessions.length}</div></div>
      <div class="stat"><div class="label">Repère conseillé</div><div class="value" style="font-size:1rem">${sessions.length>=2?'Base suffisante':'Encore provisoire'}</div></div>
      <div class="stat"><div class="label">Méthode</div><div class="value" style="font-size:1rem">2 à 3 séances</div></div>
    </div>
    ${sessions.length<2?`<div class="notice warning"><strong>Classement provisoire.</strong> Il est conseillé d'observer chaque joueur sur au moins 2 à 3 séances avant de retenir un groupe.</div>`:''}
    <div class="section-head"><div><h3>Synthèse des joueurs</h3><span class="muted">Moyenne des évaluations du mois · groupe calculé automatiquement</span></div></div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Joueur</th><th>Séances</th>
        <th>Maîtrise technique</th><th>Prise d'information</th>
        <th>Aisance athlétique</th><th>Mental & attitude</th>
        <th>Score moyen /12</th><th>Groupe recommandé</th><th>Évolution</th>
      </tr></thead>
      <tbody>${state.players.map(p=>{
        const rows=byPlayer.get(p.id)||[];
        const avgField=f=>{
          const vals=rows.map(r=>evalPoints(r[f])).filter(Boolean);
          return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
        };
        const avgs=['technique','game_intelligence','athletic','attitude'].map(avgField);
        const score=avgs.every(v=>v===null)?null:avgs.reduce((a,v)=>a+(v||0),0);
        const level=scoreToLevel(score);
        const remarks=rows.filter(r=>r.remarks).sort((a,b)=>b.eval_date.localeCompare(a.eval_date));
        return `<tr data-player-eval="${p.id}">
          <td><button class="link-button" data-eval-player="${p.id}"><strong>${esc(p.first_name)}</strong></button></td>
          <td>${rows.length}</td>
          <td><span class="grade grade-${pointsToGrade(avgs[0])}">${pointsToGrade(avgs[0])}</span></td>
          <td><span class="grade grade-${pointsToGrade(avgs[1])}">${pointsToGrade(avgs[1])}</span></td>
          <td><span class="grade grade-${pointsToGrade(avgs[2])}">${pointsToGrade(avgs[2])}</span></td>
          <td><span class="grade grade-${pointsToGrade(avgs[3])}">${pointsToGrade(avgs[3])}</span></td>
          <td><strong>${score==null?'—':score.toFixed(1)}</strong></td>
          <td><span class="availability-box ${level.cls}">${level.code} · ${level.label}</span></td>
          <td>${remarks[0]?`<span class="muted">${esc(remarks[0].remarks)}</span>`:'<span class="muted">—</span>'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

  $('#prevEvalMonth').onclick=prevMonth;
  $('#nextEvalMonth').onclick=nextMonth;
  $$('[data-eval-player]').forEach(b=>b.onclick=()=>openPlayerEvaluationHistory(b.dataset.evalPlayer));
}

async function renderEvaluationSession(){
  const date=state.evalDate||todayISO();
  const {data:existing,error}=await sb.from('evaluations').select('*').eq('eval_date',date).in('player_id',state.players.map(p=>p.id));
  if(error) toast(error.message,false);
  const rows=existing||[];
  const map=new Map(rows.map(x=>[x.player_id,x]));
  const existingType=rows.find(x=>x.eval_type)?.eval_type||state.evalType||'training';
  state.evalType=existingType;

  const sel=(pid,field,val)=>`<select class="eval-select" data-eval="${pid}" data-field="${field}">
    <option value="">—</option>
    ${['A','B','C'].map(x=>`<option value="${x}" ${val===x?'selected':''}>${x}</option>`).join('')}
  </select>`;

  $('#evalBody').innerHTML=`
    <div class="panel">
      <div class="form-grid">
        <label>Date de la séance<input id="evalDate" type="date" value="${date}" /></label>
        <label>Type d'observation
          <select id="evalType">
            <option value="small_game">Jeu réduit 3v3 / 4v4</option>
            <option value="technical">Atelier technique</option>
            <option value="match">Match</option>
            <option value="training">Entraînement général</option>
            <option value="other">Autre</option>
          </select>
        </label>
        <div><strong>Barème</strong><div class="muted">A = 3 · B = 2 · C = 1 · Score /12</div></div>
      </div>
    </div>
    <div class="notice">
      <strong>Classement automatique :</strong> 10–12 = A Confirmé · 7–9 = B Intermédiaire · 4–6 = C Apprentissage.
    </div>
    <div class="section-head">
      <div><h3>Observation de la séance</h3><span class="muted">Le niveau final n'est pas choisi manuellement : il est calculé à partir des 4 critères.</span></div>
      <button class="btn primary" id="saveEvals">Enregistrer la séance</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Joueur</th>
        <th>Maîtrise technique<br><small>1re touche, conduite, passes, dribbles</small></th>
        <th>Prise d'information<br><small>Tête levée, choix, placement</small></th>
        <th>Aisance athlétique<br><small>Vitesse, coordination, agilité, duels</small></th>
        <th>Mental & attitude<br><small>Écoute, concentration, équipe, effort</small></th>
        <th>Score /12</th><th>Groupe séance</th><th>Remarque séance</th>
      </tr></thead>
      <tbody>${state.players.map(p=>{
        const v=map.get(p.id)||{};
        return `<tr data-eval-row="${p.id}">
          <td><strong>${esc(p.first_name)}</strong></td>
          <td>${sel(p.id,'technique',v.technique)}</td>
          <td>${sel(p.id,'game_intelligence',v.game_intelligence)}</td>
          <td>${sel(p.id,'athletic',v.athletic)}</td>
          <td>${sel(p.id,'attitude',v.attitude)}</td>
          <td class="score" data-score="${p.id}">—</td>
          <td data-level="${p.id}"><span class="muted">—</span></td>
          <td><input data-remark="${p.id}" value="${esc(v.remarks||'')}" placeholder="Observation / axe de travail" /></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

  $('#evalType').value=existingType;
  $('#evalType').onchange=e=>state.evalType=e.target.value;
  $('#evalDate').onchange=e=>{state.evalDate=e.target.value;renderEvaluationSession()};
  $$('[data-eval]').forEach(s=>s.onchange=()=>updateEvalScore(s.dataset.eval));
  state.players.forEach(p=>updateEvalScore(p.id));
  $('#saveEvals').onclick=saveEvaluations;
}

function updateEvalScore(pid){
  const vals=['technique','game_intelligence','athletic','attitude']
    .map(f=>$(`[data-eval="${pid}"][data-field="${f}"]`)?.value||'');
  const complete=vals.every(Boolean);
  const any=vals.some(Boolean);
  const score=any?vals.reduce((a,v)=>a+evalPoints(v),0):null;
  $(`[data-score="${pid}"]`).textContent=score==null?'—':score;
  const target=$(`[data-level="${pid}"]`);
  if(!target)return;
  if(!complete){
    target.innerHTML=any?'<span class="muted">À compléter</span>':'<span class="muted">—</span>';
    return;
  }
  const level=scoreToLevel(score);
  target.innerHTML=`<span class="availability-box ${level.cls}">${level.code} · ${level.label}</span>`;
}

async function saveEvaluations(){
  const btn=$('#saveEvals');
  setBusy(btn,true);
  const date=$('#evalDate').value;
  const evalType=$('#evalType').value;
  const rows=[];

  for(const p of state.players){
    const get=f=>$(`[data-eval="${p.id}"][data-field="${f}"]`)?.value||null;
    const vals=['technique','game_intelligence','athletic','attitude'].map(get);
    const remark=$(`[data-remark="${p.id}"]`).value.trim();
    const any=vals.some(Boolean)||remark;
    if(!any)continue;
    if(!vals.every(Boolean)){
      setBusy(btn,false);
      return toast(`Complète les 4 critères pour ${p.first_name}, ou laisse toute sa ligne vide.`,false);
    }
    const score=vals.reduce((a,v)=>a+evalPoints(v),0);
    const level=scoreToLevel(score);
    rows.push({
      player_id:p.id,
      eval_date:date,
      eval_type:evalType,
      technique:vals[0],
      game_intelligence:vals[1],
      athletic:vals[2],
      attitude:vals[3],
      score_total:score,
      overall_level:level.code,
      remarks:remark||null,
      evaluated_by:state.user.id,
      updated_at:new Date().toISOString()
    });
  }

  const {error}=rows.length
    ? await sb.from('evaluations').upsert(rows,{onConflict:'player_id,eval_date'})
    : {error:null};

  setBusy(btn,false);
  if(error)return toast(error.message,false);
  toast(`Séance enregistrée : ${rows.length} joueur(s) évalué(s)`);
  state.evalMonth=date.slice(0,7);
  state.evalTab='summary';
  await renderEvaluations();
}

async function renderEvaluationHistory(){
  const {data:evals,error}=await sb.from('evaluations')
    .select('*')
    .in('player_id',state.players.map(p=>p.id))
    .order('eval_date',{ascending:false});
  if(error) toast(error.message,false);
  const rows=evals||[];
  const grouped=new Map();
  rows.forEach(r=>{
    if(!grouped.has(r.eval_date))grouped.set(r.eval_date,[]);
    grouped.get(r.eval_date).push(r);
  });
  const sessions=[...grouped.entries()];
  $('#evalBody').innerHTML=`
    <div class="section-head"><div><h3>Historique des séances</h3><span class="muted">Toutes les observations enregistrées</span></div></div>
    <div class="event-list">
      ${sessions.length?sessions.map(([date,items])=>{
        const type=items.find(x=>x.eval_type)?.eval_type||'training';
        const scores=items.map(x=>x.score_total).filter(x=>x!=null);
        const avg=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
        return `<div class="event-card">
          <div class="event-title"><h4>${fmtFullDate(date)}</h4><span class="match-kind">${esc(evalTypeLabel(type))}</span></div>
          <div class="event-meta"><span>${items.length} joueur(s) évalué(s)</span>${avg!=null?`<span>Score moyen équipe : ${avg.toFixed(1)}/12</span>`:''}</div>
          <div class="event-actions"><button class="btn secondary small" data-edit-eval-date="${date}">Ouvrir / modifier</button></div>
        </div>`;
      }).join(''):'<div class="empty panel">Aucune évaluation enregistrée.</div>'}
    </div>`;
  $$('[data-edit-eval-date]').forEach(b=>b.onclick=()=>{state.evalDate=b.dataset.editEvalDate;state.evalTab='session';renderEvaluations()});
}

async function openPlayerEvaluationHistory(pid){
  const p=state.players.find(x=>x.id===pid);
  const {data,error}=await sb.from('evaluations').select('*').eq('player_id',pid).order('eval_date',{ascending:false});
  if(error)return toast(error.message,false);
  const rows=data||[];
  openModal(`
    <h2>${esc(p?.first_name||'Joueur')} · progression</h2>
    <div class="event-list">
      ${rows.length?rows.map(r=>{
        const level=scoreToLevel(r.score_total);
        return `<div class="event-card">
          <div class="event-title"><h4>${fmtFullDate(r.eval_date)}</h4><span class="availability-box ${level.cls}">${level.code} · ${level.label}</span></div>
          <div class="event-meta">
            <span>${esc(evalTypeLabel(r.eval_type))}</span>
            <span>Technique ${r.technique}</span><span>Prise d'info ${r.game_intelligence}</span>
            <span>Athlétique ${r.athletic}</span><span>Mental ${r.attitude}</span>
            <span><strong>${r.score_total}/12</strong></span>
          </div>
          ${r.remarks?`<div class="muted">${esc(r.remarks)}</div>`:''}
        </div>`;
      }).join(''):'<div class="empty">Aucune évaluation.</div>'}
    </div>`);
}

function openEvaluationGuide(){
  openModal(`
    <h2>Guide des critères U10</h2>
    <div class="guide-grid">
      <div class="panel"><h3>⚽ Maîtrise technique</h3><p>Première touche et contrôle orienté, conduite des deux pieds, précision des passes courtes et aisance dans les duels/dribbles.</p></div>
      <div class="panel"><h3>👀 Intelligence de jeu / prise d'information</h3><p>Tête levée avant réception, choix passe ou dribble au bon moment, rapidité de décision et compréhension du placement.</p></div>
      <div class="panel"><h3>🏃 Aisance athlétique</h3><p>Vitesse, coordination globale, agilité, équilibre et engagement physique dans les duels.</p></div>
      <div class="panel"><h3>🧠 Mental & attitude</h3><p>Écoute, concentration, esprit d'équipe, combativité et régularité dans l'effort.</p></div>
    </div>
    <div class="panel">
      <h3>Repères de groupe</h3>
      <p><strong>A · Confirmé — 10 à 12 :</strong> techniquement à l'aise, tête levée, bons choix rapides, autonomie et combativité.</p>
      <p><strong>B · Intermédiaire — 7 à 9 :</strong> bonnes bases mais jeu encore irrégulier, manque parfois de rapidité ou de régularité en match.</p>
      <p><strong>C · Apprentissage — 4 à 6 :</strong> fondamentaux encore à développer : coordination, conduite sous pression et compréhension de l'espace.</p>
      <p class="muted">Conseil : observer sur 2 à 3 séances, notamment en jeu réduit 3v3/4v4 et lors d'un atelier technique. Les groupes restent évolutifs.</p>
    </div>`);
}

async function renderSettings(){
  if(isCoach()){
    $('#content').innerHTML=`
      <div class="grid2">
        <div class="panel stack">
          <h3>Mon accès coach</h3>
          <label>Profil<input value="${esc(state.identity?.display_name||'')}" disabled /></label>
          <p class="muted">Le téléphone conserve automatiquement la session. Tant que vous ne vous déconnectez pas et que les données du navigateur ne sont pas effacées, l'application s'ouvre directement.</p>
          <button class="btn secondary" id="settingsNotif">🔔 Activer les notifications de messages</button>
        </div>
        <div class="panel">
          <h3>Équipe</h3>
          <p><strong>${esc(state.team.name)}</strong><br><span class="muted">Saison ${esc(state.team.season)}</span></p>
          <p class="muted">Rôle : Coach</p>
        </div>
      </div>`;
  }else{
    const child=state.players.find(p=>p.id===state.parentPlayerId);
    $('#content').innerHTML=`
      <div class="grid2">
        <div class="panel stack">
          <h3>Mon accès parent</h3>
          <label>Enfant<input value="${esc(child?.first_name||state.identity?.display_name||'')}" disabled /></label>
          <p class="muted">Votre session reste enregistrée sur ce téléphone. Utilisez Déconnexion uniquement si vous souhaitez changer d'accès.</p>
          <button class="btn secondary" id="settingsNotif">🔔 Activer les notifications des coachs</button>
        </div>
        <div class="panel">
          <h3>Confidentialité</h3>
          <p>Vous avez uniquement accès aux présences et à la conversation liées à votre enfant.</p>
          <p class="muted">Vos messages sont visibles par les trois coachs U10, dans une conversation commune au staff.</p>
        </div>
      </div>`;
  }
  $('#settingsNotif')?.addEventListener('click',requestNotifications);
}

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
init();
