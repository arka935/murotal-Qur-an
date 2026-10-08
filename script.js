const API='https://equran.id/api/v2';
const audioEl=document.querySelector('#audio');
const $=s=>document.querySelector(s);
const state={
  surahs:[], current:null, ayahIndex:0, qari:'06', dossariYear:'modern',
  speed:1, repeat:'off', continuous:true, arabicSize:31, showLatin:true, showTranslation:true,
  favorites:JSON.parse(localStorage.getItem('mq_favorites')||'[]'),
  read:JSON.parse(localStorage.getItem('mq_read')||'[]'),
  last:JSON.parse(localStorage.getItem('mq_last')||'null'),
  theme:localStorage.getItem('mq_theme')||'auto'
};
const qaris=[
  ['01','Abdullah Al-Juhany'],['02','Abdul Muhsin Al-Qasim'],['03','Abdurrahman As-Sudais'],
  ['04','Ibrahim Al-Dossari'],['05','Misyari Rasyid Al-Afasi'],['06','Syekh Yasser Ad-Dosari']
];
const legacyDossariBase='https://cdn.mp3quran.net/audio/yasser-dosari/r1/';
let cloudQaris=[];
let cloudAudioRetry=false;
const QARI_API='https://api.alquran.cloud/v1/edition/format/audio';

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function esc(s=''){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function normalize(s=''){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function formatTime(s){if(!Number.isFinite(s))return '0:00';return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`}

function applyTheme(mode=state.theme){
  state.theme=mode; localStorage.setItem('mq_theme',mode);
  const dark=mode==='dark'||(mode==='auto'&&matchMedia('(prefers-color-scheme:dark)').matches);
  document.body.classList.toggle('dark',dark);
  $('#themeBtn').textContent=dark?'☀️':'🌙';
}
function initSettings(){
  qaris.forEach(([id,name])=>$('#qariSelect').insertAdjacentHTML('beforeend',`<option value="${id}">${name}</option>`));
  $('#qariSelect').value=state.qari;
  $('#dossariYear').value=state.dossariYear;
  $('#speedSelect').value=state.speed;
  $('#repeatSelect').value=state.repeat;
  $('#continuousToggle').checked=state.continuous;
  $('#themeSelect').value=state.theme;
  toggleDossari();
  applyTheme();
  loadCloudQaris();
}
function toggleDossari(){
  const v=$('#qariSelect').value;
  const selected=$('#qariSelect').selectedOptions[0]?.textContent||'';
  $('#dossariOptions').classList.toggle('hidden',!(v==='06'||/dosari|dossari/i.test(selected)));
}
async function loadCloudQaris(){
  try{
    const cached=localStorage.getItem('mq_cloud_qaris');
    const list=cached?JSON.parse(cached):await (await fetch(QARI_API,{cache:'no-store'})).json();
    cloudQaris=(list.data||[]).filter(x=>x.identifier&&x.name&&x.type==='versebyverse').sort((a,b)=>String(a.englishName||a.name).localeCompare(String(b.englishName||b.name)));
    localStorage.setItem('mq_cloud_qaris',JSON.stringify(cloudQaris));
    const current=state.qari;
    const select=$('#qariSelect');
    const group=document.createElement('optgroup'); group.label='🌍 Qari global • Al Quran Cloud';
    cloudQaris.forEach(q=>{
      const opt=document.createElement('option');
      opt.value=`cloud:${q.identifier}`;
      opt.textContent=`${q.englishName||q.name}${q.type?` • ${q.type}`:''}`;
      group.appendChild(opt);
    });
    select.appendChild(group);
    select.value=[...select.options].some(o=>o.value===current)?current:'06';
    toggleDossari();
  }catch(e){
    console.warn('Daftar qari global gagal dimuat',e);
  }
}

async function fetchJSON(url){
  const r=await fetch(url,{cache:'force-cache'});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const j=await r.json();
  return j.data??j;
}
async function loadSurahs(){
  try{
    const cached=sessionStorage.getItem('mq_surahs');
    state.surahs=cached?JSON.parse(cached):await fetchJSON(`${API}/surat`);
    sessionStorage.setItem('mq_surahs',JSON.stringify(state.surahs));
    renderSurahs();
    if(state.last?.surah) toast(`Terakhir dibaca: ${state.surahs.find(x=>x.nomor==state.last.surah)?.namaLatin||''}`);
  }catch(e){$('#surahGrid').innerHTML='<div class="loading">Gagal memuat daftar surah. Periksa koneksi internet lalu refresh.</div>'}
}
function renderSurahs(list=state.surahs){
  const q=normalize($('#searchInput').value.trim());
  const filtered=list.filter(s=>{
    if(!q)return true;
    return normalize(`${s.nomor} ${s.namaLatin} ${s.nama} ${s.arti}`).includes(q)
  });
  $('#surahGrid').innerHTML=filtered.length?filtered.map(s=>surahCard(s)).join(''):'<div class="loading">Tidak ada surah yang cocok.</div>';
}
function surahCard(s){
  const fav=state.favorites.includes(s.nomor);
  return `<article class="surah-card" data-surah="${s.nomor}">
    <button class="fav-card" data-fav="${s.nomor}" onclick="event.stopPropagation();toggleFavorite(${s.nomor})">${fav?'♥':'♡'}</button>
    <div class="surah-top"><span class="surah-no">${String(s.nomor).padStart(2,'0')}</span><div><h3>${esc(s.namaLatin)}</h3><small>${esc(s.arti)}</small></div></div>
    <div class="arabic-name">${esc(s.nama)}</div>
    <div class="card-meta"><span>${esc(s.tempatTurun||'')}</span><span>${s.jumlahAyat} ayat</span></div>
  </article>`
}
function toggleFavorite(n){
  state.favorites=state.favorites.includes(n)?state.favorites.filter(x=>x!==n):[...state.favorites,n];
  save('mq_favorites',state.favorites); renderSurahs();
  if(state.current?.nomor===n)$('#readerFavorite').textContent=state.favorites.includes(n)?'♥':'♡';
  toast(state.favorites.includes(n)?'Ditambahkan ke favorit':'Dihapus dari favorit');
}

async function openSurah(n, ayah=1){
  try{
    $('#reader').classList.remove('hidden');$('#surahGrid').classList.add('hidden');$('#filters').classList.add('hidden');$('#juzPicker').classList.add('hidden');
    const cached=sessionStorage.getItem(`mq_detail_${n}`);
    state.current=cached?JSON.parse(cached):await fetchJSON(`${API}/surat/${n}`);
    sessionStorage.setItem(`mq_detail_${n}`,JSON.stringify(state.current));
    state.ayahIndex=Math.max(0,Math.min((ayah||1)-1,state.current.ayat.length-1));
    renderReader();
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){toast('Detail surah gagal dimuat. Coba lagi.')}
}
function renderReader(){
  const s=state.current;
  $('#readerNumber').textContent=String(s.nomor).padStart(2,'0');
  $('#readerPlace').textContent=(s.tempatTurun||'').toUpperCase();
  $('#readerTitle').textContent=s.namaLatin;
  $('#readerMeta').textContent=`${s.arti} • ${s.jumlahAyat} ayat`;
  $('#readerFavorite').textContent=state.favorites.includes(s.nomor)?'♥':'♡';
  $('#ayahList').innerHTML=s.ayat.map((a,i)=>`
    <article class="ayah ${i===state.ayahIndex?'active':''}" id="ayah-${i+1}">
      <div class="ayah-head"><span class="ayah-number">${a.nomorAyat}</span><div>
        <button class="ayah-play" onclick="playAyah(${i})">▶</button>
        <button class="ghost" onclick="shareAyah(${i})">↗</button>
      </div></div>
      <div class="ayah-arabic" style="font-size:${state.arabicSize}px">${esc(a.teksArab||'')}</div>
      <div class="ayah-latin">${esc(a.teksLatin||'')}</div>
      <div class="ayah-translation">${esc(a.teksIndonesia||'')}</div>
    </article>`).join('');
  document.body.classList.toggle('body-no-latin',!state.showLatin);
  document.body.classList.toggle('body-no-translation',!state.showTranslation);
  highlightActive(false);
}
function highlightActive(scroll=true){
  document.querySelectorAll('.ayah').forEach((el,i)=>el.classList.toggle('active',i===state.ayahIndex));
  if(scroll)document.querySelector(`#ayah-${state.ayahIndex+1}`)?.scrollIntoView({behavior:'smooth',block:'center'});
}
function getGlobalAyahNumber(){
  if(!state.current)return null;
  const n=state.current.nomor;
  const prev=state.surahs.filter(s=>s.nomor<n).reduce((sum,s)=>sum+Number(s.jumlahAyat||0),0);
  return prev+Number(state.current.ayat[state.ayahIndex]?.nomorAyat||1);
}
function getAyahAudio(a){
  const q=state.qari;
  if(q.startsWith('cloud:')){
    const edition=q.slice(6);
    const globalNumber=getGlobalAyahNumber();
    return globalNumber?`https://cdn.islamic.network/quran/audio/128/${encodeURIComponent(edition)}/${globalNumber}.mp3`:null;
  }
  const audio=a.audio||{};
  return audio[q]||audio[qaris.find(x=>x[0]===q)?.[1]]||null;
}
function getLegacyDossari(n){
  return `${legacyDossariBase}${String(n).padStart(3,'0')}.mp3`;
}
function playAyah(i){
  state.ayahIndex=i;
  const a=state.current.ayat[i];
  let url=getAyahAudio(a);
  if(state.qari==='06'&&state.dossariYear==='legacy'){
    // Legacy source is chapter-level, not ayah-level. Use modern ayah audio for precise verse controls.
    // The chapter player below uses the legacy archive where available.
    url=getAyahAudio(a);
  }
  if(!url){toast('Audio qari ini tidak tersedia untuk ayat ini.');return}
  cloudAudioRetry=false;
  audioEl.src=url;audioEl.playbackRate=state.speed;audioEl.play().catch(()=>toast('Audio gagal diputar.'));
  $('#playerSurah').textContent=`${state.current.namaLatin} • Ayat ${a.nomorAyat}`;
  const cloudName=state.qari.startsWith('cloud:')?(cloudQaris.find(x=>`cloud:${x.identifier}`===state.qari)?.englishName||state.qari.slice(6)):null;
  $('#playerAyah').textContent=state.qari==='06'?`Syekh Yasser Ad-Dosari • ${state.dossariYear==='legacy'?'2004':'2025/2026'}`:(cloudName||qaris.find(x=>x[0]===state.qari)?.[1]||'Qari');
  highlightActive(true);
  markRead(state.current.nomor,a.nomorAyat);
  save('mq_last',{surah:state.current.nomor,ayah:a.nomorAyat});
  navigator.mediaSession?.setActionHandler?.('play',()=>audioEl.play());
  navigator.mediaSession?.setActionHandler?.('pause',()=>audioEl.pause());
  navigator.mediaSession?.setActionHandler?.('previoustrack',()=>prevAyah());
  navigator.mediaSession?.setActionHandler?.('nexttrack',()=>nextAyah());
}
function markRead(s,a){
  const key=`${s}:${a}`;
  if(!state.read.includes(key)){state.read.push(key);save('mq_read',state.read);updateProgress()}
}
function updateProgress(){
  const total=6236, done=Math.min(state.read.length,total);
  $('#progressText').textContent=`${done} / ${total} ayat`;
  $('#progressBar').style.width=`${done/total*100}%`;
  $('#progressJuz').textContent=`${Math.floor(done/208)} / 30 juz`;
}
function nextAyah(){
  if(!state.current)return;
  if(state.ayahIndex<state.current.ayat.length-1)playAyah(state.ayahIndex+1);
  else if(state.continuous)nextSurahPlay();
}
function prevAyah(){
  if(!state.current)return;
  if(state.ayahIndex>0)playAyah(state.ayahIndex-1);
}
async function nextSurahPlay(){
  if(state.current.nomor>=114){toast('Selesai sampai An-Nas. Alhamdulillah.');return}
  await openSurah(state.current.nomor+1,1);setTimeout(()=>playAyah(0),100);
}
async function prevSurahPlay(){
  if(state.current?.nomor>1){await openSurah(state.current.nomor-1,state.current.jumlahAyat);setTimeout(()=>playAyah(state.current.ayat.length-1),100)}
}

function buildJuzPicker(){
  $('#juzPicker').innerHTML=Array.from({length:30},(_,i)=>`<button data-juz="${i+1}">Juz ${i+1}</button>`).join('');
  $('#juzPicker').querySelectorAll('button').forEach(b=>b.onclick=async()=>{
    const juz=+b.dataset.juz;
    toast(`Juz ${juz}: memuat ayat…`);
    // AlQuran Cloud exposes exact verses by juz. We use it as a navigator and open the first surah in that juz.
    try{
      const data=await fetchJSON(`https://api.alquran.cloud/v1/juz/${juz}/quran-uthmani`);
      const first=data.ayahs?.[0];
      if(first)openSurah(first.surah.number,first.numberInSurah);
    }catch(e){toast('Juz gagal dimuat.')}
  });
}
function showSection(name){
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.section===name));
  if(name==='favorites'){
    const list=state.surahs.filter(s=>state.favorites.includes(s.nomor));renderSurahs(list);
    $('#sectionTitle').textContent='Favorit';return;
  }
  if(name==='history'){
    const nums=[...new Set(state.read.map(x=>+x.split(':')[0]))].map(n=>state.surahs.find(s=>s.nomor===n)).filter(Boolean);
    renderSurahs(nums);$('#sectionTitle').textContent='Riwayat bacaan';return;
  }
  if(name==='juz'){
    $('#sectionTitle').textContent='30 Juz';$('#juzPicker').classList.remove('hidden');renderSurahs();return;
  }
  $('#sectionTitle').textContent='Daftar Surah';$('#juzPicker').classList.add('hidden');renderSurahs();
}
async function shareAyah(i){
  const a=state.current.ayat[i];
  const text=`${state.current.namaLatin} ${state.current.nomor}:${a.nomorAyat}\n${a.teksArab}\n\n${a.teksIndonesia}`;
  try{await navigator.share?.({title:'Murottal Qur’an',text})||navigator.clipboard.writeText(text);toast('Ayat dibagikan/disalin')}
  catch(e){}
}
function saveSettings(){
  state.qari=$('#qariSelect').value;state.dossariYear=$('#dossariYear').value;state.speed=+$('#speedSelect').value;state.repeat=$('#repeatSelect').value;state.continuous=$('#continuousToggle').checked;
  save('mq_qari',state.qari);save('mq_dossari_year',state.dossariYear);save('mq_speed',state.speed);save('mq_repeat',state.repeat);save('mq_continuous',state.continuous);
  audioEl.playbackRate=state.speed;toast('Pengaturan tersimpan');
  $('#settingsDrawer').classList.remove('open');$('#drawerBackdrop').classList.remove('open');
}
function openSettings(){$('#settingsDrawer').classList.add('open');$('#drawerBackdrop').classList.add('open')}
function closeSettings(){$('#settingsDrawer').classList.remove('open');$('#drawerBackdrop').classList.remove('open')}


