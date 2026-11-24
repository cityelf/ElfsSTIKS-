// ============================================================================
// ZOPA.JS // КУСОК 1/6: БАЗА ДАННЫХ, ФАМИЛИИ, СОХРАНЕНИЯ И ПЕРЕНОС ИЗ ПРОДЫ
// ============================================================================
(function(global) {
  'use strict';

  const S = global.STIKS = {
    DB_KEY: 'stiks_dev_v2_db',
    BACKUP_KEY: 'stiks_dev_v2_db_backup',
    voiceOn: true,
    squad: [],
    activeFamily: '',
    db: { families: {}, session: null, stash: [], codex: { archive: [] } },
    ARCHETYPES: {},
    DARS: {},

    log(msg) {
      const b = document.getElementById('sys-log');
      if (b) b.innerHTML = '&gt; ' + msg + '<br>' + b.innerHTML;
    },

    _round100(n) { return Math.round((Number(n) || 0) * 100) / 100; },

    toggleVoice() {
      this.voiceOn = !this.voiceOn;
      const btn = document.getElementById('btn-voice-toggle');
      if (btn) btn.innerText = this.voiceOn ? '🔊 Озвучка: ВКЛ' : '🔇 Озвучка: ВЫКЛ';
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
      if (!raw) { this.log('⚠️ В проде пока нет сохранений.'); return; }
      localStorage.setItem(this.DB_KEY, raw);
      this.loadDB();
      if (this.renderLobby) this.renderLobby();
      this.log('✅ База скопирована из проды в zopa.js!');
    },

    exportSave() {
      this.saveDB();
      const blob = new Blob([JSON.stringify(this.db, null, 2)], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'stiks_zopa_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      this.log('💾 Сейв фамилий выгружен.');
    },

    importSave(inp) {
      const f = inp && inp.files && inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = e => {
        try {
          const obj = JSON.parse(String(e.target.result || ''));
          if (!obj || typeof obj !== 'object') throw new Error('Битый JSON');
          this.db = Object.assign({ families: {}, session: null, stash: [], codex: { archive: [] } }, obj);
          this.saveDB();
          this.loadDB();
          if (this.renderLobby) this.renderLobby();
          this.log('📂 Сохранение загружено в zopa.js.');
        } catch (err) { alert('Ошибка: ' + err.message); }
        inp.value = '';
      };
      r.readAsText(f);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // КУСОК 2/6: ПРОФИЛИ БОЙЦОВ, СТАТЫ, ВЕС И ОТРИСОВКА ЛОББИ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.normalizePlayerStats = function(p) {
    if (!p) return;
    const C = global.STIKS_CONTENT;
    const B = (C && C.BALANCE) || {};
    p.stats = Object.assign({ str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 }, p.stats || {});
    p.inv = Array.isArray(p.inv) ? p.inv : [];
    p.slots = p.slots || p.equip || { main: null, side: null, melee: null, armor: null, bag: null, talisman: null };
    p.equip = p.slots;
    p.gifts = p.gifts || {};

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

    p.maxAp = Math.max(2, (B.baseAp || 6) + Math.floor(spdVal / (B.spdPerBonusAp || 50)));
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

  S.createNewHero = function() {
    const C = global.STIKS_CONTENT;
    const fam = (document.getElementById('zopa-fam-inp') || {}).value.trim() || this.activeFamily || 'Эльфы';
    const name = (document.getElementById('zopa-name-inp') || {}).value.trim() || ('Боец #' + Math.floor(Math.random() * 900 + 100));
    const archKey = (document.getElementById('zopa-arch-sel') || {}).value || 'kachok';
    const arch = (C && C.ARCHETYPES[archKey]) || { name: 'Качок', stats: { str: 22, agi: 9, spd: 5, end: 18, int: 1, spi: 5 } };

    const hero = {
      uid: 'h_' + Date.now() + '_' + Math.floor(Math.random() * 999),
      name, family: fam, arch: archKey, lvl: 0, sporans: 10,
      isInfected: archKey === 'infected' || archKey === 'legend_z',
      isKvaz: archKey.includes('kvaz'),
      stats: Object.assign({}, arch.stats),
      inv: [{ id: 'med_1', n: '[P1] Базовая аптечка', cat: 'med', heal: 30, w: 0.3, q: 1, desc: 'Восстанавливает 30 ОЗ.' }],
      slots: { main: null, side: null, melee: { id: 'ml_r1', n: '[P1] Охотничий нож', cat: 'melee', slot: 'melee', rank: 1, a: 9, w: 0.5, desc: 'Надёжный клинок 1-го ранга.' }, armor: null, bag: null, talisman: null },
      gifts: {}
    };
    this.normalizePlayerStats(hero);
    this.db.families[fam] = this.db.families[fam] || [];
    this.db.families[fam].push(hero);
    this.activeFamily = fam;
    this.saveDB();
    this.renderLobby();
    this.log(`✨ Создан боец <b>${name}</b> (${arch.name}) в фамилии «<b>${fam}</b>»!`);
  };

  S.toggleSquadHero = function(uid) {
    const idx = this.squad.indexOf(uid);
    if (idx >= 0) this.squad.splice(idx, 1);
    else if (this.squad.length < 6) this.squad.push(uid);
    this.renderLobby();
  };

  S.renderLobby = function() {
    const vp = document.getElementById('game-viewport');
    const C = global.STIKS_CONTENT;
    if (!vp) return;
    const fams = Object.keys(this.db.families || {});
    if (!this.activeFamily && fams.length) this.activeFamily = fams[0];

    const archOpts = Object.keys((C && C.ARCHETYPES) || {}).map(k => {
      const a = C.ARCHETYPES[k];
      return `<option value="${k}">${a.ico || '👤'} ${a.name}</option>`;
    }).join('');

    let h = '<div style="margin-bottom:8px;border-bottom:1px solid #3d1c1c;padding-bottom:6px;">' +
      '<div style="color:#7dd3fc;font-weight:bold;margin-bottom:4px;">1. СОЗДАТЬ НОВОГО БОЙЦА</div>' +
      '<div style="display:flex;gap:4px;margin-bottom:4px;">' +
      `<input id="zopa-fam-inp" placeholder="Фамилия" value="${this.activeFamily}" style="flex:1;">` +
      '<input id="zopa-name-inp" placeholder="Имя бойца" style="flex:1.2;"></div>' +
      '<div style="display:flex;gap:4px;">' +
      `<select id="zopa-arch-sel" style="flex:2;">${archOpts}</select>` +
      '<button class="btn btn-ok" style="flex:1;" onclick="STIKS.createNewHero()">+ Создать</button></div></div>';

    h += '<div style="margin-bottom:8px;"><div style="color:#fde047;font-weight:bold;margin-bottom:4px;">2. ФАМИЛИИ И БОЙЦЫ</div>';
    if (fams.length) {
      h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">' + fams.map(f =>
        `<button class="btn ${f === this.activeFamily ? 'btn-primary' : ''}" style="flex:0 0 auto;padding:4px 8px;" onclick="STIKS.activeFamily='${f}';STIKS.renderLobby()">${f}</button>`
      ).join('') + '</div>';
    }

    const heroes = (this.activeFamily && this.db.families[this.activeFamily]) || [];
    if (!heroes.length) {
      h += '<div style="color:#94a3b8;font-size:11px;">Нет бойцов. Создайте нового или нажмите «📥 Из проды» / «🤝 Подселить бойцов».</div>';
    } else {
      heroes.forEach(hr => {
        this.normalizePlayerStats(hr);
        const inSq = this.squad.includes(hr.uid);
        const aName = (C && C.ARCHETYPES[hr.arch] && C.ARCHETYPES[hr.arch].name) || hr.arch;
        h += `<div style="display:flex;justify-content:space-between;align-items:center;background:#141a17;border:1px solid ${inSq ? '#4ade80' : '#3d1c1c'};padding:5px 7px;margin-bottom:4px;border-radius:4px;">` +
          `<div><b>${hr.name}</b> (Ур.${hr.lvl || 0} • ${aName})<br><span style="font-size:10px;color:#94a3b8;">❤️ ${hr.hp}/${hr.maxHp} • 🔮 ${hr.mana}/${hr.maxMana} • 💎 ${hr.sporans || 0}</span></div>` +
          `<div style="display:flex;gap:4px;"><button class="btn ${inSq ? 'btn-ok' : ''}" onclick="STIKS.toggleSquadHero('${hr.uid}')">${inSq ? '✓ В отряде' : '+ В отряд'}</button>` +
          `<button class="btn" onclick="STIKS.openSettlement('${hr.uid}')">🏘️ База</button></div></div>`;
      });
    }
    h += '</div>';

    if (this.squad.length > 0) {
      h += `<div style="border-top:1px solid #2e7d4f;padding-top:8px;">` +
        `<div style="color:#86efac;font-weight:bold;margin-bottom:5px;">3. ВЫХОД В РЕЙД (ОТРЯД: ${this.squad.length}/6)</div>` +
        `<div style="display:flex;gap:4px;margin-bottom:4px;">` +
        `<button class="btn btn-ok" onclick="STIKS.launchMap('start')">▶ Начальная (P1)</button>` +
        `<button class="btn" style="border-color:#4ade80;color:#86efac;" onclick="STIKS.launchMap('easy')">🌿 Лёгкая</button>` +
        `<button class="btn" style="border-color:#38bdf8;color:#bae6fd;" onclick="STIKS.launchMap('norm')">⚖️ Средняя</button></div>` +
        `<div style="display:flex;gap:4px;">` +
        `<button class="btn" style="border-color:#f97316;color:#fed7aa;" onclick="STIKS.launchMap('hard')">⚠️ Тяжёлая</button>` +
        `<button class="btn btn-primary" onclick="STIKS.launchMap('hell')">🔥 Пекло</button>` +
        `<button class="btn" onclick="STIKS.openCodex('archive')">📖 Дневник</button></div></div>`;
    }
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // КУСОК 3/6: КАРТА 60×60, СТРОГИЙ СПАВН УГРОЗ, ДВИЖЕНИЕ И СМЕНА ХОДА
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.LOC_CAP = {
    start:    { name: 'Начальная',  mod: -2, minZ: 0, maxZ: 2, zCount: 22 },
    easy:     { name: 'Лёгкая',     mod: -1, minZ: 0, maxZ: 4, zCount: 32 },
    norm:     { name: 'Средняя',    mod: 0,  minZ: 1, maxZ: 6, zCount: 48 },
    junkyard: { name: 'Автосвалка', mod: 0,  minZ: 1, maxZ: 6, zCount: 46 },
    cemetery: { name: 'Кладбище',   mod: 0,  minZ: 2, maxZ: 7, zCount: 52 },
    hard:     { name: 'Тяжёлая',    mod: 1,  minZ: 3, maxZ: 8, zCount: 62 },
    hell:     { name: 'Пекло',      mod: 2,  minZ: 5, maxZ: 9, zCount: 72 }
  };

  S.findHeroByUid = function(uid) {
    for (const fam of Object.keys(this.db.families || {})) {
      const found = (this.db.families[fam] || []).find(h => h && h.uid === uid);
      if (found) return found;
    }
    return null;
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
        const blocked = !isCenter && Math.random() < 0.12;
        const hasLoot = !blocked && !isCenter && Math.random() < 0.03;
        row.push({ x, y, blocked, loot: hasLoot, searched: false, seen: isCenter, exit: (x === 0 || y === 0 || x === 59 || y === 59) && !blocked && (x % 15 === 0 || y % 15 === 0) });
      }
      grid.push(row);
    }

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

    this.db.session = { diffKey: dk, locName: rule.name, diffMod: rule.mod, turn: 1, activeIdx: 0, players, grid, zombies, combat: false };
    this.saveDB();
    this.log(`🗺️ Высадка: <b>${rule.name} (60×60)</b>. Точек лута: ~55 • Угроз: <b>${zombies.length}</b>.`);
    this.renderGame();
  };

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

    const foeIdx = s.zombies.findIndex(z => z.x === nx && z.y === ny);
    if (foeIdx >= 0 && typeof this.startRaidCombat === 'function') {
      this.startRaidCombat(foeIdx);
      return;
    }
    this.saveDB();
    this.renderGame();
  };

  S.nextTurn = function() {
    const s = this.db && this.db.session;
    if (!s || !Array.isArray(s.players)) return;
    const cur = s.players[s.activeIdx];
    if (cur && typeof this.applyOutOfCombatTurnTick === 'function') this.applyOutOfCombatTurnTick(cur);

    let nextIdx = (s.activeIdx + 1) % s.players.length;
    if (nextIdx === 0) s.turn = (s.turn || 1) + 1;
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
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!s || !p) return;
    const orig = this.findHeroByUid(p.uid);
    if (orig) Object.assign(orig, JSON.parse(JSON.stringify(p)));
    p.escaped = true;
    this.log(`🚁 <b>${p.name}</b> успешно эвакуировался с добычей!`);
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
          else if (s.players.some(pl => !pl.dead && !pl.escaped && pl.x === cx && pl.y === cy)) ico = '🤝';
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
      `<button class="btn" onclick="STIKS.openCodex('archive')">📖 Дневник</button>` +
      `<button class="btn btn-ok" onclick="STIKS.nextTurn()">⏭️ Конец хода</button></div></div>`;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // КУСОК 4А/6: СПРАВОЧНИК ЛУТА, ОПИСАНИЯ С ВЕСОМ И ОБЫСК (ПИРАМИДА)
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  S.LOOT_POOL = [
    { id: 'w_g1', n: '🔫 Обрез 12к', cat: 'weapon', slot: 'main', rank: 1, a: 16, w: 2.3, cal: '12к', desc: 'Обрез 1-го ранга.' },
    { id: 'w_g2', n: '🔫 АК-74М', cat: 'weapon', slot: 'main', rank: 2, a: 32, w: 3.4, cal: '5.45', desc: 'Автомат 2-го ранга.' },
    { id: 'w_g3', n: '🔫 ВСС «Винторез»', cat: 'weapon', slot: 'main', rank: 3, a: 64, w: 2.6, cal: '9x39', desc: 'Винтовка 3-го ранга.' },
    { id: 'w_g4', n: '⚡ Гаусс-винтовка М1', cat: 'weapon', slot: 'main', rank: 4, a: 115, w: 4.5, cal: 'ЭМП', desc: 'Ускоритель 4-го ранга.' },
    { id: 'w_g5', n: '🔥 Импульсник Внешников', cat: 'weapon', slot: 'main', rank: 5, a: 150, w: 4.8, cal: 'Плазма', desc: 'Оружие Пекла 5-го ранга.' },
    { id: 'a_r1', n: '🧥 Кожаная куртка', cat: 'armor', slot: 'armor', rank: 1, d: 5, w: 2.0, desc: 'Куртка 1-го ранга (+5 защиты).' },
    { id: 'a_r2', n: '🦺 Бронежилет 6Б23', cat: 'armor', slot: 'armor', rank: 2, d: 15, w: 5.5, desc: 'Бронежилет 2-го ранга (+15 защиты).' },
    { id: 'a_r3', n: '🛡️ Штурмовой комплект', cat: 'armor', slot: 'armor', rank: 3, d: 30, w: 8.0, desc: 'Броня 3-го ранга (+30 защиты).' },
    { id: 'a_r4', n: '🛡️ Экзо-панцирь «Рубер»', cat: 'armor', slot: 'armor', rank: 4, d: 75, w: 11.0, desc: 'Броня 4-го ранга (+75 защиты).' },
    { id: 'a_r5', n: '👑 Доспех Скреббера', cat: 'armor', slot: 'armor', rank: 5, d: 115, w: 12.0, desc: 'Броня 5-го ранга (+115 защиты).' },
    { id: 'b_r1', n: '🎒 Городской рюкзак', cat: 'bag', slot: 'bag', rank: 1, bag: 15, w: 0.6, desc: 'Рюкзак 1-го ранга (+15 кг).' },
    { id: 'b_r2', n: '🎒 Рейдовый баул', cat: 'bag', slot: 'bag', rank: 2, bag: 30, w: 1.1, desc: 'Баул 2-го ранга (+30 кг).' },
    { id: 'b_r3', n: '🎒 Тактический ранец', cat: 'bag', slot: 'bag', rank: 3, bag: 50, w: 1.5, desc: 'Ранец 3-го ранга (+50 кг).' },
    { id: 'm_r1', n: '🩹 Базовая аптечка', cat: 'med', heal: 30, rank: 1, w: 0.3, desc: 'Лечит 30 ОЗ.' },
    { id: 'm_r2', n: '💉 Тактическая IFAK', cat: 'med', heal: 75, rank: 2, w: 0.6, desc: 'Лечит 75 ОЗ и 15 бодрости.' },
    { id: 'f_r1', n: '🥫 Тушёнка и фляга', cat: 'food', food: 25, water: 25, rank: 1, w: 0.8, desc: '+25 сытости и +25 жажды.' }
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
    parts.push(w > 0 ? `⚖️ Вес: ${w} кг` : '⚖️ Вес: 0 кг (трофей)');
    return parts.join(' • ');
  };

  S.genClusterItem = function(cat, targetRank) {
    const C = global.STIKS_CONTENT;
    const r = Math.max(1, Math.min(5, Math.round(targetRank || 1)));
    const full = [...this.LOOT_POOL, ...((C && C.ITEMS && C.ITEMS.meleeWeapons) || [])];
    const pool = full.filter(x => x.rank === r && (!cat || x.cat === cat));
    const list = pool.length ? pool : full.filter(x => x.rank === r);
    const pick = list[Math.floor(Math.random() * Math.max(1, list.length))] || this.LOOT_POOL[0];
    const clone = Object.assign({ q: 1 }, pick);
    clone.n = `[P${r}] ` + String(clone.n || 'Вещь').replace(/\[P\d+\]/gi, '').trim();
    return clone;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // КУСОК 4Б/6: ОБЫСК (СТУПЕНЧАТАЯ ПИРАМИДА) И ОКНО РЮКЗАКА
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

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

    const topMap = {
      start: isDouble11 ? 2 : 1,
      easy: isDouble11 ? 3 : 2,
      norm: isDouble11 ? 4 : 3,
      junkyard: isDouble11 ? 4 : 3,
      cemetery: isDouble11 ? 4 : 3,
      hard: isDouble11 ? 5 : 4,
      hell: isDouble11 ? 5 : 4
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
      this.log(`🔍 [${d1}-${d2}] Обыск (${p.x}:${p.y}): пусто.`);
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

  S.equipFromInv = function(hero, idx) {
    if (!hero || !Array.isArray(hero.inv) || !hero.inv[idx]) return;
    const it = hero.inv[idx];
    const slot = it.slot || (it.cat === 'melee' ? 'melee' : (it.cat === 'weapon' ? 'main' : (it.cat === 'armor' ? 'armor' : (it.cat === 'bag' ? 'bag' : ''))));
    if (!slot) { this.log('⚠️ Эту вещь нельзя надеть.'); return; }
    hero.slots = hero.slots || {};
    const prev = hero.slots[slot];
    hero.slots[slot] = it;
    hero.inv.splice(idx, 1);
    if (prev) hero.inv.push(prev);
    this.normalizePlayerStats(hero);
    this.saveDB();
    this.log(`🛡️ Надет: <b>${it.n}</b>.`);
  };

  S.useInvItem = function(idx) {
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!p || !p.inv || !p.inv[idx]) return;
    const it = p.inv[idx];
    if (it.heal) p.hp = Math.min(p.maxHp, p.hp + it.heal);
    if (it.food) p.food = Math.min(p.maxFood, p.food + it.food);
    if (it.water) p.water = Math.min(p.maxWater, p.water + it.water);
    if (it.q > 1) it.q--; else p.inv.splice(idx, 1);
    this.saveDB();
    this.log(`💊 Использовано: <b>${it.n}</b>.`);
    this.openInv();
  };

  S.openInv = function() {
    const vp = document.getElementById('game-viewport');
    const s = this.db && this.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!vp || !p) return;
    const ci = this.getCarryInfo(p);

    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #3d1c1c;padding-bottom:5px;margin-bottom:6px;">` +
      `<b>🎒 РЮКЗАК (${ci.cur}/${ci.max} кг)</b><button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.renderGame()">🗺️ Карта</button></div>` +
      `<div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">🔫 Осн: <b>${(p.slots.main && p.slots.main.n) || '—'}</b> | 🔪 Хол: <b>${(p.slots.melee && p.slots.melee.n) || '—'}</b> | 🛡️ Броня: <b>${(p.slots.armor && p.slots.armor.n) || '—'}</b> | 🎒 Ранец: <b>${(p.slots.bag && p.slots.bag.n) || '—'}</b></div>`;

    p.inv.forEach((it, i) => {
      const canEq = Boolean(it.slot || it.cat === 'weapon' || it.cat === 'melee' || it.cat === 'armor' || it.cat === 'bag');
      const canUse = Boolean(it.heal || it.food || it.water);
      h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:5px;margin-bottom:4px;border-radius:4px;">` +
        `<div style="display:flex;justify-content:space-between;align-items:center;"><b>${it.n}${it.q > 1 ? ' ×' + it.q : ''}</b>` +
        `<div style="display:flex;gap:3px;">` +
        (canUse ? `<button class="btn btn-ok" style="padding:2px 6px;" onclick="STIKS.useInvItem(${i})">Исп.</button>` : '') +
        (canEq ? `<button class="btn" style="padding:2px 6px;" onclick="STIKS.equipFromInv(STIKS.db.session.players[STIKS.db.session.activeIdx],${i});STIKS.openInv()">Надеть</button>` : '') +
        `<button class="btn btn-danger" style="padding:2px 6px;" onclick="STIKS.db.session.players[STIKS.db.session.activeIdx].inv.splice(${i},1);STIKS.saveDB();STIKS.openInv()">✖</button>` +
        `</div></div><div style="font-size:10px;color:#94a3b8;">${this.describeItem(it)}</div></div>`;
    });
    if (!p.inv.length) h += '<div style="color:#64748b;text-align:center;padding:8px;">Пусто</div>';
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // КУСОК 5/6: ПОСЕЛЕНИЕ И ГНЕЗДО (ЛАВКА, КОНТЕЙНЕР 20000 КГ, РАБОТЫ)
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

    // 1. Лавка / Скупщик и сдача паутины 10:1
    h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;margin-bottom:6px;border-radius:4px;">` +
      `<div style="color:#fde047;font-weight:bold;margin-bottom:4px;">🛒 ЛАВКА И СКУПЩИК</div>` +
      `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">` +
      `<button class="btn btn-ok" onclick="STIKS.buyBaseItem('${hr.uid}','m_r1')">🩹 Аптечка (${C ? C.getBuyPrice({rank:1},hr) : 1}💎)</button>` +
      `<button class="btn btn-ok" onclick="STIKS.buyBaseItem('${hr.uid}','f_r1')">🥫 Пайок (${C ? C.getBuyPrice({rank:1},hr) : 1}💎)</button>` +
      `<button class="btn" onclick="STIKS.sellWebs('${hr.uid}')">🕸️ Сдать паутину (${webCnt} шт → ${Math.floor(webCnt / 10)}💎)</button></div>` +
      `<div style="display:flex;gap:4px;"><button class="btn" onclick="STIKS.openStashModal('${hr.uid}')">📦 Контейнер (20 000 кг)</button>` +
      `<button class="btn" onclick="STIKS.restAtBase('${hr.uid}')">🛏️ Отдых (1💎 → 100%)</button></div></div>`;

    // 2. 6 работ
    h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;margin-bottom:6px;border-radius:4px;">` +
      `<div style="color:#7dd3fc;font-weight:bold;margin-bottom:4px;">⚒️ РАБОТА (+2 💎, расход 34% сытости/воды)</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">`;
    jobs.forEach(j => {
      h += `<button class="btn" style="text-align:left;padding:4px 6px;" onclick="STIKS.doBaseWork('${hr.uid}','${j.stat}','${j.n}')">${j.n}</button>`;
    });
    h += '</div></div>';

    // 3. 5 заведений прокачки
    h += `<div style="background:#141a17;border:1px solid #3d1c1c;padding:6px;border-radius:4px;">` +
      `<div style="color:#c084fc;font-weight:bold;margin-bottom:4px;">🎓 ТРЕНИРОВКА И ЗАВЕДЕНИЯ (цена 2^n)</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">`;
    trains.forEach(t => {
      const cost = C && C.getTrainingCost ? C.getTrainingCost(hr, t.id, false) : 2;
      h += `<button class="btn" style="text-align:left;padding:4px 6px;" onclick="STIKS.doBaseTrain('${hr.uid}','${t.id}','${t.stat}',${Boolean(t.isBar)},'${t.n}')">${t.n} (${cost}💎)</button>`;
    });
    h += '</div></div>';

    vp.innerHTML = h;
  };

  S.buyBaseItem = function(uid, itemId) {
    const C = global.STIKS_CONTENT, hr = this.findHeroByUid(uid);
    const tpl = this.LOOT_POOL.find(x => x.id === itemId);
    if (!hr || !tpl) return;
    const price = C && C.getBuyPrice ? C.getBuyPrice(tpl, hr) : 1;
    if ((hr.sporans || 0) < price) { this.log('❌ Не хватает споранов.'); return; }
    hr.sporans -= price;
    hr.inv.push(Object.assign({ q: 1 }, tpl, { n: '[P1] ' + tpl.n }));
    this.saveDB(); this.log(`🛒 Куплено: <b>${tpl.n}</b> (-${price}💎).`); this.openSettlement(uid);
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
    this.saveDB(); this.log(`🛏️ <b>${hr.name}</b> полностью восстановил силы (-1 💎).`); this.openSettlement(uid);
  };

  S.doBaseWork = function(uid, statKey, jobName) {
    const hr = this.findHeroByUid(uid);
    if (!hr) return;
    if ((hr.food || 0) < 17 || (hr.water || 0) < 17) { this.log('⚠️ Слишком голоден/обезвожен для смены (нужно >=34%).'); return; }
    hr.food = Math.max(0, hr.food - 17); hr.water = Math.max(0, hr.water - 17);
    hr.sporans = (hr.sporans || 0) + 2;
    if (hr.stats && statKey) hr.stats[statKey] = this._round100((hr.stats[statKey] || 10) + 0.5);
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
// ZOPA.JS // КУСОК 6/6: БОЕВОЙ ЭКРАН РЕЙДА, ДАРЫ/НАВЫКИ И ДНЕВНИК УЛЬЯ (69)
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
      if (i !== zIdx && pack.length < 4 && Math.abs(z.x - mainZ.x) <= 2 && Math.abs(z.y - mainZ.y) <= 2) pack.push(z);
    });

    const enemies = pack.map((z, i) => ({
      id: 'en_' + i, zId: z.id, name: z.name, rank: z.rank || 0, hp: z.hp || 20, maxHp: z.hp || 20,
      dmg: Math.max(2, Math.round((z.dmg || 4) * ((C && C.BALANCE && C.BALANCE.enemyDmgMult) || 0.85))), stun: 0, dead: false
    }));

    const allies = s.players.filter(pl => !pl.dead && !pl.escaped && Math.max(Math.abs(pl.x - leader.x), Math.abs(pl.y - leader.y)) <= 2);
    if (!allies.includes(leader)) allies.unshift(leader);

    s.combat = { round: 1, allies, allyTurnIdx: 0, enemies };
    this.saveDB();
    this.log(`⚔️ Бой! Напали: <b>${enemies.map(e => e.name).join(', ')}</b>!`);
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
    const statAdd = Math.round(isGun ? (p.stats.agi || 10) * 0.25 : (p.stats.str || 10) * 0.35);
    const dmg = Math.max(2, Math.round(((w.a || 4) * mult + statAdd) * (p.buff || 1)));
    p.buff = 1;

    trg.hp = Math.max(0, trg.hp - dmg);
    if (trg.hp <= 0) trg.dead = true;
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
    p._skillUsed = true;
    const trg = cb.enemies.find(e => !e.dead);
    if (!trg) return;
    const arch = (C && C.ARCHETYPES[p.arch]) || { skill: 'Удар ярости', phrase: 'В атаку!' };
    const dmg = Math.max(6, Math.round(((p.stats.str || 10) + (p.stats.spi || 10)) * 1.1));
    trg.hp = Math.max(0, trg.hp - dmg);
    if (trg.hp <= 0) trg.dead = true;
    this.log(`🗣️ <b>${p.name}</b> → <b>[${arch.skill}]</b>: «${arch.phrase}» → <b>-${dmg}</b>${trg.dead ? ' 💀' : ''}`);
    this.advanceCombatTurn();
  };

  S.advanceCombatTurn = function() {
    const s = this.db && this.db.session, cb = s && s.combat;
    if (!cb) return;

    if (cb.enemies.every(e => e.dead)) {
      const deadIds = new Set(cb.enemies.map(e => e.zId));
      s.zombies = s.zombies.filter(z => !deadIds.has(z.id));
      const p0 = cb.allies[0];
      const spGain = cb.enemies.reduce((acc, e) => acc + (e.rank || 0) + 1, 0);
      p0.sporans = (p0.sporans || 0) + spGain;
      p0.inv.push({ id: 'hive_web', n: '🕸️ Паутина Улья', cat: 'trophy', rank: 1, w: 0, q: 1, desc: 'Сдаётся 10:1 💎.' });
      cb.allies.forEach(a => { delete a._skillUsed; a.buff = 1; });
      s.combat = null;
      this.saveDB();
      this.log(`🏆 Победа! Получено <b>+${spGain} 💎</b> и 🕸️ Паутина Улья!`);
      this.renderGame();
      return;
    }

    cb.allyTurnIdx++;
    if (cb.allyTurnIdx < cb.allies.length) {
      this.renderCombat();
      return;
    }

    cb.allyTurnIdx = 0;
    cb.enemies.forEach(en => {
      if (en.dead) return;
      if (en.stun > 0) { en.stun--; return; }
      const aliveAllies = cb.allies.filter(a => !a.dead && a.hp > 0);
      if (!aliveAllies.length) return;
      const trg = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
      const arm = (trg.slots && trg.slots.armor && trg.slots.armor.d) || 0;
      const dmg = Math.max(1, en.dmg - arm);
      trg.hp = Math.max(0, trg.hp - dmg);
      if (trg.hp <= 0) trg.dead = true;
      this.log(`💥 <b>${en.name}</b> бьёт <b>${trg.name}</b>: <b>-${dmg}</b> (ОЗ: ${trg.hp}/${trg.maxHp})`);
    });

    if (cb.allies.every(a => a.dead || a.hp <= 0)) {
      s.combat = null;
      this.db.session = null;
      this.saveDB();
      this.log('💀 Весь отряд погиб в Улье...');
      this.renderLobby();
      return;
    }
    cb.round++;
    this.saveDB();
    this.renderCombat();
  };

  S.renderCombat = function() {
    const vp = document.getElementById('game-viewport'), s = this.db && this.db.session, cb = s && s.combat;
    if (!vp || !cb) return;
    const p = cb.allies[cb.allyTurnIdx] || cb.allies[0];
    const hasDual = Boolean(p.slots && p.slots.main && p.slots.melee);

    let h = `<div style="border-bottom:1px solid #8f2d2d;padding-bottom:4px;margin-bottom:6px;display:flex;justify-content:space-between;">` +
      `<b style="color:#ff9e9e;">⚔️ РАУНД ${cb.round} • Ход: ${p.name}</b><span>❤️ ${p.hp}/${p.maxHp} • 🔮 ${p.mana}</span></div>`;

    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;font-size:11px;"><div><b style="color:#86efac;">ОТРЯД:</b>';
    cb.allies.forEach(a => { h += `<div style="padding:3px;border:1px solid #2e7d4f;margin-top:3px;">👤 ${a.name}: ❤️ ${a.hp}/${a.maxHp}</div>`; });
    h += '</div><div><b style="color:#fca5a5;">ВРАГИ:</b>';
    cb.enemies.forEach(e => { h += `<div style="padding:3px;border:1px solid #8f2d2d;margin-top:3px;opacity:${e.dead ? 0.35 : 1};">☣️ ${e.name}: ❤️ ${e.hp}/${e.maxHp}</div>`; });
    h += '</div></div>';

    h += `<div style="display:flex;gap:4px;flex-wrap:wrap;">` +
      `<button class="btn btn-primary" onclick="STIKS.combatActAttack()">🎲 Атака</button>` +
      `<button class="btn" ${p._skillUsed ? 'disabled' : ''} onclick="STIKS.combatUseSkill()">🗣️ Навык (1/1)</button>` +
      (hasDual ? `<button class="btn" style="border-color:#38bdf8;color:#bae6fd;" onclick="STIKS.combatSwitchWeap()">🔄 Оружие (0 ОХ)</button>` : '') +
      `</div>`;
    vp.innerHTML = h;
  };

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
    const spec = [31, 32, 33, 34, 69].filter(n => pool.includes(n));
    const pick = (spec.length && Math.random() < 0.45) ? spec[Math.floor(Math.random() * spec.length)] : pool[0];
    st.archive.push('arch_' + (pick < 10 ? '0' : '') + pick);
    this.saveCodexState(st);
    return pick;
  };

  S.openCodex = function() {
    const vp = document.getElementById('game-viewport'), C = global.STIKS_CONTENT;
    const st = this.getCodexState(), facts = (C && C.CODEX && C.CODEX.photoFacts) || {};
    let h = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d97706;padding-bottom:5px;margin-bottom:6px;">` +
      `<b style="color:#fbbf24;">📖 ДНЕВНИК УЛЬЯ (${st.archive.length}/69)</b>` +
      `<button class="btn btn-primary" style="flex:0 0 auto;" onclick="STIKS.db.session ? STIKS.renderGame() : STIKS.renderLobby()">✖ Закрыть</button></div>`;
    for (let i = 1; i <= 69; i++) {
      const id = 'arch_' + (i < 10 ? '0' : '') + i;
      const open = st.archive.includes(id);
      if (!open) {
        h += `<div style="font-size:10px;color:#475569;padding:3px 0;border-bottom:1px dashed #1e293b;">🔒 Запись #${i} — [Не изучено в Библиотеке]</div>`;
      } else if (facts[i]) {
        h += `<div style="background:#1c1712;border:1px solid #d97706;padding:7px;margin:5px 0;border-radius:4px;">` +
          `<b style="color:#fbbf24;">📜 ${facts[i].title}</b><div style="font-size:11px;margin:4px 0;">${facts[i].text}</div>` +
          `<img src="${facts[i].imgs[0]}" style="width:100%;max-height:170px;object-fit:cover;border-radius:4px;"></div>`;
      } else {
        h += `<div style="font-size:10.5px;color:#fef3c7;padding:4px 0;border-bottom:1px dashed #3d2c1e;">📜 <b>Факт #${i}</b>: Запись архива Улья изучена.</div>`;
      }
    }
    vp.innerHTML = h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// ZOPA.JS // ДОПОЛНЕНИЕ: УДАЛЕНИЕ БОЙЦА, СБРОС БАЗЫ И ЗАЩИТА АРХЕТИПОВ
// ============================================================================
(function(global) {
  'use strict';
  const S = global.STIKS;
  if (!S) return;

  // Заглушки совместимости для хуков из stiks_content.js
  S.ensureTraderStock = S.ensureTraderStock || function() { return []; };
  S.bindHeroCompat = S.bindHeroCompat || function(h) { return h; };
  S.recalcLevel = S.recalcLevel || function(h) { return h; };
  S.syncHeroProfile = S.syncHeroProfile || function(h) { this.normalizePlayerStats(h); return h; };

  // Резервный список архетипов на случай, если stiks_content.js не загрузился
  const FALLBACK_ARCH = {
    kachok:     { name: 'Качок', ico: '💪', stats: { str: 22, agi: 9, spd: 5, end: 18, int: 1, spi: 5 } },
    surgeon:    { name: 'Хирург', ico: '🔪', stats: { str: 8, agi: 14, spd: 9, end: 9, int: 14, spi: 6 } },
    schoolgirl: { name: 'Школьница', ico: '📢', stats: { str: 6, agi: 14, spd: 15, end: 7, int: 10, spi: 8 } },
    prof:       { name: 'Профессор', ico: '🪄', stats: { str: 6, agi: 8, spd: 8, end: 6, int: 20, spi: 12 } },
    infected:   { name: 'Особый заражённый', ico: '☣️', stats: { str: 14, agi: 14, spd: 14, end: 14, int: 2, spi: 2 } },
    kvaz:       { name: 'Кваз (мутант Улья)', ico: '👹', stats: { str: 26, agi: 22, spd: 20, end: 26, int: 12, spi: 14 } }
  };

  S.deleteHero = function(uid) {
    for (const fam of Object.keys(this.db.families || {})) {
      const arr = this.db.families[fam] || [];
      const idx = arr.findIndex(h => h && h.uid === uid);
      if (idx >= 0) {
        const removed = arr.splice(idx, 1);
        if (!arr.length) delete this.db.families[fam];
        this.squad = this.squad.filter(id => id !== uid);
        this.saveDB();
        this.log(`🗑️ Боец <b>${removed.name}</b> удалён.`);
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
    this.log('🧹 Тестовая база DEV полностью обнулена!');
  };

  const origLobby = S.renderLobby.bind(S);
  S.renderLobby = function() {
    if (!global.STIKS_CONTENT) {
      this.ARCHETYPES = Object.assign({}, FALLBACK_ARCH, this.ARCHETYPES);
    } else {
      Object.assign(this.ARCHETYPES, global.STIKS_CONTENT.ARCHETYPES || {});
    }

    origLobby();
    const vp = document.getElementById('game-viewport');
    if (!vp) return;

    // Заполняем селект архетипов, если он остался пустым
    const sel = document.getElementById('zopa-arch-sel');
    if (sel && !sel.options.length) {
      sel.innerHTML = Object.keys(this.ARCHETYPES).map(k => {
        const a = this.ARCHETYPES[k];
        return `<option value="${k}">${a.ico || '👤'} ${a.name}</option>`;
      }).join('');
    }

    // Добавляем кнопки 🗑️ на каждую карточку бойца
    const heroes = (this.activeFamily && this.db.families[this.activeFamily]) || [];
    vp.querySelectorAll('button[onclick^="STIKS.openSettlement"]').forEach((btn, i) => {
      const hr = heroes[i];
      if (hr && btn.parentNode && !btn.parentNode.querySelector('.btn-del-hero')) {
        const del = document.createElement('button');
        del.className = 'btn btn-danger btn-del-hero';
        del.style.padding = '4px 6px';
        del.textContent = '🗑️';
        del.title = 'Удалить бойца';
        del.onclick = () => S.deleteHero(hr.uid);
        btn.parentNode.appendChild(del);
      }
    });

    // Добавляем кнопку полного сброса базы внизу Лобби
    if (!document.getElementById('btn-zopa-wipe')) {
      vp.insertAdjacentHTML('beforeend',
        '<div style="margin-top:10px;border-top:1px dashed #3d1c1c;padding-top:6px;display:flex;gap:5px;">' +
        '<button id="btn-zopa-wipe" class="btn btn-danger" onclick="STIKS.resetDevDatabase()">🧹 Обнулить всю базу DEV</button></div>'
      );
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
