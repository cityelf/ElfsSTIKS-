window.STIKS_REMOTE_PATCH = {
  version: "v1.5-full-combat",
  DB_SET: {
    "ARCHETYPES.tatan.phrase": "По щелчку в три пятнадцать, татааань!!!",
    "ARCHETYPES.kachok.phrase": "Прямиком в ад. Ннахх!!!",
    "ARCHETYPES.asiat.phrase": "уууиииииаааауауауааа!",
    "ARCHETYPES.prof.skill": "Опыт с магнием",
    "ARCHETYPES.prof.phrase": "looks like magnificus magic",
    "ARCHETYPES.alkash.phrase": "охтыжйоптвойууумааать!",
    "ARCHETYPES.strip.phrase": "оооой детка! Ты такой сладкий!",
    "ARCHETYPES.surgeon": {
      name: "Хирург",
      stats: { str: 8, agi: 16, spd: 9, end: 7, int: 14, spi: 6 },
      mult: { str: 1, agi: 2.5, spd: 1, end: 0.8, int: 2, spi: 0.5 },
      skill: "Вскрытие сухожилий",
      phrase: "мииилочка! Резать не дозьидайась прьетонита!",
      hint: "Щелкает невидимым скальпелем.",
      dar15: "Потрошитель Улья (Без Клятвы, крит x3)"
    },
    "ARCHETYPES.nanny": {
      name: "Воспитательница",
      stats: { str: 7, agi: 8, spd: 9, end: 12, int: 10, spi: 14 },
      mult: { str: 0.8, agi: 1, spd: 1, end: 1.5, int: 1.2, spi: 2 },
      skill: "А ну-ка в угол!",
      phrase: "опяааать обосралсиии!? Ааа ну ка в угол!",
      hint: "Грозит пальцем пустоте.",
      dar15: "Мать-героиня мутантов (Вербовка)"
    },
    "ARCHETYPES.cashier": {
      name: "Кассирша",
      stats: { str: 8, agi: 13, spd: 11, end: 14, int: 8, spi: 6 },
      mult: { str: 1, agi: 2, spd: 1.5, end: 2, int: 1, spi: 0.5 },
      skill: "Галя, у нас отмена!",
      phrase: "гхаааляаа у нас ооотмеээнааа!!!",
      hint: "Пикает сканером штрих-кодов.",
      dar15: "Круглосуточный гипермаркет (Контратаки)"
    },
    "ARCHETYPES.gigolo": {
      name: "Жигало",
      stats: { str: 10, agi: 14, spd: 13, end: 9, int: 6, spi: 8 },
      mult: { str: 1.2, agi: 2, spd: 1.5, end: 1, int: 0.8, spi: 1.2 },
      skill: "Томный взгляд и комплимент",
      phrase: "Ты погляди какой у меня инструмент!",
      hint: "Поправляет челку.",
      dar15: "Неотразимый альфа-самэц (Обморок врагов)"
    },
    "ARCHETYPES.schoolgirl": {
      name: "Школьница",
      stats: { str: 5, agi: 17, spd: 18, end: 6, int: 9, spi: 5 },
      mult: { str: 0.5, agi: 2.5, spd: 2.5, end: 0.8, int: 1.2, spi: 1 },
      skill: "Ультразвуковой визг",
      phrase: "а ну стоять! Там гугрриморда - он в синергии с Пикачу! Я должна его поймать",
      hint: "Трясет разбитым телефоном.",
      dar15: "Чит-код разработчика (Игнор брони)"
    },
    "ARCHETYPES.vet": {
      name: "Ветеринар девушка",
      stats: { str: 7, agi: 13, spd: 11, end: 10, int: 13, spi: 6 },
      mult: { str: 0.8, agi: 1.8, spd: 1.2, end: 1.2, int: 1.8, spi: 1 },
      skill: "А ну-ка дай лапу!",
      phrase: "А ну-ка дай лапу!",
      hint: "Роется в сумке в поисках шприца.",
      dar15: "Хозяйка очереди (50% приручение)"
    },
    "SHAME_AMULETS": {
      kachok: "Розовые трусики с доступом",
      prof: "Гигантский фаллоимитатор",
      alkash: "Упаковка слабительного",
      strip: "Надувной резиновый топор",
      tatan: "Экшн-камера с солнечной батареей",
      asiat: "Ботинки 59-го размера",
      surgeon: "Дешёвый пластиковый водяной пистолетик-брызгалка",
      nanny: "Вязаная шапочка с бубенчиками",
      cashier: "Картонный брелок-пищалка «Скидочная карта»",
      gigolo: "Карманное зеркальце-пудреница с розовыми блёстками",
      schoolgirl: "Розовый пластмассовый обруч с пружинками и сердечками",
      vet: "Резиновая пищалка-курица для собак"
    },
    "VOICE_CFG.surgeon": { p: 0.85, r: 1.15, pause: 190 },
    "VOICE_CFG.nanny": { p: 1.45, r: 1.05, pause: 220 },
    "VOICE_CFG.cashier": { p: 1.32, r: 1.28, pause: 150 },
    "VOICE_CFG.gigolo": { p: 0.82, r: 0.98, pause: 240 },
    "VOICE_CFG.schoolgirl": { p: 1.95, r: 1.35, pause: 140 },
    "VOICE_CFG.vet": { p: 1.58, r: 1.16, pause: 180 }
  },
  DB_PUSH: {
    "CAL_POOL.gear": [
      { n: "Гигантский фаллоимитатор", d: 0, w: 0.8, slot: "talisman", troll: true, noDrop: true, noDropMsg: "Я не отдам свою прелесть!", cls: 1 },
      { n: "Экшн-камера с солнечной батареей", d: 0, w: 0.3, slot: "talisman", troll: true, noDrop: true, noDropMsg: "Вспоминает о неприличных видео в памяти и прячет от всех!", cls: 1 },
      { n: "Ботинки 59-го размера", d: 1, w: 1.5, slot: "talisman", troll: true, cls: 1 },
      { n: "Упаковка слабительного", d: 0, w: 0.1, slot: "talisman", troll: true, cls: 1 },
      { n: "Дешёвый пластиковый водяной пистолетик-брызгалка", d: 0, w: 0.2, slot: "talisman", troll: true, noDrop: true, noDropMsg: "У него идеальная баллистика струи!", cls: 1 },
      { n: "Вязаная шапочка с бубенчиками", d: 1, w: 0.2, slot: "talisman", troll: true, noDrop: true, noDropMsg: "Без шапочки продует уши!", cls: 1 },
      { n: "Картонный брелок-пищалка «Скидочная карта»", d: 0, w: 0.05, slot: "talisman", troll: true, cls: 1 },
      { n: "Карманное зеркальце-пудреница с розовыми блёстками", d: 0, w: 0.15, slot: "talisman", troll: true, noDrop: true, noDropMsg: "А как я буду проверять укладку?!", cls: 1 },
      { n: "Розовый пластмассовый обруч с пружинками и сердечками", d: 0, w: 0.1, slot: "talisman", troll: true, cls: 1 },
      { n: "Резиновая пищалка-курица для собак", d: 0, w: 0.15, slot: "talisman", troll: true, cls: 1 }
    ]
  },
      ENGINE_SET: {
    getStepCost(m) {
      return m === 'careful' ? 3 : (m === 'fast' ? 2 : 1);
    },
    isFem(p) {
      const f = ['tatan', 'strip', 'nanny', 'cashier', 'schoolgirl', 'vet'];
      return p && f.includes(p.arch) && !p.asInfected;
    },
    formatSpeech(role, txt) {
      if (role === 'infected') {
        let t = this.corruptInfectedGrammar(txt);
        t = t.replace(this.HUNT_WORDS, (m, sp, w) => sp + w.toUpperCase() + '!');
        return t.replace(/р/g, 'рр').replace(/Р/g, 'Рр').replace(/о/g, 'О');
      }
      if (role === 'prof') {
        let t = txt.replace(/[^.!?]+[.!?]*/g, sent => {
          const w = sent.trim().split(/\s+/).filter(Boolean);
          return w.length > 5 ? sent.replace(/,/g, ', мм,') : sent;
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
      if (role === 'surgeon') return txt.replace(/ж/g, 'зь').replace(/Ж/g, 'Зь').replace(/ш/g, 'сь').replace(/Ш/g, 'Сь');
      if (role === 'nanny') return txt.replace(/а/g, 'аа').replace(/!+/g, '!?');
      if (role === 'cashier') return txt.replace(/о/g, 'оо').replace(/а/g, 'аа');
      if (role === 'gigolo') return txt.replace(/,/g, '... ммм, ');
      if (role === 'schoolgirl') return txt.replace(/!/g, '!! ').replace(/р/g, 'рр');
      return txt;
    },
    dropItem(idx) {
      const s = this.db.session;
      const p = s.players[s.activeIdx];
      const it = p.inv[idx];
      if (it && it.noDrop) {
        const m = it.noDropMsg || 'Нельзя выкинуть!';
        this.log('🚫 ' + m);
        this.sayAs(p.arch, m);
        return;
      }
      p.inv.splice(idx, 1);
      this.log('🗑️ Выброшено: ' + it.n);
      this.saveDB();
      if (this.renderGame) this.renderGame();
    },
    unequipSlot(k) {
      const s = this.db.session;
      const p = s.players[s.activeIdx];
      const it = p.slots && p.slots[k];
      if (it) {
        if (it.noDrop) {
          const m = it.noDropMsg || 'Нельзя снять!';
          this.log('🚫 ' + m);
          this.sayAs(p.arch, m);
          return;
        }
        p.inv.push(it);
        p.slots[k] = null;
        this.log('↩️ Снято: ' + it.n);
        this.saveDB();
        if (this.renderGame) this.renderGame();
      }
    },    useShameTalisman() {
      const s = this.db.session;
      const p = s.players[s.activeIdx];
      const c = s.combat;
      if (!c || c.usedTalisman) return;
      const tal = p.slots && p.slots.talisman;
      if (!tal || !tal.amuletActive) {
        this.log('❌ Личный талисман позора не надет.');
        return;
      }
      c.usedTalisman = true;
      const a = p.arch, en = c.enemies;
      if (a === 'tatan') {
        en.forEach(e => {
          e.noDodge = true;
          e.accMult = 0.5;
        });
        this.log('💃 Татань пляшет! Уклонение врагов 0.');
      } else if (a === 'asiat') {
        const w = en[en.length - 1];
        if (w) {
          w.stunTurns = 2;
          this.log('👟 Ботинки-нунчаки! Враг в обмороке.');
        }
      } else if (a === 'prof') {
        const cnt = Math.max(1, Math.floor(en.length / 2));
        for (let i = 0; i < cnt; i++) en[i].stunTurns = 2;
        for (let i = cnt; i < en.length; i++) {
          en[i].dmg = Math.floor(en[i].dmg * 0.5);
          en[i].def = Math.floor(en[i].def * 0.5);
        }
        this.log('🦄 Единорог соблазнил половину стаи!');
      } else if (a === 'alkash') {
        const rx = /пив|водк|спирт|виск|коньяк|самогон/i;
        const ai = p.inv.findIndex(x => rx.test(x.n));
        if (ai === -1) {
          c.usedTalisman = false;
          this.log('🍺 Нет алкоголя для слабительного!');
          return;
        }
        p.inv.splice(ai, 1);
        const half = Math.ceil(en.length / 2);
        en.forEach((e, i) => {
          if (i < half) e.dmg = Math.floor(e.dmg / 2);
          else e.accMult = 0.1;
        });
        this.log('💩 Залп слабительным! Враги ослеплены.');
      } else if (a === 'surgeon') {
        en.forEach(e => {
          e.accMult = 0.25;
          e.dmg = Math.floor(e.dmg * 0.25);
        });
        this.log('🔫 Брызгалка в глаза! Точность -75%.');
      } else if (a === 'nanny') {
        const cnt = Math.max(1, Math.floor(en.length / 2));
        for (let i = 0; i < cnt; i++) en[i].stunTurns = 2;
        this.log('🔔 Бубенчики усыпили половину стаи!');
      } else if (a === 'cashier') {
        c.infightTurns = 2;
        this.log('📟 Пищалка сбила сигнал! Враги бьют друг друга.');
      } else if (a === 'gigolo') {
        en.forEach(e => {
          e.accMult = 0;
          e.noDodge = true;
        });
        this.log('🪞 Солнечный зайчик ослепил врагов!');
      } else if (a === 'schoolgirl') {
        c.radDodges = 3;
        en.forEach(e => e.def = Math.floor(e.def / 2));
        this.log('🎀 Обруч активен! Уклон от 3 атак.');
      } else if (a === 'vet') {
        c.chickenTurns = 2;
        this.log('🐔 Курица-пищалка отвлекла стаю на 2 хода!');
      } else {
        this.log('🍀 Талисман позора применён!');
      }
      this.saveDB();
      if (this.renderCombat) this.renderCombat();
    },
              combatAttack(special) {
      const s = this.db.session;
      const p = s.players[s.activeIdx];
      const c = s.combat;
      const target = c.enemies[0];
      if (!target) return;
      const aObj = window.STIKS_DB.ARCHETYPES[p.arch];
      const sl = p.slots || {};
      const activeW = sl.main || sl.side || sl.melee;

      if (p.arch === 'vet' && p.lvl < 15 && c.vetPrepTarget) {
        this.log('💉 Укол сделан: ' + c.vetPrepTarget.name + ' готов!');
        c.enemies = c.enemies.filter(e => e !== c.vetPrepTarget);
        c.vetPrepTarget = null;
        if (!c.enemies.length) {
          s.zombies = s.zombies.filter(z => z.id !== c.zId);
          s.combat = null;
          this.saveDB();
          this.renderGame();
          return;
        }
        this.saveDB();
        this.renderCombat();
        return;
      }

      if (!special && activeW && activeW.cal) {
        if (!sl.mag || sl.mag.cal !== activeW.cal) {
          this.log('🚫 ОСЕЧКА! Нет патронов [' + activeW.cal + ']');
          this.sayAs(p.arch, 'Ствол пустой! Нужны патроны!');
          return;
        }
      }

      const autoSk = ['cashier', 'alkash'].includes(p.arch);
      if (special && !c.usedSkill && !autoSk) {
        c.usedSkill = true;
        p.skillUnlocked = true;
        if (aObj.phrase) {
          this.log('🗣️ ' + p.name + ': «' + aObj.phrase + '»');
          this.sayAs(p.arch, aObj.phrase);
        }
        if (p.arch === 'tatan') {
          if (target.rank <= p.lvl) {
            target.hp = 0;
            this.log('💥 Пощёчина наповал!');
          } else {
            target.dmg = Math.floor(target.dmg / 2);
            target.def = Math.floor(target.def / 2);
            this.log('😱 Статы босса снижены вдвое!');
          }
        } else if (p.arch === 'kachok') {
          if (target.rank <= p.lvl + 1) {
            target.hp = 0;
            this.log('🥊 Двоечка в челюсть! Наповал!');
          } else {
            target.stunTurns = 1;
            target.noDef = true;
            this.log('💫 Ошеломление! Бьём мимо всей защиты!');
          }
        } else if (p.arch === 'asiat') {
          const sq = s.players.filter(x => !x.dead && !x.escaped).length;
          if ((sq === 1 && c.enemies.length >= 2) ||
              (sq > 1 && c.enemies.length >= sq * 2)) {
            c.asiatKite = 2;
            this.log('🤸 Враги 2 хода гоняются за Азиатом!');
          } else {
            target.hp -= 10;
            this.log('🤸 Выпад хламом: 10 урона.');
          }
        } else if (p.arch === 'prof') {
          c.enemies.forEach(e => {
            if (Math.random() < 0.5) {
              e.blindChaos = true;
              e.accMult = 0.5;
            }
          });
          this.log('✨ Вспышка магния! Ослеплённые бьют всех!');
        } else if (p.arch === 'strip') {
          target.hp -= Math.max(5, Math.floor(p.stats.agi * 1.2));
          target.stunTurns = 1;
          this.log('💃 Смертельный танец без контратаки!');
        } else if (p.arch === 'surgeon') {
          target.agi = 0;
          target.noDodge = true;
          this.log('🔪 Сухожилия вскрыты! Уклон врага 0.');
        } else if (p.arch === 'nanny') {
          if (target.rank <= p.lvl + 1) {
            target.stunTurns = 1;
            target.def = Math.floor(target.def / 2);
            this.log('👉 В угол! Пропуск хода и -50% защиты.');
          }
        } else if (p.arch === 'gigolo') {
          const cnt = Math.max(1, Math.floor(c.enemies.length * 0.7));
          for (let i = 0; i < cnt; i++) {
            c.enemies[i].dmg = Math.floor(c.enemies[i].dmg / 2);
          }
          this.log('😏 Атака ' + cnt + ' врагов вдвое ниже!');
        } else if (p.arch === 'schoolgirl') {
          c.enemies.forEach(e => {
            e.stunTurns = 99;
            e.halfDmgTaken = true;
          });
          this.log('📢 Визг! Враги в ступоре (урон по ним /2).');
        } else if (p.arch === 'vet') {
          if (target.hasWeapon) {
            target.hasWeapon = false;
            target.dmg = Math.max(1, Math.floor(target.dmg / 2));
            this.log('🐾 Враг бросил оружие до конца боя!');
          } else {
            const lim = Math.min(3, c.enemies.length);
            for (let i = 0; i < lim; i++) {
              c.enemies[i].dmg = Math.floor(c.enemies[i].dmg / 2);
            }
            this.log('🐾 На 1 лапе! Атака 3 врагов вдвое ниже.');
          }
        }
                } else {
        const d2 = Math.floor(Math.random() * 6) +
                   Math.floor(Math.random() * 6) + 2;
        let wAtk = activeW ? ((activeW.a || 0) +
          (sl.mag ? sl.mag.a : 0) + (sl.mod ? sl.mod.a : 0)) : 0;
        const hasPanties = p.arch === 'kachok' && sl.talisman &&
          sl.talisman.amuletActive && !sl.main && !sl.side;
        if (hasPanties) {
          const cls = activeW ? (activeW.cls || 1) : 0;
          const flat =;
          wAtk += (cls >= 4 ? flat[4] * 2 : flat[cls + 1]);
        }
        const strB = Math.floor(p.stats.str / 10);
        const shred = Math.max(0.1, 1 - Math.max(0, target.hitsTaken - 5) * 0.1);
        const ignDef = target.noDef || (p.arch === 'schoolgirl' && p.lvl >= 15);
        const tDef = ignDef ? 0 : Math.floor(target.def * shred);
        let dmg = Math.max(1, (d2 + wAtk + strB) - tDef);
        if (p.arch === 'surgeon' && p.lvl >= 15 && target.hp < target.maxHp * 0.5) {
          dmg *= 3;
        }
        if (target.halfDmgTaken) dmg = Math.max(1, Math.floor(dmg / 2));
        if (p.arch === 'vet' && p.lvl < 15 && target.hp - dmg <= 0) {
          c.vetPrepTarget = target;
          this.log('👜 Ветеринар ищет шприц: «Подождите очереди!»');
          this.sayAs('vet', 'Подождите очереди!');
        } else {
          target.hp -= dmg;
          target.hitsTaken++;
          this.log('🔫 Удар (2D6=' + d2 + '): ' + dmg + ' урона.');
        }
      }

      if (c.asiatKite > 0) {
        c.asiatKite--;
        const hDmg = Math.max(1, Math.floor((6 + Math.floor(p.stats.str / 10)) / 2));
        c.enemies.forEach(e => { e.hp -= hDmg; });
        this.log('🧱 Азиат кидает хлам! Всем врагам по ' + hDmg + ' урона.');
      }

      c.enemies = c.enemies.filter(e => {
        if (e.hp <= 0) {
          this.log('✅ ' + e.name + ' уничтожен!');
          p.lastKill = { rank: e.rank };
          return false;
        }
        return true;
      });

      if (!c.enemies.length) {
        this.log('🏆 ПОБЕДА В СХВАТКЕ!');
        p.actionsCount++;
        p.stats.str += 1;
        this.recalcLevel(p);
        s.zombies = s.zombies.filter(z => z.id !== c.zId);
        s.combat = null;
        this.saveDB();
        this.renderGame();
        return;
      }

      const totDef = (sl.armor ? sl.armor.d : 0) +
                     (sl.clothes ? sl.clothes.d : 0) +
                     (sl.boots ? sl.boots.d : 0);
      c.enemies.forEach(e => {
        if (c.vetPrepTarget || c.alkashDodgeTurn) return;
        if (e.stunTurns > 0) { e.stunTurns--; return; }
        if (c.chickenTurns > 0 || c.asiatKite > 0) return;
        if (c.infightTurns > 0 && c.enemies.length > 1) {
          const ot = c.enemies.find(x => x !== e);
          if (ot) { ot.hp -= e.dmg; this.log('🤪 Враги бьют друг друга!'); }
          return;
        }
        if (e.blindChaos && Math.random() < 0.5) {
          const rnd = c.enemies[Math.floor(Math.random() * c.enemies.length)];
          rnd.hp -= 5;
          this.log('🙈 Ослеплённый враг ударил себя/соседа на 5!');
          return;
        }
        if (c.radDodges > 0) { c.radDodges--; this.log('🎀 Обруч отбил удар!'); return; }
        const dodge = p.stats.agi - (e.agi / 2);
        if (Math.random() * 100 < dodge) {
          this.log('💨 Уклонение от атаки ' + e.name + '!');
          return;
        }
        const inc = Math.max(1, (e.blindChaos ? 5 : e.dmg) - totDef);
        if (p.arch === 'cashier' && !c.usedSkill && inc >= p.hp / 10) {
          c.usedSkill = true;
          p.skillUnlocked = true;
          this.log('🗣️ Кассирша: «гхаааляаа у нас ооотмеээнааа!!!»');
          this.sayAs('cashier', 'гхаааляаа у нас ооотмеээнааа!!!');
          return;
        }
        if (p.arch === 'alkash' && !c.usedSkill && inc >= p.maxHp * 0.1) {
          c.usedSkill = true;
          p.skillUnlocked = true;
          c.alkashDodgeTurn = true;
          this.log('🗣️ Алкаш: «охтыжйоптвойууумааать!»');
          this.sayAs('alkash', 'охтыжйоптвойууумааать!');
          this.log('☣️ [УЛЕЙ]: Объект в пьяном кувырке ушёл от всех ударов!');
          return;
        }
        p.hp -= inc;
        this.log('🩸 ' + e.name + ' наносит ' + inc + ' урона!');
      });

      c.alkashDodgeTurn = false;
      if (c.infightTurns > 0) c.infightTurns--;
      if (c.chickenTurns > 0) c.chickenTurns--;
      c.enemies = c.enemies.filter(e => e.hp > 0);
      if (!c.enemies.length) {
        s.zombies = s.zombies.filter(z => z.id !== c.zId);
        s.combat = null;
        this.saveDB();
        this.renderGame();
        return;
      }
      if (p.hp <= 0) {
        p.hp = 0; p.dead = true; p.status = 'dead';
        const f = this.db.families[p.family];
        if (f) {
          const o = f.find(h => h.uid === p.uid);
          if (o) { Object.assign(o, p); o.status = 'dead'; }
        }
        s.combat = null;
        this.log('☠️ ' + p.name + ' ПОГИБ!');
        this.saveDB();
        this.nextTurn();
        return;
      }
      c.round++;
      this.saveDB();
      if (this.renderCombat) this.renderCombat();
              }
            },
  RAW_JS: `
    if (window.STIKS) {
      const origEquip = window.STIKS.equipFromInv.bind(window.STIKS);
      window.STIKS.equipFromInv = function(idx) {
        const s = this.db.session;
        const p = s.players[s.activeIdx];
        const it = p.inv[idx];
        if (it && (it.cat === 'supply' || it.slot === 'use') && p.arch === 'nanny') {
          if (it.hp) it.hp = Math.round(it.hp * 1.5);
          if (it.food) it.food = Math.round(it.food * 1.5);
          if (it.water) it.water = Math.round(it.water * 1.5);
          if (it.stamina) it.stamina = Math.round(it.stamina * 1.5);
          if (it.spore) it.spore = Math.round(it.spore * 1.5);
        }
        origEquip(idx);
      };
      const origCombat = window.STIKS.renderCombat.bind(window.STIKS);
      window.STIKS.renderCombat = function() {
        origCombat();
        const s = this.db.session;
        const c = s && s.combat;
        const p = s && s.players[s.activeIdx];
        const vp = document.getElementById('game-viewport');
        const tal = p && p.slots && p.slots.talisman;
        if (c && p && vp && !c.usedTalisman && tal && tal.amuletActive) {
          const btn = document.createElement('button');
          btn.className = 'btn';
          btn.style.cssText = 'width:100%;margin-top:6px;border-color:#9ec4a9;color:#9ec4a9;';
          btn.innerText = '🍀 Талисман: ' + tal.n;
          btn.onclick = () => window.STIKS.useShameTalisman();
          vp.appendChild(btn);
        }
      };
    }
    const b = document.getElementById('patch-status');
    if (b) b.innerText = 'Патч: v1.5-full-combat';
  `
};
window.STIKS_PATCH_DATA = window.STIKS_REMOTE_PATCH;
if (window.STIKS_PATCHER) {
  window.STIKS_PATCHER.boot = function() {
    this.applyFromStorage();
    return 'Патч: v1.5-full-combat';
  };
  window.STIKS_PATCHER.applyPatchObject(window.STIKS_REMOTE_PATCH);
}

          
