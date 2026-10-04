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

const state = { user:null, profile:null, identity:null, membership:null, team:null, players:[], events:[], page:'dashboard', month:new Date(), installPrompt:null, loginMode:null, attendanceTab:'parents', attendanceWeek:null, selectedEvent:null, calendarView:(window.innerWidth<760?'agenda':'month'), trainingDocs:[], parentPlayerId:null, coachChildId:null, parentWeek:null, coachChildWeek:null, messageChannel:null };
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

function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
}
function isAndroid(){ return /android/i.test(navigator.userAgent); }
function isStandalonePWA(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
}
function installHelpKey(){ return 'u10-install-help-dismissed-v14'; }

function showInstallOnboarding(force=false){
  if(isStandalonePWA()) return;
  if(!force && localStorage.getItem(installHelpKey())==='1') return;

  const box=$('#installOnboarding');
  const body=$('#installOnboardingBody');
  if(!box||!body) return;

  if(isIOS()){
    body.innerHTML=`
      <div class="install-kicker">INSTALLER L'APPLICATION</div>
      <h2>Ajoutez U10 Herseaux sur votre iPhone</h2>
      <p class="install-lead">Cela prend moins d'une minute et l'application s'ouvrira ensuite comme une vraie app.</p>
      <div class="install-steps">
        <div class="install-step"><span>1</span><div><strong>Ouvrez ce lien dans Safari</strong><small>Si vous êtes déjà dans Safari, passez directement à l'étape 2.</small></div></div>
        <div class="install-step"><span>2</span><div><strong>Appuyez sur le bouton Partager</strong><small>L'icône carré avec une flèche vers le haut.</small></div></div>
        <div class="install-step"><span>3</span><div><strong>Choisissez “Sur l'écran d'accueil”</strong><small>Faites défiler le menu si l'option n'est pas visible tout de suite.</small></div></div>
        <div class="install-step"><span>4</span><div><strong>Appuyez sur “Ajouter”</strong><small>Vous verrez ensuite l'icône U10 Herseaux sur votre écran.</small></div></div>
      </div>
      <div class="install-tip">💡 Ensuite, ouvrez toujours U10 Herseaux depuis son icône. C'est également nécessaire pour les notifications sur iPhone.</div>
      <button class="btn primary full" id="installUnderstood">J'ai compris</button>`;
  }else if(isAndroid()){
    body.innerHTML=`
      <div class="install-kicker">INSTALLER L'APPLICATION</div>
      <h2>Installez U10 Herseaux sur votre téléphone</h2>
      <p class="install-lead">Une fois installée, l'application apparaîtra avec vos autres apps.</p>
      ${state.installPrompt
        ? `<button class="btn primary full install-big-button" id="installNow">📲 Installer l'application</button>
           <p class="install-center-note">Appuyez simplement sur le bouton ci-dessus puis confirmez.</p>`
        : `<div class="install-steps">
            <div class="install-step"><span>1</span><div><strong>Ouvrez ce lien dans Chrome</strong></div></div>
            <div class="install-step"><span>2</span><div><strong>Appuyez sur ⋮ en haut à droite</strong></div></div>
            <div class="install-step"><span>3</span><div><strong>Choisissez “Ajouter à l'écran d'accueil” ou “Installer l'application”</strong></div></div>
          </div>
          <button class="btn primary full" id="installUnderstood">J'ai compris</button>`}
    `;
  }else{
    body.innerHTML=`
      <div class="install-kicker">APPLICATION U10 HERSEAUX</div>
      <h2>Installez l'application sur votre téléphone</h2>
      <p class="install-lead">Pour un accès plus simple, ouvrez ce lien depuis votre smartphone et suivez les instructions proposées.</p>
      <button class="btn primary full" id="installUnderstood">J'ai compris</button>`;
  }

  box.classList.remove('hidden');
  box.setAttribute('aria-hidden','false');

  $('#installNow')?.addEventListener('click', installPWA);
  $('#installUnderstood')?.addEventListener('click', dismissInstallOnboarding);
}

