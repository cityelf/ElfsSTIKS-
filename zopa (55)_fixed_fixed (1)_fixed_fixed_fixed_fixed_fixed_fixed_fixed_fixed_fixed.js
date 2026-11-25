// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 1/8 — ЧАСТЬ 1А)
// Ядро STIKS, сейвы stiks_dev_v2_db, слияние фамилий и мост совместимости
// ============================================================================
(function(global) {
  'use strict';

  const STIKS = global.STIKS = {
    version: 'v3.0.0-clean',
    db: { families: {}, session: null, stash: [] },
    squad: [],
    activeFamily: null,
    invOpen: false,
    profileOpen: false,
    lobbyPaused: false,
    voiceOn: true,
    DB_KEY: 'stiks_dev_v2_db',
    BACKUP_KEY: 'stiks_dev_v2_db_safe_backup',
    CODEX_KEY: 'stiks_codex_v186',

    LVL_TABLE: Array.of(
      60, 68, 76, 84, 92, 100, 110, 121, 132, 145, 159,
      174, 191, 210, 231, 254, 279, 306, 336, 369, 405,
      445, 489, 537, 590, 649, 713, 784, 862, 948, 1042,
      1146, 1260, 1386, 1524, 1676, 1843, 2027, 2229, 2451, 2696,
      2965, 3261, 3587, 3945, 4339, 4772, 5249, 5773, 6350, 6985,
      7683, 8451, 9296, 10225, 11247, 12371, 13608, 14968, 16464, 18276
    ),

    log(m) {
      const b = document.getElementById('sys-log');
      if (b) b.innerHTML = '&gt; ' + m + '<br>' + b.innerHTML;
    },

    _round100(v) {
      return Math.round((Number(v) || 0) * 100) / 100;
    },

    _hasFamilies(obj) {
      return Boolean(obj && obj.families && typeof obj.families === 'object' && Object.keys(obj.families).length > 0);
    },

    _tryParse(raw) {
      if (!raw || typeof raw !== 'string') return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },

    _cleanSporans(obj) {
      if (!obj) return 0;
      const a = Number(obj.spores), b = Number(obj.sporans);
      const va = (isFinite(a) && a >= 0 && a <= 100000000) ? Math.floor(a) : 0;
      const vb = (isFinite(b) && b >= 0 && b <= 100000000) ? Math.floor(b) : 0;
      const val = Math.max(va, vb);
      obj.spores = val;
      return val;
    },

    syncSporans(obj) { return this._cleanSporans(obj); },

    defaultSlots() {
      return {
        main: null, side: null, melee: null, mag: null, mod: null,
        meleeMod: null, armor: null, clothes: null, boots: null, bag: null, talisman: null
      };
    },

    saveDB() {
      try {
        const existing = this._tryParse(localStorage.getItem(this.DB_KEY));
        if (!this._hasFamilies(this.db) && this._hasFamilies(existing)) {
          this.db.families = JSON.parse(JSON.stringify(existing.families));
        }
        const serialized = JSON.stringify(this.db);
        if (serialized && serialized.length > 20) {
          localStorage.setItem(this.DB_KEY, serialized);
          if (this._hasFamilies(this.db)) localStorage.setItem(this.BACKUP_KEY, serialized);
        }
      } catch (e) {}
    },

    loadDB() {
      let loaded = this._tryParse(localStorage.getItem(this.DB_KEY));
      if (!this._hasFamilies(loaded)) {
        const bkp = this._tryParse(localStorage.getItem(this.BACKUP_KEY));
        if (this._hasFamilies(bkp)) loaded = bkp;
      }
      if (loaded && typeof loaded === 'object') {
        this.db = Object.assign({ families: {}, session: null, stash: [] }, loaded);
      }
      if (!this.db.families || typeof this.db.families !== 'object') this.db.families = {};
      if (!Array.isArray(this.db.stash)) this.db.stash = [];
      this.bindAllHeroesCompat();
      this.sanitizeRoster();
    }

,
// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 1/8 — ЧАСТЬ 1Б)
// Инициализация ядра init(), импорт/экспорт сейвов и привязка кнопок
// ============================================================================
    exportSave() {
      this.saveDB();
      const raw = JSON.stringify(this.db, null, 2);
      const blob = new Blob(Array.of(raw), { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `stiks_save_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      this.log('💾 Сейв выгружен в файл.');
    },

    importSave(file) {
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        const parsed = this._tryParse(String(r.result || ''));
        if (this.mergeBackupSmart(parsed)) {
          const fams = Object.keys(this.db.families || {});
          if (!this.activeFamily && fams.length) this.activeFamily = fams.at(0);
          this.log('📂 Сейв успешно объединён с текущим прогрессом.');
          this.renderLobby();
        } else {
          this.log('❌ Ошибка чтения файла сохранения.');
        }
      };
      r.readAsText(file);
    },

    init() {
      this.loadDB();
      const fams = Object.keys(this.db.families || {});
      if (!this.activeFamily && fams.length) this.activeFamily = fams.at(0);
      this.ensureStaticLabels();
      const expBtn = document.getElementById('btn-export-save');
      if (expBtn) expBtn.onclick = () => this.exportSave();
      const impInp = document.getElementById('inp-import-save');
      if (impInp) impInp.onchange = e => this.importSave(e.target && e.target.files && e.target.files.at(0));
      if (this.db.session && Array.isArray(this.db.session.players) && this.db.session.players.length && !this.lobbyPaused) {
        this.renderGame();
      } else {
        this.renderLobby();
      }
    },

    bindHeroCompat(hero) {
      if (!hero || typeof hero !== 'object' || hero._compatBound) return hero;
      Object.defineProperty(hero, '_compatBound', { value: true, enumerable: false, configurable: true });
      if (typeof hero.lvl !== 'number') hero.lvl = Number(hero.level || 0);
      Object.defineProperty(hero, 'level', {
        configurable: true, enumerable: false,
        get() { return Number(this.lvl || 0); },
        set(v) { this.lvl = Math.max(0, Number(v) || 0); }
      });
      hero.spores = this._cleanSporans(hero);
      Object.defineProperty(hero, 'sporans', {
        configurable: true, enumerable: false,
        get() { return Number(this.spores || 0); },
        set(v) { this.spores = Math.max(0, Math.floor(Number(v) || 0)); }
      });
      if (!Array.isArray(hero.inv)) hero.inv = Array.isArray(hero.inventory) ? hero.inventory : Array.of();
      Object.defineProperty(hero, 'inventory', {
        configurable: true, enumerable: false,
        get() { return this.inv; },
        set(v) { this.inv = Array.isArray(v) ? v : Array.of(); }
      });
      if (!hero.slots || typeof hero.slots !== 'object') {
        hero.slots = (hero.equip && typeof hero.equip === 'object') ? hero.equip : this.defaultSlots();
      }
      Object.defineProperty(hero, 'equip', {
        configurable: true, enumerable: false,
        get() { return this.slots; },
        set(v) { if (v && typeof v === 'object') this.slots = v; }
      });
      hero.stats = hero.stats || { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };
      Array.of('str', 'agi', 'spd', 'end', 'int', 'spi').forEach(sk => {
        if (typeof hero[sk] === 'number' && hero[sk] !== hero.stats[sk]) {
          hero.stats[sk] = Math.max(hero.stats[sk] || 0, hero[sk]);
        }
        Object.defineProperty(hero, sk, {
          configurable: true, enumerable: false,
          get() { return Number((this.stats && this.stats[sk]) || 10); },
          set(v) {
            this.stats = this.stats || { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };
            this.stats[sk] = Number(v) || 0;
          }
        });
      });
      return hero;
    },

    bindAllHeroesCompat() {
      if (this.db && this.db.families) {
        Object.keys(this.db.families).forEach(fam => (this.db.families[fam] || Array.of()).forEach(h => this.bindHeroCompat(h)));
      }
      if (Array.isArray(this.squad)) this.squad.forEach(h => this.bindHeroCompat(h));
      if (this.db && this.db.session && Array.isArray(this.db.session.players)) {
        this.db.session.players.forEach(h => this.bindHeroCompat(h));
      }
    },

    sanitizeRoster() {
      if (!this.db || !this.db.families) return;
      const hasActive = Boolean(this.db.session && Array.isArray(this.db.session.players) && this.db.session.players.length > 0);
      Object.keys(this.db.families).forEach(fam => {
        (this.db.families[fam] || Array.of()).forEach(hr => {
          this.bindHeroCompat(hr);
          if (!hasActive && hr.status === 'in_raid') hr.status = 'ready';
          this._cleanSporans(hr);
        });
      });
    },

    mergeBackupSmart(incoming) {
      if (!incoming || typeof incoming !== 'object' || !incoming.families) return false;
      this.db.families = this.db.families || {};
      Object.keys(incoming.families).forEach(fam => {
        if (!Array.isArray(this.db.families[fam])) this.db.families[fam] = Array.of();
        (incoming.families[fam] || Array.of()).forEach(incH => {
          if (!incH || !incH.name) return;
          const idx = this.db.families[fam].findIndex(ch => (incH.uid && ch.uid === incH.uid) || ch.name === incH.name);
          if (idx === -1) {
            this.db.families[fam].push(incH);
          } else {
            const curH = this.db.families[fam].at(idx);
            const curScore = (Number(curH.lvl) || 0) * 1000 + (Number(curH.missionsDone) || 0) * 100 + Object.keys(curH.gifts || {}).length * 50;
            const incScore = (Number(incH.lvl) || 0) * 1000 + (Number(incH.missionsDone) || 0) * 100 + Object.keys(incH.gifts || {}).length * 50;
            if (incScore >= curScore) this.db.families[fam][idx] = Object.assign({}, curH, incH);
          }
        });
      });
      this.bindAllHeroesCompat();
      this.sanitizeRoster();
      this.saveDB();
      return true;
    },

    ensureStaticLabels() {
      const topBar = document.querySelector('.top-controls');
      if (topBar) {
        Array.from(topBar.querySelectorAll('button')).forEach(b => {
          const t = b.textContent || '';
          if (t.includes('Симулятор') || t.includes('Поселение') || t.includes('Копия из проды')) b.remove();
        });
        if (!document.getElementById('btn-open-city')) {
          const cBtn = document.createElement('button');
          cBtn.id = 'btn-open-city';
          cBtn.type = 'button';
          cBtn.className = 'btn';
          cBtn.style.cssText = 'border-color:#4ade80;color:#86efac;font-weight:bold;';
          cBtn.innerHTML = '🏙️ Город';
          cBtn.onclick = () => this.goToCity();
          topBar.appendChild(cBtn);
        }
        if (!document.getElementById('btn-open-diary')) {
          const dBtn = document.createElement('button');
          dBtn.id = 'btn-open-diary';
          dBtn.type = 'button';
          dBtn.className = 'btn';
          dBtn.style.cssText = 'border-color:#f59e0b;color:#fcd34d;font-weight:bold;';
          dBtn.innerHTML = '📓 Дневник';
          dBtn.onclick = () => this.openCodex('archive');
          topBar.appendChild(dBtn);
        }
        if (!document.getElementById('btn-ambient-bgm')) {
          const aBtn = document.createElement('button');
          aBtn.id = 'btn-ambient-bgm';
          aBtn.type = 'button';
          aBtn.className = 'btn';
          aBtn.style.cssText = 'border-color:#64748b;color:#cbd5e1;';
          aBtn.textContent = (this.ambientAudio && this.ambientAudio.on) ? '🎶 Фон: ВКЛ' : '🔇 Фон: ВЫКЛ';
          aBtn.onclick = () => this.ambientAudio && this.ambientAudio.toggle();
          topBar.appendChild(aBtn);
        }
      }
      const w = document.querySelector('.wrapper') || document.body;
      if (w && !document.getElementById('authors-footer') && typeof this.renderAuthorsFooter === 'function') {
        const ft = document.createElement('div');
        ft.id = 'authors-footer';
        ft.innerHTML = this.renderAuthorsFooter();
        w.appendChild(ft);
      }
      const badge = document.getElementById('patch-status');
      if (badge) badge.innerText = 'Ядро: ' + this.version;
    },

    _getAudioCtx() {
      if (global.BSIM_AUDIO && typeof global.BSIM_AUDIO.ensureCtx === 'function') return global.BSIM_AUDIO.ensureCtx();
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return null;
      if (!this._ctx) this._ctx = new Ctx();
      if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
      return this._ctx;
    },

    playGrowl(sec) {
      const ctx = this._getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime, o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o1.type = 'sawtooth'; o1.frequency.value = 38;
      o2.type = 'triangle'; o2.frequency.value = 65;
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + Math.min(6, sec || 1));
      o1.connect(g); o2.connect(g); g.connect(ctx.destination);
      o1.start(now); o2.start(now);
      o1.stop(now + Math.min(6, sec || 1)); o2.stop(now + Math.min(6, sec || 1));
    },

    playDoubleSound() {
      const ctx = this._getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      Array.of(523.25, 659.25).forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.18, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.16);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + i * 0.09); osc.stop(now + i * 0.09 + 0.17);
      });
    },

    playStepSound(mode) {
      const ctx = this._getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const steps = mode === 'run' ? Array.of(0, 0.11, 0.22) : (mode === 'fast' ? Array.of(0, 0.16) : Array.of(0));
      const baseFreq = mode === 'run' ? 115 : (mode === 'fast' ? 95 : 75);
      steps.forEach(off => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now + off);
        osc.frequency.exponentialRampToValueAtTime(34, now + off + 0.08);
        gain.gain.setValueAtTime(0.11, now + off);
        gain.gain.exponentialRampToValueAtTime(0.001, now + off + 0.09);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + off); osc.stop(now + off + 0.095);
      });
    },

    playRustleSound() {
      const ctx = this._getAudioCtx();
      if (!ctx) return;
      const bufSize = Math.floor(ctx.sampleRate * 0.22), buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufSize) * Math.PI);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1800;
      const gain = ctx.createGain(); gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.21);
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination); src.start();
    },

    playWorkSound(kind) {
      const ctx = this._getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = kind === 'anvil' ? 'sine' : (kind === 'pickaxe' ? 'square' : 'sawtooth');
      o.frequency.setValueAtTime(kind === 'anvil' ? 1180 : (kind === 'snore' ? 68 : 320), now);
      o.frequency.exponentialRampToValueAtTime(kind === 'anvil' ? 590 : 48, now + 0.32);
      g.gain.setValueAtTime(0.14, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.35);
    },

    isFem(p) {
      if (!p) return false;
      if (p.sex === 'f' || p.gender === 'f' || p.gender === 'female') return true;
      if (p.sex === 'm' || p.gender === 'm' || p.gender === 'male') return false;
      return Array.of('tatan', 'strip', 'nanny', 'cashier', 'schoolgirl', 'vet', 'legend_f', 'legend_kvaz_f').includes(p.arch);
    },

    formatSpeech(role, txt) {
      const PRON = /(^|\s)(я|меня|мне|мной|мы|нас|нам|ты|тебя|тебе|вы|вас|вам|он|его|ему|она|её|ей|оно|они|их|мой|моя|моё|мои|твой|твоя|свой|наш|ваш|этот|эта|это|кто|что)(?=[\s.,!?]|$)/gi;
      if (role === 'infected') {
        return txt.replace(/(^|\s)([а-яА-ЯёЁ]*(?:кров|укус|куса|еда|еду|есть|жра|сожр|мяс|плот|добыч|голод|разорв|грыз)[а-яА-ЯёЁ]*)(?=[\s.,!?]|$)/gi, (m, sp, w) => sp + w.toUpperCase() + '!').replace(/о/g, 'О');
      }
      if (role === 'prof') return txt.replace(/р(?=[аА])/g, 'ох').replace(/Р(?=[аА])/g, 'Ох').replace(/([рРлЛ])(?=[еиЕИ])/g, '$1ь');
      if (role === 'alkash') return txt.replace(PRON, '$1$2 иИииК! ');
      if (role === 'kachok') return txt.replace(PRON, (m, sp, w) => sp + w.toUpperCase() + '!');
      if (role === 'asiat') return txt.replace(/я/g, 'йа').replace(/Я/g, 'Йа').replace(/ё/g, 'йо').replace(/Ё/g, 'Йо').replace(/е/g, 'йэ').replace(/Е/g, 'Йэ');
      if (role === 'tatan') return txt.replace(/е/g, 'ее').replace(/Е/g, 'Ее');
      if (role === 'strip') return txt.replace(/\?/g, '!?').replace(/\./g, '!');
      return txt;
    },

    speakPhrase(p, text, onDone) {
      if (!this.voiceOn || !('speechSynthesis' in global)) { if (onDone) onDone(); return; }
      global.speechSynthesis.cancel();
      const role = (p && p.isKvaz) ? 'kvaz' : ((p && (p.asInfected || p.isInfected)) ? 'infected' : ((p && p.arch) || 'kachok'));
      const styled = this.formatSpeech(role, text);
      if (role === 'infected') this.playGrowl(Math.min(5, styled.length * 0.06));
      const u = new SpeechSynthesisUtterance(styled);
      u.lang = /[a-zA-Z]/.test(styled) ? 'en-US' : 'ru-RU';
      const fem = this.isFem(p);
      u.pitch = role === 'kvaz' ? 0.55 : (role === 'infected' ? 0.45 : (fem ? 1.35 : 0.92));
      u.rate = role === 'kvaz' ? 0.85 : 1.08;
      u.onend = u.onerror = () => { if (onDone) onDone(); };
      global.speechSynthesis.speak(u);
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 2/8 — ЧАСТЬ 2А)
// Мост к STIKS_CONTENT, портреты, анти-спойлер и статы normalizePlayerStats
// ============================================================================
    getContent() {
      return global.STIKS_CONTENT || { BALANCE: {}, ARCHETYPES: {}, DARS: {}, Z_RANKS: Array.of(), ITEMS: {} };
    },

    getArchMeta(key) {
      const C = this.getContent();
      return (C.ARCHETYPES && C.ARCHETYPES[key]) || (C.ARCHETYPES && C.ARCHETYPES.kachok) || { name: 'Выживший', stats: { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 }, mult: {} };
    },

    getDarsMap() {
      return this.getContent().DARS || {};
    },

    getZRanks() {
      const C = this.getContent();
      return Array.isArray(C.Z_RANKS) ? C.Z_RANKS : Array.of();
    },

    getPlayerRankByLvl(lvl) {
      const l = Math.max(0, Number(lvl) || 0);
      const rows = this.getZRanks();
      for (let i = 0; i < rows.length; i++) {
        if (l >= rows.at(i).minLvl && l <= rows.at(i).maxLvl) return rows.at(i).r;
      }
      return l > 60 ? 9 : 0;
    },

    resolvePortrait(p) {
      if (!p) return 'img/kachok.jpeg';
      const fem = this.isFem(p);
      if (p.arch === 'legend_z') return 'img/Legen_Z.jpg';
      if (p.arch === 'legend_kvaz_m') return 'img/Legen_kvazM.jpg';
      if (p.arch === 'legend_kvaz_f') return 'img/Legen_kvazF.jpg';
      if (p.isLegendary && !p.isKvaz && !p.isInfected && !p.asInfected) {
        return fem ? 'img/Legen_girl.jpg' : 'img/Legen_man.jpg';
      }
      if (p.isKvaz || p.form === 'kvaz') return fem ? 'img/Kvazf.jpg' : 'img/Kvazm.jpg';
      if (p.asInfected || p.isInfected || p.arch === 'infected') {
        const r = this.getPlayerRankByLvl(p.lvl || 0);
        const zInfo = this.getZRanks().at(Math.min(9, r));
        return (zInfo && zInfo.img) || 'img/infected.jpg';
      }
      const key = p.arch || 'kachok';
      if (key === 'psih') return fem ? 'img/Psihf.jpeg' : 'img/Psihm.jpg';
      const a = this.getArchMeta(key);
      return a.img || (fem ? 'img/tatan.jpg' : 'img/kachok.jpeg');
    },

    isRealSporeUnlocked(p) {
      if (!p) return false;
      if (p.asInfected || p.isInfected || p.isKvaz) return true;
      if (p._manualBookRead || p._drankZhivchik || (Number(p.missionsDone) || 0) > 0) {
        p._manualBookRead = p.knowsSpores = p.sporeKnown = p.knowsRecipe = true;
        return true;
      }
      const s = this.db && this.db.session;
      if (s && Array.isArray(s.players) && s.players.length > 1) {
        const mentor = s.players.find(pl => pl && pl.uid !== p.uid && !pl.dead && !pl.asInfected && !pl.isInfected && (pl._manualBookRead || pl._drankZhivchik || (Number(pl.missionsDone) || 0) > 0));
        if (mentor) {
          p._manualBookRead = p.knowsSpores = p.sporeKnown = p.knowsRecipe = true;
          return true;
        }
      }
      return false;
    },

    isRealSkillUnlocked(p) {
      if (!p) return false;
      if (p.asInfected || p.isInfected) return true;
      if (p._skillSuccessUsed || p.skillRevealed) {
        p._skillSuccessUsed = p.skillUnlocked = p.skillRevealed = true;
        return true;
      }
      return false;
    },

    normalizePlayerStats(p) {
      if (!p) return;
      this.bindHeroCompat(p);
      p.slots = Object.assign(this.defaultSlots(), p.slots || {});
      const isInf = Boolean((p.asInfected || p.isInfected || p.arch === 'infected') && !p.isKvaz);
      if (isInf && typeof this.stripForbiddenInfectedGear === 'function') this.stripForbiddenInfectedGear(p);

      const B = this.getContent().BALANCE || {};
      const endVal = Number(p.stats.end || 10);
      const strVal = Number(p.stats.str || 10);
      const spdVal = Number(p.stats.spd || 10);
      const spiVal = Number(p.stats.spi || 10);
      const isTatan = Boolean(p.arch === 'tatan' && !isInf && !p.isKvaz);
      const isKachok = Boolean(p.arch === 'kachok' && !isInf && !p.isKvaz);
      const isKvaz = Boolean(p.isKvaz);

      const baseHp = Number(B.baseHp || 14);
      const hpPerEnd = Number(B.hpPerEnd || 1.35);
      p.maxHp = Math.max(12, Math.round((baseHp + endVal * hpPerEnd) * (isKvaz ? 1.5 : 1)));
      if (!p._hpInit || typeof p.hp !== 'number' || p.hp > p.maxHp) { p.hp = p.maxHp; p._hpInit = true; }
      p.hp = Math.max(0, Math.min(p.maxHp, p.hp));

      p.maxMana = Math.max(15, Math.round((10 + spiVal * 2) * (isKvaz ? 0.5 : 1)));
      if (typeof p.mana !== 'number' || p.mana > p.maxMana) p.mana = p.maxMana;

      p.maxFood = (isTatan ? 240 : (isKvaz ? 150 : 50)) + Math.floor(endVal / 10) * (isTatan ? 2 : 1);
      p.maxWater = (isTatan ? 100 : 50) + Math.floor(endVal / 10) * (isTatan ? 2 : 1);
      p.maxStamina = 50 + Math.floor(endVal / 5);
      p.maxSpore = 50 + Math.floor(endVal / 10) + Math.floor(spiVal / 10);

      if (typeof p.food !== 'number' || p.food > p.maxFood) p.food = p.maxFood;
      if (typeof p.water !== 'number' || p.water > p.maxWater) p.water = p.maxWater;
      if (typeof p.stamina !== 'number' || p.stamina > p.maxStamina) p.stamina = p.maxStamina;
      if (typeof p.spore !== 'number') p.spore = p.maxSpore;
      p.spore = Math.max(0, Math.min(p.maxSpore, p.spore));

      const towPen = (p.towingCar ? (Number(p.towingCar.towPen) || 1) : 0) + (p.carryingCrown ? (Number(p.carryingCrown.towPen) || 1) : 0);
      const newMaxAp = Math.max(1, 6 + Math.floor(spdVal / 50) - towPen);
      const prevMaxAp = Number(p._trackedMaxAp || newMaxAp);
      p.maxAp = newMaxAp;
      if (newMaxAp > prevMaxAp && typeof p.stepsLeft === 'number') {
        p.stepsLeft = Math.min(newMaxAp, p.stepsLeft + (newMaxAp - prevMaxAp));
      }
      p._trackedMaxAp = newMaxAp;
      if (typeof p.stepsLeft !== 'number' || p.stepsLeft > p.maxAp) p.stepsLeft = p.maxAp;

      const carryMult = isKachok ? 3.0 : (isKvaz ? 2.0 : (isInf ? 1.5 : 1.0));
      const bagBonus = p.slots.bag ? (Number(p.slots.bag.bag || p.slots.bag.cap || 15) || 15) : 0;
      p.maxWeight = Math.round(((10 + strVal * 0.1) * carryMult + bagBonus) * 10) / 10;
      this.isRealSporeUnlocked(p);
      this.isRealSkillUnlocked(p);
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 2/8 — ЧАСТЬ 2Б)
// Вес/перегруз, опыт grantActionXp, уровни, рулетка Даров и перелив капа
// ============================================================================
    isWeightlessItem(it) {
      if (!it) return true;
      const nm = String(it.n || it.name || '').toLowerCase();
      return Boolean(
        it.isSporan || it.type === 'sporan' ||
        it.isPeas || nm.includes('горох') ||
        it.isWeb || nm.includes('паутин')
      );
    },

    getInvWeight(p) {
      if (!p) return 0;
      let cur = 0;
      (p.inv || Array.of()).forEach(it => {
        if (this.isWeightlessItem(it)) return;
        const w = Number(it.w !== undefined ? it.w : (it.weight !== undefined ? it.weight : 0)) || 0;
        const q = Number(it.q !== undefined ? it.q : (it.qty !== undefined ? it.qty : 1)) || 1;
        cur += w * q;
      });
      return Math.round(cur * 10) / 10;
    },

    getCarryInfo(p) {
      if (!p) return { cur: 0, max: 11, pct: 0, rawPct: 0, col: '#4caf50', mult: 1, blocked: false };
      const max = p.maxWeight || 11;
      const cur = this.getInvWeight(p);
      const rawPct = max > 0 ? Math.round((cur / max) * 100) : 0;
      let mult = 1, blocked = false;
      if (rawPct > 150) { blocked = true; mult = 999; }
      else if (rawPct > 100) mult = 1.5;
      else if (rawPct > 80) mult = 1.25;
      const col = rawPct > 100 ? '#e53935' : (rawPct > 80 ? '#ffb300' : '#4caf50');
      return { cur, max, pct: Math.min(100, rawPct), rawPct, col, mult, blocked };
    },

    grantActionXp(p, statKey, baseDelta) {
      if (!p || !statKey || !baseDelta) return 0;
      this.bindHeroCompat(p);
      const archKey = p.isKvaz ? 'kvaz' : ((p.asInfected || p.isInfected) ? 'infected' : (p.arch || 'kachok'));
      const multObj = (this.getArchMeta(archKey).mult) || {};
      let m = Number(multObj[statKey]) || 1;
      if (p.keepInfectedMult && !p.isInfected && !p.asInfected) {
        const infMult = Number((this.getArchMeta('infected').mult || {})[statKey]) || 1;
        if (infMult > m) m = infMult;
      }
      if (p.isKvaz && Array.of('str', 'end', 'agi').includes(statKey)) m += 0.5;
      if (archKey === 'kachok' && (p.lvl || 0) >= 15 && (statKey === 'str' || statKey === 'end')) m = 4;
      if (archKey === 'kachok' && (p.lvl || 0) >= 15 && statKey === 'int' && m < 1) m = 1;
      if (archKey === 'tatan' && (p.lvl || 0) >= 15 && (statKey === 'agi' || statKey === 'spd') && m < 1) m = 1;
      if (archKey === 'asiat' && (p.lvl || 0) >= 15 && (statKey === 'int' || statKey === 'spi') && m < 1) m = 1;

      const delta = this._round100(baseDelta * m);
      if (delta <= 0) return 0;
      p.stats[statKey] = this._round100((Number(p.stats[statKey]) || 10) + delta);
      const sNames = { str: 'Сила', agi: 'Ловкость', spd: 'Скорость', end: 'Выносливость', int: 'Интеллект', spi: 'Дух' };
      this.log(`📈 ${p.name}: ${sNames[statKey] || statKey} +${delta}`);
      this.recalcLevel(p);
      this.normalizePlayerStats(p);
      return delta;
    },

    recalcLevel(p) {
      if (!p || !p.stats) return false;
      let sum = 0;
      Array.of('str', 'agi', 'spd', 'end', 'int', 'spi').forEach(k => { sum += Number(p.stats[k]) || 0; });
      sum = this._round100(sum);
      let newLvl = 0;
      for (let i = 1; i < this.LVL_TABLE.length; i++) {
        if (sum >= this.LVL_TABLE.at(i)) newLvl = i;
        else break;
      }
      const maxTbl = this.LVL_TABLE.at(this.LVL_TABLE.length - 1);
      if (sum > maxTbl) {
        let curT = maxTbl, l = this.LVL_TABLE.length - 1;
        while (sum >= Math.round(curT * 1.1)) { curT = Math.round(curT * 1.1); l++; }
        newLvl = l;
      }
      const oldLvl = p.lvl || 0;
      if (newLvl > oldLvl) {
        p.lvl = newLvl;
        if (newLvl >= 15 && !p.darUnlocked) {
          p.darUnlocked = true;
          const aInfo = this.getArchMeta(p.arch);
          this.log('🌟 ' + p.name + ' достиг 15 ур. и раскрыл талант: ' + (aInfo.dar15 || 'Пробуждение') + '!');
        }
        this.log('⬆️ Уровень повышен! ' + p.name + ' теперь Ур.' + newLvl + ' (сумма статов: ' + sum + ').');
        this.speakPhrase(p, 'Получен уровень.');
      }
      this.checkThresholdAwakening(p);
      return newLvl > oldLvl;
    },

    calcAnchorMana(hero, pct) {
      if (!pct || pct <= 0) return 0;
      const maxM = (hero && hero.maxMana) ? Number(hero.maxMana) : 20;
      return Math.max(1, Math.round(maxM * (pct / 100)));
    },

    _pickWeightedRootGift(hero) {
      const db = this.getDarsMap();
      const owned = (hero && hero.gifts) ? hero.gifts : {};
      const isInfOnly = Boolean(hero && (hero.isInfected || hero.asInfected) && !hero.isKvaz);
      const pool = Object.keys(db).map(k => Object.assign({ id: k }, db[k])).filter(g => {
        if (!g || owned[g.id]) return false;
        if (isInfOnly) return g.pool === 'infected';
        if (hero && hero.isKvaz) return true;
        return g.pool === 'human';
      });
      if (!pool.length) return null;
      const archKey = hero ? (hero.origArch || hero.arch) : null;
      const favId = archKey ? this.getArchMeta(archKey).affinity : null;
      let totalW = 0;
      const weighted = pool.map(g => {
        const w = (g.id === favId) ? 1.6 : 1.0;
        totalW += w;
        return { g, w };
      });
      let r = Math.random() * totalW;
      for (let i = 0; i < weighted.length; i++) {
        r -= weighted.at(i).w;
        if (r <= 0) return weighted.at(i).g;
      }
      return weighted.at(weighted.length - 1).g;
    },

    updateEvolutionStages(hero) {
      if (!hero || !hero.gifts) return;
      const db = this.getDarsMap();
      Object.keys(hero.gifts).forEach(gid => {
        const gSt = hero.gifts[gid], meta = db[gid];
        if (!gSt || !meta || !Array.isArray(meta.branches)) return;
        const gLvl = Number(gSt.lvl || 1);
        gSt.branches = gSt.branches || {};
        meta.branches.forEach(br => {
          const req = Number(br.unlockLvl || 10);
          if (gLvl >= req && !gSt.branches[br.id]) {
            gSt.branches[br.id] = { lvl: 1, level: 1, manaAnchor: this.calcAnchorMana(hero, br.mana1 || 0) };
            this.log(`🌿 Пробудилась ветвь Дара «${meta.name}»: <b>${br.name}</b>!`);
          }
        });
      });
    },

    handleGiftCapOverflow(hero, extraPts) {
      if (!hero) return;
      const add = Math.max(1, Number(extraPts) || 1);
      const opened = this._pickWeightedRootGift(hero);
      if (opened) {
        hero.gifts = hero.gifts || {};
        hero.gifts[opened.id] = { lvl: add, level: add, manaAnchor: this.calcAnchorMana(hero, opened.mana1 || 0), branches: {} };
        this.updateEvolutionStages(hero);
        this.log(`🧬 Кап Дара достигнут! Перелив пробудил новый Дар: <b>${opened.name}</b> (Ур.${add})!`);
      } else {
        hero.stats.spi = this._round100((hero.stats.spi || 10) + add * 2);
        this.log(`✨ Все Дары на максимуме! Избыток силы повысил Дух на +${add * 2}.`);
      }
    },

    rollHiveRoulette(hero, sourceTag, baseChancePct) {
      if (!hero) return false;
      const chance = Math.max(0, Math.min(100, Number(baseChancePct) || 5));
      if (Math.random() * 100 >= chance) return false;
      hero.gifts = hero.gifts || {};
      const db = this.getDarsMap();
      const ownedIds = Object.keys(hero.gifts).filter(id => db[id]);
      if (ownedIds.length > 0 && Math.random() < 0.65) {
        const up = this._boostRandomOpenedGift(hero, 1);
        if (up && !up.overflow) this.log(`🧬 Рулетка Улья (${sourceTag}): Дар «${up.name}» усилен до Ур.${up.lvl}!`);
      } else {
        const nw = this._pickWeightedRootGift(hero);
        if (nw) {
          hero.gifts[nw.id] = { lvl: 1, level: 1, manaAnchor: this.calcAnchorMana(hero, nw.mana1 || 0), branches: {} };
          this.log(`🧬 Рулетка Улья (${sourceTag}): пробуждён новый Дар <b>«${nw.name}»</b> (Ур.1)!`);
        } else if (ownedIds.length > 0) {
          this._boostRandomOpenedGift(hero, 1);
        }
      }
      this.updateEvolutionStages(hero);
      return true;
    },

    checkThresholdAwakening(hero) {
      if (!hero) return;
      const lvl = Number(hero.lvl || 0);
      const marks = Array.of(20, 21, 31, 37, 41, 50, 61);
      if (!marks.includes(lvl)) return;
      hero._awakenedMarks = hero._awakenedMarks || {};
      if (hero._awakenedMarks[lvl]) return;
      hero._awakenedMarks[lvl] = true;
      this.rollHiveRoulette(hero, `ранг ${lvl}`, 100);
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 3/8 — ЧАСТЬ 3А)
// Фамилии, создание бойца, отряд (1 от фамилии), пауза рейда и вход в город
// ============================================================================
    findHeroByUid(uid) {
      if (!uid || !this.db || !this.db.families) return null;
      const fams = Object.keys(this.db.families);
      for (let i = 0; i < fams.length; i++) {
        const found = (this.db.families[fams.at(i)] || Array.of()).find(h => h && h.uid === uid);
        if (found) return found;
      }
      return null;
    },

    isVeteran(hr) {
      if (!hr) return false;
      return (Number(hr.missionsDone) || 0) > 0 || (Number(hr.lvl) || 0) > 0;
    },

    getHeroRoleTitle(hr) {
      if (!hr) return 'Выживший';
      if (hr.status === 'dead') return 'Погиб';
      const fem = this.isFem(hr);
      const pref = hr.isLegendary ? (fem ? 'Легендарная ' : 'Легендарный ') : '';
      if (hr.isKvaz) return pref + 'Кваз';
      if (hr.asInfected || hr.isInfected || hr.arch === 'infected') {
        return pref + (fem ? 'Особая заражённая' : 'Особый заражённый');
      }
      if ((hr.lvl || 0) >= 2) return pref + this.getArchMeta(hr.arch).name;
      return pref ? (pref + (fem ? 'Выжившая' : 'Выживший')) : (fem ? 'Жен.' : 'Муж.');
    },

    addFamily() {
      const el = document.getElementById('new-fam');
      const val = el ? el.value.trim() : '';
      if (!val) return;
      if (!this.db.families[val]) this.db.families[val] = Array.of();
      this.activeFamily = val;
      if (el) el.value = '';
      this.saveDB();
      this.renderLobby();
    },

    selectFamily(f) {
      this.activeFamily = f;
      this.renderLobby();
    },

    addHero() {
      if (!this.activeFamily) return;
      const inp = document.getElementById('hero-name');
      const sexEl = document.getElementById('hero-sex');
      const name = inp ? inp.value.trim() : '';
      if (!name) { this.log('Введите имя персонажа.'); return; }
      const sex = sexEl ? sexEl.value : 'm';
      const humanPool = Array.of('surgeon', 'asiat', 'schoolgirl', 'nanny', 'alkash', 'cashier', 'gigolo', 'tatan', 'prof', 'psih', 'strip', 'vet', 'kachok')
        .filter(k => { const a = this.getArchMeta(k); return a.sex === 'both' || a.sex === sex; });
      const chosen = humanPool.at(Math.floor(Math.random() * humanPool.length)) || (sex === 'f' ? 'tatan' : 'kachok');
      const baseSt = Object.assign({ str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 }, this.getArchMeta(chosen).stats || {});
      const hero = {
        uid: 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        family: this.activeFamily, name, sex, arch: chosen, origArch: chosen,
        lvl: 0, status: 'ready', isInfected: false, asInfected: false, isKvaz: false,
        stats: baseSt, skillUnlocked: false, darUnlocked: false,
        knowsSpores: false, sporeKnown: false, knowsRecipe: false, missionsDone: 0,
        spores: 0, sporans: 0, inv: Array.of(), stash: Array.of(), slots: this.defaultSlots(), gifts: {}
      };
      this.normalizePlayerStats(hero);
      this.db.families[this.activeFamily].push(hero);
      if (inp) inp.value = '';
      this.saveDB();
      this.log(`Создан персонаж: ${this.activeFamily} ${name} (${sex === 'f' ? 'Жен.' : 'Муж.'}).`);
      this.renderLobby();
    },

    resetDeadHero(fam, idx) {
      const hr = this.db && this.db.families && this.db.families[fam] && this.db.families[fam].at(idx);
      if (!hr) return;
      const targetArch = (hr.origArch && hr.origArch !== 'infected') ? hr.origArch : (hr.sex === 'f' ? 'tatan' : 'kachok');
      const baseStats = Object.assign({ str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 }, this.getArchMeta(targetArch).stats || {});
      Object.assign(hr, {
        arch: targetArch, origArch: targetArch, isInfected: false, asInfected: false, isKvaz: false,
        status: 'ready', lvl: 0, skillUnlocked: false, darUnlocked: false, stats: baseStats,
        inv: Array.of(), slots: this.defaultSlots(), gifts: {}, _hpInit: false
      });
      this.normalizePlayerStats(hr);
      this.squad = (this.squad || Array.of()).filter(s => s.uid !== hr.uid);
      this.saveDB();
      this.log(`🔄 Персонаж ${hr.name} обнулён до 0 ур.`);
      this.renderLobby();
    },

    delHero(fam, idx) {
      if (!confirm('Точно удалить персонажа навсегда?')) return;
      const h = this.db.families[fam].at(idx);
      if (h) this.squad = this.squad.filter(s => s.uid !== h.uid);
      this.db.families[fam].splice(idx, 1);
      this.saveDB();
      this.renderLobby();
    },

    toggleSquad(fam, idx, forceInfected) {
      const h = this.db && this.db.families && this.db.families[fam] && this.db.families[fam].at(idx);
      if (!h || this.squad.some(s => s.uid === h.uid)) return;
      if (this.squad.some(s => String(s.family || '').trim().toLowerCase() === String(fam || '').trim().toLowerCase())) {
        this.log('🚫 Правило Фамилий: в рейд может выйти только 1 персонаж от одной фамилии!');
        return;
      }
      const asInf = Boolean(forceInfected) || h.status === 'dead' || Boolean(h.isInfected);
      const copy = JSON.parse(JSON.stringify(h));
      copy.asInfected = copy.isInfected = asInf;
      copy.arch = asInf ? 'infected' : ((copy.arch === 'infected' && copy.origArch) ? copy.origArch : copy.arch);
      this.squad.push(copy);
      this.log(asInf ? `☣️ В отряд добавлен Особый заражённый: ${h.name}` : `➕ В отряд добавлен: ${h.name}`);
      this.renderLobby();
    },

    removeSquad(i) {
      this.squad.splice(i, 1);
      this.renderLobby();
    },

    pauseToLobby() {
      const s = this.db && this.db.session;
      if (s && Array.isArray(s.players)) s.players.forEach(pl => this.syncHeroProfile(pl));
      this.profileOpen = this.invOpen = false;
      this.lobbyPaused = true;
      if (this.ambientAudio) this.ambientAudio.stop();
      this.saveDB();
      this.log('🏕 Рейд поставлен на паузу.');
      this.renderLobby();
    },

    resumeRaid() {
      this.lobbyPaused = false;
      if (this.db && this.db.session) this.renderGame();
    },

    finishPausedRaid() {
      const s = this.db && this.db.session;
      if (!s) return;
      const snaps = Array.isArray(s.raidSnapshot) ? s.raidSnapshot : Array.of();
      (s.players || Array.of()).forEach(pl => {
        const target = this.findHeroByUid(pl.uid);
        const orig = snaps.find(sn => sn.uid === pl.uid);
        if (target) {
          if (orig) Object.assign(target, { lvl: orig.lvl || 0, stats: orig.stats || {}, inv: orig.inv || Array.of(), slots: orig.slots || this.defaultSlots(), spores: orig.spores || 0, sporans: orig.spores || 0, status: orig.dead ? 'dead' : 'ready' });
          else target.status = pl.dead ? 'dead' : 'ready';
        }
      });
      this.db.session = null; this.lobbyPaused = false; this.squad = Array.of();
      this.saveDB();
      this.renderLobby();
    },

    goToCity() {
      this.stopIntro();
      if (this.db && this.db.session && Array.isArray(this.db.session.players) && this.db.session.players.length) {
        this.lobbyPaused = false; this.saveDB(); this.renderGame(); return;
      }
      if (Array.isArray(this.squad) && this.squad.length > 0) { this.launchMap('start'); return; }
      if (this.activeFamily && Array.isArray(this.db.families[this.activeFamily])) {
        const idx = this.db.families[this.activeFamily].findIndex(h => h && h.status !== 'dead');
        if (idx !== -1) { this.toggleSquad(this.activeFamily, idx, false); this.launchMap('start'); return; }
      }
      this.log('🏙️ Сначала создайте персонажа или добавьте бойца в отряд!');
      this.renderLobby();
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 3/8 — ЧАСТЬ 3Б-1)
// Отрисовка Лобби renderLobby
// ============================================================================
    renderLobby() {
      this.ensureStaticLabels();
      this.sanitizeRoster();
      const vp = document.getElementById('game-viewport');
      if (!vp) return;

      const fams = Object.keys(this.db.families || {});
      let h = '<div style="display:flex;flex-direction:column;gap:10px;">';

      if (this.db.session && Array.isArray(this.db.session.players) && this.db.session.players.length) {
        const sqNames = this.db.session.players.map(pl => `${pl.family} ${pl.name}`).join(', ');
        h += '<div style="border:1px solid #4a7a5c;padding:8px;background:#131f18;">' +
          `<div style="font-size:12px;color:#98d4ae;font-weight:bold;margin-bottom:4px;">⏸ АКТИВНЫЙ РЕЙД НА ПАУЗЕ (Ход: ${this.db.session.turn || 1})</div>` +
          `<div style="font-size:11px;color:#c8d6cc;margin-bottom:6px;">Отряд: ${sqNames}</div>` +
          '<div style="display:flex;gap:6px;"><button class="btn btn-primary" style="flex:1;" onclick="STIKS.resumeRaid()">▶ Продолжить</button>' +
          '<button class="btn btn-danger" style="width:auto;padding:6px 10px;" onclick="STIKS.finishPausedRaid()">🏁 Завершить</button></div></div>';
      }

      h += '<div style="border:1px solid #6e2626;padding:8px;background:#111613;">' +
        '<div style="font-size:12px;color:#d68a8a;margin-bottom:6px;font-weight:bold;">1. ФАМИЛИЯ (АККАУНТ ВЫЖИВШИХ)</div>' +
        '<div style="display:flex;gap:6px;"><input id="new-fam" placeholder="Введите фамилию..." style="flex:1;background:#0b0d0c;color:#c8d6cc;border:1px solid #6e2626;padding:6px;font-size:12px;">' +
        '<button class="btn btn-primary" style="width:auto;" onclick="STIKS.addFamily()">+ Фамилия</button></div>';
      if (fams.length) {
        h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">';
        fams.forEach(f => {
          const fEsc = f.replace(/'/g, "\\'");
          h += `<button class="btn ${this.activeFamily === f ? 'btn-primary' : ''}" style="width:auto;font-size:11px;padding:4px 8px;" onclick="STIKS.selectFamily('${fEsc}')">${f}</button>`;
        });
        h += '</div>';
      }
      h += '</div>';

      if (this.activeFamily) {
        h += '<div style="border:1px solid #6e2626;padding:8px;background:#111613;">' +
          `<div style="font-size:12px;color:#d68a8a;margin-bottom:6px;font-weight:bold;">2. ПЕРСОНАЖ (${this.activeFamily})</div>` +
          '<input id="hero-name" placeholder="Имя персонажа..." style="width:100%;box-sizing:border-box;background:#0b0d0c;color:#c8d6cc;border:1px solid #6e2626;padding:6px;font-size:12px;margin-bottom:6px;">' +
          '<div style="display:flex;gap:6px;"><select id="hero-sex" style="flex:1;background:#0b0d0c;color:#c8d6cc;border:1px solid #6e2626;padding:6px;"><option value="m">Пол: Мужской</option><option value="f">Пол: Женский</option></select>' +
          '<button class="btn btn-primary" style="width:auto;" onclick="STIKS.addHero()">Создать</button></div>';

        const list = this.db.families[this.activeFamily] || Array.of();
        if (list.length) {
          const famEsc = this.activeFamily.replace(/'/g, "\\'");
          h += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">';
          list.forEach((hr, idx) => {
            this._cleanSporans(hr);
            const inSq = this.squad.some(s => s.uid === hr.uid), isDead = hr.status === 'dead';
            const isInf = Boolean((hr.isInfected || hr.asInfected || hr.arch === 'infected') && !hr.isKvaz);
            const vet = this.isVeteran(hr);
            h += `<div style="display:flex;justify-content:space-between;align-items:center;background:#0b0d0c;border:1px solid #3d1c1c;padding:5px 6px;font-size:11px;gap:4px;"><div><b>${hr.name}</b> (${this.getHeroRoleTitle(hr)}) Ур.${hr.lvl || 0} | 💎${hr.spores}</div><div style="display:flex;gap:4px;flex-wrap:wrap;">`;
            if (!isDead && vet) {
              if (hr.inFarSettlement) h += `<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#a855f7;color:#e9d5ff;" onclick="STIKS.openFarSettlement('${hr.uid}')">🌌</button>`;
              if (hr.inFarNest) h += `<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#a855f7;color:#e9d5ff;" onclick="STIKS.openFarNest('${hr.uid}')">🌑</button>`;
              h += isInf
                ? `<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#a855f7;color:#e9d5ff;" onclick="STIKS.openNest('${famEsc}',${idx})">🕳️</button>`
                : `<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#6ea882;color:#98e6b3;" onclick="STIKS.openSettlement('${famEsc}',${idx})">🏘️</button>`;
              h += `<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#c9a84c;color:#e6c86e;" onclick="STIKS.openShop('${famEsc}',${idx})">🏪</button>`;
            }
            if (!inSq && hr.status === 'ready') h += `<button class="btn btn-primary" style="width:auto;padding:3px 6px;font-size:10px;" onclick="STIKS.toggleSquad('${famEsc}',${idx},false)">В отряд</button>`;
            if (!inSq && isDead) {
              h += `<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;color:#ff9e9e;" onclick="STIKS.toggleSquad('${famEsc}',${idx},true)">☣️ Зараж.</button>`;
              h += `<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;color:#98d4ae;" onclick="STIKS.resetDeadHero('${famEsc}',${idx})">🔄</button>`;
            }
            h += `<button class="btn btn-danger" style="width:auto;padding:3px 6px;font-size:10px;" onclick="STIKS.delHero('${famEsc}',${idx})">✖</button></div></div>`;
          });
          h += '</div>';
        }
        h += '</div>';
      }

      h += '<div style="border:1px solid #6e2626;padding:8px;background:#111613;">' +
        `<div style="font-size:12px;color:#d68a8a;margin-bottom:6px;font-weight:bold;">3. ОТРЯД В РЕЙД (${this.squad.length}/5)</div>`;
      if (this.squad.length) {
        this.squad.forEach((sq, i) => {
          h += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:3px 0;"><span>${sq.family} ${sq.name}${sq.asInfected ? ' [☣️]' : ''}</span><button class="btn btn-danger" style="width:auto;padding:2px 6px;font-size:10px;" onclick="STIKS.removeSquad(${i})">Убрать</button></div>`;
        });
        const hasJunk = this.squad.some(s => (this.findHeroByUid(s.uid) || s).junkyardUnlocked);
        const hasCem = this.squad.some(s => (this.findHeroByUid(s.uid) || s).cemeteryUnlocked);
        const carOw = this.squad.map(s => this.findHeroByUid(s.uid) || s).find(r => r && r.hasCar && r.hasCarKey && r.car && (r.car.fuel || 0) >= Math.ceil((r.car.maxFuel || 100) * 0.5));
        const packOw = this.squad.map(s => this.findHeroByUid(s.uid) || s).find(r => r && r.hasPack && r.pack && (r.pack.fuel || 0) >= Math.ceil((r.pack.maxFuel || 100) * 0.5));
        h += '<div style="display:flex;gap:5px;margin-top:8px;flex-wrap:wrap;"><button class="btn btn-primary" style="flex:1;" onclick="STIKS.launchMap(\'start\')">▶ Старт (60x60)</button>';
        if (carOw) {
          h += `<button class="btn" style="flex:1;border-color:#38bdf8;color:#bae6fd;font-weight:bold;" onclick="STIKS.launchCarRaid('start','${carOw.uid}')">${carOw.car.ico || '🚙'} Авто (-50%)</button>`;
          if ((carOw.car.fuel || 0) >= (carOw.car.maxFuel || 100)) h += `<button class="btn btn-danger" style="flex:1;" onclick="STIKS.launchFarCarRaid('${carOw.uid}')">🛣️ Дальний (-100%)</button>`;
        }
        if (packOw) {
          h += `<button class="btn" style="flex:1;border-color:#c084fc;color:#f3e8ff;font-weight:bold;" onclick="STIKS.launchPackRaid('start','${packOw.uid}')">🐾 Со стаей (-50%)</button>`;
          if ((packOw.pack.fuel || 0) >= (packOw.pack.maxFuel || 100)) h += `<button class="btn btn-danger" style="flex:1;" onclick="STIKS.launchFarPackRaid('${packOw.uid}')">🌑 Дальн. Гнездо</button>`;
        }
        if (hasJunk) h += '<button class="btn" style="flex:1;border-color:#f59e0b;color:#fde047;" onclick="STIKS.launchMap(\'junkyard\')">🚗 Автосвалка</button>';
        if (hasCem) h += '<button class="btn" style="flex:1;border-color:#c084fc;color:#f3e8ff;" onclick="STIKS.launchMap(\'cemetery\')">🪦 Кладбище</button>';
        h += '<button class="btn btn-danger" style="flex:1;" onclick="STIKS.launchMap(\'hell\')">🔥 Пекло (30+)</button></div>';
      } else {
        h += '<div style="font-size:11px;color:#8a7272;">Добавьте бойцов (макс. 1 от фамилии, до 5 в отряд).</div>';
      }
      vp.innerHTML = h + '</div></div>';
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 3/8 — ЧАСТЬ 3Б-2)
// Пролог новичка (3 кадра) и футер авторов с двумя векторными портретами
// ============================================================================
    stopIntro() {
      if (Array.isArray(this._introTimers)) this._introTimers.forEach(t => clearTimeout(t));
      this._introTimers = Array.of();
      if ('speechSynthesis' in global) try { global.speechSynthesis.cancel(); } catch (e) {}
      const ov = document.getElementById('stiks-intro-overlay');
      if (ov) ov.remove();
      if (this.db && this.db.session && !this.lobbyPaused) this.renderGame();
    },

    showIntro(p) {
      this.stopIntro();
      const rawText = `${p.name || 'Выживший'} очнулся на холодном полу под вой сирены СТИКСа. В запертом номере пахло пылью и озоном. Толкнув дверь, он шагнул на пустую улицу мёртвого города.`;
      const frames = Array.of('img/intro1.jpg', 'img/intro2.JPG', 'img/intro3.jpg');
      const ov = document.createElement('div');
      ov.id = 'stiks-intro-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:#080a09;z-index:9999;display:flex;flex-direction:column;justify-content:space-between;font-family:monospace;color:#d6e5db;';
      ov.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#0b0d0c;border-bottom:1px solid #6e2626;">` +
        `<span id="stiks-intro-step" style="color:#d48a8a;">ПРОЛОГ 1/3</span>` +
        `<button class="btn btn-primary" style="width:auto;padding:6px 12px;" onclick="STIKS.stopIntro()">В город ▶</button></div>` +
        `<div id="stiks-intro-bg" style="flex:1;background:url('${frames.at(0)}') center/contain no-repeat;"></div>` +
        `<div style="padding:12px 14px 36px 14px;background:#080a09;border-top:1px solid #4a1c1c;text-align:center;font-size:13px;">${rawText}</div>`;
      document.body.appendChild(ov);
      this._introTimers = Array.of(1, 2).map(idx => setTimeout(() => {
        const bg = document.getElementById('stiks-intro-bg'), st = document.getElementById('stiks-intro-step');
        if (bg) bg.style.backgroundImage = `url('${frames.at(idx)}')`;
        if (st) st.innerText = `ПРОЛОГ ${idx + 1}/3`;
      }, 6000 * idx));
      this.speakPhrase(p, rawText);
    },

    renderAuthorsFooter() {
      const s1 = '<svg viewBox="0 0 360 440" width="52" height="64" style="border:1px solid #6e2626;border-radius:6px;background:#140e0e;">' +
        '<rect width="360" height="440" fill="#111613"/><path d="M70 440 C75 330, 285 330, 290 440 Z" fill="#121417" stroke="#2d3748" stroke-width="4"/>' +
        '<rect x="152" y="265" width="56" height="65" rx="16" fill="#e5b89b"/><ellipse cx="180" cy="195" rx="74" ry="92" fill="#f1c6ab"/>' +
        '<path d="M106 175 C106 95, 254 95, 254 175 C242 135, 118 135, 106 175 Z" fill="#d6b46c"/>' +
        '<rect x="116" y="172" width="54" height="32" rx="8" fill="#0f172a" stroke="#64748b" stroke-width="4"/>' +
        '<rect x="190" y="172" width="54" height="32" rx="8" fill="#0f172a" stroke="#64748b" stroke-width="4"/>' +
        '<line x1="170" y1="184" x2="190" y2="184" stroke="#94a3b8" stroke-width="3"/>' +
        '<path d="M158 244 Q180 256 202 244" fill="none" stroke="#8c5843" stroke-width="4"/></svg>';
      const s2 = '<svg viewBox="0 0 360 440" width="52" height="64" style="border:1px solid #6e2626;border-radius:6px;background:#140e0e;">' +
        '<rect width="360" height="440" fill="#111613"/><path d="M68 440 C75 318, 285 318, 292 440 Z" fill="#f1f5f9" stroke="#94a3b8" stroke-width="4"/>' +
        '<ellipse cx="180" cy="195" rx="68" ry="86" fill="#f5d0ba"/><path d="M110 185 C108 102, 252 102, 250 185 C235 130, 125 130, 110 185 Z" fill="#5c3a21"/>' +
        '<circle cx="154" cy="190" r="6" fill="#3b2f2f"/><circle cx="206" cy="190" r="6" fill="#3b2f2f"/>' +
        '<path d="M164 238 Q173 232 180 237 Q187 232 196 238 Q180 250 164 238 Z" fill="#d97777"/></svg>';
      return `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #6e2626;text-align:center;font-size:11px;color:#d68a8a;">` +
        `<div style="display:flex;justify-content:center;gap:12px;margin-bottom:5px;">${s1}${s2}</div>` +
        `<div>Авторы проекта — семейство эльфов</div>` +
        `<div style="font-size:10px;color:#b87474;">по мотивам произведений Артема Каменистого</div></div>`;
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 4/8 — ЧАСТЬ 4А)
// Валидация карты 60x60, стартовые наборы и генерация всех 9 локаций
// ============================================================================
    validateMap60(g) {
      let dead = 0;
      const dirs = Array.of(Array.of(0, -1), Array.of(1, 0), Array.of(-1, 0), Array.of(0, 1));
      for (let y = 0; y < 60; y++) {
        for (let x = 0; x < 60; x++) {
          if (g.at(y).at(x).blocked) continue;
          let w = 0;
          for (let i = 0; i < 4; i++) {
            const nx = x + dirs.at(i).at(0), ny = y + dirs.at(i).at(1);
            if (nx < 0 || nx > 59 || ny < 0 || ny > 59 || g.at(ny).at(nx).blocked) w++;
          }
          if (w === 4) return false;
          if (w === 3) dead++;
          if (dead > 1) return false;
        }
      }
      return true;
    },

    applyNewbieStarter(p, diffKey) {
      if (!p || p._starterApplied || (p.lvl || 0) !== 0 || diffKey !== 'start') return;
      p._starterApplied = true;
      this.normalizePlayerStats(p);
      p.slots = Object.assign(this.defaultSlots(), p.slots || {});
      p.inv = Array.isArray(p.inv) ? p.inv : Array.of();
      if (p.asInfected || p.isInfected) {
        p.inv.push({ n: 'Походная аптечка', cat: 'med', rank: 1, w: 0.4, q: 2, heal: 25 });
        p.inv.push({ n: 'Сухпаёк Улья', cat: 'food', rank: 1, w: 0.5, q: 2, food: 35 });
        this.log('☣️ Стартовый набор Заражённого (0 ур.): 2 аптечки и 2 сухпайка Улья.');
      } else {
        const fem = this.isFem(p);
        const wItem = { n: 'Обломок арматуры', cat: 'weapon', slot: 'melee', rank: 1, dmg: 4, w: 1.1, q: 1 };
        const aItem = fem
          ? { n: 'Рваный леопардовый халат', cat: 'armor', slot: 'clothes', rank: 1, def: 2, w: 0.6, q: 1 }
          : { n: 'Грязный рваный пуховик', cat: 'armor', slot: 'clothes', rank: 1, def: 3, w: 1.4, q: 1 };
        if (!p.slots.melee) p.slots.melee = wItem; else p.inv.push(wItem);
        if (!p.slots.clothes) p.slots.clothes = aItem; else p.inv.push(aItem);
        p.inv.push({ id: 'starter_medkit_0', n: 'Базовая аптечка', cat: 'med', type: 'med', heal: 30, w: 0.3, q: 1, rank: 1 });
        this.log(`🎁 Набор новичка (0 ур.): [${wItem.n}], [${aItem.n}] и [Базовая аптечка].`);
      }
    },

    launchMap(dKey = 'start') {
      if (!this.squad || !this.squad.length) return;
      if (dKey === 'hell' && !this.squad.some(s => (s.lvl || 0) >= 30)) {
        this.log('🔥 Режим «Пекло» доступен только отрядам с бойцом от 30 уровня!');
        return;
      }

      const modMap = { start: -2, easy: -1, norm: 0, hard: 1, hell: 2, junkyard: 0, cemetery: 0, far1: 1, far2: 2 };
      const baseMod = modMap[dKey] !== undefined ? modMap[dKey] : 0;
      const barriers = Array.of('Скала', 'Водоем', 'Руины', 'Обрыв', 'Пожар');
      const g = Array.of();
      for (let y = 0; y < 60; y++) {
        const r = Array.of();
        for (let x = 0; x < 60; x++) {
          r.push({ x, y, blocked: false, bType: null, lootType: null, domCal: null, valuable: false, exhaust: -(Math.floor(Math.random() * 3) + 1) });
        }
        g.push(r);
      }

      let bC = 0, att = 0;
      while (bC < 420 && att < 12000) {
        att++;
        const x = Math.floor(Math.random() * 58) + 1, y = Math.floor(Math.random() * 58) + 1;
        if (g.at(y).at(x).blocked) continue;
        g.at(y).at(x).blocked = true;
        g.at(y).at(x).bType = barriers.at(Math.floor(Math.random() * barriers.length));
        if (!this.validateMap60(g)) { g.at(y).at(x).blocked = false; g.at(y).at(x).bType = null; } else bC++;
      }

      const isQuestLoc = (dKey === 'junkyard' || dKey === 'cemetery');
      const maxLoot = isQuestLoc ? 15 : 55;
      const cals = Array.of('12g', '12g', '545', '762', '9mm');
      let lC = 0, lA = 0;
      while (lC < maxLoot && lA < 4000) {
        lA++;
        const x = Math.floor(Math.random() * 60), y = Math.floor(Math.random() * 60);
        if (g.at(y).at(x).blocked || g.at(y).at(x).lootType) continue;
        g.at(y).at(x).lootType = lC < Math.ceil(maxLoot * 0.25) ? 'weapon' : (lC < Math.ceil(maxLoot * 0.5) ? 'armor' : 'supply');
        g.at(y).at(x).domCal = cals.at(Math.floor(Math.random() * cals.length));
        g.at(y).at(x).valuable = (lC % 3 === 0);
        g.at(y).at(x).exhaust = 0;
        lC++;
      }

      if (isQuestLoc) {
        let spots = 0, sTries = 0;
        while (spots < 4 && sTries < 2000) {
          sTries++;
          const cx = Math.floor(Math.random() * 44) + 8, cy = Math.floor(Math.random() * 44) + 8;
          const cell = g.at(cy).at(cx);
          if (cell.blocked || cell.carCache || cell.cryptCache) continue;
          if (dKey === 'junkyard') cell.carCache = true; else cell.cryptCache = true;
          cell.lootType = 'supply'; cell.valuable = true; cell.exhaust = 0;
          spots++;
        }
      }

      if (dKey === 'hell') {
        const firstHell = !localStorage.getItem('stiks_azamat_hell_seen');
        if (firstHell || Math.random() < 0.5) {
          localStorage.setItem('stiks_azamat_hell_seen', '1');
          for (let r = 0; r <= 3; r++) {
            let placed = false;
            for (let dy = -r; dy <= r && !placed; dy++) {
              for (let dx = -r; dx <= r && !placed; dx++) {
                const cell = g.at(30 + dy) && g.at(30 + dy).at(30 + dx);
                if (cell && !cell.blocked) {
                  cell.isAzamatEaster = true; cell.lootType = 'azamat'; cell.valuable = true; cell.exhaust = 0; placed = true;
                }
              }
            }
            if (placed) break;
          }
        }
      }

      const hasNovice = this.squad.some(pl => (Number(pl.lvl) || 0) === 0 && (Number(pl.missionsDone) || 0) === 0);
      const finalDiffMod = (!hasNovice && dKey === 'start') ? -1 : baseMod;

      const pls = this.squad.map(sqItem => {
        const p = JSON.parse(JSON.stringify(sqItem));
        this.pullProfileToPlayer(p);
        const isNovice = (Number(p.lvl) || 0) === 0 && (Number(p.missionsDone) || 0) === 0;
        let px = 30, py = 30, tries = 0;
        do {
          tries++;
          if (isNovice) {
            px = Math.floor(Math.random() * 20) + 20;
            py = Math.floor(Math.random() * 20) + 20;
          } else {
            const side = Math.floor(Math.random() * 4);
            if (side === 0) { px = Math.floor(Math.random() * 3); py = Math.floor(Math.random() * 60); }
            else if (side === 1) { px = 57 + Math.floor(Math.random() * 3); py = Math.floor(Math.random() * 60); }
            else if (side === 2) { px = Math.floor(Math.random() * 60); py = Math.floor(Math.random() * 3); }
            else { px = Math.floor(Math.random() * 60); py = 57 + Math.floor(Math.random() * 3); }
          }
        } while (g.at(py).at(px).blocked && tries < 300);

        Object.assign(p, { x: px, y: py, status: 'in_raid', moveMode: 'careful', movedThisTurn: false, escaped: false, dead: false, stinkTurns: 0, _raidStartLvl: Number(p.lvl) || 0, _raidKills: 0 });
        this.normalizePlayerStats(p);
        p.stepsLeft = p.maxAp; p.hp = p.maxHp;
        if (isNovice && dKey === 'start') this.applyNewbieStarter(p, dKey);
        return p;
      });

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 4/8 — ЧАСТЬ 4Б)
// Спавн угроз по плотности, заставки 12 сек. и пасхалка шефа Азамата
// ============================================================================
      const baseZ = Math.max(55, pls.length * 55);
      const densMult = isQuestLoc ? 1.5 : ((dKey === 'far1' || dKey === 'far2') ? 2.0 : 1.0);
      const totZ = Math.round(baseZ * densMult);
      const archKeys = Array.of('surgeon', 'asiat', 'schoolgirl', 'nanny', 'alkash', 'cashier', 'gigolo', 'tatan', 'prof', 'psih', 'strip', 'vet', 'kachok');
      const zms = Array.of();
      let zA = 0;
      while (zms.length < totZ && zA < 5000) {
        zA++;
        const zx = Math.floor(Math.random() * 58) + 1, zy = Math.floor(Math.random() * 58) + 1;
        if (g.at(zy).at(zx).blocked || pls.some(pl => Math.abs(pl.x - zx) <= 2 && Math.abs(pl.y - zy) <= 2)) continue;
        const isAmbush = (zms.length % 3 === 0);
        const isHum = !isAmbush && !isQuestLoc && (zms.length % 7 === 0);
        const rMod = (dKey === 'far1') ? 1 : (dKey === 'far2' ? 2 : (isAmbush ? -1 : 0));
        zms.push({
          id: 'z_' + zms.length, x: zx, y: zy, type: isAmbush ? 'ambush' : 'roam',
          hidden: isAmbush, rankMod: rMod, tPos: null,
          isHuman: isHum, arch: isHum ? archKeys.at(zms.length % archKeys.length) : 'infected'
        });
      }

      this.db.session = {
        turn: 1, activeIdx: 0, diffKey: dKey, diffMod: finalDiffMod,
        grid: g, players: pls, zombies: zms, pendingSpores: 0,
        raidSnapshot: JSON.parse(JSON.stringify(pls))
      };
      pls.forEach(pl => {
        const o = this.findHeroByUid(pl.uid);
        if (o) o.status = 'in_raid';
      });
      this.lobbyPaused = false;
      this.saveDB();
      this.log(`🗺️ Карта 60x60 готова! Барьеров: ${bC}, Точек лута: ${lC}, Угроз: ${zms.length}`);

      const firstPl = pls.at(0);
      if (isQuestLoc) this.showQuestLogoSplash(dKey);
      else if (firstPl && (firstPl.lvl || 0) === 0 && dKey === 'start') this.showIntro(firstPl);
      else this.renderGame();
    },

    stopQuestLogoSplash() {
      if (this._questSplashTimer) { clearInterval(this._questSplashTimer); this._questSplashTimer = null; }
      const ov = document.getElementById('stiks-quest-splash');
      if (ov) ov.remove();
      if (this.db && this.db.session && !this.lobbyPaused) this.renderGame();
    },

    showQuestLogoSplash(dKey) {
      const logos = {
        junkyard: { img: 'img/Junk_logo.jpg', title: '🚗 АВТОСВАЛКА УЛЬЯ', sub: 'Поиск уцелевшего транспорта среди ржавых остовов. Осторожно: плотность врагов ×1.5.', border: '#f59e0b', accent: '#fde047' },
        cemetery: { img: 'img/Grave_logo.jpg', title: '🪦 ДРЕВНЕЕ КЛАДБИЩЕ', sub: 'Туманные склепы хранят Короны Избранного. Плотность тварей ×1.5.', border: '#c084fc', accent: '#e9d5ff' }
      };
      const cfg = logos[dKey];
      if (!cfg || typeof document === 'undefined' || !document.body) return;
      this.stopQuestLogoSplash();

      let tick = 0;
      const totalTicks = 120;
      const ov = document.createElement('div');
      ov.id = 'stiks-quest-splash';
      ov.style.cssText = 'position:fixed;inset:0;background:#07080a;z-index:9995;display:flex;flex-direction:column;justify-content:space-between;font-family:monospace;color:#f1f5f9;';
      ov.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#0b0d10;border-bottom:1px solid ${cfg.border};">` +
        `<span style="color:${cfg.accent};font-weight:bold;font-size:13px;">${cfg.title}</span>` +
        `<button class="btn btn-primary" style="width:auto;padding:5px 10px;font-size:11px;" onclick="STIKS.stopQuestLogoSplash()">Войти сейчас ▶</button></div>` +
        `<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:12px;overflow:hidden;"><img src="${cfg.img}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;border:2px solid ${cfg.border};"></div>` +
        `<div style="padding:12px 16px 28px 16px;background:#0b0d10;border-top:1px solid ${cfg.border};"><div style="font-size:11.5px;text-align:center;margin-bottom:8px;">${cfg.sub}</div>` +
        `<div style="width:100%;height:8px;background:#1e293b;border-radius:4px;overflow:hidden;margin-bottom:5px;"><div id="stiks-quest-splash-bar" style="width:0%;height:100%;background:${cfg.border};"></div></div>` +
        `<div id="stiks-quest-splash-timer" style="text-align:center;font-size:10.5px;color:${cfg.accent};">Загрузка сектора... 12 сек.</div></div>`;
      document.body.appendChild(ov);

      this._questSplashTimer = setInterval(() => {
        tick++;
        const bar = document.getElementById('stiks-quest-splash-bar'), tmTxt = document.getElementById('stiks-quest-splash-timer');
        const leftSec = Math.max(0, Math.ceil((totalTicks - tick) * 0.1));
        if (bar) bar.style.width = Math.min(100, Math.round((tick / totalTicks) * 100)) + '%';
        if (tmTxt) tmTxt.textContent = leftSec > 0 ? `Загрузка сектора... ${leftSec} сек.` : 'Сектор готов!';
        if (tick >= totalTicks) this.stopQuestLogoSplash();
      }, 100);
    },

    showAzamatModal(p) {
      if (!p || typeof document === 'undefined' || !document.body) return;
      const old = document.getElementById('stiks-azamat-modal');
      if (old) old.remove();
      const svg = '<svg viewBox="0 0 220 140" width="100%" style="max-width:220px;background:#1a120d;border:1px solid #f59e0b;border-radius:8px;display:block;margin:0 auto 8px auto;">' +
        '<rect width="220" height="140" fill="#1c130e"/><path d="M72 34 C64 18, 92 12, 110 20 C128 12, 156 18, 148 34 L142 50 L78 50 Z" fill="#f8fafc"/>' +
        '<ellipse cx="110" cy="74" rx="26" ry="28" fill="#e8b896"/><circle cx="99" cy="70" r="3" fill="#1e293b"/><circle cx="121" cy="70" r="3" fill="#1e293b"/>' +
        '<path d="M94 82 Q110 76 126 82 Q118 89 110 84 Q102 89 94 82 Z" fill="#1e293b"/><ellipse cx="168" cy="112" rx="26" ry="8" fill="#334155"/><circle cx="168" cy="110" r="5" fill="#f59e0b"/></svg>';
      const ov = document.createElement('div');
      ov.id = 'stiks-azamat-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,4,3,0.94);z-index:9985;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#fef3c7;';
      ov.innerHTML = `<div style="width:100%;max-width:410px;background:#1c1410;border:2px solid #f59e0b;border-radius:10px;padding:14px;">` +
        `<div style="text-align:center;color:#fbbf24;font-weight:bold;font-size:14px;margin-bottom:8px;">🍳 ПОЛЕВАЯ КУХНЯ В ЦЕНТРЕ ПЕКЛА!</div>${svg}` +
        `<div style="background:#140e0b;border:1px solid #78350f;border-radius:6px;padding:9px;font-size:11.5px;line-height:1.45;color:#fde68a;margin-bottom:10px;">` +
        `Шеф-повар <b>Азамат</b> жарит фирменное блюдо прямо посреди Пекла: «До конца недели проведу целых <b>5 фестивалей рандомных блюд</b>! Держи заказ за счёт заведения!»</div>` +
        `<div style="background:#132419;border:1px solid #4ade80;border-radius:6px;padding:7px;font-size:11px;color:#bbf7d0;margin-bottom:10px;">` +
        `🎁 Награда: <b>+20 Выносливость</b>, <b>+2</b> ко всем остальным статам и <b>[🍳 Омлет от Азамата]</b> (+1 ур. к Дару без риска мутации).</div>` +
        `<button id="btn-azamat-claim" class="btn btn-primary" style="width:100%;padding:8px;font-weight:bold;">🍽️ Отведать и забрать Омлет ▶</button></div>`;
      document.body.appendChild(ov);

      document.getElementById('btn-azamat-claim').onclick = () => {
        ov.remove();
        this.bindHeroCompat(p);
        p.stats.end = this._round100((p.stats.end || 10) + 20);
        Array.of('str', 'agi', 'spd', 'int', 'spi').forEach(k => { p.stats[k] = this._round100((p.stats[k] || 10) + 2); });
        p.inv.push({ n: '🍳 Омлет от Азамата', cat: 'supply', slot: 'use', isAzamatOmelet: true, rank: 4, w: 0.2, q: 1, desc: 'Фирменное блюдо шефа Азамата: +1 к случайному Дару без риска мутации.' });
        p.inv = this.stackInventory(p.inv);
        this.recalcLevel(p); this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB();
        this.log(`🍳 Шеф Азамат угостил ${p.name}: Выносливость +20, остальные статы +2, получен [Омлет от Азамата]!`);
        this.renderGame();
      };
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 5/8 — ЧАСТЬ 5А)
// Ход по карте stepPlayer, Жопакусь, тик выживания/регена и nextTurn
// ============================================================================
    getStepCost(m) {
      const base = m === 'careful' ? 3 : (m === 'fast' ? 2 : 1);
      const s = this.db && this.db.session;
      const p = s && s.players && s.players.at(s.activeIdx);
      if (!p) return base;
      const ci = this.getCarryInfo(p);
      if (ci.blocked) return 999;
      return ci.mult > 1 ? Math.ceil(base * ci.mult) : base;
    },

    setMoveMode(m) {
      const s = this.db && this.db.session;
      if (!s) return;
      const p = s.players.at(s.activeIdx);
      if (p.movedThisTurn) { this.log('❌ Нельзя менять скорость после начала движения в этом ходу.'); return; }
      p.moveMode = m;
      this.saveDB();
      this.renderGame();
    },

    _calcSquadReward(squad) {
      let totalVal = 0;
      (squad || Array.of()).forEach(npc => {
        (npc.loot || Array.of()).forEach(it => {
          totalVal += this.calcItemPrice(it, null) * Math.max(1, Number(it.q || 1));
        });
      });
      return totalVal > 0 ? Math.max(1, Math.ceil(totalVal / 3)) : 0;
    },

    stepPlayer(dx, dy) {
      const s = this.db && this.db.session;
      if (!s || s.combat || s.humanEncounter) return;
      const p = s.players.at(s.activeIdx);
      if (!p) return;
      const nx = p.x + dx, ny = p.y + dy;

      if (nx < 0 || nx > 59 || ny < 0 || ny > 59) {
        p.escaped = true;
        p.missionsDone = (Number(p.missionsDone) || 0) + 1;
        p.status = 'ready';
        if (!p.asInfected && !p.isInfected) p._manualBookRead = p.knowsSpores = p.sporeKnown = p.knowsRecipe = true;

      const sq = Array.isArray(p.escortSquad) ? p.escortSquad : Array.of();
        if (sq.length) {
          const reward = this._calcSquadReward(sq);
          const cnt = sq.length;
          if (p.transportQuest && p.transportQuest.stage === 2) {
            p.transportQuest.escortsOut = Math.min(5, (Number(p.transportQuest.escortsOut) || 0) + cnt);
          }
          p.escortSquad = Array.of();
          if (reward > 0) {
            p.spores = p.sporans = this._cleanSporans(p) + reward;
            this.log(`🎉 Свита (${cnt} чел.) выведена! Ваша доля 1/3 от собранного ими лута: <b>+${reward} 💎</b>!`);
          }
        }

        if (p.towingCar) {
          const car = p.towingCar; delete p.towingCar;
          p.hasCar = true; p.car = car;
          p.transportQuest = Object.assign({ stage: 2, escortsOut: 0, mineShifts: 0, hotelSleeps: 0 }, p.transportQuest || {}, { stage: 2 });
          Array.of('str', 'agi', 'spd', 'end').forEach(k => { p.stats[k] = this._round100((p.stats[k] || 10) + 15); });
          this.recalcLevel(p); this.normalizePlayerStats(p);
          this.log(`🎉 АВТОМОБИЛЬ ЭВАКУИРОВАН! «${car.name}» в гараже! Награда: +15 ко всем физ. статам!`);
        }

        if (p.carryingCrown) {
          const cr = p.carryingCrown; delete p.carryingCrown;
          p.pack = cr;
          p.crownQuest = { stage: 2, eatenHumans: 0, pitShifts: 0, slimeSleeps: 0 };
          Array.of('str', 'agi', 'spd', 'end').forEach(k => { p.stats[k] = this._round100((p.stats[k] || 10) + 15); });
          this.recalcLevel(p); this.normalizePlayerStats(p);
          this.log(`👑 КОРОНА ВЫНЕСЕНА! +15 ко всем физ. статам! Открыты испытания Стаи в Гнезде.`);
        }

        const lvlGain = Math.max(0, (Number(p.lvl) || 0) - (p._raidStartLvl || 0));
        const kills = Number(p._raidKills) || 0;
        delete p._raidStartLvl; delete p._raidKills;
        const saved = this.syncHeroProfile(p);
        const msg = `🚪 ${p.name} вышел с локации! Уровней: +${lvlGain} (Ур.${p.lvl}), врагов: ${kills}, споранов: ${saved ? saved.spores : p.spores} шт.`;
        this.log(msg);
        this.speakPhrase(p, msg);
        if (!s.players.some(pl => !pl.dead && !pl.escaped)) {
          this.db.session = null; this.lobbyPaused = false; this.squad = Array.of();
          this.sanitizeRoster(); this.saveDB();
          this.renderLobby();
          if (typeof this.showRaidSummaryModal === 'function') {
            this.showRaidSummaryModal({ uid: p.uid, fam: p.family, name: p.name, lvlGain, endLvl: p.lvl, kills, spores: saved ? saved.spores : p.spores });
          }
          return;
        }
        this.saveDB(); this.nextTurn();
        return;
      }

      const carry = this.getCarryInfo(p);
      if (carry.blocked) { this.log('🎒 Критический перегруз (>150%)! Шаг заблокирован.'); return; }
      const cost = this.getStepCost(p.moveMode);
      if (p.stepsLeft < cost) { this.log(`❌ Нужно ${cost} ОХ, осталось ${p.stepsLeft}.`); return; }
      const c = s.grid.at(ny).at(nx);
      if (c.blocked) { this.log(`⛰️ Преграда: ${c.bType}.`); return; }

      p.x = nx; p.y = ny; p.stepsLeft -= cost; p.movedThisTurn = true;
      s.pendingSpores = 0;
      this.playStepSound(p.moveMode || 'careful');
      this.grantActionXp(p, p.moveMode === 'run' ? 'spd' : (p.moveMode === 'careful' ? 'agi' : 'end'), 0.25);
      if (carry.rawPct >= 80) this.grantActionXp(p, 'str', 0.5);

      const loudItem = Boolean(p.towingCar || p.carryingCrown || p.stinkTurns > 0);
      if (p.moveMode === 'run' || loudItem) {
        const rad = loudItem ? 4 : 3;
        s.zombies.forEach(z => { if (Math.abs(z.x - nx) <= rad && Math.abs(z.y - ny) <= rad) { z.hidden = false; z.tPos = { x: nx, y: ny }; } });
      }
      if (p.moveMode === 'careful') {
        s.zombies.forEach(z => { if (z && z.hidden && Math.abs(z.x - nx) <= 2 && Math.abs(z.y - ny) <= 2) z.hidden = false; });
      }

      const zHit = s.zombies.find(z => z.x === nx && z.y === ny);
      if (zHit && !p.mapStealthOn) { zHit.hidden = false; this.triggerEncounter(p, zHit); return; }
      if (zHit && p.mapStealthOn) this.log('👻 Вы бесшумно проскользнули мимо мутанта в Скрыте.');
      if (c.lootType) this.log('👀 Замечено ценное место. Нажмите «🔍 Поиск (3)».');
      this.saveDB();
      this.renderGame();
    },

    renderZhopakusCard(infName, humName, dmg) {
      const pic = Math.random() < 0.5 ? 'img/Zopakus1.png' : 'img/Zopakus2.png';
      return '<div style="background:#140e0e;border:1px solid #8f2d2d;border-radius:6px;margin:6px 0;padding:8px;text-align:center;font-family:monospace;">' +
        '<div style="color:#ff5a5a;font-size:13px;font-weight:bold;margin-bottom:6px;">🦷 ЖОПАКУСЬ! (-' + dmg + ' ОЗ)</div>' +
        '<img src="' + pic + '" style="width:100%;max-width:260px;max-height:190px;object-fit:contain;border-radius:6px;background:#1a1212;border:1px solid #5c2828;margin-bottom:6px;">' +
        '<div style="color:#f0e6e6;font-size:11px;">' + infName + ' вцепился в ' + humName + '!</div>' +
        '<div style="color:#d48a8a;font-size:10px;margin-top:2px;">Урон прошёл мимо брони прямо по филейной части!</div></div>';
    },

    checkZhopakusOnTurnEnd(p, s) {
      if (!p || !s) return;
      const isInf = Boolean((p.asInfected || p.isInfected) && !p.isKvaz);
      const nearPl = (s.players || Array.of()).filter(o => o && o.uid !== p.uid && !o.dead && !o.escaped && Math.abs(o.x - p.x) <= 3 && Math.abs(o.y - p.y) <= 3 && Boolean((o.asInfected || o.isInfected) && !o.isKvaz) !== isInf);
      const sq = Array.isArray(p.escortSquad) ? p.escortSquad : Array.of();
      if (!nearPl.length && !(isInf && sq.length)) return;

      const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
      if (d1 === d2) this.playDoubleSound();
      if (d1 === 1 && d2 === 1) {
        const sk = Math.random() < 0.5 ? 'spi' : 'int';
        this.grantActionXp(p, sk, 3);
        this.log(`🧊 [1-1] Стальная выдержка! ${p.name}: +3 к ${sk === 'spi' ? 'Духу' : 'Интеллекту'}.`);
      } else if (d1 === 6 && d2 === 6) {
        if (!isInf) {
          p.stinkTurns = 10;
          this.log(`💩 [6-6] Нервы не выдержали рядом с заражённым! ${p.name} получил статус «Вонь» на 10 ходов.`);
        } else if (nearPl.length) {
          const trg = nearPl.at(0);
          const dmg = Math.max(2, Math.round(2 + (Number(p.stats.str) || 10) * 0.25));
          trg.hp = Math.max(0, trg.hp - dmg);
          this.log(`🦷 [6-6] ЖОПАКУСЬ! ${p.name} вцепился в ${trg.name} мимо брони на -${dmg} ОЗ!` + this.renderZhopakusCard(p.name, trg.name, dmg));
          if (trg.hp <= 0) { trg.dead = true; trg.status = 'dead'; this.syncHeroProfile(trg); }
        } else if (sq.length) {
          const trg = sq.at(0);
          const dmg = Math.max(3, Math.round(2 + (Number(p.stats.str) || 10) * 0.25));
          trg.hp = Math.max(0, trg.hp - dmg);
          this.log(`🦷 [6-6] ЖОПАКУСЬ СПУТНИКА! ${p.name} вцепился в ${trg.name} на -${dmg} ОЗ!` + this.renderZhopakusCard(p.name, trg.name, dmg));
          if (trg.hp <= 0) { sq.shift(); this.log(`💀 Спутник ${trg.name} погиб от укуса!`); }
        }
      } else {
        this.grantActionXp(p, Math.random() < 0.5 ? 'spi' : 'int', 1);
      }
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 5/8 — ЧАСТЬ 5Б-1)
// Пошаговый тик выживания/регенерации вне боя и смена хода nextTurn
// ============================================================================
    applyOutOfCombatTurnTick(p) {
      if (!p || p.escaped || p.dead) return;
      this.normalizePlayerStats(p);
      const isTatan = Boolean(p.arch === 'tatan' && !p.asInfected && !p.isInfected && !p.isKvaz);
      const tMult = isTatan ? 2 : 1;
      const endVal = Number(p.stats.end || 10), spiVal = Number(p.stats.spi || 10);
      const spPct = ((Number(p.spore) || 0) / Math.max(1, Number(p.maxSpore) || 50)) * 100;
      const wPct = ((Number(p.water) || 0) / Math.max(1, Number(p.maxWater) || 50)) * 100;
      const hpPct = ((Number(p.hp) || 0) / Math.max(1, Number(p.maxHp) || 10)) * 100;

      const spDrain = ((p.hp < p.maxHp * 0.5) ? 2 : 1) * (wPct > 50 ? 0.5 : 1);
      const foodDrain = ((hpPct < 30) ? 2 : 1) * tMult;
      const waterDrain = ((spPct < 30) ? 2 : 1) * tMult;

      p.spore = this._round100(Math.max(0, (Number(p.spore) || 0) - spDrain));
      p.food = this._round100(Math.max(0, (Number(p.food) || 0) - foodDrain));
      p.water = this._round100(Math.max(0, (Number(p.water) || 0) - waterDrain));

      const regenMult = spPct > 75 ? 2 : (spPct < 25 ? 0.5 : 1);
      const baseManaRegen = Math.floor(spiVal / 10);
      if (baseManaRegen > 0 && p.mana < p.maxMana) {
        p.mana = Math.min(p.maxMana, p.mana + Math.max(1, Math.round(baseManaRegen * regenMult)));
      }

      if (p.food <= 0 || p.water <= 0) {
        const starveDmg = Math.max(1, Math.round((1 + 0.5 * (Number(p.lvl) || 0)) * 10) / 10);
        p.hp = Math.max(0, this._round100(p.hp - starveDmg));
        this.log(`⚠️ ${p.name} истощён (сытость/жажда на нуле): -${starveDmg} ОЗ (${p.hp}/${p.maxHp}).`);
        if (p.hp <= 0) { p.dead = true; p.status = 'dead'; this.log(`💀 ${p.name} погиб от истощения в Улье!`); }
      } else if (p.food >= 5 && p.water >= 5 && p.hp < p.maxHp) {
        const baseHpRegen = 1 + Math.floor(endVal / 10);
        p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(baseHpRegen * (hpPct < 30 ? 2 : 1) * regenMult)));
      }
    },

    nextTurn() {
      const s = this.db && this.db.session;
      if (!s) return;
      const p = s.players.at(s.activeIdx);
      if (p && !p.escaped && !p.dead) {
        this.applyOutOfCombatTurnTick(p);
        if (!p.dead) {
          if (p.stinkTurns > 0) p.stinkTurns--;
          this.checkZhopakusOnTurnEnd(p, s);
        }
        this.syncHeroProfile(p);
      }
      s.activeIdx++;
      if (s.activeIdx >= s.players.length) {
        s.activeIdx = 0;
        s.turn++;
        const dk = String(s.diffKey || 'start').toLowerCase();
        const speedMap = { start: 1.0, easy: 1.25, norm: 1.5, hard: 2.0, hell: 3.0, junkyard: 1.5, cemetery: 1.5, far1: 2.0, far2: 3.0 };
        const aiSpeed = speedMap[dk] || 1.0;
        const dirs = Array.of(Array.of(0, -1), Array.of(0, 1), Array.of(-1, 0), Array.of(1, 0));
        (s.zombies || Array.of()).forEach(z => {
          if (z.type === 'ambush' && z.hidden && !z.tPos) return;
          const whole = Math.floor(aiSpeed);
          const steps = whole + (Math.random() < (aiSpeed - whole) ? 1 : 0);
          for (let st = 0; st < steps; st++) {
            let tx = z.x, ty = z.y;
            if (z.tPos) {
              tx += Math.sign(z.tPos.x - z.x); ty += Math.sign(z.tPos.y - z.y);
              if (tx === z.tPos.x && ty === z.tPos.y) z.tPos = null;
            } else {
              const d = dirs.at(Math.floor(Math.random() * 4));
              tx += d.at(0); ty += d.at(1);
            }
            if (tx >= 0 && tx <= 59 && ty >= 0 && ty <= 59 && !s.grid.at(ty).at(tx).blocked) { z.x = tx; z.y = ty; }
          }
        });
        this.log(`--- ХОД ${s.turn} ---`);
      }
      const np = s.players.at(s.activeIdx);
      if (np.escaped || np.dead) {
        if (s.players.every(pl => pl.escaped || pl.dead)) {
          this.db.session = null; this.lobbyPaused = false; this.squad = Array.of();
          this.sanitizeRoster(); this.saveDB(); this.renderLobby(); return;
        }
        this.nextTurn(); return;
      }
      this.normalizePlayerStats(np);
      np.stepsLeft = np.maxAp; np.movedThisTurn = false;
      this.saveDB();
      this.renderGame();
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 5/8 — ЧАСТЬ 5Б-2)
// Обыск клетки searchCell (3 ОХ, 1% Руководство, свита) и сбор споранов (1 ОХ)
// ============================================================================
    searchCell(onMove) {
      if (onMove) return;
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players.at(s.activeIdx);
      const cell = s.grid.at(p.y).at(p.x);
      if (p.stepsLeft < 3) { this.log('❌ Для поиска нужно минимум 3 ОХ!'); return; }

      if (cell.isAzamatEaster) {
        p.stepsLeft -= 3; cell.isAzamatEaster = false; cell.lootType = null; cell.valuable = false;
        this.playRustleSound(); this.saveDB(); this.renderGame(); this.showAzamatModal(p); return;
      }
      if (cell.carCache) {
        if (p.towingCar) { this.log('⚠️ Вы уже тащите машину на буксире!'); return; }
        p.stepsLeft -= 3; cell.carCache = false; cell.lootType = null; cell.valuable = false;
        this.playRustleSound(); this.saveDB(); this.renderGame(); this.showCarChoiceModal(p); return;
      }
      if (cell.cryptCache) {
        if (p.carryingCrown) { this.log('⚠️ Вы уже несёте Корону Избранного!'); return; }
        p.stepsLeft -= 3; cell.cryptCache = false; cell.lootType = null; cell.valuable = false;
        this.playRustleSound(); this.saveDB(); this.renderGame(); this.showCrownChoiceModal(p); return;
      }

      p.stepsLeft -= 3;
      this.playRustleSound();
      const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
      if (d1 === d2) { this.playDoubleSound(); this.grantActionXp(p, 'spi', 1); }

      const qty = d1 + cell.exhaust + (cell.valuable ? 2 : 1);
      cell.exhaust--;
      const cats = Array.of('weapon', 'armor', 'supply');
      const found = Array.of();
      for (let i = 0; i < Math.max(0, qty); i++) {
        const item = this.genClusterItem(cell.lootType || cats.at(Math.floor(Math.random() * 3)), cell.domCal || '12g');
        if (item) { p.inv.push(item); found.push(item); }
      }
      if (!this.isRealSporeUnlocked(p) && !p.asInfected && Math.random() < 0.01) {
        const guide = { n: '📘 Руководство по выживанию в Улье', cat: 'supply', slot: 'use', isGuide: true, w: 0.2, q: 1, rank: 2 };
        p.inv.push(guide); found.push(guide);
      }

      this.grantActionXp(p, 'int', 0.25);
      if (found.length) {
        p.inv = this.stackInventory(p.inv);
        this.log(`🔍 Поиск (${found.length} шт.): ${found.map(x => x.n).join(', ')}.`);
        const total = found.reduce((a, x) => a + (Number(x.q) || 1), 0);
        const lastNm = found.at(found.length - 1).n;
        this.speakPhrase(p, total === 1 ? `Найдено: ${lastNm}.` : `Найдено предметов: ${total}, последний — ${lastNm}.`);
      } else {
        this.log(`🔍 Поиск [${p.x + 1}:${p.y + 1}]: пусто.`);
      }

      const sq = Array.isArray(p.escortSquad) ? p.escortSquad : Array.of();
      if (sq.length) {
        sq.forEach(npc => {
          if (Math.floor(Math.random() * 6) + 1 >= 3) {
            const extra = this.genClusterItem(cell.lootType || cats.at(Math.floor(Math.random() * 3)), cell.domCal || '12g');
            if (extra) {
              npc.loot = this.stackInventory(Array.of(...(npc.loot || Array.of()), extra));
              this.log(`🐕 Спутник <b>${npc.name}</b> дообыскал клетку: ${extra.n}.`);
            }
          }
        });
      }
      this.syncHeroProfile(p); this.saveDB(); this.renderGame();
    },

    collectSpores() {
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players.at(s.activeIdx);
      const pend = Number(s.pendingSpores) || 0;
      if (pend <= 0) { this.log('💎 На клетке нет споранов.'); return; }
      if (p.stepsLeft < 1) { this.log('❌ Нужно 1 ОХ для сбора споранов.'); return; }
      p.stepsLeft -= 1;
      p.spores = p.sporans = this._cleanSporans(p) + pend;
      s.pendingSpores = 0;
      this.grantActionXp(p, 'int', 0.25);
      this.syncHeroProfile(p); this.saveDB();
      this.log(`💎 Собрано споранов: +${pend} шт. (Всего: ${p.spores} шт., вес 0 кг).`);
      this.renderGame();
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 5/8 — ЧАСТЬ 5Б-3)
// Живчик, пожирание тел, свита ИИ до 5 чел. и багажник/носильщики (6 ОХ)
// ============================================================================
    craftAndDrinkZhivchik() {
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players.at(s.activeIdx);
      if (!this.isRealSporeUnlocked(p)) { this.log('📖 Сначала изучите Руководство по выживанию в Улье!'); return; }
      if (this._cleanSporans(p) < 1) { this.log('❌ Для рецепта нужен минимум 1 споран 💎.'); return; }
      const alcIdx = (p.inv || Array.of()).findIndex(it => it && (it.alcohol || /водк|спирт|алко|виски|коньяк|самогон/.test(String(it.n || it.name || '').toLowerCase())));
      if (alcIdx === -1) { this.log('❌ В рюкзаке нет алкоголя для растворения спорана.'); return; }
      p.spores = p.sporans = p.spores - 1;
      this.consumeInvOne(p, alcIdx);
      p.inv.push({ n: '🧪 Живчик (настойка Улья)', cat: 'supply', slot: 'use', isZhivchik: true, w: 0.2, q: 3, rank: 2 });
      p.inv = this.stackInventory(p.inv);
      this.grantActionXp(p, 'int', 0.5);
      this.syncHeroProfile(p); this.saveDB();
      this.log('🧪 Приготовлено 3 порции «Живчика» (1 споран + 1 алкоголь)!');
      this.renderGame();
    },

    drinkZhivchik() {
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players.at(s.activeIdx);
      if (p.asInfected || p.isInfected) { this.log('☣️ Заражённым «Живчик» ни к чему!'); return; }
      const zIdx = (p.inv || Array.of()).findIndex(it => it && (it.isZhivchik || String(it.n || it.name || '').toLowerCase().includes('живчик')));
      if (zIdx === -1) { this.log('❌ В рюкзаке нет «Живчика».'); return; }
      this.normalizePlayerStats(p);
      if (((Number(p.spore) || 0) / Math.max(1, Number(p.maxSpore) || 50)) > 0.95) {
        this.log('⚠️ Споровый баланс заполнен более чем на 95% — пить «Живчик» сейчас нельзя!'); return;
      }
      this.consumeInvOne(p, zIdx);
      p._drankZhivchik = p.knowsSpores = p.sporeKnown = p.knowsRecipe = true;
      p.spore = Math.min(p.maxSpore, Math.round((p.spore || 0) + p.maxSpore * 0.50));
      p.stamina = Math.min(p.maxStamina, Math.round((p.stamina || 0) + p.maxStamina * 0.15));
      p.water = Math.min(p.maxWater, Math.round((p.water || 0) + p.maxWater * 0.15));
      p.hp = Math.min(p.maxHp, Math.round((p.hp || 0) + p.maxHp * 0.15));
      this.syncHeroProfile(p); this.saveDB();
      this.log(`🥤 Выпит «Живчик»: Споровый баланс +50% (${p.spore}/${p.maxSpore}), ОЗ/Жажда/Бодрость +15%.`);
      this.renderGame();
    },

    devourEnemy() {
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players.at(s.activeIdx);
      if ((!p.asInfected && !p.isInfected) || !p.lastKill) return;
      if (p.stepsLeft < 1) { this.log('❌ Нужно 1 ОХ для пожирания.'); return; }
      p.stepsLeft -= 1;
      const isHum = Boolean(p.lastKill.isHuman), rankAdd = (Number(p.lastKill.rank) || 0) * 8;
      p.lastKill = null;
      if (isHum && p.ancestorsQuest && p.ancestorsQuest.active) {
        p.ancestorsQuest.eaten = Math.min(10, (Number(p.ancestorsQuest.eaten) || 0) + 1);
      }
      if (p.crownQuest && p.crownQuest.stage === 2) {
        p.crownQuest.eatenHumans = Math.min(5, (Number(p.crownQuest.eatenHumans) || 0) + 1);
      }
      this.normalizePlayerStats(p);
      p.spore = Math.min(p.maxSpore, Math.round((p.spore || 0) + p.maxSpore * (isHum ? 0.65 : 0.45) + rankAdd));
      p.food = Math.min(p.maxFood, Math.round((p.food || 0) + p.maxFood * 0.50));
      p.water = Math.min(p.maxWater, Math.round((p.water || 0) + p.maxWater * 0.25));
      p.hp = Math.min(p.maxHp, Math.round((p.hp || 0) + p.maxHp * 0.25));
      this.grantActionXp(p, 'end', 0.5);
      this.playWorkSound('chomp');
      this.syncHeroProfile(p); this.saveDB();
      this.log(`🍖 Пожирание завершено: Споровый баланс → ${p.spore}/${p.maxSpore}, Сытость +50%, ОЗ/Жажда +25%.`);
      this.renderGame();
    },

    resolveHumanEncounter(action) {
      const s = this.db && this.db.session;
      if (!s || !s.humanEncounter) return;
      const enc = s.humanEncounter, p = s.players.at(s.activeIdx);
      const zMarker = s.zombies.find(z => z.id === enc.zId);
      s.humanEncounter = null;
      if (action === 'pass') {
        this.log(`🚶 Вы мирно разошлись с выжившим (${enc.name}).`);
        if (zMarker) { zMarker.hidden = true; zMarker.tPos = null; }
        this.saveDB(); this.renderGame(); return;
      }
      if (action === 'escort') {
        p.escortSquad = Array.isArray(p.escortSquad) ? p.escortSquad : Array.of();
        if (p.escortSquad.length >= 5) { this.log('⚠️ Свита заполнена (максимум 5 спутников)!'); return; }
        s.zombies = s.zombies.filter(z => z.id !== enc.zId);
        const npcLvl = Math.max(1, Number(enc.lvl) || 1);
        const maxHp = 25 + npcLvl * 6;
        p.escortSquad.push({ name: enc.name, arch: enc.arch, lvl: npcLvl, hp: maxHp, maxHp, dmg: 5 + Math.floor(npcLvl * 1.5), loot: Array.of() });
        this.syncHeroProfile(p); this.saveDB();
        this.log(`🐕 ${enc.name} (Ур.${npcLvl}) принят в свиту (${p.escortSquad.length}/5)!`);
        this.renderGame(); return;
      }
      if (zMarker) zMarker.hostile = true;
      const enemies = Array.of({ name: enc.name, rank: 1, lvl: enc.lvl || 2, hp: 36 + (enc.lvl || 2) * 8, maxHp: 36 + (enc.lvl || 2) * 8, dmg: 6 + (enc.lvl || 2) * 2, isHuman: true });
      s.combat = { zId: enc.zId, enemies };
      global.STIKS_COMBAT_CORE.startFromHero(p, enemies, enc.zId);
      this.renderCombat();
    },

    getTrunkWeight(p) {
      return Math.round(((p && p.carTrunk) || Array.of()).reduce((acc, it) => acc + (Number(it.w || 0) * Math.max(1, Number(it.q || 1))), 0) * 10) / 10;
    },

    openCarTrunkModal() {
      const s = this.db && this.db.session;
      const p = s && s.players && s.players.at(s.activeIdx);
      if (!p || (!s.activeCarOwnerUid && !s.activePackOwnerUid)) return;
      const old = document.getElementById('stiks-car-trunk-modal');
      if (old) old.remove();
      const curW = this.getTrunkWeight(p), capW = p.carTrunkCap || 500;
      const ov = document.createElement('div');
      ov.id = 'stiks-car-trunk-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(4,6,5,0.94);z-index:9650;display:flex;align-items:center;justify-content:center;padding:10px;font-family:monospace;color:#e6f5eb;';
      ov.innerHTML = `<div style="width:100%;max-width:400px;background:#121614;border:2px solid #38bdf8;border-radius:8px;padding:12px;font-size:11px;">` +
        `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><b style="color:#7dd3fc;">📦 БАГАЖНИК / НОСИЛЬЩИКИ (${curW} / ${capW} кг)</b><button class="btn btn-danger" style="width:auto;padding:3px 8px;" onclick="document.getElementById('stiks-car-trunk-modal').remove()">✖</button></div>` +
        `<div style="color:#fde047;font-size:10px;margin-bottom:8px;">Выгрузка всей добычи из рюкзака стоит 6 ОХ (осталось ОХ: ${p.stepsLeft}).</div>` +
        `<button id="btn-confirm-trunk-load" class="btn btn-primary" ${(!p.inv.length || p.stepsLeft < 6) ? 'disabled' : ''} style="width:100%;padding:8px;">📦 Выгрузить всё (6 ОХ)</button></div>`;
      document.body.appendChild(ov);
      document.getElementById('btn-confirm-trunk-load').onclick = () => {
        if (p.stepsLeft < 6 || this.getTrunkWeight(p) + this.getInvWeight(p) > capW) return;
        p.stepsLeft -= 6;
        p.carTrunk = this.stackInventory(Array.of(...(p.carTrunk || Array.of()), ...p.inv));
        p.inv = Array.of();
        this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB();
        ov.remove(); this.log(`📦 ${p.name} перегрузил добычу (${this.getTrunkWeight(p)}/${capW} кг).`);
        this.renderGame();
      };
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 6/8 — ЧАСТЬ 6А)
// Стеки, 11 слотов, запрет шмота для Заражённого и проверка 17 Амулетов позора
// ============================================================================
    stackInventory(inv) {
      if (!Array.isArray(inv)) return Array.of();
      const out = Array.of();
      const equipCats = Array.of('weapon', 'main', 'side', 'melee', 'armor', 'clothes', 'boots', 'bag', 'mod', 'meleemod', 'talisman');
      inv.forEach(raw => {
        if (!raw) return;
        const nm = String(raw.n || raw.name || '').trim();
        const low = nm.toLowerCase();
        if (raw.isSporan || raw.type === 'sporan' || low === 'споран' || low === 'спораны') return;
        const cat = String(raw.cat || raw.type || raw.slot || '').toLowerCase();
        const qty = Math.max(1, Number(raw.q !== undefined ? raw.q : (raw.qty !== undefined ? raw.qty : 1)) || 1);
        const item = JSON.parse(JSON.stringify(raw));
        item.q = item.qty = qty;
        if (!equipCats.includes(cat)) {
          const found = out.find(x => String(x.n || x.name || '').trim() === nm && Number(x.rank || 1) === Number(item.rank || 1));
          if (found) { found.q = found.qty = (Number(found.q) || 1) + qty; return; }
        }
        out.push(item);
      });
      return out;
    },

    consumeInvOne(holder, idx) {
      if (!holder || !Array.isArray(holder.inv) || !holder.inv.at(idx)) return null;
      const it = holder.inv.at(idx);
      const q = Number(it.q !== undefined ? it.q : (it.qty !== undefined ? it.qty : 1));
      if (q > 1) { it.q = q - 1; if (it.qty !== undefined) it.qty = it.q; }
      else holder.inv.splice(idx, 1);
      return it;
    },

    detectSlot(it) {
      if (!it) return null;
      if (it.slot && Array.of('main', 'side', 'melee', 'mag', 'mod', 'meleeMod', 'armor', 'clothes', 'boots', 'bag', 'talisman').includes(it.slot)) return it.slot;
      const name = String(it.n || it.name || '').toLowerCase();
      const cat = String(it.cat || it.type || '').toLowerCase();
      if (it.recipe || it.isGuide || name.includes('руководств') || name.includes('инструкц')) return 'consumable_book';
      if (cat === 'med' || cat === 'heal' || /аптеч|бинт|стимулятор|таблет|ипп|эликсир|инъектор|ампул/.test(name)) return 'consumable_med';
      if (cat === 'food' || cat === 'drink' || cat === 'supply' || /живчик|вода|тушен|консерв|водк|спирт|алко|сок|сухпа|горох|жемчуг|омлет/.test(name)) return 'consumable_other';
      if (cat === 'meleemod' || it.isPoison || /яд|отрав|смазк/.test(name)) return 'meleeMod';
      if (cat === 'mod' || /прицел|глушител|обвес|коллиматор/.test(name)) return 'mod';
      if (cat === 'armor' || /бронежилет|брон|жилет|кирас|шлем/.test(name)) return 'armor';
      if (cat === 'clothes' || /халат|куртк|одежд|комбинезон|плащ|пуховик|костюм|ватник|косух|горк/.test(name)) return 'clothes';
      if (cat === 'boots' || /ботин|сапог|берц|кроссов/.test(name)) return 'boots';
      if (cat === 'bag' || /рюкзак|ранец|баул|вещмешок/.test(name)) return 'bag';
      if (cat === 'talisman' || cat === 'amulet' || it.troll || it.shame || /амулет|позор|трусик|дуршлаг|стетоскоп|вантуз|тапок/.test(name)) return 'talisman';
      if (cat === 'mag' || cat === 'ammo' || /обойм|магазин|патрон|картеч|дроб/.test(name)) return 'mag';
      if (cat === 'melee' || /нож|топор|бит|монтиров|мачете|дубин|клинок|арматур|тесак/.test(name)) return 'melee';
      if (cat === 'side' || /пистолет|револьвер|обрез|пм|тт|глок|glock|щит/.test(name)) return 'side';
      if (cat === 'weapon' || cat === 'main' || /автомат|ружь|винтов|дробовик|карабин|ак-|акм|скс|всс|гаусс|пулем/.test(name)) return 'main';
      return null;
    },

    resolveItemRank(it) {
      if (!it) return 1;
      const raw = Number(it.rank || it.cls || it.tier || it.r || 0);
      if (raw >= 1 && raw <= 5) return Math.round(raw);
      return 1;
    },

    describeItem(it) {
      if (!it) return '';
      const r = this.resolveItemRank(it);
      const parts = Array.of(`Ранг P${r}`);
      if (Number(it.a || it.dmg)) parts.push(`⚔️ Урон +${it.a || it.dmg}`);
      if (Number(it.d || it.def)) parts.push(`🛡️ Защита +${it.d || it.def}`);
      if (Number(it.heal || it.hp)) parts.push(`❤️ Лечение +${it.heal || it.hp} ОЗ`);
      if (Number(it.food)) parts.push(`🍖 Сытость +${it.food}`);
      if (Number(it.water)) parts.push(`💧 Жажда +${it.water}`);
      if (Number(it.bag)) parts.push(`🎒 Груз +${it.bag} кг`);
      parts.push(`⚖️ ${Number(it.w || 0)} кг`);
      return (it.desc ? it.desc + ' • ' : '') + parts.join(' | ');
    },

    canInfectedEquipItem(hero, item) {
      if (!hero || !item) return false;
      const isInf = Boolean((hero.isInfected || hero.asInfected || hero.arch === 'infected') && !hero.isKvaz);
      if (!isInf) return true;
      const sl = this.detectSlot(item);
      if (!sl || sl.startsWith('consumable_')) return true;
      const g = hero.gifts || {};
      const isShield = /щит/.test(String(item.n || item.name || '').toLowerCase());
      if (sl === 'melee' && g.vaishnavism) return true;
      if ((sl === 'main' || sl === 'side' || sl === 'mag') && !isShield && g.vaishnavism && Number(g.vaishnavism.lvl || 1) >= 15) return true;
      if ((sl === 'armor' || isShield) && g.gigantism) return true;
      if ((sl === 'clothes' || sl === 'boots') && g.hive_child) return true;
      return false;
    },

    stripForbiddenInfectedGear(hero) {
      if (!hero || !hero.slots) return false;
      const isInf = Boolean((hero.isInfected || hero.asInfected || hero.arch === 'infected') && !hero.isKvaz);
      if (!isInf) return false;
      let stripped = false;
      Object.keys(hero.slots).forEach(sk => {
        const eq = hero.slots[sk];
        if (eq && !this.canInfectedEquipItem(hero, eq)) {
          hero.slots[sk] = null;
          hero.inv = Array.isArray(hero.inv) ? hero.inv : Array.of();
          hero.inv.push(eq);
          stripped = true;
        }
      });
      if (stripped) hero.inv = this.stackInventory(hero.inv);
      return stripped;
    },

    canWearArchAmulet(hero, it) {
      if (!it || !it.req) return true;
      if (!hero) return false;
      const isInf = Boolean((hero.asInfected || hero.isInfected || hero.arch === 'infected') && !hero.isKvaz);
      const isKvaz = Boolean(hero.isKvaz);
      const isLeg = Boolean(hero.isLegendary && !isInf && !isKvaz);
      const fem = this.isFem(hero);
      if (it.req === 'infected') return isInf;
      if (it.req === 'kvaz') return isKvaz;
      if (it.req === 'legend_m') return isLeg && !fem;
      if (it.req === 'legend_f') return isLeg && fem;
      if (isInf || isKvaz) return false;
      return hero.arch === it.req;
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 6/8 — ЧАСТЬ 6Б)
// Жемчуг Улья, Горох с Интуицией, Омлет от Азамата и equipFromInv
// ============================================================================
    usePearl(p, color) {
      if (!p) return;
      this.bindHeroCompat(p);
      const c = String(color || '').toLowerCase();
      const fem = this.isFem(p);

      if (c === 'white' || c === 'белый') {
        if (p.asInfected || p.isInfected) {
          p.wasInfected = p.wasKvaz = p.keepInfectedMult = true;
          p.isInfected = p.asInfected = false;
          p.isKvaz = true;
          if (p.origArch && p.origArch !== 'infected') p.arch = p.origArch;
          this.log(`⚪ Белая жемчужина подняла ${p.name} до разумного Кваза! Коэффициенты роста сохранены.`);
          this.rollHiveRoulette(p, 'white', 30);
        } else if (p.isKvaz) {
          p.wasKvaz = true;
          p.isKvaz = false;
          if (p.origArch && p.origArch !== 'infected' && p.origArch !== 'kvaz') p.arch = p.origArch;
          this.log(`⚪ Вторая Белая жемчужина очистила кровь ${p.name}, вернув облик человека!`);
          this._advanceMutationCycle(p);
          this.updateEvolutionStages(p);
          this.rollHiveRoulette(p, 'white', 30);
        } else {
          this.log(`⚪ Белый жемчуг пробудил в ${p.name} высшую силу Улья!`);
          this.rollHiveRoulette(p, 'white', 30);
        }
        this.recalcLevel(p); this.normalizePlayerStats(p);
        return;
      }

      const isBlack = (c === 'black' || c === 'черный' || c === 'чёрный');
      if (p.asInfected || p.isInfected) {
        p.wasInfected = true;
        this.rollHiveRoulette(p, isBlack ? 'black' : 'red', isBlack ? 10 : 5);
        this.recalcLevel(p); this.normalizePlayerStats(p);
        return;
      }

      const r = Math.random() * 100;
      const kvazCh = isBlack ? 25 : 8;
      const infCh = isBlack ? 5 : 2;
      const triggered = !p.isKvaz && (r < kvazCh + infCh);

      if (triggered && p.isLegendary) {
        if (Math.random() < 0.50) {
          p.stats.int = this._round100((p.stats.int || 10) + 50);
          p.stats.spi = this._round100((p.stats.spi || 10) + 50);
          this.log(`⚡ ТРИУМФ ВОЛИ ЛЕГЕНДЫ! Дух укротил мутацию: Интеллект +50, Дух +50!`);
        } else {
          const toKvaz = r < kvazCh;
          Array.of('str', 'agi', 'spd', 'end').forEach(k => { p.stats[k] = (p.stats[k] || 10) + 100; });
          if (toKvaz) { p.isKvaz = p.wasKvaz = true; p.arch = fem ? 'legend_kvaz_f' : 'legend_kvaz_m'; }
          else { p.asInfected = p.isInfected = p.wasInfected = true; p.arch = 'legend_z'; }
          this.log(`🩸 ЗВЕРЬ ВЗЯЛ ВЕРХ! ${p.name} сорвался в Легендарную мутацию (+100 ко всем физ. статам)!`);
        }
      } else if (!p.isKvaz && r < kvazCh) {
        p.isKvaz = p.wasKvaz = true;
        Array.of('str', 'agi', 'spd', 'end', 'int', 'spi').forEach(k => { p.stats[k] = (p.stats[k] || 10) + 12; });
        this.log('☣️ МУТАЦИЯ: ' + p.name + ' стал КВАЗОМ (+12 ко всем базовым статам)!');
      } else if (!p.isKvaz && r < kvazCh + infCh) {
        p.asInfected = p.isInfected = p.wasInfected = true;
        p.arch = 'infected';
        this.log('🧟 ОБРАЩЕНИЕ: ' + p.name + ' стал ОСОБЫМ ЗАРАЖЁННЫМ!');
      }

      this.rollHiveRoulette(p, isBlack ? 'black' : 'red', isBlack ? 10 : 5);
      this.recalcLevel(p); this.normalizePlayerStats(p);
    },

    _boostRandomOpenedGift(hero, addLvl) {
      const db = this.getDarsMap();
      const owned = Object.keys(hero.gifts || {}).filter(id => db[id]);
      if (!owned.length) return null;
      const pickId = owned.at(Math.floor(Math.random() * owned.length));
      const meta = db[pickId];
      const cap = meta.cap || 30;
      const curL = Number(hero.gifts[pickId].lvl || 1);
      if (curL >= cap) {
        this.handleGiftCapOverflow(hero, addLvl);
        return { name: meta.name, lvl: cap, overflow: true };
      }
      const nextL = Math.min(cap, curL + addLvl);
      hero.gifts[pickId].lvl = hero.gifts[pickId].level = nextL;
      return { name: meta.name, lvl: nextL };
    },

    useHivePeas(p, idx) {
      const curLvl = Number(p.lvl || 0);
      if (!p._peasState || p._peasState.lvl !== curLvl) p._peasState = { lvl: curLvl, count: 0 };
      const nextCnt = p._peasState.count + 1;

      const finishPeas = (riskPct) => {
        this.consumeInvOne(p, idx);
        p._peasState.count = nextCnt;
        const add = riskPct <= 0 ? 1 : 2;
        const up = this._boostRandomOpenedGift(p, add);
        if (riskPct > 0 && Math.random() * 100 < riskPct && !p.isKvaz) {
          p.isKvaz = p.wasKvaz = true;
          p.asInfected = p.isInfected = false;
          Array.of('str', 'agi', 'spd', 'end', 'int', 'spi').forEach(k => { p.stats[k] = (p.stats[k] || 10) + 12; });
          this.log(`👹 ПРОВАЛ ИНТУИЦИИ (${riskPct}%): ${p.name} мутировал в КВАЗА!` + (up ? ` Дар «${up.name}» получил +2!` : ''));
        } else {
          this.log(`🫛 Съедена горошина (${nextCnt}-я на ур.${curLvl}, риск ${riskPct}%):` + (up ? ` Дар «${up.name}» → Ур.${up.lvl}!` : ' открытых Даров нет.'));
        }
        this.recalcLevel(p); this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB();
        this.renderGame();
      };

      if (nextCnt <= 3) { finishPeas(0); return; }
      const riskPct = Math.min(100, (nextCnt - 3) * 10);
      const old = document.getElementById('stiks-intuition-modal');
      if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'stiks-intuition-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,6,0.93);z-index:9880;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#f5e6e6;';
      ov.innerHTML = `<div style="width:100%;max-width:380px;background:#1f1012;border:2px solid #ef4444;border-radius:8px;padding:14px;">` +
        `<div style="color:#f87171;font-weight:bold;font-size:14px;text-align:center;margin-bottom:8px;">⚠️ ПРЕДУПРЕЖДЕНИЕ ИНТУИЦИИ!</div>` +
        `<div style="font-size:11.5px;line-height:1.45;margin-bottom:12px;">Это <b>${nextCnt}-я горошина</b> на уровне ${curLvl} (лимит: 3 шт.).<br>🎲 Риск обращения в <b>Кваза</b>: <b style="color:#ff5a5a;">${riskPct}%</b><br>✨ Бонус: <b>+2 ур.</b> к случайному открытому Дару.</div>` +
        `<div style="display:flex;gap:8px;"><button id="btn-peas-go" class="btn btn-danger" style="flex:1;font-weight:bold;">🫛 Съесть (${riskPct}%)</button>` +
        `<button class="btn btn-primary" style="flex:1;" onclick="document.getElementById('stiks-intuition-modal').remove()">Отмена</button></div></div>`;
      document.body.appendChild(ov);
      document.getElementById('btn-peas-go').onclick = () => { ov.remove(); finishPeas(riskPct); };
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 6/8 — ЧАСТЬ 6В-1)
// Применение/надевание вещей equipFromInv, 7 карточек Позора и генератор лута
// ============================================================================
    COMMON_SHAME_CARDS: Array.of(
      { n: '🤡 Дуршлаг «Защита от 5G»', cat: 'talisman', slot: 'talisman', shame: true, rank: 1, d: 1, spi: -1, w: 0.4, desc: 'Дырявый дуршлаг (+1 защита, -1 Дух).' },
      { n: '🩲 Кружевные труселя СТИКСа', cat: 'talisman', slot: 'talisman', shame: true, rank: 1, agi: 1, spi: -2, w: 0.1, desc: 'Трофей из чемодана (+1 Ловкость, -2 Дух).' },
      { n: '🐰 Ободок с розовыми ушками', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spd: 2, spi: -2, w: 0.2, desc: 'Плюшевые ушки (+2 Скорость, -2 Дух).' },
      { n: '🦆 Надувной круг «Уточка»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, d: 4, agi: -1, w: 0.6, desc: 'Детский круг на поясе (+4 защита, -1 Ловкость).' },
      { n: '🍼 Слюнявчик «Мамин пирожок»', cat: 'talisman', slot: 'talisman', shame: true, rank: 3, end: 3, spi: -3, w: 0.2, desc: 'Клеёнчатый нагрудник (+3 Выносливость, -3 Дух).' },
      { n: '🔔 Ошейник с бубенчиком', cat: 'talisman', slot: 'talisman', shame: true, rank: 3, str: 4, spi: -3, w: 0.3, desc: 'Звенит при каждом шаге (+4 Сила, -3 Дух).' },
      { n: '👑 Корона из фольги «Царь Пекла»', cat: 'talisman', slot: 'talisman', shame: true, rank: 4, str: 5, end: 5, spi: -5, w: 0.3, desc: 'Мятая фольга (+5 Сила, +5 Вын, -5 Дух).' }
    ),

    genClusterItem(cat, domCal) {
      const s = this.db && this.db.session;
      const dk = String((s && s.diffKey) || 'start').toLowerCase();
      const minR = (dk === 'hell' || dk === 'far2') ? 4 : ((dk === 'hard' || dk === 'far1') ? 3 : ((dk === 'norm' || dk === 'easy') ? 2 : 1));
      const mult = Math.pow(1.6, Math.max(0, minR - 1));

      if (Math.random() < 0.14) {
        const ams = (this.getContent().ITEMS && this.getContent().ITEMS.shameAmulets) || Array.of();
        const pool = Array.of(...this.COMMON_SHAME_CARDS, ...ams);
        const pick = pool.at(Math.floor(Math.random() * pool.length));
        if (pick) return Object.assign({}, pick, { q: 1 });
      }
      const IT = this.getContent().ITEMS || {};
      if (cat === 'weapon') {
        const mPool = Array.isArray(IT.meleeWeapons) ? IT.meleeWeapons : Array.of();
        if (mPool.length && Math.random() < 0.35) {
          const mPick = mPool.find(w => w.rank === Math.min(5, minR)) || mPool.at(0);
          return Object.assign({}, mPick, { q: 1 });
        }
        const wPool = (IT.weapons || Array.of()).filter(w => (w.rank || 1) >= minR);
        const wList = wPool.length ? wPool : (IT.weapons || Array.of());
        if (wList.length) return Object.assign({}, wList.at(Math.floor(Math.random() * wList.length)), { q: 1 });
        return { n: '🔫 Пистолет ПМ', cat: 'side', slot: 'side', rank: 1, a: 7, cal: '9mm', w: 0.8, q: 1 };
      }
      if (cat === 'armor') {
        const aPool = (IT.armor || Array.of()).filter(a => (a.rank || 1) >= minR);
        const aList = aPool.length ? aPool : (IT.armor || Array.of());
        if (aList.length) return Object.assign({}, aList.at(Math.floor(Math.random() * aList.length)), { q: 1 });
        return { n: '🧥 Косуха рейдера', cat: 'armor', slot: 'armor', rank: 1, cls: 1, d: 5, w: 3.5, q: 1 };
      }
      const sPool = (IT.supply || Array.of()).filter(x => (x.rank || 1) >= minR);
      const sList = sPool.length ? sPool : (IT.supply || Array.of());
      if (sList.length) return Object.assign({}, sList.at(Math.floor(Math.random() * sList.length)), { q: 1 });
      return { n: '💊 Походная аптечка', cat: 'med', rank: 1, heal: 35, w: 0.4, q: 1 };
    },

    equipFromInv(idx) {
      const s = this.db && this.db.session;
      const p = s && s.players && s.players.at(s.activeIdx);
      if (!p || !Array.isArray(p.inv) || !p.inv.at(idx)) return;
      this.normalizePlayerStats(p);
      const it = p.inv.at(idx);
      const slot = this.detectSlot(it);
      const nm = String(it.n || it.name || 'Предмет');
      const low = nm.toLowerCase();

      if (slot === 'consumable_book') {
        p._manualBookRead = p.knowsSpores = p.sporeKnown = p.knowsRecipe = true;
        this.consumeInvOne(p, idx);
        this.grantActionXp(p, 'int', 0.5);
        this.syncHeroProfile(p); this.saveDB();
        this.log('📖 Изучено Руководство по выживанию в Улье! Открыт Споровый баланс и рецепт «Живчика».');
        this.renderGame(); return;
      }
      if (it.isAzamatOmelet || low.includes('омлет от азамата')) {
        this.consumeInvOne(p, idx);
        p.food = p.maxFood; p.hp = Math.min(p.maxHp, p.hp + 50);
        const up = this._boostRandomOpenedGift(p, 1);
        if (!up) {
          const nw = this._pickWeightedRootGift(p);
          if (nw) { p.gifts[nw.id] = { lvl: 1, level: 1, manaAnchor: this.calcAnchorMana(p, nw.mana1 || 0), branches: {} }; this.log(`🍳 Омлет пробудил Дар «${nw.name}» (1 ур.)!`); }
        } else {
          this.log(`🍳 Омлет от Азамата усвоен! Дар «${up.name}» → Ур.${up.lvl}!`);
        }
        this.recalcLevel(p); this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB(); this.renderGame(); return;
      }
      if (it.isPeas || low.includes('горох')) { this.useHivePeas(p, idx); return; }
      if (it.isZhivchik || low.includes('живчик')) { this.drinkZhivchik(); return; }
      if (it.pearl) { this.usePearl(p, it.pearl); this.consumeInvOne(p, idx); this.syncHeroProfile(p); this.saveDB(); this.renderGame(); return; }

      if (slot === 'consumable_med') {
        if (p.hp >= p.maxHp && !it.stamina) { this.log(`❤️ Здоровье уже полное (${p.hp}/${p.maxHp}).`); return; }
        const healAmt = Number(it.heal || it.hp || 35);
        p.hp = Math.min(p.maxHp, p.hp + healAmt);
        if (it.stamina) p.stamina = Math.min(p.maxStamina, p.stamina + Number(it.stamina));
        this.consumeInvOne(p, idx); this.syncHeroProfile(p); this.saveDB();
        this.log(`💊 Использовано [${nm}]: ОЗ +${healAmt} (${p.hp}/${p.maxHp}).`);
        this.renderGame(); return;
      }

      if (slot === 'consumable_other' || it.cat === 'supply' || it.slot === 'use') {
        const isInf = Boolean((p.asInfected || p.isInfected) && !p.isKvaz);
        const r = this.resolveItemRank(it);
        const pMult = r === 1 ? 1 : (r === 2 ? 5 : (r === 3 ? 25 : 125));
        if (it.food) {
          const fMult = (isInf && p.gifts && p.gifts.vaishnavism) ? 2 : 1;
          p.food = Math.min(p.maxFood, p.food + Number(it.food) * fMult);
          if (isInf) {
            if (p.gifts && p.gifts.vaishnavism) { this.grantActionXp(p, 'int', 0.25 * pMult); this.grantActionXp(p, 'spi', 0.25 * pMult); }
            else { this.grantActionXp(p, 'end', 0.25 * pMult); this.grantActionXp(p, 'str', 0.25 * pMult); }
          }
        }
        if (it.water) p.water = Math.min(p.maxWater, p.water + Number(it.water));
        if (it.stamina) p.stamina = Math.min(p.maxStamina, p.stamina + Number(it.stamina));
        if (it.spore) { p.spore = Math.min(p.maxSpore, p.spore + Number(it.spore)); p._manualBookRead = p.knowsSpores = p.knowsRecipe = true; }
        this.consumeInvOne(p, idx); this.syncHeroProfile(p); this.saveDB();
        this.log(`🎒 Использовано: ${nm}`);
        this.renderGame(); return;
      }

      if (slot && Object.prototype.hasOwnProperty.call(p.slots, slot)) {
        if (!this.canInfectedEquipItem(p, it)) {
          this.log('☣️ Запрет Улья: заражённый не может надеть это снаряжение без нужного Дара!'); return;
        }
        if (it.req && !this.canWearArchAmulet(p, it)) {
          const phrase = 'Не мой фасончик! Эта дичь для другого бойца!';
          this.log(`🚫 ${p.name} откладывает «${nm}»: ${phrase}`);
          this.speakPhrase(p, phrase); return;
        }
        if (slot === 'mod' && !p.slots.main && !p.slots.side) { this.log('🔧 Сначала наденьте огнестрел.'); return; }
        if (slot === 'meleeMod' && !p.slots.melee) { this.log('🧪 Сначала наденьте холодное оружие.'); return; }
        const old = p.slots[slot];
        const single = Object.assign({}, it, { q: 1, qty: 1 });
        this.consumeInvOne(p, idx);
        if (old) p.inv.push(old);
        p.slots[slot] = single;
        p.inv = this.stackInventory(p.inv);
        this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB();
        this.log(`🛡️ Экипировано: ${nm}`);
        this.renderGame();
      }
    },

    unequipSlot(slotKey) {
      const s = this.db && this.db.session;
      const p = s && s.players && s.players.at(s.activeIdx);
      if (!p || !p.slots || !p.slots[slotKey]) return;
      p.inv.push(p.slots[slotKey]);
      p.slots[slotKey] = null;
      p.inv = this.stackInventory(p.inv);
      this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB();
      this.renderGame();
    },

    dropItem(idx) {
      const s = this.db && this.db.session;
      const p = s && s.players && s.players.at(s.activeIdx);
      if (!p || !p.inv || !p.inv.at(idx)) return;
      p.inv.splice(idx, 1);
      this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB();
      this.renderGame();
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 6/8 — ЧАСТЬ 6В-2а)
// Окно экипировки renderEquipModal (11 слотов) и проверка привычек
// ============================================================================
    toggleProfile() { this.profileOpen = !this.profileOpen; if (this.profileOpen) this.invOpen = false; this.renderGame(); },
    toggleInv() { this.invOpen = !this.invOpen; if (this.invOpen) this.profileOpen = false; this.renderGame(); },

    useWeirdSkill() {
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players.at(s.activeIdx);
      if (!p) return;
      if (p.asInfected || p.isInfected) { this.log('☣️ Инстинкты Улья подавляют человеческие привычки.'); return; }
      const aInfo = this.getArchMeta(p.arch);
      if (this.isRealSkillUnlocked(p)) {
        this.log(`✨ Навык [${aInfo.skill}] раскрыт и готов к применению в бою.`);
        this.speakPhrase(p, aInfo.phrase || aInfo.skill);
      } else {
        this.log(`🤪 ${aInfo.hint || 'Персонаж прислушивается к себе.'} (проявится в бою)`);
        this.speakPhrase(p, aInfo.hint || 'Странное ощущение...');
      }
      this.renderGame();
    },

    renderEquipModal(p) {
      const carry = this.getCarryInfo(p);
      const rCols = { 1: '#9e9e9e', 2: '#3b82f6', 3: '#a855f7', 4: '#ef4444', 5: '#fbbf24' };
      const slotDefs = Array.of(
        Array.of('main', '🔫 Основное'), Array.of('side', '🔫 Доп./Щит'), Array.of('melee', '🔪 Холодное'),
        Array.of('mag', '📦 Обойма'), Array.of('mod', '🔭 Обвес'), Array.of('meleeMod', '🧪 Яд клинка'),
        Array.of('armor', '🛡️ Броня'), Array.of('clothes', '🧥 Одежда'), Array.of('boots', '👢 Обувь'),
        Array.of('bag', '🎒 Рюкзак'), Array.of('talisman', '🧿 Амулет')
      );
      let h = '<div style="position:fixed;inset:0;background:rgba(5,7,6,0.92);z-index:9100;display:flex;align-items:center;justify-content:center;padding:10px;">' +
        '<div style="width:100%;max-width:420px;max-height:92dvh;overflow-y:auto;border:1px solid #6e2626;background:#140e0e;padding:12px;border-radius:6px;">' +
        `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid #4a1c1c;padding-bottom:6px;"><b style="color:#d48a8a;">🎒 СНАРЯЖЕНИЕ (${carry.cur}/${carry.max} кг • ${carry.rawPct}%)</b><button class="btn btn-danger" style="width:auto;padding:4px 8px;font-size:11px;" onclick="STIKS.toggleInv()">✖</button></div>` +
        '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-bottom:8px;">';
      slotDefs.forEach(pair => {
        const sk = pair.at(0), lbl = pair.at(1), eq = p.slots && p.slots[sk];
        const r = eq ? this.resolveItemRank(eq) : 1;
        const eqTxt = eq ? `<b style="color:#f2dada;">${eq.n || eq.name}</b> <span style="color:${rCols[r]};">[P${r}]</span>` : '<span style="color:#6e5252;">пусто</span>';
        const btn = eq ? `<button class="btn" style="width:auto;padding:2px 5px;font-size:9px;margin-top:3px;" onclick="STIKS.unequipSlot('${sk}')">Снять</button>` : '';
        h += `<div style="background:#0d0909;border:1px solid #3d1c1c;padding:5px;border-radius:4px;font-size:10px;"><div><div style="color:#a87f7f;font-size:9px;">${lbl}</div><div>${eqTxt}</div></div>${btn}</div>`;
      });
      h += '</div><div style="font-size:11px;color:#d48a8a;font-weight:bold;margin-bottom:4px;">РЮКЗАК (' + p.inv.length + '):</div>';
      if (!p.inv.length) h += '<div style="color:#7a6060;font-size:11px;text-align:center;padding:6px 0;">Рюкзак пуст.</div>';
      else p.inv.forEach((it, idx) => {
        const r = this.resolveItemRank(it), sl = this.detectSlot(it);
        const canEq = this.canInfectedEquipItem(p, it);
        const actLabel = (sl && !sl.startsWith('consumable_')) ? (canEq ? 'Надеть' : '🔒 Запрет') : 'Исп.';
        h += `<div style="padding:4px 0;border-bottom:1px solid #2b1515;font-size:11px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span><b style="color:${rCols[r]};">[P${r}]</b> ${it.n || it.name}${(it.q || 1) > 1 ? ' x' + it.q : ''}</span><div style="display:flex;gap:4px;"><button class="btn btn-primary" ${!canEq ? 'disabled' : ''} style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.equipFromInv(${idx})">${actLabel}</button><button class="btn btn-danger" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.dropItem(${idx})">✖</button></div></div><div style="font-size:9.5px;color:#94a3b8;">${this.describeItem(it)}</div></div>`;
      });
      return h + '</div></div>';
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 6/8 — ЧАСТЬ 6В-2б1)
// Панель споранов, свита ИИ, встреча с выжившим и Личное дело renderGameExtras
// ============================================================================
    renderGameExtras(p, s, aInfo) {
      let h = '';
      const zCount = (p.inv || Array.of()).reduce((acc, it) => (it && (it.isZhivchik || String(it.n || '').toLowerCase().includes('живчик'))) ? acc + (Number(it.q) || 1) : acc, 0);
      const pend = Number(s.pendingSpores) || 0, isInf = Boolean((p.asInfected || p.isInfected) && !p.isKvaz);

      if (this.isRealSporeUnlocked(p) || isInf || pend > 0 || zCount > 0 || (p.spores || 0) > 0) {
        h += '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;background:#161111;border:1px solid #6e2626;padding:6px 8px;border-radius:4px;font-size:11px;">' +
          `<span>💎 Спораны: <b>${p.spores || 0}</b>${!isInf ? ` | 🧪 Живчик: <b>${zCount}</b>` : ''}</span><div style="display:flex;gap:4px;flex-wrap:wrap;">`;
        if (pend > 0 && (this.isRealSporeUnlocked(p) || isInf)) h += `<button class="btn btn-primary" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.collectSpores()">💎 Собрать (${pend})</button>`;
        if (isInf && p.lastKill) h += '<button class="btn btn-danger" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.devourEnemy()">🍖 Пожрать (1 ОХ)</button>';
        if (!isInf && this.isRealSporeUnlocked(p)) {
          h += '<button class="btn" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.craftAndDrinkZhivchik()">🧪 Живчик (1сп+алк)</button>';
          if (zCount > 0) h += `<button class="btn btn-primary" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.drinkZhivchik()">🥤 Выпить (${zCount})</button>`;
        }
        h += '</div></div>';
      }

      const sq = Array.isArray(p.escortSquad) ? p.escortSquad : Array.of();
      if (sq.length) {
        const itemsCnt = sq.reduce((sum, n) => sum + (n.loot || Array.of()).reduce((a, it) => a + (Number(it.q) || 1), 0), 0);
        h += `<div style="background:#132118;border:1px solid #4ade80;padding:5px 8px;border-radius:4px;font-size:10.5px;color:#bbf7d0;"><div style="display:flex;justify-content:space-between;"><b>🐕 Свита (${sq.length}/5)</b><span style="color:#fde047;">Добыча: ${itemsCnt} шт. (~${this._calcSquadReward(sq)} 💎)</span></div><div style="color:#86efac;">${sq.map(n => `${n.name}(Ур.${n.lvl})`).join(', ')}</div></div>`;
      }

      if (s.activeCarOwnerUid || s.activePackOwnerUid) {
        const lbl = s.activePackOwnerUid ? '🐾 Нагрузить носильщиков' : '📦 Выгрузить в машину';
        h += `<button class="btn" style="width:100%;padding:6px;border-color:#38bdf8;color:#bae6fd;font-weight:bold;" onclick="STIKS.openCarTrunkModal()">${lbl} (${this.getTrunkWeight(p)}/${p.carTrunkCap || 500} кг • 6 ОХ)</button>`;
      }

      if (s.humanEncounter) {
        const enc = s.humanEncounter;
        h += `<div style="position:fixed;inset:0;background:rgba(5,7,6,0.9);z-index:9200;display:flex;align-items:center;justify-content:center;padding:12px;"><div style="width:100%;max-width:360px;border:1px solid #c9a84c;background:#141712;padding:14px;border-radius:6px;text-align:center;">` +
          `<div style="color:#e6c86e;font-weight:bold;margin-bottom:8px;">🧑 ВСТРЕЧА: ${enc.name}</div><img src="${enc.img}" style="width:150px;height:170px;object-fit:cover;border-radius:6px;margin-bottom:8px;">` +
          `<div style="display:flex;gap:6px;"><button class="btn btn-danger" style="flex:1;" onclick="STIKS.resolveHumanEncounter('attack')">⚔️ Бой</button><button class="btn" style="flex:1;border-color:#4ade80;color:#86efac;" onclick="STIKS.resolveHumanEncounter('escort')">🤝 В свиту</button><button class="btn btn-primary" style="flex:1;" onclick="STIKS.resolveHumanEncounter('pass')">🚶 Мимо</button></div></div></div>`;
      }

      if (this.profileOpen) {
        const imgSrc = this.resolvePortrait(p);
        const stNames = { str: 'Сила', agi: 'Ловкость', spd: 'Скорость', end: 'Выносливость', int: 'Интеллект', spi: 'Дух' };
        let stHtml = '';
        Object.keys(stNames).forEach(sk => { stHtml += `<div>• ${stNames[sk]}: <b>${(p.lvl >= 5 || isInf) ? ((p.stats && p.stats[sk]) || 10) : '???'}</b></div>`; });
        let giftsHtml = '';
        Object.keys(p.gifts || {}).forEach(gid => {
          const gSt = p.gifts[gid], gMeta = this.getDarsMap()[gid] || { name: gid, desc: '' };
          giftsHtml += `<div style="margin-top:4px;color:#fbbf24;">★ ${gMeta.name} [Ур.${gSt.lvl || 1}] <span style="color:#cbd5e1;font-size:10px;">${gMeta.desc}</span></div>`;
          Object.keys(gSt.branches || {}).forEach(bk => {
            const bMeta = (gMeta.branches || Array.of()).find(b => b.id === bk) || { name: bk };
            giftsHtml += `<div style="margin-left:8px;color:#93c5fd;font-size:10px;">↳ ${bMeta.name} [Ур.${gSt.branches[bk].lvl || 1}]</div>`;
          });
        });
        h += `<div style="position:fixed;inset:0;background:rgba(5,7,6,0.9);z-index:9000;display:flex;align-items:center;justify-content:center;padding:12px;"><div style="width:100%;max-width:400px;max-height:90dvh;overflow-y:auto;border:1px solid #6e2626;background:#140e0e;padding:12px;border-radius:6px;">` +
          `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><b style="color:#d48a8a;">ЛИЧНОЕ ДЕЛО: ${p.name} (Ур.${p.lvl || 0})</b><button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="STIKS.toggleProfile()">✖</button></div>` +
          `<div style="text-align:center;margin-bottom:8px;"><img src="${imgSrc}" style="max-width:200px;max-height:240px;border-radius:6px;"><div style="color:#d48a8a;margin-top:4px;">${(p.lvl >= 2 || isInf) ? this.getHeroRoleTitle(p) : 'Роль раскроется на 2 уровне.'}</div></div>` +
          `<div>💎 Спораны: <b>${p.spores || 0}</b></div>${stHtml}${giftsHtml ? '<div style="margin-top:8px;padding:6px;background:#16101a;border:1px solid #6b3d82;border-radius:4px;"><b style="color:#e0b3ff;">🧬 Дары Улья:</b>' + giftsHtml + '</div>' : ''}</div></div>`;
      }

      if (this.invOpen) h += this.renderEquipModal(p);
      return h;
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 6/8 — ЧАСТЬ 6В-2б2)
// Тактический экран карты 11x11 renderGame
// ============================================================================
    renderMapGiftsBar(p) {
      const g = (p && p.gifts) || {};
      const btns = Array.of();
      if (g.healer) {
        btns.push('<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#4ade80;color:#86efac;" onclick="STIKS.useMapDar(\'heal\')">🌿 Знахарь: Лечить</button>');
        if (g.healer.branches && g.healer.branches.b1) btns.push('<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#4ade80;color:#86efac;" onclick="STIKS.useMapDar(\'emp\')">✨ +1 ур. Дару</button>');
      }
      if (g.clockstopper && g.clockstopper.branches && g.clockstopper.branches.b2) {
        btns.push('<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#facc15;color:#fef08a;" onclick="STIKS.useMapDar(\'leap\')">⏳ Скачок (+ОХ)</button>');
      }
      if (g.stealth || (g.hive_child && g.hive_child.branches && g.hive_child.branches.b1)) {
        btns.push('<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#94a3b8;color:#e2e8f0;" onclick="STIKS.useMapDar(\'stealth\')">👻 ' + (p.mapStealthOn ? 'Скрыт: ВКЛ' : 'Скрыт') + '</button>');
      }
      if (g.sense || (g.sonic && g.sonic.branches && g.sonic.branches.b2)) {
        btns.push('<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#38bdf8;color:#bae6fd;" onclick="STIKS.useMapDar(\'scan\')">📡 Пеленг/Эхо</button>');
      }
      if (g.tank && g.tank.branches && g.tank.branches.b3) {
        btns.push('<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#f97316;color:#fed7aa;" onclick="STIKS.useMapDar(\'ram\')">🚜 Таран преграды</button>');
      }
      if (!btns.length) return '';
      return '<div style="display:flex;flex-wrap:wrap;gap:4px;background:#16101c;border:1px solid #6b3d82;padding:5px 7px;border-radius:4px;">' + btns.join('') + '</div>';
    },

    useMapDar(act) {
      const s = this.db && this.db.session, p = s && s.players && s.players.at(s.activeIdx);
      if (!p || !p.gifts) return;
      const cost = Math.max(2, Math.round((p.maxMana || 20) * 0.2));
      if (act === 'heal' && p.gifts.healer) {
        if ((p._healerMapUses || 0) >= 5) { this.log('⚠️ Лимит лечения Знахаря (5/рейд) исчерпан.'); return; }
        if (p.mana < cost) { this.log('❌ Не хватает маны (' + cost + ').'); return; }
        p.mana -= cost; p._healerMapUses = (p._healerMapUses || 0) + 1;
        const pct = Math.min(1, 0.25 + ((p.gifts.healer.lvl || 1) - 1) * 0.025);
        const add = Math.max(5, Math.round(p.maxHp * pct));
        p.hp = Math.min(p.maxHp, p.hp + add);
        this.log('🌿 [Знахарь]: восстановлено +' + add + ' ОЗ (' + p.hp + '/' + p.maxHp + ').');
      } else if (act === 'emp' && p.gifts.healer) {
        if (p._healerEmpUsed) { this.log('⚠️ Мастер усиления уже применён в этом рейде.'); return; }
        if (p.mana < cost) { this.log('❌ Не хватает маны (' + cost + ').'); return; }
        p.mana -= cost; p._healerEmpUsed = true;
        const up = this._boostRandomOpenedGift(p, 1);
        this.log(up ? ('✨ [Мастер усиления]: Дар «' + up.name + '» повышен до Ур.' + up.lvl + '!') : '✨ Нет открытых Даров.');
      } else if (act === 'leap' && p.gifts.clockstopper) {
        if (p.mana < cost) { this.log('❌ Не хватает маны (' + cost + ').'); return; }
        p.mana -= cost;
        const addAp = Math.min(8, 2 + Math.floor((p.gifts.clockstopper.lvl || 1) / 5));
        p.stepsLeft += addAp;
        this.log('⏳ [Скачок без ОХ]: получено +' + addAp + ' ОХ!');
      } else if (act === 'stealth') {
        if (!p.mapStealthOn && p.mana < cost) { this.log('❌ Не хватает маны (' + cost + ').'); return; }
        if (!p.mapStealthOn) p.mana -= cost;
        p.mapStealthOn = !p.mapStealthOn;
        this.log(p.mapStealthOn ? '👻 [Скрыт] активирован — мутанты не замечают вас.' : '👻 [Скрыт] отключён.');
      } else if (act === 'scan') {
        if (p.mana < cost) { this.log('❌ Не хватает маны (' + cost + ').'); return; }
        p.mana -= cost;
        let rev = 0;
        (s.zombies || Array.of()).forEach(z => { if (Math.abs(z.x - p.x) <= 12 && Math.abs(z.y - p.y) <= 12 && z.hidden) { z.hidden = false; rev++; } });
        this.log('📡 [Пеленг / Эхолокатор]: в радиусе 12 кл. вскрыто засад: ' + rev + '!');
      } else if (act === 'ram' && p.gifts.tank) {
        if ((p._tankRams || 0) >= 3) { this.log('⚠️ Лимит тарана (3/рейд) исчерпан.'); return; }
        const dirs = Array.of(Array.of(0, -1), Array.of(1, 0), Array.of(0, 1), Array.of(-1, 0));
        let broken = null;
        for (let i = 0; i < 4; i++) {
          const nx = p.x + dirs.at(i).at(0), ny = p.y + dirs.at(i).at(1);
          if (nx >= 0 && nx <= 59 && ny >= 0 && ny <= 59 && s.grid.at(ny).at(nx).blocked) { broken = s.grid.at(ny).at(nx); break; }
        }
        if (!broken) { this.log('🚜 Рядом нет препятствия для тарана.'); return; }
        p._tankRams = (p._tankRams || 0) + 1; broken.blocked = false; broken.bType = null;
        this.log('🚜 [Танкам дорога не нужна]: препятствие проломлено (' + p._tankRams + '/3)!');
      }
      this.syncHeroProfile(p); this.saveDB(); this.renderGame();
    },

    renderGame() {
      this.ensureStaticLabels();
      const vp = document.getElementById('game-viewport'), s = this.db && this.db.session;
      if (!vp || !s) return;
      if (s.combat) { if (this.ambientAudio) this.ambientAudio.stop(); this.renderCombat(); return; }
      if (this.ambientAudio && !this.lobbyPaused) this.ambientAudio.playMode('raid');

      const p = s.players.at(s.activeIdx);
      if (!p) return;
      this.normalizePlayerStats(p);
      const carry = this.getCarryInfo(p), stepCost = this.getStepCost(p.moveMode || 'careful');
      const isInf = Boolean((p.asInfected || p.isInfected) && !p.isKvaz);
      const aInfo = this.getArchMeta(p.isKvaz ? 'kvaz' : (isInf ? 'infected' : p.arch));
      const skillLabel = isInf ? '☣️ Инстинкты Улья' : (this.isRealSkillUnlocked(p) ? `✨ ${aInfo.skill}` : '🤪 Что-то учудить');
      const sporeLabel = this.isRealSporeUnlocked(p) ? '☣️ Споровый баланс:' : '🤒 Загадочный недуг:';
      const bIcons = { 'Скала': '⛰️', 'Водоем': '🌊', 'Руины': '🏚️', 'Обрыв': '🕳️', 'Пожар': '🔥' };
      const lIcons = { weapon: '🔫', armor: '🛡️', supply: '🎒', azamat: '🍳' };

      let h = '<div style="display:flex;flex-direction:column;gap:8px;font-size:11px;">' +
        `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #6e2626;padding-bottom:4px;"><div><b>${p.family} ${p.name}</b> (Ур.${p.lvl || 0}) [${p.x + 1}:${p.y + 1}]</div><div style="display:flex;align-items:center;gap:6px;"><span>Ход:${s.turn} | ОХ:<b>${p.stepsLeft}/${p.maxAp}</b> <span style="color:#fbbf24;">(шаг:${stepCost})</span></span><button class="btn" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.pauseToLobby()">🏕 Лобби</button></div></div>` +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#140e0e;padding:6px;border:1px solid #6e2626;">' +
        `<div>❤️ ОЗ: <b>${p.hp}/${p.maxHp}</b></div><div>🍖 Сыт: <b>${p.food}</b></div><div>💧 Жаж: <b>${p.water}</b></div>` +
        `<div>⚡ Бодр: <b>${p.stamina}</b></div><div>${sporeLabel} <b>${Math.round(p.spore || 0)}</b></div><div>🔮 Мана: <b>${p.mana}/${p.maxMana}</b></div></div>` +
        '<div style="display:grid;grid-template-columns:repeat(11,1fr);gap:2px;background:#080a09;padding:4px;border:1px solid #6e2626;">';

      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const gx = p.x + dx, gy = p.y + dy;
          let bg = '#131815', sym = '', col = '#3d4f44', extra = '';
          if (gx < 0 || gx > 59 || gy < 0 || gy > 59) { bg = '#132419'; sym = '🚪'; col = '#6ee794'; extra = 'border:1px dashed #3d8b57;'; }
          else {
            const cell = s.grid.at(gy).at(gx);
            const zHere = s.zombies.find(z => z.x === gx && z.y === gy && !z.hidden);
            const pHere = s.players.find(pl => pl.x === gx && pl.y === gy && !pl.dead && !pl.escaped);
            if (pHere) {
              bg = pHere.towingCar ? '#3b2610' : (pHere.carryingCrown ? '#2b1236' : '#2d4a38');
              sym = pHere.towingCar ? (pHere.towingCar.ico || '🚗') : (pHere.carryingCrown ? '👑' : (isInf ? '☣️' : '🧍'));
              col = '#e6f5eb';
            } else if (zHere) { bg = zHere.isHuman ? '#2b2614' : '#3b1818'; sym = zHere.isHuman ? '🧑' : '🧟'; col = zHere.isHuman ? '#e6c86e' : '#ff7a7a'; }
            else if (cell.blocked) { bg = '#1f2421'; sym = bIcons[cell.bType] || '⛰️'; col = '#687a6e'; }
            else if (cell.isAzamatEaster) { bg = '#2b2110'; sym = '🍳'; extra = 'border:1px solid #f59e0b;'; }
            else if (cell.lootType) { bg = cell.valuable ? '#241c30' : '#18242b'; sym = cell.valuable ? '💎' : (lIcons[cell.lootType] || '📦'); col = cell.valuable ? '#c49eff' : '#7ab8e6'; }
          }
          h += `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:${bg};color:${col};font-size:11px;border-radius:2px;${extra}">${sym}</div>`;
        }
      }
      h += '</div>';

      const zOnCell = (s.zombies || Array.of()).find(z => z && z.x === p.x && z.y === p.y);
      if (zOnCell) h += '<button class="btn btn-danger" style="width:100%;padding:7px;font-weight:bold;" onclick="STIKS.attackCurrentCell()">⚔️ Напасть на цель на клетке</button>';

      h += `<div style="display:flex;gap:4px;"><button class="btn ${p.moveMode === 'careful' ? 'btn-primary' : ''}" style="font-size:10px;" onclick="STIKS.setMoveMode('careful')">Внимат. (3)</button><button class="btn ${p.moveMode === 'fast' ? 'btn-primary' : ''}" style="font-size:10px;" onclick="STIKS.setMoveMode('fast')">Быстро (2)</button><button class="btn ${p.moveMode === 'run' ? 'btn-primary' : ''}" style="font-size:10px;" onclick="STIKS.setMoveMode('run')">Бегом (1)</button></div>` +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;"><div></div><button class="btn" onclick="STIKS.stepPlayer(0,-1)">⬆</button><div></div><button class="btn" onclick="STIKS.stepPlayer(-1,0)">⬅</button><button class="btn btn-primary" onclick="STIKS.searchCell(false)">🔍 Поиск (3)</button><button class="btn" onclick="STIKS.stepPlayer(1,0)">➡</button><div></div><button class="btn" onclick="STIKS.stepPlayer(0,1)">⬇</button><div></div></div>' +
        `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;"><button class="btn" onclick="STIKS.toggleInv()">🎒 Вещи (${p.inv.length} • ${carry.rawPct}%)</button><button class="btn" onclick="STIKS.useWeirdSkill()">${skillLabel}</button><button class="btn" onclick="STIKS.toggleProfile()">👤 Параметры</button><button class="btn btn-primary" onclick="STIKS.nextTurn()">⏭ Конец хода</button></div>`;
      h += this.renderMapGiftsBar(p);
      h += this.renderGameExtras(p, s, aInfo);
      vp.innerHTML = h + '</div>';
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 7/8 — ЧАСТЬ 7А-1)
// Встреча с угрозой на карте triggerEncounter (дубли 1-1 / 6-6 и Скреббер)
// ============================================================================
    attackCurrentCell() {
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players.at(s.activeIdx);
      const zHere = (s.zombies || Array.of()).find(z => z && z.x === p.x && z.y === p.y);
      if (!zHere) { this.log('👀 На текущей клетке нет противников.'); return; }
      zHere.hidden = false;
      if (zHere.isHuman) zHere.hostile = true;
      this.triggerEncounter(p, zHere);
    },

    triggerEncounter(p, zMarker) {
      const s = this.db.session;
      if (zMarker && zMarker.isHuman && !zMarker.hostile) {
        const aInfo = this.getArchMeta(zMarker.arch);
        s.humanEncounter = { zId: zMarker.id, arch: zMarker.arch || 'kachok', name: aInfo.name, img: aInfo.img || 'img/kachok.jpeg', lvl: Math.max(1, (p.lvl || 0) + 1) };
        this.log(`🧑 Встречен неагрессивный выживший: ${s.humanEncounter.name}.`);
        this.saveDB(); this.renderGame(); return;
      }

      const dQty = Math.floor(Math.random() * 6) + 1, dRank = Math.floor(Math.random() * 6) + 1;
      if (dQty === dRank) this.playDoubleSound();

      if (dQty === 6 && dRank === 6) {
        s.zombies = s.zombies.filter(z => z.id !== zMarker.id);
        const dk = String(s.diffKey || 'start').toLowerCase();
        const topR = dk === 'easy' ? 5 : ((dk === 'norm' || dk === 'junkyard' || dk === 'cemetery') ? 6 : ((dk === 'hard' || dk === 'far1') ? 7 : ((dk === 'hell' || dk === 'far2') ? (Math.random() < 0.7 ? 8 : 9) : 4)));
        const rInfo = this.getZRanks().at(topR) || { name: 'Лотерейщик' };
        const spGain = Math.pow(4, Math.max(0, topR - 3));
        const peasGain = topR === 4 ? 1 : (2 * Math.pow(4, Math.max(0, topR - 5)));
        s.pendingSpores = (Number(s.pendingSpores) || 0) + spGain;
        p.inv.push({ n: '🫛 Горох Улья (субстрат)', cat: 'supply', slot: 'use', isPeas: true, rank: 2, w: 0, q: peasGain });
        if (topR === 7) p.inv.push({ n: '⚫ Чёрный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'black', rank: 3, w: 0.1, q: 1 });
        else if (topR === 8) p.inv.push({ n: '🔴 Красный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'red', rank: 3, w: 0.1, q: 1 });
        else if (topR >= 9) p.inv.push({ n: '⚪ Белый жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'white', rank: 4, w: 0.1, q: 1 });
        p.inv = this.stackInventory(p.inv); this.syncHeroProfile(p); this.saveDB();
        this.log(`🎁 ДУБЛЬ «6-6»! Найден мёртвый старший мутант (<b>${rInfo.name}</b>): на теле ${spGain} 💎, Горох ×${peasGain}` + (topR >= 7 ? ' и Жемчуг Улья!' : '!'));
        this.renderGame(); return;
      }

      const isOneOne = (dQty === 1 && dRank === 1);
      const isHell = (s.diffKey === 'hell' || s.diffKey === 'far2');
      const finalRank = isOneOne ? (isHell ? 9 : 4) : (dRank + (s.diffMod || 0) + (zMarker.rankMod || 0));
      if (finalRank <= -1) {
        this.log('💀 Встреченный заражённый уже мёртв.');
        s.zombies = s.zombies.filter(z => z.id !== zMarker.id);
        this.saveDB(); this.renderGame(); return;
      }

      const count = isOneOne ? 1 : dQty;
      const ranks = this.getZRanks();
      const enemies = Array.of();
      for (let i = 0; i < count; i++) {
        const rNum = Math.min(9, Math.max(0, i === 0 ? finalRank : Math.max(0, finalRank - 1)));
        const rInfo = ranks.at(rNum) || ranks.at(0);
        const isScrub = Boolean(isOneOne && isHell && i === 0);
        const mult = isScrub ? 1.5 : 1.0;
        let lvl = rNum === 0 ? 0 : Math.round((Math.floor(Math.random() * (rInfo.maxLvl - rInfo.minLvl + 1)) + rInfo.minLvl) * mult);
        if (isOneOne && rNum === 4) lvl = Math.max(20, lvl);
        enemies.push({
          name: isScrub ? '👑 Скреббер' : (rInfo.name + (count > 1 ? ' #' + (i + 1) : '')),
          rank: rNum, lvl, isScrubber: isScrub, img: rInfo.img,
          hp: Math.round(rInfo.hp * mult), maxHp: Math.round(rInfo.hp * mult),
          dmg: Math.round(rInfo.dmg * mult), agi: Math.round(rInfo.agi * mult),
          isHuman: Boolean(zMarker && zMarker.isHuman)
        });
      }

      s.combat = { zId: zMarker.id, enemies };
      global.STIKS_COMBAT_CORE.startFromHero(p, enemies, zMarker.id);
      this.log(`⚔️ БОЙ! Противников: ${enemies.length} (Лидер: ${enemies.at(0).name}, Ур.${enemies.at(0).lvl})`);
      this.renderCombat();
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 7/8 — ЧАСТЬ 7А-2)
// Итоги боя (_onBsimVictory, _onBsimDefeat), побег combatFlee и выход из боя
// ============================================================================
    _onBsimVictory(st) {
      const s = this.db && this.db.session, p = st && st.player && st.player.heroRef;
      if (!s || !p) return;
      const enemies = st.enemies || Array.of(), lead = enemies.at(0) || { rank: 0, lvl: 0, isHuman: false };
      s.zombies = (s.zombies || Array.of()).filter(z => z.id !== st.zId);
      p._raidKills = (Number(p._raidKills) || 0) + enemies.length;
      p.lastKill = { rank: lead.rank || 0, isHuman: Boolean(lead.isHuman) };

      const ranks = this.getZRanks();
      let spDrop = 0, webDrop = 0, peasDrop = 0, blackP = 0, redP = 0, whiteP = 0;
      enemies.forEach(en => {
        if (en.isHuman) return;
        const r = Math.max(0, Number(en.rank) || 0);
        const rMeta = ranks.at(r) || { minLvl: 0 };
        const mult = ((Number(en.lvl) || 0) > (Number(rMeta.minLvl) || 0) && Math.random() < 0.30) ? 1.5 : 1.0;
        if (r < 2) webDrop += Math.ceil((Math.floor(Math.random() * 2) + 1) * mult);
        else if (r === 2) { webDrop += 1; spDrop += Math.ceil(1 * mult); }
        else {
          spDrop += Math.ceil(Math.pow(4, r - 3) * mult);
          if (r === 4 && Math.random() < 0.50) peasDrop += Math.ceil(1 * mult);
          else if (r >= 5) peasDrop += Math.ceil((2 * Math.pow(4, r - 5)) * mult);
          if (r === 7) blackP += Math.ceil(1 * mult);
          else if (r >= 8) { const vb = Math.ceil(2 * mult); redP += Math.floor(vb / 2); blackP += (vb % 2); }
          if (en.isScrubber) whiteP += 1;
          else if (r >= 9 && Math.random() < 0.15) whiteP += 1;
        }
      });

      if (spDrop > 0) s.pendingSpores = (Number(s.pendingSpores) || 0) + spDrop;
      if (webDrop > 0) p.inv.push({ n: '🕸️ Паутина Улья', cat: 'supply', slot: 'use', isWeb: true, rank: 1, w: 0, q: webDrop });
      if (peasDrop > 0) p.inv.push({ n: '🫛 Горох Улья (субстрат)', cat: 'supply', slot: 'use', isPeas: true, rank: 2, w: 0, q: peasDrop });
      if (blackP > 0) p.inv.push({ n: '⚫ Чёрный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'black', rank: 3, w: 0.1, q: blackP });
      if (redP > 0) p.inv.push({ n: '🔴 Красный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'red', rank: 3, w: 0.1, q: redP });
      if (whiteP > 0) p.inv.push({ n: '⚪ Белый жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'white', rank: 4, w: 0.1, q: whiteP });

      const maxEnLvl = Math.max.apply(null, enemies.map(e => Number(e.lvl) || 0));
      if ((p.asInfected || p.isInfected) && !p.isKvaz && (maxEnLvl - (p.lvl || 0)) >= 15 && Math.random() < 0.5) {
        if (Math.random() < 0.5) { p.asInfected = p.isInfected = false; if (p.origArch && p.origArch !== 'infected') p.arch = p.origArch; this.log(`✨ ПРОЗРЕНИЕ УЛЬЯ! ${p.name} вернул облик человека!`); }
        else { p.isKvaz = true; this.log(`👹 ПРОЗРЕНИЕ УЛЬЯ! ${p.name} эволюционировал в разумного Кваза!`); }
      }
      p.inv = this.stackInventory(p.inv);
      this.recalcLevel(p); this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB();
      this.log(`🏆 Победа! Врагов: ${enemies.length}${spDrop > 0 ? ` | На клетке: ${spDrop} 💎` : ''}.`);
    },

    _onBsimDefeat(st) {
      const p = st && st.player && st.player.heroRef;
      if (!p) return;
      if (!p.asInfected && p.arch === 'cashier' && !st.cashierSaved) {
        st.cashierSaved = true; st.finished = false;
        p.hp = st.player.hp = Math.max(1, Math.round(p.maxHp * 0.25));
        p._skillSuccessUsed = p.skillUnlocked = p.skillRevealed = true;
        this.log('🧾 Галя, у нас отмена! Кассирша отменила смертельный удар и осталась в строю!');
        global.BSIM_UI.renderStage(); return;
      }
      p.dead = true; p.status = 'dead';
      this.syncHeroProfile(p); this.saveDB();
      this.log(`💀 ${p.name} пал в бою.`);
    },

    combatFlee() {
      const s = this.db && this.db.session, st = global.STIKS_COMBAT_CORE.state;
      if (!s || !st || st.busy || st.finished) return;
      const p = s.players.at(s.activeIdx);
      const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
      if (d1 === d2) this.playDoubleSound();
      if (d1 + d2 + Math.floor((p.stats.spd || 10) / 10) >= 9) {
        this.log(`🏃 Успешный побег [${d1}+${d2}]!`);
        s.combat = null; global.STIKS_COMBAT_CORE.state = null;
        this.saveDB(); this.renderGame();
      } else {
        global.BSIM_UI.log(`❌ Побег сорвался [${d1}+${d2}]! Враги атакуют!`);
        st.busy = true; global.BSIM_UI.runEnemiesTurn();
      }
    },

    closeCombatModal() {
      const s = this.db && this.db.session, st = global.STIKS_COMBAT_CORE.state;
      if (!s) return;
      const wasFarRoad = Boolean(s.isFarRoadBattle || s.isFarNestRoad);
      const ownerUid = s.activeCarOwnerUid || s.activePackOwnerUid;
      if (st && st.player && st.player.heroRef) {
        const h = st.player.heroRef;
        h.hp = Math.max(0, Number(st.player.hp) || 0);
        h.mana = Math.max(0, Number(st.player.mana) || 0);
        this.syncHeroProfile(h);
      }
      s.combat = null; global.STIKS_COMBAT_CORE.state = null;
      this.saveDB();
      if (wasFarRoad) {
        this.db.session = null;
        if (s.isFarNestRoad) { const ow = this.findHeroByUid(ownerUid); if (ow) { ow.inFarNest = true; this.saveDB(); this.openFarNest(ownerUid); } }
        else { const ow = this.findHeroByUid(ownerUid); if (ow) { ow.inFarSettlement = true; this.saveDB(); this.openFarSettlement(ownerUid); } }
        return;
      }
      this.renderGame();
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 7/8 — ЧАСТЬ 7Б)
// Дорожный таран и анимация залпа «Корда» (10с) / «Ракет» (15с) / «Стаи»
// ============================================================================
    checkCarRoadRam(unitObj, enemyRank) {
      if (!unitObj) return false;
      const lvl = Math.max(0, Math.min(4, Number(unitObj.armorLvl || 0)));
      const maxRam = Math.min(7, lvl === 4 ? 7 : lvl * 2);
      return Number(enemyRank || 0) <= maxRam;
    },

    playSupportFunnySfx(isPack, isHeavy) {
      const ctx = this._getAudioCtx();
      const shouts = Array.of('🐱 МЯУ-РРР!', '💦 ШМЯК!', '🫧 ПЛЮХ!', '🤪 КОСЯК!');
      const shout = shouts.at(Math.floor(Math.random() * shouts.length));
      if (!ctx) return shout;
      const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      if (isPack) {
        o.type = shout.includes('МЯУ') ? 'triangle' : 'sawtooth';
        o.frequency.setValueAtTime(shout.includes('МЯУ') ? 340 : 190, now);
        o.frequency.exponentialRampToValueAtTime(shout.includes('МЯУ') ? 620 : 45, now + 0.25);
      } else {
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(isHeavy ? 130 : 280, now);
        o.frequency.exponentialRampToValueAtTime(38, now + (isHeavy ? 0.35 : 0.14));
      }
      g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.37);
      return shout;
    },

    playCarWeaponStrike(unitObj, enemies, onDone) {
      const w = unitObj && unitObj.weapon;
      if (!w || !Array.isArray(enemies) || !enemies.length) { if (onDone) onDone({ killed: 0, damaged: 0, stunned: 0 }); return; }
      const isPack = Boolean(w.id === 'fierce_pack' || w.id === 'alpha_titan');
      const isHeavy = Boolean((w.durSec || 10) >= 15);
      const stepMs = 650, ticks = Math.max(4, Math.floor(((w.durSec || 10) * 1000) / stepMs));

      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(6,4,8,0.95);z-index:9990;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#fff;';
      ov.innerHTML = `<div style="width:100%;max-width:400px;background:#191018;border:2px solid #ef4444;border-radius:10px;padding:14px;text-align:center;">` +
        `<div style="color:#fde047;font-weight:bold;font-size:13px;margin-bottom:8px;">${w.name}</div>` +
        `<div id="stiks-sup-shout" style="font-size:20px;color:#ff8a8a;margin:12px 0;font-weight:bold;">${isPack ? '🐱 МЯУ-РРР!' : '💥 ОГОНЬ!'}</div>` +
        `<div style="width:100%;height:8px;background:#291518;border-radius:4px;overflow:hidden;"><div id="stiks-sup-bar" style="width:0%;height:100%;background:#ef4444;"></div></div></div>`;
      document.body.appendChild(ov);

      let t = 0;
      const tm = setInterval(() => {
        t++;
        const shout = this.playSupportFunnySfx(isPack, isHeavy);
        const sEl = document.getElementById('stiks-sup-shout'), bEl = document.getElementById('stiks-sup-bar');
        if (sEl) sEl.textContent = isPack ? shout : (isHeavy ? `🚀 ЗАЛП #${t}/${ticks}!` : `🔥 ОЧЕРЕДЬ #${t}/${ticks}!`);
        if (bEl) bEl.style.width = Math.min(100, Math.round((t / ticks) * 100)) + '%';
        if (t >= ticks) {
          clearInterval(tm);
          const alive = enemies.filter(e => !e.dead && Number(e.rank || 0) <= (w.maxRank || 8));
          let killed = 0, damaged = 0;
          if (alive.length > 0) {
            if (Math.random() < 0.50) {
              const trg = alive.slice().sort((a, b) => Number(b.rank || 0) - Number(a.rank || 0)).at(0);
              if (trg) { trg.hp = 0; trg.dead = true; killed = 1; }
            } else {
              alive.forEach(en => { en.hp = Math.max(1, (en.hp || 10) - Math.max(1, Math.round((en.maxHp || en.hp || 50) * 0.30))); damaged++; });
            }
          }
          const stun = Number(w.stunTurns || 0);
          if (stun > 0) enemies.filter(e => !e.dead).forEach(en => { en.stun = Math.max(en.stun || 0, stun); });
          setTimeout(() => { if (ov.parentNode) ov.remove(); if (onDone) onDone({ killed, damaged, stunned: stun }); }, 350);
        }
      }, stepMs);
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 7/8 — ЧАСТЬ 7В-1)
// Боевое ядро STIKS_COMBAT_CORE (смена оружия 0 ОХ, ранги, статы) и BSIM_AUDIO
// ============================================================================
    renderCombat() {
      this.ensureStaticLabels();
      if (global.BSIM_UI && typeof global.BSIM_UI.renderStage === 'function') global.BSIM_UI.renderStage();
    }
  };

  function buildCombatWeap(wObj, slotKey, hero) {
    if (!wObj) return null;
    const isGun = Boolean(slotKey === 'main' || slotKey === 'side' || wObj.cal);
    const modAdd = (isGun && hero.slots.mod) ? Number(hero.slots.mod.a || hero.slots.mod.rank || 2) : 0;
    const poiAdd = (!isGun && hero.slots.meleeMod) ? Number(hero.slots.meleeMod.poison || hero.slots.meleeMod.a || 3) : 0;
    const mult = isGun ? 0.5 : 0.65;
    return {
      name: wObj.n || wObj.name, cls: STIKS.resolveItemRank(wObj),
      dmg: Math.max(2, Math.round((Number(wObj.a || wObj.dmg || 4) + modAdd + poiAdd) * mult)),
      isGun, sound: isGun ? 'Тра-та-та!' : 'Хрясь!', sfx: isGun ? 'gun' : 'melee'
    };
  }

  if (!global.STIKS_COMBAT_CORE) global.STIKS_COMBAT_CORE = {
    state: null,
    calcMana(m1, m30, lvl) {
      if (!m1 && !m30) return 0;
      return Math.max(0, Math.round(m1 - (m1 - m30) * ((Math.max(1, Math.min(30, lvl)) - 1) / 29)));
    },
    getPlayerRankByLvl(lvl) { return STIKS.getPlayerRankByLvl(lvl); },
    getMult(wCls, eRank) {
      const rMap = { 1: 1, 2: 2, 3: 3, 4: 3.5, 5: 4 };
      const ew = rMap[Math.max(1, Math.min(5, Math.round(wCls || 1)))] || 1;
      const ee = Math.min(4, 1 + Math.floor((Number(eRank) || 0) / 2));
      const d = ew - ee;
      if (ew <= 1) return 1;
      if (d > 0) return Number((1.5 + d * 0.45).toFixed(2));
      return d === 0 ? Number((1.25 + (ew - 1) * 0.15).toFixed(2)) : Math.max(0.75, Number((1 + d * 0.15).toFixed(2)));
    },
    grantCombatXp(statKey, baseDelta) {
      const p = this.state && this.state.player;
      if (!p || !p.heroRef) return 0;
      const g = STIKS.grantActionXp(p.heroRef, statKey, baseDelta);
      p.hp = p.heroRef.hp; p.maxHp = p.heroRef.maxHp; p.mana = p.heroRef.mana; p.maxMana = p.heroRef.maxMana;
      p.lvl = p.heroRef.lvl; p.rank = this.getPlayerRankByLvl(p.lvl);
      return g;
    },
    startFromHero(hero, enemiesRaw, zId) {
      const realHero = Array.isArray(hero) ? hero.at(0) : hero;
      STIKS.normalizePlayerStats(realHero);
      const isInf = Boolean((realHero.asInfected || realHero.isInfected) && !realHero.isKvaz);
      const archKey = realHero.isKvaz ? 'kvaz' : (isInf ? 'infected' : (realHero.arch || 'kachok'));
      const arch = STIKS.getArchMeta(archKey), lvl = Math.max(0, Number(realHero.lvl) || 0), pRank = this.getPlayerRankByLvl(lvl);

      const gunSlot = realHero.slots.main ? 'main' : (realHero.slots.side && !/щит/.test(String(realHero.slots.side.n || '').toLowerCase()) ? 'side' : null);
      const gunW = gunSlot ? buildCombatWeap(realHero.slots[gunSlot], gunSlot, realHero) : null;
      const melW = realHero.slots.melee ? buildCombatWeap(realHero.slots.melee, 'melee', realHero) : null;
      const claws = { name: isInf ? 'Когти Улья' : 'Кулаки', cls: isInf ? Math.max(1, Math.min(4, 1 + Math.floor(lvl / 15))) : 1, dmg: isInf ? (6 + Math.floor(lvl * 1.2)) : 4, isGun: false, sound: isInf ? 'РРР-ЦАП!' : 'Дыщ!', sfx: 'melee' };
      const weap = gunW || melW || claws;
      const altWeap = (gunW && melW) ? melW : null;

      const sideSh = (realHero.slots.side && /щит/.test(String(realHero.slots.side.n || '').toLowerCase())) ? Number(realHero.slots.side.d || 5) : 0;
      const armFlat = (realHero.slots.armor ? Number(realHero.slots.armor.d || 5) : 0) + (realHero.slots.clothes ? Number(realHero.slots.clothes.d || 2) : 0) + sideSh;
      const learned = Array.of();
      Object.keys(realHero.gifts || {}).forEach(gid => {
        const gSt = realHero.gifts[gid], gMeta = STIKS.getDarsMap()[gid];
        if (!gSt || !gMeta) return;
        learned.push({ darKey: gid, branchId: '', lvl: Number(gSt.lvl || 1), manaAnchor: gSt.manaAnchor || 0, charges: 0, maxCharges: 0, usedRound: false });
        Object.keys(gSt.branches || {}).forEach(bk => {
          const bSt = gSt.branches[bk], bMeta = (gMeta.branches || Array.of()).find(b => b.id === bk);
          if (bSt && bMeta) learned.push({ darKey: gid, branchId: bk, lvl: Number(bSt.lvl || 1), manaAnchor: bSt.manaAnchor || 0, charges: 0, maxCharges: 0, usedRound: false });
        });
      });

      const ranks = STIKS.getZRanks();
      const enemies = (enemiesRaw || Array.of()).map((en, idx) => {
        const rNum = Math.max(0, Math.min(9, Number(en.rank) || 0)), zInfo = ranks.at(rNum) || ranks.at(0) || { hp: 12, dmg: 2 };
        const dist = weap.isGun ? Math.max(0, 2 + (pRank - rNum)) : 0;
        return { id: 'en_' + idx, name: en.name || zInfo.name, rank: rNum, lvl: en.lvl || 0, img: en.img || zInfo.img || 'img/Z_01.png', dist, maxDist: Math.max(1, dist), hp: en.hp || zInfo.hp, maxHp: en.maxHp || zInfo.hp, dmg: en.dmg || zInfo.dmg, sound: zInfo.sound || 'Царап!', sfx: zInfo.sfx || 'bite', stun: 0, debuff: 0, dead: false, isHuman: Boolean(en.isHuman), isScrubber: Boolean(en.isScrubber) };
      });
      const pImg = (realHero.isLegendary && !isInf && !realHero.isKvaz) ? (STIKS.isFem(realHero) ? 'img/LG_battle.png' : 'img/LM_battle.png') : STIKS.resolvePortrait(realHero);
      this.state = { mode: 'game', zId, round: 1, busy: false, finished: false, activeId: '', player: { heroRef: realHero, name: realHero.isLegendary ? ('👑 ' + realHero.name) : realHero.name, arch: archKey, archKey, ico: arch.ico || '✨', lvl, rank: pRank, img: pImg, hp: realHero.hp, maxHp: realHero.maxHp, mana: realHero.mana, maxMana: realHero.maxMana, stats: realHero.stats, weap, altWeap, armFlat, skill: arch.skill, skillType: arch.skillType || 'active', skillUsed: false, phrase: arch.phrase, learned, shieldHits: 0, buff: 1 }, enemies };
      return this.state;
    }
  };

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 7/8 — ЧАСТЬ 7В-2а)
// Боевой аудио-движок BSIM_AUDIO и базовые методы сцены BSIM_UI
// ============================================================================
  global.BSIM_AUDIO = {
    bgmOn: false, bgmTimer: null, stepIdx: 0, trackIdx: 0,
    TRACKS: Array.of(
      { name: 'Пас-дам-бас', ms: 195, notes: Array.of(110, 130.8, 98, 0, 146.8, 164.8, 130.8, 0) },
      { name: 'Пульс Улья', ms: 215, notes: Array.of(82.4, 82.4, 98, 110, 0, 82.4, 123.5, 116.5) },
      { name: 'Carry On Wayward Son', ms: 185, notes: Array.of(220, 196, 220, 164.8, 196, 164.8, 146.8, 0) },
      { name: 'Калинка-Малинка', ms: 155, notes: Array.of(246.9, 220, 185, 196, 220, 185, 196, 164.8) },
      { name: 'Группа крови (Кино)', ms: 205, notes: Array.of(220, 220, 246.9, 261.6, 246.9, 220, 196, 164.8) },
      { name: 'Имперский марш', ms: 230, notes: Array.of(196, 196, 196, 155.6, 233.1, 196, 155.6, 196) }
    ),
    ensureCtx() { return STIKS._getAudioCtx(); },
    nextTrack() { this.trackIdx = (this.trackIdx + 1) % this.TRACKS.length; this.stepIdx = 0; if (this.bgmOn) this.startLoop(); if (global.BSIM_UI) global.BSIM_UI.renderStage(); },
    toggleBgm() { this.bgmOn = !this.bgmOn; if (this.bgmOn) { this.stepIdx = 0; this.startLoop(); } else if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; } if (global.BSIM_UI) global.BSIM_UI.renderStage(); },
    startLoop() {
      if (this.bgmTimer) clearInterval(this.bgmTimer);
      const tr = this.TRACKS.at(this.trackIdx) || this.TRACKS.at(0);
      this.bgmTimer = setInterval(() => {
        if (!this.bgmOn) return;
        const c = this.ensureCtx(), cur = this.TRACKS.at(this.trackIdx) || tr;
        const f = cur.notes.at(this.stepIdx++ % cur.notes.length);
        if (c && f > 0) {
          const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
          o.type = 'triangle'; o.frequency.setValueAtTime(f, now);
          g.gain.setValueAtTime(0.04, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + 0.17);
        }
      }, tr.ms || 190);
    },
    playSfx(kind) {
      const c = this.ensureCtx(); if (!c) return;
      const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = kind === 'shout' || kind === 'dar' ? 'triangle' : 'sawtooth';
      o.frequency.setValueAtTime(kind === 'shout' ? 440 : (kind === 'card' ? 920 : 260), now);
      o.frequency.exponentialRampToValueAtTime(kind === 'shout' ? 660 : 65, now + 0.14);
      g.gain.setValueAtTime(0.13, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + 0.16);
    }
  };

  if (!global.BSIM_UI) global.BSIM_UI = {
    wait(ms) { return new Promise(res => setTimeout(res, ms)); },
    log(html) {
      const feed = document.getElementById('sim-feed');
      if (!feed) return;
      const d = document.createElement('div');
      d.style.cssText = 'padding:2px 0;border-bottom:1px dashed #1f1212;';
      d.innerHTML = html; feed.appendChild(d); feed.scrollTop = feed.scrollHeight;
    },
    showSkillBanner(ico, title, shout) {
      const layer = document.getElementById('stage-floats'); if (!layer) return;
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:80%;background:rgba(18,12,28,0.95);border:2px solid #a855f7;border-radius:8px;padding:8px;text-align:center;z-index:8;color:#f3e8ff;';
      el.innerHTML = `<div style="font-size:20px;">${ico}</div><div style="font-weight:bold;font-size:12px;">${title}</div><div style="font-size:10px;color:#d8b4fe;">«${shout}»</div>`;
      layer.appendChild(el); setTimeout(() => { if (el.parentNode) el.remove(); }, 1500);
    },
    popBack(unitDomId, isLeft, txt) {
      const layer = document.getElementById('stage-floats'), unit = document.getElementById(unitDomId), stage = document.getElementById('combat-stage');
      if (!layer || !unit || !stage) return;
      const uR = unit.getBoundingClientRect(), sR = stage.getBoundingClientRect();
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;font-weight:bold;font-size:10px;padding:1px 4px;border-radius:3px;background:rgba(0,0,0,0.8);color:#fff;';
      el.textContent = txt; el.style.top = Math.max(18, Math.round(uR.top - sR.top - 4)) + 'px';
      if (isLeft) el.style.left = '10px'; else el.style.right = '10px';
      layer.appendChild(el); setTimeout(() => { if (el.parentNode) el.remove(); }, 1300);
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 7/8 — ЧАСТЬ 7В-2б)
// Логика боевого раунда: смена оружия 0 ОХ, атака 2d6, навыки, Дары и враги
// ============================================================================
    getTargetsPool() {
      const st = global.STIKS_COMBAT_CORE.state;
      const alive = (st && st.enemies || Array.of()).filter(e => !e.dead);
      if (!alive.length) return Array.of();
      const sorted = alive.slice().sort((a, b) => a.dist - b.dist);
      if (!st.player.weap.isGun) {
        const close = sorted.filter(e => e.dist <= 0);
        return close.length ? close : sorted.slice(0, 1);
      }
      return sorted;
    },
    checkBattleEnd() {
      const st = global.STIKS_COMBAT_CORE.state;
      if (!st || st.finished) return false;
      if (!st.enemies.filter(e => !e.dead).length) {
        st.finished = true; st.busy = false; st.activeId = '';
        this.log('🏆 <b>ПОБЕДА!</b> Все противники уничтожены!');
        this.renderStage(); STIKS._onBsimVictory(st); return true;
      }
      if (st.player.hp <= 0) {
        st.finished = true; st.busy = false; st.activeId = '';
        this.log('💀 <b>ПОРАЖЕНИЕ!</b> ' + st.player.name + ' пал в бою.');
        this.renderStage(); STIKS._onBsimDefeat(st); return true;
      }
      return false;
    },
    switchWeapon() {
      const st = global.STIKS_COMBAT_CORE.state, p = st && st.player;
      if (!st || !p || st.busy || st.finished || !p.altWeap) return;
      const tmp = p.weap; p.weap = p.altWeap; p.altWeap = tmp;
      this.log(`🔄 Смена оружия (0 ОХ): в руках <b>${p.weap.name}</b>!`);
      this.renderStage();
    },
    async actAttack() {
      const st = global.STIKS_COMBAT_CORE.state;
      if (!st || st.busy || st.finished) return;
      const p = st.player, s = STIKS.db && STIKS.db.session;
      const supOwner = s && (STIKS.findHeroByUid(s.activeCarOwnerUid) || STIKS.findHeroByUid(s.activePackOwnerUid));
      if (st.fireSupportQueued && supOwner && (supOwner.car || supOwner.pack)) {
        st.fireSupportQueued = false; st.busy = true; this.renderStage();
        await new Promise(res => STIKS.playCarWeaponStrike(supOwner.car || supOwner.pack, st.enemies, info => {
          this.log(`💥 <b>[Поддержка]</b>: убито ${info.killed}, ранено ${info.damaged}${info.stunned ? ', оглушение 2 хода!' : '!'}`); res();
        }));
        st.busy = false; this.renderStage(); if (this.checkBattleEnd()) return;
      }
      st.busy = true; st.activeId = 'u-player'; this.renderStage();
      let reroll = true, combo = 0;
      while (reroll && combo < 5) {
        reroll = false; combo++;
        const pool = this.getTargetsPool(); if (!pool.length) break;
        const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
        const isDouble = (d1 === d2), isCritLuck = (d1 === 1 && d2 === 1), isCritFail = (d1 === 6 && d2 === 6);
        if (isDouble) { STIKS.playDoubleSound(); global.STIKS_COMBAT_CORE.grantCombatXp('spi', 1); }
        if (isCritFail) { global.BSIM_AUDIO.playSfx('bite'); this.log('💀 Бросок <b>[6-6]</b>: срыв атаки / осечка!'); await this.wait(900); break; }
        const targets = pool.slice(0, Math.min(d1, pool.length));
        this.log(`🎲 <b>${p.name}</b> бросок <b>[${d1}-${d2}]</b> (целей: ${targets.length})${isCritLuck ? ' [1-1 КРИТ ×2!]' : (isDouble ? ' [ДУБЛЬ → ПЕРЕБРОС!]' : '')}`);
        for (let t = 0; t < targets.length; t++) {
          const trg = targets.at(t); if (trg.dead) continue;
          const mult = global.STIKS_COMBAT_CORE.getMult(p.weap.cls, trg.rank);
          const statAdd = Math.round(p.weap.isGun ? (p.stats.agi || 10) * 0.25 : (p.stats.str || 10) * 0.35);
          const dmg = Math.max(1, Math.round((p.weap.dmg + d2 + statAdd) * mult * (p.buff || 1) * (isCritLuck ? 2 : 1)));
          trg.hp = Math.max(0, trg.hp - dmg); if (trg.hp <= 0) trg.dead = true;
          global.STIKS_COMBAT_CORE.grantCombatXp(p.weap.isGun ? 'agi' : 'str', 1);
          global.BSIM_AUDIO.playSfx(p.weap.sfx);
          this.popBack('u-' + trg.id, false, '-' + dmg + (trg.dead ? ' 💀' : ''));
          this.log(`↳ ${p.weap.sound} <b>${trg.name}</b>: <b>-${dmg}</b> (ОЗ: ${trg.hp})`);
          this.renderStage(); if (this.checkBattleEnd()) return;
          if (t < targets.length - 1) await this.wait(220);
        }
        await this.wait(700); if (isDouble) reroll = true;
      }
      if (this.checkBattleEnd()) return;
      const sq = (p.heroRef && Array.isArray(p.heroRef.escortSquad)) ? p.heroRef.escortSquad : Array.of();
      sq.forEach(npc => {
        const foe = st.enemies.find(e => !e.dead); if (!foe) return;
        const d = Math.max(1, (npc.dmg || 5) + Math.floor(Math.random() * 4));
        foe.hp = Math.max(0, foe.hp - d); if (foe.hp <= 0) foe.dead = true;
        this.log(`🐕 Спутник <b>${npc.name}</b> бьёт <b>${foe.name}</b>: <b>-${d}</b>${foe.dead ? ' 💀' : ''}`);
      });
      if (this.checkBattleEnd()) return;
      await this.runEnemiesTurn();
    },
    actSkill() {
      const st = global.STIKS_COMBAT_CORE.state, p = st && st.player;
      if (!st || !p || st.busy || st.finished || p.skillUsed) return;
      const alive = st.enemies.filter(e => !e.dead); if (!alive.length) return;
      p.skillUsed = true;
      if (p.heroRef) { p.heroRef._skillSuccessUsed = p.heroRef.skillUnlocked = p.heroRef.skillRevealed = true; STIKS.syncHeroProfile(p.heroRef); }
      global.STIKS_COMBAT_CORE.grantCombatXp('spi', 1);
      global.BSIM_AUDIO.playSfx('shout'); STIKS.speakPhrase(p.heroRef, p.phrase);
      this.showSkillBanner(p.ico, p.skill, p.phrase);
      const C = STIKS.getContent();
      const strongest = alive.slice().sort((a, b) => (b.rank - a.rank) || (b.hp - a.hp)).at(0);
      const flatAtk = ((p.stats.str || 10) * 0.7 + (p.stats.agi || 10) * 0.5 + (p.stats.int || 10) * 0.4 + (p.stats.spi || 10) * 0.4) * (p.buff || 1);
      const fn = C.ARCH_SKILLS && (C.ARCH_SKILLS[p.arch] || C.ARCH_SKILLS.kvaz);
      if (typeof fn === 'function') {
        fn({ p, st, alive, strongest, flatAtk, popPlayer: t => this.popBack('u-player', true, t), popEnemy: (e, t) => this.popBack('u-' + e.id, false, t), dealDamage: (en, raw, txt) => { const d = Math.max(1, Math.round(raw)); en.hp = Math.max(0, en.hp - d); if (en.hp <= 0) en.dead = true; if (txt) this.popBack('u-' + en.id, false, txt + (en.dead ? ' 💀' : '')); }, log: this.log.bind(this) });
      }
      this.renderStage(); this.checkBattleEnd();
    },
    async actLearned(idx) {
      const C = STIKS.getContent();
      if (C && typeof C.runDarInCombat === 'function') await C.runDarInCombat(idx);
    },
    async runEnemiesTurn() {
      const st = global.STIKS_COMBAT_CORE.state, p = st.player;
      for (let i = 0; i < st.enemies.length; i++) {
        const en = st.enemies.at(i); if (en.dead) continue;
        st.activeId = 'u-' + en.id; this.renderStage();
        if (en.stun > 0) { en.stun--; this.log(`💫 <b>${en.name}</b> оглушён.`); await this.wait(650); continue; }
        if (en.dist > 0) { en.dist--; this.log(`🏃 <b>${en.name}</b> сближается (дист.: ${en.dist}).`); await this.wait(650); continue; }
        if (en.charmedAlly) {
          const foe = st.enemies.find(o => !o.dead && o.id !== en.id);
          if (foe) {
            const fDmg = Math.max(2, Math.round(en.dmg || 6));
            foe.hp = Math.max(0, foe.hp - fDmg); if (foe.hp <= 0) foe.dead = true;
            this.popBack('u-' + foe.id, false, '-' + fDmg + (foe.dead ? ' 💀' : ''));
            this.log(`🌀 Перевербованный <b>${en.name}</b> атакует своего <b>${foe.name}</b>: <b>-${fDmg}</b>!`);
          }
          this.renderStage(); if (this.checkBattleEnd()) return; await this.wait(600); continue;
        }
        if (p.decoys && p.decoys.count > 0 && Math.random() < 0.50) {
          this.log(`🎎 Кукла-приманка отвлекла атаку <b>${en.name}</b>!`); await this.wait(550); continue;
        }
        if (p.ghostMode && p.ghostMode.active && Math.random() < 0.90) {
          this.log(`👻 [Призрак]: <b>${en.name}</b> промахнулся сквозь фантом!`); await this.wait(550); continue;
        }
        if (p.jugglerTrap && p.jugglerTrap.rounds > 0) {
          const rTrg = st.enemies.find(o => !o.dead) || en;
          const jDmg = Math.max(2, Math.round(en.dmg || 6));
          rTrg.hp = Math.max(0, rTrg.hp - jDmg); if (rTrg.hp <= 0) rTrg.dead = true;
          this.popBack('u-' + rTrg.id, false, '🤹 -' + jDmg);
          this.log(`🤹 [Жонглёр] поймал удар и вернул <b>-${jDmg}</b> в <b>${rTrg.name}</b>!`);
          this.renderStage(); if (this.checkBattleEnd()) return; await this.wait(600); continue;
        }
        if (p.sawBox && p.sawBox.rounds > 0) {
          const heal = Math.max(3, Math.round(p.maxHp * (p.sawBox.healPct || 0.15)));
          p.hp = Math.min(p.maxHp, p.hp + heal); if (p.heroRef) p.heroRef.hp = p.hp;
          this.popBack('u-player', true, '🪚 +' + heal);
          this.log(`🪚 [Распили меня полностью]: удар превращён в <b>+${heal} ОЗ</b>!`);
          this.renderStage(); await this.wait(600); continue;
        }
        const deb = en.debuff > 0 ? 0.75 : 1; if (en.debuff > 0) en.debuff--;
        let multIn = 1.0;
        if (p.supportAura && p.supportAura.active) multIn *= Math.max(0.3, 1 - (p.supportAura.pct || 0.15));
        if (p.fireShield && p.fireShield.active) multIn *= 0.5;
        if (p.iceShell && p.iceShell.active) multIn *= 0.5;
        if (p.thornsWall && p.thornsWall.hitsLeft > 0) multIn *= 0.1;
        const raw = Math.max(1, Math.round((en.dmg * deb - p.armFlat) * multIn));
        const tankItem = (p.learned || Array.of()).find(x => (x.darKey === 'tank' && !x.branchId) || (x.darKey === 'gigantism' && x.branchId === 'b1'));
        const tankCost = tankItem ? (tankItem.manaAnchor || 5) : 0;
        if ((p.shieldHits || 0) > 0) { p.shieldHits--; this.log(`🛡 Барьер поглотил удар <b>${en.name}</b>!`); }
        else if (tankItem && raw >= Math.round(p.maxHp * 0.1) && p.mana >= tankCost) {
          p.mana -= tankCost; if (p.heroRef) p.heroRef.mana = p.mana;
          this.popBack('u-player', true, '🚜 БЛОК (-' + tankCost + 'м)');
          this.log(`🚜 [Танк] поглотил пробивающий удар <b>${en.name}</b> за ${tankCost} маны!`);
        } else {
          p.hp = Math.max(0, p.hp - raw); if (p.heroRef) p.heroRef.hp = p.hp;
          global.STIKS_COMBAT_CORE.grantCombatXp('end', 1);
          global.BSIM_AUDIO.playSfx(en.sfx || 'bite'); this.popBack('u-player', true, '-' + raw);
          this.log(`${en.sound} <b>${en.name}</b> бьёт: <b>-${raw} ОЗ</b> (${p.hp}/${p.maxHp})`);
          if (p.hp <= 0) {
            const cheat = (p.learned || Array.of()).find(x => x.darKey === 'clockstopper' && x.branchId === 'b4');
            if (cheat && !st._cheatDeathUsed && p.mana >= (cheat.manaAnchor || 10)) {
              st._cheatDeathUsed = true; p.mana -= (cheat.manaAnchor || 10);
              p.hp = Math.max(1, Math.round(p.maxHp * 0.25)); if (p.heroRef) p.heroRef.hp = p.hp;
              this.popBack('u-player', true, '⏳ ИЗБЕЖАНИЕ СМЕРТИ!');
              this.log(`⏳ [Избегание смерти]: время отмотано назад, восстановлено <b>${p.hp} ОЗ</b>!`);
            }
          }
        }
        let retDmg = 0;
        if (p.fireShield && p.fireShield.active) retDmg += Math.round(en.dmg * (p.fireShield.retMult || 1.5));
        if (p.iceShell && p.iceShell.active) retDmg += Math.round(en.dmg * (p.iceShell.retMult || 1.2));
        if (p.thornsWall && p.thornsWall.hitsLeft > 0) { p.thornsWall.hitsLeft--; retDmg += Math.round(en.dmg * (p.thornsWall.mult || 2.0)); }
        if (retDmg > 0 && !en.dead) {
          en.hp = Math.max(0, en.hp - retDmg); if (en.hp <= 0) en.dead = true;
          this.popBack('u-' + en.id, false, '🔥❄️ -' + retDmg);
          this.log(`↳ Ответный урон по <b>${en.name}</b>: <b>-${retDmg}</b>!`);
        }
        this.renderStage(); if (this.checkBattleEnd()) return;
        await this.wait(750);
      }
      if (p.giantRegen && p.giantRegen.rounds > 0) {
        p.giantRegen.rounds--;
        const rHeal = Math.max(2, Math.round(p.maxHp * (p.giantRegen.pct || 0.1)));
        p.hp = Math.min(p.maxHp, p.hp + rHeal); if (p.heroRef) p.heroRef.hp = p.hp;
        this.log(`🦍 [Чудовищная регенерация]: +${rHeal} ОЗ.`);
      }
      Array.of('supportAura', 'ghostMode', 'fireShield', 'iceShell', 'jammerAura', 'foresightAura').forEach(ak => {
        if (p[ak] && p[ak].active) {
          const mCost = p[ak].tickMana || 2;
          if (p.mana >= mCost) { p.mana -= mCost; if (p.heroRef) p.heroRef.mana = p.mana; }
          else { p[ak].active = false; this.log(`🔮 Мана иссякла — аура [${ak}] отключена.`); }
        }
      });
      if (p.sawBox && p.sawBox.rounds > 0) p.sawBox.rounds--;
      if (p.jugglerTrap && p.jugglerTrap.rounds > 0) p.jugglerTrap.rounds--;
      if (p.decoys && p.decoys.rounds > 0) p.decoys.rounds--;
      p.skillUsed = false; (p.learned || Array.of()).forEach(it => { it.usedRound = false; });
      st.activeId = ''; st.busy = false; st.round++; this.renderStage();
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 7/8 — ЧАСТЬ 7В-2в)
// Отрисовка сцены боя BSIM_UI.renderStage
// ============================================================================
    renderStage() {
      const st = global.STIKS_COMBAT_CORE.state, vp = document.getElementById('game-viewport');
      if (!st || !vp) return;
      const p = st.player, s = STIKS.db && STIKS.db.session;
      const skillOpened = p.heroRef ? STIKS.isRealSkillUnlocked(p.heroRef) : true;
      const pPct = Math.max(0, Math.min(100, Math.round((p.hp / Math.max(1, p.maxHp)) * 100)));
      const prevFeed = document.getElementById('sim-feed'), savedHtml = prevFeed ? prevFeed.innerHTML : '';

      let h = '<div style="background:#111613;border:1px solid #8f2d2d;border-radius:6px;padding:8px;font-size:11px;">' +
        `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><b style="color:#ff9e9e;">⚔️ БОЙ • РАУНД ${st.round}</b><div style="display:flex;gap:4px;"><button class="btn" style="width:auto;padding:2px 6px;font-size:10px;" onclick="BSIM_AUDIO.toggleBgm()">🎵 ${global.BSIM_AUDIO.bgmOn ? 'ВКЛ' : 'ВЫКЛ'}</button><button class="btn" style="width:auto;padding:2px 6px;font-size:10px;" onclick="BSIM_AUDIO.nextTrack()">⏭️</button></div></div>` +
        `<div id="combat-stage" style="position:relative;width:100%;height:210px;border:1px solid #8f2d2d;border-radius:6px;overflow:hidden;background:#090b0a;margin-bottom:8px;"><div style="position:absolute;top:5px;left:50%;transform:translateX(-50%);z-index:4;background:rgba(10,12,11,0.9);border:1px solid #6e2626;color:#e6c86e;padding:2px 8px;border-radius:10px;font-size:10px;">${st.finished ? (p.hp > 0 ? '🏆 ПОБЕДА' : '💀 ПОРАЖЕНИЕ') : ('Раунд ' + st.round)}</div>` +
        `<div style="position:absolute;top:26px;bottom:6px;left:4%;display:flex;flex-direction:column;justify-content:center;"><div id="u-player" style="display:flex;align-items:center;gap:4px;background:rgba(10,13,12,0.9);border:1px solid #2e7d4f;border-radius:4px;padding:3px 5px;${p.hp <= 0 ? 'opacity:0.35;' : ''}"><img src="${p.img}" style="width:22px;height:26px;object-fit:cover;border-radius:3px;"><div><div style="font-size:9px;color:#eef7f1;">${p.name}</div><div style="width:54px;height:3px;background:#241212;margin-top:2px;"><div style="width:${pPct}%;height:100%;background:#4caf50;"></div></div></div></div></div>` +
        `<div style="position:absolute;top:26px;bottom:6px;right:2%;width:64%;display:flex;flex-direction:column;justify-content:center;gap:4px;">` +
        st.enemies.map(en => {
          const rPct = en.dist <= 0 ? 52 : Math.round(2 + (1 - en.dist / Math.max(1, en.maxDist)) * 44);
          const ePct = Math.max(0, Math.min(100, Math.round((en.hp / Math.max(1, en.maxHp)) * 100)));
          const tag = en.dead ? '💀' : (en.stun > 0 ? '💫СТАН' : (en.debuff > 0 ? '⬇️-25%' : (en.dist > 0 ? `[${en.dist}х]` : '[УПОР]')));
          return `<div style="position:relative;height:28px;width:100%;"><div id="u-${en.id}" style="position:absolute;right:${rPct}%;display:flex;flex-direction:row-reverse;align-items:center;gap:4px;background:rgba(10,13,12,0.9);border:1px solid #5c2828;border-radius:4px;padding:2px 4px;${en.dead ? 'opacity:0.32;' : ''}"><img src="${en.img}" style="width:20px;height:24px;object-fit:contain;border-radius:3px;"><div><div style="font-size:9px;color:#eef7f1;">${en.name} ${tag}</div><div style="width:52px;height:3px;background:#241212;margin-top:2px;"><div style="width:${ePct}%;height:100%;background:#e53935;"></div></div></div></div></div>`;
        }).join('') + '</div><div id="stage-floats" style="position:absolute;inset:0;z-index:5;pointer-events:none;"></div></div>' +
        `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#140e0e;padding:5px;border-radius:4px;margin-bottom:6px;font-size:10px;"><div>❤️ ОЗ: <b>${p.hp}/${p.maxHp}</b></div><div>🔮 Мана: <b>${p.mana}/${p.maxMana}</b></div><div>🛡 Броня: <b>${p.armFlat}</b></div></div>`;

      if (st.finished) {
        h += '<button class="btn btn-primary" style="width:100%;padding:8px;font-weight:bold;margin-bottom:6px;" onclick="STIKS.closeCombatModal()">Продолжить ▶</button>';
      } else {
        const dis = st.busy ? 'disabled' : '';
        h += `<div style="display:flex;gap:5px;margin-bottom:6px;"><button class="btn btn-primary" ${dis} style="flex:2;" onclick="BSIM_UI.actAttack()">🎲 Атака (2d6)</button><button class="btn btn-danger" ${dis} style="flex:1;" onclick="STIKS.combatFlee()">🏃 Сбежать</button></div><div id="battle-abilities" style="display:flex;flex-direction:column;gap:4px;margin-bottom:6px;">`;
        if (p.altWeap) h += `<button class="btn" ${dis} style="text-align:left;border-color:#38bdf8;color:#bae6fd;" onclick="BSIM_UI.switchWeapon()">🔄 Сменить (0 ОХ): ${p.weap.name} → ${p.altWeap.name}</button>`;
        if (p.skillType !== 'trigger' && p.skillType !== 'passive') h += `<button class="btn" ${(st.busy || p.skillUsed) ? 'disabled' : ''} style="text-align:left;" onclick="BSIM_UI.actSkill()">${p.ico} ${skillOpened ? p.skill : '🤪 Что-то учудить'}</button>`;
        const supOw = s && (STIKS.findHeroByUid(s.activeCarOwnerUid) || STIKS.findHeroByUid(s.activePackOwnerUid));
        if (supOw && ((supOw.car && supOw.car.weapon) || (supOw.pack && supOw.pack.weapon))) {
          const w = (supOw.car || supOw.pack).weapon;
          h += `<button class="btn btn-danger" ${(st.busy || st.fireSupportUsed) ? 'disabled' : ''} style="text-align:left;" onclick="const st=STIKS_COMBAT_CORE.state;st.fireSupportUsed=st.fireSupportQueued=st.busy=true;BSIM_UI.log('📡 Запрос поддержки: ${w.name}!');BSIM_UI.renderStage();BSIM_UI.runEnemiesTurn();">📡 Поддержка: ${w.name}</button>`;
        }
        p.learned.forEach((item, idx) => {
          const dar = STIKS.getDarsMap().at ? null : STIKS.getDarsMap()[item.darKey]; if (!dar) return;
          const br = item.branchId ? (dar.branches || Array.of()).find(b => b.id === item.branchId) : null;
          if ((br ? br.type : dar.type) === 'active') {
            const pct = global.STIKS_COMBAT_CORE.calcMana(br ? br.mana1 : dar.mana1, br ? br.mana30 : dar.mana30, item.lvl);
            const cost = item.manaAnchor || Math.floor(p.maxMana * (pct / 100));
            h += `<button data-dar-idx="${idx}" class="btn" ${(st.busy || item.usedRound) ? 'disabled' : ''} style="text-align:left;border-color:#6b3fa0;color:#e2caff;" onclick="BSIM_UI.actLearned(${idx})">🧬 ${br ? br.name : dar.name} (Ур.${item.lvl}) • ${cost} м.</button>`;
          }
        });
        h += '</div>';
      }
      if (st.busy && !st.finished) h += '<button class="btn" style="width:100%;margin-bottom:5px;border-color:#f59e0b;color:#fde047;font-size:10px;" onclick="STIKS_COMBAT_CORE.state.busy=false;BSIM_UI.renderStage();">🔄 Продолжить ход (если анимация замерла)</button>';
      vp.innerHTML = h + `<div id="sim-feed" style="background:#080908;border:1px solid #3d1c1c;border-radius:4px;padding:6px;height:120px;overflow-y:auto;font-size:11px;">${savedHtml}</div></div>`;
      const nf = document.getElementById('sim-feed'); if (nf) nf.scrollTop = nf.scrollHeight;
    }
  };

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 8/8 — ЧАСТЬ 8А-1)
// Синхронизация профиля (syncHeroProfile / pullProfileToPlayer) и ambientAudio
// ============================================================================
  Object.assign(STIKS, {
    syncHeroProfile(pl) {
      if (!pl || !this.db || !this.db.families) return null;
      this._cleanSporans(pl);
      pl.inv = this.stackInventory(pl.inv || Array.of());
      const target = this.findHeroByUid(pl.uid);
      if (target) {
        target.lvl = Math.max(Number(target.lvl) || 0, Number(pl.lvl) || 0);
        if (pl.stats) target.stats = Object.assign({}, target.stats || {}, pl.stats);
        target.inv = JSON.parse(JSON.stringify(pl.inv));
        if (pl.slots) target.slots = JSON.parse(JSON.stringify(pl.slots));
        if (pl.gifts) target.gifts = JSON.parse(JSON.stringify(pl.gifts));
        target.spores = target.sporans = pl.spores;
        target.missionsDone = Math.max(Number(target.missionsDone) || 0, Number(pl.missionsDone) || 0);
        if (this.isRealSporeUnlocked(pl)) target.knowsSpores = target.sporeKnown = target.knowsRecipe = target._manualBookRead = true;
        if (this.isRealSkillUnlocked(pl)) target._skillSuccessUsed = target.skillUnlocked = target.skillRevealed = true;
        Array.of('wasInfected', 'wasKvaz', 'isLegendary', 'keepInfectedMult', 'junkyardUnlocked', 'hasCar', 'hasCarKey', 'cemeteryUnlocked', 'hasPack', 'hasPackKey', 'inFarSettlement', 'inFarNest').forEach(k => { if (pl[k]) target[k] = true; });
        Array.of('shamanQuest', 'transportQuest', 'car', 'crownQuest', 'pack', 'ancestorsQuest', 'carTrunk').forEach(k => { if (pl[k]) target[k] = JSON.parse(JSON.stringify(pl[k])); });
        target.hp = pl.hp; target.maxHp = pl.maxHp;
        target.status = pl.dead ? 'dead' : (pl.escaped ? 'ready' : target.status);
      }
      return target;
    },

    pullProfileToPlayer(pl) {
      const target = pl && this.findHeroByUid(pl.uid);
      if (!target) return;
      this._cleanSporans(target);
      pl.lvl = Number(target.lvl) || 0;
      if (target.stats) pl.stats = Object.assign({}, target.stats || {}, target.stats);
      pl.inv = JSON.parse(JSON.stringify(target.inv || Array.of()));
      if (target.slots) pl.slots = Object.assign(this.defaultSlots(), JSON.parse(JSON.stringify(target.slots)));
      if (target.gifts) pl.gifts = JSON.parse(JSON.stringify(target.gifts));
      pl.spores = pl.sporans = target.spores;
      pl.isKvaz = Boolean(target.isKvaz); pl.isLegendary = Boolean(target.isLegendary);
      if (this.isRealSporeUnlocked(target)) pl.knowsSpores = pl.sporeKnown = pl.knowsRecipe = pl._manualBookRead = true;
      if (this.isRealSkillUnlocked(target)) pl._skillSuccessUsed = pl.skillUnlocked = pl.skillRevealed = true;
    },

    ambientAudio: {
      on: true, timer: null, mode: null, step: 0,
      stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.mode = null; },
      playMode(m) {
        if (!this.on || (STIKS.db && STIKS.db.session && STIKS.db.session.combat)) { this.stop(); return; }
        if (this.mode === m && this.timer) return;
        this.stop(); this.mode = m; this.step = 0;
        const seq = m === 'settlement' ? Array.of(196, 246.9, 293.7, 246.9, 220, 261.6, 329.6, 0) : Array.of(110, 130.8, 123.5, 98, 0, 146.8, 138.6, 110);
        this.timer = setInterval(() => {
          if (!this.on || (STIKS.db && STIKS.db.session && STIKS.db.session.combat)) { this.stop(); return; }
          const ctx = STIKS._getAudioCtx(), f = seq.at(this.step++ % seq.length);
          if (ctx && f > 0) {
            const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.setValueAtTime(f, now);
            g.gain.setValueAtTime(0.025, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.33);
          }
        }, m === 'settlement' ? 350 : 300);
      },
      toggle() {
        this.on = !this.on;
        const b = document.getElementById('btn-ambient-bgm');
        if (b) b.textContent = this.on ? '🎶 Фон: ВКЛ' : '🔇 Фон: ВЫКЛ';
        if (!this.on) this.stop();
      }
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 8/8 — ЧАСТЬ 8А-2)
// Лавка P1–P5, личный тайник 200 кг и сохранение позиции скролла
// ============================================================================
    calcItemPrice(it, hr) {
      if (!it) return 2;
      const nm = String(it.n || it.name || '').toLowerCase(), kvazAdd = (hr && hr.isKvaz) ? 2 : 0;
      if (it.isPeas || nm.includes('горох')) return 20 + kvazAdd;
      if (it.pearl === 'black' || nm.includes('чёрный жемчуг')) return 1000 + kvazAdd;
      if (it.pearl === 'red' || nm.includes('красный жемчуг')) return 3000 + kvazAdd;
      if (it.pearl === 'white' || nm.includes('белый жемчуг')) return 1000000;
      const r = this.resolveItemRank(it), mult = { 1: 1, 2: 5, 3: 25, 4: 125, 5: 250 }[r] || 1;
      const sl = this.detectSlot(it);
      const base = Array.of('main', 'side', 'melee', 'mod', 'meleeMod').includes(sl) ? 10 : (Array.of('armor', 'clothes', 'boots', 'bag').includes(sl) ? 5 : 2);
      return (base * mult) + kvazAdd;
    },

    getStashWeight(list) {
      return Math.round((Array.isArray(list) ? list : Array.of()).reduce((s, it) => s + (Number(it.w || 0) * Number(it.q || 1)), 0) * 10) / 10;
    },

    ensureTraderStock(hr) {
      const curLvl = hr.lvl || 0, isKvaz = Boolean(hr.isKvaz);
      if (Array.isArray(hr.traderStock) && hr.traderStockLvl === curLvl && hr.traderStockKvaz === isKvaz && hr.traderStock.length > 0) return hr.traderStock;
      const r = curLvl >= 45 ? 5 : (curLvl >= 30 ? 4 : (curLvl >= 15 ? 3 : (curLvl >= 5 ? 2 : 1)));
      const pool = Array.of(
        { n: 'Обрез двустволки', cat: 'side', slot: 'side', rank: 1, a: 7, cal: '12g', w: 2.1 },
        { n: '🔪 Охотничий нож', cat: 'melee', slot: 'melee', rank: 1, a: 9, w: 0.5 },
        { n: 'Косуха', cat: 'armor', slot: 'armor', rank: 1, cls: 1, d: 5, w: 3.5 },
        { n: 'Походная аптечка', cat: 'med', rank: 1, heal: 35, w: 0.4 },
        { n: '🍾 Чекушка водки (алкоголь)', cat: 'supply', slot: 'use', rank: 1, alcohol: true, spi: 3, w: 0.35 },
        { n: '🫛 Горох Улья (субстрат)', cat: 'supply', slot: 'use', rank: 2, isPeas: true, w: 0, q: 1 },
        { n: `🔫 Ствол сектора [P${r}]`, cat: 'weapon', slot: 'main', rank: r, cls: r, a: 10 * r, cal: '545', w: 3.4 },
        { n: `🛡️ Бронекомплект [P${r}]`, cat: 'armor', slot: 'armor', rank: r, cls: r, d: ({ 1: 5, 2: 15, 3: 30, 4: 75, 5: 120 }[r] || 5), w: 5.5 }
      );
      if (Math.random() < (isKvaz ? 0.15 : 0.08)) pool.push({ n: '⚫ Чёрный жемчуг Улья', cat: 'supply', slot: 'use', rank: 3, pearl: 'black', w: 0.1 });
      if (Math.random() < (isKvaz ? 0.08 : 0.04)) pool.push({ n: '🔴 Красный жемчуг Улья', cat: 'supply', slot: 'use', rank: 3, pearl: 'red', w: 0.1 });
      if (isKvaz) pool.push({ n: '⚪ Белый жемчуг Улья', cat: 'supply', slot: 'use', rank: 4, pearl: 'white', w: 0.1 });
      hr.traderStock = pool.map(x => Object.assign({ q: 1 }, x));
      hr.traderStockLvl = curLvl; hr.traderStockKvaz = isKvaz;
      return hr.traderStock;
    },

    openShop(famOrUid, idx) {
      const hr = (typeof idx === 'number' && this.db.families[famOrUid]) ? this.db.families[famOrUid].at(idx) : this.findHeroByUid(famOrUid);
      if (!hr || !this.isVeteran(hr)) return;
      this.syncSporans(hr); hr.inv = this.stackInventory(hr.inv || Array.of());
      this.shopHeroUid = hr.uid; this.renderShopModal();
    },

    closeShop() {
      const el = document.getElementById('stiks-shop-modal'); if (el) el.remove();
      this.shopHeroUid = null; this.renderLobby();
    },

    shopOp(act, idx) {
      const hr = this.findHeroByUid(this.shopHeroUid); if (!hr) return;
      const stock = this.ensureTraderStock(hr);
      if (act === 'buy' && stock.at(idx)) {
        const it = stock.at(idx), price = this.calcItemPrice(it, hr);
        if (this._cleanSporans(hr) < price) { this.log(`❌ Нужно ${price} 💎.`); return; }
        hr.spores = hr.sporans = hr.spores - price;
        hr.inv.push(JSON.parse(JSON.stringify(it))); hr.inv = this.stackInventory(hr.inv);
        stock.splice(idx, 1); this.log(`🛒 Куплено: ${it.n} за ${price} 💎.`);
      } else if ((act === 'sell' || act === 'sellPack') && hr.inv.at(idx)) {
        const it = hr.inv.at(idx), nm = String(it.n || it.name || ''), q = Math.max(1, Number(it.q || 1));
        if (it.isWeb || nm.toLowerCase().includes('паутин')) {
          const packs = Math.floor(q / 10);
          if (packs <= 0) { this.log('🕸️ Паутина сдаётся пачками по 10 шт. = 1 💎.'); return; }
          if (q % 10 > 0) it.q = it.qty = q % 10; else hr.inv.splice(idx, 1);
          hr.spores = hr.sporans = this._cleanSporans(hr) + packs;
          this.log(`🕸️ Сдано ${packs * 10} паутины за ${packs} 💎.`);
        } else {
          const unitSell = Math.max(1, Math.ceil((this.calcItemPrice(it, hr) - (hr.isKvaz ? 2 : 0)) / 2));
          const cnt = act === 'sellPack' ? q : 1;
          if (act === 'sellPack') hr.inv.splice(idx, 1); else this.consumeInvOne(hr, idx);
          hr.spores = hr.sporans = this._cleanSporans(hr) + unitSell * cnt;
          this.log(`💰 Продано: ${nm} x${cnt} за ${unitSell * cnt} 💎.`);
        }
      } else if (act === 'toStash' && hr.inv.at(idx)) {
        const it = hr.inv.at(idx); hr.stash = hr.stash || Array.of();
        if (this.getStashWeight(hr.stash) + (Number(it.w || 0) * Number(it.q || 1)) > 200) { this.log('❌ Личный тайник переполнен (лимит 200 кг).'); return; }
        hr.stash.push(hr.inv.splice(idx, 1).at(0)); hr.stash = this.stackInventory(hr.stash);
      } else if (act === 'fromStash' && hr.stash && hr.stash.at(idx)) {
        hr.inv.push(hr.stash.splice(idx, 1).at(0)); hr.inv = this.stackInventory(hr.inv);
      }
      this.saveDB(); this.renderShopModal();
    },

    renderShopModal() {
      const hr = this.findHeroByUid(this.shopHeroUid); if (!hr) return;
      const old = document.getElementById('stiks-shop-modal');
      const savedScroll = (old && old.firstElementChild) ? old.firstElementChild.scrollTop : 0;
      if (old) old.remove();

      const stock = this.ensureTraderStock(hr), stW = this.getStashWeight(hr.stash);
      const isInf = Boolean((hr.isInfected || hr.asInfected || hr.arch === 'infected') && !hr.isKvaz);
      const title = isInf ? '🕳️ ЧЁРНЫЙ СХРОН УЛЬЯ' : (hr.isKvaz ? '🏴‍☠️ ЧЁРНЫЙ РЫНОК (КВАЗ +2 💎)' : '🏪 ЛАВКА УЛЬЯ');

      const ov = document.createElement('div');
      ov.id = 'stiks-shop-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,6,0.92);z-index:9500;display:flex;align-items:center;justify-content:center;padding:10px;font-family:monospace;color:#d6e5db;';
      let h = '<div style="width:100%;max-width:440px;max-height:92dvh;overflow-y:auto;border:1px solid #6e2626;background:#111613;padding:12px;border-radius:6px;font-size:11px;">' +
        `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #5c2828;padding-bottom:6px;margin-bottom:8px;"><b style="color:#ff9e9e;font-size:13px;">${title}: ${hr.name}</b><button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="STIKS.closeShop()">✖</button></div>` +
        `<div style="background:#1c1212;border:1px solid #5c2828;padding:6px;margin-bottom:8px;display:flex;justify-content:space-between;"><span>💎 Спораны: <b>${this._cleanSporans(hr)}</b></span><span>📦 Тайник: <b>${stW} / 200 кг</b></span></div>`;

      stock.forEach((it, idx) => {
        const pr = this.calcItemPrice(it, hr);
        h += `<div style="padding:4px 0;border-bottom:1px solid #253029;"><div style="display:flex;justify-content:space-between;align-items:center;"><span>${it.n} [P${this.resolveItemRank(it)}]</span><button class="btn btn-primary" style="width:auto;padding:2px 6px;font-size:10px;" onclick="STIKS.shopOp('buy',${idx})">${pr} 💎</button></div><div style="font-size:9.5px;color:#94a3b8;">${this.describeItem(it)}</div></div>`;
      });

      h += '<div style="color:#7fa88b;font-weight:bold;margin:8px 0 4px 0;">🎒 РЮКЗАК:</div>';
      (hr.inv || Array.of()).forEach((it, idx) => {
        const q = Math.max(1, Number(it.q || 1)), unitSell = Math.max(1, Math.ceil((this.calcItemPrice(it, hr) - (hr.isKvaz ? 2 : 0)) / 2));
        const packBtn = q > 1 ? `<button class="btn" style="width:auto;padding:2px 5px;font-size:10px;border-color:#eab308;color:#fde047;" onclick="STIKS.shopOp('sellPack',${idx})">Пачкой</button>` : '';
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1f2923;gap:3px;"><span>${it.n}${q > 1 ? ' x' + q : ''}</span><div style="display:flex;gap:3px;"><button class="btn" style="width:auto;padding:2px 5px;font-size:10px;" onclick="STIKS.shopOp('sell',${idx})">+${unitSell}💎</button>${packBtn}<button class="btn" style="width:auto;padding:2px 5px;font-size:10px;" onclick="STIKS.shopOp('toStash',${idx})">📥 Тайник</button></div></div>`;
      });

      h += `<div style="color:#7fa88b;font-weight:bold;margin:8px 0 4px 0;">📦 ЛИЧНЫЙ ТАЙНИК (${stW} / 200 кг):</div>`;
      (hr.stash || Array.of()).forEach((it, idx) => {
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1f2923;"><span>${it.n}${(it.q || 1) > 1 ? ' x' + it.q : ''}</span><button class="btn btn-primary" style="width:auto;padding:2px 6px;font-size:10px;" onclick="STIKS.shopOp('fromStash',${idx})">📤 Взять</button></div>`;
      });

      ov.innerHTML = h + '</div>';
      document.body.appendChild(ov);
      if (savedScroll > 0 && ov.firstElementChild) ov.firstElementChild.scrollTop = savedScroll;
    },

// ============================================================================
// S-T-I-K-S // ЧИСТОЕ ЯДРО ZOPA.JS v3.0.0-clean (МОДУЛЬ 8/8 — ЧАСТЬ 8Б-2)
// 5 заведений (2^n, 1 раз/ур., дебош 50% со штрафом ×5), Обряд и Спарринг
// ============================================================================
    _ensureBaseCycle(hr, stateKey) {
      const curLv = Number(hr.lvl || 0);
      const prev = hr[stateKey] || {};
      hr[stateKey] = {
        level: curLv,
        visited: (prev.level === curLv && prev.visited) ? prev.visited : {},
        ritualUsed: (prev.level === curLv) ? Boolean(prev.ritualUsed) : false
      };
      return hr[stateKey];
    },

    getPlaceCost(hr, placeId) {
      const counts = (hr && hr.placeCounts) || {};
      const n = Math.max(0, Number(counts[placeId]) || 0);
      return Math.pow(2, n) + ((hr && hr.isKvaz) ? 2 : 0);
    },

    openSettlement(famOrUid, idx) {
      const hr = (typeof idx === 'number' && this.db.families[famOrUid]) ? this.db.families[famOrUid].at(idx) : this.findHeroByUid(famOrUid);
      if (!hr || !this.isVeteran(hr)) return;
      const isInf = Boolean((hr.isInfected || hr.asInfected || hr.arch === 'infected') && !hr.isKvaz);
      if (isInf) { this.openNest(famOrUid, idx); return; }
      this.syncSporans(hr);
      this.baseHeroUid = hr.uid;
      if (this.ambientAudio) this.ambientAudio.playMode('settlement');
      this.renderSettlementModal('');
    },

    closeSettlement() {
      const el = document.getElementById('stiks-settlement-modal');
      if (el) el.remove();
      this.baseHeroUid = null;
      if (this.ambientAudio) this.ambientAudio.stop();
      this.renderLobby();
    },

    renderSettlementModal(notice) {
      const hr = this.findHeroByUid(this.baseHeroUid); if (!hr) return;
      const old = document.getElementById('stiks-settlement-modal');
      const savedScroll = (old && old.firstElementChild) ? old.firstElementChild.scrollTop : 0;
      if (old) old.remove();

      const st = this._ensureBaseCycle(hr, 'settlementState');
      const fine = Number(hr.settlementFine || 0);
      const places = Array.of(
        { id: 'shaman', ico: '🔮', name: 'Знахарь', desc: 'Дух +база и +1 ур. к Дару' },
        { id: 'library', ico: '📚', name: 'Библиотека', desc: 'Интеллект +база и запись Архива' },
        { id: 'range', ico: '🎯', name: 'Полигон', desc: 'Ловкость и Скорость +база' },
        { id: 'gym', ico: '🏋️', name: 'Тренажёрка', desc: 'Сила +база' },
        { id: 'bar', ico: '🍺', name: 'Бар', desc: 'Выносливость (50% дебош ×5)' }
      );

      const ov = document.createElement('div');
      ov.id = 'stiks-settlement-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,6,0.94);z-index:9520;display:flex;align-items:center;justify-content:center;padding:10px;font-family:monospace;color:#e6f5eb;';
      let h = '<div style="width:100%;max-width:440px;max-height:92dvh;overflow-y:auto;border:1px solid #4ade80;background:#111814;padding:12px;border-radius:6px;font-size:11px;">' +
        `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #2e6b48;padding-bottom:6px;margin-bottom:8px;"><b style="color:#86efac;font-size:13px;">🏘️ ПОСЕЛЕНИЕ: ${hr.name} (Ур.${hr.lvl || 0})</b><button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="STIKS.closeSettlement()">✖</button></div>` +
        `<div style="background:#16221b;border:1px solid #2e6b48;padding:6px;margin-bottom:8px;display:flex;justify-content:space-between;"><span>💎 Спораны: <b>${this._cleanSporans(hr)}</b></span><span>Цикл уровня: <b>Ур.${st.level}</b></span></div>`;

      if (notice) h += `<div style="background:#1a2b21;border:1px solid #4ade80;color:#e6f5eb;padding:6px;border-radius:4px;margin-bottom:8px;">${notice}</div>`;
      if (fine > 0) {
        h += `<div style="background:#2b1111;border:1px solid #ef4444;padding:8px;border-radius:4px;margin-bottom:8px;"><div style="color:#fca5a5;margin-bottom:6px;">🚨 Штраф за дебош: <b>${fine} 💎</b>. Все заведения закрыты.</div>` +
          `<button class="btn btn-danger" style="width:100%;" onclick="STIKS.settlementPayFine()">Оплатить штраф (${fine} 💎)</button></div>`;
      }

      h += `<button class="btn" ${st.ritualUsed ? 'disabled' : ''} style="width:100%;margin-bottom:8px;border-color:#4ade80;color:#bbf7d0;" onclick="STIKS.settlementRitual()">🌿 Обряд Знахаря (+50% показателей • ${st.ritualUsed ? 'проведён' : '1 раз/ур.'})</button>`;

      places.forEach(pl => {
        const visited = Boolean(st.visited[pl.id]);
        const cost = this.getPlaceCost(hr, pl.id);
        const dis = (fine > 0 || visited) ? 'disabled' : '';
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1f2e25;gap:6px;"><div><b>${pl.ico} ${pl.name}</b><div style="font-size:9.5px;color:#98d4ae;">${pl.desc}</div></div>` +
          `<button class="btn btn-primary" ${dis} style="width:auto;padding:4px 8px;font-size:10px;" onclick="STIKS.settlementVisit('${pl.id}')">${visited ? 'Посещено' : cost + ' 💎'}</button></div>`;
      });

      h += this.renderSettlementQuestsAndGarage(hr);
      const opps = Array.of();
      Object.keys(this.db.families || {}).forEach(f => {
        if (f === hr.family) return;
        (this.db.families[f] || Array.of()).forEach(o => {
          const oInf = Boolean((o.isInfected || o.asInfected || o.arch === 'infected') && !o.isKvaz);
          if (o && o.status !== 'dead' && !oInf && this.isVeteran(o)) opps.push(o);
        });
      });
      h += '<div style="color:#86efac;font-weight:bold;margin:8px 0 4px 0;">🥊 СПАРРИНГ С ДРУГОЙ ФАМИЛИЕЙ:</div>';
      if (!opps.length) h += '<div style="font-size:10px;color:#94a3b8;">Нет доступных ветеранов из других фамилий.</div>';
      else opps.forEach(o => {
        const fee = o.isKvaz ? 4 : 2;
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;"><span>${o.family} ${o.name} (Ур.${o.lvl || 0})</span><button class="btn" style="width:auto;padding:2px 7px;font-size:10px;" onclick="STIKS.settlementDuel('${o.uid}')">Бой (${fee} 💎)</button></div>`;
      });

      ov.innerHTML = h + '</div>';
      document.body.appendChild(ov);
      if (savedScroll > 0 && ov.firstElementChild) ov.firstElementChild.scrollTop = savedScroll;
    },

    settlementPayFine() {
      const hr = this.findHeroByUid(this.baseHeroUid); if (!hr) return;
      const fine = Number(hr.settlementFine || 0);
      if (fine <= 0) return;
      if (this._cleanSporans(hr) < fine) {
        this.renderSettlementModal(`⚠️ Не хватает споранов для оплаты штрафа (${fine} 💎).`); return;
      }
      hr.spores = hr.sporans = hr.spores - fine;
      hr.settlementFine = 0;
      this.saveDB();
      this.renderSettlementModal(`✅ Штраф ${fine} 💎 погашен! Доступ к заведениям открыт.`);
    },

    settlementRitual() {
      const hr = this.findHeroByUid(this.baseHeroUid); if (!hr) return;
      const st = this._ensureBaseCycle(hr, 'settlementState');
      if (st.ritualUsed) {
        this.renderSettlementModal(`⚠️ Обряд Знахаря уже проведён на уровне ${st.level}.`); return;
      }
      this.normalizePlayerStats(hr);
      st.ritualUsed = true;
      Array.of('food', 'water', 'stamina', 'spore', 'mana').forEach(k => {
        const maxK = 'max' + k.charAt(0).toUpperCase() + k.slice(1);
        if (hr[maxK]) hr[k] = Math.min(hr[maxK], Math.round((hr[k] || 0) + hr[maxK] * 0.5));
      });
      this.saveDB();
      this.renderSettlementModal('🌿 Обряд Знахаря завершён: Сытость, Жажда, Бодрость, Мана и Споровый баланс +50%!');
    },

    settlementVisit(placeId) {
      const hr = this.findHeroByUid(this.baseHeroUid); if (!hr) return;
      const st = this._ensureBaseCycle(hr, 'settlementState');
      if (Number(hr.settlementFine || 0) > 0) {
        this.renderSettlementModal(`🚨 Все 5 заведений заблокированы до оплаты штрафа (${hr.settlementFine} 💎)!`); return;
      }
      if (st.visited[placeId]) {
        this.renderSettlementModal(`⚠️ Вы уже посещали это заведение на уровне ${st.level}.`); return;
      }
      const cost = this.getPlaceCost(hr, placeId);
      if (this._cleanSporans(hr) < cost) {
        this.renderSettlementModal(`⚠️ Недостаточно споранов (нужно ${cost} 💎).`); return;
      }

      hr.spores = hr.sporans = hr.spores - cost;
      st.visited[placeId] = true;
      hr.placeCounts = hr.placeCounts || { shaman: 0, library: 0, range: 0, gym: 0, bar: 0 };
      hr.placeCounts[placeId] = Number(hr.placeCounts[placeId] || 0) + 1;
      const baseGain = Math.max(1, cost - (hr.isKvaz ? 2 : 0));
      let msg = '';

      if (placeId === 'shaman') {
        hr.stats.spi = this._round100((hr.stats.spi || 10) + baseGain);
        msg = `🔮 Знахарь: Дух +${baseGain}.`;
        const up = this._boostRandomOpenedGift(hr, 1);
        if (up) msg += ` Дар «${up.name}» повышен до Ур.${up.lvl}!`;
      } else if (placeId === 'library') {
        hr.stats.int = this._round100((hr.stats.int || 10) + baseGain);
        const arc = typeof this.unlockNextArchiveEntry === 'function' ? this.unlockNextArchiveEntry() : null;
        msg = `📚 Библиотека: Интеллект +${baseGain}.` + (arc ? ` Открыта запись Архива #${arc}!` : '');
      } else if (placeId === 'range') {
        const half = Math.floor(baseGain / 2), rem = baseGain - half;
        hr.stats.agi = this._round100((hr.stats.agi || 10) + half);
        hr.stats.spd = this._round100((hr.stats.spd || 10) + rem);
        msg = `🎯 Полигон: Ловкость +${half}, Скорость +${rem}.`;
      } else if (placeId === 'gym') {
        hr.stats.str = this._round100((hr.stats.str || 10) + baseGain);
        msg = `🏋️ Тренажёрка: Сила +${baseGain}.`;
      } else if (placeId === 'bar') {
        if (Math.random() < 0.50) {
          Array.of('str', 'agi', 'spd', 'end').forEach(k => { hr.stats[k] = this._round100((hr.stats[k] || 10) + 2); });
          hr.settlementFine = cost * 5;
          msg = `🍺 ПЬЯНЫЙ ДЕБОШ! Разнесли бар: Сила/Ловкость/Скорость/Выносливость +2! Штраф <b>${hr.settlementFine} 💎</b> — все 5 заведений заблокированы до оплаты.`;
        } else {
          hr.stats.end = this._round100((hr.stats.end || 10) + baseGain);
          msg = `🍺 Бар: Выносливость +${baseGain}.`;
        }
      }

      this.recalcLevel(hr); this.normalizePlayerStats(hr); this.saveDB();
      this.renderSettlementModal(msg + ` Следующий вход: ${this.getPlaceCost(hr, placeId)} 💎.`);
    },

    _countWebInInv(hr) {
      return (hr && hr.inv || Array.of()).reduce((s, it) => (it && (it.isWeb || String(it.n || it.name || '').toLowerCase().includes('паутин'))) ? s + Math.max(1, Number(it.q || 1)) : s, 0);
    },

    _spendWebFromInv(hr, need) {
      let left = need;
      for (let i = (hr.inv || Array.of()).length - 1; i >= 0 && left > 0; i--) {
        const it = hr.inv.at(i);
        if (it && (it.isWeb || String(it.n || it.name || '').toLowerCase().includes('паутин'))) {
          const q = Math.max(1, Number(it.q || 1));
          if (q <= left) { left -= q; hr.inv.splice(i, 1); }
          else { it.q = it.qty = q - left; left = 0; }
        }
      }
    },

    renderSettlementQuestsAndGarage(hr) {
      const sq = hr.shamanQuest || { stage: 0 };
      const tq = hr.transportQuest || {};
      const webCnt = this._countWebInInv(hr);
      let out = '<div style="background:#151c17;border:1px solid #3f624c;border-radius:5px;padding:7px;margin-bottom:8px;">';
      if (!hr.junkyardUnlocked && !hr.hasCar) {
        if (!sq.stage) {
          out += '<div style="color:#fde047;margin-bottom:4px;">📜 <b>Задание Знахаря:</b> принести 30 шт. Паутины Улья для открытия Автосвалки.</div>' +
            '<button class="btn btn-primary" style="width:100%;font-size:10px;" onclick="STIKS.shamanQuestAction(\'take\')">Принять задание Знахаря</button>';
        } else {
          out += '<div style="color:#fde047;margin-bottom:4px;">🕸️ <b>Задание Знахаря:</b> собрано Паутины <b>' + webCnt + ' / 30</b></div>' +
            '<button class="btn btn-primary" ' + (webCnt < 30 ? 'disabled' : '') + ' style="width:100%;font-size:10px;" onclick="STIKS.shamanQuestAction(\'turnin\')">Сдать 30 Паутины -> Открыть Автосвалку</button>';
        }
      } else if (hr.hasCar && !hr.hasCarKey) {
        const esc = Number(tq.escortsOut || 0), msh = Number(tq.mineShifts || 0), hsl = Number(tq.hotelSleeps || 0);
        const ready = esc >= 5 && msh >= 10 && hsl >= 3;
        out += '<div style="color:#38bdf8;font-weight:bold;margin-bottom:4px;">🔑 ИСПЫТАНИЯ НА КЛЮЧ ОТ «' + hr.car.name + '»:</div>' +
          '<div style="font-size:10px;margin-bottom:5px;">• Спутников выведено: <b>' + esc + '/5</b> | Шахта: <b>' + msh + '/10</b> | Отель: <b>' + hsl + '/3</b></div>' +
          '<div style="display:flex;gap:4px;margin-bottom:4px;"><button class="btn" ' + (msh >= 10 ? 'disabled' : '') + ' style="flex:1;font-size:10px;" onclick="STIKS.shamanQuestAction(\'mine\')">⛏️ Шахта (2 💎)</button>' +
          '<button class="btn" ' + (hsl >= 3 ? 'disabled' : '') + ' style="flex:1;font-size:10px;" onclick="STIKS.shamanQuestAction(\'hotel\')">🏨 Отель (3 💎)</button></div>' +
          '<button class="btn btn-primary" ' + (!ready ? 'disabled' : '') + ' style="width:100%;font-size:10px;" onclick="STIKS.shamanQuestAction(\'getkey\')">🔑 Получить Ключи</button>';
      } else if (hr.hasCar && hr.hasCarKey && hr.car) {
        const c = hr.car, wName = c.weapon ? c.weapon.name : 'нет';
        out += '<div style="color:#38bdf8;font-weight:bold;margin-bottom:4px;">🚘 ГАРАЖ: ' + (c.ico || '🚙') + ' ' + c.name + '</div>' +
          '<div style="font-size:10px;margin-bottom:5px;">⛽ Бак: <b>' + c.fuel + '/' + c.maxFuel + ' л</b> | 🛡️ Броня: <b>Ур.' + (c.armorLvl || 0) + '/4</b> | 🔫 Оружие: <b>' + wName + '</b></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">' +
          '<button class="btn" style="font-size:10px;" onclick="STIKS.garageUpgrade(\'fuel\')">⛽ Бак 100% (50 💎)</button>' +
          '<button class="btn" ' + ((c.armorLvl || 0) >= 4 ? 'disabled' : '') + ' style="font-size:10px;" onclick="STIKS.garageUpgrade(\'armor\')">🛡️ Броня +1 (1000 💎)</button>' +
          '<button class="btn" style="font-size:10px;" onclick="STIKS.garageUpgrade(\'kord\')">🔫 «Корд» (10000 💎)</button>' +
          '<button class="btn" style="font-size:10px;" onclick="STIKS.garageUpgrade(\'rocket\')">🚀 Ракеты (10000 💎)</button></div>';
      } else {
        out += '<div style="color:#86efac;font-size:10px;">🚗 Автосвалка открыта! Выберите её в Лобби, найдите машину и выведите к краю карты.</div>';
      }
      return out + '</div>';
    },

    shamanQuestAction(act) {
      const hr = this.findHeroByUid(this.baseHeroUid); if (!hr) return;
      if (act === 'take') { hr.shamanQuest = { stage: 1 }; this.saveDB(); this.renderSettlementModal('📜 Знахарь поручил собрать 30 Паутины Улья.'); return; }
      if (act === 'turnin') {
        if (this._countWebInInv(hr) < 30) return;
        this._spendWebFromInv(hr, 30); hr.shamanQuest = { stage: 2 }; hr.junkyardUnlocked = true;
        this.saveDB(); this.renderSettlementModal('🚗 Автосвалка открыта в Лобби!'); return;
      }
      hr.transportQuest = hr.transportQuest || { stage: 2, escortsOut: 0, mineShifts: 0, hotelSleeps: 0 };
      if (act === 'mine') {
        if (this._cleanSporans(hr) < 2) { this.renderSettlementModal('⚠️ Нужно 2 💎.'); return; }
        hr.spores = hr.sporans = hr.spores - 2; hr.transportQuest.mineShifts = Math.min(10, (hr.transportQuest.mineShifts || 0) + 1);
        this.playWorkSound('pickaxe'); this.saveDB(); this.renderSettlementModal('⛏️ Шахта: ' + hr.transportQuest.mineShifts + '/10.');
      } else if (act === 'hotel') {
        if (this._cleanSporans(hr) < 3) { this.renderSettlementModal('⚠️ Нужно 3 💎.'); return; }
        hr.spores = hr.sporans = hr.spores - 3; hr.transportQuest.hotelSleeps = Math.min(3, (hr.transportQuest.hotelSleeps || 0) + 1);
        this.playWorkSound('snore'); this.saveDB(); this.renderSettlementModal('🏨 Отель: ' + hr.transportQuest.hotelSleeps + '/3.');
      } else if (act === 'getkey') {
        hr.hasCarKey = true; this.saveDB(); this.renderSettlementModal('🔑 Ключи получены! Выезды на авто открыты в Лобби.');
      }
    },

    garageUpgrade(type) {
      const hr = this.findHeroByUid(this.baseHeroUid); if (!hr || !hr.car) return;
      const c = hr.car;
      if (type === 'fuel') {
        if (this._cleanSporans(hr) < 50) { this.renderSettlementModal('⚠️ Нужно 50 💎.'); return; }
        hr.spores = hr.sporans = hr.spores - 50; c.fuel = c.maxFuel; this.saveDB(); this.renderSettlementModal('⛽ Бак заправлен на 100%!');
      } else if (type === 'armor') {
        if ((c.armorLvl || 0) >= 4 || this._cleanSporans(hr) < 1000) { this.renderSettlementModal('⚠️ Нужно 1000 💎 (макс. 4 ур.).'); return; }
        hr.spores = hr.sporans = hr.spores - 1000; c.armorLvl = (c.armorLvl || 0) + 1; this.playWorkSound('anvil'); this.saveDB(); this.renderSettlementModal('🛡️ Броня Ур.' + c.armorLvl + '!');
      } else if (type === 'kord' || type === 'rocket') {
        if (this._cleanSporans(hr) < 10000) { this.renderSettlementModal('⚠️ Нужно 10000 💎.'); return; }
        hr.spores = hr.sporans = hr.spores - 10000;
        c.weapon = type === 'kord' ? { id: 'kord', name: 'Пулемёт «Корд» (10с)', durSec: 10, maxRank: 8, stunTurns: 0 } : { id: 'rocket', name: 'Ракетный комплекс (15с)', durSec: 15, maxRank: 9, stunTurns: 2 };
        this.playWorkSound('anvil'); this.saveDB(); this.renderSettlementModal('💥 Установлено: ' + c.weapon.name + '!');
      }
    },

    settlementDuel(oppUid) {
      const hrA = this.findHeroByUid(this.baseHeroUid);
      const hrB = this.findHeroByUid(oppUid);
      if (!hrA || !hrB || hrA.uid === hrB.uid || hrA.family === hrB.family) return;
      const feeA = hrA.isKvaz ? 4 : 2, feeB = hrB.isKvaz ? 4 : 2;
      if (this._cleanSporans(hrA) < feeA || this._cleanSporans(hrB) < feeB) {
        this.renderSettlementModal(`⚠️ Для оплаты лекаря нужно ${feeA} 💎 и ${feeB} 💎.`); return;
      }
      hrA.spores = hrA.sporans = hrA.spores - feeA;
      hrB.spores = hrB.sporans = hrB.spores - feeB;
      const powA = (hrA.stats.str || 10) + (hrA.stats.agi || 10) + Math.random() * 10;
      const powB = (hrB.stats.str || 10) + (hrB.stats.agi || 10) + Math.random() * 10;
      const win = powA >= powB ? hrA : hrB;
      const lose = win.uid === hrA.uid ? hrB : hrA;
      const keys = Array.of('str', 'agi', 'spd', 'end', 'int', 'spi');
      const sW = keys.at(Math.floor(Math.random() * keys.length));
      const sL = keys.at(Math.floor(Math.random() * keys.length));
      win.stats[sW] = this._round100((win.stats[sW] || 10) + 2);
      lose.stats[sL] = this._round100((lose.stats[sL] || 10) + 1);
      hrA.hp = hrA.maxHp; hrB.hp = hrB.maxHp;
      this.recalcLevel(hrA); this.recalcLevel(hrB);
      this.normalizePlayerStats(hrA); this.normalizePlayerStats(hrB);
      this.saveDB();
      this.renderSettlementModal(`🥊 Спарринг завершён! Победитель: <b>${win.name}</b> (+2 к стату), <b>${lose.name}</b> (+1 к стату). ОЗ восстановлены.`);
    },

    getNestCost(hr, placeId) {
      const counts = (hr && hr.nestCounts) || {};
      const n = Math.max(0, Number(counts[placeId]) || 0);
      return Math.pow(2, n);
    },

    openNest(famOrUid, idx) {
      const hr = (typeof idx === 'number' && this.db.families[famOrUid]) ? this.db.families[famOrUid].at(idx) : this.findHeroByUid(famOrUid);
      if (!hr || !this.isVeteran(hr)) return;
      const isInf = Boolean((hr.isInfected || hr.asInfected || hr.arch === 'infected') && !hr.isKvaz);
      if (!isInf) { this.openSettlement(famOrUid, idx); return; }
      this.syncSporans(hr);
      this.nestHeroUid = hr.uid;
      if (this.ambientAudio) this.ambientAudio.playMode('raid');
      this.renderNestModal('');
    },

    closeNest() {
      const el = document.getElementById('stiks-nest-modal');
      if (el) el.remove();
      this.nestHeroUid = null;
      if (this.ambientAudio) this.ambientAudio.stop();
      this.renderLobby();
    },

    nestPayFine() {
      const hr = this.findHeroByUid(this.nestHeroUid); if (!hr) return;
      const fine = Number(hr.nestFine || 0);
      if (fine <= 0) return;
      if (this._cleanSporans(hr) < fine) {
        this.renderNestModal(`⚠️ Не хватает споранов для уплаты дани (${fine} 💎).`); return;
      }
      hr.spores = hr.sporans = hr.spores - fine;
      hr.nestFine = 0;
      this.saveDB();
      this.renderNestModal(`✅ Дань ${fine} 💎 уплачена! Тропы Гнезда снова открыты.`);
    },

    nestRitual() {
      const hr = this.findHeroByUid(this.nestHeroUid); if (!hr) return;
      const st = this._ensureBaseCycle(hr, 'nestState');
      if (st.ritualUsed) {
        this.renderNestModal(`⚠️ Зов Матки уже совершён на уровне ${st.level}.`); return;
      }
      this.normalizePlayerStats(hr);
      st.ritualUsed = true;
      Array.of('food', 'water', 'stamina', 'spore', 'mana').forEach(k => {
        const maxK = 'max' + k.charAt(0).toUpperCase() + k.slice(1);
        if (hr[maxK]) hr[k] = Math.min(hr[maxK], Math.round((hr[k] || 0) + hr[maxK] * 0.5));
      });
      this.saveDB();
      this.renderNestModal('☣️ Зов Матки завершён: Сытость, Жажда, Бодрость, Мана и Споровый баланс +50%!');
    },

    nestVisit(placeId) {
      const hr = this.findHeroByUid(this.nestHeroUid); if (!hr) return;
      const st = this._ensureBaseCycle(hr, 'nestState');
      if (Number(hr.nestFine || 0) > 0) {
        this.renderNestModal(`🚨 Все 5 мест Гнезда закрыты до уплаты дани (${hr.nestFine} 💎)!`); return;
      }
      if (st.visited[placeId]) {
        this.renderNestModal(`⚠️ Вы уже были здесь на уровне ${st.level}.`); return;
      }
      const cost = this.getNestCost(hr, placeId);
      if (this._cleanSporans(hr) < cost) {
        this.renderNestModal(`⚠️ Недостаточно споранов (нужно ${cost} 💎).`); return;
      }
      hr.spores = hr.sporans = hr.spores - cost;
      st.visited[placeId] = true;
      hr.nestCounts = hr.nestCounts || { cocoon: 0, memory: 0, hunt: 0, pit: 0, slime: 0 };
      hr.nestCounts[placeId] = Number(hr.nestCounts[placeId] || 0) + 1;
      let msg = '';
      if (placeId === 'cocoon') {
        hr.stats.spi = this._round100((hr.stats.spi || 10) + cost);
        msg = `🧬 Споровый кокон: Дух +${cost}.`;
        const up = this._boostRandomOpenedGift(hr, 1);
        if (up) msg += ` Дар «${up.name}» усилен до Ур.${up.lvl}!`;
      } else if (placeId === 'memory') {
        hr.stats.int = this._round100((hr.stats.int || 10) + cost);
        const arc = typeof this.unlockNextArchiveEntry === 'function' ? this.unlockNextArchiveEntry() : null;
        msg = `🧠 Память Улья: Интеллект +${cost}.` + (arc ? ` Пробуждена запись Архива #${arc}!` : '');
      } else if (placeId === 'hunt') {
        const half = Math.floor(cost / 2), rem = cost - half;
        hr.stats.agi = this._round100((hr.stats.agi || 10) + half);
        hr.stats.spd = this._round100((hr.stats.spd || 10) + rem);
        msg = `🐾 Охотничьи тропы: Ловкость +${half}, Скорость +${rem}.`;
      } else if (placeId === 'pit') {
        hr.stats.str = this._round100((hr.stats.str || 10) + cost);
        if (hr.crownQuest && hr.crownQuest.stage === 2) hr.crownQuest.pitShifts = Math.min(5, (Number(hr.crownQuest.pitShifts) || 0) + 1);
        msg = `🦴 Костяная яма: Сила +${cost}.`;
      } else if (placeId === 'slime') {
        if (Math.random() < 0.50) {
          Array.of('str', 'agi', 'spd', 'end').forEach(k => { hr.stats[k] = this._round100((hr.stats[k] || 10) + 2); });
          hr.nestFine = cost * 5;
          msg = `🩸 БЕШЕНСТВО СТАИ! Разнесли логово: Сила/Ловкость/Скорость/Выносливость +2! Дань <b>${hr.nestFine} 💎</b> — все места закрыты до уплаты.`;
        } else {
          hr.stats.end = this._round100((hr.stats.end || 10) + cost);
          if (hr.crownQuest && hr.crownQuest.stage === 2) hr.crownQuest.slimeSleeps = Math.min(5, (Number(hr.crownQuest.slimeSleeps) || 0) + 1);
          msg = `🫧 Слизевая купель: Выносливость +${cost}.`;
        }
      }
      this.recalcLevel(hr); this.normalizePlayerStats(hr); this.saveDB();
      this.renderNestModal(msg + ` Следующий вход: ${this.getNestCost(hr, placeId)} 💎.`);
    },

    renderNestQuestsAndPack(hr) {
      const aq = hr.ancestorsQuest || { active: false, eaten: 0, done: 0 };
      const cq = hr.crownQuest || {};
      const webCnt = this._countWebInInv(hr);
      let out = '<div style="background:#1c1226;border:1px solid #6b21a8;border-radius:5px;padding:7px;margin-top:8px;">';
      if (!aq.active) {
        out += '<div style="color:#e9d5ff;margin-bottom:4px;">🧬 <b>Дар Предков</b> (выполнено: ' + (aq.done || 0) + '): поглоти 10 людей в рейдах за 3 Жемчужины Улья.</div>' +
          '<button class="btn" style="width:100%;font-size:10px;margin-bottom:6px;" onclick="STIKS.nestQuestAction(\'anc_take\')">Принять «Дар Предков»</button>';
      } else {
        out += '<div style="color:#e9d5ff;margin-bottom:4px;">🧬 <b>Дар Предков:</b> поглощено людей <b>' + (aq.eaten || 0) + ' / 10</b></div>' +
          '<button class="btn btn-primary" ' + ((aq.eaten || 0) < 10 ? 'disabled' : '') + ' style="width:100%;font-size:10px;margin-bottom:6px;" onclick="STIKS.nestQuestAction(\'anc_claim\')">Забрать 3 Жемчужины Улья</button>';
      }
      if (!hr.cemeteryUnlocked && !hr.pack) {
        out += '<div style="color:#fde047;margin-bottom:4px;">🕸️ <b>Зов Древнего Кладбища:</b> принести 30 Паутины (' + webCnt + '/30).</div>' +
          '<button class="btn btn-primary" ' + (webCnt < 30 ? 'disabled' : '') + ' style="width:100%;font-size:10px;" onclick="STIKS.nestQuestAction(\'cem_open\')">Сдать 30 Паутины -> Открыть Кладбище</button>';
      } else if (hr.pack && !hr.hasPack) {
        const eh = Number(cq.eatenHumans || 0), ps = Number(cq.pitShifts || 0), ss = Number(cq.slimeSleeps || 0);
        const ready = eh >= 5 && ps >= 5 && ss >= 3;
        out += '<div style="color:#d8b4fe;font-weight:bold;margin-bottom:4px;">👑 ИСПЫТАНИЯ СТАИ «' + hr.pack.name + '»:</div>' +
          '<div style="font-size:10px;margin-bottom:4px;">• Съедено людей: <b>' + eh + '/5</b> | Костяная яма: <b>' + ps + '/5</b> | Слизевая купель: <b>' + ss + '/3</b></div>' +
          '<button class="btn btn-primary" ' + (!ready ? 'disabled' : '') + ' style="width:100%;font-size:10px;" onclick="STIKS.nestQuestAction(\'pack_wake\')">👑 Подчинить Стаю</button>';
      } else if (hr.hasPack && hr.pack) {
        const pk = hr.pack;
        out += '<div style="color:#d8b4fe;font-weight:bold;margin-bottom:4px;">🐾 ЛОГОВО СТАИ: ' + (pk.ico || '🐺') + ' ' + pk.name + '</div>' +
          '<div style="font-size:10px;margin-bottom:4px;">🍖 Сытость: <b>' + pk.fuel + '/' + pk.maxFuel + '</b> | 🦴 Когти-таран: <b>Ур.' + (pk.armorLvl || 0) + '/4</b></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">' +
          '<button class="btn" style="font-size:10px;" onclick="STIKS.packUpgrade(\'feed\')">🍖 Накормить (50 💎)</button>' +
          '<button class="btn" ' + ((pk.armorLvl || 0) >= 4 ? 'disabled' : '') + ' style="font-size:10px;" onclick="STIKS.packUpgrade(\'claws\')">🦴 Мутация +1 (1000 💎)</button></div>';
      }
      return out + '</div>';
    },

    nestQuestAction(act) {
      const hr = this.findHeroByUid(this.nestHeroUid); if (!hr) return;
      if (act === 'anc_take') { hr.ancestorsQuest = { active: true, eaten: 0, done: (hr.ancestorsQuest && hr.ancestorsQuest.done) || 0 }; this.saveDB(); this.renderNestModal('🧬 Квест «Дар Предков» принят: поглоти 10 людей в рейдах.'); }
      else if (act === 'anc_claim') {
        if (!hr.ancestorsQuest || (hr.ancestorsQuest.eaten || 0) < 10) return;
        hr.ancestorsQuest = { active: false, eaten: 0, done: (hr.ancestorsQuest.done || 0) + 1 };
        hr.inv.push({ n: '⚫ Чёрный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'black', rank: 3, w: 0.1, q: 2 });
        hr.inv.push({ n: '🔴 Красный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'red', rank: 3, w: 0.1, q: 1 });
        hr.inv = this.stackInventory(hr.inv); this.saveDB();
        this.renderNestModal('🎁 Дар Предков получен: 2 Чёрные и 1 Красная жемчужины Улья!');
      } else if (act === 'cem_open') {
        if (this._countWebInInv(hr) < 30) return;
        this._spendWebFromInv(hr, 30); hr.cemeteryUnlocked = true; this.saveDB();
        this.renderNestModal('🪦 Древнее Кладбище открыто в Лобби! Найди Корону Избранного.');
      } else if (act === 'pack_wake') {
        hr.hasPack = true; this.saveDB();
        this.renderNestModal('👑 Стая «' + hr.pack.name + '» признала вожака! Выходы со Стаей открыты в Лобби.');
      }
    },

    packUpgrade(type) {
      const hr = this.findHeroByUid(this.nestHeroUid); if (!hr || !hr.pack) return;
      const pk = hr.pack;
      if (type === 'feed') {
        if (this._cleanSporans(hr) < 50) { this.renderNestModal('⚠️ Нужно 50 💎.'); return; }
        hr.spores = hr.sporans = hr.spores - 50; pk.fuel = pk.maxFuel; this.saveDB();
        this.renderNestModal('🍖 Стая «' + pk.name + '» сыта на 100%!');
      } else if (type === 'claws') {
        if ((pk.armorLvl || 0) >= 4 || this._cleanSporans(hr) < 1000) { this.renderNestModal('⚠️ Нужно 1000 💎 (макс. 4 ур.).'); return; }
        hr.spores = hr.sporans = hr.spores - 1000; pk.armorLvl = (pk.armorLvl || 0) + 1; this.saveDB();
        this.renderNestModal('🦴 Мутация Стаи усилена до Ур.' + pk.armorLvl + '!');
      }
    },

    nestDuel(oppUid) {
      const hrA = this.findHeroByUid(this.nestHeroUid);
      const hrB = this.findHeroByUid(oppUid);
      if (!hrA || !hrB || hrA.uid === hrB.uid || hrA.family === hrB.family) return;
      if (this._cleanSporans(hrA) < 2 || this._cleanSporans(hrB) < 2) {
        this.renderNestModal('⚠️ Для схватки нужно по 2 💎 у каждого заражённого.'); return;
      }
      hrA.spores = hrA.sporans = hrA.spores - 2;
      hrB.spores = hrB.sporans = hrB.spores - 2;
      const powA = (hrA.stats.str || 10) + (hrA.stats.agi || 10) + Math.random() * 10;
      const powB = (hrB.stats.str || 10) + (hrB.stats.agi || 10) + Math.random() * 10;
      const win = powA >= powB ? hrA : hrB;
      const lose = win.uid === hrA.uid ? hrB : hrA;
      const keys = Array.of('str', 'agi', 'spd', 'end', 'int', 'spi');
      win.stats[keys.at(Math.floor(Math.random() * 6))] += 2;
      lose.stats[keys.at(Math.floor(Math.random() * 6))] += 1;
      hrA.hp = hrA.maxHp; hrB.hp = hrB.maxHp;
      this.recalcLevel(hrA); this.recalcLevel(hrB);
      this.normalizePlayerStats(hrA); this.normalizePlayerStats(hrB);
      this.saveDB();
      this.renderNestModal(`🐾 Схватка в Гнезде! Победил <b>${win.name}</b> (+2 к стату), <b>${lose.name}</b> (+1 к стату).`);
    },

    renderNestModal(notice) {
      const hr = this.findHeroByUid(this.nestHeroUid); if (!hr) return;
      const old = document.getElementById('stiks-nest-modal');
      const savedScroll = (old && old.firstElementChild) ? old.firstElementChild.scrollTop : 0;
      if (old) old.remove();

      const st = this._ensureBaseCycle(hr, 'nestState');
      const fine = Number(hr.nestFine || 0);
      const places = Array.of(
        { id: 'cocoon', ico: '🧬', name: 'Споровый кокон', desc: 'Дух +база и +1 ур. к Дару' },
        { id: 'memory', ico: '🧠', name: 'Память Улья', desc: 'Интеллект +база и запись Архива' },
        { id: 'hunt', ico: '🐾', name: 'Охотничьи тропы', desc: 'Ловкость и Скорость +база' },
        { id: 'pit', ico: '🦴', name: 'Костяная яма', desc: 'Сила +база' },
        { id: 'slime', ico: '🫧', name: 'Слизевая купель', desc: 'Выносливость (50% бешенство ×5)' }
      );

      const ov = document.createElement('div');
      ov.id = 'stiks-nest-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,4,8,0.94);z-index:9530;display:flex;align-items:center;justify-content:center;padding:10px;font-family:monospace;color:#f3e8ff;';
      let h = '<div style="width:100%;max-width:440px;max-height:92dvh;overflow-y:auto;border:1px solid #9333ea;background:#140e1a;padding:12px;border-radius:6px;font-size:11px;">' +
        `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #6b21a8;padding-bottom:6px;margin-bottom:8px;"><b style="color:#d8b4fe;font-size:13px;">🕳️ ГНЕЗДО УЛЬЯ: ${hr.name} (Ур.${hr.lvl || 0})</b><button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="STIKS.closeNest()">✖</button></div>` +
        `<div style="background:#1e1229;border:1px solid #6b21a8;padding:6px;margin-bottom:8px;display:flex;justify-content:space-between;"><span>💎 Спораны: <b>${this._cleanSporans(hr)}</b></span><span>Цикл уровня: <b>Ур.${st.level}</b></span></div>`;

      if (notice) h += `<div style="background:#24152e;border:1px solid #c084fc;color:#f3e8ff;padding:6px;border-radius:4px;margin-bottom:8px;">${notice}</div>`;
      if (fine > 0) {
        h += `<div style="background:#2b1111;border:1px solid #ef4444;padding:8px;border-radius:4px;margin-bottom:8px;"><div style="color:#fca5a5;margin-bottom:6px;">🚨 Дань за бешенство: <b>${fine} 💎</b>. Все тропы закрыты.</div>` +
          `<button class="btn btn-danger" style="width:100%;" onclick="STIKS.nestPayFine()">Уплатить дань (${fine} 💎)</button></div>`;
      }

      h += `<button class="btn" ${st.ritualUsed ? 'disabled' : ''} style="width:100%;margin-bottom:8px;border-color:#c084fc;color:#e9d5ff;" onclick="STIKS.nestRitual()">☣️ Зов Матки (+50% показателей • ${st.ritualUsed ? 'совершён' : '1 раз/ур.'})</button>`;

      places.forEach(pl => {
        const visited = Boolean(st.visited[pl.id]);
        const cost = this.getNestCost(hr, pl.id);
        const dis = (fine > 0 || visited) ? 'disabled' : '';
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #291838;gap:6px;"><div><b>${pl.ico} ${pl.name}</b><div style="font-size:9.5px;color:#c4b5fd;">${pl.desc}</div></div>` +
          `<button class="btn btn-primary" ${dis} style="width:auto;padding:4px 8px;font-size:10px;" onclick="STIKS.nestVisit('${pl.id}')">${visited ? 'Посещено' : cost + ' 💎'}</button></div>`;
      });

      h += this.renderSettlementQuestsAndGarage(hr);
      const opps = Array.of();
      Object.keys(this.db.families || {}).forEach(f => {
        if (f === hr.family) return;
        (this.db.families[f] || Array.of()).forEach(o => {
          const oInf = Boolean((o.isInfected || o.asInfected || o.arch === 'infected') && !o.isKvaz);
          if (o && o.status !== 'dead' && oInf && this.isVeteran(o)) opps.push(o);
        });
      });
      h += this.renderNestQuestsAndPack(hr);
      h += '<div style="color:#d8b4fe;font-weight:bold;margin:8px 0 4px 0;">🐾 СХВАТКА ЗАРАЖЁННЫХ (другая фамилия):</div>';
      if (!opps.length) h += '<div style="font-size:10px;color:#94a3b8;">Нет доступных заражённых из других фамилий.</div>';
      else opps.forEach(o => {
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;"><span>${o.family} ${o.name} (Ур.${o.lvl || 0})</span><button class="btn" style="width:auto;padding:2px 7px;font-size:10px;" onclick="STIKS.nestDuel('${o.uid}')">Бой (2 💎)</button></div>`;
      });

      ov.innerHTML = h + '</div>';
      document.body.appendChild(ov);
      if (savedScroll > 0 && ov.firstElementChild) ov.firstElementChild.scrollTop = savedScroll;
    },

    CAR_CATALOG: Array.of(
      { id: 'buggy', ico: '🏎️', name: 'Багги «Стриж»', trunkCap: 350, maxFuel: 80, towPen: 1, armorLvl: 0, weapon: null },
      { id: 'jeep', ico: '🚙', name: 'Внедорожник «Вепрь»', trunkCap: 600, maxFuel: 100, towPen: 2, armorLvl: 1, weapon: null },
      { id: 'truck', ico: '🚛', name: 'Броневик «Молот»', trunkCap: 1000, maxFuel: 140, towPen: 3, armorLvl: 2, weapon: { id: 'kord', name: 'Пулемёт «Корд» (10с)', durSec: 10, maxRank: 8, stunTurns: 0 } }
    ),

    PACK_CATALOG: Array.of(
      { id: 'scouts', ico: '🐕', name: 'Стая «Гончие Улья»', trunkCap: 350, maxFuel: 80, towPen: 1, armorLvl: 0, weapon: null },
      { id: 'brutes', ico: '🐺', name: 'Стая «Костоломы»', trunkCap: 600, maxFuel: 100, towPen: 2, armorLvl: 1, weapon: null },
      { id: 'behemoths', ico: '🦍', name: 'Стая «Титаны Гнезда»', trunkCap: 1000, maxFuel: 140, towPen: 3, armorLvl: 2, weapon: { id: 'fierce_pack', name: 'Ярость Стаи (10с)', durSec: 10, maxRank: 8, stunTurns: 2 } }
    ),

    showCarChoiceModal(p) {
      if (!p || typeof document === 'undefined' || !document.body) return;
      const old = document.getElementById('stiks-car-choice-modal');
      if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'stiks-car-choice-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(4,6,5,0.94);z-index:9870;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#fef3c7;';
      let h = '<div style="width:100%;max-width:400px;background:#1a140e;border:2px solid #f59e0b;border-radius:10px;padding:14px;font-size:11px;">' +
        '<div style="color:#fde047;font-weight:bold;font-size:13px;text-align:center;margin-bottom:8px;">🚗 НАЙДЕН ОСТОВ ТРАНСПОРТА!</div>' +
        '<div style="margin-bottom:8px;color:#cbd5e1;">Выберите машину для буксировки к выходу (штраф ОХ на время буксира):</div>';
      this.CAR_CATALOG.forEach((c, idx) => {
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #452c14;"><div><b>${c.ico} ${c.name}</b><div style="font-size:9.5px;color:#94a3b8;">Багажник: ${c.trunkCap} кг • Бак: ${c.maxFuel} л • Штраф: -${c.towPen} ОХ</div></div>` +
          `<button class="btn btn-primary" style="width:auto;padding:4px 8px;font-size:10px;" onclick="STIKS.pickTowingCar(${idx})">Взять</button></div>`;
      });
      ov.innerHTML = h + '</div>';
      document.body.appendChild(ov);
    },

    pickTowingCar(idx) {
      const s = this.db && this.db.session, p = s && s.players && s.players.at(s.activeIdx);
      const cfg = this.CAR_CATALOG.at(idx);
      const ov = document.getElementById('stiks-car-choice-modal'); if (ov) ov.remove();
      if (!p || !cfg) return;
      p.towingCar = Object.assign({ fuel: cfg.maxFuel }, cfg);
      this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB();
      this.log(`🚗 ${p.name} взял на буксир «${cfg.name}»! Выведите его за край карты.`);
      this.renderGame();
    },

    showCrownChoiceModal(p) {
      if (!p || typeof document === 'undefined' || !document.body) return;
      const old = document.getElementById('stiks-crown-choice-modal');
      if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'stiks-crown-choice-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(6,4,10,0.94);z-index:9870;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#f3e8ff;';
      let h = '<div style="width:100%;max-width:400px;background:#181022;border:2px solid #c084fc;border-radius:10px;padding:14px;font-size:11px;">' +
        '<div style="color:#e9d5ff;font-weight:bold;font-size:13px;text-align:center;margin-bottom:8px;">👑 КОРОНА ИЗБРАННОГО УЛЬЯ!</div>' +
        '<div style="margin-bottom:8px;color:#cbd5e1;">Выберите, какую Стаю подчинит эта Корона после выноса из склепа:</div>';
      this.PACK_CATALOG.forEach((pk, idx) => {
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #3b1c54;"><div><b>${pk.ico} ${pk.name}</b><div style="font-size:9.5px;color:#c4b5fd;">Носильщики: ${pk.trunkCap} кг • Запас сил: ${pk.maxFuel} • Штраф: -${pk.towPen} ОХ</div></div>` +
          `<button class="btn btn-primary" style="width:auto;padding:4px 8px;font-size:10px;" onclick="STIKS.pickCrownPack(${idx})">Взять</button></div>`;
      });
      ov.innerHTML = h + '</div>';
      document.body.appendChild(ov);
    },

    pickCrownPack(idx) {
      const s = this.db && this.db.session, p = s && s.players && s.players.at(s.activeIdx);
      const cfg = this.PACK_CATALOG.at(idx);
      const ov = document.getElementById('stiks-crown-choice-modal'); if (ov) ov.remove();
      if (!p || !cfg) return;
      p.carryingCrown = Object.assign({ fuel: cfg.maxFuel }, cfg);
      this.normalizePlayerStats(p); this.syncHeroProfile(p); this.saveDB();
      this.log(`👑 ${p.name} поднял Корону («${cfg.name}»)! Вынесите её за край карты.`);
      this.renderGame();
    },

    launchCarRaid(dKey, ownerUid) {
      const ow = this.findHeroByUid(ownerUid);
      if (!ow || !ow.hasCar || !ow.hasCarKey || !ow.car) { this.log('🚫 Нужны машина и ключи от неё!'); return; }
      const needFuel = Math.ceil((ow.car.maxFuel || 100) * 0.5);
      if ((ow.car.fuel || 0) < needFuel) { this.log(`⛽ Недостаточно топлива (нужно ${needFuel} л).`); return; }
      ow.car.fuel -= needFuel;
      this.saveDB();
      this.launchMap(dKey || 'start');
      if (this.db.session) {
        this.db.session.activeCarOwnerUid = ownerUid;
        const lead = this.db.session.players.at(0);
        if (lead) { lead.carTrunkCap = ow.car.trunkCap || 500; lead.carTrunk = ow.carTrunk || Array.of(); }
        this.saveDB();
        this.log(`🚙 Отряд выехал на «${ow.car.name}» (-${needFuel} л топлива). Багажник: ${ow.car.trunkCap} кг.`);
      }
    },

    launchPackRaid(dKey, ownerUid) {
      const ow = this.findHeroByUid(ownerUid);
      if (!ow || !ow.hasPack || !ow.pack) { this.log('🚫 Нет подчиненной Стаи!'); return; }
      const needFuel = Math.ceil((ow.pack.maxFuel || 100) * 0.5);
      if ((ow.pack.fuel || 0) < needFuel) { this.log(`🍖 Недостаточно сытости Стаи (нужно ${needFuel}).`); return; }
      ow.pack.fuel -= needFuel;
      this.saveDB();
      this.launchMap(dKey || 'start');
      if (this.db.session) {
        this.db.session.activePackOwnerUid = ownerUid;
        const lead = this.db.session.players.at(0);
        if (lead) { lead.carTrunkCap = ow.pack.trunkCap || 500; lead.carTrunk = ow.carTrunk || Array.of(); }
        this.saveDB();
        this.log(`🐾 Отряд выступил со стаей «${ow.pack.name}» (-${needFuel} сил). Носильщики: ${ow.pack.trunkCap} кг.`);
      }
    },

    launchFarCarRaid(ownerUid) {
      const ow = this.findHeroByUid(ownerUid);
      if (!ow || !ow.hasCar || !ow.hasCarKey || !ow.car) return;
      if ((ow.car.fuel || 0) < (ow.car.maxFuel || 100)) { this.log('⛽ Для дальнего рейда нужен полный бак (100%)!'); return; }
      ow.car.fuel = 0;
      ow.inFarSettlement = true;
      this.saveDB();
      this.log(`🛣️ «${ow.car.name}» прорвался через пустоши в Дальнее Поселение!`);
      this.openFarSettlement(ownerUid);
    },

    launchFarPackRaid(ownerUid) {
      const ow = this.findHeroByUid(ownerUid);
      if (!ow || !ow.hasPack || !ow.pack) return;
      if ((ow.pack.fuel || 0) < (ow.pack.maxFuel || 100)) { this.log('🍖 Для дальнего перехода нужна полная сытость Стаи (100%)!'); return; }
      ow.pack.fuel = 0;
      ow.inFarNest = true;
      this.saveDB();
      this.log(`🌑 Стая «${ow.pack.name}» пробилась в Дальнее Гнездо!`);
      this.openFarNest(ownerUid);
    },

    openFarSettlement(ownerUid) {
      const ow = this.findHeroByUid(ownerUid); if (!ow) return;
      this.farHeroUid = ow.uid;
      this.renderFarSettlementModal('');
    },

    closeFarSettlement(returnHome) {
      const ow = this.findHeroByUid(this.farHeroUid);
      if (ow && returnHome) ow.inFarSettlement = false;
      this.saveDB();
      const el = document.getElementById('stiks-far-settlement'); if (el) el.remove();
      this.farHeroUid = null;
      this.renderLobby();
    },

    farSettlementAction(act) {
      const ow = this.findHeroByUid(this.farHeroUid); if (!ow) return;
      if (act === 'rest') {
        ow.hp = ow.maxHp; ow.food = ow.maxFood; ow.water = ow.maxWater; ow.stamina = ow.maxStamina; ow.mana = ow.maxMana;
        this.saveDB();
        this.renderFarSettlementModal('🛌 Отдых у костра: ОЗ, Сытость, Жажда, Бодрость и Мана восстановлены на 100%!');
      } else if (act === 'sell_trunk') {
        const trunk = ow.carTrunk || Array.of();
        if (!trunk.length) { this.renderFarSettlementModal('📦 Багажник пуст.'); return; }
        let total = 0;
        trunk.forEach(it => { total += Math.max(1, Math.round((Number(it.price || it.weight || 1)) * 1.5)); });
        ow.carTrunk = Array.of();
        ow.spores = ow.sporans = this._cleanSporans(ow) + total;
        this.saveDB();
        this.renderFarSettlementModal(`💰 Скупщик выкупил весь груз из багажника с наценкой +50% за <b>${total} 💎</b>!`);
      } else if (act === 'relic') {
        if (this._cleanSporans(ow) < 15) { this.renderFarSettlementModal('⚠️ Для заказа Реликвии нужно 15 💎.'); return; }
        ow.spores = ow.sporans = ow.spores - 15;
        const keys = Array.of('str', 'agi', 'spd', 'end', 'int', 'spi');
        keys.forEach(k => { ow.stats[k] = this._round100((ow.stats[k] || 10) + 1); });
        this.recalcLevel(ow); this.normalizePlayerStats(ow); this.saveDB();
        this.renderFarSettlementModal('🏺 Мастер Дальнего Поселения вручил Реликвию: все 6 характеристик +1!');
      }
    },

    renderFarSettlementModal(notice) {
      const ow = this.findHeroByUid(this.farHeroUid); if (!ow) return;
      const old = document.getElementById('stiks-far-settlement'); if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'stiks-far-settlement';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(4,6,5,0.95);z-index:9540;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#fef3c7;';
      const trunkCnt = (ow.carTrunk || Array.of()).length;
      let h = '<div style="width:100%;max-width:420px;border:1px solid #f59e0b;background:#17120c;padding:12px;border-radius:6px;font-size:11px;">' +
        `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #78350f;padding-bottom:6px;margin-bottom:8px;"><b style="color:#fde047;">🛣️ ДАЛЬНЕЕ ПОСЕЛЕНИЕ: ${ow.name}</b><button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="STIKS.closeFarSettlement(false)">Свернуть</button></div>` +
        `<div style="margin-bottom:8px;">💎 Спораны: <b>${this._cleanSporans(ow)}</b> • Груз в машине: <b>${trunkCnt} шт.</b></div>`;
      if (notice) h += `<div style="background:#261c0f;border:1px solid #f59e0b;padding:6px;border-radius:4px;margin-bottom:8px;">${notice}</div>`;
      h += `<button class="btn" style="width:100%;margin-bottom:6px;" onclick="STIKS.farSettlementAction('rest')">🛌 Полный отдых (100% показателей)</button>` +
        `<button class="btn btn-primary" style="width:100%;margin-bottom:6px;" onclick="STIKS.farSettlementAction('sell_trunk')">💰 Сдать груз из багажника (+50% к цене)</button>` +
        `<button class="btn" style="width:100%;margin-bottom:8px;border-color:#facc15;color:#fef08a;" onclick="STIKS.farSettlementAction('relic')">🏺 Купить Реликвию (+1 ко всем 6 статам • 15 💎)</button>` +
        `<button class="btn btn-danger" style="width:100%;" onclick="STIKS.closeFarSettlement(true)">🚙 Вернуться в родное Поселение</button></div>`;
      ov.innerHTML = h;
      document.body.appendChild(ov);
    },

    openFarNest(ownerUid) {
      const ow = this.findHeroByUid(ownerUid); if (!ow) return;
      this.farNestHeroUid = ow.uid;
      this.renderFarNestModal('');
    },

    closeFarNest(returnHome) {
      const ow = this.findHeroByUid(this.farNestHeroUid);
      if (ow && returnHome) ow.inFarNest = false;
      this.saveDB();
      const el = document.getElementById('stiks-far-nest'); if (el) el.remove();
      this.farNestHeroUid = null;
      this.renderLobby();
    },

    farNestAction(act) {
      const ow = this.findHeroByUid(this.farNestHeroUid); if (!ow) return;
      if (act === 'rest') {
        ow.hp = ow.maxHp; ow.food = ow.maxFood; ow.water = ow.maxWater; ow.stamina = ow.maxStamina; ow.spore = ow.maxSpore;
        this.saveDB();
        this.renderFarNestModal('🧬 Сон в Слизевом Куполе: ОЗ, Сытость, Жажда, Бодрость и Споры 100%!');
      } else if (act === 'sell_trunk') {
        const trunk = ow.carTrunk || Array.of();
        if (!trunk.length) { this.renderFarNestModal('📦 Носильщики Стаи пусты.'); return; }
        let total = 0;
        trunk.forEach(it => { total += Math.max(1, Math.round((Number(it.price || it.weight || 1)) * 1.5)); });
        ow.carTrunk = Array.of();
        ow.spores = ow.sporans = this._cleanSporans(ow) + total;
        this.saveDB();
        this.renderFarNestModal('🔮 Матка поглотила добычу носильщиков (+50%) и выделила <b>' + total + ' 💎</b>!');
      } else if (act === 'mutagen') {
        if (this._cleanSporans(ow) < 15) { this.renderFarNestModal('⚠️ Для Мутагена Улья нужно 15 💎.'); return; }
        ow.spores = ow.sporans = ow.spores - 15;
        Array.of('str', 'agi', 'spd', 'end', 'int', 'spi').forEach(k => { ow.stats[k] = this._round100((ow.stats[k] || 10) + 1); });
        this.recalcLevel(ow); this.normalizePlayerStats(ow); this.saveDB();
        this.renderFarNestModal('☣️ Принят Мутаген Праматери: все 6 характеристик +1!');
      }
    },

    renderFarNestModal(notice) {
      const ow = this.findHeroByUid(this.farNestHeroUid); if (!ow) return;
      const old = document.getElementById('stiks-far-nest'); if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'stiks-far-nest';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,3,8,0.95);z-index:9550;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#f3e8ff;';
      const trunkCnt = (ow.carTrunk || Array.of()).length;
      let h = '<div style="width:100%;max-width:420px;border:1px solid #a855f7;background:#140c1c;padding:12px;border-radius:6px;font-size:11px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #6b21a8;padding-bottom:6px;margin-bottom:8px;"><b style="color:#d8b4fe;">🌑 ДАЛЬНЕЕ ГНЕЗДО: ' + ow.name + '</b><button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="STIKS.closeFarNest(false)">Свернуть</button></div>' +
        '<div style="margin-bottom:8px;">💎 Спораны: <b>' + this._cleanSporans(ow) + '</b> • Груз Стаи: <b>' + trunkCnt + ' шт.</b></div>';
      if (notice) h += '<div style="background:#21122e;border:1px solid #a855f7;padding:6px;border-radius:4px;margin-bottom:8px;">' + notice + '</div>';
      h += '<button class="btn" style="width:100%;margin-bottom:6px;" onclick="STIKS.farNestAction(\'rest\')">🧬 Слизевой Купол (100% показателей)</button>' +
        '<button class="btn btn-primary" style="width:100%;margin-bottom:6px;" onclick="STIKS.farNestAction(\'sell_trunk\')">🔮 Сдать добычу носильщиков (+50% в 💎)</button>' +
        '<button class="btn" style="width:100%;margin-bottom:8px;border-color:#d8b4fe;color:#f3e8ff;" onclick="STIKS.farNestAction(\'mutagen\')">☣️ Мутаген Праматери (+1 ко всем 6 статам • 15 💎)</button>' +
        '<button class="btn btn-danger" style="width:100%;" onclick="STIKS.closeFarNest(true)">🐾 Вернуться в родное Гнездо</button></div>';
      ov.innerHTML = h;
      document.body.appendChild(ov);
    },

    showRaidSummaryModal(info) {
      if (!info || typeof document === 'undefined') return;
      const old = document.getElementById('stiks-raid-summary'); if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'stiks-raid-summary';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,8,6,0.94);z-index:9890;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#e6f5eb;';
      ov.innerHTML = '<div style="width:100%;max-width:380px;background:#111814;border:2px solid #4ade80;border-radius:10px;padding:14px;">' +
        '<div style="color:#86efac;font-weight:bold;font-size:14px;text-align:center;margin-bottom:8px;">🚪 ИТОГИ ВЫХОДА ИЗ РЕЙДА</div>' +
        '<div style="font-size:12px;line-height:1.6;margin-bottom:12px;">Боец: <b>' + info.fam + ' ' + info.name + '</b><br>Уровень: <b>Ур.' + info.endLvl + '</b> (+' + info.lvlGain + ')<br>Побеждено врагов: <b>' + info.kills + '</b><br>Спораны в запасе: <b>' + info.spores + ' 💎</b></div>' +
        '<button class="btn btn-primary" style="width:100%;padding:8px;" onclick="document.getElementById(\'stiks-raid-summary\').remove()">В Лобби ▶</button></div>';
      document.body.appendChild(ov);
    },

    getCodexState() {
      const raw = this._tryParse(localStorage.getItem(this.CODEX_KEY)) || {};
      return { archive: Array.isArray(raw.archive) ? raw.archive : Array.of(), revealedAll: Boolean(raw.revealedAll) };
    },

    saveCodexState(st) {
      try { localStorage.setItem(this.CODEX_KEY, JSON.stringify(st)); } catch (e) {}
    },

    syncCodexFromRoster() {
      const st = this.getCodexState();
      const cnt = Math.min(69, Math.max(st.archive.length, Number((this.db && this.db.archiveUnlocked) || 0)));
      for (let i = 1; i <= cnt; i++) {
        const id = 'arch_' + (i < 10 ? '0' : '') + i;
        if (!st.archive.includes(id)) st.archive.push(id);
      }
      this.saveCodexState(st);
      return st;
    },

    unlockNextArchiveEntry() {
      const st = this.syncCodexFromRoster();
      const pool = Array.of();
      for (let i = 1; i <= 69; i++) {
        const id = 'arch_' + (i < 10 ? '0' : '') + i;
        if (!st.archive.includes(id)) pool.push(i);
      }
      if (!pool.length) return null;
      const specials = Array.of(31, 32, 33, 34, 69).filter(n => pool.includes(n));
      let pick = pool.at(0);
      if (specials.length && (pick > 30 || Math.random() < 0.35)) pick = specials.at(Math.floor(Math.random() * specials.length));
      st.archive.push('arch_' + (pick < 10 ? '0' : '') + pick);
      if (this.db) this.db.archiveUnlocked = st.archive.length;
      this.saveCodexState(st);
      return pick;
    },

    showCodexZoom(src, title) {
      const old = document.getElementById('stiks-codex-zoom'); if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'stiks-codex-zoom';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(2,3,6,0.96);z-index:9950;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#f8fafc;';
      ov.onclick = () => ov.remove();
      ov.innerHTML = '<div style="color:#fbbf24;font-weight:bold;margin-bottom:8px;">' + (title || 'Просмотр') + ' (нажмите, чтобы закрыть)</div>' +
        '<img src="' + src + '" style="max-width:100%;max-height:84dvh;object-fit:contain;border-radius:8px;border:2px solid #d97706;">';
      document.body.appendChild(ov);
    },

    _advanceMutationCycle(p) {
      if (!p) return;
      p.mutationCycles = (Number(p.mutationCycles) || 0) + 1;
      if (p.mutationCycles >= 3 && !p.isLegendary) {
        p.isLegendary = true;
        Array.of('str', 'agi', 'spd', 'end', 'int', 'spi').forEach(k => { p.stats[k] = this._round100((p.stats[k] || 10) + 15); });
        this.log(`👑 ТРЕТИЙ КРУГ ЭВОЛЮЦИИ ПРОЙДЕН! ${p.name} обретает титул <b>ЛЕГЕНДАРНЫЙ</b> (+15 ко всем статам)!`);
      } else if (!p.isLegendary) {
        this.log(`🧬 Завершён круг эволюции Улья: <b>${p.mutationCycles} / 3</b> до титула «Легендарный».`);
      }
    },

    CODEX_ARCHIVE_30: Array.of(
      'Запись #01: Улей не рождает материю из пустоты — он перешивает куски чужих миров в единый лоскутный континент.',
      'Запись #02: Споровый баланс — главная валюта жизни. Упал ниже 30% — тело начинает пожирать само себя.',
      'Запись #03: Внимательный шаг (3 ОХ) снижает радиус агра тварей и вскрывает засады в двух клетках.',
      'Запись #04: Бег (1 ОХ) экономит силы, но грохот шагов слышен мутантам в радиусе 3 клеток.',
      'Запись #05: Обыск клетки (3 ОХ) приносит трофеи сектора. Повторный обыск истощает тайник.',
      'Запись #06: Спораны — кристаллизованная память Улья. Они не весят ничего и служат единственной валютой.',
      'Запись #07: Настойка «Живчик» (1 споран + алкоголь) восстанавливает 50% спорового баланса иммунного.',
      'Запись #08: В бою бросок 2d6 определяет число целей (первый кубик) и бонус к урону (второй кубик).',
      'Запись #09: Любой дубль на кубиках в бою даёт право на мгновенный переброс и закаляет Дух.',
      'Запись #10: Дубль [1-1] в бою наносит двойной критический урон. Дубль [6-6] — осечка и срыв атаки.',
      'Запись #11: На карте дубль [1-1] при встрече призывает элитного мутанта 4 ранга (или Скреббера в Пекле).',
      'Запись #12: Дубль [6-6] при встрече дарит мёртвого старшего мутанта со споранами, горохом и жемчугом.',
      'Запись #13: На 15-м уровне каждый архетип раскрывает свой врождённый талант и ускоряет рост статов.',
      'Запись #14: Квазы — разумные мутанты Улья. Торговцы боятся их и накидывают +2 спорана к каждой сделке.',
      'Запись #15: Горох Улья усиливает случайный открытый Дар. Первые 3 горошины на уровне безопасны.',
      'Запись #16: С 4-й горошины на одном уровне растёт риск мутации в Кваза (+10% за каждую лишнюю штуку).',
      'Запись #17: Чёрный жемчуг (8% Кваз / 2% Заражённый в обычном — 25%/5%) будит рулетку Даров Улья.',
      'Запись #18: Красный жемчуг мягче чёрного (8% Кваз / 2% Заражённый), а Белый очищает кровь обратно в человека.',
      'Запись #19: Пройдя 3 полных круга мутации и очищения Белым жемчугом, боец становится Легендарным.',
      'Запись #20: Скрыт позволяет проходить мимо мутантов незамеченным, но работает только пока мана не иссякла.',
      'Запись #21: Клокстопер замедляет время и наносит до 15 безответных ударов клинком без контратаки.',
      'Запись #22: Каменная кожа повышает ранг защиты пассивно и даёт неуязвимость или отрядный щит.',
      'Запись #23: Менталист способен перехватить волю врага или заставить его атаковать своих же сородичей.',
      'Запись #24: Нимфа и Жиголо обладают взаимным иммунитетом к чарам друг друга.',
      'Запись #25: Иллюзионист мечет 36 призрачных карт и может превратить удар врага в собственное лечение.',
      'Запись #26: Особые заражённые не носят снаряжение людей, пока не откроют Вайшнавизм, Гигантизм или Дитя Улья.',
      'Запись #27: Пожирание павших врагов (1 ОХ) — главный источник спорового баланса и регенерации для заражённого.',
      'Запись #28: В Поселении и Гнезде каждое заведение можно посетить 1 раз за уровень, а цена растёт как 2^n.',
      'Запись #29: Дебош в баре (50%) даёт +2 ко всем физ. статам, но закрывает все заведения до уплаты штрафа ×5.',
      'Запись #30: В рейд от одной фамилии может выйти только один боец (максимум 5 человек в отряде).'
    ),

    CODEX_RULES_LIST: Array.of(
      { title: '1. Правило фамилий и отряд', text: 'В рейд (от 1 до 5 бойцов) от каждой фамилии может выйти только один персонаж. Ветераны (от 1 ур. или 1 рейда) получают доступ в Поселение/Гнездо и Лавку.' },
      { title: '2. Карта 60×60 и очки хода (ОХ)', text: 'База — 6 ОХ (+1 за каждые 50 Скорости). Внимательный шаг стоит 3 ОХ (видит засады), Быстрый — 2 ОХ, Бег — 1 ОХ (шумит на 3 клетки), Поиск — 3 ОХ, Сбор споранов — 1 ОХ.' },
      { title: '3. Споровый баланс и выживание', text: 'Каждый ход тратит споры, сытость и жажду. При балансе >75% регенерация ОЗ и маны удваивается. Восполняется настойкой «Живчик» (1 споран + алкоголь) или пожиранием тел.' },
      { title: '4. Бой 2d6 и смена оружия', text: 'Первый кубик d6 — число целей, второй — бонус урона. Дубли дают переброс; [1-1] — крит ×2; [6-6] — срыв атаки. Смена основного и холодного оружия стоит 0 ОХ.' },
      { title: '5. Дары Улья и фиксация маны', text: 'Дары делятся на Атакующие и Защитные (по 1 каждого типа за раунд боя). Стоимость маны фиксируется в момент пробуждения Дара.' },
      { title: '6. Мутации и Легендарный титул', text: 'Жемчуг и перебор Гороха могут обратить в Кваза или Заражённого. Белый жемчуг возвращает облик человека с сохранением множителей роста. 3 круга мутаций открывают статус Легендарного.' }
    ),

    openCodex(tab) {
      const old = document.getElementById('stiks-p26-overlay'); if (old) old.remove();
      const curTab = tab || 'archive', st = this.syncCodexFromRoster(), revAll = Boolean(st.revealedAll);
      const C = this.getContent(), CODEX = C.CODEX || {};
      const archTexts = (Array.isArray(CODEX.ARCHIVE_TEXTS) && CODEX.ARCHIVE_TEXTS.length) ? CODEX.ARCHIVE_TEXTS : this.CODEX_ARCHIVE_30;
      CODEX.RULES_SECTIONS = (Array.isArray(CODEX.RULES_SECTIONS) && CODEX.RULES_SECTIONS.length) ? CODEX.RULES_SECTIONS : this.CODEX_RULES_LIST;
      const photoFacts = CODEX.photoFacts || { 31: { imgs: Array.of('img/Fact_31.jpg') }, 32: { imgs: Array.of('img/Fact_32.jpg') }, 33: { imgs: Array.of('img/Fact_33.jpg', 'img/Fact_33-2.jpg') }, 69: { imgs: Array.of('img/Fact_69.jpg') } };
      let content = '';
      if (curTab === 'archive') {
        content += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="color:#e6c86e;">Открыто фактов: <b>' + (revAll ? 69 : st.archive.length) + ' / 69</b></span><button class="btn" style="width:auto;padding:2px 6px;font-size:10px;" onclick="const s=STIKS.getCodexState();s.revealedAll=!s.revealedAll;STIKS.saveCodexState(s);STIKS.openCodex(\'archive\')">👁️ Открыть всё</button></div>';
        for (let i = 1; i <= 69; i++) {
          const id = 'arch_' + (i < 10 ? '0' : '') + i;
          if (!revAll && !st.archive.includes(id)) {
            content += '<div style="background:#0f1118;border:1px dashed #2e3646;border-radius:5px;padding:6px;margin-bottom:4px;font-size:10px;color:#475569;">🔒 Запись #' + (i < 10 ? '0' : '') + i + ' — [Изучается в Библиотеке / Памяти Улья]</div>';
          } else {
            const pf = photoFacts[i];
            const txt = (pf && pf.text) || archTexts.at(i - 1) || ('Запись #' + i + ': Секретные данные выживших Улья.');
            const imgList = (pf && Array.isArray(pf.imgs)) ? pf.imgs : (i === 34 ? Array.of('img/Fact_34.jpg') : Array.of());
            const imgs = imgList.map(src => '<img src="' + src + '" onclick="STIKS.showCodexZoom(\'' + src + '\',\'Факт #' + i + '\')" style="width:48%;max-height:140px;object-fit:cover;border-radius:5px;border:1px solid #d97706;cursor:zoom-in;margin-top:5px;">').join('');
            content += '<div style="background:#171512;border:1px solid #785c2a;border-radius:6px;padding:8px;margin-bottom:6px;font-size:11px;color:#f3e8d2;">📜 <b>Факт #' + i + ':</b> ' + txt + (imgs ? '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + imgs + '</div>' : '') + '</div>';
          }
        }
      } else if (curTab === 'gifts') {
        const db = this.getDarsMap();
        Object.keys(db).forEach(gid => {
          const g = db[gid];
          content += '<div style="background:#161822;border:1px solid #475569;border-radius:6px;padding:8px;margin-bottom:6px;"><b style="color:#fbbf24;">🧬 ' + g.name + '</b><div style="font-size:11px;margin:3px 0;">' + g.desc + '</div>' +
            (g.branches || Array.of()).map(b => '<div style="color:#93c5fd;font-size:10px;margin-left:8px;">↳ ' + b.name + ': ' + b.desc + '</div>').join('') + '</div>';
        });
      } else if (curTab === 'creatures') {
        this.getZRanks().forEach(z => {
          content += '<div style="display:flex;gap:8px;align-items:center;background:#1a1114;border:1px solid #7f2d2d;border-radius:6px;padding:7px;margin-bottom:5px;"><img src="' + z.img + '" onclick="STIKS.showCodexZoom(\'' + z.img + '\',\'Ранг ' + z.r + ': ' + z.name + '\')" style="width:40px;height:46px;object-fit:contain;cursor:zoom-in;"><div><b style="color:#f87171;">Ранг ' + z.r + ': ' + z.name + '</b> (Ур.' + z.minLvl + '–' + z.maxLvl + ') • ОЗ: ' + z.hp + ', Урон: ' + z.dmg + '</div></div>';
        });
      } else if (curTab === 'rules') {
        (CODEX.RULES_SECTIONS || Array.of()).forEach(sec => {
          content += '<div style="background:#131a18;border:1px solid #2e6b48;border-radius:6px;padding:8px;margin-bottom:6px;"><b style="color:#86efac;">' + sec.title + '</b><div style="font-size:11px;margin-top:4px;line-height:1.4;">' + sec.text + '</div></div>';
        });
      } else {
        const archs = C.ARCHETYPES || {};
        Object.keys(archs).forEach(ak => {
          const a = archs[ak];
          content += '<div style="display:flex;gap:8px;align-items:center;background:#121a16;border:1px solid #2e6b48;border-radius:6px;padding:7px;margin-bottom:5px;"><img src="' + a.img + '" onclick="STIKS.showCodexZoom(\'' + a.img + '\',\'' + a.name + '\')" style="width:40px;height:46px;object-fit:cover;border-radius:4px;cursor:zoom-in;"><div><b style="color:#86efac;">' + a.name + '</b> — Навык: ' + a.skill + '</div></div>';
        });
      }
      const tabs = Array.of(Array.of('archive', '📜 Факты (69)'), Array.of('gifts', '🧬 Дары (16)'), Array.of('creatures', '☣️ Мутанты (10)'), Array.of('roles', '👤 Роли (20)'), Array.of('rules', '📖 Правила'));
      const tabsHtml = tabs.map(pair => '<button class="btn ' + (curTab === pair.at(0) ? 'btn-primary' : '') + '" style="width:auto;padding:4px 6px;font-size:10px;" onclick="STIKS.openCodex(\'' + pair.at(0) + '\')">' + pair.at(1) + '</button>').join('');
      const ov = document.createElement('div');
      ov.id = 'stiks-p26-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,12,0.95);z-index:9850;display:flex;align-items:center;justify-content:center;padding:10px;font-family:monospace;color:#e2e8f0;';
      ov.innerHTML = '<div style="width:100%;max-width:490px;max-height:88dvh;display:flex;flex-direction:column;background:#10131c;border:1px solid #6e2626;border-radius:8px;overflow:hidden;"><div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:#161b26;border-bottom:1px solid #263042;gap:4px;"><div style="display:flex;gap:3px;flex-wrap:wrap;">' + tabsHtml + '</div><button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="document.getElementById(\'stiks-p26-overlay\').remove()">✖</button></div><div style="padding:10px;overflow-y:auto;flex:1;">' + content + '</div></div>';
      document.body.appendChild(ov);
    }
  });

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => STIKS.init());
    else STIKS.init();
  }
})(typeof window !== 'undefined' ? window : this);
