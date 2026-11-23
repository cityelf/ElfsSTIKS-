// ============================================================================
// S-T-I-K-S // ЕДИНАЯ БАЗА КОНТЕНТА, БАЛАНСА И МЕХАНИК (stiks_content.js v2.0)
// ============================================================================
(function(global) {
  'use strict';

  const CONTENT = global.STIKS_CONTENT = {
    version: '2.0.0',

    // 1. ГЛОБАЛЬНЫЕ КОЭФФИЦИЕНТЫ БАЛАНСА (меняются в одном месте — работают везде)
    BALANCE: {
      baseHp: 14,              // Базовое ОЗ новичка (+ Выносливость * hpPerEnd)
      hpPerEnd: 1.35,          // Прирост ОЗ за 1 ед. Выносливости (убираем «стеклянность» на старте)
      kvazHpMult: 1.5,         // Множитель ОЗ Кваза
      baseMana: 15,            // Базовая Мана
      manaPerSpi: 2.2,         // Прирост Маны за 1 ед. Духа
      kvazManaMult: 0.6,       // Множитель Маны Кваза
      baseAp: 6,               // Базовые ОХ за ход
      spdPerBonusAp: 50,       // +1 ОХ за каждые 50 Скорости
      armorFlatMult: 1.2,      // Множитель плоской защиты брони
      enemyDmgMult: 0.85,      // Общий балансный множитель входящего урона врагов (чтобы не убивали как таракана)
      minDamageTaken: 1,       // Минимальный урон по бойцу при пробитии
      darIntBonusStep: 20,     // Каждые 20 Интеллекта дают +2% к эффективности Даров
      darIntBonusPct: 0.02
    },

    // 2. ТАБЛИЦА 10 РАНГОВ ЗАРАЖЁННЫХ + БОСС ПЕКЛА СКРЕББЕР
    Z_RANKS: [
      { r: 0, name: 'Ползун',     minLvl: 0,  maxLvl: 0,  hp: 12,  agi: 10,   dmg: 2,   img: 'img/Z_01.png', sound: 'Царап!', sfx: 'bite' },
      { r: 1, name: 'Медляк',     minLvl: 1,  maxLvl: 4,  hp: 36,  agi: 15,   dmg: 5,   img: 'img/Z_02.png', sound: 'Цап!',   sfx: 'bite' },
      { r: 2, name: 'Джампер',    minLvl: 5,  maxLvl: 10, hp: 76,  agi: 26,   dmg: 11,  img: 'img/Z_03.png', sound: 'Вжик!',  sfx: 'melee' },
      { r: 3, name: 'Бегун',      minLvl: 11, maxLvl: 20, hp: 140, agi: 52,   dmg: 22,  img: 'img/Z_04.png', sound: 'Кусь!',  sfx: 'bite' },
      { r: 4, name: 'Лотерейщик', minLvl: 21, maxLvl: 30, hp: 220, agi: 126,  dmg: 38,  img: 'img/Z_05.png', sound: 'Бум!',   sfx: 'gun' },
      { r: 5, name: 'Топтун',     minLvl: 31, maxLvl: 36, hp: 290, agi: 241,  dmg: 65,  img: 'img/Z_06.png', sound: 'БА-БАХ!',sfx: 'gun' },
      { r: 6, name: 'Кусач',      minLvl: 37, maxLvl: 40, hp: 330, agi: 358,  dmg: 108, img: 'img/Z_07.png', sound: 'ХРУСТЬ!',sfx: 'bite' },
      { r: 7, name: 'Рубер',      minLvl: 41, maxLvl: 49, hp: 380, agi: 596,  dmg: 170, img: 'img/Z_08.png', sound: 'РАЗРЫВ!',sfx: 'bite' },
      { r: 8, name: 'Элита',      minLvl: 50, maxLvl: 60, hp: 460, agi: 1468, dmg: 320, img: 'img/Z_09.png', sound: 'КРАШ!',  sfx: 'gun' },
      { r: 9, name: 'Суперэлита', minLvl: 61, maxLvl: 70, hp: 600, agi: 2563, dmg: 490, img: 'img/Z_10.png', sound: 'АННИГИЛЯЦИЯ!', sfx: 'crit' }
    ],

    ARCHETYPES: {},
    DARS: {},
    ITEMS: { weapons: [], armor: [], supply: [], shameAmulets: [] },

    // Реестр перезаписи модулей (1 Дар = 1 чистая замена без наслоений)
    registerDar(id, def) {
      this.DARS[id] = Object.assign({ id, branches: [] }, def);
    },

    calcScale(lvl, v1, v30, cap) {
      const maxL = cap || 30;
      const c = Math.max(1, Math.min(maxL, Number(lvl) || 1));
      if (c === 1) return v1;
      return Number((v1 + (v30 - v1) * ((c - 1) / Math.max(1, maxL - 1))).toFixed(2));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 2: 17 АРХЕТИПОВ И ФОРМ (СТАТЫ, МНОЖИТЕЛИ, НАВЫКИ)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  Object.assign(C.ARCHETYPES, {
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
    kvaz:       { name: 'Кваз (мутант Улья)', sex: 'both', img: 'img/Kvazm.jpg', imgM: 'img/Kvazm.jpg', imgF: 'img/Kvazf.jpg', ico: '👹', skill: 'Рёв Кваза', skillType: 'active', phrase: 'РРРРААААГХ! РАЗОРВУ!', stats: { str: 26, agi: 22, spd: 20, end: 26, int: 12, spi: 14 }, mult: { str: 2.5, agi: 2.5, spd: 2.5, end: 2.5, int: 1.5, spi: 1.5 }, hint: 'Тяжело дышит и сжимает мускулистые лапы.' },
    legend_m:   { name: '👑 Легендарный Воин Улья', sex: 'm', img: 'img/LM_battle.png', ico: '⚡', skill: 'Ужас Улья', skillType: 'active', phrase: 'Вот он — реальный ужас Улья!', stats: { str: 65, agi: 60, spd: 55, end: 65, int: 50, spi: 55 }, mult: { str: 2.5, agi: 2.5, spd: 2.5, end: 2.5, int: 2.0, spi: 2.0 } },
    legend_f:   { name: '👑 Легендарная Воительница Улья', sex: 'f', img: 'img/LG_battle.png', ico: '🔥', skill: 'Ужас Улья', skillType: 'active', phrase: 'Вот он — реальный ужас Улья!', stats: { str: 58, agi: 68, spd: 62, end: 58, int: 55, spi: 60 }, mult: { str: 2.5, agi: 2.5, spd: 2.5, end: 2.5, int: 2.0, spi: 2.0 } }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 3А: ДАРЫ 1–4 (КАМЕННАЯ КОЖА, ЗНАХАРЬ, КЛОКСТОПЕР, СКРЫТ)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('stone_skin', {
    pool: 'human', name: 'Каменная кожа', type: 'passive', mana1: 0, mana30: 0,
    cfg: { shield1: 1, shield30: 7, thorns1: 2.0, thorns30: 3.5 },
    desc: 'Пассивно: +1.0 -> +3.9 к рангу брони (+0.1 за уровень).',
    branches: [
      { id: 'b1', name: 'Временная неуязвимость', type: 'active', mana1: 50, mana30: 10, desc: 'Игнорирует 1 -> 7 входящих ударов.' },
      { id: 'b2', name: 'Отрядный щит', type: 'active', mana1: 60, mana30: 10, desc: 'Поглощает 1 -> 5 ударов по отряду и даёт +15 брони.' },
      { id: 'b3', name: 'Колючая стена', type: 'active', mana1: 50, mana30: 10, desc: 'Возвращает 200% -> 350% урона атакующему в ближнем бою.' }
    ],
    execute(ctx) {
      const hits = Math.round(C.calcScale(ctx.lvl, this.cfg.shield1, this.cfg.shield30));
      ctx.p.shieldHits = (ctx.p.shieldHits || 0) + hits;
      if (ctx.branchId === 'b3') ctx.p.thornsMult = C.calcScale(ctx.lvl, this.cfg.thorns1, this.cfg.thorns30);
      ctx.popPlayer(`🛡 Барьер +${hits} уд.`);
      ctx.log(`🛡 <b>[${ctx.title}]</b>: каменный панцирь поглотит <b>${hits}</b> входящих ударов!`);
    }
  });

  C.registerDar('healer', {
    pool: 'human', name: 'Знахарь', type: 'active', mana1: 40, mana30: 10,
    cfg: { healPct1: 0.25, healPct30: 1.0, buff1: 1.15, buff30: 1.50 },
    desc: 'Исцеляет себя на 25% -> 100% от макс. ОЗ.',
    branches: [
      { id: 'b1', name: 'Мастер усиления', type: 'active', mana1: 100, mana30: 10, desc: 'Усиливает атаку (+30%) и лечит 20% ОЗ.' },
      { id: 'b2', name: 'Ветка поддержки', type: 'active', mana1: 10, mana30: 2, desc: 'Повышает урон бойца на +15% -> +50% на следующий удар.' },
      { id: 'b3', name: 'Ветка любимчика', type: 'active', mana1: 40, mana30: 10, desc: 'Успокаивает 1 врага ниже рангом (стан на 2 раунда).' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b2') {
        const bVal = C.calcScale(ctx.lvl, this.cfg.buff1, this.cfg.buff30);
        ctx.p.buff = Math.max(ctx.p.buff || 1, bVal);
        ctx.popPlayer(`⚡ Урон ×${bVal}`);
        ctx.log(`🌿 <b>[Ветка поддержки]</b>: следующий удар усилен до <b>×${bVal}</b>!`);
        return;
      }
      if (ctx.branchId === 'b3' && ctx.alive.length) {
        const trg = ctx.alive;
        if (trg.rank <= ctx.p.rank) { trg.stun = Math.max(trg.stun || 0, 2); ctx.popEnemy(trg, '🐾 Укрощён (2р)'); }
        else { trg.debuff = Math.max(trg.debuff || 0, 2); ctx.popEnemy(trg, '⬇️ -25%'); }
        ctx.log(`🐾 <b>[Ветка любимчика]</b>: попытка укрощения <b>${trg.name}</b>!`);
        return;
      }
      const pct = C.calcScale(ctx.lvl, this.cfg.healPct1, this.cfg.healPct30);
      const heal = Math.max(5, Math.round(ctx.p.maxHp * pct));
      ctx.p.hp = Math.min(ctx.p.maxHp, ctx.p.hp + heal);
      if (ctx.branchId === 'b1') ctx.p.buff = Math.max(ctx.p.buff || 1, 1.3);
      ctx.popPlayer(`💚 +${heal} ОЗ`);
      ctx.log(`🌿 <b>[${ctx.title}]</b>: восстановлено <b>+${heal} ОЗ</b> (${ctx.p.hp}/${ctx.p.maxHp})!`);
    }
  });

  C.registerDar('clockstopper', {
    pool: 'human', name: 'Клокстопер', type: 'active', cap: 20, mana1: 100, mana30: 15,
    cfg: { knives1: 2, knives30: 8, knifeDmg1: 8, knifeDmg30: 26 },
    desc: 'Кап 20 ур.: мгновенная серия ударов без контрудара.',
    branches: [
      { id: 'b1', name: 'Ножи-ракеты', type: 'active', mana1: 45, mana30: 10, desc: 'Залп 2 -> 8 ножей по целям.' },
      { id: 'b2', name: 'Скачок без ОХ', type: 'active', mana1: 40, mana30: 10, desc: 'Отбрасывает врагов на +2 клетки дистанции.' },
      { id: 'b3', name: 'Сумасшедшее уклонение', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: +20% -> +80% к шансу уклонения.' },
      { id: 'b4', name: 'Избегание смерти', type: 'trigger', mana1: 50, mana30: 15, desc: 'Триггер: спасает от смерти (10% -> 40% ОЗ).' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b2') {
        ctx.alive.forEach(e => { e.dist = (e.dist || 0) + 2; ctx.popEnemy(e, '⏪ +2 дист.'); });
        ctx.log(`⏳ <b>[Скачок]</b>: дистанция до врагов увеличена на +2 шага!`);
        return;
      }
      const cnt = Math.round(C.calcScale(ctx.lvl, this.cfg.knives1, this.cfg.knives30, 20));
      const perHit = Math.round(C.calcScale(ctx.lvl, this.cfg.knifeDmg1, this.cfg.knifeDmg30, 20) * ctx.intMult);
      for (let i = 0; i < cnt; i++) {
        const cur = ctx.enemies.filter(e => !e.dead);
        if (!cur.length) break;
        const trg = cur[i % cur.length];
        ctx.dealDamage(trg, perHit, '🗡️ -' + perHit);
      }
      ctx.log(`⏳ <b>[${ctx.title}]</b>: ${cnt} быстрых ударов по ${perHit} урона (атака свободна)!`);
    }
  });

  C.registerDar('stealth', {
    pool: 'human', name: 'Скрыт', type: 'active', mana1: 50, mana30: 1,
    cfg: { dodgeHits1: 1, dodgeHits30: 4 },
    desc: 'Уходит в тень: враги теряют цель на 1 -> 4 атаки.',
    branches: [
      { id: 'b1', name: 'Общий скрыт', type: 'active', mana1: 50, mana30: 10, desc: 'Укрывает отряд, давая 2 заряда уклонения.' },
      { id: 'b2', name: 'Призрак', type: 'active', mana1: 50, mana30: 10, desc: 'Нематериальность на 3 входящих удара.' },
      { id: 'b3', name: 'Бесплотность', type: 'active', mana1: 50, mana30: 10, desc: 'Уход с линии атаки (+2 к дистанции врагов).' }
    ],
    execute(ctx) {
      const dodges = Math.round(C.calcScale(ctx.lvl, this.cfg.dodgeHits1, this.cfg.dodgeHits30));
      ctx.p.shieldHits = (ctx.p.shieldHits || 0) + dodges;
      ctx.popPlayer(`👁️ В тени (${dodges} уд.)`);
      ctx.log(`👁️ <b>[${ctx.title}]</b>: персонаж растворился в тенях (уклонение от ${dodges} атак)!`);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 3Б: ДАРЫ 5–8 (ОГОНЬ, СОНИК, МЕНТАЛИСТ, НИМФА)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('fire_master', {
    pool: 'human', name: 'Мастер огня', type: 'active', mana1: 50, mana30: 10,
    cfg: { dmg1: 18, dmg30: 95 },
    desc: 'Огненный залп без потери атаки (18 -> 95 урона по площади).',
    branches: [
      { id: 'b1', name: 'Огненный щит', type: 'active', mana1: 50, mana30: 5, desc: 'Поглощает 2 удара и обжигает врагов.' },
      { id: 'b2', name: 'Стена огня', type: 'active', mana1: 50, mana30: 10, desc: 'Отталкивает врагов (+1 дист.) и наносит урон.' },
      { id: 'b3', name: 'Друг огня', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассивно: защита от огня.' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b1') {
        ctx.p.shieldHits = (ctx.p.shieldHits || 0) + 2;
        ctx.popPlayer('🔥 Огненный щит');
        ctx.log(`🔥 <b>[Огненный щит]</b>: барьер поглотит 2 удара!`);
        return;
      }
      const dmg = Math.round(C.calcScale(ctx.lvl, this.cfg.dmg1, this.cfg.dmg30) * ctx.intMult);
      ctx.alive.forEach(en => {
        if (ctx.branchId === 'b2') en.dist = (en.dist || 0) + 1;
        ctx.dealDamage(en, dmg, `🔥 -${dmg}`);
      });
      ctx.log(`🔥 <b>[${ctx.title}]</b>: огненная волна нанесла по ${dmg} урона!`);
    }
  });

  C.registerDar('sonic', {
    pool: 'human', name: 'Соник', type: 'active', mana1: 100, mana30: 10,
    cfg: { waveDmg1: 6, waveDmg30: 28 },
    desc: 'Акустический удар: оглушает слабых/равных врагов на 1..3 раунда (без ваншотов).',
    branches: [
      { id: 'b1', name: 'Купол тишины', type: 'passive', mana1: 0, mana30: 0, desc: 'Бесшумный бег и глушение звуков отряда.' },
      { id: 'b2', name: 'Эхолокатор', type: 'active', mana1: 50, mana30: 10, desc: 'Помечает слабые места (+25% к следующей атаке).' },
      { id: 'b3', name: 'Инфразвук', type: 'active', mana1: 60, mana30: 10, desc: 'Вешает Дебаф -25% на всех врагов на 2 раунда.' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b2') {
        ctx.p.buff = Math.max(ctx.p.buff || 1, 1.25);
        ctx.popPlayer('📡 Цель захвачена (+25%)');
        ctx.log(`🔊 <b>[Эхолокатор]</b>: уязвимости врагов вскрыты (+25% к урону)!`);
        return;
      }
      const wave = Math.round(C.calcScale(ctx.lvl, this.cfg.waveDmg1, this.cfg.waveDmg30) * ctx.intMult);
      ctx.alive.forEach(en => {
        const diff = en.rank - ctx.p.rank;
        if (ctx.branchId !== 'b3' && diff <= 1) {
          const stunR = diff < 0 ? 3 : (diff === 0 ? 2 : 1);
          en.stun = Math.max(en.stun || 0, stunR);
          ctx.dealDamage(en, wave, `💫 СТАН ${stunR}р (-${wave})`);
        } else {
          en.debuff = Math.max(en.debuff || 0, 2);
          ctx.dealDamage(en, wave, `⬇️ -25% (-${wave})`);
        }
      });
      ctx.log(`🔊 <b>[${ctx.title}]</b>: акустический импульс оглушил цели (лёгкий урон -${wave})!`);
    }
  });

  C.registerDar('mentalist', {
    pool: 'human', name: 'Менталист', type: 'active', mana1: 100, mana30: 10,
    cfg: { psiDmg1: 10, psiDmg30: 45 },
    desc: 'Подавляет волю цели на 1..2 раунда и наносит пси-урон.',
    branches: [
      { id: 'b1', name: 'Ментальный барьер', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: защита от пси-атак.' },
      { id: 'b2', name: 'Активная глушилка', type: 'active', mana1: 30, mana30: 1, desc: 'Снижает атаку всех врагов на 25% (2 раунда).' },
      { id: 'b3', name: 'Бу!', type: 'active', mana1: 60, mana30: 10, desc: 'Отбрасывает врагов назад в панике (+2 дист.).' }
    ],
    execute(ctx) {
      const psi = Math.round(C.calcScale(ctx.lvl, this.cfg.psiDmg1, this.cfg.psiDmg30) * ctx.intMult);
      if (ctx.branchId === 'b2') {
        ctx.alive.forEach(e => { e.debuff = Math.max(e.debuff || 0, 2); ctx.popEnemy(e, '🧠 Подавлен -25%'); });
        ctx.log(`🧠 <b>[Активная глушилка]</b>: атака врагов снижена на 25%!`);
        return;
      }
      const trg = ctx.alive[0];
      if (!trg) return;
      if (ctx.branchId === 'b3') trg.dist = (trg.dist || 0) + 2;
      if (trg.rank <= ctx.p.rank) trg.stun = Math.max(trg.stun || 0, 2);
      else trg.debuff = Math.max(trg.debuff || 0, 2);
      ctx.dealDamage(trg, psi, `🧠 -${psi}`);
      ctx.log(`🧠 <b>[${ctx.title}]</b>: ментальный удар по <b>${trg.name}</b>!`);
    }
  });

  C.registerDar('nymph', {
    pool: 'human', name: 'Нимфа', type: 'passive', mana1: 0, mana30: 0,
    cfg: { charmDmg1: 12, charmDmg30: 55 },
    desc: 'Пассив: снижает входящий урон от гуманоидов.',
    branches: [
      { id: 'b1', name: 'Подчинение', type: 'active', mana1: 100, mana30: 10, desc: 'Заставляет врага атаковать самого себя.' },
      { id: 'b2', name: 'Песнь сирены', type: 'active', mana1: 50, mana30: 5, desc: 'Очаровывает 1 врага на 2 раунда.' },
      { id: 'b3', name: 'Томный взгляд', type: 'active', mana1: 50, mana30: 10, desc: 'Оглушает ближних врагов на 1 раунд.' }
    ],
    execute(ctx) {
      const trg = ctx.alive[0];
      if (!trg) return;
      if (ctx.branchId === 'b1') {
        const selfHit = Math.max(5, Math.round(trg.dmg * 0.8));
        ctx.dealDamage(trg, selfHit, `💋 Самоурон -${selfHit}`);
        ctx.log(`💋 <b>[Подчинение]</b>: <b>${trg.name}</b> в смятении ударил сам себя на -${selfHit}!`);
        return;
      }
      if (trg.rank <= ctx.p.rank) trg.stun = Math.max(trg.stun || 0, ctx.branchId === 'b2' ? 2 : 1);
      else trg.debuff = Math.max(trg.debuff || 0, 2);
      ctx.popEnemy(trg, '💋 Очарован');
      ctx.log(`💋 <b>[${ctx.title}]</b>: <b>${trg.name}</b> потерял волю к бою!`);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 4А: ДАРЫ 9–12 (ЖИГОЛО, ИЛЛЮЗИОНИСТ, ТАНК, СЕНС)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // 9. ЖИГОЛО (Зеркало Нимфы — стравливание и очарование)
  C.registerDar('gigolo_gift', {
    pool: 'human', name: 'Жиголо', type: 'passive', mana1: 0, mana30: 0,
    cfg: { selfHitMult: 0.8 },
    desc: 'Зеркало Нимфы, взаимный иммунитет с Нимфой.',
    branches: [
      { id: 'b1', name: 'Соблазнение', type: 'active', mana1: 100, mana30: 10, desc: 'Заставляет врага ударить самого себя.' },
      { id: 'b2', name: 'Зов хищника', type: 'active', mana1: 50, mana30: 5, desc: 'Очаровывает 1 цель на 2 раунда.' },
      { id: 'b3', name: 'Роковая ухмылка', type: 'active', mana1: 50, mana30: 10, desc: 'Оглушает ближнюю цель на 1 раунд.' }
    ],
    execute(ctx) {
      const trg = ctx.alive[0];
      if (!trg) return;
      if (ctx.branchId === 'b1') {
        const selfHit = Math.max(5, Math.round(trg.dmg * this.cfg.selfHitMult));
        ctx.dealDamage(trg, selfHit, `🌹 Самоурон -${selfHit}`);
        ctx.log(`🌹 <b>[Соблазнение]</b>: <b>${trg.name}</b> потерял голову и ударил себя на -${selfHit}!`);
        return;
      }
      if (trg.rank <= ctx.p.rank) trg.stun = Math.max(trg.stun || 0, ctx.branchId === 'b2' ? 2 : 1);
      else trg.debuff = Math.max(trg.debuff || 0, 2);
      ctx.popEnemy(trg, '🌹 Шарм');
      ctx.log(`🌹 <b>[${ctx.title}]</b>: <b>${trg.name}</b> ошеломлён!`);
    }
  });

  // 10. ИЛЛЮЗИОНИСТ (Веер из 36 карт + защитные трюки)
  C.registerDar('illusionist', {
    pool: 'human', name: 'Иллюзионист', type: 'active', mana1: 100, mana30: 10,
    cfg: { cardDmg1: 1.5, cardDmg30: 6.5, cardsCount: 36 },
    desc: 'Бросок 36 карт веером (1.5 -> 6.5 урона за карту по случайным целям).',
    branches: [
      { id: 'b1', name: 'Фокусник', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: +25% -> +50% анти-пси и шанс доп. лута.' },
      { id: 'b2', name: 'Распили меня полностью', type: 'active', mana1: 100, mana30: 10, desc: 'Ближний удар лечит 15% ОЗ вместо урона (1 удар).' },
      { id: 'b3', name: 'Жонглёр', type: 'active', mana1: 100, mana30: 10, desc: 'Отражает следующий удар обратно во врага.' }
    ],
    async execute(ctx) {
      if (ctx.branchId === 'b2' || ctx.branchId === 'b3') {
        ctx.p.shieldHits = (ctx.p.shieldHits || 0) + 1;
        if (ctx.branchId === 'b2') {
          const heal = Math.max(5, Math.round(ctx.p.maxHp * 0.15));
          ctx.p.hp = Math.min(ctx.p.maxHp, ctx.p.hp + heal);
          ctx.popPlayer(`🃏 Трюк +${heal} ОЗ`);
        } else {
          ctx.popPlayer('🃏 Отражение (1 уд.)');
        }
        ctx.log(`🃏 <b>[${ctx.title}]</b>: иллюзорная подмена готова!`);
        return;
      }
      const perCard = Math.max(1, Math.round(C.calcScale(ctx.lvl, this.cfg.cardDmg1, this.cfg.cardDmg30) * ctx.intMult));
      const suits = ['♠️', '♥️', '♦️', '♣️'];
      for (let i = 0; i < this.cfg.cardsCount; i++) {
        const cur = ctx.enemies.filter(e => !e.dead);
        if (!cur.length) break;
        const en = cur[Math.floor(Math.random() * cur.length)];
        ctx.dealDamage(en, perCard, i % 4 === 0 ? `${suits[i % 4]} -${perCard}` : null);
        if (i % 3 === 0 && ctx.wait) await ctx.wait(28);
      }
      ctx.log(`🃏 <b>[Иллюзионист: 36 карт]</b>: веер карт по ${perCard} урона накрыл врагов!`);
    }
  });

  // 11. ТАНК (Авто-щит за ману и укрытие)
  C.registerDar('tank', {
    pool: 'human', name: 'Танк', type: 'trigger', mana1: 25, mana30: 5,
    cfg: { shield1: 1, shield30: 3 },
    desc: 'Авто-щит: поглощает удары >= 10% ОЗ за счёт маны.',
    branches: [
      { id: 'b1', name: 'Бывалый танкист', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: иммунитет к оглушению и слепоте.' },
      { id: 'b2', name: 'Грязь — это загар', type: 'active', mana1: 0, mana30: 0, desc: 'Маскировка на позиции (+1 заряд уклонения).' },
      { id: 'b3', name: 'Танкам дорога не нужна', type: 'active', mana1: 50, mana30: 0, desc: 'Таранный натиск: сбивает с ног ближайшего врага (стан 1р).' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b3' && ctx.alive[0]) {
        const trg = ctx.alive[0];
        trg.stun = Math.max(trg.stun || 0, 1);
        ctx.dealDamage(trg, 15, '🚜 Таран! 💫СТАН');
        ctx.log(`🚜 <b>[Танкам дорога не нужна]</b>: <b>${trg.name}</b> сбит с ног!`);
        return;
      }
      ctx.p.shieldHits = (ctx.p.shieldHits || 0) + 1;
      ctx.popPlayer('🛡 Окопался (+1 уд.)');
      ctx.log(`🚜 <b>[${ctx.title}]</b>: боец занял глухую оборону!`);
    }
  });

  // 12. СЕНС (Пеленг уязвимостей и куклы-приманки — БЕЗ УРОНА!)
  C.registerDar('sense', {
    pool: 'human', name: 'Сенс', type: 'active', mana1: 50, mana30: 5,
    cfg: { buff1: 1.35, buff30: 2.0, decoys1: 1, decoys30: 3 },
    desc: 'Сканирует цели: следующий удар бойца получает бонус +35% -> +100% урона.',
    branches: [
      { id: 'b1', name: 'Чувствительность', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: защита от слепоты и пси-атак.' },
      { id: 'b2', name: 'Знание сути', type: 'active', mana1: 50, mana30: 5, desc: 'Находит слабую точку: +35% -> +100% к следующей атаке.' },
      { id: 'b3', name: 'Знаток восприятия', type: 'active', mana1: 50, mana30: 10, desc: 'Создаёт 1 -> 3 куклы-приманки, поглощающие удары.' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b3') {
        const cnt = Math.round(C.calcScale(ctx.lvl, this.cfg.decoys1, this.cfg.decoys30));
        ctx.p.shieldHits = (ctx.p.shieldHits || 0) + cnt;
        ctx.popPlayer(`👥 Приманки +${cnt}`);
        ctx.log(`📡 <b>[Знаток восприятия]</b>: выставлено ${cnt} кукол-приманок!`);
        return;
      }
      const mult = C.calcScale(ctx.lvl, this.cfg.buff1, this.cfg.buff30);
      ctx.p.buff = Math.max(ctx.p.buff || 1, mult);
      ctx.popPlayer(`🎯 Суть вскрыта (×${mult})`);
      ctx.log(`📡 <b>[${ctx.title}]</b>: уязвимость цели найдена (след. удар ×${mult})!`);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 4Б: ДАРЫ 13–16 (ЛЁД, ВАЙШНАВИЗМ, ГИГАНТИЗМ, ДИТЯ УЛЬЯ)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // 13. МАСТЕР ЛЬДА (Обледенение, стан 1р, ледяной панцирь)
  C.registerDar('ice_master', {
    pool: 'human', name: 'Мастер льда', type: 'active', mana1: 50, mana30: 10,
    cfg: { dmg1: 14, dmg30: 70 },
    desc: 'Ледяной залп без потери атаки (14 -> 70 урона) + обморожение.',
    branches: [
      { id: 'b1', name: 'Ледяной панцирь', type: 'active', mana1: 50, mana30: 5, desc: 'Ледяная броня поглощает 2 входящих удара.' },
      { id: 'b2', name: 'Гололёд', type: 'active', mana1: 50, mana30: 10, desc: 'Наледь: сбивает с ног врагов (стан 1р и -25% урона).' },
      { id: 'b3', name: 'Хладнокровие', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: защита от льда и огня.' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b1') {
        ctx.p.shieldHits = (ctx.p.shieldHits || 0) + 2;
        ctx.popPlayer('❄️ Ледяной панцирь');
        ctx.log(`❄️ <b>[Ледяной панцирь]</b>: барьер поглотит 2 удара!`);
        return;
      }
      const dmg = Math.round(C.calcScale(ctx.lvl, this.cfg.dmg1, this.cfg.dmg30) * ctx.intMult);
      ctx.alive.forEach(en => {
        if (en.rank <= ctx.p.rank) en.stun = Math.max(en.stun || 0, 1);
        else en.debuff = Math.max(en.debuff || 0, 2);
        ctx.dealDamage(en, ctx.branchId === 'b2' ? Math.round(dmg * 0.5) : dmg, `❄️ -${dmg}`);
      });
      ctx.log(`❄️ <b>[${ctx.title}]</b>: ледяной шквал сковал противников!`);
    }
  });

  // 14. ПРИСТУП ВАЙШНАВИЗМА (Духовный щит и подавление агрессии)
  C.registerDar('vaishnavism', {
    pool: 'infected', name: 'Приступ вайшнавизма', type: 'passive', mana1: 0, mana30: 0,
    cfg: { calmDmg1: 10, calmDmg30: 42 },
    desc: 'Отказ от сырой плоти, x2 сытости и доступ к оружию людей.',
    branches: [
      { id: 'b1', name: 'Харе Кришна, чувак!', type: 'active', mana1: 40, mana30: 10, desc: 'Умиротворяет 1 врага на 2 раунда.' },
      { id: 'b2', name: 'Человеческая суть', type: 'active', mana1: 40, mana30: 10, desc: 'Вспышка разума: ярость (+40% к урону) и лечение 15% ОЗ.' },
      { id: 'b3', name: 'Нечеловеческая предусмотрительность', type: 'active', mana1: 10, mana30: 1, desc: 'Духовный покров (уклонение от 2 атак).' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b3') {
        ctx.p.shieldHits = (ctx.p.shieldHits || 0) + 2;
        ctx.popPlayer('🕉️ Покров духа (+2 уд.)');
        ctx.log(`🕉️ <b>[Предусмотрительность]</b>: защитный покров активирован!`);
        return;
      }
      if (ctx.branchId === 'b2') {
        ctx.p.buff = Math.max(ctx.p.buff || 1, 1.4);
        const heal = Math.max(4, Math.round(ctx.p.maxHp * 0.15));
        ctx.p.hp = Math.min(ctx.p.maxHp, ctx.p.hp + heal);
        ctx.popPlayer(`🕉️ +${heal} ОЗ / ×1.4`);
        ctx.log(`🕉️ <b>[Человеческая суть]</b>: +${heal} ОЗ и +40% к следующей атаке!`);
        return;
      }
      const trg = ctx.alive;
      if (!trg) return;
      trg.stun = Math.max(trg.stun || 0, 2);
      ctx.popEnemy(trg, '🕉️ Умиротворён (2р)');
      ctx.log(`🕉️ <b>[Харе Кришна, чувак!]</b>: <b>${trg.name}</b> замер в медитации!`);
    }
  });

  // 15. ГИГАНТИЗМ (Сокрушительный удар гиганта и чудовищная регенерация)
  C.registerDar('gigantism', {
    pool: 'infected', name: 'Гигантизм', type: 'passive', mana1: 0, mana30: 0,
    cfg: { smash1: 22, smash30: 110, regenPct1: 0.20, regenPct30: 0.65 },
    desc: 'Пассив: 50% шанс удвоить прирост Силы/Выносливости и носить броню.',
    branches: [
      { id: 'b1', name: 'Танк (Гигант)', type: 'trigger', mana1: 25, mana30: 5, desc: 'Триггер: поглощает удар за ману.' },
      { id: 'b2', name: 'Голод гиганта', type: 'active', mana1: 50, mana30: 10, desc: 'Мощный укус по 1 цели (22 -> 110) с отхилом 25% ОЗ.' },
      { id: 'b3', name: 'Чудовищная регенерация', type: 'active', mana1: 50, mana30: 10, desc: 'Мгновенно восстанавливает 20% -> 65% макс. ОЗ.' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b3') {
        const pct = C.calcScale(ctx.lvl, this.cfg.regenPct1, this.cfg.regenPct30);
        const heal = Math.max(6, Math.round(ctx.p.maxHp * pct));
        ctx.p.hp = Math.min(ctx.p.maxHp, ctx.p.hp + heal);
        ctx.popPlayer(`🦍 Реген +${heal} ОЗ`);
        ctx.log(`🦍 <b>[Чудовищная регенерация]</b>: восстановлено +${heal} ОЗ!`);
        return;
      }
      const trg = ctx.alive;
      if (!trg) return;
      const dmg = Math.round(C.calcScale(ctx.lvl, this.cfg.smash1, this.cfg.smash30));
      ctx.dealDamage(trg, dmg, `🦍 -${dmg}`);
      const heal = Math.max(3, Math.round(ctx.p.maxHp * 0.20));
      ctx.p.hp = Math.min(ctx.p.maxHp, ctx.p.hp + heal);
      ctx.log(`🦍 <b>[Голод гиганта]</b>: укус на -${dmg} и лечение +${heal} ОЗ!`);
    }
  });

  // 16. ДИТЯ УЛЬЯ (Аура ужаса и маскировка в стае)
  C.registerDar('hive_child', {
    pool: 'infected', name: 'Дитя Улья', type: 'passive', mana1: 0, mana30: 0,
    cfg: { sneakMult: 1.6 },
    desc: 'Пассив: стая до 10 заражённых и ношение одежды.',
    branches: [
      { id: 'b1', name: 'Активная маскировка', type: 'active', mana1: 35, mana30: 10, desc: 'Скрывается за стаей: уклонение (1 уд.) и удар ×1.6.' },
      { id: 'b2', name: 'Родная среда', type: 'active', mana1: 30, mana30: 5, desc: 'Сливается с руинами (уклонение от 2 ударов).' },
      { id: 'b3', name: 'Аура ужаса', type: 'active', mana1: 50, mana30: 10, desc: 'Вводит всех врагов в транс на 1 раунд (без урона).' }
    ],
    execute(ctx) {
      if (ctx.branchId === 'b3') {
        ctx.alive.forEach(e => {
          if (e.rank <= ctx.p.rank) { e.stun = Math.max(e.stun || 0, 1); ctx.popEnemy(e, '😱 УЖАС (1р)'); }
          else { e.debuff = Math.max(e.debuff || 0, 2); ctx.popEnemy(e, '⬇️ -25%'); }
        });
        ctx.log(`☣️ <b>[Аура ужаса]</b>: противники парализованы страхом Улья!`);
        return;
      }
      ctx.p.shieldHits = (ctx.p.shieldHits || 0) + (ctx.branchId === 'b2' ? 2 : 1);
      if (ctx.branchId !== 'b2') ctx.p.buff = Math.max(ctx.p.buff || 1, this.cfg.sneakMult);
      ctx.popPlayer('☣️ Тень Улья');
      ctx.log(`☣️ <b>[${ctx.title}]</b>: слияние с Ульем активировано!`);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 5: 17 АМУЛЕТОВ ПОЗОРА И МОСТ СИНХРОНИЗАЦИИ С ЯДРАМИ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.ITEMS.shameAmulets = [
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
    { id: 'am_kvaz', req: 'kvaz', n: '🍾 Тройной одеколон «Эликсир 1982»', cat: 'talisman', slot: 'talisman', shame: true, rank: 3, end: 2, spi: -2, w: 0.4, trig: 'atk', desc: 'Гранёный флакон выдержанного парфюма эпохи застоя.', log: 'Кваз случайно разбивает пузырёк на своей могучей груди — выдержанное облако спирта и хвои накрывает арену. Враг лупит вслепую, утирая слёзы!' },
    { id: 'am_leg_m', req: 'legend_m', n: '🏋️ Легендарный эспандер Кегеля «Стальной хват»', cat: 'talisman', slot: 'talisman', shame: true, rank: 4, str: 4, spi: -3, w: 0.7, trig: 'start', desc: 'Титановый тренажёр с тугой пружиной от танка.', log: 'Легендарный воин с суровым лицом сжимает титановый тренажёр с лязгом капкана. Самый матёрый враг понимает, что с этим психом лучше не связываться!' },
    { id: 'am_leg_f', req: 'legend_f', n: '👑 Легендарный страпон «Власть матриарха»', cat: 'talisman', slot: 'talisman', shame: true, rank: 4, str: 4, spi: -3, w: 0.8, trig: 'start', desc: 'Армированный кожаный трофей с заклёпками из титана.', log: 'Легендарная воительница с суровым видом поправляет ремни и угрожающе потрясает «трофеем» старого мира. Самый матёрый враг мгновенно теряет боевой дух!' }
  ];

  // Автоматическая синхронизация с STIKS, STIKS_COMBAT_CORE и BSIM_DATA
  C.applyToEngines = function() {
    if (global.STIKS) {
      Object.assign(global.STIKS.ARCHETYPES, C.ARCHETYPES);
      Object.assign(global.STIKS.DARS, C.DARS);
      global.STIKS.ARCH_SHAME_AMULETS = global.STIKS.SHAME_CARDS = C.ITEMS.shameAmulets;
    }
    if (global.STIKS_COMBAT_CORE) global.STIKS_COMBAT_CORE.Z_RANKS = C.Z_RANKS;
    if (global.BSIM_DATA) {
      global.BSIM_DATA.Z_RANKS = C.Z_RANKS;
      Object.assign(global.BSIM_DATA.ARCHETYPES, C.ARCHETYPES);
      Object.assign(global.BSIM_DATA.DARS, C.DARS);
    }
  };
  C.applyToEngines();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 6: АДАПТЕР БОЯ (БЕЗ ВАНШОТОВ И С БАЛАНСОМ ОЗ/БРОНИ)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // Единый исполнитель Даров для основной игры и bsim.html
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE;
    const UI = global.BSIM_UI;
    const AUD = global.BSIM_AUDIO;
    const st = CORE && CORE.state;
    if (!st || st.busy || st.finished || !st.player || !st.player.learned.at(idx)) return false;

    const p = st.player, item = p.learned.at(idx);
    const dar = this.DARS[item.darKey];
    if (!dar || typeof dar.execute !== 'function' || item.usedRound) return false;

    const br = item.branchId ? (dar.branches || []).find(b => b.id === item.branchId) : null;
    const title = br ? br.name : dar.name;

    if (item.maxCharges > 0 && item.charges <= 0) {
      if (UI) UI.log(`❌ Заряды Дара <b>[${title}]</b> исчерпаны!`);
      return true;
    }
    const pct = CORE.calcMana(br ? br.mana1 : dar.mana1, br ? br.mana30 : dar.mana30, item.lvl);
    const cost = Math.floor(p.maxMana * (pct / 100));
    if (p.mana < cost) {
      if (UI) UI.log(`❌ Не хватает маны на <b>[${title}]</b> (нужно ${cost}).`);
      return true;
    }

    st.busy = true; st.activeId = 'u-player'; p.mana -= cost;
    if (p.heroRef) p.heroRef.mana = p.mana;
    item.usedRound = true;
    if (item.maxCharges > 0) item.charges--;
    CORE.grantCombatXp('spi', 1);
    if (AUD) AUD.playSfx('dar');
    if (UI) {
      UI.showSkillBanner('🧬', `${title} (Ур.${item.lvl})`, 'Активация Дара Улья!');
      if (UI.renderStage) UI.renderStage(); else if (UI.renderBattle) UI.renderBattle();
    }

    const B = this.BALANCE;
    const intBonus = 1 + Math.floor((p.stats.int || 10) / B.darIntBonusStep) * B.darIntBonusPct;
    const ctx = {
      p, st, dar, br, title, lvl: item.lvl, branchId: item.branchId || '',
      enemies: st.enemies, alive: st.enemies.filter(e => !e.dead), intMult: intBonus,
      wait: UI ? UI.wait.bind(UI) : () => Promise.resolve(),
      log: UI ? UI.log.bind(UI) : () => {},
      popPlayer: (txt) => UI && UI.popBack('u-player', true, txt, 'float-skill'),
      popEnemy: (en, txt) => UI && UI.popBack('u-' + en.id, false, txt, 'float-crit'),
      dealDamage(en, rawDmg, popTxt) {
        const d = Math.max(1, Math.round(rawDmg));
        if (st.mode === 'sandbox') en.hp = Math.max(1, (en.hp || 10) - d);
        else { en.hp = Math.max(0, (en.hp || 10) - d); if (en.hp <= 0) en.dead = true; }
        if (popTxt && UI) UI.popBack('u-' + en.id, false, popTxt + (en.dead ? ' 💀' : ''), 'float-crit');
      }
    };

    await dar.execute(ctx);
    st.activeId = ''; st.busy = false;
    if (UI) {
      if (UI.renderStage) UI.renderStage(); else if (UI.renderBattle) UI.renderBattle();
      if (UI.checkBattleEnd) UI.checkBattleEnd();
    }
    return true;
  };

  C.bindHooks = function() {
    this.applyToEngines();
    const B = this.BALANCE;
    if (global.BSIM_UI && !global.BSIM_UI._contentBound) {
      global.BSIM_UI._contentBound = true;
      const origLearned = global.BSIM_UI.actLearned.bind(global.BSIM_UI);
      global.BSIM_UI.actLearned = async function(idx) {
        const handled = await C.runDarInCombat(idx);
        if (!handled) await origLearned(idx);
      };
    }
    if (global.STIKS && !global.STIKS._contentBalanceBound) {
      global.STIKS._contentBalanceBound = true;
      const origNorm = global.STIKS.normalizePlayerStats.bind(global.STIKS);
      global.STIKS.normalizePlayerStats = function(p) {
        origNorm(p);
        if (!p || !p.stats) return;
        const endVal = Number(p.stats.end || 10);
        p.maxHp = Math.max(12, Math.round((B.baseHp + endVal * B.hpPerEnd) * (p.isKvaz ? B.kvazHpMult : 1)));
        if (p.hp > p.maxHp) p.hp = p.maxHp;
      };
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => C.bindHooks());
    else C.bindHooks();
  }
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КУСОК 7: ИЗОЛЯЦИЯ ТЕСТОВОЙ БАЗЫ ДЛЯ DEV.HTML
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  const isDev = typeof location !== 'undefined' && String(location.pathname || '').includes('dev.html');
  if (!C || !isDev) return;

  C.setupDevSandbox = function() {
    const S = global.STIKS;
    if (!S) return;
    S.DB_KEY = 'stiks_dev_v2_db';
    S.BACKUP_KEY = 'stiks_dev_v2_db_backup';
    S.loadDB();
    if (S.renderLobby) S.renderLobby();

    const topBar = document.querySelector('.top-controls');
    if (topBar && !document.getElementById('btn-dev-clone-prod')) {
      const b = document.createElement('button');
      b.id = 'btn-dev-clone-prod';
      b.className = 'btn';
      b.style.cssText = 'border-color:#38bdf8;color:#7dd3fc;font-weight:bold;';
      b.textContent = '📥 Копия из проды';
      b.onclick = function() {
        const raw = localStorage.getItem('stiks_prod_db');
        if (!raw) { S.log('⚠️ В проде пока нет сохранений.'); return; }
        localStorage.setItem('stiks_dev_v2_db', raw);
        S.loadDB();
        if (S.renderLobby) S.renderLobby();
        S.log('✅ Бойцы из проды скопированы в тестовую песочницу DEV v2.0!');
      };
      topBar.appendChild(b);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => C.setupDevSandbox());
  else C.setupDevSandbox();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №1 (ЧАСТЬ 1А): КАМЕННАЯ КОЖА + ФИКС МАНЫ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.interpNodes = function(lvl, pts) {
    const l = Math.max(1, Math.min(30, Number(lvl) || 1));
    if (l <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (l <= x1) return y0 + (y1 - y0) * ((l - x0) / Math.max(1, x1 - x0));
    }
    return pts[pts.length - 1][1];
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

  C.registerDar('stone_skin', {
    pool: 'human', name: 'Каменная кожа', type: 'passive', mana1: 0, mana30: 0,
    cfg: {
      rankBase: 1.0, rankPerLvl: 0.1,
      invulnHits: [[1, 1], [5, 2], [10, 3], [20, 5], [30, 7]],
      invulnMana: [[1, 50], [5, 40], [10, 30], [20, 18], [30, 10]],
      squadAllies: [[1, 2], [5, 3], [10, 4], [20, 6], [30, 99]],
      squadManaHit: [[1, 60], [5, 48], [10, 35], [20, 20], [30, 10]],
      thornsPct: [[1, 2.0], [10, 2.5], [30, 3.5]],
      thornsMana: [[1, 50], [10, 30], [30, 10]]
    },
    desc: 'База (пассив): +1.0 -> +3.9 к рангу брони (+0.1/ур.). Ветки: Временная неуязвимость (1->7 уд.), Отрядный щит (2->весь отряд), Колючая стена (10% входящего + 200%->350% возврат).',
    branches: [
      { id: 'b1', name: 'Временная неуязвимость', type: 'active', mana1: 50, mana30: 10, desc: 'Игнорирует 1 -> 7 входящих ударов (маны фикс. при открытии).' },
      { id: 'b2', name: 'Отрядный щит', type: 'active', mana1: 60, mana30: 10, desc: 'Поглощает урон по отряду: 2 -> 6 -> весь отряд (60% -> 10% фикс. маны за удар).' },
      { id: 'b3', name: 'Колючая стена', type: 'active', mana1: 50, mana30: 10, desc: 'Входящий урон 10%, возврат 200% -> 350% в ближнем бою (3 удара).' }
    ],
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
        const fixedPerHit = C.getFixedManaCost(ctx.p, ctx.item, Math.round(C.interpNodes(ctx.lvl, this.cfg.squadManaHit)));
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
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №1 (ЧАСТЬ 1Б): ГРАФИКА ЩИТА/ШИПОВ И ОБРАТКА
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  if (typeof document !== 'undefined' && !document.getElementById('stiks-shield-thorns-css')) {
    const st = document.createElement('style');
    st.id = 'stiks-shield-thorns-css';
    st.textContent = `
      @keyframes stiksShieldPulse { 0%,100% { box-shadow: 0 0 6px #38bdf8, inset 0 0 8px rgba(56,189,248,0.45); } 50% { box-shadow: 0 0 15px #7dd3fc, inset 0 0 14px rgba(125,211,252,0.8); } }
      @keyframes stiksThornsPulse { 0%,100% { box-shadow: 0 0 6px #f97316, inset 0 0 8px rgba(239,68,68,0.45); } 50% { box-shadow: 0 0 15px #ef4444, inset 0 0 14px rgba(249,115,22,0.85); } }
      #u-player.has-shield { border: 2px solid #38bdf8 !important; animation: stiksShieldPulse 1.3s infinite ease-in-out; }
      #u-player.has-thorns { border: 2px solid #f97316 !important; animation: stiksThornsPulse 1.1s infinite ease-in-out; }
      .unit-aura-tag { position: absolute; bottom: -11px; left: 50%; transform: translateX(-50%); font-size: 8px; font-weight: bold; padding: 0 4px; border-radius: 3px; white-space: nowrap; z-index: 7; }
      .unit-aura-tag.shield { background: #0c2a3d; border: 1px solid #38bdf8; color: #bae6fd; }
      .unit-aura-tag.thorns { background: #3b130c; border: 1px solid #f97316; color: #fed7aa; }
    `;
    document.head.appendChild(st);
  }

  C.renderUnitAuras = function() {
    const CORE = global.STIKS_COMBAT_CORE;
    const p = CORE && CORE.state && CORE.state.player;
    const card = document.getElementById('u-player');
    if (!p || !card) return;
    card.querySelectorAll('.unit-aura-tag').forEach(el => el.remove());
    card.classList.remove('has-shield', 'has-thorns');

    const hasShield = (p.shieldHits > 0) || (p.squadShield && p.squadShield.active);
    const hasThorns = (p.thornsWall && p.thornsWall.hitsLeft > 0);
    if (hasShield) {
      card.classList.add('has-shield');
      const tag = document.createElement('div');
      tag.className = 'unit-aura-tag shield';
      tag.textContent = p.shieldHits > 0 ? `🛡 Щит (${p.shieldHits})` : `🔰 Купол (${p.squadShield.fixedManaPerHit}м)`;
      card.appendChild(tag);
    } else if (hasThorns) {
      card.classList.add('has-thorns');
      const tag = document.createElement('div');
      tag.className = 'unit-aura-tag thorns';
      tag.textContent = `🌵 Шипы (${p.thornsWall.hitsLeft})`;
      card.appendChild(tag);
    }
  };

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE;
    const p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'stone_skin' && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.stone_skin.getManaPct(item.branchId, item.lvl));
    }
    if (item && typeof item.manaAnchor === 'number' && item.manaAnchor > 0) {
      const origCalc = CORE.calcMana;
      CORE.calcMana = () => (item.manaAnchor / Math.max(1, p.maxMana)) * 100;
      const res = await origRun(idx);
      CORE.calcMana = origCalc;
      C.renderUnitAuras();
      return res;
    }
    const res = await origRun(idx);
    C.renderUnitAuras();
    return res;
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;
    if (!UI || !CORE || UI._stoneSkinV2Bound) return;
    UI._stoneSkinV2Bound = true;

    ['renderBattle', 'renderStage'].forEach(fn => {
      if (typeof UI[fn] === 'function') {
        const orig = UI[fn].bind(UI);
        UI[fn] = function() { orig(); C.renderUnitAuras(); };
      }
    });

    const origRunEnemies = UI.runEnemiesTurn.bind(UI);
    UI.runEnemiesTurn = async function() {
      const st = CORE.state, p = st && st.player;
      if (p && Array.isArray(p.learned)) {
        const baseSkin = p.learned.find(x => x.darKey === 'stone_skin' && !x.branchId);
        if (baseSkin && !p._stoneSkinFlatApplied) {
          p._stoneSkinFlatApplied = true;
          p.armFlat = Math.round((p.armFlat || 0) + C.DARS.stone_skin.getPassiveRankBonus(baseSkin.lvl) * 10);
        }
      }
      const hpBefore = p ? p.hp : 0;
      await origRunEnemies();
      if (p && p.hp < hpBefore) {
        const lost = hpBefore - p.hp;
        if (p.squadShield && p.squadShield.active) {
          const mCost = p.squadShield.fixedManaPerHit;
          if (p.mana >= mCost) { p.mana -= mCost; p.hp = hpBefore; UI.popBack('u-player', true, `🔰 Щит (-${mCost} м.)`, 'float-skill'); }
          else { p.squadShield.active = false; UI.log('⚠️ Мана исчерпана — <b>Отрядный щит</b> спал!'); }
        } else if (p.thornsWall && p.thornsWall.hitsLeft > 0) {
          p.thornsWall.hitsLeft--;
          const keepDmg = Math.max(1, Math.round(lost * 0.10));
          p.hp = Math.min(p.maxHp, hpBefore - keepDmg);
          const attacker = (st.enemies || []).find(e => !e.dead && e.dist <= 0);
          if (attacker) {
            const retDmg = Math.max(1, Math.round(lost * p.thornsWall.mult));
            if (st.mode === 'game') { attacker.hp = Math.max(0, attacker.hp - retDmg); if (attacker.hp <= 0) attacker.dead = true; }
            else attacker.hp = Math.max(1, attacker.hp - retDmg);
            UI.popBack('u-' + attacker.id, false, `🌵 Шипы -${retDmg}${attacker.dead ? ' 💀' : ''}`, 'float-crit');
            UI.log(`🌵 <b>[Колючая стена]</b>: получено 10% (${keepDmg}), возвращено <b>${Math.round(p.thornsWall.mult * 100)}% (-${retDmg})</b> по <b>${attacker.name}</b>!`);
          }
        }
        UI.renderBattle();
        if (UI.checkBattleEnd) UI.checkBattleEnd();
      }
    };
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №2 (ЧАСТЬ 2А): ЗНАХАРЬ (healer)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('healer', {
    pool: 'human', name: 'Знахарь', type: 'active', mode: 'map', mana1: 40, mana30: 10,
    cfg: {
      healPct: [[1, 0.25], [10, 0.50], [30, 1.0]],
      healMana: [,,],
      maxHealsPerRaid: 5,
      empMana: [,,],
      suppPct: [[1, 0.10], [10, 0.22], [30, 0.50]],
      suppMana: [,,],
      petRankPlus: [,,],
      petCalmRounds: [,,],
      petMana: [,]
    },
    desc: 'База (строго вне боя, до 5/рейд): лечит себя и союзников на 25% -> 50% -> 100% ОЗ. Ветки: Мастер усиления (+1 ур. любого Дара: 1/рейд на себя + 1/рейд на союзника), Ветка поддержки (аура боя ±10%..±50%), Ветка любимчика (укрощение до +1..+3 ранга).',
    branches: [
      { id: 'b1', name: 'Мастер усиления', type: 'active', mode: 'map', mana1: 100, mana30: 10, desc: 'Повышает любой открытый Дар/ветку на +1 ур. (бесплатный горох): 1/рейд на себя + 1/рейд на союзника.' },
      { id: 'b2', name: 'Ветка поддержки', type: 'active', mode: 'battle', mana1: 10, mana30: 2, desc: 'Аура боя: ±10% -> ±22% -> ±50% к урону отряда и защите (10% -> 2% фикс. маны/раунд).' },
      { id: 'b3', name: 'Ветка любимчика', type: 'active', mode: 'battle', mana1: 40, mana30: 10, desc: 'Укрощает заражённых до +1..+3 ранга на 2..6 раундов (Элита+ — Успокоить на 3р со 100% побегом).' }
    ],
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
          ctx.log(`🌿 <b>[Ветка поддержки]</b> включена: урон отряда <b>+${Math.round(pct * 100)}%</b>, входящий урон <b>-${Math.round(pct * 100)}%</b> (расход фикс. ${tickMana} маны/раунд)!`);
        } else {
          ctx.popPlayer('🌿 Аура выкл.');
          ctx.log('🌿 <b>[Ветка поддержки]</b> отключена.');
        }
        return;
      }
      if (ctx.branchId === 'b3') {
        const plusR = Math.round(C.interpNodes(ctx.lvl, this.cfg.petRankPlus));
        const calmR = Math.round(C.interpNodes(ctx.lvl, this.cfg.petCalmRounds));
        const trg = ctx.alive[0];
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
// STIKS_CONTENT // КАНОН ДАРА №2 (ЧАСТЬ 2Б): ВЫБОР ЦЕЛИ УСИЛЕНИЯ, ХИЛ И АУРА
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.healer) return;

  // 1. Выбор цели для «Мастера усиления» (1/рейд на себя + 1/рейд на союзника)
  C.openHealerEmpowerModal = function(caster) {
    const S = global.STIKS;
    if (!S || !caster || !caster.gifts || !caster.gifts.healer || !caster.gifts.healer.branches || !caster.gifts.healer.branches.b1) return;
    const b1 = caster.gifts.healer.branches.b1;
    const s = S.db && S.db.session;
    caster._empowerUsed = Object.assign({ self: false, ally: false }, caster._empowerUsed || {});
    const cost = C.getFixedManaCost(caster, b1, C.DARS.healer.getManaPct('b1', b1.lvl || 1));

    const allies = [];
    if (s && Array.isArray(s.players)) s.players.forEach(pl => { if (pl && pl.uid !== caster.uid && pl.hp > 0) allies.push(pl); });
    if (Array.isArray(caster.escortSquad)) caster.escortSquad.forEach((npc, i) => { if (npc) allies.push({ uid: 'esc_' + i, name: npc.name || ('Спутник #' + (i + 1)), _escortRef: npc }); });

    const old = document.getElementById('stiks-empower-modal');
    if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'stiks-empower-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(4,6,5,0.94);z-index:9850;display:flex;align-items:center;justify-content:center;padding:12px;font-family:monospace;color:#e6f5eb;';
    let h = `<div style="width:100%;max-width:380px;background:#121814;border:2px solid #4ade80;border-radius:8px;padding:12px;font-size:11px;">` +
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><b style="color:#86efac;">🌿 МАСТЕР УСИЛЕНИЯ (+1 ур. любого Дара)</b><button class="btn btn-danger" style="width:auto;padding:2px 7px;" onclick="document.getElementById('stiks-empower-modal').remove()">✖</button></div>` +
      `<div style="color:#cbd5e1;margin-bottom:8px;">Расход: <b>${cost} маны</b> (${caster.mana}/${caster.maxMana}). Лимит в рейде: 1 на себя + 1 на союзника.</div>` +
      `<button id="btn-emp-self" class="btn btn-primary" ${caster._empowerUsed.self ? 'disabled' : ''} style="width:100%;margin-bottom:6px;text-align:left;">🧘 Усилить себя: <b>${caster.name}</b> ${caster._empowerUsed.self ? '(Использовано)' : ''}</button>`;
    if (!allies.length) h += `<div style="color:#94a3b8;font-size:10px;padding:4px;">В отряде нет живых союзников.</div>`;
    else allies.forEach((al, i) => { h += `<button class="btn btn-emp-ally" data-idx="${i}" ${caster._empowerUsed.ally ? 'disabled' : ''} style="width:100%;margin-bottom:4px;text-align:left;">🤝 Союзник: <b>${al.name}</b> ${caster._empowerUsed.ally ? '(Использовано)' : ''}</button>`; });
    ov.innerHTML = h + '</div>';
    document.body.appendChild(ov);

    const applyTo = (target, modeKey) => {
      if ((caster.mana || 0) < cost) { S.log(`❌ Не хватает маны (нужно ${cost}).`); return; }
      caster.mana -= cost; caster._empowerUsed[modeKey] = true; ov.remove();
      const realTrg = target._escortRef ? target._escortRef : target;
      const units = [];
      Object.keys(realTrg.gifts || {}).forEach(gk => {
        const gObj = realTrg.gifts[gk];
        if (gObj && Number(gObj.lvl || 1) < 30) units.push({ obj: gObj, label: (C.DARS[gk] && C.DARS[gk].name) || gk });
        Object.keys((gObj && gObj.branches) || {}).forEach(bk => {
          const bObj = gObj.branches[bk];
          const bMeta = C.DARS[gk] && (C.DARS[gk].branches || []).find(x => x.id === bk);
          if (bObj && Number(bObj.lvl || 1) < 30) units.push({ obj: bObj, label: (bMeta && bMeta.name) || bk });
        });
      });
      if (units.length) {
        const pick = units[Math.floor(Math.random() * units.length)];
        const nl = Number(pick.obj.lvl || 1) + 1;
        pick.obj.lvl = pick.obj.level = nl;
        S.log(`🌿 <b>[Мастер усиления]</b>: у <b>${realTrg.name}</b> вырос навык «<b>${pick.label}</b>» до <b>Ур.${nl}</b>!`);
      } else {
        realTrg.stats = realTrg.stats || { int: 10, spi: 10 };
        realTrg.stats.int = (realTrg.stats.int || 10) + 5; realTrg.stats.spi = (realTrg.stats.spi || 10) + 5;
        S.log(`🌿 <b>[Мастер усиления]</b>: все Дары <b>${realTrg.name}</b> на капе -> перелив +5 Инт, +5 Дух!`);
      }
      S.syncHeroProfile(caster); S.saveDB(); if (S.renderGame) S.renderGame();
    };
    const sb = document.getElementById('btn-emp-self'); if (sb) sb.onclick = () => applyTo(caster, 'self');
    ov.querySelectorAll('.btn-emp-ally').forEach(b => { b.onclick = () => applyTo(allies[Number(b.dataset.idx)], 'ally'); });
  };

  // 2. Мирный хил вне боя + привязка боевой Ауры поддержки (±10%..±50%)
  C.useHealerMapHeal = function(caster) {
    const S = global.STIKS;
    if (!S || !caster || !caster.gifts || !caster.gifts.healer) return;
    const g = caster.gifts.healer;
    caster._healsUsed = Number(caster._healsUsed || 0);
    if (caster._healsUsed >= 5) { S.log('⚠️ Лимит исцелений Знахаря (5/5) на этот рейд исчерпан!'); return; }
    const cost = C.getFixedManaCost(caster, g, C.DARS.healer.getManaPct('', g.lvl || 1));
    if ((caster.mana || 0) < cost) { S.log(`❌ Не хватает маны (нужно ${cost}).`); return; }
    caster.mana -= cost; caster._healsUsed++;
    const pct = Number(C.interpNodes(g.lvl || 1, C.DARS.healer.cfg.healPct).toFixed(2));
    const s = S.db && S.db.session;
    const list = (s && Array.isArray(s.players)) ? s.players.filter(pl => pl && pl.hp > 0) : [caster];
    list.forEach(pl => { pl.hp = Math.min(pl.maxHp || 20, (pl.hp || 1) + Math.max(4, Math.round((pl.maxHp || 20) * pct))); });
    S.saveDB(); S.log(`💚 <b>[Знахарь ${caster._healsUsed}/5]</b>: отряд исцелён на <b>${Math.round(pct * 100)}% ОЗ</b> (-${cost} м.)!`);
    if (S.renderGame) S.renderGame();
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;
    if (S && !S._healerMapV2) {
      S._healerMapV2 = true;
      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        if (!s || !vp || s.combat || !p || !p.gifts || !p.gifts.healer) return;
        const col = vp.firstElementChild;
        if (col && !document.getElementById('stiks-healer-map-bar')) {
          const bar = document.createElement('div'); bar.id = 'stiks-healer-map-bar'; bar.style.cssText = 'display:flex;gap:5px;width:100%;';
          bar.innerHTML = `<button class="btn btn-primary" style="flex:1;padding:5px;" onclick="STIKS_CONTENT.useHealerMapHeal(STIKS.db.session.players[STIKS.db.session.activeIdx])">💚 Знахарь (${p._healsUsed || 0}/5)</button>` +
            (p.gifts.healer.branches && p.gifts.healer.branches.b1 ? `<button class="btn" style="flex:1;padding:5px;border-color:#4ade80;color:#86efac;" onclick="STIKS_CONTENT.openHealerEmpowerModal(STIKS.db.session.players[STIKS.db.session.activeIdx])">🌿 Усиление (+1 ур.)</button>` : '');
          col.insertBefore(bar, col.lastElementChild);
        }
      };
    }
    if (UI && CORE && !UI._healerAuraV2) {
      UI._healerAuraV2 = true;
      const origAtk = UI.actAttack.bind(UI);
      UI.actAttack = async function() {
        const p = CORE.state && CORE.state.player;
        if (p && p.supportAura && p.supportAura.active) p.buff = Math.max(p.buff || 1, 1 + p.supportAura.pct);
        await origAtk();
      };
      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const p = CORE.state && CORE.state.player, hpBefore = p ? p.hp : 0;
        await origEnTurn();
        if (p && p.supportAura && p.supportAura.active) {
          if (p.hp < hpBefore) p.hp = Math.min(p.maxHp, hpBefore - Math.max(1, Math.round((hpBefore - p.hp) * (1 - p.supportAura.pct))));
          if (p.mana >= p.supportAura.tickMana) { p.mana -= p.supportAura.tickMana; UI.log(`🌿 <b>[Аура поддержки]</b>: -${p.supportAura.tickMana} маны за раунд.`); }
          else { p.supportAura.active = false; UI.log('⚠️ Мана кончилась — <b>Аура поддержки</b> погасла.'); }
          UI.renderBattle();
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №3 (ЧАСТЬ 3А): КЛОКСТОПЕР (clockstopper)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('clockstopper', {
    pool: 'human', name: 'Клокстопер', type: 'active', cap: 20, mana1: 100, mana30: 15,
    cfg: {
      baseHits: [[1, 4], [5, 7], [10, 11], [20, 15]],
      baseMana: [[1, 100], [5, 70], [10, 40], [20, 15]],
      knivesCnt: [[1, 2], [10, 4], [30, 8]],
      knivesMult: [[1, 1.5], [10, 2.2], [30, 3.5]],
      knivesMana: [[1, 45], [10, 28], [30, 10]],
      leapSteps: [[1, 2], [10, 4], [30, 8]],
      leapMana: [[1, 40], [10, 24], [30, 10]],
      dodgePct: [[1, 0.20], [10, 0.45], [30, 0.80]],
      cheatHpPct: [[1, 0.10], [10, 0.20], [30, 0.40]],
      cheatMana: [[1, 50], [10, 35], [30, 15]]
    },
    desc: 'База (бой, кап Ур.20): 4 -> 7 -> 11 -> 15 безответных ударов без контрудара. Ветки: Ножи-ракеты (2->8 ножей, 1.5x->3.5x пробитие), Скачок без ОХ (2->8 шагов), Сумасшедшее уклонение (+20%->+80%), Избегание смерти (10%->40% ОЗ).',
    branches: [
      { id: 'b1', name: 'Ножи-ракеты', type: 'active', mode: 'battle', mana1: 45, mana30: 10, desc: 'Залп с игнорированием брони: 2 (1.5x) -> 4 (2.2x) -> 8 ножей (3.5x).' },
      { id: 'b2', name: 'Скачок без ОХ', type: 'active', mode: 'map', mana1: 40, mana30: 10, desc: 'Карта: даёт 2 (Ур.1) -> 4 (Ур.10) -> 8 (Ур.30+) шагов за 0 ОХ.' },
      { id: 'b3', name: 'Сумасшедшее уклонение', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: +20% (Ур.1) -> +45% (Ур.10) -> +80% (Ур.30+) к шансу уклониться от удара.' },
      { id: 'b4', name: 'Избегание смерти', type: 'trigger', mana1: 50, mana30: 15, desc: 'Триггер: при фатальном ударе оставляет 10% -> 20% -> 40% макс. ОЗ.' }
    ],
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
        ctx.log('⚠️ <b>[Скачок без ОХ]</b> применяется на <b>карте рейда</b> (кнопка внизу экрана)! Запускай «Ножи-ракеты» или базовую серию.');
        return;
      }
      if (ctx.branchId === 'b1') {
        const cnt = Math.round(C.interpNodes(ctx.lvl, this.cfg.knivesCnt));
        const mult = Number(C.interpNodes(ctx.lvl, this.cfg.knivesMult).toFixed(2));
        const baseKnife = Math.max(4, Math.round(((ctx.p.stats.agi || 10) * 0.45 + (ctx.p.stats.str || 10) * 0.25) * mult * ctx.intMult));
        for (let i = 0; i < cnt; i++) {
          const cur = ctx.enemies.filter(e => !e.dead);
          if (!cur.length) break;
          const trg = cur[i % cur.length];
          ctx.dealDamage(trg, baseKnife, `🚀 -${baseKnife}`);
          if (ctx.wait) await ctx.wait(90);
        }
        ctx.log(`🚀 <b>[Ножи-ракеты]</b>: выпущено <b>${cnt} ножей</b> (множ. ${mult}x, игнор брони) по <b>${baseKnife}</b> урона!`);
        return;
      }
      // База: 4 -> 7 -> 11 -> 15 безответных ударов оружием
      const hits = Math.round(C.interpNodes(ctx.lvl, this.cfg.baseHits));
      const w = ctx.p.weap || { dmg: 6, isGun: false };
      const statAdd = Math.round(w.isGun ? (ctx.p.stats.agi || 10) * 0.25 : (ctx.p.stats.str || 10) * 0.35);
      const perHit = Math.max(2, Math.round((w.dmg + statAdd) * (ctx.p.buff || 1)));
      for (let i = 0; i < hits; i++) {
        const cur = ctx.enemies.filter(e => !e.dead);
        if (!cur.length) break;
        const trg = cur[0];
        ctx.dealDamage(trg, perHit, i % 2 === 0 ? `⚡ -${perHit}` : null);
        if (ctx.wait) await ctx.wait(65);
      }
      ctx.log(`⏳ <b>[Клокстопер: Замедление]</b>: <b>${hits} безответных ударов</b> по <b>${perHit}</b> урона без контрудара!`);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №3 (ЧАСТЬ 3Б): СКАЧОК, УКЛОНЕНИЕ И ИЗБЕГАНИЕ СМЕРТИ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.clockstopper) return;

  // 1. Скачок без ОХ на карте (2 -> 4 -> 8 шагов за 0 ОХ)
  C.useClockstopperLeap = function(p) {
    const S = global.STIKS;
    const b2 = p && p.gifts && p.gifts.clockstopper && p.gifts.clockstopper.branches && p.gifts.clockstopper.branches.b2;
    if (!S || !b2) return;
    const cost = C.getFixedManaCost(p, b2, C.DARS.clockstopper.getManaPct('b2', b2.lvl || 1));
    if ((p.mana || 0) < cost) { S.log(`❌ Не хватает маны на Скачок (нужно ${cost}).`); return; }
    p.mana -= cost;
    const steps = Math.round(C.interpNodes(b2.lvl || 1, C.DARS.clockstopper.cfg.leapSteps));
    p.freeLeapSteps = (p.freeLeapSteps || 0) + steps;
    S.saveDB();
    S.log(`⏳ <b>[Скачок без ОХ]</b>: следующие <b>${steps} шагов</b> по карте стоят <b>0 ОХ</b> (-${cost} маны)!`);
    if (S.renderGame) S.renderGame();
  };

  // Фиксация маны для Клокстопера в runDarInCombat
  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE;
    const p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'clockstopper' && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.clockstopper.getManaPct(item.branchId, item.lvl));
    }
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    if (S && !S._clockLeapBound) {
      S._clockLeapBound = true;
      const origStep = S.stepPlayer.bind(S);
      S.stepPlayer = function(dx, dy) {
        const s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx];
        const hadFree = Boolean(p && p.freeLeapSteps > 0);
        const oldAp = p ? p.stepsLeft : 0;
        origStep(dx, dy);
        if (hadFree && p && p.stepsLeft < oldAp) {
          p.stepsLeft = oldAp;
          p.freeLeapSteps = Math.max(0, p.freeLeapSteps - 1);
          this.saveDB();
          if (this.renderGame) this.renderGame();
        }
      };

      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        const b2 = p && p.gifts && p.gifts.clockstopper && p.gifts.clockstopper.branches && p.gifts.clockstopper.branches.b2;
        if (!s || !vp || s.combat || !b2) return;
        const col = vp.firstElementChild;
        if (col && !document.getElementById('btn-clock-leap')) {
          const btn = document.createElement('button');
          btn.id = 'btn-clock-leap'; btn.className = 'btn';
          btn.style.cssText = 'width:100%;padding:5px;border-color:#c084fc;color:#e9d5ff;';
          btn.textContent = p.freeLeapSteps > 0 ? `⏳ Скачок активен (осталось ${p.freeLeapSteps} шагов за 0 ОХ)` : '⏳ Скачок без ОХ (карта)';
          btn.onclick = () => C.useClockstopperLeap(p);
          col.insertBefore(btn, col.lastElementChild);
        }
      };
    }

    if (UI && CORE && !UI._clockCombatBound) {
      UI._clockCombatBound = true;
      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const st = CORE.state, p = st && st.player, hpBefore = p ? p.hp : 0;
        await origEnTurn();
        if (!p || p.hp >= hpBefore) return;
        const dodgeIt = (p.learned || []).find(x => x.darKey === 'clockstopper' && x.branchId === 'b3');
        if (dodgeIt) {
          const ch = C.interpNodes(dodgeIt.lvl, C.DARS.clockstopper.cfg.dodgePct);
          if (Math.random() < ch) {
            p.hp = hpBefore;
            UI.popBack('u-player', true, '💨 УКЛОНЕНИЕ!', 'float-skill');
            UI.log(`💨 <b>[Сумасшедшее уклонение]</b> (${Math.round(ch * 100)}%): урон полностью пролетел мимо!`);
            UI.renderBattle();
            return;
          }
        }
        const cheatIt = (p.learned || []).find(x => x.darKey === 'clockstopper' && x.branchId === 'b4');
        if (cheatIt && p.hp <= 0) {
          const mCost = C.getFixedManaCost(p, cheatIt, C.DARS.clockstopper.getManaPct('b4', cheatIt.lvl));
          if (p.mana >= mCost) {
            p.mana -= mCost;
            const keepPct = C.interpNodes(cheatIt.lvl, C.DARS.clockstopper.cfg.cheatHpPct);
            p.hp = Math.max(1, Math.round(p.maxHp * keepPct));
            if (st) st.finished = false;
            UI.popBack('u-player', true, `⏳ ИЗБЕЖАНИЕ СМЕРТИ (${p.hp} ОЗ)`, 'float-crit');
            UI.log(`⏳ <b>[Избегание смерти]</b>: фатальный удар отменён! Оставлено <b>${Math.round(keepPct * 100)}% ОЗ (${p.hp})</b> за ${mCost} маны!`);
            UI.renderBattle();
          }
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №4 (ЧАСТЬ 4А): СКРЫТ (stealth) И «ПРИЗРАК» В БОЮ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('stealth', {
    pool: 'human', name: 'Скрыт', type: 'active', mode: 'map', mana1: 50, mana30: 1,
    cfg: {
      mapMana: [,,],
      groupRad: [,,],
      groupMana: [,,],
      ghostMana: [,,],
      phaseDist: [,,],
      phaseMana: [,,]
    },
    desc: 'База (карта): невидимость (Внимательно до +3 ранга, Быстро до +2, Бегом до +1), +0.5 Ловкости при враге в 3 кл. Ветки: Общий скрыт (2->10 кл.), Призрак (бой: 90% уклонения против <=+1 ранга), Бесплотность (карта: сквозь стены 2->5 кл. за 3 ОХ).',
    branches: [
      { id: 'b1', name: 'Общий скрыт', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: укрывает отряд от агра в радиусе 2 (Ур.1) -> 5 (Ур.10) -> 10 (Ур.30+) клеток.' },
      { id: 'b2', name: 'Призрак', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой: режет меткость врагов на 90% против <= +1 ранга (±30%/ранг) за фикс. ману/раунд.' },
      { id: 'b3', name: 'Бесплотность', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: фазовый переход сквозь препятствия за 3 ОХ на 2 -> 3 -> 5 клеток (останавливается Стеной огня).' }
    ],
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
        ctx.log(`⚠️ <b>[${ctx.title}]</b> применяется на <b>карте рейда</b> (кнопка внизу экрана)! В бою работает ветка «Призрак».`);
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

  // Фиксация маны для Скрыта + расчёт уклонения «Призрака» в бою
  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'stealth' && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.stealth.getManaPct(item.branchId, item.lvl));
    }
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;
    if (!UI || !CORE || UI._ghostCombatBound) return;
    UI._ghostCombatBound = true;

    const origEnTurn = UI.runEnemiesTurn.bind(UI);
    UI.runEnemiesTurn = async function() {
      const st = CORE.state, p = st && st.player, hpBefore = p ? p.hp : 0;
      await origEnTurn();
      if (!p || !p.ghostMode || !p.ghostMode.active) return;

      if (p.hp < hpBefore) {
        const attacker = (st.enemies || []).find(e => !e.dead && e.dist <= 0) || (st.enemies || [])[0];
        const eRank = attacker ? Number(attacker.rank || 0) : 0;
        const diff = eRank - Number(p.rank || 0);
        const missChance = diff <= 1 ? 0.90 : Math.max(0.10, 0.90 - (diff - 1) * 0.30);
        if (Math.random() < missChance) {
          p.hp = hpBefore;
          UI.popBack('u-player', true, '👻 НЕМАТЕРИАЛЬНОСТЬ!', 'float-skill');
          UI.log(`👻 <b>[Призрак]</b> (${Math.round(missChance * 100)}%): атака прошла сквозь призрачное тело!`);
        }
      }
      if (p.mana >= p.ghostMode.tickMana) {
        p.mana -= p.ghostMode.tickMana;
        UI.log(`👻 <b>[Призрак]</b>: расход фикс. ${p.ghostMode.tickMana} маны за раунд.`);
      } else {
        p.ghostMode.active = false;
        UI.log('⚠️ Мана исчерпана — режим <b>Призрак</b> отключился!');
      }
      UI.renderBattle();
    };
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №4 (ЧАСТЬ 4Б): СКРЫТ, ОБЩИЙ СКРЫТ И БЕСПЛОТНОСТЬ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.stealth) return;

  C.toggleMapStealth = function(p, isGroup) {
    const S = global.STIKS;
    const g = p && p.gifts && p.gifts.stealth;
    if (!S || !g) return;
    const targetObj = isGroup ? (g.branches && g.branches.b1) : g;
    if (!targetObj) return;
    if (p.stealthActive) {
      p.stealthActive = false; p.groupStealthRad = 0;
      S.saveDB(); S.log('👁️ Режим невидимости «Скрыт» отключён.');
      if (S.renderGame) S.renderGame();
      return;
    }
    const cost = C.getFixedManaCost(p, targetObj, C.DARS.stealth.getManaPct(isGroup ? 'b1' : '', targetObj.lvl || 1));
    if ((p.mana || 0) < cost) { S.log(`❌ Не хватает маны на Скрыт (нужно ${cost}).`); return; }
    p.mana -= cost;
    p.stealthActive = true;
    p.groupStealthRad = isGroup ? Math.round(C.interpNodes(targetObj.lvl || 1, C.DARS.stealth.cfg.groupRad)) : 0;
    S.saveDB();
    S.log(`👁️ <b>[${isGroup ? 'Общий скрыт (' + p.groupStealthRad + ' кл.)' : 'Скрыт'}]</b> активирован (-${cost} маны)! Темп: Внимательно до +3р, Быстро до +2р, Бегом до +1р.`);
    if (S.renderGame) S.renderGame();
  };

  C.usePhaseWalk = function(p) {
    const S = global.STIKS;
    const s = S && S.db && S.db.session;
    const b3 = p && p.gifts && p.gifts.stealth && p.gifts.stealth.branches && p.gifts.stealth.branches.b3;
    if (!S || !s || !b3 || !Array.isArray(s.grid)) return;
    if ((p.stepsLeft || 0) < 3) { S.log('❌ Для Бесплотности нужно 3 ОХ!'); return; }
    const cost = C.getFixedManaCost(p, b3, C.DARS.stealth.getManaPct('b3', b3.lvl || 1));
    if ((p.mana || 0) < cost) { S.log(`❌ Не хватает маны на Бесплотность (нужно ${cost}).`); return; }

    const maxDist = Math.round(C.interpNodes(b3.lvl || 1, C.DARS.stealth.cfg.phaseDist));
    const dx = p.lastDx || 0, dy = p.lastDy || -1;
    let land = null;
    for (let d = 1; d <= maxDist; d++) {
      const tx = p.x + dx * d, ty = p.y + dy * d;
      if (tx < 0 || tx > 59 || ty < 0 || ty > 59) break;
      const cell = s.grid[ty] && s.grid[ty][tx];
      if (cell && cell.fireWall) { S.log('🔥 Бесплотность остановлена <b>Стеной огня</b>!'); break; }
      if (cell && !cell.blocked) land = { x: tx, y: ty, dist: d };
    }
    if (!land) { S.log('⚠️ За преградой нет свободной клетки в пределах дальности фазы (' + maxDist + ' кл.)!'); return; }
    p.stepsLeft -= 3; p.mana -= cost; p.x = land.x; p.y = land.y;
    S.saveDB(); S.log(`👻 <b>[Бесплотность]</b>: фазовый переход сквозь преграды на ${land.dist} кл. (${p.x}:${p.y})!`);
    if (S.renderGame) S.renderGame();
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS;
    if (!S || S._stealthMapBound) return;
    S._stealthMapBound = true;

    const origStep = S.stepPlayer.bind(S);
    S.stepPlayer = function(dx, dy) {
      const s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx];
      if (p) { p.lastDx = dx; p.lastDy = dy; }
      origStep(dx, dy);
      if (p && p.stealthActive && Array.isArray(s.zombies)) {
        const nearEnemy = s.zombies.some(z => Math.abs(z.x - p.x) <= 3 && Math.abs(z.y - p.y) <= 3);
        if (nearEnemy && p.stats) { p.stats.agi = Number(((p.stats.agi || 10) + 0.5).toFixed(2)); this.log('👁️ Скрыт рядом с врагом: +0.5 Ловкости!'); }
        const paceBonus = (p.pace === 'careful') ? 3 : (p.pace === 'fast' ? 2 : 1);
        const pRank = (global.STIKS_COMBAT_CORE && global.STIKS_COMBAT_CORE.getPlayerRankByLvl(p.lvl || 0)) || 0;
        s.zombies.forEach(z => {
          if (z.tPos && z.tPos.x === p.x && z.tPos.y === p.y && ((z.rank || 0) <= pRank + paceBonus)) z.tPos = null;
        });
      }
    };

    const origGame = S.renderGame.bind(S);
    S.renderGame = function() {
      origGame();
      const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
      const g = p && p.gifts && p.gifts.stealth;
      if (!s || !vp || s.combat || !g) return;
      const col = vp.firstElementChild;
      if (col && !document.getElementById('stiks-stealth-bar')) {
        const bar = document.createElement('div'); bar.id = 'stiks-stealth-bar'; bar.style.cssText = 'display:flex;gap:4px;width:100%;flex-wrap:wrap;';
        bar.innerHTML = `<button class="btn ${p.stealthActive ? 'btn-primary' : ''}" style="flex:1;padding:5px;" onclick="STIKS_CONTENT.toggleMapStealth(STIKS.db.session.players[STIKS.db.session.activeIdx],false)">${p.stealthActive ? '👁️ Скрыт: ВКЛ' : '👁️ Скрыт'}</button>` +
          (g.branches && g.branches.b1 ? `<button class="btn" style="flex:1;padding:5px;" onclick="STIKS_CONTENT.toggleMapStealth(STIKS.db.session.players[STIKS.db.session.activeIdx],true)">👥 Общий скрыт</button>` : '') +
          (g.branches && g.branches.b3 ? `<button class="btn" style="flex:1;padding:5px;border-color:#38bdf8;color:#bae6fd;" onclick="STIKS_CONTENT.usePhaseWalk(STIKS.db.session.players[STIKS.db.session.activeIdx])">👻 Фаза (3 ОХ)</button>` : '');
        col.insertBefore(bar, col.lastElementChild);
      }
    };
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №5 (ЧАСТЬ 5А): МАСТЕР ОГНЯ И ОГНЕННЫЙ ЩИТ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('fire_master', {
    pool: 'human', name: 'Мастер огня', type: 'active', mode: 'battle', mana1: 50, mana30: 10,
    cfg: {
      volleys: [[1, 1], [10, 2], [30, 3]],
      targets: [[1, 1], [10, 3], [30, 6]],
      dmgMult: [[1, 3.0], [10, 3.9], [30, 5.0]],
      baseMana: [[1, 50], [10, 28], [30, 10]],
      shieldRet: [[1, 1.5], [10, 1.95], [30, 2.5]],
      shieldMana: [[1, 50], [10, 25], [30, 5]],
      wallCells: [[1, 1], [10, 3], [30, 5]],
      wallTurns: [[1, 2], [10, 4], [30, 6]],
      wallHpCut: [[1, 0.33], [10, 0.52], [30, 0.75]],
      wallMana: [[1, 50], [10, 28], [30, 10]],
      fireRes: [[1, 0.80], [10, 1.0], [30, 1.20]]
    },
    desc: 'База (бой без пропуска атаки): 1->2->3 залпа/бой по 1->3->6 целям (300%->390%->500% урона). Ветки: Огненный щит (-50% урона + 150%->250% ожог), Стена огня (карта 1->5 кл. на 2->6 ходов), Друг огня (80%->100%->хил от огня).',
    branches: [
      { id: 'b1', name: 'Огненный щит', type: 'active', mode: 'battle', mana1: 50, mana30: 5, desc: 'Бой: режет входящий урон на 50%, возвращает 150% -> 195% -> 250% ожогом в ближнем бою (фикс. мана/раунд).' },
      { id: 'b2', name: 'Стена огня', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: преграда 1->3->5 кл. на 2->4->6 ходов (50% отброс или ожог 33%->75% ОЗ; растапливает Гололёд).' },
      { id: 'b3', name: 'Друг огня', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: поглощает 80% огня (Ур.1) -> 100% иммунитет (Ур.10) -> хил 20% от огня + мана (Ур.30+).' }
    ],
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
        ctx.log('⚠️ <b>[Стена огня]</b> ставится на <b>карте рейда</b> (кнопка внизу экрана)! В бою используй базовый залп или «Огненный щит».');
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
      // Базовый залп: 1 -> 2 -> 3 раза/бой, 1 -> 3 -> 6 целей, 300% -> 390% -> 500% урона
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
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №5 (ЧАСТЬ 5Б): ОГНЕННЫЙ ЩИТ И СТЕНА ОГНЯ НА КАРТЕ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.fire_master) return;

  C.castFireWallMap = function(p) {
    const S = global.STIKS, s = S && S.db && S.db.session;
    const b2 = p && p.gifts && p.gifts.fire_master && p.gifts.fire_master.branches && p.gifts.fire_master.branches.b2;
    if (!S || !s || !b2 || !Array.isArray(s.grid)) return;
    const cost = C.getFixedManaCost(p, b2, C.DARS.fire_master.getManaPct('b2', b2.lvl || 1));
    if ((p.mana || 0) < cost) { S.log(`❌ Не хватает маны на Стену огня (нужно ${cost}).`); return; }

    p.mana -= cost;
    const len = Math.round(C.interpNodes(b2.lvl || 1, C.DARS.fire_master.cfg.wallCells));
    const turns = Math.round(C.interpNodes(b2.lvl || 1, C.DARS.fire_master.cfg.wallTurns));
    const hpCut = Number(C.interpNodes(b2.lvl || 1, C.DARS.fire_master.cfg.wallHpCut).toFixed(2));
    const dx = p.lastDx || 0, dy = p.lastDy || -1;
    const px = dy !== 0 ? 1 : 0, py = dx !== 0 ? 1 : 0;
    let placed = 0;

    for (let i = 0; i < len; i++) {
      const off = i - Math.floor(len / 2);
      const tx = p.x + dx + px * off, ty = p.y + dy + py * off;
      const cell = s.grid[ty] && s.grid[ty][tx];
      if (!cell || cell.blocked) continue;
      cell.fireWall = { turns, hpCut };
      if (cell.iceFloor) { delete cell.iceFloor; }
      placed++;
    }
    S.saveDB();
    S.log(`🔥 <b>[Стена огня]</b>: выставлено ${placed} кл. на <b>${turns} ходов</b> (ожог ${Math.round(hpCut * 100)}% ОЗ, лёд растоплен, -${cost} м.)!`);
    if (S.renderGame) S.renderGame();
  };

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'fire_master' && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.fire_master.getManaPct(item.branchId, item.lvl));
    }
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    if (S && !S._fireWallMapBound) {
      S._fireWallMapBound = true;
      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        const b2 = p && p.gifts && p.gifts.fire_master && p.gifts.fire_master.branches && p.gifts.fire_master.branches.b2;
        if (!s || !vp || s.combat || !b2) return;
        const col = vp.firstElementChild;
        if (col && !document.getElementById('btn-fire-wall')) {
          const btn = document.createElement('button');
          btn.id = 'btn-fire-wall'; btn.className = 'btn';
          btn.style.cssText = 'width:100%;padding:5px;border-color:#f97316;color:#fed7aa;';
          btn.textContent = '🔥 Стена огня (карта)';
          btn.onclick = () => C.castFireWallMap(p);
          col.insertBefore(btn, col.lastElementChild);
        }
      };
    }

    if (UI && CORE && !UI._fireShieldBound) {
      UI._fireShieldBound = true;
      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const st = CORE.state, p = st && st.player, hpBefore = p ? p.hp : 0;
        await origEnTurn();
        if (!p || !p.fireShield || !p.fireShield.active) return;

        if (p.hp < hpBefore) {
          const lost = hpBefore - p.hp;
          const halfDmg = Math.max(1, Math.round(lost * 0.5));
          p.hp = Math.min(p.maxHp, hpBefore - halfDmg);
          const attacker = (st.enemies || []).find(e => !e.dead && e.dist <= 0);
          if (attacker) {
            const burn = Math.max(1, Math.round(lost * p.fireShield.retMult));
            if (st.mode === 'game') { attacker.hp = Math.max(0, attacker.hp - burn); if (attacker.hp <= 0) attacker.dead = true; }
            else attacker.hp = Math.max(1, attacker.hp - burn);
            UI.popBack('u-' + attacker.id, false, `🔥 Ожог -${burn}${attacker.dead ? ' 💀' : ''}`, 'float-crit');
            UI.log(`🔥 <b>[Огненный щит]</b>: урон срезан вдвое (-${halfDmg}), ответный ожог <b>-${burn}</b> по <b>${attacker.name}</b>!`);
          }
        }
        if (p.mana >= p.fireShield.tickMana) {
          p.mana -= p.fireShield.tickMana;
          UI.log(`🔥 <b>[Огненный щит]</b>: -${p.fireShield.tickMana} фикс. маны за раунд.`);
        } else {
          p.fireShield.active = false;
          UI.log('⚠️ Мана исчерпана — <b>Огненный щит</b> погас!');
        }
        UI.renderBattle();
        if (UI.checkBattleEnd) UI.checkBattleEnd();
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №6 (ЧАСТЬ 6А): СОНИК (sonic)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('sonic', {
    pool: 'human', name: 'Соник', type: 'active', mode: 'battle', mana1: 100, mana30: 10,
    cfg: {
      baseMana: [,,],
      highDmgMult: [[1, 1.5], [10, 2.2], [30, 3.0]],
      concussMiss: [[1, 0.70], [10, 0.80], [30, 0.90]],
      silenceRad: [,,],
      echoRad: [,,],
      echoMana: [,,],
      infraRad: [,,],
      infraMana: [,,]
    },
    desc: 'База (бой без потери атаки): оглушает врагов ниже/равного ранга (3р / 2р без урона), +1 ранг (50/50 стан 1р или урон), +2 и выше (50/50 урон 150%->300% или контузия -70%->-90% меткости). Ветки: Купол тишины, Эхолокатор, Инфразвук.',
    branches: [
      { id: 'b1', name: 'Купол тишины', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: бесшумный бег (Ур.1) -> глушение звуков и стрельбы отряда в радиусе 4 (Ур.10) -> 10 (Ур.30+) кл.' },
      { id: 'b2', name: 'Эхолокатор', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: вскрывает засады/Скрытов и указывает на ценный лут в радиусе 6 -> 14 -> 25 кл.' },
      { id: 'b3', name: 'Инфразвук', type: 'active', mode: 'map', mana1: 60, mana30: 10, desc: 'Карта/стычка (2->6->12 кл.): враги обделываются (ОХ=0 + «Вонь» 5 ходов; шанс 100% <= равного ранга, -20%/ранг).' }
    ],
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
        ctx.log(`⚠️ <b>[${ctx.title}]</b> применяется на <b>карте рейда</b> (кнопка внизу экрана)!`);
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
// STIKS_CONTENT // КАНОН ДАРА №6 (ЧАСТЬ 6Б): ЧИСТЫЙ СТАН/УРОН, ЭХО И ИНФРАЗВУК
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.sonic) return;

  // Уточнённый канон базового Соника: ИЛИ чистое оглушение (0 урона), ИЛИ урон/контузия
  C.DARS.sonic.execute = function(ctx) {
    if (ctx.branchId === 'b2' || ctx.branchId === 'b3') {
      ctx.p.mana += ctx.cost;
      if (ctx.item) ctx.item.usedRound = false;
      ctx.log(`⚠️ <b>[${ctx.title}]</b> применяется на <b>карте рейда</b> (кнопка внизу экрана)!`);
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
  };

  C.useSonicMapSkill = function(p, mode) {
    const S = global.STIKS, s = S && S.db && S.db.session;
    const g = p && p.gifts && p.gifts.sonic;
    const br = g && g.branches && g.branches[mode];
    if (!S || !s || !br) return;
    const cost = C.getFixedManaCost(p, br, C.DARS.sonic.getManaPct(mode, br.lvl || 1));
    if ((p.mana || 0) < cost) { S.log(`❌ Не хватает маны (нужно ${cost}).`); return; }
    p.mana -= cost;

    if (mode === 'b2') {
      const rad = Math.round(C.interpNodes(br.lvl || 1, C.DARS.sonic.cfg.echoRad));
      let foundZ = 0, bestLoot = null, bestD = 999;
      (s.zombies || []).forEach(z => { if (Math.abs(z.x - p.x) <= rad && Math.abs(z.y - p.y) <= rad && z.hidden) { z.hidden = false; foundZ++; } });
      for (let y = Math.max(0, p.y - rad); y <= Math.min(59, p.y + rad); y++) {
        for (let x = Math.max(0, p.x - rad); x <= Math.min(59, p.x + rad); x++) {
          const c = s.grid[y] && s.grid[y][x];
          if (c && c.lootType && c.valuable) {
            const d = Math.abs(x - p.x) + Math.abs(y - p.y);
            if (d < bestD) { bestD = d; bestLoot = { x, y }; }
          }
        }
      }
      const dir = bestLoot ? ` | Ценный лут: ${bestLoot.x}:${bestLoot.y} (${bestD} кл.)` : '';
      S.log(`📡 <b>[Эхолокатор ${rad} кл.]</b>: вскрыто засад: <b>${foundZ}</b>${dir} (-${cost} м.).`);
    } else if (mode === 'b3') {
      const rad = Math.round(C.interpNodes(br.lvl || 1, C.DARS.sonic.cfg.infraRad));
      const pRank = (global.STIKS_COMBAT_CORE && global.STIKS_COMBAT_CORE.getPlayerRankByLvl(p.lvl || 0)) || 0;
      let hit = 0;
      (s.zombies || []).forEach(z => {
        if (Math.abs(z.x - p.x) <= rad && Math.abs(z.y - p.y) <= rad) {
          const diff = (z.rank || 0) - pRank;
          const ch = diff <= 0 ? 1.0 : Math.max(0.20, 1.0 - diff * 0.20);
          if (Math.random() < ch) { z.ap = 0; z.stinkTurns = 5; z.tPos = null; hit++; }
        }
      });
      S.log(`💩 <b>[Инфразвук ${rad} кл.]</b>: обделалось врагов: <b>${hit}</b> (ОХ=0 + «Вонь» на 5 ходов, -${cost} м.)!`);
    }
    S.saveDB(); if (S.renderGame) S.renderGame();
  };

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'sonic' && !item.manaAnchor) C.getFixedManaCost(p, item, C.DARS.sonic.getManaPct(item.branchId, item.lvl));
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;
    if (UI && CORE && !UI._sonicConcussBound) {
      UI._sonicConcussBound = true;
      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const st = CORE.state, p = st && st.player, hpBefore = p ? p.hp : 0;
        await origEnTurn();
        const conc = st && (st.enemies || []).find(e => !e.dead && e.concussion && e.concussion.rounds > 0);
        if (conc && p && p.hp < hpBefore && Math.random() < conc.concussion.missChance) {
          p.hp = hpBefore;
          UI.popBack('u-' + conc.id, false, '😵 КОНТУЗИЯ: ПРОМАХ!', 'float-skill');
          UI.log(`😵 <b>${conc.name}</b> промахнулся из-за контузии (${Math.round(conc.concussion.missChance * 100)}%)!`);
          UI.renderBattle();
        }
        (st && st.enemies || []).forEach(e => { if (e.concussion && e.concussion.rounds > 0) e.concussion.rounds--; });
      };
    }
    if (S && !S._sonicMapBound) {
      S._sonicMapBound = true;
      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        const g = p && p.gifts && p.gifts.sonic;
        if (!s || !vp || s.combat || !g || !g.branches) return;
        const col = vp.firstElementChild;
        if (col && (g.branches.b2 || g.branches.b3) && !document.getElementById('stiks-sonic-bar')) {
          const bar = document.createElement('div'); bar.id = 'stiks-sonic-bar'; bar.style.cssText = 'display:flex;gap:5px;width:100%;';
          bar.innerHTML = (g.branches.b2 ? `<button class="btn" style="flex:1;padding:5px;border-color:#38bdf8;color:#bae6fd;" onclick="STIKS_CONTENT.useSonicMapSkill(STIKS.db.session.players[STIKS.db.session.activeIdx],'b2')">📡 Эхолокатор</button>` : '') +
            (g.branches.b3 ? `<button class="btn" style="flex:1;padding:5px;border-color:#eab308;color:#fef08a;" onclick="STIKS_CONTENT.useSonicMapSkill(STIKS.db.session.players[STIKS.db.session.activeIdx],'b3')">💩 Инфразвук</button>` : '');
          col.insertBefore(bar, col.lastElementChild);
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №7 (ЧАСТЬ 7А): МЕНТАЛИСТ (mentalist)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('mentalist', {
    pool: 'human', name: 'Менталист', type: 'active', mode: 'battle', mana1: 100, mana30: 10,
    cfg: {
      baseMana: [,,],
      cdRounds: 3,
      barrierPct: [[1, 0.50], [10, 0.80], [30, 1.0]],
      jamRad: [,,],
      jamRankPlus: [,,],
      jamMana: [,,],
      booMana: [,,]
    },
    desc: 'База (бой, КД 3р): подавляет волю врага <= +1 ранга на 1..3р и забирает раунд атаки себе (ниже планки +1р, выше -50%/ранг). Ветки: Ментальный барьер (50%->100%), Активная глушилка (2->10 кл.), Бу! (1/бой: 25% бегство / 25% подчинение — бьёт своих).',
    branches: [
      { id: 'b1', name: 'Ментальный барьер', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: шанс избежать дебаффа/пси-атаки (вкл. Инфразвук) 50% (Ур.1) -> 80% (Ур.10) -> 100% (Ур.30+).' },
      { id: 'b2', name: 'Активная глушилка', type: 'active', mode: 'both', mana1: 30, mana30: 1, desc: 'Карта/бой (2->10 кл.): подавляет Дары (+0/+1/+2 ранга 100%, выше -25%/ранг) за 30% -> 14% -> 1% фикс. маны/ход.' },
      { id: 'b3', name: 'Бу!', type: 'active', mode: 'battle', mana1: 60, mana30: 10, desc: 'Бой (1/бой): шанс 50% <= равного ранга (25% бегство / 25% подчинение — атакует своих до конца боя; +1р = 25%, превосходство = 100%).' }
    ],
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
        const trg = ctx.alive;
        if (!trg) return;
        const diff = (trg.rank || 0) - (ctx.p.rank || 0);
        const totalChance = diff < 0 ? 1.0 : (diff === 0 ? 0.50 : (diff === 1 ? 0.25 : 0));
        if (Math.random() >= totalChance) {
          ctx.popEnemy(trg, '😒 Устоял');
          ctx.log(`👻 <b>[Бу!]</b> (${Math.round(totalChance * 100)}%): <b>${trg.name}</b> не поддался!`);
          return;
        }
        if (Math.random() < 0.50) {
          trg.dead = true; trg.fled = true;
          ctx.popEnemy(trg, '🏃 В УЖАСЕ СБЕЖАЛ!');
          ctx.log(`😱 <b>[Бу! — Испуг]</b>: <b>${trg.name}</b> в ужасе сбежал с поля боя!`);
        } else {
          trg.charmedAlly = true;
          ctx.popEnemy(trg, '🧠 ПОДЧИНЁН (БЬЁТ СВОИХ!)');
          ctx.log(`🧠 <b>[Бу! — Подчинение]</b>: <b>${trg.name}</b> перевербован и теперь <b>атакует своих</b> до конца боя!`);
        }
        return;
      }

      if (ctx.p._mentCd > 0) {
        ctx.p.mana += ctx.cost;
        if (ctx.item) ctx.item.usedRound = false;
        ctx.log(`⏳ <b>[Менталист]</b> на перезарядке (осталось ${ctx.p._mentCd} р.)!`);
        return;
      }
      const trg = ctx.alive;
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
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №7 (ЧАСТЬ 7Б): ПОДЧИНЕНИЕ В БОЮ, ГЛУШИЛКА И БАРЬЕР
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.mentalist) return;

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'mentalist' && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.mentalist.getManaPct(item.branchId, item.lvl));
    }
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    if (UI && CORE && !UI._mentalistCombatBound) {
      UI._mentalistCombatBound = true;
      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const st = CORE.state, p = st && st.player;

        // 1. Подчинённые враги (Бу! / Нимфа / Жиголо) атакуют своих!
        const charmed = (st && st.enemies || []).filter(e => !e.dead && e.charmedAlly);
        for (const allyEn of charmed) {
          const foe = (st.enemies || []).find(e => !e.dead && !e.charmedAlly && e.id !== allyEn.id);
          if (foe) {
            const dmg = Math.max(2, Math.round(allyEn.dmg || 10));
            if (st.mode === 'game') { foe.hp = Math.max(0, foe.hp - dmg); if (foe.hp <= 0) foe.dead = true; }
            else foe.hp = Math.max(1, foe.hp - dmg);
            UI.popBack('u-' + foe.id, false, `🧠 Свой удар -${dmg}${foe.dead ? ' 💀' : ''}`, 'float-crit');
            UI.log(`🧠 <b>${allyEn.name}</b> под контролем атакует своего (<b>${foe.name}</b>) на <b>-${dmg}</b>!`);
            UI.renderBattle();
            if (UI.checkBattleEnd && UI.checkBattleEnd()) return;
            await UI.wait(1100);
          }
          // Чтобы оригинальный цикл врагов не ударил игрока от лица подчинённого:
          allyEn._savedStun = allyEn.stun || 0;
          allyEn.stun = 1;
        }

        await origEnTurn();

        // Восстанавливаем статус подчинённых; если не осталось врагов кроме подчинённых — они сбегают
        charmed.forEach(a => { a.stun = a._savedStun || 0; delete a._savedStun; });
        const freeFoes = (st && st.enemies || []).filter(e => !e.dead && !e.charmedAlly);
        if (charmed.length > 0 && freeFoes.length === 0) {
          charmed.forEach(a => { a.dead = true; a.fled = true; UI.popBack('u-' + a.id, false, '🏃 СБЕЖАЛ ПОСЛЕ БОЯ', 'float-skill'); });
          UI.log('🏃 Подчинённые враги выполнили приказ и сбежали с поля боя!');
          UI.renderBattle();
          if (UI.checkBattleEnd) UI.checkBattleEnd();
        }

        // Тик КД Менталиста и расход фикс. маны Активной глушилки
        if (p && p._mentCd > 0) p._mentCd--;
        if (p && p.jammerAura && p.jammerAura.active) {
          if (p.mana >= p.jammerAura.tickMana) {
            p.mana -= p.jammerAura.tickMana;
            UI.log(`📵 <b>[Активная глушилка]</b>: -${p.jammerAura.tickMana} фикс. маны за раунд.`);
          } else {
            p.jammerAura.active = false;
            UI.log('⚠️ Мана кончилась — <b>Активная глушилка</b> отключилась!');
          }
          UI.renderBattle();
        }
      };
    }

    if (S && !S._mentalistMapBound) {
      S._mentalistMapBound = true;
      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        const b2 = p && p.gifts && p.gifts.mentalist && p.gifts.mentalist.branches && p.gifts.mentalist.branches.b2;
        if (!s || !vp || s.combat || !b2) return;
        const col = vp.firstElementChild;
        if (col && !document.getElementById('btn-ment-jammer')) {
          const btn = document.createElement('button');
          btn.id = 'btn-ment-jammer'; btn.className = `btn ${p.mapJammerOn ? 'btn-primary' : ''}`;
          btn.style.cssText = 'width:100%;padding:5px;';
          btn.textContent = p.mapJammerOn ? '📵 Глушилка Даров: ВКЛ' : '📵 Глушилка Даров (карта)';
          btn.onclick = () => {
            const cost = C.getFixedManaCost(p, b2, C.DARS.mentalist.getManaPct('b2', b2.lvl || 1));
            if (!p.mapJammerOn && (p.mana || 0) < cost) { S.log(`❌ Нужно ${cost} маны.`); return; }
            p.mapJammerOn = !p.mapJammerOn;
            if (p.mapJammerOn) p.mana -= cost;
            S.saveDB(); S.log(`📵 <b>[Активная глушилка]</b> на карте: ${p.mapJammerOn ? 'ВКЛЮЧЕНА (-' + cost + ' м.)' : 'ВЫКЛЮЧЕНА'}.`);
            S.renderGame();
          };
          col.insertBefore(btn, col.lastElementChild);
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРОВ №8 И №9 (ЧАСТЬ 8А): НИМФА И ЖИГОЛО (ЗЕРКАЛО)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  const CHARM_CFG = {
    loyalDmg1: 0.20, hostileDmg1: 2.00,
    coverPct30: 0.30, hostileDmg30: 1.50,
    subMana: [[1, 100], [30, 10]],
    sirenRad: [[1, 3], [30, 7]],
    sirenTame: [[1, 0.50], [30, 0.70]],
    sirenMana: [[1, 50], [30, 5]],
    gazeMiss: [[1, 0.50], [30, 0.75]],
    gazeMana: [[1, 50], [30, 10]]
  };

  function runCharmDar(ctx, isGigolo) {
    if (ctx.branchId === 'b2') {
      ctx.p.mana += ctx.cost;
      if (ctx.item) ctx.item.usedRound = false;
      ctx.log(`⚠️ <b>[${ctx.title}]</b> применяется на <b>карте рейда</b> (кнопка внизу экрана)!`);
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
          en.charmedAlly = true; turned++;
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
    desc: 'База (пассив): лояльны мужчины + 50% заражённых (бьют 20% -> прикрывают до 30% урона), нелояльны женщины + 50% (бьют 200% -> 150%). Взаимный иммунитет с Жиголо.',
    branches: [
      { id: 'b1', name: 'Подчинение', type: 'active', mode: 'battle', mana1: 100, mana30: 10, desc: 'Бой: стравливает половину врагов (75% ±25%/ранг; на капе +5% и +1 вирт. ранг).' },
      { id: 'b2', name: 'Песнь сирены', type: 'active', mode: 'map', mana1: 50, mana30: 5, desc: 'Карта: приманивает ближайшую группу в 3->7 кл.; 50%->70% приручить 1 врага в начале боя.' },
      { id: 'b3', name: 'Томный взгляд', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой: стан половины врагов + -50% -> -75% меткости второй половине на 2..3 хода.' }
    ],
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
    desc: 'Зеркало Нимфы (взаимный иммунитет): лояльны женщины + 50% заражённых (20% -> прикрытие 30%), нелояльны мужчины + 50% (200% -> 150%).',
    branches: [
      { id: 'b1', name: 'Соблазнение', type: 'active', mode: 'battle', mana1: 100, mana30: 10, desc: 'Бой: зеркало «Подчинения» (75% ±25%/ранг, стравливает врагов насмерть).' },
      { id: 'b2', name: 'Зов хищника', type: 'active', mode: 'map', mana1: 50, mana30: 5, desc: 'Карта: зеркало «Песни сирены» (приманивает группу в 3->7 кл., 50%->70% приручение).' },
      { id: 'b3', name: 'Роковая ухмылка', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой: зеркало «Томного взгляда» (стан половины + -50% -> -75% меткости).' }
    ],
    getManaPct(b, l) { return C.DARS.nymph.getManaPct(b, l); },
    execute(ctx) { runCharmDar(ctx, true); }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРОВ №8 И №9 (ЧАСТЬ 8Б): ПЕРЕКОС УРОНА И ЗОВ НА КАРТЕ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.nymph) return;

  C.useSirenLureMap = function(p, darKey) {
    const S = global.STIKS, s = S && S.db && S.db.session;
    const g = p && p.gifts && p.gifts[darKey];
    const b2 = g && g.branches && g.branches.b2;
    if (!S || !s || !b2) return;
    const cost = C.getFixedManaCost(p, b2, C.DARS.nymph.getManaPct('b2', b2.lvl || 1));
    if ((p.mana || 0) < cost) { S.log(`❌ Не хватает маны (нужно ${cost}).`); return; }

    p.mana -= cost;
    const rad = Math.round(C.interpNodes(b2.lvl || 1, C.DARS.nymph.cfg.sirenRad));
    const tameCh = Number(C.interpNodes(b2.lvl || 1, C.DARS.nymph.cfg.sirenTame).toFixed(2));
    p.sirenTameChance = tameCh;

    let lured = 0;
    (s.zombies || []).forEach(z => {
      if (Math.abs(z.x - p.x) <= rad && Math.abs(z.y - p.y) <= rad) {
        z.tPos = { x: p.x, y: p.y };
        lured++;
      }
    });
    S.saveDB();
    const title = darKey === 'gigolo_gift' ? '🌹 Зов хищника' : '🎶 Песнь сирены';
    S.log(`${title} (${rad} кл.): приманено врагов: <b>${lured}</b>! В начале боя шанс <b>${Math.round(tameCh * 100)}%</b> приручить одного (-${cost} м.).`);
    if (S.renderGame) S.renderGame();
  };

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && (item.darKey === 'nymph' || item.darKey === 'gigolo_gift') && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.nymph.getManaPct(item.branchId, item.lvl));
    }
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    if (UI && CORE && !UI._nymphGigoloBound) {
      UI._nymphGigoloBound = true;
      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const st = CORE.state, p = st && st.player;
        const charmIt = p && (p.learned || []).find(x => (x.darKey === 'nymph' || x.darKey === 'gigolo_gift') && !x.branchId);
        if (charmIt && st && Array.isArray(st.enemies)) {
          const isGig = charmIt.darKey === 'gigolo_gift';
          const ratio = Math.min(1, Math.max(0, (charmIt.lvl - 1) / 29));
          st.enemies.forEach(en => {
            if (en._charmInit) return;
            en._charmInit = true;
            const loyal = en.isHuman ? (isGig ? en.sex === 'f' : en.sex === 'm') : (Math.random() < 0.5);
            const mult = loyal ? (0.20 * (1 - ratio)) : (2.0 - 0.50 * ratio);
            en.dmg = Math.max(1, Math.round((en.dmg || 4) * mult));
          });
        }
        await origEnTurn();
      };
    }

    if (S && !S._nymphMapBound) {
      S._nymphMapBound = true;
      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        if (!s || !vp || s.combat || !p || !p.gifts) return;
        const k = (p.gifts.nymph && p.gifts.nymph.branches && p.gifts.nymph.branches.b2) ? 'nymph'
          : ((p.gifts.gigolo_gift && p.gifts.gigolo_gift.branches && p.gifts.gigolo_gift.branches.b2) ? 'gigolo_gift' : '');
        const col = vp.firstElementChild;
        if (k && col && !document.getElementById('btn-siren-lure')) {
          const btn = document.createElement('button');
          btn.id = 'btn-siren-lure'; btn.className = 'btn';
          btn.style.cssText = 'width:100%;padding:5px;border-color:#f472b6;color:#fbcfe8;';
          btn.textContent = k === 'gigolo_gift' ? '🌹 Зов хищника (карта)' : '🎶 Песнь сирены (карта)';
          btn.onclick = () => C.useSirenLureMap(p, k);
          col.insertBefore(btn, col.lastElementChild);
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №10 (ЧАСТЬ 10А): ИЛЛЮЗИОНИСТ (illusionist)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('illusionist', {
    pool: 'human', name: 'Иллюзионист', type: 'active', mode: 'battle', mana1: 100, mana30: 10,
    cfg: {
      cardsCount: 36,
      cardMinPct: [[1, 0.005], [5, 0.007], [10, 0.009], [20, 0.012], [30, 0.015]],
      cardMaxPct: [[1, 0.050], [5, 0.070], [10, 0.090], [20, 0.120], [30, 0.150]],
      manaSteps:  [,,,,],
      magLootPct: [[1, 0.25], [5, 0.30], [10, 0.36], [20, 0.44], [30, 0.50]],
      magRad:     [,,,,],
      sawHealPct: [[1, 0.10], [5, 0.13], [10, 0.16], [20, 0.20], [30, 0.25]],
      sawTurns:   [,,,,],
      sawUses:    [,,,,],
      jugTurns:   [,,,,],
      jugUses:    [,,,,]
    },
    desc: 'База (бой): бросок 36 карт (0.5-5% -> 1.5-15% за карту, 100%->10% фикс. маны). Ветки: Фокусник (пассив 25%->50%), Распили меня полностью (удар врага -> хил 10%->25%), Жонглёр (возврат 100% урона в случайного врага).',
    branches: [
      { id: 'b1', name: 'Фокусник', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: анти-пси и шанс доп. лута 25% -> 30% -> 36% -> 44% -> 50% (радиус 3 -> 8 кл.).' },
      { id: 'b2', name: 'Распили меня полностью', type: 'active', mode: 'battle', mana1: 100, mana30: 10, desc: 'Бой (1->2/бой): ближнюю атаку врага превращает в хил 10% -> 25% ОЗ на 1..2 хода.' },
      { id: 'b3', name: 'Жонглёр', type: 'active', mode: 'battle', mana1: 100, mana30: 10, desc: 'Бой (1->2/бой): ловит атаку и возвращает 100% урона в случайного врага (1..2 хода).' }
    ],
    getManaPct(branchId, lvl) {
      if (branchId === 'b1') return 0;
      return Math.round(C.interpNodes(lvl, this.cfg.manaSteps));
    },
    async execute(ctx) {
      if (ctx.branchId === 'b2') {
        const uses = Math.round(C.interpNodes(ctx.lvl, this.cfg.sawUses));
        if (ctx.item && ctx.item.maxCharges !== uses) { ctx.item.maxCharges = uses; ctx.item.charges = Math.max(0, uses - 1); }
        const healPct = Number(C.interpNodes(ctx.lvl, this.cfg.sawHealPct).toFixed(2));
        const turns = Math.round(C.interpNodes(ctx.lvl, this.cfg.sawTurns));
        ctx.p.sawBox = { rounds: turns, healPct };
        ctx.popPlayer(`🪚 Ящик фокусника (${turns}р)`);
        ctx.log(`🪚 <b>[Распили меня полностью]</b>: иллюзорный ящик готов на <b>${turns} р.</b> — удар врага превратится в исцеление <b>${Math.round(healPct * 100)}% ОЗ</b>!`);
        return;
      }
      if (ctx.branchId === 'b3') {
        const uses = Math.round(C.interpNodes(ctx.lvl, this.cfg.jugUses));
        if (ctx.item && ctx.item.maxCharges !== uses) { ctx.item.maxCharges = uses; ctx.item.charges = Math.max(0, uses - 1); }
        const turns = Math.round(C.interpNodes(ctx.lvl, this.cfg.jugTurns));
        ctx.p.jugglerTrap = { rounds: turns };
        ctx.popPlayer(`🤹 Жонглёр (${turns}р)`);
        ctx.log(`🤹 <b>[Жонглёр]</b>: перехват атак на <b>${turns} р.</b> — 100% урона полетит в случайного врага!`);
        return;
      }

      // База: бросок 36 карт (0.5-5% -> 1.5-15% от базового пула урона за каждую карту)
      const minP = C.interpNodes(ctx.lvl, this.cfg.cardMinPct);
      const maxP = C.interpNodes(ctx.lvl, this.cfg.cardMaxPct);
      const poolPower = Math.max(40, ((ctx.p.stats.int || 10) * 3 + (ctx.p.stats.spi || 10) * 2 + (ctx.p.weap ? ctx.p.weap.dmg : 10) * 2) * ctx.intMult);
      const suits = ['♠️', '♥️', '♦️', '♣️'];
      let totalDmg = 0;

      for (let i = 0; i < this.cfg.cardsCount; i++) {
        const cur = ctx.enemies.filter(e => !e.dead);
        if (!cur.length) break;
        const en = cur[Math.floor(Math.random() * cur.length)];
        const pct = minP + Math.random() * (maxP - minP);
        const dmg = Math.max(1, Math.round(poolPower * pct));
        totalDmg += dmg;
        if (global.BSIM_AUDIO && i % 3 === 0) global.BSIM_AUDIO.playSfx('card');
        ctx.dealDamage(en, dmg, i % 4 === 0 ? `${suits[i % 4]} -${dmg}` : null);
        if (i % 3 === 0 && ctx.wait) await ctx.wait(30);
      }
      ctx.log(`🃏 <b>[Иллюзионист: 36 карт]</b>: веер карт (${(minP * 100).toFixed(1)}%–${(maxP * 100).toFixed(1)}%/карта) нанёс суммарно <b>-${totalDmg}</b> урона!`);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №10 (ЧАСТЬ 10Б): РАСПИЛИ МЕНЯ И ЖОНГЛЁР В БОЮ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.illusionist) return;

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'illusionist' && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.illusionist.getManaPct(item.branchId, item.lvl));
    }
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;
    if (!UI || !CORE || UI._illusionistCombatBound) return;
    UI._illusionistCombatBound = true;

    const origEnTurn = UI.runEnemiesTurn.bind(UI);
    UI.runEnemiesTurn = async function() {
      const st = CORE.state, p = st && st.player, hpBefore = p ? p.hp : 0;
      await origEnTurn();
      if (!p) return;

      if (p.hp < hpBefore) {
        const lost = hpBefore - p.hp;
        if (p.sawBox && p.sawBox.rounds > 0) {
          const heal = Math.max(4, Math.round(p.maxHp * p.sawBox.healPct));
          p.hp = Math.min(p.maxHp, hpBefore + heal);
          if (global.BSIM_AUDIO) global.BSIM_AUDIO.playSfx('shout');
          UI.popBack('u-player', true, `🪚 УРА! +${heal} ОЗ!`, 'float-skill');
          UI.log(`🪚 <b>[Распили меня полностью]</b>: «Та-даам! А я целый!» — удар врага превращён в лечение <b>+${heal} ОЗ</b>!`);
        } else if (p.jugglerTrap && p.jugglerTrap.rounds > 0) {
          p.hp = hpBefore;
          const foes = (st.enemies || []).filter(e => !e.dead);
          if (foes.length) {
            const rndFoe = foes[Math.floor(Math.random() * foes.length)];
            if (st.mode === 'game') { rndFoe.hp = Math.max(0, rndFoe.hp - lost); if (rndFoe.hp <= 0) rndFoe.dead = true; }
            else rndFoe.hp = Math.max(1, rndFoe.hp - lost);
            UI.popBack('u-' + rndFoe.id, false, `🤹 Возврат -${lost}${rndFoe.dead ? ' 💀' : ''}`, 'float-crit');
            UI.log(`🤹 <b>[Жонглёр]</b>: снаряд пойман и брошен обратно в <b>${rndFoe.name}</b> (-${lost} урона)!`);
          }
        }
        UI.renderBattle();
        if (UI.checkBattleEnd) UI.checkBattleEnd();
      }

      if (p.sawBox && p.sawBox.rounds > 0) p.sawBox.rounds--;
      if (p.jugglerTrap && p.jugglerTrap.rounds > 0) p.jugglerTrap.rounds--;
    };
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №11 (ЧАСТЬ 11А): ТАНК (tank) И ТАРАН ПРЕПЯТСТВИЯ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('tank', {
    pool: 'human', name: 'Танк', type: 'trigger', mode: 'battle', mana1: 25, mana30: 5,
    cfg: {
      baseHits: [[1, 2], [30, 10]],
      baseMana: [[1, 25], [30, 5]],
      immPct:   [[1, 0.50], [30, 1.0]],
      crawlAp:  [[1, 6], [30, 2]],
      ramCost:  [[1, 0.50], [30, 0.0]],
      maxRamsPerRaid: 3
    },
    desc: 'База (триггер боя): поглощает удары >= 10% ОЗ (2->10 уд./бой за 25%->5% фикс. маны; при нехватке разряжает ману в 0). Ветки: Бывалый танкист (50%->100% иммун к стану/слепоте), Грязь — это загар (ползком = скрыт, шаг 6->2 ОХ), Танкам дорога не нужна (уничтожает 1 препятствие на карте, до 3/рейд).',
    branches: [
      { id: 'b1', name: 'Бывалый танкист', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: иммунитет к оглушению и слепоте 50% -> 100%, на капе +50% анти-пси и статус «Контуженный».' },
      { id: 'b2', name: 'Грязь — это загар', type: 'active', mode: 'map', mana1: 0, mana30: 0, desc: 'Карта: передвижение ползком = скрыт (без обыска), цена шага 6 ОХ (Ур.1) -> 2 ОХ (Ур.30+).' },
      { id: 'b3', name: 'Танкам дорога не нужна', type: 'active', mode: 'map', mana1: 50, mana30: 0, desc: 'Карта (до 3/рейд): уничтожает 1 препятствие (50% ОЗ + 50% маны -> 0 на Ур.30+; при ОЗ < 50% — переломы).' }
    ],
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

  // Уничтожение 1 препятствия на карте (до 3 раз за рейд)
  C.breakObstacleMap = function(p) {
    const S = global.STIKS, s = S && S.db && S.db.session;
    const b3 = p && p.gifts && p.gifts.tank && p.gifts.tank.branches && p.gifts.tank.branches.b3;
    if (!S || !s || !b3 || !Array.isArray(s.grid)) return;
    p._tankRamsUsed = Number(p._tankRamsUsed || 0);
    if (p._tankRamsUsed >= 3) { S.log('⚠️ Лимит тарана препятствий (3/3) на этот рейд исчерпан!'); return; }

    // Ищем препятствие по направлению шага или на любой соседней клетке
    const dirs = [[p.lastDx || 0, p.lastDy || -1], [0, -1], [0, 1], [-1, 0], [1, 0]];
    let targetCell = null, tx = 0, ty = 0;
    for (const [dx, dy] of dirs) {
      const nx = p.x + dx, ny = p.y + dy;
      const c = s.grid[ny] && s.grid[ny][nx];
      if (c && c.blocked) { targetCell = c; tx = nx; ty = ny; break; }
    }
    if (!targetCell) { S.log('⚠️ Рядом нет препятствия для уничтожения!'); return; }

    const costRatio = Number(C.interpNodes(b3.lvl || 1, C.DARS.tank.cfg.ramCost).toFixed(2));
    const mNeed = Math.floor((p.maxMana || 20) * costRatio);
    const hpNeed = Math.floor((p.maxHp || 20) * costRatio);
    if ((p.mana || 0) < mNeed) { S.log(`❌ Не хватает маны для тарана (нужно ${mNeed}).`); return; }

    p.mana -= mNeed;
    p._tankRamsUsed++;
    targetCell.blocked = false;
    targetCell.rubble = true;

    if (hpNeed > 0) {
      if ((p.hp || 1) <= hpNeed) {
        p.hp = 1;
        p.tankFractures = true;
        if (p.stats) { p.stats.spd = Math.max(1, Math.round(p.stats.spd * 0.5)); p.stats.str = Math.max(1, Math.round(p.stats.str * 0.5)); }
        S.log(`💥 <b>[Танкам дорога не нужна ${p._tankRamsUsed}/3]</b>: препятствие (${tx}:${ty}) уничтожено! ОЗ было < 50% -> получены <b>переломы (-50% Скорости и Силы)</b>!`);
      } else {
        p.hp -= hpNeed;
        S.log(`💥 <b>[Танкам дорога не нужна ${p._tankRamsUsed}/3]</b>: препятствие (${tx}:${ty}) разнесено в пыль (-${hpNeed} ОЗ, -${mNeed} маны)!`);
      }
    } else {
      S.log(`🚜 <b>[Танкам дорога не нужна ${p._tankRamsUsed}/3]</b>: препятствие (${tx}:${ty}) уничтожено без потерь!`);
    }
    S.saveDB(); if (S.renderGame) S.renderGame();
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №11 (ЧАСТЬ 11Б): ТРИГГЕР ТАНКА И ПОЛЗКОМ ПО КАРТЕ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.tank) return;

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    // 1. Канонический триггер Танка (2 -> 10 ударов/бой, разряд остатка маны в 0 при нехватке)
    if (UI && CORE && !UI._tankV2Bound) {
      UI._tankV2Bound = true;
      UI.tryTankTrigger = function(rawDmg) {
        const st = CORE.state, p = st && st.player;
        const tIdx = (p && p.learned || []).findIndex(x => (x.darKey === 'tank' && !x.branchId) || (x.darKey === 'gigantism' && x.branchId === 'b1'));
        if (tIdx < 0) return { blocked: false, dmg: rawDmg };
        if (st.mode === 'game' && rawDmg < Math.ceil((p.maxHp || 20) * 0.10)) return { blocked: false, dmg: rawDmg };

        const item = p.learned[tIdx];
        const maxH = Math.round(C.interpNodes(item.lvl, C.DARS.tank.cfg.baseHits));
        if (!item._tankInit) { item._tankInit = true; item.maxCharges = maxH; item.charges = maxH; }
        if (item.charges <= 0) return { blocked: false, dmg: rawDmg, exhausted: true, title: 'Нам нужен танк' };
        if ((p.mana || 0) <= 0) return { blocked: false, dmg: rawDmg };

        const pct = item.darKey === 'tank' ? Math.round(C.interpNodes(item.lvl, C.DARS.tank.cfg.baseMana)) : Math.round(C.calcScale(item.lvl, 25, 5));
        const cost = C.getFixedManaCost(p, item, pct);
        const spent = Math.min(p.mana, cost); // при нехватке разряжает остаток маны в 0
        p.mana -= spent;
        item.charges--;
        const badge = document.getElementById('badge-dar-' + tIdx);
        if (badge) { badge.classList.add('flash'); setTimeout(() => badge.classList.remove('flash'), 1200); }
        return { blocked: true, dmg: 0, cost: spent, title: item.darKey === 'tank' ? 'Нам нужен танк' : 'Танк (Гигант)', left: item.charges, max: item.maxCharges };
      };
    }

    // 2. Полевые кнопки на карте: «Грязь — это загар» (ползком = скрыт, шаг 6->2 ОХ) и «Таран препятствия»
    if (S && !S._tankMapBound) {
      S._tankMapBound = true;
      const origStep = S.stepPlayer.bind(S);
      S.stepPlayer = function(dx, dy) {
        const s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx];
        if (p && p.tankCrawlOn) {
          const b2 = p.gifts && p.gifts.tank && p.gifts.tank.branches && p.gifts.tank.branches.b2;
          const apNeed = b2 ? Math.round(C.interpNodes(b2.lvl || 1, C.DARS.tank.cfg.crawlAp)) : 6;
          if ((p.stepsLeft || 0) < apNeed) { this.log(`⚠️ Для ползка нужно ${apNeed} ОХ!`); return; }
          const oldAp = p.stepsLeft;
          origStep(dx, dy);
          if (p.stepsLeft < oldAp) { p.stepsLeft = Math.max(0, oldAp - apNeed); p.stealthActive = true; this.saveDB(); }
          return;
        }
        origStep(dx, dy);
      };

      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        const g = p && p.gifts && p.gifts.tank;
        if (!s || !vp || s.combat || !g || !g.branches) return;
        const col = vp.firstElementChild;
        if (col && (g.branches.b2 || g.branches.b3) && !document.getElementById('stiks-tank-bar')) {
          const bar = document.createElement('div'); bar.id = 'stiks-tank-bar'; bar.style.cssText = 'display:flex;gap:5px;width:100%;';
          bar.innerHTML = (g.branches.b2 ? `<button class="btn ${p.tankCrawlOn ? 'btn-primary' : ''}" style="flex:1;padding:5px;" onclick="const p=STIKS.db.session.players[STIKS.db.session.activeIdx];p.tankCrawlOn=!p.tankCrawlOn;p.stealthActive=p.tankCrawlOn;STIKS.log(p.tankCrawlOn?'🐛 Режим ползком (Скрыт) ВКЛ':'🚶 Режим ползком ВЫКЛ');STIKS.saveDB();STIKS.renderGame();">${p.tankCrawlOn ? '🐛 Ползком: ВКЛ' : '🐛 Грязь — загар'}</button>` : '') +
            (g.branches.b3 ? `<button class="btn" style="flex:1;padding:5px;border-color:#fb923c;color:#fed7aa;" onclick="STIKS_CONTENT.breakObstacleMap(STIKS.db.session.players[STIKS.db.session.activeIdx])">🚜 Таран (${p._tankRamsUsed || 0}/3)</button>` : '');
          col.insertBefore(bar, col.lastElementChild);
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №12 (ЧАСТЬ 12А): СЕНС (sense)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('sense', {
    pool: 'human', name: 'Сенс', type: 'active', mode: 'map', mana1: 50, mana30: 5,
    cfg: {
      pelengRad:   [,],
      pelengTurns: [,],
      pelengMana:  [,],
      antiBlind:   [[1, 0.50], [30, 1.0]],
      antiPsi:     [[1, 0.25], [30, 0.50]],
      essenceBuff: [[1, 1.50], [30, 3.00]],
      essenceDur:  [,],
      essenceMana: [,],
      decoyCnt:    [,],
      decoyRounds: [,],
      decoyMana:   [,]
    },
    desc: 'База (карта): пеленг живых целей и Скрытов (8->20 кл., 3->5 ходов, 50%->5% фикс. маны). Ветки: Чувствительность (50%->100% анти-слепота, 25%->50% анти-пси), Знание сути (бой: +50%->+200% урон/меткость/уклонение + бафф отряду на капе), Знаток восприятия (1->3 куклы-приманки на 1->5 раундов, отвлекают 50% атак).',
    branches: [
      { id: 'b1', name: 'Чувствительность', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: 50% -> 100% анти-слепота и 25% -> 50% анти-пси.' },
      { id: 'b2', name: 'Знание сути', type: 'active', mode: 'battle', mana1: 50, mana30: 5, desc: 'Бой (без траты атаки): +50% (1р) -> +200% [x3] (2р) к урону и уклонению + бафф 1 ур. отряду на Ур.30+.' },
      { id: 'b3', name: 'Знаток восприятия', type: 'active', mode: 'both', mana1: 50, mana30: 10, desc: 'Карта/бой: выставляет 1 -> 3 куклы-приманки на 1 -> 5 раундов (отвлекают 50% атак врагов).' }
    ],
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
        ctx.log('⚠️ <b>[Сенс: Пеленг]</b> включается на <b>карте рейда</b> (кнопка внизу экрана)! В бою жми «Знание сути» или «Куклы-приманки».');
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
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №12 (ЧАСТЬ 12Б): КУКЛЫ-ПРИМАНКИ И ПЕЛЕНГ НА КАРТЕ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.sense) return;

  C.useSensePelengMap = function(p, isDecoy) {
    const S = global.STIKS, s = S && S.db && S.db.session;
    const g = p && p.gifts && p.gifts.sense;
    const targetObj = isDecoy ? (g && g.branches && g.branches.b3) : g;
    if (!S || !s || !targetObj) return;
    const cost = C.getFixedManaCost(p, targetObj, C.DARS.sense.getManaPct(isDecoy ? 'b3' : '', targetObj.lvl || 1));
    if ((p.mana || 0) < cost) { S.log(`❌ Не хватает маны (нужно ${cost}).`); return; }
    p.mana -= cost;

    if (isDecoy) {
      const cnt = Math.round(C.interpNodes(targetObj.lvl || 1, C.DARS.sense.cfg.decoyCnt));
      let delayed = 0;
      (s.zombies || []).forEach(z => {
        if (Math.abs(z.x - p.x) <= 6 && Math.abs(z.y - p.y) <= 6 && delayed < cnt * 2) { z.ap = 0; z.tPos = { x: p.x, y: p.y }; delayed++; }
      });
      S.log(`🎎 <b>[Знаток восприятия]</b>: выставлено кукол-приманок: <b>${cnt}</b> (преследователей задержано: ${delayed}, -${cost} м.)!`);
    } else {
      const rad = Math.round(C.interpNodes(targetObj.lvl || 1, C.DARS.sense.cfg.pelengRad));
      const turns = Math.round(C.interpNodes(targetObj.lvl || 1, C.DARS.sense.cfg.pelengTurns));
      p.pelengTurns = turns;
      let rev = 0;
      (s.zombies || []).forEach(z => { if (Math.abs(z.x - p.x) <= rad && Math.abs(z.y - p.y) <= rad) { z.hidden = false; rev++; } });
      S.log(`📡 <b>[Сенс: Пеленг ${rad} кл. на ${turns} ходов]</b>: запеленговано живых целей/скрытов: <b>${rev}</b> (-${cost} м.)!`);
    }
    S.saveDB(); if (S.renderGame) S.renderGame();
  };

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'sense' && !item.manaAnchor) C.getFixedManaCost(p, item, C.DARS.sense.getManaPct(item.branchId, item.lvl));
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    if (UI && CORE && !UI._senseCombatBound) {
      UI._senseCombatBound = true;
      const origAtk = UI.actAttack.bind(UI);
      UI.actAttack = async function() {
        const p = CORE.state && CORE.state.player;
        if (p && p.essenceState && p.essenceState.rounds > 0) p.buff = Math.max(p.buff || 1, p.essenceState.mult);
        await origAtk();
      };

      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const p = CORE.state && CORE.state.player, hpBefore = p ? p.hp : 0;
        await origEnTurn();
        if (!p) return;
        if (p.hp < hpBefore) {
          if (p.decoys && p.decoys.rounds > 0 && Math.random() < 0.50) {
            p.hp = hpBefore;
            UI.popBack('u-player', true, '🎎 КУКЛА ОТВЛЕКЛА!', 'float-skill');
            UI.log('🎎 <b>[Кукла-приманка]</b> приняла удар врага на себя (50% отвлечение)!');
          } else if (p.essenceState && p.essenceState.rounds > 0 && Math.random() < p.essenceState.dodgeBonus) {
            p.hp = hpBefore;
            UI.popBack('u-player', true, '🎯 ПРЕДВИДЕНИЕ: УКЛОН!', 'float-skill');
            UI.log('🎯 <b>[Знание сути]</b>: атака врага просчитана заранее!');
          }
          UI.renderBattle();
        }
        if (p.decoys && p.decoys.rounds > 0) p.decoys.rounds--;
        if (p.essenceState && p.essenceState.rounds > 0) p.essenceState.rounds--;
      };
    }

    if (S && !S._senseMapBound) {
      S._senseMapBound = true;
      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        const g = p && p.gifts && p.gifts.sense;
        if (!s || !vp || s.combat || !g) return;
        const col = vp.firstElementChild;
        if (col && !document.getElementById('stiks-sense-bar')) {
          const bar = document.createElement('div'); bar.id = 'stiks-sense-bar'; bar.style.cssText = 'display:flex;gap:5px;width:100%;';
          bar.innerHTML = `<button class="btn" style="flex:1;padding:5px;border-color:#38bdf8;color:#bae6fd;" onclick="STIKS_CONTENT.useSensePelengMap(STIKS.db.session.players[STIKS.db.session.activeIdx],false)">📡 Пеленг Сенса</button>` +
            (g.branches && g.branches.b3 ? `<button class="btn" style="flex:1;padding:5px;" onclick="STIKS_CONTENT.useSensePelengMap(STIKS.db.session.players[STIKS.db.session.activeIdx],true)">🎎 Кукла-приманка</button>` : '');
          col.insertBefore(bar, col.lastElementChild);
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №13 (ЧАСТЬ 13А): МАСТЕР ЛЬДА (ice_master)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('ice_master', {
    pool: 'human', name: 'Мастер льда', type: 'active', mode: 'battle', mana1: 50, mana30: 10,
    cfg: {
      volleys:    [[1, 1], [10, 2], [30, 3]],
      targets:    [[1, 1], [10, 3], [30, 6]],
      dmgMult:    [[1, 2.2], [10, 3.0], [30, 4.0]],
      baseMana:   [[1, 50], [10, 28], [30, 10]],
      frostCut:   [[1, 0.25], [30, 0.50]],
      freezeCh:   [[1, 0.30], [30, 0.60]],
      shellRet:   [[1, 1.2], [10, 1.65], [30, 2.2]],
      shellSpd:   [[1, 0.30], [30, 0.60]],
      shellMana:  [[1, 50], [10, 25], [30, 5]],
      iceCells:   [[1, 1], [10, 3], [30, 5]],
      iceTurns:   [[1, 2], [10, 4], [30, 6]],
      iceMana:    [[1, 50], [10, 28], [30, 10]],
      coldRes:    [[1, 0.80], [10, 1.0], [30, 1.20]],
      fireRes:    [[1, 0.20], [10, 0.35], [30, 0.50]]
    },
    desc: 'База (бой без пропуска атаки): 1->2->3 залпа по 1->3->6 целям (220%->300%->400% крио-урона) + «Обморожение» (-25%->-50% на 2р; по обмороженному 30%->60% заморозки на 1р). Ветки: Ледяной панцирь, Гололёд, Хладнокровие.',
    branches: [
      { id: 'b1', name: 'Ледяной панцирь', type: 'active', mode: 'battle', mana1: 50, mana30: 5, desc: 'Бой: режет урон на 50%, в ближнем бою наносит 120% -> 165% -> 220% крио-урона и сбивает темп (-30%->-60% Скорости).' },
      { id: 'b2', name: 'Гололёд', type: 'active', mode: 'map', mana1: 50, mana30: 10, desc: 'Карта: наледь 1->3->5 кл. на 2->4->6 ходов (50% падение: ОХ=0 + перелом -25%->-50%; 50% устоять: шаг x3 ОХ).' },
      { id: 'b3', name: 'Хладнокровие', type: 'passive', mana1: 0, mana30: 0, desc: 'Пассив: 80% -> 100% анти-лёд -> лечение 20% + 10% маны от холода (Ур.30+); 20% -> 50% анти-огонь.' }
    ],
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
        ctx.log('⚠️ <b>[Гололёд]</b> ставится на <b>карте рейда</b> (кнопка внизу экрана)! В бою используй «Ледяной шквал» или «Ледяной панцирь».');
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
          ctx.log(`❄️ <b>[Ледяной панцирь]</b> включён: урон <b>-50%</b>, ответный холод <b>${Math.round(retMult * 100)}%</b> + сбив темпа (фикс. ${tickMana} маны/раунд)!`);
        } else {
          ctx.popPlayer('❄️ Панцирь выкл.');
          ctx.log('❄️ <b>[Ледяной панцирь]</b> отключён.');
        }
        return;
      }

      // База: Ледяной шквал (1->2->3 залпа/бой, 1->3->6 целей, 220%->300%->400% + Обморожение -> Заморозка)
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
      ctx.log(`❄️ <b>[Ледяной шквал]</b> (${Math.round(mult * 100)}%, целей: ${Math.min(maxTrg, ctx.alive.length)}/${maxTrg}): крио-урон <b>-${baseIce}</b> и «Обморожение» (-${Math.round(frostCut * 100)}%)!`);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №13 (ЧАСТЬ 13Б): ЛЕДЯНОЙ ПАНЦИРЬ И ГОЛОЛЁД
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.ice_master) return;

  C.castIceFloorMap = function(p) {
    const S = global.STIKS, s = S && S.db && S.db.session;
    const b2 = p && p.gifts && p.gifts.ice_master && p.gifts.ice_master.branches && p.gifts.ice_master.branches.b2;
    if (!S || !s || !b2 || !Array.isArray(s.grid)) return;
    const cost = C.getFixedManaCost(p, b2, C.DARS.ice_master.getManaPct('b2', b2.lvl || 1));
    if ((p.mana || 0) < cost) { S.log(`❌ Не хватает маны на Гололёд (нужно ${cost}).`); return; }

    p.mana -= cost;
    const len = Math.round(C.interpNodes(b2.lvl || 1, C.DARS.ice_master.cfg.iceCells));
    const turns = Math.round(C.interpNodes(b2.lvl || 1, C.DARS.ice_master.cfg.iceTurns));
    const cut = Number(C.interpNodes(b2.lvl || 1, C.DARS.ice_master.cfg.frostCut).toFixed(2));
    const dx = p.lastDx || 0, dy = p.lastDy || -1;
    const px = dy !== 0 ? 1 : 0, py = dx !== 0 ? 1 : 0;
    let placed = 0;

    for (let i = 0; i < len; i++) {
      const off = i - Math.floor(len / 2);
      const tx = p.x + dx + px * off, ty = p.y + dy + py * off;
      const cell = s.grid[ty] && s.grid[ty][tx];
      if (!cell || cell.blocked || cell.fireWall) continue;
      cell.iceFloor = { turns, cut };
      placed++;
    }
    S.saveDB();
    S.log(`🧊 <b>[Гололёд]</b>: заморожено <b>${placed} кл.</b> на <b>${turns} ходов</b> (50% падение: ОХ=0 + перелом -${Math.round(cut * 100)}%, -${cost} м.)!`);
    if (S.renderGame) S.renderGame();
  };

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'ice_master' && !item.manaAnchor) C.getFixedManaCost(p, item, C.DARS.ice_master.getManaPct(item.branchId, item.lvl));
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    if (UI && CORE && !UI._iceShellBound) {
      UI._iceShellBound = true;
      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const st = CORE.state, p = st && st.player, hpBefore = p ? p.hp : 0;
        await origEnTurn();
        if (!p || !p.iceShell || !p.iceShell.active) return;

        if (p.hp < hpBefore) {
          const lost = hpBefore - p.hp;
          const halfDmg = Math.max(1, Math.round(lost * 0.5));
          p.hp = Math.min(p.maxHp, hpBefore - halfDmg);
          const attacker = (st.enemies || []).find(e => !e.dead && e.dist <= 0);
          if (attacker) {
            const frostRet = Math.max(1, Math.round(lost * p.iceShell.retMult));
            attacker.debuff = Math.max(attacker.debuff || 0, 2);
            if (st.mode === 'game') { attacker.hp = Math.max(0, attacker.hp - frostRet); if (attacker.hp <= 0) attacker.dead = true; }
            else attacker.hp = Math.max(1, attacker.hp - frostRet);
            UI.popBack('u-' + attacker.id, false, `❄️ Обледенение -${frostRet}${attacker.dead ? ' 💀' : ''}`, 'float-crit');
            UI.log(`❄️ <b>[Ледяной панцирь]</b>: урон срезан вдвое (-${halfDmg}), ответный холод <b>-${frostRet}</b> и сбив темпа <b>${attacker.name}</b>!`);
          }
        }
        if (p.mana >= p.iceShell.tickMana) { p.mana -= p.iceShell.tickMana; UI.log(`❄️ <b>[Ледяной панцирь]</b>: -${p.iceShell.tickMana} фикс. маны за раунд.`); }
        else { p.iceShell.active = false; UI.log('⚠️ Мана исчерпана — <b>Ледяной панцирь</b> растаял!'); }
        UI.renderBattle();
        if (UI.checkBattleEnd) UI.checkBattleEnd();
      };
    }

    if (S && !S._iceMapBound) {
      S._iceMapBound = true;
      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        const b2 = p && p.gifts && p.gifts.ice_master && p.gifts.ice_master.branches && p.gifts.ice_master.branches.b2;
        if (!s || !vp || s.combat || !b2) return;
        const col = vp.firstElementChild;
        if (col && !document.getElementById('btn-ice-floor')) {
          const btn = document.createElement('button');
          btn.id = 'btn-ice-floor'; btn.className = 'btn';
          btn.style.cssText = 'width:100%;padding:5px;border-color:#38bdf8;color:#bae6fd;';
          btn.textContent = '🧊 Гололёд (карта)';
          btn.onclick = () => C.castIceFloorMap(p);
          col.insertBefore(btn, col.lastElementChild);
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №14 (ЧАСТЬ 14А): ПРИСТУП ВАЙШНАВИЗМА (vaishnavism)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('vaishnavism', {
    pool: 'infected', name: 'Приступ вайшнавизма', type: 'passive', mana1: 0, mana30: 0,
    cfg: {
      krishnaCh:   [[1, 0.50], [30, 1.0]],
      krishnaPets: [,],
      krishnaMana: [,],
      humanCh:     [[1, 0.50], [30, 0.90]],
      beastBuff:   [[1, 1.10], [30, 1.40]],
      humanMana:   [,],
      foresightRes:[[1, 0.40], [30, 0.80]],
      foresightMana:[,]
    },
    desc: 'База (пассив): отказ от плоти (осмотр туш 50%->90%), человеческая еда даёт x2 сытости и +Ур/2->+Ур Инта или Духа, доступ к оружию людей. Ветки: Харе Кришна, Человеческая суть, Нечеловеческая предусмотрительность.',
    branches: [
      { id: 'b1', name: 'Харе Кришна, чувак!', type: 'active', mode: 'both', mana1: 50, mana30: 10, desc: 'Подчиняет гуманоида <= равного ранга (50%->100%, ±25%/ранг; макс. 1->3 питомца; 1/3 споранов на храм).' },
      { id: 'b2', name: 'Человеческая суть', type: 'active', mode: 'battle', mana1: 40, mana30: 10, desc: 'Бой (без атаки): 50%->90% запустить случайный боевой Дар человека, иначе «Звериная ярость» (+10%->+40% к статам до конца боя).' },
      { id: 'b3', name: 'Нечеловеческая предусмотрительность', type: 'active', mode: 'both', mana1: 10, mana30: 1, desc: 'Устойчивость к дебаффам и контролю 40% -> 80% (расход 10% -> 1% фикс. маны/раунд).' }
    ],
    getManaPct(b, l) {
      if (b === 'b1') return Math.round(C.interpNodes(l, this.cfg.krishnaMana));
      if (b === 'b2') return Math.round(C.interpNodes(l, this.cfg.humanMana));
      if (b === 'b3') return Math.round(C.interpNodes(l, this.cfg.foresightMana));
      return 0;
    },
    async execute(ctx) {
      if (ctx.branchId === 'b1') {
        const trg = ctx.alive;
        if (!trg) return;
        const baseCh = C.interpNodes(ctx.lvl, this.cfg.krishnaCh);
        const diff = (trg.rank || 0) - (ctx.p.rank || 0);
        const ch = Math.max(0.05, Math.min(0.98, baseCh - diff * 0.25));
        if (Math.random() < ch) {
          trg.charmedAlly = true; trg.krishnaConvert = true;
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
          const pool = ['fire_master', 'ice_master', 'sonic', 'illusionist'];
          const pick = pool[Math.floor(Math.random() * pool.length)];
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
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №14 (ЧАСТЬ 14Б): ЕДА ВАЙШНАВА И ЗВЕРИНАЯ ЯРОСТЬ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.vaishnavism) return;

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'vaishnavism' && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.vaishnavism.getManaPct(item.branchId, item.lvl));
    }
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    if (UI && CORE && !UI._vaishCombatBound) {
      UI._vaishCombatBound = true;
      const origAtk = UI.actAttack.bind(UI);
      UI.actAttack = async function() {
        const p = CORE.state && CORE.state.player;
        if (p && p.beastFuryMult > 1) p.buff = Math.max(p.buff || 1, p.beastFuryMult);
        await origAtk();
        if (p && p.beastFuryMult > 1) p.buff = p.beastFuryMult;
      };

      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const p = CORE.state && CORE.state.player;
        await origEnTurn();
        if (p && p.foresightAura && p.foresightAura.active) {
          if (p.mana >= p.foresightAura.tickMana) {
            p.mana -= p.foresightAura.tickMana;
            UI.log(`🕉️ <b>[Предусмотрительность]</b>: -${p.foresightAura.tickMana} фикс. маны за раунд.`);
          } else {
            p.foresightAura.active = false;
            UI.log('⚠️ Мана кончилась — <b>Нечеловеческая предусмотрительность</b> погасла.');
          }
          UI.renderBattle();
        }
      };
    }

    if (S && !S._vaishFoodBound && typeof S.useInvItem === 'function') {
      S._vaishFoodBound = true;
      const origUse = S.useInvItem.bind(S);
      S.useInvItem = function(idx) {
        const s = this.db && this.db.session, p = s && s.players && s.players[s.activeIdx];
        const it = p && p.inv && p.inv[idx];
        const isFood = Boolean(it && (it.cat === 'food' || it.type === 'food'));
        const vGift = p && p.gifts && p.gifts.vaishnavism;
        origUse(idx);
        if (isFood && vGift && p.stats) {
          const vLvl = Math.max(1, Number(vGift.lvl || 1));
          const ratio = Math.min(1, (vLvl - 1) / 29);
          const gain = Math.max(1, Math.round(vLvl * (0.5 + 0.5 * ratio)));
          const statKey = Math.random() < 0.5 ? 'int' : 'spi';
          p.stats[statKey] = (p.stats[statKey] || 10) + gain;
          p.spore = Math.min(100, (p.spore || 50) + 10);
          this.log(`🕉️ <b>[Приступ вайшнавизма]</b>: человеческая еда дала ×2 сытости и <b>+${gain} ${statKey === 'int' ? 'Интеллекта' : 'Духа'}</b>!`);
          this.saveDB();
          if (this.renderGame) this.renderGame();
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №15 (ЧАСТЬ 15А): ГИГАНТИЗМ + РАЗБЛОКИРОВКА БРОНИ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('gigantism', {
    pool: 'infected', name: 'Гигантизм', type: 'passive', mana1: 0, mana30: 0,
    unlocksArmor: true,
    cfg: {
      mutMult:    [[1, 2.0], [30, 4.0]],
      tankMana:   [,],
      biteMult:   [[1, 1.5], [30, 3.0]],
      biteHeal:   [[1, 0.10], [30, 0.50]],
      biteUses:   [,],
      biteMana:   [,],
      regenPct:   [[1, 0.05], [30, 0.25]],
      regenTurns: [,],
      regenMana:  [,]
    },
    desc: 'База (пассив): разблокирует ношение брони для Заражённого + 50% шанс перебросить прирост любого стата в Силу/Выносливость с множителем x2 -> x4. Ветки: Танк (Гигант), Голод гиганта (150%->300% + съедение), Чудовищная регенерация (5%->25% ОЗ/раунд на 2->6р).',
    branches: [
      { id: 'b1', name: 'Танк (Гигант)', type: 'trigger', mana1: 25, mana30: 5, desc: 'Триггер: поглощает любой удар, пробивший защиту, за 25% -> 5% фикс. маны пока есть мана.' },
      { id: 'b2', name: 'Голод гиганта', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой (1->2/бой): 150% -> 300% урона; при фатальном ударе съедает цель и лечит 10% -> 50% макс. ОЗ.' },
      { id: 'b3', name: 'Чудовищная регенерация', type: 'active', mode: 'battle', mana1: 50, mana30: 10, desc: 'Бой: восстанавливает 5% -> 25% макс. ОЗ за каждый раунд в течение 2 -> 6 раундов.' }
    ],
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
      // Ветка 2: Голод гиганта (150% -> 300% урона, лимит 1 -> 2 раза/бой, при добивании съедает и лечит 10% -> 50% ОЗ)
      const uses = Math.round(C.interpNodes(ctx.lvl, this.cfg.biteUses));
      if (ctx.item && ctx.item.maxCharges !== uses) {
        const spent = Math.max(0, (ctx.item.maxCharges || 1) - (ctx.item.charges || 0));
        ctx.item.maxCharges = uses;
        ctx.item.charges = Math.max(0, uses - spent);
      }
      const trg = ctx.alive;
      if (!trg) return;
      const mult = Number(C.interpNodes(ctx.lvl, this.cfg.biteMult).toFixed(2));
      const baseAtk = ((ctx.p.weap ? ctx.p.weap.dmg : 8) + Math.round((ctx.p.stats.str || 14) * 0.45)) * (ctx.p.buff || 1);
      const dmg = Math.max(8, Math.round(baseAtk * mult));
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
// STIKS_CONTENT // КАНОН ДАРА №15 (ЧАСТЬ 15Б): РАЗБЛОКИРОВКА БРОНИ И МЕТАБОЛИЗМ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.gigantism) return;

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'gigantism' && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.gigantism.getManaPct(item.branchId, item.lvl));
    }
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    // 1. Разблокировка ношения брони для Особого заражённого с Гигантизмом
    if (S && !S._giantArmorBound) {
      S._giantArmorBound = true;
      const origEquip = S.equipFromInv.bind(S);
      S.equipFromInv = function(hero, idx) {
        const it = hero && hero.inv && hero.inv[idx];
        const hasGiant = Boolean(hero && hero.gifts && hero.gifts.gigantism);
        if (hero && hero.isInfected && hasGiant && it && (it.slot === 'armor' || it.cat === 'armor')) {
          hero.equip = hero.equip || {};
          const prev = hero.equip.armor;
          hero.equip.armor = it;
          hero.inv.splice(idx, 1);
          if (prev) hero.inv.push(prev);
          this.log(`🦍 <b>[Гигантизм]</b>: Заражённый надел броню «<b>${it.n || it.name}</b>»!`);
          this.saveDB();
          if (this.renderGame) this.renderGame();
          else if (this.renderLobby) this.renderLobby();
          return;
        }
        origEquip(hero, idx);
      };
    }

    // 2. Переброс прироста статов в Силу/Выносливость (50%, x2->x4) + тик регенерации + Танк Гиганта
    if (CORE && !CORE._giantXpBound) {
      CORE._giantXpBound = true;
      const origGrant = CORE.grantCombatXp.bind(CORE);
      CORE.grantCombatXp = function(statKey, baseDelta) {
        const p = this.state && this.state.player;
        const gIt = p && (p.learned || []).find(x => x.darKey === 'gigantism' && !x.branchId);
        if (gIt && statKey !== 'str' && statKey !== 'end' && Math.random() < 0.50) {
          const mult = C.interpNodes(gIt.lvl, C.DARS.gigantism.cfg.mutMult);
          const trgStat = Math.random() < 0.50 ? 'str' : 'end';
          return origGrant(trgStat, baseDelta * mult);
        }
        return origGrant(statKey, baseDelta);
      };
    }

    if (UI && CORE && !UI._giantCombatBound) {
      UI._giantCombatBound = true;
      const origTank = UI.tryTankTrigger.bind(UI);
      UI.tryTankTrigger = function(rawDmg) {
        const st = CORE.state, p = st && st.player;
        const gTank = (p && p.learned || []).find(x => x.darKey === 'gigantism' && x.branchId === 'b1');
        if (gTank && (p.mana || 0) > 0 && (st.mode !== 'game' || rawDmg >= Math.ceil((p.maxHp || 20) * 0.10))) {
          const cost = C.getFixedManaCost(p, gTank, C.DARS.gigantism.getManaPct('b1', gTank.lvl));
          if (p.mana >= cost) {
            p.mana -= cost;
            return { blocked: true, dmg: 0, cost, title: 'Танк (Гигант)', left: '∞', max: '∞' };
          }
        }
        return origTank(rawDmg);
      };

      const origEnTurn = UI.runEnemiesTurn.bind(UI);
      UI.runEnemiesTurn = async function() {
        const p = CORE.state && CORE.state.player;
        await origEnTurn();
        if (p && p.giantRegen && p.giantRegen.rounds > 0) {
          const heal = Math.max(3, Math.round(p.maxHp * p.giantRegen.pct));
          p.hp = Math.min(p.maxHp, p.hp + heal);
          p.giantRegen.rounds--;
          UI.popBack('u-player', true, `🦍 Реген +${heal} ОЗ (${p.giantRegen.rounds}р)`, 'float-skill');
          UI.log(`🦍 <b>[Чудовищная регенерация]</b>: восстановлено <b>+${heal} ОЗ</b> (осталось раундов: ${p.giantRegen.rounds}).`);
          UI.renderBattle();
        }
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №16 (ЧАСТЬ 16А): ДИТЯ УЛЬЯ (hive_child)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.registerDar('hive_child', {
    pool: 'infected', name: 'Дитя Улья', type: 'passive', mana1: 0, mana30: 0,
    unlocksClothes: true,
    cfg: {
      packSize:   [,],
      tameChance: [[1, 0.50], [30, 0.75]],
      maskMana:   [,],
      nativeMana: [,],
      terrorRad:  [,],
      terrorCh:   [[1, 0.20], [30, 0.50]],
      terrorMana: [,]
    },
    desc: 'База (пассив): разблокирует одежду для Заражённого + вербовка заражённых ниже на 1 ранг (50% -> на капе 75% для равного), стая 1->10 (в бою до 5 сильнейших). Ветки: Активная маскировка (скрыт + 200% удар из стаи), Родная среда (движение сквозь препятствия), Аура ужаса (3->6 кл., 20%->50% транс без ответа).',
    branches: [
      { id: 'b1', name: 'Активная маскировка', type: 'active', mode: 'map', mana1: 40, mana30: 10, desc: 'Карта: Улей прячет хозяина (Скрыт), стая видима; удар исподтишка 200% в 1-м раунде боя.' },
      { id: 'b2', name: 'Родная среда', type: 'active', mode: 'map', mana1: 30, mana30: 5, desc: 'Карта: проход сквозь препятствия за x2 ОХ -> 1 ОХ на Ур.30+ и скрытие внутри препятствия.' },
      { id: 'b3', name: 'Аура ужаса', type: 'active', mode: 'both', mana1: 50, mana30: 10, desc: 'Карта/бой (3->6 кл.): 20% -> 50% шанс ввергнуть врагов в транс (пропускают 1 атаку без ответа).' }
    ],
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
        ctx.log(`⚠️ <b>[${ctx.title}]</b> включается на <b>карте рейда</b> (кнопка внизу экрана)! В бою запускай «Ауру ужаса».`);
        return;
      }
      // Ветка 3: Аура ужаса (20% -> 50% шанс транса с пропуском атаки без ответа)
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
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // КАНОН ДАРА №16 (ЧАСТЬ 16Б): ОДЕЖДА ЗАРАЖЁННОГО И СТАЯ УЛЬЯ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS.hive_child) return;

  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, p = CORE && CORE.state && CORE.state.player;
    const item = p && p.learned && p.learned[idx];
    if (item && item.darKey === 'hive_child' && !item.manaAnchor) {
      C.getFixedManaCost(p, item, C.DARS.hive_child.getManaPct(item.branchId, item.lvl));
    }
    return origRun(idx);
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const S = global.STIKS, UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;

    // 1. Разблокировка одежды (Дитя Улья) и оружия (Вайшнавизм) для Заражённого
    if (S && !S._hiveGearBound) {
      S._hiveGearBound = true;
      const origEquip = S.equipFromInv.bind(S);
      S.equipFromInv = function(hero, idx) {
        const it = hero && hero.inv && hero.inv[idx];
        if (hero && hero.isInfected && it) {
          const slot = it.slot || it.cat || '';
          const hasHive = Boolean(hero.gifts && hero.gifts.hive_child);
          const vGift = hero.gifts && hero.gifts.vaishnavism;
          const canClothes = hasHive && (slot === 'clothes' || slot === 'body');
          const canWeap = vGift && (slot === 'weapon' || slot === 'weap') && (!it.isGun || (vGift.lvl || 1) >= 15);
          if (canClothes || canWeap) {
            hero.equip = hero.equip || {};
            const key = canClothes ? 'clothes' : 'weapon';
            const prev = hero.equip[key];
            hero.equip[key] = it;
            hero.inv.splice(idx, 1);
            if (prev) hero.inv.push(prev);
            this.log(`☣️ <b>[${canClothes ? 'Дитя Улья' : 'Вайшнавизм'}]</b>: Заражённый экипировал «<b>${it.n || it.name}</b>»!`);
            this.saveDB();
            if (this.renderGame) this.renderGame(); else if (this.renderLobby) this.renderLobby();
            return;
          }
        }
        origEquip(hero, idx);
      };

      const origGame = S.renderGame.bind(S);
      S.renderGame = function() {
        origGame();
        const s = this.db && this.db.session, vp = document.getElementById('game-viewport'), p = s && s.players && s.players[s.activeIdx];
        const g = p && p.gifts && p.gifts.hive_child;
        if (!s || !vp || s.combat || !g || !g.branches) return;
        const col = vp.firstElementChild;
        if (col && (g.branches.b1 || g.branches.b2) && !document.getElementById('stiks-hive-bar')) {
          const bar = document.createElement('div'); bar.id = 'stiks-hive-bar'; bar.style.cssText = 'display:flex;gap:5px;width:100%;';
          bar.innerHTML = (g.branches.b1 ? `<button class="btn ${p.hiveAmbushReady ? 'btn-primary' : ''}" style="flex:1;padding:5px;" onclick="const p=STIKS.db.session.players[STIKS.db.session.activeIdx];p.hiveAmbushReady=!p.hiveAmbushReady;p.stealthActive=p.hiveAmbushReady;STIKS.log(p.hiveAmbushReady?'☣️ Маскировка в стае ВКЛ (удар 200% в 1-м раунде!)':'☣️ Маскировка в стае ВЫКЛ');STIKS.saveDB();STIKS.renderGame();">${p.hiveAmbushReady ? '☣️ В стае: ВКЛ' : '☣️ Маскировка стаи'}</button>` : '') +
            (g.branches.b2 ? `<button class="btn ${p.nativeTerrainOn ? 'btn-primary' : ''}" style="flex:1;padding:5px;" onclick="const p=STIKS.db.session.players[STIKS.db.session.activeIdx];p.nativeTerrainOn=!p.nativeTerrainOn;STIKS.log(p.nativeTerrainOn?'🧱 Родная среда ВКЛ (проход сквозь руины)':'🧱 Родная среда ВЫКЛ');STIKS.saveDB();STIKS.renderGame();">${p.nativeTerrainOn ? '🧱 Среда: ВКЛ' : '🧱 Родная среда'}</button>` : '');
          col.insertBefore(bar, col.lastElementChild);
        }
      };
    }

    // 2. Удар исподтишка 200% в 1-м раунде боя после маскировки в стае
    if (UI && CORE && !UI._hiveAmbushBound) {
      UI._hiveAmbushBound = true;
      const origAtk = UI.actAttack.bind(UI);
      UI.actAttack = async function() {
        const st = CORE.state, p = st && st.player;
        if (st && st.round === 1 && p && p.heroRef && p.heroRef.hiveAmbushReady) {
          p.heroRef.hiveAmbushReady = false;
          p.buff = Math.max(p.buff || 1, 2.0);
          UI.popBack('u-player', true, '☣️ УДАР ИЗ СТАИ 200%!', 'float-crit');
          UI.log('☣️ <b>[Активная маскировка]</b>: удар исподтишка из стаи с множителем <b>200% (×2.0)</b>!');
        }
        await origAtk();
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // ФИКС МАССИВОВ CFG ДЛЯ ДАРОВ 2, 4, 6, 7, 10, 12, 14, 15, 16
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.DARS) return;

  // Защищённая интерполяция с проверкой на undefined
  C.interpNodes = function(lvl, pts) {
    if (!Array.isArray(pts) || !pts.length || !Array.isArray(pts[0])) return 10;
    const l = Math.max(1, Math.min(30, Number(lvl) || 1));
    if (l <= pts[0][0]) return Number(pts[0][1]) || 0;
    for (let i = 0; i < pts.length - 1; i++) {
      if (!Array.isArray(pts[i]) || !Array.isArray(pts[i + 1])) continue;
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (l <= x1) return y0 + (y1 - y0) * ((l - x0) / Math.max(1, x1 - x0));
    }
    const last = pts[pts.length - 1];
    return Array.isArray(last) ? (Number(last[1]) || 0) : 10;
  };

  // Восстановление всех числовых таблиц cfg
  if (C.DARS.healer) Object.assign(C.DARS.healer.cfg, {
    healMana: [[1, 40], [10, 24], [30, 10]], empMana: [[1, 100], [10, 50], [30, 10]],
    suppMana: [[1, 10], [10, 6], [30, 2]], petRankPlus: [[1, 1], [15, 2], [30, 3]],
    petCalmRounds: [[1, 2], [15, 4], [30, 6]], petMana: [[1, 40], [30, 10]]
  });
  if (C.DARS.stealth) Object.assign(C.DARS.stealth.cfg, {
    mapMana: [[1, 50], [10, 25], [30, 1]], groupRad: [[1, 2], [10, 5], [30, 10]],
    groupMana: [[1, 50], [10, 30], [30, 10]], ghostMana: [[1, 50], [10, 30], [30, 10]],
    phaseDist: [[1, 2], [10, 3], [30, 5]], phaseMana: [[1, 50], [10, 30], [30, 10]]
  });
  if (C.DARS.sonic) Object.assign(C.DARS.sonic.cfg, {
    baseMana: [[1, 100], [10, 50], [30, 10]], silenceRad: [[1, 1], [10, 4], [30, 10]],
    echoRad: [[1, 6], [10, 14], [30, 25]], echoMana: [[1, 50], [10, 30], [30, 10]],
    infraRad: [[1, 2], [10, 6], [30, 12]], infraMana: [[1, 60], [10, 35], [30, 10]]
  });
  if (C.DARS.mentalist) Object.assign(C.DARS.mentalist.cfg, {
    baseMana: [[1, 100], [10, 50], [30, 10]], jamRad: [[1, 2], [10, 6], [30, 10]],
    jamRankPlus: [[1, 0], [10, 1], [30, 2]], jamMana: [[1, 30], [10, 14], [30, 1]],
    booMana: [[1, 60], [10, 35], [30, 10]]
  });
  if (C.DARS.illusionist) Object.assign(C.DARS.illusionist.cfg, {
    manaSteps: [[1, 100], [5, 75], [10, 50], [20, 25], [30, 10]],
    magRad: [[1, 3], [5, 4], [10, 5], [20, 7], [30, 8]],
    sawTurns: [[1, 1], [5, 1], [10, 1], [20, 2], [30, 2]],
    sawUses: [[1, 1], [5, 1], [10, 2], [20, 2], [30, 2]],
    jugTurns: [[1, 1], [5, 1], [10, 1], [20, 2], [30, 2]],
    jugUses: [[1, 1], [5, 1], [10, 2], [20, 2], [30, 2]]
  });
  if (C.DARS.sense) Object.assign(C.DARS.sense.cfg, {
    pelengRad: [[1, 8], [30, 20]], pelengTurns: [[1, 3], [30, 5]], pelengMana: [[1, 50], [30, 5]],
    essenceDur: [[1, 1], [30, 2]], essenceMana: [[1, 50], [30, 5]],
    decoyCnt: [[1, 1], [30, 3]], decoyRounds: [[1, 1], [30, 5]], decoyMana: [[1, 50], [30, 10]]
  });
  if (C.DARS.vaishnavism) Object.assign(C.DARS.vaishnavism.cfg, {
    krishnaPets: [[1, 1], [30, 3]], krishnaMana: [[1, 50], [30, 10]],
    humanMana: [[1, 40], [30, 10]], foresightMana: [[1, 10], [30, 1]]
  });
  if (C.DARS.gigantism) Object.assign(C.DARS.gigantism.cfg, {
    tankMana: [[1, 25], [30, 5]], biteUses: [[1, 1], [15, 2], [30, 2]],
    biteMana: [[1, 50], [30, 10]], regenTurns: [[1, 2], [30, 6]], regenMana: [[1, 50], [30, 10]]
  });
  if (C.DARS.hive_child) Object.assign(C.DARS.hive_child.cfg, {
    packSize: [[1, 1], [30, 10]], maskMana: [[1, 40], [30, 10]],
    nativeMana: [[1, 30], [30, 5]], terrorRad: [[1, 3], [30, 6]], terrorMana: [[1, 50], [30, 10]]
  });
  C.applyToEngines();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // ПРАВИЛО ХОДА: МАКС. 1 АТАКУЮЩИЙ + 1 ЗАЩИТНЫЙ ДАР ЗА РАУНД
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  // Классификация активных Даров/веток на 'def' (защитный/бафф) и 'atk' (атакующий/контроль)
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

  // Снимаем искусственный лимит 1..4 заряда для Даров без собственного лимита/КД
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

  // Оборачиваем runDarInCombat: проверка лимита 1 атакующий + 1 защитный в раунд
  const origRun = C.runDarInCombat.bind(C);
  C.runDarInCombat = async function(idx) {
    const CORE = global.STIKS_COMBAT_CORE, UI = global.BSIM_UI;
    const st = CORE && CORE.state, p = st && st.player;
    const item = p && p.learned && p.learned[idx];
    if (!st || !p || !item) return false;

    if (!C.hasOwnChargeLimit(item.darKey, item.branchId)) {
      item.maxCharges = 0; item.charges = 0;
    }

    p._roundSlots = p._roundSlots || { atk: false, def: false };
    const kind = C.getDarSlotKind(item.darKey, item.branchId);
    if (p._roundSlots[kind]) {
      const lbl = kind === 'def' ? '🛡 защитный' : '⚔️ атакующий';
      if (UI) UI.log(`⛔ В этом раунде уже использован 1 <b>${lbl}</b> Дар! Жди следующего хода.`);
      return true;
    }

    const manaBefore = p.mana;
    const res = await origRun(idx);
    if (p.mana < manaBefore) {
      p._roundSlots[kind] = true;
      if (UI && UI.renderBattle) UI.renderBattle();
    }
    return res;
  };

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;
    if (!UI || !CORE || UI._roundSlotsBound) return;
    UI._roundSlotsBound = true;

    const origEnTurn = UI.runEnemiesTurn.bind(UI);
    UI.runEnemiesTurn = async function() {
      await origEnTurn();
      const p = CORE.state && CORE.state.player;
      if (p) p._roundSlots = { atk: false, def: false };
      UI.renderBattle();
    };

    const origRender = UI.renderBattle.bind(UI);
    UI.renderBattle = function() {
      origRender();
      const st = CORE.state, p = st && st.player;
      if (!p || !Array.isArray(p.learned)) return;
      const slots = p._roundSlots || { atk: false, def: false };
      document.querySelectorAll('#battle-abilities button[data-dar-idx]').forEach(btn => {
        const idx = Number(btn.dataset.darIdx);
        const it = p.learned[idx];
        if (!it) return;
        const kind = C.getDarSlotKind(it.darKey, it.branchId);
        const tag = kind === 'def' ? '[🛡 Защита] ' : '[⚔️ Атака] ';
        if (!btn.textContent.includes('[🛡') && !btn.textContent.includes('[⚔️')) {
          btn.textContent = btn.textContent.replace('🧬 ', '🧬 ' + tag);
        }
        if (slots[kind]) btn.disabled = true;
      });
    };
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // ПОПРАВКА ВЛИЯНИЯ ВИРТУАЛЬНЫХ РАНГОВ: ×0.5 (ВМЕСТО ×1.5)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  C.BALANCE.virtRankMult = 0.5;
  C.getVirtRank = function(rawRank) {
    return Number(((Number(rawRank) || 0) * (C.BALANCE.virtRankMult ?? 0.5)).toFixed(2));
  };
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // БАЛАНС ОРУЖИЯ (×0.5) + ОТВЯЗКА НАВЫКОВ ОТ РАНГА ВИНТОВКИ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  Object.assign(C.BALANCE, {
    weaponDmgMult: 0.5,       // Урон оружия понижен на 0.5 (без ваншотов от Р4-Р5)
    weaponRankBonusStep: 0.5, // Прирост множителя от ранга оружия понижен на 0.5
    skillFlatScale: 1.0,      // 100% плоской атаки от статов для навыков (без ранга винтовки)
    virtRankMult: 0.5         // Влияние виртуальных рангов уменьшено до 0.5
  });

  // 1. Отвязываем Иллюзиониста (36 карт) от урона/ранга оружия -> чистые 100% статов
  if (C.DARS.illusionist) {
    C.DARS.illusionist.execute = async function(ctx) {
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
      const suits = ['♠️', '♥️', '♦️', '♣️'];
      let totalDmg = 0;
      for (let i = 0; i < this.cfg.cardsCount; i++) {
        const cur = ctx.enemies.filter(e => !e.dead);
        if (!cur.length) break;
        const en = cur[Math.floor(Math.random() * cur.length)];
        const dmg = Math.max(1, Math.round(flatPool * (minP + Math.random() * (maxP - minP))));
        totalDmg += dmg;
        if (global.BSIM_AUDIO && i % 3 === 0) global.BSIM_AUDIO.playSfx('card');
        ctx.dealDamage(en, dmg, i % 4 === 0 ? `${suits[i % 4]} -${dmg}` : null);
        if (i % 3 === 0 && ctx.wait) await ctx.wait(30);
      }
      ctx.log(`🃏 <b>[Иллюзионист: 36 карт]</b> (от статов, без пушки): суммарно <b>-${totalDmg}</b> урона!`);
    };
  }

  // 2. Отвязываем «Голод гиганта» от урона оружия -> 100% от Силы + Выносливости
  if (C.DARS.gigantism) {
    const origGiantExec = C.DARS.gigantism.execute.bind(C.DARS.gigantism);
    C.DARS.gigantism.execute = function(ctx) {
      if (ctx.branchId !== 'b2') return origGiantExec(ctx);
      const uses = Math.round(C.interpNodes(ctx.lvl, this.cfg.biteUses));
      if (ctx.item && ctx.item.maxCharges !== uses) { ctx.item.maxCharges = uses; ctx.item.charges = Math.max(0, uses - 1); }
      const trg = ctx.alive;
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
      }
      ctx.log(`🦍 <b>[Голод гиганта]</b> (${Math.round(mult * 100)}%, чистая физика без пушки): <b>-${dmg}</b> по <b>${trg.name}</b>!`);
    };
  }

  // 3. Оружие ×0.5 + отвязка классового навыка от ранга винтовки (вирт. ранги ×0.5)
  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;
    if (CORE && !CORE._weaponNerfV2Bound) {
      CORE._weaponNerfV2Bound = true;
      const origGetMult = CORE.getMult.bind(CORE);
      CORE.getMult = function(wCls, eRank) {
        const rawMult = origGetMult(wCls, eRank);
        if (rawMult <= 1) return rawMult;
        return Number((1 + (rawMult - 1) * (C.BALANCE.weaponRankBonusStep ?? 0.5)).toFixed(2));
      };
      const origStart = CORE.start.bind(CORE);
      CORE.start = function(cfg) {
        const st = origStart(cfg);
        if (st && st.player && st.player.weap) {
          st.player.weap = Object.assign({}, st.player.weap, {
            dmg: Math.max(2, Math.round((st.player.weap.dmg || 4) * (C.BALANCE.weaponDmgMult ?? 0.5)))
          });
        }
        return st;
      };
    }
    if (UI && CORE && !UI._skillNoGunV2Bound) {
      UI._skillNoGunV2Bound = true;
      UI.actSkill = function() {
        const st = CORE.state;
        if (!st || st.busy || st.finished || st.player.skillUsed) return;
        const p = st.player, pool = this.getTargetsPool();
        if (!pool.length) return;
        p.skillUsed = true;
        const trg = pool;
        const flatBase = ((p.stats.spi || 10) + (p.stats.int || 10) * 0.5 + (p.stats.str || 10) * 0.5) * (C.BALANCE.skillFlatScale || 1.0);
        const dmg = Math.max(4, Math.round(flatBase * (p.buff || 1)));
        if (st.mode === 'game') { trg.hp = Math.max(0, trg.hp - dmg); if (trg.hp <= 0) trg.dead = true; }
        else trg.hp = Math.max(1, trg.hp - dmg);
        const isStronger = C.getVirtRank(trg.rank) > C.getVirtRank(p.rank);
        if (!trg.dead) { if (isStronger) trg.debuff = Math.max(trg.debuff || 0, 2); else trg.stun = Math.max(trg.stun || 0, 1); }
        CORE.grantCombatXp('spi', 1);
        if (global.BSIM_AUDIO) global.BSIM_AUDIO.playSfx('shout');
        this.showSkillBanner(p.ico, p.skill, p.phrase);
        this.popBack('u-' + trg.id, false, '-' + dmg + (trg.dead ? ' 💀' : (isStronger ? ' ⬇️ДЕБАФ' : ' 💫СТАН')), 'float-crit');
        this.log(`🗣️ <b>${p.name}</b> → <b>[${p.skill}]</b> (без ранга пушки): <b>${trg.name}</b> (-${dmg})!`);
        this.renderBattle();
        this.checkBattleEnd();
      };
    }
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // ЖЁСТКИЙ ЛИМИТ: КЛАССОВЫЙ НАВЫК — СТРОГО 1 РАЗ ЗА ВЕСЬ БОЙ
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;
    if (!UI || !CORE || UI._skillOncePerBattleBound) return;
    UI._skillOncePerBattleBound = true;

    const origActSkill = UI.actSkill.bind(UI);
    UI.actSkill = function() {
      const st = CORE.state, p = st && st.player;
      if (!st || !p || p._skillUsedBattle || p.skillUsed) return;
      origActSkill();
      if (p.skillUsed) {
        p._skillUsedBattle = true;
        UI.renderBattle();
      }
    };

    const origEnTurn = UI.runEnemiesTurn.bind(UI);
    UI.runEnemiesTurn = async function() {
      await origEnTurn();
      const p = CORE.state && CORE.state.player;
      if (p && p._skillUsedBattle) {
        p.skillUsed = true;
        UI.renderBattle();
      }
    };

    const origRender = UI.renderBattle.bind(UI);
    UI.renderBattle = function() {
      origRender();
      const p = CORE.state && CORE.state.player;
      const btn = document.getElementById('btn-skill-act');
      if (btn && p && (p._skillUsedBattle || p.skillUsed)) {
        p.skillUsed = true;
        btn.disabled = true;
        btn.textContent = `${p.ico} [Навык] ${p.skill} (Использовано 1/1 за бой)`;
      }
    };
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // УНИКАЛЬНЫЕ НАВЫКИ АРХЕТИПОВ (ЧАСТЬ А: №1..№9 + ТРИГГЕРЫ)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C) return;

  if (C.ARCHETYPES.alkash) C.ARCHETYPES.alkash.skillType = 'trigger';
  if (C.ARCHETYPES.cashier) C.ARCHETYPES.cashier.skillType = 'trigger';
  if (C.ARCHETYPES.infected) C.ARCHETYPES.infected.skill = 'Подчинение';

  C.ARCH_SKILLS = C.ARCH_SKILLS || {};

  // 1. Хирург: 300% урона 1 цели + дебаф -90% меткости и урона до конца боя (100% <= равный, -25%/ранг)
  C.ARCH_SKILLS.surgeon = function(ctx) {
    const trg = ctx.alive[0];
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

  // 2. Азиат: +2 хода к фазе сближения, безнаказанный бросок предметами 50% по всем с китайскими ругательствами
  C.ARCH_SKILLS.asiat = function(ctx) {
    const curses = ['Чжао-мао-пинь!', 'Тай-хуа-чунь!', 'Лао-вай-бань!', 'Сяо-лун-бао-на!', 'Фу-юань-шань!'];
    ctx.p.asiatEvadeRounds = 2;
    ctx.alive.forEach((en, i) => {
      en.dist = (en.dist || 0) + 2;
      const dmg = Math.max(2, Math.round(ctx.flatAtk * 0.50));
      ctx.dealDamage(en, dmg, `🥋 ${curses[i % curses.length]} -${dmg}`);
    });
    ctx.log(`🥋 <b>[Акробатический уход]</b>: «${curses[0]}» — отскок (+2 дист. на 2 хода) и залп предметами (50%) по всем врагам!`);
  };

  // 3. Школьница: ультразвук по всем (<= равный ранг: стан 2р; старше: -50% меткость/урон на 2р)
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

  // 4. Воспитательница: самый сильный враг идёт в угол на 2 хода (100% до +1 ранга, -25%/ранг выше)
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

  // 7. Жиголо: заставляет врага дважды атаковать своего, иначе дебаф -30% на 2р
  C.ARCH_SKILLS.gigolo = function(ctx) {
    const trg = ctx.alive[0];
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

  // 8. Татань: пощёчиной убивает <= равного ранга; +1/+2/+3+ ранг отнимает 75%/50%/25% ОЗ
  C.ARCH_SKILLS.tatan = function(ctx) {
    const trg = ctx.alive[0];
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

  // 9. Профессор: 0 урона, <= равный ранг — полное ослепление (промахи/удары по своим 2р), старше — по -25%/ранг только дебаф меткости
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
})(typeof window !== 'undefined' ? window : globalThis);

// ============================================================================
// STIKS_CONTENT // УНИКАЛЬНЫЕ НАВЫКИ АРХЕТИПОВ (ЧАСТЬ Б: №10..№17 + ДВИЖОК)
// ============================================================================
(function(global) {
  'use strict';
  const C = global.STIKS_CONTENT;
  if (!C || !C.ARCH_SKILLS) return;

  // 10. Военный психолог: самый сильный враг убегает (100% до +1р, -25%/ранг), провал -> шок (стан 2р)
  C.ARCH_SKILLS.psih = function(ctx) {
    const trg = ctx.strongest;
    if (!trg) return;
    const diff = (trg.rank || 0) - (ctx.p.rank || 0);
    const ch = diff <= 1 ? 1.0 : Math.max(0, 1.0 - (diff - 1) * 0.25);
    if (Math.random() < ch) {
      trg.dead = true; trg.fled = true;
      ctx.popEnemy(trg, '🏃 СБЕЖАЛ В УЖАСЕ!');
      ctx.log(`🧠 <b>[Холодный анализ]</b>: «Расскажи, где тётя трогала!!!» — <b>${trg.name}</b> сбежал с поля боя!`);
    } else {
      trg.stun = Math.max(trg.stun || 0, 2);
      ctx.popEnemy(trg, '😱 ШОК: СТАН (2р)');
      ctx.log(`🧠 <b>[Холодный анализ]</b>: <b>${trg.name}</b> не убежал, но впал в шок на 2 хода!`);
    }
  };

  // 11. Стриптизёрша: -50% меткости всем врагам на 2р +1 уклонение +40% урона
  C.ARCH_SKILLS.strip = function(ctx) {
    ctx.p.shieldHits = (ctx.p.shieldHits || 0) + 1;
    ctx.p.buff = Math.max(ctx.p.buff || 1, 1.40);
    ctx.alive.forEach(en => { en.concussion = { rounds: 2, missChance: 0.50 }; });
    ctx.popPlayer('💃 Пируэт (+1 укл. / ×1.4)');
    ctx.log('💃 <b>[Ослепляющий пируэт]</b>: враги потеряли прицел (-50% меткости на 2р)!');
  };

  // 12. Ветеринар: «СИДЕТЬ!!!» (+1 ранг = 2 хода стана, +1р за каждый ранг младше, -1р старше)
  C.ARCH_SKILLS.vet = function(ctx) {
    ctx.alive.forEach(en => {
      const diff = (en.rank || 0) - (ctx.p.rank || 0);
      const turns = Math.max(0, 2 - (diff - 1));
      if (turns > 0) {
        en.stun = Math.max(en.stun || 0, turns);
        ctx.popEnemy(en, `💉 СИДЕТЬ! (${turns}р)`);
      } else {
        ctx.popEnemy(en, '💉 Не проняло');
      }
    });
    ctx.log('💉 <b>[Успокаивающий укол]</b>: «СИДЕТЬ!!! А ну-ка дай лапу!»');
  };

  // 13. Качок: валит самого сильного (+1р = 50%, ±25%/ранг); по игроку — 300% урона по 1 цели
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

  // 14. Особый заражённый: Подчинение (50% на равный ранг, ±25%/ранг); против игрока — 200% + кровоток на 2 хода
  C.ARCH_SKILLS.infected = function(ctx) {
    const trg = ctx.alive[Math.floor(Math.random() * ctx.alive.length)];
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
      trg.charmedAlly = true; trg.hivePackTamed = true;
      ctx.popEnemy(trg, '☣️ ПОДЧИНЁН В СТАЮ!');
      ctx.log(`☣️ <b>[Подчинение]</b> (${Math.round(ch * 100)}%): <b>${trg.name}</b> подчинён до конца рейда (при переполнении стаи уйдёт после боя)!`);
    } else {
      ctx.popEnemy(trg, '😒 Сопротивление');
      ctx.log(`☣️ <b>[Подчинение]</b> (${Math.round(ch * 100)}%): <b>${trg.name}</b> не подчинился.`);
    }
  };

  // 15–17. Кваз и Легендарные: массовый рёв / ужас Улья
  C.ARCH_SKILLS.kvaz = C.ARCH_SKILLS.legend_m = C.ARCH_SKILLS.legend_f = function(ctx) {
    ctx.alive.forEach(en => {
      if ((en.rank || 0) < (ctx.p.rank || 0)) { en.stun = Math.max(en.stun || 0, 2); ctx.popEnemy(en, '👹 УЖАС (2р)'); }
      else { en.debuff = Math.max(en.debuff || 0, 2); ctx.popEnemy(en, '⬇️ -30%'); }
    });
    ctx.log(`👹 <b>[${ctx.p.skill}]</b>: подавляющий рёв парализовал противников!`);
  };

  // Подключаем единый исполнитель классовых навыков + триггеры Алкаша/Кассирши + кровоток/слепоту
  const origBind = C.bindHooks.bind(C);
  C.bindHooks = function() {
    origBind();
    const UI = global.BSIM_UI, CORE = global.STIKS_COMBAT_CORE;
    if (!UI || !CORE || UI._arch17Bound) return;
    UI._arch17Bound = true;

    UI.actSkill = function() {
      const st = CORE.state, p = st && st.player;
      if (!st || !p || st.busy || st.finished || p._skillUsedBattle || p.skillUsed) return;
      if (p.arch === 'alkash' || p.arch === 'cashier') {
        UI.log(`⚡ Навык <b>[${p.skill}]</b> — это автоматический триггер (1 раз за бой при атаке врага)!`);
        return;
      }
      const alive = (st.enemies || []).filter(e => !e.dead);
      if (!alive.length) return;
      p.skillUsed = p._skillUsedBattle = true;
      const strongest = alive.slice().sort((a, b) => (b.rank - a.rank) || (b.hp - a.hp))[0];
      const flatAtk = ((p.stats.str || 10) * 0.7 + (p.stats.agi || 10) * 0.5 + (p.stats.int || 10) * 0.4 + (p.stats.spi || 10) * 0.4) * (p.buff || 1);
      const ctx = {
        p, st, alive, strongest, flatAtk,
        popPlayer: (t) => UI.popBack('u-player', true, t, 'float-skill'),
        popEnemy: (e, t) => UI.popBack('u-' + e.id, false, t, 'float-crit'),
        dealDamage(en, raw, txt) {
          const d = Math.max(1, Math.round(raw));
          if (st.mode === 'sandbox') en.hp = Math.max(1, (en.hp || 10) - d);
          else { en.hp = Math.max(0, (en.hp || 10) - d); if (en.hp <= 0) en.dead = true; }
          if (txt) UI.popBack('u-' + en.id, false, txt + (en.dead ? ' 💀' : ''), 'float-crit');
        },
        log: UI.log.bind(UI)
      };
      CORE.grantCombatXp('spi', 1);
      if (global.BSIM_AUDIO) global.BSIM_AUDIO.playSfx('shout');
      UI.showSkillBanner(p.ico, p.skill, p.phrase);
      const fn = C.ARCH_SKILLS[p.arch] || C.ARCH_SKILLS.kvaz;
      fn(ctx);
      UI.renderBattle();
      UI.checkBattleEnd();
    };

    const origEnTurn = UI.runEnemiesTurn.bind(UI);
    UI.runEnemiesTurn = async function() {
      const st = CORE.state, p = st && st.player, hpBefore = p ? p.hp : 0;
      (st && st.enemies || []).forEach(e => {
        if (!e.dead && e.bleed && e.bleed.rounds > 0) {
          e.bleed.rounds--;
          if (st.mode === 'game') { e.hp = Math.max(0, e.hp - e.bleed.dmg); if (e.hp <= 0) e.dead = true; }
          else e.hp = Math.max(1, e.hp - e.bleed.dmg);
          UI.popBack('u-' + e.id, false, `🩸 Кровоток -${e.bleed.dmg}`, 'float-crit');
        }
      });
      await origEnTurn();
      if (!p) return;

      if (p.asiatEvadeRounds > 0) {
        p.asiatEvadeRounds--;
        (st.enemies || []).forEach(e => { if (!e.dead) e.dist = Math.max(e.dist || 0, 1); });
      }
      if (p.hp < hpBefore) {
        const lost = hpBefore - p.hp;
        if (p.arch === 'alkash' && !p._skillUsedBattle) {
          p._skillUsedBattle = p.skillUsed = true;
          p.hp = hpBefore; p.alkashDodgeRounds = 2;
          UI.popBack('u-player', true, '🍾 ПЬЯНЫЙ КУЛАК: УКЛОН +30%!', 'float-skill');
          UI.log('🍾 <b>[Триггер: Пьяный кулак]</b>: Алкаш пошатнулся, избежал удара и получил +30% уклонения на 2 хода!');
        } else if (p.arch === 'cashier' && !p._skillUsedBattle && lost >= Math.ceil(p.maxHp * 0.25)) {
          p._skillUsedBattle = p.skillUsed = true;
          p.hp = hpBefore;
          UI.popBack('u-player', true, '🧾 ГАЛЯ, У НАС ОТМЕНА!', 'float-crit');
          UI.log('🧾 <b>[Триггер: Галя, у нас отмена!]</b>: Кассирша аннулировала сильный удар врага!');
        } else if (p.alkashDodgeRounds > 0 && Math.random() < 0.30) {
          p.hp = hpBefore;
          UI.popBack('u-player', true, '🍾 ПЬЯНЫЙ УКЛОН (30%)!', 'float-skill');
        }
        UI.renderBattle();
      }
      if (p.alkashDodgeRounds > 0) p.alkashDodgeRounds--;
    };
  };
  C.bindHooks();
})(typeof window !== 'undefined' ? window : globalThis);
