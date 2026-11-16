window.STIKS = {
  db: { families: {}, session: null },
  squad: [],
  activeFamily: null,
  invOpen: false,
  profileOpen: false,
  lobbyPaused: false,
  voiceOn: true,
  DB_KEY: 'stiks_prod_db',
  BACKUP_KEY: 'stiks_prod_db_safe_backup',

  log(m) {
    const b = document.getElementById('sys-log');
    if (b) b.innerHTML = '> ' + m + '<br>' + b.innerHTML;
  },

  _hasFamilies(obj) {
    return Boolean(obj && obj.families && typeof obj.families === 'object' && Object.keys(obj.families).length > 0);
  },

  _tryParse(raw) {
    if (!raw || typeof raw !== 'string') return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  },

  saveDB() {
    try {
      const existing = this._tryParse(localStorage.getItem(this.DB_KEY));
      if (!this._hasFamilies(this.db) && this._hasFamilies(existing)) {
        this.db.families = JSON.parse(JSON.stringify(existing.families));
      }
      const serialized = JSON.stringify(this.db);
      localStorage.setItem(this.DB_KEY, serialized);
      if (this._hasFamilies(this.db)) {
        localStorage.setItem(this.BACKUP_KEY, serialized);
      }
    } catch (e) {}
  },

  loadDB() {
    let loaded = this._tryParse(localStorage.getItem(this.DB_KEY));
    if (!this._hasFamilies(loaded)) {
      const candidates = [this.BACKUP_KEY, 'stiks_prod_db_backup', 'stiks_db', 'STIKS_DB'];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !candidates.includes(k) && (k.includes('stiks') || k.includes('db') || k.includes('save'))) {
          candidates.push(k);
        }
      }
      for (const k of candidates) {
        const parsed = this._tryParse(localStorage.getItem(k));
        if (this._hasFamilies(parsed)) {
          loaded = parsed;
          break;
        }
      }
    }
    if (loaded && typeof loaded === 'object') {
      this.db = Object.assign({ families: {}, session: null }, loaded);
    }
    if (!this.db.families || typeof this.db.families !== 'object') {
      this.db.families = {};
    }
    this.sanitizeRoster();
  },

  ensureStaticLabels() {
    document.querySelectorAll('button').forEach(btn => {
      if (btn.innerText.includes('Сейвы Кланов')) {
        btn.innerText = btn.innerText.replace('Сейвы Кланов', 'Сейвы Фамилий');
      }
      if (btn.innerHTML.includes('🚀')) {
        btn.innerHTML = btn.innerHTML.replace(/🚀/g, '🩸');
      }
    });
    const w = document.querySelector('.wrapper');
    if (w && !document.getElementById('authors-footer')) {
      const ft = document.createElement('div');
      ft.id = 'authors-footer';
      ft.style.cssText = 'margin-top:10px;padding-top:6px;border-top:1px solid #6e2626;text-align:center;font-size:11px;color:#d68a8a;line-height:1.45;';
      ft.innerHTML = '<div>Авторы проекта — семейство эльфов</div><div style="font-size:10px;color:#b87474;">по мотивам произведений Артема Каменистого</div>';
      w.appendChild(ft);
    }
    if (!document.getElementById('stiks-v182-red-theme')) {
      const st = document.createElement('style');
      st.id = 'stiks-v182-red-theme';
      st.textContent = '.wrapper, .box, .card, .panel, .modal-box, .header, #game-viewport > div > div { border-color: #6e2626 !important; } .btn { border-color: #6e2626 !important; } .btn-primary { background: #3b1515 !important; border-color: #8f2d2d !important; color: #f5d6d6 !important; }';
      document.head.appendChild(st);
    }
    const badge = document.getElementById('patch-status');
    if (badge) badge.innerText = 'Ядро: v1.8.2';
  },

  PRONOUNS: /(^|\s)(я|меня|мне|мной|мною|мы|нас|нам|нами|ты|тебя|тебе|тобой|тобою|вы|вас|вам|вами|он|его|ему|им|нём|она|её|ей|ею|ней|оно|они|их|ими|них|мой|моя|моё|мои|твой|твоя|твоё|твои|свой|своя|своё|свои|наш|наша|наше|наши|ваш|ваша|ваше|ваши|этот|эта|это|эти|тот|та|то|те|кто|что|кого|чего|кому|чему|кем|чем|себя|себе|собой|собою|что-то|кто-то|кое-что)(?=[\s.,!?]|$)/gi,
  HUNT_WORDS: /(^|\s)([а-яА-ЯёЁ]*(?:кров|укус|куса|еда|еду|еды|есть|жра|сожр|пожр|мяс|плот|добыч|голод|разорв|грыз)[а-яА-ЯёЁ]*)(?=[\s.,!?]|$)/gi,

  playGrowl(sec) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator();
      const g = ctx.createGain(), lg = ctx.createGain();
      o1.type = 'sawtooth'; o1.frequency.value = 38;
      o2.type = 'triangle'; o2.frequency.value = 65;
      lfo.frequency.value = 15; lg.gain.value = 12;
      lfo.connect(lg); lg.connect(o1.frequency);
      g.gain.setValueAtTime(0.14, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sec);
      o1.connect(g); o2.connect(g); g.connect(ctx.destination);
      o1.start(); o2.start(); lfo.start();
      o1.stop(ctx.currentTime + sec); o2.stop(ctx.currentTime + sec); lfo.stop(ctx.currentTime + sec);
    } catch (e) {}
  },

  playDoubleSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      [523.25, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.18, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.17);
      });
    } catch (e) {}
  },

  playStepSound(mode) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      const steps = mode === 'run' ? [0, 0.11, 0.22] : (mode === 'fast' ? [0, 0.16] : [0]);
      const baseFreq = mode === 'run' ? 115 : (mode === 'fast' ? 95 : 75);
      const peak = mode === 'run' ? 0.16 : (mode === 'fast' ? 0.11 : 0.06);
      steps.forEach(off => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now + off);
        osc.frequency.exponentialRampToValueAtTime(34, now + off + 0.08);
        gain.gain.setValueAtTime(peak, now + off);
        gain.gain.exponentialRampToValueAtTime(0.001, now + off + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + off);
        osc.stop(now + off + 0.095);
      });
    } catch (e) {}
  },

  playRustleSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const bufSize = Math.floor(ctx.sampleRate * 0.22);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufSize) * Math.PI);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 1.4;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.21);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch (e) {}
  },

  styleStripWord(w) {
    const m = [...w.matchAll(/[аеёиоуыэюяАЕЁИОУЫЭЮЯ]/g)];
    if (m.length === 0 || m.length > 3) return w;
    const target = m.length === 3 ? 1 : 0;
    const pos = m[target].index;
    return w.slice(0, pos) + w[pos].toUpperCase() + w.slice(pos + 1);
  },

  corruptInfectedGrammar(txt) {
    if (Math.random() >= 0.5) return txt;
    const map = { 'крови': 'кровь', 'плоти': 'плоть', 'добычу': 'добыча', 'куски': 'кускам', 'запах': 'запахом', 'руинах': 'руины', 'след': 'следом', 'врага': 'враг', 'мясо': 'мясу', 'еду': 'еда' };
    return txt.replace(/[а-яА-ЯёЁ]+/g, w => {
      const low = w.toLowerCase();
      if (map[low]) {
        const rep = map[low];
        return w === w.toUpperCase() ? rep.toUpperCase() : rep;
      }
      return w;
    });
  },

  formatSpeech(role, txt) {
    if (role === 'infected') {
      let t = this.corruptInfectedGrammar(txt);
      t = t.replace(this.HUNT_WORDS, (m, sp, w) => sp + w.toUpperCase() + '!');
      return t.replace(/р/g, 'рр').replace(/Р/g, 'Рр').replace(/о/g, 'О');
    }
    if (role === 'prof') {
      let t = txt.replace(/[^.!?]+[.!?]*/g, sent => {
        const words = sent.trim().split(/\s+/).filter(Boolean);
        return words.length > 5 ? sent.replace(/,/g, ', мм,') : sent;
      });
      t = t.replace(/р(?=[аА])/g, 'ох').replace(/Р(?=[аА])/g, 'Ох');
      return t.replace(/([рРлЛ])(?=[еиЕИ])/g, '$1ь');
    }
    if (role === 'alkash') return txt.replace(this.PRONOUNS, '$1$2 |HIC| ');
    if (role === 'kachok') return txt.replace(this.PRONOUNS, (m, sp, w) => sp + w.toUpperCase() + '! |KPAUSE|');
    if (role === 'asiat') {
      const t = txt.replace(/,/g, ', эмм, ');
      return t.replace(/я/g, 'йа').replace(/Я/g, 'Йа').replace(/ё/g, 'йо').replace(/Ё/g, 'Йо').replace(/е/g, 'йэ').replace(/Е/g, 'Йэ');
    }
    if (role === 'tatan') return txt.replace(/е/g, 'ее').replace(/Е/g, 'Ее');
    if (role === 'strip') {
      const t = txt.replace(/\?/g, '!?').replace(/\./g, '!');
      return t.replace(/[а-яА-ЯёЁ]+/g, w => this.styleStripWord(w));
    }
    return txt;
  },

  sayAs(role, txt, onDone) {
    const voiceBtn = document.getElementById('btn-voice');
    const isMuted = (voiceBtn && voiceBtn.innerText.includes('ВЫКЛ')) || !this.voiceOn;
    if (isMuted || !('speechSynthesis' in window)) {
      if (onDone) onDone();
      return;
    }
    window.speechSynthesis.cancel();
    const styledTxt = this.formatSpeech(role, txt);
    const dbVoice = (window.STIKS_DB && window.STIKS_DB.VOICE_CFG && window.STIKS_DB.VOICE_CFG[role]) || null;
    const femRoles = ['tatan', 'strip', 'nanny', 'cashier', 'schoolgirl', 'vet'];
    let cfg = dbVoice || { p: femRoles.includes(role) ? 1.18 : 0.9, r: 1.05, pause: 180 };
    const s = this.db && this.db.session;
    if (s && s.players && s.players[s.activeIdx] && role === 'tatan' && (s.players[s.activeIdx].lvl || 0) >= 15 && cfg.p15) {
      cfg = Object.assign({}, cfg, { p: cfg.p15 });
    }
    const queue = [];
    styledTxt.split('|HIC|').forEach((seg, idx, arr) => {
      seg.split('|KPAUSE|').forEach((sub, sIdx, sArr) => {
        sub.split(/([.!?]+|,)/).reduce((acc, cur) => {
          const t = cur.trim();
          if (!t) return acc;
          if (/^[.!?]+$|,$/.test(t)) {
            if (acc.length) acc[acc.length - 1] += t;
          } else acc.push(t);
          return acc;
        }, []).forEach((c, cIdx, cArr) => {
          const isLastK = (sIdx < sArr.length - 1 && cIdx === cArr.length - 1);
          const hasPunct = /[.!?,]+$/.test(c);
          queue.push({ t: c, hic: false, kp: isLastK, pp: hasPunct });
        });
      });
      if (idx < arr.length - 1) queue.push({ t: 'иИииК!', hic: true, kp: false, pp: false });
    });

    const vs = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().includes('ru'));
    const mikh = vs.find(v => /mikhail/i.test(v.name)) || vs[0];
    if (cfg.growl) this.playGrowl(Math.min(7, styledTxt.length * 0.07));

    const speakNext = () => {
      const item = queue.shift();
      if (!item) {
        if (onDone) setTimeout(onDone, 350);
        return;
      }
      const u = new SpeechSynthesisUtterance(item.t);
      u.lang = 'ru-RU';
      if (mikh) u.voice = mikh;
      u.pitch = item.hic ? 1.65 : cfg.p;
      u.rate = item.hic ? 2.50 : cfg.r;
      let pause = cfg.pause || 180;
      if (item.hic) pause = 90;
      else if (item.kp) pause = Math.round(pause * 1.2);
      else if (item.pp && cfg.punctPause) pause = cfg.punctPause;
      u.onend = () => setTimeout(speakNext, pause);
      u.onerror = () => setTimeout(speakNext, pause);
      window.speechSynthesis.speak(u);
    };
    speakNext();
  },

  isFem(p) {
    if (!p || p.asInfected) return false;
    const archs = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES) || {};
    if (archs[p.arch] && archs[p.arch].sex) return archs[p.arch].sex === 'f';
    return ['tatan', 'strip', 'nanny', 'cashier', 'schoolgirl', 'vet'].includes(p.arch);
  },

  MULT_MAP: {
    tatan:      { str: 3, agi: 0.5, spd: 0.5, end: 2, int: 1, spi: 1 },
    kachok:     { str: 3, agi: 1, spd: 0.5, end: 3, int: 0.2, spi: 1 },
    asiat:      { str: 1, agi: 3, spd: 1, end: 1, int: 0.5, spi: 0.5 },
    prof:       { str: 0.5, agi: 0.5, spd: 0.5, end: 0.5, int: 3, spi: 2 },
    alkash:     { str: 1.5, agi: 0.5, spd: 0.5, end: 2.5, int: 0.5, spi: 1.5 },
    strip:      { str: 0.5, agi: 2.5, spd: 2.5, end: 1, int: 1, spi: 1 },
    surgeon:    { str: 0.5, agi: 2, spd: 1, end: 1, int: 2.5, spi: 1 },
    nanny:      { str: 0.5, agi: 1, spd: 1, end: 1.5, int: 1.5, spi: 2.5 },
    cashier:    { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 1.5, spi: 1.5 },
    gigolo:     { str: 1, agi: 2, spd: 2, end: 1, int: 1.5, spi: 2 },
    schoolgirl: { str: 0.5, agi: 2, spd: 2.5, end: 0.5, int: 1.5, spi: 1.5 },
    vet:        { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 2.5, spi: 1.5 },
    infected:   { str: 2, agi: 2, spd: 2, end: 2, int: 0.5, spi: 1 }
  },

  LVL_TABLE: [
    60, 68, 76, 84, 92, 100, 110, 121, 132, 145, 159,
    175, 192, 211, 231, 255, 279, 307, 338, 372, 409,
    449, 493, 541, 594, 653, 718, 790, 869, 955, 1051,
    1155, 1269, 1397, 1535, 1687, 1855, 2039, 2245, 2469, 2717,
    2989, 3287, 3615, 3975, 4373, 4811, 5291, 5819, 6402, 7042,
    7746, 8521, 9375, 10312, 11344, 12479, 13727, 15102, 16613, 18276
  ],

  _round100(v) {
    return Math.round((Number(v) || 0) * 100) / 100;
  },

  _cleanSporans(obj) {
    if (!obj) return 0;
    const a = Number(obj.spores);
    const b = Number(obj.sporans);
    const va = (isFinite(a) && a >= 0 && a <= 1000000) ? Math.floor(a) : 0;
    const vb = (isFinite(b) && b >= 0 && b <= 1000000) ? Math.floor(b) : 0;
    const val = Math.max(va, vb);
    obj.spores = val;
    obj.sporans = val;
    return val;
  },

  stackInventory(inv) {
    if (!Array.isArray(inv)) return [];
    const out = [];
    const equipCats = ['weapon', 'main', 'side', 'melee', 'armor', 'clothes', 'boots', 'bag', 'mod', 'meleemod', 'talisman'];
    inv.forEach(raw => {
      if (!raw) return;
      const nm = String(raw.n || raw.name || '').trim();
      const low = nm.toLowerCase();
      if (raw.isSporan || raw.type === 'sporan' || low === 'споран' || low === 'спораны') return;
      const cat = String(raw.cat || raw.type || raw.slot || '').toLowerCase();
      const isEq = equipCats.includes(cat);
      const qty = Math.max(1, Number(raw.q !== undefined ? raw.q : (raw.qty !== undefined ? raw.qty : 1)) || 1);
      const item = JSON.parse(JSON.stringify(raw));
      item.q = qty;
      item.qty = qty;
      if (!isEq) {
        const found = out.find(x => String(x.n || x.name || '').trim() === nm && Number(x.rank || 1) === Number(item.rank || 1));
        if (found) {
          found.q = (Number(found.q) || 1) + qty;
          found.qty = found.q;
          return;
        }
      }
      out.push(item);
    });
    return out;
  },

  defaultSlots() {
    return { main: null, side: null, melee: null, mag: null, mod: null, meleeMod: null, armor: null, clothes: null, boots: null, bag: null, talisman: null };
  },

  normalizePlayerStats(p) {
    if (!p) return;
    if (!p.stats) p.stats = { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };
    if (!p.slots || typeof p.slots !== 'object') p.slots = this.defaultSlots();
    else p.slots = Object.assign(this.defaultSlots(), p.slots);

    const endVal = Number(p.stats.end || 10);
    const strVal = Number(p.stats.str || 10);
    const spiVal = Number(p.stats.spi || 10);
    const isTatan = (p.arch === 'tatan' && !p.asInfected);
    const isKachok = (p.arch === 'kachok' && !p.asInfected);

    const calcMaxHp = Math.max(10, 10 + endVal);
    const wasFresh = !p._hpInit;
    p.maxHp = calcMaxHp;
    if (wasFresh || typeof p.hp !== 'number' || p.hp > p.maxHp) {
      p.hp = p.maxHp;
      p._hpInit = true;
    }
    p.hp = Math.max(0, Math.min(p.maxHp, p.hp));

    p.maxFood = (isTatan ? 240 : 50) + Math.floor(endVal / 10);
    p.maxWater = (isTatan ? 100 : 50) + Math.floor(endVal / 10);
    p.maxStamina = 50 + Math.floor(endVal / 5);
    p.maxSpore = 50 + Math.floor(endVal / 10) + Math.floor(spiVal / 10);
    p.maxMana = 10 + spiVal;
    p.maxAp = 6 + Math.floor((Number(p.stats.spd) || 10) / 100);

    if (typeof p.food !== 'number' || p.food > p.maxFood) p.food = p.maxFood;
    if (typeof p.water !== 'number' || p.water > p.maxWater) p.water = p.maxWater;
    if (typeof p.stamina !== 'number' || p.stamina > p.maxStamina) p.stamina = p.maxStamina;
    if (typeof p.spore !== 'number') p.spore = p.maxSpore;
    p.spore = Math.max(0, Math.min(p.maxSpore, p.spore));
    if (typeof p.mana !== 'number' || p.mana > p.maxMana) p.mana = p.maxMana;
    if (typeof p.stepsLeft !== 'number') p.stepsLeft = p.maxAp;
    p.stepsLeft = Math.max(0, Math.min(p.maxAp, p.stepsLeft));

    const carryMult = isKachok ? 3 : 1;
    const bagBonus = p.slots.bag ? (Number(p.slots.bag.bag || p.slots.bag.cap || p.slots.bag.bonus || 15) || 15) : 0;
    p.maxWeight = Math.round(((10 + strVal * 0.1) * carryMult + bagBonus) * 10) / 10;

    if (!Array.isArray(p.inv)) p.inv = [];
    this._cleanSporans(p);
    if (p.asInfected || p.knowsSpores || p.sporeKnown || p.knowsRecipe || (p.missionsDone || 0) >= 1 || (p.lvl || 0) >= 1) {
      p.knowsSpores = true;
      p.sporeKnown = true;
      p.knowsRecipe = true;
    }
  },

  grantActionXp(p, statKey, baseDelta) {
    if (!p || !statKey || !baseDelta) return;
    if (!p.stats) p.stats = { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };
    const archKey = p.asInfected ? 'infected' : p.arch;
    const multObj = this.MULT_MAP[archKey] || {};
    let m = Number(multObj[statKey]) || 1;
    if (archKey === 'kachok' && (p.lvl || 0) >= 15 && (statKey === 'str' || statKey === 'end')) m = 4;
    if (archKey === 'tatan' && (p.lvl || 0) >= 15 && (statKey === 'agi' || statKey === 'spd') && m < 1) m = 1;
    if (archKey === 'asiat' && (p.lvl || 0) >= 15 && (statKey === 'int' || statKey === 'spi') && m < 1) m = 1;
    const delta = this._round100(baseDelta * m);
    if (delta <= 0) return;
    p.stats[statKey] = this._round100((Number(p.stats[statKey]) || 10) + delta);
    this.recalcLevel(p);
    this.normalizePlayerStats(p);
  },

  recalcLevel(p) {
    if (!p || !p.stats) return false;
    let sum = 0;
    ['str', 'agi', 'spd', 'end', 'int', 'spi'].forEach(k => { sum += Number(p.stats[k]) || 0; });
    sum = this._round100(sum);
    let newLvl = 0;
    for (let i = 1; i < this.LVL_TABLE.length; i++) {
      if (sum >= this.LVL_TABLE[i]) newLvl = i;
      else break;
    }
    if (sum > this.LVL_TABLE[60]) {
      let curT = this.LVL_TABLE[60];
      let l = 60;
      while (sum >= Math.round(curT * 1.1)) {
        curT = Math.round(curT * 1.1);
        l++;
      }
      newLvl = l;
    }
    const oldLvl = p.lvl || 0;
    if (newLvl > oldLvl) {
      p.lvl = newLvl;
      if (newLvl >= 2 && !p.asInfected) p.skillUnlocked = true;
      if (newLvl >= 15 && !p.darUnlocked) {
        p.darUnlocked = true;
        const aInfo = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES && window.STIKS_DB.ARCHETYPES[p.arch]) || {};
        this.log('🌟 ' + p.name + ' достиг 15 ур. и раскрыл уникальный Дар: ' + (aInfo.dar15 || 'Пробуждение') + '!');
      }
      this.log('⬆️ Уровень повышен! ' + p.name + ' теперь Ур.' + newLvl + ' (сумма навыков: ' + sum + ').');
      return true;
    }
    return false;
  },

  syncHeroProfile(pl) {
    if (!pl || !this.db || !this.db.families) return null;
    this._cleanSporans(pl);
    pl.inv = this.stackInventory(pl.inv || []);
    const list = this.db.families[pl.family] || [];
    const target = list.find(h => h.uid === pl.uid);
    if (target) {
      target.lvl = Math.max(Number(target.lvl) || 0, Number(pl.lvl) || 0);
      if (pl.stats) target.stats = Object.assign({}, target.stats || {}, pl.stats);
      target.inv = JSON.parse(JSON.stringify(pl.inv));
      if (pl.slots) target.slots = JSON.parse(JSON.stringify(pl.slots));
      target.spores = pl.spores;
      target.sporans = pl.spores;
      target.missionsDone = Math.max(Number(target.missionsDone) || 0, Number(pl.missionsDone) || 0);
      if (pl.knowsSpores || pl.sporeKnown || target.missionsDone >= 1 || target.lvl >= 1) {
        target.knowsSpores = true;
        target.sporeKnown = true;
        target.knowsRecipe = true;
      }
      if (pl.skillUnlocked) target.skillUnlocked = true;
      if (pl.darUnlocked) target.darUnlocked = true;
      target.hp = pl.hp;
      target.maxHp = pl.maxHp;
      target.status = pl.dead ? 'dead' : (pl.escaped ? 'ready' : target.status);
    }
    if (Array.isArray(this.squad)) {
      this.squad.forEach((sq, idx) => {
        if (sq && sq.uid === pl.uid && target) {
          this.squad[idx] = JSON.parse(JSON.stringify(target));
        }
      });
    }
    return target;
  },

  sanitizeRoster() {
    if (!this.db || !this.db.families) return;
    const hasActive = Boolean(this.db.session && Array.isArray(this.db.session.players) && this.db.session.players.length > 0);
    const femKeys = ['tatan', 'strip', 'nanny', 'cashier', 'schoolgirl', 'vet'];
    const maleKeys = ['kachok', 'asiat', 'prof', 'alkash', 'surgeon', 'gigolo'];
    const archs = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES) || {};
    let changed = false;

    Object.keys(this.db.families).forEach(fam => {
      (this.db.families[fam] || []).forEach(hr => {
        if (!hasActive && hr.status === 'in_raid') {
          hr.status = 'ready';
          changed = true;
        }
        this._cleanSporans(hr);
        if (!hr.isInfected && !hr.asInfected && hr.arch && hr.arch !== 'infected') {
          if (hr.sex === 'm' && femKeys.includes(hr.arch)) {
            const pick = maleKeys[Math.floor(Math.random() * maleKeys.length)];
            hr.arch = pick;
            hr.origArch = pick;
            if ((hr.lvl || 0) === 0 && archs[pick] && archs[pick].stats) hr.stats = Object.assign({}, archs[pick].stats);
            changed = true;
          } else if (hr.sex === 'f' && maleKeys.includes(hr.arch)) {
            const pick = femKeys[Math.floor(Math.random() * femKeys.length)];
            hr.arch = pick;
            hr.origArch = pick;
            if ((hr.lvl || 0) === 0 && archs[pick] && archs[pick].stats) hr.stats = Object.assign({}, archs[pick].stats);
            changed = true;
          }
        }
      });
    });
    if (changed) this.saveDB();
  },

  // =========================================================================
  // 4. УПРАВЛЕНИЕ ФАМИЛИЯМИ, ПЕРСОНАЖАМИ, ОТРЯДОМ И СМЕНОЙ ХОДА
  // =========================================================================
  exportSave() {
    const cur = JSON.stringify(this.db);
    const d = prompt('Скопируйте код сохранения или вставьте чужой:', cur);
    if (d && d !== cur) {
      try {
        const parsed = JSON.parse(d);
        if (parsed && typeof parsed === 'object') {
          this.db = Object.assign({ families: {}, session: null }, parsed);
          this.saveDB();
          location.reload();
        }
      } catch (e) {
        alert('Ошибка кода сохранения');
      }
    }
  },

  addFamily() {
    const el = document.getElementById('new-fam');
    const val = el ? el.value.trim() : '';
    if (!val) return;
    if (!this.db.families[val]) this.db.families[val] = [];
    this.activeFamily = val;
    if (el) el.value = '';
    this.saveDB();
    if (this.renderLobby) this.renderLobby();
  },

  selectFamily(f) {
    this.activeFamily = f;
    if (this.renderLobby) this.renderLobby();
  },

  addHero() {
    if (!this.activeFamily) return;
    const inp = document.getElementById('hero-name');
    const sexEl = document.getElementById('hero-sex');
    const archEl = document.getElementById('hero-arch');
    const name = inp ? inp.value.trim() : '';
    if (!name) {
      this.log('Введите имя персонажа.');
      return;
    }
    const sex = sexEl ? sexEl.value : 'm';
    const archs = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES) || {};
    const femKeys = ['tatan', 'strip', 'nanny', 'cashier', 'schoolgirl', 'vet'];
    const maleKeys = ['kachok', 'asiat', 'prof', 'alkash', 'surgeon', 'gigolo'];

    let chosen = archEl ? archEl.value : '';
    if (!chosen || chosen === 'infected' || !archs[chosen]) {
      let pool = Object.keys(archs).filter(k => {
        if (k === 'infected') return false;
        const a = archs[k] || {};
        if (a.sex === 'f') return sex === 'f';
        if (a.sex === 'm') return sex === 'm';
        return sex === 'f' ? femKeys.includes(k) : maleKeys.includes(k);
      });
      if (!pool.length) pool = sex === 'f' ? femKeys : maleKeys;
      chosen = pool[Math.floor(Math.random() * pool.length)];
    }

    const aObj = archs[chosen] || { stats: { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 } };
    const st = Object.assign({ str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 }, aObj.stats || {});
    const hero = {
      uid: 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      family: this.activeFamily,
      name,
      sex,
      arch: chosen,
      origArch: chosen,
      lvl: 0,
      status: 'ready',
      isInfected: false,
      asInfected: false,
      stats: st,
      actionsCount: 0,
      skillUnlocked: false,
      darUnlocked: false,
      knowsSpores: false,
      sporeKnown: false,
      knowsRecipe: false,
      missionsDone: 0,
      spores: 0,
      sporans: 0,
      hp: 10 + Number(st.end || 10),
      maxHp: 10 + Number(st.end || 10),
      inv: [],
      stash: [],
      slots: this.defaultSlots()
    };
    this.normalizePlayerStats(hero);
    this.db.families[this.activeFamily] = this.db.families[this.activeFamily] || [];
    this.db.families[this.activeFamily].push(hero);
    if (inp) inp.value = '';
    this.saveDB();
    this.log(`Создан персонаж: ${this.activeFamily} ${name} (${sex === 'f' ? 'Жен.' : 'Муж.'}, ОЗ: ${hero.maxHp}). Роль скрыта до 2 ур.`);
    if (this.renderLobby) this.renderLobby();
  },

  resetDeadHero(fam, idx) {
    const list = this.db && this.db.families && this.db.families[fam];
    const hr = list && list[idx];
    if (!hr) return;
    const archs = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES) || {};
    let targetArch = (hr.origArch && hr.origArch !== 'infected' && archs[hr.origArch]) ? hr.origArch : null;
    if (!targetArch) {
      const pool = Object.keys(archs).filter(k => k !== 'infected' && (!hr.sex || archs[k].sex === hr.sex));
      targetArch = pool[Math.floor(Math.random() * pool.length)] || 'kachok';
    }
    const baseStats = (archs[targetArch] && archs[targetArch].stats)
      ? Object.assign({}, archs[targetArch].stats)
      : { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };

    hr.arch = targetArch;
    hr.origArch = targetArch;
    hr.isInfected = false;
    hr.asInfected = false;
    hr.status = 'ready';
    hr.lvl = 0;
    hr.skillUnlocked = false;
    hr.darUnlocked = false;
    hr.stats = baseStats;
    hr.inv = [];
    hr.slots = this.defaultSlots();
    hr._hpInit = false;
    this.normalizePlayerStats(hr);
    this.squad = (this.squad || []).filter(s => s.uid !== hr.uid);
    this.saveDB();
    this.log(`🔄 Персонаж ${hr.name} обнулён до 0 ур. (человек, базовые параметры).`);
    if (this.renderLobby) this.renderLobby();
  },

  delHero(fam, idx) {
    if (confirm('Точно удалить персонажа навсегда?')) {
      const h = this.db.families[fam][idx];
      if (h) this.squad = this.squad.filter(s => s.uid !== h.uid);
      this.db.families[fam].splice(idx, 1);
      this.saveDB();
      if (this.renderLobby) this.renderLobby();
    }
  },

  unlockHero(fam, idx) {
    const h = this.db && this.db.families && this.db.families[fam] && this.db.families[fam][idx];
    if (!h) return;
    if (h.status === 'dead') {
      this.resetDeadHero(fam, idx);
      return;
    }
    h.status = 'ready';
    this.saveDB();
    this.log(`🔓 Статус героя ${h.name} сброшен на «Готов к рейду».`);
    if (this.renderLobby) this.renderLobby();
  },

  toggleSquad(fam, idx, forceInfected) {
    const h = this.db && this.db.families && this.db.families[fam] && this.db.families[fam][idx];
    if (!h) return;
    if (this.squad.some(s => s.uid === h.uid)) return;
    const asInf = Boolean(forceInfected) || h.status === 'dead' || Boolean(h.isInfected);
    const copy = JSON.parse(JSON.stringify(h));
    copy.asInfected = asInf;
    if (asInf) {
      copy.isInfected = true;
      copy.arch = 'infected';
    } else {
      copy.isInfected = false;
      if (copy.arch === 'infected' && copy.origArch && copy.origArch !== 'infected') {
        copy.arch = copy.origArch;
      }
    }
    this.squad.push(copy);
    this.log(asInf ? `☣️ В отряд добавлен Особый заражённый: ${h.name}` : `➕ В отряд добавлен: ${h.name}`);
    if (this.renderLobby) this.renderLobby();
  },

  removeSquad(i) {
    this.squad.splice(i, 1);
    if (this.renderLobby) this.renderLobby();
  },

  pauseToLobby() {
    const s = this.db && this.db.session;
    if (s && Array.isArray(s.players)) {
      s.players.forEach(pl => this.syncHeroProfile(pl));
    }
    this.profileOpen = false;
    this.invOpen = false;
    this.lobbyPaused = true;
    this.saveDB();
    this.log('🏕 Рейд поставлен на паузу. Прогресс сохранён.');
    if (this.renderLobby) this.renderLobby();
  },

  resumeRaid() {
    this.lobbyPaused = false;
    if (this.db && this.db.session && this.renderGame) this.renderGame();
    else if (this.renderLobby) this.renderLobby();
  },

  finishPausedRaid() {
    const s = this.db && this.db.session;
    if (!s) return;
    const snaps = Array.isArray(s.raidSnapshot) ? s.raidSnapshot : [];
    (s.players || []).forEach(pl => {
      const list = (this.db.families && this.db.families[pl.family]) || [];
      const target = list.find(h => h.uid === pl.uid);
      const orig = snaps.find(sn => sn.uid === pl.uid);
      if (target) {
        if (orig) {
          target.lvl = orig.lvl || 0;
          target.stats = Object.assign({}, orig.stats || {});
          target.inv = Array.isArray(orig.inv) ? JSON.parse(JSON.stringify(orig.inv)) : [];
          target.slots = orig.slots ? JSON.parse(JSON.stringify(orig.slots)) : this.defaultSlots();
          target.spores = orig.spores || 0;
          target.sporans = orig.spores || 0;
          target.status = orig.dead ? 'dead' : 'ready';
        } else {
          target.status = pl.dead ? 'dead' : 'ready';
        }
      }
    });
    this.db.session = null;
    this.lobbyPaused = false;
    this.squad = [];
    this.sanitizeRoster();
    this.saveDB();
    this.log('🏁 Рейд завершён досрочно. Прогресс текущего захода аннулирован.');
    if (this.renderLobby) this.renderLobby();
  },

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
    if (this.profileOpen) this.invOpen = false;
    if (this.renderGame) this.renderGame();
  },

  toggleInv() {
    this.invOpen = !this.invOpen;
    if (this.invOpen) this.profileOpen = false;
    if (this.renderGame) this.renderGame();
  },

  getStatHint(k, val) {
    const map = {
      str: val >= 14 ? 'Я сильный' : (val <= 8 ? 'Я слабый' : 'Сила в норме'),
      agi: val >= 14 ? 'Я ловкий' : (val <= 8 ? 'Я неуклюжий' : 'Ловкость обычная'),
      spd: val >= 13 ? 'Я быстрый' : (val <= 8 ? 'Я медлительный' : 'Шаг уверенный'),
      end: val >= 14 ? 'Я выносливый' : (val <= 9 ? 'Я быстро выдыхаюсь' : 'Запас сил средний'),
      int: val >= 14 ? 'Я сообразительный' : (val <= 8 ? 'Голова туго варит' : 'Ум ясный'),
      spi: val >= 14 ? 'Я крепкий духом' : (val <= 9 ? 'Мне тревожно' : 'Дух ровный')
    };
    return map[k] || '';
  },

  nextTurn() {
    const s = this.db && this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (p && !p.escaped && !p.dead) {
      const dr = p.hp < (p.maxHp * 0.5) ? 2 : 1;
      p.spore = Math.max(0, (p.spore || 0) - dr);
      p.food = Math.max(0, (p.food || 0) - 1);
      p.water = Math.max(0, (p.water || 0) - 1);
      if (p.stinkTurns > 0) p.stinkTurns--;
      if (!p.asInfected && p.spore < 10 && !p._sporeFaintWarn) {
        p._sporeFaintWarn = true;
        this.log('⚠️ Критически низкий споровый баланс (<10%)! Силы на исходе.');
      } else if (p.spore >= 10) {
        p._sporeFaintWarn = false;
      }
      this.syncHeroProfile(p);
    }

    s.activeIdx++;
    if (s.activeIdx >= s.players.length) {
      s.activeIdx = 0;
      s.turn++;
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      (s.zombies || []).forEach(z => {
        if (z.type === 'ambush' && z.hidden && !z.tPos) return;
        let tx = z.x, ty = z.y;
        if (z.tPos) {
          tx += Math.sign(z.tPos.x - z.x);
          ty += Math.sign(z.tPos.y - z.y);
          if (tx === z.tPos.x && ty === z.tPos.y) z.tPos = null;
        } else {
          const d = dirs[Math.floor(Math.random() * 4)];
          tx += d[0];
          ty += d[1];
        }
        if (tx >= 0 && tx <= 59 && ty >= 0 && ty <= 59 && !s.grid[ty][tx].blocked) {
          z.x = tx;
          z.y = ty;
        }
      });
      this.log(`--- ХОД ${s.turn} ---`);
    }

    const np = s.players[s.activeIdx];
    if (np.escaped || np.dead) {
      if (s.players.every(pl => pl.escaped || pl.dead)) {
        this.db.session = null;
        this.lobbyPaused = false;
        this.squad = [];
        this.sanitizeRoster();
        this.saveDB();
        if (this.renderLobby) this.renderLobby();
        return;
      }
      this.nextTurn();
      return;
    }

    this.normalizePlayerStats(np);
    np.stepsLeft = np.maxAp;
    np.movedThisTurn = false;
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  // =========================================================================
  // 5. ГЕНЕРАЦИЯ КАРТЫ 60x60 И СТАРТ РЕЙДА
  // =========================================================================
  validateMap60(g) {
    let dead = 0;
    const dirs = [[0, -1], [1, 0], [-1, 0], [0, 1]];
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < 60; x++) {
        if (g[y][x].blocked) continue;
        let w = 0;
        for (let i = 0; i < 4; i++) {
          const nx = x + dirs[i][0], ny = y + dirs[i][1];
          if (nx < 0 || nx > 59 || ny < 0 || ny > 59 || g[ny][nx].blocked) w++;
        }
        if (w === 4) return false;
        if (w === 3) dead++;
        if (dead > 1) return false;
      }
    }
    return true;
  },

  applyNewbieStarter(p, diffKey) {
    if (!p || p._starterApplied) return;
    if ((p.lvl || 0) !== 0 || diffKey !== 'start') return;
    p._starterApplied = true;
    this.normalizePlayerStats(p);
    p.slots = Object.assign(this.defaultSlots(), p.slots || {});
    p.inv = Array.isArray(p.inv) ? p.inv : [];

    if (p.asInfected) {
      p.sporeHidden = false;
      p.inv.push({ n: 'Походная аптечка', cat: 'med', rank: 1, w: 0.4, q: 2, heal: 25 });
      p.inv.push({ n: 'Сухпаёк Улья', cat: 'food', rank: 1, w: 0.5, q: 2, food: 35 });
      this.log('☣️ Стартовый набор Заражённого (0 ур.): 2 аптечки и 2 комплекта еды.');
    } else {
      const fem = this.isFem(p);
      const weapList = [
        { n: 'Треснувший кухонный нож', cat: 'weapon', slot: 'melee', rank: 1, dmg: 3, w: 0.3, q: 1 },
        { n: 'Обломок арматуры', cat: 'weapon', slot: 'melee', rank: 1, dmg: 4, w: 1.1, q: 1 },
        { n: 'Ржавая монтировка', cat: 'weapon', slot: 'melee', rank: 1, dmg: 4, w: 1.3, q: 1 }
      ];
      const armList = fem ? [
        { n: 'Рваный леопардовый халат', cat: 'armor', slot: 'clothes', rank: 1, def: 2, w: 0.6, q: 1 },
        { n: 'Кожаный костюм стриптизёрши', cat: 'armor', slot: 'clothes', rank: 1, def: 2, w: 0.7, q: 1 },
        { n: 'Грязный женский пуховик', cat: 'armor', slot: 'clothes', rank: 1, def: 3, w: 1.2, q: 1 }
      ] : [
        { n: 'Грязный рваный пуховик', cat: 'armor', slot: 'clothes', rank: 1, def: 3, w: 1.4, q: 1 },
        { n: 'Кожаный костюм стриптизёра', cat: 'armor', slot: 'clothes', rank: 1, def: 2, w: 0.8, q: 1 },
        { n: 'Прожжённый ватник', cat: 'armor', slot: 'clothes', rank: 1, def: 3, w: 1.6, q: 1 }
      ];
      const wItem = weapList[Math.floor(Math.random() * weapList.length)];
      const aItem = armList[Math.floor(Math.random() * armList.length)];
      if (!p.slots.melee) p.slots.melee = wItem; else p.inv.push(wItem);
      if (!p.slots.clothes) p.slots.clothes = aItem; else p.inv.push(aItem);
      p.inv.push({ id: 'starter_medkit_0', n: 'Базовая аптечка', cat: 'med', type: 'med', heal: 30, w: 0.3, q: 1, rank: 1 });
      this.log(`🎁 Набор новичка (0 ур.): [${wItem.n}], [${aItem.n}] и [Базовая аптечка].`);
    }
    p.inv = this.stackInventory(p.inv);
  },

  launchMap(dKey = 'start') {
    if (!this.squad || this.squad.length === 0) return;
    if (dKey === 'hell') {
      const ok = this.squad.some(s => (s.lvl || 0) >= 30);
      if (!ok) {
        this.log('🔥 Режим «Пекло» доступен только отрядам с бойцом 30-го уровня и выше!');
        return;
      }
    }

    const diff = (window.STIKS_DB && window.STIKS_DB.DIFFS && window.STIKS_DB.DIFFS[dKey]) || { mod: 0 };
    const barriers = (window.STIKS_DB && window.STIKS_DB.BARRIERS) || ['Скала', 'Водоем', 'Руины', 'Обрыв', 'Пожар'];
    const g = [];
    for (let y = 0; y < 60; y++) {
      const r = [];
      for (let x = 0; x < 60; x++) {
        r.push({ x, y, blocked: false, bType: null, lootType: null, domCal: null, valuable: false, exhaust: -(Math.floor(Math.random() * 3) + 1) });
      }
      g.push(r);
    }

    let pC = 0, att = 0;
    while (pC < 240 && att < 6000) {
      att++;
      const edge = Math.random() < 0.7;
      let x, y;
      if (edge) {
        const s = Math.floor(Math.random() * 4);
        if (s === 0) { y = Math.random() < 0.7 ? 0 : 1; x = Math.floor(Math.random() * 60); }
        else if (s === 1) { y = Math.random() < 0.7 ? 59 : 58; x = Math.floor(Math.random() * 60); }
        else if (s === 2) { x = Math.random() < 0.7 ? 0 : 1; y = Math.floor(Math.random() * 60); }
        else { x = Math.random() < 0.7 ? 59 : 58; y = Math.floor(Math.random() * 60); }
      } else {
        x = Math.random() < 0.5 ? 2 : 57;
        y = Math.floor(Math.random() * 60);
      }
      if ((x >= 20 && x <= 39 && y >= 20 && y <= 39) || g[y][x].blocked) continue;
      g[y][x].blocked = true;
      g[y][x].bType = barriers[Math.floor(Math.random() * barriers.length)];
      if (!this.validateMap60(g)) { g[y][x].blocked = false; g[y][x].bType = null; } else pC++;
    }

    let iC = 0; att = 0;
    while (iC < 240 && att < 8000) {
      att++;
      const x = Math.floor(Math.random() * 56) + 2, y = Math.floor(Math.random() * 56) + 2;
      if (g[y][x].blocked) continue;
      g[y][x].blocked = true;
      g[y][x].bType = barriers[Math.floor(Math.random() * barriers.length)];
      if (!this.validateMap60(g)) { g[y][x].blocked = false; g[y][x].bType = null; } else iC++;
    }

    const cals = ['12g', '12g', '545', '762', '9mm'];
    let lC = 0, lA = 0;
    while (lC < 50 && lA < 4000) {
      lA++;
      const x = Math.min(59, Math.max(0, Math.floor((Math.random() + Math.random()) * 30)));
      const y = Math.min(59, Math.max(0, Math.floor((Math.random() + Math.random()) * 30)));
      if (g[y][x].blocked || g[y][x].lootType) continue;
      g[y][x].lootType = lC < 12 ? 'weapon' : (lC < 24 ? 'armor' : 'supply');
      g[y][x].domCal = cals[Math.floor(Math.random() * cals.length)];
      g[y][x].valuable = (lC % 3 === 0);
      g[y][x].exhaust = 0;
      lC++;
    }

    const pls = this.squad.map(sqItem => {
      const p = JSON.parse(JSON.stringify(sqItem));
      this.pullProfileToPlayer(p);
      let px, py;
      do { px = Math.floor(Math.random() * 20) + 20; py = Math.floor(Math.random() * 20) + 20; } while (g[py][px].blocked);
      p.x = px;
      p.y = py;
      p.status = 'in_raid';
      p.moveMode = 'careful';
      p.movedThisTurn = false;
      p.escaped = false;
      p.dead = false;
      p.stinkTurns = 0;
      p._raidStartLvl = Number(p.lvl) || 0;
      p._raidKills = 0;
      p.slots = Object.assign(this.defaultSlots(), p.slots || {});
      this.fixWrongEquippedArmor(p);
      this.normalizePlayerStats(p);
      p.stepsLeft = p.maxAp;
      p.hp = p.maxHp;
      if ((p.lvl || 0) === 0 && dKey === 'start') {
        this.applyNewbieStarter(p, dKey);
      }
      return p;
    });

    const archKeys = Object.keys((window.STIKS_DB && window.STIKS_DB.ARCHETYPES) || {}).filter(k => k !== 'infected');
    const totZ = Math.max(36, pls.length * 36);
    const rC = Math.round(totZ * 0.6), aC = totZ - rC, zms = [];
    for (let i = 0; i < rC; i++) {
      let zx, zy, za = 0;
      do {
        za++;
        const s = Math.floor(Math.random() * 4);
        if (s === 0) { zy = 0; zx = Math.floor(Math.random() * 60); }
        else if (s === 1) { zy = 59; zx = Math.floor(Math.random() * 60); }
        else if (s === 2) { zx = 0; zy = Math.floor(Math.random() * 60); }
        else { zx = 59; zy = Math.floor(Math.random() * 60); }
      } while (g[zy][zx].blocked && za < 300);
      if (!g[zy][zx].blocked) {
        const isHum = (i % 6 === 0) && archKeys.length > 0;
        zms.push({
          id: 'zr_' + i, x: zx, y: zy, type: 'roam', hidden: false, rankMod: 0, tPos: null,
          isHuman: isHum, arch: isHum ? archKeys[i % archKeys.length] : 'infected'
        });
      }
    }
    for (let i = 0; i < aC; i++) {
      let zx, zy, za = 0;
      do { zx = Math.floor(Math.random() * 58) + 1; zy = Math.floor(Math.random() * 58) + 1; za++; }
      while ((g[zy][zx].blocked || pls.some(p => p.x === zx && p.y === zy)) && za < 300);
      if (!g[zy][zx].blocked) {
        zms.push({ id: 'za_' + i, x: zx, y: zy, type: 'ambush', hidden: true, rankMod: -1, tPos: null, isHuman: false, arch: 'infected' });
      }
    }

    this.db.session = {
      turn: 1, activeIdx: 0, diffKey: dKey, diffMod: diff.mod,
      grid: g, players: pls, zombies: zms, pendingSpores: 0,
      raidSnapshot: JSON.parse(JSON.stringify(pls))
    };
    pls.forEach(pl => {
      const f = this.db.families[pl.family];
      if (f) { const o = f.find(h => h.uid === pl.uid); if (o) o.status = 'in_raid'; }
    });
    this.lobbyPaused = false;
    this.saveDB();
    this.log(`🗺️ Карта 60x60 готова! Барьеров: ${pC + iC}, Точек лута: ${lC}, Врагов: ${zms.length}`);
    if ((pls[0].lvl || 0) === 0 && typeof this.showIntro === 'function') {
      this.showIntro(pls[0]);
    } else if (this.renderGame) {
      this.renderGame();
    }
  },

  // =========================================================================
  // 6. ПЕРЕДВИЖЕНИЕ (ШАГ 1/2/3, 6 ОХ) И ПОИСК (3 ОХ)
  // =========================================================================
  setMoveMode(m) {
    const s = this.db && this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (p.movedThisTurn) {
      this.log('❌ Нельзя менять скорость после начала движения в этом ходу.');
      return;
    }
    p.moveMode = m;
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  stepPlayer(dx, dy) {
    const s = this.db && this.db.session;
    if (!s || s.combat || s.humanEncounter) return;
    const p = s.players[s.activeIdx];
    if (!p) return;

    const nx = p.x + dx, ny = p.y + dy;

    if (nx < 0 || nx > 59 || ny < 0 || ny > 59) {
      p.escaped = true;
      p.missionsDone = (Number(p.missionsDone) || 0) + 1;
      p.knowsSpores = true;
      p.sporeKnown = true;
      p.knowsRecipe = true;
      p.status = 'ready';

      const startLvl = typeof p._raidStartLvl === 'number' ? p._raidStartLvl : (Number(p.lvl) || 0);
      const endLvl = Number(p.lvl) || 0;
      const lvlGain = Math.max(0, endLvl - startLvl);
      const kills = Number(p._raidKills) || 0;
      delete p._raidStartLvl;
      delete p._raidKills;

      const savedHero = this.syncHeroProfile(p);
      const finalSpores = savedHero ? savedHero.spores : (Number(p.spores) || 0);
      const finalItems = (savedHero && Array.isArray(savedHero.inv)) ? savedHero.inv.length : (Array.isArray(p.inv) ? p.inv.length : 0);

      const summaryMsg = `🚪 ${p.name} вышел с локации! Поднято уровней: ${lvlGain} (Ур.${endLvl}), уничтожено врагов: ${kills}, споранов: ${finalSpores} шт.`;
      this.log(summaryMsg);
      this.speakPhrase(p, summaryMsg);

      const stillActive = s.players.some(pl => !pl.dead && !pl.escaped);
      if (!stillActive) {
        this.db.session = null;
        this.lobbyPaused = false;
        this.squad = [];
        this.sanitizeRoster();
        this.saveDB();
        if (this.renderLobby) this.renderLobby();
        this.showRaidSummaryModal({
          uid: p.uid, fam: p.family, name: p.name,
          lvlGain, endLvl, kills, spores: finalSpores, itemsCount: finalItems
        });
        return;
      }
      this.saveDB();
      this.nextTurn();
      return;
    }

    const carry = this.getCarryInfo(p);
    if (carry.blocked) {
      this.log('🎒 Критический перегруз (>150%)! Сдвинуться невозможно, но доступен обыск клетки.');
      return;
    }

    const cost = this.getStepCost(p.moveMode);
    if (p.stepsLeft < cost) {
      this.log(`❌ Нужно ${cost} ОХ, осталось ${p.stepsLeft}.`);
      return;
    }

    const c = s.grid[ny][nx];
    if (c.blocked) {
      this.log(`⛰️ Преграда: ${c.bType}.`);
      return;
    }

    p.x = nx;
    p.y = ny;
    p.stepsLeft -= cost;
    p.movedThisTurn = true;
    p.actionsCount = (p.actionsCount || 0) + 1;
    s.pendingSpores = 0;

    this.playStepSound(p.moveMode || 'careful');

    if (p.moveMode === 'run') this.grantActionXp(p, 'spd', 0.25);
    else if (p.moveMode === 'careful') this.grantActionXp(p, 'agi', 0.25);
    else this.grantActionXp(p, 'end', 0.25);

    if (carry.rawPct >= 80) {
      this.grantActionXp(p, 'str', 0.5);
    }

    if (p.moveMode === 'run') {
      s.zombies.forEach(z => {
        if (Math.abs(z.x - nx) <= 3 && Math.abs(z.y - ny) <= 3) { z.hidden = false; z.tPos = { x: nx, y: ny }; }
      });
    }
    if (p.stinkTurns > 0) {
      s.zombies.forEach(z => {
        if (Math.abs(z.x - nx) <= 4 && Math.abs(z.y - ny) <= 4) { z.hidden = false; z.tPos = { x: nx, y: ny }; }
      });
    }

    const zHit = s.zombies.find(z => z.x === nx && z.y === ny);
    if (zHit) {
      zHit.hidden = false;
      this.triggerEncounter(p, zHit);
      return;
    }

    if (c.lootType) {
      const lNames = { weapon: 'оружейный тайник', armor: 'склад снаряжения', supply: 'ящики с припасами' };
      this.log(`👀 Замечено: ${lNames[c.lootType] || 'ценное место'}. Нажмите «🔍 Поиск (3)» для обыска.`);
    } else if (p.stepsLeft < 1) {
      const fem = this.isFem(p);
      this.speakPhrase(p, fem ? 'Я остановилась и осматриваюсь.' : 'Я остановился и осматриваюсь.');
    }

    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  genClusterItem(cat, domCal, surfaceOnly) {
    const db = window.STIKS_DB || {};
    const poolObj = db.CAL_POOL || { ammo: [], weapon: [], gear: [] };
    if (cat === 'weapon' && poolObj.weapon && poolObj.weapon.length) {
      if (surfaceOnly || Math.random() < 0.72) {
        const pool = (poolObj.ammo || []).filter(x => x.cal === domCal);
        const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : (poolObj.ammo[0] || { n: 'Патроны 12g', cal: '12g', slot: 'mag', w: 0.3, a: 2, rank: 1 });
        return Object.assign({}, pick, { cat: 'ammo', q: 1 });
      } else {
        const pool = poolObj.weapon.filter(x => x.cal === domCal || !x.cal);
        const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : poolObj.weapon[0];
        return Object.assign({}, pick, { cat: 'weapon', q: 1 });
      }
    }
    if (cat === 'armor' && poolObj.gear && poolObj.gear.length) {
      const pool = surfaceOnly ? poolObj.gear.filter(x => x.slot !== 'armor') : poolObj.gear;
      const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : poolObj.gear[0];
      return Object.assign({}, pick, { cat: 'gear', q: 1 });
    }
    const sup = (db.ITEMS && db.ITEMS[1] && db.ITEMS[1].supply) || { weak: [{ n: 'Бутылка воды', water: 20, w: 0.5, rank: 1 }], std: [{ n: 'Консервы', food: 25, w: 0.4, rank: 1 }], luck: [{ n: 'Походная аптечка', heal: 30, w: 0.4, rank: 1 }] };
    const list = surfaceOnly ? sup.weak : [...(sup.std || []), ...(sup.weak || []), ...(sup.luck || [])];
    const pick = list[Math.floor(Math.random() * list.length)] || { n: 'Сухпаёк', food: 20, w: 0.4, rank: 1 };
    return Object.assign({}, pick, { cat: 'supply', slot: 'use', q: 1 });
  },

  canPickItem(p, it) {
    if (!p || !it) return false;
    if (p.asInfected && (p.lvl || 0) < 20) {
      const slot = this.detectSlot(it);
      if (['main', 'side', 'melee', 'armor', 'clothes', 'mag', 'mod', 'meleeMod'].includes(slot)) {
        return false;
      }
    }
    return true;
  },

  announceLoot(p, foundItems, isDouble) {
    if (!p || !Array.isArray(foundItems) || !foundItems.length) return;
    const fem = this.isFem(p);
    const totalCount = foundItems.reduce((acc, it) => acc + (Number(it.q) || 1), 0);
    const last = foundItems[foundItems.length - 1];
    const lastName = (last && (last.n || last.name)) || 'добычу';
    const rareItem = foundItems.find(it => it && (it.rare || (it.rank && it.rank >= 3) || String(it.n || '').indexOf('Руководство') !== -1));

    let msg = '';
    if (rareItem) {
      const rName = rareItem.n || rareItem.name || 'редкий предмет';
      msg = fem
        ? `Ого! Я нашла редкий предмет: ${rName}! Всего предметов: ${totalCount}.`
        : `Ого! Я нашёл редкий предмет: ${rName}! Всего предметов: ${totalCount}.`;
    } else if (totalCount === 1) {
      msg = fem ? `Я нашла: ${lastName}.` : `Я нашёл: ${lastName}.`;
    } else {
      msg = fem
        ? `Я нашла предметов: ${totalCount}, последний — ${lastName}.`
        : `Я нашёл предметов: ${totalCount}, последний — ${lastName}.`;
    }
    this.speakPhrase(p, msg);
  },

  searchCell(onMove) {
    if (onMove) return;
    const s = this.db && this.db.session;
    if (!s || s.combat) return;
    const p = s.players[s.activeIdx];
    const cell = s.grid[p.y][p.x];

    if (p.stepsLeft < 3) {
      this.log('❌ Для тщательного поиска нужно минимум 3 Очка Хода!');
      return;
    }
    p.stepsLeft -= 3;
    p.actionsCount = (p.actionsCount || 0) + 1;
    this.playRustleSound();

    const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
    if (d1 === d2) {
      this.playDoubleSound();
      this.grantActionXp(p, 'spi', 1);
    }

    if (d1 === 6 && d2 === 6) {
      const r1 = Math.floor(Math.random() * 6) + 1, r2 = Math.floor(Math.random() * 6) + 1;
      if (r1 === r2) {
        this.playDoubleSound();
        p.stinkTurns = 10;
        const it = this.genClusterItem('supply', '12g', false);
        it.rare = true;
        if (this.canPickItem(p, it)) {
          p.inv.push(it);
          p.inv = this.stackInventory(p.inv);
          this.log(`💩 КРИТ «6-6»! Конфуз (ВОНЬ 10 ходов), но найдена редкость: ${it.n}`);
          this.announceLoot(p, [it], true);
        }
      } else {
        this.log('🎲 Дубль «6-6»: пусто.');
      }
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    const bonus = cell.valuable ? 2 : 1;
    let qty = d1 + cell.exhaust + bonus;
    if (d1 === 1 && d2 === 1) qty = Math.max(1, qty);

    if (qty <= 0) {
      this.log(`🔍 Поиск [${p.x + 1}:${p.y + 1}]: пусто (истощение ${cell.exhaust}).`);
      const fem = this.isFem(p);
      this.speakPhrase(p, fem ? 'Ничего... Я продолжаю поиск.' : 'Пусто... Я продолжаю поиск.');
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    const cats = ['weapon', 'armor', 'supply'];
    const foundItems = [];
    for (let i = 0; i < qty; i++) {
      const curCat = cell.lootType || cats[Math.floor(Math.random() * 3)];
      const item = this.genClusterItem(curCat, cell.domCal || '12g', false);
      if (cell.valuable && i === 0 && Math.random() < 0.35) item.rare = true;
      if (!this.canPickItem(p, item)) continue;
      p.inv.push(item);
      foundItems.push(item);
    }

    if (!p.knowsSpores && !p.asInfected && Math.random() < 0.25) {
      const guide = { n: '📘 Руководство по выживанию в Улье', cat: 'supply', slot: 'use', isGuide: true, w: 0.2, q: 1, rare: true };
      p.inv.push(guide);
      foundItems.push(guide);
    }

    cell.exhaust--;
    if (!foundItems.length) {
      this.log('🔍 Обыск завершён, но подходящих для вас предметов не найдено.');
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    p.inv = this.stackInventory(p.inv);
    this.grantActionXp(p, 'int', 0.25 * foundItems.length);

    const names = foundItems.map(x => x.n);
    const tag = cell.valuable ? '💎 Глубокий обыск тайника' : '🔍 Глубокий поиск';
    this.log(`${tag} (${foundItems.length} шт.): ${names.join(', ')}. Истощение: ${cell.exhaust}`);
    this.announceLoot(p, foundItems, d1 === d2);

    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  // =========================================================================
  // 7. СПОРАНЫ, ЖИВЧИК И ПОЖИРАНИЕ (ДЛЯ ЗАРАЖЁННОГО)
  // =========================================================================
  collectSpores() {
    const s = this.db && this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (!p) return;
    if (!p.knowsSpores && !p.asInfected) {
      this.log('❓ Вы не знаете, как извлекать спораны. Изучите руководство по выживанию.');
      return;
    }
    if ((p.stepsLeft || 0) < 1) {
      this.log('❌ Недостаточно ОХ (нужен 1 ОХ для сбора споранов).');
      return;
    }
    const avail = Number(s.pendingSpores) || 0;
    if (avail <= 0) {
      this.log('☣️ На этой клетке больше не осталось пригодных споранов.');
      return;
    }
    p.stepsLeft -= 1;
    p.spores = (Number(p.spores) || 0) + avail;
    p.sporans = p.spores;
    s.pendingSpores = 0;

    ['agi', 'int', 'spi', 'end'].forEach(sk => this.grantActionXp(p, sk, 0.5));
    this.syncHeroProfile(p);
    this.log(`💎 Собраны спораны: +${avail} шт. (всего: ${p.spores} шт., 0 кг). Опыт +0.5 к Ловкости, Интеллекту, Духу и Выносливости!`);
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  craftZhivchik() {
    const s = this.db && this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (!p) return;
    if (p.asInfected) {
      this.log('☣️ Особому заражённому не нужен «Живчик».');
      return;
    }
    if (!p.knowsSpores) {
      this.log('❌ Сначала изучите «Руководство по выживанию».');
      return;
    }
    const curSpores = Number(p.spores) || 0;
    const alcIdx = (p.inv || []).findIndex(it => {
      const nm = String(it.n || it.name || '').toLowerCase();
      return Boolean(it.alcohol || it.isAlcohol || /водк|спирт|виск|коньяк|алко|пиво|вино|самогон/.test(nm));
    });
    if (curSpores < 1 || alcIdx === -1) {
      this.log('❌ Для крафта «Живчика» нужен 1 споран и 1 ед. алкоголя.');
      return;
    }
    p.spores = curSpores - 1;
    p.sporans = p.spores;
    const alc = p.inv[alcIdx];
    if ((alc.q || 1) > 1) alc.q -= 1;
    else p.inv.splice(alcIdx, 1);

    p.inv.push({ n: '🧪 Живчик (раствор)', cat: 'supply', slot: 'use', w: 0.2, q: 3, isZhivchik: true });
    p.inv = this.stackInventory(p.inv);
    this.syncHeroProfile(p);
    this.log('🧪 Создано 3 порции «Живчика» (расход: 1 споран + 1 алкоголь).');
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  drinkZhivchik() {
    const s = this.db && this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (!p) return;
    if (p.asInfected) {
      this.log('☣️ Заражённый восстанавливает споры поеданием врагов.');
      return;
    }
    if (p._lastZhivchikTurn === s.turn) {
      this.log('⏳ «Живчик» можно употреблять не чаще 1 раза за ход!');
      return;
    }
    const maxSp = p.maxSpore || 50;
    if ((p.spore / Math.max(1, maxSp)) > 0.95) {
      this.log('⚠️ Споровый баланс выше 95% — приём «Живчика» сейчас не требуется.');
      return;
    }
    const zIdx = (p.inv || []).findIndex(it => it.isZhivchik || String(it.n || it.name || '').toLowerCase().indexOf('живчик') !== -1);
    if (zIdx === -1) {
      this.log('❌ В рюкзаке нет порций «Живчика».');
      return;
    }
    const zIt = p.inv[zIdx];
    if ((zIt.q || 1) > 1) zIt.q -= 1;
    else p.inv.splice(zIdx, 1);

    p._lastZhivchikTurn = s.turn;
    p.knowsSpores = true;
    p.sporeKnown = true;
    p.knowsRecipe = true;
    const addSp = Math.round(maxSp * 0.5);
    const addSt = Math.round((p.maxStamina || 50) * 0.1);
    const addHp = Math.max(1, Math.round((p.maxHp || 20) * 0.1));
    p.spore = Math.min(maxSp, (p.spore || 0) + addSp);
    p.stamina = Math.min(p.maxStamina || 50, (p.stamina || 0) + addSt);
    p.hp = Math.min(p.maxHp || 20, (p.hp || 0) + addHp);

    this.log(`🥤 Выпит «Живчик»: +${addSp} спорового баланса, +${addSt} бодрости, +${addHp} ОЗ!`);
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  devourEnemy() {
    const s = this.db && this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (!p || !p.asInfected || !p.lastKill) return;
    if (p.stepsLeft < 1) {
      this.log('❌ Нужен минимум 1 ОХ для пожирания добычи.');
      return;
    }
    p.stepsLeft -= 1;
    const k = p.lastKill;
    const healPct = k.rank >= p.lvl ? 0.5 : 0.25;
    const sporeGain = k.isHuman ? 25 : 15;
    p.hp = Math.min(p.maxHp, p.hp + Math.max(2, Math.floor(p.maxHp * healPct)));
    p.food = Math.min(p.maxFood, (p.food || 0) + 30);
    p.spore = Math.min(p.maxSpore, (p.spore || 0) + sporeGain);
    this.grantActionXp(p, 'str', 1);
    this.log(`🍖 ${p.name} поглотил добычу: +${Math.round(healPct * 100)}% ОЗ, +${sporeGain} спорового баланса.`);
    p.lastKill = null;
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

// === ЧАСТЬ 3: ЭКИПИРОВКА (11 СЛОТОВ), МОДИФИКАЦИИ, ЛАВКА И ТАЙНИК ===

  detectSlot(it) {
    if (!it) return null;
    if (it.slot && ['main', 'side', 'melee', 'mag', 'mod', 'meleeMod', 'armor', 'clothes', 'boots', 'bag', 'talisman'].includes(it.slot)) {
      return it.slot;
    }
    const name = String(it.n || it.name || '').toLowerCase();
    const cat = String(it.cat || it.type || '').toLowerCase();

    if (this.isBookItem(it)) return 'consumable_book';
    if (cat === 'med' || cat === 'heal' || /аптеч|бинт|стимулятор|таблет|анальг/.test(name)) return 'consumable_med';
    if (cat === 'food' || cat === 'drink' || cat === 'supply' || /живчик|вода|тушен|консерв|водк|спирт|алко|сок|печен|сухпа/.test(name)) return 'consumable_other';

    if (cat === 'meleemod' || it.isPoison || /яд|отрав|смазк/.test(name)) return 'meleeMod';
    if (cat === 'mod' || /прицел|глушител|обвес|коллиматор|лцу/.test(name)) return 'mod';
    if (cat === 'armor' || /бронежилет|брон|жилет|кирас|шлем|каск|разгруз/.test(name)) return 'armor';
    if (cat === 'clothes' || /халат|куртк|одежд|комбинезон|плащ|пуховик|костюм|ватник|штаны/.test(name)) return 'clothes';
    if (cat === 'boots' || /ботин|сапог|берц|кроссов|обув/.test(name)) return 'boots';
    if (cat === 'bag' || /рюкзак|сумк|баул|вещмешок/.test(name)) return 'bag';
    if (cat === 'talisman' || cat === 'amulet' || it.troll || it.shame || /амулет|позор|свисток|трусик|бейдж|открытк/.test(name)) return 'talisman';
    if (cat === 'mag' || cat === 'ammo' || /обойм|магазин|патрон/.test(name)) return 'mag';
    if (cat === 'melee' || /нож|топор|бит|монтиров|мачете|дубин|меч|клинок|арматур|труб/.test(name)) return 'melee';
    if (cat === 'side' || /пистолет|револьвер|обрез|пм|тт/.test(name)) return 'side';
    if (cat === 'weapon' || cat === 'main' || /автомат|ружь|винтов|дробовик|карабин|ак-|скс/.test(name)) return 'main';
    return null;
  },

  isBookItem(it) {
    if (!it) return false;
    const nm = String(it.n || it.name || '').toLowerCase();
    return Boolean(it.recipe || it.isGuide || nm.includes('руководств') || nm.includes('инструкц') || nm.includes('книг'));
  },

  fixWrongEquippedArmor(p) {
    if (!p || !p.slots) return;
    ['main', 'side', 'melee'].forEach(wSlot => {
      const eq = p.slots[wSlot];
      if (eq && this.detectSlot(eq) === 'armor') {
        p.slots[wSlot] = null;
        if (!p.slots.armor) p.slots.armor = eq;
        else p.inv.push(eq);
      }
    });
  },

  equipFromInv(idx) {
    const s = this.db && this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (!p || !Array.isArray(p.inv) || !p.inv[idx]) return;
    this.normalizePlayerStats(p);

    const it = p.inv[idx];
    const slot = this.detectSlot(it);
    const name = String(it.n || it.name || 'Предмет');

    if (slot === 'consumable_book') {
      p.knowsSpores = true;
      p.sporeKnown = true;
      p.knowsRecipe = true;
      this.consumeInvOne(p, idx);
      this.syncHeroProfile(p);
      this.log('📖 Изучено руководство! Открыта шкала «Споровый баланс», добыча споранов и рецепт «Живчика».');
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    if (slot === 'consumable_med') {
      if (p.hp >= p.maxHp) {
        this.log(`❤️ Здоровье уже полное (${p.hp}/${p.maxHp}).`);
        return;
      }
      const healAmt = Number(it.heal || it.hp || it.val || 0) || Math.max(25, Math.ceil(p.maxHp * 0.6));
      const beforeHp = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      this.consumeInvOne(p, idx);
      this.log(`💊 Использовано [${name}]: ОЗ ${beforeHp} → ${p.hp}/${p.maxHp}.`);
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    if (slot === 'consumable_other' || it.cat === 'supply' || it.slot === 'use') {
      if (it.pearl) {
        this.usePearl(p, it.pearl);
        this.consumeInvOne(p, idx);
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }
      if (it.hp) p.hp = Math.min(p.maxHp, Math.max(1, p.hp + Number(it.hp)));
      if (it.food) p.food = Math.min(p.maxFood, Math.max(0, p.food + Number(it.food)));
      if (it.water) p.water = Math.min(p.maxWater, Math.max(0, p.water + Number(it.water)));
      if (it.stamina) p.stamina = Math.min(p.maxStamina, Math.max(0, p.stamina + Number(it.stamina)));
      if (it.spore) {
        p.spore = Math.min(p.maxSpore, p.spore + Number(it.spore));
        p.knowsSpores = true;
        p.knowsRecipe = true;
      }
      if (it.stink) p.stinkTurns = Number(it.stink);
      this.consumeInvOne(p, idx);
      this.log(`🎒 Использовано: ${name}`);
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    if (slot && Object.prototype.hasOwnProperty.call(p.slots, slot)) {
      if (p.asInfected && (p.lvl || 0) < 20 && ['main', 'side', 'melee', 'armor', 'clothes', 'mod', 'meleeMod'].includes(slot)) {
        this.log('☣️ Заражённый до 20 уровня не может надевать человеческое оружие и броню!');
        return;
      }
      if (slot === 'mod' && !p.slots.main && !p.slots.side) {
        this.log('🔧 Сначала наденьте огнестрельное оружие, чтобы закрепить оптику или глушитель.');
        return;
      }
      if (slot === 'meleeMod' && !p.slots.melee) {
        this.log('🧪 Сначала наденьте холодное оружие, чтобы нанести яд или смазку на клинок.');
        return;
      }

      const old = p.slots[slot];
      if (old && old.noDrop) {
        this.log('🔒 Слот занят неснимаемым предметом!');
        return;
      }

      if (it.troll && window.STIKS_DB && window.STIKS_DB.SHAME_AMULETS && window.STIKS_DB.SHAME_AMULETS[p.arch] && name.includes(window.STIKS_DB.SHAME_AMULETS[p.arch].split(' ')[0])) {
        it.amuletActive = true;
        this.log(`🔮 СКРЫТЫЙ АМУЛЕТ ПОЗОРА АКТИВИРОВАН! ${name} идеально подошёл классу!`);
      }

      const singleItem = JSON.parse(JSON.stringify(it));
      singleItem.q = 1;
      if (singleItem.qty !== undefined) singleItem.qty = 1;

      this.consumeInvOne(p, idx);
      if (old) p.inv.push(old);
      p.slots[slot] = singleItem;
      p.inv = this.stackInventory(p.inv);
      this.fixWrongEquippedArmor(p);
      this.normalizePlayerStats(p);
      this.syncHeroProfile(p);
      this.log(`🛡️ Экипировано: ${name}`);
      this.saveDB();
      if (this.renderGame) this.renderGame();
    }
  },

  unequipSlot(slotKey) {
    const s = this.db && this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (!p || !p.slots || !p.slots[slotKey]) return;
    const it = p.slots[slotKey];
    if (it.noDrop) {
      this.log('🔒 Этот предмет невозможно снять!');
      return;
    }
    p.slots[slotKey] = null;
    p.inv.push(it);
    p.inv = this.stackInventory(p.inv);
    this.normalizePlayerStats(p);
    this.syncHeroProfile(p);
    this.saveDB();
    this.log(`↩️ Снято в рюкзак: ${it.n || it.name}`);
    if (this.renderGame) this.renderGame();
  },

  dropItem(idx) {
    const s = this.db && this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (!p || !p.inv || !p.inv[idx]) return;
    const it = p.inv.splice(idx, 1)[0];
    this.normalizePlayerStats(p);
    this.syncHeroProfile(p);
    this.log(`🗑️ Выброшено: ${it.n || it.name}`);
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  usePearl(p, color) {
    const r = Math.random() * 100;
    if (color === 'white') {
      if (p.isKvaz) { p.isKvaz = false; this.log('⚪ Белый жемчуг стабилизировал Кваза!'); }
      else { p.dars = (p.dars || 0) + 1; this.log('⚪ Белый жемчуг: 100% получение и усиление Дара!'); }
      return;
    }
    const cfg = color === 'black' ? { dar: 50, upg: 60, kvaz: 85, inf: 90 } : { dar: 40, upg: 90, kvaz: 98, inf: 100 };
    if (r < cfg.dar) { p.dars = (p.dars || 0) + 1; this.log('🔮 Жемчуг пробудил НОВЫЙ ДАР!'); }
    else if (r < cfg.upg) { p.darLvl = (p.darLvl || 1) + 1; this.log('🔮 Жемчуг УСИЛИЛ существующий Дар!'); }
    else if (r < cfg.kvaz) { p.isKvaz = true; p.stats.str += 10; p.stats.end += 10; this.log(`☣️ МУТАЦИЯ: ${p.name} стал КВАЗОМ!`); }
    else if (r < cfg.inf) { p.asInfected = true; p.isInfected = true; p.arch = 'infected'; this.log(`🧟 ОБРАЩЕНИЕ: ${p.name} стал ОСОБЫМ ЗАРАЖЕННЫМ!`); }
    else this.log('💨 Жемчуг усвоился без видимых изменений.');
    this.recalcLevel(p);
  },

  renderEquipModal(p) {
    const carry = this.getCarryInfo(p);
    const slotDefs = [
      ['main', '🔫 Основное'],
      ['side', '🔫 Доп. оружие'],
      ['melee', '🔪 Холодное'],
      ['mag', '📦 Обойма'],
      ['mod', '🔭 Обвес огнестр.'],
      ['meleeMod', '🧪 Яд / клинок'],
      ['armor', '🛡️ Броня'],
      ['clothes', '🧥 Одежда'],
      ['boots', '👢 Обувь'],
      ['bag', '🎒 Рюкзак'],
      ['talisman', '🧿 Амулет позора']
    ];
    const ovWarn = carry.blocked
      ? ' <span style="color:#ff6b6b;">(ПЕРЕГРУЗ >150%: шаг заблокирован, поиск доступен)</span>'
      : (carry.mult > 1 ? ` <span style="color:#ffb300;">(Штраф шага +${Math.round((carry.mult - 1) * 100)}%)</span>` : '');

    let h = '<div style="position:fixed;inset:0;background:rgba(5,7,6,0.92);z-index:9100;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;">';
    h += '<div style="width:100%;max-width:420px;max-height:92dvh;overflow-y:auto;border:1px solid #6e2626;background:#140e0e;padding:12px;border-radius:6px;">';
    h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid #4a1c1c;padding-bottom:6px;"><b style="color:#d48a8a;font-size:13px;">🎒 СНАРЯЖЕНИЕ И РЮКЗАК (${carry.cur} / ${carry.max} кг)</b><button class="btn btn-danger" style="width:auto !important;padding:4px 8px;font-size:11px;" onclick="STIKS.toggleInv()">✖ Закрыть</button></div>`;
    h += `<div style="font-size:10px;color:#c8b0b0;margin-bottom:4px;">Заполнение: <b>${carry.rawPct}%</b>${ovWarn}</div>`;
    h += `<div style="width:100%;height:6px;background:#241414;border-radius:3px;overflow:hidden;margin-bottom:8px;"><div style="width:${carry.pct}%;height:100%;background:${carry.col};"></div></div>`;
    h += '<div style="font-size:11px;color:#d48a8a;font-weight:bold;margin-bottom:4px;">СЛОТЫ ЭКИПИРОВКИ (11):</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-bottom:10px;">';

    slotDefs.forEach(([sk, label]) => {
      const eq = p.slots && p.slots[sk];
      const eqTxt = eq ? `<b style="color:#f2dada;">${eq.n || eq.name}</b>` : '<span style="color:#6e5252;">пусто</span>';
      const btn = eq ? `<button class="btn" style="width:auto !important;padding:2px 5px;font-size:9px;margin-top:3px;" onclick="STIKS.unequipSlot('${sk}')">Снять</button>` : '';
      h += `<div style="background:#0d0909;border:1px solid #3d1c1c;padding:5px;border-radius:4px;font-size:10px;display:flex;flex-direction:column;justify-content:space-between;"><div><div style="color:#a87f7f;font-size:9px;">${label}</div><div style="margin-top:2px;word-break:break-word;">${eqTxt}</div></div>${btn}</div>`;
    });

    h += '</div>';
    h += `<div style="font-size:11px;color:#d48a8a;font-weight:bold;margin-bottom:4px;">РЮКЗАК (${p.inv.length}):</div>`;
    if (!p.inv.length) {
      h += '<div style="color:#7a6060;font-size:11px;padding:8px 0;text-align:center;">Рюкзак пуст.</div>';
    } else {
      p.inv.forEach((it, idx) => {
        const iw = Number(it.w !== undefined ? it.w : (it.weight !== undefined ? it.weight : 0));
        const iq = Number(it.q !== undefined ? it.q : (it.qty !== undefined ? it.qty : 1));
        const iwStr = iw > 0 ? ` <span style="color:#a87f7f;">(${Math.round(iw * iq * 10) / 10} кг)</span>` : '';
        const sl = this.detectSlot(it);
        const actLabel = (sl && !sl.startsWith('consumable_')) ? 'Надеть' : 'Исп.';
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #2b1515;gap:6px;font-size:11px;"><span>${it.n || it.name || 'Предмет'}${iq > 1 ? ' x' + iq : ''}${iwStr}</span><div style="display:flex;gap:4px;flex:0 0 auto;"><button class="btn btn-primary" style="width:auto !important;padding:3px 7px;font-size:10px;" onclick="STIKS.equipFromInv(${idx})">${actLabel}</button><button class="btn btn-danger" style="width:auto !important;padding:3px 7px;font-size:10px;" onclick="STIKS.dropItem(${idx})">✖</button></div></div>`;
      });
    }
    h += '</div></div>';
    return h;
  },

  // === ЛАВКА И ЛИЧНЫЙ ТАЙНИК ===
  getStashWeight(hr) {
    const st = Array.isArray(hr.stash) ? hr.stash : [];
    let sum = 0;
    st.forEach(it => {
      const w = Number(it.w !== undefined ? it.w : (it.weight !== undefined ? it.weight : 0));
      const q = Number(it.q !== undefined ? it.q : (it.qty !== undefined ? it.qty : 1));
      sum += w * q;
    });
    return Math.round(sum * 10) / 10;
  },

  calcItemPrice(it) {
    const r = Math.max(1, Number(it && (it.rank || it.r || it.lvl || 1)) || 1);
    return r === 1 ? 5 : (r * 15);
  },

  ensureTraderStock(hr) {
    const curLvl = hr.lvl || 0;
    if (Array.isArray(hr.traderStock) && hr.traderStockLvl === curLvl && hr.traderStock.length > 0) {
      return hr.traderStock;
    }
    const pool = [];
    const db = window.STIKS_DB || {};
    [db.WEAPONS, db.ARMOR, db.ITEMS, db.LOOT].forEach(list => {
      if (Array.isArray(list)) {
        list.forEach(x => {
          if (x && !x.shame && !x.isShame && !String(x.n || x.name || '').toLowerCase().includes('позор')) {
            pool.push(x);
          }
        });
      }
    });
    if (!pool.length) {
      pool.push(
        { n: 'Обрез двустволки', cat: 'side', slot: 'side', rank: 1, a: 5, w: 2.2 },
        { n: 'Кожаная куртка', cat: 'clothes', slot: 'clothes', rank: 1, d: 2, w: 2.5 },
        { n: 'Походная аптечка', cat: 'med', rank: 1, heal: 35, w: 0.4 },
        { n: 'Тактический рюкзак (+15 кг)', cat: 'bag', slot: 'bag', rank: 2, bag: 15, w: 1.1 },
        { n: 'Автомат АК-74У', cat: 'weapon', slot: 'main', rank: 2, a: 8, cal: '545', w: 3.1 },
        { n: 'Бронежилет 2 класса', cat: 'armor', slot: 'armor', rank: 2, cls: 2, d: 15, w: 4.5 },
        { n: 'Оптический прицел ПСО', cat: 'mod', slot: 'mod', rank: 2, a: 3, w: 0.6 },
        { n: 'Яд для клинка «Гюрза»', cat: 'meleeMod', slot: 'meleeMod', rank: 2, poison: 4, w: 0.2 },
        { n: 'Карабин СКС', cat: 'weapon', slot: 'main', rank: 3, a: 11, cal: '762', w: 3.8 },
        { n: 'Штурмовой бронежилет 3 кл.', cat: 'armor', slot: 'armor', rank: 3, cls: 3, d: 30, w: 6.0 }
      );
    }
    const count = Math.min(10, Math.max(6, pool.length));
    const res = [];
    const used = {};
    let guard = 0;
    while (res.length < count && guard < 100) {
      guard++;
      const raw = pool[Math.floor(Math.random() * pool.length)];
      const copy = JSON.parse(JSON.stringify(raw));
      copy.n = copy.n || copy.name || 'Предмет';
      copy.rank = Math.max(1, Number(copy.rank || copy.tier || 1));
      copy.q = 1;
      if (!used[copy.n]) {
        used[copy.n] = true;
        res.push(copy);
      }
    }
    hr.traderStock = res;
    hr.traderStockLvl = curLvl;
    return res;
  },

  findHeroByUid(uid) {
    if (!uid || !this.db || !this.db.families) return null;
    const fams = Object.keys(this.db.families);
    for (let i = 0; i < fams.length; i++) {
      const list = this.db.families[fams[i]] || [];
      const found = list.find(h => h && h.uid === uid);
      if (found) return found;
    }
    return null;
  },

  openShop(famOrUid, idx) {
    let hr = null;
    if (typeof idx === 'number' && this.db.families[famOrUid]) {
      hr = this.db.families[famOrUid][idx];
    } else {
      hr = this.findHeroByUid(famOrUid);
    }
    if (!hr) return;
    this.syncSporans(hr);
    hr.inv = this.stackInventory(hr.inv || []);
    this.shopHeroUid = hr.uid;
    this.shopBarterSel = [];
    this.renderShopModal();
  },

  closeShop() {
    const el = document.getElementById('stiks-shop-modal');
    if (el) el.remove();
    this.shopHeroUid = null;
    this.shopBarterSel = [];
    if (this.renderLobby) this.renderLobby();
  },

  moveToStash(invIdx) {
    const hr = this.findHeroByUid(this.shopHeroUid);
    if (!hr || !Array.isArray(hr.inv) || !hr.inv[invIdx]) return;
    const it = hr.inv[invIdx];
    hr.stash = Array.isArray(hr.stash) ? hr.stash : [];
    const w = Number(it.w !== undefined ? it.w : (it.weight !== undefined ? it.weight : 0)) * Number(it.q || 1);
    if (this.getStashWeight(hr) + w > 200) {
      this.log('❌ В личном тайнике недостаточно места (лимит 200 кг).');
      return;
    }
    hr.stash.push(hr.inv.splice(invIdx, 1)[0]);
    hr.stash = this.stackInventory(hr.stash);
    this.saveDB();
    this.renderShopModal();
  },

  moveFromStash(stIdx) {
    const hr = this.findHeroByUid(this.shopHeroUid);
    if (!hr || !Array.isArray(hr.stash) || !hr.stash[stIdx]) return;
    hr.inv = Array.isArray(hr.inv) ? hr.inv : [];
    hr.inv.push(hr.stash.splice(stIdx, 1)[0]);
    hr.inv = this.stackInventory(hr.inv);
    this.saveDB();
    this.renderShopModal();
  },

  buyTraderItem(stIdx) {
    const hr = this.findHeroByUid(this.shopHeroUid);
    if (!hr) return;
    const stock = this.ensureTraderStock(hr);
    const it = stock[stIdx];
    if (!it) return;
    const price = this.calcItemPrice(it);
    this.syncSporans(hr);
    if (hr.spores < price) {
      this.log(`❌ Недостаточно споранов (нужно ${price} 🧬).`);
      return;
    }
    hr.spores -= price;
    hr.sporans = hr.spores;
    hr.inv = Array.isArray(hr.inv) ? hr.inv : [];
    hr.inv.push(JSON.parse(JSON.stringify(it)));
    hr.inv = this.stackInventory(hr.inv);
    stock.splice(stIdx, 1);
    this.saveDB();
    this.log(`🛒 Куплено в Лавке: ${it.n} за ${price} споранов.`);
    this.renderShopModal();
  },

  sellToTrader(invIdx) {
    const hr = this.findHeroByUid(this.shopHeroUid);
    if (!hr || !Array.isArray(hr.inv) || !hr.inv[invIdx]) return;
    const it = hr.inv[invIdx];
    const eqObj = hr.slots || {};
    const isEquipped = Object.keys(eqObj).some(k => eqObj[k] && (eqObj[k] === it || (it.uid && eqObj[k].uid === it.uid)));
    if (isEquipped) {
      this.log('🚫 Нельзя продать снаряжение, которое надето на персонажа!');
      return;
    }
    const sellPrice = Math.max(1, Math.floor(this.calcItemPrice(it) * 0.5));
    const name = it.n || it.name || 'Предмет';
    this.consumeInvOne(hr, invIdx);
    this.syncSporans(hr);
    hr.spores += sellPrice;
    hr.sporans = hr.spores;
    this.saveDB();
    this.log(`💰 Продано в Лавке: ${name} за ${sellPrice} споранов.`);
    this.renderShopModal();
  },

  toggleBarter(invIdx) {
    this.shopBarterSel = Array.isArray(this.shopBarterSel) ? this.shopBarterSel : [];
    const pos = this.shopBarterSel.indexOf(invIdx);
    if (pos !== -1) this.shopBarterSel.splice(pos, 1);
    else if (this.shopBarterSel.length < 4) this.shopBarterSel.push(invIdx);
    this.renderShopModal();
  },

  execBarter(traderIdx) {
    const hr = this.findHeroByUid(this.shopHeroUid);
    if (!hr || !Array.isArray(hr.inv)) return;
    const stock = this.ensureTraderStock(hr);
    const target = stock[traderIdx];
    if (!target) return;
    const sel = (this.shopBarterSel || []).slice().sort((a, b) => b - a);
    const isAmmoTarget = /обойм|патрон/.test(String(target.n || '').toLowerCase());

    if (isAmmoTarget) {
      if (sel.length !== 4) {
        this.log('🔄 Для бартера обойм выберите ровно 4 обоймы из рюкзака.');
        return;
      }
      sel.forEach(i => this.consumeInvOne(hr, i));
      const copyA = JSON.parse(JSON.stringify(target));
      copyA.q = 2;
      hr.inv.push(copyA);
    } else {
      if (sel.length !== 2) {
        this.log(`🔄 Выберите ровно 2 вещи того же ранга (${target.rank || 1}) для обмена.`);
        return;
      }
      const okRank = sel.every(i => hr.inv[i] && Number(hr.inv[i].rank || 1) === Number(target.rank || 1));
      if (!okRank) {
        this.log(`❌ Выбранные вещи должны совпадать по рангу с товаром (${target.rank || 1}).`);
        return;
      }
      sel.forEach(i => this.consumeInvOne(hr, i));
      hr.inv.push(JSON.parse(JSON.stringify(target)));
    }
    hr.inv = this.stackInventory(hr.inv);
    stock.splice(traderIdx, 1);
    this.shopBarterSel = [];
    this.saveDB();
    this.log(`🤝 Бартер завершён: получено ${target.n}.`);
    this.renderShopModal();
  },

  renderShopModal() {
    const hr = this.findHeroByUid(this.shopHeroUid);
    if (!hr) return;
    const old = document.getElementById('stiks-shop-modal');
    if (old) old.remove();

    this.syncSporans(hr);
    const stock = this.ensureTraderStock(hr);
    const stW = this.getStashWeight(hr);
    const sel = this.shopBarterSel || [];

    const ov = document.createElement('div');
    ov.id = 'stiks-shop-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,6,0.92);z-index:9500;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;font-family:monospace;color:#d6e5db;';

    let h = '<div style="width:100%;max-width:440px;max-height:92dvh;overflow-y:auto;border:1px solid #6e2626;background:#111613;padding:12px;border-radius:6px;font-size:11px;">';
    h += `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #5c2828;padding-bottom:6px;margin-bottom:8px;"><b style="color:#ff9e9e;font-size:13px;">🏪 ЛАВКА: ${hr.name} (Ур.${hr.lvl || 0})</b><button class="btn btn-danger" style="width:auto !important;padding:4px 8px;font-size:11px;" onclick="STIKS.closeShop()">✖ Выйти</button></div>`;
    h += `<div style="background:#1c1212;border:1px solid #5c2828;padding:6px;margin-bottom:8px;display:flex;justify-content:space-between;"><span>🧬 Спораны: <b>${hr.spores}</b> (0 кг)</span><span>📦 Тайник: <b>${stW} / 200 кг</b></span></div>`;
    h += '<div style="color:#e6c86e;font-weight:bold;margin-bottom:4px;">🛒 ТОРГОВЕЦ (обновление раз в 1 ур. | бартер 2→1):</div>';

    stock.forEach((it, idx) => {
      const price = this.calcItemPrice(it);
      h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #253029;gap:4px;"><span>${it.n} [Р.${it.rank || 1}]</span><div style="display:flex;gap:3px;"><button class="btn btn-primary" style="width:auto !important;padding:2px 6px;font-size:10px;" onclick="STIKS.buyTraderItem(${idx})">${price} 🧬</button><button class="btn" style="width:auto !important;padding:2px 6px;font-size:10px;" onclick="STIKS.execBarter(${idx})">🔄 Бартер</button></div></div>`;
    });

    h += `<div style="color:#7fa88b;font-weight:bold;margin:8px 0 4px 0;">🎒 РЮКЗАК (выбрано для бартера: ${sel.length}):</div>`;
    (hr.inv || []).forEach((it, idx) => {
      const sellP = Math.max(1, Math.floor(this.calcItemPrice(it) * 0.5));
      const isSel = sel.includes(idx);
      const qStr = (it.q || 1) > 1 ? ` x${it.q}` : '';
      h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1f2923;gap:4px;"><span>${it.n || it.name}${qStr} [Р.${it.rank || 1}]</span><div style="display:flex;gap:3px;"><button class="btn ${isSel ? 'btn-primary' : ''}" style="width:auto !important;padding:2px 5px;font-size:10px;" onclick="STIKS.toggleBarter(${idx})">☑</button><button class="btn" style="width:auto !important;padding:2px 5px;font-size:10px;" onclick="STIKS.sellToTrader(${idx})">+${sellP}🧬</button><button class="btn" style="width:auto !important;padding:2px 5px;font-size:10px;" onclick="STIKS.moveToStash(${idx})">📥 В тайник</button></div></div>`;
    });

    h += `<div style="color:#7fa88b;font-weight:bold;margin:8px 0 4px 0;">📦 ЛИЧНЫЙ ТАЙНИК (${stW} / 200 кг):</div>`;
    (hr.stash || []).forEach((it, idx) => {
      const qStr = (it.q || 1) > 1 ? ` x${it.q}` : '';
      h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1f2923;gap:4px;"><span>${it.n || it.name}${qStr}</span><button class="btn btn-primary" style="width:auto !important;padding:2px 6px;font-size:10px;" onclick="STIKS.moveFromStash(${idx})">📤 Взять</button></div>`;
    });

    h += '</div>';
    ov.innerHTML = h;
    document.body.appendChild(ov);
  },

// === ЧАСТЬ 4: МОСТ СОВМЕСТИМОСТИ, БОЕВАЯ СИСТЕМА (РАНГИ 1-4) И НАВЫКИ 12+1 ===

  syncSporans(obj) {
    return this._cleanSporans(obj);
  },

  consumeInvOne(holder, idx) {
    if (!holder || !Array.isArray(holder.inv) || !holder.inv[idx]) return null;
    const it = holder.inv[idx];
    const q = Number(it.q !== undefined ? it.q : (it.qty !== undefined ? it.qty : 1));
    if (q > 1) {
      it.q = q - 1;
      if (it.qty !== undefined) it.qty = it.q;
    } else {
      holder.inv.splice(idx, 1);
    }
    return it;
  },

  speakPhrase(p, text, onDone) {
    const role = (p && p.asInfected) ? 'infected' : ((p && p.arch) || 'kachok');
    this.sayAs(role, text, onDone);
  },

  pullProfileToPlayer(pl) {
    if (!pl || !this.db || !this.db.families) return;
    const list = this.db.families[pl.family] || [];
    const target = list.find(h => h && h.uid === pl.uid);
    if (!target) return;
    this._cleanSporans(target);
    pl.lvl = Number(target.lvl) || 0;
    if (target.stats) pl.stats = Object.assign({}, pl.stats || {}, target.stats);
    pl.inv = this.stackInventory(Array.isArray(target.inv) ? target.inv : (pl.inv || []));
    if (target.slots && typeof target.slots === 'object') {
      pl.slots = Object.assign(this.defaultSlots(), JSON.parse(JSON.stringify(target.slots)));
    }
    pl.spores = target.spores;
    pl.sporans = target.spores;
    pl.missionsDone = Math.max(Number(pl.missionsDone) || 0, Number(target.missionsDone) || 0);
    if (target.knowsSpores || target.sporeKnown || target.knowsRecipe || pl.missionsDone >= 1 || pl.lvl >= 1) {
      pl.knowsSpores = true;
      pl.sporeKnown = true;
      pl.knowsRecipe = true;
    }
    if (target.skillUnlocked) pl.skillUnlocked = true;
    if (target.darUnlocked) pl.darUnlocked = true;
  },

  getMaxWeight(p) {
    if (!p) return 11;
    this.normalizePlayerStats(p);
    return p.maxWeight || 11;
  },

  getInvWeight(p) {
    if (!p) return 0;
    let cur = 0;
    (p.inv || []).forEach(it => {
      if (!it || it.isSporan || it.type === 'sporan') return;
      const w = Number(it.w !== undefined ? it.w : (it.weight !== undefined ? it.weight : 0)) || 0;
      const q = Number(it.q !== undefined ? it.q : (it.qty !== undefined ? it.qty : 1)) || 1;
      cur += w * q;
    });
    return Math.round(cur * 10) / 10;
  },

  getCarryInfo(p) {
    if (!p) return { cur: 0, max: 11, pct: 0, rawPct: 0, col: '#4caf50', mult: 1, blocked: false };
    const max = this.getMaxWeight(p);
    const cur = this.getInvWeight(p);
    const rawPct = max > 0 ? Math.round((cur / max) * 100) : 0;
    let mult = 1;
    let blocked = false;
    if (rawPct > 150) { blocked = true; mult = 999; }
    else if (rawPct > 100) { mult = 1.5; }
    else if (rawPct > 80) { mult = 1.25; }
    const pct = Math.min(100, rawPct);
    const col = rawPct > 100 ? '#e53935' : (rawPct > 80 ? '#ffb300' : '#4caf50');
    return { cur, max, pct, rawPct, col, mult, blocked };
  },

  getStepCost(m) {
    const base = m === 'careful' ? 3 : (m === 'fast' ? 2 : 1);
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!p) return base;
    const ci = this.getCarryInfo(p);
    if (ci.blocked) return 999;
    return Math.ceil(base * ci.mult);
  },

  SKILL_META: {
    tatan:      { name: 'По щелчку в три пятнадцать', type: 'active', phrase: 'По щелчку в три пятнадцать! Всем стоять!', desc: 'Оглушает врагов и усиливает удар волей Улья.' },
    kachok:     { name: 'Прямиком в ад', type: 'active', phrase: 'прямиком в ад. Ннахх!!!', desc: 'Сокрушительный удар с бонусом от Силы и Выносливости.' },
    asiat:      { name: 'Что-то учудить', type: 'trick', phrase: 'Йа сейчас кое-что учужу!', desc: 'Вне боя проверяет навык; в бою против 2+ врагов позволяет акробатически уйти от удара.' },
    prof:       { name: 'Магнификус мэджик', type: 'active', phrase: 'looks like magnificus magic', desc: 'Точный расчёт уязвимой точки с бонусом от Интеллекта и Духа.' },
    alkash:     { name: 'Пьяный кулак', type: 'active', phrase: 'Ик! Сейчас покажу мастер-класс!', desc: 'Непредсказуемый выпад с повышенным уклонением.' },
    strip:      { name: 'Ослепляющий пируэт', type: 'active', phrase: 'Смотри сюда, красавчик!', desc: 'Сбивает врага с толку и наносит быстрый удар.' },
    surgeon:    { name: 'Точный разрез', type: 'active', phrase: 'Скальпель, зажим... готово.', desc: 'Удар по жизненно важным точкам с игнорированием части брони.' },
    nanny:      { name: 'Строгий выговор', type: 'active', phrase: 'А ну-ка прекратили безобразие!', desc: 'Подавляет агрессию противника силой авторитета.' },
    cashier:    { name: 'Галя, у нас отмена!', type: 'passive', phrase: 'Галя, у нас отмена!', desc: 'Пассивно срабатывает при получении смертельного или критического удара, отменяя урон.' },
    gigolo:     { name: 'Обезоруживающий шарм', type: 'active', phrase: 'Не стоит так нервничать, крошка.', desc: 'Снижает натиск врага и повышает шанс крита.' },
    schoolgirl: { name: 'Крик ультразвука', type: 'active', phrase: 'АААААА! Не подходи!', desc: 'Оглушающий визг, сбивающий атаку противников.' },
    vet:        { name: 'Успокаивающий укол', type: 'active', phrase: 'а ну-ка дай лапу!', desc: 'Ослабляет мутантов и заражённых точным выпадом.' }
  },

  getWeaponRankBonus(p, wItem, enemyRank) {
    if (!wItem) return 0;
    const wCls = Math.max(1, Math.min(4, Number(wItem.cls || wItem.rank || 1)));
    const baseBonus = wCls;
    const diff = wCls - (Number(enemyRank) || 0);
    if (diff >= 1) return Math.min(4, baseBonus + 1);
    if (diff < 0) return Math.min(2, baseBonus);
    return baseBonus;
  },

  getWeaponDamageMult(wItem, enemyRank) {
    if (!wItem) return 1;
    const wCls = Math.max(1, Math.min(4, Number(wItem.cls || wItem.rank || 1)));
    const eRank = Number(enemyRank) || 0;
    const diff = wCls - eRank;
    if (wCls === 2) {
      if (diff > 0) return 3;
      if (diff === 0) return 2;
      if (diff === -1) return 1.5;
    }
    if (wCls === 3) {
      if (diff > 0) return 2;
      if (diff === 0) return 3;
    }
    if (wCls >= 4 && diff >= 0) return 3;
    return 1;
  },

  getArmorReduction(p) {
    if (!p || !p.slots) return 0;
    const arm = p.slots.armor;
    const clo = p.slots.clothes;
    const clsMap = { 1: 5, 2: 15, 3: 30, 4: 75 };
    let pct = 0;
    if (arm) {
      const c = Math.max(1, Math.min(4, Number(arm.cls || arm.rank || 1)));
      pct += clsMap[c] || Number(arm.d || 5);
    }
    if (clo) {
      pct += Math.min(10, Number(clo.def || clo.d || 2) * 2);
    }
    return Math.min(85, pct);
  },

  useWeirdSkill() {
    const s = this.db && this.db.session;
    if (!s || s.combat) return;
    const p = s.players[s.activeIdx];
    if (!p) return;
    if (p.asInfected) {
      this.log('☣️ Инстинкты Улья подавляют человеческие привычки.');
      return;
    }
    const meta = this.SKILL_META[p.arch] || { name: 'Особый навык', desc: 'Личная особенность персонажа.' };
    if (p.skillUnlocked || (p.lvl || 0) >= 2) {
      p.skillUnlocked = true;
      this.log(`✨ Навык [${meta.name}]: ${meta.desc}`);
      this.speakPhrase(p, meta.phrase || meta.name);
    } else {
      const aInfo = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES && window.STIKS_DB.ARCHETYPES[p.arch]) || {};
      const hint = aInfo.hint || 'Персонаж осматривается и прислушивается к себе.';
      this.log(`🤪 ${hint}`);
      this.speakPhrase(p, hint);
    }
    if (this.renderGame) this.renderGame();
  },

  triggerEncounter(p, zMarker) {
    const s = this.db.session;
    if (zMarker && zMarker.isHuman && !zMarker.hostile) {
      const archs = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES) || {};
      const aInfo = archs[zMarker.arch] || { name: 'Выживший', img: 'img/kachok.jpeg' };
      s.humanEncounter = {
        zId: zMarker.id,
        arch: zMarker.arch || 'kachok',
        name: aInfo.name || 'Выживший',
        img: aInfo.img || 'img/kachok.jpeg',
        lvl: Math.max(1, (p.lvl || 0) + 1)
      };
      this.log(`🧑 Встречен неагрессивный выживший: ${s.humanEncounter.name}.`);
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    const dQty = Math.floor(Math.random() * 6) + 1;
    const dRank = Math.floor(Math.random() * 6) + 1;
    if (dQty === dRank) this.playDoubleSound();

    if (dQty === 6 && dRank === 6) {
      this.log('🎁 ДУБЛЬ «6-6»! Враг уже мёртв, на теле топовый трофей!');
      s.zombies = s.zombies.filter(z => z.id !== zMarker.id);
      const bonus = this.genClusterItem('weapon', '762', false);
      bonus.rare = true;
      if (this.canPickItem(p, bonus)) {
        p.inv.push(bonus);
        p.inv = this.stackInventory(p.inv);
        this.log(`Трофей: ${bonus.n}`);
        this.announceLoot(p, [bonus], true);
      }
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    let finalRank = dRank + (s.diffMod || 0) + (zMarker.rankMod || 0);
    const isOneOne = (dQty === 1 && dRank === 1);
    if (isOneOne) {
      finalRank = s.diffKey === 'start' ? 4 : 9;
      this.log('⚠️ ПЕРЕГРУЗКА «1-1»! Одиночный элитный противник!');
    }

    if (finalRank <= -1) {
      this.log('💀 Встреченный заражённый уже мёртв (ранг -1).');
      s.zombies = s.zombies.filter(z => z.id !== zMarker.id);
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    const count = isOneOne ? 1 : dQty;
    const enemies = [];
    const ranks = (window.STIKS_DB && window.STIKS_DB.Z_RANKS) || [
      { r: 0, n: 'Свежак', min: 0, max: 1 }, { r: 1, n: 'Бегун', min: 1, max: 4 },
      { r: 2, n: 'Прыгун', min: 5, max: 9 }, { r: 3, n: 'Ломач', min: 10, max: 15 },
      { r: 4, n: 'Элитник', min: 20, max: 29 }, { r: 5, n: 'Внешник', min: 30, max: 45 }
    ];

    for (let i = 0; i < count; i++) {
      const rNum = i === 0 ? Math.min(9, Math.max(0, finalRank)) : Math.max(1, Math.floor(Math.random() * Math.max(1, finalRank)) + 1);
      const rInfo = ranks.find(x => x.r === rNum) || ranks[1] || ranks[0];
      let lvl = rNum === 0 ? 0 : (Math.floor(Math.random() * (rInfo.max - rInfo.min + 1)) + rInfo.min);
      if (isOneOne && rNum === 4) lvl = Math.max(20, lvl);
      const div = rNum === 0 ? 2 : 1;
      const hp = Math.floor((20 + lvl * 8) / div);
      const dmg = Math.floor((2 + lvl * 1.5) / div);
      const agi = Math.floor((10 + lvl * 3) / div);
      const def = Math.floor(lvl * 0.5);
      enemies.push({
        name: rInfo.n, rank: rNum, lvl, hp, maxHp: hp, dmg, agi, def,
        poisonTurns: 0, poisonDmg: 0, isHuman: Boolean(zMarker && zMarker.isHuman), arch: zMarker && zMarker.arch
      });
    }

    const defSlot = p.slots.main ? 'main' : (p.slots.side ? 'side' : (p.slots.melee ? 'melee' : null));
    s.combat = {
      zId: zMarker.id,
      enemies,
      round: 1,
      usedSkill: false,
      chosenSlot: defSlot,
      busy: false,
      finished: false,
      victory: false,
      summary: '',
      feed: [`⚔️ Встреча с врагами (${enemies.length} шт.)! Лидер: ${enemies[0].name} (Ур.${enemies[0].lvl})`]
    };
    this.log(`⚔️ БОЙ! Врагов: ${enemies.length} (Лидер: ${enemies[0].name} Ур.${enemies[0].lvl})`);
    if (this.renderCombat) this.renderCombat();
  },

  resolveHumanEncounter(action) {
    const s = this.db && this.db.session;
    if (!s || !s.humanEncounter) return;
    const enc = s.humanEncounter;
    const p = s.players[s.activeIdx];
    const zMarker = s.zombies.find(z => z.id === enc.zId);
    s.humanEncounter = null;

    if (action === 'pass') {
      this.log(`🚶 Вы мирно разошлись с выжившим (${enc.name}).`);
      if (zMarker) { zMarker.hidden = true; zMarker.tPos = null; }
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    if (action === 'attack') {
      this.log(`⚔️ Вы напали на выжившего (${enc.name})!`);
      if (zMarker) zMarker.hostile = true;
      const lvl = enc.lvl || 2;
      const hp = 24 + lvl * 8;
      const dmg = Math.max(2, Math.floor(2 + lvl * 1.4));
      const agi = 10 + lvl * 2;
      const def = Math.floor(lvl * 0.5);
      const defSlot = p.slots.main ? 'main' : (p.slots.side ? 'side' : (p.slots.melee ? 'melee' : null));
      s.combat = {
        zId: enc.zId,
        enemies: [{ name: enc.name, rank: 1, lvl, hp, maxHp: hp, dmg, agi, def, poisonTurns: 0, poisonDmg: 0, isHuman: true, arch: enc.arch }],
        round: 1,
        usedSkill: false,
        chosenSlot: defSlot,
        busy: false,
        finished: false,
        victory: false,
        summary: '',
        feed: [`⚔️ Нападение на выжившего: ${enc.name} (Ур.${lvl})!`]
      };
      this.saveDB();
      if (this.renderCombat) this.renderCombat();
    }
  },

  selectCombatWeapon(slotKey) {
    const s = this.db && this.db.session;
    if (!s || !s.combat || s.combat.busy) return;
    s.combat.chosenSlot = slotKey;
    if (this.renderCombat) this.renderCombat();
  },

  closeCombatModal() {
    const s = this.db && this.db.session;
    if (!s || !s.combat || s.combat.busy) return;
    s.combat = null;
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  combatFlee() {
    const s = this.db && this.db.session;
    if (!s || !s.combat || s.combat.busy) return;
    const p = s.players[s.activeIdx];
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    if (d1 === d2) this.playDoubleSound();
    const chance = d1 + d2 + Math.floor((p.stats.spd || 10) / 10);
    if (chance >= 9) {
      this.log(`🏃 Вы успешно оторвались от преследования [${d1}+${d2}]!`);
      s.combat = null;
      this.saveDB();
      if (this.renderGame) this.renderGame();
    } else {
      s.combat.busy = true;
      s.combat.feed.push(`❌ Побег не удался [${d1}+${d2}]! Враги переходят в атаку.`);
      if (this.renderCombat) this.renderCombat();
      setTimeout(() => this._runEnemyTurn(p, s.combat), 500);
    }
  },

  combatAttack(useSkill) {
    const s = this.db && this.db.session;
    if (!s || !s.combat || s.combat.busy || s.combat.finished) return;
    const p = s.players[s.activeIdx];
    const c = s.combat;
    c.busy = true;

    const activeSlot = c.chosenSlot || (p.slots.main ? 'main' : (p.slots.side ? 'side' : (p.slots.melee ? 'melee' : null)));
    const wItem = activeSlot ? p.slots[activeSlot] : null;
    const isGun = Boolean(wItem && (activeSlot === 'main' || activeSlot === 'side' || wItem.cal));
    const isMelee = Boolean(wItem && activeSlot === 'melee');

    const meta = this.SKILL_META[p.arch] || { name: 'Навык', type: 'active', phrase: 'Вперёд!' };
    let skillActive = false;
    if (useSkill && !c.usedSkill && !p.asInfected && meta.type !== 'passive') {
      c.usedSkill = true;
      skillActive = true;
      c.feed.push(`✨ Применён навык [${meta.name}]: «${meta.phrase}»`);
      this.log(`✨ ${p.name}: «${meta.phrase}»`);
      this.speakPhrase(p, meta.phrase);
      this.grantActionXp(p, 'spi', 1);
    }

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    if (d1 === d2) {
      this.playDoubleSound();
      this.grantActionXp(p, 'spi', 1);
    }

    const targets = (d1 === 6 && d2 === 6) ? 1 : d1;
    const power = (d1 === 1 && d2 === 1) ? 1 : d2;
    const alive = c.enemies.filter(e => e.hp > 0);
    const leadRank = alive[0] ? alive[0].rank : 0;

    const rankBonus = this.getWeaponRankBonus(p, wItem, leadRank);
    const rankMult = this.getWeaponDamageMult(wItem, leadRank);
    const modBonus = (isGun && p.slots.mod) ? Number(p.slots.mod.a || p.slots.mod.rank || 2) : 0;
    const wDmg = wItem ? Number(wItem.a || wItem.dmg || wItem.rank || 2) : 1;
    const statBonus = isGun ? (p.stats.agi * 0.25) : (p.stats.str * 0.3);
    const skillMult = skillActive ? 1.5 : 1;
    const baseHit = Math.max(1, Math.floor((power * 2 + wDmg + rankBonus + modBonus + statBonus) * rankMult * skillMult));

    const hitCount = Math.min(alive.length, Math.max(1, targets));
    for (let i = 0; i < hitCount; i++) {
      const trg = alive[i];
      const dmg = Math.max(1, baseHit - (trg.def || 0));
      trg.hp = Math.max(0, trg.hp - dmg);
      if (isMelee && p.slots.meleeMod) {
        trg.poisonTurns = 3;
        trg.poisonDmg = Math.max(2, Number(p.slots.meleeMod.poison || p.slots.meleeMod.rank || 3));
      }
      const accent = isGun ? '💥 Бах!' : '👊 Дыщ!';
      c.feed.push(`${accent} [${d1}+${d2}] → ${trg.name} -${dmg} ОЗ (${trg.hp}/${trg.maxHp})`);
    }

    this.grantActionXp(p, isGun ? 'agi' : 'str', 1);
    if (this.renderCombat) this.renderCombat();

    const rem = c.enemies.filter(e => e.hp > 0);
    if (!rem.length) {
      setTimeout(() => this._finishCombatVictory(p, c), 650);
    } else {
      setTimeout(() => this._runEnemyTurn(p, c), 750);
    }
  },

  _runEnemyTurn(p, c) {
    const rem = c.enemies.filter(e => e.hp > 0);

    rem.forEach(en => {
      if (en.poisonTurns > 0) {
        en.poisonTurns--;
        en.hp = Math.max(0, en.hp - en.poisonDmg);
        c.feed.push(`🧪 Яд на клинке наносит ${en.name} -${en.poisonDmg} ОЗ (${en.hp}/${en.maxHp})`);
      }
    });

    const stillAlive = c.enemies.filter(e => e.hp > 0);
    if (!stillAlive.length) {
      this._finishCombatVictory(p, c);
      return;
    }

    const asiatDodge = (!p.asInfected && p.arch === 'asiat' && stillAlive.length >= 2 && Math.random() < 0.35);
    if (asiatDodge) {
      c.feed.push('🤸 Азиат учудил акробатический кульбит и ушёл от окружения!');
      this.speakPhrase(p, 'Йа увернулся!');
      c.round++;
      c.busy = false;
      this.saveDB();
      if (this.renderCombat) this.renderCombat();
      return;
    }

    const armRed = this.getArmorReduction(p);
    let idx = 0;

    const nextEnemyStrike = () => {
      if (idx >= stillAlive.length || p.hp <= 0) {
        if (p.hp <= 0) {
          p.dead = true;
          p.status = 'dead';
          this.syncHeroProfile(p);
          c.busy = false;
          c.finished = true;
          c.victory = false;
          c.summary = `💀 ${p.name} погиб в бою на раунде ${c.round}.`;
          c.feed.push(c.summary);
          this.log(c.summary);
          this.saveDB();
          if (this.renderCombat) this.renderCombat();
          return;
        }
        c.round++;
        c.busy = false;
        this.saveDB();
        if (this.renderCombat) this.renderCombat();
        return;
      }

      const en = stillAlive[idx++];
      const rawDmg = Math.max(1, (en.dmg || 2) - Math.floor((p.stats.end || 10) * 0.1));
      const reduced = Math.max(1, Math.round(rawDmg * (1 - armRed / 100)));

      if (!p.asInfected && p.arch === 'cashier' && !c.cashierSaved && (p.hp - reduced <= 0 || reduced >= p.maxHp * 0.4)) {
        c.cashierSaved = true;
        c.feed.push('🛑 Пассивный триггер [Галя, у нас отмена!]: смертельный удар отменён!');
        this.speakPhrase(p, 'Галя, у нас отмена!');
      } else {
        p.hp = Math.max(0, p.hp - reduced);
        this.grantActionXp(p, 'end', 1);
        c.feed.push(`🩸 ${en.name} атакует: -${reduced} ОЗ (броня -${armRed}%) → ОЗ ${p.hp}/${p.maxHp}`);
      }

      if (this.renderCombat) this.renderCombat();
      setTimeout(nextEnemyStrike, 550);
    };

    nextEnemyStrike();
  },

  _finishCombatVictory(p, c) {
    const s = this.db.session;
    const killed = c.enemies.length;
    const lead = c.enemies[0] || { rank: 1, isHuman: false };
    s.zombies = (s.zombies || []).filter(z => z.id !== c.zId);
    p._raidKills = (Number(p._raidKills) || 0) + killed;
    p.lastKill = { rank: lead.rank || 1, isHuman: Boolean(lead.isHuman) };

    if (!lead.isHuman) {
      const spDrop = Math.max(1, killed + Math.floor((lead.rank || 0) / 2));
      s.pendingSpores = (Number(s.pendingSpores) || 0) + spDrop;
    }

    const prevLvl = p.lvl || 0;
    this.recalcLevel(p);
    const gainLvl = (p.lvl || 0) - prevLvl;
    const summary = `🏆 Победа! Уничтожено врагов: ${killed}` +
      (gainLvl > 0 ? `. Уровень повышен: +${gainLvl} (Ур.${p.lvl})` : `. Текущий уровень: ${p.lvl}`) +
      (s.pendingSpores > 0 ? `. Доступно споранов: ${s.pendingSpores} шт.` : '');

    c.busy = false;
    c.finished = true;
    c.victory = true;
    c.summary = summary;
    c.feed.push(summary);
    this.log(summary);
    this.speakPhrase(p, summary);
    this.syncHeroProfile(p);
    this.saveDB();
    if (this.renderCombat) this.renderCombat();
  },

  // =========================================================================
  // 8. ОТРИСОВКА ЛОББИ И ИГРОВОГО ЭКРАНА (КАРТА 9x9, СПОРАНЫ, НАВЫКИ)
  // =========================================================================
  renderLobby() {
    this.ensureStaticLabels();
    this.sanitizeRoster();
    const vp = document.getElementById('game-viewport');
    if (!vp) return;

    const fams = Object.keys(this.db.families || {});
    const archs = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES) || {};
    let h = '<div style="display:flex;flex-direction:column;gap:10px;">';

    if (this.db.session && Array.isArray(this.db.session.players) && this.db.session.players.length) {
      const sqNames = this.db.session.players.map(pl => `${pl.family} ${pl.name}`).join(', ');
      h += '<div style="border:1px solid #4a7a5c;padding:8px;background:#131f18;">';
      h += `<div style="font-size:12px;color:#98d4ae;font-weight:bold;margin-bottom:4px;">⏸ АКТИВНЫЙ РЕЙД НА ПАУЗЕ (Ход: ${this.db.session.turn || 1})</div>`;
      h += `<div style="font-size:11px;color:#c8d6cc;margin-bottom:6px;">Отряд: ${sqNames}</div>`;
      h += '<div style="display:flex;gap:6px;">';
      h += '<button class="btn btn-primary" style="flex:1;" onclick="STIKS.resumeRaid()">▶ Продолжить рейд</button>';
      h += '<button class="btn btn-danger" style="flex:0 0 auto;width:auto !important;padding:6px 10px;" onclick="STIKS.finishPausedRaid()">🏁 Завершить (сброс)</button>';
      h += '</div></div>';
    }

    h += '<div style="border:1px solid #6e2626;padding:8px;background:#111613;">';
    h += '<div style="font-size:12px;color:#d68a8a;margin-bottom:6px;font-weight:bold;">1. ФАМИЛИЯ (АККАУНТ ВЫЖИВШИХ)</div>';
    h += '<div style="display:flex;gap:6px;">';
    h += '<input id="new-fam" placeholder="Введите фамилию..." style="flex:1;min-width:0;background:#0b0d0c;color:#c8d6cc;border:1px solid #6e2626;padding:6px;font-size:12px;">';
    h += '<button class="btn btn-primary" style="flex:0 0 auto;width:auto !important;" onclick="STIKS.addFamily()">+ Фамилия</button>';
    h += '</div>';

    if (fams.length) {
      h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">';
      fams.forEach(f => {
        const act = this.activeFamily === f;
        const fEsc = f.replace(/'/g, "\\'");
        h += `<button class="btn ${act ? 'btn-primary' : ''}" style="flex:0 0 auto;width:auto !important;font-size:11px;padding:4px 8px;" onclick="STIKS.selectFamily('${fEsc}')">${f}</button>`;
      });
      h += '</div>';
    }
    h += '</div>';

    if (this.activeFamily) {
      h += '<div style="border:1px solid #6e2626;padding:8px;background:#111613;">';
      h += `<div style="font-size:12px;color:#d68a8a;margin-bottom:6px;font-weight:bold;">2. ПЕРСОНАЖ (ФАМИЛИЯ: ${this.activeFamily})</div>`;
      h += '<div style="display:flex;flex-direction:column;gap:6px;">';
      h += '<input id="hero-name" placeholder="Имя персонажа..." style="width:100%;box-sizing:border-box;min-width:0;background:#0b0d0c;color:#c8d6cc;border:1px solid #6e2626;padding:6px;font-size:12px;">';
      h += '<div style="display:flex;gap:6px;">';
      h += '<select id="hero-sex" style="flex:1;min-width:0;background:#0b0d0c;color:#c8d6cc;border:1px solid #6e2626;padding:6px;font-size:12px;"><option value="m">Пол: Мужской</option><option value="f">Пол: Женский</option></select>';
      h += '<button class="btn btn-primary" style="flex:0 0 auto;width:auto !important;" onclick="STIKS.addHero()">Создать</button>';
      h += '</div></div>';

      const list = this.db.families[this.activeFamily] || [];
      if (list.length) {
        const famEsc = this.activeFamily.replace(/'/g, "\\'");
        h += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">';
        list.forEach((hr, idx) => {
          this._cleanSporans(hr);
          const inSq = this.squad.some(s => s.uid === hr.uid);
          const isDead = hr.status === 'dead';
          const roleTxt = isDead ? 'Погиб' : (((hr.lvl || 0) >= 2 && archs[hr.arch]) ? archs[hr.arch].name : (hr.sex === 'f' ? 'Жен.' : 'Муж.'));
          const spInfo = (hr.spores > 0) ? ` | 💎${hr.spores}` : '';
          const canShop = !isDead && ((hr.missionsDone || 0) >= 1 || (hr.lvl || 0) >= 1 || hr.spores > 0 || !!hr.shopUnlocked);

          h += '<div style="display:flex;justify-content:space-between;align-items:center;background:#0b0d0c;border:1px solid #3d1c1c;padding:5px 6px;font-size:11px;gap:4px;">';
          h += `<div style="min-width:0;overflow:hidden;text-overflow:ellipsis;"><b>${hr.name}</b> (${roleTxt}) Ур.${hr.lvl || 0}${spInfo}</div>`;
          h += '<div style="display:flex;gap:4px;flex:0 0 auto;flex-wrap:wrap;justify-content:flex-end;">';

          if (canShop) {
            h += `<button class="btn" style="width:auto !important;padding:3px 6px;font-size:10px;border-color:#c9a84c;color:#e6c86e;" onclick="STIKS.openShop('${famEsc}',${idx})">🏪 Лавка</button>`;
          }
          if (!inSq && hr.status === 'ready') {
            h += `<button class="btn btn-primary" style="width:auto !important;padding:3px 6px;font-size:10px;" onclick="STIKS.toggleSquad('${famEsc}',${idx},false)">В отряд</button>`;
          }
          if (!inSq && isDead) {
            h += `<button class="btn" style="width:auto !important;padding:3px 6px;font-size:10px;border-color:#7a3b3b;color:#ff9e9e;" onclick="STIKS.toggleSquad('${famEsc}',${idx},true)">☣️ Заражённый</button>`;
            h += `<button class="btn" style="width:auto !important;padding:3px 6px;font-size:10px;border-color:#4a7a5c;color:#98d4ae;" onclick="STIKS.resetDeadHero('${famEsc}',${idx})">🔄 Обнулить</button>`;
          } else if (hr.status !== 'ready') {
            h += `<button class="btn" style="width:auto !important;padding:3px 6px;font-size:10px;" onclick="STIKS.unlockHero('${famEsc}',${idx})">🔓</button>`;
          }
          h += `<button class="btn btn-danger" style="width:auto !important;padding:3px 6px;font-size:10px;" onclick="STIKS.delHero('${famEsc}',${idx})">✖</button>`;
          h += '</div></div>';
        });
        h += '</div>';
      }
      h += '</div>';
    }

    h += '<div style="border:1px solid #6e2626;padding:8px;background:#111613;">';
    h += `<div style="font-size:12px;color:#d68a8a;margin-bottom:6px;font-weight:bold;">3. ОТРЯД В РЕЙД (${this.squad.length})</div>`;
    if (this.squad.length) {
      this.squad.forEach((sq, i) => {
        const tag = sq.asInfected ? ' <span style="color:#ff7a7a;">[☣️ Заражённый]</span>' : '';
        h += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:3px 0;"><span>${sq.family} ${sq.name}${tag}</span><button class="btn btn-danger" style="flex:0 0 auto;width:auto !important;padding:2px 6px;font-size:10px;" onclick="STIKS.removeSquad(${i})">Убрать</button></div>`;
      });
      h += '<div style="display:flex;gap:6px;margin-top:8px;">';
      h += '<button class="btn btn-primary" style="flex:1;" onclick="STIKS.launchMap(\'start\')">▶ Старт (60x60)</button>';
      h += '<button class="btn btn-danger" style="flex:1;" onclick="STIKS.launchMap(\'hell\')">🔥 Пекло (от 30 ур.)</button>';
      h += '</div>';
    } else {
      h += '<div style="font-size:11px;color:#8a7272;">Добавьте хотя бы одного персонажа из фамилии.</div>';
    }
    h += '</div></div>';

    vp.innerHTML = h;
  },

  renderGame() {
    this.ensureStaticLabels();
    const vp = document.getElementById('game-viewport');
    const s = this.db && this.db.session;
    if (!vp || !s) return;
    if (s.combat && this.renderCombat) {
      this.renderCombat();
      return;
    }

    const p = s.players[s.activeIdx];
    if (!p) return;
    this.normalizePlayerStats(p);
    const carry = this.getCarryInfo(p);
    const archKey = p.asInfected ? 'infected' : p.arch;
    const aInfo = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES && window.STIKS_DB.ARCHETYPES[archKey]) || { name: p.arch, skill: 'Навык' };
    const meta = this.SKILL_META[p.arch] || { name: aInfo.skill || 'Навык', type: 'active' };
    const imgSrc = aInfo.img || ('img/' + archKey + '.jpg');

    let skillLabel = '🤪 Что-то учудить';
    if (p.asInfected) {
      skillLabel = '☣️ Инстинкты Улья';
    } else if (p.skillUnlocked || (p.lvl || 0) >= 2) {
      skillLabel = `✨ ${meta.name}`;
    }

    const sporeLabel = (p.knowsSpores || p.asInfected) ? '☣️ Спор:' : '🤒 Недуг:';
    const bIcons = { 'Скала': '⛰️', 'Водоем': '🌊', 'Руины': '🏚️', 'Обрыв': '🕳️', 'Пожар': '🔥' };
    const lIcons = { 'weapon': '🔫', 'armor': '🛡️', 'supply': '🎒' };

    let h = '<div style="display:flex;flex-direction:column;gap:8px;font-size:11px;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #6e2626;padding-bottom:4px;gap:4px;">';
    h += `<div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><b>${p.family} ${p.name}</b> (Ур.${p.lvl || 0}) [${p.x + 1}:${p.y + 1}]</div>`;
    h += `<div style="display:flex;align-items:center;gap:6px;flex:0 0 auto;"><span>Ход:${s.turn} | ОХ:<b>${p.stepsLeft}/${p.maxAp}</b></span><button class="btn" style="width:auto !important;flex:0 0 auto;padding:3px 7px;font-size:10px;" onclick="STIKS.pauseToLobby()">🏕 Лобби</button></div>`;
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#140e0e;padding:6px;border:1px solid #6e2626;">';
    h += `<div style="white-space:nowrap;">❤️ ОЗ: <b>${p.hp}/${p.maxHp}</b></div>`;
    h += `<div style="white-space:nowrap;">🍖 Сыт: <b>${p.food}</b></div>`;
    h += `<div style="white-space:nowrap;">💧 Жаж: <b>${p.water}</b></div>`;
    h += `<div style="white-space:nowrap;">⚡ Бодр: <b>${p.stamina}</b></div>`;
    h += `<div style="white-space:nowrap;">${sporeLabel} <b>${Math.round(p.spore || 0)}</b></div>`;
    h += `<div style="white-space:nowrap;">🔮 Мана: <b>${p.mana}</b></div>`;
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:repeat(9,1fr);gap:2px;background:#080a09;padding:4px;border:1px solid #6e2626;">';
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const gx = p.x + dx, gy = p.y + dy;
        let bg = '#131815', sym = '', col = '#3d4f44', extraStyle = '';
        if (gx < 0 || gx > 59 || gy < 0 || gy > 59) {
          bg = '#132419';
          sym = '🚪';
          col = '#6ee794';
          extraStyle = 'border:1px dashed #3d8b57;';
        } else {
          const cell = s.grid[gy][gx];
          const zHere = s.zombies.find(z => z.x === gx && z.y === gy && !z.hidden);
          const pHere = s.players.find(pl => pl.x === gx && pl.y === gy && !pl.dead && !pl.escaped);
          if (pHere) {
            bg = '#2d4a38';
            sym = pHere.asInfected ? '☣️' : '🧍';
            col = '#e6f5eb';
          } else if (zHere) {
            bg = zHere.isHuman ? '#2b2614' : '#3b1818';
            sym = zHere.isHuman ? '🧑' : '🧟';
            col = zHere.isHuman ? '#e6c86e' : '#ff7a7a';
          } else if (cell.blocked) {
            bg = '#1f2421';
            sym = bIcons[cell.bType] || '⛰️';
            col = '#687a6e';
          } else if (cell.lootType) {
            bg = cell.valuable ? '#241c30' : '#18242b';
            sym = cell.valuable ? '💎' : (lIcons[cell.lootType] || '📦');
            col = cell.valuable ? '#c49eff' : '#7ab8e6';
          }
        }
        h += `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:${bg};color:${col};font-size:13px;line-height:1;border-radius:2px;${extraStyle}">${sym}</div>`;
      }
    }
    h += '</div>';

    h += '<div style="display:flex;gap:4px;">';
    h += `<button class="btn ${p.moveMode === 'careful' ? 'btn-primary' : ''}" style="padding:5px 4px;font-size:10px;" onclick="STIKS.setMoveMode('careful')">Внимат. (3)</button>`;
    h += `<button class="btn ${p.moveMode === 'fast' ? 'btn-primary' : ''}" style="padding:5px 4px;font-size:10px;" onclick="STIKS.setMoveMode('fast')">Быстро (2)</button>`;
    h += `<button class="btn ${p.moveMode === 'run' ? 'btn-primary' : ''}" style="padding:5px 4px;font-size:10px;" onclick="STIKS.setMoveMode('run')">Бегом (1)</button>`;
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">';
    h += '<div></div><button class="btn" onclick="STIKS.stepPlayer(0,-1)">⬆</button><div></div>';
    h += '<button class="btn" onclick="STIKS.stepPlayer(-1,0)">⬅</button>';
    h += '<button class="btn btn-primary" style="white-space:nowrap;font-size:11px;" onclick="STIKS.searchCell(false)">🔍 Поиск (3)</button>';
    h += '<button class="btn" onclick="STIKS.stepPlayer(1,0)">➡</button>';
    h += '<div></div><button class="btn" onclick="STIKS.stepPlayer(0,1)">⬇</button><div></div>';
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;">';
    h += `<button class="btn" style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 6px;" onclick="STIKS.toggleInv()"><span>🎒 Вещи (${p.inv.length})</span><div style="width:100%;height:4px;background:#1c2420;border-radius:2px;overflow:hidden;"><div style="width:${carry.pct}%;height:100%;background:${carry.col};"></div></div></button>`;
    h += `<button class="btn" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" onclick="STIKS.useWeirdSkill()">${skillLabel}</button>`;
    h += '<button class="btn" style="white-space:nowrap;" onclick="STIKS.toggleProfile()">👤 Параметры</button>';
    h += '<button class="btn btn-primary" style="white-space:nowrap;" onclick="STIKS.nextTurn()">⏭ Конец хода</button>';
    h += '</div>';

    const zCount = (p.inv || []).reduce((acc, it) => {
      if (it && (it.isZhivchik || String(it.n || it.name || '').toLowerCase().includes('живчик'))) {
        return acc + (Number(it.q) || 1);
      }
      return acc;
    }, 0);
    const pend = Number(s.pendingSpores) || 0;
    const showSporeBar = Boolean(p.knowsSpores || p.asInfected || pend > 0 || zCount > 0 || (p.spores || 0) > 0);

    if (showSporeBar) {
      h += '<div id="v182-spore-bar" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;background:#161111;border:1px solid #6e2626;padding:6px 8px;border-radius:4px;font-size:11px;">';
      h += `<span>💎 Спораны: <b>${p.spores || 0}</b> (0 кг)${!p.asInfected && p.knowsSpores ? ` | 🧪 Живчик: <b>${zCount}</b>` : ''}</span>`;
      h += '<div style="display:flex;gap:4px;flex-wrap:wrap;">';
      if (pend > 0 && (p.knowsSpores || p.asInfected)) {
        h += `<button class="btn btn-primary" style="width:auto !important;padding:3px 7px;font-size:10px;" onclick="STIKS.collectSpores()">💎 Собрать (${pend})</button>`;
      }
      if (p.asInfected && p.lastKill) {
        h += '<button class="btn btn-danger" style="width:auto !important;padding:3px 7px;font-size:10px;" onclick="STIKS.devourEnemy()">🍖 Пожрать (1 ОХ)</button>';
      }
      if (!p.asInfected && p.knowsSpores) {
        h += '<button class="btn" style="width:auto !important;padding:3px 7px;font-size:10px;" onclick="STIKS.craftZhivchik()">🧪 Крафт</button>';
        if (zCount > 0) {
          h += `<button class="btn btn-primary" style="width:auto !important;padding:3px 7px;font-size:10px;" onclick="STIKS.drinkZhivchik()">🥤 Выпить (${zCount})</button>`;
        }
      }
      h += '</div></div>';
    }

    if (s.humanEncounter) {
      const enc = s.humanEncounter;
      h += '<div style="position:fixed;inset:0;background:rgba(5,7,6,0.9);z-index:9200;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;">';
      h += '<div style="width:100%;max-width:360px;border:1px solid #c9a84c;background:#141712;padding:14px;border-radius:6px;text-align:center;">';
      h += '<div style="color:#e6c86e;font-weight:bold;font-size:13px;margin-bottom:8px;">🧑 ВСТРЕЧА НА ПУТИ</div>';
      h += `<img src="${enc.img}" alt="Встречный" style="width:160px;height:180px;object-fit:cover;border:1px solid #4a4530;border-radius:6px;margin-bottom:8px;">`;
      h += `<div style="font-size:12px;color:#d6e5db;margin-bottom:4px;">Перед вами неагрессивный выживший: <b>${enc.name}</b></div>`;
      h += '<div style="font-size:11px;color:#9aa89e;margin-bottom:12px;">Он настороженно смотрит на вас, но первым не нападает. Ваши действия?</div>';
      h += '<div style="display:flex;gap:8px;"><button class="btn btn-danger" style="flex:1;padding:8px;" onclick="STIKS.resolveHumanEncounter(\'attack\')">⚔️ Напасть</button><button class="btn btn-primary" style="flex:1;padding:8px;" onclick="STIKS.resolveHumanEncounter(\'pass\')">🚶 Пройти мимо</button></div>';
      h += '</div></div>';
    }

    if (this.profileOpen) {
      h += '<div style="position:fixed;inset:0;background:rgba(5,7,6,0.88);z-index:9000;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;">';
      h += '<div style="width:100%;max-width:400px;max-height:90dvh;overflow-y:auto;border:1px solid #6e2626;background:#140e0e;padding:12px;border-radius:6px;">';
      h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #4a1c1c;padding-bottom:6px;"><b style="color:#d48a8a;font-size:13px;">ЛИЧНОЕ ДЕЛО: ${p.name} (Ур.${p.lvl || 0})</b><button class="btn btn-danger" style="width:auto !important;padding:4px 8px;font-size:11px;" onclick="STIKS.toggleProfile()">✖ Закрыть</button></div>`;
      h += `<div style="text-align:center;margin-bottom:10px;"><img src="${imgSrc}" alt="Портрет" style="width:100%;max-width:240px;max-height:300px;border:1px solid #6e2626;border-radius:6px;object-fit:cover;"><div style="font-size:11px;color:#d48a8a;margin-top:5px;">${(p.lvl >= 2 || p.asInfected) ? aInfo.name : 'Роль раскроется на 2 уровне.'}</div></div>`;
      h += `<div style="font-size:12px;padding:3px 0;color:#e6c86e;">💎 Спораны: <b>${p.spores || 0} шт.</b> (0 кг)</div>`;
      if ((p.lvl || 0) >= 2 || p.asInfected) {
        const stNames = { str: 'Сила', agi: 'Ловкость', spd: 'Скорость', end: 'Выносливость', int: 'Интеллект', spi: 'Дух' };
        Object.keys(stNames).forEach(sk => {
          const val = (p.stats && p.stats[sk]) || 10;
          const disp = (p.lvl >= 5 || p.asInfected) ? val : this.getStatHint(sk, val);
          h += `<div style="font-size:12px;padding:2px 0;">• ${stNames[sk]}: <b>${disp}</b></div>`;
        });
        if (!p.asInfected) {
          h += `<div style="margin-top:8px;padding:6px;background:#0d0909;border:1px solid #3d1c1c;border-radius:4px;font-size:11px;"><b>Навык (${meta.name}):</b> ${meta.desc || aInfo.hint || ''}</div>`;
        }
      }
      h += '</div></div>';
    }

    if (this.invOpen) {
      h += this.renderEquipModal(p);
    }

    h += '</div>';
    vp.innerHTML = h;
  },

  // =========================================================================
  // 12. ОКНО ПОШАГОВОГО БОЯ (RENDER COMBAT)
  // =========================================================================
  renderCombat() {
    this.ensureStaticLabels();
    const vp = document.getElementById('game-viewport');
    const s = this.db && this.db.session;
    if (!vp || !s || !s.combat) return;
    const p = s.players[s.activeIdx];
    const c = s.combat;

    const archKey = p.asInfected ? 'infected' : p.arch;
    const aInfo = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES && window.STIKS_DB.ARCHETYPES[archKey]) || { name: p.arch, skill: 'Навык', hint: '' };
    const meta = (this.SKILL_META && this.SKILL_META[archKey]) || { name: aInfo.skill || 'Особый навык', type: 'active', desc: aInfo.hint || 'Усиление атаки в критический момент.' };

    const weaps = [];
    const slotNames = { main: 'Основное', side: 'Доп. оружие', melee: 'Холодное' };
    ['main', 'side', 'melee'].forEach(sk => {
      if (p.slots && p.slots[sk]) {
        weaps.push({ slot: sk, label: slotNames[sk], item: p.slots[sk] });
      }
    });

    let h = '<div style="display:flex;flex-direction:column;gap:8px;font-size:11px;background:#120b0b;border:1px solid #8f2d2d;padding:10px;border-radius:6px;">';
    h += `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #5c2828;padding-bottom:6px;"><b style="color:#ff8a8a;font-size:13px;">⚔️ БОЕВОЕ СТОЛКНОВЕНИЕ • РАУНД ${c.round}</b><span style="color:#d48a8a;font-size:10px;">${p.name}</span></div>`;

    const hpPct = Math.max(0, Math.min(100, Math.round((p.hp / Math.max(1, p.maxHp)) * 100)));
    const armRed = typeof this.getArmorReduction === 'function' ? this.getArmorReduction(p) : 0;
    h += '<div style="background:#171d19;border:1px solid #355441;padding:7px;border-radius:4px;">';
    h += `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>🛡️ <b>${p.name}</b> (Ур.${p.lvl || 0})</span><span>❤️ ОЗ: <b>${p.hp} / ${p.maxHp}</b> | Броня: <b>-${armRed}%</b></span></div>`;
    h += `<div style="width:100%;height:6px;background:#0b0f0d;border-radius:3px;overflow:hidden;"><div style="width:${hpPct}%;height:100%;background:#4caf50;"></div></div>`;
    h += '</div>';

    h += '<div style="display:flex;flex-direction:column;gap:5px;">';
    (c.enemies || []).forEach(e => {
      const dead = (e.hp || 0) <= 0;
      const ePct = Math.max(0, Math.min(100, Math.round(((e.hp || 0) / Math.max(1, e.maxHp || 1)) * 100)));
      const poisonTag = (e.poisonTurns && e.poisonTurns > 0) ? ` <span style="color:#9be66e;">[🧪 Яд: ${e.poisonTurns} х.]</span>` : '';
      const bg = dead ? '#141414' : '#211111';
      const brd = dead ? '#333' : '#6e2626';
      h += `<div style="background:${bg};border:1px solid ${brd};padding:6px;border-radius:4px;opacity:${dead ? '0.55' : '1'};">`;
      h += `<div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span>${dead ? '💀' : '☣️'} <b>${e.name}</b> (Ранг ${e.rank}, Ур.${e.lvl})${poisonTag}</span><span>ОЗ: <b>${e.hp}/${e.maxHp}</b></span></div>`;
      h += `<div style="width:100%;height:5px;background:#0d0707;border-radius:3px;overflow:hidden;"><div style="width:${ePct}%;height:100%;background:#e53935;"></div></div>`;
      h += '</div>';
    });
    h += '</div>';

    if (weaps.length > 0 && !c.finished) {
      h += '<div style="background:#181010;border:1px solid #4a1c1c;padding:6px;border-radius:4px;">';
      h += '<div style="font-size:10px;color:#c89696;margin-bottom:4px;">Оружие для удара:</div>';
      h += '<div style="display:flex;gap:4px;flex-wrap:wrap;">';
      weaps.forEach(w => {
        const act = c.chosenSlot === w.slot;
        const wTitle = w.item.n || w.item.name || 'Оружие';
        const dis = c.busy ? 'disabled' : '';
        h += `<button class="btn ${act ? 'btn-primary' : ''}" ${dis} style="width:auto !important;padding:4px 7px;font-size:10px;" onclick="STIKS.selectCombatWeapon('${w.slot}')">${w.label}: ${wTitle}</button>`;
      });
      h += '</div></div>';
    }

    if (!p.asInfected && archKey !== 'infected' && !c.finished) {
      const isPassive = (meta.type === 'passive');
      const skColor = isPassive ? '#e6c86e' : '#98d4ae';
      const skTag = isPassive ? '[ПАССИВНЫЙ]' : '[АКТИВНЫЙ 1 РАЗ ЗА БОЙ]';
      h += `<div style="background:#141218;border:1px solid #3c334d;padding:6px;border-radius:4px;font-size:10px;line-height:1.35;">`;
      h += `<div style="color:${skColor};font-weight:bold;">✨ ${meta.name} ${skTag}</div>`;
      h += `<div style="color:#b8b2c4;margin-top:2px;">${meta.desc || ''}</div>`;
      h += '</div>';
    }

    const feed = Array.isArray(c.feed) ? c.feed : [];
    h += '<div id="combat-feed-box" style="background:#090707;border:1px solid #3d1c1c;padding:7px;border-radius:4px;max-height:135px;overflow-y:auto;font-size:11px;line-height:1.4;color:#e6d5d5;">';
    if (!feed.length) {
      h += '<div style="color:#7a6060;">Выберите действие для начала раунда...</div>';
    } else {
      feed.slice(-10).forEach(line => {
        h += `<div style="padding:2px 0;border-bottom:1px dashed #241212;">${line}</div>`;
      });
    }
    h += '</div>';

    if (c.finished) {
      const resBg = c.victory ? '#132419' : '#291111';
      const resBrd = c.victory ? '#4a9e68' : '#b83232';
      const resCol = c.victory ? '#98f5b8' : '#ff9e9e';
      h += `<div style="background:${resBg};border:2px solid ${resBrd};padding:10px;border-radius:5px;text-align:center;">`;
      h += `<div style="color:${resCol};font-weight:bold;font-size:12px;margin-bottom:8px;">${c.summary || (c.victory ? '🏆 Бой окончен победой!' : '💀 Вы погибли в бою.')}</div>`;
      h += '<button class="btn btn-primary" style="width:100%;padding:8px;font-size:12px;" onclick="STIKS.closeCombatModal()">Продолжить ▶</button>';
      h += '</div>';
    } else {
      const dis = c.busy ? 'disabled' : '';
      const canActiveSkill = !p.asInfected && archKey !== 'infected' && meta.type !== 'passive' && !c.usedSkill;
      h += '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
      h += `<button class="btn btn-primary" ${dis} style="flex:1;padding:7px;font-size:11px;" onclick="STIKS.combatAttack(false)">${c.busy ? '⏳ Идёт раунд...' : '🔫 Атаковать'}</button>`;
      if (canActiveSkill) {
        h += `<button class="btn" ${dis} style="flex:1;padding:7px;font-size:11px;border-color:#7a62a8;color:#d6c4ff;" onclick="STIKS.combatAttack(true)">✨ ${meta.name}</button>`;
      }
      h += `<button class="btn btn-danger" ${dis} style="flex:0 0 auto;width:auto !important;padding:7px 10px;font-size:11px;" onclick="STIKS.combatFlee()">🏃 Сбежать</button>`;
      h += '</div>';
    }

    h += '</div>';
    vp.innerHTML = h;
    const feedEl = document.getElementById('combat-feed-box');
    if (feedEl) feedEl.scrollTop = feedEl.scrollHeight;
  },

  // =========================================================================
  // 13. ПРОЛОГ (SHOW INTRO) И ОКНО ИТОГОВ РЕЙДА (RAID SUMMARY)
  // =========================================================================
  stopIntro() {
    if (Array.isArray(this._introTimers)) {
      this._introTimers.forEach(t => clearTimeout(t));
      this._introTimers = [];
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    const ov = document.getElementById('stiks-intro-overlay');
    if (ov) ov.remove();
    if (this.renderGame) this.renderGame();
  },

  speakIntroQueue(sentences) {
    const subEl = document.getElementById('stiks-intro-sub');
    if (!Array.isArray(sentences) || !sentences.length) return;
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    let idx = 0;
    const nextSentence = () => {
      if (!document.getElementById('stiks-intro-overlay')) return;
      if (idx >= sentences.length) {
        if (subEl) subEl.innerText = 'Нажмите «В город ▶», чтобы начать рейд.';
        return;
      }
      const line = sentences[idx++];
      if (subEl) subEl.innerText = line;
      const voiceBtn = document.getElementById('btn-voice');
      const soundOn = (!voiceBtn || !voiceBtn.innerText.includes('ВЫКЛ')) && this.voiceOn;
      if (soundOn && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        try {
          const u = new SpeechSynthesisUtterance(line);
          u.lang = 'ru-RU';
          u.rate = 0.96;
          u.pitch = 0.85;
          u.onend = () => setTimeout(nextSentence, 180);
          u.onerror = () => setTimeout(nextSentence, 2400);
          window.speechSynthesis.speak(u);
          return;
        } catch (e) {}
      }
      const readMs = Math.max(2200, Math.min(6000, line.length * 65));
      const tm = setTimeout(nextSentence, readMs);
      this._introTimers.push(tm);
    };
    nextSentence();
  },

  showIntro(p) {
    this.stopIntro();
    const archs = (window.STIKS_DB && window.STIKS_DB.ARCHETYPES) || {};
    const key = p.asInfected ? 'infected' : p.arch;
    const aInfo = archs[key] || archs.kachok || {};
    const rawText = (aInfo.intro || '{NAME} очнулся в тёмном номере гостиницы под вой сирены и вышел на пустую улицу города.').replace(/\{NAME\}/g, p.name || 'Выживший');
    const sentences = (rawText.match(/[^.!?]+[.!?]+/g) || [rawText]).map(s => s.trim()).filter(Boolean);
    const frames = ['img/intro1.jpg', 'img/intro2.JPG', 'img/intro3.jpg'];
    const totalMs = Math.min(75000, Math.max(24000, rawText.length * 75));
    const stepMs = Math.floor(totalMs / 3);

    const ov = document.createElement('div');
    ov.id = 'stiks-intro-overlay';
    ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;max-width:100vw;height:100dvh;max-height:100dvh;background:#080a09;z-index:9999;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;overflow:hidden;font-family:monospace;color:#d6e5db;';

    const topBar = '<div style="width:100%;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:rgba(11,13,12,0.92);border-bottom:1px solid #6e2626;gap:6px;z-index:2;"><span id="stiks-intro-step" style="font-size:11px;color:#d48a8a;white-space:nowrap;flex:0 0 auto;">ПРОЛОГ 1/3</span><div style="display:flex;gap:6px;flex:0 0 auto;"><button id="stiks-intro-voice" class="btn" style="width:auto !important;flex:0 0 auto;padding:6px 10px;font-size:11px;white-space:nowrap;">🔊 Голос</button><button id="stiks-intro-skip" class="btn btn-primary" style="width:auto !important;flex:0 0 auto;padding:6px 12px;font-size:11px;white-space:nowrap;">В город ▶</button></div></div>';
    const imgBox = `<div id="stiks-intro-bg" style="flex:1 1 auto;width:100%;min-height:0;background-color:#080a09;background-image:url('${frames[0]}');background-size:contain;background-position:center;background-repeat:no-repeat;transition:background-image 0.5s ease;"></div>`;
    const subBox = `<div style="width:100%;box-sizing:border-box;padding:10px 14px 48px 14px;background:linear-gradient(to top, rgba(8,10,9,0.98) 65%, rgba(8,10,9,0.75) 100%);border-top:1px solid #4a1c1c;z-index:2;"><div id="stiks-intro-sub" style="font-size:13px;line-height:1.45;color:#eef7f1;text-align:center;min-height:56px;max-height:82px;overflow:hidden;display:flex;align-items:center;justify-content:center;">${sentences[0] || ''}</div></div>`;

    ov.innerHTML = topBar + imgBox + subBox;
    document.body.appendChild(ov);

    this._introTimers = [];
    const skipBtn = document.getElementById('stiks-intro-skip');
    if (skipBtn) skipBtn.onclick = () => this.stopIntro();
    const vBtn = document.getElementById('stiks-intro-voice');
    if (vBtn) vBtn.onclick = () => this.speakIntroQueue(sentences);

    [1, 2].forEach(idx => {
      const tm = setTimeout(() => {
        const bg = document.getElementById('stiks-intro-bg');
        const st = document.getElementById('stiks-intro-step');
        if (bg) bg.style.backgroundImage = `url('${frames[idx]}')`;
        if (st) st.innerText = `ПРОЛОГ ${idx + 1}/3`;
      }, stepMs * idx);
      this._introTimers.push(tm);
    });
    this.speakIntroQueue(sentences);
  },

  closeRaidSummary(openShopUid) {
    const ov = document.getElementById('stiks-raid-summary-modal');
    if (ov) ov.remove();
    if (openShopUid && typeof this.openShop === 'function') {
      this.openShop(openShopUid);
    }
  },

  showRaidSummaryModal(info) {
    const old = document.getElementById('stiks-raid-summary-modal');
    if (old) old.remove();

    const ov = document.createElement('div');
    ov.id = 'stiks-raid-summary-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,6,0.93);z-index:9600;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:monospace;color:#d6e5db;';

    const lvlDeltaStr = info.lvlGain > 0 ? (`+${info.lvlGain} (теперь Ур.${info.endLvl})`) : (`без изменений (Ур.${info.endLvl})`);
    let h = '<div style="width:100%;max-width:400px;border:1px solid #8f2d2d;background:#140e0e;padding:14px;border-radius:6px;font-size:12px;">';
    h += '<div style="color:#ff9e9e;font-weight:bold;font-size:14px;border-bottom:1px solid #5c2828;padding-bottom:6px;margin-bottom:10px;text-align:center;">🚪 ИТОГИ ВЫХОДА С ЛОКАЦИИ</div>';
    h += `<div style="margin-bottom:6px;">👤 Выживший: <b>${info.name}</b></div>`;
    h += `<div style="margin-bottom:6px;">⬆️ Поднято уровней: <b>${lvlDeltaStr}</b></div>`;
    h += `<div style="margin-bottom:6px;">🧟 Уничтожено врагов за рейд: <b>${info.kills}</b></div>`;
    h += `<div style="margin-bottom:6px;">💎 Споранов на счету: <b>${info.spores} шт.</b> (0 кг)</div>`;
    h += `<div style="margin-bottom:12px;">🎒 Предметов в рюкзаке: <b>${info.itemsCount}</b></div>`;
    h += '<div style="display:flex;gap:8px;">';
    h += `<button class="btn btn-primary" style="flex:1;padding:8px;" onclick="STIKS.closeRaidSummary('${info.uid}')">🏪 Перейти в Лавку</button>`;
    h += '<button class="btn" style="flex:0 0 auto;width:auto !important;padding:8px 10px;" onclick="STIKS.closeRaidSummary(null)">В лобби</button>';
    h += '</div></div>';

    ov.innerHTML = h;
    document.body.appendChild(ov);
  }
};

// =========================================================================
// 14. АВТОИНИЦИАЛИЗАЦИЯ ЧИСТОГО ЯДРА v1.8.2
// =========================================================================
window.STIKS_PLUGINS = window.STIKS_PLUGINS || { mapCell: [], encounter: [], lobbyActions: [], combatActions: [] };
window.STIKS_ACTIVE_VERSION = 'v1.8.2';
if (window.STIKS && typeof window.STIKS.loadDB === 'function') {
  window.STIKS.loadDB();
}
