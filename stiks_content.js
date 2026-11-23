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