/* ===== v4 Feature Center ===== */
const featureDrawer=$('#featureDrawer'),featureBackdrop=$('#featureBackdrop'),featureModal=$('#featureModal');
function openFeatureDrawer(){featureDrawer.classList.add('open');featureBackdrop.classList.add('open')}
function closeFeatureDrawer(){featureDrawer.classList.remove('open');featureBackdrop.classList.remove('open')}

const API_PROJECTS_KEY='mq_api_projects_v2';
function apiProjects(){try{return JSON.parse(localStorage.getItem(API_PROJECTS_KEY)||'[]')}catch{return[]}}
function saveApiProjects(a){localStorage.setItem(API_PROJECTS_KEY,JSON.stringify(a))}
function randomChars(n){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let o='';for(let i=0;i<n;i++)o+=chars[Math.floor(Math.random()*chars.length)];return o}
function openApiScreen(){
  closeFeatureModal(); closeFeatureDrawer();
  const screen=$('#apiScreen'); screen.classList.remove('hidden');screen.setAttribute('aria-hidden','false');
  history.pushState({api:true},'', '/api'); renderApiProjects();
}
function closeApiScreen(){const screen=$('#apiScreen');screen.classList.add('hidden');screen.setAttribute('aria-hidden','true');if(location.pathname==='/api'||location.pathname==='/api/new')history.pushState({},'', '/');}
function maskProject(key){return key?key.slice(0,6)+'••••••••••••••••':'••••••'}
function renderApiProjects(){
  const list=$('#apiProjects'), empty=$('#apiEmpty'), projects=apiProjects();
  empty.style.display=projects.length?'none':'block'; list.innerHTML='';
  projects.forEach(p=>{const el=document.createElement('div');el.className='api-project-card';el.innerHTML=`<div><strong>${esc(p.name.slice(0,4))}${p.name.length>4?'••••••':''}</strong><small>${esc(p.endpoint)}</small></div><span class="api-key-mask">${esc(maskProject(p.key))}</span>`;list.appendChild(el)})
}
function openApiNew(){
  const body=document.createElement('div');body.className='api-new-panel';body.innerHTML=`<div class="api-browserbar inline"><div id="apiNewAddress">https://murotal-quran.netlify.app/api/new</div></div><div class="feature-form"><label>Name Project<input id="apiProjectName" maxlength="80" placeholder="Contoh: Murotal Mobile App"></label><label>Upload Project<input id="apiProjectFile" type="file" accept=".zip,.html,.js,.json,.txt,.pdf,.png,.jpg,.jpeg"></label><small id="uploadInfo">Upload project opsional untuk demo identitas project.</small><div class="human-box"><b>Verifikasi Human</b><label class="human-check"><input id="humanCheck" type="checkbox"> Saya manusia</label><small>reCAPTCHA resmi membutuhkan site key milik pemilik domain. Checkbox ini adalah verifikasi lokal demo, bukan pengganti reCAPTCHA.</small></div><div class="feature-actions"><button class="feature-primary" id="createProject" disabled>Create Project</button><button class="feature-secondary" id="cancelCreateProject">Batal</button></div><div id="createLoading" class="create-loading hidden">Membuat project <span>● ● ●</span></div></div>`;
  $('#apiProjects').prepend(body);$('#apiEmpty').style.display='none';$('#createApiProjectBtn').style.display='none';
  const name=$('#apiProjectName'),file=$('#apiProjectFile'),human=$('#humanCheck'),btn=$('#createProject');
  function valid(){btn.disabled=!(name.value.trim()||file.files.length)&&!human.checked;btn.disabled=!(name.value.trim()||file.files.length)||!human.checked}
  name.oninput=valid;file.onchange=()=>{$('#uploadInfo').textContent=file.files[0]?`File: ${file.files[0].name}`:'Upload project opsional untuk demo identitas project.';valid()};human.onchange=valid;
  $('#cancelCreateProject').onclick=()=>{body.remove();$('#createApiProjectBtn').style.display='block';renderApiProjects()};
  btn.onclick=async()=>{if(btn.disabled)return;btn.disabled=true;$('#createLoading').classList.remove('hidden');await new Promise(r=>setTimeout(r,1600));const nameVal=name.value.trim()||file.files[0].name;const key='mq-'+randomChars(15);const slug=randomChars(8);const endpoint=`${location.origin}/v1/${slug}`;const projects=apiProjects();projects.push({name:nameVal,key,endpoint,createdAt:Date.now()});saveApiProjects(projects);localStorage.setItem('mq_last_api_key',key);localStorage.setItem('mq_last_api_key_revealed','0');body.remove();$('#createApiProjectBtn').style.display='block';renderApiProjects();showApiCreated(key,nameVal,endpoint)};
}
function showApiCreated(key,name,endpoint){
 const card=document.createElement('div');card.className='api-created';card.innerHTML=`<div class="api-browserbar inline"><div>${location.origin}/api</div></div><h3>Project berhasil dibuat</h3><p>${esc(name)}</p><div class="api-key-table"><span>${esc(key)}</span><button id="copyNewApi" class="feature-secondary">⎙</button></div><small id="copyOnceNote">API key hanya dapat disalin 1×.</small><div class="api-endpoint-box"><b>API Endpoint</b><code>${esc(endpoint)}</code></div><button id="finishApi" class="feature-primary">Selesai</button></div>`;
 $('#apiProjects').prepend(card);$('#apiEmpty').style.display='none';
 $('#copyNewApi').onclick=async()=>{if(localStorage.getItem('mq_last_api_key_revealed')==='1'){toast('API key sudah pernah disalin dan tidak dapat disalin lagi.');return}try{await navigator.clipboard.writeText(key);localStorage.setItem('mq_last_api_key_revealed','1');$('#copyNewApi').disabled=true;$('#copyOnceNote').textContent='API key sudah disalin 1×. Simpan di tempat aman.';toast('API key disalin 1×')}catch{toast('Clipboard tidak tersedia di browser ini.')}};
 $('#finishApi').onclick=()=>{card.remove();renderApiProjects()};
}
function openFeatureModal(kind){
  const body=$('#featureModalBody'), title=$('#modalTitle'), eyebrow=$('#modalEyebrow');
  featureModal.classList.add('open');featureModal.setAttribute('aria-hidden','false');
  const templates={
    'api-key':{ey:'API',title:'API KEY',body:`<div class="feature-form"><div class="api-result">Kelola project API Murotal Qur'an. Halaman ini menggunakan penyimpanan lokal browser untuk demo dan identitas project perangkat ini.</div><div class="feature-actions"><button class="feature-primary" id="openApiManager">Buka API KEY</button></div></div>`},
    'api-endpoint':{ey:'API',title:'API ENDPOINT',body:`<div class="feature-form"><label>Endpoint<input id="apiEndpointInput" value="${esc(localStorage.getItem('mq_api_endpoint')||API)}"></label><div class="feature-actions"><button class="feature-primary" id="saveEndpoint">Simpan</button><button class="feature-secondary" id="testEndpoint">Test GET</button></div><div id="endpointResult" class="api-result">Endpoint Al-Qur'an aktif: ${esc(API)}</div></div>`},
    'snake':{ey:'GAME CENTER',title:'Snake',body:`<div class="game-wrap"><div id="snakeScore" class="badge-demo">Skor: 0</div><div id="snakeBoard" class="game-board" style="grid-template-columns:repeat(12,1fr)"></div><div class="feature-actions"><button class="feature-primary" id="snakeStart">Mulai / Reset</button><button class="feature-secondary" id="snakeUp">↑</button><button class="feature-secondary" id="snakeLeft">←</button><button class="feature-secondary" id="snakeDown">↓</button><button class="feature-secondary" id="snakeRight">→</button></div></div>`},
    'tictactoe':{ey:'GAME CENTER',title:'Tic Tac Toe',body:`<div class="game-wrap"><div id="tttStatus" class="badge-demo">Giliran X</div><div id="tttBoard" class="game-board" style="grid-template-columns:repeat(3,1fr)"></div><div class="feature-actions"><button class="feature-primary" id="tttReset">Reset Game</button></div></div>`},
    'blockblast':{ey:'GAME CENTER',title:'Block Blast',body:`<div class="game-wrap"><div class="badge-demo">Mini Block Blast • demo lokal</div><div id="blockBoard" class="game-board" style="grid-template-columns:repeat(6,1fr)"></div><div class="feature-actions"><button class="feature-primary" id="blockReset">Reset</button><button class="feature-secondary" id="blockFill">Tambah Block</button></div></div>`},
    'fake-ff':{ey:'FAKE IMAGE',title:'FAKE IMAGE FREE FIRE',body:`<div class="feature-form"><label>Nama akun<input id="fakeName" placeholder="Nama akun"></label><label>Rank<select id="fakeRank"><option>Grandmaster</option><option>Master</option><option>Heroic</option></select></label><label>Senjata<select id="fakeWeapon"><option>Shotgun OPM</option><option>Shotgun M1887</option><option>Shotgun M1014</option></select></label><div class="feature-actions"><button class="feature-primary" id="makeFakeFF">Buat gambar</button></div><div id="fakePreview" class="fake-preview"><span class="badge-demo">Preview akan muncul di sini</span></div></div>`},
    'fake-ml':{ey:'FAKE IMAGE',title:'FAKE IMAGE ML',body:`<div class="feature-form"><label>Nama akun<input id="fakeMLName" placeholder="Nama akun"></label><label>Rank<select id="fakeMLRank"><option>Mythical Glory</option><option>Mythic</option><option>Legend</option></select></label><label>Hero<select id="fakeMLHero"><option>Gusion</option><option>Fanny</option><option>Alucard</option><option>Ling</option></select></label><div class="feature-actions"><button class="feature-primary" id="makeFakeML">Buat gambar</button></div><div id="fakeMLPreview" class="fake-preview"><span class="badge-demo">Preview akan muncul di sini</span></div></div>`},
    'netflix-generator':{ey:'GENERATOR',title:'Generator Netflix',body:`<div class="feature-form"><div class="api-result">Demo lokal: generator ini hanya membuat <b>data akun fiktif</b> untuk UI/testing. Tidak membuat akun Netflix nyata, tidak mengakses layanan pihak ketiga, dan tidak menghasilkan kredensial untuk bypass pembayaran.</div><div id="netflixStatus" class="badge-demo">1 gacha per hari</div><div class="feature-actions"><button class="feature-primary" id="gachaNetflix">Gacha 1×</button></div><div id="netflixResult" class="generator-result">Belum gacha hari ini.</div></div>`},
    'coming-soon':{ey:'COMING SOON',title:'Segera Hadir',body:`<div class="api-result">Fitur ini sudah masuk roadmap. UI disiapkan dulu supaya nanti tidak perlu bongkar rumah saat fitur aslinya datang.</div>`}
  };
  const t=templates[kind]||templates['coming-soon'];eyebrow.textContent=t.ey;title.textContent=t.title;body.innerHTML=t.body;
  if(kind==='api-key')setupApiKey();
  if(kind==='api-endpoint')setupApiEndpoint();
  if(kind==='tictactoe')setupTicTacToe();
  if(kind==='snake')setupSnake();
  if(kind==='blockblast')setupBlockBlast();
  if(kind==='fake-ff')setupFakeGenerator('ff');
  if(kind==='fake-ml')setupFakeGenerator('ml');
  if(kind==='netflix-generator')setupNetflixGenerator();
}
function closeFeatureModal(){featureModal.classList.remove('open');featureModal.setAttribute('aria-hidden','true')}
document.addEventListener('click',e=>{if(e.target.id==='openApiManager')openApiScreen()});
function setupApiKey(){
  $('#apiKeyInput').value=localStorage.getItem('mq_api_key')||'';
  $('#saveApiKey').onclick=()=>{localStorage.setItem('mq_api_key',$('#apiKeyInput').value.trim());toast('API key disimpan di browser');};
  $('#clearApiKey').onclick=()=>{localStorage.removeItem('mq_api_key');$('#apiKeyInput').value='';toast('API key dihapus');};
}
function setupApiEndpoint(){
  $('#saveEndpoint').onclick=()=>{const v=$('#apiEndpointInput').value.trim()||API;localStorage.setItem('mq_api_endpoint',v);toast('Endpoint disimpan');};
  $('#testEndpoint').onclick=async()=>{const v=$('#apiEndpointInput').value.trim()||API;const out=$('#endpointResult');out.textContent='Menguji endpoint…';try{const r=await fetch(v,{cache:'no-store'});out.textContent=`HTTP ${r.status} • ${r.ok?'Endpoint merespons':'Endpoint merespons dengan error'}`;}catch(e){out.textContent='Gagal mengakses endpoint. Cek URL/CORS.';}};
}
function setupTicTacToe(){
  const board=$('#tttBoard'),status=$('#tttStatus');let cells=Array(9).fill(''),turn='X',done=false;
  function draw(){board.innerHTML=cells.map((v,i)=>`<button class="game-cell" data-i="${i}">${v}</button>`).join('');board.querySelectorAll('button').forEach(b=>b.onclick=()=>move(+b.dataset.i))}
  function winner(){for(const [a,b,c] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])if(cells[a]&&cells[a]===cells[b]&&cells[a]===cells[c])return cells[a];return cells.every(Boolean)?'draw':null}
  function move(i){if(done||cells[i])return;cells[i]=turn;const w=winner();if(w){done=true;status.textContent=w==='draw'?'Seri':`Menang: ${w}`;}else{turn=turn==='X'?'O':'X';status.textContent=`Giliran ${turn}`}draw()}
  $('#tttReset').onclick=()=>{cells=Array(9).fill('');turn='X';done=false;status.textContent='Giliran X';draw()};draw();
}
function setupSnake(){
  const board=$('#snakeBoard'),scoreEl=$('#snakeScore');let snake=[{x:5,y:6}],dir={x:1,y:0},food={x:8,y:6},score=0,timer=null;
  function randomFood(){let p;do{p={x:Math.floor(Math.random()*12),y:Math.floor(Math.random()*10)}}while(snake.some(s=>s.x===p.x&&s.y===p.y));return p}
  function draw(){board.innerHTML='';for(let y=0;y<10;y++)for(let x=0;x<12;x++){const b=document.createElement('button');b.className='game-cell';b.style.padding='0';if(snake.some(s=>s.x===x&&s.y===y))b.textContent='●';else if(food.x===x&&food.y===y)b.textContent='✦';board.appendChild(b)}scoreEl.textContent=`Skor: ${score}`}
  function step(){const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};if(h.x<0||h.x>=12||h.y<0||h.y>=10||snake.some(s=>s.x===h.x&&s.y===h.y)){clearInterval(timer);timer=null;toast('Snake selesai');return}snake.unshift(h);if(h.x===food.x&&h.y===food.y){score++;food=randomFood()}else snake.pop();draw()}
  function setDir(x,y){if(dir.x===-x&&dir.y===-y)return;dir={x,y}}
  $('#snakeStart').onclick=()=>{clearInterval(timer);snake=[{x:5,y:6}];dir={x:1,y:0};food=randomFood();score=0;draw();timer=setInterval(step,150)}
  $('#snakeUp').onclick=()=>setDir(0,-1);$('#snakeDown').onclick=()=>setDir(0,1);$('#snakeLeft').onclick=()=>setDir(-1,0);$('#snakeRight').onclick=()=>setDir(1,0);
  draw();
}
function setupBlockBlast(){
  const board=$('#blockBoard');let cells=Array(36).fill(false);
  function draw(){board.innerHTML=cells.map((v,i)=>`<button class="game-cell" data-i="${i}" style="${v?'background:#14905f;color:#fff':''}"></button>`).join('');board.querySelectorAll('button').forEach(b=>b.onclick=()=>{cells[+b.dataset.i]=!cells[+b.dataset.i];draw()})}
  $('#blockReset').onclick=()=>{cells=Array(36).fill(false);draw()};$('#blockFill').onclick=()=>{const free=cells.map((v,i)=>v?null:i).filter(x=>x!==null);if(free.length){for(let j=0;j<Math.min(3,free.length);j++)cells[free[Math.floor(Math.random()*free.length)]]=true;draw()}};draw();
}
function fakeCanvas(kind,name,rank,extra){
  const c=document.createElement('canvas');c.width=1200;c.height=700;const x=c.getContext('2d');
  x.fillStyle=kind==='ff'?'#172c48':'#251b42';x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#e4bd63';x.fillRect(50,50,1100,600);
  x.fillStyle=kind==='ff'?'#10253d':'#201537';x.fillRect(75,75,1050,550);
  x.fillStyle='#fff';x.font='bold 58px Arial';x.fillText(kind==='ff'?'FREE FIRE • FAN CARD':'MOBILE LEGENDS • FAN CARD',110,160);
  x.font='bold 74px Arial';x.fillText(name||'Player',110,270);
  x.font='bold 44px Arial';x.fillStyle='#e6c15d';x.fillText(rank,110,340);
  x.font='36px Arial';x.fillStyle='#fff';x.fillText(extra,110,410);
  x.font='26px Arial';x.fillStyle='#b8c8d5';x.fillText('DEMO / FAN-MADE • BUKAN SCREENSHOT RESMI',110,570);
  return c;
}
function setupFakeGenerator(kind){
  const nameId=kind==='ff'?'fakeName':'fakeMLName',rankId=kind==='ff'?'fakeRank':'fakeMLRank',extraId=kind==='ff'?'fakeWeapon':'fakeMLHero',previewId=kind==='ff'?'fakePreview':'fakeMLPreview',btnId=kind==='ff'?'makeFakeFF':'makeFakeML';
  $(`#${btnId}`).onclick=()=>{
    const c=fakeCanvas(kind,$(`#${nameId}`).value.trim(),$(`#${rankId}`).value,$(`#${extraId}`).value);
    const wrap=$(`#${previewId}`);wrap.innerHTML='';wrap.appendChild(c);c.className='fake-card-canvas';
    const actions=document.createElement('div');actions.className='canvas-actions';actions.innerHTML='<button class="feature-secondary" id="downloadFake">Simpan PNG</button>';wrap.appendChild(actions);
    $('#downloadFake').onclick=()=>{const a=document.createElement('a');a.download=`fake-${kind}-fan-card.png`;a.href=c.toDataURL('image/png');a.click()};
  };
}
function setupNetflixGenerator(){
  const key='mq_netflix_gacha_date',today=new Date().toISOString().slice(0,10),btn=$('#gachaNetflix'),result=$('#netflixResult');
  const used=localStorage.getItem(key)===today;btn.disabled=used;
  if(used){$('#netflixStatus').textContent='Sudah dipakai hari ini';result.textContent='Gacha harian sudah digunakan. Reset otomatis besok.'}
  btn.onclick=()=>{
    if(localStorage.getItem(key)===today)return;
    localStorage.setItem(key,today);btn.disabled=true;$('#netflixStatus').textContent='Sudah dipakai hari ini';
    const user=`demo${Math.floor(10000+Math.random()*90000)}@example.test`;const expires=new Date(Date.now()+8*3600e3);
    result.innerHTML=`<b>Email demo:</b> ${user}<br><b>Berlaku:</b> ${expires.toLocaleString('id-ID')}<br><span class="badge-demo">DATA FIKTIF / UI TESTING</span>`;
  };
}
$('#createApiProjectBtn').onclick=openApiNew;$('#closeApiScreen').onclick=closeApiScreen;
window.addEventListener('popstate',()=>{if(location.pathname==='/api')openApiScreen();else closeApiScreen()});

