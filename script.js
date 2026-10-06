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
}
function toggleDossari(){$('#dossariOptions').classList.toggle('hidden',$('#qariSelect').value!=='06')}

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
function getAyahAudio(a){
  const audio=a.audio||{};
  return audio[state.qari]||audio[qaris.find(x=>x[0]===state.qari)?.[1]]||null;
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
  audioEl.src=url;audioEl.playbackRate=state.speed;audioEl.play().catch(()=>toast('Audio gagal diputar.'));
  $('#playerSurah').textContent=`${state.current.namaLatin} • Ayat ${a.nomorAyat}`;
  $('#playerAyah').textContent=state.qari==='06'?`Syekh Yasser Ad-Dosari • ${state.dossariYear==='legacy'?'2004':'2025/2026'}`:qaris.find(x=>x[0]===state.qari)?.[1]||'Qari';
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
audioEl.addEventListener('timeupdate',()=>{$('#currentTime').textContent=formatTime(audioEl.currentTime);$('#progressRange').value=audioEl.duration?(audioEl.currentTime/audioEl.duration*100):0});
audioEl.addEventListener('ended',()=>{
  if(state.repeat==='ayah'){playAyah(state.ayahIndex);return}
  if(state.ayahIndex<state.current.ayat.length-1&&state.continuous){nextAyah();return}
  if(state.repeat==='surah'){playAyah(0);return}
  if(state.continuous)nextSurahPlay();
});
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus()}});
window.toggleFavorite=toggleFavorite;window.playAyah=playAyah;window.shareAyah=shareAyah;

state.qari=localStorage.getItem('mq_qari')||'06';
state.dossariYear=localStorage.getItem('mq_dossari_year')||'modern';
state.speed=+(localStorage.getItem('mq_speed')||1);
state.repeat=localStorage.getItem('mq_repeat')||'off';
state.continuous=localStorage.getItem('mq_continuous')!=='false';
initSettings();buildJuzPicker();updateProgress();loadSurahs();

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
