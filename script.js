// Adventskalender 2025 — aktualisiert: sequential / scattered layout + transparente Türen
// Erwartet: config.json und layout.json im Repo-Root.

(async function(){
  const CONFIG_PATH = './config.json';
  const LAYOUT_PATH = './layout.json';
  const stage = document.getElementById('stage');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const audioContainer = document.getElementById('audioContainer');
  const audioMsg = document.getElementById('audioMsg');
  const modalClose = document.getElementById('modalClose');

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=> { if(e.target === modal) closeModal(); });

  let config = await fetchJsonSafe(CONFIG_PATH, getDefaultConfig());
  let layout = await fetchJsonSafe(LAYOUT_PATH, getDefaultLayout());
  // optional chapter titles per day (file: chapters.json)
  const chapters = await fetchJsonSafe('./chapters.json', {});

  // STORAGE KEY for opened doors (per year+month so different calendars don't clash)
  const storageKey = `advent_opened_${config.year || 2025}_${config.monthIndex || 11}`;

  // Track clicks on locked doors globally to trigger a warning modal after every 3 attempts
  let lockedClickCount = 0;


  function loadOpenedSet(){
    try{
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    }catch(e){ return new Set(); }
  }

  // Mark door opened: persist and update DOM
  function markDoorOpened(day){
    try{
      const set = loadOpenedSet();
      set.add(String(day));
      saveOpenedSet(set);
      // update DOM elements
      const door = stage.querySelector(`.door[data-day="${day}"]`);
      const num = stage.querySelector(`.door-num[data-for="${day}"]`);
      if(door) {
        door.classList.add('opened');
      //  const badge = door.querySelector('.badge'); if(badge) badge.textContent = 'Geöffnet';
      }
      if(num) num.classList.add('opened');
    }catch(e){ console.error(e); }
    // reset global locked-click counter when a door is opened
    try{ lockedClickCount = 0; }catch(_){}
  }

  function saveOpenedSet(set){
    try{ localStorage.setItem(storageKey, JSON.stringify(Array.from(set))); }catch(e){}
  }

  function resetOpenedSet(){
    try{ localStorage.removeItem(storageKey); }catch(e){}
  }

  // Show a modal warning for impatient clicks
  function showImpatientModal(){
    const msg = 'NA NA NA. Nicht zu eilig.\nPro Tag nur ein Türchen,\nMilla und Leo!';
    // modal.setAttribute('aria-hidden','false');
    modal.style.display = 'flex';
    modalTitle.textContent = msg;
    audioContainer.innerHTML = '';
    audioMsg.textContent = '';
  }

  function handleLockedClick(day){
    try{
      lockedClickCount = (lockedClickCount || 0) + 1;
      if(lockedClickCount >= 3){
        lockedClickCount = 0;
        showImpatientModal();
      }
    }catch(e){ console.error('locked click handler failed', e); }
  }

  // Create a small reset trigger in the bottom-right of the stage
  // double-clicking it will clear the opened-state and reload the page
  function createResetTrigger(){
    try{
      const btn = document.createElement('button');
      btn.className = 'reset-trigger';
      btn.type = 'button';
      btn.title = 'Doppelklick: Advent-Kalender zurücksetzen';
      // visible test label so the button is easy to find during development
      btn.textContent = '';
      btn.setAttribute('aria-label','Reset Advent-Kalender (Doppelklick)');
      // require double click to activate
      btn.addEventListener('dblclick', (e)=>{
        e.stopPropagation();
        try{
          // remove any keys that match the advent_opened_ prefix (robust across variants)
          const prefix = 'advent_opened_';
          const toRemove = [];
          for(let i=0;i<localStorage.length;i++){
            const k = localStorage.key(i);
            if(k && k.indexOf(prefix) === 0) toRemove.push(k);
          }
          // also ensure configured storageKey is removed
          if(storageKey) toRemove.push(storageKey);
          // dedupe
          const uniq = Array.from(new Set(toRemove));
          uniq.forEach(k=>{ try{ localStorage.removeItem(k); }catch(_){} });
          console.info('Removed LocalStorage keys:', uniq);

          // reset global locked-click counter as part of reset
          try{ lockedClickCount = 0; }catch(_){ }

          // Immediately reflect the reset in the UI: remove opened classes and badges
          try{
            // doors
            const openedDoors = Array.from(stage.querySelectorAll('.door.opened'));
            openedDoors.forEach(d => {
              d.classList.remove('opened');
              const badge = d.querySelector('.badge'); if(badge) badge.textContent = '';
            });
            // number overlays
            const openedNums = Array.from(stage.querySelectorAll('.door-num.opened'));
            openedNums.forEach(n => n.classList.remove('opened'));
          }catch(_){/* ignore UI update errors */}

          flashMessage(stage, 'Kalender zurückgesetzt');
        }catch(err){ console.error('Reset failed', err); flashMessage(stage, 'Reset fehlgeschlagen'); }
      });
      // append to stage so it's positioned relative to it
      stage.appendChild(btn);
    }catch(e){ console.error('createResetTrigger failed', e); }
  }

  // If config requests reset, clear the stored opened doors
  if(config.reset === true || config.resetCalendar === true){
    resetOpenedSet();
    console.info('Advent-Kalender: opened-state reset via config');
  }

  // Set background image if provided
  if(config.backgroundImage){
    stage.style.backgroundImage = `url('${config.backgroundImage}')`;
    if(config.backgroundSize) stage.style.setProperty('--stage-bg-size', config.backgroundSize);
  }

  // Build the doors (either sequential grid or scattered using layout.json)
  buildDoors(config, layout);

    // create hidden reset trigger (double-click to reset opened-state)
    createResetTrigger();

  // --- functions ---
  function buildDoors(cfg, layout){
    // remove any previously rendered doors / overlays to avoid duplicates
    // (useful when re-running buildDoors during dev or resize)
    Array.from(stage.querySelectorAll('.door, .door-num')).forEach(n=>n.remove());
    const start = cfg.startDay || 1;
    const end = cfg.endDay || 24;
    const total = end - start + 1;
    const mode = cfg.layoutMode || 'sequential'; // 'sequential' | 'scattered'
    // load persisted opened doors for this calendar
    const openedSet = loadOpenedSet();
    if(mode === 'sequential'){
      const cols = cfg.cols || 6;
      const rows = Math.ceil(total / cols);
      const gap = (typeof cfg.gridGap === 'number') ? cfg.gridGap : 2; // percent gap
      const cellW = (100 - (cols+1)*gap) / cols;
      const cellH = (100 - (rows+1)*gap) / rows;

      for(let i=0;i<total;i++){
        const d = start + i;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const left = gap + col*(cellW + gap);
        const top = gap + row*(cellH + gap);

        const key = String(d);
        const override = (layout.door && layout.door[key]) || null;

        const doorEl = createDoorElement(d, cfg);

        // Apply position/size: use override width/height if present, otherwise cellW/cellH
        const w = override && override.width != null ? override.width : cellW;
        const h = override && override.height != null ? override.height : cellH;
        // If override has left/top, apply absolute; else center within cell
        const appliedLeft = (override && override.left != null) ? override.left : left + (cellW - w)/2;
        const appliedTop  = (override && override.top  != null) ? override.top  : top  + (cellH - h)/2;

        doorEl.style.left = appliedLeft + '%';
        doorEl.style.top = appliedTop + '%';
        doorEl.style.width = w + '%';
        doorEl.style.height = h + '%';

        // ensure door has a lower z-index than the overlay
        doorEl.style.zIndex = '10';
        stage.appendChild(doorEl);
         const numEl = createNumberOverlay(d, doorEl);
        // if this door was previously opened, mark it visually
         if(openedSet.has(String(d))){
           doorEl.classList.add('opened');
           if(numEl) numEl.classList.add('opened');
        //  const badge = doorEl.querySelector('.badge'); if(badge) badge.textContent = 'Geöffnet';
         }

        
      }
    } else {
      // scattered: respect layout.json top/left/width/height if available,
      // fallback to simple grid distribution for missing ones
      for(let d = start; d <= end; d++){
        const key = String(d);
        const props = (layout.door && layout.door[key]) || null;
        const doorEl = createDoorElement(d, cfg);
        if(props){
          if(props.top!=null) doorEl.style.top = props.top + '%';
          if(props.left!=null) doorEl.style.left = props.left + '%';
          if(props.width!=null) doorEl.style.width = props.width + '%';
          if(props.height!=null) doorEl.style.height = props.height + '%';
        } else {
          // fallback placement (simple left to right flow)
          const idx = d - start;
          const cols = Math.ceil(Math.sqrt(end));
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const w = 100 / cols - 2;
          const left = (col * (100 / cols)) + 1;
          const top = row * 22 + 4;
          doorEl.style.left = `${left}%`;
          doorEl.style.top = `${top}%`;
          doorEl.style.width = `${w}%`;
          doorEl.style.height = `16%`;
        }
        stage.appendChild(doorEl);
        const numEl = createNumberOverlay(d, doorEl);
        if(openedSet.has(String(d))){
          doorEl.classList.add('opened');
          if(numEl) numEl.classList.add('opened');
         // const badge = doorEl.querySelector('.badge'); if(badge) badge.textContent = 'Geöffnet';
        }
      }
    }
  }

  function createDoorElement(day, cfg){
    const doorEl = document.createElement('button');
    doorEl.className = 'door';
    doorEl.type = 'button';
    doorEl.setAttribute('aria-label', `Kapitel ${day}`);
    doorEl.dataset.day = String(day);

    const badge = document.createElement('div');
    badge.className = 'badge';
    // badge text is set when the door becomes opened

    const caption = document.createElement('div');
    caption.className = 'caption';
    // caption.textContent = `Dezember ${day}`;

    // append children except the visible number — number overlay is rendered separately
   // doorEl.appendChild(badge);
    doorEl.appendChild(caption);

    const open = isDoorOpen(cfg.year || 2025, cfg.monthIndex || 11, day, cfg.useLocalTime !== false);
    if(open){
      doorEl.addEventListener('click', ()=> openDoor(day, cfg));
    } else {
      doorEl.classList.add('locked');
      doorEl.addEventListener('click', (e)=> {
        e.stopPropagation();
        handleLockedClick(day);
      });
    }
    return doorEl;
  }

  // Create a number overlay outside the .door element so it is not affected by parent's opacity
  function createNumberOverlay(day, doorEl){
    const numEl = document.createElement('div');
    numEl.className = 'door-num';
    numEl.textContent = String(day);
    // copy positioning from doorEl (percent strings)
    numEl.style.position = 'absolute';
    numEl.style.left = doorEl.style.left || '';
    numEl.style.top = doorEl.style.top || '';
    numEl.style.width = doorEl.style.width || '';
    numEl.style.height = doorEl.style.height || '';
    numEl.dataset.for = doorEl.dataset.day || String(day);
    // ensure clicks hit the door, not the overlay
    numEl.style.pointerEvents = 'none';
    // place overlay after the stage children so it sits above
    stage.appendChild(numEl);
    // mirror hover translate so overlay stays visually aligned
    doorEl.addEventListener('mouseenter', ()=> { numEl.style.transform = 'translateY(-4px)'; });
    doorEl.addEventListener('mouseleave', ()=> { numEl.style.transform = ''; });
    // reflect disabled/locked state visually
    const observer = new MutationObserver(()=>{
      if(doorEl.classList.contains('locked')){
        numEl.classList.add('locked');
      } else {
        numEl.classList.remove('locked');
      }
    });
    observer.observe(doorEl, { attributes: true, attributeFilter: ['class'] });
    return numEl;
  }

  async function openDoor(day, cfg){
    modal.setAttribute('aria-hidden','false');
    modal.style.display = 'flex';
    const chapterName = (chapters && chapters[String(day)]) ? chapters[String(day)] : '';
    modalTitle.textContent = chapterName ? `Kapitel ${day} - ${chapterName}` : `Kapitel ${day}`;
    audioContainer.innerHTML = '';
    audioMsg.textContent = 'Suche Audiodatei...';

    // mark as opened (persist and visual)
    markDoorOpened(day);

    const url = await findAudioForDay(day, cfg);
    if(url){
      audioMsg.textContent = '';
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = url;
      audio.preload = 'auto';
      audioContainer.appendChild(audio);
      audio.play().catch(()=>{/* Autoplay blockiert, Nutzer muss Play drücken */});
    } else {
      audioMsg.textContent = `Keine Audiodatei gefunden. Lege eine Datei in ${cfg.audioPath} mit dem Namen z. B. ${cfg.filePrefix}${day}.mp3 ab.`;
    }
  }

  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    modal.style.display = 'none';
    audioContainer.innerHTML = '';
    audioMsg.textContent = '';
  }

  function flashMessage(el, text){
    const msg = document.createElement('div');
    msg.className = 'muted';
    msg.textContent = text;
    msg.style.position = 'absolute';
    msg.style.bottom = '6px';
    msg.style.left = '6px';
    msg.style.right = '6px';
    msg.style.fontSize = '0.78rem';
    msg.style.textAlign = 'center';
    el.appendChild(msg);
    setTimeout(()=> msg.remove(), 2200);
  }

  function isDoorOpen(year, monthIndex, day, useLocal){
    const now = new Date();
    const door = new Date(year, monthIndex, day, 0,0,0,0);
    return now >= door;
  }

  async function findAudioForDay(day, cfg){
    const audioPath = cfg.audioPath;
    const prefix = cfg.filePrefix;
    const tryNames = [];

    // Varianten: Kapitel1 und Kapitel01
    tryNames.push(`${prefix}${day}`);
    const two = String(day).padStart(2,'0');
    if(two !== String(day)) tryNames.push(`${prefix}${two}`);
    tryNames.push(...tryNames.map(s=>s.toLowerCase()));

    const exts = cfg.extensions || ['m4a','mp3','ogg','wav','aac'];

    for(const name of tryNames){
      for(const ext of exts){
        const url = `${audioPath}${name}.${ext}`;
        try{
          const head = await fetch(url, {method:'HEAD'});
          if(head.ok) return url;
        }catch(e){
          try{
            const get = await fetch(url, {method:'GET', cache:'no-cache'});
            if(get.ok) return url;
          }catch(_){}
        }
      }
    }
    return null;
  }

  // helper: fetch json or return default
  async function fetchJsonSafe(path, fallback){
    try{
      const r = await fetch(path, {cache:'no-cache'});
      if(!r.ok) return fallback;
      return await r.json();
    }catch(e){
      return fallback;
    }
  }

  function getDefaultConfig(){
    return {
      "year": 2025,
      "monthIndex": 11,
      "startDay": 1,
      "endDay": 24,
      "audioPath": "/audio/",
      "filePrefix": "Kapitel",
      "extensions": ["m4a","mp3","ogg","wav"],
      "useLocalTime": true,
      "backgroundImage": "assets/bg.jpg",
      "backgroundSize": "cover",
      "layoutMode": "sequential",
      "cols": 6,
      "gridGap": 2,
      "doorOpacity": 0.72
    };
  }

  function getDefaultLayout(){
    // Beispielgrößen: einige Türen größer (nur Größen; positions werden im sequential mode berechnet)
    return {
      "door": {
        "1": { "width": 14, "height": 18 },
        "5": { "width": 16, "height": 20 },
        "7": { "width": 18, "height": 22 },
        "13": { "width": 16, "height": 20 },
        "24": { "width": 20, "height": 24 }
      }
    };
  }

})();