function dismissInstallOnboarding(){
  localStorage.setItem(installHelpKey(),'1');
  $('#installOnboarding')?.classList.add('hidden');
  $('#installOnboarding')?.setAttribute('aria-hidden','true');
}
async function installPWA(){
  if(!state.installPrompt){
    return showInstallOnboarding(true);
  }
  const prompt=state.installPrompt;
  prompt.prompt();
  const choice=await prompt.userChoice;
  if(choice?.outcome==='accepted'){
    localStorage.setItem(installHelpKey(),'1');
    $('#installOnboarding')?.classList.add('hidden');
    $('#installBtn')?.classList.add('hidden');
    state.installPrompt=null;
    toast("Installation lancée.");
  }
}
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.installPrompt=e;
  $('#installBtn')?.classList.remove('hidden');
});
window.addEventListener('appinstalled',()=>{
  localStorage.setItem(installHelpKey(),'1');
  $('#installOnboarding')?.classList.add('hidden');
  $('#installBtn')?.classList.add('hidden');
  state.installPrompt=null;
});
$('#installBtn')?.addEventListener('click', ()=>showInstallOnboarding(true));
$('#installOnboardingClose')?.addEventListener('click',dismissInstallOnboarding);
$('#installOnboarding')?.addEventListener('click',e=>{ if(e.target.id==='installOnboarding') dismissInstallOnboarding(); });
$('#modalClose').addEventListener('click',closeModal); $('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
window.addEventListener('online',()=>$('#syncState').textContent='● En ligne');
window.addEventListener('offline',()=>$('#syncState').textContent='● Hors ligne');

const NAV_COACH = [
  ['dashboard','⌂','Tableau de bord'],
  ['calendar','▦','Calendrier'],
  ['attendance','✓','Présences'],
  ['coachchild','👨‍👦','Mon enfant'],
  ['matches','⚽','Matchs'],
  ['traininghub','📋','Entraînements'],
  ['players','👥','Joueurs'],
  ['evaluations','★','Évaluations'],
  ['messages','💬','Messages'],
  ['polls','📊','Sondages'],
  ['lostfound','🧢','Objets trouvés'],
  ['settings','⚙','Paramètres']
];
const NAV_PARENT = [
  ['dashboard','⌂','Accueil'],
  ['attendance','✓','Présences'],
  ['matches','⚽','Matchs'],
  ['contact','💬','Contacter les coachs'],
  ['polls','📊','Sondages'],
  ['lostfound','🧢','Objets trouvés'],
  ['settings','⚙','Mon accès']
];
const isCoach = () => state.membership?.role === 'coach';

function setView(which){ ['authView','appView'].forEach(id=>$('#'+id)?.classList.add('hidden')); $('#'+which)?.classList.remove('hidden'); }
function pageMeta(page){
  const coach={
    dashboard:['Tableau de bord','Vue d’ensemble de l’équipe'],
    calendar:['Calendrier','Entraînements, matchs et événements du club'],
    attendance:['Présences','Prévisions parents et présence réelle'],
    coachchild:['Mon enfant','Présences parentales de votre enfant'],
    matches:['Matchs','Championnat, amicaux, compositions et visuels'],
    traininghub:['Entraînements','Programme, thèmes et fichiers de séance'],
    players:['Joueurs','Effectif U10'],
    evaluations:['Évaluations','Technique, jeu, athlétique, mental & attitude'],
    messages:['Messages','Conversations privées avec les parents'],
    polls:['Sondages','Créer des questions et suivre les réponses des parents'],
    lostfound:['Objets trouvés','Photos des objets oubliés et réclamations'],
    settings:['Paramètres','Compte et accès à l’équipe']
  };
  const parent={
    dashboard:['Accueil','Calendrier et événements U10'],
    attendance:['Présences','Disponibilités de votre enfant'],
    matches:['Matchs','Liste des matchs U10 et composition'],
    contact:['Contacter les coachs','Conversation privée avec le staff U10'],
    polls:['Sondages','Répondez aux questions concernant votre enfant'],
    lostfound:['Objets trouvés','Reconnaissez les affaires oubliées par votre enfant'],
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
  if(page==='coachchild' && isCoach()) await renderCoachChild();
  if(page==='matches') await (isCoach()?renderMatches():renderParentMatches());
  if(page==='traininghub' && isCoach()) await renderTrainingHub();
  if(page==='players' && isCoach()) await renderPlayers();
  if(page==='evaluations' && isCoach()) await renderEvaluations();
  if(page==='messages' && isCoach()) await renderCoachMessages();
  if(page==='contact' && !isCoach()) await renderParentContact();
  if(page==='polls') await (isCoach()?renderCoachPolls():renderParentPolls());
  if(page==='lostfound') await (isCoach()?renderCoachLostFound():renderParentLostFound());
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


async function loadLoginIdentityOptions(){
  const sel=$('#identitySelect');
  if(!sel || !sb)return;

  try{
    await ensureRpcSession();
    const {data,error}=await sb.rpc('list_login_identities');
    if(error)throw error;

    const rows=Array.isArray(data)?data:[];
    const coaches=rows.filter(x=>x.identity_type==='coach');
    const players=rows.filter(x=>x.identity_type==='player');

    sel.innerHTML=`
      <option value="">Choisir dans la liste…</option>
      <optgroup label="Coachs">
        ${coaches.map(x=>`<option value="${esc(x.identity_key)}">${esc(x.display_name)}</option>`).join('')}
      </optgroup>
      <optgroup label="Joueurs / parents">
        ${players.length
          ? players.map(x=>`<option value="${esc(x.identity_key)}">${esc(x.display_name)}</option>`).join('')
          : '<option value="" disabled>Aucun joueur disponible</option>'}
      </optgroup>`;

  }catch(err){
    console.error('Chargement des profils de connexion',err);
    // Les coachs présents dans le HTML restent disponibles en secours.
    const playerGroup=sel.querySelector('optgroup[label="Joueurs / parents"]');
    if(playerGroup)playerGroup.innerHTML='<option value="" disabled>Impossible de charger la liste des joueurs</option>';
  }
}

async function init(){
  if(!configured){ $('#setupWarning').classList.remove('hidden'); return; }
  try{
    const user = await ensureSession();
    await loadLoginIdentityOptions();
    await loadUser(user);
  }catch(err){
    console.error(err);
    setView('authView');
    toast("Connexion impossible : " + (err.message || err), false);
  }

  sb.auth.onAuthStateChange(async(_e,session)=>{
    if(session?.user && session.user.id!==state.user?.id) await loadUser(session.user);
  });

  // Petit délai pour laisser la page se charger avant d'expliquer l'installation.
  setTimeout(()=>showInstallOnboarding(false),900);
}

async function loadUser(user){
  state.user=user;

  // v12 : une même identité peut être utilisée sur plusieurs téléphones.
  let identity=null;
  let identityError=null;

  const sessionLookup=await sb
    .from('app_identity_sessions')
    .select('identity_key')
    .eq('auth_user_id',user.id)
    .order('created_at',{ascending:false})
    .limit(1)
    .maybeSingle();

  if(sessionLookup.error && !String(sessionLookup.error.message||'').includes('app_identity_sessions')){
    console.error(sessionLookup.error);
  }

  if(sessionLookup.data?.identity_key){
    const res=await sb
      .from('app_identities')
      .select('identity_key,display_name,identity_type,auth_user_id,player_id')
      .eq('identity_key',sessionLookup.data.identity_key)
      .maybeSingle();
    identity=res.data;
    identityError=res.error;
  }

  // Compatibilité avec les anciennes sessions créées avant v12.
  if(!identity){
    const legacy=await sb
      .from('app_identities')
      .select('identity_key,display_name,identity_type,auth_user_id,player_id')
      .eq('auth_user_id',user.id)
      .maybeSingle();
    identity=legacy.data;
    identityError=legacy.error;
  }

  if(identityError && !String(identityError.message||'').includes('app_identities')){
    console.error(identityError);
  }

  if(!identity){
    state.identity=null;
    state.profile=null;
    state.membership=null;
    state.team=null;
    state.parentPlayerId=null;
    state.coachChildId=null;
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
  state.coachChildId=null;
  state.profile={id:user.id,full_name:identity.display_name,role:memberships[0].role};

  $('#seasonLabel').textContent=state.team.season||'';
  $('#userCard').innerHTML=`<strong>${esc(identity.display_name)}</strong><br><span class="muted">${isCoach()?'Coach':'Parent'}</span>`;
  setView('appView');
  await loadCore();

  if(isCoach()){
    const {data:link}=await sb
      .from('coach_children')
      .select('player_id')
      .eq('team_id',state.team.id)
      .eq('coach_identity_key',identity.identity_key)
      .maybeSingle();
    state.coachChildId=link?.player_id||null;
  }

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

// v20 : fermeture de la sidebar par swipe vers la gauche sur smartphone/tablette.
(function setupSidebarSwipe(){
  const sidebar=$('#sidebar');
  if(!sidebar)return;

  let startX=0,startY=0,lastX=0,tracking=false;

  sidebar.addEventListener('touchstart',e=>{
    if(!sidebar.classList.contains('open'))return;
    const t=e.touches[0];
    startX=lastX=t.clientX;
    startY=t.clientY;
    tracking=true;
    sidebar.classList.add('swiping');
  },{passive:true});

  sidebar.addEventListener('touchmove',e=>{
    if(!tracking)return;
    const t=e.touches[0];
    lastX=t.clientX;
    const dx=lastX-startX;
    const dy=t.clientY-startY;

    // Si le geste est surtout vertical, on laisse la sidebar défiler normalement.
    if(Math.abs(dy)>Math.abs(dx)){
      sidebar.style.transform='';
      return;
    }

    if(dx<0){
      sidebar.style.transform=`translateX(${Math.max(dx,-sidebar.offsetWidth)}px)`;
    }
  },{passive:true});

  const finishSwipe=()=>{
    if(!tracking)return;
    tracking=false;
    const dx=lastX-startX;
    sidebar.classList.remove('swiping');
    sidebar.style.transform='';

    if(dx < -70){
      sidebar.classList.remove('open');
    }
  };

  sidebar.addEventListener('touchend',finishSwipe,{passive:true});
  sidebar.addEventListener('touchcancel',finishSwipe,{passive:true});
})();

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

    <div id="parentPollTeaser"></div>

    <div class="parent-contact-cta">
      <div><strong>Une information privée concernant ${esc(child?.first_name||'votre enfant')} ?</strong>
      <span>Écrivez directement aux trois coachs.</span></div>
      <button class="btn secondary" id="homeContact">Contacter les coachs</button>
    </div>`;

  $('#homePresence').onclick=()=>go('attendance');
  $('#homeContact').onclick=()=>go('contact');
  $$('[data-cal-event]').forEach(b=>b.onclick=()=>{go('attendance')});

  const {data:activePolls}=await sb.from('polls')
    .select('id,title,question,closes_at,status')
    .eq('team_id',state.team.id)
    .eq('status','open')
    .order('created_at',{ascending:false});
  const visible=(activePolls||[]).filter(p=>!p.closes_at || new Date(p.closes_at).getTime()>=Date.now());
  if(visible.length){
    $('#parentPollTeaser').innerHTML=`
      <div class="poll-home-card">
        <div><small>SONDAGE EN COURS</small><strong>${esc(visible[0].title)}</strong><span>${esc(visible[0].question)}</span></div>
        <button class="btn primary" id="homePolls">Répondre</button>
      </div>`;
    $('#homePolls').onclick=()=>go('polls');
  }
}

async function renderParentAttendance(){
  await renderChildAttendance(state.parentPlayerId,false);
}

async function renderCoachChild(){
  await loadCore();
  const pid=state.coachChildId;
  const child=state.players.find(p=>p.id===pid);

  if(!pid){
    $('#content').innerHTML='<div class="notice warning">Aucun enfant n’est encore lié à ce profil coach.</div>';
    return;
  }

  $('#content').innerHTML=`
    <div class="coach-child-intro">
      <div>
        <small>MODE PARENT DEPUIS LE PROFIL COACH</small>
        <h2>${esc(child?.first_name||'Mon enfant')}</h2>
        <p>Vous restez connecté comme coach, mais vous pouvez ici remplir les présences parentales de votre enfant.</p>
      </div>
      <span class="pill green">Profil coach actif</span>
    </div>
    <div id="coachChildAttendance"></div>`;

  await renderChildAttendance(pid,true,'#coachChildAttendance');
}

async function renderChildAttendance(pid,coachMode=false,targetSelector='#content'){
  await loadCore();
  const target=$(targetSelector);
  const child=state.players.find(p=>p.id===pid);

  if(!pid){
    target.innerHTML='<div class="notice warning">Aucun enfant n’est lié à cet accès.</div>';
    return;
  }

  const weekKey=coachMode?'coachChildWeek':'parentWeek';
  let monday=state[weekKey] ? mondayOf(state[weekKey]) : parentWeekMonday();
  state[weekKey]=isoLocal(monday);
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

  target.innerHTML=`
    <div class="panel parent-week-head">
      <button class="btn ghost small" data-child-prev>←</button>
      <div><small>SEMAINE</small><strong>${fmtFullDate(start)} → ${fmtFullDate(end)}</strong></div>
      <button class="btn ghost small" data-child-next>→</button>
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
          <div class="parent-choice" data-child-event="${e.id}">
            <button class="parent-choice-btn present ${a?.status==='present'?'selected':''}" data-status="present">✓ Présent</button>
            <button class="parent-choice-btn absent ${a?.status==='absent'?'selected':''}" data-status="absent">✕ Absent</button>
          </div>
          <input class="parent-presence-comment" data-child-comment="${e.id}" value="${esc(a?.comment||'')}" placeholder="Remarque éventuelle / raison d'absence" />
        </div>`;
      }).join(''):'<div class="empty panel">Aucun événement prévu cette semaine.</div>'}
    </div>`;

  $('[data-child-prev]',target).onclick=()=>{
    state[weekKey]=isoLocal(addDays(monday,-7));
    coachMode?renderCoachChild():renderParentAttendance();
  };
  $('[data-child-next]',target).onclick=()=>{
    state[weekKey]=isoLocal(addDays(monday,7));
    coachMode?renderCoachChild():renderParentAttendance();
  };

  $$('[data-child-event] .parent-choice-btn',target).forEach(b=>b.onclick=async()=>{
    const wrap=b.closest('[data-child-event]');
    const eventId=wrap.dataset.childEvent;
    const status=b.dataset.status;
    const comment=$(`[data-child-comment="${eventId}"]`,target)?.value.trim()||null;
    $$('button',wrap).forEach(x=>x.classList.remove('selected'));
    b.classList.add('selected');

    const {error}=await sb.from('availability').upsert({
      event_id:eventId,
      player_id:pid,
      status,
      comment,
      set_by:state.user.id,
      updated_at:new Date().toISOString()
    },{onConflict:'event_id,player_id'});

    if(error){
      b.classList.remove('selected');
      return toast(error.message,false);
    }
    toast(status==='present'?'Présence enregistrée':'Absence enregistrée');
  });

  $$('.parent-presence-comment',target).forEach(inp=>inp.onchange=async()=>{
    const eventId=inp.dataset.childComment;
    const current=amap.get(eventId);
    const selected=$(`[data-child-event="${eventId}"] .parent-choice-btn.selected`,target);
    const status=selected?.dataset.status||current?.status;
    if(!status)return;

    const {error}=await sb.from('availability').upsert({
      event_id:eventId,
      player_id:pid,
      status,
      comment:inp.value.trim()||null,
      set_by:state.user.id,
      updated_at:new Date().toISOString()
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


function normalizeEventTime(value){
  const v=String(value||'').trim();
  if(!v)return null;
  // HTML time inputs normally return HH:MM. We normalize explicitly for PostgreSQL.
  if(/^\d{2}:\d{2}$/.test(v))return `${v}:00`;
  if(/^\d{2}:\d{2}:\d{2}$/.test(v))return v;
  return null;
}

function isUuid(value){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));
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
    const type=$('#evType').value;
    const eventDate=$('#evDate').value;
    const title=$('#evTitle').value.trim();

    if(!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)){
      setBusy(btn,false);
      return toast('La date du match est invalide.',false);
    }
    if(!title){
      setBusy(btn,false);
      return toast('Le titre est obligatoire.',false);
    }

    const payload={
      team_id:state.team.id,
      type,
      title,
      event_date:eventDate,
      start_time:normalizeEventTime($('#evStart').value),
      end_time:normalizeEventTime($('#evEnd').value),
      meeting_time:normalizeEventTime($('#evMeet').value),
      location:$('#evLocation').value.trim()||null,
      address:$('#evAddress').value.trim()||null,
      opponent:$('#evOpponent').value.trim()||null,
      notes:$('#evNotes').value.trim()||null,
      match_kind:type==='match'?($('#evMatchKind').value||'championship'):null
    };

    // created_by est facultatif en base. On ne l'envoie que si la session contient
    // bien un UUID valide, afin d'éviter toute erreur "invalid input syntax for type uuid".
    if(isUuid(state.user?.id)) payload.created_by=state.user.id;

    let q=e
      ? sb.from('events').update(payload).eq('id',e.id)
      : sb.from('events').insert(payload);

    const {error}=await q;
    setBusy(btn,false);
    if(error){
      console.error('Erreur enregistrement événement',error,payload);
      const detail=[error.message,error.details,error.hint].filter(Boolean).join(' · ');
      return toast(detail||"Impossible d'enregistrer le match.",false);
    }
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
      <button class="tab-btn ${state.attendanceTab==='history'?'active':''}" id="tabHistory">Historique mensuel</button>
    </div>
    <div id="attendanceBody"></div>`;
  $('#tabParents').onclick=()=>{state.attendanceTab='parents';renderAttendance()};
  $('#tabCoach').onclick=()=>{state.attendanceTab='coach';renderAttendance()};
  $('#tabHistory').onclick=()=>{state.attendanceTab='history';renderAttendance()};
  if(state.attendanceTab==='parents') await renderParentForecast();
  else if(state.attendanceTab==='coach') await renderCoachCheckin();
  else await renderAttendanceHistory();
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


function attendanceStatusIcon(status){
  if(status==='present') return '<span class="attendance-mark present" title="Présent">✓</span>';
  if(status==='absent') return '<span class="attendance-mark absent" title="Absent">×</span>';
  if(status==='late') return '<span class="attendance-mark late" title="Retard">R</span>';
  if(status==='excused') return '<span class="attendance-mark excused" title="Excusé">E</span>';
  return '<span class="attendance-mark empty" title="Non enregistré">·</span>';
}

function attendanceMonthLabel(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-BE',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
}

async function renderAttendanceHistory(){
  state.attendanceHistoryMonth = state.attendanceHistoryMonth || todayISO().slice(0,7);
  const ym=state.attendanceHistoryMonth;
  const [year,month]=ym.split('-').map(Number);
  const start=`${ym}-01`;
  const lastDay=new Date(year,month,0).getDate();
  const end=`${ym}-${String(lastDay).padStart(2,'0')}`;

  const events=state.events
    .filter(e=>(e.type==='training'||e.type==='match'||e.type==='tournament') && e.event_date>=start && e.event_date<=end)
    .sort((a,b)=>a.event_date.localeCompare(b.event_date)||(a.start_time||'').localeCompare(b.start_time||''));

  let attendance=[];
  if(events.length){
    const {data,error}=await sb.from('attendance').select('*').in('event_id',events.map(e=>e.id));
    if(error)toast(error.message,false);
    attendance=data||[];
  }

  const attendanceMap=new Map(attendance.map(a=>[`${a.event_id}:${a.player_id}`,a]));

  const summaryFor=pid=>{
    const vals=events.map(e=>attendanceMap.get(`${e.id}:${pid}`)?.status).filter(Boolean);
    const present=vals.filter(s=>s==='present'||s==='late').length;
    const absent=vals.filter(s=>s==='absent').length;
    return {present,absent,total:vals.length};
  };

  $('#attendanceBody').innerHTML=`
    <div class="panel attendance-month-toolbar">
      <button class="btn ghost small" id="prevAttendanceMonth">←</button>
      <div><small>HISTORIQUE</small><strong>${attendanceMonthLabel(ym)}</strong></div>
      <button class="btn ghost small" id="nextAttendanceMonth">→</button>
    </div>

    <div class="attendance-history-legend">
      <span><i class="attendance-mark present">✓</i> Présent</span>
      <span><i class="attendance-mark absent">×</i> Absent</span>
      <span><i class="attendance-mark late">R</i> Retard</span>
      <span><i class="attendance-mark excused">E</i> Excusé</span>
      <span><i class="attendance-mark empty">·</i> Non enregistré</span>
    </div>

    ${events.length?`
      <div class="attendance-history-wrap">
        <table class="attendance-history-table">
          <thead>
            <tr>
              <th class="sticky-player">Joueur</th>
              ${events.map(e=>{
                const d=new Date(e.event_date+'T12:00:00');
                const day=new Intl.DateTimeFormat('fr-BE',{weekday:'short'}).format(d).replace('.','');
                const date=String(d.getDate()).padStart(2,'0');
                return `<th class="attendance-event-head" title="${esc(e.title)}">
                  <small>${day}</small><strong>${date}</strong><span>${e.type==='match'?'M':e.type==='tournament'?'T':'E'}</span>
                </th>`;
              }).join('')}
              <th class="attendance-total-head">Prés.</th>
              <th class="attendance-total-head">Abs.</th>
            </tr>
          </thead>
          <tbody>
            ${state.players.map(p=>{
              const s=summaryFor(p.id);
              return `<tr>
                <td class="sticky-player"><strong>${esc(p.first_name)}</strong></td>
                ${events.map(e=>{
                  const a=attendanceMap.get(`${e.id}:${p.id}`);
                  return `<td class="attendance-status-cell">
                    <button class="attendance-day-btn ${a?.notes?'has-note':''}" data-attendance-detail="${e.id}" data-player="${p.id}" title="${a?.notes?'Remarque : '+esc(a.notes):'Voir / ajouter une remarque'}">
                      ${attendanceStatusIcon(a?.status)}
                      ${a?.notes?'<span class="note-dot">•</span>':''}
                    </button>
                  </td>`;
                }).join('')}
                <td class="attendance-count present-count">${s.present}</td>
                <td class="attendance-count absent-count">${s.absent}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="attendance-history-actions">
        <span class="muted">E = entraînement · M = match · T = tournoi · • = remarque enregistrée</span>
      </div>
    `:'<div class="empty panel">Aucun entraînement, match ou tournoi pour ce mois.</div>'}
  `;

  $('#prevAttendanceMonth').onclick=()=>{
    const d=new Date(year,month-2,1);
    state.attendanceHistoryMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    renderAttendanceHistory();
  };
  $('#nextAttendanceMonth').onclick=()=>{
    const d=new Date(year,month,1);
    state.attendanceHistoryMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    renderAttendanceHistory();
  };

  $$('[data-attendance-detail]').forEach(b=>b.onclick=()=>openAttendanceDayDetail(
    b.dataset.attendanceDetail,
    b.dataset.player
  ));

}


async function openAttendanceDayDetail(eventId,playerId){
  const event=state.events.find(e=>e.id===eventId);
  const player=state.players.find(p=>p.id===playerId);
  const {data,error}=await sb.from('attendance')
    .select('*')
    .eq('event_id',eventId)
    .eq('player_id',playerId)
    .maybeSingle();
  if(error)return toast(error.message,false);

  openModal(`
    <h2>${esc(player?.first_name||'Joueur')}</h2>
    <p class="muted">${event?fmtFullDate(event.event_date):''} · ${esc(event?.title||'')}</p>
    <div class="panel stack">
      <label>Présence
        <select id="attendanceDetailStatus">
          <option value="present">Présent</option>
          <option value="absent">Absent</option>
          <option value="late">Retard</option>
          <option value="excused">Excusé</option>
        </select>
      </label>
      <label>Remarque du jour
        <textarea id="attendanceDetailNote" placeholder="Comportement, attitude, blessure, progression, remarque…">${esc(data?.notes||'')}</textarea>
      </label>
      <button class="btn primary" id="saveAttendanceDetail">Enregistrer</button>
    </div>`);
  $('#attendanceDetailStatus').value=data?.status||'present';
  $('#saveAttendanceDetail').onclick=async()=>{
    const btn=$('#saveAttendanceDetail');
    setBusy(btn,true);
    const {error:saveError}=await sb.from('attendance').upsert({
      event_id:eventId,
      player_id:playerId,
      status:$('#attendanceDetailStatus').value,
      notes:$('#attendanceDetailNote').value.trim()||null,
      marked_by:state.user.id,
      updated_at:new Date().toISOString()
    },{onConflict:'event_id,player_id'});
    setBusy(btn,false);
    if(saveError)return toast(saveError.message,false);
    closeModal();
    toast('Présence et remarque enregistrées');
    if(state.attendanceTab==='history')await renderAttendanceHistory();
    else if(state.attendanceTab==='coach')await renderCoachCheckin();
  };
}

async function openDayNotesModal(eventId){
  const event=state.events.find(e=>e.id===eventId);
  const {data,error}=await sb.from('attendance').select('*').eq('event_id',eventId);
  if(error)return toast(error.message,false);
  const map=new Map((data||[]).map(a=>[a.player_id,a]));

  openModal(`
    <h2>Remarques du jour</h2>
    <p class="muted">${event?fmtFullDate(event.event_date):''} · ${esc(event?.title||'')}</p>
    <div class="day-notes-list">
      ${state.players.map(p=>{
        const a=map.get(p.id);
        return `<div class="day-note-row">
          <div class="day-note-player">
            <strong>${esc(p.first_name)}</strong>
            ${attendanceStatusIcon(a?.status)}
          </div>
          <input data-day-note="${p.id}" value="${esc(a?.notes||'')}" placeholder="Ajouter une remarque…" />
        </div>`;
      }).join('')}
    </div>
    <button class="btn primary full" id="saveDayNotes">Enregistrer les remarques</button>`);

  $('#saveDayNotes').onclick=async()=>{
    const btn=$('#saveDayNotes');setBusy(btn,true);
    const rows=state.players.map(p=>{
      const current=map.get(p.id);
      return {
        event_id:eventId,
        player_id:p.id,
        status:current?.status||'absent',
        notes:$(`[data-day-note="${p.id}"]`).value.trim()||null,
        marked_by:state.user.id,
        updated_at:new Date().toISOString()
      };
    });
    const {error:saveError}=await sb.from('attendance').upsert(rows,{onConflict:'event_id,player_id'});
    setBusy(btn,false);
    if(saveError)return toast(saveError.message,false);
    closeModal();toast('Remarques enregistrées');await renderCoachCheckin();
  };
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
      <div class="toolbar-group"><button class="btn ghost small" id="dayNotes">📝 Remarques</button><button class="btn ghost small" id="clearPresence">Tout vider</button><button class="btn primary" id="savePresence">Enregistrer</button></div>
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
  $('#dayNotes').onclick=()=>openDayNotesModal(selected);
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


function matchCardHTML(e,{parent=false,highlight=false,past=false}={}){
  const d=new Date(e.event_date+'T12:00:00');
  return `<div class="match-card ${parent?'parent-match-card':''} ${highlight?'next-match-highlight':''} ${past?'past-match-card':''}">
    <div class="match-date"><span>${d.getDate()}</span><small>${new Intl.DateTimeFormat('fr-BE',{month:'short'}).format(d)}</small></div>
    <div class="match-main">
      <div class="event-title">
        <h3>Herseaux ${e.opponent?`· ${esc(e.opponent)}`:''}</h3>
        <span class="match-kind ${e.match_kind==='friendly'?'friendly':''}">${e.match_kind==='friendly'?'Amical':'Championnat'}</span>
      </div>
      <div class="event-meta">
        <span>📅 ${fmtFullDate(e.event_date)}</span>
        <span>🕒 ${timeShort(e.start_time)||'Heure à préciser'}</span>
        ${e.meeting_time?`<span>👥 RDV ${timeShort(e.meeting_time)}</span>`:''}
        ${e.location?`<span>📍 ${esc(e.location)}</span>`:''}
      </div>
      ${e.notes?`<div class="muted">${esc(e.notes)}</div>`:''}
    </div>
    <div class="match-actions">
      ${parent
        ? `<button class="btn primary small" data-parent-lineup="${e.id}">Composition</button>`
        : `<button class="btn ghost small" data-match-lineup="${e.id}">Composition</button>
           <button class="btn ghost small" data-matchsheet="${e.id}">Feuille de match</button>
           <button class="btn secondary small" data-edit-event="${e.id}">Modifier</button>`}
    </div>
  </div>`;
}

async function renderMatches(){
  await loadCore();
  const today=todayISO();

  const upcoming=state.events
    .filter(e=>e.type==='match' && e.event_date>=today)
    .sort((a,b)=>a.event_date.localeCompare(b.event_date)||(a.start_time||'').localeCompare(b.start_time||''));

  const past=state.events
    .filter(e=>e.type==='match' && e.event_date<today)
    .sort((a,b)=>b.event_date.localeCompare(a.event_date)||(b.start_time||'').localeCompare(a.start_time||''));

  const next=upcoming[0]||null;
  const rest=upcoming.slice(1);

  $('#content').innerHTML=`
    <div class="section-head">
      <div><h3>Matchs U10</h3><span class="muted">Championnat et matchs amicaux</span></div>
      <button class="btn primary" id="addMatch">+ Ajouter un match</button>
    </div>

    <div class="match-section">
      <div class="match-section-title">
        <div><small>À VENIR</small><h3>Prochain match</h3></div>
      </div>
      ${next?matchCardHTML(next,{highlight:true}):'<div class="empty panel">Aucun prochain match planifié.</div>'}
    </div>

    <div class="match-section">
      <div class="match-section-title">
        <div><small>CALENDRIER</small><h3>Matchs à venir</h3></div>
        <span class="muted">${rest.length} match(s)</span>
      </div>
      <div class="match-list">
        ${rest.length?rest.map(e=>matchCardHTML(e)).join(''):'<div class="empty panel">Aucun autre match planifié.</div>'}
      </div>
    </div>

    <div class="match-section">
      <div class="match-section-title">
        <div><small>HISTORIQUE</small><h3>Matchs passés</h3></div>
        <span class="muted">${past.length} match(s)</span>
      </div>
      <div class="match-list past-match-list">
        ${past.length?past.map(e=>matchCardHTML(e,{past:true})).join(''):'<div class="empty panel">Aucun match passé.</div>'}
      </div>
    </div>`;

  $('#addMatch').onclick=()=>eventModal({type:'match',title:'Match',event_date:todayISO(),match_kind:'championship'});
  bindEventButtons();
  $$('[data-matchsheet]').forEach(b=>b.onclick=()=>openMatchSheetPrep(
    state.events.find(e=>e.id===b.dataset.matchsheet)
  ));
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

function fitCanvasText(ctx,text,maxWidth){
  let value=String(text||'');
  if(ctx.measureText(value).width<=maxWidth)return value;
  while(value.length>1 && ctx.measureText(value+'…').width>maxWidth)value=value.slice(0,-1);
  return value+'…';
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
  roundRect(ctx,60,infoY,960,205,28);ctx.fillStyle='rgba(255,255,255,.08)';ctx.fill();
  ctx.fillStyle='#fff';ctx.font='600 27px system-ui, sans-serif';
  ctx.fillText(`📅 ${fmtLong(match.event_date)}`,90,550);
  ctx.fillText(`🕒 Match : ${timeShort(match.start_time)||'à préciser'}`,90,600);
  ctx.fillText(`👥 Rendez-vous : ${timeShort(match.meeting_time)||'à préciser'}`,540,600);
  ctx.fillText(`📍 Lieu : ${fitCanvasText(ctx,match.location||'À préciser',760)}`,90,645);
  ctx.fillStyle='rgba(255,255,255,.82)';ctx.font='500 25px system-ui, sans-serif';
  ctx.fillText(`🏠 Adresse : ${fitCanvasText(ctx,match.address||'À préciser',780)}`,90,682);

  ctx.fillStyle='#43d56f';ctx.font='800 36px system-ui, sans-serif';ctx.fillText('JOUEURS CONVOQUÉS',60,765);
  ctx.fillStyle='#fff';ctx.font='650 31px system-ui, sans-serif';
  const cols=2, colW=470, startY=820, rowH=58;
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



async function openMatchSheetPrep(match){
  if(!match)return;

  const {data:sel,error}=await sb.from('match_players')
    .select('player_id,position_order')
    .eq('event_id',match.id)
    .order('position_order');

  if(error)return toast(error.message,false);

  const selectedIds=(sel||[]).map(x=>x.player_id);
  const selectedPlayers=selectedIds
    .map(id=>state.players.find(p=>p.id===id))
    .filter(Boolean);

  openModal(`
    <h2>Feuille de match · préparation</h2>
    <p class="muted">${fmtFullDate(match.event_date)} · Herseaux ${match.opponent?`- ${esc(match.opponent)}`:''}</p>

    <div class="notice warning">
      <strong>Important :</strong> ceci est une aide de préparation interne.
      La feuille officielle d'un match de championnat reste la feuille digitale fédérale dans E-kickoff.
    </div>

    <div class="matchsheet-grid">
      <div class="panel">
        <small>MATCH</small>
        <h3>${esc(match.title||'Match U10')}</h3>
        <div class="matchsheet-info">
          <span>📅 ${fmtFullDate(match.event_date)}</span>
          <span>🕒 ${timeShort(match.start_time)||'Heure à préciser'}</span>
          ${match.meeting_time?`<span>👥 RDV ${timeShort(match.meeting_time)}</span>`:''}
          ${match.location?`<span>📍 ${esc(match.location)}</span>`:''}
          ${match.opponent?`<span>⚽ Adversaire : ${esc(match.opponent)}</span>`:''}
        </div>
      </div>

      <div class="panel">
        <small>JOUEURS PRÉPARÉS</small>
        <h3>${selectedPlayers.length} joueur(s)</h3>
        ${selectedPlayers.length
          ? `<div class="matchsheet-player-list">${selectedPlayers.map((p,i)=>`<span>${i+1}. ${esc(p.first_name)}${p.last_name?' '+esc(p.last_name):''}</span>`).join('')}</div>`
          : `<div class="notice warning">Aucune composition n'est encore enregistrée pour ce match.</div>`}
      </div>
    </div>

    <div class="panel matchsheet-procedure">
      <h3>Procédure officielle</h3>
      <div class="matchsheet-step"><b>1</b><span>Compléter la feuille de match digitale fédérale avant le match.</span></div>
      <div class="matchsheet-step"><b>2</b><span>Vérifier les joueurs et les personnes inscrites sur la feuille.</span></div>
      <div class="matchsheet-step"><b>3</b><span>La feuille doit être présentée à l'arbitre avant le début du match.</span></div>
      <div class="matchsheet-step"><b>4</b><span>Après le match, l'arbitre complète et clôture la feuille digitale.</span></div>
    </div>

    ${selectedPlayers.length?`
      <button class="btn secondary full" id="copyMatchSheetPlayers">Copier la liste des joueurs</button>
    `:''}
  `);

  $('#copyMatchSheetPlayers')?.addEventListener('click',async()=>{
    const txt=selectedPlayers.map((p,i)=>`${i+1}. ${p.first_name}${p.last_name?' '+p.last_name:''}`).join('\n');
    try{
      await navigator.clipboard.writeText(txt);
      toast('Liste des joueurs copiée');
    }catch(_){
      toast("Impossible de copier automatiquement sur cet appareil.",false);
    }
  });
}

async function renderParentMatches(){
  await loadCore();
  const today=todayISO();

  const upcoming=state.events
    .filter(e=>e.type==='match' && e.event_date>=today)
    .sort((a,b)=>a.event_date.localeCompare(b.event_date)||(a.start_time||'').localeCompare(b.start_time||''));

  const past=state.events
    .filter(e=>e.type==='match' && e.event_date<today)
    .sort((a,b)=>b.event_date.localeCompare(a.event_date)||(b.start_time||'').localeCompare(a.start_time||''));

  const next=upcoming[0]||null;
  const rest=upcoming.slice(1);

  $('#content').innerHTML=`
    <div class="section-head">
      <div><h3>Matchs U10</h3><span class="muted">Calendrier des matchs et compositions</span></div>
    </div>

    <div class="match-section">
      <div class="match-section-title">
        <div><small>À VENIR</small><h3>Prochain match</h3></div>
      </div>
      ${next?matchCardHTML(next,{parent:true,highlight:true}):'<div class="empty panel">Aucun prochain match planifié.</div>'}
    </div>

    <div class="match-section">
      <div class="match-section-title">
        <div><small>CALENDRIER</small><h3>Matchs à venir</h3></div>
        <span class="muted">${rest.length} match(s)</span>
      </div>
      <div class="match-list">
        ${rest.length?rest.map(e=>matchCardHTML(e,{parent:true})).join(''):'<div class="empty panel">Aucun autre match planifié.</div>'}
      </div>
    </div>

    <div class="match-section">
      <div class="match-section-title">
        <div><small>HISTORIQUE</small><h3>Matchs passés</h3></div>
        <span class="muted">${past.length} match(s)</span>
      </div>
      <div class="match-list past-match-list">
        ${past.length?past.map(e=>matchCardHTML(e,{parent:true,past:true})).join(''):'<div class="empty panel">Aucun match passé.</div>'}
      </div>
    </div>`;

  $$('[data-parent-lineup]').forEach(b=>b.onclick=()=>openParentMatchComposition(
    state.events.find(e=>e.id===b.dataset.parentLineup)
  ));
}

async function openParentMatchComposition(match){
  if(!match) return;
  const {data:sel,error}=await sb.from('match_players')
    .select('player_id,position_order')
    .eq('event_id',match.id)
    .order('position_order');

  if(error)return toast(error.message,false);

  const selectedIds=(sel||[]).map(x=>x.player_id);

  if(!selectedIds.length){
    openModal(`
      <h2>Composition · ${esc(match.opponent||'Match')}</h2>
      <p class="muted">${fmtFullDate(match.event_date)} · ${timeShort(match.start_time)||'Heure à préciser'} ${match.location?'· '+esc(match.location):''}</p>
      <div class="notice warning">Composition pas encore établie.</div>
    `);
    return;
  }

  openModal(`
    <h2>Composition · ${esc(match.opponent||'Match')}</h2>
    <p class="muted">${fmtFullDate(match.event_date)} · ${timeShort(match.start_time)||'Heure à préciser'} ${match.location?'· '+esc(match.location):''}</p>
    <div id="parentMatchImageArea"><div class="empty panel">Génération de l'image…</div></div>
  `);

  await renderParentMatchImage(match, selectedIds);
}

async function renderParentMatchImage(match, selectedIds){
  const players=state.players.filter(p=>selectedIds.includes(p.id));
  const canvas=document.createElement('canvas');
  canvas.width=1080;canvas.height=1350;
  const ctx=canvas.getContext('2d');

  ctx.fillStyle='#07130c';ctx.fillRect(0,0,1080,1350);
  const grad=ctx.createLinearGradient(0,0,1080,1350);
  grad.addColorStop(0,'rgba(28,173,82,.32)');grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1350);

  try{
    const logo=await loadCanvasImage('./logo.png');
    ctx.drawImage(logo,60,55,170,170);
  }catch(_){}

  ctx.fillStyle='#ffffff';
  ctx.font='800 58px system-ui, sans-serif';
  ctx.fillText('COMPOSITION DU MATCH',260,110);

  ctx.fillStyle='rgba(255,255,255,.86)';
  ctx.font='500 30px system-ui, sans-serif';
  ctx.fillText(`U10 HERSEAUX · ${match.match_kind==='friendly'?'MATCH AMICAL':'CHAMPIONNAT'}`,260,156);

  roundRect(ctx,60,245,960,250,28);
  ctx.fillStyle='rgba(255,255,255,.05)';ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=2;ctx.stroke();

  ctx.fillStyle='#43d56f';
  ctx.font='800 54px system-ui, sans-serif';
  ctx.fillText(`HERSEAUX ${match.opponent?`· ${match.opponent.toUpperCase()}`:''}`,90,320);

  ctx.fillStyle='rgba(255,255,255,.88)';
  ctx.font='500 28px system-ui, sans-serif';
  ctx.fillText(`Date : ${fmtFullDate(match.event_date)}`,90,380);
  ctx.fillText(`Heure : ${timeShort(match.start_time)||'À préciser'}`,90,420);
  if(match.meeting_time) ctx.fillText(`Rendez-vous : ${timeShort(match.meeting_time)}`,90,460);
  ctx.fillText(`Lieu : ${fitCanvasText(ctx,match.location||'À préciser',820)}`,90,500);
  ctx.fillStyle='rgba(255,255,255,.78)';
  ctx.font='500 25px system-ui, sans-serif';
  ctx.fillText(`Adresse : ${fitCanvasText(ctx,match.address||'À préciser',820)}`,90,540);

  ctx.fillStyle='#ffffff';
  ctx.font='800 38px system-ui, sans-serif';
  ctx.fillText('JOUEURS CONVOQUÉS',60,710);

  const cols=2, colW=470, startY=790, rowH=58;
  ctx.font='600 28px system-ui, sans-serif';
  players.forEach((p,i)=>{
    const col=i%cols,row=Math.floor(i/cols);
    const x=60+col*colW,y=startY+row*rowH;
    ctx.fillStyle='#43d56f';
    ctx.beginPath();ctx.arc(x+12,y-9,7,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';
    ctx.fillText(p.first_name+(p.last_name?' '+p.last_name:''),x+35,y);
  });

  ctx.fillStyle='rgba(255,255,255,.55)';
  ctx.font='500 22px system-ui, sans-serif';
  ctx.fillText('Royale Union Sportive Herseautoise · U10',60,1290);

  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
  const url=URL.createObjectURL(blob);

  $('#parentMatchImageArea').innerHTML=`
    <div class="generated-image">
      <img src="${url}" alt="Composition du match" />
      <div class="modal-actions">
        <a class="btn secondary" href="${url}" download="U10-Herseaux-${(match.opponent||'match').replace(/[^a-z0-9]+/gi,'-')}.png">Télécharger l'image</a>
      </div>
    </div>`;
}

function trainingSessionGroups(docs){
  const groups=new Map();
  (docs||[]).forEach(doc=>{
    const key=`${doc.session_date}|||${doc.title||'Séance d’entraînement'}`;
    if(!groups.has(key)){
      groups.set(key,{
        key,
        session_date:doc.session_date,
        title:doc.title||'Séance d’entraînement',
        notes:doc.notes||'',
        docs:[]
      });
    }
    const g=groups.get(key);
    g.docs.push(doc);
    if(!g.notes && doc.notes)g.notes=doc.notes;
  });
  return [...groups.values()].sort((a,b)=>
    b.session_date.localeCompare(a.session_date) ||
    a.title.localeCompare(b.title,'fr')
  );
}

function trainingSessionListItem(session){
  const d=new Date(session.session_date+'T12:00:00');
  const day=String(d.getDate()).padStart(2,'0');
  const month=new Intl.DateTimeFormat('fr-BE',{month:'short'}).format(d).replace('.','');
  const fileCount=session.docs.length;
  const hasImage=session.docs.some(doc=>(doc.file_type||'').startsWith('image/'));
  return `<button type="button" class="training-session-row" data-training-session="${esc(session.key)}">
    <div class="training-session-date"><strong>${day}</strong><span>${month}</span></div>
    <div class="training-session-summary">
      <strong>${esc(session.title)}</strong>
      <span>${hasImage?'🖼️ Image · ':''}${fileCount} fichier${fileCount>1?'s':''}${session.notes?' · explication disponible':''}</span>
    </div>
    <div class="training-session-arrow">›</div>
  </button>`;
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
  state.trainingSessions=trainingSessionGroups(state.trainingDocs);

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
        <p class="muted">Ajoute l'explication de la séance et son image / document.</p>
        <button class="btn primary" id="uploadTrainingBtn">+ Ajouter une séance</button>
      </div>
    </div>

    <div class="section-head">
      <div><h3>Séances d'entraînement</h3><span class="muted">${state.trainingSessions.length} séance(s) enregistrée(s)</span></div>
    </div>
    <div class="training-session-list">
      ${state.trainingSessions.length
        ? state.trainingSessions.map(trainingSessionListItem).join('')
        : '<div class="empty panel">Aucune séance enregistrée pour le moment.</div>'}
    </div>

    <details class="programme-compact">
      <summary>Voir le programme annuel</summary>
      <div class="programme-strip">
        ${programme.map(p=>`<div class="programme-card ${p.month_num===month?'current':''}">
          <small>${esc(p.month_label)}</small>
          <strong>${esc(p.theme)}</strong>
          <span>${esc(p.objectives)}</span>
        </div>`).join('')}
      </div>
    </details>`;

  $('#uploadTrainingBtn').onclick=trainingUploadModal;
  $$('[data-training-session]').forEach(b=>b.onclick=()=>openTrainingSession(b.dataset.trainingSession));
}

async function openTrainingSession(key){
  const session=(state.trainingSessions||[]).find(s=>s.key===key);
  if(!session)return;

  const files=await Promise.all(session.docs.map(async doc=>{
    const {data,error}=await sb.storage.from('training-files').createSignedUrl(doc.storage_path,60*30);
    return {...doc,signed_url:error?null:data?.signedUrl||null,error:error?.message||null};
  }));

  const images=files.filter(f=>(f.file_type||'').startsWith('image/') && f.signed_url);
  const others=files.filter(f=>!(f.file_type||'').startsWith('image/'));

  openModal(`
    <div class="training-detail-head">
      <div>
        <small>SÉANCE D'ENTRAÎNEMENT</small>
        <h2>${esc(session.title)}</h2>
        <p class="muted">${fmtFullDate(session.session_date)}</p>
      </div>
    </div>

    ${session.notes?`
      <div class="panel training-explanation">
        <h3>Explication de la séance</h3>
        <div class="training-notes-text">${esc(session.notes).replace(/\n/g,'<br>')}</div>
      </div>
    `:''}

    ${images.length?`
      <div class="training-image-gallery">
        ${images.map(img=>`
          <a href="${img.signed_url}" target="_blank" rel="noopener" class="training-image-link">
            <img src="${img.signed_url}" alt="${esc(img.original_name||session.title)}" />
          </a>
        `).join('')}
      </div>
    `:''}

    ${others.length?`
      <div class="panel training-files-panel">
        <h3>Documents</h3>
        <div class="training-detail-files">
          ${others.map(doc=>`
            <div class="training-detail-file">
              <div>
                <strong>${esc(doc.original_name||'Document')}</strong>
                ${doc.error?`<small class="muted">Impossible de générer le lien</small>`:''}
              </div>
              ${doc.signed_url?`<a class="btn secondary small" href="${doc.signed_url}" target="_blank" rel="noopener">Ouvrir</a>`:''}
              <button class="btn danger small" data-training-delete-detail="${doc.id}">Supprimer</button>
            </div>
          `).join('')}
        </div>
      </div>
    `:''}

    ${images.length?`
      <div class="training-image-actions">
        ${images.map(img=>`<button class="btn danger small" data-training-delete-detail="${img.id}">Supprimer ${esc(img.original_name||'image')}</button>`).join('')}
      </div>
    `:''}
  `);

  $$('[data-training-delete-detail]').forEach(b=>b.onclick=async()=>{
    await deleteTrainingDocument(b.dataset.trainingDeleteDetail,true);
    closeModal();
    await renderTrainingHub();
  });
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
      <label>Explication / contenu de la séance
        <textarea id="trainingNotes" class="training-long-text" placeholder="Décris ici les exercices, consignes, durées, variantes, matériel…"></textarea>
      </label>
      <label>Image / documents
        <input id="trainingFiles" type="file" multiple required accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
      </label>
      <div class="notice">Tu peux ajouter l'image récapitulative de la séance et, si besoin, plusieurs documents.</div>
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

async function deleteTrainingDocument(id,skipRender=false){
  const doc=state.trainingDocs.find(x=>x.id===id);
  if(!doc||!confirm(`Supprimer "${doc.original_name}" ?`))return false;
  const {error:storageError}=await sb.storage.from('training-files').remove([doc.storage_path]);
  if(storageError){toast(storageError.message,false);return false}
  const {error}=await sb.from('training_documents').delete().eq('id',id);
  if(error){toast(error.message,false);return false}
  toast('Fichier supprimé');
  if(!skipRender)await renderTrainingHub();
  return true;
}

async function renderPlayers(){
  if(!isCoach()){go('dashboard');return;}
  await loadCore();

  const {data:links}=await sb.from('player_guardians').select('player_id,user_id,profiles(full_name)');
  const counts={};
  (links||[]).forEach(l=>counts[l.player_id]=(counts[l.player_id]||0)+1);

  $('#content').innerHTML=`
    <div class="section-head">
      <h3>Effectif U10</h3>
      <button class="btn primary small" id="addPlayer">+ Joueur</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Joueur</th><th>N°</th><th>Parents liés</th><th>Code parent</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.players.map(p=>`<tr>
            <td><strong>${esc(p.first_name)} ${esc(p.last_name||'')}</strong></td>
            <td>${p.number||'—'}</td>
            <td>${counts[p.id]||0}</td>
            <td><button class="btn ghost small" data-pin="${p.id}">Générer / remplacer</button></td>
            <td>
              <div class="event-actions">
                <button class="btn secondary small" data-edit-player="${p.id}">Modifier</button>
                <button class="btn danger small" data-disable="${p.id}">Désactiver</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  $('#addPlayer').onclick=()=>playerModal();
  $$('[data-edit-player]').forEach(b=>b.onclick=()=>playerModal(state.players.find(p=>p.id===b.dataset.editPlayer)));
  $$('[data-pin]').forEach(b=>b.onclick=()=>generatePin(b.dataset.pin));
  $$('[data-disable]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Désactiver ce joueur ?'))return;
    const {error}=await sb.from('players').update({active:false}).eq('id',b.dataset.disable);
    if(error)return toast(error.message,false);
    await loadCore();
    await renderPlayers();
  });
}

function playerModal(player=null){
  const editing=!!player;
  openModal(`
    <h2>${editing?'Modifier le joueur':'Ajouter un joueur'}</h2>
    <form id="playerForm" class="stack">
      <label>Prénom
        <input id="plFirst" required value="${esc(player?.first_name||'')}" />
      </label>
      <label>Nom (optionnel)
        <input id="plLast" value="${esc(player?.last_name||'')}" />
      </label>
      <label>Numéro (optionnel)
        <input id="plNumber" type="number" min="0" max="99" value="${player?.number??''}" />
      </label>
      ${editing?'<div class="notice">Si vous corrigez le prénom, le nom affiché dans la liste de connexion parent sera également mis à jour automatiquement.</div>':''}
      <button class="btn primary">${editing?'Enregistrer les modifications':'Ajouter'}</button>
    </form>`);

  $('#playerForm').onsubmit=async e=>{
    e.preventDefault();
    const btn=e.submitter;
    const payload={
      first_name:$('#plFirst').value.trim(),
      last_name:$('#plLast').value.trim()||null,
      number:$('#plNumber').value?Number($('#plNumber').value):null
    };
    if(!payload.first_name)return toast('Le prénom est obligatoire.',false);

    setBusy(btn,true);
    let error;
    if(editing){
      ({error}=await sb.from('players').update(payload).eq('id',player.id).eq('team_id',state.team.id));
    }else{
      ({error}=await sb.from('players').insert({team_id:state.team.id,...payload}));
    }
    setBusy(btn,false);

    if(error)return toast(error.message,false);
    closeModal();
    toast(editing?'Joueur modifié':'Joueur ajouté');
    await loadCore();
    await renderPlayers();
    // La liste de connexion est aussi rafraîchie immédiatement sur ce téléphone.
    await loadLoginIdentityOptions();
  };
}

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


function pollDateLabel(value){
  if(!value)return 'Sans date limite';
  const d=new Date(value);
  return new Intl.DateTimeFormat('fr-BE',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);
}
function pollIsOpen(p){
  if(p.status!=='open')return false;
  if(!p.closes_at)return true;
  return new Date(p.closes_at).getTime()>=Date.now();
}

async function fetchPollBundle(){
  const {data:polls,error}=await sb.from('polls')
    .select('*,poll_options(*)')
    .eq('team_id',state.team.id)
    .order('created_at',{ascending:false});
  if(error){toast(error.message,false);return []}
  return (polls||[]).map(p=>({...p,poll_options:(p.poll_options||[]).sort((a,b)=>a.position-b.position)}));
}

async function renderCoachPolls(){
  const polls=await fetchPollBundle();
  $('#content').innerHTML=`
    <div class="section-head">
      <div><h3>Sondages</h3><span class="muted">Les sondages restent classés du plus récent au plus ancien.</span></div>
      <button class="btn primary" id="newPoll">+ Nouveau sondage</button>
    </div>
    <div class="poll-list">
      ${polls.length?polls.map(p=>coachPollCard(p)).join(''):'<div class="empty panel">Aucun sondage créé.</div>'}
    </div>`;
  $('#newPoll').onclick=()=>pollModal();
  $$('[data-poll-open]').forEach(b=>b.onclick=()=>openCoachPoll(b.dataset.pollOpen,polls.find(p=>p.id===b.dataset.pollOpen)));
  $$('[data-poll-edit]').forEach(b=>b.onclick=()=>pollModal(polls.find(p=>p.id===b.dataset.pollEdit)));
  $$('[data-poll-close]').forEach(b=>b.onclick=()=>closePoll(b.dataset.pollClose));
  $$('[data-poll-delete]').forEach(b=>b.onclick=()=>deletePoll(b.dataset.pollDelete,polls.find(p=>p.id===b.dataset.pollDelete)));
}

function coachPollCard(p){
  const open=pollIsOpen(p);
  return `<div class="poll-card">
    <div class="poll-card-head">
      <div>
        <small>${fmtFullDate(p.created_at.slice(0,10))}</small>
        <h3>${esc(p.title)}</h3>
      </div>
      <span class="poll-status ${open?'open':'closed'}">${open?'Ouvert':'Clôturé'}</span>
    </div>
    <p>${esc(p.question)}</p>
    <div class="poll-meta">
      <span>${p.allow_multiple?'Choix multiples':'Choix unique'}</span>
      <span>${p.closes_at?'Clôture : '+pollDateLabel(p.closes_at):'Sans date limite'}</span>
      <span>${p.poll_options.length} choix</span>
    </div>
    <div class="event-actions">
      <button class="btn secondary small" data-poll-open="${p.id}">Résultats</button>
      <button class="btn ghost small" data-poll-edit="${p.id}">Modifier</button>
      ${open?`<button class="btn danger small" data-poll-close="${p.id}">Clôturer</button>`:''}
      <button class="btn danger small" data-poll-delete="${p.id}">Supprimer</button>
    </div>
  </div>`;
}

function pollModal(p=null){
  const options=(p?.poll_options?.length?p.poll_options.map(x=>x.label):['','']);
  const dt=p?.closes_at ? new Date(p.closes_at) : null;
  const localClose=dt ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}T${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` : '';

  openModal(`<h2>${p?'Modifier':'Créer'} un sondage</h2>
    <form id="pollForm" class="stack">
      <label>Titre<input id="pollTitle" required value="${esc(p?.title||'')}" placeholder="Ex. Tournoi du 15 novembre" /></label>
      <label>Question<textarea id="pollQuestion" required placeholder="Ex. Votre enfant est-il disponible ?">${esc(p?.question||'')}</textarea></label>
      <label>Date / heure limite (optionnel)<input id="pollCloseAt" type="datetime-local" value="${localClose}" /></label>
      <label class="check-label"><input id="pollMultiple" type="checkbox" ${p?.allow_multiple?'checked':''} /> Autoriser plusieurs choix</label>
      <div>
        <div class="section-head compact"><strong>Choix proposés</strong><button type="button" class="btn ghost small" id="addPollOption">+ Choix</button></div>
        <div id="pollOptions" class="stack">
          ${options.map((o,i)=>`<div class="poll-option-edit"><input class="poll-option-input" value="${esc(o)}" placeholder="Choix ${i+1}" required /><button type="button" class="btn danger small poll-remove-option">×</button></div>`).join('')}
        </div>
      </div>
      <button class="btn primary" type="submit">${p?'Enregistrer les modifications':'Publier le sondage'}</button>
    </form>`);

  const bindRemove=()=>$$('.poll-remove-option').forEach(b=>b.onclick=()=>{
    if($$('.poll-option-input').length<=2)return toast('Il faut au moins 2 choix.',false);
    b.parentElement.remove();
  });
  bindRemove();
  $('#addPollOption').onclick=()=>{
    const wrap=document.createElement('div');
    wrap.className='poll-option-edit';
    wrap.innerHTML=`<input class="poll-option-input" placeholder="Nouveau choix" required /><button type="button" class="btn danger small poll-remove-option">×</button>`;
    $('#pollOptions').appendChild(wrap);bindRemove();
  };

  $('#pollForm').onsubmit=async e=>{
    e.preventDefault();
    const btn=e.submitter;
    const labels=$$('.poll-option-input').map(i=>i.value.trim()).filter(Boolean);
    if(labels.length<2)return toast('Ajoutez au moins 2 choix.',false);
    setBusy(btn,true);

    const payload={
      team_id:state.team.id,
      title:$('#pollTitle').value.trim(),
      question:$('#pollQuestion').value.trim(),
      closes_at:$('#pollCloseAt').value?new Date($('#pollCloseAt').value).toISOString():null,
      allow_multiple:$('#pollMultiple').checked,
      status:p?.status||'open',
      created_by:state.user.id,
      updated_at:new Date().toISOString()
    };

    let pollId=p?.id;
    if(p){
      const {error}=await sb.from('polls').update(payload).eq('id',p.id);
      if(error){setBusy(btn,false);return toast(error.message,false)}
      const {data:responses}=await sb.from('poll_responses').select('id').eq('poll_id',p.id).limit(1);
      if(responses?.length){
        // Si des réponses existent, on conserve les options déjà créées pour éviter de casser les votes.
        const oldLabels=(p.poll_options||[]).map(x=>x.label);
        if(JSON.stringify(oldLabels)!==JSON.stringify(labels)){
          setBusy(btn,false);
          return toast("Des réponses existent déjà : les choix ne peuvent plus être modifiés. Vous pouvez modifier le titre, la question ou la date.",false);
        }
      }else{
        await sb.from('poll_options').delete().eq('poll_id',p.id);
        const {error:optErr}=await sb.from('poll_options').insert(labels.map((label,i)=>({poll_id:p.id,label,position:i+1})));
        if(optErr){setBusy(btn,false);return toast(optErr.message,false)}
      }
    }else{
      const {data,error}=await sb.from('polls').insert(payload).select().single();
      if(error){setBusy(btn,false);return toast(error.message,false)}
      pollId=data.id;
      const {error:optErr}=await sb.from('poll_options').insert(labels.map((label,i)=>({poll_id:pollId,label,position:i+1})));
      if(optErr){setBusy(btn,false);return toast(optErr.message,false)}
    }

    setBusy(btn,false);closeModal();toast('Sondage enregistré');await renderCoachPolls();
  };
}

async function deletePoll(id,poll=null){
  const title=poll?.title||'ce sondage';
  if(!confirm(`Supprimer définitivement "${title}" ?\n\nLes réponses déjà enregistrées seront également supprimées. Cette action est irréversible.`))return;

  // Suppression explicite des réponses et choix pour rester compatible
  // même si les relations de la base ne sont pas toutes en ON DELETE CASCADE.
  const {error:respErr}=await sb.from('poll_responses').delete().eq('poll_id',id);
  if(respErr)return toast(`Suppression impossible : ${respErr.message}`,false);

  const {error:optErr}=await sb.from('poll_options').delete().eq('poll_id',id);
  if(optErr)return toast(`Suppression impossible : ${optErr.message}`,false);

  const {error}=await sb.from('polls').delete().eq('id',id).eq('team_id',state.team.id);
  if(error)return toast(`Suppression impossible : ${error.message}`,false);

  toast('Sondage supprimé');
  await renderCoachPolls();
}

async function closePoll(id){
  if(!confirm('Clôturer ce sondage ? Les parents ne pourront plus modifier leur réponse.'))return;
  const {error}=await sb.from('polls').update({status:'closed',updated_at:new Date().toISOString()}).eq('id',id);
  if(error)return toast(error.message,false);
  toast('Sondage clôturé');renderCoachPolls();
}

async function openCoachPoll(id,poll){
  const [{data:responses,error},{data:players}]=await Promise.all([
    sb.from('poll_responses').select('player_id,option_id,created_at').eq('poll_id',id),
    sb.from('players').select('id,first_name,last_name').eq('team_id',state.team.id).eq('active',true)
  ]);
  if(error)return toast(error.message,false);
  const res=responses||[];
  const pmap=new Map((players||[]).map(p=>[p.id,p]));
  const counts={};
  poll.poll_options.forEach(o=>counts[o.id]=0);
  res.forEach(r=>counts[r.option_id]=(counts[r.option_id]||0)+1);
  const answered=new Set(res.map(r=>r.player_id));

  openModal(`<h2>${esc(poll.title)}</h2>
    <p>${esc(poll.question)}</p>
    <div class="poll-results">
      ${poll.poll_options.map(o=>{
        const names=res.filter(r=>r.option_id===o.id).map(r=>pmap.get(r.player_id)?.first_name).filter(Boolean);
        return `<div class="poll-result-row">
          <div class="poll-result-top"><strong>${esc(o.label)}</strong><span>${counts[o.id]} réponse(s)</span></div>
          <div class="poll-result-bar"><span style="width:${state.players.length?Math.min(100,(counts[o.id]/state.players.length)*100):0}%"></span></div>
          <small>${names.length?esc(names.join(', ')):'Aucun joueur'}</small>
        </div>`;
      }).join('')}
    </div>
    <div class="panel poll-answer-summary">
      <strong>${answered.size} / ${state.players.length}</strong>
      <span>joueur(s) ont répondu</span>
    </div>
    <div class="panel">
      <strong>Sans réponse</strong>
      <p class="muted">${state.players.filter(p=>!answered.has(p.id)).map(p=>esc(p.first_name)).join(', ')||'Tout le monde a répondu.'}</p>
    </div>`);
}

async function renderParentPolls(){
  const pid=state.parentPlayerId;
  const child=state.players.find(p=>p.id===pid);
  if(!pid){
    $('#content').innerHTML='<div class="notice warning">Aucun enfant lié à cet accès.</div>';return;
  }

  const polls=await fetchPollBundle();
  let responses=[];
  if(polls.length){
    const {data,error}=await sb.from('poll_responses')
      .select('poll_id,option_id')
      .eq('player_id',pid)
      .in('poll_id',polls.map(p=>p.id));
    if(error)toast(error.message,false);
    responses=data||[];
  }
  const byPoll=new Map();
  responses.forEach(r=>{
    if(!byPoll.has(r.poll_id))byPoll.set(r.poll_id,new Set());
    byPoll.get(r.poll_id).add(r.option_id);
  });

  $('#content').innerHTML=`
    <div class="notice"><strong>${esc(child?.first_name||'Votre enfant')}</strong> · les réponses ci-dessous concernent uniquement votre enfant.</div>
    <div class="poll-list">
      ${polls.length?polls.map(p=>parentPollCard(p,byPoll.get(p.id)||new Set())).join(''):'<div class="empty panel">Aucun sondage pour le moment.</div>'}
    </div>`;

  $$('[data-parent-poll]').forEach(b=>b.onclick=()=>openParentPoll(
    polls.find(p=>p.id===b.dataset.parentPoll),
    pid,
    byPoll.get(b.dataset.parentPoll)||new Set()
  ));
}

function parentPollCard(p,selected){
  const open=pollIsOpen(p);
  const answered=selected.size>0;
  return `<div class="poll-card parent">
    <div class="poll-card-head">
      <div><small>${fmtFullDate(p.created_at.slice(0,10))}</small><h3>${esc(p.title)}</h3></div>
      <span class="poll-status ${open?'open':'closed'}">${open?'Ouvert':'Clôturé'}</span>
    </div>
    <p>${esc(p.question)}</p>
    <div class="poll-meta">
      <span>${answered?'✓ Réponse enregistrée':'En attente de réponse'}</span>
      <span>${p.closes_at?'Jusqu’au '+pollDateLabel(p.closes_at):'Sans date limite'}</span>
    </div>
    <button class="btn ${answered?'secondary':'primary'} full" data-parent-poll="${p.id}">${answered?'Voir / modifier ma réponse':'Répondre au sondage'}</button>
  </div>`;
}

async function openParentPoll(poll,pid,selected){
  const open=pollIsOpen(poll);
  openModal(`<h2>${esc(poll.title)}</h2>
    <p>${esc(poll.question)}</p>
    ${poll.closes_at?`<p class="muted">Date limite : ${pollDateLabel(poll.closes_at)}</p>`:''}
    <form id="parentPollForm" class="stack">
      <div class="parent-poll-options">
        ${poll.poll_options.map(o=>`
          <label class="parent-poll-option ${selected.has(o.id)?'selected':''}">
            <input type="${poll.allow_multiple?'checkbox':'radio'}" name="pollOption" value="${o.id}" ${selected.has(o.id)?'checked':''} ${open?'':'disabled'} />
            <span>${esc(o.label)}</span>
          </label>`).join('')}
      </div>
      ${open?'<button class="btn primary" type="submit">Enregistrer ma réponse</button>':'<div class="notice">Ce sondage est clôturé. La réponse n’est plus modifiable.</div>'}
    </form>`);
  $$('.parent-poll-option input').forEach(i=>i.onchange=()=>{
    $$('.parent-poll-option').forEach(l=>l.classList.toggle('selected',l.querySelector('input').checked));
  });
  if(open){
    $('#parentPollForm').onsubmit=async e=>{
      e.preventDefault();
      const btn=e.submitter;
      const ids=$$('.parent-poll-option input:checked').map(i=>i.value);
      if(!ids.length)return toast('Choisissez au moins une réponse.',false);
      setBusy(btn,true);

      const {error:delErr}=await sb.from('poll_responses').delete().eq('poll_id',poll.id).eq('player_id',pid);
      if(delErr){setBusy(btn,false);return toast(delErr.message,false)}

      const rows=ids.map(option_id=>({
        poll_id:poll.id,
        option_id,
        player_id:pid,
        answered_by:state.user.id
      }));
      const {error}=await sb.from('poll_responses').insert(rows);
      setBusy(btn,false);
      if(error)return toast(error.message,false);
      closeModal();toast('Réponse enregistrée');await renderParentPolls();
    };
  }
}


async function fetchLostFoundItems(){
  const {data,error}=await sb.from('lost_found_items')
    .select('*')
    .eq('team_id',state.team.id)
    .order('status',{ascending:true})
    .order('created_at',{ascending:false});
  if(error){toast(error.message,false);return []}

  const items=data||[];
  await Promise.all(items.map(async item=>{
    const {data:signed,error:signErr}=await sb.storage.from('lost-found').createSignedUrl(item.photo_path,60*30);
    item.photo_url=signErr?null:signed?.signedUrl||null;
  }));
  return items;
}

async function renderCoachLostFound(){
  const items=await fetchLostFoundItems();
  let claims=[];
  if(items.length){
    const {data,error}=await sb.from('lost_found_claims')
      .select('item_id,player_id,created_at')
      .in('item_id',items.map(x=>x.id));
    if(error)toast(error.message,false);
    claims=data||[];
  }

  const playerMap=new Map(state.players.map(p=>[p.id,p]));
  const claimsByItem=new Map();
  claims.forEach(c=>{
    if(!claimsByItem.has(c.item_id))claimsByItem.set(c.item_id,[]);
    claimsByItem.get(c.item_id).push(c);
  });

  const active=items.filter(x=>x.status!=='returned');
  const returned=items.filter(x=>x.status==='returned');

  $('#content').innerHTML=`
    <div class="section-head">
      <div>
        <h3>Objets trouvés</h3>
        <span class="muted">Photographiez les affaires oubliées. Les parents peuvent les réclamer directement.</span>
      </div>
      <button class="btn primary" id="addLostFound">+ Ajouter des photos</button>
    </div>

    <div class="lostfound-grid">
      ${active.length?active.map(item=>coachLostFoundCard(item,claimsByItem.get(item.id)||[],playerMap)).join(''):
        '<div class="empty panel">Aucun objet en attente.</div>'}
    </div>

    ${returned.length?`
      <details class="programme-compact lostfound-returned">
        <summary>Objets rendus (${returned.length})</summary>
        <div class="lostfound-grid">
          ${returned.map(item=>coachLostFoundCard(item,claimsByItem.get(item.id)||[],playerMap,true)).join('')}
        </div>
      </details>`:''}
  `;

  $('#addLostFound').onclick=lostFoundUploadModal;
  $$('[data-lostfound-return]').forEach(b=>b.onclick=()=>markLostFoundReturned(b.dataset.lostfoundReturn));
  $$('[data-lostfound-reopen]').forEach(b=>b.onclick=()=>markLostFoundOpen(b.dataset.lostfoundReopen));
  $$('[data-lostfound-delete]').forEach(b=>b.onclick=()=>deleteLostFoundItem(b.dataset.lostfoundDelete));
}

function coachLostFoundCard(item,claims,playerMap,returned=false){
  const names=claims.map(c=>playerMap.get(c.player_id)?.first_name).filter(Boolean);
  return `<div class="lostfound-card ${returned?'returned':''}">
    <div class="lostfound-photo">
      ${item.photo_url?`<img src="${item.photo_url}" alt="Objet trouvé" />`:'<div class="lostfound-no-photo">Photo indisponible</div>'}
      ${returned?'<span class="lostfound-status returned">Rendu</span>':'<span class="lostfound-status">À récupérer</span>'}
    </div>
    <div class="lostfound-body">
      <div class="lostfound-date">${fmtFullDate((item.found_at||item.created_at||'').slice(0,10))}</div>
      ${item.description?`<p>${esc(item.description)}</p>`:''}
      <div class="lostfound-claims">
        <small>Réclamé par</small>
        ${names.length
          ? `<div class="lostfound-player-names">${names.map(n=>`<span>👤 ${esc(n)}</span>`).join('')}</div>`
          : '<span class="muted">Personne pour le moment</span>'}
      </div>
      <div class="lostfound-actions">
        ${returned
          ? `<button class="btn ghost small" data-lostfound-reopen="${item.id}">Remettre en attente</button>`
          : `<button class="btn secondary small" data-lostfound-return="${item.id}">✓ Objet rendu</button>`}
        <button class="btn danger small" data-lostfound-delete="${item.id}">Supprimer</button>
      </div>
    </div>
  </div>`;
}

function lostFoundUploadModal(){
  openModal(`
    <h2>Ajouter des objets trouvés</h2>
    <form id="lostFoundForm" class="stack">
      <label>Date
        <input id="lostFoundDate" type="date" value="${todayISO()}" required />
      </label>
      <label>Petite description (optionnel)
        <input id="lostFoundDescription" placeholder="Ex. veste noire, gourde, bonnet…" />
      </label>
      <label>Photos
        <input id="lostFoundFiles" type="file" accept="image/*" capture="environment" multiple required />
      </label>
      <div class="notice">Vous pouvez prendre une photo directement avec le téléphone ou sélectionner plusieurs photos de la galerie. Chaque photo créera un objet séparé.</div>
      <button class="btn primary" type="submit">Ajouter les objets</button>
    </form>
  `);

  $('#lostFoundForm').onsubmit=async e=>{
    e.preventDefault();
    const btn=e.submitter;
    const files=[...$('#lostFoundFiles').files];
    if(!files.length)return toast('Ajoutez au moins une photo.',false);
    setBusy(btn,true,'Envoi…');

    const foundAt=$('#lostFoundDate').value;
    const description=$('#lostFoundDescription').value.trim()||null;

    for(const file of files){
      const safe=(file.name||'photo.jpg').replace(/[^a-zA-Z0-9._-]+/g,'-');
      const path=`${state.team.id}/${foundAt}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;

      const {error:uploadError}=await sb.storage.from('lost-found').upload(path,file,{
        upsert:false,
        contentType:file.type||'image/jpeg'
      });
      if(uploadError){
        setBusy(btn,false);
        return toast(`Envoi de la photo impossible : ${uploadError.message}`,false);
      }

      const {error:insertError}=await sb.from('lost_found_items').insert({
        team_id:state.team.id,
        photo_path:path,
        description,
        found_at:foundAt,
        created_by:state.user.id
      });
      if(insertError){
        await sb.storage.from('lost-found').remove([path]);
        setBusy(btn,false);
        return toast(insertError.message,false);
      }
    }

    setBusy(btn,false);
    closeModal();
    toast(`${files.length} objet(s) ajouté(s)`);
    await renderCoachLostFound();
  };
}

async function markLostFoundReturned(id){
  const {error}=await sb.from('lost_found_items')
    .update({status:'returned',returned_at:new Date().toISOString()})
    .eq('id',id)
    .eq('team_id',state.team.id);
  if(error)return toast(error.message,false);
  toast('Objet marqué comme rendu');
  await renderCoachLostFound();
}

async function markLostFoundOpen(id){
  const {error}=await sb.from('lost_found_items')
    .update({status:'open',returned_at:null})
    .eq('id',id)
    .eq('team_id',state.team.id);
  if(error)return toast(error.message,false);
  toast('Objet remis en attente');
  await renderCoachLostFound();
}

async function deleteLostFoundItem(id){
  const item=(await sb.from('lost_found_items').select('id,photo_path').eq('id',id).eq('team_id',state.team.id).maybeSingle()).data;
  if(!item)return;
  if(!confirm("Supprimer définitivement cet objet trouvé et sa photo ?"))return;

  const {error:claimErr}=await sb.from('lost_found_claims').delete().eq('item_id',id);
  if(claimErr)return toast(claimErr.message,false);

  const {error}=await sb.from('lost_found_items').delete().eq('id',id).eq('team_id',state.team.id);
  if(error)return toast(error.message,false);

  await sb.storage.from('lost-found').remove([item.photo_path]).catch(()=>{});
  toast('Objet supprimé');
  await renderCoachLostFound();
}

async function renderParentLostFound(){
  const pid=state.parentPlayerId;
  const child=state.players.find(p=>p.id===pid);
  if(!pid){
    $('#content').innerHTML='<div class="notice warning">Aucun enfant lié à cet accès.</div>';
    return;
  }

  const items=(await fetchLostFoundItems()).filter(x=>x.status!=='returned');
  let claims=[];
  if(items.length){
    const {data,error}=await sb.from('lost_found_claims')
      .select('item_id,player_id')
      .eq('player_id',pid)
      .in('item_id',items.map(x=>x.id));
    if(error)toast(error.message,false);
    claims=data||[];
  }
  const claimed=new Set(claims.map(x=>x.item_id));

  $('#content').innerHTML=`
    <div class="notice">
      <strong>Objets trouvés</strong><br>
      Si vous reconnaissez une affaire de <strong>${esc(child?.first_name||'votre enfant')}</strong>, appuyez simplement sur <strong>« C'est à moi »</strong>. Les coachs verront automatiquement le prénom de votre enfant.
    </div>

    <div class="lostfound-grid parent-lostfound-grid">
      ${items.length?items.map(item=>parentLostFoundCard(item,claimed.has(item.id))).join(''):
        '<div class="empty panel">Aucun objet trouvé en attente pour le moment.</div>'}
    </div>
  `;

  $$('[data-lostfound-claim]').forEach(b=>b.onclick=()=>claimLostFoundItem(b.dataset.lostfoundClaim,pid));
  $$('[data-lostfound-unclaim]').forEach(b=>b.onclick=()=>unclaimLostFoundItem(b.dataset.lostfoundUnclaim,pid));
}

function parentLostFoundCard(item,isClaimed){
  return `<div class="lostfound-card parent">
    <div class="lostfound-photo">
      ${item.photo_url?`<img src="${item.photo_url}" alt="Objet trouvé" />`:'<div class="lostfound-no-photo">Photo indisponible</div>'}
    </div>
    <div class="lostfound-body">
      <div class="lostfound-date">Trouvé le ${fmtFullDate((item.found_at||item.created_at||'').slice(0,10))}</div>
      ${item.description?`<p>${esc(item.description)}</p>`:''}
      ${isClaimed
        ? `<div class="notice success lostfound-claimed">✓ Vous avez indiqué que cet objet appartient à votre enfant.</div>
           <button class="btn ghost full" data-lostfound-unclaim="${item.id}">Annuler ma réponse</button>`
        : `<button class="btn primary full lostfound-mine-btn" data-lostfound-claim="${item.id}">🙋 C'est à moi</button>`}
    </div>
  </div>`;
}

async function claimLostFoundItem(itemId,playerId){
  const {error}=await sb.from('lost_found_claims').insert({
    item_id:itemId,
    player_id:playerId,
    claimed_by:state.user.id
  });
  if(error){
    if(String(error.message||'').toLowerCase().includes('duplicate')){
      return renderParentLostFound();
    }
    return toast(error.message,false);
  }
  toast('Les coachs ont été prévenus');
  await renderParentLostFound();
}

async function unclaimLostFoundItem(itemId,playerId){
  const {error}=await sb.from('lost_found_claims')
    .delete()
    .eq('item_id',itemId)
    .eq('player_id',playerId);
  if(error)return toast(error.message,false);
  toast('Réponse annulée');
  await renderParentLostFound();
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

// === v26 : mises à jour ciblées Coach / Parent =============================
let updateCheckTimer=null;

function currentUpdateRole(){
  return isCoach()?'coach':'parent';
}
function updateSeenKey(role){
  return `u10-release-seen-${role}`;
}
function hideUpdateBanner(){
  $('#appUpdateBanner')?.classList.add('hidden');
}
function showUpdateBanner(role,releaseInfo){
  const banner=$('#appUpdateBanner');
  if(!banner)return;
  const roleInfo=releaseInfo?.roles?.[role];
  if(!roleInfo)return;

  $('#appUpdateText').innerHTML=`
    <strong>Nouvelle version disponible</strong>
    <span>${esc(roleInfo.message||"Une mise à jour de l'application est disponible.")}</span>`;
  banner.classList.remove('hidden');

  $('#appUpdateLater').onclick=()=>hideUpdateBanner();
  $('#appUpdateNow').onclick=async()=>{
    const btn=$('#appUpdateNow');
    setBusy(btn,true,'Mise à jour…');
    try{
      localStorage.setItem(updateSeenKey(role),String(roleInfo.version));
      if('serviceWorker' in navigator){
        const reg=await navigator.serviceWorker.getRegistration();
        if(reg){
          await reg.update().catch(()=>{});
          await new Promise(r=>setTimeout(r,900));
        }
      }
      const u=new URL(location.href);
      u.searchParams.set('appupdate',Date.now());
      location.replace(u.toString());
    }catch(err){
      setBusy(btn,false);
      toast("La mise à jour n'a pas pu être lancée automatiquement. Fermez puis rouvrez l'application.",false);
    }
  };
}

async function checkRoleSpecificUpdate({initial=false}={}){
  if(!state.identity || !state.membership)return;
  const role=currentUpdateRole();
  try{
    const response=await fetch(`./release.json?t=${Date.now()}`,{
      cache:'no-store',
      headers:{'Cache-Control':'no-cache'}
    });
    if(!response.ok)return;
    const info=await response.json();
    const target=Number(info?.roles?.[role]?.version||0);
    if(!target)return;

    const key=updateSeenKey(role);
    const raw=localStorage.getItem(key);
    if(raw===null){
      localStorage.setItem(key,String(target));
      return;
    }

    const seen=Number(raw||0);
    if(target>seen){
      showUpdateBanner(role,info);
    }else if(!initial){
      hideUpdateBanner();
    }
  }catch(err){
    console.warn('Vérification mise à jour',err);
  }
}

async function registerAndWatchUpdates(){
  if(!('serviceWorker' in navigator))return;
  try{
    const reg=await navigator.serviceWorker.register('./sw.js');
    await reg.update().catch(()=>{});
    setTimeout(()=>checkRoleSpecificUpdate({initial:true}),1800);

    clearInterval(updateCheckTimer);
    updateCheckTimer=setInterval(()=>checkRoleSpecificUpdate(),5*60*1000);

    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible'){
        reg.update().catch(()=>{});
        checkRoleSpecificUpdate();
      }
    });
  }catch(err){
    console.warn('Service worker',err);
  }
}

window.addEventListener('load',registerAndWatchUpdates);
init();
