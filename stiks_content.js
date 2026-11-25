// ============================================================================
// S-T-I-K-S // ЕДИНАЯ БАЗА КОНТЕНТА, БАЛАНСА И МЕХАНИК (stiks_content.js v3.0)
// ============================================================================
(function(global) {
  'use strict';

  const CONTENT = global.STIKS_CONTENT = {
    version: '3.0.0-clean',

    BALANCE: {
      baseHp: 14,
      hpPerEnd: 1.35,
      kvazHpMult: 1.5,
      baseMana: 15,
      manaPerSpi: 2.2,
      kvazManaMult: 0.5,
      baseAp: 6,
      spdPerBonusAp: 50,
      armorFlatMult: 1.0,
      weaponDmgMult: 0.5,
      weaponRankBonusStep: 0.5,
      skillFlatScale: 1.0,
      virtRankMult: 0.5,
      enemyDmgMult: 0.85,
      minDamageTaken: 1,
      darIntBonusStep: 20,
      darIntBonusPct: 0.01
    },

    RANK_VALUES: { 1: 1, 2: 2, 3: 3, 4: 3.5, 5: 4 },

    Z_RANKS: Array.of(
      { r: 0, name: 'Ползун',     minLvl: 0,  maxLvl: 0,  hp: 10,  agi: 10,   dmg: 2,   img: 'img/Z_01.png', sound: 'Царап!', sfx: 'bite' },
      { r: 1, name: 'Медляк',     minLvl: 1,  maxLvl: 4,  hp: 36,  agi: 15,   dmg: 5,   img: 'img/Z_02.png', sound: 'Цап!',   sfx: 'bite' },
      { r: 2, name: 'Джампер',    minLvl: 5,  maxLvl: 10, hp: 76,  agi: 26,   dmg: 12,  img: 'img/Z_03.png', sound: 'Вжик!',  sfx: 'melee' },
      { r: 3, name: 'Бегун',      minLvl: 11, maxLvl: 20, hp: 140, agi: 52,   dmg: 24,  img: 'img/Z_04.png', sound: 'Кусь!',  sfx: 'bite' },
      { r: 4, name: 'Лотерейщик', minLvl: 21, maxLvl: 30, hp: 220, agi: 126,  dmg: 40,  img: 'img/Z_05.png', sound: 'Бум!',   sfx: 'gun' },
      { r: 5, name: 'Топтун',     minLvl: 31, maxLvl: 36, hp: 290, agi: 241,  dmg: 70,  img: 'img/Z_06.png', sound: 'БА-БАХ!',sfx: 'gun' },
      { r: 6, name: 'Кусач',      minLvl: 37, maxLvl: 40, hp: 330, agi: 358,  dmg: 116, img: 'img/Z_07.png', sound: 'ХРУСТЬ!',sfx: 'bite' },
      { r: 7, name: 'Рубер',      minLvl: 41, maxLvl: 49, hp: 380, agi: 596,  dmg: 184, img: 'img/Z_08.png', sound: 'РАЗРЫВ!',sfx: 'bite' },
      { r: 8, name: 'Элита',      minLvl: 50, maxLvl: 60, hp: 460, agi: 1468, dmg: 355, img: 'img/Z_09.png', sound: 'КРАШ!',  sfx: 'gun' },
      { r: 9, name: 'Суперэлита (Скреббер)', minLvl: 61, maxLvl: 70, hp: 600, agi: 2563, dmg: 554, img: 'img/Z_10.png', sound: 'АННИГИЛЯЦИЯ!', sfx: 'crit' }
    ),

    LVL_TABLE: Array.of(
      60,68,76,84,92,100,110,121,132,145,159,174,191,210,231,254,
      279,306,336,369,405,445,489,537,590,649,713,784,862,948,1042,
      1146,1260,1386,1524,1676,1843,2027,2229,2451,2696,2965,3261,3587,
      3945,4339,4772,5249,5773,6350,6985,7683,8451,9296,10225,11247,
      12371,13608,14968,16464,18276
    ),

    ARCHETYPES: {},
    ARCH_SKILLS: {},
    DARS: {},
    ITEMS: { weapons: [], meleeWeapons: [], armor: [], supply: [], shameAmulets: [], commonShame: [] },

    registerDar(id, def) {
      this.DARS[id] = Object.assign({ id, branches: [] }, def);
    },

    getEffectiveGearRank(rawRank) {
      const r = Math.max(1, Math.min(5, Math.round(Number(rawRank) || 1)));
      return this.RANK_VALUES[r] || r;
    },

    getVirtRank(rawRank) {
      return Number(((Number(rawRank) || 0) * (this.BALANCE.virtRankMult || 0.5)).toFixed(2));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 2: ИНТЕРПОЛЯЦИЯ, ФИКСАЦИЯ МАНЫ И СЛОТЫ ДАРОВ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.calcScale = function(lvl, v1, v30, cap) {
    const maxL = cap || 30;
    const c = Math.max(1, Math.min(maxL, Number(lvl) || 1));
    if (c === 1) return v1;
    return Number((v1 + (v30 - v1) * ((c - 1) / Math.max(1, maxL - 1))).toFixed(2));
  };

  C.interpNodes = function(lvl, pts) {
    if (!Array.isArray(pts) || !pts.length || !Array.isArray(pts.at(0))) return 10;
    const l = Math.max(1, Math.min(30, Number(lvl) || 1));
    if (l <= pts.at(0).at(0)) return Number(pts.at(0).at(1)) || 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts.at(i), p1 = pts.at(i + 1);
      if (!Array.isArray(p0) || !Array.isArray(p1)) continue;
      const x0 = p0.at(0), y0 = p0.at(1), x1 = p1.at(0), y1 = p1.at(1);
      if (l <= x1) return y0 + (y1 - y0) * ((l - x0) / Math.max(1, x1 - x0));
    }
    const last = pts.at(-1);
    return Array.isArray(last) ? (Number(last.at(1)) || 0) : 10;
  };

  C.getFixedManaCost = function(p, item, pctFallback) {
    if (item && typeof item.manaAnchor === 'number' && item.manaAnchor > 0) return item.manaAnchor;
    const maxM = Number((p && p.maxMana) || 50);
    const fixed = Math.max(1, Math.floor(maxM * ((pctFallback || 10) / 100)));
    if (item) item.manaAnchor = fixed;
    if (p && p.heroRef && p.heroRef.gifts && item && p.heroRef.gifts[item.darKey]) {
      const g = p.heroRef.gifts[item.darKey];
      if (item.branchId && g.branches && g.branches[item.branchId] && !g.branches[item.branchId].manaAnchor) {
        g.branches[item.branchId].manaAnchor = fixed;
      } else if (!item.branchId && !g.manaAnchor) {
        g.manaAnchor = fixed;
      }
    }
    return fixed;
  };

  C.getDarSlotKind = function(darKey, branchId) {
    const b = branchId || '';
    if (darKey === 'stone_skin') return 'def';
    if (darKey === 'healer' && b === 'b2') return 'def';
    if (darKey === 'stealth' && b === 'b2') return 'def';
    if (darKey === 'fire_master' && b === 'b1') return 'def';
    if (darKey === 'ice_master' && b === 'b1') return 'def';
    if (darKey === 'mentalist' && b === 'b2') return 'def';
    if (darKey === 'illusionist' && (b === 'b2' || b === 'b3')) return 'def';
    if (darKey === 'sense' && (b === 'b2' || b === 'b3')) return 'def';
    if (darKey === 'vaishnavism' && b === 'b3') return 'def';
    if (darKey === 'gigantism' && b === 'b3') return 'def';
    return 'atk';
  };

  C.hasOwnChargeLimit = function(darKey, branchId) {
    const b = branchId || '';
    if (darKey === 'fire_master' && !b) return true;
    if (darKey === 'ice_master' && !b) return true;
    if (darKey === 'mentalist' && b === 'b3') return true;
    if (darKey === 'illusionist' && (b === 'b2' || b === 'b3')) return true;
    if (darKey === 'gigantism' && b === 'b2') return true;
    if (darKey === 'tank' && !b) return true;
    return false;
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 3: ВСЕ 20 АРХЕТИПОВ И ЭВОЛЮЦИОННЫХ ФОРМ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  Object.assign(C.ARCHETYPES, {
    surgeon:       { name: 'Хирург', sex: 'm', img: 'img/surgeon.jpg', ico: '🔪', skill: 'Точный разрез', skillType: 'active', phrase: 'Скальпель, зажим... готово!', affinity: 'stone_skin', dar15: 'Каменная кожа', stats: { str: 8, agi: 14, spd: 9, end: 9, int: 14, spi: 6 }, mult: { str: 0.5, agi: 2, spd: 1, end: 1, int: 2.5, spi: 1 }, hint: 'Осматривает ладони, проверяя стерильность.' },
    asiat:         { name: 'Подозрительно знакомый азиат', sex: 'm', img: 'img/asiat.jpeg', ico: '🥋', skill: 'Акробатический уход', skillType: 'active', phrase: 'Йа сейчас кое-что учужу!', affinity: 'healer', dar15: 'Знахарь', stats: { str: 8, agi: 18, spd: 12, end: 10, int: 6, spi: 6 }, mult: { str: 1, agi: 3, spd: 1, end: 1, int: 0.5, spi: 0.5 }, hint: 'Пружинит на носках, оценивая высоту препятствий.' },
    schoolgirl:    { name: 'Школьница', sex: 'f', img: 'img/scoolgerl.jpg', ico: '📢', skill: 'Крик ультразвука', skillType: 'active', phrase: 'АААААА! НЕ ПОДХОДИ!', affinity: 'clockstopper', dar15: 'Клокстопер', stats: { str: 6, agi: 14, spd: 15, end: 7, int: 10, spi: 8 }, mult: { str: 0.5, agi: 2, spd: 2.5, end: 0.5, int: 1.5, spi: 1.5 }, hint: 'Нервно поправляет лямку рюкзака.' },
    nanny:         { name: 'Воспитательница', sex: 'f', img: 'img/vospit.jpg', ico: '☝️', skill: 'Строгий выговор', skillType: 'active', phrase: 'А НУ-КА ПРЕКРАТИЛИ БЕЗОБРАЗИЕ!', affinity: 'stealth', dar15: 'Скрыт', stats: { str: 7, agi: 10, spd: 10, end: 11, int: 11, spi: 11 }, mult: { str: 0.5, agi: 1, spd: 1, end: 1.5, int: 1.5, spi: 2.5 }, hint: 'Окидывает окрестности строгим взглядом.' },
    alkash:        { name: 'Алкаш', sex: 'm', img: 'img/alkash.jpg', ico: '🍾', skill: 'Пьяный кулак', skillType: 'trigger', phrase: 'ИК! СЕЙЧАС ПОКАЖУ МАСТЕР-КЛАСС!', affinity: 'fire_master', dar15: 'Мастер огня', stats: { str: 10, agi: 7, spd: 8, end: 16, int: 5, spi: 14 }, mult: { str: 1.5, agi: 0.5, spd: 0.5, end: 2.5, int: 0.5, spi: 1.5 }, hint: 'Принюхивается к воздуху и хлопает по карманам.' },
    cashier:       { name: 'Кассирша', sex: 'f', img: 'img/cashier.jpg', ico: '🧾', skill: 'Галя, у нас отмена!', skillType: 'trigger', phrase: 'ГАЛЯ, У НАС ОТМЕНА!', affinity: 'sonic', dar15: 'Соник', stats: { str: 8, agi: 11, spd: 11, end: 11, int: 10, spi: 9 }, mult: { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 1.5, spi: 1.5 }, hint: 'С ледяным спокойствием смотрит в пустоту.' },
    gigolo:        { name: 'Жиголо', sex: 'm', img: 'img/gigalo.jpg', ico: '🌹', skill: 'Обезоруживающий шарм', skillType: 'active', phrase: 'Не стоит так нервничать, крошка!', affinity: 'mentalist', dar15: 'Менталист', stats: { str: 9, agi: 12, spd: 12, end: 9, int: 9, spi: 9 }, mult: { str: 1, agi: 2, spd: 2, end: 1, int: 1.5, spi: 2 }, hint: 'Поправляет воротник и криво усмехается.' },
    tatan:         { name: 'Татань', sex: 'f', img: 'img/tatan.jpg', ico: '🫰', skill: 'По щелчку в три пятнадцать', skillType: 'active', phrase: 'ПО ЩЕЛЧКУ В ТРИ ПЯТНАДЦАТЬ! ВСЕМ СТОЯТЬ!', affinity: 'nymph', dar15: 'Нимфа', stats: { str: 15, agi: 6, spd: 7, end: 14, int: 10, spi: 8 }, mult: { str: 3, agi: 0.5, spd: 0.5, end: 2, int: 1, spi: 1 }, hint: 'Дергает себя за волосы и рычит от злости.' },
    prof:          { name: 'Профессор', sex: 'm', img: 'img/prof.jpg', ico: '🪄', skill: 'Магнификус мэджик', skillType: 'active', phrase: 'looks like magnificus magic', affinity: 'gigolo_gift', dar15: 'Жиголо', stats: { str: 6, agi: 8, spd: 8, end: 6, int: 20, spi: 12 }, mult: { str: 0.5, agi: 0.5, spd: 0.5, end: 0.5, int: 3, spi: 2 }, hint: 'Протирает несуществующие очки и бормочет формулы.' },
    psih:          { name: 'Военный психолог', sex: 'both', img: 'img/Psihm.jpg', imgM: 'img/Psihm.jpg', imgF: 'img/Psihf.jpeg', ico: '🧠', skill: 'Холодный анализ', skillType: 'active', phrase: 'Психологический профиль цели вскрыт!', affinity: 'illusionist', dar15: 'Иллюзионист', stats: { str: 8, agi: 10, spd: 10, end: 10, int: 11, spi: 11 }, mult: { str: 0.8, agi: 1.2, spd: 1.2, end: 1.2, int: 2, spi: 2.5 }, hint: 'Выравнивает дыхание и сканирует сектор.' },
    strip:         { name: 'Стриптизёрша', sex: 'f', img: 'img/strip.jpg', ico: '💃', skill: 'Ослепляющий пируэт', skillType: 'active', phrase: 'СМОТРИ СЮДА, КРАСАВЧИК!', affinity: 'tank', dar15: 'Танк', stats: { str: 7, agi: 19, spd: 16, end: 8, int: 5, spi: 5 }, mult: { str: 0.5, agi: 2.5, spd: 2.5, end: 1, int: 1, spi: 1 }, hint: 'Делает плавную растяжку и хищно прищуривается.' },
    vet:           { name: 'Ветеринар', sex: 'f', img: 'img/vetgirl.jpg', ico: '💉', skill: 'Успокаивающий укол', skillType: 'active', phrase: 'А ну-ка дай лапу!', affinity: 'sense', dar15: 'Сенс', stats: { str: 7, agi: 11, spd: 11, end: 10, int: 12, spi: 9 }, mult: { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 2.5, spi: 1.5 }, hint: 'Прислушивается к рыку тварей Улья.' },
    kachok:        { name: 'Качок', sex: 'm', img: 'img/kachok.jpeg', ico: '💪', skill: 'Прямиком в ад', skillType: 'active', phrase: 'ПРЯМИКОМ В АД! ННАХХ!!!', affinity: 'ice_master', dar15: 'Мастер льда', stats: { str: 22, agi: 9, spd: 5, end: 18, int: 1, spi: 5 }, mult: { str: 3, agi: 1, spd: 0.5, end: 3, int: 0.2, spi: 1 }, hint: 'Сжимает кулаки и хрустит костяшками.' },
    infected:      { name: 'Особый заражённый', sex: 'm', img: 'img/infected.jpg', ico: '☣️', skill: 'Подчинение', skillType: 'active', phrase: 'КРРРРОВЬ И ПЛОТЬ!', affinity: 'vaishnavism', dar15: 'Дары Улья', stats: { str: 14, agi: 14, spd: 14, end: 14, int: 2, spi: 2 }, mult: { str: 2, agi: 2, spd: 2, end: 2, int: 0.5, spi: 1 }, hint: 'С глухим рыком чует живую плоть.' },
    kvaz:          { name: 'Кваз (мутант Улья)', sex: 'both', img: 'img/Kvazm.jpg', imgM: 'img/Kvazm.jpg', imgF: 'img/Kvazf.jpg', ico: '👹', skill: 'Рёв Кваза', skillType: 'active', phrase: 'РРРРААААГХ! РАЗОРВУ!', stats: { str: 26, agi: 22, spd: 20, end: 26, int: 12, spi: 14 }, mult: { str: 2.5, agi: 2.5, spd: 2.5, end: 2.5, int: 1.5, spi: 1.5 }, hint: 'Тяжело дышит и сжимает мускулистые лапы.' },
    legend_m:      { name: '👑 Легендарный Воин Улья', sex: 'm', img: 'img/LM_battle.png', ico: '⚡', skill: 'Ужас Улья', skillType: 'active', phrase: 'Вот он — реальный ужас Улья!', stats: { str: 65, agi: 60, spd: 55, end: 65, int: 50, spi: 55 }, mult: { str: 2.5, agi: 2.5, spd: 2.5, end: 2.5, int: 2.0, spi: 2.0 } },
    legend_f:      { name: '👑 Легендарная Воительница Улья', sex: 'f', img: 'img/LG_battle.png', ico: '🔥', skill: 'Ужас Улья', skillType: 'active', phrase: 'Вот он — реальный ужас Улья!', stats: { str: 58, agi: 68, spd: 62, end: 58, int: 55, spi: 60 }, mult: { str: 2.5, agi: 2.5, spd: 2.5, end: 2.5, int: 2.0, spi: 2.0 } },
    legend_kvaz_m: { name: '👑 Легендарный Кваз', sex: 'm', img: 'img/Legen_kvazM.jpg', ico: '👹', skill: 'Рёв Легендарного Кваза', skillType: 'active', phrase: 'ЭТО МОЙ ТРОФЕЙНЫЙ РАЗМЕРЧИК! РРРАААГХ!', stats: { str: 68, agi: 56, spd: 52, end: 68, int: 42, spi: 48 }, mult: { str: 2.8, agi: 2.2, spd: 2.2, end: 2.8, int: 1.5, spi: 1.5 }, hint: 'Гора мускулов и шрамов в трофейных кружевных труселях.' },
    legend_kvaz_f: { name: '👑 Легендарная Квазиха', sex: 'f', img: 'img/Legen_kvazF.jpg', ico: '🔥', skill: 'Коготь Матриарха Квазов', skillType: 'active', phrase: 'СМОТРИ, ЧТО Я НАШЛА НА ПРОШЛОМ РЕЙДЕ!', stats: { str: 62, agi: 64, spd: 60, end: 62, int: 48, spi: 52 }, mult: { str: 2.5, agi: 2.6, spd: 2.5, end: 2.5, int: 1.8, spi: 1.8 }, hint: 'Хитиновая бестия с улыбкой на 42 клыка.' },
    legend_z:      { name: '☣️ Легендарный Заражённый', sex: 'm', img: 'img/Legen_Z.jpg', ico: '🐉', skill: 'Взгляд Вершины Улья', skillType: 'active', phrase: 'Я И ЕСТЬ САМ УЛЕЙ!', stats: { str: 64, agi: 66, spd: 64, end: 64, int: 54, spi: 60 }, mult: { str: 2.6, agi: 2.6, spd: 2.6, end: 2.6, int: 2.2, spi: 2.4 }, hint: 'Серебристая драконья чешуя и разряды статики.' }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 4: УНИКАЛЬНЫЕ БОЕВЫЕ НАВЫКИ ВСЕХ 20 АРХЕТИПОВ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.ARCH_SKILLS.surgeon = function(ctx) {
    const trg = ctx.alive.at(0);
    if (!trg) return;
    const dmg = Math.max(8, Math.round(ctx.flatAtk * 3.0));
    ctx.dealDamage(trg, dmg, `🔪 РАЗРЕЗ -${dmg}`);
    const diff = (trg.rank || 0) - (ctx.p.rank || 0);
    const ch = diff <= 0 ? 1.0 : Math.max(0, 1.0 - diff * 0.25);
    if (!trg.dead && Math.random() < ch) {
      trg.concussion = { rounds: 99, missChance: 0.90 };
      trg.dmg = Math.max(1, Math.round((trg.dmg || 4) * 0.10));
      trg.debuff = 99;
      ctx.popEnemy(trg, '🩸 -90% МЕТК./УРОН');
      ctx.log(`🔪 <b>[Точный разрез]</b>: -${dmg} по <b>${trg.name}</b>! Сухожилия перерезаны (-90% меткости и урона до конца боя)!`);
    } else {
      ctx.log(`🔪 <b>[Точный разрез]</b>: 300% удар (-${dmg}) по <b>${trg.name}</b>!`);
    }
  };

  C.ARCH_SKILLS.asiat = function(ctx) {
    const curses = Array.of('Чжао-мао-пинь!', 'Тай-хуа-чунь!', 'Лао-вай-бань!', 'Сяо-лун-бао-на!', 'Фу-юань-шань!');
    ctx.p.asiatEvadeRounds = 2;
    ctx.alive.forEach((en, i) => {
      en.dist = (en.dist || 0) + 2;
      const dmg = Math.max(2, Math.round(ctx.flatAtk * 0.50));
      ctx.dealDamage(en, dmg, `🥋 ${curses.at(i % curses.length)} -${dmg}`);
    });
    ctx.log(`🥋 <b>[Акробатический уход]</b>: «${curses.at(0)}» — отскок (+2 дист. на 2 хода) и залп предметами (50%) по всем врагам!`);
  };

  C.ARCH_SKILLS.schoolgirl = function(ctx) {
    ctx.alive.forEach(en => {
      if ((en.rank || 0) <= (ctx.p.rank || 0)) {
        en.stun = Math.max(en.stun || 0, 2);
        ctx.popEnemy(en, '📢 СТАН (2р)');
      } else {
        en.concussion = { rounds: 2, missChance: 0.50 };
        en.debuff = Math.max(en.debuff || 0, 2);
        ctx.popEnemy(en, '📢 КОНТУЗИЯ (-50%)');
      }
    });
    ctx.log('📢 <b>[Крик ультразвука]</b>: «АААААА! НЕ ПОДХОДИ!» — все враги оглушены или контужены!');
  };

  C.ARCH_SKILLS.nanny = function(ctx) {
    const trg = ctx.strongest;
    if (!trg) return;
    const diff = (trg.rank || 0) - (ctx.p.rank || 0);
    const ch = diff <= 1 ? 1.0 : Math.max(0, 1.0 - (diff - 1) * 0.25);
    if (Math.random() < ch) {
      trg.stun = Math.max(trg.stun || 0, 2);
      ctx.popEnemy(trg, '☝️ В УГЛУ (2р)');
      ctx.log(`☝️ <b>[Строгий выговор]</b>: «Какой плохой <b>${trg.name}</b>! Ай-яй-яй! А ну марш в угол на 2 хода!»`);
    } else {
      ctx.popEnemy(trg, '😒 Не послушался');
      ctx.log(`☝️ <b>[Строгий выговор]</b> (${Math.round(ch * 100)}%): <b>${trg.name}</b> проигнорировал замечание!`);
    }
  };

  C.ARCH_SKILLS.gigolo = function(ctx) {
    const trg = ctx.alive.at(0);
    if (!trg) return;
    const diff = (trg.rank || 0) - (ctx.p.rank || 0);
    const ch = diff <= 1 ? 1.0 : Math.max(0, 1.0 - (diff - 1) * 0.25);
    if (Math.random() < ch) {
      for (let k = 0; k < 2; k++) {
        const other = ctx.alive.find(e => !e.dead && e.id !== trg.id) || trg;
        const hit = Math.max(3, Math.round(trg.dmg || 8));
        ctx.dealDamage(other, hit, `🌹 Удар по своим -${hit}`);
      }
      ctx.log(`🌹 <b>[Обезоруживающий шарм]</b>: <b>${trg.name}</b> дважды атаковал своих!`);
    } else {
      trg.debuff = Math.max(trg.debuff || 0, 2);
      ctx.popEnemy(trg, '🌹 ДЕБАФ -30%');
      ctx.log(`🌹 <b>[Обезоруживающий шарм]</b>: <b>${trg.name}</b> смутился и получил дебаф на 2 хода!`);
    }
  };

  C.ARCH_SKILLS.tatan = function(ctx) {
    const trg = ctx.alive.at(0);
    if (!trg) return;
    const diff = (trg.rank || 0) - (ctx.p.rank || 0);
    if (diff <= 0) {
      ctx.dealDamage(trg, Math.max(trg.hp || 10, 9999999), '🫰 ПОЩЁЧИНА НАПОВАЛ!');
      ctx.log(`🫰 <b>[По щелчку в три пятнадцать]</b>: сокрушительная пощёчина убила <b>${trg.name}</b> наповал!`);
    } else {
      const cutPct = diff === 1 ? 0.75 : (diff === 2 ? 0.50 : 0.25);
      const dmg = Math.max(5, Math.round((trg.maxHp || trg.hp || 20) * cutPct));
      ctx.dealDamage(trg, dmg, `🫰 -${Math.round(cutPct * 100)}% ОЗ (-${dmg})`);
      ctx.log(`🫰 <b>[По щелчку в три пятнадцать]</b>: пощёчина снесла <b>${Math.round(cutPct * 100)}% ОЗ (-${dmg})</b> у <b>${trg.name}</b>!`);
    }
  };

  C.ARCH_SKILLS.prof = function(ctx) {
    ctx.alive.forEach(en => {
      const diff = (en.rank || 0) - (ctx.p.rank || 0);
      if (diff <= 0) {
        en.fullBlindRounds = 2;
        en.concussion = { rounds: 2, missChance: 0.50 };
        ctx.popEnemy(en, '🪄 ПОЛНАЯ СЛЕПОТА (2р)');
      } else {
        const ch = Math.max(0, 1.0 - diff * 0.25);
        if (Math.random() < ch) {
          en.concussion = { rounds: 2, missChance: 0.40 };
          ctx.popEnemy(en, '🪄 ДЕБАФ МЕТКОСТИ');
        }
      }
    });
    ctx.log('🪄 <b>[Магнификус мэджик]</b>: «looks like magnificus magic!» — вспышка ослепила врагов!');
  };

  C.ARCH_SKILLS.psih = function(ctx) {
    const trg = ctx.strongest;
    if (!trg) return;
    const diff = (trg.rank || 0) - (ctx.p.rank || 0);
    const ch = diff <= 1 ? 1.0 : Math.max(0, 1.0 - (diff - 1) * 0.25);
    if (Math.random() < ch) {
      trg.dead = true;
      trg.fled = true;
      ctx.popEnemy(trg, '🏃 СБЕЖАЛ В УЖАСЕ!');
      ctx.log(`🧠 <b>[Холодный анализ]</b>: «Расскажи, где тётя трогала!!!» — <b>${trg.name}</b> сбежал с поля боя!`);
    } else {
      trg.stun = Math.max(trg.stun || 0, 2);
      ctx.popEnemy(trg, '😱 ШОК: СТАН (2р)');
      ctx.log(`🧠 <b>[Холодный анализ]</b>: <b>${trg.name}</b> не убежал, но впал в шок на 2 хода!`);
    }
  };

  C.ARCH_SKILLS.strip = function(ctx) {
    ctx.p.shieldHits = (ctx.p.shieldHits || 0) + 1;
    ctx.p.buff = Math.max(ctx.p.buff || 1, 1.40);
    ctx.alive.forEach(en => { en.concussion = { rounds: 2, missChance: 0.50 }; });
    ctx.popPlayer('💃 Пируэт (+1 укл. / ×1.4)');
    ctx.log('💃 <b>[Ослепляющий пируэт]</b>: враги потеряли прицел (-50% меткости на 2р)!');
  };

  C.ARCH_SKILLS.vet = function(ctx) {
    let affected = 0;
    ctx.alive.forEach(en => {
      const diff = (en.rank || 0) - (ctx.p.rank || 0);
      const turns = Math.max(0, 2 - (diff - 1));
      if (turns > 0) {
        en.stun = Math.max(en.stun || 0, turns);
        affected++;
        ctx.popEnemy(en, `💉 ДАЙ ЛАПУ! (${turns}р)`);
      } else {
        ctx.popEnemy(en, '💉 Не проняло');
      }
    });
    ctx.log(`💉 <b>[Успокаивающий укол]</b>: «А ну-ка дай лапу!» — утихомирено целей: <b>${affected}</b>!`);
  };

  C.ARCH_SKILLS.kachok = function(ctx) {
    const trg = ctx.strongest;
    if (!trg) return;
    if (trg.isPlayerPvp) {
      const dmg = Math.max(10, Math.round(ctx.flatAtk * 3.0));
      ctx.dealDamage(trg, dmg, `💪 В АД -${dmg}`);
      ctx.log(`💪 <b>[Прямиком в ад]</b> (PvP): сокрушительный удар 300% (-${dmg}) по <b>${trg.name}</b>!`);
      return;
    }
    const diff = (trg.rank || 0) - (ctx.p.rank || 0);
    const ch = Math.max(0, Math.min(1.0, 0.50 - (diff - 1) * 0.25));
    if (Math.random() < ch) {
      ctx.dealDamage(trg, Math.max(trg.hp || 10, 9999999), '💪 ПРЯМИКОМ В АД! 💀');
      ctx.log(`💪 <b>[Прямиком в ад]</b> (${Math.round(ch * 100)}%): <b>${trg.name}</b> отправлен на тот свет с одного удара!`);
    } else {
      const dmg = Math.max(6, Math.round(ctx.flatAtk * 1.5));
      ctx.dealDamage(trg, dmg, `💪 Удар -${dmg}`);
      ctx.log(`💪 <b>[Прямиком в ад]</b> (${Math.round(ch * 100)}%): ваншот сорвался, нанесено -${dmg} урона!`);
    }
  };

  C.ARCH_SKILLS.infected = function(ctx) {
    const trg = ctx.alive.at(Math.floor(Math.random() * ctx.alive.length));
    if (!trg) return;
    if (trg.isPlayerPvp) {
      const dmg = Math.max(8, Math.round(ctx.flatAtk * 2.0));
      const bleed = Math.max(2, Math.round(dmg * 0.25));
      ctx.dealDamage(trg, dmg, `☣️ РАЗРЫВ -${dmg}`);
      trg.bleed = { rounds: 2, dmg: bleed };
      ctx.log(`☣️ <b>[Ярость Улья]</b> (PvP): 200% урона (-${dmg}) + кровоток (${bleed}/ход на 2 хода)!`);
      return;
    }
    const diff = (trg.rank || 0) - (ctx.p.rank || 0);
    const ch = Math.max(0.05, Math.min(0.95, 0.50 - diff * 0.25));
    if (Math.random() < ch) {
      trg.charmedAlly = true;
      trg.hivePackTamed = true;
      ctx.popEnemy(trg, '☣️ ПОДЧИНЁН В СТАЮ!');
      ctx.log(`☣️ <b>[Подчинение]</b> (${Math.round(ch * 100)}%): <b>${trg.name}</b> подчинён до конца рейда!`);
    } else {
      ctx.popEnemy(trg, '😒 Сопротивление');
      ctx.log(`☣️ <b>[Подчинение]</b> (${Math.round(ch * 100)}%): <b>${trg.name}</b> не подчинился.`);
    }
  };

  C.ARCH_SKILLS.kvaz = C.ARCH_SKILLS.legend_m = C.ARCH_SKILLS.legend_f = C.ARCH_SKILLS.legend_kvaz_m = C.ARCH_SKILLS.legend_kvaz_f = C.ARCH_SKILLS.legend_z = function(ctx) {
    ctx.alive.forEach(en => {
      if ((en.rank || 0) < (ctx.p.rank || 0)) {
        en.stun = Math.max(en.stun || 0, 2);
        ctx.popEnemy(en, '👹 УЖАС (2р)');
      } else {
        en.debuff = Math.max(en.debuff || 0, 2);
        ctx.popEnemy(en, '⬇️ -30%');
      }
    });
    ctx.log(`👹 <b>[${ctx.p.skill}]</b>: подавляющий рёв парализовал противников!`);
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 5: ДАРЫ 1–2 (КАМЕННАЯ КОЖА И ЗНАХАРЬ)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('stone_skin', {
    pool: 'human', name: 'Каменная кожа', type: 'passive', mana1: 0, mana30: 0,
    cfg: {
      rankBase: 1.0, rankPerLvl: 0.1,
      invulnHits: Array.of(Array.of(1, 1), Array.of(5, 2), Array.of(10, 3), Array.of(20, 5), Array.of(30, 7)),
      invulnMana: Array.of(Array.of(1, 50), Array.of(5, 40), Array.of(10, 30), Array.of(20, 18), Array.of(30, 10)),
      squadAllies: Array.of(Array.of(1, 2), Array.of(5, 3), Array.of(10, 4), Array.of(20, 6), Array.of(30, 99)),
      squadManaHit: Array.of(Array.of(1, 60), Array.of(5, 48), Array.of(10, 35), Array.of(20, 20), Array.of(30, 10)),
      thornsPct: Array.of(Array.of(1, 2.0), Array.of(10, 2.5), Array.of(30, 3.5)),
      thornsMana: Array.of(Array.of(1, 50), Array.of(10, 30), Array.of(30, 10))
    },
    desc: 'База (пассив): +1.0 -> +3.9 к рангу брони (+0.1/ур.). Ветки: Временная неуязвимость, Отрядный щит, Колючая стена.',
    branches: Array.of(
      { id: 'b1', name: 'Временная неуязвимость', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Игнорирует 1 -> 7 входящих ударов.' },
      { id: 'b2', name: 'Отрядный щит', type: 'active', mode: 'battle', mana1: 60, mana30: 10, desc: 'Поглощает урон по отряду: 2 -> 6 -> весь отряд (60% -> 10% фикс. маны за удар).' },
      { id: 'b3', name: 'Колючая стена', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Входящий урон 10%, возврат 200% -> 350% в ближнем бою (3 удара).' }
    ),
    getPassiveRankBonus(lvl) {
      return Number((this.cfg.rankBase + (Math.max(1, Number(lvl) || 1) - 1) * this.cfg.rankPerLvl).toFixed(1));
    },
    getManaPct(branchId, lvl) {
      if (branchId === 'b1') return Math.round(C.interpNodes(lvl, this.cfg.invulnMana));
      if (branchId === 'b2') return Math.round(C.interpNodes(lvl, this.cfg.squadManaHit));
      if (branchId === 'b3') return Math.round(C.interpNodes(lvl, this.cfg.thornsMana));
      return 0;
    },
    execute(ctx) {
      if (ctx.branchId === 'b1') {
        const hits = Math.round(C.interpNodes(ctx.lvl, this.cfg.invulnHits));
        ctx.p.shieldHits = (ctx.p.shieldHits || 0) + hits;
        ctx.popPlayer(`🛡 Неуязвимость (${hits} уд.)`);
        ctx.log(`🛡 <b>[Временная неуязвимость]</b>: панцирь поглотит <b>${hits}</b> входящих ударов!`);
      } else if (ctx.branchId === 'b2') {
        const allies = Math.round(C.interpNodes(ctx.lvl, this.cfg.squadAllies));
        const fixedPerHit = C.getFixedManaCost(ctx.p, ctx.item, this.getManaPct('b2', ctx.lvl));
        ctx.p.squadShield = { maxAllies: allies, fixedManaPerHit: fixedPerHit, active: true };
        ctx.popPlayer(`🔰 Отрядный щит (${fixedPerHit} м./уд.)`);
        ctx.log(`🔰 <b>[Отрядный щит]</b>: защита накрыла до <b>${allies >= 99 ? 'всего отряда' : allies + ' бойцов'}</b> (расход фикс. <b>${fixedPerHit} маны</b> за удар)!`);
      } else if (ctx.branchId === 'b3') {
        const mult = Number(C.interpNodes(ctx.lvl, this.cfg.thornsPct).toFixed(2));
        ctx.p.thornsWall = { mult, hitsLeft: 3 };
        ctx.popPlayer(`🌵 Колючая стена (${Math.round(mult * 100)}%)`);
        ctx.log(`🌵 <b>[Колючая стена]</b>: герой получает <b>10%</b> входящего урона и возвращает <b>${Math.round(mult * 100)}%</b> в ближнем бою (3 удара)!`);
      }
    }
  });

  C.registerDar('healer', {
    pool: 'human', name: 'Знахарь', type: 'active', mode: 'map', mana1: 40, mana30: 10,
    cfg: {
      healPct: Array.of(Array.of(1, 0.25), Array.of(10, 0.50), Array.of(30, 1.0)),
      healMana: Array.of(Array.of(1, 40), Array.of(10, 24), Array.of(30, 10)),
      maxHealsPerRaid: 5,
      empMana: Array.of(Array.of(1, 100), Array.of(10, 50), Array.of(30, 10)),
      suppPct: Array.of(Array.of(1, 0.10), Array.of(10, 0.22), Array.of(30, 0.50)),
      suppMana: Array.of(Array.of(1, 10), Array.of(10, 6), Array.of(30, 2)),
      petRankPlus: Array.of(Array.of(1, 1), Array.of(15, 2), Array.of(30, 3)),
      petCalmRounds: Array.of(Array.of(1, 2), Array.of(15, 4), Array.of(30, 6)),
      petMana: Array.of(Array.of(1, 40), Array.of(30, 10))
    },
    desc: 'База (вне боя, до 5/рейд): лечит себя и союзников на 25% -> 100% ОЗ. Ветки: Мастер усиления, Ветка поддержки, Ветка любимчика.',
    branches: Array.of(
      { id: 'b1', name: 'Мастер усиления', type: 'active', mode: 'map', mana1: 100, mana30: 10, desc: 'Повышает любой открытый Дар/ветку на +1 ур.: 1/рейд на себя + 1/рейд на союзника.' },
      { id: 'b2', name: 'Ветка поддержки', type: 'active', mode: 'battle', mana1: 10, mana30: 2, desc: 'Аура боя: ±10% -> ±50% к урону отряда и защите (10% -> 2% фикс. маны/раунд).' },
      { id: 'b3', name: 'Ветка любимчика', type: 'active', mode: 'battle', mana1: 40, mana30: 10, desc: 'Укрощает заражённых до +1..+3 ранга на 2..6 раундов (Элита+ — Успокоить на 3р).' }
    ),
    getManaPct(branchId, lvl) {
      if (!branchId) return Math.round(C.interpNodes(lvl, this.cfg.healMana));
      if (branchId === 'b1') return Math.round(C.interpNodes(lvl, this.cfg.empMana));
      if (branchId === 'b2') return Math.round(C.interpNodes(lvl, this.cfg.suppMana));
      if (branchId === 'b3') return Math.round(C.interpNodes(lvl, this.cfg.petMana));
      return 10;
    },
    execute(ctx) {
      if (!ctx.branchId || ctx.branchId === 'b1') {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log(`⚠️ <b>[${ctx.title}]</b> применяется строго <b>ВНЕ БОЯ</b> (на карте рейда или в Поселении)!`);
        return;
      }
      if (ctx.branchId === 'b2') {
        const pct = Number(C.interpNodes(ctx.lvl, this.cfg.suppPct).toFixed(2));
        const tickMana = C.getFixedManaCost(ctx.p, ctx.item, this.getManaPct('b2', ctx.lvl));
        const wasOn = Boolean(ctx.p.supportAura && ctx.p.supportAura.active);
        ctx.p.supportAura = { active: !wasOn, pct, tickMana };
        if (!wasOn) {
          ctx.popPlayer(`💚 Аура ±${Math.round(pct * 100)}%`);
          ctx.log(`🌿 <b>[Ветка поддержки]</b> включена: урон отряда <b>+${Math.round(pct * 100)}%</b>, входящий урон <b>-${Math.round(pct * 100)}%</b> (фикс. ${tickMana} маны/раунд)!`);
        } else {
          ctx.popPlayer('🌿 Аура выкл.');
          ctx.log('🌿 <b>[Ветка поддержки]</b> отключена.');
        }
        return;
      }
      if (ctx.branchId === 'b3') {
        const plusR = Math.round(C.interpNodes(ctx.lvl, this.cfg.petRankPlus));
        const calmR = Math.round(C.interpNodes(ctx.lvl, this.cfg.petCalmRounds));
        const trg = ctx.alive.at(0);
        if (!trg) return;
        if (trg.rank >= 8) {
          trg.stun = Math.max(trg.stun || 0, 3);
          ctx.popEnemy(trg, '🕊 Успокоен (3р)');
          ctx.log(`🐾 <b>[Ветка любимчика]</b>: <b>${trg.name}</b> (Элита+) успокоен на 3 раунда — доступен 100% побег!`);
        } else if (trg.rank <= ctx.p.rank + plusR) {
          trg.stun = Math.max(trg.stun || 0, calmR);
          trg.tamedReady = true;
          ctx.popEnemy(trg, `🐾 Укрощён (${calmR}р)`);
          ctx.log(`🐾 <b>[Ветка любимчика]</b>: <b>${trg.name}</b> укрощён на <b>${calmR} раунда</b> и готов к приручению!`);
        } else {
          ctx.popEnemy(trg, '❌ Слишком силён');
          ctx.log(`🐾 <b>[Ветка любимчика]</b>: ранг <b>${trg.name}</b> (Р${trg.rank}) выше предела укрощения (+${plusR})!`);
        }
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 6: ДАРЫ 3–4 (КЛОКСТОПЕР И СКРЫТ)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // 3. КЛОКСТОПЕР
  C.registerDar('clockstopper', {
    pool: 'human', name: 'Клокстопер', type: 'active', cap: 20, mana1: 100, mana30: 15,
    cfg: {
      baseHits: Array.of(Array.of(1, 4), Array.of(5, 7), Array.of(10, 11), Array.of(20, 15)),
      baseMana: Array.of(Array.of(1, 100), Array.of(5, 70), Array.of(10, 40), Array.of(20, 15)),
      knivesCnt: Array.of(Array.of(1, 2), Array.of(10, 4), Array.of(30, 8)),
      knivesMult: Array.of(Array.of(1, 1.5), Array.of(10, 2.2), Array.of(30, 3.5)),
      knivesMana: Array.of(Array.of(1, 45), Array.of(10, 28), Array.of(30, 10)),
      leapSteps: Array.of(Array.of(1, 2), Array.of(10, 4), Array.of(30, 8)),
      leapMana: Array.of(Array.of(1, 40), Array.of(10, 24), Array.of(30, 10)),
      dodgePct: Array.of(Array.of(1, 0.20), Array.of(10, 0.45), Array.of(30, 0.80)),
      cheatHpPct: Array.of(Array.of(1, 0.10), Array.of(10, 0.20), Array.of(30, 0.40)),
      cheatMana: Array.of(Array.of(1, 50), Array.of(10, 35), Array.of(30, 15))
    },
    desc: 'База (бой, кап Ур.20): 4 -> 15 безответных ударов без контрудара. Ветки: Ножи-ракеты, Скачок без ОХ, Сумасшедшее уклонение, Избегание смерти.',
    branches: Array.of(
      { id: 'b1', name: 'Ножи-ракеты', type: 'active', mode: 'battle', mana1: 45, mana30: 10, desc: 'Залп с игнорированием брони: 2 (1.5x) -> 8 ножей (3.5x).' },
      { id: 'b2', name: 'Скачок без ОХ', type: 'active', mode: 'map', mana1: 40, mana30: 10, desc: 'Карта: даёт 2 -> 8 шагов за 0 ОХ.' },
      { id: 'b3', name: 'Сумасшедшее уклонение', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: +20% -> +80% к шансу уклонения.' },
      { id: 'b4', name: 'Избегание смерти', type: 'trigger', mana1: 50, mana30: 15, desc: 'Триггер: спасает от смерти, оставляя 10% -> 40% макс. ОЗ.' }
    ),
    getManaPct(branchId, lvl) {
      if (!branchId) return Math.round(C.interpNodes(lvl, this.cfg.baseMana));
      if (branchId === 'b1') return Math.round(C.interpNodes(lvl, this.cfg.knivesMana));
      if (branchId === 'b2') return Math.round(C.interpNodes(lvl, this.cfg.leapMana));
      if (branchId === 'b4') return Math.round(C.interpNodes(lvl, this.cfg.cheatMana));
      return 0;
    },
    async execute(ctx) {
      if (ctx.branchId === 'b2') {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log('⚠️ <b>[Скачок без ОХ]</b> применяется на <b>карте рейда</b>!');
        return;
      }
      const p = ctx.p, hero = p && p.heroRef;
      const meleeObj = (hero && hero.slots && hero.slots.melee) || (!p.weap.isGun ? p.weap : null);
      const mRank = meleeObj ? Number(meleeObj.rank || meleeObj.cls || 1) : 1;
      const effRank = C.getEffectiveGearRank(mRank);
      const physMult = meleeObj ? (1 + (effRank - 1) * 0.25) : 1.0;

      if (ctx.branchId === 'b1') {
        const cnt = Math.round(C.interpNodes(ctx.lvl, this.cfg.knivesCnt));
        const mult = Number(C.interpNodes(ctx.lvl, this.cfg.knivesMult).toFixed(2));
        const baseKnife = Math.max(4, Math.round(((p.stats.agi || 10) * 0.45 + (p.stats.str || 10) * 0.25) * mult * physMult * ctx.intMult));
        const stepDelay = Math.max(260, Math.round(3500 / Math.max(1, cnt)));
        let total = 0;
        for (let i = 0; i < cnt; i++) {
          const cur = ctx.enemies.filter(e => !e.dead);
          if (!cur.length) break;
          const trg = cur.at(i % cur.length);
          total += baseKnife;
          if (global.BSIM_AUDIO) global.BSIM_AUDIO.playSfx('melee');
          ctx.dealDamage(trg, baseKnife, '✨🚀 -' + baseKnife);
          if (ctx.wait) await ctx.wait(stepDelay);
        }
        ctx.log('🚀 <b>[Ножи-ракеты]</b>: выпущено <b>' + cnt + ' ножей</b> (суммарно <b>-' + total + '</b> урона)!');
        return;
      }

      const hits = Math.round(C.interpNodes(ctx.lvl, this.cfg.baseHits));
      const w = meleeObj ? { dmg: Math.max(4, Math.round((meleeObj.a || meleeObj.dmg || 9) * 0.65)), isGun: false } : (p.weap || { dmg: 6, isGun: false });
      const statAdd = Math.round(w.isGun ? (p.stats.agi || 10) * 0.25 : (p.stats.str || 10) * 0.35);
      const perHit = Math.max(3, Math.round((w.dmg + statAdd) * physMult * (p.buff || 1)));
      const sparks = Array.of('✨⚡', '💥🔪', '⚡✨', '🔥🗡️');
      const stepDelay = Math.max(240, Math.round(3500 / Math.max(1, hits)));
      let totalDmg = 0;

      for (let i = 0; i < hits; i++) {
        const cur = ctx.enemies.filter(e => !e.dead);
        if (!cur.length) break;
        const trg = cur.at(0);
        totalDmg += perHit;
        if (global.BSIM_AUDIO) global.BSIM_AUDIO.playSfx('melee');
        const uCard = typeof document !== 'undefined' && document.getElementById('u-' + trg.id);
        if (uCard) {
          uCard.style.boxShadow = '0 0 16px #fde047';
          setTimeout(() => { if (uCard) uCard.style.boxShadow = ''; }, Math.min(200, stepDelay - 30));
        }
        ctx.dealDamage(trg, perHit, sparks.at(i % sparks.length) + ' -' + perHit + ' (#' + (i + 1) + ')');
        if (ctx.wait) await ctx.wait(stepDelay);
      }
      ctx.log('⏳ <b>[Клокстопер: Замедление]</b>: серия из <b>' + hits + ' ударов</b> по <b>-' + perHit + '</b> (итого <b>-' + totalDmg + '</b> урона)!');
    }
  });

  // 4. СКРЫТ
  C.registerDar('stealth', {
    pool: 'human', name: 'Скрыт', type: 'active', mode: 'map', mana1: 50, mana30: 1,
    cfg: {
      mapMana: Array.of(Array.of(1, 50), Array.of(10, 25), Array.of(30, 1)),
      groupRad: Array.of(Array.of(1, 2), Array.of(10, 5), Array.of(30, 10)),
      groupMana: Array.of(Array.of(1, 50), Array.of(10, 30), Array.of(30, 10)),
      ghostMana: Array.of(Array.of(1, 50), Array.of(10, 30), Array.of(30, 10)),
      phaseDist: Array.of(Array.of(1, 2), Array.of(10, 3), Array.of(30, 5)),
      phaseMana: Array.of(Array.of(1, 50), Array.of(10, 30), Array.of(30, 10))
    },
    desc: 'База (карта): невидимость (Внимательно до +3 ранга, Быстро до +2, Бегом до +1). Ветки: Общий скрыт, Призрак, Бесплотность.',
    branches: Array.of(
      { id: 'b1', name: 'Общий скрыт', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: укрывает отряд от агра в радиусе 2 -> 10 клеток.' },
      { id: 'b2', name: 'Призрак', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой: режет меткость врагов на 90% против <= +1 ранга (±30%/ранг) за фикс. ману/раунд.' },
      { id: 'b3', name: 'Бесплотность', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: фазовый переход сквозь препятствия за 3 ОХ на 2 -> 5 клеток.' }
    ),
    getManaPct(branchId, lvl) {
      if (!branchId) return Math.round(C.interpNodes(lvl, this.cfg.mapMana));
      if (branchId === 'b1') return Math.round(C.interpNodes(lvl, this.cfg.groupMana));
      if (branchId === 'b2') return Math.round(C.interpNodes(lvl, this.cfg.ghostMana));
      if (branchId === 'b3') return Math.round(C.interpNodes(lvl, this.cfg.phaseMana));
      return 10;
    },
    execute(ctx) {
      if (ctx.branchId !== 'b2') {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log(`⚠️ <b>[${ctx.title}]</b> применяется на <b>карте рейда</b>! В бою работает ветка «Призрак».`);
        return;
      }
      const tickMana = C.getFixedManaCost(ctx.p, ctx.item, this.getManaPct('b2', ctx.lvl));
      const wasOn = Boolean(ctx.p.ghostMode && ctx.p.ghostMode.active);
      ctx.p.ghostMode = { active: !wasOn, tickMana };
      if (!wasOn) {
        ctx.popPlayer(`👻 Призрак (${tickMana}м/р)`);
        ctx.log(`👻 <b>[Призрак]</b> активирован: враги <= +1 ранга промахиваются с шансом <b>90%</b> (фикс. ${tickMana} маны/раунд)!`);
      } else {
        ctx.popPlayer('👻 Призрак выкл.');
        ctx.log('👻 <b>[Призрак]</b> отключён.');
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 7: ДАРЫ 5–6 (МАСТЕР ОГНЯ И СОНИК)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // 5. МАСТЕР ОГНЯ
  C.registerDar('fire_master', {
    pool: 'human', name: 'Мастер огня', type: 'active', mode: 'battle', mana1: 50, mana30: 10,
    cfg: {
      volleys: Array.of(Array.of(1, 1), Array.of(10, 2), Array.of(30, 3)),
      targets: Array.of(Array.of(1, 1), Array.of(10, 3), Array.of(30, 6)),
      dmgMult: Array.of(Array.of(1, 3.0), Array.of(10, 3.9), Array.of(30, 5.0)),
      baseMana: Array.of(Array.of(1, 50), Array.of(10, 28), Array.of(30, 10)),
      shieldRet: Array.of(Array.of(1, 1.5), Array.of(10, 1.95), Array.of(30, 2.5)),
      shieldMana: Array.of(Array.of(1, 50), Array.of(10, 25), Array.of(30, 5)),
      wallCells: Array.of(Array.of(1, 1), Array.of(10, 3), Array.of(30, 5)),
      wallTurns: Array.of(Array.of(1, 2), Array.of(10, 4), Array.of(30, 6)),
      wallHpCut: Array.of(Array.of(1, 0.33), Array.of(10, 0.52), Array.of(30, 0.75)),
      wallMana: Array.of(Array.of(1, 50), Array.of(10, 28), Array.of(30, 10)),
      fireRes: Array.of(Array.of(1, 0.80), Array.of(10, 1.0), Array.of(30, 1.20))
    },
    desc: 'База (бой без пропуска атаки): 1->2->3 залпа/бой по 1->3->6 целям (300%->500% урона). Ветки: Огненный щит, Стена огня, Друг огня.',
    branches: Array.of(
      { id: 'b1', name: 'Огненный щит', type: 'active', mode: 'battle', mana1: 50, mana30: 5, desc: 'Бой: режет входящий урон на 50%, возвращает 150% -> 250% ожогом в ближнем бою.' },
      { id: 'b2', name: 'Стена огня', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: преграда 1->5 кл. на 2->6 ходов (50% отброс или ожог 33%->75% ОЗ).' },
      { id: 'b3', name: 'Друг огня', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: поглощает 80% -> 100% огня, на Ур.30+ хил 20% от огня + мана.' }
    ),
    getManaPct(branchId, lvl) {
      if (!branchId) return Math.round(C.interpNodes(lvl, this.cfg.baseMana));
      if (branchId === 'b1') return Math.round(C.interpNodes(lvl, this.cfg.shieldMana));
      if (branchId === 'b2') return Math.round(C.interpNodes(lvl, this.cfg.wallMana));
      return 0;
    },
    execute(ctx) {
      if (ctx.branchId === 'b2') {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log('⚠️ <b>[Стена огня]</b> ставится на <b>карте рейда</b>! В бою используй базовый залп или «Огненный щит».');
        return;
      }
      if (ctx.branchId === 'b1') {
        const retMult = Number(C.interpNodes(ctx.lvl, this.cfg.shieldRet).toFixed(2));
        const tickMana = C.getFixedManaCost(ctx.p, ctx.item, this.getManaPct('b1', ctx.lvl));
        const wasOn = Boolean(ctx.p.fireShield && ctx.p.fireShield.active);
        ctx.p.fireShield = { active: !wasOn, retMult, tickMana };
        if (!wasOn) {
          ctx.popPlayer(`🔥 Огненный щит (${Math.round(retMult * 100)}%)`);
          ctx.log(`🔥 <b>[Огненный щит]</b> включён: входящий урон <b>-50%</b>, ответный ожог <b>${Math.round(retMult * 100)}%</b> (фикс. ${tickMana} маны/раунд)!`);
        } else {
          ctx.popPlayer('🔥 Щит выкл.');
          ctx.log('🔥 <b>[Огненный щит]</b> отключён.');
        }
        return;
      }
      const maxVolleys = Math.round(C.interpNodes(ctx.lvl, this.cfg.volleys));
      if (ctx.item && ctx.item.maxCharges !== maxVolleys) {
        const spent = Math.max(0, (ctx.item.maxCharges || 1) - (ctx.item.charges || 0));
        ctx.item.maxCharges = maxVolleys;
        ctx.item.charges = Math.max(0, maxVolleys - spent);
      }
      const maxTrg = Math.round(C.interpNodes(ctx.lvl, this.cfg.targets));
      const mult = Number(C.interpNodes(ctx.lvl, this.cfg.dmgMult).toFixed(2));
      const baseFire = Math.max(8, Math.round((12 + (ctx.p.stats.int || 10) * 0.6 + (ctx.p.stats.spi || 10) * 0.4) * mult * ctx.intMult));
      const targets = ctx.alive.slice(0, maxTrg);
      targets.forEach(en => ctx.dealDamage(en, baseFire, `🔥 -${baseFire}`));
      ctx.log(`🔥 <b>[Мастер огня]</b> (${Math.round(mult * 100)}%, целей: ${targets.length}/${maxTrg}): огненный шквал нанёс по <b>${baseFire}</b> урона!`);
    }
  });

  // 6. СОНИК
  C.registerDar('sonic', {
    pool: 'human', name: 'Соник', type: 'active', mode: 'battle', mana1: 100, mana30: 10,
    cfg: {
      baseMana: Array.of(Array.of(1, 100), Array.of(10, 50), Array.of(30, 10)),
      highDmgMult: Array.of(Array.of(1, 1.5), Array.of(10, 2.2), Array.of(30, 3.0)),
      concussMiss: Array.of(Array.of(1, 0.70), Array.of(10, 0.80), Array.of(30, 0.90)),
      silenceRad: Array.of(Array.of(1, 1), Array.of(10, 4), Array.of(30, 10)),
      echoRad: Array.of(Array.of(1, 6), Array.of(10, 14), Array.of(30, 25)),
      echoMana: Array.of(Array.of(1, 50), Array.of(10, 30), Array.of(30, 10)),
      infraRad: Array.of(Array.of(1, 2), Array.of(10, 6), Array.of(30, 12)),
      infraMana: Array.of(Array.of(1, 60), Array.of(10, 35), Array.of(30, 10))
    },
    desc: 'База (бой без потери атаки): оглушает врагов ниже/равного ранга (3р / 2р без урона), +1р (50/50 стан 1р или урон), +2 и выше (50/50 урон 150%->300% или контузия). Ветки: Купол тишины, Эхолокатор, Инфразвук.',
    branches: Array.of(
      { id: 'b1', name: 'Купол тишины', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: бесшумный бег и глушение звуков отряда в радиусе 1 -> 10 кл.' },
      { id: 'b2', name: 'Эхолокатор', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: вскрывает засады/Скрытов и указывает лут в радиусе 6 -> 25 кл.' },
      { id: 'b3', name: 'Инфразвук', type: 'active', mode: 'map', mana1: 60, mana30: 10, desc: 'Карта (2->12 кл.): враги обделываются (ОХ=0 + «Вонь» на 5 ходов).' }
    ),
    getManaPct(branchId, lvl) {
      if (!branchId) return Math.round(C.interpNodes(lvl, this.cfg.baseMana));
      if (branchId === 'b2') return Math.round(C.interpNodes(lvl, this.cfg.echoMana));
      if (branchId === 'b3') return Math.round(C.interpNodes(lvl, this.cfg.infraMana));
      return 0;
    },
    execute(ctx) {
      if (ctx.branchId === 'b2' || ctx.branchId === 'b3') {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log(`⚠️ <b>[${ctx.title}]</b> применяется на <b>карте рейда</b>!`);
        return;
      }
      const dMult = Number(C.interpNodes(ctx.lvl, this.cfg.highDmgMult).toFixed(2));
      const missPct = Number(C.interpNodes(ctx.lvl, this.cfg.concussMiss).toFixed(2));
      const baseSonic = Math.max(12, Math.round((18 + (ctx.p.stats.spi || 10) * 0.9) * dMult * ctx.intMult));

      ctx.alive.forEach(en => {
        const diff = (en.rank || 0) - (ctx.p.rank || 0);
        if (diff <= 0) {
          const stunR = diff < 0 ? 3 : 2;
          en.stun = Math.max(en.stun || 0, stunR);
          ctx.popEnemy(en, `💫 СТАН (${stunR}р)`);
        } else if (diff === 1) {
          if (Math.random() < 0.50) {
            en.stun = Math.max(en.stun || 0, 1);
            ctx.popEnemy(en, '💫 СТАН (1р)');
          } else {
            ctx.dealDamage(en, baseSonic, `🔊 УРОН -${baseSonic}`);
          }
        } else {
          if (Math.random() < 0.50) {
            ctx.dealDamage(en, baseSonic, `🔊 РАЗРЫВ -${baseSonic}`);
          } else {
            en.concussion = { rounds: 2, missChance: missPct };
            en.debuff = Math.max(en.debuff || 0, 2);
            ctx.popEnemy(en, `😵 КОНТУЗИЯ (-${Math.round(missPct * 100)}%)`);
          }
        }
      });
      ctx.log('🔊 <b>[Соник]</b>: акустический удар накрыл врагов (атака свободна)!');
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 8: ДАРЫ 7–9 (МЕНТАЛИСТ, НИМФА, ЖИГОЛО)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // 7. МЕНТАЛИСТ
  C.registerDar('mentalist', {
    pool: 'human', name: 'Менталист', type: 'active', mode: 'battle', mana1: 100, mana30: 10,
    cfg: {
      baseMana: Array.of(Array.of(1, 100), Array.of(10, 50), Array.of(30, 10)),
      cdRounds: 3,
      barrierPct: Array.of(Array.of(1, 0.50), Array.of(10, 0.80), Array.of(30, 1.0)),
      jamRad: Array.of(Array.of(1, 2), Array.of(10, 6), Array.of(30, 10)),
      jamRankPlus: Array.of(Array.of(1, 0), Array.of(10, 1), Array.of(30, 2)),
      jamMana: Array.of(Array.of(1, 30), Array.of(10, 14), Array.of(30, 1)),
      booMana: Array.of(Array.of(1, 60), Array.of(10, 35), Array.of(30, 10))
    },
    desc: 'База (бой, КД 3р): подавляет волю врага <= +1 ранга на 1..3р и забирает раунд атаки себе. Ветки: Ментальный барьер, Активная глушилка, Бу!.',
    branches: Array.of(
      { id: 'b1', name: 'Ментальный барьер', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: 50% -> 100% защита от дебаффов и пси-атак.' },
      { id: 'b2', name: 'Активная глушилка', type: 'active', mode: 'both', mana1: 30, mana30: 1, desc: 'Карта/бой: подавляет Дары в радиусе 2 -> 10 кл. за фикс. ману/ход.' },
      { id: 'b3', name: 'Бу!', type: 'active', mode: 'battle', mana1: 60, mana30: 10, desc: 'Бой (1/бой): шанс 50% <= равного ранга (25% бегство / 25% подчинение).' }
    ),
    getManaPct(branchId, lvl) {
      if (!branchId) return Math.round(C.interpNodes(lvl, this.cfg.baseMana));
      if (branchId === 'b2') return Math.round(C.interpNodes(lvl, this.cfg.jamMana));
      if (branchId === 'b3') return Math.round(C.interpNodes(lvl, this.cfg.booMana));
      return 0;
    },
    execute(ctx) {
      if (ctx.branchId === 'b2') {
        const tickMana = C.getFixedManaCost(ctx.p, ctx.item, this.getManaPct('b2', ctx.lvl));
        const rankPlus = Math.round(C.interpNodes(ctx.lvl, this.cfg.jamRankPlus));
        const wasOn = Boolean(ctx.p.jammerAura && ctx.p.jammerAura.active);
        ctx.p.jammerAura = { active: !wasOn, tickMana, rankPlus };
        if (!wasOn) {
          ctx.popPlayer(`📵 Глушилка (+${rankPlus}р)`);
          ctx.log(`📵 <b>[Активная глушилка]</b> включена: Дары врагов до +${rankPlus} ранга подавлены (фикс. ${tickMana} маны/ход)!`);
        } else {
          ctx.popPlayer('📵 Глушилка выкл.');
          ctx.log('📵 <b>[Активная глушилка]</b> отключена.');
        }
        return;
      }

      if (ctx.branchId === 'b3') {
        if (ctx.item && ctx.item.maxCharges !== 1) { ctx.item.maxCharges = 1; ctx.item.charges = 0; }
        const trg = ctx.alive.at(0);
        if (!trg) return;
        const diff = (trg.rank || 0) - (ctx.p.rank || 0);
        const totalChance = diff < 0 ? 1.0 : (diff === 0 ? 0.50 : (diff === 1 ? 0.25 : 0));
        if (Math.random() >= totalChance) {
          ctx.popEnemy(trg, '😒 Устоял');
          ctx.log(`👻 <b>[Бу!]</b> (${Math.round(totalChance * 100)}%): <b>${trg.name}</b> не поддался!`);
          return;
        }
        if (Math.random() < 0.50) {
          trg.dead = true;
          trg.fled = true;
          ctx.popEnemy(trg, '🏃 В УЖАСЕ СБЕЖАЛ!');
          ctx.log(`😱 <b>[Бу! — Испуг]</b>: <b>${trg.name}</b> в ужасе сбежал с поля боя!`);
        } else {
          trg.charmedAlly = true;
          ctx.popEnemy(trg, '🧠 ПОДЧИНЁН (БЬЁТ СВОИХ!)');
          ctx.log(`🧠 <b>[Бу! — Подчинение]</b>: <b>${trg.name}</b> перевербован и <b>атакует своих</b> до конца боя!`);
        }
        return;
      }

      if (ctx.p._mentCd > 0) {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log(`⏳ <b>[Менталист]</b> на перезарядке (осталось ${ctx.p._mentCd} р.)!`);
        return;
      }
      const trg = ctx.alive.at(0);
      if (!trg) return;
      const diff = (trg.rank || 0) - (ctx.p.rank || 0);
      const baseStun = Math.min(3, 1 + Math.floor((ctx.lvl - 1) / 14));
      ctx.p._mentCd = this.cfg.cdRounds;
      if (diff <= 1) {
        const dur = diff < 0 ? Math.min(4, baseStun + 1) : baseStun;
        trg.stun = Math.max(trg.stun || 0, dur);
        ctx.p.buff = Math.max(ctx.p.buff || 1, 1.35);
        ctx.popEnemy(trg, `🌀 ПОДАВЛЕН (${dur}р)`);
        ctx.log(`🌀 <b>[Менталист]</b>: воля <b>${trg.name}</b> подавлена на <b>${dur} р.</b>, раунд атаки перехвачен (КД 3р)!`);
      } else {
        const ch = Math.max(0.10, 1.0 - (diff - 1) * 0.50);
        if (Math.random() < ch) {
          trg.stun = Math.max(trg.stun || 0, 1);
          ctx.popEnemy(trg, '🌀 ПОДАВЛЕН (1р)');
          ctx.log(`🌀 <b>[Менталист]</b> (${Math.round(ch * 100)}%): воля старшего <b>${trg.name}</b> подавлена на 1 раунд!`);
        } else {
          ctx.popEnemy(trg, '🛡️ МЕНТАЛЬНЫЙ БЛОК');
          ctx.log(`🌀 <b>[Менталист]</b> (${Math.round(ch * 100)}%): разум <b>${trg.name}</b> устоял!`);
        }
      }
    }
  });

  // 8 И 9. НИМФА И ЖИГОЛО (ЗЕРКАЛО)
  const CHARM_CFG = {
    loyalDmg1: 0.20, hostileDmg1: 2.00,
    coverPct30: 0.30, hostileDmg30: 1.50,
    subMana: Array.of(Array.of(1, 100), Array.of(30, 10)),
    sirenRad: Array.of(Array.of(1, 3), Array.of(30, 7)),
    sirenTame: Array.of(Array.of(1, 0.50), Array.of(30, 0.70)),
    sirenMana: Array.of(Array.of(1, 50), Array.of(30, 5)),
    gazeMiss: Array.of(Array.of(1, 0.50), Array.of(30, 0.75)),
    gazeMana: Array.of(Array.of(1, 50), Array.of(30, 10))
  };

  function runCharmDar(ctx, isGigolo) {
    if (ctx.branchId === 'b2') {
      ctx.p.mana += ctx.cost;
      if (ctx.item) ctx.item.usedRound = false;
      ctx.log(`⚠️ <b>[${ctx.title}]</b> применяется на <b>карте рейда</b>!`);
      return;
    }
    const isCap = ctx.lvl >= 30;
    const virtRank = (ctx.p.rank || 0) + (isCap ? 1 : 0);
    const capBonus = isCap ? 0.05 : 0;

    if (ctx.branchId === 'b1') {
      let turned = 0;
      ctx.alive.forEach((en, idx) => {
        if (en.charmedAlly || idx % 2 === 1) return;
        const diff = (en.rank || 0) - virtRank;
        const ch = Math.max(0.05, Math.min(0.98, 0.75 - diff * 0.25 + capBonus));
        if (Math.random() < ch) {
          en.charmedAlly = true;
          turned++;
          ctx.popEnemy(en, isGigolo ? '🌹 СОБЛАЗНЁН (БЬЁТ СВОИХ!)' : '💋 ПОДЧИНЁН (БЬЁТ СВОИХ!)');
        } else {
          ctx.popEnemy(en, '🛡️ УСТОЯЛ');
        }
      });
      ctx.log(`${isGigolo ? '🌹' : '💋'} <b>[${ctx.title}]</b>: перевербовано целей: <b>${turned}</b> — они атакуют своих до конца боя!`);
      return;
    }

    if (ctx.branchId === 'b3') {
      const missPct = Number(C.interpNodes(ctx.lvl, CHARM_CFG.gazeMiss).toFixed(2));
      const dur = ctx.lvl >= 15 ? 3 : 2;
      const half = Math.max(1, Math.ceil(ctx.alive.length / 2));
      ctx.alive.forEach((en, idx) => {
        if (idx < half) {
          en.stun = Math.max(en.stun || 0, 2);
          ctx.popEnemy(en, '💫 СТАН (2р)');
        } else {
          en.concussion = { rounds: dur, missChance: missPct };
          en.debuff = Math.max(en.debuff || 0, dur);
          ctx.popEnemy(en, `👁️ -${Math.round(missPct * 100)}% метк. (${dur}р)`);
        }
      });
      ctx.log(`${isGigolo ? '😏' : '😍'} <b>[${ctx.title}]</b>: половина врагов в стане, у второй половины меткость <b>-${Math.round(missPct * 100)}%</b>!`);
    }
  }

  C.registerDar('nymph', {
    pool: 'human', name: 'Нимфа', type: 'passive', mana1: 0, mana30: 0, cfg: CHARM_CFG,
    desc: 'База (пассив): лояльны мужчины + 50% заражённых (бьют 20% -> прикрывают на 30%), нелояльны женщины + 50% (бьют 200% -> 150%). Взаимный иммунитет с Жиголо.',
    branches: Array.of(
      { id: 'b1', name: 'Подчинение', type: 'active', mode: 'battle', mana1: 100, mana30: 10, desc: 'Бой: стравливает половины врагов (75% ±25%/ранг).' },
      { id: 'b2', name: 'Песнь сирены', type: 'active', mode: 'map', mana1: 50, mana30: 5, desc: 'Карта: приманивает группу в 3->7 кл., 50%->70% приручить 1 врага.' },
      { id: 'b3', name: 'Томный взгляд', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой: стан половины + -50% -> -75% меткости второй половине.' }
    ),
    getManaPct(b, l) {
      if (b === 'b1') return Math.round(C.interpNodes(l, CHARM_CFG.subMana));
      if (b === 'b2') return Math.round(C.interpNodes(l, CHARM_CFG.sirenMana));
      if (b === 'b3') return Math.round(C.interpNodes(l, CHARM_CFG.gazeMana));
      return 0;
    },
    execute(ctx) { runCharmDar(ctx, false); }
  });

  C.registerDar('gigolo_gift', {
    pool: 'human', name: 'Жиголо', type: 'passive', mana1: 0, mana30: 0, cfg: CHARM_CFG,
    desc: 'Зеркало Нимфы (взаимный иммунитет): лояльны женщины + 50% заражённых, нелояльны мужчины + 50%.',
    branches: Array.of(
      { id: 'b1', name: 'Соблазнение', type: 'active', mode: 'battle', mana1: 100, mana30: 10, desc: 'Бой: зеркало «Подчинения» (75% ±25%/ранг).' },
      { id: 'b2', name: 'Зов хищника', type: 'active', mode: 'map', mana1: 50, mana30: 5, desc: 'Карта: зеркало «Песни сирены» (приманивает группу в 3->7 кл.).' },
      { id: 'b3', name: 'Роковая ухмылка', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой: зеркало «Томного взгляда» (стан половины + -50% -> -75% меткости).' }
    ),
    getManaPct(b, l) { return C.DARS.nymph.getManaPct(b, l); },
    execute(ctx) { runCharmDar(ctx, true); }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 9: ДАРЫ 10–11 (ИЛЛЮЗИОНИСТ И ТАНК)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // 10. ИЛЛЮЗИОНИСТ
  C.registerDar('illusionist', {
    pool: 'human', name: 'Иллюзионист', type: 'active', mode: 'battle', mana1: 100, mana30: 10,
    cfg: {
      cardsCount: 36,
      cardMinPct: Array.of(Array.of(1, 0.005), Array.of(5, 0.007), Array.of(10, 0.009), Array.of(20, 0.012), Array.of(30, 0.015)),
      cardMaxPct: Array.of(Array.of(1, 0.050), Array.of(5, 0.070), Array.of(10, 0.090), Array.of(20, 0.120), Array.of(30, 0.150)),
      manaSteps:  Array.of(Array.of(1, 100), Array.of(5, 75), Array.of(10, 50), Array.of(20, 25), Array.of(30, 10)),
      magLootPct: Array.of(Array.of(1, 0.25), Array.of(5, 0.30), Array.of(10, 0.36), Array.of(20, 0.44), Array.of(30, 0.50)),
      magRad:     Array.of(Array.of(1, 3), Array.of(5, 4), Array.of(10, 5), Array.of(20, 7), Array.of(30, 8)),
      sawHealPct: Array.of(Array.of(1, 0.10), Array.of(5, 0.13), Array.of(10, 0.16), Array.of(20, 0.20), Array.of(30, 0.25)),
      sawTurns:   Array.of(Array.of(1, 1), Array.of(5, 1), Array.of(10, 1), Array.of(20, 2), Array.of(30, 2)),
      sawUses:    Array.of(Array.of(1, 1), Array.of(5, 1), Array.of(10, 2), Array.of(20, 2), Array.of(30, 2)),
      jugTurns:   Array.of(Array.of(1, 1), Array.of(5, 1), Array.of(10, 1), Array.of(20, 2), Array.of(30, 2)),
      jugUses:    Array.of(Array.of(1, 1), Array.of(5, 1), Array.of(10, 2), Array.of(20, 2), Array.of(30, 2))
    },
    desc: 'База (бой): бросок 36 карт (0.5-5% -> 1.5-15% за карту от статов, 100%->10% фикс. маны). Ветки: Фокусник, Распили меня полностью, Жонглёр.',
    branches: Array.of(
      { id: 'b1', name: 'Фокусник', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: анти-пси и шанс доп. лута 25% -> 50% (радиус 3 -> 8 кл.).' },
      { id: 'b2', name: 'Распили меня полностью', type: 'active', mode: 'battle', mana1: 100, mana30: 10, desc: 'Бой (1->2/бой): ближнюю атаку врага превращает в хил 10% -> 25% ОЗ.' },
      { id: 'b3', name: 'Жонглёр', type: 'active', mode: 'battle', mana1: 100, mana30: 10, desc: 'Бой (1->2/бой): ловит атаку и возвращает 100% урона в случайного врага.' }
    ),
    getManaPct(branchId, lvl) {
      if (branchId === 'b1') return 0;
      return Math.round(C.interpNodes(lvl, this.cfg.manaSteps));
    },
    async execute(ctx) {
      if (ctx.branchId === 'b2' || ctx.branchId === 'b3') {
        const isSaw = ctx.branchId === 'b2';
        const uses = Math.round(C.interpNodes(ctx.lvl, isSaw ? this.cfg.sawUses : this.cfg.jugUses));
        if (ctx.item && ctx.item.maxCharges !== uses) { ctx.item.maxCharges = uses; ctx.item.charges = Math.max(0, uses - 1); }
        const turns = Math.round(C.interpNodes(ctx.lvl, isSaw ? this.cfg.sawTurns : this.cfg.jugTurns));
        if (isSaw) {
          const healPct = Number(C.interpNodes(ctx.lvl, this.cfg.sawHealPct).toFixed(2));
          ctx.p.sawBox = { rounds: turns, healPct };
          ctx.popPlayer(`🪚 Ящик (${turns}р)`);
          ctx.log(`🪚 <b>[Распили меня полностью]</b>: активен на <b>${turns} р.</b> (хил ${Math.round(healPct * 100)}% ОЗ)!`);
        } else {
          ctx.p.jugglerTrap = { rounds: turns };
          ctx.popPlayer(`🤹 Жонглёр (${turns}р)`);
          ctx.log(`🤹 <b>[Жонглёр]</b>: активен на <b>${turns} р.</b> (возврат 100% урона)!`);
        }
        return;
      }
      const minP = C.interpNodes(ctx.lvl, this.cfg.cardMinPct);
      const maxP = C.interpNodes(ctx.lvl, this.cfg.cardMaxPct);
      const flatPool = ((ctx.p.stats.int || 10) * 1.5 + (ctx.p.stats.spi || 10) * 1.5) * (C.BALANCE.skillFlatScale || 1.0) * ctx.intMult;
      const suits = Array.of('♠️', '♥️', '♦️', '♣️');
      let totalDmg = 0;
      for (let i = 0; i < this.cfg.cardsCount; i++) {
        const cur = ctx.enemies.filter(e => !e.dead);
        if (!cur.length) break;
        const en = cur.at(Math.floor(Math.random() * cur.length));
        const dmg = Math.max(1, Math.round(flatPool * (minP + Math.random() * (maxP - minP))));
        totalDmg += dmg;
        if (global.BSIM_AUDIO && i % 3 === 0) global.BSIM_AUDIO.playSfx('card');
        ctx.dealDamage(en, dmg, i % 4 === 0 ? `${suits.at(i % 4)} -${dmg}` : null);
        if (i % 3 === 0 && ctx.wait) await ctx.wait(30);
      }
      ctx.log(`🃏 <b>[Иллюзионист: 36 карт]</b>: суммарно <b>-${totalDmg}</b> урона!`);
    }
  });

  // 11. ТАНК
  C.registerDar('tank', {
    pool: 'human', name: 'Танк', type: 'trigger', mode: 'battle', mana1: 25, mana30: 5,
    cfg: {
      baseHits: Array.of(Array.of(1, 2), Array.of(30, 10)),
      baseMana: Array.of(Array.of(1, 25), Array.of(30, 5)),
      immPct:   Array.of(Array.of(1, 0.50), Array.of(30, 1.0)),
      crawlAp:  Array.of(Array.of(1, 6), Array.of(30, 2)),
      ramCost:  Array.of(Array.of(1, 0.50), Array.of(30, 0.0)),
      maxRamsPerRaid: 3
    },
    desc: 'База (триггер боя): поглощает удары >= 10% ОЗ (2->10 уд./бой за 25%->5% фикс. маны). Ветки: Бывалый танкист, Грязь — это загар, Танкам дорога не нужна.',
    branches: Array.of(
      { id: 'b1', name: 'Бывалый танкист', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: иммунитет к оглушению и слепоте 50% -> 100%.' },
      { id: 'b2', name: 'Грязь — это загар', type: 'active', mode: 'map', mana1: 0, mana30: 0, desc: 'Карта: ползком = скрыт (без обыска), цена шага 6 ОХ -> 2 ОХ.' },
      { id: 'b3', name: 'Танкам дорога не нужна', type: 'active', mode: 'map', mana1: 50, mana30: 0, desc: 'Карта (до 3/рейд): уничтожает 1 препятствие (50% ОЗ/маны -> 0 на Ур.30+).' }
    ),
    getManaPct(b, l) {
      if (!b) return Math.round(C.interpNodes(l, this.cfg.baseMana));
      if (b === 'b3') return Math.round(C.interpNodes(l, this.cfg.ramCost) * 100);
      return 0;
    },
    execute(ctx) {
      ctx.p.mana += ctx.cost;
      if (ctx.item) ctx.item.usedRound = false;
      ctx.log('🚜 <b>[Танк]</b>: база срабатывает автоматически при ударе >= 10% ОЗ, а «Ползком» и «Таран препятствия» жми на <b>карте рейда</b>!');
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 10: ДАРЫ 12–13 (СЕНС И МАСТЕР ЛЬДА)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // 12. СЕНС
  C.registerDar('sense', {
    pool: 'human', name: 'Сенс', type: 'active', mode: 'map', mana1: 50, mana30: 5,
    cfg: {
      pelengRad:   Array.of(Array.of(1, 8), Array.of(30, 20)),
      pelengTurns: Array.of(Array.of(1, 3), Array.of(30, 5)),
      pelengMana:  Array.of(Array.of(1, 50), Array.of(30, 5)),
      antiBlind:   Array.of(Array.of(1, 0.50), Array.of(30, 1.0)),
      antiPsi:     Array.of(Array.of(1, 0.25), Array.of(30, 0.50)),
      essenceBuff: Array.of(Array.of(1, 1.50), Array.of(30, 3.00)),
      essenceDur:  Array.of(Array.of(1, 1), Array.of(30, 2)),
      essenceMana: Array.of(Array.of(1, 50), Array.of(30, 5)),
      decoyCnt:    Array.of(Array.of(1, 1), Array.of(30, 3)),
      decoyRounds: Array.of(Array.of(1, 1), Array.of(30, 5)),
      decoyMana:   Array.of(Array.of(1, 50), Array.of(30, 10))
    },
    desc: 'База (карта): пеленг живых целей и Скрытов (8->20 кл., 3->5 ходов). Ветки: Чувствительность, Знание сути, Знаток восприятия.',
    branches: Array.of(
      { id: 'b1', name: 'Чувствительность', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: 50% -> 100% анти-слепота и 25% -> 50% анти-пси.' },
      { id: 'b2', name: 'Знание сути', type: 'active', mode: 'battle', mana1: 50, mana30: 5, desc: 'Бой (без траты атаки): +50% (1р) -> +200% [x3] (2р) к урону и уклонению.' },
      { id: 'b3', name: 'Знаток восприятия', type: 'active', mode: 'both', mana1: 50, mana30: 10, desc: 'Карта/бой: выставляет 1 -> 3 куклы-приманки на 1 -> 5 раундов (отвлекают 50% атак).' }
    ),
    getManaPct(b, l) {
      if (!b) return Math.round(C.interpNodes(l, this.cfg.pelengMana));
      if (b === 'b2') return Math.round(C.interpNodes(l, this.cfg.essenceMana));
      if (b === 'b3') return Math.round(C.interpNodes(l, this.cfg.decoyMana));
      return 0;
    },
    execute(ctx) {
      if (!ctx.branchId) {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log('⚠️ <b>[Сенс: Пеленг]</b> включается на <b>карте рейда</b>! В бою жми «Знание сути» или «Куклы-приманки».');
        return;
      }
      if (ctx.branchId === 'b2') {
        const mult = Number(C.interpNodes(ctx.lvl, this.cfg.essenceBuff).toFixed(2));
        const dur = Math.round(C.interpNodes(ctx.lvl, this.cfg.essenceDur));
        ctx.p.essenceState = { mult, rounds: dur, dodgeBonus: Math.min(0.45, 0.15 + (ctx.lvl / 30) * 0.30) };
        ctx.p.buff = Math.max(ctx.p.buff || 1, mult);
        const capTxt = ctx.lvl >= 30 ? ' + бафф +50% роздан отряду!' : '';
        ctx.popPlayer(`🎯 Знание сути (×${mult}, ${dur}р)`);
        ctx.log(`📡 <b>[Знание сути]</b>: уязвимости вскрыты на <b>${dur} р.</b> (урон <b>×${mult}</b>, уклонение +${Math.round(ctx.p.essenceState.dodgeBonus * 100)}%)${capTxt}`);
        return;
      }
      if (ctx.branchId === 'b3') {
        const cnt = Math.round(C.interpNodes(ctx.lvl, this.cfg.decoyCnt));
        const rnds = Math.round(C.interpNodes(ctx.lvl, this.cfg.decoyRounds));
        ctx.p.decoys = { count: cnt, rounds: rnds };
        ctx.popPlayer(`👥 Куклы: ${cnt} шт. (${rnds}р)`);
        ctx.log(`🎎 <b>[Знаток восприятия]</b>: выставлено <b>${cnt} кукол-приманок</b> на <b>${rnds} р.</b> (отвлекают 50% атак врагов)!`);
      }
    }
  });

  // 13. МАСТЕР ЛЬДА
  C.registerDar('ice_master', {
    pool: 'human', name: 'Мастер льда', type: 'active', mode: 'battle', mana1: 50, mana30: 10,
    cfg: {
      volleys:   Array.of(Array.of(1, 1), Array.of(10, 2), Array.of(30, 3)),
      targets:   Array.of(Array.of(1, 1), Array.of(10, 3), Array.of(30, 6)),
      dmgMult:   Array.of(Array.of(1, 2.2), Array.of(10, 3.0), Array.of(30, 4.0)),
      baseMana:  Array.of(Array.of(1, 50), Array.of(10, 28), Array.of(30, 10)),
      frostCut:  Array.of(Array.of(1, 0.25), Array.of(30, 0.50)),
      freezeCh:  Array.of(Array.of(1, 0.30), Array.of(30, 0.60)),
      shellRet:  Array.of(Array.of(1, 1.2), Array.of(10, 1.65), Array.of(30, 2.2)),
      shellSpd:  Array.of(Array.of(1, 0.30), Array.of(30, 0.60)),
      shellMana: Array.of(Array.of(1, 50), Array.of(10, 25), Array.of(30, 5)),
      iceCells:  Array.of(Array.of(1, 1), Array.of(10, 3), Array.of(30, 5)),
      iceTurns:  Array.of(Array.of(1, 2), Array.of(10, 4), Array.of(30, 6)),
      iceMana:   Array.of(Array.of(1, 50), Array.of(10, 28), Array.of(30, 10)),
      coldRes:   Array.of(Array.of(1, 0.80), Array.of(10, 1.0), Array.of(30, 1.20)),
      fireRes:   Array.of(Array.of(1, 0.20), Array.of(10, 0.35), Array.of(30, 0.50))
    },
    desc: 'База (бой без пропуска атаки): 1->2->3 залпа по 1->3->6 целям (220%->400% крио-урона) + «Обморожение». Ветки: Ледяной панцирь, Гололёд, Хладнокровие.',
    branches: Array.of(
      { id: 'b1', name: 'Ледяной панцирь', type: 'active', mode: 'battle', mana1: 50, mana30: 5, desc: 'Бой: режет урон на 50%, ответный крио-урон 120% -> 220% и сбив темпа.' },
      { id: 'b2', name: 'Гололёд', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: наледь 1->5 кл. на 2->6 ходов (50% падение: ОХ=0 + перелом).' },
      { id: 'b3', name: 'Хладнокровие', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: 80% -> 100% анти-лёд + лечение 20% + 10% маны (Ур.30+); 20% -> 50% анти-огонь.' }
    ),
    getManaPct(b, l) {
      if (!b) return Math.round(C.interpNodes(l, this.cfg.baseMana));
      if (b === 'b1') return Math.round(C.interpNodes(l, this.cfg.shellMana));
      if (b === 'b2') return Math.round(C.interpNodes(l, this.cfg.iceMana));
      return 0;
    },
    execute(ctx) {
      if (ctx.branchId === 'b2') {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log('⚠️ <b>[Гололёд]</b> ставится на <b>карте рейда</b>!');
        return;
      }
      if (ctx.branchId === 'b1') {
        const retMult = Number(C.interpNodes(ctx.lvl, this.cfg.shellRet).toFixed(2));
        const spdCut = Number(C.interpNodes(ctx.lvl, this.cfg.shellSpd).toFixed(2));
        const tickMana = C.getFixedManaCost(ctx.p, ctx.item, this.getManaPct('b1', ctx.lvl));
        const wasOn = Boolean(ctx.p.iceShell && ctx.p.iceShell.active);
        ctx.p.iceShell = { active: !wasOn, retMult, spdCut, tickMana };
        if (!wasOn) {
          ctx.popPlayer(`❄️ Ледяной панцирь (${Math.round(retMult * 100)}%)`);
          ctx.log(`❄️ <b>[Ледяной панцирь]</b> включён: урон <b>-50%</b>, ответный холод <b>${Math.round(retMult * 100)}%</b> (фикс. ${tickMana} маны/раунд)!`);
        } else {
          ctx.popPlayer('❄️ Панцирь выкл.');
          ctx.log('❄️ <b>[Ледяной панцирь]</b> отключён.');
        }
        return;
      }
      const maxVolleys = Math.round(C.interpNodes(ctx.lvl, this.cfg.volleys));
      if (ctx.item && ctx.item.maxCharges !== maxVolleys) {
        const spent = Math.max(0, (ctx.item.maxCharges || 1) - (ctx.item.charges || 0));
        ctx.item.maxCharges = maxVolleys;
        ctx.item.charges = Math.max(0, maxVolleys - spent);
      }
      const maxTrg = Math.round(C.interpNodes(ctx.lvl, this.cfg.targets));
      const mult = Number(C.interpNodes(ctx.lvl, this.cfg.dmgMult).toFixed(2));
      const frostCut = Number(C.interpNodes(ctx.lvl, this.cfg.frostCut).toFixed(2));
      const freezeCh = Number(C.interpNodes(ctx.lvl, this.cfg.freezeCh).toFixed(2));
      const baseIce = Math.max(8, Math.round((11 + (ctx.p.stats.int || 10) * 0.55 + (ctx.p.stats.spi || 10) * 0.4) * mult * ctx.intMult));

      ctx.alive.slice(0, maxTrg).forEach(en => {
        const wasFrosted = Boolean(en.frostbite && en.frostbite.rounds > 0);
        en.frostbite = { rounds: 2, cut: frostCut };
        en.debuff = Math.max(en.debuff || 0, 2);
        if (wasFrosted && Math.random() < freezeCh) {
          en.stun = Math.max(en.stun || 0, 1);
          ctx.dealDamage(en, baseIce, `🧊 ЗАМОРОЗКА 1р (-${baseIce})`);
        } else {
          ctx.dealDamage(en, baseIce, `❄️ -${baseIce} (Обморожение)`);
        }
      });
      ctx.log(`❄️ <b>[Ледяной шквал]</b> (${Math.round(mult * 100)}%, целей: ${Math.min(maxTrg, ctx.alive.length)}/${maxTrg}): крио-урон <b>-${baseIce}</b>!`);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 11: ДАРЫ 14–15 ЗАРАЖЁННОГО (ВАЙШНАВИЗМ И ГИГАНТИЗМ)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // 14. ПРИСТУП ВАЙШНАВИЗМА
  C.registerDar('vaishnavism', {
    pool: 'infected', name: 'Приступ вайшнавизма', type: 'passive', mana1: 0, mana30: 0,
    cfg: {
      krishnaCh:    Array.of(Array.of(1, 0.50), Array.of(30, 1.0)),
      krishnaPets:  Array.of(Array.of(1, 1), Array.of(30, 3)),
      krishnaMana:  Array.of(Array.of(1, 50), Array.of(30, 10)),
      humanCh:      Array.of(Array.of(1, 0.50), Array.of(30, 0.90)),
      beastBuff:    Array.of(Array.of(1, 1.10), Array.of(30, 1.40)),
      humanMana:    Array.of(Array.of(1, 40), Array.of(30, 10)),
      foresightRes: Array.of(Array.of(1, 0.40), Array.of(30, 0.80)),
      foresightMana:Array.of(Array.of(1, 10), Array.of(30, 1))
    },
    desc: 'База (пассив): отказ от плоти (осмотр туш 50%->90%), человеческая еда даёт x2 сытости и +Инт/Дух, доступ к холодному оружию (с 1 ур.) и огнестрелу (с 15 ур.). Ветки: Харе Кришна, Человеческая суть, Нечеловеческая предусмотрительность.',
    branches: Array.of(
      { id: 'b1', name: 'Харе Кришна, чувак!', type: 'active', mode: 'both', mana1: 50, mana30: 10, desc: 'Подчиняет гуманоида <= равного ранга (50%->100%, макс. 1->3 питомца; 1/3 споранов на храм).' },
      { id: 'b2', name: 'Человеческая суть', type: 'active', mode: 'battle', mana1: 40, mana30: 10, desc: 'Бой (без атаки): 50%->90% запустить случайный боевой Дар человека, иначе «Звериная ярость» (+10%->+40%).' },
      { id: 'b3', name: 'Нечеловеческая предусмотрительность', type: 'active', mode: 'both', mana1: 10, mana30: 1, desc: 'Устойчивость к дебаффам и контролю 40% -> 80% (10% -> 1% фикс. маны/раунд).' }
    ),
    getManaPct(b, l) {
      if (b === 'b1') return Math.round(C.interpNodes(l, this.cfg.krishnaMana));
      if (b === 'b2') return Math.round(C.interpNodes(l, this.cfg.humanMana));
      if (b === 'b3') return Math.round(C.interpNodes(l, this.cfg.foresightMana));
      return 0;
    },
    async execute(ctx) {
      if (ctx.branchId === 'b1') {
        const trg = ctx.alive.at(0);
        if (!trg) return;
        const baseCh = C.interpNodes(ctx.lvl, this.cfg.krishnaCh);
        const diff = (trg.rank || 0) - (ctx.p.rank || 0);
        const ch = Math.max(0.05, Math.min(0.98, baseCh - diff * 0.25));
        if (Math.random() < ch) {
          trg.charmedAlly = true;
          trg.krishnaConvert = true;
          ctx.popEnemy(trg, '🕉️ ХАРЕ КРИШНА! (СВОЙ)');
          ctx.log(`🕉️ <b>[Харе Кришна, чувак!]</b> (${Math.round(ch * 100)}%): <b>${trg.name}</b> просветлел, бьёт врагов и жертвует 1/3 споранов на храм!`);
        } else {
          ctx.popEnemy(trg, '😒 Не уверовал');
          ctx.log(`🕉️ <b>[Харе Кришна, чувак!]</b> (${Math.round(ch * 100)}%): проповедь не проняла <b>${trg.name}</b>.`);
        }
        return;
      }

      if (ctx.branchId === 'b2') {
        const ch = C.interpNodes(ctx.lvl, this.cfg.humanCh);
        if (Math.random() < ch) {
          const pool = Array.of('fire_master', 'ice_master', 'sonic', 'illusionist');
          const pick = pool.at(Math.floor(Math.random() * pool.length));
          ctx.log(`✨ <b>[Человеческая суть]</b> (${Math.round(ch * 100)}%): вспышка памяти пробудила Дар «<b>${C.DARS[pick].name}</b>» (мощь ${Math.round(ch * 100)}%)!`);
          const subCtx = Object.assign({}, ctx, { branchId: '', intMult: ctx.intMult * ch, title: C.DARS[pick].name });
          await C.DARS[pick].execute(subCtx);
        } else {
          const fury = Number(C.interpNodes(ctx.lvl, this.cfg.beastBuff).toFixed(2));
          ctx.p.beastFuryMult = Math.max(ctx.p.beastFuryMult || 1, fury);
          ctx.p.buff = Math.max(ctx.p.buff || 1, fury);
          ctx.popPlayer(`🐺 Звериная ярость (×${fury})`);
          ctx.log(`🐺 <b>[Человеческая суть -> Звериная ярость]</b>: человеческий навык сорвался, но статы и урон выросли до <b>×${fury}</b> до конца боя!`);
        }
        return;
      }

      if (ctx.branchId === 'b3') {
        const res = Number(C.interpNodes(ctx.lvl, this.cfg.foresightRes).toFixed(2));
        const tickMana = C.getFixedManaCost(ctx.p, ctx.item, this.getManaPct('b3', ctx.lvl));
        const wasOn = Boolean(ctx.p.foresightAura && ctx.p.foresightAura.active);
        ctx.p.foresightAura = { active: !wasOn, res, tickMana };
        ctx.popPlayer(wasOn ? '🕉️ Аура выкл.' : `🕉️ Анти-контроль ${Math.round(res * 100)}%`);
        ctx.log(wasOn ? '🕉️ <b>[Предусмотрительность]</b> отключена.' : `🕉️ <b>[Нечеловеческая предусмотрительность]</b>: устойчивость к дебаффам/контролю <b>${Math.round(res * 100)}%</b> (фикс. ${tickMana} маны/раунд)!`);
      }
    }
  });

  // 15. ГИГАНТИЗМ
  C.registerDar('gigantism', {
    pool: 'infected', name: 'Гигантизм', type: 'passive', mana1: 0, mana30: 0,
    unlocksArmor: true,
    cfg: {
      mutMult:    Array.of(Array.of(1, 2.0), Array.of(30, 4.0)),
      tankMana:   Array.of(Array.of(1, 25), Array.of(30, 5)),
      biteMult:   Array.of(Array.of(1, 1.5), Array.of(30, 3.0)),
      biteHeal:   Array.of(Array.of(1, 0.10), Array.of(30, 0.50)),
      biteUses:   Array.of(Array.of(1, 1), Array.of(15, 2), Array.of(30, 2)),
      biteMana:   Array.of(Array.of(1, 50), Array.of(30, 10)),
      regenPct:   Array.of(Array.of(1, 0.05), Array.of(30, 0.25)),
      regenTurns: Array.of(Array.of(1, 2), Array.of(30, 6)),
      regenMana:  Array.of(Array.of(1, 50), Array.of(30, 10))
    },
    desc: 'База (пассив): разблокирует ношение брони для Заражённого + 50% шанс перебросить прирост любого стата в Силу/Выносливость x2 -> x4. Ветки: Танк (Гигант), Голод гиганта, Чудовищная регенерация.',
    branches: Array.of(
      { id: 'b1', name: 'Танк (Гигант)', type: 'trigger', mana1: 25, mana30: 5, desc: 'Триггер: поглощает удар, пробивший защиту, за 25% -> 5% фикс. маны.' },
      { id: 'b2', name: 'Голод гиганта', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой (1->2/бой): 150% -> 300% урона от чистых статов; убийство съедает цель (+10%->+50% ОЗ).' },
      { id: 'b3', name: 'Чудовищная регенерация', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой: восстанавливает 5% -> 25% макс. ОЗ за каждый раунд (2 -> 6 раундов).' }
    ),
    getManaPct(b, l) {
      if (b === 'b1') return Math.round(C.interpNodes(l, this.cfg.tankMana));
      if (b === 'b2') return Math.round(C.interpNodes(l, this.cfg.biteMana));
      if (b === 'b3') return Math.round(C.interpNodes(l, this.cfg.regenMana));
      return 0;
    },
    execute(ctx) {
      if (ctx.branchId === 'b1') {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log('🦍 <b>[Танк (Гигант)]</b> срабатывает автоматически при получении урона, пока есть мана!');
        return;
      }
      if (ctx.branchId === 'b3') {
        const pct = Number(C.interpNodes(ctx.lvl, this.cfg.regenPct).toFixed(2));
        const turns = Math.round(C.interpNodes(ctx.lvl, this.cfg.regenTurns));
        ctx.p.giantRegen = { pct, rounds: turns };
        ctx.popPlayer(`🧬 Реген ${Math.round(pct * 100)}%/р (${turns}р)`);
        ctx.log(`🦍 <b>[Чудовищная регенерация]</b>: восстановление <b>${Math.round(pct * 100)}% ОЗ</b> каждый раунд в течение <b>${turns} р.</b>!`);
        return;
      }
      const uses = Math.round(C.interpNodes(ctx.lvl, this.cfg.biteUses));
      if (ctx.item && ctx.item.maxCharges !== uses) {
        const spent = Math.max(0, (ctx.item.maxCharges || 1) - (ctx.item.charges || 0));
        ctx.item.maxCharges = uses;
        ctx.item.charges = Math.max(0, uses - spent);
      }
      const trg = ctx.alive.at(0);
      if (!trg) return;
      const mult = Number(C.interpNodes(ctx.lvl, this.cfg.biteMult).toFixed(2));
      const flatBase = ((ctx.p.stats.str || 14) + (ctx.p.stats.end || 14) * 0.5) * (C.BALANCE.skillFlatScale || 1.0) * (ctx.p.buff || 1);
      const dmg = Math.max(8, Math.round(flatBase * mult));
      ctx.dealDamage(trg, dmg, `🦷 ГОЛОД -${dmg}`);
      if (trg.dead) {
        const healPct = Number(C.interpNodes(ctx.lvl, this.cfg.biteHeal).toFixed(2));
        const heal = Math.max(5, Math.round(ctx.p.maxHp * healPct));
        ctx.p.hp = Math.min(ctx.p.maxHp, ctx.p.hp + heal);
        ctx.popPlayer(`🥩 Съел! +${heal} ОЗ`);
        ctx.log(`🦍 <b>[Голод гиганта]</b>: <b>${trg.name}</b> сожран заживо (-${dmg}) -> восстановлено <b>+${heal} ОЗ</b>!`);
      } else {
        ctx.log(`🦍 <b>[Голод гиганта]</b> (${Math.round(mult * 100)}%): мощный укус по <b>${trg.name}</b> на <b>-${dmg}</b>!`);
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 12: ДАР 16 (ДИТЯ УЛЬЯ) И ХОЛОДНОЕ ОРУЖИЕ Р1-Р5
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // 16. ДИТЯ УЛЬЯ
  C.registerDar('hive_child', {
    pool: 'infected', name: 'Дитя Улья', type: 'passive', mana1: 0, mana30: 0,
    unlocksClothes: true,
    cfg: {
      packSize:   Array.of(Array.of(1, 1), Array.of(30, 10)),
      tameChance: Array.of(Array.of(1, 0.50), Array.of(30, 0.75)),
      maskMana:   Array.of(Array.of(1, 40), Array.of(30, 10)),
      nativeMana: Array.of(Array.of(1, 30), Array.of(30, 5)),
      terrorRad:  Array.of(Array.of(1, 3), Array.of(30, 6)),
      terrorCh:   Array.of(Array.of(1, 0.20), Array.of(30, 0.50)),
      terrorMana: Array.of(Array.of(1, 50), Array.of(30, 10))
    },
    desc: 'База (пассив): разблокирует одежду для Заражённого + вербовка заражённых ниже на 1 ранг (50% -> 75% на капе), стая 1->10 (в бою до 5 сильнейших). Ветки: Активная маскировка, Родная среда, Аура ужаса.',
    branches: Array.of(
      { id: 'b1', name: 'Активная маскировка', type: 'active', mode: 'map', mana1: 40, mana30: 10, desc: 'Карта: Улей прячет хозяина (Скрыт), стая видима; удар исподтишка 200% в 1-м раунде.' },
      { id: 'b2', name: 'Родная среда', type: 'active', mode: 'map', mana1: 30, mana30: 5, desc: 'Карта: проход сквозь препятствия за x2 ОХ -> 1 ОХ на Ур.30+ и скрытие внутри препятствия.' },
      { id: 'b3', name: 'Аура ужаса', type: 'active', mode: 'both', mana1: 50, mana30: 10, desc: 'Карта/бой (3->6 кл.): 20% -> 50% шанс ввергнуть врагов в транс (пропускают 1 атаку без ответа).' }
    ),
    getManaPct(b, l) {
      if (b === 'b1') return Math.round(C.interpNodes(l, this.cfg.maskMana));
      if (b === 'b2') return Math.round(C.interpNodes(l, this.cfg.nativeMana));
      if (b === 'b3') return Math.round(C.interpNodes(l, this.cfg.terrorMana));
      return 0;
    },
    execute(ctx) {
      if (ctx.branchId === 'b1' || ctx.branchId === 'b2') {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log(`⚠️ <b>[${ctx.title}]</b> включается на <b>карте рейда</b>! В бою запускай «Ауру ужаса».`);
        return;
      }
      const ch = Number(C.interpNodes(ctx.lvl, this.cfg.terrorCh).toFixed(2));
      let entranced = 0;
      ctx.alive.forEach(en => {
        if (Math.random() < ch) {
          en.stun = Math.max(en.stun || 0, 1);
          en.hiveTrance = true;
          entranced++;
          ctx.popEnemy(en, '😱 ТРАНС УЛЬЯ (БЕЗ ОТВЕТА)');
        } else {
          ctx.popEnemy(en, '😒 Сопротивление');
        }
      });
      ctx.log(`☣️ <b>[Аура ужаса]</b> (${Math.round(ch * 100)}%): врагов в трансе: <b>${entranced}</b> — они пропускают атаку без ответа!`);
    }
  });

  // ХОЛОДНОЕ ОРУЖИЕ РАНГОВ Р1-Р5
  C.ITEMS.meleeWeapons = Array.of(
    { id: 'ml_r1_knife',  n: '🔪 Охотничий нож',          cat: 'melee', slot: 'melee', rank: 1, a: 9,   w: 0.5, desc: 'Надёжный клинок 1-го ранга для ближнего боя.' },
    { id: 'ml_r2_axe',    n: '🪓 Пожарный топор',         cat: 'melee', slot: 'melee', rank: 2, a: 20,  w: 2.1, desc: 'Тяжёлый топор 2-го ранга — проламывает хитин в упор.' },
    { id: 'ml_r3_titaxe', n: '🪓 Титановый топор лесоруба',cat: 'melee', slot: 'melee', rank: 3, a: 38,  w: 1.9, desc: 'Сбалансированный топор 3-го ранга с высокой пробивной силой.' },
    { id: 'ml_r4_ruber',  n: '⚔️ Мачете из кости Рубера', cat: 'melee', slot: 'melee', rank: 4, a: 75,  w: 2.4, desc: 'Клинок 4-го ранга из панциря Рубера — мощнее штурмовых винтовок.' },
    { id: 'ml_r5_scrub',  n: '🗡️ Клинок Скреббера',       cat: 'melee', slot: 'melee', rank: 5, a: 135, w: 2.8, desc: 'Абсолютное холодное оружие 5-го ранга из когтя Скреббера.' }
  );
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 13: 17 ИНДИВИДУАЛЬНЫХ И 7 ОБЩИХ АМУЛЕТОВ ПОЗОРА
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.ITEMS.shameAmulets = Array.of(
    { id: 'am_surgeon', req: 'surgeon', n: '🤡 Игрушечный стетоскоп «Доктор Плюшева»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spi: -1, w: 0.2, trig: 'atk', desc: 'Розовый пластиковый стетоскоп с мигающим сердечком.', log: 'Хирург прикладывает розовый пластиковый стетоскоп к груди мутанта и ставит диагноз «воспаление хитрости». Тварь впадает в ступор!' },
    { id: 'am_asiat', req: 'asiat', n: '👞 Связанные шнурками клоунские ботинки 59-го размера', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spi: -1, w: 0.9, trig: 'start', desc: 'Два огромных красно-жёлтых башмака на крепком шнурке.', log: 'Азиат раскручивает гигантские башмаки как нунчаки, но один прилетает ему же по лбу. Мутанты складываются пополам от дикого ржача!' },
    { id: 'am_schoolgirl', req: 'schoolgirl', n: '🍼 Рюкзачок с говорящим хомяком-повторюшкой', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spi: -1, w: 0.3, trig: 'hit', desc: 'Плюшевый грызун на лямке, записывающий любой рык.', log: 'Хомяк пискляво передразнивает рык мутанта. Тварь замирает и начинает неуверенно ощупывать собственную пасть!' },
    { id: 'am_nanny', req: 'nanny', n: '📣 Свисток физрука на радужном шнурке', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spi: -1, w: 0.1, trig: 'start', desc: 'Оглушительный пластиковый свисток кислотного цвета.', log: 'Воспитательница оглушительно свистит и грозит пальцем: «А ну марш в угол!». Даже элитник Улья вжимает голову в плечи!' },
    { id: 'am_alkash', req: 'alkash', n: '🪣 Пластиковое ведро-шапка «Король похмелья»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, d: 2, spi: -1, w: 0.4, trig: 'atk', desc: 'Синее строительное ведро с прорезями для глаз.', log: 'Алкаш бьёт себя кулаком по ведру на голове — гулкий звон резонирует с перегаром, пробуждая древнюю ярость берсерка!' },
    { id: 'am_cashier', req: 'cashier', n: '🏷️ Бейдж «Стажёр — Пятый год без отпуска»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spi: -1, w: 0.1, trig: 'hit', desc: 'Засаленный пластиковый бейджик с выцветшей лентой.', log: 'Кассирша медленно поднимает пустой, мёртвый взгляд из-под бейджа. У мутанта стынет кровь в жилах от такой безысходности!' },
    { id: 'am_gigolo', req: 'gigolo', n: '🩲 Леопардовые стринги с хоботком «Аполлон»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spi: -2, w: 0.1, trig: 'start', desc: 'Эксклюзивное бельё с встроенной пищалкой.', log: 'Жиголо эффектно распахивает полы плаща, демонстрируя трофейный леопард с пищащим хоботком. Мутанты замирают с отвисшими челюстями!' },
    { id: 'am_tatan', req: 'tatan', n: '👡 Резиновый тапок «Прощай, молодость» на верёвочке', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spi: -1, w: 0.3, trig: 'hit', desc: 'Ортопедический тапок на резинке от трусов.', log: 'Удар сбивает с Татани любимый тапок! С диким рыком «ТЫ МНЕ ЕГО ТОЛЬКО ПОРВИ!» она обрушивает на врага всю мощь разъярённой фурии!' },
    { id: 'am_prof', req: 'prof', n: '🎓 Шапочка из фольги «Академик Улья»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, int: 1, spi: -2, w: 0.1, trig: 'atk', desc: 'Многослойная конструкция из пищевой фольги с антенной.', log: 'Профессор поправляет антенну на фольге и зачитывает мутанту лекцию о квантовой природе спорового распада. Мозг твари уходит в перезагрузку!' },
    { id: 'am_psih', req: 'psih', n: '🧸 Плюшевый мишка с оторванным ухом «Доктор Фрейд»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spi: -1, w: 0.3, trig: 'start', desc: 'Потрёпанный медведь для следственных экспериментов.', log: 'Психолог протягивает мутанту потрёпанного медведя и ледяным тоном спрашивает: «Расскажи, где тётя трогала?». Тварь в ужасе пятится!' },
    { id: 'am_strip', req: 'strip', n: '🪠 Вантуз со стразами «Шест на выезд»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, agi: 1, spi: -2, w: 0.5, trig: 'atk', desc: 'Сантехнический вантуз, щедро уклеенный стразами.', log: 'Стриптизёрша с чпоком приклеивает блестящий вантуз к асфальту и исполняет вокруг него зажигательный пируэт. Мутант забывает, зачем нападал!' },
    { id: 'am_vet', req: 'vet', n: '🐕 Елизаветинский воротник «Конус стыда»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, d: 2, spi: -2, w: 0.4, trig: 'hit', desc: 'Прозрачный ветеринарный раструб на завязках.', log: 'Ветеринар застревает конусом в дверном проёме, озверевает от собственного позора и бросается в яростную контратаку!' },
    { id: 'am_kachok', req: 'kachok', n: '🦄 Гигантский «ЭТОТ САМЫЙ» на присоске (на лоб)', cat: 'talisman', slot: 'talisman', shame: true, rank: 3, str: 2, spi: -3, w: 0.6, trig: 'hit', desc: 'Упругий силиконовый таран на мощной вакуумной присоске.', log: 'Приклеенный ко лбу качка гигантский «ЭТОТ САМЫЙ» на присоске при замахе врага пружинит и бьёт атакующего прямо в глаз! Враг ослеплён и оглушён!' },
    { id: 'am_infected', req: 'infected', n: '🚽 Ободок от унитаза на шее (трофей Улья)', cat: 'talisman', slot: 'talisman', shame: true, rank: 3, d: 3, spi: -2, w: 1.2, trig: 'start', desc: 'Фаянсовое сиденье с крышкой, намертво севшее на плечи.', log: 'Заражённый грозно клацает челюстями сквозь фаянсовый ободок на шее. Вид «коронованного» мутанта вызывает у противников нервный тик!' },
    { id: 'am_kvaz', req: 'kvaz', n: '🍾 Тройной одеколон «Эликсир 1982»', cat: 'talisman', slot: 'talisman', shame: true, rank: 3, end: 2, spi: -2, w: 0.4, trig: 'atk', desc: 'Гранёный флакон выдержанного парфюма эпохи застоя.', log: 'Кваз случайно разбивает пузырёк на своей могучей груди — выдержанное облако спирта и хвои накрывает арену. Враг лупит вслепую, утирая едкие слёзы!' },
    { id: 'am_leg_m', req: 'legend_m', n: '🏋️ Легендарный эспандер Кегеля «Стальной хват»', cat: 'talisman', slot: 'talisman', shame: true, rank: 4, str: 4, spi: -3, w: 0.7, trig: 'start', desc: 'Титановый тренажёр с тугой пружиной от танка.', log: 'Легендарный воин с суровым лицом сжимает титановый тренажёр с лязгом капкана. Самый матёрый враг понимает, что с этим психом лучше не связываться!' },
    { id: 'am_leg_f', req: 'legend_f', n: '👑 Легендарный страпон «Власть матриарха»', cat: 'talisman', slot: 'talisman', shame: true, rank: 4, str: 4, spi: -3, w: 0.8, trig: 'start', desc: 'Армированный кожаный трофей с заклёпками из титана.', log: 'Легендарная воительница с суровым видом поправляет ремни и угрожающе потрясает «трофеем» старого мира. Самый матёрый враг мгновенно теряет боевой дух!' }
  );

  C.ITEMS.commonShame = Array.of(
    { id: 'sh_colander', n: '🤡 Дуршлаг «Защита от 5G»', cat: 'talisman', slot: 'talisman', shame: true, rank: 1, d: 1, spi: -1, w: 0.4, desc: 'Дырявый алюминиевый дуршлаг на ремешке (+1 защита, -1 Дух).' },
    { id: 'sh_panties', n: '🩲 Кружевные труселя СТИКСа', cat: 'talisman', slot: 'talisman', shame: true, rank: 1, agi: 1, spi: -2, w: 0.1, desc: 'Трофей из забытого чемодана (+1 Ловкость, -2 Дух).' },
    { id: 'sh_ears', n: '🐰 Ободок с розовыми ушками', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, spd: 2, spi: -2, w: 0.2, desc: 'Плюшевые ушки зайчика (+2 Скорость, -2 Дух).' },
    { id: 'sh_duck', n: '🦆 Надувной круг «Уточка»', cat: 'talisman', slot: 'talisman', shame: true, rank: 2, d: 4, agi: -1, w: 0.6, desc: 'Ярко-жёлтый детский круг на поясе (+4 защита, -1 Ловкость).' },
    { id: 'sh_bib', n: '🍼 Слюнявчик «Мамин пирожок»', cat: 'talisman', slot: 'talisman', shame: true, rank: 3, end: 3, spi: -3, w: 0.2, desc: 'Клеёнчатый нагрудник с мишкой (+3 Выносливость, -3 Дух).' },
    { id: 'sh_collar', n: '🔔 Ошейник с бубенчиком', cat: 'talisman', slot: 'talisman', shame: true, rank: 3, str: 4, spi: -3, w: 0.3, desc: 'Звенит при каждом шаге (+4 Сила, -3 Дух).' },
    { id: 'sh_crown', n: '👑 Корона из фольги «Царь Пекла»', cat: 'talisman', slot: 'talisman', shame: true, rank: 4, str: 5, end: 5, spi: -5, w: 0.3, desc: 'Мятая фольга на голове (+5 Сила, +5 Выносливость, -5 Дух).' }
  );
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 14 (ФИНАЛ): ИСПОЛНИТЕЛЬ ДАРОВ И МОСТ СИНХРОНИЗАЦИИ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE;
    const UI = global.BSIM_UI;
    const AUD = global.BSIM_AUDIO;
    const st = CORE && CORE.state;
    if (!st || st.busy || st.finished || !st.player || !st.player.learned.at(idx)) return false;

    const p = st.player, item = p.learned.at(idx);
    const dar = this.DARS[item.darKey];
    if (!dar || typeof dar.execute !== 'function' || item.usedRound) return false;

    if (!this.hasOwnChargeLimit(item.darKey, item.branchId)) {
      item.maxCharges = 0;
      item.charges = 0;
    }

    p._roundSlots = p._roundSlots || { atk: false, def: false };
    const slotKind = this.getDarSlotKind(item.darKey, item.branchId);
    if (p._roundSlots[slotKind]) {
      const lbl = slotKind === 'def' ? '🛡 защитный' : '⚔️ атакующий';
      if (UI) UI.log(`⛔ В этом раунде уже использован 1 <b>${lbl}</b> Дар! Жди следующего хода.`);
      return true;
    }

    const br = item.branchId ? (dar.branches || []).find(b => b.id === item.branchId) : null;
    const title = br ? br.name : dar.name;

    if (item.maxCharges > 0 && item.charges <= 0) {
      if (UI) UI.log(`❌ Заряды Дара <b>[${title}]</b> исчерпаны!`);
      return true;
    }

    const pct = typeof dar.getManaPct === 'function'
      ? dar.getManaPct(item.branchId, item.lvl)
      : CORE.calcMana(br ? br.mana1 : dar.mana1, br ? br.mana30 : dar.mana30, item.lvl);
    const cost = this.getFixedManaCost(p, item, pct);

    if (p.mana < cost) {
      if (UI) UI.log(`❌ Не хватает маны на <b>[${title}]</b> (нужно ${cost}).`);
      return true;
    }

    st.busy = true;
    st.activeId = 'u-player';
    p.mana -= cost;
    if (p.heroRef) p.heroRef.mana = p.mana;
    item.usedRound = true;
    if (item.maxCharges > 0) item.charges--;
    p._roundSlots[slotKind] = true;
    CORE.grantCombatXp('spi', 1);

    if (AUD) AUD.playSfx('dar');
    if (UI) {
      UI.showSkillBanner('🧬', `${title} (Ур.${item.lvl})`, 'Активация Дара Улья!');
      if (UI.renderStage) UI.renderStage();
      else if (UI.renderBattle) UI.renderBattle();
    }

    const B = this.BALANCE;
    const intBonus = 1 + Math.floor((p.stats.int || 10) / B.darIntBonusStep) * B.darIntBonusPct;
    const ctx = {
      p, st, dar, br, item, title, cost,
      lvl: item.lvl,
      branchId: item.branchId || '',
      enemies: st.enemies,
      alive: st.enemies.filter(e => !e.dead),
      intMult: intBonus,
      wait: UI ? UI.wait.bind(UI) : () => Promise.resolve(),
      log: UI ? UI.log.bind(UI) : () => {},
      popPlayer: (txt) => UI && UI.popBack('u-player', true, txt, 'float-skill'),
      popEnemy: (en, txt) => UI && UI.popBack('u-' + en.id, false, txt, 'float-crit'),
      dealDamage(en, rawDmg, popTxt) {
        const d = Math.max(1, Math.round(rawDmg));
        if (st.mode === 'sandbox') {
          en.hp = Math.max(1, (en.hp || 10) - d);
        } else {
          en.hp = Math.max(0, (en.hp || 10) - d);
          if (en.hp <= 0) en.dead = true;
        }
        if (popTxt && UI) UI.popBack('u-' + en.id, false, popTxt + (en.dead ? ' 💀' : ''), 'float-crit');
      }
    };

    await dar.execute(ctx);
    st.activeId = '';
    st.busy = false;
    if (UI) {
      if (UI.renderStage) UI.renderStage();
      else if (UI.renderBattle) UI.renderBattle();
      if (UI.checkBattleEnd) UI.checkBattleEnd();
    }
    return true;
  };

  C.ITEMS.weapons = Array.of(
    { n: '🔫 Пистолет ПМ', cat: 'side', slot: 'side', rank: 1, a: 7, cal: '9mm', w: 0.8 },
    { n: '🔫 Обрез двустволки', cat: 'side', slot: 'side', rank: 1, a: 9, cal: '12g', w: 2.1 },
    { n: '🔫 Дробовик МР-153', cat: 'weapon', slot: 'main', rank: 2, a: 18, cal: '12g', w: 3.4 },
    { n: '🔫 Автомат АК-74', cat: 'weapon', slot: 'main', rank: 2, a: 20, cal: '545', w: 3.6 },
    { n: '🔭 Оптический прицел ПСО-1', cat: 'mod', slot: 'mod', rank: 2, a: 3, w: 0.6 },
    { n: '🧪 Яд для клинка «Гюрза»', cat: 'meleeMod', slot: 'meleeMod', rank: 2, poison: 4, w: 0.2 },
    { n: '🔫 Снайперская винтовка СВД', cat: 'weapon', slot: 'main', rank: 3, a: 36, cal: '762', w: 4.3 },
    { n: '🔫 ВСС Винторез', cat: 'weapon', slot: 'main', rank: 3, a: 32, cal: '762', w: 2.6 },
    { n: '🔫 Пулемёт ПКМ «Печенег»', cat: 'weapon', slot: 'main', rank: 3, a: 42, cal: '762', w: 8.2 },
    { n: '🔫 Автомат АШ-12 (12.7 мм)', cat: 'weapon', slot: 'main', rank: 4, a: 78, cal: '12g', w: 5.5 },
    { n: '⚡ Импульсная винтовка Внешников', cat: 'weapon', slot: 'main', rank: 5, a: 150, cal: '762', w: 4.8 }
  );

  C.ITEMS.armor = Array.of(
    { n: '🧥 Косуха рейдера', cat: 'armor', slot: 'armor', rank: 1, cls: 1, d: 5, w: 3.5 },
    { n: '👕 Костюм «Горка-3»', cat: 'clothes', slot: 'clothes', rank: 1, d: 3, w: 1.8 },
    { n: '👢 Армейские берцы', cat: 'boots', slot: 'boots', rank: 1, d: 2, w: 1.2 },
    { n: '🛡️ Самодельный щит из дорожного знака', cat: 'armor', slot: 'side', rank: 1, d: 4, w: 2.8 },
    { n: '🎒 Городской рюкзак (+10 кг)', cat: 'bag', slot: 'bag', rank: 1, bag: 10, w: 0.8 },
    { n: '🛡️ Бронежилет 6Б23-1 (2 кл.)', cat: 'armor', slot: 'armor', rank: 2, cls: 2, d: 15, w: 7.2 },
    { n: '🛡️ Полицейский щит «Витраж»', cat: 'armor', slot: 'side', rank: 2, d: 10, w: 4.5 },
    { n: '🎒 Тактический рюкзак (+18 кг)', cat: 'bag', slot: 'bag', rank: 2, bag: 18, w: 1.2 },
    { n: '🛡️ Бронежилет 6Б43 (3 кл.)', cat: 'armor', slot: 'armor', rank: 3, cls: 3, d: 30, w: 11.5 },
    { n: '🛡️ Тяжёлый бронекостюм «Алтын-М»', cat: 'armor', slot: 'armor', rank: 3, cls: 3, d: 34, w: 12.0 },
    { n: '🛡️ Штурмовой бронещит «Вант-ВМ»', cat: 'armor', slot: 'side', rank: 3, d: 22, w: 8.5 },
    { n: '🎒 Рейдовый баул Улья (+28 кг)', cat: 'bag', slot: 'bag', rank: 3, bag: 28, w: 1.6 },
    { n: '🛡️ Экзоскелет «Монолит-4»', cat: 'armor', slot: 'armor', rank: 4, cls: 4, d: 65, bag: 20, w: 14.5 },
    { n: '🛡️ Баллистический щит «Крепость»', cat: 'armor', slot: 'side', rank: 4, d: 45, w: 9.5 },
    { n: '🎒 Экспедиционный баул Внешников (+45 кг)', cat: 'bag', slot: 'bag', rank: 4, bag: 45, w: 1.8 },
    { n: '🛡️ Броня Внешников «Эгида-5»', cat: 'armor', slot: 'armor', rank: 5, cls: 5, d: 120, w: 11.0 },
    { n: '🎒 Грави-ранец Улья (+70 кг)', cat: 'bag', slot: 'bag', rank: 5, bag: 70, w: 1.5 }
  );

  C.ITEMS.supply = Array.of(
    { n: '🩹 Индивидуальный перевязочный пакет', cat: 'med', rank: 1, heal: 22, w: 0.15 },
    { n: '💊 Походная аптечка', cat: 'med', rank: 1, heal: 35, w: 0.4 },
    { n: '💧 Бутылка чистой воды', cat: 'supply', slot: 'use', rank: 1, water: 25, w: 0.5 },
    { n: '💧 Армейская фляга с водой', cat: 'supply', slot: 'use', rank: 1, water: 35, stamina: 10, w: 0.6 },
    { n: '⚡ Энергетик «СТИКС-Драйв»', cat: 'supply', slot: 'use', rank: 1, water: 15, stamina: 30, w: 0.3 },
    { n: '🥫 Тушёнка говяжья', cat: 'supply', slot: 'use', rank: 1, food: 30, w: 0.4 },
    { n: '🍾 Чекушка водки (алкоголь)', cat: 'supply', slot: 'use', rank: 1, alcohol: true, spi: 3, w: 0.35 },
    { n: '💉 Тактическая аптечка IFAK', cat: 'med', rank: 2, heal: 75, stamina: 15, w: 0.6 },
    { n: '🍱 Армейский сухпаёк ИРП', cat: 'supply', slot: 'use', rank: 2, food: 45, water: 20, stamina: 15, w: 1.1 },
    { n: '🧪 Фляга медицинского спирта (алкоголь)', cat: 'supply', slot: 'use', rank: 2, alcohol: true, hp: 5, w: 0.3 },
    { n: '🧬 Инъектор «Регенератор-М»', cat: 'med', rank: 3, heal: 140, stamina: 30, w: 0.25 },
    { n: '🧪 Эликсир «Живая кровь Улья»', cat: 'med', rank: 4, heal: 260, stamina: 50, mana: 25, w: 0.3 },
    { n: '💎 Ампула «Феникс-5»', cat: 'med', rank: 5, heal: 500, stamina: 100, mana: 50, w: 0.2 }
  );

  C.CODEX = {
    photoFacts: {
      31: { text: 'Факт #31: Секретный протокол периметра Улья.', imgs: Array.of('img/Fact_31.jpg') },
      32: { text: 'Факт #32: Наблюдения за мутацией элитных кластеров.', imgs: Array.of('img/Fact_32.jpg') },
      33: { text: 'Нимфа — всего лишь один из даров. Однако мало кто скажет, что встреча с её обладательницей может закончиться чем-то хорошим.', imgs: Array.of('img/Fact_33.jpg', 'img/Fact_33-2.jpg') },
      34: { text: 'Факт #34: Хроники выживших в секторе Пекла.', imgs: Array.of('img/Fact_34.jpg') },
      69: { text: 'Считается, что квазы теряют гендерные отличия. Это происходит не всегда, однако это совсем не означает, что у них высокий шанс на успешную личную жизнь. Ну вы понимаете...', imgs: Array.of('img/Fact_69.jpg') }
    },
    ARCHIVE_TEXTS: Array.of(
      'Запись #01: Перезагрузка кластера всегда начинается с гула сирены и запаха озона.',
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
      'Запись #17: Чёрный жемчуг (25% Кваз / 5% Заражённый) будит рулетку Даров на +10 ур.',
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
    RULES_SECTIONS: Array.of(
      { title: '1. Правило фамилий и отряд', text: 'В рейд (от 1 до 5 бойцов) от каждой фамилии может выйти только один персонаж. Ветераны (от 1 ур. или 1 рейда) получают доступ в Поселение/Гнездо и Лавку.' },
      { title: '2. Карта 60×60 и очки хода (ОХ)', text: 'База — 6 ОХ (+1 за каждые 50 Скорости). Внимательный шаг стоит 3 ОХ (видит засады), Быстрый — 2 ОХ, Бег — 1 ОХ (шумит на 3 клетки), Поиск — 3 ОХ, Сбор споранов — 1 ОХ.' },
      { title: '3. Споровый баланс и выживание', text: 'Каждый ход тратит споры, сытость и жажду. При балансе >75% регенерация ОЗ и маны удваивается. Восполняется настойкой «Живчик» (1 споран + алкоголь) или пожиранием тел.' },
      { title: '4. Бой 2d6 и смена оружия', text: 'Первый кубик d6 — число целей, второй — бонус урона. Дубли дают переброс; [1-1] — крит ×2; [6-6] — срыв атаки. Смена основного и холодного оружия стоит 0 ОХ.' },
      { title: '5. Дары Улья и фиксация маны', text: 'Дары делятся на Атакующие и Защитные (по 1 каждого типа за раунд боя). Стоимость маны фиксируется в момент пробуждения Дара.' },
      { title: '6. Мутации и Легендарный титул', text: 'Жемчуг и перебор Гороха могут обратить в Кваза или Заражённого. Белый жемчуг возвращает облик человека с сохранением множителей роста. 3 круга мутаций открывают статус Легендарного.' }
    )
  };

  C.applyToEngines = function() {
    if (global.STIKS) {
      global.STIKS.ARCHETYPES = Object.assign(global.STIKS.ARCHETYPES || {}, C.ARCHETYPES);
      global.STIKS.DARS = Object.assign(global.STIKS.DARS || {}, C.DARS);
      global.STIKS.ARCH_SHAME_AMULETS = C.ITEMS.shameAmulets;
      global.STIKS.SHAME_CARDS = C.ITEMS.commonShame;
    }
    if (global.STIKS_COMBAT_CORE) {
      global.STIKS_COMBAT_CORE.Z_RANKS = C.Z_RANKS;
    }
    if (global.BSIM_DATA) {
      global.BSIM_DATA.Z_RANKS = C.Z_RANKS;
      Object.assign(global.BSIM_DATA.ARCHETYPES, C.ARCHETYPES);
      Object.assign(global.BSIM_DATA.DARS, C.DARS);
    }
  };

  C.applyToEngines();
})(typeof window !== 'undefined' ? window : globalThis);
