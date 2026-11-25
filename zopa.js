// ============================================================================
// ZOPA.JS // МОДУЛЬ 1/10: БАЗА ДАННЫХ, СЕЙВЫ ФАМИЛИЙ, ЗВУК И БАЗОВЫЕ УТИЛИТЫ
// ============================================================================
(function(global) {
  'use strict';

  const S = global.STIKS = {
    version: '2.3.0',
    DB_KEY: 'stiks_dev_v2_db',
    BACKUP_KEY: 'stiks_dev_v2_db_backup',
    voiceOn: true,
    squad: [],
    activeFamily: '',
    db: { families: {}, session: null, stash: [], codex: { archive: [] } },
    ARCHETYPES: {},
    DARS: {},
    ARCH_SHAME_AMULETS: [],
    SHAME_CARDS: [],

    log(msg) {
      const b = document.getElementById('sys-log');
      if (b) b.innerHTML = '&gt; ' + msg + '<br>' + b.innerHTML;
    },

    _round100(n) { return Math.round((Number(n) || 0) * 100) / 100; },

    _getAudioCtx() {
      if (!this._audioCtx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (AC) this._audioCtx = new AC();
      }
      if (this._audioCtx && this._audioCtx.state === 'suspended') {
        this._audioCtx.resume().catch(() => {});
      }
      return this._audioCtx;
    },

    playTone(freq, dur, type, vol) {
      const ctx = this._getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(freq || 220, now);
      g.gain.setValueAtTime(vol || 0.08, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + (dur || 0.15));
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + (dur || 0.15) + 0.01);
    },

    playDoubleSound() {
      this.playTone(523.25, 0.12, 'triangle', 0.12);
      setTimeout(() => this.playTone(659.25, 0.18, 'triangle', 0.14), 110);
    },

    speak(text) {
      if (!this.voiceOn || !('speechSynthesis' in global)) return;
      try {
        global.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text || '').replace(/<[^>]+>/g, ''));
        u.lang = 'ru-RU'; u.rate = 1.05;
        global.speechSynthesis.speak(u);
      } catch (e) {}
    },

    toggleVoice() {
      this.voiceOn = !this.voiceOn;
      const btn = document.getElementById('btn-voice-toggle');
      if (btn) btn.innerText = this.voiceOn ? '🔊 Озвучка: ВКЛ' : '🔇 Озвучка: ВЫКЛ';
      if (!this.voiceOn && 'speechSynthesis' in global) global.speechSynthesis.cancel();
    },

    saveDB() {
      try {
        const ser = JSON.stringify(this.db);
        localStorage.setItem(this.DB_KEY, ser);
        if (this.db && this.db.families && Object.keys(this.db.families).length) {
          localStorage.setItem(this.BACKUP_KEY, ser);
        }
      } catch (e) {}
    },

    loadDB() {
      try {
        const raw = localStorage.getItem(this.DB_KEY) || localStorage.getItem(this.BACKUP_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.db = Object.assign({ families: {}, session: null, stash: [], codex: { archive: [] } }, parsed);
          }
        }
      } catch (e) {}
      this.db.families = this.db.families || {};
      this.db.stash = Array.isArray(this.db.stash) ? this.db.stash : [];
      this.db.codex = this.db.codex || { archive: [] };
      const fams = Object.keys(this.db.families);
      if (!this.activeFamily || !this.db.families[this.activeFamily]) this.activeFamily = fams[0] || '';
    },

    cloneFromProd() {
      const raw = localStorage.getItem('stiks_prod_db');
      if (!raw) { this.log('⚠️ В рабочей базе пока нет сохранений.'); return; }
      localStorage.setItem(this.DB_KEY, raw);
      this.loadDB();
      if (this.renderLobby) this.renderLobby();
      this.log('✅ Персонажи скопированы из проды в zopa.js v2.3!');
    },

    exportSave() {
      this.saveDB();
      const blob = new Blob([JSON.stringify(this.db, null, 2)], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'stiks_families_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      this.log('💾 Файл фамилий сохранён (.json).');
    },

    importSave(inp) {
      const f = inp && inp.files && inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = e => {
        try {
          const obj = JSON.parse(String(e.target.result || ''));
          if (!obj || typeof obj !== 'object' || !obj.families) throw new Error('Неверный формат файла фамилий');
          this.db = Object.assign({ families: {}, session: null, stash: [], codex: { archive: [] } }, obj);
          this.saveDB(); this.loadDB();
          if (this.renderLobby) this.renderLobby();
          this.log('📂 База фамилий загружена.');
        } catch (err) { alert('Ошибка: ' + err.message); }
        inp.value = '';
      };
      r.readAsText(f);
    },

    findHeroByUid(uid) {
      for (const fam of Object.keys(this.db.families || {})) {
        const found = (this.db.families[fam] || []).find(h => h && h.uid === uid);
        if (found) return found;
      }
      return null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 2/10: СТАТЫ, КАРТОЧКА ПРОФИЛЯ, КВАЗ/ЗАРАЖЁННЫЙ И ИНТРО
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  const HUMAN_ARCH_POOL = [
    'surgeon', 'asiat', 'schoolgirl', 'nanny', 'alkash', 'cashier',
    'gigolo', 'tatan', 'prof', 'psih', 'strip', 'vet', 'kachok'
  ];

  S.normalizePlayerStats = function(p) {
    if (!p) return;
    const C = global.STIKS_CONTENT;
    const B = (C && C.BALANCE) || {};
    p.stats = Object.assign({ str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 }, p.stats || {});
    p.inv = Array.isArray(p.inv) ? p.inv : [];
    p.slots = p.slots || p.equip || { main: null, side: null, melee: null, armor: null, bag: null, talisman: null };
    p.equip = p.slots;
    p.gifts = p.gifts || {};
    p.freePoints = Math.max(0, Number(p.freePoints) || 0);

    const endVal = Number(p.stats.end || 10);
    const spiVal = Number(p.stats.spi || 10);
    const spdVal = Number(p.stats.spd || 10);
    const isKvaz = Boolean(p.isKvaz || String(p.arch || '').includes('kvaz'));

    p.maxHp = Math.max(12, Math.round(((B.baseHp || 14) + endVal * (B.hpPerEnd || 1.35)) * (isKvaz ? (B.kvazHpMult || 1.5) : 1)));
    p.maxMana = Math.max(15, Math.round(((B.baseMana || 15) + spiVal * (B.manaPerSpi || 2.2)) * (isKvaz ? (B.kvazManaMult || 0.6) : 1)));
    p.maxFood = p.maxFood || 50;
    p.maxWater = p.maxWater || 50;
    p.maxSpore = p.maxSpore || 50;

    if (typeof p.hp !== 'number' || p.hp > p.maxHp) p.hp = p.maxHp;
    if (typeof p.mana !== 'number' || p.mana > p.maxMana) p.mana = p.maxMana;
    if (typeof p.food !== 'number') p.food = p.maxFood;
    if (typeof p.water !== 'number') p.water = p.maxWater;
    if (typeof p.spore !== 'number') p.spore = p.maxSpore;

    const towPen = (p.towingCar ? 1 : 0) + (p.carryingCrown ? 1 : 0);
    p.maxAp = Math.max(2, (B.baseAp || 6) + Math.floor(spdVal / (B.spdPerBonusAp || 50)) - towPen);
    if (typeof p.stepsLeft !== 'number' || p.stepsLeft > p.maxAp) p.stepsLeft = p.maxAp;
  };

  S.getCarryInfo = function(p) {
    const C = global.STIKS_CONTENT;
    const strVal = Number((p && p.stats && p.stats.str) || 10);
    const bagBonus = (p && p.slots && p.slots.bag) ? Number(p.slots.bag.bag || p.slots.bag.cap || 0) : 0;
    const isInf = Boolean(p && (p.isInfected || p.asInfected || p.arch === 'legend_z') && !p.isKvaz);
    const maxW = Math.round((20 + strVal * 2 + bagBonus) * (isInf ? 3 : 1));
    let curW = 0;
    (p && p.inv || []).forEach(it => {
      const w = (C && C.getItemWeight) ? C.getItemWeight(it) : Number(it.w || 0);
      curW += w * Math.max(1, Number(it.q || 1));
    });
    Object.values((p && p.slots) || {}).forEach(it => {
      if (it) curW += (C && C.getItemWeight) ? C.getItemWeight(it) : Number(it.w || 0);
    });
    curW = this._round100(curW);
    const pct = Math.round((curW / Math.max(1, maxW)) * 100);
    return { cur: curW, max: maxW, pct, blocked: curW > maxW, mult: pct > 80 ? 2 : 1 };
  };

  S.spendFreeStat = function(uid, statKey) {
    const hr = this.findHeroByUid(uid);
    if (!hr || (hr.freePoints || 0) <= 0 || !hr.stats) return;
    hr.freePoints--;
    hr.stats[statKey] = (hr.stats[statKey] || 10) + 1;
    hr.lvl = (hr.lvl || 0) + 1;
    this.normalizePlayerStats(hr);
    this.saveDB();
    this.openHeroSheet(uid);
  };

  S.showNoviceIntro = function(hero, archObj) {
    const old = document.getElementById('stiks-intro-overlay');
    if (old) old.remove();

    const frames = [
      {
        title: 'КАДР 1 // ПЕРЕЗАГРУЗКА УЛЬЯ',
        text: `Сирена перезагрузки смолкла. <b>${hero.name}</b> открывает глаза на холодном бетоне незнакомого кластера. В голове гудит пустота, в воздухе висит серая споровая взвесь...`
      },
      {
        title: 'КАДР 2 // ПРОБУЖДЕНИЕ СУТИ',
        text: `${archObj.hint || 'Мышечная память сама подсказывает, как выжить.'}<br><br>Улей определил вашу суть: <b>${archObj.ico || '👤'} ${archObj.name}</b><br>Уникальный навык: <b>[${archObj.skill}]</b>`
      },
      {
        title: 'КАДР 3 // ПЕРВЫЙ ШАГ В СТИКС',
        text: `В руках зажат <b>[P1] Охотничий нож</b>, в подсумке — базовый бинт. Пора выбираться к периметру и искать спораны.`
      }
    ];

    let step = 0;
    const ov = document.createElement('div');
    ov.id = 'stiks-intro-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:#060807;z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;font-family:monospace;color:#e6f2ea;';
    const renderFrame = () => {
      const f = frames[step];
      ov.innerHTML =
        `<div style="width:100%;max-width:400px;background:#111613;border:2px solid #38bdf8;border-radius:8px;padding:14px;">` +
        `<div style="color:#7dd3fc;font-weight:bold;font-size:12px;margin-bottom:8px;">${f.title} (${step + 1}/3)</div>` +
        `<div style="font-size:12px;line-height:1.5;color:#d6e5db;min-height:105px;margin-bottom:12px;">${f.text}</div>` +
        `<div style="display:flex;gap:6px;">` +
        (step < 2
          ? `<button id="btn-intro-next" class="btn btn-primary" style="flex:1;">Далее ▶</button>`
          : `<button id="btn-intro-done" class="btn btn-ok" style="flex:1;">⚔️ Вступить в Улей</button>`) +
        `</div></div>`;
      const bNext = document.getElementById('btn-intro-next');
      if (bNext) bNext.onclick = () => { step++; renderFrame(); };
      const bDone = document.getElementById('btn-intro-done');
      if (bDone) bDone.onclick = () => { ov.remove(); S.renderLobby(); };
    };
    document.body.appendChild(ov);
    renderFrame();
  };

  S.createNewHero = function() {
    const C = global.STIKS_CONTENT;
    const fam = (document.getElementById('zopa-fam-inp') || {}).value.trim() || this.activeFamily || 'Эльфы';
    const name = (document.getElementById('zopa-name-inp') || {}).value.trim();
    const sex = (document.getElementById('zopa-sex-sel') || {}).value || 'm';
    if (!name) { this.log('⚠️ Введите имя нового бойца!'); return; }

    const archMap = (C && C.ARCHETYPES) || this.ARCHETYPES || {};
    const validPool = HUMAN_ARCH_POOL.filter(k => {
      const a = archMap[k];
      return a && (!a.sex || a.sex === 'both' || a.sex === sex);
    });
    const archKey = validPool[Math.floor(Math.random() * validPool.length)] || 'kachok';
    const arch = archMap[archKey] || { name: 'Выживший', ico: '👤', skill: 'Рывок', stats: { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 } };

    const hero = {
      uid: 'h_' + Date.now() + '_' + Math.floor(Math.random() * 999),
      name, family: fam, sex, arch: archKey, lvl: 0, sporans: 10, freePoints: 0,
      isInfected: false, isKvaz: false,
      stats: Object.assign({}, arch.stats),
      inv: [{ id: 'med_1', n: '[P1] Базовая аптечка', cat: 'med', heal: 30, w: 0.3, q: 1, desc: 'Восстанавливает 30 ОЗ.' }],
      slots: {
        main: null, side: null,
        melee: { id: 'ml_r1', n: '[P1] Охотничий нож', cat: 'melee', slot: 'melee', rank: 1, a: 9, w: 0.5, desc: 'Надёжный клинок 1-го ранга.' },
        armor: null, bag: null, talisman: null
      },
      gifts: {}
    };

    this.normalizePlayerStats(hero);
    this.db.families[fam] = this.db.families[fam] || [];
    this.db.families[fam].push(hero);
    this.activeFamily = fam;
    this.saveDB();
    this.showNoviceIntro(hero, arch);
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 3А/10: ОТРЯД, УДАЛЕНИЕ, ДОСТУП К КАРТАМ И ПРОФИЛЬ БОЙЦА
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.toggleSquadHero = function(uid) {
    const idx = this.squad.indexOf(uid);
    if (idx >= 0) this.squad.splice(idx, 1);
    else if (this.squad.length < 6) this.squad.push(uid);
    this.renderLobby();
  };

  S.deleteHero = function(uid) {
    for (const fam of Object.keys(this.db.families || {})) {
      const arr = this.db.families[fam] || [];
      const idx = arr.findIndex(h => h && h.uid === uid);
      if (idx >= 0) {
        const rem = arr.splice(idx, 1);
        if (!arr.length) delete this.db.families[fam];
        this.squad = this.squad.filter(id => id !== uid);
        this.saveDB();
        this.log(`🗑️ Боец <b>${rem.name}</b> удалён из базы.`);
        this.renderLobby();
        return;
      }
    }
  };

  S.resetDevDatabase = function() {
    this.db = { families: {}, session: null, stash: [], codex: { archive: [] } };
    this.squad = [];
    this.activeFamily = '';
    try {
      localStorage.removeItem(this.DB_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
    } catch (e) {}
    this.renderLobby();
    this.log('🧹 База DEV полностью очищена!');
  };

  S.getUnlockedMapsForSquad = function(sqHeroes) {
    const maxLvl = Math.max(0, ...sqHeroes.map(h => Number(h.lvl) || 0));
    const hasJunk = sqHeroes.some(h => h.carQuest && h.carQuest.stage && h.carQuest.stage !== 'done');
    const hasCem = sqHeroes.some(h => h.packQuest && h.packQuest.stage && h.packQuest.stage !== 'done');
    const hasRide = sqHeroes.some(h => (h.garage && h.garage.car) || (h.packPen && h.packPen.pack));

    const list = [{ key: 'start', label: '▶ Начальная', cls: 'btn-ok' }];
    if (maxLvl >= 1)  list.push({ key: 'easy', label: '🌿 Лёгкая', cls: '' });
    if (maxLvl >= 10) list.push({ key: 'norm', label: '⚖️ Средняя', cls: '' });
    if (maxLvl >= 25) list.push({ key: 'hard', label: '⚠️ Тяжёлая', cls: '' });
    if (maxLvl >= 40) list.push({ key: 'hell', label: '🔥 Пекло', cls: 'btn-primary' });

    if (hasJunk) list.push({ key: 'junkyard', label: '🚗 Автосвалка (КВ)', cls: 'btn-primary' });
    if (hasCem)  list.push({ key: 'cemetery', label: '🪦 Кладбище (КВ)', cls: 'btn-primary' });
    if (hasRide) {
      list.push({ key: 'far1', label: '🧭 Дальний +1', cls: '' });
      list.push({ key: 'far2', label: '☢️ Дальний +2', cls: 'btn-primary' });
    }
    return list;
  };

  S.openHeroSheet = function(uid) {
    const vp = document.getElementById('game-viewport');
    const C = global.STIKS_CONTENT;
    const hr = this.findHeroByUid(uid);
    if (!vp || !hr) return;
    this.normalizePlayerStats(hr);
    const ci = this.getCarryInfo(hr);
    const arch = (C && C.ARCHETYPES[hr.arch]) || { name: hr.arch, ico: '👤', skill: '—' };

    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #38bdf8;padding-bottom:5px;margin-bottom:6px;">` +
      `<b style="color:#7dd3fc;">${arch.ico} ${hr.name} [${hr.family}] • Ур.${hr.lvl || 0}</b>` +
      `<button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.renderLobby()">◀ Лобби</button></div>` +
      `<div style="font-size:10.5px;color:#cbd5e1;margin-bottom:6px;">Суть: <b>${arch.name}</b> • Навык: <b>${arch.skill}</b> • 💎 ${hr.sporans || 0} • ⚖️ ${ci.cur}/${ci.max} кг</div>`;

    h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;border-radius:4px;margin-bottom:6px;">` +
      `<div style="color:#fde047;font-weight:bold;margin-bottom:4px;">ХАРАКТЕРИСТИКИ ${hr.freePoints > 0 ? `(Свободно: +${hr.freePoints})` : ''}</div>` +
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">`;
    [['str', '💪 Сила'], ['agi', '🎯 Ловкость'], ['spd', '⚡ Скорость'], ['end', '❤️ Выносл.'], ['int', '🧠 Интеллект'], ['spi', '🔮 Дух']].forEach(([k, lbl]) => {
      h += `<div style="display:flex;justify-content:space-between;align-items:center;background:#0e1210;padding:3px 6px;border-radius:3px;">` +
        `<span>${lbl}: <b>${hr.stats[k]}</b></span>` +
        (hr.freePoints > 0 ? `<button class="btn btn-ok" style="flex:0 0 auto;padding:1px 6px;" onclick="STIKS.spendFreeStat('${hr.uid}','${k}')">+</button>` : '') +
        `</div>`;
    });
    h += '</div></div>';

    h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;border-radius:4px;">` +
      `<div style="color:#86efac;font-weight:bold;margin-bottom:4px;">🎒 СНАРЯЖЕНИЕ И РЮКЗАК (${hr.inv.length})</div>` +
      `<div style="font-size:10px;color:#94a3b8;margin-bottom:5px;">🔫 Осн: <b>${(hr.slots.main && hr.slots.main.n) || '—'}</b> | 🔪 Хол: <b>${(hr.slots.melee && hr.slots.melee.n) || '—'}</b> | 🛡️ Броня: <b>${(hr.slots.armor && hr.slots.armor.n) || '—'}</b> | 🎒 Ранец: <b>${(hr.slots.bag && hr.slots.bag.n) || '—'}</b></div>`;
    (hr.inv || []).forEach((it, idx) => {
      const canEq = Boolean(it.slot || it.cat === 'weapon' || it.cat === 'melee' || it.cat === 'armor' || it.cat === 'bag');
      h += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;padding:3px 0;border-bottom:1px dashed #261b1b;">` +
        `<span>${it.n}${it.q > 1 ? ' ×' + it.q : ''}</span>` +
        (canEq ? `<button class="btn" style="flex:0 0 auto;padding:2px 6px;" onclick="STIKS.equipFromInv(STIKS.findHeroByUid('${hr.uid}'),${idx});STIKS.openHeroSheet('${hr.uid}')">Надеть</button>` : '') +
        `</div>`;
    });
    h += '</div>';
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 3Б/10: ОТРИСОВКА ЛОББИ, ФАМИЛИЙ И ВЫХОДА В РЕЙД
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.renderLobby = function() {
    const vp = document.getElementById('game-viewport');
    const C = global.STIKS_CONTENT;
    if (!vp) return;
    if (C && C.ARCHETYPES) Object.assign(this.ARCHETYPES, C.ARCHETYPES);

    const fams = Object.keys(this.db.families || {});
    if (!this.activeFamily && fams.length) this.activeFamily = fams[0];

    let h = '<div style="margin-bottom:8px;border-bottom:1px solid #3d1c1c;padding-bottom:6px;">' +
      '<div style="color:#7dd3fc;font-weight:bold;margin-bottom:4px;">1. НОВЫЙ ВЫЖИВШИЙ (СУДЬБА УЛЬЯ)</div>' +
      '<div style="display:flex;gap:4px;margin-bottom:4px;">' +
      `<input id="zopa-fam-inp" placeholder="Фамилия" value="${this.activeFamily}" style="flex:1;">` +
      '<input id="zopa-name-inp" placeholder="Имя бойца" style="flex:1.2;"></div>' +
      '<div style="display:flex;gap:4px;">' +
      '<select id="zopa-sex-sel" style="flex:1.2;"><option value="m">Пол: Мужской (М)</option><option value="f">Пол: Женский (Ж)</option></select>' +
      '<button class="btn btn-ok" style="flex:1;" onclick="STIKS.createNewHero()">+ Создать</button></div></div>';

    h += '<div style="margin-bottom:8px;"><div style="color:#fde047;font-weight:bold;margin-bottom:4px;">2. ФАМИЛИИ И СОСТАВ</div>';
    if (fams.length) {
      h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">' + fams.map(f =>
        `<button class="btn ${f === this.activeFamily ? 'btn-primary' : ''}" style="flex:0 0 auto;padding:4px 8px;" onclick="STIKS.activeFamily='${f}';STIKS.renderLobby()">${f}</button>`
      ).join('') + '</div>';
    }

    const heroes = (this.activeFamily && this.db.families[this.activeFamily]) || [];
    if (!heroes.length) {
      h += '<div style="color:#94a3b8;font-size:11px;">Нет бойцов. Создайте новичка или нажмите «📥 Из проды» / «🤝 Подселить бойцов».</div>';
    } else {
      heroes.forEach(hr => {
        this.normalizePlayerStats(hr);
        const inSq = this.squad.includes(hr.uid);
        const aName = (this.ARCHETYPES[hr.arch] && this.ARCHETYPES[hr.arch].name) || hr.arch;
        h += `<div style="display:flex;justify-content:space-between;align-items:center;background:#141a17;border:1px solid ${inSq ? '#4ade80' : '#3d1c1c'};padding:5px 6px;margin-bottom:4px;border-radius:4px;gap:4px;">` +
          `<div style="min-width:0;flex:1;"><b>${hr.name}</b> (Ур.${hr.lvl || 0} • ${aName})<br><span style="font-size:10px;color:#94a3b8;">❤️ ${hr.hp}/${hr.maxHp} • 🔮 ${hr.mana}/${hr.maxMana} • 💎 ${hr.sporans || 0}</span></div>` +
          `<div style="display:flex;gap:3px;flex:0 0 auto;">` +
          `<button class="btn ${inSq ? 'btn-ok' : ''}" style="padding:4px 6px;" onclick="STIKS.toggleSquadHero('${hr.uid}')">${inSq ? '✓ В отряде' : '+ В отряд'}</button>` +
          `<button class="btn" style="padding:4px 6px;" onclick="STIKS.openHeroSheet('${hr.uid}')" title="Профиль и вещи">📋</button>` +
          `<button class="btn" style="padding:4px 6px;" onclick="STIKS.openSettlement('${hr.uid}')" title="База">🏘️</button>` +
          `<button class="btn btn-danger" style="padding:4px 6px;" onclick="STIKS.deleteHero('${hr.uid}')" title="Удалить">🗑️</button></div></div>`;
      });
    }
    h += '</div>';

    const sqHeroes = (this.squad || []).map(uid => this.findHeroByUid(uid)).filter(Boolean);
    if (sqHeroes.length > 0) {
      const maps = this.getUnlockedMapsForSquad(sqHeroes);
      h += `<div style="border-top:1px solid #2e7d4f;padding-top:8px;">` +
        `<div style="color:#86efac;font-weight:bold;margin-bottom:5px;">3. ВЫХОД В РЕЙД (ОТРЯД: ${sqHeroes.length}/6)</div>` +
        `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">` +
        maps.map(m => `<button class="btn ${m.cls}" style="flex:1 1 30%;" onclick="STIKS.launchMap('${m.key}')">${m.label}</button>`).join('') +
        `</div><div style="display:flex;gap:4px;">` +
        `<button class="btn" onclick="STIKS.openCodex('gifts')">📖 Дневник Улья</button></div></div>`;
    }

    h += '<div style="margin-top:10px;border-top:1px dashed #3d1c1c;padding-top:6px;display:flex;gap:5px;">' +
      '<button class="btn btn-danger" onclick="STIKS.resetDevDatabase()">🧹 Обнулить всю базу DEV</button></div>';
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 4/10: КАРТА 60×60, СПАВН УГРОЗ, СПУТНИКОВ И ЗАСТАВКИ 15с
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.LOC_CAP = {
    start:    { name: 'Начальная',     mod: -2, minZ: 0, maxZ: 2, zCount: 22 },
    easy:     { name: 'Лёгкая',        mod: -1, minZ: 0, maxZ: 4, zCount: 32 },
    norm:     { name: 'Средняя',       mod: 0,  minZ: 1, maxZ: 6, zCount: 48 },
    junkyard: { name: 'Автосвалка',    mod: 0,  minZ: 1, maxZ: 6, zCount: 46 },
    cemetery: { name: 'Кладбище',      mod: 0,  minZ: 2, maxZ: 7, zCount: 52 },
    hard:     { name: 'Тяжёлая',       mod: 1,  minZ: 3, maxZ: 8, zCount: 62 },
    far1:     { name: 'Дальний +1',    mod: 1,  minZ: 4, maxZ: 8, zCount: 75 },
    hell:     { name: 'Пекло',         mod: 2,  minZ: 5, maxZ: 9, zCount: 72 },
    far2:     { name: 'Дальний +2',    mod: 2,  minZ: 6, maxZ: 9, zCount: 85 }
  };

  S.launchMap = function(dKey = 'start') {
    const C = global.STIKS_CONTENT;
    const dk = String(dKey || 'start').toLowerCase();
    const rule = this.LOC_CAP[dk] || this.LOC_CAP.start;
    if (!this.squad.length) { this.log('⚠️ Выберите хотя бы одного бойца в отряд!'); return; }

    const players = this.squad.map((uid, idx) => {
      const src = this.findHeroByUid(uid);
      if (!src) return null;
      const p = JSON.parse(JSON.stringify(src));
      this.normalizePlayerStats(p);
      p.x = 30 + (idx % 2);
      p.y = 30 + Math.floor(idx / 2);
      p.pace = 'fast';
      p.stepsLeft = p.maxAp;
      p.dead = false;
      p.escaped = false;
      return p;
    }).filter(Boolean);

    const grid = [];
    for (let y = 0; y < 60; y++) {
      const row = [];
      for (let x = 0; x < 60; x++) {
        const isCenter = Math.abs(x - 30) <= 2 && Math.abs(y - 30) <= 2;
        const isBorder = (x === 0 || y === 0 || x === 59 || y === 59);
        const blocked = !isCenter && !isBorder && Math.random() < 0.12;
        const hasLoot = !blocked && !isCenter && Math.random() < 0.025;
        const isExit = isBorder && !blocked && (x % 12 === 0 || y % 12 === 0);
        row.push({ x, y, blocked, loot: hasLoot, searched: false, seen: isCenter, exit: isExit });
      }
      grid.push(row);
    }

    // Спавн врагов строго по канону локации
    const zRanks = (C && C.Z_RANKS) || [];
    const zombies = [];
    while (zombies.length < rule.zCount) {
      const zx = Math.floor(Math.random() * 60);
      const zy = Math.floor(Math.random() * 60);
      if (Math.abs(zx - 30) <= 4 && Math.abs(zy - 30) <= 4) continue;
      if (grid[zy][zx].blocked) continue;
      const r = rule.minZ + Math.floor(Math.random() * (rule.maxZ - rule.minZ + 1));
      const zMeta = zRanks.find(z => z.r === r) || { r, name: 'Мутант Р.' + r, hp: 15 + r * 35, dmg: 3 + r * 12 };
      zombies.push({ id: 'z_' + zombies.length, x: zx, y: zy, rank: r, name: zMeta.name, hp: zMeta.hp, dmg: zMeta.dmg });
    }

    // Спавн 3-4 одиноких ИИ-спутников на карте (можно завербовать в свиту)
    const npcs = [];
    const npcNames = ['Сталкер Боб', 'Медсестра Аня', 'Разведчик Крот', 'Инженер Палыч'];
    for (let i = 0; i < 4; i++) {
      const nx = 6 + Math.floor(Math.random() * 48);
      const ny = 6 + Math.floor(Math.random() * 48);
      if (!grid[ny][nx].blocked) {
        npcs.push({ id: 'npc_' + i, name: npcNames[i], x: nx, y: ny, lvl: Math.max(1, players.lvl || 1), hp: 40, maxHp: 40 });
      }
    }

    // Квестовые цели на Автосвалке и Кладбище
    const questTarget = dk === 'junkyard'
      ? { type: 'car', x: 10 + Math.floor(Math.random() * 40), y: 10 + Math.floor(Math.random() * 40), name: '🚗 Остов Toyota / Урал' }
      : (dk === 'cemetery' ? { type: 'crown', x: 10 + Math.floor(Math.random() * 40), y: 10 + Math.floor(Math.random() * 40), name: '👑 Корона Избранного' } : null);
    if (questTarget) grid[questTarget.y][questTarget.x].blocked = false;

    this.db.session = { diffKey: dk, locName: rule.name, diffMod: rule.mod, turn: 1, activeIdx: 0, players, grid, zombies, npcs, questTarget, combat: false };
    this.saveDB();
    this.log(`🗺️ Высадка: <b>${rule.name} (60×60)</b>. Угроз: <b>${zombies.length}</b> • Выживших на карте: <b>${npcs.length}</b>.`);
    if (typeof this.showQuestLogoSplash === 'function') this.showQuestLogoSplash(dk);
    this.renderGame();
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 5А/10: ДВИЖЕНИЕ, ВЕРБОВКА СПУТНИКОВ И ЦЕЛИ СВАЛКИ/КЛАДБИЩА
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.getStepCost = function(pace) {
    const base = pace === 'careful' ? 3 : (pace === 'fast' ? 2 : 1);
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!p) return base;
    const ci = this.getCarryInfo(p);
    if (ci.blocked) return 999;
    return ci.mult > 1 ? Math.ceil(base * ci.mult) : base;
  };

  S.stepPlayer = function(dx, dy) {
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!s || !p || p.dead || p.escaped) return;
    const nx = p.x + dx, ny = p.y + dy;
    if (nx < 0 || nx > 59 || ny < 0 || ny > 59) return;
    const cell = s.grid[ny][nx];
    if (cell.blocked) { this.log('🧱 Путь преграждён завалом.'); return; }

    const cost = this.getStepCost(p.pace || 'fast');
    if (cost >= 999) { this.log('🎒 Перегруз >100%! Выбросьте лишний груз.'); return; }
    if ((p.stepsLeft || 0) < cost) { this.log(`⚠️ Не хватает ОХ (нужно ${cost}, осталось ${p.stepsLeft}).`); return; }

    p.stepsLeft -= cost;
    p.x = nx; p.y = ny;
    for (let yy = Math.max(0, ny - 3); yy <= Math.min(59, ny + 3); yy++) {
      for (let xx = Math.max(0, nx - 3); xx <= Math.min(59, nx + 3); xx++) s.grid[yy][xx].seen = true;
    }

    if (Array.isArray(s.npcs)) {
      const npcIdx = s.npcs.findIndex(n => n.x === nx && n.y === ny);
      if (npcIdx >= 0) {
        const npc = s.npcs[npcIdx];
        p.escortSquad = p.escortSquad || [];
        if (p.escortSquad.length < 5) {
          p.escortSquad.push(npc);
          s.npcs.splice(npcIdx, 1);
          this.log(`🤝 <b>${npc.name}</b> вступил в отряд! При выходе в Поселение засчитается Знахарю.`);
        }
      }
    }

    if (s.questTarget && s.questTarget.x === nx && s.questTarget.y === ny) {
      if (s.questTarget.type === 'car' && !p.towingCar) {
        p.towingCar = { id: (p.carQuest && p.carQuest.carId) || 'prius', n: s.questTarget.name, towPen: 1 };
        s.questTarget = null;
        this.normalizePlayerStats(p);
        this.log('🚗 Остов авто взят на буксир (-1 макс. ОХ)! Эвакуируйтесь с карты к Знахарю.');
      } else if (s.questTarget.type === 'crown' && !p.carryingCrown) {
        p.carryingCrown = { id: (p.packQuest && p.packQuest.crownId) || 'young', n: s.questTarget.name, towPen: 1 };
        s.questTarget = null;
        this.normalizePlayerStats(p);
        this.log('👑 <b>Корона Избранного</b> добыта (-1 макс. ОХ)! Несите её Матке в Гнездо.');
      }
    }

    const foeIdx = s.zombies.findIndex(z => z.x === nx && z.y === ny);
    if (foeIdx >= 0 && typeof this.startRaidCombat === 'function') {
      this.startRaidCombat(foeIdx);
      return;
    }
    this.saveDB();
    this.renderGame();
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 5Б/10: ТИК ЖИЗНЕОБЕСПЕЧЕНИЯ, СМЕНА ХОДА И РЕНДЕР КАРТЫ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.applyOutOfCombatTurnTick = function(p) {
    if (!p || p.escaped || p.dead) return;
    this.normalizePlayerStats(p);
    const isTatan = Boolean(p.arch === 'tatan' && !p.asInfected && !p.isInfected && !p.isKvaz);
    const tMult = isTatan ? 2 : 1;
    p.spore = Math.max(0, (p.spore || 0) - 1);
    p.food = Math.max(0, (p.food || 0) - tMult);
    p.water = Math.max(0, (p.water || 0) - tMult);
    if (p.food <= 0 || p.water <= 0) {
      const dmg = Math.max(1, Math.round(1 + 0.5 * (p.lvl || 0)));
      p.hp = Math.max(0, p.hp - dmg);
      this.log(`⚠️ <b>${p.name}</b> страдает от голода/жажды: -${dmg} ОЗ!`);
      if (p.hp <= 0) { p.dead = true; this.log(`💀 <b>${p.name}</b> погиб от истощения!`); }
    } else if (p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 1 + Math.floor((p.stats.end || 10) / 10));
    }
  };

  S.nextTurn = function() {
    const s = this.db && this.db.session;
    if (!s || !Array.isArray(s.players)) return;
    const cur = s.players[s.activeIdx];
    if (cur) this.applyOutOfCombatTurnTick(cur);

    let nextIdx = (s.activeIdx + 1) % s.players.length;
    if (nextIdx === 0) {
      s.turn = (s.turn || 1) + 1;
      (s.zombies || []).forEach(z => {
        const dx = Math.floor(Math.random() * 3) - 1;
        const dy = Math.floor(Math.random() * 3) - 1;
        const zx = Math.max(0, Math.min(59, z.x + dx));
        const zy = Math.max(0, Math.min(59, z.y + dy));
        if (s.grid[zy] && s.grid[zy][zx] && !s.grid[zy][zx].blocked) { z.x = zx; z.y = zy; }
      });
    }
    s.activeIdx = nextIdx;
    const np = s.players[s.activeIdx];
    if (np && !np.dead && !np.escaped) {
      this.normalizePlayerStats(np);
      np.stepsLeft = np.maxAp;
    }
    this.saveDB();
    this.renderGame();
  };

  S.evacuateActive = function() {
    const s = this.db && this.db.session, C = global.STIKS_CONTENT;
    const p = s && s.players && s.players[s.activeIdx];
    if (!s || !p) return;
    const orig = this.findHeroByUid(p.uid);
    if (orig) {
      const escCnt = Array.isArray(p.escortSquad) ? p.escortSquad.length : 0;
      if (escCnt > 0) {
        orig.carQuest = orig.carQuest || {};
        orig.carQuest.escortsDone = (orig.carQuest.escortsDone || 0) + escCnt;
        p.sporans = Math.floor((p.sporans || 0) * (2 / 3));
        this.log(`🤝 В Поселение приведено спутников: <b>+${escCnt}</b> (доля 1/3 выплачена)!`);
        p.escortSquad = [];
      }
      Object.assign(orig, JSON.parse(JSON.stringify(p)));
      if (C && typeof C.syncQuestProgressAfterRaid === 'function') C.syncQuestProgressAfterRaid(orig);
    }
    p.escaped = true;
    this.log(`🚁 <b>${p.name}</b> эвакуировался с рейда!`);
    if (s.players.every(pl => pl.escaped || pl.dead)) {
      this.db.session = null;
      this.saveDB();
      this.renderLobby();
      return;
    }
    this.nextTurn();
  };

  S.renderGame = function() {
    const vp = document.getElementById('game-viewport');
    const s = this.db && this.db.session;
    if (!vp || !s) return;
    const p = s.players[s.activeIdx];
    this.normalizePlayerStats(p);
    const ci = this.getCarryInfo(p);

    let gridHtml = '<div style="display:grid;grid-template-columns:repeat(11,1fr);gap:1px;background:#1a1212;border:1px solid #5c2828;margin:6px 0;">';
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const cx = p.x + dx, cy = p.y + dy;
        let bg = '#080a09', ico = '';
        if (cx >= 0 && cx < 60 && cy >= 0 && cy < 60) {
          const c = s.grid[cy][cx];
          bg = c.seen ? (c.blocked ? '#261b1b' : '#111714') : '#050605';
          if (cx === p.x && cy === p.y) ico = '🧍';
          else if (s.players.some(pl => !pl.dead && !pl.escaped && pl.x === cx && pl.y === cy)) ico = '👥';
          else if (s.questTarget && s.questTarget.x === cx && s.questTarget.y === cy) ico = s.questTarget.type === 'car' ? '🚗' : '👑';
          else if (c.seen && Array.isArray(s.npcs) && s.npcs.some(n => n.x === cx && n.y === cy)) ico = '🤝';
          else if (c.seen && s.zombies.some(z => z.x === cx && z.y === cy)) ico = '☣️';
          else if (c.seen && c.exit) ico = '🚁';
          else if (c.seen && c.loot && !c.searched) ico = '📦';
          else if (c.seen && c.blocked) ico = '⛰️';
        }
        gridHtml += `<div style="aspect-ratio:1;background:${bg};display:flex;align-items:center;justify-content:center;font-size:11px;">${ico}</div>`;
      }
    }
    gridHtml += '</div>';

    vp.innerHTML = `<div style="display:flex;flex-direction:column;gap:5px;">` +
      `<div style="display:flex;justify-content:space-between;font-size:11px;border-bottom:1px solid #3d1c1c;padding-bottom:4px;">` +
      `<span><b>${p.name}</b> (Ур.${p.lvl || 0}) [${p.x}:${p.y}]</span>` +
      `<span>Ход:${s.turn} • ОХ:<b>${p.stepsLeft}/${p.maxAp}</b> <button class="btn" style="padding:2px 6px;" onclick="STIKS.evacuateActive()">🚁 Выход</button></span></div>` +
      `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;font-size:10px;background:#140e0e;padding:4px;border-radius:4px;">` +
      `<div>❤️ ОЗ: <b>${p.hp}/${p.maxHp}</b></div><div>🔮 Мана: <b>${p.mana}/${p.maxMana}</b></div><div>⚖️ Вес: <b>${ci.cur}/${ci.max}кг</b></div>` +
      `<div>🍖 Сыт: <b>${p.food}</b></div><div>💧 Жажд: <b>${p.water}</b></div><div>☣️ Угроз: <b>${s.zombies.length}</b></div></div>` +
      gridHtml +
      `<div style="display:flex;gap:4px;">` +
      `<button class="btn ${p.pace === 'careful' ? 'btn-primary' : ''}" onclick="STIKS.db.session.players[STIKS.db.session.activeIdx].pace='careful';STIKS.renderGame()">Внимат. (${this.getStepCost('careful')})</button>` +
      `<button class="btn ${p.pace === 'fast' ? 'btn-primary' : ''}" onclick="STIKS.db.session.players[STIKS.db.session.activeIdx].pace='fast';STIKS.renderGame()">Быстро (${this.getStepCost('fast')})</button>` +
      `<button class="btn ${p.pace === 'run' ? 'btn-primary' : ''}" onclick="STIKS.db.session.players[STIKS.db.session.activeIdx].pace='run';STIKS.renderGame()">Бегом (${this.getStepCost('run')})</button></div>` +
      `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">` +
      `<div></div><button class="btn" onclick="STIKS.stepPlayer(0,-1)">⬆️</button><div></div>` +
      `<button class="btn" onclick="STIKS.stepPlayer(-1,0)">⬅️</button><button class="btn btn-primary" onclick="STIKS.searchCell()">🔍 Поиск (3)</button><button class="btn" onclick="STIKS.stepPlayer(1,0)">➡️</button>` +
      `<div></div><button class="btn" onclick="STIKS.stepPlayer(0,1)">⬇️</button><div></div></div>` +
      `<div style="display:flex;gap:4px;">` +
      `<button class="btn" onclick="STIKS.openInv()">🎒 Вещи (${p.inv.length})</button>` +
      `<button class="btn" onclick="STIKS.openCodex('gifts')">📖 Дневник</button>` +
      `<button class="btn btn-ok" onclick="STIKS.nextTurn()">⏭️ Конец хода</button></div></div>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 6А/10: СПРАВОЧНИК ПРЕДМЕТОВ, ОПИСАНИЯ И ОБЫСК (ПИРАМИДА)
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.LOOT_POOL = [
    { id: 'w_g1',  n: '🔫 Обрез 12к',            cat: 'weapon', slot: 'main',  rank: 1, a: 16,  w: 2.3, cal: '12к',    desc: 'Двуствольный обрез 1-го ранга.' },
    { id: 'w_g2',  n: '🔫 АК-74М',               cat: 'weapon', slot: 'main',  rank: 2, a: 32,  w: 3.4, cal: '5.45',   desc: 'Надёжный автомат 2-го ранга.' },
    { id: 'w_g3',  n: '🔫 ВСС «Винторез»',       cat: 'weapon', slot: 'main',  rank: 3, a: 64,  w: 2.6, cal: '9x39',   desc: 'Бесшумная снайперская винтовка 3-го ранга.' },
    { id: 'w_g4',  n: '⚡ Гаусс-винтовка М1',    cat: 'weapon', slot: 'main',  rank: 4, a: 115, w: 4.5, cal: 'ЭМП',    desc: 'Электромагнитный ускоритель 4-го ранга.' },
    { id: 'w_g5',  n: '🔥 Импульсник Внешников', cat: 'weapon', slot: 'main',  rank: 5, a: 150, w: 4.8, cal: 'Плазма', desc: 'Оружие зачистки Пекла 5-го ранга.' },
    { id: 'a_r1',  n: '🧥 Кожаная куртка',       cat: 'armor',  slot: 'armor', rank: 1, d: 5,   w: 2.0, desc: 'Плотная куртка 1-го ранга (+5 защиты).' },
    { id: 'a_r2',  n: '🦺 Бронежилет 6Б23',      cat: 'armor',  slot: 'armor', rank: 2, d: 15,  w: 5.5, desc: 'Армейский бронежилет 2-го ранга (+15 защиты).' },
    { id: 'a_r3',  n: '🛡️ Штурмовой комплект',   cat: 'armor',  slot: 'armor', rank: 3, d: 30,  w: 8.0, desc: 'Тяжёлая броня 3-го ранга (+30 защиты).' },
    { id: 'a_r4',  n: '🛡️ Экзо-панцирь «Рубер»', cat: 'armor',  slot: 'armor', rank: 4, d: 75,  w: 11.0, desc: 'Броня 4-го ранга из хитина Рубера (+75 защиты).' },
    { id: 'a_r5',  n: '👑 Доспех Скреббера',     cat: 'armor',  slot: 'armor', rank: 5, d: 115, w: 12.0, desc: 'Легендарная броня 5-го ранга (+115 защиты).' },
    { id: 'b_r1',  n: '🎒 Городской рюкзак',     cat: 'bag',    slot: 'bag',   rank: 1, bag: 15, w: 0.6, desc: 'Рюкзак 1-го ранга (+15 кг к переносимому весу).' },
    { id: 'b_r2',  n: '🎒 Рейдовый баул',        cat: 'bag',    slot: 'bag',   rank: 2, bag: 30, w: 1.1, desc: 'Вместительный баул 2-го ранга (+30 кг).' },
    { id: 'b_r3',  n: '🎒 Тактический ранец',    cat: 'bag',    slot: 'bag',   rank: 3, bag: 50, w: 1.5, desc: 'Рюкзак 3-го ранга (+50 кг).' },
    { id: 'm_r1',  n: '🩹 Базовая аптечка',      cat: 'med',    heal: 30,      rank: 1, w: 0.3, desc: 'Восстанавливает 30 ОЗ.' },
    { id: 'm_r2',  n: '💉 Тактическая IFAK',     cat: 'med',    heal: 75,      rank: 2, w: 0.6, desc: 'Восстанавливает 75 ОЗ.' },
    { id: 'f_r1',  n: '🥫 Тушёнка и фляга',      cat: 'food',   food: 25, water: 25, rank: 1, w: 0.8, desc: '+25 сытости и +25 жажды.' }
  ];

  S.resolveItemRank = function(it) {
    return Math.max(1, Math.min(5, Math.round(Number((it && (it.rank || it.cls)) || 1))));
  };

  S.describeItem = function(it) {
    if (!it) return '';
    const C = global.STIKS_CONTENT;
    const w = (C && C.getItemWeight) ? C.getItemWeight(it) : Number(it.w || 0);
    const parts = [];
    if (it.desc) parts.push(it.desc.replace(/•\s*⚖️.*$/, '').trim());
    if (it.a) parts.push(`⚔️ Урон: +${it.a}`);
    if (it.d) parts.push(`🛡️ Защита: +${it.d}`);
    if (it.bag) parts.push(`🎒 Объём: +${it.bag} кг`);
    if (it.heal) parts.push(`❤️ +${it.heal} ОЗ`);
    parts.push(w > 0 ? `⚖️ Вес: ${w} кг` : '⚖️ Вес: 0 кг (невесомый трофей)');
    return parts.join(' • ');
  };

  S.genClusterItem = function(cat, targetRank) {
    const C = global.STIKS_CONTENT;
    const r = Math.max(1, Math.min(5, Math.round(targetRank || 1)));
    const full = [...this.LOOT_POOL, ...((C && C.ITEMS && C.ITEMS.meleeWeapons) || [])];
    const pool = full.filter(x => x.rank === r && (!cat || x.cat === cat));
    const list = pool.length ? pool : full.filter(x => x.rank === r);
    const pick = list[Math.floor(Math.random() * Math.max(1, list.length))] || this.LOOT_POOL;
    const clone = Object.assign({ q: 1 }, pick);
    clone.n = `[P${r}] ` + String(clone.n || 'Вещь').replace(/\[P\d+\]/gi, '').trim();
    return clone;
  };

  S.searchCell = function() {
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!s || !p || p.dead) return;
    if ((p.stepsLeft || 0) < 3) { this.log('⚠️ Для обыска нужно 3 ОХ!'); return; }

    p.stepsLeft -= 3;
    const cell = s.grid[p.y][p.x];
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const isDouble11 = (d1 === 1 && d2 === 1);
    if (isDouble11) this.playDoubleSound();

    const topMap = {
      start: isDouble11 ? 2 : 1,
      easy: isDouble11 ? 3 : 2,
      norm: isDouble11 ? 4 : 3,
      junkyard: isDouble11 ? 4 : 3,
      cemetery: isDouble11 ? 4 : 3,
      hard: isDouble11 ? 5 : 4,
      far1: isDouble11 ? 5 : 4,
      hell: isDouble11 ? 5 : 4,
      far2: 5
    };
    const dk = String(s.diffKey || 'start').toLowerCase();
    const topR = topMap[dk] || 1;

    if (dk === 'start' && isDouble11 && Math.random() < 0.5) {
      this.log('🎲 [1-1] ДУБЛЬ! Из развалин выскочил <b>Лотерейщик (Р.4)</b>!');
      s.zombies.push({ id: 'z_lot_' + Date.now(), x: p.x, y: p.y, rank: 4, name: 'Лотерейщик', hp: 220, dmg: 38 });
      if (typeof this.startRaidCombat === 'function') { this.startRaidCombat(s.zombies.length - 1); return; }
    }

    const count = cell.loot && !cell.searched ? (isDouble11 ? 3 : 2) : (d1 + d2 >= 8 ? 1 : 0);
    cell.searched = true;

    if (count === 0) {
      this.log(`🔍 [${d1}-${d2}] Обыск (${p.x}:${p.y}): ничего полезного.`);
    } else {
      const names = [];
      for (let i = 0; i < count; i++) {
        const it = this.genClusterItem(null, Math.max(1, topR - i));
        p.inv.push(it);
        names.push(it.n);
      }
      if (Math.random() < 0.35) {
        p.inv.push({ id: 'hive_web', n: '🕸️ Паутина Улья', cat: 'trophy', rank: 1, w: 0, q: 1, desc: 'Сдаётся по курсу 10:1 💎.' });
        names.push('🕸️ Паутина Улья (0 кг)');
      }
      this.log(`🔍 [${d1}-${d2}]${isDouble11 ? ' 🎰 ДУБЛЬ 1-1!' : ''} Найдено: <b>${names.join(', ')}</b>!`);
    }
    this.saveDB();
    this.renderGame();
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 6Б/10: ЭКИПИРОВКА, ЖЕМЧУГ/ГОРОХ/ОМЛЕТ И ОКНО РЮКЗАКА
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.equipFromInv = function(hero, idx) {
    if (!hero || !Array.isArray(hero.inv) || !hero.inv[idx]) return;
    const it = hero.inv[idx];
    const slot = it.slot || (it.cat === 'melee' ? 'melee' : (it.cat === 'weapon' ? 'main' : (it.cat === 'armor' ? 'armor' : (it.cat === 'bag' ? 'bag' : (it.cat === 'talisman' ? 'talisman' : '')))));
    if (!slot) { this.log('⚠️ Эту вещь нельзя надеть в слот.'); return; }
    hero.slots = hero.slots || {};
    const prev = hero.slots[slot];
    hero.slots[slot] = it;
    hero.inv.splice(idx, 1);
    if (prev) hero.inv.push(prev);
    this.normalizePlayerStats(hero);
    this.saveDB();
    this.log(`🛡️ Экипировано: <b>${it.n}</b>.`);
  };

  S.useInvItem = function(idx) {
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!p || !p.inv || !p.inv[idx]) return;
    const it = p.inv[idx];
    const raw = String((it.id || '') + ' ' + (it.n || '')).toLowerCase();

    if (it.heal) p.hp = Math.min(p.maxHp, p.hp + it.heal);
    if (it.food) p.food = Math.min(p.maxFood, p.food + it.food);
    if (it.water) p.water = Math.min(p.maxWater, p.water + it.water);

    if (/azamat|омлет/.test(raw)) {
      p.hp = p.maxHp; p.mana = p.maxMana; p.food = p.maxFood; p.water = p.maxWater; p.spore = p.maxSpore;
      this.log(`🍳 <b>Омлет от Азамата</b> восстановил все показатели на 100%!`);
    } else if (/black_pearl|чёрный жемчуг|черный жемчуг/.test(raw)) {
      p.freePoints = (p.freePoints || 0) + 1;
      this.log(`⚫ <b>Чёрный жемчуг</b> поглощён: <b>+1 свободный уровень</b> характеристик!`);
    } else if (/red_pearl|красный жемчуг/.test(raw)) {
      p.freePoints = (p.freePoints || 0) + 3;
      this.log(`🔴 <b>Красный жемчуг</b> поглощён: <b>+3 свободных уровня</b> характеристик!`);
    } else if (/white_pearl|белый жемчуг/.test(raw)) {
      if (p.isKvaz) {
        p.isKvaz = false; p.isInfected = false; p.asInfected = false;
        delete p._kvazHungerMult;
        this.normalizePlayerStats(p);
        this.log(`⚪ <b>Белый жемчуг</b> снял проклятие Кваза — герой вернул человеческий облик и нормальный аппетит!`);
      } else {
        p.freePoints = (p.freePoints || 0) + 5;
        this.log(`⚪ <b>Белый жемчуг</b> даровал <b>+5 свободных уровней</b>!`);
      }
    } else if (/hive_pea|горох/.test(raw)) {
      const gKeys = Object.keys(p.gifts || {});
      if (gKeys.length) {
        const k = gKeys[Math.floor(Math.random() * gKeys.length)];
        p.gifts[k].lvl = Math.min(30, (p.gifts[k].lvl || 1) + 1);
        this.log(`🟢 <b>Горох Улья</b> повысил Дар <b>${k}</b> до <b>Ур.${p.gifts[k].lvl}</b>!`);
      } else {
        p.freePoints = (p.freePoints || 0) + 1;
        this.log(`🟢 <b>Горох Улья</b> дал +1 свободный уровень!`);
      }
    } else {
      this.log(`💊 Использовано: <b>${it.n}</b>.`);
    }

    if (it.q > 1) it.q--; else p.inv.splice(idx, 1);
    this.normalizePlayerStats(p);
    this.saveDB();
    this.openInv();
  };

  S.openInv = function() {
    const vp = document.getElementById('game-viewport');
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!vp || !p) return;
    const ci = this.getCarryInfo(p);

    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #3d1c1c;padding-bottom:5px;margin-bottom:6px;">` +
      `<b>🎒 РЮКЗАК: ${p.name} (${ci.cur}/${ci.max} кг)</b><button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.renderGame()">🗺️ На карту</button></div>` +
      `<div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">🔫 Осн: <b>${(p.slots.main && p.slots.main.n) || '—'}</b> | 🔪 Хол: <b>${(p.slots.melee && p.slots.melee.n) || '—'}</b> | 🛡️ Броня: <b>${(p.slots.armor && p.slots.armor.n) || '—'}</b> | 🎒 Ранец: <b>${(p.slots.bag && p.slots.bag.n) || '—'}</b></div>`;

    p.inv.forEach((it, i) => {
      const raw = String((it.id || '') + ' ' + (it.n || '')).toLowerCase();
      const canEq = Boolean(it.slot || it.cat === 'weapon' || it.cat === 'melee' || it.cat === 'armor' || it.cat === 'bag' || it.cat === 'talisman');
      const canUse = Boolean(it.heal || it.food || it.water || /pearl|жемчуг|горох|pea|омлет|azamat/.test(raw));
      h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:5px;margin-bottom:4px;border-radius:4px;">` +
        `<div style="display:flex;justify-content:space-between;align-items:center;"><b>${it.n}${it.q > 1 ? ' ×' + it.q : ''}</b>` +
        `<div style="display:flex;gap:3px;">` +
        (canUse ? `<button class="btn btn-ok" style="padding:2px 6px;" onclick="STIKS.useInvItem(${i})">Исп.</button>` : '') +
        (canEq ? `<button class="btn" style="padding:2px 6px;" onclick="STIKS.equipFromInv(STIKS.db.session.players[STIKS.db.session.activeIdx],${i});STIKS.openInv()">Надеть</button>` : '') +
        `<button class="btn btn-danger" style="padding:2px 6px;" onclick="STIKS.db.session.players[STIKS.db.session.activeIdx].inv.splice(${i},1);STIKS.saveDB();STIKS.openInv()">✖</button>` +
        `</div></div><div style="font-size:10px;color:#94a3b8;">${this.describeItem(it)}</div></div>`;
    });
    if (!p.inv.length) h += '<div style="color:#64748b;text-align:center;padding:8px;">Рюкзак пуст</div>';
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 7А/10: СОВМЕСТНЫЙ БОЙ ОТРЯДА, НАВЫКИ АРХЕТИПОВ И ДАРЫ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.startRaidCombat = function(zIdx) {
    const s = this.db && this.db.session, C = global.STIKS_CONTENT;
    const leader = s && s.players && s.players[s.activeIdx];
    const mainZ = s && s.zombies && s.zombies[zIdx];
    if (!s || !leader || !mainZ) return;

    const pack = [mainZ];
    s.zombies.forEach((z, i) => {
      if (i !== zIdx && pack.length < 6 && Math.abs(z.x - mainZ.x) <= 2 && Math.abs(z.y - mainZ.y) <= 2) pack.push(z);
    });

    const zRanks = (C && C.Z_RANKS) || [];
    const enemies = pack.map((z, i) => {
      const meta = zRanks.find(x => x.r === (z.rank || 0)) || {};
      return {
        id: 'en_' + i, zId: z.id, name: z.name, rank: z.rank || 0,
        img: meta.img || 'img/Z_01.png',
        hp: z.hp || 20, maxHp: z.hp || 20,
        dmg: Math.max(2, Math.round((z.dmg || 4) * ((C && C.BALANCE && C.BALANCE.enemyDmgMult) || 0.85))),
        stun: 0, debuff: 0, dead: false
      };
    });

    // Совместный отряд слева (до 6 бойцов): игроки рядом <= 2 кл. + ИИ-спутники + Стая
    const allies = [];
    const nearbyPlayers = s.players.filter(pl => !pl.dead && !pl.escaped && Math.max(Math.abs(pl.x - leader.x), Math.abs(pl.y - leader.y)) <= 2);
    if (!nearbyPlayers.includes(leader)) nearbyPlayers.unshift(leader);
    nearbyPlayers.forEach(pl => {
      if (allies.length < 6) {
        pl.kind = 'player';
        pl._skillUsed = false;
        allies.push(pl);
      }
    });

    (leader.escortSquad || []).forEach((npc, i) => {
      if (allies.length < 6) {
        allies.push({
          uid: 'esc_' + i, kind: 'escort', name: npc.name || 'Спутник',
          img: 'img/surgeon.jpg', hp: npc.hp || 40, maxHp: npc.maxHp || 40,
          dmg: 10 + (npc.lvl || 1) * 2, dead: false
        });
      }
    });

    s.combat = { round: 1, allies, allyTurnIdx: 0, enemies };
    this.saveDB();
    this.log(`⚔️ Стычка! В бой вступили: <b>${allies.map(a => a.name).join(', ')}</b> против <b>${enemies.map(e => e.name).join(', ')}</b>!`);
    this.renderCombat();
  };

  S.combatActAttack = function() {
    const s = this.db && this.db.session, cb = s && s.combat, C = global.STIKS_CONTENT;
    if (!cb) return;
    const p = cb.allies[cb.allyTurnIdx];
    const trg = cb.enemies.find(e => !e.dead);
    if (!p || !trg) return;

    const w = (p.slots && (p.slots.main || p.slots.melee)) || { n: 'Кулаки', a: 4, rank: 1 };
    const isGun = Boolean(w.cal || w.slot === 'main');
    const mult = isGun ? ((C && C.BALANCE && C.BALANCE.weaponDmgMult) || 0.5) : 0.65;
    const rankBonus = (C && C.getEffectiveGearRank) ? (1 + (C.getEffectiveGearRank(w.rank || 1) - 1) * 0.2) : 1;
    const statAdd = Math.round(isGun ? (p.stats.agi || 10) * 0.25 : (p.stats.str || 10) * 0.35);
    const dmg = Math.max(2, Math.round(((w.a || 4) * mult * rankBonus + statAdd) * (p.buff || 1)));
    p.buff = 1;

    trg.hp = Math.max(0, trg.hp - dmg);
    if (trg.hp <= 0) trg.dead = true;
    this.playTone(isGun ? 150 : 280, 0.1, 'sawtooth', 0.08);
    this.log(`⚔️ <b>${p.name}</b> (${w.n}) → <b>${trg.name}</b>: <b>-${dmg}</b>${trg.dead ? ' 💀' : ''}`);
    this.advanceCombatTurn();
  };

  S.combatSwitchWeap = function() {
    const s = this.db && this.db.session, cb = s && s.combat;
    const p = cb && cb.allies[cb.allyTurnIdx];
    if (!p || !p.slots || !p.slots.main || !p.slots.melee) return;
    const tmp = p.slots.main; p.slots.main = p.slots.melee; p.slots.melee = tmp;
    this.log(`🔄 <b>${p.name}</b> сменил оружие (0 ОХ): в руках <b>${p.slots.main.n}</b>!`);
    this.renderCombat();
  };

  S.combatUseSkill = function() {
    const s = this.db && this.db.session, cb = s && s.combat, C = global.STIKS_CONTENT;
    const p = cb && cb.allies[cb.allyTurnIdx];
    if (!p || p._skillUsed) return;
    const alive = cb.enemies.filter(e => !e.dead);
    if (!alive.length) return;

    p._skillUsed = true;
    const arch = (C && C.ARCHETYPES[p.arch]) || { skill: 'Ярость', phrase: 'В атаку!' };
    this.speak(arch.phrase);

    const strongest = alive.slice().sort((a, b) => (b.rank - a.rank) || (b.hp - a.hp))[0];
    const flatAtk = ((p.stats.str || 10) * 0.7 + (p.stats.agi || 10) * 0.5 + (p.stats.int || 10) * 0.4 + (p.stats.spi || 10) * 0.4) * (p.buff || 1);
    const fn = C && C.ARCH_SKILLS && C.ARCH_SKILLS[p.arch];

    if (typeof fn === 'function') {
      fn({
        p, st: cb, alive, strongest, flatAtk,
        popPlayer: () => {}, popEnemy: () => {},
        dealDamage(en, raw) {
          const d = Math.max(1, Math.round(raw));
          en.hp = Math.max(0, (en.hp || 10) - d);
          if (en.hp <= 0) en.dead = true;
        },
        log: (m) => S.log(m)
      });
    } else {
      const dmg = Math.max(6, Math.round(flatAtk * 1.4));
      strongest.hp = Math.max(0, strongest.hp - dmg);
      if (strongest.hp <= 0) strongest.dead = true;
      this.log(`🗣️ <b>${p.name}</b> → <b>[${arch.skill}]</b>: «${arch.phrase}» → <b>-${dmg}</b>`);
    }
    this.advanceCombatTurn();
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 7Б/10: ДАРЫ В БОЮ, ХОД СПУТНИКОВ/ВРАГОВ И АРЕНА ОТРЯДА
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.combatUseDar = async function(darKey, branchId) {
    const s = this.db && this.db.session, cb = s && s.combat, C = global.STIKS_CONTENT;
    if (!cb || !C || !C.DARS[darKey]) return;
    const p = cb.allies[cb.allyTurnIdx];
    const dar = C.DARS[darKey];
    const gObj = p && p.gifts && p.gifts[darKey];
    if (!p || !gObj) return;

    const brObj = branchId && gObj.branches && gObj.branches[branchId];
    const lvl = (brObj && brObj.lvl) || gObj.lvl || 1;
    const slotKind = C.getDarSlotKind ? C.getDarSlotKind(darKey, branchId) : 'atk';
    p._roundSlots = p._roundSlots || { atk: false, def: false };
    if (p._roundSlots[slotKind]) {
      this.log(`⛔ В этом раунде уже применён 1 ${slotKind === 'def' ? '🛡 защитный' : '⚔️ атакующий'} Дар!`);
      return;
    }

    const pct = typeof dar.getManaPct === 'function' ? dar.getManaPct(branchId || '', lvl) : 20;
    const cost = Math.max(1, Math.floor((p.maxMana || 20) * (pct / 100)));
    if ((p.mana || 0) < cost) { this.log(`❌ Не хватает маны на [${dar.name}] (нужно ${cost}).`); return; }

    p.mana -= cost;
    p._roundSlots[slotKind] = true;
    const intMult = 1 + Math.floor((p.stats.int || 10) / 20) * 0.02;
    const alive = cb.enemies.filter(e => !e.dead);
    const brMeta = branchId && (dar.branches || []).find(b => b.id === branchId);

    await dar.execute({
      p, st: cb, dar, item: brObj || gObj, lvl, branchId: branchId || '',
      title: brMeta ? brMeta.name : dar.name,
      enemies: cb.enemies, alive, intMult, cost,
      wait: (ms) => new Promise(r => setTimeout(r, ms)),
      log: (m) => S.log(m),
      popPlayer: () => {}, popEnemy: () => {},
      dealDamage(en, raw) {
        const d = Math.max(1, Math.round(raw));
        en.hp = Math.max(0, (en.hp || 10) - d);
        if (en.hp <= 0) en.dead = true;
      }
    });

    this.saveDB();
    this.renderCombat();
    if (cb.enemies.every(e => e.dead)) this.advanceCombatTurn();
  };

  S.advanceCombatTurn = function() {
    const s = this.db && this.db.session, cb = s && s.combat;
    if (!cb) return;

    if (cb.enemies.every(e => e.dead)) {
      const deadIds = new Set(cb.enemies.map(e => e.zId));
      s.zombies = s.zombies.filter(z => !deadIds.has(z.id));
      const p0 = cb.allies.find(a => a.kind === 'player') || cb.allies[0];
      const spGain = cb.enemies.reduce((acc, e) => acc + (e.rank || 0) + 1, 0);
      p0.sporans = (p0.sporans || 0) + spGain;
      p0.inv.push({ id: 'hive_web', n: '🕸️ Паутина Улья', cat: 'trophy', rank: 1, w: 0, q: 1, desc: 'Сдаётся по курсу 10:1 💎.' });
      cb.allies.forEach(a => { delete a._skillUsed; delete a._roundSlots; a.buff = 1; });
      s.combat = null;
      this.saveDB();
      this.log(`🏆 Победа! Получено <b>+${spGain} 💎</b> и 🕸️ Паутина Улья (0 кг)!`);
      this.renderGame();
      return;
    }

    // Ищем следующего живого игрока в текущем раунде
    let nextIdx = cb.allyTurnIdx + 1;
    while (nextIdx < cb.allies.length && (cb.allies[nextIdx].dead || cb.allies[nextIdx].hp <= 0 || cb.allies[nextIdx].kind !== 'player')) {
      nextIdx++;
    }
    if (nextIdx < cb.allies.length) {
      cb.allyTurnIdx = nextIdx;
      this.renderCombat();
      return;
    }

    // Фаза атак ИИ-спутников отряда
    cb.allies.filter(a => a.kind !== 'player' && !a.dead && a.hp > 0).forEach(ai => {
      const trg = cb.enemies.find(e => !e.dead);
      if (!trg) return;
      const d = Math.max(3, Math.round(ai.dmg || 8));
      trg.hp = Math.max(0, trg.hp - d);
      if (trg.hp <= 0) trg.dead = true;
      this.log(`🤝 <b>${ai.name}</b> атакует <b>${trg.name}</b>: <b>-${d}</b>${trg.dead ? ' 💀' : ''}`);
    });

    if (cb.enemies.every(e => e.dead)) { this.advanceCombatTurn(); return; }

    // Фаза ответных атак врагов (с учётом Отрядного щита и брони)
    cb.allyTurnIdx = 0;
    cb.enemies.forEach(en => {
      if (en.dead) return;
      if (en.stun > 0) { en.stun--; return; }
      const aliveAllies = cb.allies.filter(a => !a.dead && a.hp > 0);
      if (!aliveAllies.length) return;
      const trg = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];

      const shieldHolder = aliveAllies.find(a => a.squadShield && a.squadShield.active && (a.mana || 0) >= a.squadShield.fixedManaPerHit);
      if (shieldHolder) {
        shieldHolder.mana -= shieldHolder.squadShield.fixedManaPerHit;
        this.log(`🔰 <b>[Отрядный щит]</b> поглотил удар <b>${en.name}</b> по <b>${trg.name}</b>!`);
        return;
      }
      if (trg.shieldHits > 0) {
        trg.shieldHits--;
        this.log(`🛡️ Барьер <b>${trg.name}</b> поглотил удар <b>${en.name}</b>!`);
        return;
      }

      const arm = (trg.slots && trg.slots.armor && trg.slots.armor.d) || 0;
      const dmg = Math.max(1, en.dmg - arm);
      trg.hp = Math.max(0, trg.hp - dmg);
      if (trg.hp <= 0) trg.dead = true;
      this.log(`💥 <b>${en.name}</b> бьёт <b>${trg.name}</b>: <b>-${dmg}</b> (ОЗ: ${trg.hp}/${trg.maxHp})`);
    });

    const alivePlayers = cb.allies.filter(a => a.kind === 'player' && !a.dead && a.hp > 0);
    if (!alivePlayers.length) {
      s.combat = null;
      this.db.session = null;
      this.saveDB();
      this.log('💀 Весь отряд пал в Улье...');
      this.renderLobby();
      return;
    }
    cb.allyTurnIdx = cb.allies.indexOf(alivePlayers[0]);
    cb.allies.forEach(a => { a._roundSlots = { atk: false, def: false }; });
    cb.round++;
    this.saveDB();
    this.renderCombat();
  };

  S.renderCombat = function() {
    const vp = document.getElementById('game-viewport'), s = this.db && this.db.session, cb = s && s.combat, C = global.STIKS_CONTENT;
    if (!vp || !cb) return;
    const p = cb.allies[cb.allyTurnIdx] || cb.allies[0];
    const hasDual = Boolean(p.slots && p.slots.main && p.slots.melee);
    const arch = (C && C.ARCHETYPES[p.arch]) || { ico: '🗣️', skill: 'Навык' };

    let h = `<div style="border-bottom:1px solid #8f2d2d;padding-bottom:4px;margin-bottom:6px;display:flex;justify-content:space-between;">` +
      `<b style="color:#ff9e9e;">⚔️ РАУНД ${cb.round} • Ход: ${p.name}</b><span>❤️ ${p.hp}/${p.maxHp} • 🔮 ${p.mana}/${p.maxMana}</span></div>`;

    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;font-size:10.5px;"><div><b style="color:#86efac;">ОТРЯД СЛЕВА:</b>';
    cb.allies.forEach(a => {
      const pct = Math.max(0, Math.min(100, Math.round((a.hp / Math.max(1, a.maxHp)) * 100)));
      const aImg = (C && C.ARCHETYPES[a.arch] && C.ARCHETYPES[a.arch].img) || a.img || 'img/kachok.jpeg';
      h += `<div style="display:flex;align-items:center;gap:4px;padding:3px;border:1px solid ${a === p ? '#4ade80' : '#264635'};margin-top:3px;opacity:${a.dead ? 0.35 : 1};">` +
        `<img src="${aImg}" style="width:22px;height:22px;object-fit:cover;border-radius:3px;">` +
        `<div style="flex:1;min-width:0;"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.name}</div>` +
        `<div style="height:4px;background:#1e293b;border-radius:2px;"><div style="width:${pct}%;height:100%;background:#4ade80;"></div></div></div></div>`;
    });
    h += '</div><div><b style="color:#fca5a5;">ВРАГИ СПРАВА:</b>';
    cb.enemies.forEach(e => {
      const pct = Math.max(0, Math.min(100, Math.round((e.hp / Math.max(1, e.maxHp)) * 100)));
      h += `<div style="display:flex;align-items:center;gap:4px;padding:3px;border:1px solid #8f2d2d;margin-top:3px;opacity:${e.dead ? 0.35 : 1};">` +
        `<img src="${e.img || 'img/Z_01.png'}" style="width:22px;height:22px;object-fit:cover;border-radius:3px;">` +
        `<div style="flex:1;min-width:0;"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.name}${e.stun > 0 ? ' 💫' : ''}</div>` +
        `<div style="height:4px;background:#1e293b;border-radius:2px;"><div style="width:${pct}%;height:100%;background:#ef4444;"></div></div></div></div>`;
    });
    h += '</div></div>';

    h += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">` +
      `<button class="btn btn-primary" onclick="STIKS.combatActAttack()">🎲 Атака</button>` +
      `<button class="btn" ${p._skillUsed ? 'disabled' : ''} onclick="STIKS.combatUseSkill()">${arch.ico} ${arch.skill} (1/1)</button>` +
      (hasDual ? `<button class="btn" style="border-color:#38bdf8;color:#bae6fd;" onclick="STIKS.combatSwitchWeap()">🔄 Оружие (0 ОХ)</button>` : '') +
      `</div>`;

    // Кнопки Даров бойца
    const darBtns = [];
    Object.keys(p.gifts || {}).forEach(gk => {
      const dMeta = C && C.DARS && C.DARS[gk];
      if (!dMeta) return;
      if (dMeta.type === 'active') darBtns.push(`<button class="btn" style="flex:1 1 45%;padding:4px;" onclick="STIKS.combatUseDar('${gk}','')">🧬 ${dMeta.name}</button>`);
      Object.keys((p.gifts[gk] && p.gifts[gk].branches) || {}).forEach(bk => {
        const bMeta = (dMeta.branches || []).find(x => x.id === bk);
        if (bMeta && bMeta.type === 'active') darBtns.push(`<button class="btn" style="flex:1 1 45%;padding:4px;" onclick="STIKS.combatUseDar('${gk}','${bk}')">🧬 ${bMeta.name}</button>`);
      });
    });
    if (darBtns.length) h += `<div style="display:flex;gap:4px;flex-wrap:wrap;">${darBtns.join('')}</div>`;
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 8А/10: ПОСЕЛЕНИЕ И ГНЕЗДО (ЛАВКА, КОНТЕЙНЕР 20000 КГ)
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.STASH_MAX_KG = 20000;

  S.openSettlement = function(uid) {
    const vp = document.getElementById('game-viewport');
    const C = global.STIKS_CONTENT;
    const hr = this.findHeroByUid(uid);
    if (!vp || !hr) return;
    this.normalizePlayerStats(hr);

    const isInf = Boolean(hr.isInfected && !hr.isKvaz);
    const title = isInf ? '☣️ ГНЕЗДО УЛЬЯ' : '🏘️ ПОСЕЛЕНИЕ УЛЬЯ';
    const jobs = (C && C.BASES && C.BASES.jobs && (isInf ? C.BASES.jobs.infected : C.BASES.jobs.human)) || [];
    const trains = (C && C.BASES && C.BASES.training && (isInf ? C.BASES.training.infected : C.BASES.training.human)) || [];

    const stashW = this._round100((this.db.stash || []).reduce((acc, it) => acc + ((C && C.getItemWeight ? C.getItemWeight(it) : Number(it.w || 0)) * (it.q || 1)), 0));
    const webCnt = (hr.inv || []).filter(x => x.id === 'hive_web' || /паутин/i.test(x.n || '')).reduce((a, b) => a + (b.q || 1), 0);

    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #3d1c1c;padding-bottom:5px;margin-bottom:6px;">` +
      `<b>${title} • ${hr.name} (💎 ${hr.sporans || 0})</b>` +
      `<button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.renderLobby()">◀ Лобби</button></div>` +
      `<div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">❤️ ${hr.hp}/${hr.maxHp} • 🍖 Сыт: ${hr.food} • 💧 Жажд: ${hr.water} • 📦 Контейнер: ${stashW}/20 000 кг</div>`;

    h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;margin-bottom:6px;border-radius:4px;">` +
      `<div style="color:#fde047;font-weight:bold;margin-bottom:4px;">🛒 ЛАВКА, СКУПЩИК И КОНТЕЙНЕР</div>` +
      `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">` +
      `<button class="btn btn-ok" onclick="STIKS.openShopModal('${hr.uid}')">🏪 Открыть Лавку</button>` +
      `<button class="btn" onclick="STIKS.sellWebs('${hr.uid}')">🕸️ Паутина (${webCnt} → ${Math.floor(webCnt / 10)}💎)</button>` +
      `<button class="btn" onclick="STIKS.restAtBase('${hr.uid}')">🛏️ Отдых (1💎)</button></div>` +
      `<div style="display:flex;gap:4px;">` +
      `<button class="btn" style="border-color:#38bdf8;color:#bae6fd;" onclick="STIKS.openStashModal('${hr.uid}')">📦 Контейнер (20 000 кг)</button>` +
      `<button class="btn" style="border-color:#c084fc;color:#e9d5ff;" onclick="STIKS.openQuestNpcModal('${hr.uid}')">${isInf ? '👑 Матка Улья (КВ)' : '🌿 Знахарь (КВ авто)'}</button>` +
      `</div></div>`;

    h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;margin-bottom:6px;border-radius:4px;">` +
      `<div style="color:#7dd3fc;font-weight:bold;margin-bottom:4px;">⚒️ РАБОТА (+2 💎, расход 34% сытости/воды)</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">`;
    jobs.forEach(j => {
      h += `<button class="btn" style="text-align:left;padding:4px 6px;" onclick="STIKS.doBaseWork('${hr.uid}','${j.id}','${j.stat}','${j.n}')">${j.n}</button>`;
    });
    h += '</div></div>';

    h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;border-radius:4px;">` +
      `<div style="color:#c084fc;font-weight:bold;margin-bottom:4px;">🎓 ТРЕНИРОВКА И ЗАВЕДЕНИЯ (цена 2^n)</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">`;
    trains.forEach(t => {
      const cost = C && C.getTrainingCost ? C.getTrainingCost(hr, t.id, false) : 2;
      h += `<button class="btn" style="text-align:left;padding:4px 6px;" onclick="STIKS.doBaseTrain('${hr.uid}','${t.id}','${t.stat}',${Boolean(t.isBar)},'${t.n}')">${t.n} (${cost}💎)</button>`;
    });
    h += '</div></div>';

    vp.innerHTML = h;
  };

  S.sellWebs = function(uid) {
    const hr = this.findHeroByUid(uid);
    if (!hr) return;
    let total = 0;
    hr.inv = (hr.inv || []).filter(it => {
      if (it.id === 'hive_web' || /паутин/i.test(it.n || '')) { total += (it.q || 1); return false; }
      return true;
    });
    const bundles = Math.floor(total / 10);
    const rem = total % 10;
    if (rem > 0) hr.inv.push({ id: 'hive_web', n: '🕸️ Паутина Улья', cat: 'trophy', rank: 1, w: 0, q: rem, desc: 'Сдаётся по курсу 10:1 💎.' });
    if (bundles > 0) { hr.sporans = (hr.sporans || 0) + bundles; this.log(`🕸️ Сдано ${bundles * 10} паутины → <b>+${bundles} 💎</b>!`); }
    else this.log('⚠️ Нужно минимум 10 шт. паутины для обмена.');
    this.saveDB(); this.openSettlement(uid);
  };

  S.restAtBase = function(uid) {
    const hr = this.findHeroByUid(uid);
    if (!hr || (hr.sporans || 0) < 1) { this.log('❌ Нужно 1 💎 для отдыха.'); return; }
    hr.sporans -= 1; hr.hp = hr.maxHp; hr.mana = hr.maxMana; hr.food = hr.maxFood; hr.water = hr.maxWater;
    if (hr.carQuest && hr.carQuest.stage === 'repair') {
      hr.carQuest.sleepsDone = (hr.carQuest.sleepsDone || 0) + 1;
      this.log(`🛏️ Отдых учтён для квеста транспорта (${hr.carQuest.sleepsDone}/3)!`);
    }
    this.saveDB(); this.log(`🛏️ <b>${hr.name}</b> полностью восстановил силы (-1 💎).`); this.openSettlement(uid);
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 8Б/10: ЛАВКА, КОНТЕЙНЕР 20000 КГ, РАБОТЫ И ТРЕНИРОВКИ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.openShopModal = function(uid) {
    const vp = document.getElementById('game-viewport'), C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    if (!vp || !hr) return;

    const stock = [
      ...this.LOOT_POOL.filter(x => x.rank <= 3),
      ...((C && C.ITEMS && C.ITEMS.meleeWeapons) || []).filter(x => x.rank <= 3),
      (C && C.ECONOMY && C.ECONOMY.pearls && C.ECONOMY.pearls.black),
      (C && C.ECONOMY && C.ECONOMY.pearls && C.ECONOMY.pearls.red),
      (C && C.ECONOMY && C.ECONOMY.pearls && C.ECONOMY.pearls.white),
      (C && C.ECONOMY && C.ECONOMY.specials && C.ECONOMY.specials.hivePea),
      (C && C.ECONOMY && C.ECONOMY.specials && C.ECONOMY.specials.azamatEgg)
    ].filter(Boolean);

    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #3d1c1c;padding-bottom:5px;margin-bottom:6px;">` +
      `<b>🏪 ЛАВКА • ${hr.name} (💎 ${hr.sporans || 0})</b>` +
      `<button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.openSettlement('${uid}')">◀ На базу</button></div>`;

    h += '<div style="color:#86efac;font-size:10.5px;margin-bottom:4px;">КУПИТЬ В ЛАВКЕ:</div>';
    stock.forEach((it, idx) => {
      const price = C && C.getBuyPrice ? C.getBuyPrice(it, hr) : (it.price || 1);
      h += `<div style="display:flex;justify-content:space-between;align-items:center;background:#141a17;padding:4px 6px;margin-bottom:3px;border:1px solid #2e7d4f;font-size:10.5px;">` +
        `<div><b>[P${it.rank || 1}] ${it.n}</b><br><span style="font-size:9.5px;color:#94a3b8;">${this.describeItem(it)}</span></div>` +
        `<button class="btn btn-ok" style="flex:0 0 auto;padding:3px 7px;" onclick="STIKS.buyShopStockItem('${uid}',${idx})">${price}💎</button></div>`;
    });

    h += '<div style="color:#fde047;font-size:10.5px;margin:6px 0 4px 0;">ПРОДАТЬ ИЗ РЮКЗАКА (50% цены):</div>';
    (hr.inv || []).forEach((it, idx) => {
      const sellP = C && C.getSellPrice ? C.getSellPrice(it) : 1;
      if (sellP <= 0) return;
      h += `<div style="display:flex;justify-content:space-between;align-items:center;background:#141a17;padding:4px 6px;margin-bottom:3px;border:1px solid #3d1c1c;font-size:10.5px;">` +
        `<span>${it.n}${it.q > 1 ? ' ×' + it.q : ''}</span>` +
        `<button class="btn" style="flex:0 0 auto;padding:3px 7px;" onclick="STIKS.sellHeroItem('${uid}',${idx})">+${sellP}💎</button></div>`;
    });

    this._lastShopStock = stock;
    vp.innerHTML = h;
  };

  S.buyShopStockItem = function(uid, idx) {
    const C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    const tpl = this._lastShopStock && this._lastShopStock[idx];
    if (!hr || !tpl) return;
    const price = C && C.getBuyPrice ? C.getBuyPrice(tpl, hr) : (tpl.price || 1);
    if ((hr.sporans || 0) < price) { this.log('❌ Не хватает споранов!'); return; }
    hr.sporans -= price;
    const clone = Object.assign({ q: 1 }, tpl);
    if (!String(clone.n || '').startsWith('[P')) clone.n = `[P${clone.rank || 1}] ${clone.n}`;
    hr.inv.push(clone);
    this.saveDB();
    this.log(`🛒 Куплено: <b>${clone.n}</b> (-${price}💎).`);
    this.openShopModal(uid);
  };

  S.sellHeroItem = function(uid, idx) {
    const C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    const it = hr && hr.inv && hr.inv[idx];
    if (!hr || !it) return;
    const sellP = C && C.getSellPrice ? C.getSellPrice(it) : 1;
    hr.sporans = (hr.sporans || 0) + sellP;
    if (it.q > 1) it.q--; else hr.inv.splice(idx, 1);
    this.saveDB();
    this.log(`💰 Продано: <b>${it.n}</b> (+${sellP}💎).`);
    this.openShopModal(uid);
  };

  S.doBaseWork = function(uid, jobId, statKey, jobName) {
    const hr = this.findHeroByUid(uid);
    if (!hr) return;
    if ((hr.food || 0) < 17 || (hr.water || 0) < 17) { this.log('⚠️ Слишком голоден/обезвожен для смены (нужно >=34%).'); return; }
    hr.food = Math.max(0, hr.food - 17); hr.water = Math.max(0, hr.water - 17);
    hr.sporans = (hr.sporans || 0) + 2;
    if (hr.stats && statKey) hr.stats[statKey] = this._round100((hr.stats[statKey] || 10) + 0.5);

    if ((jobId === 'mine' || jobId === 'bones') && hr.carQuest && hr.carQuest.stage === 'repair') {
      hr.carQuest.shiftsDone = (hr.carQuest.shiftsDone || 0) + 1;
      this.log(`⛏️ Смена в Шахте учтена для ремонта транспорта (${hr.carQuest.shiftsDone}/10)!`);
    }
    this.normalizePlayerStats(hr); this.saveDB();
    this.log(`⚒️ Смена «${jobName}»: <b>+2 💎</b> и +0.5 к характеристике!`);
    this.openSettlement(uid);
  };

  S.doBaseTrain = function(uid, facId, statKey, isBar, facName) {
    const C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    if (!hr) return;
    const cost = C && C.getTrainingCost ? C.getTrainingCost(hr, facId, false) : 2;
    if ((hr.sporans || 0) < cost) { this.log(`❌ Нужно ${cost} 💎.`); return; }
    hr.sporans -= cost;
    hr.trainCounts = hr.trainCounts || {};
    hr.trainCounts[facId] = (hr.trainCounts[facId] || 0) + 1;
    if (isBar && Math.random() < 0.5) {
      const fine = cost * 5;
      hr.sporans = Math.max(0, hr.sporans - fine);
      this.log(`🍺 Дебош в заведении «${facName}»! Штраф ×5 (-${fine} 💎)!`);
    } else {
      if (hr.stats && statKey) hr.stats[statKey] = (hr.stats[statKey] || 10) + 1;
      if ((facId === 'library' || facId === 'pool') && typeof this.unlockNextArchiveEntry === 'function') {
        const fNum = this.unlockNextArchiveEntry();
        if (fNum) this.log(`📜 Открыта запись Архива Дневника: <b>Факт #${fNum}</b>!`);
      }
      this.log(`🎓 Тренировка «${facName}» (-${cost} 💎): +1 к характеристике!`);
    }
    this.normalizePlayerStats(hr); this.saveDB(); this.openSettlement(uid);
  };

  S.openStashModal = function(uid) {
    const vp = document.getElementById('game-viewport'), hr = this.findHeroByUid(uid);
    if (!vp || !hr) return;
    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #3d1c1c;padding-bottom:5px;margin-bottom:6px;">` +
      `<b>📦 КОНТЕЙНЕР (20 000 кг)</b><button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.openSettlement('${uid}')">◀ Назад</button></div>`;
    h += '<div style="color:#86efac;font-size:10.5px;margin-bottom:4px;">В КОНТЕЙНЕРЕ:</div>';
    (this.db.stash || []).forEach((it, i) => {
      h += `<div style="display:flex;justify-content:space-between;background:#141a17;padding:4px;margin-bottom:3px;border:1px solid #2e7d4f;"><span>${it.n}</span>` +
        `<button class="btn btn-ok" style="flex:0 0 auto;padding:2px 6px;" onclick="STIKS.findHeroByUid('${uid}').inv.push(STIKS.db.stash.splice(${i},1)[0]);STIKS.saveDB();STIKS.openStashModal('${uid}')">Забрать</button></div>`;
    });
    h += '<div style="color:#7dd3fc;font-size:10.5px;margin:6px 0 4px 0;">В РЮКЗАКЕ БОЙЦА:</div>';
    (hr.inv || []).forEach((it, i) => {
      h += `<div style="display:flex;justify-content:space-between;background:#141a17;padding:4px;margin-bottom:3px;border:1px solid #3d1c1c;"><span>${it.n}</span>` +
        `<button class="btn" style="flex:0 0 auto;padding:2px 6px;" onclick="STIKS.db.stash.push(STIKS.findHeroByUid('${uid}').inv.splice(${i},1)[0]);STIKS.saveDB();STIKS.openStashModal('${uid}')">Положить</button></div>`;
    });
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 9/10: КВЕСТЫ ЗНАХАРЯ (АВТОСВАЛКА) И МАТКИ УЛЬЯ (КЛАДБИЩЕ)
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.openQuestNpcModal = function(uid) {
    const vp = document.getElementById('game-viewport'), C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    if (!vp || !hr) return;

    const isInf = Boolean(hr.isInfected && !hr.isKvaz);
    const qKey = isInf ? 'packQuest' : 'carQuest';
    const q = hr[qKey] = hr[qKey] || { stage: 'none', escortsDone: 0, shiftsDone: 0, sleepsDone: 0 };
    const webCnt = (hr.inv || []).filter(x => x.id === 'hive_web' || /паутин/i.test(x.n || '')).reduce((a, b) => a + (b.q || 1), 0);

    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #c084fc;padding-bottom:5px;margin-bottom:6px;">` +
      `<b style="color:#e9d5ff;">${isInf ? '👑 МАТКА УЛЬЯ (КВЕСТ СТАИ)' : '🌿 ЗНАХАРЬ (КВЕСТ ТРАНСПОРТА)'}</b>` +
      `<button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.openSettlement('${uid}')">◀ На базу</button></div>`;

    if (q.stage === 'none') {
      h += `<div style="font-size:11px;color:#cbd5e1;margin-bottom:8px;">«Принеси мне <b>30 шт. Паутины Улья</b> (у тебя: ${webCnt}/30) — я открою маршрут на ${isInf ? '<b>Древнее Кладбище</b> за Короной Избранного' : '<b>Автосвалку</b> за уцелевшим авто'}!»</div>` +
        `<button class="btn btn-ok" ${webCnt < 30 ? 'disabled' : ''} onclick="STIKS.advanceNpcQuest('${uid}','start')">🕸️ Отдать 30 паутины и открыть локацию</button>`;
    } else if (q.stage === 'need_junkyard' || q.stage === 'need_cemetery' || q.stage === 'started') {
      h += `<div style="font-size:11px;color:#fde047;margin-bottom:8px;">Маршрут открыт! Выйдите в Лобби, соберите отряд и отправьтесь на <b>${isInf ? '🪦 Кладбище (КВ)' : '🚗 Автосвалку (КВ)'}</b>, чтобы найти и эвакуировать ${isInf ? 'Корону Избранного' : 'остов машины'}.</div>`;
    } else if (q.stage === 'repair' || q.stage === 'trial') {
      const eOk = (q.escortsDone || 0) >= 5;
      const sOk = (q.shiftsDone || 0) >= 10;
      const rOk = (q.sleepsDone || 0) >= 3;
      h += `<div style="font-size:11px;color:#cbd5e1;margin-bottom:6px;">Этап сборки/выращивания:</div>` +
        `<div style="font-size:10.5px;background:#141a17;padding:6px;border:1px solid #3d1c1c;margin-bottom:6px;">` +
        `<div>${eOk ? '✅' : '⏳'} ${isInf ? 'Поглощено/приведено спутников' : 'Приведено ИИ-спутников в Поселение'}: <b>${q.escortsDone || 0}/5</b></div>` +
        `<div>${sOk ? '✅' : '⏳'} Отработано смен в Шахте/Костях: <b>${q.shiftsDone || 0}/10</b></div>` +
        `<div>${rOk ? '✅' : '⏳'} Отдых/сон на базе: <b>${q.sleepsDone || 0}/3</b></div></div>` +
        `<button class="btn btn-ok" ${!(eOk && sOk && rOk) ? 'disabled' : ''} onclick="STIKS.advanceNpcQuest('${uid}','finish')">🎉 Завершить сборку и получить ${isInf ? 'Стаю' : 'Транспорт'}</button>`;
    } else if (q.stage === 'done') {
      const ride = isInf ? (hr.packPen && hr.packPen.pack) : (hr.garage && hr.garage.car);
      h += `<div style="font-size:11px;color:#86efac;margin-bottom:8px;">✅ В строю: <b>${(ride && ride.n) || 'Транспорт/Стая'}</b>! В Лобби теперь открыты <b>Дальние сектора (+1 / +2)</b>.</div>` +
        `<button class="btn" onclick="STIKS.refuelRide('${uid}')">⛽ Заправить / накормить до 100% (5💎)</button>`;
    }

    vp.innerHTML = h;
  };

  S.advanceNpcQuest = function(uid, action) {
    const C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    if (!hr) return;
    const isInf = Boolean(hr.isInfected && !hr.isKvaz);
    const qKey = isInf ? 'packQuest' : 'carQuest';
    const q = hr[qKey] = hr[qKey] || {};

    if (action === 'start') {
      let left = 30;
      hr.inv = (hr.inv || []).filter(it => {
        if (left <= 0) return true;
        if (it.id === 'hive_web' || /паутин/i.test(it.n || '')) {
          const take = Math.min(left, it.q || 1);
          left -= take;
          if ((it.q || 1) > take) { it.q -= take; return true; }
          return false;
        }
        return true;
      });
      q.stage = isInf ? 'need_cemetery' : 'need_junkyard';
      q.escortsDone = q.shiftsDone = q.sleepsDone = 0;
      this.log(`📜 Квест принят! В Лобби открылась локация <b>${isInf ? '🪦 Кладбище (КВ)' : '🚗 Автосвалка (КВ)'}</b>!`);
    } else if (action === 'finish') {
      q.stage = 'done';
      if (isInf) {
        const pPool = (C && C.QUESTS && C.QUESTS.packs) || {};
        const pick = pPool[q.crownId] || pPool.young || { id: 'young', n: '🐾 Выводок прыгунов', cargoKg: 250 };
        hr.packPen = { pack: Object.assign({ fuel: 100 }, pick) };
        delete hr.carryingCrown;
      } else {
        const vPool = (C && C.QUESTS && C.QUESTS.vehicles) || {};
        const pick = vPool[q.carId] || vPool.prius || { id: 'prius', n: '🚗 Toyota Prius', cargoKg: 350 };
        hr.garage = { car: Object.assign({ fuel: 100 }, pick) };
        delete hr.towingCar;
      }
      this.normalizePlayerStats(hr);
      this.log(`🎉 Квест завершён! Получен <b>${isInf ? hr.packPen.pack.n : hr.garage.car.n}</b> — открыты Дальние сектора!`);
    }
    this.saveDB();
    this.openQuestNpcModal(uid);
  };

  S.refuelRide = function(uid) {
    const hr = this.findHeroByUid(uid);
    if (!hr || (hr.sporans || 0) < 5) { this.log('❌ Нужно 5 💎.'); return; }
    hr.sporans -= 5;
    if (hr.garage && hr.garage.car) hr.garage.car.fuel = 100;
    if (hr.packPen && hr.packPen.pack) hr.packPen.pack.fuel = 100;
    this.saveDB();
    this.log('⛽ Бак / запас мяса восполнен до 100% (-5 💎)!');
    this.openQuestNpcModal(uid);
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ 10/10: ПОЛНЫЙ 5-ВКЛАДОЧНЫЙ ДНЕВНИК УЛЬЯ И СОВМЕСТИМОСТЬ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.ensureTraderStock = S.ensureTraderStock || function() { return []; };
  S.bindHeroCompat = S.bindHeroCompat || function(h) { return h; };
  S.recalcLevel = S.recalcLevel || function(h) { return h; };
  S.syncHeroProfile = S.syncHeroProfile || function(h) { this.normalizePlayerStats(h); return h; };

  S.getCodexState = function() {
    this.db.codex = this.db.codex || { archive: [] };
    this.db.codex.archive = Array.isArray(this.db.codex.archive) ? this.db.codex.archive : [];
    return this.db.codex;
  };
  S.saveCodexState = function(st) { this.db.codex = st; this.saveDB(); };
  S.syncCodexFromRoster = function() { return this.getCodexState(); };

  S.unlockNextArchiveEntry = function() {
    const st = this.getCodexState(), pool = [];
    for (let i = 1; i <= 69; i++) {
      const id = 'arch_' + (i < 10 ? '0' : '') + i;
      if (!st.archive.includes(id)) pool.push(i);
    }
    if (!pool.length) return null;
    const spec = [31, 32, 33, 69].filter(n => pool.includes(n));
    const pick = (spec.length && Math.random() < 0.45) ? spec[Math.floor(Math.random() * spec.length)] : pool[0];
    st.archive.push('arch_' + (pick < 10 ? '0' : '') + pick);
    this.saveCodexState(st);
    return pick;
  };

  S.showCodexZoom = function(imgSrc, title) {
    const old = document.getElementById('stiks-codex-zoom');
    if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'stiks-codex-zoom';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(4,5,8,0.95);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;font-family:monospace;';
    ov.innerHTML = `<div style="color:#fbbf24;font-weight:bold;margin-bottom:8px;">${title || 'Архив Улья'}</div>` +
      `<img src="${imgSrc}" style="max-width:100%;max-height:80vh;border-radius:8px;border:2px solid #d97706;">` +
      `<button class="btn btn-primary" style="margin-top:10px;width:auto;padding:6px 18px;" onclick="document.getElementById('stiks-codex-zoom').remove()">✖ Закрыть фото</button>`;
    document.body.appendChild(ov);
  };

  S.openCodex = function(tab) {
    const vp = document.getElementById('game-viewport'), C = global.STIKS_CONTENT;
    if (!vp) return;
    const curTab = tab || 'gifts';
    const tabs = (C && C.CODEX && C.CODEX.tabs) || [
      { id: 'gifts', n: '🧬 Дары' }, { id: 'arch', n: '👤 Архетипы' },
      { id: 'zombies', n: '☣️ Мутанты' }, { id: 'items', n: '🎒 Артефакты' }, { id: 'archive', n: '📜 Архив (69)' }
    ];

    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d97706;padding-bottom:5px;margin-bottom:6px;">` +
      `<b style="color:#fbbf24;">📖 ДНЕВНИК УЛЬЯ</b>` +
      `<button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.db.session ? STIKS.renderGame() : STIKS.renderLobby()">✖ Закрыть</button></div>` +
      `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:8px;">` +
      tabs.map(t => `<button class="btn ${t.id === curTab ? 'btn-primary' : ''}" style="flex:1 1 30%;padding:4px;font-size:10px;" onclick="STIKS.openCodex('${t.id}')">${t.n}</button>`).join('') +
      `</div><div style="max-height:360px;overflow-y:auto;">`;

    if (curTab === 'gifts' && C && C.DARS) {
      Object.values(C.DARS).forEach(d => {
        const brs = (d.branches || []).map(b => `<div style="font-size:10px;color:#cbd5e1;margin-left:8px;">• <b>${b.name}</b>: ${b.desc}</div>`).join('');
        h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;margin-bottom:5px;border-radius:4px;">` +
          `<b style="color:#c084fc;">🧬 ${d.name}</b> <span style="font-size:10px;color:#94a3b8;">(${d.pool === 'infected' ? 'Заражённый' : 'Человек'})</span>` +
          `<div style="font-size:10.5px;margin:3px 0;">${d.desc}</div>${brs}</div>`;
      });
    } else if (curTab === 'arch' && C && C.ARCHETYPES) {
      Object.values(C.ARCHETYPES).forEach(a => {
        h += `<div style="display:flex;gap:6px;align-items:center;background:#141a17;border:1px solid #3d1c1c;padding:5px;margin-bottom:4px;border-radius:4px;">` +
          `<img src="${a.img || 'img/kachok.jpeg'}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;">` +
          `<div style="font-size:10.5px;"><b>${a.ico || ''} ${a.name}</b> • Навык: <b style="color:#fde047;">${a.skill}</b><br><span style="color:#94a3b8;">${a.hint || a.phrase || ''}</span></div></div>`;
      });
    } else if (curTab === 'zombies' && C && C.Z_RANKS) {
      C.Z_RANKS.forEach(z => {
        h += `<div style="display:flex;gap:6px;align-items:center;background:#141a17;border:1px solid #5c2828;padding:5px;margin-bottom:4px;border-radius:4px;">` +
          `<img src="${z.img || 'img/Z_01.png'}" style="width:34px;height:34px;object-fit:cover;border-radius:4px;">` +
          `<div style="font-size:10.5px;"><b>[Р.${z.r}] ${z.name}</b> (Ур.${z.minLvl}–${z.maxLvl})<br><span style="color:#fca5a5;">❤️ ОЗ: ${z.hp} • ⚔️ Атака: ${z.dmg}</span></div></div>`;
      });
    } else if (curTab === 'items' && C && C.ITEMS) {
      [...(C.ITEMS.meleeWeapons || []), ...(C.ITEMS.shameAmulets || [])].forEach(it => {
        h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:5px;margin-bottom:4px;border-radius:4px;font-size:10.5px;">` +
          `<b>[P${it.rank || 1}] ${it.n}</b><div style="color:#94a3b8;">${it.desc || ''}</div></div>`;
      });
    } else {
      const st = this.getCodexState();
      const facts = (C && C.CODEX && C.CODEX.photoFacts) || {};
      for (let i = 1; i <= 69; i++) {
        const id = 'arch_' + (i < 10 ? '0' : '') + i;
        if (!st.archive.includes(id)) {
          h += `<div style="font-size:10px;color:#475569;padding:3px 0;border-bottom:1px dashed #1e293b;">🔒 Запись #${i} — [Не найдено в архивах]</div>`;
        } else if (facts[i]) {
          h += `<div style="background:#1c1712;border:1px solid #d97706;padding:7px;margin:5px 0;border-radius:4px;">` +
            `<b style="color:#fbbf24;">📜 ${facts[i].title}</b><div style="font-size:11px;margin:4px 0;">${facts[i].text}</div>` +
            `<img src="${facts[i].imgs[0]}" onclick="STIKS.showCodexZoom('${facts[i].imgs[0]}','${facts[i].title}')" style="width:100%;max-height:170px;object-fit:cover;border-radius:4px;cursor:zoom-in;"></div>`;
        } else {
          h += `<div style="font-size:10.5px;color:#fef3c7;padding:4px 0;border-bottom:1px dashed #3d2c1e;">📜 <b>Факт #${i}</b>: Запись архива Улья изучена.</div>`;
        }
      }
    }
    h += '</div>';
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // КАНОН ПУЛА ЖЕМЧУГА (КВАЗ / ЗАРАЖЁННЫЙ ОТДЕЛЬНО) И СТОЙКОСТЬ ЛЕГЕНДЫ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.awakenLegendaryClass = function() {};
  S.checkLegendaryCapAwakening = function() { return false; };

  // Обработка попытки обращения персонажа вниз (в сторону Кваза или Заражённого)
  S.applyMutationRoll = function(p, targetForm) {
    // targetForm: 'kvaz' или 'infected'
    if (p.isLegendary) {
      // Легендарный уже проходил все формы существования -> проверка стойкости духа 50/50
      if (Math.random() < 0.5) {
        p.stats.int = (p.stats.int || 10) + 50;
        p.stats.spi = (p.stats.spi || 10) + 50;
        this.log(`✨ <b>Стойкость духа Легендарного (50%)!</b> Удержал человеческую суть от падения в ${targetForm === 'kvaz' ? 'Кваза' : 'Заражённого'}: <b>+50 Интеллект и +50 Дух</b>!`);
        return;
      }
      // Срыв стойкости -> обращается именно в выпавшую в рулоне форму со статусом Легендарного (+100 физ. статы)
      ['str', 'agi', 'spd', 'end'].forEach(k => { p.stats[k] = (p.stats[k] || 10) + 100; });
      if (targetForm === 'kvaz') {
        p.isKvaz = true;
        p.isInfected = false;
        p.arch = p.sex === 'f' ? 'legend_kvaz_f' : 'legend_kvaz_m';
        this.log('💥 <b>Срыв стойкости Легендарного (50%)!</b> Обращение в <b>👑 Легендарного Кваза</b>: <b>+100 ко всем физическим статам</b>!');
      } else {
        p.isKvaz = false;
        p.isInfected = true;
        p.arch = 'legend_z';
        this.log('💥 <b>Срыв стойкости Легендарного (50%)!</b> Обращение в <b>☣️ Легендарного Заражённого</b>: <b>+100 ко всем физическим статам</b>!');
      }
      return;
    }

    // Обычный человек (не Легендарный) -> обращается в выпавшую в рулоне форму
    p._prevHumanArch = p.arch;
    if (targetForm === 'kvaz') {
      p.isKvaz = true;
      p.isInfected = false;
      p.arch = p.sex === 'f' ? 'kvaz_f' : 'kvaz_m';
      p.visitedForms = Object.assign(p.visitedForms || {}, { human: true, kvaz: true });
      this.log('👹 <b>Пул жемчуга сработал на обращение в Кваза!</b> Герой мутировал в <b>Кваза</b>!');
    } else {
      p.isKvaz = false;
      p.isInfected = true;
      p.arch = 'infected';
      p.visitedForms = Object.assign(p.visitedForms || {}, { human: true, infected: true });
      this.log('☣️ <b>Пул жемчуга сработал на заражение!</b> Герой обратился в <b>Особого заражённого</b>!');
    }
  };

  const prevUseInv = S.useInvItem.bind(S);
  S.useInvItem = function(idx) {
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    const it = p && p.inv && p.inv[idx];
    if (!p || !it) return;

    const raw = String((it.id || '') + ' ' + (it.n || '')).toLowerCase();
    const isBlack = /black_pearl|чёрный жемчуг|черный жемчуг/.test(raw);
    const isRed = /red_pearl|красный жемчуг/.test(raw);
    const isWhite = /white_pearl|белый жемчуг/.test(raw);

    if (!isBlack && !isRed && !isWhite) {
      return prevUseInv(idx);
    }

    const isInf = Boolean((p.isInfected || p.asInfected || p.arch === 'infected' || p.arch === 'legend_z') && !p.isKvaz);

    // 1. Заражённый: Чёрный/Красный запрещены; 1-й Белый жемчуг -> Кваз
    if (isInf) {
      if (isBlack || isRed) {
        this.log('⛔ На Особого заражённого Чёрный и Красный жемчуг не действуют! Нужен Белый жемчуг.');
        return;
      }
      if (isWhite) {
        p.visitedForms = Object.assign(p.visitedForms || {}, { infected: true, kvaz: true });
        p.isKvaz = true;
        p.isInfected = false;
        p.arch = p.isLegendary ? (p.sex === 'f' ? 'legend_kvaz_f' : 'legend_kvaz_m') : (p.sex === 'f' ? 'kvaz_f' : 'kvaz_m');
        this.log('👹 <b>Белый жемчуг:</b> Заражённый поднялся в форму <b>Кваза</b> с сохранением коэффициентов роста!');
      }
    }
    // 2. Кваз: Белый жемчуг -> очищение в Человека (если прошёл все формы — присваивается статус Легендарного!)
    else if (p.isKvaz) {
      if (isWhite) {
        p.visitedForms = Object.assign(p.visitedForms || {}, { kvaz: true, human: true });
        p.isKvaz = false;
        p.isInfected = false;
        p.asInfected = false;
        delete p._kvazHungerMult;

        // Если прошёл все ступени существования и вернулся в человека -> Легендарный!
        if (p.visitedForms.infected && p.visitedForms.kvaz && p.visitedForms.human) {
          p.isLegendary = true;
          p.arch = p.sex === 'f' ? 'legend_f' : 'legend_m';
          this.log(`👑 <b>ПОЛНОЕ ОЧИЩЕНИЕ УЛЬЯ!</b> Пройдя все формы существования и вернувшись в человека, <b>${p.name}</b> обретает титул <b>«Легендарный${p.sex === 'f' ? 'ая' : ''}»</b>!`);
        } else {
          p.arch = p._prevHumanArch || 'kachok';
          this.log(`⚪ <b>Белый жемчуг:</b> Кваз очистился в человека (сохранена 1/2 бонуса статов).`);
        }
      } else {
        const pts = isRed ? 3 : 1;
        p.freePoints = (p.freePoints || 0) + pts;
        this.log(`💎 Кваз поглотил жемчуг: <b>+${pts} свободных уровней</b>.`);
      }
    }
    // 3. Человек (обычный или Легендарный)
    else {
      p.visitedForms = Object.assign(p.visitedForms || {}, { human: true });
      if (isWhite) {
        p.freePoints = (p.freePoints || 0) + 5;
        this.log('⚪ <b>Белый жемчуг</b> поглощён: <b>+5 свободных уровней</b>!');
      } else {
        // Раздельные шансы в рулоне жемчуга:
        // Чёрный: 12% Кваз, 8% Заражённый, 80% +1 уровень
        // Красный: 20% Кваз, 15% Заражённый, 65% +3 уровня
        const roll = Math.random();
        const kvazChance = isRed ? 0.20 : 0.12;
        const infChance = isRed ? 0.15 : 0.08;

        if (roll < kvazChance) {
          this.applyMutationRoll(p, 'kvaz');
        } else if (roll < kvazChance + infChance) {
          this.applyMutationRoll(p, 'infected');
        } else {
          const pts = isRed ? 3 : 1;
          p.freePoints = (p.freePoints || 0) + pts;
          this.log(`💎 Жемчуг Улья усвоен чисто: <b>+${pts} свободных уровней</b>!`);
        }
      }
    }

    if (it.q > 1) it.q--; else p.inv.splice(idx, 1);
    this.normalizePlayerStats(p);
    this.saveDB();
    this.openInv();
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // КАНОН ПРОЗРЕНИЯ: ОСОБЫЙ ЗАРАЖЁННЫЙ УБИЛ ВРАГА 15+ УР. СТАРШЕ (30%)
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  const prevAdvance = S.advanceCombatTurn.bind(S);
  S.advanceCombatTurn = function() {
    const s = this.db && this.db.session, cb = s && s.combat, C = global.STIKS_CONTENT;
    if (cb && cb.enemies && cb.enemies.every(e => e.dead)) {
      const zRanks = (C && C.Z_RANKS) || [];
      const infHero = cb.allies.find(a => a && a.kind === 'player' && (a.isInfected || a.asInfected || a.arch === 'infected' || a.arch === 'legend_z') && !a.isKvaz);

      if (infHero) {
        const heroLvl = Number(infHero.lvl) || 0;
        const maxEnemyLvl = Math.max(0, ...cb.enemies.map(e => {
          const meta = zRanks.find(z => z.r === (e.rank || 0));
          return Number((e.lvl != null ? e.lvl : (meta && meta.minLvl)) || (e.rank || 0) * 5);
        }));

        // Особый заражённый убил соперника на 15+ уровней старше -> 30% шанс Прозрения (50/50 Кваз или Человек)
        if (maxEnemyLvl - heroLvl >= 15 && Math.random() < 0.30) {
          infHero.visitedForms = Object.assign(infHero.visitedForms || {}, { infected: true });
          if (Math.random() < 0.50) {
            infHero.isInfected = false;
            infHero.isKvaz = true;
            infHero.visitedForms.kvaz = true;
            infHero.arch = infHero.isLegendary ? (infHero.sex === 'f' ? 'legend_kvaz_f' : 'legend_kvaz_m') : (infHero.sex === 'f' ? 'kvaz_f' : 'kvaz_m');
            this.log(`⚡ <b>ПРОЗРЕНИЕ ЗАРАЖЁННОГО (30%)!</b> Убив врага старше на 15+ уровней, <b>${infHero.name}</b> вырвался из мглы в форму <b>Кваза</b>!`);
          } else {
            infHero.isInfected = false;
            infHero.asInfected = false;
            infHero.isKvaz = false;
            infHero.visitedForms.human = true;
            if (infHero.visitedForms.infected && infHero.visitedForms.kvaz && infHero.visitedForms.human) {
              infHero.isLegendary = true;
              infHero.arch = infHero.sex === 'f' ? 'legend_f' : 'legend_m';
              this.log(`👑 <b>ПРОЗРЕНИЕ И ПОЛНОЕ ОЧИЩЕНИЕ!</b> <b>${infHero.name}</b> вернулся в человеческий облик со статусом <b>«Легендарный${infHero.sex === 'f' ? 'ая' : ''}»</b>!`);
            } else {
              infHero.arch = infHero._prevHumanArch || 'kachok';
              this.log(`⚡ <b>ПРОЗРЕНИЕ ЗАРАЖЁННОГО (30%)!</b> <b>${infHero.name}</b> прорвался сквозь серую мглу обратно в <b>Человека</b>!`);
            }
          }
          this.normalizePlayerStats(infHero);
        }
      }
    }
    prevAdvance();
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // ПАССИВКИ ЛЕГЕНДАРНЫХ СУЩЕСТВ НА КАРТЕ И В НАЧАЛЕ БОЯ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  // 1. Пассивка Легендарного Кваза на карте: мутанты ниже Р.9 игнорируют его на клетке
  const prevStep = S.stepPlayer.bind(S);
  S.stepPlayer = function(dx, dy) {
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    const isLegKvaz = p && (p.arch === 'legend_kvaz_m' || p.arch === 'legend_kvaz_f');
    if (s && isLegKvaz && Array.isArray(s.zombies)) {
      const nx = p.x + dx, ny = p.y + dy;
      const zIdx = s.zombies.findIndex(z => z.x === nx && z.y === ny);
      if (zIdx >= 0 && (s.zombies[zIdx].rank || 0) < 9) {
        this.log(`👑 <b>[Властелин Стаи]</b>: ${s.zombies[zIdx].name} в страхе расступился перед Легендарным Квазом!`);
        s.zombies[zIdx].x = Math.max(0, Math.min(59, nx + (dx || 1)));
      }
    }
    prevStep(dx, dy);
  };

  // 2. Боевые пассивки Легендарных в начале боя (Ужас -25% урона и пропуск 1-го хода у Лег. Заражённого)
  const prevStartCombat = S.startRaidCombat.bind(S);
  S.startRaidCombat = function(zIdx) {
    prevStartCombat(zIdx);
    const s = this.db && this.db.session, cb = s && s.combat;
    if (!cb || !Array.isArray(cb.allies) || !Array.isArray(cb.enemies)) return;

    const hasLegHuman = cb.allies.some(a => a.arch === 'legend_m' || a.arch === 'legend_f');
    const hasLegKvaz = cb.allies.some(a => a.arch === 'legend_kvaz_m' || a.arch === 'legend_kvaz_f');
    const hasLegZ = cb.allies.some(a => a.arch === 'legend_z');

    if (hasLegHuman || hasLegKvaz) {
      cb.enemies.forEach(en => { en.dmg = Math.max(1, Math.round((en.dmg || 4) * 0.75)); });
      this.log(`👑 <b>[Пассивка Легенды]</b>: «Вот он — реальный ужас Улья!» Враги подавлены (-25% атаки)!`);
    }
    if (hasLegZ) {
      cb.enemies.forEach(en => { en.stun = Math.max(en.stun || 0, 1); });
      this.log(`☣️ <b>[Аура Первородного Легендарного Заражённого]</b>: враги парализованы ужасом и пропускают 1-й раунд!`);
    }
    this.renderCombat();
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // ТРАНСПОРТ И СТАЯ: ПОЕЗДКИ, ВСТРЕЧИ В ПУТИ, БАГАЖНИК (6 ОХ) И ЗАЛП
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  // 1. Расход топлива/мяса (50% ближние, 100% дальние) и встречи в пути при высадке на транспорте/Стае
  const prevLaunch = S.launchMap.bind(S);
  S.launchMap = function(dKey = 'start') {
    const dk = String(dKey || 'start').toLowerCase();
    const isFar = (dk === 'far1' || dk === 'far2');
    const sqHeroes = (this.squad || []).map(uid => this.findHeroByUid(uid)).filter(Boolean);
    const driver = sqHeroes.find(h => (h.garage && h.garage.car) || (h.packPen && h.packPen.pack));

    if (driver && dk !== 'start') {
      const ride = (driver.garage && driver.garage.car) || (driver.packPen && driver.packPen.pack);
      const needFuel = isFar ? 100 : 50;
      if ((ride.fuel || 0) < needFuel) {
        this.log(`⛽ Не хватает топлива/запаса мяса у <b>${ride.n}</b> (нужно ${needFuel}%, сейчас ${ride.fuel || 0}%)!`);
        return;
      }
      ride.fuel -= needFuel;
      this.saveDB();

      const checks = isFar ? 3 : 1;
      const ramMax = Number(ride.ramRank || 2);
      let ambushes = 0;
      for (let c = 0; c < checks; c++) {
        if (Math.random() < 0.55) {
          const foeR = isFar ? (3 + Math.floor(Math.random() * 5)) : Math.floor(Math.random() * 4);
          if (foeR <= ramMax) {
            driver.sporans = (driver.sporans || 0) + foeR + 1;
            this.log(`💥 В пути <b>${ride.n}</b> протаранил мутанта Р.${foeR} (+${foeR + 1} 💎)!`);
          } else {
            ambushes++;
          }
        }
      }
      if (ambushes > 0) this.log(`⚠️ В дороге прорвались сильные твари (${ambushes}) — готовьтесь к бою!`);
    }

    prevLaunch(dKey);
    const s = this.db && this.db.session;
    if (s && driver) {
      s.activeRide = (driver.garage && driver.garage.car) || (driver.packPen && driver.packPen.pack);
      s.rideTrunk = Array.isArray(s.rideTrunk) ? s.rideTrunk : [];
      this.saveDB();
    }
  };

  // 2. Кнопка «🚚 Багажник / Носильщики (6 ОХ)» на локации
  S.openRideTrunkModal = function() {
    const vp = document.getElementById('game-viewport'), s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx], ride = s && s.activeRide;
    if (!vp || !p || !ride) return;
    s.rideTrunk = Array.isArray(s.rideTrunk) ? s.rideTrunk : [];
    const cap = Number(ride.cargoKg || 500);
    const curW = this._round100(s.rideTrunk.reduce((a, it) => a + (Number(it.w || 0) * (it.q || 1)), 0));

    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #38bdf8;padding-bottom:5px;margin-bottom:6px;">` +
      `<b>🚚 ${ride.n} (${curW}/${cap} кг)</b><button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.renderGame()">🗺️ Карта</button></div>` +
      `<div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">Перегрузка вещей с локации в багажник/носильщиков (стоит 6 ОХ за выгрузку).</div>`;

    h += '<div style="color:#86efac;font-size:10.5px;margin-bottom:4px;">В БАГАЖНИКЕ / НА ГОРБУ:</div>';
    s.rideTrunk.forEach((it, i) => {
      h += `<div style="display:flex;justify-content:space-between;background:#141a17;padding:4px;margin-bottom:3px;border:1px solid #2e7d4f;"><span>${it.n}</span>` +
        `<button class="btn btn-ok" style="flex:0 0 auto;padding:2px 6px;" onclick="STIKS.db.session.players[STIKS.db.session.activeIdx].inv.push(STIKS.db.session.rideTrunk.splice(${i},1));STIKS.saveDB();STIKS.openRideTrunkModal()">Взять</button></div>`;
    });

    h += '<div style="color:#7dd3fc;font-size:10.5px;margin:6px 0 4px 0;">ВЫГРУЗИТЬ ИЗ РЮКЗАКА (6 ОХ):</div>';
    (p.inv || []).forEach((it, i) => {
      h += `<div style="display:flex;justify-content:space-between;background:#141a17;padding:4px;margin-bottom:3px;border:1px solid #3d1c1c;"><span>${it.n}</span>` +
        `<button class="btn" style="flex:0 0 auto;padding:2px 6px;" onclick="STIKS.transferToRideTrunk(${i})">В кузов</button></div>`;
    });
    vp.innerHTML = h;
  };

  S.transferToRideTrunk = function(idx) {
    const s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx];
    if (!p || !p.inv || !p.inv[idx]) return;
    if ((p.stepsLeft || 0) < 6) { this.log('⚠️ Для погрузки в транспорт нужно 6 ОХ!'); return; }
    p.stepsLeft -= 6;
    s.rideTrunk.push(p.inv.splice(idx, 1));
    this.saveDB();
    this.log('🚚 Вещь загружена в багажник (-6 ОХ).');
    this.openRideTrunkModal();
  };

  // Перенос добычи из багажника в Контейнер при эвакуации
  const prevEvac = S.evacuateActive.bind(S);
  S.evacuateActive = function() {
    const s = this.db && this.db.session;
    if (s && Array.isArray(s.rideTrunk) && s.rideTrunk.length) {
      this.db.stash = this.db.stash || [];
      this.db.stash.push(...s.rideTrunk);
      this.log(`🚚 Добыча из багажника (${s.rideTrunk.length} поз.) разгружена «с борта» в Контейнер!`);
      s.rideTrunk = [];
    }
    prevEvac();
  };

  const prevRenderGame = S.renderGame.bind(S);
  S.renderGame = function() {
    prevRenderGame();
    const s = this.db && this.db.session;
    const invBtn = document.querySelector('#game-viewport button[onclick="STIKS.openInv()"]');
    if (s && s.activeRide && invBtn && invBtn.parentNode && !document.getElementById('btn-ride-trunk')) {
      const b = document.createElement('button');
      b.id = 'btn-ride-trunk'; b.className = 'btn';
      b.textContent = `🚚 Кузов (${(s.rideTrunk || []).length})`;
      b.onclick = () => S.openRideTrunkModal();
      invBtn.parentNode.insertBefore(b, invBtn.nextSibling);
    }
  };

  // 3. Артподдержка в бою («Корд» 10с / «Ракетный комплекс» 15с / «Альфа-Титан»)
  S.combatCallRideSupport = function() {
    const s = this.db && this.db.session, cb = s && s.combat;
    if (!cb || cb._rideSupportUsed) return;
    const ride = s.activeRide;
    if (!ride) return;
    cb._rideSupportUsed = true;
    const heavy = ride.id === 'ural' || ride.id === 'titan' || ride.support === 'rockets' || ride.support === 'titan';
    this.playTone(110, 0.45, 'sawtooth', 0.14);
    cb.enemies.forEach(en => {
      if (en.dead) return;
      if (Math.random() < 0.5 && (en.rank || 0) <= (heavy ? 9 : 8)) {
        en.hp = 0; en.dead = true;
      } else {
        en.hp = Math.max(1, Math.round(en.hp * 0.7));
        if (heavy) en.stun = Math.max(en.stun || 0, 2);
      }
    });
    this.log(`🚀 <b>[Огневая поддержка: ${ride.n}]</b> накрыла врагов залпом${heavy ? ' (оглушение на 2 раунда)' : ''}!`);
    this.advanceCombatTurn();
  };

  const prevRenderCombat = S.renderCombat.bind(S);
  S.renderCombat = function() {
    prevRenderCombat();
    const s = this.db && this.db.session, cb = s && s.combat;
    const ride = s && s.activeRide;
    const atkBtn = document.querySelector('#game-viewport button[onclick="STIKS.combatActAttack()"]');
    if (ride && (ride.id !== 'prius' && ride.id !== 'young') && atkBtn && atkBtn.parentNode && !document.getElementById('btn-ride-sup')) {
      const b = document.createElement('button');
      b.id = 'btn-ride-sup'; b.className = 'btn btn-primary';
      b.disabled = Boolean(cb && cb._rideSupportUsed);
      b.textContent = `🚀 Поддержка (${ride.n})`;
      b.onclick = () => S.combatCallRideSupport();
      atkBtn.parentNode.appendChild(b);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // ФИНАЛЬНЫЙ МОДУЛЬ ПОЛНОТЫ: АЗАМАТ, ДАР ПРЕДКОВ, АМУЛЕТЫ, БАР, ГАРАЖ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  // 1. Фоновая музыка Поселения / Рейда с авто-стопом в бою (p10)
  S.stopBgMusic = function() {
    if (this._bgTimer) { clearInterval(this._bgTimer); this._bgTimer = null; }
  };
  S.startBgMusic = function(mode) {
    this.stopBgMusic();
    if (!this.voiceOn) return;
    const notes = mode === 'base' ? [261.6, 329.6, 392.0, 329.6] : [146.8, 174.6, 164.8, 130.8];
    let idx = 0;
    this._bgTimer = setInterval(() => {
      if (!this.voiceOn || (this.db && this.db.session && this.db.session.combat)) {
        this.stopBgMusic();
        return;
      }
      this.playTone(notes[idx % notes.length], 0.45, 'sine', 0.025);
      idx++;
    }, 1800);
  };

  // 2. Пасхалка «Яичница» в центре Пекла (30:30 ± 3) и повар Азамат (p17)
  const prevLaunchMap = S.launchMap.bind(S);
  S.launchMap = function(dKey = 'start') {
    prevLaunchMap(dKey);
    const s = this.db && this.db.session;
    if (!s) return;
    this.startBgMusic('raid');
    if (String(dKey).toLowerCase() === 'hell') {
      const chance = this.db._azamatVisited ? 0.50 : 1.0;
      if (Math.random() < chance) {
        s.azamatSpot = { x: 28 + Math.floor(Math.random() * 5), y: 28 + Math.floor(Math.random() * 5), looted: false };
        this.saveDB();
      }
    }
  };

  const prevStepPlayer = S.stepPlayer.bind(S);
  S.stepPlayer = function(dx, dy) {
    prevStepPlayer(dx, dy);
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (s && p && s.azamatSpot && !s.azamatSpot.looted && p.x === s.azamatSpot.x && p.y === s.azamatSpot.y) {
      s.azamatSpot.looted = true;
      this.db._azamatVisited = true;
      p.stats.end = (p.stats.end || 10) + 20;
      ['str', 'agi', 'spd', 'int', 'spi'].forEach(k => { p.stats[k] = (p.stats[k] || 10) + 2; });
      p.inv.push({
        id: 'azamat_omelet', n: '🍳 Омлет от Азамата', cat: 'special', rank: 5, w: 0, q: 1,
        desc: 'Фирменное блюдо шефа Азамата: +1 ур. к случайному Дару без риска мутации!'
      });
      this.normalizePlayerStats(p);
      this.saveDB();
      this.log('🍳 <b>ПАСХАЛКА ПЕКЛА: Шеф Азамат!</b> Вы нашли нычку «Яичница» (5 фестивалей блюд): <b>+20 Выносливость, +2 ко всем статам</b> и <b>Омлет от Азамата</b>!');
    }
  };

  // Канонический эффект «Омлета от Азамата» (+1 ур. к случайному Дару без мутации)
  const prevUseInvItem = S.useInvItem.bind(S);
  S.useInvItem = function(idx) {
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    const it = p && p.inv && p.inv[idx];
    const C = global.STIKS_CONTENT;
    if (p && it && /azamat|омлет/i.test(String((it.id || '') + ' ' + (it.n || '')))) {
      const poolKeys = Object.keys((C && C.DARS) || {}).filter(k => {
        const d = C.DARS[k];
        return p.isInfected ? d.pool === 'infected' : d.pool !== 'infected';
      });
      const owned = Object.keys(p.gifts || {});
      const pickKey = owned.length ? owned[Math.floor(Math.random() * owned.length)] : poolKeys[Math.floor(Math.random() * Math.max(1, poolKeys.length))];
      if (pickKey) {
        p.gifts[pickKey] = p.gifts[pickKey] || { lvl: 0, branches: {} };
        p.gifts[pickKey].lvl = Math.min(30, (p.gifts[pickKey].lvl || 0) + 1);
        const dName = (C && C.DARS[pickKey] && C.DARS[pickKey].name) || pickKey;
        this.log(`🍳 <b>Омлет от Азамата</b>: Дар <b>«${dName}»</b> повышен до <b>Ур.${p.gifts[pickKey].lvl}</b> без риска мутации!`);
      }
      if (it.q > 1) it.q--; else p.inv.splice(idx, 1);
      this.saveDB();
      this.openInv();
      return;
    }
    prevUseInvItem(idx);
  };

  // 3. Проверка привязки амулета позора (p16) и 25% срабатывание в бою
  const prevEquip = S.equipFromInv.bind(S);
  S.equipFromInv = function(hero, idx) {
    const it = hero && hero.inv && hero.inv[idx];
    if (it && (it.shame || it.cat === 'talisman') && it.forArch && it.forArch !== hero.arch) {
      this.speak('Не моё! Этот амулет принадлежит другой сути!');
      this.log(`⛔ <span style="color:#f87171;"><b>ОТКАЗ!</b> Амулет позора «${it.n}» привязан к другой сути и не может быть надет!</span>`);
      return;
    }
    prevEquip(hero, idx);
  };

  const prevAdvanceTurn = S.advanceCombatTurn.bind(S);
  S.advanceCombatTurn = function() {
    const s = this.db && this.db.session, cb = s && s.combat;
    if (cb && Array.isArray(cb.allies)) {
      const cur = cb.allies[cb.allyTurnIdx];
      const tal = cur && cur.slots && cur.slots.talisman;
      if (tal && tal.shame && Math.random() < 0.25) {
        this.log(`🃏 <b>[Амулет позора: ${tal.n}]</b> сработал в бою (25%) — враги в замешательстве (-15% атаки)!`);
        cb.enemies.forEach(e => { e.dmg = Math.max(1, Math.round((e.dmg || 4) * 0.85)); });
      }
    }
    prevAdvanceTurn();
  };

  // 4. Лимит заведений (1/уровень), блокировка Бара до оплаты штрафа ×5 (p8) и Гараж/Загон (p18)
  const prevBaseTrain = S.doBaseTrain.bind(S);
  S.doBaseTrain = function(uid, facId, statKey, isBar, facName) {
    const hr = this.findHeroByUid(uid);
    if (!hr) return;
    if ((hr.barFine || 0) > 0) {
      this.log(`🚫 Заведения заблокированы! Сначала оплатите штраф за дебош (${hr.barFine} 💎).`);
      return;
    }
    hr._facLvlLock = hr._facLvlLock || {};
    if (hr._facLvlLock[facId] === (hr.lvl || 0)) {
      this.log(`⏳ Заведение «${facName}» можно посещать не чаще 1 раза за уровень!`);
      return;
    }
    const spBefore = hr.sporans || 0;
    prevBaseTrain(uid, facId, statKey, isBar, facName);
    if ((hr.sporans || 0) < spBefore) {
      hr._facLvlLock[facId] = hr.lvl || 0;
      if (isBar && (spBefore - (hr.sporans || 0)) > 2) {
        hr.barFine = (spBefore - (hr.sporans || 0));
      }
      this.saveDB();
    }
  };

  // 5. Дополнение Поселения/Гнезда: оплата штрафа Бара, Гараж/Загон (1000 / 10000 💎) и Ритуал «Дар Предков» (p24)
  const prevSettlement = S.openSettlement.bind(S);
  S.openSettlement = function(uid) {
    prevSettlement(uid);
    this.startBgMusic('base');
    const vp = document.getElementById('game-viewport'), hr = this.findHeroByUid(uid);
    if (!vp || !hr) return;

    let extra = '';
    if ((hr.barFine || 0) > 0) {
      extra += `<div style="margin-top:6px;"><button class="btn btn-danger" onclick="const h=STIKS.findHeroByUid('${uid}');if(h.sporans>=h.barFine){h.sporans-=h.barFine;h.barFine=0;STIKS.saveDB();STIKS.openSettlement('${uid}');}else STIKS.log('❌ Не хватает споранов на штраф!');">💸 Оплатить штраф Бара (${hr.barFine}💎)</button></div>`;
    }

    const isInf = Boolean(hr.isInfected && !hr.isKvaz);
    const ride = isInf ? (hr.packPen && hr.packPen.pack) : (hr.garage && hr.garage.car);
    if (ride) {
      extra += `<div style="margin-top:6px;background:#141a17;border:1px solid #38bdf8;padding:6px;border-radius:4px;">` +
        `<div style="color:#7dd3fc;font-weight:bold;margin-bottom:4px;">🔧 ${isInf ? 'ЗАГОН СТАИ' : 'ГАРАЖ'}: ${ride.n} (Таран: Р.${ride.ramRank || 2})</div>` +
        `<div style="display:flex;gap:4px;">` +
        `<button class="btn" onclick="const h=STIKS.findHeroByUid('${uid}');const r=${isInf ? 'h.packPen.pack' : 'h.garage.car'};if(h.sporans>=1000&&(r.ramRank||2)<6){h.sporans-=1000;r.ramRank=(r.ramRank||2)+2;STIKS.saveDB();STIKS.openSettlement('${uid}');}else STIKS.log('⚠️ Нужно 1000💎 (макс. Р.6).');">🛡️ Укрепить таран +2р (1000💎)</button>` +
        `<button class="btn btn-primary" onclick="const h=STIKS.findHeroByUid('${uid}');const r=${isInf ? 'h.packPen.pack' : 'h.garage.car'};if(h.sporans>=10000&&!r.support){h.sporans-=10000;r.support='rockets';STIKS.saveDB();STIKS.openSettlement('${uid}');}else STIKS.log('⚠️ Нужно 10000💎 или уже установлено.');">🚀 Вооружение / Альфа (10000💎)</button>` +
        `</div></div>`;
    }

    if (isInf) {
      const eaten = hr.eatenImmunes || 0;
      extra += `<div style="margin-top:6px;"><button class="btn" style="border-color:#c084fc;color:#e9d5ff;" onclick="const h=STIKS.findHeroByUid('${uid}');if((h.eatenImmunes||0)>=10){h.eatenImmunes-=10;const isW=Math.random()<0.1;h.inv.push({id:isW?'white_pearl':'black_pearl',n:isW?'⚪ Белый жемчуг Улья':'⚫ Чёрный жемчуг Улья',cat:'pearl',rank:isW?5:3,w:0,q:1,desc:'Дар Предков.'});STIKS.saveDB();STIKS.log('🕯️ Церемония «Дар Предков» завершена!');STIKS.openSettlement('${uid}');}else STIKS.log('⚠️ Нужно 10 поглощённых иммунных (сейчас ${eaten}/10).');">🕯️ Ритуал «Дар Предков» (${eaten}/10)</button></div>`;
    }

    if (extra) vp.insertAdjacentHTML('beforeend', extra);
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ ВОЗВРАТА МЕХАНИК 2/2: ПАУЗА В ЛОББИ, СПАРРИНГ И ДНЕВНИК
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  const prevRenderLobby = S.renderLobby.bind(S);
  S.renderLobby = function() {
    prevRenderLobby();
    const vp = document.getElementById('game-viewport'), C = global.STIKS_CONTENT;
    if (!vp) return;

    const s = this.db && this.db.session;
    if (s && Array.isArray(s.players) && s.players.length && !document.getElementById('stiks-paused-raid-box')) {
      const names = s.players.map(pl => `${pl.name} (${pl.family})`).join(', ');
      const box = document.createElement('div');
      box.id = 'stiks-paused-raid-box';
      box.style.cssText = 'background:#131f18;border:1px solid #4ade80;padding:7px;border-radius:5px;margin-bottom:8px;font-size:11px;';
      box.innerHTML = `<div style="color:#86efac;font-weight:bold;margin-bottom:4px;">⏸ РЕЙД НА ПАУЗЕ (Ход: ${s.turn || 1})</div>` +
        `<div style="color:#cbd5e1;margin-bottom:6px;">Отряд: ${names}</div>` +
        `<div style="display:flex;gap:5px;">` +
        `<button class="btn btn-ok" style="flex:1;" onclick="STIKS.renderGame()">▶ Продолжить рейд</button>` +
        `<button class="btn btn-danger" style="flex:0 0 auto;" onclick="STIKS.db.session=null;STIKS.saveDB();STIKS.renderLobby()">🏁 Сбросить</button></div>`;
      vp.insertBefore(box, vp.firstChild);
    }

    if (C && C.BASE_EXTRAS && !document.getElementById('stiks-authors-footer')) {
      vp.insertAdjacentHTML('beforeend', C.BASE_EXTRAS.renderAuthorsFooter());
    }
  };

  const prevOpenSett = S.openSettlement.bind(S);
  S.openSettlement = function(uid) {
    prevOpenSett(uid);
    const vp = document.getElementById('game-viewport'), C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    if (!vp || !hr || !C || !C.BASE_EXTRAS) return;

    const isInf = Boolean(hr.isInfected && !hr.isKvaz);
    const ritualDone = (hr._ritualDoneLvl === (Number(hr.lvl) || 0));

    const opponents = [];
    Object.keys(this.db.families || {}).forEach(fam => {
      if (String(fam).trim().toLowerCase() === String(hr.family || '').trim().toLowerCase()) return;
      (this.db.families[fam] || []).forEach(other => {
        if (other && other.uid !== hr.uid) opponents.push(other);
      });
    });

    let block = `<div style="margin-top:6px;background:#141a17;border:1px solid #4ade80;padding:6px;border-radius:4px;">` +
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${opponents.length ? '6px' : '0'};">` +
      `<span style="font-size:10.5px;color:#bbf7d0;">${isInf ? '🕷️ Зов Матки (+50% шкал)' : '🌿 Обряд Знахаря (+50% шкал)'}</span>` +
      `<button class="btn btn-ok" ${ritualDone ? 'disabled' : ''} style="flex:0 0 auto;padding:3px 7px;" onclick="const r=STIKS_CONTENT.BASE_EXTRAS.useHealerRitual(STIKS.findHeroByUid('${uid}'));STIKS.log(r.msg);STIKS.openSettlement('${uid}')">${ritualDone ? '✓ Проведён' : 'Провести'}</button></div>`;

    if (opponents.length) {
      const opts = opponents.map(o => `<option value="${o.uid}">${o.name} [${o.family}] Ур.${o.lvl || 0} (💎${o.sporans || 0})</option>`).join('');
      block += `<div style="border-top:1px dashed #2e523f;padding-top:6px;">` +
        `<div style="color:#fde047;font-size:10.5px;margin-bottom:4px;">🥊 СПАРРИНГ (лекарь: 2💎 / 4💎 Кваз; поб. +2, проигр. +1):</div>` +
        `<div style="display:flex;gap:4px;"><select id="zopa-duel-opp" style="flex:1;">${opts}</select>` +
        `<button class="btn btn-primary" style="flex:0 0 auto;padding:4px 8px;" onclick="const opp=STIKS.findHeroByUid(document.getElementById('zopa-duel-opp').value);const r=STIKS_CONTENT.BASE_EXTRAS.runTrainingDuel(STIKS.findHeroByUid('${uid}'),opp);STIKS.log(r.msg);STIKS.openSettlement('${uid}')">⚔️ Бой</button></div></div>`;
    }
    block += '</div>';
    vp.insertAdjacentHTML('beforeend', block);
  };

  const prevOpenCodex = S.openCodex.bind(S);
  S.openCodex = function(tab) {
    prevOpenCodex(tab);
    const vp = document.getElementById('game-viewport'), C = global.STIKS_CONTENT;
    if (!vp || !C || !C.CODEX) return;
    const curTab = tab || 'gifts';

    const tabBar = vp.children[1];
    if (tabBar && !tabBar.querySelector('button[onclick*="openCodex(\'rules\')"]')) {
      const rBtn = document.createElement('button');
      rBtn.className = `btn ${curTab === 'rules' ? 'btn-primary' : ''}`;
      rBtn.style.cssText = 'flex:1 1 30%;padding:4px;font-size:10px;';
      rBtn.textContent = '📖 Правила';
      rBtn.onclick = () => S.openCodex('rules');
      tabBar.appendChild(rBtn);
    }

    const scrollBox = vp.lastElementChild;
    if (!scrollBox) return;

    if (curTab === 'rules') {
      const rules = C.CODEX.RULES_SECTIONS || [];
      scrollBox.innerHTML = rules.map(r =>
        `<div style="background:#161822;border:1px solid #475569;border-radius:6px;padding:7px;margin-bottom:5px;">` +
        `<b style="color:#fbbf24;font-size:11px;">${r.title}</b>` +
        `<div style="font-size:10.5px;color:#e2e8f0;margin-top:3px;line-height:1.4;">${r.text}</div></div>`
      ).join('');
    } else if (curTab === 'archive') {
      const st = this.getCodexState();
      const texts = C.CODEX.ARCHIVE_TEXTS || [];
      texts.forEach((txt, idx) => {
        const num = idx + 1;
        const id = 'arch_' + (num < 10 ? '0' : '') + num;
        if (st.archive.includes(id)) {
          scrollBox.innerHTML = scrollBox.innerHTML.replace(
            `📜 <b>Факт #${num}</b>: Запись архива Улья изучена.`,
            `📜 <b>${txt}</b>`
          );
        }
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // МОДУЛЬ ВОЗВРАТА МЕХАНИК 1/2: РЕЙД, ЖИВЧИК, ЖОПАКУСЬ И ПАУЗА
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  const prevLaunchMap = S.launchMap.bind(S);
  S.launchMap = function(dKey = 'start') {
    prevLaunchMap(dKey);
    const s = this.db && this.db.session, C = global.STIKS_CONTENT;
    if (!s || !Array.isArray(s.grid)) return;
    const bars = (C && C.MAP_EVENTS && C.MAP_EVENTS.BARRIERS) || [{ ico: '⛰️', name: 'Скала' }];
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < 60; x++) {
        const cell = s.grid[y][x];
        if (cell && cell.blocked && !cell.bIco) {
          const b = bars[Math.floor(Math.random() * bars.length)];
          cell.bIco = b.ico; cell.bType = b.name;
          if (C && C.MAP_EVENTS && !C.MAP_EVENTS.validateMap60(s.grid)) {
            cell.blocked = false; cell.bIco = ''; cell.bType = '';
          }
        }
      }
    }
    s.pendingSpores = 0;
    this.saveDB();
    if (this.renderGame) this.renderGame();
  };

  const prevStartCombat = S.startRaidCombat.bind(S);
  S.startRaidCombat = function(zIdx) {
    const s = this.db && this.db.session, C = global.STIKS_CONTENT;
    const p = s && s.players && s.players[s.activeIdx];
    const z = s && s.zombies && s.zombies[zIdx];
    if (s && p && z && C && C.MAP_EVENTS) {
      const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
      if (d1 === 6 && d2 === 6) {
        s.zombies.splice(zIdx, 1);
        C.MAP_EVENTS.rollDouble66Corpse(p, s);
        this.saveDB();
        this.renderGame();
        return;
      }
    }
    prevStartCombat(zIdx);
  };

  const prevAdvanceCombat = S.advanceCombatTurn.bind(S);
  S.advanceCombatTurn = function() {
    const s = this.db && this.db.session, cb = s && s.combat;
    if (cb && cb.enemies && cb.enemies.every(e => e.dead)) {
      const p0 = cb.allies.find(a => a.kind === 'player') || cb.allies[0];
      const lead = cb.enemies[0] || { rank: 0 };
      if (p0) p0.lastKill = { rank: lead.rank || 0, isHuman: false };
      const spBefore = p0 ? (p0.sporans || 0) : 0;
      prevAdvanceCombat();
      const spWon = p0 ? Math.max(0, (p0.sporans || 0) - spBefore) : 0;
      if (spWon > 0 && p0 && s) {
        p0.sporans = spBefore;
        s.pendingSpores = (Number(s.pendingSpores) || 0) + spWon;
        this.log(`💎 На клетке осталось споранов: <b>${s.pendingSpores} шт.</b> (нажмите «Собрать» за 1 ОХ до ухода с клетки)!`);
        this.saveDB();
        this.renderGame();
      }
      return;
    }
    prevAdvanceCombat();
  };

  const prevStepPlayer = S.stepPlayer.bind(S);
  S.stepPlayer = function(dx, dy) {
    const s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx], C = global.STIKS_CONTENT;
    const oldX = p ? p.x : 0, oldY = p ? p.y : 0;
    prevStepPlayer(dx, dy);
    if (p && (p.x !== oldX || p.y !== oldY)) {
      s.pendingSpores = 0;
      if (C && C.grantActionXp) C.grantActionXp(p, p.pace === 'run' ? 'spd' : (p.pace === 'careful' ? 'agi' : 'end'), 0.25);
    }
  };

  const prevNextTurn = S.nextTurn.bind(S);
  S.nextTurn = function() {
    const s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx], C = global.STIKS_CONTENT;
    if (s && p && C && C.MAP_EVENTS) C.MAP_EVENTS.checkZhopakusOnTurnEnd(p, s);
    prevNextTurn();
  };

  const prevUseInv = S.useInvItem.bind(S);
  S.useInvItem = function(idx) {
    const s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx], C = global.STIKS_CONTENT;
    const it = p && p.inv && p.inv[idx];
    if (p && it && C && C.SURVIVAL) {
      const raw = String((it.id || '') + ' ' + (it.n || '')).toLowerCase();
      if (/hive_guide|руководств/.test(raw)) { C.SURVIVAL.readGuide(p, idx); this.openInv(); return; }
      if (/zhivchik|живчик/.test(raw)) { C.SURVIVAL.drinkZhivchik(p); this.openInv(); return; }
    }
    prevUseInv(idx);
  };

  const prevOpenInv = S.openInv.bind(S);
  S.openInv = function() {
    prevOpenInv();
    const vp = document.getElementById('game-viewport'), s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx];
    if (!vp || !p) return;
    p.inv.forEach((it, i) => {
      const raw = String((it.id || '') + ' ' + (it.n || '')).toLowerCase();
      if (/hive_guide|руководств|zhivchik|живчик/.test(raw)) {
        const delBtn = vp.querySelector(`button[onclick*="inv.splice(${i},1)"]`);
        if (delBtn && delBtn.parentNode && !delBtn.parentNode.querySelector('.btn-use-surv')) {
          const b = document.createElement('button');
          b.className = 'btn btn-ok btn-use-surv'; b.style.padding = '2px 6px'; b.textContent = 'Исп.';
          b.onclick = () => S.useInvItem(i);
          delBtn.parentNode.insertBefore(b, delBtn);
        }
      }
    });
  };

  const prevRenderGame = S.renderGame.bind(S);
  S.renderGame = function() {
    prevRenderGame();
    const vp = document.getElementById('game-viewport'), s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx], C = global.STIKS_CONTENT;
    if (!vp || !s || !p || s.combat) return;

    const evacBtn = vp.querySelector('button[onclick="STIKS.evacuateActive()"]');
    if (evacBtn && evacBtn.parentNode && !document.getElementById('btn-pause-raid')) {
      const pb = document.createElement('button');
      pb.id = 'btn-pause-raid'; pb.className = 'btn'; pb.style.padding = '2px 6px'; pb.textContent = '🏕 Пауза';
      pb.onclick = () => { this.saveDB(); this.renderLobby(); };
      evacBtn.parentNode.insertBefore(pb, evacBtn);
    }

    const col = vp.firstElementChild;
    if (col && C && C.SURVIVAL && !document.getElementById('stiks-surv-strip')) {
      const spOk = C.SURVIVAL.isSporeUnlocked(p);
      const isInf = Boolean((p.isInfected || p.asInfected) && !p.isKvaz);
      const pend = Number(s.pendingSpores) || 0;
      const zCnt = (p.inv || []).filter(x => x && (x.isZhivchik || /живчик/i.test(x.n || ''))).reduce((a, b) => a + (b.q || 1), 0);

      const bar = document.createElement('div');
      bar.id = 'stiks-surv-strip';
      bar.style.cssText = 'background:#161111;border:1px solid #6e2626;padding:5px 7px;border-radius:4px;font-size:10.5px;display:flex;flex-direction:column;gap:4px;';
      bar.innerHTML = `<div style="display:flex;justify-content:space-between;"><span>⚡ Бодр: <b>${p.stamina || 50}/${p.maxStamina || 50}</b></span><span>${spOk ? '☣️ Спора' : '🤒 Недуг'}: <b>${Math.round(p.spore || 50)}</b></span><span>💎 <b>${p.sporans || 0}</b></span></div>` +
        `<div style="display:flex;gap:4px;flex-wrap:wrap;">` +
        (pend > 0 ? `<button class="btn btn-primary" style="flex:1;padding:3px;" onclick="STIKS_CONTENT.SURVIVAL.collectSpores(STIKS.db.session.players[STIKS.db.session.activeIdx],STIKS.db.session);STIKS.renderGame()">💎 Собрать (${pend}) [1 ОХ]</button>` : '') +
        (isInf && p.lastKill ? `<button class="btn btn-danger" style="flex:1;padding:3px;" onclick="STIKS_CONTENT.SURVIVAL.devourEnemy(STIKS.db.session.players[STIKS.db.session.activeIdx]);STIKS.renderGame()">🍖 Пожрать [1 ОХ]</button>` : '') +
        (!isInf && spOk ? `<button class="btn" style="flex:1;padding:3px;" onclick="STIKS_CONTENT.SURVIVAL.craftZhivchik(STIKS.db.session.players[STIKS.db.session.activeIdx]);STIKS.renderGame()">🧪 Живчик (1💎+алк)</button>` : '') +
        (!isInf && zCnt > 0 ? `<button class="btn btn-ok" style="flex:1;padding:3px;" onclick="STIKS_CONTENT.SURVIVAL.drinkZhivchik(STIKS.db.session.players[STIKS.db.session.activeIdx]);STIKS.renderGame()">🥤 Выпить (${zCnt})</button>` : '') +
        `</div>`;
      col.insertBefore(bar, col.children[2] || col.lastElementChild);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // ФИНАЛЬНАЯ СВЕРКА КАРТИНОК (KVAZ M/F, PSIH F) И РЫКА В РЕЧИ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  // 1. Точный резолвер портрета для любого бойца (учёт пола у Квазов, Психолога, Легенд)
  S.getHeroPortrait = function(p) {
    const C = global.STIKS_CONTENT;
    if (!p) return 'img/kachok.jpeg';
    const isFem = (p.sex === 'f' || p.gender === 'f');
    const ak = String(p.arch || '');
    if (ak === 'kvaz_f' || (p.isKvaz && !p.isLegendary && isFem)) return 'img/Kvazf.jpg';
    if (ak === 'kvaz_m' || (p.isKvaz && !p.isLegendary && !isFem)) return 'img/Kvazm.jpg';
    if (ak === 'legend_kvaz_f') return 'img/Legen_kvazF.jpg';
    if (ak === 'legend_kvaz_m') return 'img/Legen_kvazM.jpg';
    if (ak === 'legend_z') return 'img/Legen_Z.jpg';
    if (ak === 'legend_f') return 'img/LG_battle.png';
    if (ak === 'legend_m') return 'img/LM_battle.png';
    if (ak === 'psih') return isFem ? 'img/Psihf.jpeg' : 'img/Psihm.jpg';
    const meta = C && C.ARCHETYPES && C.ARCHETYPES[ak];
    if (meta) {
      if (isFem && meta.imgF) return meta.imgF;
      if (!isFem && meta.imgM) return meta.imgM;
      if (meta.img) return meta.img;
    }
    return p.img || 'img/kachok.jpeg';
  };

  // 2. Встроенный низкий рык для Заражённого и Кваза при озвучке реплик
  S.playGrowl = S.playGrowl || function(durSec) {
    const ctx = this._getAudioCtx && this._getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime, d = Math.min(2.5, Math.max(0.4, Number(durSec) || 0.8));
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(72, now);
    o.frequency.linearRampToValueAtTime(48, now + d);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    o.connect(g); g.connect(ctx.destination);
    o.start(now); o.stop(now + d + 0.02);
  };

  // 3. Подставляем точные портреты в рендер боя
  const prevRenderCombat = S.renderCombat.bind(S);
  S.renderCombat = function() {
    const s = this.db && this.db.session, cb = s && s.combat;
    if (cb && Array.isArray(cb.allies)) {
      cb.allies.forEach(a => { a.img = this.getHeroPortrait(a); });
    }
    prevRenderCombat();
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // ПОСЕЛЕНИЕ И ГНЕЗДО (1/2): 1 РАЗ/УР., СВОЯ ЦЕНА, ПОЯСНЕНИЯ КНОПОК
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  function renderRichBtn(ico, title, badge, desc, onclickJs, borderCol, disabled) {
    return `<button class="btn" ${disabled ? 'disabled' : ''} onclick="${onclickJs}" ` +
      `style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:6px 8px;margin-bottom:5px;border-color:${borderCol || '#3d1c1c'};background:#121514;width:100%;opacity:${disabled ? '0.6' : '1'};">` +
      `<div style="display:flex;justify-content:space-between;width:100%;font-size:11px;margin-bottom:2px;">` +
      `<b>${ico} ${title}</b><span style="color:#fde047;font-size:10px;">${badge}</span></div>` +
      `<div style="font-size:9.5px;color:#94a3b8;line-height:1.3;font-weight:normal;">${desc}</div></button>`;
  }

  S.doBaseTrain = function(uid, facId, statKey, isBar, facName) {
    const C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    if (!hr) return;
    if ((hr.barFine || 0) > 0) {
      this.log(`🚫 Заведения заблокированы! Сначала оплатите штраф за дебош (${hr.barFine} 💎).`);
      return;
    }
    const curLvl = Number(hr.lvl) || 0;
    hr._facLvlLock = hr._facLvlLock || {};
    if (hr._facLvlLock[facId] === curLvl) {
      this.log(`⏳ «${facName}» уже посещено на Ур.${curLvl} (лимит: 1 раз за уровень)!`);
      return;
    }
    hr.trainCounts = hr.trainCounts || {};
    const visits = Number(hr.trainCounts[facId]) || 0;
    const cost = Math.pow(2, visits + 1);
    if ((hr.sporans || 0) < cost) {
      this.log(`❌ Не хватает споранов для «${facName}» (нужно <b>${cost} 💎</b>).`);
      return;
    }
    hr.sporans -= cost;
    hr.trainCounts[facId] = visits + 1;
    hr._facLvlLock[facId] = curLvl;

    if (isBar && Math.random() < 0.5) {
      const fine = cost * 5;
      hr.barFine = fine;
      this.log(`🍺 Дебош в «${facName}»! Штраф ×5 (<b>${fine} 💎</b>) — заведения закрыты до оплаты!`);
    } else {
      if (hr.stats && statKey) hr.stats[statKey] = this._round100((hr.stats[statKey] || 10) + 1);
      if ((facId === 'library' || facId === 'pool') && typeof this.unlockNextArchiveEntry === 'function') {
        const fNum = this.unlockNextArchiveEntry();
        if (fNum) this.log(`📚 Изучен 1 новый факт: <b>Факт #${fNum}</b> (доступен в Дневнике)!`);
        else this.log('📚 Все 69 фактов Архива Улья уже изучены!');
      }
      this.log(`🎓 Посещено «${facName}» (-${cost} 💎): +1 к характеристике. След. визит сюда: <b>${Math.pow(2, visits + 2)} 💎</b>.`);
    }
    if (C && typeof C.recalcLevel === 'function') C.recalcLevel(hr);
    this.normalizePlayerStats(hr);
    this.saveDB();
    this.openSettlement(uid);
  };

  S.openSettlement = function(uid) {
    const vp = document.getElementById('game-viewport'), C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    if (!vp || !hr) return;
    this.normalizePlayerStats(hr);
    if (this.startBgMusic) this.startBgMusic('base');

    const isInf = Boolean(hr.isInfected && !hr.isKvaz);
    const curLvl = Number(hr.lvl) || 0;
    const theme = isInf
      ? { title: '☣️ ГНЕЗДО УЛЬЯ (ЛОГОВО ЗАРАЖЁННЫХ)', sub: 'Сырые своды кокона пульсируют спорой. В глубине пещеры дышит Матка Улья.', bg: '#150d14', brd: '#a855f7', acc: '#e9d5ff' }
      : { title: '🏘️ ПОСЕЛЕНИЕ ВНЕШНИКОВ (БАСТИОН ЛЮДЕЙ)', sub: 'Укреплённый периметр за стенами из профлиста. Горят костры, слышен звон кузни и гомон бара.', bg: '#0f1714', brd: '#38bdf8', acc: '#bae6fd' };

    const jobs = (C && C.BASES && C.BASES.jobs && (isInf ? C.BASES.jobs.infected : C.BASES.jobs.human)) || [];
    const trains = (C && C.BASES && C.BASES.training && (isInf ? C.BASES.training.infected : C.BASES.training.human)) || [];
    const stashW = this._round100((this.db.stash || []).reduce((acc, it) => acc + ((C && C.getItemWeight ? C.getItemWeight(it) : Number(it.w || 0)) * (it.q || 1)), 0));
    const webCnt = (hr.inv || []).filter(x => x.id === 'hive_web' || /паутин/i.test(x.n || '')).reduce((a, b) => a + (b.q || 1), 0);
    const ritualDone = (hr._ritualDoneLvl === curLvl);

    let h = `<div style="background:${theme.bg};border:1px solid ${theme.brd};border-radius:6px;padding:8px;margin-bottom:7px;">` +
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><b style="color:${theme.acc};font-size:12px;">${theme.title}</b>` +
      `<button class="btn btn-primary" style="flex:0 0 auto;padding:3px 8px;" onclick="STIKS.renderLobby()">◀ Лобби</button></div>` +
      `<div style="font-size:10px;color:#cbd5e1;font-style:italic;margin-bottom:6px;">${theme.sub}</div>` +
      `<div style="display:flex;justify-content:space-between;font-size:10.5px;background:rgba(0,0,0,0.35);padding:4px 6px;border-radius:4px;">` +
      `<span>👤 <b>${hr.name}</b> (Ур.${curLvl})</span><span>💎 <b>${hr.sporans || 0}</b></span><span>❤️ ${hr.hp}/${hr.maxHp} • 🍖 ${hr.food} • 💧 ${hr.water}</span></div></div>`;

    h += `<div style="color:${theme.acc};font-weight:bold;font-size:11px;margin:6px 0 4px 0;">${isInf ? '🕷️ СХРОНЫ И СЛУЖБЫ ГНЕЗДА:' : '🏪 РЫНОК, МЕДПУНКТ И СКЛАД:'}</div>`;
    h += renderRichBtn(isInf ? '🦴' : '🏪', isInf ? 'Меняла Гнезда' : 'Торговая Лавка', 'Покупка / Продажа 50%', 'Обмен трофеев, жемчуга, оружия, брони и аптечек за спораны.', `STIKS.openShopModal('${hr.uid}')`, '#4ade80', false);
    h += renderRichBtn('🕸️', 'Сдать Паутину Улья скупщику', `${webCnt} шт. → +${Math.floor(webCnt / 10)} 💎`, 'Принимается пачками по 10 штук за 1 чистый споран.', `STIKS.sellWebs('${hr.uid}')`, '#eab308', webCnt < 10);
    h += renderRichBtn(isInf ? '🫧' : '🛏️', isInf ? 'Окуклиться в тёплой слизи' : 'Снять койку в Гостинице', '1 💎 (Полный отдых)', 'Восполняет 100% ОЗ, Маны, Сытости, Жажды и Бодрости (засчитывается в квест: 3 раза).', `STIKS.restAtBase('${hr.uid}')`, '#38bdf8', (hr.sporans || 0) < 1);
    h += renderRichBtn('📦', 'Общий Контейнер Клана', `${stashW} / 20 000 кг`, 'Герметичный склад на 20 тонн для хранения вещей между рейдами.', `STIKS.openStashModal('${hr.uid}')`, '#38bdf8', false);
    h += renderRichBtn(isInf ? '👑' : '🌿', isInf ? 'Квест Матки Улья (Стая)' : 'Квест Знахаря (Транспорт)', 'Сюжетная линия', isInf ? 'Сдай 30 паутины, добудь Корону на Кладбище и вырасти Стаю.' : 'Сдай 30 паутины, притащи остов с Автосвалки и собери авто.', `STIKS.openQuestNpcModal('${hr.uid}')`, '#c084fc', false);
    h += renderRichBtn(isInf ? '🕷️' : '🌿', isInf ? 'Зов Матки Улья (+50%)' : 'Обряд Знахаря (+50%)', ritualDone ? `✓ Проведён на Ур.${curLvl}` : 'Бесплатно (1 раз/ур.)', 'Восполняет +50% Сытости, Жажды, Бодрости, Маны и Спорового баланса.', `const r=STIKS_CONTENT.BASE_EXTRAS.useHealerRitual(STIKS.findHeroByUid('${uid}'));STIKS.log(r.msg);STIKS.openSettlement('${uid}')`, '#4ade80', ritualDone);

    h += `<div style="color:#fde047;font-weight:bold;font-size:11px;margin:8px 0 4px 0;">${isInf ? '💀 ТРУД В КОКОНЕ (+2 💎):' : '⚒️ РАБОТА В ПОСЕЛЕНИИ (+2 💎):'}</div>`;
    jobs.forEach(j => { h += renderRichBtn('⚒️', j.n, '+2 💎 и +0.5 стата', j.desc + ' Расходует 34% сытости и воды.', `STIKS.doBaseWork('${hr.uid}','${j.id}','${j.stat}','${j.n}')`, '#475569', false); });

    h += `<div style="color:#c084fc;font-weight:bold;font-size:11px;margin:8px 0 4px 0;">${isInf ? '🌀 ЗАВЕДЕНИЯ ГНЕЗДА (1 раз/ур., цена своя):' : '🎓 ЗАВЕДЕНИЯ ПОСЕЛЕНИЯ (1 раз/ур., цена своя):'}</div>`;
    trains.forEach(t => {
      const visits = Number((hr.trainCounts && hr.trainCounts[t.id]) || 0);
      const cost = Math.pow(2, visits + 1);
      const visitedThisLvl = Boolean(hr._facLvlLock && hr._facLvlLock[t.id] === curLvl);
      const badge = visitedThisLvl ? `✓ Посещено на Ур.${curLvl} (след. ${cost} 💎)` : `${cost} 💎 (визит #${visits + 1})`;
      h += renderRichBtn('🎓', t.n, badge, t.desc, `STIKS.doBaseTrain('${hr.uid}','${t.id}','${t.stat}',${Boolean(t.isBar)},'${t.n}')`, t.isBar ? '#f97316' : '#7c3aed', visitedThisLvl);
    });
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // ДНЕВНИК ВЫЖИВШЕГО (2/2): 69 ФАКТОВ ЗАКРЫТЫ ДО БИБЛИОТЕКИ + ТУМАН
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.markCodexSeen = function(cat, key) {
    if (!cat || key === undefined || key === null) return;
    const st = this.getCodexState();
    st[cat] = Array.isArray(st[cat]) ? st[cat] : [];
    const sk = String(key);
    if (!st[cat].includes(sk)) { st[cat].push(sk); this.saveCodexState(st); }
  };

  S.syncCodexFromRoster = function() {
    const st = this.getCodexState();
    ['gifts', 'arch', 'zombies', 'items'].forEach(k => { st[k] = Array.isArray(st[k]) ? st[k] : []; });
    Object.values(this.db.families || {}).forEach(arr => {
      (arr || []).forEach(hr => {
        if (!hr) return;
        if (hr.arch && !st.arch.includes(hr.arch)) st.arch.push(hr.arch);
        Object.keys(hr.gifts || {}).forEach(gk => { if (!st.gifts.includes(gk)) st.gifts.push(gk); });
        (hr.inv || []).forEach(it => { if (it && it.id && !st.items.includes(it.id)) st.items.push(it.id); });
      });
    });
    return st;
  };

  const prevStartCombat = S.startRaidCombat.bind(S);
  S.startRaidCombat = function(zIdx) {
    const s = this.db && this.db.session;
    const z = s && s.zombies && s.zombies[zIdx];
    if (z) this.markCodexSeen('zombies', z.rank || 0);
    prevStartCombat(zIdx);
  };

  S.openCodex = function(tab) {
    const vp = document.getElementById('game-viewport'), C = global.STIKS_CONTENT;
    if (!vp) return;
    const curTab = tab || 'archive';
    const st = this.syncCodexFromRoster();
    const unlockAll = Boolean(st._devRevealAll);

    const tabs = [
      { id: 'archive', n: `📜 Факты (${st.archive.length}/69)` },
      { id: 'rules',   n: '📖 Правила' },
      { id: 'gifts',   n: '🧬 Дары' },
      { id: 'arch',    n: '👤 Архетипы' },
      { id: 'zombies', n: '☣️ Мутанты' },
      { id: 'items',   n: '🎒 Артефакты' }
    ];

    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d97706;padding-bottom:5px;margin-bottom:6px;">` +
      `<b style="color:#fbbf24;">📖 ДНЕВНИК ВЫЖИВШЕГО</b>` +
      `<div style="display:flex;gap:4px;">` +
      `<button class="btn" style="padding:3px 6px;font-size:10px;" onclick="const st=STIKS.getCodexState();st._devRevealAll=!st._devRevealAll;STIKS.saveCodexState(st);STIKS.openCodex('${curTab}')">${unlockAll ? '🔒 Скрыть неизуч.' : '👁️ Открыть всё'}</button>` +
      `<button class="btn btn-primary" style="padding:3px 8px;" onclick="STIKS.db.session ? STIKS.renderGame() : STIKS.renderLobby()">✖</button></div></div>` +
      `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:8px;">` +
      tabs.map(t => `<button class="btn ${t.id === curTab ? 'btn-primary' : ''}" style="flex:1 1 30%;padding:4px;font-size:10px;" onclick="STIKS.openCodex('${t.id}')">${t.n}</button>`).join('') +
      `</div><div style="max-height:370px;overflow-y:auto;">`;

    if (curTab === 'archive') {
      const texts = (C && C.CODEX && C.CODEX.ARCHIVE_TEXTS) || [];
      const facts = (C && C.CODEX && C.CODEX.photoFacts) || {};
      for (let i = 1; i <= 69; i++) {
        const id = 'arch_' + (i < 10 ? '0' : '') + i;
        if (!unlockAll && !st.archive.includes(id)) {
          h += `<div style="font-size:10px;color:#475569;padding:4px 0;border-bottom:1px dashed #1e293b;">🔒 Факт #${i} — [Откроется при посещении Библиотеки / Омута памяти (1 за визит)]</div>`;
        } else if (facts[i]) {
          h += `<div style="background:#1c1712;border:1px solid #d97706;padding:7px;margin:5px 0;border-radius:4px;">` +
            `<b style="color:#fbbf24;">📜 ${facts[i].title}</b><div style="font-size:11px;color:#fef3c7;margin:4px 0;">${facts[i].text}</div>` +
            `<img src="${facts[i].imgs[0]}" onclick="STIKS.showCodexZoom('${facts[i].imgs[0]}','${facts[i].title}')" style="width:100%;max-height:170px;object-fit:cover;border-radius:4px;cursor:zoom-in;"></div>`;
        } else {
          h += `<div style="font-size:10.5px;color:#fef3c7;padding:5px 0;border-bottom:1px dashed #3d2c1e;">📜 ${texts[i - 1] || `Факт #${i}: Запись архива Улья изучена.`}</div>`;
        }
      }
    } else if (curTab === 'rules') {
      h += ((C && C.CODEX && C.CODEX.RULES_SECTIONS) || []).map(r => `<div style="background:#161822;border:1px solid #475569;border-radius:6px;padding:7px;margin-bottom:5px;"><b style="color:#fbbf24;font-size:11px;">${r.title}</b><div style="font-size:10.5px;color:#e2e8f0;margin-top:3px;line-height:1.4;">${r.text}</div></div>`).join('');
    } else if (curTab === 'gifts' && C && C.DARS) {
      Object.values(C.DARS).forEach(d => {
        if (!unlockAll && !st.gifts.includes(d.id)) { h += `<div style="font-size:10px;color:#475569;padding:4px;border-bottom:1px dashed #1e293b;">🔒 Дар Улья — [Не пробуждён]</div>`; return; }
        const brs = (d.branches || []).map(b => `<div style="font-size:10px;color:#cbd5e1;margin-left:8px;">• <b>${b.name}</b>: ${b.desc}</div>`).join('');
        h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;margin-bottom:5px;border-radius:4px;"><b style="color:#c084fc;">🧬 ${d.name}</b><div style="font-size:10.5px;margin:3px 0;">${d.desc}</div>${brs}</div>`;
      });
    } else if (curTab === 'arch' && C && C.ARCHETYPES) {
      Object.entries(C.ARCHETYPES).forEach(([k, a]) => {
        if (!unlockAll && !st.arch.includes(k)) { h += `<div style="font-size:10px;color:#475569;padding:4px;border-bottom:1px dashed #1e293b;">🔒 Суть (Архетип) — [Не встречена]</div>`; return; }
        h += `<div style="display:flex;gap:6px;align-items:center;background:#141a17;border:1px solid #3d1c1c;padding:5px;margin-bottom:4px;border-radius:4px;"><img src="${a.img || 'img/kachok.jpeg'}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;"><div style="font-size:10.5px;"><b>${a.ico || ''} ${a.name}</b> • Навык: <b style="color:#fde047;">${a.skill}</b><br><span style="color:#94a3b8;">${a.hint || a.phrase || ''}</span></div></div>`;
      });
    } else if (curTab === 'zombies' && C && C.Z_RANKS) {
      C.Z_RANKS.forEach(z => {
        if (!unlockAll && !st.zombies.includes(String(z.r))) { h += `<div style="font-size:10px;color:#475569;padding:4px;border-bottom:1px dashed #1e293b;">🔒 Мутант Ранга ${z.r} — [Не встречен]</div>`; return; }
        h += `<div style="display:flex;gap:6px;align-items:center;background:#141a17;border:1px solid #5c2828;padding:5px;margin-bottom:4px;border-radius:4px;"><img src="${z.img || 'img/Z_01.png'}" style="width:34px;height:34px;object-fit:cover;border-radius:4px;"><div style="font-size:10.5px;"><b>[Р.${z.r}] ${z.name}</b> (Ур.${z.minLvl}–${z.maxLvl})<br><span style="color:#fca5a5;">❤️ ОЗ: ${z.hp} • ⚔️ Атака: ${z.dmg}</span></div></div>`;
      });
    } else if (curTab === 'items' && C && C.ITEMS) {
      [...(C.ITEMS.meleeWeapons || []), ...(C.ITEMS.shameAmulets || [])].forEach(it => {
        if (!unlockAll && !st.items.includes(it.id)) { h += `<div style="font-size:10px;color:#475569;padding:4px;border-bottom:1px dashed #1e293b;">🔒 Артефакт — [Не найден]</div>`; return; }
        h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:5px;margin-bottom:4px;border-radius:4px;font-size:10.5px;"><b>[P${it.rank || 1}] ${it.n}</b><div style="color:#94a3b8;">${it.desc || ''}</div></div>`;
      });
    }
    h += '</div>';
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);