document.addEventListener('click',e=>{
  const f=e.target.closest('[data-feature]');if(f){openFeatureModal(f.dataset.feature);closeFeatureDrawer();}
});
$('#hamburgerBtn').onclick=openFeatureDrawer;$('#closeFeatureDrawer').onclick=closeFeatureDrawer;$('#featureBackdrop').onclick=closeFeatureDrawer;
$('#closeFeatureModal').onclick=closeFeatureModal;
featureModal.addEventListener('click',e=>{if(e.target===featureModal)closeFeatureModal()});

document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeFeatureDrawer();closeFeatureModal()}});

document.addEventListener('click',e=>{
  const card=e.target.closest('.surah-card');if(card)openSurah(+card.dataset.surah);
  const nav=e.target.closest('.nav-item');if(nav)showSection(nav.dataset.section);
});
$('#startBtn').onclick=()=>openSurah(state.last?.surah||1,state.last?.ayah||1);
$('#backBtn').onclick=()=>{$('#reader').classList.add('hidden');$('#surahGrid').classList.remove('hidden');$('#filters').classList.remove('hidden');$('#sectionTitle').textContent='Daftar Surah';window.scrollTo({top:0,behavior:'smooth'})};
$('#prevSurah').onclick=prevSurahPlay;$('#nextSurah').onclick=nextSurahPlay;
$('#readerFavorite').onclick=()=>toggleFavorite(state.current.nomor);
$('#searchInput').oninput=()=>renderSurahs();
$('#fontMinus').onclick=()=>{state.arabicSize=Math.max(20,state.arabicSize-2);renderReader()};
$('#fontPlus').onclick=()=>{state.arabicSize=Math.min(50,state.arabicSize+2);renderReader()};
$('#toggleLatin').onclick=()=>{state.showLatin=!state.showLatin;renderReader()};
$('#toggleTranslation').onclick=()=>{state.showTranslation=!state.showTranslation;renderReader()};
$('#shareSurah').onclick=()=>navigator.share?.({title:`Surah ${state.current.namaLatin}`,text:`Baca ${state.current.namaLatin} di Murottal Qur'an`}).catch(()=>{});
$('#settingsBtn').onclick=openSettings;$('#miniSettings').onclick=openSettings;$('#closeSettings').onclick=closeSettings;$('#drawerBackdrop').onclick=closeSettings;$('#saveSettings').onclick=saveSettings;
$('#qariSelect').onchange=toggleDossari;
$('#themeBtn').onclick=()=>{const dark=document.body.classList.contains('dark');applyTheme(dark?'light':'dark');$('#themeSelect').value=state.theme};
$('#themeSelect').onchange=e=>applyTheme(e.target.value);
$('#playerPlay').onclick=()=>audioEl.paused?audioEl.play():audioEl.pause();
$('#prevAyah').onclick=prevAyah;$('#nextAyah').onclick=nextAyah;
$('#repeatBtn').onclick=()=>{$('#repeatSelect').value=state.repeat==='off'?'ayah':state.repeat==='ayah'?'surah':'off';state.repeat=$('#repeatSelect').value;toast(`Repeat: ${state.repeat}`)};
$('#repeatSelect').onchange=e=>state.repeat=e.target.value;
$('#speedSelect').onchange=e=>{state.speed=+e.target.value;audioEl.playbackRate=state.speed};
$('#continuousToggle').onchange=e=>state.continuous=e.target.checked;
$('#volumeRange').oninput=e=>audioEl.volume=+e.target.value;
$('#progressRange').oninput=e=>{if(audioEl.duration)audioEl.currentTime=(+e.target.value/100)*audioEl.duration};
audioEl.addEventListener('play',()=>$('#playerPlay').textContent='Ⅱ');
audioEl.addEventListener('pause',()=>$('#playerPlay').textContent='▶');
audioEl.addEventListener('loadedmetadata',()=>{$('#duration').textContent=formatTime(audioEl.duration)});
audioEl.addEventListener('error',()=>{
  if(state.qari.startsWith('cloud:')&&!cloudAudioRetry){
    cloudAudioRetry=true;
    const edition=state.qari.slice(6),globalNumber=getGlobalAyahNumber();
    if(globalNumber){
      audioEl.src=`https://cdn.islamic.network/quran/audio/64/${encodeURIComponent(edition)}/${globalNumber}.mp3`;
      audioEl.playbackRate=state.speed;
      audioEl.play().catch(()=>toast('Audio qari ini tidak tersedia pada CDN.'));
    }
  }
});
audioEl.addEventListener('timeupdate',()=>{$('#currentTime').textContent=formatTime(audioEl.currentTime);$('#progressRange').value=audioEl.duration?(audioEl.currentTime/audioEl.duration*100):0});
audioEl.addEventListener('ended',()=>{
  if(state.repeat==='ayah'){playAyah(state.ayahIndex);return}
  if(state.ayahIndex<state.current.ayat.length-1&&state.continuous){nextAyah();return}
  if(state.repeat==='surah'){playAyah(0);return}
  if(state.continuous)nextSurahPlay();
});
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus()}});
window.toggleFavorite=toggleFavorite;window.playAyah=playAyah;window.shareAyah=shareAyah;

if(location.pathname==='/api'){setTimeout(openApiScreen,0)}else if(location.pathname==='/api/new'){setTimeout(()=>{openApiScreen();setTimeout(openApiNew,50)},0)}

state.qari=localStorage.getItem('mq_qari')||'06';
state.dossariYear=localStorage.getItem('mq_dossari_year')||'modern';
state.speed=+(localStorage.getItem('mq_speed')||1);
state.repeat=localStorage.getItem('mq_repeat')||'off';
state.continuous=localStorage.getItem('mq_continuous')!=='false';
initSettings();buildJuzPicker();updateProgress();loadSurahs();

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
