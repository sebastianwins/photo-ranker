(function(){
  const grid = document.getElementById('grid');
  const playerSel = document.getElementById('playerSel');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusEl = document.getElementById('status');
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
  const modalBody = document.getElementById('modalBody');
  const modalTitle = document.getElementById('modalTitle');

  let records = [];        // raw records from metadata.json
  let baseOrder = [];      // default order: filenames
  let order = [];          // current order for selected player

  function setStatus(msg){ statusEl.textContent = msg; }

  // Load metadata.json from same folder (works on GitHub Pages / https)
  async function loadMetadata(){
    try{
      const res = await fetch('metadata.json', {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      if(!Array.isArray(data)) throw new Error('metadata.json must be an array');
      records = data;
      baseOrder = data.map(r => r.filename || r.FileName || r.name).filter(Boolean);
      setStatus('Loaded '+records.length+' records.');
      loadPlayerOrder();
      render();
    }catch(e){
      setStatus('Failed to load metadata.json: '+e.message);
    }
  }

  function lsGet(key){ try { return JSON.parse(localStorage.getItem(key)||'null'); } catch{ return null; } }
  function lsSet(key,val){ localStorage.setItem(key, JSON.stringify(val)); }

  function playerKey(){ return 'order_'+playerSel.value; }

  function loadPlayerOrder(){
    const k = playerKey();
    const saved = lsGet(k);
    if (Array.isArray(saved) && saved.length === baseOrder.length){
      order = saved.slice();
    } else {
      order = baseOrder.slice();
    }
  }

  function savePlayerOrder(){
    lsSet(playerKey(), order);
  }

  function getRecByFilename(fn){
    return records.find(r => (r.filename||r.FileName||r.name) === fn);
  }

  function isDouble(rec){
    if ('Multiple_Flag' in rec) return !!rec.Multiple_Flag;
    const m = rec.Multiple;
    if (m === null || m === undefined) return false;
    const s = String(m).trim().toLowerCase();
    if (!s) return false;
    return !(['0','no','n','false'].includes(s));
  }

  function imgSrc(rec){
    if(rec.image_url) return rec.image_url;
    const fn = rec.filename || rec.FileName || rec.name || '';
    return fn ? ('images/'+fn) : '';
  }

  function render(){
    grid.innerHTML = '';
    order.forEach((fn, i) => {
      const rec = getRecByFilename(fn);
      if(!rec) return;
      const tile = document.createElement('div');
      tile.className = 'tile' + (isDouble(rec) ? ' double' : '');
      tile.draggable = true;
      tile.dataset.fn = fn;

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      const img = document.createElement('img');
      img.src = imgSrc(rec);
      img.alt = fn;
      img.onerror = () => { img.replaceWith(document.createTextNode('Image not found')); };
      thumb.appendChild(img);
      if(isDouble(rec)){
        const badge = document.createElement('div');
        badge.className = 'badge-double';
        badge.textContent = 'DOUBLE';
        thumb.appendChild(badge);
      }
      tile.appendChild(thumb);

      const meta = document.createElement('div');
      meta.className = 'meta';
      const fnSpan = document.createElement('div');
      fnSpan.className = 'filename';
      fnSpan.title = fn;
      fnSpan.textContent = fn;
      const rank = document.createElement('div');
      rank.className = 'rank';
      rank.textContent = (i+1);
      meta.appendChild(fnSpan);
      meta.appendChild(rank);
      tile.appendChild(meta);

      // DnD
      tile.addEventListener('dragstart', (e)=>{
        tile.classList.add('dragging');
        e.dataTransfer.setData('text/plain', fn);
        e.dataTransfer.effectAllowed = 'move';
      });
      tile.addEventListener('dragend', ()=> tile.classList.remove('dragging'));

      // Allow dropping before/after
      tile.addEventListener('dragover', (e)=>{
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      tile.addEventListener('drop', (e)=>{
        e.preventDefault();
        const srcFn = e.dataTransfer.getData('text/plain');
        const dstFn = fn;
        if(!srcFn || srcFn===dstFn) return;
        // reorder: move src before dst
        const srcIdx = order.indexOf(srcFn);
        const dstIdx = order.indexOf(dstFn);
        if(srcIdx<0 || dstIdx<0) return;
        order.splice(srcIdx,1);
        order.splice(dstIdx,0,srcFn);
        savePlayerOrder();
        render();
      });

      // Modal on double-click
      tile.addEventListener('dblclick', ()=> openModal(rec));

      grid.appendChild(tile);
    });
  }

  function openModal(rec){
    modalTitle.textContent = rec.filename || rec.FileName || rec.name || 'Details';
    const rows = Object.entries(rec).map(([k,v]) => {
      let val = (v==null) ? '' : String(v);
      return `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(val)}</td></tr>`;
    }).join('');
    modalBody.innerHTML = `<table class="table">${rows}</table>`;
    modal.classList.remove('hidden');
  }
  function closeModal(){ modal.classList.add('hidden'); }
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

  function exportCsv(){
    const rows = [['filename','rank']];
    order.forEach((fn,i)=> rows.push([fn, i+1]));
    const csv = rows.map(r => r.map(x=>String(x).replaceAll('"','""')).map(x=>`"${x}"`).join(',')).join('\n');
    download('player_'+playerSel.value+'_rankings.csv', csv);
  }
  function clearPlayer(){
    order = baseOrder.slice();
    savePlayerOrder();
    render();
  }
  function switchPlayer(){
    loadPlayerOrder();
    render();
  }

  function download(name, text){
    const blob = new Blob([text], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  playerSel.addEventListener('change', switchPlayer);
  exportBtn.addEventListener('click', exportCsv);
  clearBtn.addEventListener('click', clearPlayer);

  loadMetadata();
})();