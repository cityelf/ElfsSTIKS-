window.STIKS = {
  db: { families: {}, session: null },
  squad: [],
  activeFamily: null,
  invOpen: false,
  voiceOn: true,

  log(m) {
    const b = document.getElementById('sys-log');
    if (b) b.innerHTML = '> ' + m + '<br>' + b.innerHTML;
  },

  saveDB() {
    localStorage.setItem('stiks_prod_db', JSON.stringify(this.db));
  },

  loadDB() {
    const s = localStorage.getItem('stiks_prod_db');
    if (s) {
      try { this.db = JSON.parse(s); } catch (e) {}
    }
    if (!this.db.families) this.db.families = {};
  },

  exportSave() {
    const cur = JSON.stringify(this.db);
    const d = prompt('Скопируйте код сохранения или вставьте чужой:', cur);
    if (d && d !== cur) {
      try {
        this.db = JSON.parse(d);
        this.saveDB();
        location.reload();
      } catch (e) { alert('Ошибка кода сохранения'); }
    }
  },

  PRONOUNS: /(^|\s)(я|меня|мне|мной|мною|мы|нас|нам|нами|ты|тебя|тебе|тобой|тобою|вы|вас|вам|вами|он|его|ему|им|нём|она|её|ей|ею|ней|оно|они|их|ими|них|мой|моя|моё|мои|твой|твоя|твоё|твои|свой|своя|своё|свои|наш|наша|наше|наши|ваш|ваша|ваше|ваши|этот|эта|это|эти|тот|та|то|те|кто|что|кого|чего|кому|чему|кем|чем|себя|себе|собой|собою|что-то|кто-то|кое-что)(?=[\s.,!?]|$)/gi,
  HUNT_WORDS: /(^|\s)([а-яА-ЯёЁ]*(?:кров|укус|куса|еда|еду|еды|есть|жра|сожр|пожр|мяс|плот|добыч|голод|разорв|грыз)[а-яА-ЯёЁ]*)(?=[\s.,!?]|$)/gi,

  playGrowl(sec) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
    if (!this.voiceOn || !('speechSynthesis' in window)) {
      if (onDone) onDone();
      return;
    }
    window.speechSynthesis.cancel();
    const styledTxt = this.formatSpeech(role, txt);
    let cfg = (window.STIKS_DB.VOICE_CFG && window.STIKS_DB.VOICE_CFG[role]) || { p: 0.9, r: 1.1, pause: 200 };
    const s = this.db.session;
    if (s && s.players[s.activeIdx] && role === 'tatan' && s.players[s.activeIdx].lvl >= 15 && cfg.p15) {
      cfg = { ...cfg, p: cfg.p15 };
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
        if (onDone) setTimeout(onDone, 450);
        return;
      }
      const u = new SpeechSynthesisUtterance(item.t);
      u.lang = 'ru-RU';
      if (mikh) u.voice = mikh;
      u.pitch = item.hic ? 1.65 : cfg.p;
      u.rate = item.hic ? 2.50 : cfg.r;
      let pause = cfg.pause || 200;
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
    return p && (p.arch === 'tatan' || p.arch === 'strip') && !p.asInfected;
  },

  addFamily() {
    const el = document.getElementById('new-fam');
    const val = el ? el.value.trim() : '';
    if (!val) return;
    if (!this.db.families[val]) this.db.families[val] = [];
    this.activeFamily = val;
    this.saveDB();
    if (this.renderLobby) this.renderLobby();
  },

  selectFamily(f) {
    this.activeFamily = f;
    if (this.renderLobby) this.renderLobby();
  },

  addHero() {
    const fam = this.activeFamily;
    const nameEl = document.getElementById('hero-name');
    const archEl = document.getElementById('hero-arch');
    const name = nameEl ? nameEl.value.trim() : '';
    const arch = archEl ? archEl.value : 'kachok';
    if (!fam || !name) return;
    const base = window.STIKS_DB.ARCHETYPES[arch];
    const hero = {
      uid: Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      family: fam, name, arch, lvl: 0, status: 'ready', isInfected: false,
      stats: { ...base.stats }, actionsCount: 0, skillUnlocked: false, knowsRecipe: false,
      hp: 10 + base.stats.end, maxHp: 10 + base.stats.end,
      food: 50 + Math.floor(base.stats.end / 10),
      water: 50 + Math.floor(base.stats.end / 10),
      stamina: 50 + Math.floor(base.stats.end / 5),
      spore: 50 + Math.floor(base.stats.end / 10),
      mana: base.stats.spi, inv: []
    };
    if (arch === 'tatan') { hero.food = 241; hero.water = 101; }
    this.db.families[fam].push(hero);
    this.saveDB();
    this.log(`Создан герой: ${fam} ${name} (${base.name})`);
    if (this.renderLobby) this.renderLobby();
  },

  delHero(fam, idx) {
    if (confirm('Удалить героя навсегда?')) {
      const h = this.db.families[fam][idx];
      this.squad = this.squad.filter(s => s.uid !== h.uid);
      this.db.families[fam].splice(idx, 1);
      this.saveDB();
      if (this.renderLobby) this.renderLobby();
    }
  },

  unlockHero(fam, idx) {
    const h = this.db.families[fam][idx];
    if (h) {
      h.status = 'ready';
      this.saveDB();
      this.log(`🔓 Статус героя ${h.name} сброшен на «Готов к рейду».`);
      if (this.renderLobby) this.renderLobby();
    }
  },

  toggleSquad(fam, idx) {
    const h = this.db.families[fam][idx];
    const asInf = (h.status === 'dead' || h.isInfected);
    this.squad.push({ ...JSON.parse(JSON.stringify(h)), asInfected: asInf });
    if (this.renderLobby) this.renderLobby();
  },

  removeSquad(i) {
    this.squad.splice(i, 1);
    if (this.renderLobby) this.renderLobby();
  },

  calcMaxAP(spd) { return 6 + Math.floor((spd || 10) / 100); },
  getStepCost(m) { return m === 'careful' ? 3 : (m === 'fast' ? 1.5 : 1); },

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

  launchMap(dKey = 'start') {
    if (!this.squad || this.squad.length === 0) return;
    const diff = window.STIKS_DB.DIFFS[dKey] || window.STIKS_DB.DIFFS.start;
    const g = [];
    for (let y = 0; y < 60; y++) {
      const r = [];
      for (let x = 0; x < 60; x++) {
        r.push({ x, y, blocked: false, bType: null, lootType: null, domCal: null, exhaust: -(Math.floor(Math.random() * 3) + 1) });
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
      g[y][x].bType = window.STIKS_DB.BARRIERS[Math.floor(Math.random() * 5)];
      if (!this.validateMap60(g)) { g[y][x].blocked = false; g[y][x].bType = null; } else pC++;
    }
    let iC = 0; att = 0;
    while (iC < 240 && att < 8000) {
      att++;
      const x = Math.floor(Math.random() * 56) + 2, y = Math.floor(Math.random() * 56) + 2;
      if (g[y][x].blocked) continue;
      g[y][x].blocked = true;
      g[y][x].bType = window.STIKS_DB.BARRIERS[Math.floor(Math.random() * 5)];
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
      g[y][x].exhaust = 0;
      lC++;
    }
    const pls = this.squad.map(p => {
      let px, py;
      do { px = Math.floor(Math.random() * 20) + 20; py = Math.floor(Math.random() * 20) + 20; } while (g[py][px].blocked);
      const ap = this.calcMaxAP(p.stats.spd);
      return {
        ...p, x: px, y: py, status: 'in_raid', moveMode: 'careful', stepsLeft: ap, maxAp: ap,
        movedThisTurn: false, escaped: false, dead: false, stinkTurns: 0,
        slots: { main: null, side: null, melee: null, mag: null, mod: null, armor: null, clothes: null, boots: null, bag: null, talisman: null }
      };
    });
    const totZ = pls.length * 12, rC = Math.round(totZ * 0.6), aC = totZ - rC, zms = [];
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
      if (!g[zy][zx].blocked) zms.push({ id: 'zr_' + i, x: zx, y: zy, type: 'roam', hidden: false, rankMod: 0, tPos: null });
    }
    for (let i = 0; i < aC; i++) {
      let zx, zy, za = 0;
      do { zx = Math.floor(Math.random() * 58) + 1; zy = Math.floor(Math.random() * 58) + 1; za++; }
      while ((g[zy][zx].blocked || pls.some(p => p.x === zx && p.y === zy)) && za < 300);
      if (!g[zy][zx].blocked) zms.push({ id: 'za_' + i, x: zx, y: zy, type: 'ambush', hidden: true, rankMod: -1, tPos: null });
    }
    this.db.session = { turn: 1, activeIdx: 0, diffKey: dKey, diffMod: diff.mod, grid: g, players: pls, zombies: zms };
    pls.forEach(pl => {
      const f = this.db.families[pl.family];
      if (f) { const o = f.find(h => h.uid === pl.uid); if (o) o.status = 'in_raid'; }
    });
    this.saveDB();
    this.log(`🗺️ Карта 60x60 готова! Барьеров: ${pC + iC}, Точек лута: ${lC}, Врагов: ${zms.length}`);
    if (this.renderGame) this.renderGame();
  },

  setMoveMode(m) {
    const s = this.db.session;
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
    const s = this.db.session;
    const p = s.players[s.activeIdx];
    const cost = this.getStepCost(p.moveMode);
    if (p.stepsLeft < cost) {
      this.log(`❌ Нужно ${cost} ОХ, осталось ${p.stepsLeft}.`);
      return;
    }
    const nx = p.x + dx, ny = p.y + dy;
    if (nx < 0 || nx > 59 || ny < 0 || ny > 59) {
      p.escaped = true; p.knowsRecipe = true; p.status = 'ready';
      const f = this.db.families[p.family];
      if (f) { const o = f.find(h => h.uid === p.uid); if (o) { Object.assign(o, p); o.status = 'ready'; } }
      this.saveDB();
      this.log(`🏆 ${p.name} вышел за границу 60x60! Локация пройдена.`);
      this.sayAs('hive', `Внимание! ${p.name} успешно покинул периметр локации.`);
      this.nextTurn();
      return;
    }
    const c = s.grid[ny][nx];
    if (c.blocked) {
      this.log(`⛰️ Преграда: ${c.bType}.`);
      return;
    }
    p.x = nx; p.y = ny; p.stepsLeft -= cost; p.movedThisTurn = true; p.actionsCount++;
    if (p.moveMode === 'run') {
      s.zombies.forEach(z => {
        if (Math.abs(z.x - nx) <= 2 && Math.abs(z.y - ny) <= 2) { z.hidden = false; z.tPos = { x: nx, y: ny }; }
      });
    }
    if (p.stinkTurns > 0) {
      s.zombies.forEach(z => {
        if (Math.abs(z.x - nx) <= 3 && Math.abs(z.y - ny) <= 3) { z.hidden = false; z.tPos = { x: nx, y: ny }; }
      });
    }
    const zHit = s.zombies.find(z => z.x === nx && z.y === ny);
    if (zHit) {
      zHit.hidden = false;
      this.triggerEncounter(p, zHit);
      return;
    }
    if (c.lootType && (p.moveMode === 'careful' || p.moveMode === 'fast')) {
      this.searchCell(true);
    } else if (!s.combat && p.stepsLeft < 1) {
      const fem = this.isFem(p);
      this.sayAs(p.asInfected ? 'infected' : p.arch, fem ? 'Я остановилась и осматриваюсь.' : 'Я остановился и осматриваюсь.');
    }
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  genClusterItem(cat, domCal, surfaceOnly) {
    const poolObj = window.STIKS_DB.CAL_POOL;
    if (cat === 'weapon') {
      if (surfaceOnly || Math.random() < 0.8) {
        const pool = poolObj.ammo.filter(x => x.cal === domCal);
        const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : poolObj.ammo[Math.floor(Math.random() * poolObj.ammo.length)];
        return { ...pick, cat: 'ammo' };
      } else {
        const pool = poolObj.weapon.filter(x => x.cal === domCal || !x.cal);
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return { ...pick, cat: 'weapon' };
      }
    }
    if (cat === 'armor') {
      const pool = surfaceOnly ? poolObj.gear.filter(x => x.slot !== 'armor') : poolObj.gear;
      return { ...pool[Math.floor(Math.random() * pool.length)], cat: 'gear' };
    }
    const sup = window.STIKS_DB.ITEMS[1].supply;
    const list = surfaceOnly ? sup.weak : [...sup.std, ...sup.weak, ...sup.luck];
    return { ...list[Math.floor(Math.random() * list.length)], cat: 'supply', slot: 'use' };
  },

  searchCell(onMove) {
    const s = this.db.session;
    const p = s.players[s.activeIdx];
    const cell = s.grid[p.y][p.x];
    const prevLen = p.inv.length;
    if (!onMove) {
      if (p.stepsLeft < 3) {
        this.log('❌ Для тщательного поиска нужно минимум 3 Очка Хода!');
        return;
      }
      p.stepsLeft -= 3;
      p.actionsCount++;
    }
    const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
    if (d1 === 6 && d2 === 6) {
      const r1 = Math.floor(Math.random() * 6) + 1, r2 = Math.floor(Math.random() * 6) + 1;
      if (r1 === r2) {
        p.stinkTurns = 10;
        const it = this.genClusterItem('supply', '12g', true);
        p.inv.push(it);
        this.log(`💩 КРИТ «6-6»! Конфуз (ВОНЬ 10 ходов), но найдено: ${it.n}`);
      } else {
        this.log(`🎲 Дубль «6-6»: пусто.`);
      }
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }
    const pen = (onMove && p.moveMode === 'fast') ? -1 : 0;
    const bonus = (!onMove) ? 1 : 0;
    let qty = d1 + cell.exhaust + pen + bonus;
    if (d1 === 1 && d2 === 1) qty = Math.max(1, qty);
    if (qty <= 0) {
      if (!onMove) {
        this.log(`🔍 Поиск [${p.x + 1}:${p.y + 1}]: пусто (истощение ${cell.exhaust}).`);
        const fem = this.isFem(p);
        this.sayAs(p.asInfected ? 'infected' : p.arch, fem ? 'Ничего... Я продолжаю поиск.' : 'Пусто... Я продолжаю поиск.');
      }
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }
    const cats = ['weapon', 'armor', 'supply'];
    const found = [];
    for (let i = 0; i < qty; i++) {
      const curCat = cell.lootType || cats[Math.floor(Math.random() * 3)];
      const item = this.genClusterItem(curCat, cell.domCal || '12g', onMove);
      p.inv.push(item);
      found.push(item.n);
    }
    cell.exhaust--;
    const tag = onMove ? '👀 Осмотр на ходу' : '🔍 Глубокий поиск';
    this.log(`${tag} (${found.length}): ${found.join(', ')}. Истощение: ${cell.exhaust}`);
    if (p.inv.length > prevLen) {
      const last = p.inv[p.inv.length - 1];
      const fem = this.isFem(p);
      this.sayAs(p.asInfected ? 'infected' : p.arch, fem ? `Я нашла ${last.n}!` : `Я нашёл ${last.n}!`);
    }
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  toggleInv() {
    this.invOpen = !this.invOpen;
    if (this.renderGame) this.renderGame();
  },

  calcWeight(p) {
    let w = 0;
    p.inv.forEach(i => w += (i.w || 0));
    if (p.slots) Object.values(p.slots).forEach(s => { if (s) w += (s.w || 0); });
    const bagBonus = (p.slots && p.slots.bag && p.slots.bag.bag) ? p.slots.bag.bag : 0;
    const mult = p.arch === 'kachok' ? 3 : 1;
    const maxW = Math.round(((p.stats.str * 0.1) * mult + bagBonus) * 10) / 10;
    return { cur: Math.round(w * 10) / 10, max: maxW };
  },

  equipFromInv(idx) {
    const s = this.db.session;
    const p = s.players[s.activeIdx];
    if (!p.slots) p.slots = { main: null, side: null, melee: null, mag: null, mod: null, armor: null, clothes: null, boots: null, bag: null, talisman: null };
    const it = p.inv[idx];
    if (!it) return;
    if (it.pearl) {
      this.usePearl(p, it.pearl);
      p.inv.splice(idx, 1);
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }
    if (it.troll && window.STIKS_DB.SHAME_AMULETS[p.arch] && it.n.includes(window.STIKS_DB.SHAME_AMULETS[p.arch].split(' ')[0])) {
      it.amuletActive = true;
      this.log(`🔮 СКРЫТЫЙ АМУЛЕТ ПОЗОРА АКТИВИРОВАН! ${it.n} идеально подошел классу!`);
    }
    if (it.cat === 'supply' || it.slot === 'use') {
      if (it.hp) p.hp = Math.min(p.maxHp, Math.max(1, p.hp + it.hp));
      if (it.food) p.food = Math.max(0, p.food + it.food);
      if (it.water) p.water = Math.max(0, p.water + it.water);
      if (it.stamina) p.stamina = Math.max(0, p.stamina + it.stamina);
      if (it.spore) { p.spore += it.spore; p.knowsRecipe = true; }
      if (it.recipe) p.knowsRecipe = true;
      if (it.stink) p.stinkTurns = it.stink;
      p.inv.splice(idx, 1);
      this.log(`💊 Использовано: ${it.n}`);
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }
    let targetSlot = it.slot || 'main';
    if (targetSlot === 'melee' && p.slots.melee && !p.slots.side) targetSlot = 'side';
    if (p.slots[targetSlot]) p.inv.push(p.slots[targetSlot]);
    p.slots[targetSlot] = it;
    p.inv.splice(idx, 1);
    this.log(`⚙️ Экипировано в слот [${targetSlot}]: ${it.n}`);
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  unequipSlot(slotName) {
    const s = this.db.session;
    const p = s.players[s.activeIdx];
    if (p.slots && p.slots[slotName]) {
      p.inv.push(p.slots[slotName]);
      this.log(`↩️ Снято: ${p.slots[slotName].n}`);
      p.slots[slotName] = null;
      this.saveDB();
      if (this.renderGame) this.renderGame();
    }
  },

  dropItem(idx) {
    const s = this.db.session;
    const p = s.players[s.activeIdx];
    const it = p.inv.splice(idx, 1)[0];
    this.log(`🗑️ Выброшено: ${it.n}`);
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  recalcLevel(p) {
    const sum = p.stats.str + p.stats.agi + p.stats.spd + p.stats.end + p.stats.int + p.stats.spi;
    let newLvl = 0;
    const tbl = window.STIKS_DB.LVL_TABLE;
    for (let i = 0; i < tbl.length; i++) {
      if (sum >= tbl[i]) newLvl = i;
    }
    if (newLvl > p.lvl) {
      p.lvl = newLvl;
      p.maxHp = 10 + p.stats.end;
      this.log(`🆙 ${p.name} достиг ${p.lvl} уровня!`);
      if (p.lvl >= 15 && !p.darUnlocked) {
        p.darUnlocked = true;
        this.log(`🌟 РАСКРЫТ ДАР 15 УРОВНЯ: ${window.STIKS_DB.ARCHETYPES[p.arch].dar15}!`);
      }
    }
  },

  usePearl(p, color) {
    const r = Math.random() * 100;
    if (color === 'white') {
      if (p.isKvaz) { p.isKvaz = false; this.log(`⚪ Белый жемчуг стабилизировал Кваза!`); }
      else { p.dars = (p.dars || 0) + 1; this.log(`⚪ Белый жемчуг: 100% получение и усиление Дара!`); }
      return;
    }
    const cfg = color === 'black' ? { dar: 50, upg: 60, kvaz: 85, inf: 90 } : { dar: 40, upg: 90, kvaz: 98, inf: 100 };
    if (r < cfg.dar) { p.dars = (p.dars || 0) + 1; this.log(`🔮 Жемчуг пробудил НОВЫЙ ДАР!`); }
    else if (r < cfg.upg) { p.darLvl = (p.darLvl || 1) + 1; this.log(`🔮 Жемчуг УСИЛИЛ существующий Дар!`); }
    else if (r < cfg.kvaz) { p.isKvaz = true; p.stats.str += 10; p.stats.end += 10; this.log(`☣️ МУТАЦИЯ: ${p.name} стал КВАЗОМ!`); }
    else if (r < cfg.inf) { p.asInfected = true; p.isInfected = true; this.log(`🧟 ОБРАЩЕНИЕ: ${p.name} стал ОСОБЫМ ЗАРАЖЕННЫМ!`); }
    else this.log(`💨 Жемчуг усвоился без видимых изменений.`);
    this.recalcLevel(p);
  },

  triggerEncounter(p, zMarker) {
    const s = this.db.session;
    const dQty = Math.floor(Math.random() * 6) + 1, dRank = Math.floor(Math.random() * 6) + 1;
    if (dQty === 6 && dRank === 6) {
      this.log(`🎁 ДУБЛЬ «6-6»! Враг уже мертв, на теле топовый лут!`);
      s.zombies = s.zombies.filter(z => z.id !== zMarker.id);
      const bonus = this.genClusterItem('weapon', '762', false);
      p.inv.push(bonus);
      this.log(`Трофей: ${bonus.n}`);
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }
    let finalRank = dRank + s.diffMod + (zMarker.rankMod || 0);
    if (dQty === 1 && dRank === 1) {
      finalRank = s.diffKey === 'start' ? 4 : 9;
      this.log(`⚠️ ПЕРЕГРУЗКА «1-1»! Одиночный элитный противник!`);
    }
    if (finalRank <= -1) {
      this.log(`💀 Встреченный зараженный уже мертв (ранг -1).`);
      s.zombies = s.zombies.filter(z => z.id !== zMarker.id);
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }
    const count = (dQty === 1 && dRank === 1) ? 1 : dQty;
    const enemies = [];
    const ranks = window.STIKS_DB.Z_RANKS;
    for (let i = 0; i < count; i++) {
      const rNum = i === 0 ? Math.min(9, finalRank) : Math.max(1, Math.floor(Math.random() * Math.max(1, finalRank)) + 1);
      const rInfo = ranks.find(x => x.r === rNum) || ranks[1];
      const lvl = rNum === 0 ? 0 : (Math.floor(Math.random() * (rInfo.max - rInfo.min + 1)) + rInfo.min);
      const div = rNum === 0 ? 2 : 1;
      const hp = Math.floor((20 + lvl * 8) / div), dmg = Math.floor((2 + lvl * 1.5) / div);
      const agi = Math.floor((10 + lvl * 3) / div), def = Math.floor(lvl * 0.5);
      enemies.push({ name: rInfo.n, rank: rNum, lvl, hp, maxHp: hp, dmg, agi, def, hitsTaken: 0 });
    }
    s.combat = { zId: zMarker.id, enemies, round: 1, usedSkill: false };
    this.log(`⚔️ БОЙ! Врагов: ${enemies.length} (Лидер: ${enemies[0].name} Ур.${enemies[0].lvl})`);
    if (this.renderCombat) this.renderCombat();
  },

  combatAttack(special) {
    const s = this.db.session;
    const p = s.players[s.activeIdx];
    const c = s.combat;
    const target = c.enemies[0];
    if (!target) return;

    const sl = p.slots || {};
    const activeW = sl.main || sl.side || sl.melee;
    if (!special && activeW && activeW.cal) {
      if (!sl.mag || sl.mag.cal !== activeW.cal) {
        this.log(`🚫 ОСЕЧКА! [${activeW.n}] не заряжено! Нужны патроны [${activeW.cal}] в Обойме.`);
        this.sayAs(p.arch, 'Чёрт, ствол пустой! Нужны патроны!');
        return;
      }
    }

    if (special && !c.usedSkill) {
      c.usedSkill = true;
      p.skillUnlocked = true;
      this.log(`💥 ПРИМЕНЕНО УМЕНИЕ [${window.STIKS_DB.ARCHETYPES[p.arch].skill}]! ${target.name} повержен!`);
      target.hp = 0;
    } else {
      const d2 = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
      const wAtk = activeW ? ((activeW.a || 0) + (sl.mag ? sl.mag.a : 0) + (sl.mod ? sl.mod.a : 0)) : 0;
      const strBonus = Math.floor(p.stats.str / 10);
      const shred = Math.max(0.1, 1 - Math.max(0, target.hitsTaken - 5) * 0.1);
      const tDef = Math.floor(target.def * shred);
      const dmg = Math.max(1, (d2 + wAtk + strBonus) - tDef);
      target.hp -= dmg;
      target.hitsTaken++;
      this.log(`🔫 Атака (2D6=${d2}): нанесено ${dmg} урона по ${target.name}.`);
    }

    if (target.hp <= 0) {
      this.log(`✅ ${target.name} уничтожен!`);
      p.lastKill = { rank: target.rank, isHuman: !!target.isHuman };
      c.enemies.shift();
    }

    if (c.enemies.length === 0) {
      this.log(`🏆 ПОБЕДА В СХВАТКЕ!`);
      p.actionsCount++;
      p.stats.str += 1;
      this.recalcLevel(p);
      s.zombies = s.zombies.filter(z => z.id !== c.zId);
      s.combat = null;
      this.saveDB();
      if (this.renderGame) this.renderGame();
      return;
    }

    const totDef = (sl.armor ? sl.armor.d : 0) + (sl.clothes ? sl.clothes.d : 0) + (sl.boots ? sl.boots.d : 0);
    c.enemies.forEach(e => {
      const dodge = p.stats.agi - (e.agi / 2);
      if (Math.random() * 100 < dodge) {
        this.log(`💨 ${p.name} уклонился от атаки (${e.name})!`);
      } else {
        const inc = Math.max(1, e.dmg - totDef);
        p.hp -= inc;
        this.log(`🩸 ${e.name} наносит ${inc} урона!`);
      }
    });

    if (p.hp <= 0) {
      p.hp = 0; p.dead = true; p.status = 'dead';
      const f = this.db.families[p.family];
      if (f) { const o = f.find(h => h.uid === p.uid); if (o) { Object.assign(o, p); o.status = 'dead'; } }
      s.combat = null;
      this.log(`☠️ ${p.name} ПОГИБ! В следующей партии доступен как Зараженный.`);
      this.saveDB();
      this.nextTurn();
      return;
    }
    c.round++;
    this.saveDB();
    if (this.renderCombat) this.renderCombat();
  },

  combatFlee() {
    const s = this.db.session;
    const p = s.players[s.activeIdx];
    const lead = s.combat.enemies[0];
    const chance = Math.max(10, (p.stats.spd * 1.5) - (lead.agi * 0.5));
    if (Math.random() * 100 < chance) {
      this.log(`🏃 ${p.name} успешно сбежал из боя!`);
      s.combat = null;
      this.saveDB();
      if (this.renderGame) this.renderGame();
    } else {
      this.log(`❌ Побег не удался! Враги перехватили инициативу.`);
      this.combatAttack(false);
    }
  },

  devourEnemy() {
    const s = this.db.session;
    const p = s.players[s.activeIdx];
    if (!p.lastKill) return;
    if (p.stepsLeft < 1) { this.log('Нет ОХ для пожирания.'); return; }
    p.stepsLeft = 0;
    const k = p.lastKill;
    const healPct = k.rank >= p.lvl ? 0.5 : 0.25;
    p.hp = Math.min(p.maxHp, p.hp + Math.floor(p.maxHp * healPct));
    p.food = Math.min(100, p.food + 50);
    p.stats.str += 3;
    this.recalcLevel(p);
    this.log(`🍖 Тело поглощено! +${Math.round(healPct * 100)}% HP и +3 к Силе.`);
    p.lastKill = null;
    this.saveDB();
    if (this.renderGame) this.renderGame();
  },

  useWeirdSkill() {
    const s = this.db.session;
    const p = s.players[s.activeIdx];
    if (p.asInfected) {
      this.log('Инстинкты Улья подавляют человеческие привычки.');
      return;
    }
    const a = window.STIKS_DB.ARCHETYPES[p.arch];
    this.log(p.skillUnlocked ? `Умение [${a.skill}] готово к бою.` : `[${p.name}]: ${a.hint}`);
  },

  nextTurn() {
    const s = this.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (!p.escaped && !p.dead) {
      const dr = p.hp < (p.maxHp * 0.5) ? 2 : 1;
      p.spore = Math.max(0, p.spore - dr);
      p.food = Math.max(0, p.food - 1);
      p.water = Math.max(0, p.water - 1);
      if (p.stinkTurns > 0) p.stinkTurns--;
    }
    s.activeIdx++;
    if (s.activeIdx >= s.players.length) {
      s.activeIdx = 0;
      s.turn++;
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      s.zombies.forEach(z => {
        if (z.type === 'ambush' && z.hidden && !z.tPos) return;
        let tx = z.x, ty = z.y;
        if (z.tPos) {
          tx += Math.sign(z.tPos.x - z.x);
          ty += Math.sign(z.tPos.y - z.y);
          if (tx === z.tPos.x && ty === z.tPos.y) z.tPos = null;
        } else {
          const d = dirs[Math.floor(Math.random() * 4)];
          tx += d[0]; ty += d[1];
        }
        if (tx >= 0 && tx <= 59 && ty >= 0 && ty <= 59 && !s.grid[ty][tx].blocked) {
          z.x = tx; z.y = ty;
        }
      });
      this.log(`--- ХОД ${s.turn} ---`);
    }
    const np = s.players[s.activeIdx];
    if (np.escaped || np.dead) {
      if (s.players.every(pl => pl.escaped || pl.dead)) {
        alert('Рейд завершен! Возврат в Лобби.');
        this.db.session = null;
        this.squad = [];
        this.saveDB();
        if (this.renderLobby) this.renderLobby();
        return;
      }
      this.nextTurn();
      return;
    }
    np.maxAp = this.calcMaxAP(np.stats.spd);
    np.stepsLeft = np.maxAp;
    np.movedThisTurn = false;
    this.saveDB();
    if (this.renderGame) this.renderGame();
  }
};
