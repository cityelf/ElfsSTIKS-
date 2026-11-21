// ============================================================================
// S-T-I-K-S // ЕДИНОЕ ИГРОВОЕ ЯДРО v1.9.0 — БЛОК 1A
// ============================================================================
(function(global) {
  'use strict';

  const STIKS = global.STIKS = {
    version: 'v1.9.0',
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
        if (serialized && serialized.length > 20) {
          localStorage.setItem(this.DB_KEY, serialized);
          if (this._hasFamilies(this.db)) {
            localStorage.setItem(this.BACKUP_KEY, serialized);
          }
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
      this.bindAllHeroesCompat();
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

      const topBar = document.querySelector('.top-controls');
      if (topBar) {
        Array.from(topBar.querySelectorAll('button')).forEach(b => {
          if ((b.textContent || '').includes('Симулятор')) b.remove();
        });
        if (!document.getElementById('btn-open-settlement')) {
          const sBtn = document.createElement('button');
          sBtn.id = 'btn-open-settlement';
          sBtn.type = 'button';
          sBtn.className = 'btn';
          sBtn.style.cssText = 'border-color:#c9a84c;color:#e6c86e;font-weight:bold;';
          sBtn.innerHTML = '🏘️ Поселение';
          sBtn.onclick = () => STIKS.openSettlement();
          topBar.appendChild(sBtn);
        }
        if (!document.getElementById('btn-open-diary')) {
          const dBtn = document.createElement('button');
          dBtn.id = 'btn-open-diary';
          dBtn.type = 'button';
          dBtn.className = 'btn';
          dBtn.style.cssText = 'border-color:#f59e0b;color:#fcd34d;font-weight:bold;';
          dBtn.innerHTML = '📓 Дневник';
          dBtn.onclick = () => STIKS.openCodex('gifts');
          topBar.appendChild(dBtn);
        }
      }

      if (!document.getElementById('stiks-v190-red-theme')) {
        const st = document.createElement('style');
        st.id = 'stiks-v190-red-theme';
        st.textContent = ':root{--stiks-bg:#0b0d0c;--stiks-panel:#140e0e;--stiks-border:#6e2626;--stiks-accent:#d48a8a;--stiks-glow:#ff5a5a;--stiks-text:#e6e2e0;} ' +
          '.wrapper, .box, .card, .panel, .modal-box, .header, #game-viewport > div > div { border-color: #6e2626 !important; } ' +
          '.btn { border-color: #6e2626 !important; } ' +
          '.btn-primary { background: #3b1515 !important; border-color: #8f2d2d !important; color: #f5d6d6 !important; }';
        document.head.appendChild(st);
      }

      const w = document.querySelector('.wrapper') || document.body;
      if (w && !document.getElementById('authors-footer') && typeof this.renderAuthorsFooter === 'function') {
        const ft = document.createElement('div');
        ft.id = 'authors-footer';
        ft.innerHTML = this.renderAuthorsFooter();
        w.appendChild(ft);
      }

      const badge = document.getElementById('patch-status');
      if (badge) badge.innerText = 'Ядро: v1.9.0';
      global.STIKS_ACTIVE_VERSION = 'v1.9.0';
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 1B (ЗВУКОВОЙ ДВИЖОК)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    _getAudioCtx() {
      if (global.BSIM_AUDIO && typeof global.BSIM_AUDIO.ensureCtx === 'function') {
        return global.BSIM_AUDIO.ensureCtx();
      }
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return null;
      if (!this._ctx) this._ctx = new Ctx();
      if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
      return this._ctx;
    },

    playGrowl(sec) {
      try {
        const ctx = this._getAudioCtx();
        if (!ctx) return;
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
        const ctx = this._getAudioCtx();
        if (!ctx) return;
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
        const ctx = this._getAudioCtx();
        if (!ctx) return;
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
        const ctx = this._getAudioCtx();
        if (!ctx) return;
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

    playWorkSound(kind) {
      try {
        const ctx = this._getAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        if (kind === 'snore') {
          [0, 0.55].forEach(off => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(68, now + off);
            o.frequency.linearRampToValueAtTime(46, now + off + 0.38);
            g.gain.setValueAtTime(0.12, now + off);
            g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.42);
            o.connect(g); g.connect(ctx.destination);
            o.start(now + off); o.stop(now + off + 0.44);
          });
        } else if (kind === 'chomp') {
          [0, 0.18, 0.36].forEach(off => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(210, now + off);
            o.frequency.exponentialRampToValueAtTime(85, now + off + 0.11);
            g.gain.setValueAtTime(0.15, now + off);
            g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.12);
            o.connect(g); g.connect(ctx.destination);
            o.start(now + off); o.stop(now + off + 0.13);
          });
        } else if (kind === 'saw') {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(320, now);
          o.frequency.linearRampToValueAtTime(640, now + 0.25);
          o.frequency.linearRampToValueAtTime(280, now + 0.5);
          g.gain.setValueAtTime(0.11, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
          o.connect(g); g.connect(ctx.destination);
          o.start(now); o.stop(now + 0.54);
        } else if (kind === 'anvil') {
          [0, 0.28].forEach(off => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(1180, now + off);
            o.frequency.exponentialRampToValueAtTime(590, now + off + 0.22);
            g.gain.setValueAtTime(0.16, now + off);
            g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.24);
            o.connect(g); g.connect(ctx.destination);
            o.start(now + off); o.stop(now + off + 0.25);
          });
        } else if (kind === 'pickaxe') {
          [0, 0.25].forEach(off => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(480, now + off);
            o.frequency.exponentialRampToValueAtTime(110, now + off + 0.14);
            g.gain.setValueAtTime(0.11, now + off);
            g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.15);
            o.connect(g); g.connect(ctx.destination);
            o.start(now + off); o.stop(now + off + 0.16);
          });
        }
      } catch (e) {}
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 1C (РЕЧЕВОЙ ДВИЖОК)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    PRONOUNS: /(^|\s)(я|меня|мне|мной|мною|мы|нас|нам|нами|ты|тебя|тебе|тобой|тобою|вы|вас|вам|вами|он|его|ему|им|нём|она|её|ей|ею|ней|оно|они|их|ими|них|мой|моя|моё|мои|твой|твоя|твоё|твои|свой|своя|своё|свои|наш|наша|наше|наши|ваш|ваша|ваше|ваши|этот|эта|это|эти|тот|та|то|те|кто|что|кого|чего|кому|чему|кем|чем|себя|себе|собой|собою|что-то|кто-то|кое-что)(?=[\s.,!?]|$)/gi,
    HUNT_WORDS: /(^|\s)([а-яА-ЯёЁ]*(?:кров|укус|куса|еда|еду|еды|есть|жра|сожр|пожр|мяс|плот|добыч|голод|разорв|грыз)[а-яА-ЯёЁ]*)(?=[\s.,!?]|$)/gi,

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
        return t.replace(/о/g, 'О');
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
      if (isMuted || !('speechSynthesis' in global)) {
        if (onDone) onDone();
        return;
      }
      global.speechSynthesis.cancel();
      const styledTxt = this.formatSpeech(role, txt);
      const dbVoice = (global.STIKS_DB && global.STIKS_DB.VOICE_CFG && global.STIKS_DB.VOICE_CFG[role]) || null;
      const femRoles = ['tatan', 'strip', 'nanny', 'cashier', 'schoolgirl', 'vet'];
      let cfg = dbVoice || { p: femRoles.includes(role) ? 1.18 : (role === 'kvaz' ? 0.55 : 0.9), r: role === 'kvaz' ? 0.85 : 1.05, pause: 180 };
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

      const vs = global.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().includes('ru'));
      const mikh = vs.find(v => /mikhail/i.test(v.name)) || vs;
      if (cfg.growl) this.playGrowl(Math.min(7, styledTxt.length * 0.07));

      const speakNext = () => {
        const item = queue.shift();
        if (!item) {
          if (onDone) setTimeout(onDone, 350);
          return;
        }
        const u = new SpeechSynthesisUtterance(item.t);
        u.lang = /[a-zA-Z]/.test(item.t) ? 'en-US' : 'ru-RU';
        if (mikh && u.lang === 'ru-RU') u.voice = mikh;
        u.pitch = item.hic ? 1.65 : cfg.p;
        u.rate = item.hic ? 2.50 : cfg.r;
        let pause = cfg.pause || 180;
        if (item.hic) pause = 90;
        else if (item.kp) pause = Math.round(pause * 1.2);
        else if (item.pp && cfg.punctPause) pause = cfg.punctPause;
        u.onend = () => setTimeout(speakNext, pause);
        u.onerror = () => setTimeout(speakNext, pause);
        global.speechSynthesis.speak(u);
      };
      speakNext();
    },

    speakPhrase(p, text, onDone) {
      const role = (p && p.isKvaz) ? 'kvaz' : ((p && (p.asInfected || p.isInfected)) ? 'infected' : ((p && p.arch) || 'kachok'));
      this.sayAs(role, text, onDone);
    },

    isFem(p) {
      if (!p) return false;
      if (p.sex === 'f' || p.gender === 'f' || p.gender === 'female') return true;
      if (p.sex === 'm' || p.gender === 'm' || p.gender === 'male') return false;
      return ['tatan', 'strip', 'nanny', 'cashier', 'schoolgirl', 'vet'].includes(p.arch);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 1D-1 (УРОВНИ И МОСТ СОВМЕСТИМОСТИ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    LVL_TABLE:,

    _round100(v) {
      return Math.round((Number(v) || 0) * 100) / 100;
    },

    _cleanSporans(obj) {
      if (!obj) return 0;
      const a = Number(obj.spores), b = Number(obj.sporans);
      const va = (isFinite(a) && a >= 0 && a <= 10000000) ? Math.floor(a) : 0;
      const vb = (isFinite(b) && b >= 0 && b <= 10000000) ? Math.floor(b) : 0;
      const val = Math.max(va, vb);
      obj.spores = val;
      return val;
    },

    syncSporans(obj) { return this._cleanSporans(obj); },

    defaultSlots() {
      return { main: null, side: null, melee: null, mag: null, mod: null, meleeMod: null, armor: null, clothes: null, boots: null, bag: null, talisman: null };
    },

    bindHeroCompat(hero) {
      if (!hero || typeof hero !== 'object' || hero._compatBound) return hero;
      Object.defineProperty(hero, '_compatBound', { value: true, enumerable: false, configurable: true });
      if (typeof hero.lvl === 'undefined' && typeof hero.level === 'number') hero.lvl = hero.level;
      if (typeof hero.lvl !== 'number') hero.lvl = 0;
      Object.defineProperty(hero, 'level', {
        configurable: true, enumerable: false,
        get() { return Number(this.lvl || 0); },
        set(v) { this.lvl = Math.max(0, Number(v) || 0); }
      });
      hero.spores = Math.max(Number(hero.spores || 0), Number(hero.sporans || 0));
      Object.defineProperty(hero, 'sporans', {
        configurable: true, enumerable: false,
        get() { return Number(this.spores || 0); },
        set(v) { this.spores = Math.max(0, Math.floor(Number(v) || 0)); }
      });
      if (!Array.isArray(hero.inv)) hero.inv = Array.isArray(hero.inventory) ? hero.inventory : [];
      Object.defineProperty(hero, 'inventory', {
        configurable: true, enumerable: false,
        get() { return this.inv; },
        set(v) { this.inv = Array.isArray(v) ? v : []; }
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
      ['str', 'agi', 'spd', 'end', 'int', 'spi'].forEach(sk => {
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
        Object.keys(this.db.families).forEach(fam => (this.db.families[fam] || []).forEach(h => this.bindHeroCompat(h)));
      }
      if (Array.isArray(this.squad)) this.squad.forEach(h => this.bindHeroCompat(h));
      if (this.db && this.db.session && Array.isArray(this.db.session.players)) {
        this.db.session.players.forEach(h => this.bindHeroCompat(h));
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 1D-2 (СТАТЫ, ОПЫТ И УРОВНИ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    isRealSporeUnlocked(p) {
      if (!p) return false;
      if (p.asInfected || p.isInfected || p.isKvaz) return true;
      if (p._manualBookRead || p._drankZhivchik) return true;
      if ((p.knowsSpores || p.sporeKnown || p.knowsRecipe) && !p._autoSporeBug) {
        p._manualBookRead = true;
        return true;
      }
      return false;
    },

    isRealSkillUnlocked(p) {
      if (!p) return false;
      if (p.asInfected || p.isInfected) return true;
      if (p._skillSuccessUsed || p.skillRevealed) {
        p._skillSuccessUsed = true;
        p.skillUnlocked = true;
        p.skillRevealed = true;
        return true;
      }
      p.skillUnlocked = false;
      p.skillRevealed = false;
      return false;
    },

    normalizePlayerStats(p) {
      if (!p) return;
      this.bindHeroCompat(p);
      if (!p.stats) p.stats = { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };
      p.slots = Object.assign(this.defaultSlots(), p.slots || {});

      const endVal = Number(p.stats.end || 10);
      const strVal = Number(p.stats.str || 10);
      const spiVal = Number(p.stats.spi || 10);
      const isTatan = (p.arch === 'tatan' && !p.asInfected && !p.isKvaz);
      const isKachok = (p.arch === 'kachok' && !p.asInfected && !p.isKvaz);
      const isKvaz = Boolean(p.isKvaz);

      const calcMaxHp = Math.max(10, Math.round((10 + endVal) * (isKvaz ? 1.5 : 1)));
      p.maxHp = calcMaxHp;
      if (!p._hpInit || typeof p.hp !== 'number' || p.hp > p.maxHp) {
        p.hp = p.maxHp;
        p._hpInit = true;
      }
      p.hp = Math.max(0, Math.min(p.maxHp, p.hp));

      p.maxFood = (isTatan ? 240 : (isKvaz ? 150 : 50)) + Math.floor(endVal / 10);
      p.maxWater = (isTatan ? 100 : (isKvaz ? 100 : 50)) + Math.floor(endVal / 10);
      p.maxStamina = 50 + Math.floor(endVal / 5);
      p.maxSpore = 50 + Math.floor(endVal / 10) + Math.floor(spiVal / 10);
      p.maxMana = Math.max(10, Math.round((10 + spiVal * 2) * (isKvaz ? 0.5 : 1)));
      p.maxAp = 6 + Math.floor((Number(p.stats.spd) || 10) / 100);

      if (typeof p.food !== 'number' || p.food > p.maxFood) p.food = p.maxFood;
      if (typeof p.water !== 'number' || p.water > p.maxWater) p.water = p.maxWater;
      if (typeof p.stamina !== 'number' || p.stamina > p.maxStamina) p.stamina = p.maxStamina;
      if (typeof p.spore !== 'number') p.spore = p.maxSpore;
      p.spore = Math.max(0, Math.min(p.maxSpore, p.spore));
      if (typeof p.mana !== 'number' || p.mana > p.maxMana) p.mana = p.maxMana;
      if (typeof p.stepsLeft !== 'number') p.stepsLeft = p.maxAp;
      p.stepsLeft = Math.max(0, Math.min(p.maxAp, p.stepsLeft));

      const carryMult = isKachok ? 3 : (isKvaz ? 2 : 1);
      const bagBonus = p.slots.bag ? (Number(p.slots.bag.bag || p.slots.bag.cap || p.slots.bag.bonus || 15) || 15) : 0;
      p.maxWeight = Math.round(((10 + strVal * 0.1) * carryMult + bagBonus) * 10) / 10;

      if (!Array.isArray(p.inv)) p.inv = [];
      this._cleanSporans(p);
      const spOk = this.isRealSporeUnlocked(p);
      p.knowsSpores = p.sporeKnown = p.knowsRecipe = spOk;
      this.isRealSkillUnlocked(p);
    },

    grantActionXp(p, statKey, baseDelta) {
      if (!p || !statKey || !baseDelta) return 0;
      this.bindHeroCompat(p);
      const archKey = p.isKvaz ? 'kvaz' : (p.asInfected ? 'infected' : p.arch);
      const multObj = (this.ARCHETYPES && this.ARCHETYPES[archKey] && this.ARCHETYPES[archKey].mult) || {};
      let m = Number(multObj[statKey]) || 1;
      if (p.isKvaz && ['str', 'end', 'agi'].includes(statKey)) m += 0.5;
      if (archKey === 'kachok' && (p.lvl || 0) >= 15 && (statKey === 'str' || statKey === 'end')) m = 4;
      if (archKey === 'tatan' && (p.lvl || 0) >= 15 && (statKey === 'agi' || statKey === 'spd') && m < 1) m = 1;
      if (archKey === 'asiat' && (p.lvl || 0) >= 15 && (statKey === 'int' || statKey === 'spi') && m < 1) m = 1;

      const delta = this._round100(baseDelta * m);
      if (delta <= 0) return 0;
      p.stats[statKey] = this._round100((Number(p.stats[statKey]) || 10) + delta);
      this.recalcLevel(p);
      this.normalizePlayerStats(p);
      return delta;
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
      if (sum > this.LVL_TABLE) {
        let curT = this.LVL_TABLE, l = 60;
        while (sum >= Math.round(curT * 1.1)) { curT = Math.round(curT * 1.1); l++; }
        newLvl = l;
      }
      const oldLvl = p.lvl || 0;
      if (newLvl > oldLvl) {
        p.lvl = newLvl;
        if (newLvl >= 15 && !p.darUnlocked) {
          p.darUnlocked = true;
          const aInfo = (this.ARCHETYPES && this.ARCHETYPES[p.arch]) || {};
          this.log('🌟 ' + p.name + ' достиг 15 ур. и раскрыл талант: ' + (aInfo.dar15 || 'Пробуждение') + '!');
        }
        this.log('⬆️ Уровень повышен! ' + p.name + ' теперь Ур.' + newLvl + ' (сумма: ' + sum + ').');
      }
      if (typeof this.checkThresholdAwakening === 'function') this.checkThresholdAwakening(p);
      return newLvl > oldLvl;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 2A (АРХЕТИПЫ И ПОРТРЕТЫ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  STIKS.ARCHETYPES = {
    surgeon:    { name: 'Хирург', sex: 'm', img: 'img/surgeon.jpg', ico: '🔪', skill: 'Точный разрез', skillType: 'active', phrase: 'Скальпель, зажим... готово!', affinity: 'stone_skin', dar15: 'Каменная кожа', stats: { str: 8, agi: 14, spd: 9, end: 9, int: 14, spi: 6 }, mult: { str: 0.5, agi: 2, spd: 1, end: 1, int: 2.5, spi: 1 }, hint: 'Осматривает ладони, проверяя стерильность.' },
    asiat:      { name: 'Подозрительно знакомый азиат', sex: 'm', img: 'img/asiat.jpeg', ico: '🥋', skill: 'Акробатический уход', skillType: 'active', phrase: 'Йа сейчас кое-что учужу!', affinity: 'healer', dar15: 'Знахарь', stats: { str: 8, agi: 18, spd: 12, end: 10, int: 6, spi: 6 }, mult: { str: 1, agi: 3, spd: 1, end: 1, int: 0.5, spi: 0.5 }, hint: 'Пружинит на носках, оценивая высоту препятствий.' },
    schoolgirl: { name: 'Школьница', sex: 'f', img: 'img/scoolgerl.jpg', ico: '📢', skill: 'Крик ультразвука', skillType: 'active', phrase: 'АААААА! НЕ ПОДХОДИ!', affinity: 'clockstopper', dar15: 'Клокстопер', stats: { str: 6, agi: 14, spd: 15, end: 7, int: 10, spi: 8 }, mult: { str: 0.5, agi: 2, spd: 2.5, end: 0.5, int: 1.5, spi: 1.5 }, hint: 'Нервно поправляет лямку рюкзака.' },
    nanny:      { name: 'Воспитательница', sex: 'f', img: 'img/vospit.jpg', ico: '☝️', skill: 'Строгий выговор', skillType: 'active', phrase: 'А НУ-КА ПРЕКРАТИЛИ БЕЗОБРАЗИЕ!', affinity: 'stealth', dar15: 'Скрыт', stats: { str: 7, agi: 10, spd: 10, end: 11, int: 11, spi: 11 }, mult: { str: 0.5, agi: 1, spd: 1, end: 1.5, int: 1.5, spi: 2.5 }, hint: 'Окидывает окрестности строгим взглядом.' },
    alkash:     { name: 'Алкаш', sex: 'm', img: 'img/alkash.jpg', ico: '🍾', skill: 'Пьяный кулак', skillType: 'active', phrase: 'ИК! СЕЙЧАС ПОКАЖУ МАСТЕР-КЛАСС!', affinity: 'fire_master', dar15: 'Мастер огня', stats: { str: 10, agi: 7, spd: 8, end: 16, int: 5, spi: 14 }, mult: { str: 1.5, agi: 0.5, spd: 0.5, end: 2.5, int: 0.5, spi: 1.5 }, hint: 'Принюхивается к воздуху и хлопает по карманам.' },
    cashier:    { name: 'Кассирша', sex: 'f', img: 'img/cashier.jpg', ico: '🧾', skill: 'Галя, у нас отмена!', skillType: 'trigger', phrase: 'ГАЛЯ, У НАС ОТМЕНА!', affinity: 'sonic', dar15: 'Соник', stats: { str: 8, agi: 11, spd: 11, end: 11, int: 10, spi: 9 }, mult: { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 1.5, spi: 1.5 }, hint: 'С ледяным спокойствием смотрит в пустоту.' },
    gigolo:     { name: 'Жиголо', sex: 'm', img: 'img/gigalo.jpg', ico: '🌹', skill: 'Обезоруживающий шарм', skillType: 'active', phrase: 'Не стоит так нервничать, крошка!', affinity: 'mentalist', dar15: 'Менталист', stats: { str: 9, agi: 12, spd: 12, end: 9, int: 9, spi: 9 }, mult: { str: 1, agi: 2, spd: 2, end: 1, int: 1.5, spi: 2 }, hint: 'Поправляет воротник и криво усмехается.' },
    tatan:      { name: 'Татань', sex: 'f', img: 'img/tatan.jpg', ico: '🫰', skill: 'По щелчку в три пятнадцать', skillType: 'active', phrase: 'ПО ЩЕЛЧКУ В ТРИ ПЯТНАДЦАТЬ! ВСЕМ СТОЯТЬ!', affinity: 'nymph', dar15: 'Нимфа', stats: { str: 15, agi: 6, spd: 7, end: 14, int: 10, spi: 8 }, mult: { str: 3, agi: 0.5, spd: 0.5, end: 2, int: 1, spi: 1 }, hint: 'Дергает себя за волосы и рычит от злости.' },
    prof:       { name: 'Профессор', sex: 'm', img: 'img/prof.jpg', ico: '🪄', skill: 'Магнификус мэджик', skillType: 'active', phrase: 'looks like magnificus magic', affinity: 'gigolo_gift', dar15: 'Жиголо', stats: { str: 6, agi: 8, spd: 8, end: 6, int: 20, spi: 12 }, mult: { str: 0.5, agi: 0.5, spd: 0.5, end: 0.5, int: 3, spi: 2 }, hint: 'Протирает несуществующие очки и бормочет формулы.' },
    psih:       { name: 'Военный психолог', sex: 'both', img: 'img/Psihm.jpg', imgM: 'img/Psihm.jpg', imgF: 'img/Psihf.jpeg', ico: '🧠', skill: 'Холодный анализ', skillType: 'active', phrase: 'Психологический профиль цели вскрыт!', affinity: 'illusionist', dar15: 'Иллюзионист', stats: { str: 8, agi: 10, spd: 10, end: 10, int: 11, spi: 11 }, mult: { str: 0.8, agi: 1.2, spd: 1.2, end: 1.2, int: 2, spi: 2.5 }, hint: 'Выравнивает дыхание и сканирует сектор.' },
    strip:      { name: 'Стриптизёрша', sex: 'f', img: 'img/strip.jpg', ico: '💃', skill: 'Ослепляющий пируэт', skillType: 'active', phrase: 'СМОТРИ СЮДА, КРАСАВЧИК!', affinity: 'tank', dar15: 'Танк', stats: { str: 7, agi: 19, spd: 16, end: 8, int: 5, spi: 5 }, mult: { str: 0.5, agi: 2.5, spd: 2.5, end: 1, int: 1, spi: 1 }, hint: 'Делает плавную растяжку и хищно прищуривается.' },
    vet:        { name: 'Ветеринар', sex: 'f', img: 'img/vetgirl.jpg', ico: '💉', skill: 'Успокаивающий укол', skillType: 'active', phrase: 'А ну-ка дай лапу!', affinity: 'sense', dar15: 'Сенс', stats: { str: 7, agi: 11, spd: 11, end: 10, int: 12, spi: 9 }, mult: { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 2.5, spi: 1.5 }, hint: 'Прислушивается к рыку тварей Улья.' },
    kachok:     { name: 'Качок', sex: 'm', img: 'img/kachok.jpeg', ico: '💪', skill: 'Прямиком в ад', skillType: 'active', phrase: 'ПРЯМИКОМ В АД! ННАХХ!!!', affinity: 'ice_master', dar15: 'Мастер льда', stats: { str: 22, agi: 9, spd: 5, end: 18, int: 1, spi: 5 }, mult: { str: 3, agi: 1, spd: 0.5, end: 3, int: 0.2, spi: 1 }, hint: 'Сжимает кулаки и хрустит костяшками.' },
    infected:   { name: 'Особый заражённый', sex: 'm', img: 'img/infected.jpg', ico: '☣️', skill: 'Ярость Улья', skillType: 'active', phrase: 'КРРРРОВЬ И ПЛОТЬ!', affinity: 'vaishnavism', dar15: 'Дары Улья', stats: { str: 14, agi: 14, spd: 14, end: 14, int: 2, spi: 2 }, mult: { str: 2, agi: 2, spd: 2, end: 2, int: 0.5, spi: 1 }, hint: 'С глухим рыком чует живую плоть.' },
    kvaz:       { name: 'Кваз (мутант Улья)', sex: 'both', img: 'img/Kvazm.jpg', imgM: 'img/Kvazm.jpg', imgF: 'img/Kvazf.jpg', ico: '👹', skill: 'Рёв Кваза', skillType: 'active', phrase: 'РРРРААААГХ! РАЗОРВУ!', affinity: 'gigantism', dar15: 'Мутация Улья', stats: { str: 26, agi: 22, spd: 20, end: 26, int: 12, spi: 14 }, mult: { str: 2.5, agi: 2.5, spd: 2.5, end: 2.5, int: 1.5, spi: 1.5 }, hint: 'Тяжело дышит и сжимает мускулистые лапы.' }
  };

  STIKS.resolvePortrait = function(p) {
    if (!p) return 'img/kachok.jpeg';
    const isF = this.isFem(p);
    if (p.isKvaz || p.form === 'kvaz') return isF ? 'img/Kvazf.jpg' : 'img/Kvazm.jpg';
    if (p.asInfected || p.isInfected || p.arch === 'infected') return 'img/infected.jpg';
    const key = p.arch || 'kachok';
    if (key === 'psih') return isF ? 'img/Psihf.jpeg' : 'img/Psihm.jpg';
    const a = this.ARCHETYPES[key];
    return (a && a.img) || (isF ? 'img/tatan.jpg' : 'img/kachok.jpeg');
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 2B-1 (ДАРЫ УЛЬЯ 1–8)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;
  STIKS.DARS = STIKS.DARS || {};

  Object.assign(STIKS.DARS, {
    stone_skin: { pool: 'human', name: 'Каменная кожа', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассивно: +1.0 -> +3.9 к рангу брони (+0.1 за уровень).', branches: [
      { id: 'b1', name: 'Временная неуязвимость', type: 'active', mana1: 50, mana30: 10, desc: 'Игнорирует 1 -> 7 входящих ударов.' },
      { id: 'b2', name: 'Отрядный щит', type: 'active', mana1: 60, mana30: 10, desc: 'Поглощает урон по себе и союзникам.' },
      { id: 'b3', name: 'Колючая стена', type: 'active', mana1: 50, mana30: 10, desc: 'Герой получает 10% урона, ближний бой возвращает 200% -> 350%.' }
    ]},
    healer: { pool: 'human', name: 'Знахарь', type: 'active', mana1: 40, mana30: 10, desc: 'Исцеляет себя и союзников на 25% -> 100% ОЗ.', branches: [
      { id: 'b1', name: 'Мастер усиления', type: 'active', mana1: 100, mana30: 10, desc: '+1 ур. к случайному Дару (1 раз за рейд/уровень).' },
      { id: 'b2', name: 'Ветка поддержки', type: 'active', mana1: 10, mana30: 2, desc: 'Режет урон по отряду и повышает урон на 10% -> 50%.' },
      { id: 'b3', name: 'Ветка любимчика', type: 'active', mana1: 40, mana30: 10, desc: 'Укрощает или приручает заражённых (до 10 питомцев).' }
    ]},
    clockstopper: { pool: 'human', name: 'Клокстопер', type: 'active', cap: 20, mana1: 100, mana30: 15, desc: 'Кап 20 ур.: 4 -> 15 безответных ударов без контрудара.', branches: [
      { id: 'b1', name: 'Ножи-ракеты', type: 'active', mana1: 45, mana30: 10, desc: 'Залп 2 -> 8 ножей с пробитием брони.' },
      { id: 'b2', name: 'Скачок без ОХ', type: 'active', mana1: 40, mana30: 10, desc: 'Перемещение на 2 -> 8 шагов за 0 ОХ.' },
      { id: 'b3', name: 'Сумасшедшее уклонение', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: +20% -> +80% к шансу уклонения.' },
      { id: 'b4', name: 'Избегание смерти', type: 'trigger', mana1: 50, mana30: 15, desc: 'Триггер: спасает от смерти, оставляя 10% -> 40% ОЗ.' }
    ]},
    stealth: { pool: 'human', name: 'Скрыт', type: 'active', mana1: 50, mana30: 1, desc: 'Невидимость на карте, обыск нычек и сбор споранов.', branches: [
      { id: 'b1', name: 'Общий скрыт', type: 'active', mana1: 50, mana30: 10, desc: 'Укрывает отряд от агра в радиусе 2 -> 10 кл.' },
      { id: 'b2', name: 'Призрак', type: 'active', mana1: 50, mana30: 10, desc: '-90% меткости врагов и иммунитет к физ. атакам.' },
      { id: 'b3', name: 'Бесплотность', type: 'active', mana1: 50, mana30: 10, desc: 'Проход сквозь препятствия за 3 ОХ.' }
    ]},
    fire_master: { pool: 'human', name: 'Мастер огня', type: 'active', mana1: 50, mana30: 10, desc: 'Огненный залп без потери атаки (300% -> 500%).', branches: [
      { id: 'b1', name: 'Огненный щит', type: 'active', mana1: 50, mana30: 5, desc: '-50% входящего урона, ответный ожог 150% -> 250%.' },
      { id: 'b2', name: 'Стена огня', type: 'active', mana1: 50, mana30: 10, desc: 'Преграда на 1 -> 5 кл. (отброс или урон 33% -> 75% ОЗ).' },
      { id: 'b3', name: 'Друг огня', type: 'passive', mana1: 0, mana30: 0, desc: 'Поглощает 80% -> 100% огня и лечится от него.' }
    ]},
    sonic: { pool: 'human', name: 'Соник', type: 'active', mana1: 100, mana30: 10, desc: 'Оглушение врагов на 1..3 раунда или акустический урон.', branches: [
      { id: 'b1', name: 'Купол тишины', type: 'passive', mana1: 0, mana30: 0, desc: 'Бесшумный бег и глушение звуков отряда.' },
      { id: 'b2', name: 'Эхолокатор', type: 'active', mana1: 50, mana30: 10, desc: 'Вскрывает засады и указывает на ценный лут.' },
      { id: 'b3', name: 'Инфразвук', type: 'active', mana1: 60, mana30: 10, desc: 'Сжигает ОХ врагов до 0 + статус «Вонь».' }
    ]},
    mentalist: { pool: 'human', name: 'Менталист', type: 'active', mana1: 100, mana30: 10, desc: 'Подавляет волю врага на 1..3 раунда и забирает ход.', branches: [
      { id: 'b1', name: 'Ментальный барьер', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: 50% -> 100% защита от дебаффов и пси-атак.' },
      { id: 'b2', name: 'Активная глушилка', type: 'active', mana1: 30, mana30: 1, desc: 'Подавляет Дары в радиусе 2 -> 10 кл.' },
      { id: 'b3', name: 'Бу!', type: 'active', mana1: 60, mana30: 10, desc: 'Вызывает паническое бегство или подчинение врага.' }
    ]},
    nymph: { pool: 'human', name: 'Нимфа', type: 'passive', mana1: 0, mana30: 0, desc: 'Лояльные бьют слабее/прикрывают на 30%, нелояльные бьют сильнее.', branches: [
      { id: 'b1', name: 'Подчинение', type: 'active', mana1: 100, mana30: 10, desc: 'Стравливает половины врагов насмерть.' },
      { id: 'b2', name: 'Песнь сирены', type: 'active', mana1: 50, mana30: 5, desc: 'Приманивает группу и приручает одного с начала боя.' },
      { id: 'b3', name: 'Томный взгляд', type: 'active', mana1: 50, mana30: 10, desc: 'Оглушает половину врагов и режет меткость остальным.' }
    ]}
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 2B-2 (ДАРЫ УЛЬЯ 9–16)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;
  STIKS.DARS = STIKS.DARS || {};

  Object.assign(STIKS.DARS, {
    gigolo_gift: { pool: 'human', name: 'Жиголо', type: 'passive', mana1: 0, mana30: 0, desc: 'Зеркало Нимфы, взаимный иммунитет с Нимфой.', branches: [
      { id: 'b1', name: 'Соблазнение', type: 'active', mana1: 100, mana30: 10, desc: 'Стравливает половины врагов насмерть.' },
      { id: 'b2', name: 'Зов хищника', type: 'active', mana1: 50, mana30: 5, desc: 'Приманивает группу и приручает одного с начала боя.' },
      { id: 'b3', name: 'Роковая ухмылка', type: 'active', mana1: 50, mana30: 10, desc: 'Оглушает половину врагов и режет меткость остальным.' }
    ]},
    illusionist: { pool: 'human', name: 'Иллюзионист', type: 'active', mana1: 100, mana30: 10, desc: 'Бросок 36 карт веером (0.5-5% -> 1.5-15% урона за карту).', branches: [
      { id: 'b1', name: 'Фокусник', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: +25% -> +50% анти-пси и шанс доп. лута.' },
      { id: 'b2', name: 'Распили меня полностью', type: 'active', mana1: 100, mana30: 10, desc: 'Входящий ближний удар лечит 10% -> 25% ОЗ.' },
      { id: 'b3', name: 'Жонглёр', type: 'active', mana1: 100, mana30: 10, desc: 'Отражает дальнобойный снаряд обратно во врага.' }
    ]},
    tank: { pool: 'human', name: 'Танк', type: 'trigger', mana1: 25, mana30: 5, desc: 'Авто-щит: поглощает удары >= 10% ОЗ за счёт маны.', branches: [
      { id: 'b1', name: 'Бывалый танкист', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: 50% -> 100% иммунитет к оглушению и слепоте.' },
      { id: 'b2', name: 'Грязь — это загар', type: 'active', mana1: 0, mana30: 0, desc: 'Ползком = скрыт за 2 ОХ/кл.' },
      { id: 'b3', name: 'Танкам дорога не нужна', type: 'active', mana1: 50, mana30: 0, desc: 'Проламывает проход сквозь препятствие (до 3 за рейд).' }
    ]},
    sense: { pool: 'human', name: 'Сенс', type: 'active', mana1: 50, mana30: 5, desc: 'Пеленг живых целей и Скрытов в радиусе 8 -> 20 кл.', branches: [
      { id: 'b1', name: 'Чувствительность', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: 50% -> 100% анти-слепота и 25% -> 50% анти-пси.' },
      { id: 'b2', name: 'Знание сути', type: 'active', mana1: 50, mana30: 5, desc: 'Бой без траты атаки: +50% -> +200% к меткости, урону и уклонению.' },
      { id: 'b3', name: 'Знаток восприятия', type: 'active', mana1: 50, mana30: 10, desc: 'Оставляет 1 -> 3 куклы-приманки, отвлекающие 50% атак.' }
    ]},
    ice_master: { pool: 'human', name: 'Мастер льда', type: 'active', mana1: 50, mana30: 10, desc: 'Ледяной залп без потери атаки (220% -> 400%) + обморожение.', branches: [
      { id: 'b1', name: 'Ледяной панцирь', type: 'active', mana1: 50, mana30: 5, desc: '-50% входящего урона, ответный крио-урон 120% -> 220%.' },
      { id: 'b2', name: 'Гололёд', type: 'active', mana1: 50, mana30: 10, desc: 'Наледь на 1 -> 5 кл.: срыв ОХ и перелом у врагов.' },
      { id: 'b3', name: 'Хладнокровие', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: 80% -> 100% анти-лёд + 20% -> 50% анти-огонь.' }
    ]},
    vaishnavism: { pool: 'infected', name: 'Приступ вайшнавизма', type: 'passive', mana1: 0, mana30: 0, desc: 'Отказ от плоти, x2 сытости от еды и +Инт/Дух.', branches: [
      { id: 'b1', name: 'Харе Кришна, чувак!', type: 'active', mana1: 40, mana30: 10, desc: 'Подчиняет ИИ-иммунного в свиту (1 -> 3 питомца).' },
      { id: 'b2', name: 'Человеческая суть', type: 'active', mana1: 40, mana30: 10, desc: 'Применяет случайный человеческий боевой Дар или даёт ярость.' },
      { id: 'b3', name: 'Нечеловеческая предусмотрительность', type: 'active', mana1: 10, mana30: 1, desc: '+40% -> +80% устойчивость ко всем дебаффам и контролю.' }
    ]},
    gigantism: { pool: 'infected', name: 'Гигантизм', type: 'passive', mana1: 0, mana30: 0, desc: '50% шанс перебросить прирост стата в Силу/Выносливость x2 -> x4.', branches: [
      { id: 'b1', name: 'Танк (Гигант)', type: 'trigger', mana1: 25, mana30: 5, desc: 'Поглощает пробивший защиту удар за ману.' },
      { id: 'b2', name: 'Голод гиганта', type: 'active', mana1: 50, mana30: 10, desc: '150% -> 300% урона, фатальный удар лечит 10% -> 50% ОЗ.' },
      { id: 'b3', name: 'Чудовищная регенерация', type: 'active', mana1: 50, mana30: 10, desc: 'Восполняет 5% -> 25% ОЗ за раунд (2 -> 6 раундов).' }
    ]},
    hive_child: { pool: 'infected', name: 'Дитя Улья', type: 'passive', mana1: 0, mana30: 0, desc: 'Стая до 10 заражённых (в бою 5 сильнейших).', branches: [
      { id: 'b1', name: 'Активная маскировка', type: 'active', mana1: 35, mana30: 10, desc: 'Скрывает хозяина за спиной стаи, удар исподтишка 200%.' },
      { id: 'b2', name: 'Родная среда', type: 'active', mana1: 30, mana30: 5, desc: 'Игнорирование препятствий и скрытие внутри них.' },
      { id: 'b3', name: 'Аура ужаса', type: 'active', mana1: 50, mana30: 10, desc: 'Вводит врагов в транс в радиусе 3 -> 6 кл.' }
    ]}
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 2C-1 (РУЛЕТКА ПРОБУЖДЕНИЯ ДАРОВ И ПОРОГИ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  const INFECTED_THRESHOLDS =;
  const HUMAN_THRESHOLDS =;

  Object.assign(STIKS, {
    getAllGiftsMap() {
      return this.DARS || {};
    },

    calcGiftScale(lvl, v1, v30, cap) {
      const maxL = cap || 30;
      const c = Math.max(1, Math.min(maxL, Number(lvl) || 1));
      if (c === 1) return v1;
      const t = (c - 1) / Math.max(1, maxL - 1);
      return Number((v1 + (v30 - v1) * t).toFixed(2));
    },

    calcAnchorMana(hero, pct) {
      if (!pct || pct <= 0) return 0;
      const maxM = (hero && hero.maxMana) ? Number(hero.maxMana) : 20;
      return Math.max(1, Math.round(maxM * (pct / 100)));
    },

    _pickWeightedRootGift(hero) {
      const db = this.DARS || {};
      const owned = (hero && hero.gifts) ? hero.gifts : {};
      const isInfOnly = Boolean(hero && (hero.isInfected || hero.asInfected) && !hero.isKvaz && !hero.isImennoi);

      const pool = Object.keys(db).map(id => Object.assign({ id }, db[id])).filter(g => {
        if (!g || owned[g.id]) return false;
        if (isInfOnly) return g.pool === 'infected';
        if (hero && hero.isKvaz) return true;
        return g.pool === 'human';
      });
      if (!pool.length) return null;

      const archKey = hero ? (hero.origArch || hero.arch) : null;
      const favId = (this.ARCHETYPES && archKey && this.ARCHETYPES[archKey]) ? this.ARCHETYPES[archKey].affinity : null;
      let totalW = 0;
      const weighted = pool.map(g => {
        const w = (g.id === favId) ? 1.6 : 1.0;
        totalW += w;
        return { g, w };
      });
      let r = Math.random() * totalW;
      for (let i = 0; i < weighted.length; i++) {
        r -= weighted[i].w;
        if (r <= 0) return weighted[i].g;
      }
      return weighted[weighted.length - 1].g;
    },

    rollHiveRoulette(hero, source, baseStartLvl) {
      if (!hero) return { type: 'none', msg: '' };
      this.bindHeroCompat(hero);
      hero.gifts = hero.gifts || {};
      const db = this.DARS || {};
      const rootIds = Object.keys(hero.gifts).filter(id => db[id]);
      const K = rootIds.length;
      const isThreshold = (source === 'threshold');
      const gainLvl = isThreshold ? 1 : (source === 'white' ? 30 : (source === 'black' ? 10 : (source === 'red' ? 5 : 7)));
      const startLvl = isThreshold ? 1 : (baseStartLvl || 1);

      let res = null;
      if (K === 0) {
        const picked = this._pickWeightedRootGift(hero);
        if (!picked) return { type: 'none', msg: 'Все доступные Дары уже открыты.' };
        const anchor = this.calcAnchorMana(hero, picked.mana1 || 0);
        hero.gifts[picked.id] = { lvl: startLvl, level: startLvl, manaAnchor: anchor, branches: {} };
        res = { type: 'new', giftId: picked.id, lvl: startLvl, msg: 'Пробуждён новый Дар Улья: «' + picked.name + '» (' + startLvl + ' ур.)!' };
      } else {
        const availableNew = this._pickWeightedRootGift(hero);
        const dropNew = availableNew ? Math.max(0.10, 0.40 - (K - 1) * 0.10) : 0;
        const dropGrow = (1.0 - dropNew) / 2;
        const r = Math.random();

        if (r < dropNew && availableNew) {
          const anchor = this.calcAnchorMana(hero, availableNew.mana1 || 0);
          hero.gifts[availableNew.id] = { lvl: startLvl, level: startLvl, manaAnchor: anchor, branches: {} };
          res = { type: 'new', giftId: availableNew.id, lvl: startLvl, msg: 'Пробуждён новый Дар Улья: «' + availableNew.name + '» (' + startLvl + ' ур.)!' };
        } else if (r < dropNew + dropGrow) {
          const units = [];
          rootIds.forEach(gid => {
            units.push({ kind: 'root', gid });
            Object.keys(hero.gifts[gid].branches || {}).forEach(bk => units.push({ kind: 'branch', gid, bk }));
          });
          const u = units[Math.floor(Math.random() * units.length)];
          const gMeta = db[u.gid];
          if (u.kind === 'root') {
            const cap = gMeta.cap || 30;
            const nextL = Math.min(cap, Number(hero.gifts[u.gid].lvl || 1) + gainLvl);
            hero.gifts[u.gid].lvl = hero.gifts[u.gid].level = nextL;
            res = { type: 'grow', giftId: u.gid, lvl: nextL, msg: 'Дар «' + gMeta.name + '» усилен до ' + nextL + ' ур.!' };
          } else {
            const bMeta = (gMeta.branches || []).find(b => b.id === u.bk) || { name: u.bk };
            const curB = hero.gifts[u.gid].branches[u.bk];
            const prevBL = typeof curB === 'object' ? Number(curB.lvl || 1) : Number(curB || 1);
            const nextBL = Math.min(30, prevBL + gainLvl);
            hero.gifts[u.gid].branches[u.bk] = { lvl: nextBL, level: nextBL, manaAnchor: (curB && curB.manaAnchor) || 0 };
            res = { type: 'grow', giftId: u.gid, branchKey: u.bk, lvl: nextBL, msg: 'Ветка «' + bMeta.name + '» (' + gMeta.name + ') усилена до ' + nextBL + ' ур.!' };
          }
        } else {
          const rGid = rootIds[Math.floor(Math.random() * rootIds.length)];
          const rMeta = db[rGid];
          const ownedBrs = hero.gifts[rGid].branches || {};
          const closed = (rMeta.branches || []).filter(b => !ownedBrs[b.id]);
          if (closed.length > 0) {
            const chosen = closed[Math.floor(Math.random() * closed.length)];
            const anchor = this.calcAnchorMana(hero, chosen.mana1 || 0);
            ownedBrs[chosen.id] = { lvl: startLvl, level: startLvl, manaAnchor: anchor };
            res = { type: 'branch', giftId: rGid, branchKey: chosen.id, lvl: startLvl, msg: 'Открыта новая ветка Дара «' + rMeta.name + '»: «' + chosen.name + '» (' + startLvl + ' ур.)!' };
          } else {
            const allBrs = rMeta.branches || [];
            const bonus = Math.max(1, Math.floor((gainLvl / Math.max(1, allBrs.length)) * 2));
            allBrs.forEach(b => {
              const cur = ownedBrs[b.id];
              const nextV = Math.min(30, ((typeof cur === 'object' ? cur.lvl : cur) || 1) + bonus);
              ownedBrs[b.id] = { lvl: nextV, level: nextV, manaAnchor: (cur && cur.manaAnchor) || 0 };
            });
            res = { type: 'branch_overflow', giftId: rGid, msg: 'Все ветки Дара «' + rMeta.name + '» открыты! Каждая ветка получила +' + bonus + ' ур.!' };
          }
        }
      }

      if (res && res.msg) {
        this.log('🧬 ' + res.msg);
        if (typeof this.showGiftAwakenedModal === 'function') {
          this.showGiftAwakenedModal(hero, { giftId: res.giftId, msg: res.msg });
        }
      }
      return res;
    },

    checkThresholdAwakening(hero) {
      if (!hero) return null;
      this.bindHeroCompat(hero);
      const lvl = Number(hero.lvl || 0);
      const isInf = Boolean(hero.isInfected || hero.asInfected);
      const schedule = isInf ? INFECTED_THRESHOLDS : HUMAN_THRESHOLDS;
      hero.awakenedThresholds = hero.awakenedThresholds || {};
      hero.gifts = hero.gifts || {};

      const pending = schedule.filter(th => lvl >= th && !hero.awakenedThresholds[String(th)]);
      if (!pending.length) return null;

      pending.forEach(th => {
        hero.awakenedThresholds[String(th)] = true;
        this.rollHiveRoulette(hero, 'threshold', 1);
      });
      if (typeof this.syncHeroProfile === 'function') this.syncHeroProfile(hero);
      this.saveDB();
      return true;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 2C (РУЛЕТКА ДАРОВ, ПОРОГИ И ЖЕМЧУГ УЛЬЯ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  const INFECTED_THRESHOLDS =;
  const HUMAN_THRESHOLDS =;

  Object.assign(STIKS, {
    getAllGiftsMap() {
      return this.DARS || {};
    },

    _pickWeightedRootGift(hero) {
      const db = this.DARS || {};
      const owned = (hero && hero.gifts) ? hero.gifts : {};
      const isInfOnly = Boolean(hero && (hero.isInfected || hero.asInfected) && !hero.isKvaz && !hero.isImennoi);
      const pool = Object.keys(db).map(k => Object.assign({ id: k }, db[k])).filter(g => {
        if (!g || owned[g.id]) return false;
        if (isInfOnly) return g.pool === 'infected';
        if (hero && hero.isKvaz) return true;
        return g.pool === 'human';
      });
      if (!pool.length) return null;
      const archKey = hero ? (hero.origArch || hero.arch) : null;
      const favId = (this.ARCHETYPES && archKey && this.ARCHETYPES[archKey]) ? this.ARCHETYPES[archKey].affinity : null;
      let totalW = 0;
      const weighted = pool.map(g => {
        const w = (g.id === favId) ? 1.6 : 1.0;
        totalW += w;
        return { g, w };
      });
      let r = Math.random() * totalW;
      for (let i = 0; i < weighted.length; i++) {
        r -= weighted[i].w;
        if (r <= 0) return weighted[i].g;
      }
      return weighted[weighted.length - 1].g;
    },

    rollHiveRoulette(hero, source, baseStartLvl) {
      if (!hero) return { type: 'none', msg: '' };
      this.bindHeroCompat(hero);
      hero.gifts = hero.gifts || {};
      const db = this.DARS || {};
      const rootIds = Object.keys(hero.gifts).filter(id => db[id]);
      const K = rootIds.length;
      const isThreshold = (source === 'threshold');
      const gainLvl = isThreshold ? 1 : (source === 'white' ? 30 : (source === 'black' ? 10 : (source === 'red' ? 5 : 7)));
      const startLvl = isThreshold ? 1 : (baseStartLvl || 1);

      let res = null;
      const availNew = this._pickWeightedRootGift(hero);
      const dropNew = (K === 0) ? 1.0 : (availNew ? Math.max(0.10, 0.40 - (K - 1) * 0.10) : 0);
      const dropGrow = (1.0 - dropNew) / 2;
      const r = Math.random();

      if (r < dropNew && availNew) {
        hero.gifts[availNew.id] = { lvl: startLvl, level: startLvl, branches: {} };
        res = { type: 'new', giftId: availNew.id, lvl: startLvl, msg: 'Пробуждён новый Дар Улья: «' + availNew.name + '» (' + startLvl + ' ур.)!' };
      } else if (r < dropNew + dropGrow && K > 0) {
        const units = [];
        rootIds.forEach(gid => {
          units.push({ kind: 'root', gid });
          Object.keys(hero.gifts[gid].branches || {}).forEach(bk => units.push({ kind: 'branch', gid, bk }));
        });
        const u = units[Math.floor(Math.random() * units.length)];
        const gMeta = db[u.gid];
        if (u.kind === 'root') {
          const cap = gMeta.cap || 30;
          const nextL = Math.min(cap, Number(hero.gifts[u.gid].lvl || 1) + gainLvl);
          hero.gifts[u.gid].lvl = hero.gifts[u.gid].level = nextL;
          res = { type: 'grow', giftId: u.gid, lvl: nextL, msg: 'Дар «' + gMeta.name + '» усилен до ' + nextL + ' ур.!' };
        } else {
          const bMeta = (gMeta.branches || []).find(b => b.id === u.bk) || { name: u.bk };
          const curB = hero.gifts[u.gid].branches[u.bk];
          const nextBL = Math.min(30, Number((curB && curB.lvl) || curB || 1) + gainLvl);
          hero.gifts[u.gid].branches[u.bk] = { lvl: nextBL, level: nextBL };
          res = { type: 'grow', giftId: u.gid, branchKey: u.bk, lvl: nextBL, msg: 'Ветка «' + bMeta.name + '» (' + gMeta.name + ') усилена до ' + nextBL + ' ур.!' };
        }
      } else if (K > 0) {
        const rGid = rootIds[Math.floor(Math.random() * rootIds.length)];
        const rMeta = db[rGid];
        const ownedBrs = hero.gifts[rGid].branches || {};
        const closed = (rMeta.branches || []).filter(b => !ownedBrs[b.id]);
        if (closed.length > 0) {
          const pickB = closed[Math.floor(Math.random() * closed.length)];
          ownedBrs[pickB.id] = { lvl: startLvl, level: startLvl };
          res = { type: 'branch', giftId: rGid, branchKey: pickB.id, lvl: startLvl, msg: 'Открыта ветка Дара «' + rMeta.name + '»: «' + pickB.name + '» (' + startLvl + ' ур.)!' };
        } else {
          const bonus = Math.max(1, Math.floor(gainLvl / 2));
          Object.keys(ownedBrs).forEach(bk => {
            const nl = Math.min(30, Number(ownedBrs[bk].lvl || 1) + bonus);
            ownedBrs[bk] = { lvl: nl, level: nl };
          });
          res = { type: 'grow', giftId: rGid, msg: 'Все ветки Дара «' + rMeta.name + '» усилены на +' + bonus + ' ур.!' };
        }
      } else {
        return { type: 'none', msg: 'Все доступные Дары уже открыты.' };
      }

      if (res && res.msg) {
        this.log('🧬 ' + res.msg);
        if (typeof this.showGiftAwakenedModal === 'function') {
          this.showGiftAwakenedModal(hero, res);
        }
      }
      return res;
    },

    checkThresholdAwakening(hero) {
      if (!hero) return null;
      this.bindHeroCompat(hero);
      const lvl = Number(hero.lvl || 0);
      const isInf = Boolean(hero.isInfected || hero.asInfected);
      const schedule = isInf ? INFECTED_THRESHOLDS : HUMAN_THRESHOLDS;
      hero.awakenedThresholds = hero.awakenedThresholds || {};
      const pending = schedule.filter(th => lvl >= th && !hero.awakenedThresholds[String(th)]);
      if (!pending.length) return null;
      let last = null;
      pending.forEach(th => {
        hero.awakenedThresholds[String(th)] = true;
        last = this.rollHiveRoulette(hero, 'threshold', 1);
      });
      return last;
    },

    usePearl(p, color) {
      if (!p) return;
      this.bindHeroCompat(p);
      const c = String(color || '').toLowerCase();
      if (c === 'white' || c === 'белый') {
        p.isKvaz = false;
        p.isInfected = false;
        p.asInfected = false;
        p.isImennoi = true;
        this.log('⚪ Белый жемчуг очистил кровь! Присвоен статус Именного с сохранением всей силы!');
        this.rollHiveRoulette(p, 'white', 30);
        return;
      }
      const isBlack = (c === 'black' || c === 'черный' || c === 'чёрный');
      const r = Math.random() * 100;
      const kvazChance = isBlack ? 25 : 8;
      const infChance = isBlack ? 5 : 2;
      if (!p.isKvaz && !p.isImennoi && r < kvazChance) {
        p.isKvaz = true;
        ['str', 'agi', 'spd', 'end', 'int', 'spi'].forEach(k => { p.stats[k] = (p.stats[k] || 10) + 12; });
        this.log('☣️ МУТАЦИЯ: ' + p.name + ' стал КВАЗОМ!');
      } else if (!p.isInfected && !p.isKvaz && !p.isImennoi && r < kvazChance + infChance) {
        p.asInfected = p.isInfected = true;
        p.arch = 'infected';
        this.log('🧟 ОБРАЩЕНИЕ: ' + p.name + ' стал ОСОБЫМ ЗАРАЖЁННЫМ!');
      }
      this.rollHiveRoulette(p, isBlack ? 'black' : 'red', isBlack ? 10 : 5);
      this.recalcLevel(p);
      this.normalizePlayerStats(p);
    },

    showGiftAwakenedModal(hero, info) {
      if (typeof document === 'undefined' || !document.body) return;
      const old = document.getElementById('stiks-gift-awake-modal');
      if (old) old.remove();
      const gMeta = (info && info.giftId && this.DARS && this.DARS[info.giftId]) || null;
      const ov = document.createElement('div');
      ov.id = 'stiks-gift-awake-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(4,6,5,0.92);z-index:9950;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#f0e6e6;';
      ov.innerHTML = '<div style="width:100%;max-width:390px;background:#1a1012;border:2px solid #f59e0b;border-radius:10px;padding:14px;">' +
        '<div style="text-align:center;color:#fbbf24;font-weight:bold;font-size:14px;margin-bottom:8px;">🧬 ПРОБУЖДЕНИЕ ДАРА УЛЬЯ!</div>' +
        '<div style="background:#161218;border:1px solid #5c3a6e;padding:9px;border-radius:6px;font-size:12px;margin-bottom:8px;">' + (info.msg || '') + '</div>' +
        (gMeta ? '<div style="font-size:11px;color:#cbd5e1;margin-bottom:10px;">' + gMeta.desc + '</div>' : '') +
        '<button class="btn btn-primary" style="width:100%;padding:8px;" onclick="document.getElementById(\'stiks-gift-awake-modal\').remove()">Принять силу Улья ▶</button></div>';
      document.body.appendChild(ov);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 3A-1 (ФАМИЛИИ, ПЕРСОНАЖИ И ОТРЯД)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
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
        } catch (e) { alert('Ошибка кода сохранения'); }
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
      const name = inp ? inp.value.trim() : '';
      if (!name) { this.log('Введите имя персонажа.'); return; }
      const sex = sexEl ? sexEl.value : 'm';
      const archs = this.ARCHETYPES || {};
      const pool = Object.keys(archs).filter(k => k !== 'infected' && k !== 'kvaz' && (archs[k].sex === 'both' || archs[k].sex === sex));
      const chosen = pool[Math.floor(Math.random() * pool.length)] || (sex === 'f' ? 'tatan' : 'kachok');
      const aObj = archs[chosen] || { stats: { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 } };
      const st = Object.assign({ str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 }, aObj.stats || {});
      const hero = {
        uid: 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        family: this.activeFamily, name, sex, arch: chosen, origArch: chosen,
        lvl: 0, status: 'ready', isInfected: false, asInfected: false, isKvaz: false,
        stats: st, actionsCount: 0, skillUnlocked: false, darUnlocked: false,
        knowsSpores: false, sporeKnown: false, knowsRecipe: false, missionsDone: 0,
        spores: 0, sporans: 0, hp: 10 + Number(st.end || 10), maxHp: 10 + Number(st.end || 10),
        inv: [], stash: [], slots: this.defaultSlots(), gifts: {}
      };
      this.normalizePlayerStats(hero);
      this.db.families[this.activeFamily].push(hero);
      if (inp) inp.value = '';
      this.saveDB();
      this.log(`Создан персонаж: ${this.activeFamily} ${name} (${sex === 'f' ? 'Жен.' : 'Муж.'}).`);
      if (this.renderLobby) this.renderLobby();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 3A-2 (ОТРЯД, ПРАВИЛО ФАМИЛИЙ И ПАУЗА)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    resetDeadHero(fam, idx) {
      const hr = this.db && this.db.families && this.db.families[fam] && this.db.families[fam][idx];
      if (!hr) return;
      const archs = this.ARCHETYPES || {};
      const targetArch = (hr.origArch && hr.origArch !== 'infected' && archs[hr.origArch]) ? hr.origArch : (hr.sex === 'f' ? 'tatan' : 'kachok');
      const baseStats = (archs[targetArch] && archs[targetArch].stats) ? Object.assign({}, archs[targetArch].stats) : { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };
      Object.assign(hr, { arch: targetArch, origArch: targetArch, isInfected: false, asInfected: false, isKvaz: false, status: 'ready', lvl: 0, skillUnlocked: false, darUnlocked: false, stats: baseStats, inv: [], slots: this.defaultSlots(), gifts: {}, _hpInit: false });
      this.normalizePlayerStats(hr);
      this.squad = (this.squad || []).filter(s => s.uid !== hr.uid);
      this.saveDB();
      this.log(`🔄 Персонаж ${hr.name} обнулён до 0 ур.`);
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
      if (h.status === 'dead') { this.resetDeadHero(fam, idx); return; }
      h.status = 'ready';
      this.saveDB();
      if (this.renderLobby) this.renderLobby();
    },

    toggleSquad(fam, idx, forceInfected) {
      const h = this.db && this.db.families && this.db.families[fam] && this.db.families[fam][idx];
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
      if (this.renderLobby) this.renderLobby();
    },

    removeSquad(i) {
      this.squad.splice(i, 1);
      if (this.renderLobby) this.renderLobby();
    },

    pauseToLobby() {
      const s = this.db && this.db.session;
      if (s && Array.isArray(s.players)) s.players.forEach(pl => this.syncHeroProfile(pl));
      this.profileOpen = this.invOpen = false;
      this.lobbyPaused = true;
      this.saveDB();
      this.log('🏕 Рейд поставлен на паузу.');
      if (this.renderLobby) this.renderLobby();
    },

    resumeRaid() {
      this.lobbyPaused = false;
      if (this.db && this.db.session && this.renderGame) this.renderGame();
    },

    finishPausedRaid() {
      const s = this.db && this.db.session;
      if (!s) return;
      const snaps = Array.isArray(s.raidSnapshot) ? s.raidSnapshot : [];
      (s.players || []).forEach(pl => {
        const target = (this.db.families[pl.family] || []).find(h => h.uid === pl.uid);
        const orig = snaps.find(sn => sn.uid === pl.uid);
        if (target) {
          if (orig) Object.assign(target, { lvl: orig.lvl || 0, stats: orig.stats || {}, inv: orig.inv || [], slots: orig.slots || this.defaultSlots(), spores: orig.spores || 0, sporans: orig.spores || 0, status: orig.dead ? 'dead' : 'ready' });
          else target.status = pl.dead ? 'dead' : 'ready';
        }
      });
      this.db.session = null;
      this.lobbyPaused = false;
      this.squad = [];
      this.saveDB();
      if (this.renderLobby) this.renderLobby();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 3B-1 (СИНХРОНИЗАЦИЯ ПРОФИЛЯ И ЖОПАКУСЬ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    syncHeroProfile(pl) {
      if (!pl || !this.db || !this.db.families) return null;
      this._cleanSporans(pl);
      pl.inv = this.stackInventory ? this.stackInventory(pl.inv || []) : (pl.inv || []);
      const target = (this.db.families[pl.family] || []).find(h => h.uid === pl.uid);
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
        target.isKvaz = Boolean(pl.isKvaz);
        target.isImennoi = Boolean(pl.isImennoi);
        target.hp = pl.hp; target.maxHp = pl.maxHp;
        target.status = pl.dead ? 'dead' : (pl.escaped ? 'ready' : target.status);
      }
      return target;
    },

    pullProfileToPlayer(pl) {
      if (!pl || !this.db || !this.db.families) return;
      const target = (this.db.families[pl.family] || []).find(h => h && h.uid === pl.uid);
      if (!target) return;
      this._cleanSporans(target);
      pl.lvl = Number(target.lvl) || 0;
      if (target.stats) pl.stats = Object.assign({}, pl.stats || {}, target.stats);
      pl.inv = JSON.parse(JSON.stringify(target.inv || []));
      if (target.slots) pl.slots = Object.assign(this.defaultSlots(), JSON.parse(JSON.stringify(target.slots)));
      if (target.gifts) pl.gifts = JSON.parse(JSON.stringify(target.gifts));
      pl.spores = pl.sporans = target.spores;
      pl.isKvaz = Boolean(target.isKvaz);
      pl.isImennoi = Boolean(target.isImennoi);
      if (this.isRealSporeUnlocked(target)) pl.knowsSpores = pl.sporeKnown = pl.knowsRecipe = pl._manualBookRead = true;
      if (this.isRealSkillUnlocked(target)) pl._skillSuccessUsed = pl.skillUnlocked = pl.skillRevealed = true;
    },

    sanitizeRoster() {
      if (!this.db || !this.db.families) return;
      const hasActive = Boolean(this.db.session && Array.isArray(this.db.session.players) && this.db.session.players.length > 0);
      Object.keys(this.db.families).forEach(fam => {
        (this.db.families[fam] || []).forEach(hr => {
          this.bindHeroCompat(hr);
          if (!hasActive && hr.status === 'in_raid') hr.status = 'ready';
          this._cleanSporans(hr);
        });
      });
    },

    renderZhopakusSVG(infName, humName, dmg) {
      return '<svg viewBox="0 0 240 120" width="100%" style="background:#140e0e;border:1px solid #8f2d2d;border-radius:6px;margin:6px 0;">' +
        '<text x="120" y="24" text-anchor="middle" fill="#ff5a5a" font-family="monospace" font-size="14" font-weight="bold">🦷 ЖОПАКУСЬ! (-' + dmg + ' ОЗ)</text>' +
        '<text x="120" y="54" text-anchor="middle" fill="#f0e6e6" font-family="monospace" font-size="11">' + infName + ' вцепился в ' + humName + '!</text>' +
        '<text x="120" y="82" text-anchor="middle" fill="#d48a8a" font-family="monospace" font-size="10">Урон прошёл мимо брони прямо по филейной части!</text>' +
        '<text x="120" y="106" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-size="10">ХРУСТЬ! КЛАЦ! А-А-АЙ!!</text></svg>';
    },

    checkZhopakusOnTurnEnd(p, s) {
      if (!p || !s || !Array.isArray(s.players)) return;
      const isInf = Boolean(p.asInfected || p.isInfected);
      const near = s.players.filter(o => o && o.uid !== p.uid && !o.dead && !o.escaped && Math.abs(o.x - p.x) <= 3 && Math.abs(o.y - p.y) <= 3 && Boolean(o.asInfected || o.isInfected) !== isInf);
      if (!near.length) return;
      const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
      if (d1 === d2) this.playDoubleSound();
      if (d1 === 1 && d2 === 1) {
        const sk = Math.random() < 0.5 ? 'spi' : 'int';
        this.grantActionXp(p, sk, 3);
        this.log(`🧊 [1-1] Выдержка рядом с попутчиком! ${p.name} получает +3 к ${sk === 'spi' ? 'Духу' : 'Интеллекту'}.`);
      } else if (d1 === 6 && d2 === 6) {
        if (!isInf) {
          p.stinkTurns = 10;
          this.log(`💩 [6-6] Нервы не выдержали рядом с заражённым! ${p.name} получил статус «Вонь» на 10 ходов.`);
        } else {
          const trg = near;
          const dmg = Math.max(2, Math.round(2 + (Number(p.stats.str) || 10) * 0.25));
          trg.hp = Math.max(0, trg.hp - dmg);
          this.log(`🦷 [6-6] ЖОПАКУСЬ! ${p.name} не сдержал голод и укусил ${trg.name} мимо брони на -${dmg} ОЗ!` + this.renderZhopakusSVG(p.name, trg.name, dmg));
          if (trg.hp <= 0) { trg.dead = true; trg.status = 'dead'; this.syncHeroProfile(trg); }
        }
      } else {
        const sk = Math.random() < 0.5 ? 'spi' : 'int';
        this.grantActionXp(p, sk, 1);
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 3B-2b (СМЕНА ХОДА NEXTTURN)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    nextTurn() {
      const s = this.db && this.db.session;
      if (!s) return;
      const p = s.players[s.activeIdx];
      if (p && !p.escaped && !p.dead) {
        const dr = p.hp < (p.maxHp * 0.5) ? 2 : 1;
        const tMult = (p.arch === 'tatan' && !p.asInfected && !p.isKvaz) ? 2 : 1;
        p.spore = Math.max(0, (p.spore || 0) - dr);
        p.food = Math.max(0, (p.food || 0) - tMult);
        p.water = Math.max(0, (p.water || 0) - tMult);
        if (p.stinkTurns > 0) p.stinkTurns--;
        this.checkZhopakusOnTurnEnd(p, s);
        this.syncHeroProfile(p);
      }
      s.activeIdx++;
      if (s.activeIdx >= s.players.length) {
        s.activeIdx = 0;
        s.turn++;
        const dirs = [, [0, 1], [-1, 0], [1, 0]];
        (s.zombies || []).forEach(z => {
          if (z.type === 'ambush' && z.hidden && !z.tPos) return;
          let tx = z.x, ty = z.y;
          if (z.tPos) {
            tx += Math.sign(z.tPos.x - z.x); ty += Math.sign(z.tPos.y - z.y);
            if (tx === z.tPos.x && ty === z.tPos.y) z.tPos = null;
          } else {
            const d = dirs[Math.floor(Math.random() * 4)];
            tx += d; ty += d[1];
          }
          if (tx >= 0 && tx <= 59 && ty >= 0 && ty <= 59 && !s.grid[ty][tx].blocked) { z.x = tx; z.y = ty; }
        });
        this.log(`--- ХОД ${s.turn} ---`);
      }
      const np = s.players[s.activeIdx];
      if (np.escaped || np.dead) {
        if (s.players.every(pl => pl.escaped || pl.dead)) {
          this.db.session = null; this.lobbyPaused = false; this.squad = [];
          this.sanitizeRoster(); this.saveDB();
          if (this.renderLobby) this.renderLobby();
          return;
        }
        this.nextTurn();
        return;
      }
      this.normalizePlayerStats(np);
      np.stepsLeft = np.maxAp; np.movedThisTurn = false;
      this.saveDB();
      if (this.renderGame) this.renderGame();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 3C-1 (ВАЛИДАЦИЯ КАРТЫ И СТАРТОВЫЙ НАБОР)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
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
      if (!p || p._starterApplied || (p.lvl || 0) !== 0 || diffKey !== 'start') return;
      p._starterApplied = true;
      this.normalizePlayerStats(p);
      p.slots = Object.assign(this.defaultSlots(), p.slots || {});
      p.inv = Array.isArray(p.inv) ? p.inv : [];
      if (p.asInfected) {
        p.inv.push({ n: 'Походная аптечка', cat: 'med', rank: 1, w: 0.4, q: 2, heal: 25 });
        p.inv.push({ n: 'Сухпаёк Улья', cat: 'food', rank: 1, w: 0.5, q: 2, food: 35 });
        this.log('☣️ Стартовый набор Заражённого (0 ур.): 2 аптечки и 2 комплекта еды.');
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
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 3C-2 (ГЕНЕРАЦИЯ КАРТЫ 60x60 И СТАРТ РЕЙДА)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    launchMap(dKey = 'start') {
      if (!this.squad || !this.squad.length) return;
      if (dKey === 'hell' && !this.squad.some(s => (s.lvl || 0) >= 30)) {
        this.log('🔥 Режим «Пекло» доступен только отрядам с бойцом от 30 уровня!');
        return;
      }

      const diff = (global.STIKS_DB && global.STIKS_DB.DIFFS && global.STIKS_DB.DIFFS[dKey]) || { mod: (dKey === 'hell' ? 3 : -2) };
      const barriers = (global.STIKS_DB && global.STIKS_DB.BARRIERS) || ['Скала', 'Водоем', 'Руины', 'Обрыв', 'Пожар'];
      const g = [];
      for (let y = 0; y < 60; y++) {
        const r = [];
        for (let x = 0; x < 60; x++) {
          r.push({ x, y, blocked: false, bType: null, lootType: null, domCal: null, valuable: false, exhaust: -(Math.floor(Math.random() * 3) + 1) });
        }
        g.push(r);
      }

      let bC = 0, att = 0;
      while (bC < 420 && att < 12000) {
        att++;
        const x = Math.floor(Math.random() * 58) + 1, y = Math.floor(Math.random() * 58) + 1;
        if (g[y][x].blocked) continue;
        g[y][x].blocked = true;
        g[y][x].bType = barriers[Math.floor(Math.random() * barriers.length)];
        if (!this.validateMap60(g)) { g[y][x].blocked = false; g[y][x].bType = null; } else bC++;
      }

      const cals = ['12g', '12g', '545', '762', '9mm'];
      let lC = 0, lA = 0;
      while (lC < 55 && lA < 4000) {
        lA++;
        const x = Math.floor(Math.random() * 60), y = Math.floor(Math.random() * 60);
        if (g[y][x].blocked || g[y][x].lootType) continue;
        g[y][x].lootType = lC < 14 ? 'weapon' : (lC < 28 ? 'armor' : 'supply');
        g[y][x].domCal = cals[Math.floor(Math.random() * cals.length)];
        g[y][x].valuable = (lC % 3 === 0);
        g[y][x].exhaust = 0;
        lC++;
      }

      const hasNovice = this.squad.some(pl => (Number(pl.lvl) || 0) === 0 && (Number(pl.missionsDone) || 0) === 0);
      const finalDiffMod = (!hasNovice && dKey === 'start') ? Math.max(-1, (diff.mod || -2) + 1) : (diff.mod || 0);

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
        } while (g[py][px].blocked && tries < 300);

        Object.assign(p, { x: px, y: py, status: 'in_raid', moveMode: 'careful', movedThisTurn: false, escaped: false, dead: false, stinkTurns: 0, _raidStartLvl: Number(p.lvl) || 0, _raidKills: 0 });
        this.normalizePlayerStats(p);
        p.stepsLeft = p.maxAp;
        p.hp = p.maxHp;
        if (isNovice && dKey === 'start') this.applyNewbieStarter(p, dKey);
        return p;
      });

      const archKeys = Object.keys(this.ARCHETYPES || {}).filter(k => k !== 'infected' && k !== 'kvaz');
      const totZ = Math.max(48, pls.length * 48);
      const zms = [];
      let zA = 0;
      while (zms.length < totZ && zA < 3000) {
        zA++;
        const zx = Math.floor(Math.random() * 58) + 1, zy = Math.floor(Math.random() * 58) + 1;
        if (g[zy][zx].blocked || pls.some(pl => Math.abs(pl.x - zx) <= 2 && Math.abs(pl.y - zy) <= 2)) continue;
        const isAmbush = (zms.length % 3 === 0);
        const isHum = !isAmbush && (zms.length % 7 === 0) && archKeys.length > 0;
        zms.push({ id: 'z_' + zms.length, x: zx, y: zy, type: isAmbush ? 'ambush' : 'roam', hidden: isAmbush, rankMod: isAmbush ? -1 : 0, tPos: null, isHuman: isHum, arch: isHum ? archKeys[zms.length % archKeys.length] : 'infected' });
      }

      this.db.session = { turn: 1, activeIdx: 0, diffKey: dKey, diffMod: finalDiffMod, grid: g, players: pls, zombies: zms, pendingSpores: 0, raidSnapshot: JSON.parse(JSON.stringify(pls)) };
      pls.forEach(pl => {
        const o = (this.db.families[pl.family] || []).find(h => h.uid === pl.uid);
        if (o) o.status = 'in_raid';
      });
      this.lobbyPaused = false;
      this.saveDB();
      this.log(`🗺️ Карта 60x60 готова! Барьеров: ${bC}, Точек лута: ${lC}, Угроз: ${zms.length}`);
      if ((pls.lvl || 0) === 0 && typeof this.showIntro === 'function') this.showIntro(pls);
      else if (this.renderGame) this.renderGame();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 3D-1 (ВЕС, РЕЖИМЫ ШАГА И ВЫХОД С КАРТЫ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
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
      let mult = 1, blocked = false;
      if (rawPct > 150) { blocked = true; mult = 999; }
      else if (rawPct > 100) mult = 1.5;
      else if (rawPct > 80) mult = 1.25;
      const col = rawPct > 100 ? '#e53935' : (rawPct > 80 ? '#ffb300' : '#4caf50');
      return { cur, max, pct: Math.min(100, rawPct), rawPct, col, mult, blocked };
    },

    getStepCost(m) {
      const base = m === 'careful' ? 3 : (m === 'fast' ? 2 : 1);
      const s = this.db && this.db.session;
      const p = s && s.players && s.players[s.activeIdx];
      if (!p) return base;
      const ci = this.getCarryInfo(p);
      return ci.blocked ? 999 : Math.ceil(base * ci.mult);
    },

    setMoveMode(m) {
      const s = this.db && this.db.session;
      if (!s) return;
      const p = s.players[s.activeIdx];
      if (p.movedThisTurn) { this.log('❌ Нельзя менять скорость после начала движения в этом ходу.'); return; }
      p.moveMode = m;
      this.saveDB();
      if (this.renderGame) this.renderGame();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 3D-1 (ПЕРЕДВИЖЕНИЕ И ПЕРЕГРУЗ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
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
      this.normalizePlayerStats(p);
      const max = p.maxWeight || 11;
      const cur = this.getInvWeight(p);
      const rawPct = max > 0 ? Math.round((cur / max) * 100) : 0;
      let mult = 1, blocked = false;
      if (rawPct > 150) { blocked = true; mult = 999; }
      else if (rawPct > 100) mult = 1.5;
      else if (rawPct > 80) mult = 1.25;
      return { cur, max, pct: Math.min(100, rawPct), rawPct, col: rawPct > 100 ? '#e53935' : (rawPct > 80 ? '#ffb300' : '#4caf50'), mult, blocked };
    },

    getStepCost(m) {
      const base = m === 'careful' ? 3 : (m === 'fast' ? 2 : 1);
      const s = this.db && this.db.session;
      const p = s && s.players && s.players[s.activeIdx];
      if (!p) return base;
      const ci = this.getCarryInfo(p);
      return ci.blocked ? 999 : Math.ceil(base * ci.mult);
    },

    setMoveMode(m) {
      const s = this.db && this.db.session;
      if (!s) return;
      const p = s.players[s.activeIdx];
      if (p.movedThisTurn) { this.log('❌ Нельзя менять скорость после начала движения в этом ходу.'); return; }
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
        p.status = 'ready';
        const lvlGain = Math.max(0, (Number(p.lvl) || 0) - (p._raidStartLvl || 0));
        const kills = Number(p._raidKills) || 0;
        delete p._raidStartLvl; delete p._raidKills;
        const saved = this.syncHeroProfile(p);
        const msg = `🚪 ${p.name} вышел с локации! Уровней: +${lvlGain} (Ур.${p.lvl}), врагов: ${kills}, споранов: ${saved ? saved.spores : p.spores} шт.`;
        this.log(msg);
        this.speakPhrase(p, msg);
        if (!s.players.some(pl => !pl.dead && !pl.escaped)) {
          this.db.session = null; this.lobbyPaused = false; this.squad = [];
          this.sanitizeRoster(); this.saveDB();
          if (this.renderLobby) this.renderLobby();
          if (this.showRaidSummaryModal) this.showRaidSummaryModal({ uid: p.uid, fam: p.family, name: p.name, lvlGain, endLvl: p.lvl, kills, spores: saved ? saved.spores : p.spores, itemsCount: (p.inv || []).length });
          return;
        }
        this.saveDB(); this.nextTurn();
        return;
      }

      const carry = this.getCarryInfo(p);
      if (carry.blocked) { this.log('🎒 Критический перегруз (>150%)! Шаг заблокирован.'); return; }
      const cost = this.getStepCost(p.moveMode);
      if (p.stepsLeft < cost) { this.log(`❌ Нужно ${cost} ОХ, осталось ${p.stepsLeft}.`); return; }
      const c = s.grid[ny][nx];
      if (c.blocked) { this.log(`⛰️ Преграда: ${c.bType}.`); return; }

      p.x = nx; p.y = ny; p.stepsLeft -= cost; p.movedThisTurn = true;
      s.pendingSpores = 0;
      this.playStepSound(p.moveMode || 'careful');
      this.grantActionXp(p, p.moveMode === 'run' ? 'spd' : (p.moveMode === 'careful' ? 'agi' : 'end'), 0.25);
      if (carry.rawPct >= 80) this.grantActionXp(p, 'str', 0.5);

      if (p.moveMode === 'run' || p.stinkTurns > 0) {
        const rad = p.stinkTurns > 0 ? 4 : 3;
        s.zombies.forEach(z => { if (Math.abs(z.x - nx) <= rad && Math.abs(z.y - ny) <= rad) { z.hidden = false; z.tPos = { x: nx, y: ny }; } });
      }
      if (p.moveMode === 'careful') {
        s.zombies.forEach(z => { if (z && z.hidden && Math.abs(z.x - nx) <= 2 && Math.abs(z.y - ny) <= 2) z.hidden = false; });
      }

      const zHit = s.zombies.find(z => z.x === nx && z.y === ny);
      if (zHit) { zHit.hidden = false; this.triggerEncounter(p, zHit); return; }
      if (c.lootType) this.log('👀 Замечено ценное место. Нажмите «🔍 Поиск (3)».');
      this.saveDB();
      if (this.renderGame) this.renderGame();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 3D-2a (ПОИСК И ДОБЫЧА ЛУТА)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    genClusterItem(cat, domCal) {
      const db = global.STIKS_DB || {};
      const poolObj = db.CAL_POOL || { ammo: [], weapon: [], gear: [] };
      if (cat === 'weapon' && poolObj.weapon && poolObj.weapon.length) {
        if (Math.random() < 0.72) {
          const pool = (poolObj.ammo || []).filter(x => x.cal === domCal);
          const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : (poolObj.ammo || { n: 'Патроны 12g', cal: '12g', slot: 'mag', w: 0.3, a: 2, rank: 1 });
          return Object.assign({}, pick, { cat: 'ammo', q: 1 });
        }
        const pool = poolObj.weapon.filter(x => x.cal === domCal || !x.cal);
        const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : poolObj.weapon;
        return Object.assign({}, pick, { cat: 'weapon', q: 1 });
      }
      if (cat === 'armor' && poolObj.gear && poolObj.gear.length) {
        const pick = poolObj.gear[Math.floor(Math.random() * poolObj.gear.length)];
        return Object.assign({}, pick, { cat: 'gear', q: 1 });
      }
      const sup = (db.ITEMS && db.ITEMS && db.ITEMS.supply) || { std: [{ n: 'Консервы', food: 25, w: 0.4, rank: 1 }], luck: [{ n: 'Походная аптечка', heal: 30, w: 0.4, rank: 1 }] };
      const list = [...(sup.std || []), ...(sup.weak || []), ...(sup.luck || [])];
      const pick = list[Math.floor(Math.random() * list.length)] || { n: 'Сухпаёк', food: 20, w: 0.4, rank: 1 };
      return Object.assign({}, pick, { cat: 'supply', slot: 'use', q: 1 });
    },

    canPickItem(p, it) {
      if (!p || !it) return false;
      if ((p.asInfected || p.isInfected) && !p.isKvaz && (p.lvl || 0) < 20) {
        const slot = this.detectSlot ? this.detectSlot(it) : null;
        if (['main', 'side', 'melee', 'armor', 'clothes', 'mag', 'mod', 'meleeMod'].includes(slot)) {
          return typeof this.canInfectedEquipItem === 'function' ? this.canInfectedEquipItem(p, it) : false;
        }
      }
      return true;
    },

    announceLoot(p, foundItems) {
      if (!p || !Array.isArray(foundItems) || !foundItems.length) return;
      const fem = this.isFem(p);
      const totalCount = foundItems.reduce((acc, it) => acc + (Number(it.q) || 1), 0);
      const last = foundItems[foundItems.length - 1];
      const lastName = (last && (last.n || last.name)) || 'добычу';
      const msg = totalCount === 1
        ? (fem ? `Я нашла: ${lastName}.` : `Я нашёл: ${lastName}.`)
        : (fem ? `Я нашла предметов: ${totalCount}, последний — ${lastName}.` : `Я нашёл предметов: ${totalCount}, последний — ${lastName}.`);
      this.speakPhrase(p, msg);
    },

    searchCell(onMove) {
      if (onMove) return;
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players[s.activeIdx];
      const cell = s.grid[p.y][p.x];
      if (p.stepsLeft < 3) { this.log('❌ Для поиска нужно минимум 3 ОХ!'); return; }
      p.stepsLeft -= 3;
      this.playRustleSound();

      const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
      if (d1 === d2) { this.playDoubleSound(); this.grantActionXp(p, 'spi', 1); }

      const bonus = cell.valuable ? 2 : 1;
      let qty = d1 + cell.exhaust + bonus;
      if (d1 === 1 && d2 === 1) qty = Math.max(1, qty);
      if (qty <= 0) {
        this.log(`🔍 Поиск [${p.x + 1}:${p.y + 1}]: пусто.`);
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }

      const cats = ['weapon', 'armor', 'supply'];
      const foundItems = [];
      for (let i = 0; i < qty; i++) {
        const item = this.genClusterItem(cell.lootType || cats[Math.floor(Math.random() * 3)], cell.domCal || '12g');
        if (this.canPickItem(p, item)) { p.inv.push(item); foundItems.push(item); }
      }

      if (!this.isRealSporeUnlocked(p) && !p.asInfected && Math.random() < 0.01) {
        const guide = { n: '📘 Руководство по выживанию в Улье', cat: 'supply', slot: 'use', isGuide: true, w: 0.2, q: 1, rank: 2 };
        p.inv.push(guide);
        foundItems.push(guide);
      }

      cell.exhaust--;
      if (foundItems.length) {
        p.inv = this.stackInventory ? this.stackInventory(p.inv) : p.inv;
        this.grantActionXp(p, 'int', 0.25 * foundItems.length);
        this.log(`🔍 Поиск (${foundItems.length} шт.): ${foundItems.map(x => x.n).join(', ')}.`);
        this.announceLoot(p, foundItems);
      }
      this.saveDB();
      if (this.renderGame) this.renderGame();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 4A-1 (ИНВЕНТАРЬ, 11 СЛОТОВ И РАНГИ P1–P4)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
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
      if (!holder || !Array.isArray(holder.inv) || !holder.inv[idx]) return null;
      const it = holder.inv[idx];
      const q = Number(it.q !== undefined ? it.q : (it.qty !== undefined ? it.qty : 1));
      if (q > 1) { it.q = q - 1; if (it.qty !== undefined) it.qty = it.q; }
      else holder.inv.splice(idx, 1);
      return it;
    },

    isBookItem(it) {
      if (!it) return false;
      const nm = String(it.n || it.name || '').toLowerCase();
      return Boolean(it.recipe || it.isGuide || nm.includes('руководств') || nm.includes('инструкц') || nm.includes('книг'));
    },

    detectSlot(it) {
      if (!it) return null;
      if (it.slot && ['main', 'side', 'melee', 'mag', 'mod', 'meleeMod', 'armor', 'clothes', 'boots', 'bag', 'talisman'].includes(it.slot)) return it.slot;
      const name = String(it.n || it.name || '').toLowerCase();
      const cat = String(it.cat || it.type || '').toLowerCase();
      if (this.isBookItem(it)) return 'consumable_book';
      if (cat === 'med' || cat === 'heal' || /аптеч|бинт|стимулятор|таблет/.test(name)) return 'consumable_med';
      if (cat === 'food' || cat === 'drink' || cat === 'supply' || /живчик|вода|тушен|консерв|водк|спирт|алко|сок|сухпа/.test(name)) return 'consumable_other';
      if (cat === 'meleemod' || it.isPoison || /яд|отрав|смазк/.test(name)) return 'meleeMod';
      if (cat === 'mod' || /прицел|глушител|обвес|коллиматор/.test(name)) return 'mod';
      if (cat === 'armor' || /бронежилет|брон|жилет|кирас/.test(name)) return 'armor';
      if (cat === 'clothes' || /халат|куртк|одежд|комбинезон|плащ|пуховик|костюм|ватник|косух|горк/.test(name)) return 'clothes';
      if (cat === 'boots' || /ботин|сапог|берц|кроссов/.test(name)) return 'boots';
      if (cat === 'bag' || /рюкзак|сумк|баул|вещмешок/.test(name)) return 'bag';
      if (cat === 'talisman' || cat === 'amulet' || it.troll || it.shame || /амулет|позор|трусик|дуршлаг/.test(name)) return 'talisman';
      if (cat === 'mag' || cat === 'ammo' || /обойм|магазин|патрон|картеч|дроб/.test(name)) return 'mag';
      if (cat === 'melee' || /нож|топор|бит|монтиров|мачете|дубин|клинок|арматур/.test(name)) return 'melee';
      if (cat === 'side' || /пистолет|револьвер|обрез|пм|тт|глок|glock/.test(name)) return 'side';
      if (cat === 'weapon' || cat === 'main' || /автомат|ружь|винтов|дробовик|карабин|ак-|акм|скс|всс|гаусс/.test(name)) return 'main';
      return null;
    },

    resolveItemRank(it) {
      if (!it) return 1;
      const raw = Number(it.rank || it.cls || it.tier || it.r || 0);
      if (raw >= 1 && raw <= 4) return Math.round(raw);
      if (raw >= 5) return 4;
      const atk = Number(it.a || it.dmg || 0), def = Number(it.d || it.def || 0), heal = Number(it.heal || it.hp || 0);
      if (atk >= 60 || def >= 60 || heal >= 120) return 4;
      if (atk >= 25 || def >= 25 || heal >= 55) return 3;
      if (atk >= 12 || def >= 12 || heal >= 32) return 2;
      return 1;
    },

    canInfectedEquipItem(hero, item) {
      if (!hero || !item) return false;
      const gifts = hero.gifts || {};
      const slot = this.detectSlot(item);
      const vaishLvl = gifts.vaishnavism ? Number(gifts.vaishnavism.lvl || 1) : 0;
      if (slot === 'melee' && vaishLvl >= 1) return true;
      if ((slot === 'main' || slot === 'side') && vaishLvl >= 15) return true;
      if (slot === 'armor' && gifts.gigantism) return true;
      if (slot === 'clothes' && gifts.hive_child) return true;
      return false;
    },

    _stripInfectedHumanGear(hero) {
      if (!hero || (!hero.isInfected && !hero.asInfected) || hero.isKvaz || Number(hero.lvl || 0) >= 20 || !hero.slots) return;
      hero.inv = Array.isArray(hero.inv) ? hero.inv : [];
      ['main', 'side', 'melee', 'armor', 'clothes', 'mod', 'meleeMod'].forEach(sk => {
        const it = hero.slots[sk];
        if (it && !this.canInfectedEquipItem(hero, it)) {
          hero.inv.push(it);
          hero.slots[sk] = null;
        }
      });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 4A-2 (ЭКИПИРОВКА, КНИГА И ОКНО РЮКЗАКА)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    showGuideLearnedModal(p, bookName, intGain) {
      if (typeof document === 'undefined' || !document.body) return;
      const old = document.getElementById('stiks-guide-modal');
      if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'stiks-guide-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(4,7,6,0.92);z-index:9800;display:flex;align-items:center;justify-content:center;padding:14px;font-family:monospace;color:#e6f2eb;';
      ov.innerHTML = '<div style="width:100%;max-width:400px;background:#181113;border:2px solid #d48a8a;border-radius:10px;padding:15px;">' +
        '<div style="text-align:center;color:#fbbf24;font-weight:bold;font-size:14px;margin-bottom:8px;">📖 ИЗУЧЕНО: ' + (bookName || 'РУКОВОДСТВО ПО ВЫЖИВАНИЮ') + '</div>' +
        '<div style="font-size:11.5px;line-height:1.45;margin-bottom:10px;">✅ Открыт <b>Споровый баланс</b>.<br>💎 Открыт сбор <b>споранов</b> (1 ОХ, 0 кг) с тварей ранга 2+.<br>🧪 Открыт рецепт <b>«Живчика»</b>: 1 споран + 1 алкоголь = 3 порции.' + (intGain > 0 ? '<br>🧠 Интеллект +' + intGain : '') + '</div>' +
        '<button class="btn btn-primary" style="width:100%;padding:8px;" onclick="document.getElementById(\'stiks-guide-modal\').remove()">Принять к сведению ▶</button></div>';
      document.body.appendChild(ov);
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
        p._manualBookRead = p.knowsSpores = p.sporeKnown = p.knowsRecipe = true;
        delete p._autoSporeBug;
        this.consumeInvOne(p, idx);
        const intGain = this.grantActionXp(p, 'int', 0.5);
        this.syncHeroProfile(p);
        this.log('📖 Изучено руководство по выживанию в Улье!');
        this.saveDB();
        if (this.renderGame) this.renderGame();
        this.showGuideLearnedModal(p, name, intGain);
        return;
      }

      if (slot === 'consumable_med') {
        if (p.hp >= p.maxHp) { this.log(`❤️ Здоровье уже полное (${p.hp}/${p.maxHp}).`); return; }
        const healAmt = Number(it.heal || it.hp || it.val || 0) || Math.max(25, Math.ceil(p.maxHp * 0.6));
        p.hp = Math.min(p.maxHp, p.hp + healAmt);
        this.consumeInvOne(p, idx);
        this.log(`💊 Использовано [${name}]: ОЗ → ${p.hp}/${p.maxHp}.`);
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }

      if (slot === 'consumable_other' || it.cat === 'supply' || it.slot === 'use') {
        if (it.pearl) { this.usePearl(p, it.pearl); this.consumeInvOne(p, idx); this.saveDB(); if (this.renderGame) this.renderGame(); return; }
        if (it.hp) p.hp = Math.min(p.maxHp, Math.max(1, p.hp + Number(it.hp)));
        if (it.food) p.food = Math.min(p.maxFood, Math.max(0, p.food + Number(it.food)));
        if (it.water) p.water = Math.min(p.maxWater, Math.max(0, p.water + Number(it.water)));
        if (it.stamina) p.stamina = Math.min(p.maxStamina, Math.max(0, p.stamina + Number(it.stamina)));
        if (it.spore) { p.spore = Math.min(p.maxSpore, p.spore + Number(it.spore)); p._manualBookRead = p.knowsSpores = p.knowsRecipe = true; }
        if (it.stink) p.stinkTurns = Number(it.stink);
        this.consumeInvOne(p, idx);
        this.log(`🎒 Использовано: ${name}`);
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }

      if (slot && Object.prototype.hasOwnProperty.call(p.slots, slot)) {
        if ((p.asInfected || p.isInfected) && !p.isKvaz && (p.lvl || 0) < 20 && ['main', 'side', 'melee', 'armor', 'clothes', 'mod', 'meleeMod'].includes(slot) && !this.canInfectedEquipItem(p, it)) {
          this.log('☣️ Заражённый до 20 уровня не может надевать человеческое снаряжение без Дара!');
          return;
        }
        if (slot === 'mod' && !p.slots.main && !p.slots.side) { this.log('🔧 Сначала наденьте огнестрел.'); return; }
        if (slot === 'meleeMod' && !p.slots.melee) { this.log('🧪 Сначала наденьте холодное оружие.'); return; }
        const old = p.slots[slot];
        const single = JSON.parse(JSON.stringify(it));
        single.q = single.qty = 1;
        this.consumeInvOne(p, idx);
        if (old) p.inv.push(old);
        p.slots[slot] = single;
        p.inv = this.stackInventory(p.inv);
        this.normalizePlayerStats(p);
        this.syncHeroProfile(p);
        this.log(`🛡️ Экипировано: ${name}`);
        this.saveDB();
        if (this.renderGame) this.renderGame();
      }
    },

    unequipSlot(slotKey) {
      const s = this.db && this.db.session;
      const p = s && s.players && s.players[s.activeIdx];
      if (!p || !p.slots || !p.slots[slotKey]) return;
      const it = p.slots[slotKey];
      p.slots[slotKey] = null;
      p.inv.push(it);
      p.inv = this.stackInventory(p.inv);
      this.normalizePlayerStats(p);
      this.syncHeroProfile(p);
      this.saveDB();
      if (this.renderGame) this.renderGame();
    },

    dropItem(idx) {
      const s = this.db && this.db.session;
      const p = s && s.players && s.players[s.activeIdx];
      if (!p || !p.inv || !p.inv[idx]) return;
      p.inv.splice(idx, 1);
      this.normalizePlayerStats(p);
      this.syncHeroProfile(p);
      this.saveDB();
      if (this.renderGame) this.renderGame();
    },

    renderEquipModal(p) {
      const carry = this.getCarryInfo(p);
      const rCols = { 1: '#9e9e9e', 2: '#3b82f6', 3: '#a855f7', 4: '#ef4444' };
      const slotDefs = [['main', '🔫 Основное'], ['side', '🔫 Доп. оружие'], ['melee', '🔪 Холодное'], ['mag', '📦 Обойма'], ['mod', '🔭 Обвес'], ['meleeMod', '🧪 Яд клинка'], ['armor', '🛡️ Броня'], ['clothes', '🧥 Одежда'], ['boots', '👢 Обувь'], ['bag', '🎒 Рюкзак'], ['talisman', '🧿 Амулет']];
      let h = '<div style="position:fixed;inset:0;background:rgba(5,7,6,0.92);z-index:9100;display:flex;align-items:center;justify-content:center;padding:10px;">';
      h += '<div style="width:100%;max-width:420px;max-height:92dvh;overflow-y:auto;border:1px solid #6e2626;background:#140e0e;padding:12px;border-radius:6px;">';
      h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid #4a1c1c;padding-bottom:6px;"><b style="color:#d48a8a;">🎒 СНАРЯЖЕНИЕ (${carry.cur}/${carry.max} кг • ${carry.rawPct}%)</b><button class="btn btn-danger" style="width:auto !important;padding:4px 8px;font-size:11px;" onclick="STIKS.toggleInv()">✖</button></div>`;
      h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-bottom:8px;">';
      slotDefs.forEach(([sk, lbl]) => {
        const eq = p.slots && p.slots[sk];
        const r = eq ? this.resolveItemRank(eq) : 1;
        const eqTxt = eq ? `<b style="color:#f2dada;">${eq.n || eq.name}</b> <span style="color:${rCols[r]};">[P${r}]</span>` : '<span style="color:#6e5252;">пусто</span>';
        const btn = eq ? `<button class="btn" style="width:auto !important;padding:2px 5px;font-size:9px;margin-top:3px;" onclick="STIKS.unequipSlot('${sk}')">Снять</button>` : '';
        h += `<div style="background:#0d0909;border:1px solid #3d1c1c;padding:5px;border-radius:4px;font-size:10px;"><div><div style="color:#a87f7f;font-size:9px;">${lbl}</div><div>${eqTxt}</div></div>${btn}</div>`;
      });
      h += '</div><div style="font-size:11px;color:#d48a8a;font-weight:bold;margin-bottom:4px;">РЮКЗАК (' + p.inv.length + '):</div>';
      if (!p.inv.length) h += '<div style="color:#7a6060;font-size:11px;text-align:center;padding:6px 0;">Рюкзак пуст.</div>';
      else p.inv.forEach((it, idx) => {
        const r = this.resolveItemRank(it);
        const sl = this.detectSlot(it);
        const actLabel = (sl && !sl.startsWith('consumable_')) ? 'Надеть' : 'Исп.';
        h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #2b1515;font-size:11px;"><span><b style="color:${rCols[r]};">[P${r}]</b> ${it.n || it.name}${(it.q || 1) > 1 ? ' x' + it.q : ''}</span><div style="display:flex;gap:4px;"><button class="btn btn-primary" style="width:auto !important;padding:3px 7px;font-size:10px;" onclick="STIKS.equipFromInv(${idx})">${actLabel}</button><button class="btn btn-danger" style="width:auto !important;padding:3px 7px;font-size:10px;" onclick="STIKS.dropItem(${idx})">✖</button></div></div>`;
      });
      return h + '</div></div>';
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 4A-1 (ИНВЕНТАРЬ, РАНГИ P1–P4 И СЛОТЫ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
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
      if (!holder || !Array.isArray(holder.inv) || !holder.inv[idx]) return null;
      const it = holder.inv[idx];
      const q = Number(it.q !== undefined ? it.q : (it.qty !== undefined ? it.qty : 1));
      if (q > 1) { it.q = q - 1; if (it.qty !== undefined) it.qty = it.q; }
      else holder.inv.splice(idx, 1);
      return it;
    },

    resolveItemRank(it) {
      if (!it) return 1;
      const raw = Number(it.rank || it.cls || it.tier || it.r || 0);
      if (raw >= 1 && raw <= 4) return Math.round(raw);
      if (raw >= 5) return 4;
      const atk = Number(it.a || it.dmg || 0), def = Number(it.d || it.def || 0), heal = Number(it.heal || it.hp || 0);
      if (atk >= 60 || def >= 60 || heal >= 120) return 4;
      if (atk >= 25 || def >= 25 || heal >= 55) return 3;
      if (atk >= 12 || def >= 12 || heal >= 32) return 2;
      return 1;
    },

    isBookItem(it) {
      if (!it) return false;
      const nm = String(it.n || it.name || '').toLowerCase();
      return Boolean(it.recipe || it.isGuide || nm.includes('руководств') || nm.includes('инструкц') || nm.includes('книг'));
    },

    detectSlot(it) {
      if (!it) return null;
      if (it.slot && ['main', 'side', 'melee', 'mag', 'mod', 'meleeMod', 'armor', 'clothes', 'boots', 'bag', 'talisman'].includes(it.slot)) return it.slot;
      const name = String(it.n || it.name || '').toLowerCase();
      const cat = String(it.cat || it.type || '').toLowerCase();
      if (this.isBookItem(it)) return 'consumable_book';
      if (cat === 'med' || /аптеч|бинт|стимулятор|таблет/.test(name)) return 'consumable_med';
      if (cat === 'food' || cat === 'drink' || cat === 'supply' || /живчик|вода|тушен|консерв|водк|спирт|алко|сок|сухпа/.test(name)) return 'consumable_other';
      if (cat === 'meleemod' || it.isPoison || /яд|отрав|смазк/.test(name)) return 'meleeMod';
      if (cat === 'mod' || /прицел|глушител|обвес|коллиматор/.test(name)) return 'mod';
      if (cat === 'armor' || /бронежилет|брон|жилет|кирас|шлем/.test(name)) return 'armor';
      if (cat === 'clothes' || /халат|куртк|одежд|комбинезон|плащ|пуховик|костюм|ватник|косух|горк/.test(name)) return 'clothes';
      if (cat === 'boots' || /ботин|сапог|берц|кроссов/.test(name)) return 'boots';
      if (cat === 'bag' || /рюкзак|сумк|вещмешок/.test(name)) return 'bag';
      if (cat === 'talisman' || it.troll || it.shame || /амулет|позор|трусик|дуршлаг/.test(name)) return 'talisman';
      if (cat === 'mag' || cat === 'ammo' || /обойм|магазин|патрон|картеч|дроб/.test(name)) return 'mag';
      if (cat === 'melee' || /нож|топор|бит|монтиров|мачете|дубин|клинок|арматур/.test(name)) return 'melee';
      if (cat === 'side' || /пистолет|револьвер|обрез|пм|тт|glock/.test(name)) return 'side';
      if (cat === 'weapon' || cat === 'main' || /автомат|ружь|винтов|дробовик|карабин|ак-|скс|всс|гаусс/.test(name)) return 'main';
      return null;
    },

    canInfectedEquipItem(hero, item) {
      if (!hero || !item) return false;
      if (hero.isKvaz || Number(hero.lvl || 0) >= 20) return true;
      const g = hero.gifts || {};
      const sl = this.detectSlot(item);
      if (sl === 'melee' && g.vaishnavism) return true;
      if ((sl === 'main' || sl === 'side') && g.vaishnavism && Number(g.vaishnavism.lvl || 1) >= 15) return true;
      if (sl === 'armor' && g.gigantism) return true;
      if (sl === 'clothes' && g.hive_child) return true;
      return false;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 4A-2 (ЭКИПИРОВКА, КНИГА И ОСМОТР)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
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
        p._manualBookRead = true;
        p.knowsSpores = p.sporeKnown = p.knowsRecipe = true;
        delete p._autoSporeBug;
        this.consumeInvOne(p, idx);
        const intGain = this.grantActionXp(p, 'int', 0.5);
        this.syncHeroProfile(p);
        this.log('📖 Изучено руководство! Открыт «Споровый баланс», добыча споранов и рецепт «Живчика».');
        this.saveDB();
        if (this.renderGame) this.renderGame();
        this.showGuideLearnedModal(p, name, intGain);
        return;
      }

      if (slot === 'consumable_med') {
        if (p.hp >= p.maxHp) { this.log(`❤️ Здоровье уже полное (${p.hp}/${p.maxHp}).`); return; }
        const healAmt = Number(it.heal || it.hp || 0) || Math.max(25, Math.ceil(p.maxHp * 0.6));
        const before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + healAmt);
        this.consumeInvOne(p, idx);
        this.log(`💊 Использовано [${name}]: ОЗ ${before} → ${p.hp}/${p.maxHp}.`);
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }

      if (slot === 'consumable_other' || it.cat === 'supply' || it.slot === 'use') {
        if (it.pearl) { this.usePearl(p, it.pearl); this.consumeInvOne(p, idx); this.saveDB(); if (this.renderGame) this.renderGame(); return; }
        if (it.hp) p.hp = Math.min(p.maxHp, Math.max(1, p.hp + Number(it.hp)));
        if (it.food) p.food = Math.min(p.maxFood, Math.max(0, p.food + Number(it.food)));
        if (it.water) p.water = Math.min(p.maxWater, Math.max(0, p.water + Number(it.water)));
        if (it.stamina) p.stamina = Math.min(p.maxStamina, Math.max(0, p.stamina + Number(it.stamina)));
        if (it.spore) { p.spore = Math.min(p.maxSpore, p.spore + Number(it.spore)); p._manualBookRead = p.knowsSpores = p.knowsRecipe = true; }
        if (it.stink) p.stinkTurns = Number(it.stink);
        this.consumeInvOne(p, idx);
        this.log(`🎒 Использовано: ${name}`);
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }

      if (slot && Object.prototype.hasOwnProperty.call(p.slots, slot)) {
        if ((p.asInfected || p.isInfected) && !p.isKvaz && (p.lvl || 0) < 20 && ['main', 'side', 'melee', 'armor', 'clothes', 'mod', 'meleeMod'].includes(slot) && !this.canInfectedEquipItem(p, it)) {
          this.log('☣️ Заражённый до 20 уровня не может надевать человеческое оружие и броню!');
          return;
        }
        if (slot === 'mod' && !p.slots.main && !p.slots.side) { this.log('🔧 Сначала наденьте огнестрел.'); return; }
        if (slot === 'meleeMod' && !p.slots.melee) { this.log('🧪 Сначала наденьте холодное оружие.'); return; }
        const old = p.slots[slot];
        if (old && old.noDrop) { this.log('🔒 Слот занят неснимаемым предметом!'); return; }
        const single = JSON.parse(JSON.stringify(it));
        single.q = single.qty = 1;
        this.consumeInvOne(p, idx);
        if (old) p.inv.push(old);
        p.slots[slot] = single;
        p.inv = this.stackInventory(p.inv);
        this.normalizePlayerStats(p);
        this.syncHeroProfile(p);
        this.log(`🛡️ Экипировано: ${name}`);
        this.saveDB();
        if (this.renderGame) this.renderGame();
      }
    },

    unequipSlot(slotKey) {
      const s = this.db && this.db.session;
      const p = s && s.players && s.players[s.activeIdx];
      if (!p || !p.slots || !p.slots[slotKey]) return;
      const it = p.slots[slotKey];
      if (it.noDrop) { this.log('🔒 Невозможно снять!'); return; }
      p.slots[slotKey] = null;
      p.inv.push(it);
      p.inv = this.stackInventory(p.inv);
      this.normalizePlayerStats(p);
      this.syncHeroProfile(p);
      this.saveDB();
      if (this.renderGame) this.renderGame();
    },

    dropItem(idx) {
      const s = this.db && this.db.session;
      const p = s && s.players && s.players[s.activeIdx];
      if (!p || !p.inv || !p.inv[idx]) return;
      const it = p.inv.splice(idx, 1);
      this.normalizePlayerStats(p);
      this.syncHeroProfile(p);
      this.log(`🗑️ Выброшено: ${it.n || it.name}`);
      this.saveDB();
      if (this.renderGame) this.renderGame();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 4B-1 (ЛАВКА, ТАЙНИК И ЧЁРНЫЙ РЫНОК)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    getStashWeight(hr) {
      const st = Array.isArray(hr.stash) ? hr.stash : [];
      let sum = 0;
      st.forEach(it => { sum += (Number(it.w || it.weight || 0)) * (Number(it.q || it.qty || 1)); });
      return Math.round(sum * 10) / 10;
    },

    calcItemPrice(it, hr) {
      const r = Math.max(1, Number(it && (it.rank || it.r || it.lvl || 1)) || 1);
      const base = it && it.basePrice ? Number(it.basePrice) : (r === 1 ? 5 : r * 15);
      return base + (hr && hr.isKvaz ? 2 : 0);
    },

    findHeroByUid(uid) {
      if (!uid || !this.db || !this.db.families) return null;
      for (const fam of Object.keys(this.db.families)) {
        const found = (this.db.families[fam] || []).find(h => h && h.uid === uid);
        if (found) return found;
      }
      return null;
    },

    ensureTraderStock(hr) {
      const curLvl = hr.lvl || 0;
      const isKvaz = Boolean(hr.isKvaz);
      if (Array.isArray(hr.traderStock) && hr.traderStockLvl === curLvl && hr.traderStockKvaz === isKvaz && hr.traderStock.length > 0) {
        return hr.traderStock;
      }
      const pool = [
        { n: 'Обрез 12к', cat: 'side', slot: 'side', rank: 1, a: 7, cal: '12g', w: 2.1 },
        { n: 'Косуха', cat: 'armor', slot: 'armor', rank: 1, d: 5, w: 3.5 },
        { n: 'Походная аптечка', cat: 'med', rank: 1, heal: 35, w: 0.4 },
        { n: 'Вещмешок Сидор (+15кг)', cat: 'bag', slot: 'bag', rank: 1, bag: 15, w: 0.8 },
        { n: 'АК-74 (5.45)', cat: 'weapon', slot: 'main', rank: 2, a: 15, cal: '545', w: 3.6 },
        { n: 'Бронежилет 6Б23-1', cat: 'armor', slot: 'armor', rank: 2, cls: 2, d: 15, w: 7.2 },
        { n: 'Прицел ПСО-1', cat: 'mod', slot: 'mod', rank: 2, a: 3, w: 0.6 },
        { n: 'Яд для клинка', cat: 'meleeMod', slot: 'meleeMod', rank: 2, poison: 4, w: 0.1 },
        { n: 'ВСС Винторез', cat: 'weapon', slot: 'main', rank: 3, a: 32, cal: '762', w: 2.6 },
        { n: '6Б43 Забрало', cat: 'armor', slot: 'armor', rank: 3, cls: 3, d: 30, w: 11.5 }
      ];
      if (Math.random() < (isKvaz ? 0.15 : 0.12)) pool.push({ n: '🔮 Чёрный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'black', rank: 3, basePrice: 1000, w: 0.1 });
      if (Math.random() < (isKvaz ? 0.08 : 0.06)) pool.push({ n: '🔮 Красный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'red', rank: 2, basePrice: 3000, w: 0.1 });
      if (isKvaz) pool.push({ n: '⚪ Белый жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'white', rank: 4, basePrice: 1000000, w: 0.1 });

      hr.traderStock = pool.map(x => Object.assign({ q: 1 }, x));
      hr.traderStockLvl = curLvl;
      hr.traderStockKvaz = isKvaz;
      return hr.traderStock;
    },

    openShop(famOrUid, idx) {
      const hr = (typeof idx === 'number' && this.db.families[famOrUid]) ? this.db.families[famOrUid][idx] : this.findHeroByUid(famOrUid);
      if (!hr) return;
      if ((hr.asInfected || hr.isInfected) && !hr.isKvaz) {
        this.log('☣️ Обычные заражённые не допускаются в Лавку.');
        return;
      }
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
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 4B-1 (ЛАВКА, ТАЙНИК 200 КГ И ЧЁРНЫЙ РЫНОК)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    getStashWeight(hr) {
      let sum = 0;
      (Array.isArray(hr.stash) ? hr.stash : []).forEach(it => {
        sum += (Number(it.w !== undefined ? it.w : (it.weight || 0))) * (Number(it.q || 1));
      });
      return Math.round(sum * 10) / 10;
    },

    calcItemPrice(it, hr) {
      const r = Math.max(1, Number(it && (it.rank || it.r || it.lvl || 1)) || 1);
      const base = it && it.price ? Number(it.price) : (r === 1 ? 5 : (r * 15));
      return base + ((hr && hr.isKvaz) ? 2 : 0);
    },

    findHeroByUid(uid) {
      if (!uid || !this.db || !this.db.families) return null;
      for (const fam of Object.keys(this.db.families)) {
        const found = (this.db.families[fam] || []).find(h => h && h.uid === uid);
        if (found) return found;
      }
      return null;
    },

    ensureTraderStock(hr) {
      const curLvl = hr.lvl || 0;
      if (Array.isArray(hr.traderStock) && hr.traderStockLvl === curLvl && hr.traderStock.length > 0) return hr.traderStock;
      const pool = [
        { n: 'Обрез двустволки', cat: 'side', slot: 'side', rank: 1, a: 7, cal: '12g', w: 2.1 },
        { n: 'Косуха', cat: 'armor', slot: 'armor', rank: 1, cls: 1, d: 5, w: 3.5 },
        { n: 'Горка-3', cat: 'clothes', slot: 'clothes', rank: 1, d: 2, w: 1.8 },
        { n: 'Походная аптечка', cat: 'med', rank: 1, heal: 35, w: 0.4 },
        { n: 'Чекушка водки (алкоголь)', cat: 'supply', slot: 'use', rank: 1, alcohol: true, spi: 3, w: 0.35 },
        { n: 'Тактический рюкзак (+15 кг)', cat: 'bag', slot: 'bag', rank: 2, bag: 15, w: 1.1 },
        { n: 'Автомат АК-74', cat: 'weapon', slot: 'main', rank: 2, a: 15, cal: '545', w: 3.6 },
        { n: 'Бронежилет 6Б23-1 (2 кл.)', cat: 'armor', slot: 'armor', rank: 2, cls: 2, d: 15, w: 7.2 },
        { n: 'Оптический прицел ПСО-1', cat: 'mod', slot: 'mod', rank: 2, a: 3, w: 0.6 },
        { n: 'Яд для клинка «Гюрза»', cat: 'meleeMod', slot: 'meleeMod', rank: 2, poison: 4, w: 0.2 },
        { n: 'ВСС Винторез', cat: 'weapon', slot: 'main', rank: 3, a: 32, cal: '762', w: 2.6 },
        { n: 'Бронежилет 6Б43 (3 кл.)', cat: 'armor', slot: 'armor', rank: 3, cls: 3, d: 30, w: 11.5 }
      ];
      if (Math.random() < (hr.isKvaz ? 0.15 : 0.08)) {
        pool.push({ n: 'Чёрный жемчуг Улья', cat: 'supply', slot: 'use', rank: 3, pearl: 'black', price: 1000, w: 0.1 });
      }
      if (Math.random() < (hr.isKvaz ? 0.08 : 0.04)) {
        pool.push({ n: 'Красный жемчуг Улья', cat: 'supply', slot: 'use', rank: 2, pearl: 'red', price: 3000, w: 0.1 });
      }
      if (hr.isKvaz) {
        pool.push({ n: 'Белый жемчуг Улья', cat: 'supply', slot: 'use', rank: 4, pearl: 'white', price: 1000000, w: 0.1 });
      }
      hr.traderStock = pool.sort(() => Math.random() - 0.5).slice(0, 10).map(x => Object.assign({ q: 1 }, x));
      hr.traderStockLvl = curLvl;
      return hr.traderStock;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 4B-3 (ОТРИСОВКА ОКНА ЛАВКИ И ТАЙНИКА)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  STIKS.renderShopModal = function() {
    const hr = this.findHeroByUid(this.shopHeroUid);
    if (!hr) return;
    const old = document.getElementById('stiks-shop-modal');
    if (old) old.remove();

    this._cleanSporans(hr);
    const stock = this.ensureTraderStock(hr);
    const stW = this.getStashWeight(hr);
    const sel = this.shopBarterSel || [];
    const title = hr.isKvaz ? '🏴‍☠️ ЧЁРНЫЙ РЫНОК (НАЦЕНКА КВАЗА +2 🧬)' : '🏪 ЛАВКА УЛЬЯ';

    const ov = document.createElement('div');
    ov.id = 'stiks-shop-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,6,0.92);z-index:9500;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;font-family:monospace;color:#d6e5db;';

    let h = '<div style="width:100%;max-width:440px;max-height:92dvh;overflow-y:auto;border:1px solid #6e2626;background:#111613;padding:12px;border-radius:6px;font-size:11px;">';
    h += `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #5c2828;padding-bottom:6px;margin-bottom:8px;"><b style="color:#ff9e9e;font-size:13px;">${title}: ${hr.name} (Ур.${hr.lvl || 0})</b><button class="btn btn-danger" style="width:auto !important;padding:4px 8px;font-size:11px;" onclick="STIKS.closeShop()">✖ Выйти</button></div>`;
    h += `<div style="background:#1c1212;border:1px solid #5c2828;padding:6px;margin-bottom:8px;display:flex;justify-content:space-between;"><span>🧬 Спораны: <b>${hr.spores}</b> (0 кг)</span><span>📦 Тайник: <b>${stW} / 200 кг</b></span></div>`;
    h += '<div style="color:#e6c86e;font-weight:bold;margin-bottom:4px;">🛒 ТОРГОВЕЦ (обновление раз в уровень | бартер 2→1):</div>';

    stock.forEach((it, idx) => {
      const price = this.calcItemPrice(it, hr);
      h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #253029;gap:4px;"><span>${it.n} [P${it.rank || 1}]</span><div style="display:flex;gap:3px;"><button class="btn btn-primary" style="width:auto !important;padding:2px 6px;font-size:10px;" onclick="STIKS.buyTraderItem(${idx})">${price} 🧬</button><button class="btn" style="width:auto !important;padding:2px 6px;font-size:10px;" onclick="STIKS.execBarter(${idx})">🔄 Бартер</button></div></div>`;
    });

    h += `<div style="color:#7fa88b;font-weight:bold;margin:8px 0 4px 0;">🎒 РЮКЗАК (выбрано для бартера: ${sel.length}/2):</div>`;
    (hr.inv || []).forEach((it, idx) => {
      const sellP = Math.max(1, Math.floor(this.calcItemPrice(it, hr) * 0.5));
      const isSel = sel.includes(idx);
      const qStr = (it.q || 1) > 1 ? ` x${it.q}` : '';
      h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1f2923;gap:4px;"><span>${it.n || it.name}${qStr} [P${it.rank || 1}]</span><div style="display:flex;gap:3px;"><button class="btn ${isSel ? 'btn-primary' : ''}" style="width:auto !important;padding:2px 5px;font-size:10px;" onclick="STIKS.toggleBarter(${idx})">☑</button><button class="btn" style="width:auto !important;padding:2px 5px;font-size:10px;" onclick="STIKS.sellToTrader(${idx})">+${sellP}🧬</button><button class="btn" style="width:auto !important;padding:2px 5px;font-size:10px;" onclick="STIKS.moveToStash(${idx})">📥 В тайник</button></div></div>`;
    });

    h += `<div style="color:#7fa88b;font-weight:bold;margin:8px 0 4px 0;">📦 ЛИЧНЫЙ ТАЙНИК (${stW} / 200 кг):</div>`;
    (hr.stash || []).forEach((it, idx) => {
      const qStr = (it.q || 1) > 1 ? ` x${it.q}` : '';
      h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1f2923;gap:4px;"><span>${it.n || it.name}${qStr}</span><button class="btn btn-primary" style="width:auto !important;padding:2px 6px;font-size:10px;" onclick="STIKS.moveFromStash(${idx})">📤 Взять</button></div>`;
    });

    h += '</div>';
    ov.innerHTML = h;
    document.body.appendChild(ov);
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 5A-1 (ПОСЕЛЕНИЕ: ПАНОРАМА, 6 ЗДАНИЙ И РАСЧЁТ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;
  STIKS.settlement = STIKS.settlement || {};

  STIKS.settlement.BUILDINGS = {
    hotel:   { id: 'hotel',   title: '🏨 Гостиница',  cost: 2,  gain: 0, sfx: 'snore',   desc: 'Сон и восстановление ОЗ/бодрости (-2 сп.)' },
    grocery: { id: 'grocery', title: '🥖 Продлавка',  cost: 1,  gain: 0, sfx: 'chomp',   desc: 'Перекус в дорогу: +сытость и жажда (-1 сп.)' },
    canteen: { id: 'canteen', title: '🍲 Столовая',   cost: 2,  gain: 0, sfx: 'chomp',   desc: 'Плотный обед: +1 Вын и полная сытость (-2 сп.)' },
    sawmill: { id: 'sawmill', title: '🪚 Лесопилка',  cost: 0,  gain: 2, sfx: 'saw',     desc: 'Смена на пилораме: +2 сп. и +1 Сила' },
    smithy:  { id: 'smithy',  title: '⚒️ Кузница',    cost: 0,  gain: 2, sfx: 'anvil',   desc: 'Работа у горна: +2 сп. и +1 Выносливость' },
    mine:    { id: 'mine',    title: '⛏️ Шахта',      cost: 0,  gain: 2, sfx: 'pickaxe', desc: 'Добыча руды: +2 сп., +1 Сила и шанс самородка' }
  };

  STIKS.settlement.renderPanoramaSVG = function(hr) {
    const kvazAdd = (hr && hr.isKvaz) ? 2 : 0;
    const b = this.BUILDINGS;
    return '<svg viewBox="0 0 360 120" width="100%" style="background:#0b0d0c;border:1px solid #6e2626;border-radius:6px;display:block;">' +
      '<rect width="360" height="120" fill="#111613"/><line x1="0" y1="104" x2="360" y2="104" stroke="#6e2626" stroke-width="1.5"/>' +
      '<g style="cursor:pointer" onclick="STIKS.settlement.runBuildingTask(\'hotel\')"><rect x="8" y="28" width="50" height="76" fill="#1b2430" stroke="#38bdf8"/><text x="33" y="58" text-anchor="middle" fill="#fff" font-size="14">🏨</text><text x="33" y="74" text-anchor="middle" fill="#bae6fd" font-size="7.5" font-family="monospace">Отель</text><text x="33" y="86" text-anchor="middle" fill="#f87171" font-size="7.5" font-family="monospace">-' + (b.hotel.cost + kvazAdd) + '💎</text></g>' +
      '<g style="cursor:pointer" onclick="STIKS.settlement.runBuildingTask(\'grocery\')"><rect x="66" y="42" width="50" height="62" fill="#1e2920" stroke="#4ade80"/><text x="91" y="66" text-anchor="middle" fill="#fff" font-size="14">🥖</text><text x="91" y="79" text-anchor="middle" fill="#bbf7d0" font-size="7.5" font-family="monospace">Лавка</text><text x="91" y="90" text-anchor="middle" fill="#f87171" font-size="7.5" font-family="monospace">-' + (b.grocery.cost + kvazAdd) + '💎</text></g>' +
      '<g style="cursor:pointer" onclick="STIKS.settlement.runBuildingTask(\'canteen\')"><rect x="124" y="36" width="50" height="68" fill="#291e16" stroke="#fb923c"/><text x="149" y="62" text-anchor="middle" fill="#fff" font-size="14">🍲</text><text x="149" y="76" text-anchor="middle" fill="#fed7aa" font-size="7.5" font-family="monospace">Столовая</text><text x="149" y="88" text-anchor="middle" fill="#f87171" font-size="7.5" font-family="monospace">-' + (b.canteen.cost + kvazAdd) + '💎</text></g>' +
      '<g style="cursor:pointer" onclick="STIKS.settlement.runBuildingTask(\'sawmill\')"><rect x="182" y="40" width="52" height="64" fill="#241c14" stroke="#eab308"/><text x="208" y="64" text-anchor="middle" fill="#fff" font-size="14">🪚</text><text x="208" y="77" text-anchor="middle" fill="#fef08a" font-size="7.5" font-family="monospace">Лесопилка</text><text x="208" y="89" text-anchor="middle" fill="#4ade80" font-size="7.5" font-family="monospace">+2💎</text></g>' +
      '<g style="cursor:pointer" onclick="STIKS.settlement.runBuildingTask(\'smithy\')"><rect x="242" y="34" width="52" height="70" fill="#291414" stroke="#f43f5e"/><text x="268" y="60" text-anchor="middle" fill="#fff" font-size="14">⚒️</text><text x="268" y="74" text-anchor="middle" fill="#fecdd3" font-size="7.5" font-family="monospace">Кузница</text><text x="268" y="86" text-anchor="middle" fill="#4ade80" font-size="7.5" font-family="monospace">+2💎</text></g>' +
      '<g style="cursor:pointer" onclick="STIKS.settlement.runBuildingTask(\'mine\')"><polygon points="302,104 328,36 354,104" fill="#1c1924" stroke="#a855f7"/><text x="328" y="68" text-anchor="middle" fill="#fff" font-size="14">⛏️</text><text x="328" y="82" text-anchor="middle" fill="#e9d5ff" font-size="7.5" font-family="monospace">Шахта</text><text x="328" y="94" text-anchor="middle" fill="#4ade80" font-size="7.5" font-family="monospace">+2💎</text></g>' +
      '</svg>';
  };

  STIKS.settlement.runBuildingTask = function(bId) {
    const hr = STIKS.findHeroByUid(STIKS._settlementActiveUid);
    const b = this.BUILDINGS[bId];
    if (!hr || !b) return;
    STIKS.bindHeroCompat(hr);
    const kvazAdd = hr.isKvaz ? 2 : 0;
    const realCost = b.cost > 0 ? (b.cost + kvazAdd) : 0;
    if (realCost > 0 && STIKS._cleanSporans(hr) < realCost) {
      STIKS.renderSettlementModal(`⚠️ Недостаточно споранов для «${b.title}» (нужно ${realCost} 💎).`);
      return;
    }
    if (typeof STIKS.playWorkSound === 'function') STIKS.playWorkSound(b.sfx);
    this.showClaimCard(hr, b, realCost);
  };

  STIKS.settlement.showClaimCard = function(hr, b, realCost) {
    const old = document.getElementById('stiks-claim-card');
    if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'stiks-claim-card';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9750;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#e6f5eb;';
    const summary = realCost > 0
      ? `Оплата услуг: <b>-${realCost} 💎</b> | ${b.desc}`
      : `Заработок за смену: <b>+${b.gain} 💎</b> | ${b.desc}`;
    ov.innerHTML = '<div style="width:100%;max-width:370px;background:#141a17;border:2px solid #4ade80;border-radius:8px;padding:14px;text-align:center;">' +
      '<div style="font-size:15px;font-weight:bold;color:#86efac;margin-bottom:8px;">' + b.title + ' — ЗАВЕРШЕНО</div>' +
      '<div style="font-size:11.5px;line-height:1.45;margin-bottom:12px;">' + summary + '</div>' +
      '<button id="btn-claim-confirm" class="btn btn-primary" style="width:100%;padding:8px;font-weight:bold;">✅ Забрать награду и рассчитаться</button></div>';
    document.body.appendChild(ov);
    document.getElementById('btn-claim-confirm').onclick = function() {
      ov.remove();
      if (realCost > 0) hr.spores = hr.sporans = Math.max(0, STIKS._cleanSporans(hr) - realCost);
      if (b.gain > 0) hr.spores = hr.sporans = STIKS._cleanSporans(hr) + b.gain;
      if (b.id === 'hotel') { hr.hp = hr.maxHp; hr.stamina = hr.maxStamina; }
      else if (b.id === 'grocery') { hr.food = hr.maxFood; hr.water = hr.maxWater; }
      else if (b.id === 'canteen') { hr.food = hr.maxFood; hr.water = hr.maxWater; hr.stats.end = STIKS._round100((hr.stats.end || 10) + 1); }
      else if (b.id === 'sawmill') { hr.stats.str = STIKS._round100((hr.stats.str || 10) + 1); }
      else if (b.id === 'smithy') { hr.stats.end = STIKS._round100((hr.stats.end || 10) + 1); }
      else if (b.id === 'mine') { hr.stats.str = STIKS._round100((hr.stats.str || 10) + 1); }
      STIKS.recalcLevel(hr); STIKS.normalizePlayerStats(hr); STIKS.saveDB();
      STIKS.log(`🏘️ ${hr.name}: расчёт в «${b.title}» выполнен.`);
      STIKS.renderSettlementModal(`✅ Расчёт в «${b.title}» завершён!`);
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 5A-2 (5 ЗАВЕДЕНИЙ, ОБРЯД ЗНАХАРЯ И СПАРРИНГ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;
  const PLACE_IDS = ['shaman', 'library', 'range', 'gym', 'bar'];

  function calcPlacePrice(count) {
    let price = 1;
    const n = Math.max(0, Math.floor(Number(count) || 0));
    for (let i = 0; i < n; i++) price = Math.ceil(price * 1.3);
    return price;
  }

  Object.assign(STIKS.settlement, {
    PLACES: {
      shaman:  { id: 'shaman',  ico: '🔮', title: 'Знахарь',     desc: '+Цена к Духу и +1 ур. к случайному Дару' },
      library: { id: 'library', ico: '📚', title: 'Библиотека',  desc: '+Цена к Интеллекту и новая запись в Архив' },
      range:   { id: 'range',   ico: '🎯', title: 'Полигон',     desc: '+Цена/2 к Ловкости и +Цена/2 к Скорости' },
      gym:     { id: 'gym',     ico: '🏋️', title: 'Тренажёрка',  desc: '+Цена к Силе' },
      bar:     { id: 'bar',     ico: '🍺', title: 'Бар',         desc: '+Цена к Выносливости (риск пьяного дебоша!)' }
    },

    ensureState(hero) {
      if (!hero) return null;
      STIKS.bindHeroCompat(hero);
      const curLv = Number(hero.lvl || 0);
      const prev = hero.settlementState || {};
      const visited = (prev.level === curLv && prev.visited) ? prev.visited : {};
      const counts = Object.assign({ shaman: 0, library: 0, range: 0, gym: 0, bar: 0 }, prev.counts || {});
      hero.settlementState = {
        level: curLv,
        visited,
        counts,
        healerRitualUsed: (prev.level === curLv) ? Boolean(prev.healerRitualUsed) : false
      };
      hero.settlementFine = Number(hero.settlementFine || 0);
      return hero.settlementState;
    },

    getPlaceCost(hero, placeId) {
      const st = this.ensureState(hero);
      return st ? calcPlacePrice(st.counts[placeId]) : 1;
    },

    payFine(hero) {
      if (!hero) return { ok: false, msg: 'Боец не выбран.' };
      const fine = Number(hero.settlementFine || 0);
      if (fine <= 0) return { ok: true, msg: 'Штрафов нет.' };
      if (STIKS._cleanSporans(hero) < fine) return { ok: false, msg: `Не хватает споранов (нужно ${fine} 💎).` };
      hero.spores = hero.sporans = hero.spores - fine;
      hero.settlementFine = 0;
      STIKS.saveDB();
      return { ok: true, msg: `✅ Штраф ${fine} 💎 погашен! Доступ к заведениям открыт.` };
    },

    visit(hero, placeId) {
      const st = this.ensureState(hero);
      if (Number(hero.settlementFine || 0) > 0) return { ok: false, msg: `Вход закрыт охраной! Штраф: ${hero.settlementFine} 💎.` };
      const place = this.PLACES[placeId];
      if (!place) return { ok: false, msg: 'Неизвестное заведение.' };
      if (st.visited[placeId]) return { ok: false, msg: `Вы уже посещали «${place.title}» на уровне ${st.level}.` };

      const cost = this.getPlaceCost(hero, placeId);
      if (STIKS._cleanSporans(hero) < cost) return { ok: false, msg: `Недостаточно споранов (нужно ${cost} 💎).` };

      hero.spores = hero.sporans = hero.spores - cost;
      st.visited[placeId] = true;
      st.counts[placeId] = Number(st.counts[placeId] || 0) + 1;

      let report = '';
      if (placeId === 'shaman') {
        hero.stats.spi = STIKS._round100((hero.stats.spi || 10) + cost);
        report = `🔮 Знахарь окурил травами Улья: Дух +${cost}.`;
        const gKeys = Object.keys(hero.gifts || {});
        if (gKeys.length) {
          const pick = gKeys[Math.floor(Math.random() * gKeys.length)];
          const nl = Number(hero.gifts[pick].lvl || 1) + 1;
          hero.gifts[pick].lvl = hero.gifts[pick].level = nl;
          report += ` Дар «${(STIKS.DARS[pick] && STIKS.DARS[pick].name) || pick}» повышен до Ур.${nl}!`;
        }
      } else if (placeId === 'library') {
        hero.stats.int = STIKS._round100((hero.stats.int || 10) + cost);
        report = `📚 Изучены архивы рейдеров: Интеллект +${cost}.`;
        if (typeof STIKS.unlockNextArchiveEntry === 'function') {
          const arc = STIKS.unlockNextArchiveEntry();
          if (arc) report += ` Открыта запись Архива #${arc}!`;
        }
      } else if (placeId === 'range') {
        const half = Math.floor(cost / 2), rem = cost - half;
        hero.stats.agi = STIKS._round100((hero.stats.agi || 10) + half);
        hero.stats.spd = STIKS._round100((hero.stats.spd || 10) + rem);
        report = `🎯 Полоса препятствий пройдена: Ловкость +${half}, Скорость +${rem}.`;
      } else if (placeId === 'gym') {
        hero.stats.str = STIKS._round100((hero.stats.str || 10) + cost);
        report = `🏋️ Тренировка с железом: Сила +${cost}.`;
      } else if (placeId === 'bar') {
        if (Math.random() < 0.25) {
          ['str', 'agi', 'spd', 'end'].forEach(k => { hero.stats[k] = STIKS._round100((hero.stats[k] || 10) + cost); });
          hero.settlementFine = cost * 5;
          report = `🍺 ПЬЯНЫЙ ДЕБОШ! Разнесли бар: Сил/Ловк/Скор/Вын +${cost}! Штраф охраны: ${hero.settlementFine} 💎.`;
        } else {
          hero.stats.end = STIKS._round100((hero.stats.end || 10) + cost);
          report = `🍺 Кружка крепкого в Баре: Выносливость +${cost}.`;
        }
      }
      STIKS.recalcLevel(hero); STIKS.normalizePlayerStats(hero); STIKS.saveDB();
      return { ok: true, report: report + ` Следующий вход сюда: ${this.getPlaceCost(hero, placeId)} 💎.` };
    },

    useHealerRitual(hero) {
      const st = this.ensureState(hero);
      if (st.healerRitualUsed) return { ok: false, msg: `Обряд Знахаря уже проведён на уровне ${st.level}.` };
      st.healerRitualUsed = true;
      ['food', 'water', 'stamina', 'spore', 'mana'].forEach(k => {
        const maxK = 'max' + k.charAt(0).toUpperCase() + k.slice(1);
        if (hero[maxK]) hero[k] = Math.min(hero[maxK], Math.round((hero[k] || 0) + hero[maxK] * 0.5));
      });
      STIKS.saveDB();
      return { ok: true, msg: '🌿 Обряд Знахаря завершён: все шкалы жизнеобеспечения восполнены на +50%!' };
    },

    runTrainingDuel(heroA, heroB) {
      if (!heroA || !heroB || heroA.uid === heroB.uid) return { ok: false, msg: 'Выберите другого бойца для спарринга.' };
      if (heroA.family === heroB.family) return { ok: false, msg: 'Бойцы одной фамилии не спаррингуют друг с другом.' };
      const feeA = heroA.isKvaz ? 4 : 2, feeB = heroB.isKvaz ? 4 : 2;
      if (STIKS._cleanSporans(heroA) < feeA || STIKS._cleanSporans(heroB) < feeB) {
        return { ok: false, msg: `Нужно ${feeA} 💎 и ${feeB} 💎 на услуги лекаря после спарринга.` };
      }
      heroA.spores = heroA.sporans = heroA.spores - feeA;
      heroB.spores = heroB.sporans = heroB.spores - feeB;
      const powA = (heroA.stats.str || 10) + (heroA.stats.agi || 10) + Math.random() * 10;
      const powB = (heroB.stats.str || 10) + (heroB.stats.agi || 10) + Math.random() * 10;
      const win = powA >= powB ? heroA : heroB;
      const lose = win.uid === heroA.uid ? heroB : heroA;
      const stats = ['str', 'agi', 'spd', 'end', 'int', 'spi'];
      const wSk = stats[Math.floor(Math.random() * stats.length)];
      const lSk = stats[Math.floor(Math.random() * stats.length)];
      win.stats[wSk] = STIKS._round100((win.stats[wSk] || 10) + 2);
      lose.stats[lSk] = STIKS._round100((lose.stats[lSk] || 10) + 1);
      STIKS.recalcLevel(win); STIKS.recalcLevel(lose);
      STIKS.normalizePlayerStats(win); STIKS.normalizePlayerStats(lose);
      STIKS.saveDB();
      return { ok: true, msg: `🥊 Спарринг завершён! Победитель: <b>${win.name}</b> (+2 к стату), <b>${lose.name}</b> (+1 к стату). Лекарь залечил ссадины.` };
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 5B (ИНТЕРФЕЙС ОКНА ПОСЕЛЕНИЯ УЛЬЯ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  function getReadyHeroes() {
    const out = [];
    if (!STIKS.db || !STIKS.db.families) return out;
    Object.keys(STIKS.db.families).forEach(fam => {
      (STIKS.db.families[fam] || []).forEach((hr, idx) => {
        if (hr && hr.status !== 'dead') {
          hr.family = hr.family || fam;
          if (!hr.uid) hr.uid = 'hero_' + fam + '_' + idx;
          STIKS.bindHeroCompat(hr);
          out.push(hr);
        }
      });
    });
    return out;
  }

  Object.assign(STIKS, {
    openSettlement(famOrUid, idx) {
      const heroes = getReadyHeroes();
      if (!heroes.length) { this.log('❌ Нет доступных выживших для входа в Поселение.'); return; }
      let sel = (typeof idx === 'number' && this.db.families[famOrUid]) ? this.db.families[famOrUid][idx] : heroes.find(h => String(h.uid) === String(famOrUid));
      if (!sel) sel = heroes.find(h => h.family === this.activeFamily) || heroes[0];
      this._settlementActiveUid = sel.uid;
      this.renderSettlementModal();
    },

    closeSettlement() {
      const el = document.getElementById('stiks-settlement-modal');
      if (el) el.remove();
      this._settlementActiveUid = null;
      if (this.renderLobby) this.renderLobby();
    },

    settlementAction(act, arg) {
      const heroes = getReadyHeroes();
      const hr = heroes.find(h => String(h.uid) === String(this._settlementActiveUid)) || heroes[0];
      if (!hr) return;
      let msg = '';
      if (act === 'payFine') msg = this.settlement.payFine(hr).msg;
      else if (act === 'ritual') msg = this.settlement.useHealerRitual(hr).msg;
      else if (act === 'visit') {
        const r = this.settlement.visit(hr, arg);
        msg = r.ok ? r.report : ('⚠️ ' + r.msg);
      } else if (act === 'duel') {
        const selEl = document.getElementById('stiks-sett-duel-opp');
        const opp = heroes.find(x => String(x.uid) === String(selEl && selEl.value));
        const r = this.settlement.runTrainingDuel(hr, opp);
        msg = r.ok ? r.msg : ('⚠️ ' + r.msg);
      }
      if (msg) this.log(msg.replace(/<[^>]+>/g, ''));
      this.renderSettlementModal(msg);
    },

    renderSettlementModal(lastMsg) {
      const heroes = getReadyHeroes();
      if (!heroes.length) return;
      const hr = heroes.find(h => String(h.uid) === String(this._settlementActiveUid)) || heroes[0];
      this._settlementActiveUid = hr.uid;
      const old = document.getElementById('stiks-settlement-modal');
      if (old) old.remove();

      const st = this.settlement.ensureState(hr);
      const fine = Number(hr.settlementFine || 0);
      const ov = document.createElement('div');
      ov.id = 'stiks-settlement-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,6,0.94);z-index:9550;display:flex;align-items:center;justify-content:center;padding:10px;font-family:monospace;color:#d6e5db;';

      let h = '<div style="width:100%;max-width:450px;max-height:92dvh;overflow-y:auto;border:1px solid #6e2626;background:#111613;padding:12px;border-radius:6px;font-size:11px;">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #5c2828;padding-bottom:6px;margin-bottom:8px;"><b style="color:#ff9e9e;font-size:13px;">🏘️ ПОСЕЛЕНИЕ УЛЬЯ</b><button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="STIKS.closeSettlement()">✖ Выйти</button></div>';
      h += '<div style="margin-bottom:8px;">' + this.settlement.renderPanoramaSVG(hr) + '</div>';
      h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;"><span>Боец:</span><select style="flex:1;background:#0b0d0c;color:#e6f5eb;border:1px solid #6e2626;padding:5px;" onchange="STIKS._settlementActiveUid=this.value;STIKS.renderSettlementModal()">';
      heroes.forEach(item => { h += `<option value="${item.uid}" ${String(item.uid) === String(hr.uid) ? 'selected' : ''}>${item.family} ${item.name} (Ур.${item.lvl || 0} | 💎${item.spores || 0})</option>`; });
      h += '</select></div>';
      h += `<div style="background:#1c1212;border:1px solid #5c2828;padding:6px 8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><span>💎 Спораны: <b>${hr.spores || 0}</b></span><button class="btn" ${st.healerRitualUsed ? 'disabled' : ''} style="width:auto;padding:3px 7px;font-size:10px;border-color:#4ade80;color:#86efac;" onclick="STIKS.settlementAction('ritual')">${st.healerRitualUsed ? '✓ Обряд проведён' : '🌿 Обряд Знахаря (+50%)'}</button></div>`;
      if (lastMsg) h += `<div style="background:#132419;border:1px solid #4a7a5c;color:#b8f0ca;padding:7px;margin-bottom:8px;border-radius:4px;">${lastMsg}</div>`;
      if (fine > 0) h += `<div style="background:#2b1111;border:1px solid #b83232;padding:8px;margin-bottom:8px;"><div style="color:#ff8a8a;margin-bottom:5px;">🚨 Штраф за дебош: ${fine} 💎</div><button class="btn btn-primary" style="width:100%;" onclick="STIKS.settlementAction('payFine')">💰 Оплатить штраф</button></div>`;

      Object.keys(this.settlement.PLACES).forEach(pk => {
        const pl = this.settlement.PLACES[pk], visited = Boolean(st.visited && st.visited[pk]), pCost = this.settlement.getPlaceCost(hr, pk);
        h += `<div style="display:flex;justify-content:space-between;align-items:center;background:#0d110f;border:1px solid #2b3830;padding:6px;margin-bottom:5px;border-radius:4px;gap:6px;"><div><b>${pl.ico} ${pl.title}</b><div style="color:#9aa89e;font-size:10px;">${pl.desc}</div></div><button class="btn ${visited ? '' : 'btn-primary'}" ${(visited || fine > 0) ? 'disabled' : ''} style="width:auto;padding:5px 8px;font-size:10px;" onclick="STIKS.settlementAction('visit','${pk}')">${visited ? `✓ (след. ${pCost}💎)` : `Зайти (${pCost}💎)`}</button></div>`;
      });

      const others = heroes.filter(x => String(x.uid) !== String(hr.uid) && x.family !== hr.family);
      if (others.length) {
        h += '<div style="color:#7fa88b;font-weight:bold;margin:8px 0 5px 0;">🥊 СПАРРИНГ (лекарь 2 💎 / 4 💎 Кваз):</div><div style="display:flex;gap:5px;"><select id="stiks-sett-duel-opp" style="flex:1;background:#0b0d0c;color:#d6e5db;border:1px solid #3d4f44;padding:5px;">';
        others.forEach(op => { h += `<option value="${op.uid}">${op.family} ${op.name} (Ур.${op.lvl || 0})</option>`; });
        h += '</select><button class="btn" style="width:auto;padding:5px 8px;border-color:#8f2d2d;color:#ff9e9e;" onclick="STIKS.settlementAction(\'duel\')">⚔️ Бой</button></div>';
      }
      ov.innerHTML = h + '</div>';
      document.body.appendChild(ov);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 6A-1 (АУДИО-ДВИЖОК BSIM_AUDIO)
// ============================================================================
(function(global) {
  'use strict';

  global.BSIM_AUDIO = {
    ctx: null,
    bgmOn: false,
    bgmTimer: null,
    stepIdx: 0,
    trackIdx: 0,

    TRACKS: [
      { name: 'Пас-дам-бас', ms: 195, notes: [{ f: 110, d: 0.16, t: 'triangle', v: 0.045 }, { f: 130.8, d: 0.16, t: 'triangle', v: 0.045 }, { f: 98, d: 0.24, t: 'triangle', v: 0.055 }, { f: 0, d: 0.1, t: 'sine', v: 0 }, { f: 146.8, d: 0.14, t: 'triangle', v: 0.045 }, { f: 164.8, d: 0.14, t: 'triangle', v: 0.045 }, { f: 130.8, d: 0.22, t: 'triangle', v: 0.055 }, { f: 0, d: 0.1, t: 'sine', v: 0 }] },
      { name: 'Пульс Улья', ms: 215, notes: [{ f: 82.4, d: 0.18, t: 'sawtooth', v: 0.03 }, { f: 82.4, d: 0.12, t: 'sawtooth', v: 0.025 }, { f: 98, d: 0.18, t: 'sawtooth', v: 0.032 }, { f: 110, d: 0.22, t: 'triangle', v: 0.045 }, { f: 0, d: 0.1, t: 'sine', v: 0 }] },
      { name: 'Carry On Wayward Son', ms: 185, notes: [{ f: 220, d: 0.15, t: 'triangle', v: 0.046 }, { f: 196, d: 0.15, t: 'triangle', v: 0.046 }, { f: 220, d: 0.2, t: 'triangle', v: 0.05 }, { f: 164.8, d: 0.18, t: 'triangle', v: 0.046 }, { f: 146.8, d: 0.24, t: 'triangle', v: 0.052 }, { f: 0, d: 0.1, t: 'sine', v: 0 }] },
      { name: 'Калинка-Малинка', ms: 155, notes: [{ f: 246.9, d: 0.22, t: 'triangle', v: 0.05 }, { f: 220, d: 0.15, t: 'triangle', v: 0.046 }, { f: 185, d: 0.12, t: 'triangle', v: 0.044 }, { f: 196, d: 0.12, t: 'triangle', v: 0.044 }, { f: 220, d: 0.18, t: 'triangle', v: 0.048 }, { f: 0, d: 0.1, t: 'sine', v: 0 }] },
      { name: 'Группа крови (Кино)', ms: 205, notes: [{ f: 220, d: 0.2, t: 'triangle', v: 0.048 }, { f: 220, d: 0.15, t: 'triangle', v: 0.046 }, { f: 246.9, d: 0.15, t: 'triangle', v: 0.046 }, { f: 261.6, d: 0.24, t: 'triangle', v: 0.05 }, { f: 196, d: 0.24, t: 'triangle', v: 0.05 }, { f: 164.8, d: 0.26, t: 'triangle', v: 0.052 }, { f: 0, d: 0.14, t: 'sine', v: 0 }] },
      { name: 'Имперский марш', ms: 230, notes: [{ f: 196, d: 0.24, t: 'sawtooth', v: 0.034 }, { f: 196, d: 0.24, t: 'sawtooth', v: 0.034 }, { f: 155.6, d: 0.18, t: 'sawtooth', v: 0.034 }, { f: 233.1, d: 0.1, t: 'sawtooth', v: 0.034 }, { f: 196, d: 0.28, t: 'sawtooth', v: 0.036 }, { f: 0, d: 0.16, t: 'sine', v: 0 }] }
    ],

    ensureCtx() {
      if (!this.ctx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    },

    nextTrack() {
      this.trackIdx = (this.trackIdx + 1) % this.TRACKS.length;
      this.stepIdx = 0;
      if (this.bgmOn) this.startLoop();
      const btn = document.getElementById('btn-bsim-bgm');
      if (btn) btn.textContent = '🎵 ' + (this.trackIdx + 1) + '/' + this.TRACKS.length + ': ' + (this.bgmOn ? 'ВКЛ' : 'ВЫКЛ');
    },

    toggleBgm() {
      this.bgmOn = !this.bgmOn;
      const btn = document.getElementById('btn-bsim-bgm');
      if (btn) btn.textContent = '🎵 ' + (this.trackIdx + 1) + '/' + this.TRACKS.length + ': ' + (this.bgmOn ? 'ВКЛ' : 'ВЫКЛ');
      if (this.bgmOn) { this.ensureCtx(); this.stepIdx = 0; this.startLoop(); }
      else if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
    },

    startLoop() {
      if (this.bgmTimer) clearInterval(this.bgmTimer);
      const tr = this.TRACKS[this.trackIdx] || this.TRACKS;
      this.bgmTimer = setInterval(() => {
        if (!this.bgmOn) return;
        const c = this.ensureCtx();
        if (!c) return;
        const curTr = this.TRACKS[this.trackIdx] || this.TRACKS;
        const note = curTr.notes[this.stepIdx % curTr.notes.length];
        this.stepIdx++;
        if (note && note.f > 0) {
          const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
          o.type = note.t; o.frequency.setValueAtTime(note.f, now);
          g.gain.setValueAtTime(note.v, now); g.gain.exponentialRampToValueAtTime(0.001, now + note.d);
          o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + note.d + 0.01);
        }
      }, tr.ms || 190);
    },

    playSfx(kind) {
      const c = this.ensureCtx();
      if (!c) return;
      const now = c.currentTime;
      if (kind === 'gun') {
        const buf = c.createBuffer(1, c.sampleRate * 0.16, c.sampleRate), data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.04));
        const src = c.createBufferSource(); src.buffer = buf;
        const g = c.createGain(); g.gain.setValueAtTime(0.18, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        src.connect(g); g.connect(c.destination); src.start(now);
      } else if (kind === 'card') {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(950, now); o.frequency.exponentialRampToValueAtTime(420, now + 0.06);
        g.gain.setValueAtTime(0.09, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + 0.075);
      } else {
        const o = c.createOscillator(), g = c.createGain();
        o.type = kind === 'shout' || kind === 'dar' ? 'triangle' : 'sawtooth';
        o.frequency.setValueAtTime(kind === 'shout' ? 440 : 280, now);
        o.frequency.exponentialRampToValueAtTime(kind === 'shout' ? 660 : 75, now + 0.15);
        g.gain.setValueAtTime(0.14, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + 0.17);
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 6A-2 (БОЕВОЕ ЯДРО STIKS_COMBAT_CORE)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  global.BSIM_DATA = {
    Z_RANKS: [
      { r: 0, name: 'Ползун',     minLvl: 0,  maxLvl: 0,  hp: 10,   agi: 10,   dmg: 2,   sound: 'Царап!', sfx: 'bite' },
      { r: 1, name: 'Медляк',     minLvl: 1,  maxLvl: 4,  hp: 36,   agi: 15,   dmg: 5,   sound: 'Цап!',   sfx: 'bite' },
      { r: 2, name: 'Джампер',    minLvl: 5,  maxLvl: 10, hp: 76,   agi: 26,   dmg: 12,  sound: 'Вжик!',  sfx: 'melee' },
      { r: 3, name: 'Бегун',      minLvl: 11, maxLvl: 20, hp: 140,  agi: 52,   dmg: 24,  sound: 'Кусь!',  sfx: 'bite' },
      { r: 4, name: 'Лотерейщик', minLvl: 21, maxLvl: 30, hp: 220,  agi: 126,  dmg: 40,  sound: 'Бум!',   sfx: 'gun' },
      { r: 5, name: 'Топтун',     minLvl: 31, maxLvl: 36, hp: 290,  agi: 241,  dmg: 70,  sound: 'БА-БАХ!',sfx: 'gun' },
      { r: 6, name: 'Кусач',      minLvl: 37, maxLvl: 40, hp: 330,  agi: 358,  dmg: 116, sound: 'ХРУСТЬ!',sfx: 'bite' },
      { r: 7, name: 'Рубер',      minLvl: 41, maxLvl: 49, hp: 380,  agi: 596,  dmg: 184, sound: 'РАЗРЫВ!',sfx: 'bite' },
      { r: 8, name: 'Элита',      minLvl: 50, maxLvl: 60, hp: 460,  agi: 1468, dmg: 355, sound: 'КРАШ!',  sfx: 'gun' },
      { r: 9, name: 'Суперэлита (Скреббер)', minLvl: 61, maxLvl: 70, hp: 600, agi: 2563, dmg: 554, sound: 'АННИГИЛЯЦИЯ!', sfx: 'crit' }
    ],
    ARMOR_FLAT: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 75 },
    getSceneBgSvg(loc) {
      if (loc === 'park') return '<rect width="400" height="240" fill="#0d1b14"/><circle cx="320" cy="40" r="20" fill="#274734"/><rect x="0" y="190" width="400" height="50" fill="#131915"/>';
      if (loc === 'ruins') return '<rect width="400" height="240" fill="#1b0e0e"/><polygon points="15,195 15,80 45,65 70,100 85,195" fill="#140d0d" stroke="#3b1d1d"/><rect x="0" y="190" width="400" height="50" fill="#120c0c"/>';
      return '<rect width="400" height="240" fill="#0e141d"/><rect x="15" y="60" width="55" height="135" fill="#151d29" stroke="#283445"/><rect x="280" y="70" width="50" height="125" fill="#151d29" stroke="#283445"/><rect x="0" y="190" width="400" height="50" fill="#111317"/>';
    }
  };

  global.STIKS_COMBAT_CORE = {
    state: null,
    calcMana(m1, m30, lvl) {
      if (!m1 && !m30) return 0;
      const ratio = (Math.max(1, Math.min(30, lvl)) - 1) / 29;
      return Math.max(0, Math.round(m1 - (m1 - m30) * ratio));
    },
    calcMaxCharges(lvl) {
      const l = Math.max(1, Math.min(30, Number(lvl) || 1));
      return l >= 30 ? 4 : (l >= 20 ? 3 : (l >= 10 ? 2 : 1));
    },
    getPlayerRankByLvl(lvl) {
      const l = Math.max(0, Number(lvl) || 0);
      const rows = global.BSIM_DATA.Z_RANKS;
      for (let i = 0; i < rows.length; i++) {
        if (l >= rows[i].minLvl && l <= rows[i].maxLvl) return rows[i].r;
      }
      return l > 60 ? 9 : 0;
    },
    getMult(wCls, eRank) {
      const d = wCls - eRank;
      if (wCls === 2) return d > 0 ? 3 : (d === 0 ? 2 : (d === -1 ? 1.5 : 1));
      if (wCls === 3) return d > 0 ? 2 : (d === 0 ? 3 : 1);
      if (wCls >= 4 && d >= 0) return 3;
      return 1;
    },
    grantCombatXp(statKey, baseDelta) {
      const st = this.state;
      if (!st || !st.player || !statKey || !baseDelta) return 0;
      const p = st.player;
      let delta = baseDelta;
      if (p.heroRef && STIKS && typeof STIKS.grantActionXp === 'function') {
        delta = STIKS.grantActionXp(p.heroRef, statKey, baseDelta);
        p.hp = p.heroRef.hp; p.maxHp = p.heroRef.maxHp;
        p.mana = p.heroRef.mana; p.maxMana = p.heroRef.maxMana;
      }
      p.xpGained[statKey] = Math.round(((Number(p.xpGained[statKey]) || 0) + delta) * 100) / 100;
      return delta;
    },
    startFromHero(hero, enemiesList, loc) {
      const archKey = hero.isKvaz ? 'kvaz' : ((hero.asInfected || hero.isInfected) ? 'infected' : (hero.arch || 'kachok'));
      const arch = (STIKS.ARCHETYPES && STIKS.ARCHETYPES[archKey]) || STIKS.ARCHETYPES.kachok;
      const lvl = Math.max(0, Number(hero.lvl) || 0);
      const pRank = this.getPlayerRankByLvl(lvl);
      const isInfClaws = (hero.asInfected || hero.isInfected) && !hero.isKvaz && lvl < 20;
      const slot = hero.slots && (hero.slots.main || hero.slots.side || hero.slots.melee);
      const isGun = !isInfClaws && Boolean(slot && (slot === hero.slots.main || slot === hero.slots.side || slot.cal));
      const weap = isInfClaws
        ? { name: 'Когти Улья', cls: Math.max(1, Math.floor(lvl / 5)), dmg: 4 + Math.round(lvl * 1.2), isGun: false, sound: 'Рр-аар!', sfx: 'melee' }
        : (slot ? { name: slot.n || slot.name, cls: STIKS.resolveItemRank(slot), dmg: Number(slot.a || slot.dmg || 6) + (isGun && hero.slots.mod ? Number(hero.slots.mod.a || 2) : (!isGun && hero.slots.meleeMod ? Number(hero.slots.meleeMod.poison || 3) : 0)), isGun, sound: isGun ? 'Бах!' : 'Хрясь!', sfx: isGun ? 'gun' : 'melee' }
                : { name: 'Кулаки', cls: 1, dmg: 4 + (hero.isKvaz ? Math.round(lvl * 1.5) : 0), isGun: false, sound: 'Дыщ!', sfx: 'melee' });

      const armCls = (hero.slots && hero.slots.armor) ? STIKS.resolveItemRank(hero.slots.armor) : 0;
      const cloFlat = (hero.slots && hero.slots.clothes) ? Number(hero.slots.clothes.def || hero.slots.clothes.d || 2) : 0;
      const stoneLvl = (hero.gifts && hero.gifts.stone_skin) ? Number(hero.gifts.stone_skin.lvl || 1) : 0;
      const stoneBonus = stoneLvl > 0 ? Math.round((1.0 + (stoneLvl - 1) * 0.1) * 5) : 0;

      const learned = [];
      Object.keys(hero.gifts || {}).forEach(dk => {
        const dar = STIKS.DARS && STIKS.DARS[dk];
        if (!dar) return;
        const gObj = hero.gifts[dk];
        const maxC = dar.type === 'passive' ? 0 : this.calcMaxCharges(gObj.lvl || 1);
        learned.push({ darKey: dk, branchId: '', lvl: gObj.lvl || 1, charges: maxC, maxCharges: maxC, usedRound: false });
        Object.keys(gObj.branches || {}).forEach(bk => {
          const br = (dar.branches || []).find(b => b.id === bk);
          if (!br) return;
          const bLvl = Number((gObj.branches[bk] && gObj.branches[bk].lvl) || gObj.branches[bk] || 1);
          const bMaxC = br.type === 'passive' ? 0 : this.calcMaxCharges(bLvl);
          learned.push({ darKey: dk, branchId: bk, lvl: bLvl, charges: bMaxC, maxCharges: bMaxC, usedRound: false });
        });
      });

      const enemies = (enemiesList || []).map((en, idx) => {
        const eDist = weap.isGun ? Math.max(0, 2 + (pRank - (en.rank || 0))) : 0;
        return Object.assign({}, en, { id: 'en_' + idx, dist: eDist, maxDist: Math.max(1, eDist), stun: 0, debuff: 0, dead: false, sound: en.sound || 'Цап!', sfx: en.sfx || 'bite' });
      });

      this.state = {
        mode: 'game', loc: loc || 'city', round: 1, busy: false, finished: false, activeId: '',
        player: {
          heroRef: hero, name: hero.name, archKey, ico: arch.ico || '✨', lvl, rank: pRank,
          img: STIKS.resolvePortrait(hero), hp: hero.hp, maxHp: hero.maxHp, mana: hero.mana, maxMana: hero.maxMana,
          stats: hero.stats, xpGained: { str: 0, agi: 0, spd: 0, end: 0, int: 0, spi: 0 },
          weap, armCls, armFlat: (global.BSIM_DATA.ARMOR_FLAT[armCls] || 0) + cloFlat + stoneBonus,
          skill: arch.skill, skillType: arch.skillType || 'active', skillUsed: false, phrase: arch.phrase,
          learned, buff: 1, shieldHits: 0
        },
        enemies
      };
      return this.state;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 6A-2 (БОЕВОЕ ЯДРО STIKS_COMBAT_CORE)
// ============================================================================
(function(global) {
  'use strict';

  global.STIKS_COMBAT_CORE = {
    state: null,
    Z_RANKS: [
      { r: 0, name: 'Ползун',     minLvl: 0,  maxLvl: 0,  hp: 10,  agi: 10,   dmg: 2,   sound: 'Царап!', sfx: 'bite' },
      { r: 1, name: 'Медляк',     minLvl: 1,  maxLvl: 4,  hp: 36,  agi: 15,   dmg: 5,   sound: 'Цап!',   sfx: 'bite' },
      { r: 2, name: 'Джампер',    minLvl: 5,  maxLvl: 10, hp: 76,  agi: 26,   dmg: 12,  sound: 'Вжик!',  sfx: 'melee' },
      { r: 3, name: 'Бегун',      minLvl: 11, maxLvl: 20, hp: 140, agi: 52,   dmg: 24,  sound: 'Кусь!',  sfx: 'bite' },
      { r: 4, name: 'Лотерейщик', minLvl: 21, maxLvl: 30, hp: 220, agi: 126,  dmg: 40,  sound: 'Бум!',   sfx: 'gun' },
      { r: 5, name: 'Топтун',     minLvl: 31, maxLvl: 36, hp: 290, agi: 241,  dmg: 70,  sound: 'БА-БАХ!',sfx: 'gun' },
      { r: 6, name: 'Кусач',      minLvl: 37, maxLvl: 40, hp: 330, agi: 358,  dmg: 116, sound: 'ХРУСТЬ!',sfx: 'bite' },
      { r: 7, name: 'Рубер',      minLvl: 41, maxLvl: 49, hp: 380, agi: 596,  dmg: 184, sound: 'РАЗРЫВ!',sfx: 'bite' },
      { r: 8, name: 'Элита',      minLvl: 50, maxLvl: 60, hp: 460, agi: 1468, dmg: 355, sound: 'КРАШ!',  sfx: 'gun' },
      { r: 9, name: 'Суперэлита', minLvl: 61, maxLvl: 70, hp: 600, agi: 2563, dmg: 554, sound: 'АННИГИЛЯЦИЯ!', sfx: 'crit' }
    ],

    calcMana(m1, m30, lvl) {
      if (!m1 && !m30) return 0;
      const ratio = (Math.max(1, Math.min(30, lvl)) - 1) / 29;
      return Math.max(0, Math.round(m1 - (m1 - m30) * ratio));
    },

    calcMaxCharges(lvl) {
      const l = Math.max(1, Math.min(30, Number(lvl) || 1));
      return l >= 30 ? 4 : (l >= 20 ? 3 : (l >= 10 ? 2 : 1));
    },

    getPlayerRankByLvl(lvl) {
      const l = Math.max(0, Number(lvl) || 0);
      for (let i = 0; i < this.Z_RANKS.length; i++) {
        if (l >= this.Z_RANKS[i].minLvl && l <= this.Z_RANKS[i].maxLvl) return this.Z_RANKS[i].r;
      }
      return l > 60 ? 9 : 0;
    },

    getMult(wCls, eRank) {
      const d = wCls - eRank;
      if (wCls === 2) return d > 0 ? 3 : (d === 0 ? 2 : (d === -1 ? 1.5 : 1));
      if (wCls === 3) return d > 0 ? 2 : (d === 0 ? 3 : 1);
      if (wCls >= 4 && d >= 0) return 3;
      return 1;
    },

    grantCombatXp(statKey, baseDelta) {
      const st = this.state;
      if (!st || !st.player || !statKey || !baseDelta) return 0;
      const p = st.player;
      if (p.heroRef && global.STIKS && typeof global.STIKS.grantActionXp === 'function') {
        const gained = global.STIKS.grantActionXp(p.heroRef, statKey, baseDelta);
        p.hp = p.heroRef.hp; p.maxHp = p.heroRef.maxHp;
        p.mana = p.heroRef.mana; p.maxMana = p.heroRef.maxMana;
        p.lvl = p.heroRef.lvl; p.rank = this.getPlayerRankByLvl(p.lvl);
        return gained;
      }
      return 0;
    },

    startFromHero(hero, enemiesRaw, zId) {
      const S = global.STIKS;
      const archKey = hero.isKvaz ? 'kvaz' : (hero.asInfected ? 'infected' : (hero.arch || 'kachok'));
      const arch = (S.ARCHETYPES && S.ARCHETYPES[archKey]) || S.ARCHETYPES.kachok;
      const lvl = Math.max(0, Number(hero.lvl) || 0);
      const pRank = this.getPlayerRankByLvl(lvl);

      const isInfNoWeap = (hero.asInfected || hero.isInfected) && !hero.isKvaz && lvl < 20 && !(hero.gifts && hero.gifts.vaishnavism);
      const slotKey = isInfNoWeap ? null : (hero.slots.main ? 'main' : (hero.slots.side ? 'side' : (hero.slots.melee ? 'melee' : null)));
      const wObj = slotKey ? hero.slots[slotKey] : null;
      const isGun = Boolean(wObj && (slotKey === 'main' || slotKey === 'side' || wObj.cal));
      const modAdd = (isGun && hero.slots.mod) ? Number(hero.slots.mod.a || hero.slots.mod.rank || 2) : 0;
      const weap = wObj
        ? { name: wObj.n || wObj.name, cls: Math.max(1, Math.min(4, Number(wObj.cls || wObj.rank || 1))), dmg: (Number(wObj.a || wObj.dmg || 4) + modAdd), isGun, sound: isGun ? 'Тра-та-та!' : 'Хрясь!', sfx: isGun ? 'gun' : 'melee' }
        : { name: isInfNoWeap ? 'Когти Улья' : 'Кулаки', cls: isInfNoWeap ? Math.max(1, Math.min(4, 1 + Math.floor(lvl / 15))) : 1, dmg: isInfNoWeap ? (6 + Math.floor(lvl * 1.2)) : 4, isGun: false, sound: isInfNoWeap ? 'РРР-ЦАП!' : 'Дыщ!', sfx: 'melee' };

      const armObj = hero.slots.armor, cloObj = hero.slots.clothes;
      const stoneLvl = (hero.gifts && hero.gifts.stone_skin) ? Number(hero.gifts.stone_skin.lvl || 1) : 0;
      const armFlat = (armObj ? Number(armObj.d || armObj.def || 5) : 0) + (cloObj ? Number(cloObj.d || cloObj.def || 2) : 0) + (stoneLvl > 0 ? Math.round((1 + (stoneLvl - 1) * 0.1) * 5) : 0);
      const armCls = armObj ? Math.max(1, Math.min(4, Number(armObj.cls || armObj.rank || 1))) : 0;

      const learned = [];
      Object.keys(hero.gifts || {}).forEach(gid => {
        const gSt = hero.gifts[gid], gMeta = S.DARS && S.DARS[gid];
        if (!gSt || !gMeta) return;
        const gl = Number(gSt.lvl || 1), maxC = gMeta.type === 'passive' ? 0 : this.calcMaxCharges(gl);
        learned.push({ darKey: gid, branchId: '', lvl: gl, charges: maxC, maxCharges: maxC, usedRound: false });
        Object.keys(gSt.branches || {}).forEach(bk => {
          const bSt = gSt.branches[bk], bMeta = (gMeta.branches || []).find(b => b.id === bk);
          if (!bSt || !bMeta) return;
          const bl = Number(bSt.lvl || 1), bMaxC = bMeta.type === 'passive' ? 0 : this.calcMaxCharges(bl);
          learned.push({ darKey: gid, branchId: bk, lvl: bl, charges: bMaxC, maxCharges: bMaxC, usedRound: false });
        });
      });

      const enemies = (enemiesRaw || []).map((en, idx) => {
        const rNum = Math.max(0, Math.min(9, Number(en.rank) || 0));
        const zInfo = this.Z_RANKS[rNum] || this.Z_RANKS;
        const dist = weap.isGun ? Math.max(0, 2 + (pRank - rNum)) : 0;
        return { id: 'en_' + idx, name: en.name || zInfo.name, rank: rNum, lvl: en.lvl || zInfo.minLvl, dist, maxDist: Math.max(1, dist), hp: en.hp || zInfo.hp, maxHp: en.maxHp || zInfo.hp, dmg: en.dmg || zInfo.dmg, sound: zInfo.sound, sfx: zInfo.sfx, stun: 0, debuff: 0, dead: false, isHuman: Boolean(en.isHuman) };
      });

      this.state = {
        mode: 'game', zId, round: 1, busy: false, finished: false, activeId: '',
        player: { heroRef: hero, name: hero.name, archKey, ico: arch.ico || '✨', lvl, rank: pRank, img: S.resolvePortrait(hero), hp: hero.hp, maxHp: hero.maxHp, mana: hero.mana, maxMana: hero.maxMana, stats: hero.stats, weap, armCls, armFlat, skill: arch.skill, skillType: arch.skillType || 'active', skillUsed: false, phrase: arch.phrase, learned, shieldHits: 0 },
        enemies
      };
      return this.state;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 6B-1 (БОЕВОЙ РЕНДЕР BSIM_UI)
// ============================================================================
(function(global) {
  'use strict';

  function ensureCombatCss() {
    if (document.getElementById('stiks-bsim-css')) return;
    const st = document.createElement('style');
    st.id = 'stiks-bsim-css';
    st.textContent = '#combat-stage{position:relative;width:100%;height:220px;border:1px solid #8f2d2d;border-radius:6px;overflow:hidden;background:#090b0a;margin-bottom:8px;}' +
      '.dist-pill{position:absolute;top:5px;left:50%;transform:translateX(-50%);z-index:4;background:rgba(10,12,11,0.9);border:1px solid #6e2626;color:#e6c86e;padding:2px 8px;border-radius:10px;font-size:10px;white-space:nowrap;}' +
      '.col-fighters{position:absolute;top:26px;bottom:6px;z-index:2;display:flex;flex-direction:column;justify-content:center;gap:4px;pointer-events:none;}' +
      '.enemy-lane{position:relative;height:29px;width:100%;}.enemy-lane .mini-unit{position:absolute;transition:right 0.55s ease,transform 0.25s ease;}' +
      '.mini-unit{position:relative;display:flex;align-items:center;gap:4px;background:rgba(10,13,12,0.88);border:1px solid #5c2828;border-radius:4px;padding:2px 4px;}' +
      '.mini-unit.ally{border-color:#2e7d4f;}.mini-unit.enemy{flex-direction:row-reverse;}.mini-unit.dead{opacity:0.32;filter:grayscale(1);}' +
      '.mini-unit.active-turn{transform:scale(1.06);box-shadow:0 0 8px #ff9e9e;border-color:#ff9e9e;z-index:4;}' +
      '.mini-pic{width:20px;height:23px;border-radius:3px;overflow:hidden;background:#140e0e;}.mini-pic img{width:100%;height:100%;object-fit:cover;}' +
      '.mini-lbl{font-size:9px;color:#eef7f1;max-width:74px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.mini-bar{width:54px;height:3px;background:#241212;border-radius:2px;overflow:hidden;margin-top:2px;}.mini-fill{height:100%;background:#e53935;}.mini-fill.ally{background:#4caf50;}' +
      '.float-layer{position:absolute;inset:0;z-index:5;pointer-events:none;}.float-pop{position:absolute;font-weight:bold;font-size:10px;padding:1px 4px;border-radius:3px;background:rgba(0,0,0,0.75);color:#fff;}' +
      '.skill-banner{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:80%;background:rgba(18,12,28,0.95);border:2px solid #a855f7;border-radius:8px;padding:8px;text-align:center;z-index:8;color:#f3e8ff;}';
    document.head.appendChild(st);
  }

  global.BSIM_UI = {
    wait(ms) { return new Promise(res => setTimeout(res, ms)); },

    log(html) {
      const feed = document.getElementById('sim-feed');
      if (!feed) return;
      const d = document.createElement('div');
      d.style.cssText = 'padding:2px 0;border-bottom:1px dashed #1f1212;';
      d.innerHTML = html;
      feed.appendChild(d);
      feed.scrollTop = feed.scrollHeight;
    },

    showSkillBanner(ico, title, shout) {
      const layer = document.getElementById('stage-floats');
      if (!layer) return;
      const el = document.createElement('div');
      el.className = 'skill-banner';
      el.innerHTML = `<div style="font-size:22px;">${ico}</div><div style="font-weight:bold;font-size:12px;">${title}</div><div style="font-size:10px;color:#d8b4fe;">«${shout}»</div>`;
      layer.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, 1500);
    },

    popBack(unitDomId, isLeft, txt) {
      const layer = document.getElementById('stage-floats'), unit = document.getElementById(unitDomId), stage = document.getElementById('combat-stage');
      if (!layer || !unit || !stage) return;
      const uR = unit.getBoundingClientRect(), sR = stage.getBoundingClientRect();
      const el = document.createElement('div');
      el.className = 'float-pop';
      el.textContent = txt;
      el.style.top = Math.max(20, Math.round(uR.top - sR.top - 4)) + 'px';
      if (isLeft) el.style.left = '12px'; else el.style.right = '12px';
      layer.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, 1300);
    },

    renderStage() {
      ensureCombatCss();
      const st = global.STIKS_COMBAT_CORE.state;
      const vp = document.getElementById('game-viewport');
      if (!st || !vp) return;
      const p = st.player, S = global.STIKS;
      const skillOpened = p.heroRef ? S.isRealSkillUnlocked(p.heroRef) : true;
      const skillTitle = skillOpened ? p.skill : '🤪 Что-то учудить';
      const pPct = Math.max(0, Math.min(100, Math.round((p.hp / Math.max(1, p.maxHp)) * 100)));

      let h = '<div style="background:#111613;border:1px solid #8f2d2d;border-radius:6px;padding:8px;font-size:11px;">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><b style="color:#ff9e9e;">⚔️ БОЙ • РАУНД ' + st.round + '</b><button id="btn-bsim-bgm" class="btn" style="width:auto;padding:2px 6px;font-size:10px;" onclick="BSIM_AUDIO.toggleBgm()">🎵 1/6: ' + (global.BSIM_AUDIO.bgmOn ? 'ВКЛ' : 'ВЫКЛ') + '</button></div>';
      h += '<div id="combat-stage"><div class="dist-pill">' + (st.finished ? (p.hp > 0 ? '🏆 ПОБЕДА' : '💀 ПОРАЖЕНИЕ') : ('Раунд ' + st.round)) + '</div>';
      h += `<div class="col-fighters" style="left:4%;"><div id="u-player" class="mini-unit ally ${st.activeId === 'u-player' ? 'active-turn' : ''} ${p.hp <= 0 ? 'dead' : ''}"><div class="mini-pic"><img src="${p.img}"></div><div><div class="mini-lbl">${p.name}</div><div class="mini-bar"><div class="mini-fill ally" style="width:${pPct}%;"></div></div></div></div></div>`;
      h += '<div class="col-fighters" style="right:2%;width:64%;">';
      st.enemies.forEach(en => {
        const rPct = en.dist <= 0 ? 52 : Math.round(2 + (1 - en.dist / Math.max(1, en.maxDist)) * 44);
        const ePct = Math.max(0, Math.min(100, Math.round((en.hp / Math.max(1, en.maxHp)) * 100)));
        const tag = en.dead ? '💀' : (en.stun > 0 ? '💫СТАН' : (en.debuff > 0 ? '⬇️-25%' : (en.dist > 0 ? `[${en.dist}х]` : '[УПОР]')));
        h += `<div class="enemy-lane"><div id="u-${en.id}" class="mini-unit enemy ${st.activeId === 'u-' + en.id ? 'active-turn' : ''} ${en.dead ? 'dead' : ''}" style="right:${rPct}%;"><div><div class="mini-lbl">${en.name} ${tag}</div><div class="mini-bar"><div class="mini-fill" style="width:${ePct}%;"></div></div></div></div></div>`;
      });
      h += '</div><div id="stage-floats" class="float-layer"></div></div>';
      h += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#140e0e;padding:5px;border-radius:4px;margin-bottom:6px;font-size:10px;"><div>❤️ ОЗ: <b>${p.hp}/${p.maxHp}</b></div><div>🔮 Мана: <b>${p.mana}/${p.maxMana}</b></div><div>🛡 Броня: <b>${p.armFlat}</b></div></div>`;

      if (st.finished) {
        h += '<button class="btn btn-primary" style="width:100%;padding:8px;font-weight:bold;margin-bottom:6px;" onclick="STIKS.closeCombatModal()">Продолжить ▶</button>';
      } else {
        const dis = st.busy ? 'disabled' : '';
        h += `<div style="display:flex;gap:5px;margin-bottom:6px;"><button class="btn btn-primary" ${dis} style="flex:2;" onclick="BSIM_UI.actAttack()">🎲 Атака (2d6)</button><button class="btn btn-danger" ${dis} style="flex:1;" onclick="STIKS.combatFlee()">🏃 Сбежать</button></div>`;
        if (p.skillType !== 'trigger' && p.skillType !== 'passive') {
          h += `<button class="btn" ${(st.busy || p.skillUsed) ? 'disabled' : ''} style="width:100%;margin-bottom:5px;text-align:left;" onclick="BSIM_UI.actSkill()">${p.ico} ${skillTitle}</button>`;
        }
        p.learned.forEach((item, idx) => {
          const dar = S.DARS && S.DARS[item.darKey];
          if (!dar) return;
          const br = item.branchId ? (dar.branches || []).find(b => b.id === item.branchId) : null;
          const tp = br ? br.type : dar.type, title = br ? br.name : dar.name;
          if (tp === 'active') {
            const pct = global.STIKS_COMBAT_CORE.calcMana(br ? br.mana1 : dar.mana1, br ? br.mana30 : dar.mana30, item.lvl);
            const cost = Math.floor(p.maxMana * (pct / 100));
            h += `<button class="btn" ${(st.busy || item.usedRound || (item.maxCharges > 0 && item.charges <= 0)) ? 'disabled' : ''} style="width:100%;margin-bottom:4px;text-align:left;border-color:#6b3fa0;color:#e2caff;" onclick="BSIM_UI.actLearned(${idx})">🧬 ${title} (Ур.${item.lvl}) [${item.charges}/${item.maxCharges}] • ${cost} м.</button>`;
          }
        });
      }
      const prevFeed = document.getElementById('sim-feed');
      const savedHtml = prevFeed ? prevFeed.innerHTML : '';
      h += `<div id="sim-feed" style="background:#080908;border:1px solid #3d1c1c;border-radius:4px;padding:6px;height:120px;overflow-y:auto;font-size:11px;">${savedHtml}</div></div>`;
      vp.innerHTML = h;
      const nf = document.getElementById('sim-feed');
      if (nf) nf.scrollTop = nf.scrollHeight;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 6C-2 (НАГРАДЫ ПОБЕДЫ, ПРОЗРЕНИЕ И ПОРАЖЕНИЕ)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    _onBsimVictory(st) {
      const s = this.db && this.db.session;
      const p = st && st.player && st.player.heroRef;
      if (!s || !p) return;
      const enemies = st.enemies || [];
      const killed = enemies.length;
      const lead = enemies || { rank: 0, lvl: 0, isHuman: false };

      s.zombies = (s.zombies || []).filter(z => z.id !== st.zId);
      p._raidKills = (Number(p._raidKills) || 0) + killed;
      p.lastKill = { rank: lead.rank || 0, isHuman: Boolean(lead.isHuman) };

      let spDrop = 0;
      enemies.forEach(en => {
        if (!en.isHuman && (Number(en.rank) || 0) >= 3) {
          spDrop += Math.pow(4, (Number(en.rank) || 3) - 3);
        } else if (!en.isHuman && Number(en.rank) === 2) {
          spDrop += 1;
        }
      });
      if (spDrop > 0) s.pendingSpores = (Number(s.pendingSpores) || 0) + spDrop;

      const maxR = Math.max.apply(null, enemies.map(e => Number(e.rank) || 0));
      const maxEnLvl = Math.max.apply(null, enemies.map(e => Number(e.lvl) || 0));
      if (!lead.isHuman) {
        if (maxR >= 9) {
          p.inv.push({ n: '⚪ Белый жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'white', rank: 4, w: 0.1, q: 1 });
          this.log('⚪ С поверженного Скреббера добыт Белый жемчуг Улья!');
        } else if (maxR >= 8 && Math.random() < 0.6) {
          p.inv.push({ n: '🔴 Красный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'red', rank: 3, w: 0.1, q: 1 });
          this.log('🔴 В останках Элиты обнаружен Красный жемчуг!');
        } else if ((maxR === 4 || maxR === 7) && Math.random() < 0.5) {
          p.inv.push({ n: '⚫ Чёрный жемчуг Улья', cat: 'supply', slot: 'use', pearl: 'black', rank: 3, w: 0.1, q: 1 });
          this.log('⚫ Найдён Чёрный жемчуг Улья!');
        }
      }

      if ((p.asInfected || p.isInfected) && !p.isKvaz && !p.isImennoi && (maxEnLvl - (p.lvl || 0)) >= 15) {
        if (Math.random() < 0.5) {
          if (Math.random() < 0.5) {
            p.asInfected = p.isInfected = false;
            p.isImennoi = true;
            if (p.origArch && p.origArch !== 'infected') p.arch = p.origArch;
            this.log(`✨ ПРОЗРЕНИЕ УЛЬЯ! ${p.name} победил врага на 15+ ур. старше и вернул человеческий облик!`);
          } else {
            p.isKvaz = true;
            this.log(`👹 ПРОЗРЕНИЕ УЛЬЯ! ${p.name} эволюционировал в разумного Кваза!`);
          }
        }
      }

      p.inv = this.stackInventory(p.inv);
      this.recalcLevel(p);
      this.normalizePlayerStats(p);
      this.syncHeroProfile(p);
      this.saveDB();
      this.log(`🏆 Победа! Уничтожено: ${killed}` + (spDrop > 0 ? `. Споранов доступно: ${s.pendingSpores} шт.` : '.'));
    },

    _onBsimDefeat(st) {
      const p = st && st.player && st.player.heroRef;
      if (!p) return;
      if (!p.asInfected && p.arch === 'cashier' && !st.cashierSaved) {
        st.cashierSaved = true;
        st.finished = false;
        p.hp = st.player.hp = Math.max(1, Math.round(p.maxHp * 0.25));
        p._skillSuccessUsed = p.skillUnlocked = p.skillRevealed = true;
        this.log('🧾 Галя, у нас отмена! Кассирша отменила смертельный удар и осталась в строю!');
        global.BSIM_UI.renderStage();
        return;
      }
      p.dead = true;
      p.status = 'dead';
      this.syncHeroProfile(p);
      this.saveDB();
      this.log(`💀 ${p.name} пал в бою.`);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 7A-1 (ОТРИСОВКА ЛОББИ RENDERLOBBY)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  STIKS.renderLobby = function() {
    this.ensureStaticLabels();
    this.sanitizeRoster();
    const vp = document.getElementById('game-viewport');
    if (!vp) return;

    const fams = Object.keys(this.db.families || {});
    const archs = this.ARCHETYPES || {};
    let h = '<div style="display:flex;flex-direction:column;gap:10px;">';

    if (this.db.session && Array.isArray(this.db.session.players) && this.db.session.players.length) {
      const sqNames = this.db.session.players.map(pl => `${pl.family} ${pl.name}`).join(', ');
      h += '<div style="border:1px solid #4a7a5c;padding:8px;background:#131f18;">';
      h += `<div style="font-size:12px;color:#98d4ae;font-weight:bold;margin-bottom:4px;">⏸ АКТИВНЫЙ РЕЙД НА ПАУЗЕ (Ход: ${this.db.session.turn || 1})</div>`;
      h += `<div style="font-size:11px;color:#c8d6cc;margin-bottom:6px;">Отряд: ${sqNames}</div>`;
      h += '<div style="display:flex;gap:6px;"><button class="btn btn-primary" style="flex:1;" onclick="STIKS.resumeRaid()">▶ Продолжить</button>';
      h += '<button class="btn btn-danger" style="width:auto;padding:6px 10px;" onclick="STIKS.finishPausedRaid()">🏁 Завершить</button></div></div>';
    }

    h += '<div style="border:1px solid #6e2626;padding:8px;background:#111613;">';
    h += '<div style="font-size:12px;color:#d68a8a;margin-bottom:6px;font-weight:bold;">1. ФАМИЛИЯ (АККАУНТ ВЫЖИВШИХ)</div>';
    h += '<div style="display:flex;gap:6px;"><input id="new-fam" placeholder="Введите фамилию..." style="flex:1;background:#0b0d0c;color:#c8d6cc;border:1px solid #6e2626;padding:6px;font-size:12px;">';
    h += '<button class="btn btn-primary" style="width:auto;" onclick="STIKS.addFamily()">+ Фамилия</button></div>';

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
      h += '<div style="border:1px solid #6e2626;padding:8px;background:#111613;">';
      h += `<div style="font-size:12px;color:#d68a8a;margin-bottom:6px;font-weight:bold;">2. ПЕРСОНАЖ (${this.activeFamily})</div>`;
      h += '<input id="hero-name" placeholder="Имя персонажа..." style="width:100%;box-sizing:border-box;background:#0b0d0c;color:#c8d6cc;border:1px solid #6e2626;padding:6px;font-size:12px;margin-bottom:6px;">';
      h += '<div style="display:flex;gap:6px;"><select id="hero-sex" style="flex:1;background:#0b0d0c;color:#c8d6cc;border:1px solid #6e2626;padding:6px;"><option value="m">Пол: Мужской</option><option value="f">Пол: Женский</option></select>';
      h += '<button class="btn btn-primary" style="width:auto;" onclick="STIKS.addHero()">Создать</button></div>';

      const list = this.db.families[this.activeFamily] || [];
      if (list.length) {
        const famEsc = this.activeFamily.replace(/'/g, "\\'");
        h += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">';
        list.forEach((hr, idx) => {
          this._cleanSporans(hr);
          const inSq = this.squad.some(s => s.uid === hr.uid), isDead = hr.status === 'dead';
          const roleTxt = isDead ? 'Погиб' : (hr.isKvaz ? 'Кваз' : (((hr.lvl || 0) >= 2 && archs[hr.arch]) ? archs[hr.arch].name : (hr.sex === 'f' ? 'Жен.' : 'Муж.')));
          const canShop = !isDead && (!hr.isInfected || hr.isKvaz);
          h += `<div style="display:flex;justify-content:space-between;align-items:center;background:#0b0d0c;border:1px solid #3d1c1c;padding:5px 6px;font-size:11px;gap:4px;"><div><b>${hr.name}</b> (${roleTxt}) Ур.${hr.lvl || 0} | 💎${hr.spores}</div><div style="display:flex;gap:4px;flex-wrap:wrap;">`;
          if (!isDead) h += `<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#6ea882;color:#98e6b3;" onclick="STIKS.openSettlement('${famEsc}',${idx})">🏘️</button>`;
          if (canShop) h += `<button class="btn" style="width:auto;padding:3px 6px;font-size:10px;border-color:#c9a84c;color:#e6c86e;" onclick="STIKS.openShop('${famEsc}',${idx})">🏪</button>`;
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

    h += '<div style="border:1px solid #6e2626;padding:8px;background:#111613;">';
    h += `<div style="font-size:12px;color:#d68a8a;margin-bottom:6px;font-weight:bold;">3. ОТРЯД В РЕЙД (${this.squad.length})</div>`;
    if (this.squad.length) {
      this.squad.forEach((sq, i) => {
        h += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:3px 0;"><span>${sq.family} ${sq.name}${sq.asInfected ? ' [☣️]' : ''}</span><button class="btn btn-danger" style="width:auto;padding:2px 6px;font-size:10px;" onclick="STIKS.removeSquad(${i})">Убрать</button></div>`;
      });
      h += '<div style="display:flex;gap:6px;margin-top:8px;"><button class="btn btn-primary" style="flex:1;" onclick="STIKS.launchMap(\'start\')">▶ Старт (60x60)</button><button class="btn btn-danger" style="flex:1;" onclick="STIKS.launchMap(\'hell\')">🔥 Пекло (от 30 ур.)</button></div>';
    } else {
      h += '<div style="font-size:11px;color:#8a7272;">Добавьте бойцов (макс. 1 от фамилии).</div>';
    }
    vp.innerHTML = h + '</div></div>';
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 7A-2b (СПОРАНЫ, ЛИЧНОЕ ДЕЛО И ИТОГИ РЕЙДА)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    renderGameExtras(p, s, aInfo) {
      let h = '';
      const zCount = (p.inv || []).reduce((acc, it) => (it && (it.isZhivchik || String(it.n || '').toLowerCase().includes('живчик'))) ? acc + (Number(it.q) || 1) : acc, 0);
      const pend = Number(s.pendingSpores) || 0;
      const isInf = Boolean(p.asInfected || p.isInfected);

      if (this.isRealSporeUnlocked(p) || isInf || pend > 0 || zCount > 0 || (p.spores || 0) > 0) {
        h += '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;background:#161111;border:1px solid #6e2626;padding:6px 8px;border-radius:4px;font-size:11px;">';
        h += `<span>💎 Спораны: <b>${p.spores || 0}</b>${!isInf ? ` | 🧪 Живчик: <b>${zCount}</b>` : ''}</span><div style="display:flex;gap:4px;flex-wrap:wrap;">`;
        if (pend > 0 && (this.isRealSporeUnlocked(p) || isInf)) h += `<button class="btn btn-primary" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.collectSpores()">💎 Собрать (${pend})</button>`;
        if (isInf && p.lastKill) h += '<button class="btn btn-danger" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.devourEnemy()">🍖 Пожрать (1 ОХ)</button>';
        if (!isInf && this.isRealSporeUnlocked(p)) {
          h += '<button class="btn" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.craftAndDrinkZhivchik()">🧪 Живчик (1сп+алк)</button>';
          if (zCount > 0) h += `<button class="btn btn-primary" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.drinkZhivchik()">🥤 Выпить (${zCount})</button>`;
        }
        h += '</div></div>';
      }

      if (s.humanEncounter) {
        const enc = s.humanEncounter;
        h += `<div style="position:fixed;inset:0;background:rgba(5,7,6,0.9);z-index:9200;display:flex;align-items:center;justify-content:center;padding:12px;"><div style="width:100%;max-width:350px;border:1px solid #c9a84c;background:#141712;padding:14px;border-radius:6px;text-align:center;">` +
          `<div style="color:#e6c86e;font-weight:bold;margin-bottom:8px;">🧑 ВСТРЕЧА: ${enc.name}</div><img src="${enc.img}" style="width:150px;height:170px;object-fit:cover;border-radius:6px;margin-bottom:8px;">` +
          `<div style="display:flex;gap:8px;"><button class="btn btn-danger" style="flex:1;" onclick="STIKS.resolveHumanEncounter('attack')">⚔️ Напасть</button><button class="btn btn-primary" style="flex:1;" onclick="STIKS.resolveHumanEncounter('pass')">🚶 Пройти мимо</button></div></div></div>`;
      }

      if (this.profileOpen) {
        const imgSrc = this.resolvePortrait(p);
        const stNames = { str: 'Сила', agi: 'Ловкость', spd: 'Скорость', end: 'Выносливость', int: 'Интеллект', spi: 'Дух' };
        let stHtml = '';
        Object.keys(stNames).forEach(sk => {
          const val = (p.stats && p.stats[sk]) || 10;
          stHtml += `<div>• ${stNames[sk]}: <b>${(p.lvl >= 5 || isInf) ? val : '???'}</b></div>`;
        });
        let giftsHtml = '';
        const gKeys = Object.keys(p.gifts || {});
        if (gKeys.length) {
          giftsHtml += '<div style="margin-top:8px;padding:6px;background:#16101a;border:1px solid #6b3d82;border-radius:4px;"><b style="color:#e0b3ff;">🧬 Дары Улья:</b>';
          gKeys.forEach(gid => {
            const gSt = p.gifts[gid], gMeta = this.DARS[gid] || { name: gid, desc: '' };
            giftsHtml += `<div style="margin-top:4px;color:#fbbf24;">★ ${gMeta.name} [Ур.${gSt.lvl || 1}] <span style="color:#cbd5e1;font-size:10px;">${gMeta.desc}</span></div>`;
            Object.keys(gSt.branches || {}).forEach(bk => {
              const bMeta = (gMeta.branches || []).find(b => b.id === bk) || { name: bk };
              giftsHtml += `<div style="margin-left:8px;color:#93c5fd;font-size:10px;">↳ ${bMeta.name} [Ур.${gSt.branches[bk].lvl || 1}]</div>`;
            });
          });
          giftsHtml += '</div>';
        }
        h += `<div style="position:fixed;inset:0;background:rgba(5,7,6,0.9);z-index:9000;display:flex;align-items:center;justify-content:center;padding:12px;"><div style="width:100%;max-width:400px;max-height:90dvh;overflow-y:auto;border:1px solid #6e2626;background:#140e0e;padding:12px;border-radius:6px;">` +
          `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><b style="color:#d48a8a;">ЛИЧНОЕ ДЕЛО: ${p.name} (Ур.${p.lvl || 0})</b><button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="STIKS.toggleProfile()">✖</button></div>` +
          `<div style="text-align:center;margin-bottom:8px;"><img src="${imgSrc}" style="max-width:200px;max-height:240px;border-radius:6px;"><div style="color:#d48a8a;margin-top:4px;">${(p.lvl >= 2 || isInf) ? aInfo.name : 'Роль раскроется на 2 уровне.'}</div></div>` +
          `<div>💎 Спораны: <b>${p.spores || 0}</b></div>${stHtml}${giftsHtml}</div></div>`;
      }

      if (this.invOpen) h += this.renderEquipModal(p);
      return h;
    },

    closeRaidSummary(uid) {
      const ov = document.getElementById('stiks-raid-summary-modal');
      if (ov) ov.remove();
      if (uid) this.openShop(uid);
    },

    showRaidSummaryModal(info) {
      const ov = document.createElement('div');
      ov.id = 'stiks-raid-summary-modal';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,6,0.93);z-index:9600;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#d6e5db;';
      ov.innerHTML = `<div style="width:100%;max-width:390px;border:1px solid #8f2d2d;background:#140e0e;padding:14px;border-radius:6px;">` +
        `<div style="color:#ff9e9e;font-weight:bold;text-align:center;margin-bottom:10px;">🚪 ИТОГИ ВЫХОДА С ЛОКАЦИИ</div>` +
        `<div>👤 Выживший: <b>${info.name}</b></div><div>⬆️ Уровень: <b>+${info.lvlGain} (Ур.${info.endLvl})</b></div>` +
        `<div>🧟 Врагов уничтожено: <b>${info.kills}</b></div><div style="margin-bottom:10px;">💎 Споранов: <b>${info.spores} шт.</b></div>` +
        `<div style="display:flex;gap:8px;"><button class="btn btn-primary" style="flex:1;" onclick="STIKS.closeRaidSummary('${info.uid}')">🏪 В Лавку</button><button class="btn" style="width:auto;" onclick="STIKS.closeRaidSummary(null)">В лобби</button></div></div>`;
      document.body.appendChild(ov);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — БЛОК 7B (ДНЕВНИК, ПРОЛОГ, АВТОРЫ И ЗАПУСК)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    unlockNextArchiveEntry() {
      let st = { archive: [] };
      try { st = Object.assign(st, JSON.parse(localStorage.getItem('stiks_codex_v186') || '{}')); } catch (e) {}
      if (!Array.isArray(st.archive)) st.archive = [];
      for (let i = 1; i <= 30; i++) {
        const id = 'arch_' + (i < 10 ? '0' : '') + i;
        if (!st.archive.includes(id)) {
          st.archive.push(id);
          try { localStorage.setItem('stiks_codex_v186', JSON.stringify(st)); } catch (e) {}
          return i;
        }
      }
      return null;
    },

    openCodex(tab) {
      const old = document.getElementById('stiks-p26-overlay');
      if (old) old.remove();
      const curTab = tab || 'gifts';
      const ov = document.createElement('div');
      ov.id = 'stiks-p26-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,7,12,0.94);z-index:9850;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#e2e8f0;';

      let content = '';
      if (curTab === 'gifts') {
        Object.keys(this.DARS || {}).forEach(gid => {
          const g = this.DARS[gid];
          content += `<div style="background:#161822;border:1px solid #475569;border-radius:6px;padding:8px;margin-bottom:6px;"><b style="color:#fbbf24;">🧬 ${g.name}</b><div style="font-size:11px;margin:3px 0;">${g.desc}</div>` +
            (g.branches || []).map(b => `<div style="color:#93c5fd;font-size:10px;margin-left:8px;">↳ ${b.name}: ${b.desc}</div>`).join('') + '</div>';
        });
      } else if (curTab === 'creatures') {
        (global.STIKS_COMBAT_CORE.Z_RANKS || []).forEach(z => {
          content += `<div style="background:#161822;border:1px solid #475569;border-radius:6px;padding:7px;margin-bottom:5px;"><b style="color:#f87171;">Ранг ${z.r}: ${z.name}</b> (Ур.${z.minLvl}–${z.maxLvl}) • ОЗ: ${z.hp}, Урон: ${z.dmg}</div>`;
        });
      } else {
        Object.keys(this.ARCHETYPES || {}).forEach(ak => {
          const a = this.ARCHETYPES[ak];
          content += `<div style="background:#161822;border:1px solid #475569;border-radius:6px;padding:7px;margin-bottom:5px;"><b style="color:#86efac;">${a.name}</b> — Навык: ${a.skill} | Дар 15 ур.: ${a.dar15}</div>`;
        });
      }

      ov.innerHTML = `<div style="width:100%;max-width:480px;max-height:88dvh;display:flex;flex-direction:column;background:#10131c;border:1px solid #6e2626;border-radius:8px;overflow:hidden;">` +
        `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#161b26;border-bottom:1px solid #263042;"><div style="display:flex;gap:4px;">` +
        `<button class="btn ${curTab === 'gifts' ? 'btn-primary' : ''}" style="width:auto;padding:4px 7px;font-size:10px;" onclick="STIKS.openCodex('gifts')">Дары (16)</button>` +
        `<button class="btn ${curTab === 'creatures' ? 'btn-primary' : ''}" style="width:auto;padding:4px 7px;font-size:10px;" onclick="STIKS.openCodex('creatures')">Ранги (10)</button>` +
        `<button class="btn ${curTab === 'roles' ? 'btn-primary' : ''}" style="width:auto;padding:4px 7px;font-size:10px;" onclick="STIKS.openCodex('roles')">Роли (15)</button></div>` +
        `<button class="btn btn-danger" style="width:auto;padding:4px 8px;" onclick="document.getElementById('stiks-p26-overlay').remove()">✖</button></div>` +
        `<div style="padding:10px;overflow-y:auto;flex:1;">${content}</div></div>`;
      document.body.appendChild(ov);
    },

    stopIntro() {
      if (Array.isArray(this._introTimers)) this._introTimers.forEach(t => clearTimeout(t));
      this._introTimers = [];
      if ('speechSynthesis' in global) try { global.speechSynthesis.cancel(); } catch (e) {}
      const ov = document.getElementById('stiks-intro-overlay');
      if (ov) ov.remove();
      if (this.renderGame) this.renderGame();
    },

    showIntro(p) {
      this.stopIntro();
      const rawText = `${p.name || 'Выживший'} очнулся на холодном полу под вой сирены СТИКСа. В запертом номере пахло пылью и озоном. Толкнув дверь, он шагнул на пустую улицу мёртвого города.`;
      const frames = ['img/intro1.jpg', 'img/intro2.JPG', 'img/intro3.jpg'];
      const ov = document.createElement('div');
      ov.id = 'stiks-intro-overlay';
      ov.style.cssText = 'position:fixed;inset:0;background:#080a09;z-index:9999;display:flex;flex-direction:column;justify-content:space-between;font-family:monospace;color:#d6e5db;';
      ov.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#0b0d0c;border-bottom:1px solid #6e2626;"><span id="stiks-intro-step" style="color:#d48a8a;">ПРОЛОГ 1/3</span><button class="btn btn-primary" style="width:auto;padding:6px 12px;" onclick="STIKS.stopIntro()">В город ▶</button></div>` +
        `<div id="stiks-intro-bg" style="flex:1;background:url('${frames[0]}') center/contain no-repeat;"></div>` +
        `<div style="padding:12px 14px 36px 14px;background:#080a09;border-top:1px solid #4a1c1c;text-align:center;font-size:13px;">${rawText}</div>`;
      document.body.appendChild(ov);
      this._introTimers = [1, 2].map(idx => setTimeout(() => {
        const bg = document.getElementById('stiks-intro-bg'), st = document.getElementById('stiks-intro-step');
        if (bg) bg.style.backgroundImage = `url('${frames[idx]}')`;
        if (st) st.innerText = `ПРОЛОГ ${idx + 1}/3`;
      }, 6000 * idx));
      this.speakPhrase(p, rawText);
    },

    renderAuthorsFooter() {
      const svg1 = '<svg viewBox="0 0 360 440" width="52" height="64" style="border:1px solid #6e2626;border-radius:6px;background:#140e0e;"><rect width="360" height="440" fill="#111613"/><path d="M70 440 C75 330, 285 330, 290 440 Z" fill="#121417" stroke="#2d3748" stroke-width="4"/><path d="M125 350 Q180 410 235 350" fill="none" stroke="#38bdf8" stroke-width="4"/><rect x="152" y="265" width="56" height="65" rx="16" fill="#e5b89b"/><ellipse cx="180" cy="195" rx="74" ry="92" fill="#f1c6ab"/><path d="M106 175 C106 95, 254 95, 254 175 C242 135, 118 135, 106 175 Z" fill="#d6b46c"/><rect x="116" y="172" width="54" height="32" rx="8" fill="#0f172a" stroke="#64748b" stroke-width="4"/><rect x="190" y="172" width="54" height="32" rx="8" fill="#0f172a" stroke="#64748b" stroke-width="4"/><line x1="170" y1="184" x2="190" y2="184" stroke="#94a3b8" stroke-width="3"/><path d="M158 244 Q180 256 202 244" fill="none" stroke="#8c5843" stroke-width="4"/></svg>';
      const svg2 = '<svg viewBox="0 0 360 440" width="52" height="64" style="border:1px solid #6e2626;border-radius:6px;background:#140e0e;"><rect width="360" height="440" fill="#111613"/><path d="M68 440 C75 318, 285 318, 292 440 Z" fill="#f1f5f9" stroke="#94a3b8" stroke-width="4"/><rect x="230" y="344" width="30" height="44" rx="4" fill="#d99b82" stroke="#8c533e" stroke-width="3"/><ellipse cx="180" cy="195" rx="68" ry="86" fill="#f5d0ba"/><path d="M110 185 C108 102, 252 102, 250 185 C235 130, 125 130, 110 185 Z" fill="#5c3a21"/><circle cx="154" cy="190" r="6" fill="#3b2f2f"/><circle cx="206" cy="190" r="6" fill="#3b2f2f"/><path d="M164 238 Q173 232 180 237 Q187 232 196 238 Q180 250 164 238 Z" fill="#d97777"/></svg>';
      return `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #6e2626;text-align:center;font-size:11px;color:#d68a8a;"><div style="display:flex;justify-content:center;gap:12px;margin-bottom:5px;">${svg1}${svg2}</div><div>Авторы проекта — семейство эльфов</div><div style="font-size:10px;color:#b87474;">по мотивам произведений Артема Каменистого</div></div>`;
    }
  });

  if (typeof STIKS.loadDB === 'function') STIKS.loadDB();
  if (typeof STIKS.renderLobby === 'function') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => STIKS.renderLobby());
    else STIKS.renderLobby();
  }
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — ДОП. БЛОК 1 (ОПЕРАЦИИ ЛАВКИ И ТАЙНИКА)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    moveToStash(invIdx) {
      const hr = this.findHeroByUid(this.shopHeroUid);
      if (!hr || !hr.inv[invIdx]) return;
      const it = hr.inv[invIdx];
      hr.stash = Array.isArray(hr.stash) ? hr.stash : [];
      if (this.getStashWeight(hr) + (Number(it.w || 0) * Number(it.q || 1)) > 200) {
        this.log('❌ В личном тайнике недостаточно места (лимит 200 кг).');
        return;
      }
      hr.stash.push(hr.inv.splice(invIdx, 1).at(0));
      hr.stash = this.stackInventory(hr.stash);
      this.saveDB(); this.renderShopModal();
    },

    moveFromStash(stIdx) {
      const hr = this.findHeroByUid(this.shopHeroUid);
      if (!hr || !hr.stash || !hr.stash[stIdx]) return;
      hr.inv.push(hr.stash.splice(stIdx, 1).at(0));
      hr.inv = this.stackInventory(hr.inv);
      this.saveDB(); this.renderShopModal();
    },

    buyTraderItem(stIdx) {
      const hr = this.findHeroByUid(this.shopHeroUid);
      const stock = hr && this.ensureTraderStock(hr);
      const it = stock && stock[stIdx];
      if (!it) return;
      const price = this.calcItemPrice(it, hr);
      if (this._cleanSporans(hr) < price) { this.log(`❌ Нужно ${price} 🧬.`); return; }
      hr.spores = hr.sporans = hr.spores - price;
      hr.inv.push(JSON.parse(JSON.stringify(it)));
      hr.inv = this.stackInventory(hr.inv);
      stock.splice(stIdx, 1);
      this.saveDB();
      this.log(`🛒 Куплено: ${it.n} за ${price} 🧬.`);
      this.renderShopModal();
    },

    sellToTrader(invIdx) {
      const hr = this.findHeroByUid(this.shopHeroUid);
      const it = hr && hr.inv[invIdx];
      if (!it) return;
      const eq = hr.slots || {};
      if (Object.keys(eq).some(k => eq[k] && (eq[k] === it || (it.uid && eq[k].uid === it.uid)))) {
        this.log('🚫 Нельзя продать надетую вещь!');
        return;
      }
      const sellP = Math.max(1, Math.floor(this.calcItemPrice(it, hr) * 0.5));
      const nm = it.n || it.name || 'Предмет';
      this.consumeInvOne(hr, invIdx);
      hr.spores = hr.sporans = this._cleanSporans(hr) + sellP;
      this.saveDB();
      this.log(`💰 Продано: ${nm} за ${sellP} 🧬.`);
      this.renderShopModal();
    },

    toggleBarter(invIdx) {
      this.shopBarterSel = Array.isArray(this.shopBarterSel) ? this.shopBarterSel : [];
      const pos = this.shopBarterSel.indexOf(invIdx);
      if (pos !== -1) this.shopBarterSel.splice(pos, 1);
      else if (this.shopBarterSel.length < 2) this.shopBarterSel.push(invIdx);
      this.renderShopModal();
    },

    execBarter(traderIdx) {
      const hr = this.findHeroByUid(this.shopHeroUid);
      const stock = hr && this.ensureTraderStock(hr);
      const target = stock && stock[traderIdx];
      const sel = (this.shopBarterSel || []).slice().sort((a, b) => b - a);
      if (!target || sel.length !== 2 || !sel.every(i => hr.inv[i] && Number(hr.inv[i].rank || 1) === Number(target.rank || 1))) {
        this.log(`🔄 Выберите ровно 2 вещи того же ранга (${target ? target.rank : 1}) для обмена.`);
        return;
      }
      sel.forEach(i => this.consumeInvOne(hr, i));
      hr.inv.push(JSON.parse(JSON.stringify(target)));
      hr.inv = this.stackInventory(hr.inv);
      stock.splice(traderIdx, 1);
      this.shopBarterSel = [];
      this.saveDB();
      this.log(`🤝 Бартер 2→1 завершён: получено ${target.n}.`);
      this.renderShopModal();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — ДОП. БЛОК 2 (БОЕВАЯ ЛОГИКА BSIM_UI)
// ============================================================================
(function(global) {
  'use strict';
  const UI = global.BSIM_UI;

  Object.assign(UI, {
    getTargetsPool() {
      const st = global.STIKS_COMBAT_CORE.state;
      const alive = (st && st.enemies || []).filter(e => !e.dead);
      if (!alive.length) return [];
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
      const alive = st.enemies.filter(e => !e.dead);
      if (!alive.length) {
        st.finished = true; st.busy = false; st.activeId = '';
        this.log('🏆 <b>ПОБЕДА!</b> Все противники уничтожены!');
        this.renderStage();
        if (global.STIKS && typeof global.STIKS._onBsimVictory === 'function') global.STIKS._onBsimVictory(st);
        return true;
      }
      if (st.player.hp <= 0) {
        st.finished = true; st.busy = false; st.activeId = '';
        this.log('💀 <b>ПОРАЖЕНИЕ!</b> ' + st.player.name + ' пал в бою.');
        this.renderStage();
        if (global.STIKS && typeof global.STIKS._onBsimDefeat === 'function') global.STIKS._onBsimDefeat(st);
        return true;
      }
      return false;
    },

    async actAttack() {
      const st = global.STIKS_COMBAT_CORE.state;
      if (!st || st.busy || st.finished) return;
      const p = st.player;
      st.busy = true; st.activeId = 'u-player';
      this.renderStage();

      let reroll = true, combo = 0;
      while (reroll && combo < 5) {
        reroll = false; combo++;
        const pool = this.getTargetsPool();
        if (!pool.length) break;
        const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
        const isDouble = (d1 === d2), isCritLuck = (d1 === 1 && d2 === 1), isCritFail = (d1 === 6 && d2 === 6);
        if (isDouble) { global.STIKS.playDoubleSound(); global.STIKS_COMBAT_CORE.grantCombatXp('spi', 1); }
        if (isCritFail) {
          global.BSIM_AUDIO.playSfx('bite');
          this.popBack('u-player', true, '🎲 [6-6] ОСЕЧКА!');
          this.log('💀 Бросок <b>[6-6]</b>: срыв атаки / осечка!');
          await this.wait(1100);
          break;
        }
        const targets = pool.slice(0, Math.min(d1, pool.length));
        this.log(`🎲 <b>${p.name}</b> бросок <b>[${d1}-${d2}]</b> (целей: ${targets.length})${isCritLuck ? ' [1-1 КРИТ ×2!]' : (isDouble ? ' [ДУБЛЬ → ПЕРЕБРОС!]' : '')}`);
        for (let t = 0; t < targets.length; t++) {
          const trg = targets.at(t);
          if (trg.dead) continue;
          const mult = global.STIKS_COMBAT_CORE.getMult(p.weap.cls, trg.rank);
          const statAdd = Math.round(p.weap.isGun ? (p.stats.agi || 10) * 0.25 : (p.stats.str || 10) * 0.35);
          const kvazFlat = (p.heroRef && p.heroRef.isKvaz && !p.weap.isGun) ? Math.round(p.lvl * 1.5) : 0;
          const dmg = Math.max(1, Math.round((p.weap.dmg + d2 + statAdd + kvazFlat) * mult * (isCritLuck ? 2 : 1)));
          trg.hp = Math.max(0, trg.hp - dmg);
          if (trg.hp <= 0) trg.dead = true;
          global.STIKS_COMBAT_CORE.grantCombatXp(p.weap.isGun ? 'agi' : 'str', 1);
          global.BSIM_AUDIO.playSfx(p.weap.sfx);
          this.popBack('u-' + trg.id, false, '-' + dmg + (trg.dead ? ' 💀' : ''));
          this.log(`↳ ${p.weap.sound} <b>${trg.name}</b>: <b>-${dmg}</b> (ОЗ: ${trg.hp})`);
          this.renderStage();
          if (this.checkBattleEnd()) return;
          if (t < targets.length - 1) await this.wait(250);
        }
        await this.wait(900);
        if (isDouble) reroll = true;
      }
      if (this.checkBattleEnd()) return;
      await this.runEnemiesTurn();
    },

    actSkill() {
      const st = global.STIKS_COMBAT_CORE.state;
      if (!st || st.busy || st.finished || st.player.skillUsed) return;
      const p = st.player, pool = this.getTargetsPool();
      if (!pool.length) return;
      p.skillUsed = true;
      if (p.heroRef) {
        p.heroRef._skillSuccessUsed = p.heroRef.skillUnlocked = p.heroRef.skillRevealed = true;
        global.STIKS.syncHeroProfile(p.heroRef);
      }
      const trg = pool.at(0);
      const dmg = Math.round(p.weap.dmg * 1.2 + (p.stats.spi || 10) * 0.8);
      trg.hp = Math.max(0, trg.hp - dmg);
      if (trg.hp <= 0) trg.dead = true;
      if (!trg.dead) { if (trg.rank > p.rank) trg.debuff = 2; else trg.stun = 1; }
      global.STIKS_COMBAT_CORE.grantCombatXp('spi', 1);
      global.BSIM_AUDIO.playSfx('shout');
      global.STIKS.speakPhrase(p.heroRef, p.phrase);
      this.showSkillBanner(p.ico, p.skill, p.phrase);
      this.log(`🗣️ <b>${p.name}</b>: «<b>${p.phrase}</b>» → <b>[${p.skill}]</b>: <b>-${dmg}</b>!`);
      this.renderStage();
      this.checkBattleEnd();
    },

    async actLearned(idx) {
      const st = global.STIKS_COMBAT_CORE.state, S = global.STIKS;
      if (!st || st.busy || st.finished || !st.player.learned.at(idx)) return;
      const p = st.player, item = p.learned.at(idx), dar = S.DARS[item.darKey];
      if (!dar || item.usedRound || (item.maxCharges > 0 && item.charges <= 0)) return;
      const br = item.branchId ? (dar.branches || []).find(b => b.id === item.branchId) : null;
      const title = br ? br.name : dar.name;
      const pct = global.STIKS_COMBAT_CORE.calcMana(br ? br.mana1 : dar.mana1, br ? br.mana30 : dar.mana30, item.lvl);
      const cost = Math.floor(p.maxMana * (pct / 100));
      if (p.mana < cost) { this.log('❌ Недостаточно маны.'); return; }

      st.busy = true; p.mana -= cost;
      if (p.heroRef) p.heroRef.mana = p.mana;
      item.usedRound = true;
      if (item.maxCharges > 0) item.charges--;
      global.STIKS_COMBAT_CORE.grantCombatXp('spi', 1);
      global.BSIM_AUDIO.playSfx('dar');
      this.showSkillBanner('🧬', title, 'Активация Дара Улья!');
      const alive = st.enemies.filter(e => !e.dead);

      if (item.darKey === 'illusionist' && !item.branchId) {
        const cardDmg = Math.max(2, Math.round(4 + (p.stats.int || 10) * 0.16 + item.lvl * 0.65));
        for (let c = 0; c < 36; c++) {
          const cur = st.enemies.filter(e => !e.dead);
          if (!cur.length) break;
          const en = cur.at(Math.floor(Math.random() * cur.length));
          en.hp = Math.max(0, en.hp - cardDmg);
          if (en.hp <= 0) en.dead = true;
          if (c % 3 === 0) global.BSIM_AUDIO.playSfx('card');
          await this.wait(30);
        }
        this.log(`🃏 <b>[Иллюзионист: 36 карт]</b> (-${cost} м.): веер карт накрыл врагов!`);
      } else {
        const dmg = Math.round((45 + (p.stats.int || 10)) * (1 + item.lvl * 0.08));
        alive.forEach(en => {
          en.hp = Math.max(0, en.hp - dmg);
          if (en.hp <= 0) en.dead = true;
          if (!en.dead) { if (en.rank > p.rank) en.debuff = 2; else en.stun = 1; }
        });
        this.log(`🧬 Дар <b>[${title}]</b> (-${cost} м.): урон <b>-${dmg}</b> по врагам!`);
      }
      st.busy = false;
      this.renderStage();
      this.checkBattleEnd();
    },

    async runEnemiesTurn() {
      const st = global.STIKS_COMBAT_CORE.state, p = st.player;
      for (let i = 0; i < st.enemies.length; i++) {
        const en = st.enemies.at(i);
        if (en.dead) continue;
        st.activeId = 'u-' + en.id;
        this.renderStage();
        if (en.stun > 0) { en.stun--; this.log(`💫 <b>${en.name}</b> оглушён.`); await this.wait(900); continue; }
        if (en.dist > 0) { en.dist--; this.log(`🏃 <b>${en.name}</b> бежит вперёд (дист.: ${en.dist}).`); await this.wait(900); continue; }

        const deb = en.debuff > 0 ? 0.75 : 1;
        if (en.debuff > 0) en.debuff--;
        const raw = Math.max(1, Math.round(en.dmg * deb) - p.armFlat);
        const tankItem = p.learned.find(x => (x.darKey === 'tank' || (x.darKey === 'gigantism' && x.branchId === 'b1')) && x.charges > 0);
        if (tankItem && raw >= Math.ceil(p.maxHp * 0.1) && p.mana >= 3) {
          p.mana -= 3; if (p.heroRef) p.heroRef.mana = p.mana;
          tankItem.charges--;
          this.log(`🛡 Триггер <b>[Танк]</b> поглотил удар <b>${en.name}</b> за 3 маны!`);
        } else {
          p.hp = Math.max(0, p.hp - raw);
          if (p.heroRef) p.heroRef.hp = p.hp;
          global.STIKS_COMBAT_CORE.grantCombatXp('end', 1);
          global.BSIM_AUDIO.playSfx(en.sfx || 'bite');
          this.popBack('u-player', true, '-' + raw);
          this.log(`${en.sound} <b>${en.name}</b> бьёт: <b>-${raw} ОЗ</b> (${p.hp}/${p.maxHp})`);
        }
        this.renderStage();
        if (this.checkBattleEnd()) return;
        await this.wait(1000);
      }
      p.skillUsed = false;
      p.learned.forEach(item => { item.usedRound = false; });
      st.activeId = ''; st.busy = false; st.round++;
      this.renderStage();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — ДОП. БЛОК 3 (МОСТ БОЯ TRIGGER, FLEE И RENDER)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    attackCurrentCell() {
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players.at(s.activeIdx);
      const zHere = (s.zombies || []).find(z => z && z.x === p.x && z.y === p.y);
      if (!zHere) { this.log('👀 На текущей клетке нет противников.'); return; }
      zHere.hidden = false;
      if (zHere.isHuman) zHere.hostile = true;
      this.triggerEncounter(p, zHere);
    },

    triggerEncounter(p, zMarker) {
      const s = this.db.session;
      if (zMarker && zMarker.isHuman && !zMarker.hostile) {
        const aInfo = (this.ARCHETYPES && this.ARCHETYPES[zMarker.arch]) || { name: 'Выживший', img: 'img/kachok.jpeg' };
        s.humanEncounter = { zId: zMarker.id, arch: zMarker.arch || 'kachok', name: aInfo.name, img: aInfo.img || 'img/kachok.jpeg', lvl: Math.max(1, (p.lvl || 0) + 1) };
        this.log(`🧑 Встречен неагрессивный выживший: ${s.humanEncounter.name}.`);
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }

      const dQty = Math.floor(Math.random() * 6) + 1, dRank = Math.floor(Math.random() * 6) + 1;
      if (dQty === dRank) this.playDoubleSound();

      if (dQty === 6 && dRank === 6) {
        this.log('🎁 ДУБЛЬ «6-6»! Враг уже мёртв, на теле трофей!');
        s.zombies = s.zombies.filter(z => z.id !== zMarker.id);
        const bonus = this.genClusterItem('weapon', '762');
        if (this.canPickItem(p, bonus)) { p.inv.push(bonus); p.inv = this.stackInventory(p.inv); this.announceLoot(p, Array.of(bonus)); }
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }

      const isOneOne = (dQty === 1 && dRank === 1);
      let finalRank = isOneOne ? (s.diffKey === 'start' ? 4 : 9) : (dRank + (s.diffMod || 0) + (zMarker.rankMod || 0));
      if (finalRank <= -1) {
        this.log('💀 Встреченный заражённый уже мёртв.');
        s.zombies = s.zombies.filter(z => z.id !== zMarker.id);
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }

      const count = isOneOne ? 1 : dQty;
      const ranks = global.STIKS_COMBAT_CORE.Z_RANKS;
      const enemies = [];
      for (let i = 0; i < count; i++) {
        const rNum = Math.min(9, Math.max(0, i === 0 ? finalRank : Math.max(0, finalRank - 1)));
        const rInfo = ranks.at(rNum) || ranks.at(0);
        let lvl = rNum === 0 ? 0 : (Math.floor(Math.random() * (rInfo.maxLvl - rInfo.minLvl + 1)) + rInfo.minLvl);
        if (isOneOne && rNum === 4) lvl = Math.max(20, lvl);
        enemies.push({ name: rInfo.name + (count > 1 ? ' #' + (i + 1) : ''), rank: rNum, lvl, hp: rInfo.hp, maxHp: rInfo.hp, dmg: rInfo.dmg, isHuman: Boolean(zMarker && zMarker.isHuman) });
      }

      s.combat = { zId: zMarker.id, enemies };
      global.STIKS_COMBAT_CORE.startFromHero(p, enemies, zMarker.id);
      this.log(`⚔️ БОЙ! Противников: ${enemies.length} (Лидер: ${enemies.at(0).name}, Ур.${enemies.at(0).lvl})`);
      this.renderCombat();
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
        this.saveDB();
        if (this.renderGame) this.renderGame();
        return;
      }
      if (zMarker) zMarker.hostile = true;
      const enemies = [{ name: enc.name, rank: 1, lvl: enc.lvl || 2, hp: 36 + (enc.lvl || 2) * 8, maxHp: 36 + (enc.lvl || 2) * 8, dmg: 6 + (enc.lvl || 2) * 2, isHuman: true }];
      s.combat = { zId: enc.zId, enemies };
      global.STIKS_COMBAT_CORE.startFromHero(p, enemies, enc.zId);
      this.renderCombat();
    },

    renderCombat() {
      this.ensureStaticLabels();
      if (global.BSIM_UI && typeof global.BSIM_UI.renderStage === 'function') {
        global.BSIM_UI.renderStage();
      }
    },

    combatFlee() {
      const s = this.db && this.db.session;
      const st = global.STIKS_COMBAT_CORE.state;
      if (!s || !st || st.busy || st.finished) return;
      const p = s.players.at(s.activeIdx);
      const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
      if (d1 === d2) this.playDoubleSound();
      if (d1 + d2 + Math.floor((p.stats.spd || 10) / 10) >= 9) {
        this.log(`🏃 Успешный побег [${d1}+${d2}]!`);
        s.combat = null; global.STIKS_COMBAT_CORE.state = null;
        this.saveDB();
        if (this.renderGame) this.renderGame();
      } else {
        global.BSIM_UI.log(`❌ Побег сорвался [${d1}+${d2}]! Враги атакуют!`);
        st.busy = true;
        global.BSIM_UI.runEnemiesTurn();
      }
    },

    closeCombatModal() {
      const s = this.db && this.db.session;
      if (!s) return;
      s.combat = null;
      global.STIKS_COMBAT_CORE.state = null;
      this.saveDB();
      if (this.renderGame) this.renderGame();
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// S-T-I-K-S // ЯДРО v1.9.0 — ДОП. БЛОК 4 (ИГРОВОЙ ЭКРАН И КАРТА 9x9)
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  Object.assign(STIKS, {
    toggleProfile() { this.profileOpen = !this.profileOpen; if (this.profileOpen) this.invOpen = false; if (this.renderGame) this.renderGame(); },
    toggleInv() { this.invOpen = !this.invOpen; if (this.invOpen) this.profileOpen = false; if (this.renderGame) this.renderGame(); },

    useWeirdSkill() {
      const s = this.db && this.db.session;
      if (!s || s.combat) return;
      const p = s.players.at(s.activeIdx);
      if (!p) return;
      if (p.asInfected || p.isInfected) { this.log('☣️ Инстинкты Улья подавляют человеческие привычки.'); return; }
      const aInfo = (this.ARCHETYPES && this.ARCHETYPES[p.arch]) || { skill: 'Особый навык', hint: 'Персонаж прислушивается к себе.' };
      if (this.isRealSkillUnlocked(p)) {
        this.log(`✨ Навык [${aInfo.skill}] раскрыт и готов к применению в бою.`);
        this.speakPhrase(p, aInfo.phrase || aInfo.skill);
      } else {
        this.log(`🤪 ${aInfo.hint} (проявится в бою)`);
        this.speakPhrase(p, aInfo.hint);
      }
      if (this.renderGame) this.renderGame();
    },

    renderGame() {
      this.ensureStaticLabels();
      const vp = document.getElementById('game-viewport');
      const s = this.db && this.db.session;
      if (!vp || !s) return;
      if (s.combat) { this.renderCombat(); return; }

      const p = s.players.at(s.activeIdx);
      if (!p) return;
      this.normalizePlayerStats(p);
      const carry = this.getCarryInfo(p);
      const archKey = p.isKvaz ? 'kvaz' : ((p.asInfected || p.isInfected) ? 'infected' : p.arch);
      const aInfo = (this.ARCHETYPES && this.ARCHETYPES[archKey]) || { name: p.arch, skill: 'Навык' };
      const skillLabel = (p.asInfected || p.isInfected) ? '☣️ Инстинкты Улья' : (this.isRealSkillUnlocked(p) ? `✨ ${aInfo.skill}` : '🤪 Что-то учудить');
      const sporeLabel = this.isRealSporeUnlocked(p) ? '☣️ Споровый баланс:' : '🤒 Загадочный недуг:';
      const bIcons = { 'Скала': '⛰️', 'Водоем': '🌊', 'Руины': '🏚️', 'Обрыв': '🕳️', 'Пожар': '🔥' };
      const lIcons = { weapon: '🔫', armor: '🛡️', supply: '🎒' };

      let h = '<div style="display:flex;flex-direction:column;gap:8px;font-size:11px;">';
      h += `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #6e2626;padding-bottom:4px;"><div><b>${p.family} ${p.name}</b> (Ур.${p.lvl || 0}) [${p.x + 1}:${p.y + 1}]</div><div style="display:flex;align-items:center;gap:6px;"><span>Ход:${s.turn} | ОХ:<b>${p.stepsLeft}/${p.maxAp}</b></span><button class="btn" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.pauseToLobby()">🏕 Лобби</button></div></div>`;

      h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#140e0e;padding:6px;border:1px solid #6e2626;">';
      h += `<div>❤️ ОЗ: <b>${p.hp}/${p.maxHp}</b></div><div>🍖 Сыт: <b>${p.food}</b></div><div>💧 Жаж: <b>${p.water}</b></div>`;
      h += `<div>⚡ Бодр: <b>${p.stamina}</b></div><div>${sporeLabel} <b>${Math.round(p.spore || 0)}</b></div><div>🔮 Мана: <b>${p.mana}/${p.maxMana}</b></div></div>`;

      h += '<div style="display:grid;grid-template-columns:repeat(9,1fr);gap:2px;background:#080a09;padding:4px;border:1px solid #6e2626;">';
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const gx = p.x + dx, gy = p.y + dy;
          let bg = '#131815', sym = '', col = '#3d4f44', extra = '';
          if (gx < 0 || gx > 59 || gy < 0 || gy > 59) { bg = '#132419'; sym = '🚪'; col = '#6ee794'; extra = 'border:1px dashed #3d8b57;'; }
          else {
            const cell = s.grid[gy][gx];
            const zHere = s.zombies.find(z => z.x === gx && z.y === gy && !z.hidden);
            const pHere = s.players.find(pl => pl.x === gx && pl.y === gy && !pl.dead && !pl.escaped);
            if (pHere) { bg = '#2d4a38'; sym = (pHere.asInfected || pHere.isInfected) ? '☣️' : '🧍'; col = '#e6f5eb'; }
            else if (zHere) { bg = zHere.isHuman ? '#2b2614' : '#3b1818'; sym = zHere.isHuman ? '🧑' : '🧟'; col = zHere.isHuman ? '#e6c86e' : '#ff7a7a'; }
            else if (cell.blocked) { bg = '#1f2421'; sym = bIcons[cell.bType] || '⛰️'; col = '#687a6e'; }
            else if (cell.lootType) { bg = cell.valuable ? '#241c30' : '#18242b'; sym = cell.valuable ? '💎' : (lIcons[cell.lootType] || '📦'); col = cell.valuable ? '#c49eff' : '#7ab8e6'; }
          }
          h += `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:${bg};color:${col};font-size:13px;border-radius:2px;${extra}">${sym}</div>`;
        }
      }
      h += '</div>';

      const zOnCell = (s.zombies || []).find(z => z && z.x === p.x && z.y === p.y);
      if (zOnCell) h += `<button class="btn btn-danger" style="width:100%;padding:7px;font-weight:bold;" onclick="STIKS.attackCurrentCell()">⚔️ Напасть на цель на клетке</button>`;

      h += `<div style="display:flex;gap:4px;"><button class="btn ${p.moveMode === 'careful' ? 'btn-primary' : ''}" style="font-size:10px;" onclick="STIKS.setMoveMode('careful')">Внимат. (3)</button><button class="btn ${p.moveMode === 'fast' ? 'btn-primary' : ''}" style="font-size:10px;" onclick="STIKS.setMoveMode('fast')">Быстро (2)</button><button class="btn ${p.moveMode === 'run' ? 'btn-primary' : ''}" style="font-size:10px;" onclick="STIKS.setMoveMode('run')">Бегом (1)</button></div>`;
      h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;"><div></div><button class="btn" onclick="STIKS.stepPlayer(0,-1)">⬆</button><div></div><button class="btn" onclick="STIKS.stepPlayer(-1,0)">⬅</button><button class="btn btn-primary" onclick="STIKS.searchCell(false)">🔍 Поиск (3)</button><button class="btn" onclick="STIKS.stepPlayer(1,0)">➡</button><div></div><button class="btn" onclick="STIKS.stepPlayer(0,1)">⬇</button><div></div></div>';
      h += `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;"><button class="btn" onclick="STIKS.toggleInv()">🎒 Вещи (${p.inv.length} • ${carry.rawPct}%)</button><button class="btn" onclick="STIKS.useWeirdSkill()">${skillLabel}</button><button class="btn" onclick="STIKS.toggleProfile()">👤 Параметры</button><button class="btn btn-primary" onclick="STIKS.nextTurn()">⏭ Конец хода</button></div>`;
      h += this.renderGameExtras(p, s, aInfo);
      vp.innerHTML = h + '</div>';
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// >>> ФИНАЛЬНЫЙ ФИКСЕР ЯДРА v1.9.0 (ВСТАВИТЬ В САМЫЙ КОНЕЦ ВМЕСТО ДОП. БЛОКА 5) <<<
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;

  STIKS.LVL_TABLE = Array.of(
    60, 68, 76, 84, 92, 100, 110, 121, 132, 145, 159,
    175, 192, 211, 231, 255, 279, 307, 338, 372, 409,
    449, 493, 541, 594, 653, 718, 790, 869, 955, 1051,
    1155, 1269, 1397, 1535, 1687, 1855, 2039, 2245, 2469, 2717,
    2989, 3287, 3615, 3975, 4373, 4811, 5291, 5819, 6402, 7042,
    7746, 8521, 9375, 10312, 11344, 12479, 13727, 15102, 16613, 18276
  );

  STIKS.checkThresholdAwakening = function(hero) {
    if (!hero) return null;
    this.bindHeroCompat(hero);
    const lvl = Number(hero.lvl || 0);
    const isInf = Boolean(hero.isInfected || hero.asInfected);
    const schedule = isInf
      ? Array.of(20, 21, 31, 37, 41, 50, 61)
      : Array.of(15, 30, 45, 60);
    hero.awakenedThresholds = hero.awakenedThresholds || {};
    const pending = schedule.filter(th => lvl >= th && !hero.awakenedThresholds[String(th)]);
    if (!pending.length) return null;
    let last = null;
    pending.forEach(th => {
      hero.awakenedThresholds[String(th)] = true;
      last = this.rollHiveRoulette(hero, 'threshold', 1);
    });
    return last;
  };

  if (typeof STIKS.loadDB === 'function') STIKS.loadDB();
  if (typeof STIKS.renderLobby === 'function') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => STIKS.renderLobby());
    } else {
      STIKS.renderLobby();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// >>> ОБНОВЛЕНИЕ ОКНА КАРТЫ НА 11x11 (ДОБАВИТЬ В САМЫЙ КОНЕЦ СПИСКА) <<<
// ============================================================================
(function(global) {
  'use strict';
  const STIKS = global.STIKS;
  if (!STIKS) return;

  STIKS.renderGame = function() {
    this.ensureStaticLabels();
    const vp = document.getElementById('game-viewport');
    const s = this.db && this.db.session;
    if (!vp || !s) return;
    if (s.combat) { this.renderCombat(); return; }

    const p = s.players.at(s.activeIdx);
    if (!p) return;
    this.normalizePlayerStats(p);
    const carry = this.getCarryInfo(p);
    const archKey = p.isKvaz ? 'kvaz' : ((p.asInfected || p.isInfected) ? 'infected' : p.arch);
    const aInfo = (this.ARCHETYPES && this.ARCHETYPES[archKey]) || { name: p.arch, skill: 'Навык' };
    const skillLabel = (p.asInfected || p.isInfected) ? '☣️ Инстинкты Улья' : (this.isRealSkillUnlocked(p) ? `✨ ${aInfo.skill}` : '🤪 Что-то учудить');
    const sporeLabel = this.isRealSporeUnlocked(p) ? '☣️ Споровый баланс:' : '🤒 Загадочный недуг:';
    const bIcons = { 'Скала': '⛰️', 'Водоем': '🌊', 'Руины': '🏚️', 'Обрыв': '🕳️', 'Пожар': '🔥' };
    const lIcons = { weapon: '🔫', armor: '🛡️', supply: '🎒' };

    let h = '<div style="display:flex;flex-direction:column;gap:8px;font-size:11px;">';
    h += `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #6e2626;padding-bottom:4px;"><div><b>${p.family} ${p.name}</b> (Ур.${p.lvl || 0}) [${p.x + 1}:${p.y + 1}]</div><div style="display:flex;align-items:center;gap:6px;"><span>Ход:${s.turn} | ОХ:<b>${p.stepsLeft}/${p.maxAp}</b></span><button class="btn" style="width:auto;padding:3px 7px;font-size:10px;" onclick="STIKS.pauseToLobby()">🏕 Лобби</button></div></div>`;

    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#140e0e;padding:6px;border:1px solid #6e2626;">';
    h += `<div>❤️ ОЗ: <b>${p.hp}/${p.maxHp}</b></div><div>🍖 Сыт: <b>${p.food}</b></div><div>💧 Жаж: <b>${p.water}</b></div>`;
    h += `<div>⚡ Бодр: <b>${p.stamina}</b></div><div>${sporeLabel} <b>${Math.round(p.spore || 0)}</b></div><div>🔮 Мана: <b>${p.mana}/${p.maxMana}</b></div></div>`;

    h += '<div style="display:grid;grid-template-columns:repeat(11,1fr);gap:2px;background:#080a09;padding:4px;border:1px solid #6e2626;">';
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const gx = p.x + dx, gy = p.y + dy;
        let bg = '#131815', sym = '', col = '#3d4f44', extra = '';
        if (gx < 0 || gx > 59 || gy < 0 || gy > 59) { bg = '#132419'; sym = '🚪'; col = '#6ee794'; extra = 'border:1px dashed #3d8b57;'; }
        else {
          const cell = s.grid[gy][gx];
          const zHere = s.zombies.find(z => z.x === gx && z.y === gy && !z.hidden);
          const pHere = s.players.find(pl => pl.x === gx && pl.y === gy && !pl.dead && !pl.escaped);
          if (pHere) { bg = '#2d4a38'; sym = (pHere.asInfected || pHere.isInfected) ? '☣️' : '🧍'; col = '#e6f5eb'; }
          else if (zHere) { bg = zHere.isHuman ? '#2b2614' : '#3b1818'; sym = zHere.isHuman ? '🧑' : '🧟'; col = zHere.isHuman ? '#e6c86e' : '#ff7a7a'; }
          else if (cell.blocked) { bg = '#1f2421'; sym = bIcons[cell.bType] || '⛰️'; col = '#687a6e'; }
          else if (cell.lootType) { bg = cell.valuable ? '#241c30' : '#18242b'; sym = cell.valuable ? '💎' : (lIcons[cell.lootType] || '📦'); col = cell.valuable ? '#c49eff' : '#7ab8e6'; }
        }
        h += `<div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:${bg};color:${col};font-size:11px;border-radius:2px;${extra}">${sym}</div>`;
      }
    }
    h += '</div>';

    const zOnCell = (s.zombies || []).find(z => z && z.x === p.x && z.y === p.y);
    if (zOnCell) h += `<button class="btn btn-danger" style="width:100%;padding:7px;font-weight:bold;" onclick="STIKS.attackCurrentCell()">⚔️ Напасть на цель на клетке</button>`;

    h += `<div style="display:flex;gap:4px;"><button class="btn ${p.moveMode === 'careful' ? 'btn-primary' : ''}" style="font-size:10px;" onclick="STIKS.setMoveMode('careful')">Внимат. (3)</button><button class="btn ${p.moveMode === 'fast' ? 'btn-primary' : ''}" style="font-size:10px;" onclick="STIKS.setMoveMode('fast')">Быстро (2)</button><button class="btn ${p.moveMode === 'run' ? 'btn-primary' : ''}" style="font-size:10px;" onclick="STIKS.setMoveMode('run')">Бегом (1)</button></div>`;
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;"><div></div><button class="btn" onclick="STIKS.stepPlayer(0,-1)">⬆</button><div></div><button class="btn" onclick="STIKS.stepPlayer(-1,0)">⬅</button><button class="btn btn-primary" onclick="STIKS.searchCell(false)">🔍 Поиск (3)</button><button class="btn" onclick="STIKS.stepPlayer(1,0)">➡</button><div></div><button class="btn" onclick="STIKS.stepPlayer(0,1)">⬇</button><div></div></div>';
    h += `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;"><button class="btn" onclick="STIKS.toggleInv()">🎒 Вещи (${p.inv.length} • ${carry.rawPct}%)</button><button class="btn" onclick="STIKS.useWeirdSkill()">${skillLabel}</button><button class="btn" onclick="STIKS.toggleProfile()">👤 Параметры</button><button class="btn btn-primary" onclick="STIKS.nextTurn()">⏭ Конец хода</button></div>`;
    h += this.renderGameExtras(p, s, aInfo);
    vp.innerHTML = h + '</div>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
