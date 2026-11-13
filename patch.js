window.STIKS_REMOTE_PATCH = {
  version: "v1.5-full-combat",
  DB_SET: {
    "ARCHETYPES.tatan.phrase":
      "По щелчку в три пятнадцать, татааань!!!",
    "ARCHETYPES.kachok.phrase":
      "Прямиком в ад. Ннахх!!!",
    "ARCHETYPES.asiat.phrase":
      "уууиииииаааауауауааа!",
    "ARCHETYPES.prof.skill":
      "Опыт с магнием",
    "ARCHETYPES.prof.phrase":
      "looks like magnificus magic",
    "ARCHETYPES.alkash.phrase":
      "охтыжйоптвойууумааать!",
    "ARCHETYPES.strip.phrase":
      "оооой детка! Ты такой сладкий!",
    "ARCHETYPES.surgeon": {
      name: "Хирург",
      stats: { str: 8, agi: 16, spd: 9,
               end: 7, int: 14, spi: 6 },
      mult: { str: 1, agi: 2.5, spd: 1,
              end: 0.8, int: 2, spi: 0.5 },
      skill: "Вскрытие сухожилий",
      phrase: "мииилочка! Резать не дозьидайась прьетонита!",
      hint: "Щелкает невидимым скальпелем.",
      dar15: "Потрошитель Улья"
    },
    "ARCHETYPES.nanny": {
      name: "Воспитательница",
      stats: { str: 7, agi: 8, spd: 9,
               end: 12, int: 10, spi: 14 },
      mult: { str: 0.8, agi: 1, spd: 1,
              end: 1.5, int: 1.2, spi: 2 },
      skill: "А ну-ка в угол!",
      phrase: "опяааать обосралсиии!? Ааа ну ка в угол!",
      hint: "Грозит пальцем пустоте.",
      dar15: "Мать-героиня мутантов"
    },
    "ARCHETYPES.cashier": {
      name: "Кассирша",
      stats: { str: 8, agi: 13, spd: 11,
               end: 14, int: 8, spi: 6 },
      mult: { str: 1, agi: 2, spd: 1.5,
              end: 2, int: 1, spi: 0.5 },
      skill: "Галя, у нас отмена!",
      phrase: "гхаааляаа у нас ооотмеээнааа!!!",
      hint: "Пикает сканером штрих-кодов.",
      dar15: "Круглосуточный гипермаркет"
    },
    "ARCHETYPES.gigolo": {
      name: "Жигало",
      stats: { str: 10, agi: 14, spd: 13,
               end: 9, int: 6, spi: 8 },
      mult: { str: 1.2, agi: 2, spd: 1.5,
              end: 1, int: 0.8, spi: 1.2 },
      skill: "Томный взгляд и комплимент",
      phrase: "Ты погляди какой у меня инструмент!",
      hint: "Поправляет челку.",
      dar15: "Неотразимый альфа-самэц"
    },
    "ARCHETYPES.schoolgirl": {
      name: "Школьница",
      stats: { str: 5, agi: 17, spd: 18,
               end: 6, int: 9, spi: 5 },
      mult: { str: 0.5, agi: 2.5, spd: 2.5,
              end: 0.8, int: 1.2, spi: 1 },
      skill: "Ультразвуковой визг",
      phrase: "а ну стоять! Там гугрриморда - он в синергии с Пикачу! Я должна его поймать",
      hint: "Трясет разбитым телефоном.",
      dar15: "Чит-код разработчика"
    },
    "ARCHETYPES.vet": {
      name: "Ветеринар девушка",
      stats: { str: 7, agi: 13, spd: 11,
               end: 10, int: 13, spi: 6 },
      mult: { str: 0.8, agi: 1.8, spd: 1.2,
              end: 1.2, int: 1.8, spi: 1 },
      skill: "А ну-ка дай лапу!",
      phrase: "А ну-ка дай лапу!",
      hint: "Роется в сумке в поисках шприца.",
      dar15: "Хозяйка очереди"
    },
    "SHAME_AMULETS": {
      kachok: "Розовые трусики с доступом",
      prof: "Гигантский фаллоимитатор",
      alkash: "Упаковка слабительного",
      strip: "Надувной резиновый топор",
      tatan: "Экшн-камера с солнечной батареей",
      asiat: "Ботинки 59-го размера",
      surgeon: "Водяной пистолетик-брызгалка",
      nanny: "Вязаная шапочка с бубенчиками",
      cashier: "Брелок-пищалка Скидочная карта",
      gigolo: "Зеркальце-пудреница с блёстками",
      schoolgirl: "Розовый обруч с сердечками",
      vet: "Резиновая пищалка-курица"
    },
    "VOICE_CFG.surgeon": { p: 0.85, r: 1.15, pause: 190 },
    "VOICE_CFG.nanny": { p: 1.45, r: 1.05, pause: 220 },
    "VOICE_CFG.cashier": { p: 1.32, r: 1.28, pause: 150 },
    "VOICE_CFG.gigolo": { p: 0.82, r: 0.98, pause: 240 },
    "VOICE_CFG.schoolgirl": { p: 1.95, r: 1.35, pause: 140 },
    "VOICE_CFG.vet": { p: 1.58, r: 1.16, pause: 180 }
  },  DB_PUSH: {
    "CAL_POOL.gear": [
      { n: "Гигантский фаллоимитатор", d: 0, w: 0.8,
        slot: "talisman", troll: true, noDrop: true,
        noDropMsg: "Я не отдам свою прелесть!", cls: 1 },
      { n: "Экшн-камера с солнечной батареей", d: 0, w: 0.3,
        slot: "talisman", troll: true, noDrop: true,
        noDropMsg: "Прячет неприличные видео!", cls: 1 },
      { n: "Ботинки 59-го размера", d: 1, w: 1.5,
        slot: "talisman", troll: true, cls: 1 },
      { n: "Упаковка слабительного", d: 0, w: 0.1,
        slot: "talisman", troll: true, cls: 1 },
      { n: "Водяной пистолетик-брызгалка", d: 0, w: 0.2,
        slot: "talisman", troll: true, noDrop: true,
        noDropMsg: "Идеальная баллистика струи!", cls: 1 },
      { n: "Вязаная шапочка с бубенчиками", d: 1, w: 0.2,
        slot: "talisman", troll: true, noDrop: true,
        noDropMsg: "Без шапочки продует уши!", cls: 1 },
      { n: "Брелок-пищалка Скидочная карта", d: 0, w: 0.05,
        slot: "talisman", troll: true, cls: 1 },
      { n: "Зеркальце-пудреница с блёстками", d: 0, w: 0.15,
        slot: "talisman", troll: true, noDrop: true,
        noDropMsg: "Как проверять укладку?!", cls: 1 },
      { n: "Розовый обруч с сердечками", d: 0, w: 0.1,
        slot: "talisman", troll: true, cls: 1 },
      { n: "Резиновая пищалка-курица", d: 0, w: 0.15,
        slot: "talisman", troll: true, cls: 1 }
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
      if (role === 'kachok') {
        return txt.replace(this.PRONOUNS, (m, sp, w) => sp + w.toUpperCase() + '! |KPAUSE|');
      }
      if (role === 'asiat') {
        const t = txt.replace(/,/g, ', эмм, ');
        return t.replace(/я/g, 'йа').replace(/Я/g, 'Йа')
                .replace(/ё/g, 'йо').replace(/Ё/g, 'Йо')
                .replace(/е/g, 'йэ').replace(/Е/g, 'Йэ');
      }
      if (role === 'tatan') return txt.replace(/е/g, 'ее').replace(/Е/g, 'Ее');
      if (role === 'strip') {
        const t = txt.replace(/\?/g, '!?').replace(/\./g, '!');
        return t.replace(/[а-яА-ЯёЁ]+/g, w => this.styleStripWord(w));
      }
      if (role === 'surgeon') return txt.replace(/ж/g, 'зь').replace(/ш/g, 'сь');
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
        this.log('❌ Личный талисман не надет.');
        return;
      }
      c.usedTalisman = true;
      const a = p.arch, en = c.enemies;
      if (a === 'tatan') {
        en.forEach(e => {
          e.noDodge = true;
          e.accMult = 0.5;
        });
        this.log('💃 Татань пляшет! Уклон 0.');
      } else if (a === 'asiat') {
        const w = en[en.length - 1];
        if (w) {
          w.stunTurns = 2;
          this.log('👟 Ботинки-нунчаки! Обморок.');
        }
      } else if (a === 'prof') {
        const cnt = Math.max(1, Math.floor(en.length / 2));
        for (let i = 0; i < cnt; i++) en[i].stunTurns = 2;
        for (let i = cnt; i < en.length; i++) {
          en[i].dmg = Math.floor(en[i].dmg / 2);
          en[i].def = Math.floor(en[i].def / 2);
        }
        this.log('🦄 Единорог соблазнил стаю!');
      } else if (a === 'alkash') {
        const rx = /пив|водк|спирт|виск|коньяк/i;
        const ai = p.inv.findIndex(x => rx.test(x.n));
        if (ai === -1) {
          c.usedTalisman = false;
          this.log('🍺 Нет алкоголя в рюкзаке!');
          return;
        }
        p.inv.splice(ai, 1);
        const half = Math.ceil(en.length / 2);
        en.forEach((e, i) => {
          if (i < half) e.dmg = Math.floor(e.dmg / 2);
          else e.accMult = 0.1;
        });
        this.log('💩 Залп слабительным! Слепота.');
      } else if (a === 'surgeon') {
        en.forEach(e => {
          e.accMult = 0.25;
          e.dmg = Math.floor(e.dmg * 0.25);
        });
        this.log('🔫 Брызгалка в глаза! Точность -75%.');
      } else if (a === 'nanny') {
        const cnt = Math.max(1, Math.floor(en.length / 2));
        for (let i = 0; i < cnt; i++) en[i].stunTurns = 2;
        this.log('🔔 Бубенчики усыпили стаю!');
      } else if (a === 'cashier') {
        c.infightTurns = 2;
        this.log('📟 Враги бьют друг друга 2 хода!');
      } else if (a === 'gigolo') {
        en.forEach(e => {
          e.accMult = 0;
          e.noDodge = true;
        });
        this.log('🪞 Солнечный зайчик ослепил всех!');
      } else if (a === 'schoolgirl') {
        c.radDodges = 3;
        en.forEach(e => e.def = Math.floor(e.def / 2));
        this.log('🎀 Обруч активен! Уклон от 3 атак.');
      } else if (a === 'vet') {
        c.chickenTurns = 2;
        this.log('🐔 Курица отвлекла стаю на 2 хода!');
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

      if (p.arch === 'vet' && p.lvl < 15 &&
          c.vetPrepTarget) {
        this.log('💉 Укол готов! Враг повержен.');
        c.enemies = c.enemies.filter(
          e => e !== c.vetPrepTarget
        );
        c.vetPrepTarget = null;
        if (!c.enemies.length) {
          s.zombies = s.zombies.filter(
            z => z.id !== c.zId
          );
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
          this.log('🚫 ОСЕЧКА! Нет патронов!');
          this.sayAs(p.arch, 'Нужны патроны!');
          return;
        }
      }

      const autoSk = ['cashier', 'alkash']
        .includes(p.arch);
      if (special && !c.usedSkill && !autoSk) {
        c.usedSkill = true;
        p.skillUnlocked = true;
        if (aObj.phrase) {
          this.log('🗣️ ' + aObj.phrase);
          this.sayAs(p.arch, aObj.phrase);
        }
        if (p.arch === 'tatan') {
          if (target.rank <= p.lvl) {
            target.hp = 0;
            this.log('💥 Пощёчина наповал!');
          } else {
            target.dmg = Math.floor(target.dmg / 2);
            target.def = Math.floor(target.def / 2);
            this.log('😱 Статы босса вдвое ниже!');
          }
        } else if (p.arch === 'kachok') {
          if (target.rank <= p.lvl + 1) {
            target.hp = 0;
            this.log('🥊 Двоечка наповал!');
          } else {
            target.stunTurns = 1;
            target.noDef = true;
            this.log('💫 Босс ошеломлён!');
          }
        } else if (p.arch === 'asiat') {
          const sq = s.players.filter(
            x => !x.dead && !x.escaped
          ).length;
          const ok = (sq === 1 && c.enemies.length >= 2) ||
            (sq > 1 && c.enemies.length >= sq * 2);
          if (ok) {
            c.asiatKite = 2;
            this.log('🤸 Враги 2 хода гоняются!');
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
          this.log('✨ Магний ослепил врагов!');
        } else if (p.arch === 'strip') {
          const d = Math.floor(p.stats.agi * 1.2);
          target.hp -= Math.max(5, d);
          target.stunTurns = 1;
          this.log('💃 Танец без контратаки!');
        } else if (p.arch === 'surgeon') {
          target.agi = 0;
          target.noDodge = true;
          this.log('🔪 Сухожилия вскрыты!');
        } else if (p.arch === 'nanny') {
          if (target.rank <= p.lvl + 1) {
            target.stunTurns = 1;
            target.def = Math.floor(target.def / 2);
            this.log('👉 Враг отправлен в угол!');
          }
        } else if (p.arch === 'gigolo') {
          const cnt = Math.max(
            1, Math.floor(c.enemies.length * 0.7)
          );
          for (let i = 0; i < cnt; i++) {
            const ed = c.enemies[i].dmg;
            c.enemies[i].dmg = Math.floor(ed / 2);
          }
          this.log('😏 Атака ' + cnt + ' врагов /2!');
        } else if (p.arch === 'schoolgirl') {
          c.enemies.forEach(e => {
            e.stunTurns = 99;
            e.halfDmgTaken = true;
          });
          this.log('📢 Враги в ступоре (урон /2)!');
        } else if (p.arch === 'vet') {
          if (target.hasWeapon) {
            target.hasWeapon = false;
            target.dmg = Math.floor(target.dmg / 2);
            this.log('🐾 Враг бросил оружие!');
          } else {
            const lim = Math.min(3, c.enemies.length);
            for (let i = 0; i < lim; i++) {
              const ed = c.enemies[i].dmg;
              c.enemies[i].dmg = Math.floor(ed / 2);
            }
            this.log('🐾 На 1 лапе! Атака 3 врагов /2.');
          }
             }
              } else {
        const d2 = Math.floor(Math.random() * 6) +
          Math.floor(Math.random() * 6) + 2;
        let wAtk = activeW ? ((activeW.a || 0) +
          (sl.mag ? sl.mag.a : 0) +
          (sl.mod ? sl.mod.a : 0)) : 0;
        const hasPan = p.arch === 'kachok' &&
          sl.talisman && sl.talisman.amuletActive &&
          !sl.main && !sl.side;
        if (hasPan) {
          const cls = activeW ? (activeW.cls || 1) : 0;
          const flat = new Array(0, 3, 6, 10, 15);
          wAtk += (cls >= 4 ? flat * 2 : flat[cls + 1]);
        }
        const strB = Math.floor(p.stats.str / 10);
        const sh = Math.max(
          0.1, 1 - Math.max(0, target.hitsTaken - 5) * 0.1
        );
        const ign = target.noDef ||
          (p.arch === 'schoolgirl' && p.lvl >= 15);
        const tDef = ign ? 0 : Math.floor(target.def * sh);
        let dmg = Math.max(1, (d2 + wAtk + strB) - tDef);
        if (p.arch === 'surgeon' && p.lvl >= 15 &&
            target.hp < target.maxHp * 0.5) {
          dmg *= 3;
        }
        if (target.halfDmgTaken) {
          dmg = Math.max(1, Math.floor(dmg / 2));
        }
        if (p.arch === 'vet' && p.lvl < 15 &&
            target.hp - dmg <= 0) {
          c.vetPrepTarget = target;
          this.log('👜 Ветеринар ищет шприц!');
          this.sayAs('vet', 'Подождите очереди!');
        } else {
          target.hp -= dmg;
          target.hitsTaken++;
          this.log('🔫 Удар (2D6=' + d2 + '): ' + dmg);
        }
      }

      if (c.asiatKite > 0) {
        c.asiatKite--;
        const hDmg = Math.max(
          1, Math.floor((6 + Math.floor(p.stats.str / 10)) / 2)
        );
        c.enemies.forEach(e => { e.hp -= hDmg; });
        this.log('🧱 Азиат кидает хлам! Всем по ' + hDmg);
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
          if (ot) {
            ot.hp -= e.dmg;
            this.log('🤪 Враги бьют друг друга!');
          }
          return;
        }
        if (e.blindChaos && Math.random() < 0.5) {
          const ri = Math.floor(Math.random() * c.enemies.length);
          c.enemies[ri].hp -= 5;
          this.log('🙈 Ослеплённый ударил своих на 5!');
          return;
        }
        if (c.radDodges > 0) {
          c.radDodges--;
          this.log('🎀 Обруч отбил удар!');
          return;
        }
        const dodge = p.stats.agi - (e.agi / 2);
        if (Math.random() * 100 < dodge) {
          this.log('💨 Уклонение от ' + e.name + '!');
          return;
        }
        const rawD = e.blindChaos ? 5 : e.dmg;
        const inc = Math.max(1, rawD - totDef);
        if (p.arch === 'cashier' && !c.usedSkill &&
            inc >= p.hp / 10) {
          c.usedSkill = true;
          p.skillUnlocked = true;
          this.log('🗣️ Галя, у нас отмена!');
          this.sayAs('cashier', 'гхаааляаа у нас ооотмеээнааа!!!');
          return;
        }
        if (p.arch === 'alkash' && !c.usedSkill &&
            inc >= p.maxHp * 0.1) {
          c.usedSkill = true;
          p.skillUnlocked = true;
          c.alkashDodgeTurn = true;
          this.log('🗣️ охтыжйоптвойууумааать!');
          this.sayAs('alkash', 'охтыжйоптвойууумааать!');
          this.log('☣️ [УЛЕЙ]: Пьяный кувырок увёл от всех атак!');
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
      const origEq = window.STIKS.equipFromInv.bind(window.STIKS);
      window.STIKS.equipFromInv = function(idx) {
        const s = this.db.session;
        const p = s.players[s.activeIdx];
        const it = p.inv[idx];
        const isSup = it && (it.cat === 'supply' || it.slot === 'use');
        if (isSup && p.arch === 'nanny') {
          if (it.hp) it.hp = Math.round(it.hp * 1.5);
          if (it.food) it.food = Math.round(it.food * 1.5);
          if (it.water) it.water = Math.round(it.water * 1.5);
          if (it.stamina) it.stamina = Math.round(it.stamina * 1.5);
          if (it.spore) it.spore = Math.round(it.spore * 1.5);
        }
        origEq(idx);
      };
      window.STIKS.resumeRaid = function() {
        if (this.db.session) this.renderGame();
      };
            window.STIKS.showProfile = function() {
        const s = this.db.session;
        const p = s.players[s.activeIdx];
        const a = window.STIKS_DB.ARCHETYPES[p.arch];
        alert(p.name + ' (Ур.' + p.lvl + ')\\nСл:' + p.stats.str +
          ' Лв:' + p.stats.agi + ' Ск:' + p.stats.spd +
          '\\nДар 15: ' + a.dar15);
      };
      window.STIKS.renderLobby = function() {
        const vp = document.getElementById('game-viewport');
        if (!vp) return;
        let h = '';
        if (this.db.session) {
          h += '<button class="btn btn-primary" ' +
            'style="width:100%;margin-bottom:8px" ' +
            'onclick="window.STIKS.resumeRaid()">' +
            '▶️ ПРОДОЛЖИТЬ РЕЙД</button>';
        }
        const fams = Object.keys(this.db.families || {});
        h += '<div style="color:#7fa88b;font-weight:bold;' +
          'margin-bottom:6px">ЛОББИ // 12 АРХЕТИПОВ</div>';
          
            h += '<div style="display:flex;gap:4px;margin-bottom:8px">' +
          '<input id="new-fam" placeholder="Фамилия..." ' +
          'style="flex:1;background:#050605;border:1px solid #2e3b33;' +
          'color:#c8d6cc;padding:6px">' +
          '<button class="btn btn-primary" style="flex:0" ' +
          'onclick="window.STIKS.addFamily()">+Клан</button></div>';
        h += '<div style="display:flex;flex-wrap:wrap;gap:4px;' +
          'margin-bottom:8px">' + fams.map(f =>
          '<button class="btn" style="flex:0" ' +
          'onclick="window.STIKS.selectFamily(\\'' + f + '\\')">' +
          f + '(' + this.db.families[f].length + ')</button>'
        ).join('') + '</div>';
        if (this.activeFamily) {
          const fam = this.activeFamily;
          const hs = this.db.families[fam] || [];
          const opts = Object.keys(window.STIKS_DB.ARCHETYPES).map(k =>
            '<option value="' + k + '">' +
            window.STIKS_DB.ARCHETYPES[k].name + '</option>'
          ).join('');
          h += '<div style="border:1px solid #2e3b33;padding:6px;' +
            'margin-bottom:8px"><div style="font-size:11px;' +
            'color:#9ec4a9;margin-bottom:4px">КЛАН: ' + fam + '</div>';
                      h += '<div style="display:flex;gap:4px;margin-bottom:6px">' +
            '<input id="hero-name" placeholder="Имя..." ' +
            'style="flex:1;background:#050605;border:1px solid #2e3b33;' +
            'color:#c8d6cc;padding:4px">' +
            '<select id="hero-arch" style="background:#050605;' +
            'border:1px solid #2e3b33;color:#c8d6cc;padding:4px">' +
            opts + '</select><button class="btn btn-primary" ' +
            'style="flex:0" onclick="window.STIKS.addHero()">+</button></div>';
          h += hs.map((x, i) =>
            '<div style="font-size:11px;display:flex;' +
            'justify-content:space-between;margin-bottom:4px">' +
            '<span>' + x.name + ' (' +
            window.STIKS_DB.ARCHETYPES[x.arch].name + ')</span>' +
            '<div><button class="btn btn-primary" style="padding:2px 6px" ' +
            'onclick="window.STIKS.toggleSquad(\\'' + fam + '\\',' + i + ')">' +
            'В отряд</button> <button class="btn btn-danger" ' +
            'style="padding:2px 6px" ' +
            'onclick="window.STIKS.delHero(\\'' + fam + '\\',' + i + ')">' +
            'Х</button></div></div>'
          ).join('') + '</div>';
        }
                const sqList = this.squad.map((x, i) =>
          x.name + ' <b style="color:#d68585" ' +
          'onclick="window.STIKS.removeSquad(' + i + ')">[x]</b>'
        ).join(', ');
        h += '<div style="border:1px solid #3d4f44;padding:6px">' +
          '<div style="font-size:11px;margin-bottom:4px">ОТРЯД (' +
          this.squad.length + '): ' + sqList + '</div>';
        if (this.squad.length) {
          const dOpts = Object.keys(window.STIKS_DB.DIFFS).map(d =>
            '<option value="' + d + '">' +
            window.STIKS_DB.DIFFS[d].name + '</option>'
          ).join('');
          h += '<div style="display:flex;gap:4px">' +
            '<select id="raid-diff" style="background:#050605;' +
            'border:1px solid #3d4f44;color:#c8d6cc;padding:4px">' +
            dOpts + '</select><button class="btn btn-primary" ' +
            'onclick="window.STIKS.launchMap(' +
            'document.getElementById(\\'raid-diff\\').value)">' +
            '🚀 СТАРТ (60x60)</button></div>';
        }
        h += '</div>';
        vp.innerHTML = h;
      };      window.STIKS.renderCombat = function() {
        const s = this.db.session;
        const c = s && s.combat;
        const p = s && s.players[s.activeIdx];
        const vp = document.getElementById('game-viewport');
        if (!c || !p || !vp) { this.renderGame(); return; }
        const a = window.STIKS_DB.ARCHETYPES[p.arch];
        const tal = p.slots && p.slots.talisman;
        let h = '<div style="color:#d68585;font-weight:bold;' +
          'margin-bottom:6px">⚔️ БОЙ // РАУНД ' + c.round + '</div>';
        h += '<div style="font-size:11px;margin-bottom:6px">' +
          p.name + ' (❤️' + p.hp + '/' + p.maxHp + ')</div>';
        h += c.enemies.map((e, i) =>
          '<div style="font-size:11px;color:#ffb3b3">' +
          (i === 0 ? '🎯 ' : '') + e.name + ' [Р.' + e.rank +
          '] ❤️' + e.hp + '/' + e.maxHp + '</div>'
        ).join('');
        h += '<div style="display:flex;flex-direction:column;' +
          'gap:5px;margin-top:8px">' +
          '<button class="btn btn-primary" ' +
          'onclick="window.STIKS.combatAttack(false)">' +
          '🔫 Атака (2D6)</button>';
                  if (!c.usedSkill) {
          h += '<button class="btn" style="border-color:#d6b85a;' +
            'color:#d6b85a" onclick="window.STIKS.combatAttack(true)">' +
            '⚡ ' + a.skill + '</button>';
        }
        if (!c.usedTalisman && tal && tal.amuletActive) {
          h += '<button class="btn" style="border-color:#9ec4a9;' +
            'color:#9ec4a9" onclick="window.STIKS.useShameTalisman()">' +
            '🍀 Талисман: ' + tal.n + '</button>';
        }
        h += '<button class="btn btn-danger" ' +
          'onclick="window.STIKS.combatFlee()">🏃 Побег</button></div>';
        vp.innerHTML = h;
      };
      window.STIKS.renderGame = function() {
        const s = this.db.session;
        if (!s) { this.renderLobby(); return; }
        if (s.combat) { this.renderCombat(); return; }
        const vp = document.getElementById('game-viewport');
        const p = s.players[s.activeIdx];
        const wt = this.calcWeight(p);
                let h = '<div style="display:flex;justify-content:space-between;' +
          'font-size:11px;color:#7fa88b;margin-bottom:6px">' +
          '<span>ХОД ' + s.turn + ' // ' + p.name + '</span>' +
          '<span>[' + (p.x + 1) + ':' + (p.y + 1) + '] ОХ:' +
          p.stepsLeft + '/' + p.maxAp + '</span>' +
          '<button class="btn" style="flex:0;padding:2px 5px" ' +
          'onclick="window.STIKS.renderLobby()">🏠</button></div>';
        if (this.invOpen) {
          h += '<div style="font-size:11px;margin-bottom:6px">' +
            'Вес: ' + wt.cur + '/' + wt.max + ' кг</div>';
          h += p.inv.map((it, i) =>
            '<div style="display:flex;justify-content:space-between;' +
            'font-size:11px;margin-bottom:3px"><span>' + it.n + '</span>' +
            '<div><button class="btn btn-primary" style="padding:2px 5px" ' +
            'onclick="window.STIKS.equipFromInv(' + i + ')">Исп/Над</button>' +
            ' <button class="btn btn-danger" style="padding:2px 5px" ' +
            'onclick="window.STIKS.dropItem(' + i + ')">Х</button></div></div>'
          ).join('');
          h += '<button class="btn btn-primary" ' +
            'style="width:100%;margin-top:6px" ' +
            'onclick="window.STIKS.toggleInv()">🗺️ Карта</button>';
          vp.innerHTML = h;
          return;
        }
                let h = '<div style="display:flex;justify-content:space-between;' +
          'font-size:11px;color:#7fa88b;margin-bottom:6px">' +
          '<span>ХОД ' + s.turn + ' // ' + p.name + '</span>' +
          '<span>[' + (p.x + 1) + ':' + (p.y + 1) + '] ОХ:' +
          p.stepsLeft + '/' + p.maxAp + '</span>' +
          '<button class="btn" style="flex:0;padding:2px 5px" ' +
          'onclick="window.STIKS.renderLobby()">🏠</button></div>';
        if (this.invOpen) {
          h += '<div style="font-size:11px;margin-bottom:6px">' +
            'Вес: ' + wt.cur + '/' + wt.max + ' кг</div>';
          h += p.inv.map((it, i) =>
            '<div style="display:flex;justify-content:space-between;' +
            'font-size:11px;margin-bottom:3px"><span>' + it.n + '</span>' +
            '<div><button class="btn btn-primary" style="padding:2px 5px" ' +
            'onclick="window.STIKS.equipFromInv(' + i + ')">Исп/Над</button>' +
            ' <button class="btn btn-danger" style="padding:2px 5px" ' +
            'onclick="window.STIKS.dropItem(' + i + ')">Х</button></div></div>'
          ).join('');
          h += '<button class="btn btn-primary" ' +
            'style="width:100%;margin-top:6px" ' +
            'onclick="window.STIKS.toggleInv()">🗺️ Карта</button>';
          vp.innerHTML = h;
          return;
        }
        const modes = [
          ['careful', 'Вним(3)'],
          ['fast', 'Быст(2)'],
          ['run', 'Бег(1)']
        ];
        h += '</div><div style="display:flex;gap:4px;' +
          'margin-bottom:6px">' + modes.map(([k, l]) =>
          '<button class="btn ' +
          (p.moveMode === k ? 'btn-primary' : '') +
          '" style="padding:5px;font-size:10px" ' +
          'onclick="window.STIKS.setMoveMode(\\'' + k + '\\')">' +
          l + '</button>'
        ).join('') + '</div>';
        h += '<div style="display:grid;grid-template-columns:' +
          '1fr 1fr 1fr;gap:4px;margin-bottom:6px"><div></div>' +
          '<button class="btn" ' +
          'onclick="window.STIKS.stepPlayer(0,-1)">▲</button>' +
          '<div></div><button class="btn" ' +
          'onclick="window.STIKS.stepPlayer(-1,0)">◄</button>' +
          '<button class="btn btn-primary" ' +
          'onclick="window.STIKS.searchCell(false)">🔍(3)</button>' +
          '<button class="btn" ' +
          'onclick="window.STIKS.stepPlayer(1,0)">►</button>' +
          '<div></div><button class="btn" ' +
          'onclick="window.STIKS.stepPlayer(0,1)">▼</button>' +
          '<div></div></div>';
        h += '<div style="display:flex;gap:4px">' +
          '<button class="btn btn-primary" style="font-size:10px" ' +
          'onclick="window.STIKS.toggleInv()">🎒(' +
          p.inv.length + ')</button>' +
          '<button class="btn" style="font-size:10px" ' +
          'onclick="window.STIKS.showProfile()">👤</button>' +
          '<button class="btn btn-primary" style="font-size:10px" ' +
          'onclick="window.STIKS.nextTurn()">⏭Ход</button></div>';
        vp.innerHTML = h;
      };
      window.STIKS.renderLobby();
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

      
