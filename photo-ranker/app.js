(function(){
const photo=document.getElementById('photo'), noImage=document.getElementById('noImage'), filename=document.getElementById('filename'), metaTable=document.getElementById('metaTable');
const jsonFile=document.getElementById('jsonFile'), reloadBtn=document.getElementById('reloadDefault'), rankInput=document.getElementById('rankInput'), saveRank=document.getElementById('saveRank');
const prev=document.getElementById('prevBtn'), next=document.getElementById('nextBtn'), exportBtn=document.getElementById('exportCsv'), validateBtn=document.getElementById('validateBtn'), clearBtn=document.getElementById('clearPlayerRanks');
const playerSel=document.getElementById('playerSelect'), progress=document.getElementById('progress'), status=document.getElementById('status'); const badge=document.getElementById('doubleBadge');

let records=[], idx=0, ranks={A:load('A'),B:load('B'),C:load('C')};
function load(p){try{return JSON.parse(localStorage.getItem('ranks_'+p)||'{}')}catch(e){return{}}}
function save(p){localStorage.setItem('ranks_'+p, JSON.stringify(ranks[p]))}
function setStatus(m,w=false){status.textContent='Status: '+m; status.classList.toggle('status-warn',!!w)}

function isDouble(r){ if('Multiple_Flag' in r) return !!r.Multiple_Flag; const m=r.Multiple; if(m==null) return false; const s=(''+m).trim().toLowerCase(); if(!s) return false; return !(['0','no','n','false'].includes(s)); }
function detectSrc(r){ if(r.image_url) return r.image_url; const fn=r.filename||r.FileName||r.name||''; return fn?('images/'+fn):null; }

function render(){
  if(!records.length){ photo.src=''; photo.classList.add('hidden'); noImage.classList.remove('hidden'); filename.textContent=''; metaTable.innerHTML=''; progress.textContent='0 / 0'; return; }
  const r=records[idx], src=detectSrc(r), fn=r.filename||r.FileName||r.name||'(no filename)';
  filename.textContent=fn; progress.textContent=(idx+1)+' / '+records.length;
  const wrap=document.querySelector('.image-wrap'); if(isDouble(r)){ wrap.classList.add('double'); badge.style.display='block'; } else { wrap.classList.remove('double'); badge.style.display='none'; }
  if(src){ photo.classList.remove('hidden'); noImage.classList.add('hidden'); photo.src=src; photo.onerror=()=>{ photo.src=''; photo.classList.add('hidden'); noImage.textContent='Image not found: '+src; noImage.classList.remove('hidden'); }; }
  else { photo.src=''; photo.classList.add('hidden'); noImage.textContent='No image path available.'; noImage.classList.remove('hidden'); }
  let rows=''; Object.entries(r).forEach(([k,v])=>{ const val=(v==null)?'':String(v); rows+=`<tr><td>${escape(k)}</td><td>${escape(val)}</td></tr>`; });
  if(isDouble(r)) rows = '<tr><td>Multiple</td><td><span class="meta-pill">Yes (double-sided)</span></td></tr>'+rows;
  metaTable.innerHTML=rows;
  const p=playerSel.value; rankInput.value=ranks[p][fn]||'';
}
function escape(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function loadDefault(){ setStatus('Loading metadata.json ...'); try{ const res=await fetch('metadata.json',{cache:'no-store'}); if(!res.ok) throw new Error('HTTP '+res.status); const data=await res.json(); if(!Array.isArray(data)) throw new Error('metadata.json must be an array'); records=data; idx=0; setStatus('Loaded '+records.length+' records.'); render(); }catch(e){ setStatus('Could not load metadata.json here. Upload JSON instead.', true); records=[]; render(); } }
jsonFile.addEventListener('change', async e=>{ const f=e.target.files[0]; if(!f) return; try{ const t=await f.text(); const data=JSON.parse(t); if(!Array.isArray(data)) throw new Error('JSON must be an array'); records=data; idx=0; setStatus('Loaded '+records.length+' records.'); render(); }catch(err){ setStatus('Invalid JSON: '+err.message,true); } });
reloadBtn.addEventListener('click', loadDefault);

saveRank.addEventListener('click', ()=>{ if(!records.length) return; const r=records[idx], fn=r.filename||r.FileName||r.name; const v=rankInput.value.trim(); if(!fn){ setStatus('Record has no filename; cannot save rank.', true); return; } if(v && !/^-?\d+$/.test(v)){ setStatus('Rank must be an integer.', true); return; } ranks[playerSel.value][fn]=v?parseInt(v,10):''; save(playerSel.value); setStatus('Saved '+fn+' → '+(v||'(blank)')); });
prev.addEventListener('click', ()=>{ if(!records.length) return; idx=(idx-1+records.length)%records.length; render(); });
next.addEventListener('click', ()=>{ if(!records.length) return; idx=(idx+1)%records.length; render(); });
playerSel.addEventListener('change', render);

exportBtn.addEventListener('click', ()=>{ if(!records.length) return; const p=playerSel.value; const rows=[['filename','rank']]; for(const r of records){ const fn=r.filename||r.FileName||r.name||''; const v=ranks[p][fn]??''; rows.push([fn,v]); } const csv=rows.map(r=>r.map(x=>String(x).replaceAll('"','""')).map(x=>`"${x}"`).join(',')).join('\n'); download('player_'+p+'_rankings.csv', csv); });
clearBtn.addEventListener('click', ()=>{ const p=playerSel.value; if(!confirm('Clear all ranks for '+p+'?')) return; ranks[p]={}; save(p); render(); setStatus('Cleared ranks for '+p+'.'); });
validateBtn.addEventListener('click', ()=>{ const p=playerSel.value, map=ranks[p]; const seen={}, dups=[], missing=[]; for(const r of records){ const fn=r.filename||r.FileName||r.name||''; const v=map[fn]; if(v===undefined||v==='') missing.push(fn); else { if(seen[v]) dups.push([v,fn,seen[v]]); else seen[v]=fn; } } let msg=[]; msg.push('Validation for Player '+p+':'); msg.push('- Total records: '+records.length); msg.push('- Missing ranks: '+missing.length); msg.push('- Duplicate ranks: '+dups.length); if(missing.length) msg.push('Missing examples: '+missing.slice(0,5).join(', ')+(missing.length>5?' ...':'')); if(dups.length) msg.push('Duplicate examples: '+dups.slice(0,3).map(d=>'rank '+d[0]+' for '+d[1]+' & '+d[2]).join(' | ')+(dups.length>3?' ...':'')); alert(msg.join('\n')); });

function download(name,text){ const blob=new Blob([text],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }

document.addEventListener('keydown',e=>{ if(e.key==='ArrowLeft') prev.click(); else if(e.key==='ArrowRight') next.click(); else if(e.key==='Enter') saveRank.click(); });
loadDefault();
})();