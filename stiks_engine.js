// =========================================================================
// S-T-I-K-S // ЧИСТОЕ МОНОЛИТНОЕ ЯДРО v1.8.7 — ЧАСТЬ 1 ИЗ 4
// Содержит: Базу ядра, защиту localStorage, 13+1 архетипов, уровни без потолка (60+),
// шкалы/реген/пороги выживания, каноничного Кваза/Именного/Прозрение, STIKS.adminLevelUp
// =========================================================================
window.STIKS = {
  version: 'v1.8.7',
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
      localStorage.setItem(this.DB_KEY, serialized);
      if (this._hasFamilies(this.db)) {
        localStorage.setItem(this.BACKUP_KEY, serialized);
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

  },

  // =========================================================================
  // 1. ПОЛНЫЙ РОСТЕР 13 ЧЕЛОВЕЧЕСКИХ АРХЕТИПОВ + ОСОБЫЙ ЗАРАЖЁННЫЙ
  // =========================================================================
  ARCHETYPES: {
    tatan: {
      id: 'tatan', name: 'Татань', sex: 'f', img: 'img/tatan.jpg', affinityGift: 'nymph',
      stats: { str: 15, agi: 6, spd: 7, end: 14, int: 10, spi: 8 },
      mult:  { str: 3, agi: 0.5, spd: 0.5, end: 2, int: 1, spi: 1 },
      skill: 'Пощечина / Внушение ужаса',
      hint: 'Дергает себя за волосы и рычит, пытаясь выпустить злость.',
      dar15: 'Фитнесс-няшка (Дар Нимфы, снятие штрафов Ловк/Скор)',
      amulet: 'Сухой кошачий корм',
      intro: '{NAME} резко села на кровати, сжимая кулаки от нарастающей злости и режущего звука сирены. Внутри кипела странная, тяжелая сила. Сорвав дверь с защёлки, она шагнула навстречу неизвестному городу.'
    },
    kachok: {
      id: 'kachok', name: 'Качок', sex: 'm', img: 'img/kachok.jpeg', affinityGift: 'ice_master',
      stats: { str: 22, agi: 9, spd: 5, end: 18, int: 1, spi: 5 },
      mult:  { str: 3, agi: 1, spd: 0.5, end: 3, int: 0.2, spi: 1 },
      skill: 'Двоечка в челюсть / Прямиком в ад',
      hint: 'Сжимает кулаки и хрустит костяшками, ища цель для удара.',
      dar15: 'Собранность (снятие штрафа Инт, рост Силы и Вын x4)',
      amulet: 'Розовые трусики с доступом',
      intro: '{NAME} поднялся с пола, разминая затёкшие плечи под мерзкий вой сирены. Стены незнакомой комнаты казались тесными, а кулаки требовали дела. Выбив плечом заклинившую дверь, он вышел на улицу.'
    },
    asiat: {
      id: 'asiat', name: 'Подозрительно знакомый азиат', sex: 'm', img: 'img/asiat.jpeg', affinityGift: 'healer',
      stats: { str: 8, agi: 18, spd: 12, end: 10, int: 6, spi: 6 },
      mult:  { str: 1, agi: 3, spd: 1, end: 1, int: 0.5, spi: 0.5 },
      skill: 'Акробатический уход',
      hint: 'Пружинит на носках, оценивая высоту ближайших препятствий.',
      dar15: 'Слияние с тенью (снятие штрафов Инт/Дух, невидимость до +2 ранга)',
      amulet: 'Прицел-калейдоскоп',
      intro: '{NAME} открыл глаза в полутёмной комнате, прислушиваясь к далёкому рёву за стеной. Тело помнило точные движения, хотя память о прошлом оборвалась. Бесшумно скользнув к выходу, он шагнул на пустую улицу кластера.'
    },
    prof: {
      id: 'prof', name: 'Профессор', sex: 'm', img: 'img/prof.jpg', affinityGift: 'gigolo_gift',
      stats: { str: 6, agi: 8, spd: 8, end: 6, int: 20, spi: 12 },
      mult:  { str: 0.5, agi: 0.5, spd: 0.5, end: 0.5, int: 3, spi: 2 },
      skill: 'Магнификус мэджик',
      hint: 'Протирает несуществующие очки и бормочет формулы Улья.',
      dar15: 'Абсолютный расчёт (снятие штрафов < 1, +20% к атакующим Дарам)',
      amulet: 'Дуршлаг алюминиевый на голову',
      intro: '{NAME} очнулся на полу, сразу отмечая нестыковку архитектуры за окном и странный спектр неба. Сирена подтвердила худшие догадки о переносе. Собрав волю в кулак, он вышел наружу изучать законы нового мира.'
    },
    alkash: {
      id: 'alkash', name: 'Алкаш', sex: 'm', img: 'img/alkash.jpg', affinityGift: 'fire_master',
      stats: { str: 10, agi: 7, spd: 8, end: 16, int: 5, spi: 14 },
      mult:  { str: 1.5, agi: 0.5, spd: 0.5, end: 2.5, int: 0.5, spi: 1.5 },
      skill: 'Пьяный кулак',
      hint: 'Принюхивается к воздуху и хлопает себя по пустым карманам.',
      dar15: 'Спиртовой симбиоз (снятие штрафов < 1, x2 эффект Живчика и алкоголя)',
      amulet: 'Безалкогольное теплое пиво',
      intro: '{NAME} застонал от гула в голове, приняв сирену за тяжёлое похмелье. В горле пересохло, а за окном виднелись чужие руины. Пошатываясь, он толкнул дверь и вышел искать хоть что-нибудь полезное.'
    },
    strip: {
      id: 'strip', name: 'Стриптизёрша', sex: 'f', img: 'img/strip.jpg', affinityGift: 'tank',
      stats: { str: 7, agi: 19, spd: 16, end: 8, int: 5, spi: 5 },
      mult:  { str: 0.5, agi: 2.5, spd: 2.5, end: 1, int: 1, spi: 1 },
      skill: 'Ослепляющий пируэт',
      hint: 'Делает плавную растяжку на месте и хищно прищуривается.',
      dar15: 'Неуловимая пластика (снятие штрафа Силы, +25% уклонения)',
      amulet: 'Надувной резиновый топор',
      intro: '{NAME} очнулась на жёстком полу под завывание сирены, чувствуя лёгкость и гибкость в каждом мускуле. В окно бил тусклый свет чужого неба. Грациозно поднявшись, она выскользнула из номера в пустой город.'
    },
    surgeon: {
      id: 'surgeon', name: 'Хирург', sex: 'm', img: 'img/surgeon.jpg', affinityGift: 'stone_skin',
      stats: { str: 8, agi: 14, spd: 9, end: 9, int: 14, spi: 6 },
      mult:  { str: 0.5, agi: 2, spd: 1, end: 1, int: 2.5, spi: 1 },
      skill: 'Точный разрез',
      hint: 'Осматривает ладони, словно проверяя стерильность перед операцией.',
      dar15: 'Холодная точность (снятие штрафа Силы, +50% аптечки, пробитие брони)',
      amulet: 'Вантуз сантехнический',
      intro: '{NAME} очнулся на холодном кафеле под вой сирены СТИКСа. В запертом номере гостиницы пахло озоном, пылью и чужой кровью. Сжимая обломок скальпеля, он толкнул дверь и вышел в мёртвый город.'
    },
    nanny: {
      id: 'nanny', name: 'Воспитательница', sex: 'f', img: 'img/vospit.jpg', affinityGift: 'stealth',
      stats: { str: 7, agi: 10, spd: 10, end: 11, int: 11, spi: 11 },
      mult:  { str: 0.5, agi: 1, spd: 1, end: 1.5, int: 1.5, spi: 2.5 },
      skill: 'Строгий выговор',
      hint: 'Хмурит брови и окидывает окрестности строгим, оценивающим взглядом.',
      dar15: 'Железный авторитет (снятие штрафа Силы, подавление врагов до +1 ранга)',
      amulet: 'Свисток физрука на верёвочке',
      intro: '{NAME} поднялась с пола, отряхивая пыль с одежды под тревожный гул СТИКСа. Паника не взяла верх — привычка держать себя в руках помогла собраться. Закрыв за собой дверь номера, она осторожно ступила на асфальт.'
    },
    cashier: {
      id: 'cashier', name: 'Кассирша', sex: 'f', img: 'img/cashier.jpg', affinityGift: 'sonic',
      stats: { str: 8, agi: 11, spd: 11, end: 11, int: 10, spi: 9 },
      mult:  { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 1.5, spi: 1.5 },
      skill: 'Галя, у нас отмена!',
      hint: 'Сжимает губы и с ледяным спокойствием смотрит в пустоту.',
      dar15: 'Броня очереди (снятие штрафа Силы, 2 спасения за бой, -15% цены в Лавке)',
      amulet: 'Бейдж «Стажёр Пятёрочки»',
      intro: '{NAME} очнулась на продавленной койке под противный визг сирены. После ночных смен её трудно было напугать даже концом света. Поправив воротник, она уверенно вышла из подъезда на затихшую улицу.'
    },
    gigolo: {
      id: 'gigolo', name: 'Жиголо', sex: 'm', img: 'img/gigalo.jpg', affinityGift: 'mentalist',
      stats: { str: 9, agi: 12, spd: 12, end: 9, int: 9, spi: 9 },
      mult:  { str: 1, agi: 2, spd: 2, end: 1, int: 1.5, spi: 2 },
      skill: 'Обезоруживающий шарм',
      hint: 'Поправляет воротник и криво усмехается, глядя по сторонам.',
      dar15: 'Сердцеед пустошей (x2 шанс шарма/крита, +25% к мирному расхождению)',
      amulet: 'Семейники в горошек',
      intro: '{NAME} пришёл в себя в незнакомой комнате, где вместо музыки выла сирена кластера. Быстро оценив обстановку, он проверил карманы и улыбнулся краем губ. Выйдя из здания, он растворился в тенях улицы.'
    },
    schoolgirl: {
      id: 'schoolgirl', name: 'Школьница', sex: 'f', img: 'img/scoolgerl.jpg', affinityGift: 'clockstopper',
      stats: { str: 6, agi: 14, spd: 15, end: 7, int: 10, spi: 8 },
      mult:  { str: 0.5, agi: 2, spd: 2.5, end: 0.5, int: 1.5, spi: 1.5 },
      skill: 'Крик ультразвука',
      hint: 'Нервно поправляет лямку рюкзака и прислушивается к каждому шороху.',
      dar15: 'Второе дыхание (снятие штрафов < 1, +2 базовых ОХ, +25% стан ультразвуком)',
      amulet: 'Плюшевый заяц без уха',
      intro: '{NAME} проснулась от леденящего воя сирены за разбитым окном. Сердце колотилось в горле, но ноги сами понесли к двери. Выглянув в пустой коридор, она сделала глубокий вдох и вышла в город.'
    },
    vet: {
      id: 'vet', name: 'Ветеринар', sex: 'f', img: 'img/vetgirl.jpg', affinityGift: 'sense',
      stats: { str: 7, agi: 11, spd: 11, end: 10, int: 12, spi: 9 },
      mult:  { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 2.5, spi: 1.5 },
      skill: 'Успокаивающий укол',
      hint: 'Прислушивается к далёкому рыку и проверяет содержимое карманов.',
      dar15: 'Повелитель тварей (снятие штрафа Силы, +30% приручение, +25% урон мутантам)',
      amulet: 'Намордник с шипами',
      intro: '{NAME} пришла в себя от странного хищного рыка за стеной, перекрывшего даже сирену. Профессиональный инстинкт подсказал: рядом опасный зверь. Осторожно приоткрыв дверь, она вышла на разведку.'
    },
    psih: {
      id: 'psih', name: 'Военный психолог', sex: 'both', img: 'img/Psihm.jpg', imgM: 'img/Psihm.jpg', imgF: 'img/Psihf.jpeg', affinityGift: 'illusionist',
      stats: { str: 8, agi: 10, spd: 10, end: 10, int: 11, spi: 11 },
      mult:  { str: 0.8, agi: 1.2, spd: 1.2, end: 1.2, int: 2, spi: 2.5 },
      skill: 'Холодный анализ',
      hint: 'Выравнивает дыхание и сканирует обстановку спокойным взглядом.',
      dar15: 'Боевая закалка (снятие штрафа Силы, +50% анти-пси, снятие дебаффов отряда)',
      amulet: 'Открытка «Улыбнись, тебя снимают»',
      intro: '{NAME} открыл глаза без резких движений, подавив выброс адреналина от воя сирены. Оценив выходы и укрытия в комнате, он поднялся на ноги. С холодным расчётом в голове дверь наружу была открыта.'
    },
    infected: {
      id: 'infected', name: 'Особый заражённый', sex: 'm', img: 'img/infected.jpg', affinityGift: 'vaishnavism',
      stats: { str: 14, agi: 14, spd: 14, end: 14, int: 2, spi: 2 },
      mult:  { str: 2, agi: 2, spd: 2, end: 2, int: 0.5, spi: 1 },
      skill: 'Инстинкты Улья',
      hint: 'С глухим рыком втягивает воздух, чуя живую плоть и споры.',
      dar15: 'Дары Улья',
      amulet: null,
      intro: '{NAME} очнулся в темноте под гулкий зов Улья в глубине черепа. Голод скручивал нутро, но человеческий разум удержал контроль над телом. Когти скрежетнули по бетону, когда он шагнул в город.'
    }
  },

  MULT_MAP: {
    tatan:      { str: 3, agi: 0.5, spd: 0.5, end: 2, int: 1, spi: 1 },
    kachok:     { str: 3, agi: 1, spd: 0.5, end: 3, int: 0.2, spi: 1 },
    asiat:      { str: 1, agi: 3, spd: 1, end: 1, int: 0.5, spi: 0.5 },
    prof:       { str: 0.5, agi: 0.5, spd: 0.5, end: 0.5, int: 3, spi: 2 },
    alkash:     { str: 1.5, agi: 0.5, spd: 0.5, end: 2.5, int: 0.5, spi: 1.5 },
    strip:      { str: 0.5, agi: 2.5, spd: 2.5, end: 1, int: 1, spi: 1 },
    surgeon:    { str: 0.5, agi: 2, spd: 1, end: 1, int: 2.5, spi: 1 },
    nanny:      { str: 0.5, agi: 1, spd: 1, end: 1.5, int: 1.5, spi: 2.5 },
    cashier:    { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 1.5, spi: 1.5 },
    gigolo:     { str: 1, agi: 2, spd: 2, end: 1, int: 1.5, spi: 2 },
    schoolgirl: { str: 0.5, agi: 2, spd: 2.5, end: 0.5, int: 1.5, spi: 1.5 },
    vet:        { str: 0.5, agi: 1.5, spd: 1.5, end: 1.5, int: 2.5, spi: 1.5 },
    psih:       { str: 0.8, agi: 1.2, spd: 1.2, end: 1.2, int: 2, spi: 2.5 },
    infected:   { str: 2, agi: 2, spd: 2, end: 2, int: 0.5, spi: 1 }
  },

  // =========================================================================
  // 2. КАНОНИЧЕСКИЕ ПАРАМЕТРЫ КВАЗА (ОГРОМНЫЙ НЕКРАСИВЫЙ ЧЕЛОВЕК) И ЭВОЛЮЦИЯ
  // =========================================================================
  KVAZ_CONFIG: {
    hpEndMult: 1.5,          // Рост ОЗ от Выносливости x1.5 (10 + floor(end * 1.5))
    manaStatMult: 0.5,       // Уменьшенный рост Маны (10 + floor(spi * 0.5))
    statGrowthBonus: {       // Увеличение коэффициентов роста Силы, Выносливости и Ловкости (+0.5)
      str: 0.5,
      end: 0.5,
      agi: 0.5
    },
    meleeFlatPerLvl: 1.5,    // Плоский мускульный урон в ближнем бою (без оружия и холодным): +1.5 * lvl
    priceSurcharge: 2,       // +2 спорана к цене любого товара и услуги (уродство)
    clothingLootMult: 0.5,   // Шанс нахождения брони и одежды снижен вдвое (x0.5)
    portraits: { m: 'img/Kvazm.jpg', f: 'img/Kvazf.jpg' }
  },

  resolvePortrait(p) {
    if (!p) return 'img/kachok.jpeg';
    const isF = (p.sex === 'f' || p.gender === 'f' || p.gender === 'female');
    if (p.isKvaz || p.form === 'kvaz') {
      return isF ? this.KVAZ_CONFIG.portraits.f : this.KVAZ_CONFIG.portraits.m;
    }
    if (p.asInfected || p.isInfected || p.arch === 'infected') {
      return 'img/infected.jpg';
    }
    const key = p.arch || 'kachok';
    if (key === 'psih' || key === 'psychologist') {
      return isF ? 'img/Psihf.jpeg' : 'img/Psihm.jpg';
    }
    const aObj = this.ARCHETYPES[key];
    return (aObj && aObj.img) || (isF ? 'img/tatan.jpg' : 'img/kachok.jpeg');
  },

  getHeroGrowthMults(p) {
    const isInfOnly = Boolean(p && (p.asInfected || p.isInfected) && !p.isKvaz);
    const archKey = isInfOnly ? 'infected' : ((p && (p.origArch || p.arch)) || 'kachok');
    const base = Object.assign({ str: 1, agi: 1, spd: 1, end: 1, int: 1, spi: 1 }, this.MULT_MAP[archKey] || {});
    const lvl = Number((p && (p.lvl || p.level)) || 0);

    // Таланты 15-го уровня для человеческих архетипов
    if (!isInfOnly && lvl >= 15) {
      if (archKey === 'kachok') {
        base.str = 4;
        base.end = 4;
        if (base.int < 1) base.int = 1;
      } else if (['tatan', 'asiat', 'prof', 'alkash', 'strip', 'surgeon', 'nanny', 'cashier', 'schoolgirl', 'vet', 'psih'].includes(archKey)) {
        Object.keys(base).forEach(k => {
          if (base[k] < 1) base[k] = 1;
        });
      }
    }

    // Прибавка Кваза к коэффициентам роста Силы, Выносливости и Ловкости (+0.5)
    if (p && p.isKvaz) {
      const b = this.KVAZ_CONFIG.statGrowthBonus;
      base.str = this._round100(base.str + (b.str || 0));
      base.end = this._round100(base.end + (b.end || 0));
      base.agi = this._round100(base.agi + (b.agi || 0));
    }
    return base;
  },

  getKvazMeleeFlatBonus(p, isRangedWeapon) {
    if (!p || !p.isKvaz || isRangedWeapon) return 0;
    const lvl = Math.max(0, Number(p.lvl || p.level || 0));
    return Math.round(lvl * this.KVAZ_CONFIG.meleeFlatPerLvl);
  },

  applyPriceModifier(hero, basePrice) {
    const raw = Math.max(0, Number(basePrice) || 0);
    if (hero && hero.isKvaz) {
      return raw + this.KVAZ_CONFIG.priceSurcharge;
    }
    return raw;
  },

  mutateToKvaz(hero, sourceLabel) {
    if (!hero) return false;
    if (hero.origArch === undefined && hero.arch && hero.arch !== 'infected') {
      hero.origArch = hero.arch;
    }
    hero.isKvaz = true;
    hero.isInfected = false;
    hero.asInfected = false;
    hero.isImennoi = false;
    hero.portrait = this.resolvePortrait(hero);
    this.normalizePlayerStats(hero);
    if (typeof this.log === 'function') {
      this.log(`🧬 МУТАЦИЯ В КВАЗА (${sourceLabel || 'Улей'}): ${hero.name} стал огромным и некрасивым! Рост ОЗ от Вын x1.5, маны x0.5, рост Силы/Вын/Ловк +0.5, ближний бой +1.5/ур., но цены +2 сп. и шанс найти одежду/броню вдвое ниже.`);
    }
    return true;
  },

  mutateToInfected(hero, sourceLabel) {
    if (!hero) return false;
    if (hero.origArch === undefined && hero.arch && hero.arch !== 'infected') {
      hero.origArch = hero.arch;
    }
    hero.isKvaz = false;
    hero.isInfected = true;
    hero.asInfected = true;
    hero.isImennoi = false;
    hero.arch = 'infected';
    hero.portrait = 'img/infected.jpg';
    this.normalizePlayerStats(hero);
    if (typeof this.log === 'function') {
      this.log(`☣️ ОБРАЩЕНИЕ (${sourceLabel || 'Улей'}): ${hero.name} стал Особым заражённым!`);
    }
    return true;
  },

  healKvazToHuman(hero, sourceLabel) {
    if (!hero) return false;
    const restoreArch = (hero.origArch && hero.origArch !== 'infected' && this.ARCHETYPES[hero.origArch])
      ? hero.origArch
      : (hero.sex === 'f' ? 'tatan' : 'kachok');
    hero.isKvaz = false;
    hero.isInfected = false;
    hero.asInfected = false;
    hero.isImennoi = true;
    hero.arch = restoreArch;
    hero.portrait = this.resolvePortrait(hero);
    this.normalizePlayerStats(hero);
    if (typeof this.log === 'function') {
      this.log(`⚪ ИСЦЕЛЕНИЕ (${sourceLabel || 'Белый жемчуг'}): ${hero.name} вернул человеческий облик (статус: Именной), сохранив все накопленные характеристики!`);
    }
    return true;
  },

  // Прозрение Особого заражённого: при убийстве врага на 15+ уровней старше себя (с любого уровня)
  // 50% шанс прозреть -> с равной вероятностью (50/50) стать Человеком или Квазом
  checkInfectedEpiphany(hero, enemyLvl) {
    if (!hero || !(hero.isInfected || hero.asInfected) || hero.isKvaz) return null;
    const hLvl = Number(hero.lvl || hero.level || 0);
    const eLvl = Number(enemyLvl || 0);
    if (eLvl < hLvl + 15) return null;

    if (Math.random() >= 0.5) {
      return { triggered: false, msg: 'Спора вскипела от победы над сильным врагом, но разум остался в облике заражённого.' };
    }

    if (Math.random() < 0.5) {
      this.healKvazToHuman(hero, `Прозрение после победы над врагом Ур.${eLvl}`);
      return { triggered: true, outcome: 'human', msg: `✨ ПРОЗРЕНИЕ! Убив врага на ${eLvl - hLvl} ур. старше, ${hero.name} вернулся в человеческий облик!` };
    } else {
      this.mutateToKvaz(hero, `Прозрение после победы над врагом Ур.${eLvl}`);
      return { triggered: true, outcome: 'kvaz', msg: `🧬 ПРОЗРЕНИЕ! Убив врага на ${eLvl - hLvl} ур. старше, ${hero.name} переродился в Кваза!` };
    }
  },

  // =========================================================================
  // 3. ТАБЛИЦА УРОВНЕЙ БЕЗ ПОТОЛКА (60 -> +10% КАЖДЫЙ УРОВЕНЬ В БЕСКОНЕЧНОСТЬ)
  // =========================================================================
  getLevelThreshold(targetLvl) {
    const lvl = Math.max(0, Math.floor(Number(targetLvl) || 0));
    let threshold = 60;
    for (let i = 1; i <= lvl; i++) {
      threshold = Math.floor(threshold * 1.1);
    }
    return threshold;
  },

  getLevelFromStatsSum(sum) {
    const total = Number(sum) || 0;
    if (total < 66) return 0;
    let lvl = 0;
    let threshold = 60;
    while (true) {
      const nextThreshold = Math.floor(threshold * 1.1);
      if (total >= nextThreshold) {
        lvl++;
        threshold = nextThreshold;
      } else {
        break;
      }
      if (lvl > 5000) break;
    }
    return lvl;
  },

  getInfectedRankTier(lvl) {
    const l = Math.max(0, Number(lvl) || 0);
    if (l >= 61) return 9;
    if (l >= 50) return 8;
    if (l >= 41) return 7;
    if (l >= 37) return 6;
    if (l >= 31) return 5;
    if (l >= 21) return 4;
    if (l >= 11) return 3;
    if (l >= 5) return 2;
    if (l >= 1) return 1;
    return 0;
  },

  // =========================================================================
  // 4. ШКАЛЫ, РЕГЕНЕРАЦИЯ, ПОРОГИ ВЫЖИВАНИЯ И ПРОИЗВОДНЫЕ 6 ХАРАКТЕРИСТИК
  // =========================================================================
  _round100(v) {
    return Math.round((Number(v) || 0) * 100) / 100;
  },

  _cleanSporans(obj) {
    if (!obj) return 0;
    const a = Number(obj.spores);
    const b = Number(obj.sporans);
    const va = (isFinite(a) && a >= 0 && a <= 10000000) ? Math.floor(a) : 0;
    const vb = (isFinite(b) && b >= 0 && b <= 10000000) ? Math.floor(b) : 0;
    const val = Math.max(va, vb);
    obj.spores = val;
    obj.sporans = val;
    return val;
  },

  defaultSlots() {
    return { main: null, side: null, melee: null, mag: null, mod: null, meleeMod: null, armor: null, clothes: null, boots: null, bag: null, talisman: null };
  },

  isRealSporeUnlocked(p) {
    if (!p) return false;
    if (p.asInfected || p.isInfected) return true;
    if (p._manualBookRead || p._drankZhivchik) return true;
    if (p.knowsSpores || p.sporeKnown || p.knowsRecipe) {
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
    if (!p.stats) p.stats = { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };
    if (!p.slots || typeof p.slots !== 'object') p.slots = this.defaultSlots();
    else p.slots = Object.assign(this.defaultSlots(), p.slots);

    const endVal = Number(p.stats.end || 10);
    const strVal = Number(p.stats.str || 10);
    const spiVal = Number(p.stats.spi || 10);
    const spdVal = Number(p.stats.spd || 10);
    const isTatan = (p.arch === 'tatan' && !p.asInfected && !p.isInfected);
    const isKachok = (p.arch === 'kachok' && !p.asInfected && !p.isInfected);

    // Кваз: увеличенный рост ОЗ от Выносливости (x1.5) и уменьшенный рост Маны (x0.5)
    const hpEndMult = p.isKvaz ? this.KVAZ_CONFIG.hpEndMult : 1.0;
    const manaSpiMult = p.isKvaz ? this.KVAZ_CONFIG.manaStatMult : 1.0;

    const calcMaxHp = Math.max(10, 10 + Math.floor(endVal * hpEndMult));
    const wasFresh = !p._hpInit;
    p.maxHp = calcMaxHp;
    if (wasFresh || typeof p.hp !== 'number' || p.hp > p.maxHp) {
      p.hp = p.maxHp;
      p._hpInit = true;
    }
    p.hp = Math.max(0, Math.min(p.maxHp, p.hp));

    const foodEndStep = isTatan ? 2 : 1;
    p.maxFood = (isTatan ? 240 : 50) + Math.floor(endVal / 10) * foodEndStep;
    p.maxWater = (isTatan ? 100 : 50) + Math.floor(endVal / 10) * foodEndStep;
    p.maxStamina = 50 + Math.floor(endVal / 5);
    p.maxSpore = 50 + Math.floor(endVal / 10) + Math.floor(spiVal / 10);
    p.maxMana = Math.max(5, 10 + Math.floor(spiVal * manaSpiMult));
    p.maxAp = 6 + Math.floor(spdVal / 100);

    if (typeof p.food !== 'number' || p.food > p.maxFood) p.food = p.maxFood;
    if (typeof p.water !== 'number' || p.water > p.maxWater) p.water = p.maxWater;
    if (typeof p.stamina !== 'number' || p.stamina > p.maxStamina) p.stamina = p.maxStamina;
    if (typeof p.spore !== 'number') p.spore = p.maxSpore;
    p.spore = Math.max(0, Math.min(p.maxSpore, p.spore));
    if (typeof p.mana !== 'number' || p.mana > p.maxMana) p.mana = p.maxMana;
    if (typeof p.stepsLeft !== 'number') p.stepsLeft = p.maxAp;
    p.stepsLeft = Math.max(0, Math.min(p.maxAp, p.stepsLeft));

    const carryMult = isKachok ? 3 : 1;
    const bagBonus = p.slots.bag ? (Number(p.slots.bag.bag || p.slots.bag.cap || p.slots.bag.bonus || 15) || 15) : 0;
    p.maxWeight = Math.round(((10 + strVal * 0.1) * carryMult + bagBonus) * 10) / 10;

    if (!Array.isArray(p.inv)) p.inv = [];
    this._cleanSporans(p);
    this.isRealSporeUnlocked(p);
    this.isRealSkillUnlocked(p);
  },

  // Активные боевые статы с учётом порогов выживания (<10% ОЗ, <10% Спорового баланса и т.д.)
  getEffectiveCombatStats(p) {
    const base = Object.assign({ str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 }, (p && p.stats) || {});
    if (!p) return base;
    const hpRatio = (p.hp || 0) / Math.max(1, p.maxHp || 10);
    const sporeRatio = (p.spore || 0) / Math.max(1, p.maxSpore || 50);

    // ОЗ < 10%: Ловкость и Скорость вдвое ниже, но Сила, Интеллект и Дух удваиваются в схватке
    if (hpRatio < 0.10) {
      base.agi = Math.floor(base.agi * 0.5);
      base.spd = Math.floor(base.spd * 0.5);
      base.str = Math.round(base.str * 2);
      base.int = Math.round(base.int * 2);
      base.spi = Math.round(base.spi * 2);
    }

    // Споровый баланс < 10%: Интеллект и Выносливость снижаются вдвое
    if (sporeRatio < 0.10) {
      base.int = Math.floor(base.int * 0.5);
      base.end = Math.floor(base.end * 0.5);
    }

    // Бонус Татани (+10% к Силе в течение 5 ходов после еды)
    if (p._tatanFedTurns > 0) {
      base.str = Math.round(base.str * 1.1);
    }
    return base;
  },

  // Походовой тик выживания, регенерации ОЗ/Маны и расхода шкал
  processHeroTurnTick(p) {
    if (!p || p.dead || p.escaped) return;
    this.normalizePlayerStats(p);

    const isTatan = (p.arch === 'tatan' && !p.asInfected && !p.isInfected);
    const hpRatio = p.hp / Math.max(1, p.maxHp);
    const waterRatio = p.water / Math.max(1, p.maxWater);
    const sporeRatio = p.spore / Math.max(1, p.maxSpore);
    const stamRatio = p.stamina / Math.max(1, p.maxStamina);

    // Расход сытости, жажды и спорового баланса
    let foodDrain = isTatan ? 2 : 1;
    if (hpRatio < 0.30) foodDrain *= 2;
    let waterDrain = isTatan ? 2 : 1;
    if (sporeRatio < 0.30) waterDrain *= 2;
    let sporeDrain = hpRatio < 0.50 ? 2 : 1;
    if (waterRatio > 0.50) sporeDrain = Math.max(1, Math.floor(sporeDrain * 0.5));

    p.food = Math.max(0, p.food - foodDrain);
    p.water = Math.max(0, p.water - waterDrain);
    p.spore = Math.max(0, p.spore - sporeDrain);
    if (p.stinkTurns > 0) p.stinkTurns--;
    if (p._tatanFedTurns > 0) p._tatanFedTurns--;

    // Регенерация ОЗ и Маны
    const endVal = Number(p.stats.end || 10);
    const spiVal = Number(p.stats.spi || 10);
    let hpRegen = 1 + Math.floor(endVal / 10);
    let manaRegen = Math.floor(spiVal / 10);

    if (hpRatio < 0.30) hpRegen *= 2;
    if (sporeRatio > 0.75) {
      hpRegen *= 2;
      manaRegen *= 2;
    } else if (sporeRatio < 0.25) {
      hpRegen = Math.floor(hpRegen * 0.5);
      manaRegen = Math.floor(manaRegen * 0.5);
    }

    if (p.food < 5 || p.water < 5) {
      hpRegen = 0;
    }

    if (hpRegen > 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + hpRegen);
    }
    if (manaRegen > 0 && p.mana < p.maxMana) {
      p.mana = Math.min(p.maxMana, p.mana + manaRegen);
    }

    // Урон при обнулении сытости или жажды: 1 + 0.5 * lvl за ход
    if (p.food === 0 || p.water === 0) {
      const starveDmg = Math.max(1, Math.round(1 + 0.5 * (p.lvl || 0)));
      p.hp = Math.max(0, p.hp - starveDmg);
      this.log(`⚠️ Истощение (${p.food === 0 ? 'голод' : 'жажда'}): ${p.name} теряет -${starveDmg} ОЗ!`);
    }

    // Проверка сна при критически низкой бодрости (<5% или 0)
    if (p.stamina === 0 || (stamRatio < 0.05 && Math.random() < 0.5)) {
      p.isSleeping = true;
    }
    if (p.isSleeping) {
      const rec = Math.max(2, Math.ceil(p.maxStamina * 0.05));
      p.stamina = Math.min(p.maxStamina, p.stamina + rec);
      if (p.stamina >= Math.ceil(p.maxStamina * 0.25)) {
        p.isSleeping = false;
        this.log(`☀️ ${p.name} выспался и восстановил бодрость до 25%.`);
      } else {
        this.log(`💤 ${p.name} спит от изнеможения (+${rec} бодрости).`);
      }
    }
  },

  grantActionXp(p, statKey, baseDelta) {
    if (!p || !statKey || !baseDelta) return 0;
    if (!p.stats) p.stats = { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };
    const multObj = this.getHeroGrowthMults(p);
    const m = Number(multObj[statKey]) || 1;
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
    const newLvl = this.getLevelFromStatsSum(sum);
    const oldLvl = Number(p.lvl) || 0;

    // Порог 200 Духа: автоматический импульс Улья без жемчуга
    if ((Number(p.stats.spi) || 0) >= 200 && !p._spi200Triggered) {
      p._spi200Triggered = true;
      const hasGifts = p.gifts && Object.keys(p.gifts).length > 0;
      const startGiftLvl = hasGifts ? 1 : 30;
      if (typeof this.rollHiveRoulette === 'function') {
        const gRes = this.rollHiveRoulette(p, 'spi200', startGiftLvl);
        this.log(`🔮 Порог 200 Духа! Мощный импульс Улья пробудил Дар ${startGiftLvl}-го уровня: ${gRes.msg || ''}`);
      }
    }

    if (newLvl > oldLvl) {
      p.lvl = newLvl;
      // Сбрасываем счётчик горошин за уровень при повышении уровня
      p.peasEatenThisLevel = 0;

      if (newLvl >= 15 && !p.darUnlocked) {
        p.darUnlocked = true;
        const aInfo = this.ARCHETYPES[p.arch] || {};
        this.log('🌟 ' + p.name + ' достиг 15 ур. и раскрыл талант архетипа: ' + (aInfo.dar15 || 'Пробуждение') + '!');
      }
      if (typeof this.checkThresholdAwakening === 'function') {
        this.checkThresholdAwakening(p);
      }
      this.log('⬆️ Уровень повышен! ' + p.name + ' теперь Ур.' + newLvl + ' (сумма навыков: ' + sum + ').');
      return true;
    }
    return false;
  },

  // =========================================================================
  // 5. ПОЧИНКА ПОВЫШЕНИЯ УРОВНЯ В АДМИНКЕ (ПРОПОРЦИОНАЛЬНЫЙ РОСТ 6 СТАТОВ)
  // =========================================================================
  adminLevelUp(heroOrUid, addLevels = 1) {
    let hero = (typeof heroOrUid === 'object') ? heroOrUid : this.findHeroByUid(heroOrUid);
    if (!hero) return null;
    if (!hero.stats) hero.stats = { str: 10, agi: 10, spd: 10, end: 10, int: 10, spi: 10 };

    const step = Math.max(1, Math.floor(Number(addLevels) || 1));
    const targetLvl = Math.max(1, (Number(hero.lvl) || 0) + step);
    const targetSum = this.getLevelThreshold(targetLvl);
    const keys = ['str', 'agi', 'spd', 'end', 'int', 'spi'];
    const curSum = this._round100(keys.reduce((acc, k) => acc + (Number(hero.stats[k]) || 0), 0));
    const deltaTotal = Math.max(0, this._round100(targetSum - curSum));

    const gains = { str: 0, agi: 0, spd: 0, end: 0, int: 0, spi: 0 };
    if (deltaTotal > 0) {
      // Временно учитываем пост-талантовые множители, если целевой уровень >= 15
      const previewHero = Object.assign({}, hero, { lvl: targetLvl });
      const mults = this.getHeroGrowthMults(previewHero);
      const weightSum = keys.reduce((acc, k) => acc + (Number(mults[k]) || 1), 0) || 6;

      let distributed = 0;
      let mainStat = 'str';
      let maxMult = -1;

      keys.forEach(k => {
        const w = Number(mults[k]) || 1;
        if (w > maxMult) {
          maxMult = w;
          mainStat = k;
        }
        const add = this._round100(deltaTotal * (w / weightSum));
        gains[k] = add;
        hero.stats[k] = this._round100((Number(hero.stats[k]) || 0) + add);
        distributed = this._round100(distributed + add);
      });

      const rem = this._round100(deltaTotal - distributed);
      if (rem !== 0) {
        gains[mainStat] = this._round100(gains[mainStat] + rem);
        hero.stats[mainStat] = this._round100((Number(hero.stats[mainStat]) || 0) + rem);
      }
    }

    this.recalcLevel(hero);
    this.normalizePlayerStats(hero);
    hero.hp = hero.maxHp;
    hero.mana = hero.maxMana;
    this.syncHeroProfile(hero);
    this.saveDB();

    const finalSum = this._round100(keys.reduce((acc, k) => acc + (Number(hero.stats[k]) || 0), 0));
    const report = `⬆️ [АДМИН] ${hero.name} повышен до Ур.${hero.lvl} (сумма статов: ${finalSum}/${targetSum}). Прирост: Сила +${gains.str}, Ловк +${gains.agi}, Скор +${gains.spd}, Вын +${gains.end}, Инт +${gains.int}, Дух +${gains.spi}.`;
    this.log(report);
    return { ok: true, hero, targetLvl: hero.lvl, finalSum, gains, report };
  }
};

// === ЧАСТЬ 2A: ПОСЕЛЕНИЕ УЛЬЯ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};
  S.settlement = S.settlement || {};

  S.settlement.playWorkSound = function(type) {
    if (!S.voiceOn) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      const ctx = new C(), now = ctx.currentTime;
      const n = (type === 'rest' || type === 'eat') ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + i * 0.45;
        if (type === 'forge') {
          o.type = 'triangle';
          o.frequency.setValueAtTime(680, t);
          o.frequency.exponentialRampToValueAtTime(220, t + 0.18);
        } else if (type === 'mine') {
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(320, t);
          o.frequency.exponentialRampToValueAtTime(95, t + 0.16);
        } else if (type === 'saw') {
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(190, t);
          o.frequency.linearRampToValueAtTime(260, t + 0.25);
        } else {
          o.type = 'sine';
          o.frequency.setValueAtTime(420, t);
          o.frequency.exponentialRampToValueAtTime(310, t + 0.22);
        }
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.27);
      }
    } catch (e) {}
  };

  S.settlement.renderInteractiveSceneSVG = function(hr) {
    const lv = Math.max(0, Number(hr && hr.lvl) || 0);
    const busy = Boolean(S.settlement._busy);
    const dis = busy
      ? 'opacity="0.55" style="pointer-events:none;"'
      : 'style="cursor:pointer;"';
    const kv = (hr && hr.isKvaz) ? 2 : 0;
    return [
      '<svg viewBox="0 0 360 190" xmlns="http://w3.org"',
      ' style="width:100%;height:auto;border-radius:6px;',
      'border:1px solid #6e2626;background:#0b0d0c;display:block;">',
      '<rect width="360" height="190" fill="#0d1110"/>',
      '<path d="M0 148 Q180 140 360 142 V190 H0 Z"',
      ' fill="#141a17" stroke="#3d4f44"/>',
      '<text x="10" y="16" font-size="10" font-family="monospace"',
      ` fill="#d48a8a" font-weight="bold">ПОСЕЛЕНИЕ УР.${lv}</text>`,
      `<g ${dis} onclick="STIKS.settlementAction('hotel')">`,
      '<rect x="12" y="34" width="104" height="46" rx="4"',
      ' fill="#182026" stroke="#38bdf8" stroke-width="1.5"/>',
      '<polygon points="10,34 64,20 118,34" fill="#1e293b"/>',
      '<text x="64" y="64" text-anchor="middle" font-size="9"',
      ` fill="#e0f2fe">🏨 Гостиница (-${2 + kv}💎)</text></g>`,
      `<g ${dis} onclick="STIKS.settlementAction('grocery')">`,
      '<rect x="128" y="34" width="104" height="46" rx="4"',
      ' fill="#1a2218" stroke="#4ade80" stroke-width="1.5"/>',
      '<text x="180" y="64" text-anchor="middle" font-size="9"',
      ` fill="#bbf7d0">🥖 Прод.лавка (-${1 + kv}💎)</text></g>`,
      `<g ${dis} onclick="STIKS.settlementAction('canteen')">`,
      '<rect x="244" y="34" width="104" height="46" rx="4"',
      ' fill="#241b14" stroke="#f59e0b" stroke-width="1.5"/>',
      '<text x="296" y="64" text-anchor="middle" font-size="9"',
      ` fill="#fef3c7">🍲 Столовая (-${2 + kv}💎)</text></g>`,
      `<g ${dis} onclick="STIKS.settlementAction('sawmill')">`,
      '<rect x="12" y="96" width="104" height="48" rx="4"',
      ' fill="#1c1915" stroke="#a3e635" stroke-width="1.5"/>',
      '<text x="64" y="125" text-anchor="middle" font-size="9"',
      ' fill="#ecfccb">🪚 Лесопилка (+2💎)</text></g>',
      `<g ${dis} onclick="STIKS.settlementAction('forge')">`,
      '<rect x="128" y="96" width="104" height="48" rx="4"',
      ' fill="#241313" stroke="#f87171" stroke-width="1.5"/>',
      '<text x="180" y="125" text-anchor="middle" font-size="9"',
      ' fill="#fee2e2">⚒️ Кузница (+2💎)</text></g>',
      `<g ${dis} onclick="STIKS.settlementAction('mine')">`,
      '<rect x="244" y="96" width="104" height="48" rx="4"',
      ' fill="#18181b" stroke="#c084fc" stroke-width="1.5"/>',
      '<text x="296" y="125" text-anchor="middle" font-size="9"',
      ' fill="#f3e8ff">⛏️ Шахта (+2💎)</text></g>',
      '<text x="180" y="172" text-anchor="middle" font-size="8.5"',
      ' fill="#9aa89e">Смена: -25% Сыт/Бодр → +2💎 +1 стат</text>',
      '</svg>'
    ].join('');
  };

  S.settlement.runBuildingTask = function(hr, task) {
    if (!hr || S.settlement._busy) return;
    if (S.normalizePlayerStats) S.normalizePlayerStats(hr);
    const kv = hr.isKvaz ? 2 : 0;
    const mF = hr.maxFood || 50, mS = hr.maxStamina || 50;
    const cF = Number(hr.food ?? mF), cS = Number(hr.stamina ?? mS);
    const sp = Number(hr.spores || 0);

    if (['sawmill', 'forge', 'mine'].includes(task)) {
      const nF = Math.ceil(mF * 0.25), nS = Math.ceil(mS * 0.25);
      if (cF < nF || cS < nS) {
        S.renderSettlementModal('⚠️ Нужно >= 25% Сытости и Бодрости!');
        return;
      }
      const sec = 5 + Math.floor(Math.random() * 2);
      const snd = { sawmill: 'saw', forge: 'forge', mine: 'mine' };
      const ttl = { sawmill: 'Лесопилке', forge: 'Кузнице', mine: 'Шахте' };
      S.settlement._busy = true;
      S.settlement.playWorkSound(snd[task]);
      S.renderSettlementModal(`⏳ Работа на ${ttl[task]} (${sec}с)...`);
      setTimeout(() => {
        S.settlement._busy = false;
        hr.food = Math.max(0, cF - nF);
        hr.stamina = Math.max(0, cS - nS);
        hr.spores = sp + 2; hr.sporans = hr.spores;
        const pSt = ['str', 'agi', 'spd', 'end'];
        const pNm = { str: 'Сила', agi: 'Ловкость', spd: 'Скорость', end: 'Выносливость' };
        const pk = pSt[Math.floor(Math.random() * pSt.length)];
        hr.stats[pk] = Number(hr.stats[pk] || 10) + 1;
        if (S.recalcLevel) S.recalcLevel(hr);
        if (S.normalizePlayerStats) S.normalizePlayerStats(hr);
        if (S.saveDB) S.saveDB();
        const msg = `✅ ${ttl[task]}: +2💎 и +1 ${pNm[pk]}.`;
        if (S.log) S.log(msg);
        S.renderSettlementModal(msg);
      }, sec * 1000);
      return;
    }

    if (task === 'grocery') {
      const cost = 1 + kv;
      if (sp < cost) {
        S.renderSettlementModal(`⚠️ Нужно ${cost} 💎.`);
        return;
      }
      hr.spores = sp - cost; hr.sporans = hr.spores;
      hr.food = Math.min(mF, cF + Math.ceil(mF * 0.5));
      if (S.saveDB) S.saveDB();
      S.renderSettlementModal(`🥖 Перекус (-${cost}💎): +50% сытости.`);
      return;
    }

    if (task === 'canteen' || task === 'hotel') {
      const cost = 2 + kv;
      if (sp < cost) {
        S.renderSettlementModal(`⚠️ Нужно ${cost} 💎.`);
        return;
      }
      const isEat = task === 'canteen';
      const sec = 5 + Math.floor(Math.random() * 6);
      S.settlement._busy = true;
      S.settlement.playWorkSound(isEat ? 'eat' : 'rest');
      S.renderSettlementModal(`⏳ ${isEat ? 'Обед' : 'Отдых'} (${sec}с)...`);
      setTimeout(() => {
        S.settlement._busy = false;
        hr.spores = Math.max(0, (hr.spores || 0) - cost);
        hr.sporans = hr.spores;
        const stKey = isEat ? 'end' : 'spi';
        hr.stats[stKey] = Number(hr.stats[stKey] || 10) + 1;
        if (S.recalcLevel) S.recalcLevel(hr);
        if (S.normalizePlayerStats) S.normalizePlayerStats(hr);
        if (isEat) hr.food = hr.maxFood;
        else hr.stamina = hr.maxStamina;
        if (S.saveDB) S.saveDB();
        const msg = isEat
          ? `🍲 Обед (-${cost}💎): 100% сытость, Выносливость +1!`
          : `🏨 Отдых (-${cost}💎): 100% бодрость, Дух +1!`;
        if (S.log) S.log(msg);
        S.renderSettlementModal(msg);
      }, sec * 1000);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

// === ЧАСТЬ 2A-2: ЗАВЕДЕНИЯ И ДУЭЛЬ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};
  S.settlement = S.settlement || {};
  const PIDS = [
    'shaman', 'library', 'range', 'gym', 'bar'
  ];

  S.settlement.PLACES = {
    shaman: {
      id: 'shaman', title: 'Знахарь',
      desc: '+Цена к Духу и +1 ур. к Дару'
    },
    library: {
      id: 'library', title: 'Библиотека',
      desc: '+Цена к Интеллекту и Архив'
    },
    range: {
      id: 'range', title: 'Полигон',
      desc: '+Цена/2 к Ловкости и Скорости'
    },
    gym: {
      id: 'gym', title: 'Тренажёрка',
      desc: '+Цена к Силе'
    },
    bar: {
      id: 'bar', title: 'Бар',
      desc: '+Цена к Вын. (25% дебош!)'
    }
  };

  function calcBaseCost(cnt) {
    let p = 1;
    const n = Math.max(0, Math.floor(cnt || 0));
    for (let i = 0; i < n; i++) {
      p = Math.ceil(p * 1.3);
    }
    return p;
  }

  S.settlement.ensureState = function(hr) {
    if (!hr) return null;
    const lv = Number(hr.lvl || 0);
    const pr = hr.settlementState || {};
    const vis = (pr.level === lv && pr.visited)
      ? pr.visited : {};
    const cnt = (pr.counts) ? pr.counts : {};
    PIDS.forEach(k => {
      if (typeof cnt[k] !== 'number') cnt[k] = 0;
    });
    hr.settlementState = {
      level: lv, visited: vis, counts: cnt
    };
    hr.settlementFine = Number(
      hr.settlementFine || 0
    );
    return hr.settlementState;
  };

  S.settlement.getPlaceCost = function(hr, id) {
    if (!hr || !id) return 1;
    const st = S.settlement.ensureState(hr);
    const base = calcBaseCost(st.counts[id]);
    return base + (hr.isKvaz ? 2 : 0);
  };

  S.settlement.payFine = function(hr) {
    if (!hr) return { ok: false, msg: 'Нет' };
    const f = Number(hr.settlementFine || 0);
    if (f <= 0) return { ok: true, msg: 'Ок' };
    if ((hr.spores || 0) < f) {
      return {
        ok: false, msg: `Нужно ${f} 💎.`
      };
    }
    hr.spores -= f;
    hr.sporans = hr.spores;
    hr.settlementFine = 0;
    if (S.saveDB) S.saveDB();
    return {
      ok: true, msg: `💰 Штраф ${f}💎 оплачен!`
    };
  };

  S.settlement.visit = function(hr, pid) {
    if (!hr) return { ok: false, msg: 'Нет' };
    const st = S.settlement.ensureState(hr);
    if ((hr.settlementFine || 0) > 0) {
      return {
        ok: false,
        msg: `Штраф: ${hr.settlementFine}💎`
      };
    }
    const pl = S.settlement.PLACES[pid];
    if (!pl || st.visited[pid]) {
      return { ok: false, msg: 'Недоступно.' };
    }
    const gain = calcBaseCost(st.counts[pid]);
    const cost = gain + (hr.isKvaz ? 2 : 0);
    if ((hr.spores || 0) < cost) {
      return {
        ok: false, msg: `Нужно ${cost} 💎.`
      };
    }
    hr.spores -= cost;
    hr.sporans = hr.spores;
    st.visited[pid] = true;
    st.counts[pid] += 1;
    let rep = '';
    if (pid === 'shaman') {
      hr.stats.spi += gain;
      rep = `Знахарь: Дух +${gain}.`;
      const gk = Object.keys(hr.gifts || {});
      if (gk.length) {
        const pk = gk[0];
        const nl = (hr.gifts[pk].lvl || 1) + 1;
        hr.gifts[pk].lvl = nl;
        rep += ` Дар +1 ур. (${nl})!`;
      }
    } else if (pid === 'library') {
      hr.stats.int += gain;
      rep = `Библиотека: Инт +${gain}.`;
    } else if (pid === 'range') {
      const h1 = Math.floor(gain / 2);
      const h2 = gain - h1;
      hr.stats.agi += h1;
      hr.stats.spd += h2;
      rep = `Полигон: Лов+${h1}, Скор+${h2}.`;
    } else if (pid === 'gym') {
      hr.stats.str += gain;
      rep = `Зал: Сила +${gain}.`;
    } else if (pid === 'bar') {
      if (Math.random() < 0.25) {
        ['str', 'agi', 'spd', 'end'].forEach(
          k => { hr.stats[k] += gain; }
        );
        hr.settlementFine = cost * 5;
        rep = `🚨 ДЕБОШ! Штраф ${cost * 5}💎!`;
      } else {
        hr.stats.end += gain;
        rep = `Бар: Выносливость +${gain}.`;
      }
    }
    if (S.recalcLevel) S.recalcLevel(hr);
    if (S.normalizePlayerStats) {
      S.normalizePlayerStats(hr);
    }
    if (S.saveDB) S.saveDB();
    return { ok: true, report: rep };
  };

  S.settlement.runTrainingDuel = function(a, b) {
    if (!a || !b || a.uid === b.uid) {
      return { ok: false, msg: 'Выберите цель' };
    }
    if (a.family === b.family) {
      return { ok: false, msg: 'Одна фамилия' };
    }
    const cA = 2 + (a.isKvaz ? 2 : 0);
    const cB = 2 + (b.isKvaz ? 2 : 0);
    if (a.spores < cA || b.spores < cB) {
      return { ok: false, msg: 'Мало 💎' };
    }
    a.spores -= cA; a.sporans = a.spores;
    b.spores -= cB; b.sporans = b.spores;
    const atkA = a.stats.str + a.stats.agi;
    const atkB = b.stats.str + b.stats.agi;
    const win = atkA >= atkB ? a : b;
    const lose = win === a ? b : a;
    win.stats.str += 2;
    lose.stats.end += 1;
    a.hp = a.maxHp; b.hp = b.maxHp;
    if (S.recalcLevel) {
      S.recalcLevel(a); S.recalcLevel(b);
    }
    if (S.normalizePlayerStats) {
      S.normalizePlayerStats(a);
      S.normalizePlayerStats(b);
    }
    if (S.saveDB) S.saveDB();
    return {
      ok: true,
      log: [`🥊 Победа: ${win.name} (+2 Сил)`]
    };
  };
})(window);

// === ЧАСТЬ 2A-3: ОКНО ПОСЕЛЕНИЯ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};
  S.settlement = S.settlement || {};

  function getHeroes() {
    const out = [];
    const fams = (S.db && S.db.families) || {};
    Object.keys(fams).forEach(f => {
      (fams[f] || []).forEach(hr => {
        const dead = hr && hr.status === 'dead';
        const inf = hr && (
          hr.isInfected || hr.asInfected
        );
        if (hr && !dead && !inf) {
          hr.family = hr.family || f;
          out.push(hr);
        }
      });
    });
    return out;
  }

  S.openSettlement = function(fOrU, idx) {
    const hs = getHeroes();
    if (!hs.length) return;
    let s = null;
    if (typeof idx === 'number') {
      const lst = S.db.families[fOrU] || [];
      s = lst[idx];
    } else if (fOrU) {
      s = hs.find(h => h.uid === fOrU);
    }
    if (!s || s.isInfected || s.asInfected) {
      s = hs[0];
    }
    S._settlementActiveUid = s.uid;
    S.renderSettlementModal();
  };

  S.closeSettlement = function() {
    if (S.settlement._busy) return;
    const el = document.getElementById(
      'stiks-settlement-modal'
    );
    if (el) el.remove();
    S._settlementActiveUid = null;
    if (S.renderLobby) S.renderLobby();
  };

  S.renderSettlementModal = function(msg) {
    const hs = getHeroes();
    if (!hs.length) return;
    const hr = hs.find(
      h => h.uid === S._settlementActiveUid
    ) || hs[0];
    S._settlementActiveUid = hr.uid;
    if (S.normalizePlayerStats) {
      S.normalizePlayerStats(hr);
    }
    const old = document.getElementById(
      'stiks-settlement-modal'
    );
    if (old) old.remove();

    const st = S.settlement.ensureState(hr);
    const fine = Number(hr.settlementFine || 0);
    const bsy = Boolean(S.settlement._busy);

    const ov = document.createElement('div');
    ov.id = 'stiks-settlement-modal';
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:9550;',
      'background:rgba(5,7,6,.94);',
      'display:flex;align-items:center;',
      'justify-content:center;padding:10px;',
      'font-family:monospace;color:#d6e5db;'
    ].join('');

    const h = [];
    h.push('<div style="width:100%;');
    h.push('max-width:440px;max-height:92dvh;');
    h.push('overflow-y:auto;padding:12px;');
    h.push('border:1px solid #6e2626;');
    h.push('background:#111613;font-size:11px;">');

    h.push('<div style="display:flex;');
    h.push('justify-content:space-between;');
    h.push('margin-bottom:8px;">');
    h.push('<b>🏘️ ПОСЕЛЕНИЕ УЛЬЯ</b>');
    h.push('<button class="btn btn-danger" ');
    h.push('style="width:auto!important;" ');
    h.push('onclick="STIKS.closeSettlement()">');
    h.push('✖</button></div>');

    const svgFn = S.settlement
      .renderInteractiveSceneSVG;
    if (svgFn) {
      h.push('<div style="margin-bottom:8px;">');
      h.push(svgFn(hr) + '</div>');
    }

    h.push(`<div style="margin-bottom:6px;">`);
    h.push(`💎 ${hr.spores || 0} | `);
    h.push(`🍖 ${hr.food}/${hr.maxFood} | `);
    h.push(`⚡ ${hr.stamina}/${hr.maxStamina}`);
    h.push('</div>');

    if (msg) {
      h.push('<div style="padding:6px;');
      h.push('border:1px solid #4a7a5c;');
      h.push('background:#132419;');
      h.push(`margin-bottom:6px;">${msg}</div>`);
    }

    if (fine > 0) {
      h.push('<button class="btn btn-primary" ');
      h.push('style="width:100%;margin-bottom:6px;" ');
      h.push('onclick="STIKS.settlementAction(');
      h.push(`'payFine')">Оплатить ${fine}💎`);
      h.push('</button>');
    }

    const pls = S.settlement.PLACES || {};
    Object.keys(pls).forEach(pk => {
      const pl = pls[pk];
      const vis = !!(st.visited && st.visited[pk]);
      const cst = S.settlement.getPlaceCost(
        hr, pk
      );
      const dis = (vis || fine > 0 || bsy)
        ? 'disabled' : '';
      h.push('<div style="display:flex;');
      h.push('justify-content:space-between;');
      h.push('padding:5px;margin-bottom:4px;');
      h.push('border:1px solid #2b3830;">');
      h.push(`<div><b>${pl.title}</b>`);
      h.push(`<div style="font-size:10px;">`);
      h.push(`${pl.desc}</div></div>`);
      h.push(`<button class="btn" ${dis} `);
      h.push('style="width:auto!important;" ');
      h.push('onclick="STIKS.settlementAction(');
      h.push(`'visit','${pk}')">`);
      h.push(`${vis ? '✓' : cst + '💎'}</button>`);
      h.push('</div>');
    });

    h.push('</div>');
    ov.innerHTML = h.join('');
    document.body.appendChild(ov);
  };

  S.settlementAction = function(act, arg) {
    const hs = getHeroes();
    const hr = hs.find(
      h => h.uid === S._settlementActiveUid
    ) || hs[0];
    if (!hr) return;
    const work = [
      'sawmill', 'forge', 'mine',
      'grocery', 'canteen', 'hotel'
    ];
    if (work.includes(act)) {
      S.settlement.runBuildingTask(hr, act);
      return;
    }
    if (act === 'payFine') {
      const r = S.settlement.payFine(hr);
      S.renderSettlementModal(r.msg);
    } else if (act === 'visit') {
      const r = S.settlement.visit(hr, arg);
      const m = r.ok ? r.report : r.msg;
      S.renderSettlementModal(m);
    }
  };
})(window);

// === ЧАСТЬ 2B-1: ЦЕНЫ ЛАВКИ И ТРОФЕИ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. Ранговая прогрессия x5 (1-4) и x2 (5)
  const RANK_MULT = {
    1: 1,
    2: 5,
    3: 25,
    4: 125,
    5: 250
  };

  S.getItemCategoryBase = function(it) {
    if (!it) return 2;
    const nm = String(
      it.n || it.name || ''
    ).toLowerCase();
    const sl = String(
      it.slot || it.cat || ''
    ).toLowerCase();
    if (it.isPea || nm.includes('горох')) {
      return 20;
    }
    const isWeap = [
      'main', 'side', 'melee', 'weapon'
    ].includes(sl);
    if (isWeap) return 10;
    const isGear = [
      'armor', 'clothes', 'boots', 'bag'
    ].includes(sl);
    if (isGear) return 5;
    return 2;
  };

  S.calcShopBuyPrice = function(it, hr) {
    if (!it) return 2;
    const nm = String(
      it.n || it.name || ''
    ).toLowerCase();
    const kv = (hr && hr.isKvaz) ? 2 : 0;
    if (it.isPea || nm.includes('горох')) {
      return 20 + kv;
    }
    const r = Math.max(1, Math.min(5,
      Number(it.rank || it.cls || 1)
    ));
    const base = S.getItemCategoryBase(it);
    const mult = RANK_MULT[r] || 1;
    return (base * mult) + kv;
  };

  S.calcShopSellPrice = function(it) {
    if (!it) return 1;
    const nm = String(
      it.n || it.name || ''
    ).toLowerCase();
    if (it.isPea || nm.includes('горох')) {
      return 10;
    }
    const r = Math.max(1, Math.min(5,
      Number(it.rank || it.cls || 1)
    ));
    const base = S.getItemCategoryBase(it);
    const full = base * (RANK_MULT[r] || 1);
    return Math.floor(full * 0.5);
  };

  // 2. Сдача Паутины пакетами 10 шт. = 1 сп.
  S.sellCobwebBundle = function(hr) {
    if (!hr) return { ok: false, msg: 'Нет' };
    const web = Number(hr.cobweb || 0);
    if (web < 10) {
      return {
        ok: false,
        msg: `Нужно 10 паутины (${web}/10).`
      };
    }
    const packs = Math.floor(web / 10);
    const spent = packs * 10;
    hr.cobweb = web - spent;
    hr.spores = (Number(hr.spores) || 0) + packs;
    hr.sporans = hr.spores;
    if (S.saveDB) S.saveDB();
    return {
      ok: true,
      msg: `🕸️ Сдано ${spent} паутины → +${packs}💎!`
    };
  };

  // 3. Покупка и продажа в Лавке
  S.buyTraderItem = function(stIdx) {
    const hr = S.findHeroByUid(S.shopHeroUid);
    if (!hr) return;
    const stock = S.ensureTraderStock(hr);
    const it = stock[stIdx];
    if (!it) return;
    const price = S.calcShopBuyPrice(it, hr);
    if ((hr.spores || 0) < price) {
      S.log(`❌ Нужно ${price} 💎.`);
      return;
    }
    hr.spores -= price;
    hr.sporans = hr.spores;
    hr.inv = hr.inv || [];
    const copy = JSON.parse(JSON.stringify(it));
    hr.inv.push(copy);
    if (S.stackInventory) {
      hr.inv = S.stackInventory(hr.inv);
    }
    stock.splice(stIdx, 1);
    if (S.saveDB) S.saveDB();
    S.log(`🛒 Куплено: ${it.n} (${price}💎).`);
    if (S.renderShopModal) S.renderShopModal();
  };

  S.sellToTrader = function(invIdx) {
    const hr = S.findHeroByUid(S.shopHeroUid);
    if (!hr || !hr.inv || !hr.inv[invIdx]) return;
    const it = hr.inv[invIdx];
    const eq = hr.slots || {};
    const worn = Object.keys(eq).some(
      k => eq[k] && eq[k] === it
    );
    if (worn) {
      S.log('🚫 Нельзя продать надетую вещь!');
      return;
    }
    const gain = S.calcShopSellPrice(it);
    const nm = it.n || it.name || 'Предмет';
    if (S.consumeInvOne) {
      S.consumeInvOne(hr, invIdx);
    } else {
      hr.inv.splice(invIdx, 1);
    }
    hr.spores = (Number(hr.spores) || 0) + gain;
    hr.sporans = hr.spores;
    if (S.saveDB) S.saveDB();
    S.log(`💰 Продано: ${nm} (+${gain}💎).`);
    if (S.renderShopModal) S.renderShopModal();
  };
})(window);

// === ЧАСТЬ 2B-2: ЛУТ С ЗАРАЖЁННЫХ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // Минимальные уровни по 10-ранговой шкале
  const RANK_MIN_LVL = {
    0: 0,  // Ползун
    1: 0,  // Медляк
    2: 5,  // Джампер
    3: 11, // Бегун
    4: 21, // Лотерейщик
    5: 31, // Топтун
    6: 37, // Кусач
    7: 41, // Рубер
    8: 50, // Элита
    9: 61  // Суперэлита
  };

  S.rollInfectedLoot = function(enemy) {
    const out = {
      cobweb: 0,
      sporans: 0,
      peas: 0,
      blackPearls: 0,
      redPearls: 0,
      whitePearls: 0,
      bonusApplied: false
    };
    if (!enemy || enemy.isHuman) return out;

    const r = Math.max(0, Math.min(9,
      Number(enemy.rank) || 0
    ));
    const lvl = Math.max(0,
      Number(enemy.lvl) || 0
    );

    // 1. Младше Бегуна (Ранг 0..2): только Паутина
    if (r < 3) {
      out.cobweb = r === 0
        ? 1 : (1 + Math.floor(Math.random() * r));
    } else {
      // 2. С Бегуна (Ранг 3+): спораны x4
      // Ранг 3 = 1, 4 = 4, 5 = 16, 6 = 64...
      const step = r - 3;
      out.sporans = Math.pow(4, step);

      // 3. С Лотерейщика (Ранг 4+): Горох
      if (r === 4) {
        if (Math.random() < 0.5) out.peas = 1;
      } else if (r >= 5) {
        // Ранг 5 = 2, 6 = 8, 7 = 32, 8 = 128...
        out.peas = 2 * Math.pow(4, r - 5);
      }

      // 4. С Рубера (Ранг 7+): Жемчужины
      if (r === 7) {
        if (Math.random() < 0.5) {
          out.blackPearls = 1;
        }
      } else if (r >= 8) {
        // Элита+: от 2 Чёрных или 1 Красная (2:1)
        const val = r === 8
          ? 2 : (2 + Math.floor(Math.random() * 3));
        if (val >= 2 && Math.random() < 0.5) {
          out.redPearls = Math.floor(val / 2);
          out.blackPearls = val % 2;
        } else {
          out.blackPearls = val;
        }
        if (enemy.isSkrebber) {
          out.whitePearls = 1;
        }
      }
    }

    // 5. Бонус +50% (шанс 30%), если ур. > мин.
    const minL = RANK_MIN_LVL[r] || 0;
    if (lvl > minL && Math.random() < 0.30) {
      out.bonusApplied = true;
      if (out.cobweb > 0) {
        out.cobweb = Math.ceil(out.cobweb * 1.5);
      }
      if (out.sporans > 0) {
        out.sporans = Math.ceil(out.sporans * 1.5);
      }
      if (out.peas > 0) {
        out.peas = Math.ceil(out.peas * 1.5);
      }
      if (out.blackPearls > 0) {
        out.blackPearls = Math.ceil(
          out.blackPearls * 1.5
        );
      }
      if (out.redPearls > 0) {
        out.redPearls = Math.ceil(
          out.redPearls * 1.5
        );
      }
    }

    return out;
  };

  S.applyInfectedLootToHero = function(hr, drop) {
    if (!hr || !drop) return [];
    const lines = [];
    hr.inv = hr.inv || [];
    if (drop.cobweb > 0) {
      hr.cobweb = (Number(hr.cobweb) || 0) +
        drop.cobweb;
      lines.push(`🕸️ Паутина: +${drop.cobweb}`);
    }
    if (drop.sporans > 0) {
      const s = S.db && S.db.session;
      if (s) {
        s.pendingSpores = (Number(
          s.pendingSpores
        ) || 0) + drop.sporans;
      } else {
        hr.spores = (Number(hr.spores) || 0) +
          drop.sporans;
        hr.sporans = hr.spores;
      }
      lines.push(`💎 Спораны: +${drop.sporans}`);
    }
    if (drop.peas > 0) {
      hr.inv.push({
        n: '🟢 Горох Улья',
        cat: 'supply', slot: 'use',
        isPea: true, rank: 2,
        w: 0.05, q: drop.peas
      });
      lines.push(`🟢 Горох: +${drop.peas} шт.`);
    }
    if (drop.blackPearls > 0) {
      hr.inv.push({
        n: '⚫ Чёрный жемчуг',
        cat: 'supply', slot: 'use',
        pearl: 'black', rank: 3,
        w: 0.1, q: drop.blackPearls
      });
      lines.push(
        `⚫ Чёрн. жемчуг: +${drop.blackPearls}`
      );
    }
    if (drop.redPearls > 0) {
      hr.inv.push({
        n: '🔴 Красный жемчуг',
        cat: 'supply', slot: 'use',
        pearl: 'red', rank: 2,
        w: 0.1, q: drop.redPearls
      });
      lines.push(
        `🔴 Красн. жемчуг: +${drop.redPearls}`
      );
    }
    if (drop.whitePearls > 0) {
      hr.inv.push({
        n: '⚪ Белый жемчуг',
        cat: 'supply', slot: 'use',
        pearl: 'white', rank: 4,
        w: 0.1, q: drop.whitePearls
      });
      lines.push(
        `⚪ Белый жемчуг: +${drop.whitePearls}`
      );
    }
    if (S.stackInventory) {
      hr.inv = S.stackInventory(hr.inv);
    }
    return lines;
  };
})(window);

// === ЧАСТЬ 2B-3: ГОРОХ, ИНТУИЦИЯ И ПОИСК ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. Счётчик Гороха на текущем уровне героя
  S.getPeasUsedOnLevel = function(hr) {
    if (!hr) return 0;
    const lv = Number(hr.lvl || 0);
    if (!hr._peaTrack || hr._peaTrack.lvl !== lv) {
      hr._peaTrack = { lvl: lv, count: 0 };
    }
    return hr._peaTrack.count;
  };

  S.getPeaKvazRiskPct = function(hr) {
    const used = S.getPeasUsedOnLevel(hr);
    const nextNum = used + 1;
    if (nextNum <= 3) return 0;
    return Math.min(100, (nextNum - 3) * 10);
  };

  // 2. Употребление Гороха с проверкой Интуиции
  S.consumePeaItem = function(hr, invIdx, okRisk) {
    if (!hr) return;
    const gKeys = Object.keys(hr.gifts || {});
    if (!gKeys.length) {
      if (S.log) {
        S.log('🟢 Нет открытых Даров для Гороха.');
      }
      return;
    }

    const used = S.getPeasUsedOnLevel(hr);
    const nextNum = used + 1;
    const riskPct = S.getPeaKvazRiskPct(hr);

    // Предупреждение Интуиции перед 4+ горошиной
    if (riskPct > 0 && !okRisk) {
      const msg = [
        `⚠️ ИНТУИЦИЯ (горошина #${nextNum}`,
        ` на Ур.${hr.lvl || 0}):`,
        ` риск обращения в Кваза = ${riskPct}%!`,
        ` Продолжить приём Гороха?`
      ].join('');
      if (S.log) S.log(msg);
      if (typeof confirm === 'function') {
        if (!confirm(msg)) return;
      } else {
        return;
      }
    }

    if (typeof invIdx === 'number' && hr.inv) {
      if (S.consumeInvOne) {
        S.consumeInvOne(hr, invIdx);
      } else {
        hr.inv.splice(invIdx, 1);
      }
    }

    hr._peaTrack.count = nextNum;
    const pick = gKeys[
      Math.floor(Math.random() * gKeys.length)
    ];
    const isDanger = nextNum >= 4;
    const gain = isDanger ? 2 : 1;
    const curL = Number(
      hr.gifts[pick].lvl || 1
    );
    const nextL = curL + gain;
    hr.gifts[pick].lvl = nextL;
    hr.gifts[pick].level = nextL;

    if (S.log) {
      S.log(
        `🟢 Горох #${nextNum}: Дар «${pick}» ` +
        `+${gain} ур. (теперь ${nextL} ур.).`
      );
    }

    if (riskPct > 0) {
      const roll = Math.random() * 100;
      if (roll < riskPct && !hr.isKvaz) {
        if (typeof S.mutateToKvaz === 'function') {
          S.mutateToKvaz(hr, 'pea');
        } else {
          hr.isKvaz = true;
        }
        if (S.log) {
          S.log(
            `☣️ ПЕРЕДОЗИРОВКА ГОРОХА (${riskPct}%): ` +
            `${hr.name} обратился в КВАЗА!`
          );
        }
      }
    }

    if (S.normalizePlayerStats) {
      S.normalizePlayerStats(hr);
    }
    if (S.saveDB) S.saveDB();
  };

  // 3. Проверка шанса книги (1 к 100) и габаритов Кваза
  S.rollGuideDrop100 = function(hr) {
    if (!hr || hr.knowsSpores) return false;
    if (hr.isInfected || hr.asInfected) return false;
    return Math.random() < 0.01;
  };

  S.canFindGearBySize = function(hr, item) {
    if (!hr || !item) return true;
    if (!hr.isKvaz) return true;
    const sl = String(
      item.slot || item.cat || ''
    ).toLowerCase();
    const isGear = [
      'armor', 'clothes', 'boots'
    ].includes(sl);
    if (isGear) {
      return Math.random() < 0.5;
    }
    return true;
  };
})(window);

// === ЧАСТЬ 3A: ЕДИНАЯ SVG-СЦЕНА БОЯ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};
  S.battleScene = S.battleScene || {};

  // 1. SVG-иконки рангов врагов (fallback)
  S.battleScene.getRankSVGIcon = function(r) {
    const rk = Math.max(0, Math.min(9, r || 0));
    const cols = [
      '#94a3b8', '#a3e635', '#38bdf8',
      '#2dd4bf', '#facc15', '#fb923c',
      '#f87171', '#e879f9', '#c084fc',
      '#fb7185'
    ];
    const c = cols[rk] || '#ef4444';
    return [
      '<svg viewBox="0 0 48 48" width="44" ',
      'height="44" xmlns="http://w3.org">',
      '<rect width="48" height="48" rx="6" ',
      `fill="#120b0b" stroke="${c}" `,
      'stroke-width="2"/>',
      `<circle cx="24" cy="18" r="8" fill="${c}"/>`,
      '<path d="M12 40 C12 29 36 29 36 40" ',
      `fill="${c}"/>`,
      '<text x="24" y="45" font-size="8" ',
      'fill="#fff" text-anchor="middle" ',
      `font-family="monospace">Р${rk}</text>`,
      '</svg>'
    ].join('');
  };

  // 2. SVG-фоны локаций: city / ruins / park
  S.battleScene.getBgSVG = function(loc) {
    const k = loc || 'city';
    if (k === 'park') {
      return [
        '<rect width="360" height="145" ',
        'fill="#0c1510"/>',
        '<path d="M0 118 Q180 108 360 118 ',
        'V145 H0 Z" fill="#132419"/>',
        '<circle cx="70" cy="74" r="24" ',
        'fill="#163020" stroke="#2d5a3c"/>',
        '<rect x="67" y="92" width="6" ',
        'height="26" fill="#3b2618"/>',
        '<circle cx="285" cy="70" r="28" ',
        'fill="#163020" stroke="#2d5a3c"/>',
        '<rect x="282" y="92" width="6" ',
        'height="26" fill="#3b2618"/>'
      ].join('');
    }
    if (k === 'ruins') {
      return [
        '<rect width="360" height="145" ',
        'fill="#120d0d"/>',
        '<polygon points="10,122 25,52 ',
        '55,66 72,38 95,122" fill="#1c1414" ',
        'stroke="#5c2828"/>',
        '<polygon points="255,122 280,44 ',
        '315,62 345,35 355,122" ',
        'fill="#1c1414" stroke="#5c2828"/>',
        '<line x1="0" y1="122" x2="360" ',
        'y2="122" stroke="#6e2626"/>'
      ].join('');
    }
    return [
      '<rect width="360" height="145" ',
      'fill="#0b0e12"/>',
      '<rect x="16" y="36" width="44" ',
      'height="86" fill="#141a22" ',
      'stroke="#334155"/>',
      '<rect x="70" y="54" width="38" ',
      'height="68" fill="#141a22" ',
      'stroke="#334155"/>',
      '<rect x="252" y="42" width="42" ',
      'height="80" fill="#141a22" ',
      'stroke="#334155"/>',
      '<rect x="302" y="28" width="46" ',
      'height="94" fill="#141a22" ',
      'stroke="#334155"/>',
      '<line x1="0" y1="122" x2="360" ',
      'y2="122" stroke="#475569"/>'
    ].join('');
  };

  // 3. Звукоподражание атаки по типу оружия
  S.battleScene.getAttackSoundLabel = function(
    p, wItem
  ) {
    if (p && p.asInfected) {
      const inf = ['Цап!', 'Царап!', 'Кусь!'];
      return inf[
        Math.floor(Math.random() * inf.length)
      ];
    }
    if (!wItem) return 'Бум!';
    const sl = String(wItem.slot || '');
    if (sl === 'main' || sl === 'side' || wItem.cal) {
      return 'Бах!';
    }
    if (sl === 'melee') return 'Вжик!';
    return 'Бум!';
  };

  // 4. Вспышка текста/урона/навыка над портретом
  S.battleScene.pushPopup = function(
    c, side, text, color, isBig
  ) {
    if (!c) return;
    c.popups = c.popups || [];
    c.popups.push({
      side: side, // 'player' или 'enemy'
      text: String(text || ''),
      color: color || '#ffffff',
      big: Boolean(isBig)
    });
    if (c.popups.length > 6) {
      c.popups = c.popups.slice(-6);
    }
  };

  // 5. Отрисовка SVG-сцены боя с дистанцией
  S.battleScene.renderStageHTML = function(p, c) {
    if (!p || !c) return '';
    const loc = c.bgType || 'city';
    const dist = Math.max(
      0, Number(c.rangedLeft || 0)
    );
    // При dist > 0 портреты по краям; при 0 — центр
    const shift = dist > 0
      ? Math.min(72, dist * 36) : 0;
    const pLeft = 92 - shift;
    const eRight = 92 - shift;

    const pImg = (S.getHeroPortrait)
      ? S.getHeroPortrait(p) : '';
    const alive = (c.enemies || []).filter(
      e => (e.hp || 0) > 0
    );
    const lead = alive || (c.enemies && c.enemies);
    const eRank = lead ? (lead.rank || 0) : 0;
    const eImg = (lead && lead.img) ? lead.img : '';

    const pops = Array.isArray(c.popups)
      ? c.popups : [];
    const pPops = pops.filter(
      x => x.side === 'player'
    ).slice(-2);
    const ePops = pops.filter(
      x => x.side === 'enemy'
    ).slice(-2);

    const h = [];
    h.push('<div style="position:relative;');
    h.push('width:100%;height:145px;');
    h.push('border:1px solid #6e2626;');
    h.push('border-radius:6px;overflow:hidden;');
    h.push('margin-bottom:6px;">');

    h.push('<svg viewBox="0 0 360 145" ');
    h.push('style="width:100%;height:100%;');
    h.push('display:block;">');
    h.push(S.battleScene.getBgSVG(loc));
    h.push('</svg>');

    // Бейдж дистанции
    const dTxt = dist > 0
      ? `🎯 Дистанция (${dist} р.)`
      : '⚔️ Ближний бой';
    h.push('<div style="position:absolute;');
    h.push('top:4px;left:50%;');
    h.push('transform:translateX(-50%);');
    h.push('background:rgba(0,0,0,.75);');
    h.push('padding:2px 7px;border-radius:4px;');
    h.push('font-size:10px;color:#fbbf24;">');
    h.push(`${dTxt}</div>`);

    // Портрет игрока слева
    h.push('<div style="position:absolute;');
    h.push(`bottom:18px;left:${pLeft}px;`);
    h.push('transition:left .35s ease;');
    h.push('text-align:center;">');
    pPops.forEach(pp => {
      h.push('<div style="font-weight:bold;');
      h.push(`color:${pp.color};`);
      h.push(`font-size:${pp.big ? 13 : 11}px;`);
      h.push('text-shadow:0 1px 3px #000;">');
      h.push(`${pp.text}</div>`);
    });
    if (pImg) {
      h.push(`<img src="${pImg}" `);
      h.push('style="width:46px;height:46px;');
      h.push('object-fit:cover;border-radius:6px;');
      h.push('border:2px solid #4ade80;">');
    } else {
      h.push(S.battleScene.getRankSVGIcon(0));
    }
    h.push('</div>');

    // Портрет или SVG ранга врага справа
    if (lead) {
      h.push('<div style="position:absolute;');
      h.push(`bottom:18px;right:${eRight}px;`);
      h.push('transition:right .35s ease;');
      h.push('text-align:center;">');
      ePops.forEach(ep => {
        h.push('<div style="font-weight:bold;');
        h.push(`color:${ep.color};`);
        h.push(`font-size:${ep.big ? 13 : 11}px;`);
        h.push('text-shadow:0 1px 3px #000;">');
        h.push(`${ep.text}</div>`);
      });
      if (eImg) {
        h.push(`<img src="${eImg}" `);
        h.push('style="width:46px;height:46px;');
        h.push('object-fit:cover;border-radius:6px;');
        h.push('border:2px solid #ef4444;">');
      } else {
        h.push(
          S.battleScene.getRankSVGIcon(eRank)
        );
      }
      h.push('</div>');
    }

    h.push('</div>');
    return h.join('');
  };

  // 6. Режим Симулятора: 1 000 000+ HP и кнопка Маны
  S.prepareSimulatorCombat = function(p, c) {
    if (!p || !c) return;
    c.isSimulator = true;
    p.maxHp = Math.max(1000000, p.maxHp || 0);
    p.hp = p.maxHp;
    (c.enemies || []).forEach(e => {
      e.maxHp = Math.max(1000000, e.maxHp || 0);
      e.hp = e.maxHp;
    });
  };

  S.restoreSimulatorMana = function() {
    const s = S.db && S.db.session;
    const p = s && s.players && s.players[s.activeIdx];
    if (!p) return;
    p.mana = p.maxMana || 20;
    if (S.log) {
      S.log(`🔮 [СИМУЛЯТОР] Мана полная (${p.mana}).`);
    }
    if (S.renderCombat) S.renderCombat();
  };
})(window);

// === ЧАСТЬ 3B: ЕДИНЫЙ БОЕВОЙ ДВИЖОК ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. Расчёт дистанции для огнестрела
  S.calcRangedApproachRounds = function(p, ens) {
    if (!p) return 0;
    let pR = Math.floor((p.lvl || 0) / 15);
    const s = S.db && S.db.session;
    const sl = (s && s.combat &&
      s.combat.chosenSlot) || 'main';
    const w = p.slots && (
      p.slots[sl] || p.slots.main || p.slots.side
    );
    if (w && (w.rank || w.cls)) {
      pR = Math.max(pR, Number(w.rank || w.cls));
    }
    let maxE = 0;
    (ens || []).forEach(e => {
      if (e && e.hp > 0 && (e.rank || 0) > maxE) {
        maxE = e.rank || 0;
      }
    });
    return Math.max(0, 2 + (pR - maxE));
  };

  // 2. Единая атака игрока (бой + симулятор)
  S.combatAttack = function(useSkill) {
    const s = S.db && S.db.session;
    if (!s || !s.combat || s.combat.busy) return;
    const c = s.combat;
    if (c.finished) return;
    const p = s.players[s.activeIdx];
    c.busy = true;

    const sl = c.chosenSlot || (
      p.slots.main ? 'main' : (
        p.slots.side ? 'side' : (
          p.slots.melee ? 'melee' : null
        )
      )
    );
    const wIt = sl ? p.slots[sl] : null;
    const isGun = Boolean(
      wIt && (sl === 'main' ||
      sl === 'side' || wIt.cal)
    );
    const isMelee = !isGun; // без оружия или клинок

    if (c.rangedLeft === undefined) {
      c.rangedLeft = isGun
        ? S.calcRangedApproachRounds(p, c.enemies)
        : 0;
    }

    const meta = (S.SKILL_META &&
      S.SKILL_META[p.arch]) || {
      name: 'Навык', type: 'active',
      phrase: 'Вперёд!'
    };
    let skOn = false;

    if (useSkill && !c.usedSkill &&
      !p.asInfected && meta.type !== 'passive') {
      c.usedSkill = true;
      skOn = true;
      p._skillSuccessUsed = true;
      p.skillUnlocked = true;
      c.feed.push(
        `✨ [${meta.name}]: «${meta.phrase}»`
      );
      if (S.battleScene) {
        S.battleScene.pushPopup(
          c, 'player', meta.name, '#38bdf8', false
        );
      }
      if (S.speakPhrase) {
        S.speakPhrase(p, meta.phrase);
      }
      if (S.grantActionXp) {
        S.grantActionXp(p, 'spi', 1);
      }
    }

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const isCrit = (d1 === d2);
    if (isCrit) {
      if (S.playDoubleSound) S.playDoubleSound();
      if (S.grantActionXp) {
        S.grantActionXp(p, 'spi', 1);
      }
    }

    const trgN = (d1 === 6 && d2 === 6) ? 1 : d1;
    const pwr = (d1 === 1 && d2 === 1) ? 1 : d2;
    const alive = c.enemies.filter(e => e.hp > 0);
    const lRank = alive ? alive.rank : 0;

    const rBon = S.getWeaponRankBonus
      ? S.getWeaponRankBonus(p, wIt, lRank) : 0;
    const rMult = S.getWeaponDamageMult
      ? S.getWeaponDamageMult(wIt, lRank) : 1;
    const mBon = (isGun && p.slots.mod)
      ? Number(p.slots.mod.a || 2) : 0;
    const wDmg = wIt
      ? Number(wIt.a || wIt.dmg || 2) : 1;
    const stBon = isGun
      ? ((p.stats.agi || 10) * 0.25)
      : ((p.stats.str || 10) * 0.3);

    // Плоский мускульный урон Кваза в ближнем бою
    const kvazFlat = (p.isKvaz && isMelee)
      ? Math.round(1.5 * (p.lvl || 0)) : 0;

    const skMult = skOn ? 1.5 : 1;
    const baseHit = Math.max(1, Math.floor(
      (pwr * 2 + wDmg + rBon + mBon + stBon) *
      rMult * skMult + kvazFlat
    ));

    const sndTxt = S.battleScene
      ? S.battleScene.getAttackSoundLabel(p, wIt)
      : (isGun ? 'Бах!' : 'Вжик!');

    if (S.battleScene) {
      S.battleScene.pushPopup(
        c, 'player', sndTxt, '#fbbf24', false
      );
    }

    const cnt = Math.min(
      alive.length, Math.max(1, trgN)
    );
    for (let i = 0; i < cnt; i++) {
      const t = alive[i];
      const dmg = Math.max(
        1, baseHit - (t.def || 0)
      );
      t.hp = Math.max(0, t.hp - dmg);
      if (S.battleScene) {
        S.battleScene.pushPopup(
          c, 'enemy', `-${dmg}`,
          isCrit ? '#ef4444' : '#ffffff',
          isCrit
        );
      }
      c.feed.push(
        `${sndTxt} [${d1}+${d2}] → ` +
        `${t.name} -${dmg} ОЗ`
      );
    }

    if (S.grantActionXp) {
      S.grantActionXp(p, isGun ? 'agi' : 'str', 1);
    }
    if (S.renderCombat) S.renderCombat();

    const rem = c.enemies.filter(e => e.hp > 0);
    if (!rem.length) {
      setTimeout(
        () => S._finishCombatVictory(p, c), 450
      );
    } else {
      setTimeout(
        () => S._runEnemyTurn(p, c), 500
      );
    }
  };

  // 3. Победа в бою + Лут + Прозрение
  S._finishCombatVictory = function(p, c) {
    const s = S.db.session;
    const ens = c.enemies || [];
    const killed = ens.length;
    if (!c.isSimulator && s.zombies) {
      s.zombies = s.zombies.filter(
        z => z.id !== c.zId
      );
    }
    p._raidKills = (p._raidKills || 0) + killed;

    // Добыча с заражённых по новой таблице
    const lootLog = [];
    ens.forEach(en => {
      if (en && !en.isHuman && S.rollInfectedLoot) {
        const drop = S.rollInfectedLoot(en);
        const res = S.applyInfectedLootToHero(
          p, drop
        );
        res.forEach(l => lootLog.push(l));
      }
      // Проверка «Прозрения» (враг +15 уровней)
      if ((p.isInfected || p.asInfected) &&
        !p.isKvaz && en &&
        (en.lvl || 0) >= (p.lvl || 0) + 15) {
        if (S.tryInfectedEpiphany) {
          const ep = S.tryInfectedEpiphany(p, en);
          if (ep && ep.msg) lootLog.push(ep.msg);
        }
      }
    });

    if (S.recalcLevel) S.recalcLevel(p);
    let sum = `🏆 Победа! Врагов: ${killed}.`;
    if (lootLog.length) {
      sum += ' Добыча: ' + lootLog.join(', ');
    }

    c.busy = false;
    c.finished = true;
    c.victory = true;
    c.summary = sum;
    c.feed.push(sum);
    if (S.log) S.log(sum);
    if (S.syncHeroProfile) S.syncHeroProfile(p);
    if (S.saveDB) S.saveDB();
    if (S.renderCombat) S.renderCombat();
  };
})(window);

// === ЧАСТЬ 4: РЕНДЕР БОЯ, СИМУЛЯТОР И СТАРТ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. Ход врагов со сближением и попапами урона
  S._runEnemyTurn = function(p, c) {
    if (!c || c.finished) return;
    const alive = (c.enemies || []).filter(
      e => (e.hp || 0) > 0
    );
    if (!alive.length) {
      if (S._finishCombatVictory) {
        S._finishCombatVictory(p, c);
      }
      return;
    }

    // Сокращение дистанции огнестрела
    if ((c.rangedLeft || 0) > 0) {
      c.rangedLeft -= 1;
      c.feed.push(
        `🏃 Сближение врагов (осталось: ` +
        `${c.rangedLeft} р.).`
      );
      c.round = (c.round || 1) + 1;
      c.busy = false;
      if (S.saveDB) S.saveDB();
      if (S.renderCombat) S.renderCombat();
      return;
    }

    const endVal = (p.stats && p.stats.end) || 10;
    const redPct = Math.min(
      90, Math.floor(endVal / 50)
    );

    alive.forEach(en => {
      if (p.hp <= 0) return;
      const raw = Math.max(
        1, (en.dmg || 2) - Math.floor(endVal * 0.1)
      );
      const dmg = Math.max(
        1, Math.round(raw * (1 - redPct / 100))
      );
      p.hp = Math.max(0, p.hp - dmg);
      if (S.battleScene) {
        S.battleScene.pushPopup(
          c, 'enemy', 'Кусь!', '#fbbf24', false
        );
        S.battleScene.pushPopup(
          c, 'player', `-${dmg}`, '#ef4444', false
        );
      }
      c.feed.push(
        `🩸 ${en.name}: -${dmg} ОЗ ` +
        `(${p.hp}/${p.maxHp})`
      );
    });

    if (p.hp <= 0) {
      p.dead = true;
      p.status = 'dead';
      c.busy = false;
      c.finished = true;
      c.victory = false;
      c.summary = `💀 ${p.name} погиб в бою.`;
      c.feed.push(c.summary);
      if (S.syncHeroProfile) S.syncHeroProfile(p);
      if (S.saveDB) S.saveDB();
      if (S.renderCombat) S.renderCombat();
      return;
    }

    c.round = (c.round || 1) + 1;
    c.busy = false;
    if (S.saveDB) S.saveDB();
    if (S.renderCombat) S.renderCombat();
  };

  // 2. Запуск тестового Симулятора (1 000 000+ HP)
  S.openBattleSimulator = function() {
    const fams = (S.db && S.db.families) || {};
    let hr = null;
    Object.keys(fams).forEach(f => {
      if (!hr && fams[f] && fams[f][0]) {
        hr = JSON.parse(JSON.stringify(fams[f][0]));
      }
    });
    if (!hr) {
      hr = {
        uid: 'sim_hero', family: 'Тест',
        name: 'Испытатель', arch: 'kachok',
        lvl: 5, stats: {
          str: 20, agi: 15, spd: 12,
          end: 20, int: 10, spi: 15
        },
        slots: S.defaultSlots ? S.defaultSlots() : {},
        inv: []
      };
    }
    if (S.normalizePlayerStats) {
      S.normalizePlayerStats(hr);
    }
    const enemy = {
      name: 'Манекен Улья (Ранг 4)',
      rank: 4, lvl: 25,
      hp: 1000000, maxHp: 1000000,
      dmg: 15, agi: 20, def: 5
    };
    S.db.session = {
      turn: 1, activeIdx: 0,
      grid: [], players: [hr], zombies: [],
      combat: {
        zId: 'sim_z',
        enemies: [enemy],
        round: 1,
        bgType: 'city',
        isSimulator: true,
        usedSkill: false,
        chosenSlot: hr.slots.main ? 'main' : (
          hr.slots.melee ? 'melee' : null
        ),
        busy: false,
        finished: false,
        feed: ['🧪 Полигон Симулятора запущен!']
      }
    };
    if (S.prepareSimulatorCombat) {
      S.prepareSimulatorCombat(hr, S.db.session.combat);
    }
    if (S.renderCombat) S.renderCombat();
  };

  S.closeSimulatorSession = function() {
    if (S.db) S.db.session = null;
    if (S.renderLobby) S.renderLobby();
  };

  // 3. Единый рендер окна боя + SVG-сцена
  S.renderCombat = function() {
    const vp = document.getElementById(
      'game-viewport'
    );
    const s = S.db && S.db.session;
    if (!vp || !s || !s.combat) return;
    const p = s.players[s.activeIdx];
    const c = s.combat;
    const isSim = Boolean(c.isSimulator);

    const h = [];
    h.push('<div style="background:#120b0b;');
    h.push('border:1px solid #8f2d2d;');
    h.push('padding:8px;border-radius:6px;');
    h.push('font-size:11px;">');

    // Шапка боя и выбор фона сцены
    h.push('<div style="display:flex;');
    h.push('justify-content:space-between;');
    h.push('margin-bottom:6px;">');
    h.push(`<b>⚔️ РАУНД ${c.round}</b>`);
    h.push('<div style="display:flex;gap:3px;">');
    ['city', 'ruins', 'park'].forEach(bg => {
      const lbl = bg === 'city' ? 'Город'
        : (bg === 'ruins' ? 'Развал.' : 'Парк');
      h.push('<button class="btn" ');
      h.push('style="padding:2px 5px;');
      h.push('font-size:9px;" ');
      h.push('onclick="STIKS.db.session.combat.');
      h.push(`bgType='${bg}';`);
      h.push(`STIKS.renderCombat()">${lbl}`);
      h.push('</button>');
    });
    h.push('</div></div>');

    // Визуальная SVG-сцена боя
    if (S.battleScene &&
      S.battleScene.renderStageHTML) {
      h.push(
        S.battleScene.renderStageHTML(p, c)
      );
    }

    // Статус игрока и Мана
    h.push('<div style="background:#171d19;');
    h.push('padding:5px;margin-bottom:5px;');
    h.push('border:1px solid #355441;">');
    h.push(`<b>${p.name}</b> | `);
    h.push(`❤️ ${p.hp}/${p.maxHp} | `);
    h.push(`🔮 Мана: ${p.mana}/${p.maxMana}`);
    h.push('</div>');

    // Кнопка восполнения Маны в Симуляторе
    if (isSim) {
      h.push('<div style="display:flex;');
      h.push('gap:5px;margin-bottom:6px;">');
      h.push('<button class="btn btn-primary" ');
      h.push('style="flex:1;padding:5px;" ');
      h.push('onclick="STIKS.');
      h.push('restoreSimulatorMana()">');
      h.push('🔮 Восполнить Ману (МАКС)');
      h.push('</button>');
      h.push('<button class="btn btn-danger" ');
      h.push('style="width:auto!important;" ');
      h.push('onclick="STIKS.');
      h.push('closeSimulatorSession()">');
      h.push('✖ Выход</button></div>');
    }

    // Список врагов
    (c.enemies || []).forEach(e => {
      h.push('<div style="background:#211111;');
      h.push('padding:5px;margin-bottom:4px;');
      h.push('border:1px solid #6e2626;">');
      h.push(`☣️ <b>${e.name}</b> (Р.${e.rank}) `);
      h.push(`— ❤️ ${e.hp}/${e.maxHp}</div>`);
    });

    // Чат боя
    h.push('<div style="background:#090707;');
    h.push('border:1px solid #3d1c1c;');
    h.push('padding:6px;max-height:115px;');
    h.push('overflow-y:auto;margin:6px 0;">');
    (c.feed || []).slice(-8).forEach(line => {
      h.push(`<div style="padding:2px 0;">`);
      h.push(`${line}</div>`);
    });
    h.push('</div>');

    // Кнопки действий
    if (c.finished) {
      const fn = isSim
        ? 'closeSimulatorSession()'
        : 'closeCombatModal()';
      h.push('<button class="btn btn-primary" ');
      h.push(`style="width:100%;" onclick="STIKS.${fn}">`);
      h.push('Продолжить ▶</button>');
    } else {
      const dis = c.busy ? 'disabled' : '';
      const skLbl = p.skillUnlocked
        ? '✨ Навык' : '🤪 Что-то учудить';
      h.push('<div style="display:flex;gap:5px;">');
      h.push(`<button class="btn btn-primary" ${dis} `);
      h.push('onclick="STIKS.combatAttack(false)">');
      h.push('⚔️ Атака</button>');
      h.push(`<button class="btn" ${dis} `);
      h.push('onclick="STIKS.combatAttack(true)">');
      h.push(`${skLbl}</button>`);
      if (!isSim && S.combatFlee) {
        h.push(`<button class="btn btn-danger" ${dis} `);
        h.push('onclick="STIKS.combatFlee()">');
        h.push('🏃</button>');
      }
      h.push('</div>');
    }

    h.push('</div>');
    vp.innerHTML = h.join('');
  };

  // 4. Кнопки Поселения и Симулятора в Лобби
  function injectLobbyTools() {
    const bar = document.querySelector(
      '.top-controls'
    );
    if (!bar) return;
    if (!document.getElementById('btn-sett-v187')) {
      const b1 = document.createElement('button');
      b1.id = 'btn-sett-v187';
      b1.className = 'btn';
      b1.textContent = '🏘️ Поселение';
      b1.onclick = () => S.openSettlement();
      bar.appendChild(b1);
    }
    if (!document.getElementById('btn-sim-v187')) {
      const b2 = document.createElement('button');
      b2.id = 'btn-sim-v187';
      b2.className = 'btn';
      b2.textContent = '🧪 Симулятор';
      b2.onclick = () => S.openBattleSimulator();
      bar.appendChild(b2);
    }
  }

  if (typeof S.renderLobby === 'function') {
    const origLobby = S.renderLobby;
    S.renderLobby = function() {
      const r = origLobby.apply(this, arguments);
      injectLobbyTools();
      return r;
    };
  }

  // 5. Автоинициализация ядра v1.8.7
  G.STIKS_ACTIVE_VERSION = 'v1.8.7';
  const badge = document.getElementById(
    'patch-status'
  );
  if (badge) badge.textContent = 'Ядро: v1.8.7';
  if (typeof S.loadDB === 'function') S.loadDB();
  setTimeout(injectLobbyTools, 120);
})(window);

// === БЛОК А-1: РОСТЕР, ФАМИЛИИ И ОТРЯД ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  S.isFem = function(p) {
    if (!p || p.asInfected) return false;
    if (p.sex === 'f') return true;
    const a = S.ARCHETYPES[p.arch];
    return Boolean(a && a.sex === 'f');
  };

  S.stackInventory = function(inv) {
    if (!Array.isArray(inv)) return [];
    const out = [];
    const eq = [
      'weapon', 'main', 'side', 'melee',
      'armor', 'clothes', 'boots', 'bag',
      'mod', 'meleemod', 'talisman'
    ];
    inv.forEach(raw => {
      if (!raw) return;
      const nm = String(
        raw.n || raw.name || ''
      ).trim();
      const cat = String(
        raw.cat || raw.slot || ''
      ).toLowerCase();
      const q = Math.max(1, Number(
        raw.q ?? raw.qty ?? 1
      ));
      const it = JSON.parse(
        JSON.stringify(raw)
      );
      it.q = q; it.qty = q;
      if (!eq.includes(cat)) {
        const f = out.find(x =>
          (x.n || x.name) === nm &&
          (x.rank || 1) === (it.rank || 1)
        );
        if (f) {
          f.q += q; f.qty = f.q;
          return;
        }
      }
      out.push(it);
    });
    return out;
  };

  S.consumeInvOne = function(h, idx) {
    if (!h || !h.inv || !h.inv[idx]) {
      return null;
    }
    const it = h.inv[idx];
    const q = Number(it.q ?? it.qty ?? 1);
    if (q > 1) {
      it.q = q - 1;
      it.qty = it.q;
    } else {
      h.inv.splice(idx, 1);
    }
    return it;
  };

  S.findHeroByUid = function(uid) {
    if (!uid || !S.db || !S.db.families) {
      return null;
    }
    const fams = Object.keys(S.db.families);
    for (let i = 0; i < fams.length; i++) {
      const lst = S.db.families[fams[i]];
      const f = (lst || []).find(
        h => h && h.uid === uid
      );
      if (f) return f;
    }
    return null;
  };

  S.syncHeroProfile = function(pl) {
    if (!pl || !S.db) return null;
    S._cleanSporans(pl);
    pl.inv = S.stackInventory(pl.inv);
    const t = S.findHeroByUid(pl.uid);
    if (t) {
      t.lvl = Math.max(
        t.lvl || 0, pl.lvl || 0
      );
      if (pl.stats) {
        t.stats = Object.assign(
          {}, t.stats, pl.stats
        );
      }
      t.inv = JSON.parse(
        JSON.stringify(pl.inv)
      );
      if (pl.slots) {
        t.slots = JSON.parse(
          JSON.stringify(pl.slots)
        );
      }
      t.spores = pl.spores;
      t.sporans = pl.spores;
      t.cobweb = pl.cobweb || 0;
      t.isKvaz = !!pl.isKvaz;
      t.isImennoi = !!pl.isImennoi;
      t.isInfected = !!pl.isInfected;
      t.asInfected = !!pl.asInfected;
      t.arch = pl.arch;
      t.origArch = pl.origArch;
      if (pl.gifts) {
        t.gifts = JSON.parse(
          JSON.stringify(pl.gifts)
        );
      }
      if (pl._peaTrack) {
        t._peaTrack = Object.assign(
          {}, pl._peaTrack
        );
      }
      t.missionsDone = Math.max(
        t.missionsDone || 0,
        pl.missionsDone || 0
      );
      if (pl.knowsSpores) {
        t.knowsSpores = true;
        t._manualBookRead = true;
      }
      if (pl._skillSuccessUsed) {
        t._skillSuccessUsed = true;
        t.skillUnlocked = true;
      }
      t.hp = pl.hp; t.maxHp = pl.maxHp;
      t.status = pl.dead ? 'dead'
        : (pl.escaped ? 'ready' : t.status);
    }
    return t;
  };

  S.pullProfileToPlayer = function(pl) {
    if (!pl) return;
    const t = S.findHeroByUid(pl.uid);
    if (!t) return;
    S._cleanSporans(t);
    pl.lvl = Number(t.lvl) || 0;
    if (t.stats) {
      pl.stats = Object.assign(
        {}, pl.stats, t.stats
      );
    }
    pl.inv = S.stackInventory(t.inv || []);
    if (t.slots) {
      pl.slots = Object.assign(
        S.defaultSlots(),
        JSON.parse(JSON.stringify(t.slots))
      );
    }
    pl.spores = t.spores;
    pl.sporans = t.spores;
    pl.cobweb = t.cobweb || 0;
    pl.isKvaz = !!t.isKvaz;
    pl.isImennoi = !!t.isImennoi;
    if (t.gifts) {
      pl.gifts = JSON.parse(
        JSON.stringify(t.gifts)
      );
    }
    if (t._peaTrack) {
      pl._peaTrack = Object.assign(
        {}, t._peaTrack
      );
    }
    pl.knowsSpores = !!t.knowsSpores;
    pl._manualBookRead = !!t._manualBookRead;
    pl._skillSuccessUsed = !!t._skillSuccessUsed;
    pl.skillUnlocked = !!t.skillUnlocked;
  };

  S.sanitizeRoster = function() {
    if (!S.db || !S.db.families) return;
    const s = S.db.session;
    const active = Boolean(
      s && s.players && s.players.length
    );
    Object.keys(S.db.families).forEach(f => {
      (S.db.families[f] || []).forEach(hr => {
        if (!active && hr.status === 'in_raid') {
          hr.status = 'ready';
        }
        S._cleanSporans(hr);
      });
    });
  };

  S.addFamily = function() {
    const el = document.getElementById(
      'new-fam'
    );
    const val = el ? el.value.trim() : '';
    if (!val) return;
    if (!S.db.families[val]) {
      S.db.families[val] = [];
    }
    S.activeFamily = val;
    if (el) el.value = '';
    S.saveDB();
    if (S.renderLobby) S.renderLobby();
  };

  S.selectFamily = function(f) {
    S.activeFamily = f;
    if (S.renderLobby) S.renderLobby();
  };

  S.addHero = function() {
    if (!S.activeFamily) return;
    const inp = document.getElementById(
      'hero-name'
    );
    const sexEl = document.getElementById(
      'hero-sex'
    );
    const name = inp ? inp.value.trim() : '';
    if (!name) return;
    const sex = sexEl ? sexEl.value : 'm';
    const pool = Object.keys(
      S.ARCHETYPES
    ).filter(k => {
      if (k === 'infected') return false;
      const a = S.ARCHETYPES[k];
      return a.sex === 'both' ||
        a.sex === sex;
    });
    const chosen = pool[
      Math.floor(Math.random() * pool.length)
    ] || 'kachok';
    const aObj = S.ARCHETYPES[chosen];
    const st = Object.assign(
      {}, aObj.stats
    );
    const hero = {
      uid: 'h_' + Date.now() + '_' +
        Math.random().toString(36).slice(2, 5),
      family: S.activeFamily,
      name: name, sex: sex,
      arch: chosen, origArch: chosen,
      lvl: 0, status: 'ready',
      isInfected: false, asInfected: false,
      isKvaz: false, isImennoi: false,
      stats: st, gifts: {},
      skillUnlocked: false,
      _skillSuccessUsed: false,
      knowsSpores: false,
      missionsDone: 0,
      spores: 0, sporans: 0, cobweb: 0,
      inv: [], stash: [],
      slots: S.defaultSlots()
    };
    S.normalizePlayerStats(hero);
    S.db.families[S.activeFamily].push(hero);
    if (inp) inp.value = '';
    S.saveDB();
    S.log(`Создан: ${name}`);
    if (S.renderLobby) S.renderLobby();
  };

  S.delHero = function(fam, idx) {
    const lst = S.db.families[fam];
    if (!lst || !lst[idx]) return;
    const h = lst[idx];
    S.squad = S.squad.filter(
      x => x.uid !== h.uid
    );
    lst.splice(idx, 1);
    S.saveDB();
    if (S.renderLobby) S.renderLobby();
  };

  S.toggleSquad = function(fam, idx, inf) {
    const lst = S.db.families[fam];
    const h = lst && lst[idx];
    if (!h) return;
    if (S.squad.some(x => x.uid === h.uid)) {
      return;
    }
    const copy = JSON.parse(
      JSON.stringify(h)
    );
    const asI = Boolean(
      inf || h.status === 'dead' ||
      h.isInfected
    );
    copy.asInfected = asI;
    if (asI) {
      copy.isInfected = true;
      copy.arch = 'infected';
    }
    S.squad.push(copy);
    if (S.renderLobby) S.renderLobby();
  };

  S.removeSquad = function(i) {
    S.squad.splice(i, 1);
    if (S.renderLobby) S.renderLobby();
  };

  S.pauseToLobby = function() {
    const s = S.db && S.db.session;
    if (s && s.players) {
      s.players.forEach(
        p => S.syncHeroProfile(p)
      );
    }
    S.lobbyPaused = true;
    S.saveDB();
    if (S.renderLobby) S.renderLobby();
  };

  S.resumeRaid = function() {
    S.lobbyPaused = false;
    if (S.db && S.db.session && S.renderGame) {
      S.renderGame();
    }
  };

  S.finishPausedRaid = function() {
    S.db.session = null;
    S.lobbyPaused = false;
    S.squad = [];
    S.sanitizeRoster();
    S.saveDB();
    if (S.renderLobby) S.renderLobby();
  };
})(window);

// === БЛОК А-2Б: ШАГ, ПОИСК И ХОД ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  S.setMoveMode = function(m) {
    const s = S.db && S.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (p.movedThisTurn) {
      S.log('❌ Режим фиксирован на ход.');
      return;
    }
    p.moveMode = m;
    if (S.renderGame) S.renderGame();
  };

  S.stepPlayer = function(dx, dy) {
    const s = S.db && S.db.session;
    if (!s || s.combat) return;
    const p = s.players[s.activeIdx];
    const nx = p.x + dx, ny = p.y + dy;

    if (nx < 0 || nx > 59 || ny < 0 || ny > 59) {
      p.escaped = true;
      p.missionsDone = (p.missionsDone || 0) + 1;
      p.status = 'ready';
      S.syncHeroProfile(p);
      S.db.session = null;
      S.squad = [];
      S.saveDB();
      S.log(`🚪 ${p.name} вышел с локации!`);
      if (S.renderLobby) S.renderLobby();
      return;
    }

    const ci = S.getCarryInfo(p);
    if (ci.blocked) {
      S.log('🎒 Перегруз >150%: шаг закрыт.');
      return;
    }
    const cost = S.getStepCost(p.moveMode);
    if (p.stepsLeft < cost) {
      S.log(`❌ Нужно ${cost} ОХ.`);
      return;
    }
    const cell = s.grid[ny][nx];
    if (cell.blocked) {
      S.log(`⛰️ Преграда: ${cell.bType}.`);
      return;
    }

    p.x = nx; p.y = ny;
    p.stepsLeft -= cost;
    p.movedThisTurn = true;
    s.pendingSpores = 0;

    const stK = p.moveMode === 'run' ? 'spd'
      : (p.moveMode === 'careful' ? 'agi' : 'end');
    S.grantActionXp(p, stK, 0.25);
    if (ci.rawPct >= 80) {
      S.grantActionXp(p, 'str', 0.5);
    }

    const zHit = s.zombies.find(
      z => z.x === nx && z.y === ny
    );
    if (zHit && S.triggerEncounter) {
      zHit.hidden = false;
      S.triggerEncounter(p, zHit);
      return;
    }
    S.saveDB();
    if (S.renderGame) S.renderGame();
  };

  S.searchCell = function() {
    const s = S.db && S.db.session;
    if (!s || s.combat) return;
    const p = s.players[s.activeIdx];
    if (p.stepsLeft < 3) {
      S.log('❌ Для поиска нужно 3 ОХ.');
      return;
    }
    p.stepsLeft -= 3;
    const cell = s.grid[p.y][p.x];
    const d1 = Math.floor(Math.random() * 6) + 1;
    const qty = d1 + cell.exhaust +
      (cell.valuable ? 2 : 1);
    cell.exhaust--;

    if (qty <= 0) {
      S.log('🔍 Обыск: пусто.');
      S.saveDB();
      if (S.renderGame) S.renderGame();
      return;
    }

    const found = [];
    const pool = new Array(
      { n: 'Нож охотничий', slot: 'melee',
        a: 4, w: 0.4, rank: 1 },
      { n: 'Косуха', slot: 'clothes',
        d: 5, w: 3.5, rank: 1 },
      { n: 'Бронежилет 6Б23', slot: 'armor',
        d: 15, w: 7.2, rank: 2 },
      { n: 'Автоаптечка', cat: 'med',
        heal: 25, w: 0.5, rank: 1 },
      { n: 'Сухпаёк ИРП', cat: 'supply',
        food: 50, w: 1.2, rank: 1 },
      { n: 'Фляга воды', cat: 'supply',
        water: 50, w: 1.0, rank: 1 },
      { n: 'Чекушка водки', cat: 'supply',
        isAlcohol: true, w: 0.4, rank: 1 }
    );

    for (let i = 0; i < qty; i++) {
      const idx = Math.floor(
        Math.random() * pool.length
      );
      const raw = pool.at(idx);
      if (S.canFindGearBySize &&
        !S.canFindGearBySize(p, raw)) {
        continue;
      }
      const it = Object.assign({ q: 1 }, raw);
      p.inv.push(it);
      found.push(it.n);
    }

    if (S.rollGuideDrop100 &&
      S.rollGuideDrop100(p)) {
      p.inv.push({
        n: '📘 Руководство по выживанию',
        cat: 'supply', slot: 'use',
        isGuide: true, w: 0.2, q: 1, rank: 2
      });
      found.push('📘 Руководство по выживанию');
    }

    p.inv = S.stackInventory(p.inv);
    S.grantActionXp(p, 'int', 0.25);
    S.log(found.length
      ? `🔍 Найдено: ${found.join(', ')}`
      : '🔍 Подходящих вещей нет.');
    S.saveDB();
    if (S.renderGame) S.renderGame();
  };

  S.collectSpores = function() {
    const s = S.db && S.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    const av = Number(s.pendingSpores) || 0;
    if (av <= 0 || p.stepsLeft < 1) return;
    p.stepsLeft -= 1;
    p.spores = (p.spores || 0) + av;
    p.sporans = p.spores;
    s.pendingSpores = 0;
    const ks = new Array('agi', 'int', 'spi', 'end');
    ks.forEach(k => S.grantActionXp(p, k, 0.5));
    S.log(`💎 Собрано споранов: +${av}`);
    S.saveDB();
    if (S.renderGame) S.renderGame();
  };

  S.craftZhivchik = function() {
    const s = S.db && S.db.session;
    const p = s && s.players[s.activeIdx];
    if (!p || (p.spores || 0) < 1) return;
    const idx = p.inv.findIndex(
      x => x && x.isAlcohol
    );
    if (idx === -1) {
      S.log('❌ Нужен 1 споран и алкоголь.');
      return;
    }
    p.spores -= 1; p.sporans = p.spores;
    S.consumeInvOne(p, idx);
    p.inv.push({
      n: '🧪 Живчик', cat: 'supply',
      slot: 'use', isZhivchik: true,
      w: 0.2, q: 3, rank: 2
    });
    p.inv = S.stackInventory(p.inv);
    S.log('🧪 Сварено 3 порции «Живчика».');
    S.saveDB();
    if (S.renderGame) S.renderGame();
  };

  S.drinkZhivchik = function() {
    const s = S.db && S.db.session;
    const p = s && s.players[s.activeIdx];
    if (!p) return;
    const idx = p.inv.findIndex(
      x => x && x.isZhivchik
    );
    if (idx === -1) return;
    S.consumeInvOne(p, idx);
    p.knowsSpores = true;
    p._manualBookRead = true;
    p.spore = Math.min(
      p.maxSpore,
      p.spore + Math.round(p.maxSpore * 0.5)
    );
    p.hp = Math.min(
      p.maxHp,
      p.hp + Math.max(1, Math.round(p.maxHp * 0.1))
    );
    S.log('🥤 Выпит «Живчик» (+50% спор).');
    S.saveDB();
    if (S.renderGame) S.renderGame();
  };

  S.nextTurn = function() {
    const s = S.db && S.db.session;
    if (!s) return;
    const p = s.players[s.activeIdx];
    if (p && !p.dead && !p.escaped) {
      S.processHeroTurnTick(p);
      S.syncHeroProfile(p);
    }
    s.turn++;
    const np = s.players[s.activeIdx];
    S.normalizePlayerStats(np);
    np.stepsLeft = np.maxAp;
    np.movedThisTurn = false;
    S.log(`--- ХОД ${s.turn} ---`);
    S.saveDB();
    if (S.renderGame) S.renderGame();
  };
})(window);

// === БЛОК В-2: ЭКРАН ИГРЫ 11x11 И СТАРТ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  S.renderGame = function() {
    const vp = document.getElementById(
      'game-viewport'
    );
    const s = S.db && S.db.session;
    if (!vp || !s) return;
    if (s.combat && S.renderCombat) {
      S.renderCombat();
      return;
    }

    const p = s.players.at(s.activeIdx);
    if (!p) return;
    S.normalizePlayerStats(p);
    const ci = S.getCarryInfo(p);
    const spLbl = S.isRealSporeUnlocked(p)
      ? '☣️ Споры:' : '🤒 Недуг:';
    const skLbl = p.asInfected
      ? '☣️ Инстинкты Улья'
      : (S.isRealSkillUnlocked(p)
        ? '✨ Навык' : '🤪 Что-то учудить');

    const h = [];
    h.push('<div style="display:flex;');
    h.push('flex-direction:column;gap:6px;');
    h.push('font-size:11px;">');

    h.push('<div style="display:flex;');
    h.push('justify-content:space-between;');
    h.push('border-bottom:1px solid #6e2626;');
    h.push('padding-bottom:4px;">');
    h.push(`<b>${p.name} Ур.${p.lvl || 0} `);
    h.push(`[${p.x + 1}:${p.y + 1}]</b>`);
    h.push(`<span>Ход:${s.turn} `);
    h.push(`ОХ:${p.stepsLeft}/${p.maxAp} `);
    h.push('<button class="btn" ');
    h.push('style="width:auto!important;');
    h.push('padding:2px 6px;" ');
    h.push('onclick="STIKS.pauseToLobby()">');
    h.push('🏕</button></span></div>');

    h.push('<div style="display:grid;');
    h.push('grid-template-columns:repeat(3,1fr);');
    h.push('gap:4px;background:#140e0e;');
    h.push('padding:5px;border:1px solid ');
    h.push('#6e2626;">');
    h.push(`<div>❤️ ${p.hp}/${p.maxHp}</div>`);
    h.push(`<div>🍖 ${p.food}/${p.maxFood}</div>`);
    h.push(`<div>💧 ${p.water}/${p.maxWater}</div>`);
    h.push(`<div>⚡ ${p.stamina}/${p.maxStamina}</div>`);
    h.push(`<div>${spLbl} ${p.spore}</div>`);
    h.push(`<div>🔮 ${p.mana}/${p.maxMana}</div>`);
    h.push('</div>');

    // Окно обзора 11x11 (радиус -5..+5)
    h.push('<div style="display:grid;');
    h.push('grid-template-columns:repeat(11,1fr);');
    h.push('gap:1.5px;background:#080a09;');
    h.push('padding:3px;border:1px solid ');
    h.push('#6e2626;">');
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const gx = p.x + dx, gy = p.y + dy;
        let bg = '#131815', sym = '';
        if (gx < 0 || gx > 59 ||
          gy < 0 || gy > 59) {
          bg = '#132419'; sym = '🚪';
        } else if (gx === p.x && gy === p.y) {
          bg = '#2d4a38';
          sym = p.asInfected ? '☣️' : '🧍';
        } else {
          const z = (s.zombies || []).find(
            x => x.x === gx && x.y === gy &&
            !x.hidden
          );
          const row = s.grid.at(gy);
          const c = row && row.at(gx);
          if (z) {
            bg = '#3b1818';
            sym = z.isHuman ? '🧑' : '🧟';
          } else if (c && c.blocked) {
            bg = '#1f2421'; sym = '⛰️';
          } else if (c && c.lootType) {
            bg = '#18242b';
            sym = c.valuable ? '💎' : '📦';
          }
        }
        h.push('<div style="aspect-ratio:1;');
        h.push('display:flex;align-items:center;');
        h.push('justify-content:center;');
        h.push(`background:${bg};font-size:11px;">`);
        h.push(`${sym}</div>`);
      }
    }
    h.push('</div>');

    h.push('<div style="display:flex;gap:4px;">');
    const modes = new Array(
      new Array('careful', 'Внимат.(3)'),
      new Array('fast', 'Быстро(2)'),
      new Array('run', 'Бегом(1)')
    );
    modes.forEach(pair => {
      const mk = pair.at(0), ml = pair.at(1);
      const cls = p.moveMode === mk
        ? 'btn-primary' : '';
      h.push(`<button class="btn ${cls}" `);
      h.push('style="padding:4px;" ');
      h.push(`onclick="STIKS.setMoveMode(`);
      h.push(`'${mk}')">${ml}</button>`);
    });
    h.push('</div>');

    h.push('<div style="display:grid;');
    h.push('grid-template-columns:repeat(3,1fr);');
    h.push('gap:4px;"><div></div>');
    h.push('<button class="btn" ');
    h.push('onclick="STIKS.stepPlayer(0,-1)">');
    h.push('⬆</button><div></div>');
    h.push('<button class="btn" ');
    h.push('onclick="STIKS.stepPlayer(-1,0)">');
    h.push('⬅</button>');
    h.push('<button class="btn btn-primary" ');
    h.push('onclick="STIKS.searchCell()">');
    h.push('🔍 Поиск (3)</button>');
    h.push('<button class="btn" ');
    h.push('onclick="STIKS.stepPlayer(1,0)">');
    h.push('➡</button><div></div>');
    h.push('<button class="btn" ');
    h.push('onclick="STIKS.stepPlayer(0,1)">');
    h.push('⬇</button><div></div></div>');

    h.push('<div style="display:grid;');
    h.push('grid-template-columns:repeat(2,1fr);');
    h.push('gap:4px;">');
    h.push('<button class="btn" ');
    h.push('onclick="STIKS.toggleInv()">');
    h.push(`🎒 Вещи (${p.inv.length})</button>`);
    h.push('<button class="btn" ');
    h.push('onclick="STIKS.toggleProfile()">');
    h.push(`👤 Профиль (${skLbl})</button>`);
    h.push('<button class="btn" ');
    h.push('onclick="STIKS.collectSpores()">');
    h.push(`💎 Собрать (${s.pendingSpores || 0})`);
    h.push('</button>');
    h.push('<button class="btn btn-primary" ');
    h.push('onclick="STIKS.nextTurn()">');
    h.push('⏭ Конец хода</button></div>');

    if (!p.asInfected) {
      h.push('<div style="display:flex;gap:4px;">');
      h.push('<button class="btn" ');
      h.push('onclick="STIKS.craftZhivchik()">');
      h.push('🧪 Крафт Живчика</button>');
      h.push('<button class="btn" ');
      h.push('onclick="STIKS.drinkZhivchik()">');
      h.push('🥤 Выпить Живчик</button>');
      h.push('</div>');
    }

    if (S.profileOpen) {
      const img = S.resolvePortrait(p);
      const st = p.stats || {};
      h.push('<div style="position:fixed;inset:0;');
      h.push('background:rgba(0,0,0,.92);');
      h.push('z-index:9000;padding:12px;');
      h.push('overflow-y:auto;">');
      h.push('<div style="max-width:380px;');
      h.push('margin:0 auto;background:#140e0e;');
      h.push('border:1px solid #6e2626;');
      h.push('padding:10px;">');
      h.push('<div style="display:flex;');
      h.push('justify-content:space-between;">');
      h.push(`<b>${p.name} (Ур.${p.lvl})</b>`);
      h.push('<button class="btn btn-danger" ');
      h.push('style="width:auto!important;" ');
      h.push('onclick="STIKS.toggleProfile()">');
      h.push('✖</button></div>');
      h.push(`<img src="${img}" style="width:100%;`);
      h.push('max-height:220px;object-fit:contain;');
      h.push('margin:6px 0;">');
      h.push(`<div>Сила:${st.str} Ловк:${st.agi} `);
      h.push(`Скор:${st.spd}</div>`);
      h.push(`<div>Вын:${st.end} Инт:${st.int} `);
      h.push(`Дух:${st.spi}</div>`);
      h.push('</div></div>');
    }

    if (S.invOpen) {
      h.push('<div style="position:fixed;inset:0;');
      h.push('background:rgba(0,0,0,.92);');
      h.push('z-index:9100;padding:12px;');
      h.push('overflow-y:auto;">');
      h.push('<div style="max-width:400px;');
      h.push('margin:0 auto;background:#140e0e;');
      h.push('border:1px solid #6e2626;');
      h.push('padding:10px;">');
      h.push('<div style="display:flex;');
      h.push('justify-content:space-between;">');
      h.push(`<b>🎒 ВЕЩИ (${ci.cur}/${ci.max}кг)`);
      h.push('</b><button class="btn btn-danger" ');
      h.push('style="width:auto!important;" ');
      h.push('onclick="STIKS.toggleInv()">');
      h.push('✖</button></div>');

      Object.keys(p.slots || {}).forEach(sk => {
        const eq = p.slots[sk];
        if (!eq) return;
        h.push('<div style="display:flex;');
        h.push('justify-content:space-between;');
        h.push('padding:3px 0;">');
        h.push(`<span>[${sk}] ${eq.n}</span>`);
        h.push('<button class="btn" ');
        h.push('style="width:auto!important;" ');
        h.push(`onclick="STIKS.unequipSlot(`);
        h.push(`'${sk}')">Снять</button></div>`);
      });

      (p.inv || []).forEach((it, idx) => {
        const q = (it.q || 1) > 1 ? ` x${it.q}` : '';
        h.push('<div style="display:flex;');
        h.push('justify-content:space-between;');
        h.push('padding:4px 0;border-top:1px ');
        h.push('solid #2b1515;">');
        h.push(`<span>${it.n}${q}</span>`);
        h.push('<button class="btn btn-primary" ');
        h.push('style="width:auto!important;" ');
        h.push(`onclick="STIKS.equipFromInv(`);
        h.push(`${idx})">Исп./Надеть</button>`);
        h.push('</div>');
      });
      h.push('</div></div>');
    }

    h.push('</div>');
    vp.innerHTML = h.join('');
  };

  if (S.db && S.db.session &&
    !S.lobbyPaused && S.renderGame) {
    S.renderGame();
  } else if (S.renderLobby) {
    S.renderLobby();
  }
})(window);

// === ДОБОР 1: СТАРТ КАРТЫ, БОЙ И ВЕЩИ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  S.getMaxWeight = function(p) {
    if (!p) return 11;
    S.normalizePlayerStats(p);
    return p.maxWeight || 11;
  };

  S.getInvWeight = function(p) {
    if (!p) return 0;
    let cur = 0;
    (p.inv || []).forEach(it => {
      if (!it || it.isSporan) return;
      cur += (Number(it.w ?? 0)) *
        (Number(it.q ?? 1));
    });
    return Math.round(cur * 10) / 10;
  };

  S.getCarryInfo = function(p) {
    const max = S.getMaxWeight(p);
    const cur = S.getInvWeight(p);
    const raw = max > 0
      ? Math.round((cur / max) * 100) : 0;
    let mult = 1, blk = false;
    if (raw > 150) { blk = true; mult = 999; }
    else if (raw > 100) mult = 1.5;
    else if (raw > 80) mult = 1.25;
    return {
      cur: cur, max: max, rawPct: raw,
      pct: Math.min(100, raw),
      mult: mult, blocked: blk
    };
  };

  S.getStepCost = function(m) {
    const base = m === 'careful' ? 3
      : (m === 'fast' ? 2 : 1);
    const s = S.db && S.db.session;
    const p = s && s.players.at(s.activeIdx);
    if (!p) return base;
    const ci = S.getCarryInfo(p);
    if (ci.blocked) return 999;
    return Math.ceil(base * ci.mult);
  };

  S.launchMap = function(dKey) {
    if (!S.squad || !S.squad.length) return;
    const g = [];
    for (let y = 0; y < 60; y++) {
      const row = [];
      for (let x = 0; x < 60; x++) {
        row.push({
          x: x, y: y, blocked: false,
          bType: null, lootType: null,
          valuable: false,
          exhaust: -(Math.floor(
            Math.random() * 3) + 1)
        });
      }
      g.push(row);
    }
    const bars = new Array(
      'Скала', 'Водоем', 'Руины',
      'Обрыв', 'Пожар'
    );
    for (let i = 0; i < 320; i++) {
      const bx = Math.floor(Math.random() * 56) + 2;
      const by = Math.floor(Math.random() * 56) + 2;
      if (bx >= 22 && bx <= 37 &&
        by >= 22 && by <= 37) continue;
      const r = g.at(by);
      if (r && r.at(bx)) {
        r.at(bx).blocked = true;
        r.at(bx).bType = bars.at(i % 5);
      }
    }
    const lTypes = new Array(
      'weapon', 'armor', 'supply'
    );
    for (let i = 0; i < 55; i++) {
      const lx = Math.floor(Math.random() * 58) + 1;
      const ly = Math.floor(Math.random() * 58) + 1;
      const c = g.at(ly) && g.at(ly).at(lx);
      if (!c || c.blocked) continue;
      c.lootType = lTypes.at(i % 3);
      c.valuable = (i % 3 === 0);
      c.exhaust = 0;
    }
    const pls = S.squad.map(sq => {
      const p = JSON.parse(JSON.stringify(sq));
      S.pullProfileToPlayer(p);
      const isNov = (p.lvl || 0) === 0 &&
        (p.missionsDone || 0) === 0;
      let px = 30, py = 30, gd = 0;
      do {
        gd++;
        if (isNov) {
          px = 24 + Math.floor(
            Math.random() * 12);
          py = 24 + Math.floor(
            Math.random() * 12);
        } else {
          px = Math.random() < 0.5 ? 1 : 58;
          py = Math.floor(Math.random() * 60);
        }
      } while (g.at(py).at(px).blocked && gd < 200);
      p.x = px; p.y = py;
      p.status = 'in_raid';
      p.moveMode = 'careful';
      p.movedThisTurn = false;
      p.escaped = false; p.dead = false;
      S.normalizePlayerStats(p);
      p.stepsLeft = p.maxAp;
      p.hp = p.maxHp;
      return p;
    });
    const zms = [];
    for (let i = 0; i < 48; i++) {
      const zx = Math.floor(Math.random() * 58) + 1;
      const zy = Math.floor(Math.random() * 58) + 1;
      if (g.at(zy).at(zx).blocked) continue;
      zms.push({
        id: 'z_' + i, x: zx, y: zy,
        hidden: (i % 3 === 0),
        isHuman: (i % 7 === 0)
      });
    }
    S.db.session = {
      turn: 1, activeIdx: 0,
      diffKey: dKey || 'start',
      diffMod: -2,
      grid: g, players: pls,
      zombies: zms, pendingSpores: 0
    };
    S.lobbyPaused = false;
    S.saveDB();
    if (S.renderGame) S.renderGame();
  };

  S.triggerEncounter = function(p, zm) {
    const s = S.db.session;
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    let rnk = Math.min(9, Math.max(
      0, d2 + (s.diffMod || 0)
    ));
    if (d1 === 1 && d2 === 1) rnk = 4;
    const ranks = new Array(
      'Ползун', 'Медляк', 'Джампер',
      'Бегун', 'Лотерейщик', 'Топтун',
      'Кусач', 'Рубер', 'Элита',
      'Суперэлита'
    );
    const minT = new Array(
      0, 0, 5, 11, 21, 31, 37, 41, 50, 61
    );
    const lv = (minT.at(rnk) || 0) +
      Math.floor(Math.random() * 3);
    const hp = 20 + lv * 8;
    const sl = p.slots.main ? 'main'
      : (p.slots.melee ? 'melee' : null);
    s.combat = {
      zId: zm ? zm.id : 'enc',
      enemies: new Array({
        name: ranks.at(rnk) || 'Заражённый',
        rank: rnk, lvl: lv,
        hp: hp, maxHp: hp,
        dmg: Math.max(2, Math.floor(2 + lv * 1.4)),
        agi: 10 + lv * 2,
        def: Math.floor(lv * 0.4),
        isHuman: Boolean(zm && zm.isHuman)
      }),
      round: 1, bgType: 'city',
      usedSkill: false, chosenSlot: sl,
      busy: false, finished: false,
      feed: new Array('⚔️ Бой начался!')
    };
    if (S.renderCombat) S.renderCombat();
  };

  S.closeCombatModal = function() {
    const s = S.db && S.db.session;
    if (!s || !s.combat || s.combat.busy) return;
    s.combat = null;
    S.saveDB();
    if (S.renderGame) S.renderGame();
  };

  S.equipFromInv = function(idx) {
    const s = S.db && S.db.session;
    const p = s && s.players.at(s.activeIdx);
    if (!p || !p.inv || !p.inv.at(idx)) return;
    const it = p.inv.at(idx);
    const nm = String(it.n || '').toLowerCase();
    if (it.isPea || nm.includes('горох')) {
      if (S.consumePeaItem) {
        S.consumePeaItem(p, idx, false);
      }
      if (S.renderGame) S.renderGame();
      return;
    }
    if (it.isGuide || nm.includes('руководств')) {
      p.knowsSpores = true;
      p._manualBookRead = true;
      S.consumeInvOne(p, idx);
      S.log('📖 Руководство изучено!');
      S.saveDB();
      if (S.renderGame) S.renderGame();
      return;
    }
    if (it.heal) {
      p.hp = Math.min(p.maxHp, p.hp + it.heal);
      S.consumeInvOne(p, idx);
      S.saveDB();
      if (S.renderGame) S.renderGame();
      return;
    }
    if (it.food || it.water) {
      if (it.food) {
        p.food = Math.min(
          p.maxFood, p.food + it.food);
      }
      if (it.water) {
        p.water = Math.min(
          p.maxWater, p.water + it.water);
      }
      S.consumeInvOne(p, idx);
      S.saveDB();
      if (S.renderGame) S.renderGame();
      return;
    }
    if (it.slot && p.slots) {
      const old = p.slots[it.slot];
      const one = JSON.parse(JSON.stringify(it));
      one.q = 1; one.qty = 1;
      S.consumeInvOne(p, idx);
      if (old) p.inv.push(old);
      p.slots[it.slot] = one;
      p.inv = S.stackInventory(p.inv);
      S.normalizePlayerStats(p);
      S.saveDB();
      if (S.renderGame) S.renderGame();
    }
  };

  S.unequipSlot = function(sk) {
    const s = S.db && S.db.session;
    const p = s && s.players.at(s.activeIdx);
    if (!p || !p.slots || !p.slots[sk]) return;
    p.inv.push(p.slots[sk]);
    p.slots[sk] = null;
    p.inv = S.stackInventory(p.inv);
    S.normalizePlayerStats(p);
    S.saveDB();
    if (S.renderGame) S.renderGame();
  };

  S.toggleInv = function() {
    S.invOpen = !S.invOpen;
    if (S.invOpen) S.profileOpen = false;
    if (S.renderGame) S.renderGame();
  };

  S.toggleProfile = function() {
    S.profileOpen = !S.profileOpen;
    if (S.profileOpen) S.invOpen = false;
    if (S.renderGame) S.renderGame();
  };
})(window);

// === ДОБОР 2: ЛАВКА, ЛОББИ И СТАРТ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  S.ensureTraderStock = function(hr) {
    const lv = hr.lvl || 0;
    if (Array.isArray(hr.traderStock) &&
      hr.traderStockLvl === lv &&
      hr.traderStock.length > 0) {
      return hr.traderStock;
    }
    hr.traderStock = new Array(
      { n: 'Нож охотничий', slot: 'melee',
        rank: 1, a: 4, w: 0.4 },
      { n: 'Обрез 12к', slot: 'side',
        rank: 1, a: 7, cal: '12g', w: 2.1 },
      { n: 'Косуха', slot: 'clothes',
        rank: 1, d: 5, w: 3.5 },
      { n: 'Автоаптечка', cat: 'med',
        rank: 1, heal: 25, w: 0.5 },
      { n: 'Сухпаёк ИРП', cat: 'supply',
        rank: 1, food: 50, w: 1.2 },
      { n: 'АК-74 (5.45)', slot: 'main',
        rank: 2, a: 15, cal: '545', w: 3.6 },
      { n: 'Бронежилет 6Б23', slot: 'armor',
        rank: 2, d: 15, w: 7.2 },
      { n: '🟢 Горох Улья', cat: 'supply',
        slot: 'use', isPea: true,
        rank: 2, w: 0.05 }
    );
    hr.traderStockLvl = lv;
    return hr.traderStock;
  };

  S.openShop = function(fOrU, idx) {
    let hr = null;
    if (typeof idx === 'number') {
      const lst = S.db.families[fOrU] || [];
      hr = lst.at(idx);
    } else {
      hr = S.findHeroByUid(fOrU);
    }
    if (!hr) return;
    S._cleanSporans(hr);
    S.shopHeroUid = hr.uid;
    S.renderShopModal();
  };

  S.closeShop = function() {
    const el = document.getElementById(
      'stiks-shop-modal'
    );
    if (el) el.remove();
    S.shopHeroUid = null;
    if (S.renderLobby) S.renderLobby();
  };

  S.sellWebInShop = function() {
    const hr = S.findHeroByUid(S.shopHeroUid);
    if (!hr || !S.sellCobwebBundle) return;
    S.log(S.sellCobwebBundle(hr).msg);
    S.renderShopModal();
  };

  S.renderShopModal = function() {
    const hr = S.findHeroByUid(S.shopHeroUid);
    if (!hr) return;
    const old = document.getElementById(
      'stiks-shop-modal'
    );
    if (old) old.remove();
    S._cleanSporans(hr);
    const stock = S.ensureTraderStock(hr);
    const web = Number(hr.cobweb || 0);
    const ov = document.createElement('div');
    ov.id = 'stiks-shop-modal';
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:9500;',
      'background:rgba(5,7,6,.93);',
      'display:flex;align-items:center;',
      'justify-content:center;padding:10px;',
      'font-family:monospace;color:#d6e5db;'
    ].join('');
    const h = [];
    h.push('<div style="width:100%;');
    h.push('max-width:440px;max-height:92dvh;');
    h.push('overflow-y:auto;padding:12px;');
    h.push('border:1px solid #6e2626;');
    h.push('background:#111613;font-size:11px;">');
    h.push('<div style="display:flex;');
    h.push('justify-content:space-between;');
    h.push('margin-bottom:8px;">');
    h.push(`<b>🏪 ЛАВКА: ${hr.name}</b>`);
    h.push('<button class="btn btn-danger" ');
    h.push('style="width:auto!important;" ');
    h.push('onclick="STIKS.closeShop()">');
    h.push('✖</button></div>');
    h.push(`<div style="margin-bottom:8px;">`);
    h.push(`💎 ${hr.spores} | 🕸️ ${web}`);
    if (web >= 10) {
      h.push(' <button class="btn btn-primary" ');
      h.push('style="width:auto!important;" ');
      h.push('onclick="STIKS.sellWebInShop()">');
      h.push('Сдать 10:1</button>');
    }
    h.push('</div>');
    stock.forEach((it, idx) => {
      const pr = S.calcShopBuyPrice(it, hr);
      h.push('<div style="display:flex;');
      h.push('justify-content:space-between;');
      h.push('padding:4px 0;border-bottom:1px ');
      h.push('solid #253029;">');
      h.push(`<span>${it.n}</span>`);
      h.push('<button class="btn btn-primary" ');
      h.push('style="width:auto!important;" ');
      h.push(`onclick="STIKS.buyTraderItem(${idx})">`);
      h.push(`${pr}💎</button></div>`);
    });
    (hr.inv || []).forEach((it, idx) => {
      const sp = S.calcShopSellPrice(it);
      h.push('<div style="display:flex;');
      h.push('justify-content:space-between;');
      h.push('padding:4px 0;">');
      h.push(`<span>${it.n}</span>`);
      h.push('<button class="btn" ');
      h.push('style="width:auto!important;" ');
      h.push(`onclick="STIKS.sellToTrader(${idx})">`);
      h.push(`+${sp}💎</button></div>`);
    });
    h.push('</div>');
    ov.innerHTML = h.join('');
    document.body.appendChild(ov);
  };

  S.renderLobby = function() {
    S.sanitizeRoster();
    const vp = document.getElementById(
      'game-viewport'
    );
    if (!vp) return;
    const fams = Object.keys(S.db.families || {});
    const h = [];
    h.push('<div style="display:flex;');
    h.push('flex-direction:column;gap:8px;">');
    const s = S.db.session;
    if (s && s.players && s.players.length) {
      h.push('<div style="border:1px solid ');
      h.push('#4a7a5c;padding:8px;">');
      h.push('<b>⏸ АКТИВНЫЙ РЕЙД</b> ');
      h.push('<button class="btn btn-primary" ');
      h.push('onclick="STIKS.resumeRaid()">');
      h.push('▶ Продолжить</button></div>');
    }
    h.push('<div style="border:1px solid ');
    h.push('#6e2626;padding:8px;">');
    h.push('<b>1. ФАМИЛИЯ</b>');
    h.push('<div style="display:flex;gap:6px;');
    h.push('margin-top:4px;">');
    h.push('<input id="new-fam" ');
    h.push('placeholder="Фамилия..." ');
    h.push('style="flex:1;background:#0b0d0c;');
    h.push('color:#c8d6cc;padding:6px;">');
    h.push('<button class="btn btn-primary" ');
    h.push('style="width:auto!important;" ');
    h.push('onclick="STIKS.addFamily()">+</button>');
    h.push('</div><div style="display:flex;');
    h.push('flex-wrap:wrap;gap:4px;margin-top:6px;">');
    fams.forEach(f => {
      const fE = f.replace(/'/g, "\\'");
      const cl = S.activeFamily === f
        ? 'btn-primary' : '';
      h.push(`<button class="btn ${cl}" `);
      h.push('style="width:auto!important;" ');
      h.push(`onclick="STIKS.selectFamily(`);
      h.push(`'${fE}')">${f}</button>`);
    });
    h.push('</div></div>');

    if (S.activeFamily) {
      const af = S.activeFamily;
      const fE = af.replace(/'/g, "\\'");
      h.push('<div style="border:1px solid ');
      h.push('#6e2626;padding:8px;">');
      h.push(`<b>2. ПЕРСОНАЖИ (${af})</b>`);
      h.push('<input id="hero-name" ');
      h.push('placeholder="Имя..." ');
      h.push('style="width:100%;margin:5px 0;');
      h.push('background:#0b0d0c;color:#c8d6cc;');
      h.push('padding:6px;">');
      h.push('<div style="display:flex;gap:6px;">');
      h.push('<select id="hero-sex" ');
      h.push('style="flex:1;background:#0b0d0c;');
      h.push('color:#c8d6cc;padding:6px;">');
      h.push('<option value="m">Муж.</option>');
      h.push('<option value="f">Жен.</option>');
      h.push('</select>');
      h.push('<button class="btn btn-primary" ');
      h.push('style="width:auto!important;" ');
      h.push('onclick="STIKS.addHero()">');
      h.push('Создать</button></div>');

      (S.db.families[af] || []).forEach((hr, i) => {
        S._cleanSporans(hr);
        const dead = hr.status === 'dead';
        const inS = S.squad.some(
          x => x.uid === hr.uid
        );
        h.push('<div style="display:flex;');
        h.push('justify-content:space-between;');
        h.push('align-items:center;padding:5px;');
        h.push('margin-top:4px;border:1px ');
        h.push('solid #3d1c1c;">');
        h.push(`<span><b>${hr.name}</b> `);
        h.push(`Ур.${hr.lvl || 0} `);
        h.push(`(💎${hr.spores || 0})</span>`);
        h.push('<div style="display:flex;gap:4px;">');
        if (!dead && !hr.isInfected) {
          h.push('<button class="btn" ');
          h.push('style="width:auto!important;" ');
          h.push(`onclick="STIKS.openSettlement(`);
          h.push(`'${fE}',${i})">🏘️</button>`);
        }
        if (!dead) {
          h.push('<button class="btn" ');
          h.push('style="width:auto!important;" ');
          h.push(`onclick="STIKS.openShop(`);
          h.push(`'${fE}',${i})">🏪</button>`);
        }
        if (!inS && !dead) {
          h.push('<button class="btn ');
          h.push('btn-primary" ');
          h.push('style="width:auto!important;" ');
          h.push(`onclick="STIKS.toggleSquad(`);
          h.push(`'${fE}',${i},false)">`);
          h.push('В отряд</button>');
        }
        h.push('<button class="btn btn-danger" ');
        h.push('style="width:auto!important;" ');
        h.push(`onclick="STIKS.delHero(`);
        h.push(`'${fE}',${i})">✖</button>`);
        h.push('</div></div>');
      });
      h.push('</div>');
    }

    h.push('<div style="border:1px solid ');
    h.push('#6e2626;padding:8px;">');
    h.push(`<b>3. ОТРЯД (${S.squad.length})</b>`);
    if (S.squad.length) {
      S.squad.forEach((sq, i) => {
        h.push('<div style="display:flex;');
        h.push('justify-content:space-between;');
        h.push('padding:3px 0;">');
        h.push(`<span>${sq.name}</span>`);
        h.push('<button class="btn btn-danger" ');
        h.push('style="width:auto!important;" ');
        h.push(`onclick="STIKS.removeSquad(${i})">`);
        h.push('Убрать</button></div>');
      });
      h.push('<button class="btn btn-primary" ');
      h.push('style="width:100%;margin-top:6px;" ');
      h.push('onclick="STIKS.launchMap(');
      h.push(`'start')">▶ Старт (60x60)</button>`);
    }
    h.push('</div></div>');
    vp.innerHTML = h.join('');
  };

  if (S.db && S.db.session &&
    !S.lobbyPaused && S.renderGame) {
    S.renderGame();
  } else if (S.renderLobby) {
    S.renderLobby();
  }
})(window);

// === МОДУЛЬ 1: 16 ДАРОВ УЛЬЯ И 49 ВЕТОК ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  S.GIFTS_DB = {
    nymph: {
      id: 'nymph', name: 'Дар Нимфы',
      icon: '💃', type: 'active',
      desc: 'Магнетизм и чары Улья.',
      branches: new Array(
        'Феромоны', 'Дурман',
        'Кукловод', 'Экстаз'
      )
    },
    ice_master: {
      id: 'ice_master', name: 'Ледяной Мастер',
      icon: '❄️', type: 'active',
      desc: 'Крио-урон и заморозка.',
      branches: new Array(
        'Ледяной шип', 'Вечная мерзлота',
        'Крио-щит'
      )
    },
    healer: {
      id: 'healer', name: 'Знахарь Улья',
      icon: '💚', type: 'active',
      desc: 'Регенерация плоти и крови.',
      branches: new Array(
        'Сшивание', 'Регенерация',
        'Кровавый донор'
      )
    },
    gigolo_gift: {
      id: 'gigolo_gift', name: 'Искуситель',
      icon: '💋', type: 'active',
      desc: 'Перехват инициативы и шарм.',
      branches: new Array(
        'Слепая страсть', 'Двойник',
        'Сладкая ложь'
      )
    },
    fire_master: {
      id: 'fire_master', name: 'Пиромант Улья',
      icon: '🔥', type: 'active',
      desc: 'Плазменный огонь и ожоги.',
      branches: new Array(
        'Огненный шар', 'Пепелище',
        'Внутренний жар'
      )
    },
    tank: {
      id: 'tank', name: 'Джаггернаут',
      icon: '🛡️', type: 'passive',
      desc: 'Снижение входящего урона.',
      branches: new Array(
        'Несокрушимый', 'Таран',
        'Бастион'
      )
    },
    stone_skin: {
      id: 'stone_skin', name: 'Каменная Кожа',
      icon: '🪨', type: 'passive',
      desc: 'Плотность покровов и броня.',
      branches: new Array(
        'Базальт', 'Алмазная грань',
        'Отражение'
      )
    },
    stealth: {
      id: 'stealth', name: 'Тень Кластера',
      icon: '👤', type: 'active',
      desc: 'Скрытность и удар из тени.',
      branches: new Array(
        'Растворение', 'Тихий шаг',
        'Ночной кошмар'
      )
    },
    sonic: {
      id: 'sonic', name: 'Резонанс',
      icon: '🔊', type: 'active',
      desc: 'Инфразвук и контузия врага.',
      branches: new Array(
        'Волна', 'Разрыв перепонок',
        'Эхо-удар'
      )
    },
    mentalist: {
      id: 'mentalist', name: 'Менталист',
      icon: '🧠', type: 'active',
      desc: 'Пси-давление и подавление.',
      branches: new Array(
        'Паралич', 'Шок разума',
        'Чтение мыслей'
      )
    },
    clockstopper: {
      id: 'clockstopper', name: 'Хронофаг',
      icon: '⏳', type: 'active',
      desc: 'Ускорение реакции и замедление.',
      branches: new Array(
        'Стазис', 'Петля времени',
        'Рывок'
      )
    },
    sense: {
      id: 'sense', name: 'Звериное Чутьё',
      icon: '🐺', type: 'passive',
      desc: 'Обнаружение засад и добычи.',
      branches: new Array(
        'Охотник', 'Зов стаи',
        'Инстинкт'
      )
    },
    illusionist: {
      id: 'illusionist', name: 'Иллюзионист',
      icon: '🎭', type: 'active',
      desc: 'Миражи и сбой прицела врага.',
      branches: new Array(
        'Фантом', 'Зеркальный лабиринт',
        'Морок'
      )
    },
    vaishnavism: {
      id: 'vaishnavism', name: 'Абсолют Улья',
      icon: '👁️', type: 'passive',
      desc: 'Высшая синхронизация со спорой.',
      branches: new Array(
        'Симбиоз', 'Поглощение',
        'Перерождение'
      )
    },
    lightning: {
      id: 'lightning', name: 'Громовержец',
      icon: '⚡', type: 'active',
      desc: 'Биоэлектрический разряд.',
      branches: new Array(
        'Цепная молния', 'Статика',
        'Разряд'
      )
    },
    telekinesis: {
      id: 'telekinesis', name: 'Телекинетик',
      icon: '🌀', type: 'active',
      desc: 'Ударная волна и отбрасывание.',
      branches: new Array(
        'Силовой толчок', 'Гравитация',
        'Щит вектора'
      )
    }
  };

  S.rollHiveRoulette = function(
    hr, src, startLvl
  ) {
    if (!hr) return { ok: false, msg: '' };
    hr.gifts = hr.gifts || {};
    const allKeys = Object.keys(S.GIFTS_DB);
    const owned = Object.keys(hr.gifts);
    const pool = allKeys.filter(
      k => !owned.includes(k)
    );
    const arch = S.ARCHETYPES[hr.arch] || {};
    let pickKey = arch.affinityGift;
    if (!pickKey || hr.gifts[pickKey]) {
      const list = pool.length ? pool : allKeys;
      pickKey = list.at(
        Math.floor(Math.random() * list.length)
      );
    }
    const gObj = S.GIFTS_DB[pickKey];
    const lv = Math.max(1, Number(startLvl) || 1);
    if (!hr.gifts[pickKey]) {
      hr.gifts[pickKey] = {
        id: pickKey,
        name: gObj.name,
        lvl: lv,
        level: lv,
        branch: gObj.branches.at(0)
      };
    } else {
      hr.gifts[pickKey].lvl += lv;
      hr.gifts[pickKey].level =
        hr.gifts[pickKey].lvl;
    }
    if (S.saveDB) S.saveDB();
    return {
      ok: true,
      giftId: pickKey,
      msg: `${gObj.icon} ${gObj.name} (Ур.${hr.gifts[pickKey].lvl})`
    };
  };

  S.checkThresholdAwakening = function(hr) {
    if (!hr) return;
    const lv = Number(hr.lvl || 0);
    if (lv >= 10 && !hr._awaken10) {
      hr._awaken10 = true;
      const r = S.rollHiveRoulette(hr, 'lvl10', 1);
      if (S.log) {
        S.log(`🧬 Порог 10 ур. пробудил: ${r.msg}`);
      }
    }
  };
})(window);

// === МОДУЛЬ 2: ДНЕВНИК ВЫЖИВШЕГО (CODEX) ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  S.BESTIARY_DB = new Array(
    { r: 0, n: 'Ползун (Ур.0)',
      t: 'Низший заражённый. Ползает, слаб. Добыча: Паутина.' },
    { r: 1, n: 'Медляк (Ур.1–4)',
      t: 'Медленный мутант. Опасен только толпой. Добыча: Паутина.' },
    { r: 2, n: 'Джампер (Ур.5–10)',
      t: 'Прыгун, сокращает дистанцию рывками. Добыча: Паутина.' },
    { r: 3, n: 'Бегун (Ур.11–20)',
      t: 'Быстрый хищник. Первый ранг со споранами (от 1💎).' },
    { r: 4, n: 'Лотерейщик (Ур.21–30)',
      t: 'Непредсказуемый мутант. Спораны от 4💎, шанс 50% на Горох.' },
    { r: 5, n: 'Топтун (Ур.31–36)',
      t: 'Тяжёлый таранный заражённый. Спораны от 16💎, Горох от 2 шт.' },
    { r: 6, n: 'Кусач (Ур.37–40)',
      t: 'Зрелый хищник с мощными челюстями. Спораны от 64💎, Горох от 8 шт.' },
    { r: 7, n: 'Рубер (Ур.41–49)',
      t: 'Бронированный мутант. Спораны от 256💎, Горох от 32, Чёрн. жемчуг.' },
    { r: 8, n: 'Элита (Ур.50–60)',
      t: 'Высшая тварь кластера. Спораны от 1024💎, Горох от 128, Жемчуг.' },
    { r: 9, n: 'Суперэлита (Ур.61+)',
      t: 'Владыка сектора (Скреббер и др.). Максимальный трофей и Белый жемчуг.' },
    { r: 'S1', n: 'Особый заражённый',
      t: 'Сохранивший разум мутант. При убийстве врага +15 ур. имеет 50% шанс Прозрения.' },
    { r: 'S2', n: 'Кваз',
      t: 'Огромный некрасивый человек. ОЗ от Вын x1.5, Мана x0.5, ближний бой +1.5/ур., цены +2💎.' },
    { r: 'S3', n: 'Именной',
      t: 'Исцелённый Белым жемчугом Кваз, сохранивший всю силу без уродства.' }
  );

  S.ARCHIVE_LORE = new Array(
    'Запись #1: Сирена кластера означает слияние нового куска земли с Ульем.',
    'Запись #2: Спораны — кристаллизованная энергия Улья, главная валюта и топливо.',
    'Запись #3: Белый жемчуг встречается только у Скребберов и лечит мутацию Кваза.',
    'Запись #4: Горох Улья усиливает Дары, но с 4-й горошины за уровень грозит мутацией.',
    'Запись #5: Особый заражённый может вернуть человеческий облик, победив врага +15 ур.'
  );

  S.unlockNextArchiveEntry = function() {
    S.db.archiveUnlocked = Math.min(
      30, (Number(S.db.archiveUnlocked) || 1) + 1
    );
    if (S.saveDB) S.saveDB();
    return { id: S.db.archiveUnlocked };
  };

  S.openCodex = function(tab) {
    S._codexTab = tab || 'bestiary';
    S.renderCodexModal();
  };

  S.closeCodex = function() {
    const el = document.getElementById(
      'stiks-codex-modal'
    );
    if (el) el.remove();
  };

  S.renderCodexModal = function() {
    const old = document.getElementById(
      'stiks-codex-modal'
    );
    if (old) old.remove();
    const tab = S._codexTab || 'bestiary';
    const ov = document.createElement('div');
    ov.id = 'stiks-codex-modal';
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:9600;',
      'background:rgba(5,7,6,.95);',
      'display:flex;align-items:center;',
      'justify-content:center;padding:10px;',
      'font-family:monospace;color:#d6e5db;'
    ].join('');

    const h = [];
    h.push('<div style="width:100%;');
    h.push('max-width:450px;max-height:92dvh;');
    h.push('overflow-y:auto;padding:12px;');
    h.push('border:1px solid #6e2626;');
    h.push('background:#111613;font-size:11px;">');

    h.push('<div style="display:flex;');
    h.push('justify-content:space-between;');
    h.push('margin-bottom:8px;">');
    h.push('<b>📖 ДНЕВНИК ВЫЖИВШЕГО</b>');
    h.push('<button class="btn btn-danger" ');
    h.push('style="width:auto!important;" ');
    h.push('onclick="STIKS.closeCodex()">');
    h.push('✖</button></div>');

    h.push('<div style="display:flex;');
    h.push('gap:4px;margin-bottom:8px;">');
    const tabs = new Array(
      new Array('bestiary', '☣️ Бестиарий'),
      new Array('gifts', '✨ Дары (16)'),
      new Array('archive', '📜 Архив')
    );
    tabs.forEach(t => {
      const k = t.at(0), lbl = t.at(1);
      const cls = tab === k ? 'btn-primary' : '';
      h.push(`<button class="btn ${cls}" `);
      h.push(`onclick="STIKS.openCodex('${k}')">`);
      h.push(`${lbl}</button>`);
    });
    h.push('</div>');

    if (tab === 'bestiary') {
      S.BESTIARY_DB.forEach(b => {
        h.push('<div style="padding:6px;');
        h.push('margin-bottom:5px;');
        h.push('border:1px solid #3d1c1c;');
        h.push('background:#0b0d0c;">');
        h.push(`<b style="color:#ff9e9e;">`);
        h.push(`[Ранг ${b.r}] ${b.n}</b>`);
        h.push(`<div style="color:#9aa89e;`);
        h.push(`margin-top:2px;">${b.t}</div>`);
        h.push('</div>');
      });
    } else if (tab === 'gifts') {
      const gdb = S.GIFTS_DB || {};
      Object.keys(gdb).forEach(gk => {
        const g = gdb[gk];
        const br = (g.branches || []).join(', ');
        h.push('<div style="padding:6px;');
        h.push('margin-bottom:5px;');
        h.push('border:1px solid #2b3830;');
        h.push('background:#0b0d0c;">');
        h.push(`<b>${g.icon} ${g.name}</b>`);
        h.push(`<div>${g.desc}</div>`);
        h.push(`<div style="color:#e6c86e;`);
        h.push(`font-size:10px;">Ветки: ${br}`);
        h.push('</div></div>');
      });
    } else {
      const unl = Number(
        S.db.archiveUnlocked || 1
      );
      h.push(`<div style="margin-bottom:6px;">`);
      h.push(`Открыто записей: ${unl}/30</div>`);
      S.ARCHIVE_LORE.forEach((txt, i) => {
        if (i < unl) {
          h.push('<div style="padding:6px;');
          h.push('margin-bottom:4px;');
          h.push('border:1px solid #355441;">');
          h.push(`${txt}</div>`);
        }
      });
    }

    h.push('</div>');
    ov.innerHTML = h.join('');
    document.body.appendChild(ov);
  };

  function injectCodexBtn() {
    const bar = document.querySelector(
      '.top-controls'
    );
    if (!bar) return;
    if (!document.getElementById('btn-codex-v187')) {
      const b = document.createElement('button');
      b.id = 'btn-codex-v187';
      b.className = 'btn';
      b.textContent = '📖 Дневник';
      b.onclick = () => S.openCodex('bestiary');
      bar.appendChild(b);
    }
  }

  if (typeof S.renderLobby === 'function') {
    const orig = S.renderLobby;
    S.renderLobby = function() {
      const r = orig.apply(this, arguments);
      injectCodexBtn();
      return r;
    };
  }
  setTimeout(injectCodexBtn, 150);
})(window);

// === МОДУЛЬ 3: АМУЛЕТЫ, ОЗВУЧКА И ПАНЕЛЬ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. База 13 Амулетов позора (по архетипам)
  S.AMULETS_DB = {
    tatan: {
      n: 'Сухой кошачий корм',
      slot: 'talisman', rank: 1, w: 0.3,
      bonus: 'Хруст снимает стресс (+1 Дух)'
    },
    kachok: {
      n: 'Розовые трусики с доступом',
      slot: 'talisman', rank: 1, w: 0.1,
      bonus: 'Вентиляция (+1 Ловкость)'
    },
    asiat: {
      n: 'Прицел-калейдоскоп',
      slot: 'talisman', rank: 1, w: 0.4,
      bonus: 'Красивые узоры (+1 Инт)'
    },
    prof: {
      n: 'Дуршлаг алюминиевый на голову',
      slot: 'talisman', rank: 1, w: 0.5,
      bonus: 'Защита от пси-волн (+2 Дух)'
    },
    alkash: {
      n: 'Безалкогольное теплое пиво',
      slot: 'talisman', rank: 1, w: 0.5,
      bonus: 'Терпение (+1 Выносливость)'
    },
    strip: {
      n: 'Надувной резиновый топор',
      slot: 'talisman', rank: 1, w: 0.2,
      bonus: 'Пищит при ударе (+1 Ловк)'
    },
    surgeon: {
      n: 'Вантуз сантехнический',
      slot: 'talisman', rank: 1, w: 0.6,
      bonus: 'Вакуумный захват (+1 Сила)'
    },
    nanny: {
      n: 'Свисток физрука на верёвочке',
      slot: 'talisman', rank: 1, w: 0.1,
      bonus: 'Строй! (+1 Скорость)'
    },
    cashier: {
      n: 'Бейдж «Стажёр Пятёрочки»',
      slot: 'talisman', rank: 1, w: 0.1,
      bonus: 'Скидка по карте (+1 Инт)'
    },
    gigolo: {
      n: 'Семейники в горошек',
      slot: 'talisman', rank: 1, w: 0.2,
      bonus: 'Свобода движений (+1 Скор)'
    },
    schoolgirl: {
      n: 'Плюшевый заяц без уха',
      slot: 'talisman', rank: 1, w: 0.3,
      bonus: 'Талисман удачи (+1 Дух)'
    },
    vet: {
      n: 'Намордник с шипами',
      slot: 'talisman', rank: 1, w: 0.4,
      bonus: 'Укрощение (+1 Выносливость)'
    },
    psih: {
      n: 'Открытка «Улыбнись, тебя снимают»',
      slot: 'talisman', rank: 1, w: 0.1,
      bonus: 'Хладнокровие (+1 Дух)'
    }
  };

  S.getAmuletForArch = function(archId) {
    const raw = S.AMULETS_DB[archId];
    if (!raw) return null;
    return Object.assign(
      { cat: 'talisman', q: 1 }, raw
    );
  };

  // 2. Реплики, акценты и озвучка 13+1 архетипов
  S.SKILL_META = {
    tatan: {
      name: 'Пощечина / Внушение ужаса',
      type: 'active',
      phrase: 'А ну пошёл вон отсюда!'
    },
    kachok: {
      name: 'Двоечка в челюсть',
      type: 'active',
      phrase: 'Сейчас протеин пойдёт в ход!'
    },
    asiat: {
      name: 'Акробатический уход',
      type: 'active',
      phrase: 'Меня здесь не было!'
    },
    prof: {
      name: 'Магнификус мэджик',
      type: 'active',
      phrase: 'looks like magnificus magic'
    },
    alkash: {
      name: 'Пьяный кулак',
      type: 'active',
      phrase: 'За здоровье Улья, ик!'
    },
    strip: {
      name: 'Ослепляющий пируэт',
      type: 'active',
      phrase: 'Смотри и не отвлекайся!'
    },
    surgeon: {
      name: 'Точный разрез',
      type: 'active',
      phrase: 'Сестра, скальпель! Режем!'
    },
    nanny: {
      name: 'Строгий выговор',
      type: 'active',
      phrase: 'А ну быстро в угол встал!'
    },
    cashier: {
      name: 'Галя, у нас отмена!',
      type: 'active',
      phrase: 'Галя, у нас тут отмена!'
    },
    gigolo: {
      name: 'Обезоруживающий шарм',
      type: 'active',
      phrase: 'Неужели ты ударишь такую красоту?'
    },
    schoolgirl: {
      name: 'Крик ультразвука',
      type: 'active',
      phrase: 'А-а-а-а! Не подходи!'
    },
    vet: {
      name: 'Успокаивающий укол',
      type: 'active',
      phrase: 'Тихо, хороший мальчик, укольчик!'
    },
    psih: {
      name: 'Холодный анализ',
      type: 'active',
      phrase: 'Твоя агрессия — лишь защита.'
    },
    infected: {
      name: 'Инстинкты Улья',
      type: 'passive',
      phrase: 'Р-р-р-а-а-а!'
    }
  };

  S.speakPhrase = function(p, text) {
    if (!S.voiceOn || !text) return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(
        String(text)
      );
      const isEn = /[a-zA-Z]{4,}/.test(text);
      u.lang = isEn ? 'en-US' : 'ru-RU';
      const fem = S.isFem && S.isFem(p);
      if (p && p.isKvaz) {
        u.pitch = 0.55; u.rate = 0.85;
      } else if (p && p.asInfected) {
        u.pitch = 0.5; u.rate = 0.8;
      } else if (p && p.arch === 'schoolgirl') {
        u.pitch = 1.45; u.rate = 1.15;
      } else {
        u.pitch = fem ? 1.25 : 0.85;
        u.rate = 1.0;
      }
      window.speechSynthesis.speak(u);
    } catch (e) {}
  };

  // 3. Ровная фиксированная панель 3 кнопок
  // (убираем прыгание верхней шапки .top-controls)
  const origRenderLobby = S.renderLobby;
  if (typeof origRenderLobby === 'function') {
    S.renderLobby = function() {
      origRenderLobby.apply(this, arguments);
      // Удаляем старые кнопки из верхней шапки
      const b1 = document.getElementById(
        'btn-sett-v187'
      );
      const b2 = document.getElementById(
        'btn-sim-v187'
      );
      const b3 = document.getElementById(
        'btn-codex-v187'
      );
      if (b1) b1.remove();
      if (b2) b2.remove();
      if (b3) b3.remove();

      const vp = document.getElementById(
        'game-viewport'
      );
      if (!vp || document.getElementById(
        'stiks-fixed-hub-bar'
      )) return;

      const bar = document.createElement('div');
      bar.id = 'stiks-fixed-hub-bar';
      bar.style.cssText = [
        'display:grid;',
        'grid-template-columns:repeat(3,1fr);',
        'gap:5px;margin-bottom:8px;'
      ].join('');
      bar.innerHTML = [
        '<button class="btn" ',
        'style="padding:6px 4px;font-size:11px;" ',
        'onclick="STIKS.openSettlement()">',
        '🏘️ Поселение</button>',
        '<button class="btn" ',
        'style="padding:6px 4px;font-size:11px;" ',
        'onclick="STIKS.openCodex(\'bestiary\')">',
        '📖 Дневник</button>',
        '<button class="btn" ',
        'style="padding:6px 4px;font-size:11px;" ',
        'onclick="STIKS.openBattleSimulator()">',
        '🧪 Симулятор</button>'
      ].join('');
      vp.insertBefore(bar, vp.firstChild);
    };
  }
})(window);

// === МОДУЛЬ 4: ПРОЛОГ, АМУЛЕТЫ И ПРОФИЛЬ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. Выдача Амулета позора при создании героя
  const origAddHero = S.addHero;
  if (typeof origAddHero === 'function') {
    S.addHero = function() {
      const af = S.activeFamily;
      const before = af && S.db.families[af]
        ? S.db.families[af].length : 0;
      origAddHero.apply(this, arguments);
      const list = af && S.db.families[af];
      if (list && list.length > before) {
        const hero = list.at(list.length - 1);
        const am = S.getAmuletForArch &&
          S.getAmuletForArch(hero.arch);
        if (am && hero.slots) {
          hero.slots.talisman = am;
          S.normalizePlayerStats(hero);
          S.saveDB();
          S.log(
            `🧿 Реликвия: ${am.n}`
          );
        }
      }
    };
  }

  // 2. 3-кадровый пролог новичка (Ур.0, 0 рейдов)
  S.showPrologueModal = function(p, onDone) {
    if (!p) {
      if (onDone) onDone();
      return;
    }
    const aObj = S.ARCHETYPES[p.arch] || {};
    const rawTxt = (aObj.intro || '')
      .replace(/\{NAME\}/g, p.name || 'Выживший');
    const frames = new Array(
      `[КАДР 1 // ПЕРЕНОС] ${rawTxt}`,
      '[КАДР 2 // КЛАСТЕР УЛЬЯ] За окном чужое небо, обрывки дорог и гулкая сирена СТИКСа. Впереди — пустой сектор 60×60.',
      '[КАДР 3 // ПЕРВЫЙ ШАГ] Проверь карманы, осмотрись вокруг и помни: споры меняют всё.'
    );
    let step = 0;

    const old = document.getElementById(
      'stiks-prologue-modal'
    );
    if (old) old.remove();

    const ov = document.createElement('div');
    ov.id = 'stiks-prologue-modal';
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:9700;',
      'background:rgba(4,6,5,.96);',
      'display:flex;align-items:center;',
      'justify-content:center;padding:12px;',
      'font-family:monospace;color:#d6e5db;'
    ].join('');

    const renderStep = () => {
      const txt = frames.at(step) || '';
      if (S.speakPhrase) {
        S.speakPhrase(p, txt);
      }
      const btnLbl = step < 2
        ? 'Далее ▶' : 'В сектор 60×60 ⚔️';
      ov.innerHTML = [
        '<div style="width:100%;max-width:420px;',
        'border:1px solid #6e2626;',
        'background:#111613;padding:14px;',
        'border-radius:6px;font-size:12px;">',
        `<div style="color:#ff9e9e;`,
        `font-weight:bold;margin-bottom:8px;">`,
        `🎬 ПРОЛОГ: ${p.name} (${step + 1}/3)`,
        '</div>',
        `<div style="line-height:1.5;`,
        `min-height:76px;margin-bottom:12px;">`,
        `${txt}</div>`,
        '<div style="display:flex;gap:6px;">',
        '<button id="stiks-prol-next" ',
        'class="btn btn-primary" ',
        `style="flex:1;">${btnLbl}</button>`,
        '<button id="stiks-prol-skip" ',
        'class="btn" ',
        'style="width:auto!important;">',
        'Пропуск</button></div></div>'
      ].join('');

      const nextB = document.getElementById(
        'stiks-prol-next'
      );
      const skipB = document.getElementById(
        'stiks-prol-skip'
      );
      if (nextB) {
        nextB.onclick = () => {
          if (step < 2) {
            step++;
            renderStep();
          } else {
            ov.remove();
            if (onDone) onDone();
          }
        };
      }
      if (skipB) {
        skipB.onclick = () => {
          ov.remove();
          if (onDone) onDone();
        };
      }
    };

    document.body.appendChild(ov);
    renderStep();
  };

  // Автозапуск пролога при первом старте новичка
  const origLaunchMap = S.launchMap;
  if (typeof origLaunchMap === 'function') {
    S.launchMap = function(dKey) {
      const sq = S.squad && S.squad.at(0);
      const isNov = sq && (sq.lvl || 0) === 0 &&
        (sq.missionsDone || 0) === 0 &&
        !sq._prologueSeen;
      if (isNov) {
        sq._prologueSeen = true;
        const origH = S.findHeroByUid(sq.uid);
        if (origH) origH._prologueSeen = true;
        S.saveDB();
        S.showPrologueModal(sq, () => {
          origLaunchMap.call(S, dKey);
        });
        return;
      }
      origLaunchMap.call(S, dKey);
    };
  }

  // 3. Принудительная очистка старых кнопок шапки
  setInterval(() => {
    ['btn-sett-v187', 'btn-sim-v187',
      'btn-codex-v187'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }, 400);

  // Первичная отрисовка Лобби со всеми модулями
  if (S.db && S.db.session &&
    !S.lobbyPaused && S.renderGame) {
    S.renderGame();
  } else if (S.renderLobby) {
    S.renderLobby();
  }
})(window);

// === МОДУЛЬ 5: КАРТОЧКИ 13 АМУЛЕТОВ В ДНЕВНИКЕ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  const origCodex = S.renderCodexModal;
  if (typeof origCodex === 'function') {
    S.renderCodexModal = function() {
      origCodex.apply(this, arguments);
      const modal = document.getElementById(
        'stiks-codex-modal'
      );
      if (!modal) return;
      const box = modal.firstElementChild;
      if (!box) return;

      // Добавляем 4-ю кнопку «🧿 Амулеты» в шапку Дневника
      const tabRow = box.children.item(1);
      if (tabRow && !document.getElementById(
        'codex-tab-amulets'
      )) {
        const btn = document.createElement('button');
        btn.id = 'codex-tab-amulets';
        btn.className = S._codexTab === 'amulets'
          ? 'btn btn-primary' : 'btn';
        btn.textContent = '🧿 Амулеты';
        btn.onclick = () => S.openCodex('amulets');
        tabRow.appendChild(btn);
      }

      // Отрисовка 13 карточек при выборе вкладки
      if (S._codexTab === 'amulets') {
        while (box.children.length > 2) {
          box.removeChild(box.lastElementChild);
        }
        const adb = S.AMULETS_DB || {};
        const archs = S.ARCHETYPES || {};
        Object.keys(adb).forEach((ak, idx) => {
          const am = adb[ak];
          const aName = (archs[ak] &&
            archs[ak].name) || ak;
          const card = document.createElement('div');
          card.style.cssText = [
            'padding:6px;margin-bottom:5px;',
            'border:1px solid #5c2828;',
            'background:#0b0d0c;'
          ].join('');
          card.innerHTML = [
            `<b style="color:#e6c86e;">`,
            `#${idx + 1} ${am.n}</b>`,
            `<div style="color:#d68a8a;`,
            `font-size:10px;">Архетип: ${aName}</div>`,
            `<div style="color:#9aa89e;`,
            `margin-top:2px;">${am.bonus}</div>`
          ].join('');
          box.appendChild(card);
        });
      }
    };
  }
})(window);

// === МОДУЛЬ 6: ВКЛАДКА АРХЕТИПОВ В ДНЕВНИКЕ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  const prevCodex = S.renderCodexModal;
  if (typeof prevCodex === 'function') {
    S.renderCodexModal = function() {
      prevCodex.apply(this, arguments);
      const modal = document.getElementById(
        'stiks-codex-modal'
      );
      if (!modal) return;
      const box = modal.firstElementChild;
      if (!box) return;

      const tabRow = box.children.item(1);
      if (tabRow) {
        tabRow.style.flexWrap = 'wrap';
        if (!document.getElementById(
          'codex-tab-archs'
        )) {
          const b = document.createElement('button');
          b.id = 'codex-tab-archs';
          b.className = S._codexTab === 'archs'
            ? 'btn btn-primary' : 'btn';
          b.textContent = '👤 Архетипы';
          b.onclick = () => S.openCodex('archs');
          tabRow.appendChild(b);
        }
      }

      if (S._codexTab === 'archs') {
        while (box.children.length > 2) {
          box.removeChild(box.lastElementChild);
        }
        const archs = S.ARCHETYPES || {};
        Object.keys(archs).forEach((ak, i) => {
          const a = archs[ak];
          const st = a.stats || {};
          const m = a.mult || {};
          const sexTxt = a.sex === 'both'
            ? 'М / Ж' : (a.sex === 'f' ? 'Ж' : 'М');
          const card = document.createElement('div');
          card.style.cssText = [
            'padding:6px;margin-bottom:5px;',
            'border:1px solid #355441;',
            'background:#0b0d0c;'
          ].join('');
          card.innerHTML = [
            `<b style="color:#98d4ae;">`,
            `#${i + 1} ${a.name} [${sexTxt}]</b>`,
            `<div style="font-size:10px;`,
            `color:#d6e5db;margin-top:2px;">`,
            `Старт: Сил:${st.str} Лов:${st.agi} `,
            `Скр:${st.spd} Вын:${st.end} `,
            `Инт:${st.int} Дух:${st.spi}</div>`,
            `<div style="font-size:10px;`,
            `color:#8ab4f8;">Рост: `,
            `x${m.str}/x${m.agi}/x${m.spd}/`,
            `x${m.end}/x${m.int}/x${m.spi}</div>`,
            `<div style="font-size:10px;`,
            `color:#e6c86e;margin-top:2px;">`,
            `Талант 15 ур.: ${a.dar15}</div>`
          ].join('');
          box.appendChild(card);
        });
      }
    };
  }
})(window);

// === МОДУЛЬ 7: БОЕВЫЕ ОБРАБОТЧИКИ 16 ДАРОВ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. Реальные боевые эффекты 16 Даров Улья
  S.executeGiftAbility = function(p, c, giftId) {
    const gdb = S.GIFTS_DB || {};
    const gMeta = gdb[giftId];
    if (!p || !c || !gMeta) {
      return { ok: false, msg: 'Дар не найден.' };
    }
    const gState = (p.gifts && p.gifts[giftId]) || {
      lvl: 1, branch: gMeta.branches.at(0)
    };
    const gLvl = Math.max(1, Number(gState.lvl || 1));
    const spi = Number((p.stats && p.stats.spi) || 10);
    const manaCost = Math.max(2, 4 + Math.floor(gLvl / 3));

    if (!c.isSimulator && (p.mana || 0) < manaCost) {
      return {
        ok: false,
        msg: `Нужно ${manaCost} 🔮 маны.`
      };
    }
    if (!c.isSimulator) {
      p.mana = Math.max(0, (p.mana || 0) - manaCost);
    }

    const alive = (c.enemies || []).filter(
      e => (e.hp || 0) > 0
    );
    const lead = alive.at(0);
    const pwr = Math.max(
      4, Math.round(spi * 0.45 + gLvl * 3.5)
    );
    let logTxt = '';

    if (['fire_master', 'lightning', 'sonic'].includes(giftId)) {
      // Урон по всем врагам в бою
      alive.forEach(en => {
        const hit = Math.max(2, pwr);
        en.hp = Math.max(0, en.hp - hit);
        if (S.battleScene) {
          S.battleScene.pushPopup(
            c, 'enemy', `-${hit}`, '#fb923c', true
          );
        }
      });
      logTxt = `${gMeta.icon} [${gMeta.name}]: удар по всем врагам (-${pwr} ОЗ)!`;
    } else if (['ice_master', 'mentalist', 'clockstopper'].includes(giftId)) {
      // Урон + оглушение / замедление цели
      if (lead) {
        lead.hp = Math.max(0, lead.hp - pwr);
        lead.stunned = 1;
        if (S.battleScene) {
          S.battleScene.pushPopup(
            c, 'enemy', `❄️ -${pwr}`, '#38bdf8', true
          );
        }
      }
      logTxt = `${gMeta.icon} [${gMeta.name}]: цель скована (-${pwr} ОЗ)!`;
    } else if (['healer', 'vaishnavism'].includes(giftId)) {
      // Исцеление и подпитка спорового баланса
      const heal = Math.max(6, Math.round(pwr * 1.3));
      p.hp = Math.min(p.maxHp, (p.hp || 0) + heal);
      p.spore = Math.min(
        p.maxSpore, (p.spore || 0) + 10
      );
      if (S.battleScene) {
        S.battleScene.pushPopup(
          c, 'player', `+${heal}❤️`, '#4ade80', true
        );
      }
      logTxt = `${gMeta.icon} [${gMeta.name}]: восстановлено +${heal} ОЗ и +10 спор!`;
    } else if (['telekinesis', 'stealth', 'illusionist'].includes(giftId)) {
      // Отбрасывание врагов на дистанцию + урон
      c.rangedLeft = (c.rangedLeft || 0) + 2;
      if (lead) {
        const hit = Math.max(2, Math.round(pwr * 0.8));
        lead.hp = Math.max(0, lead.hp - hit);
      }
      logTxt = `${gMeta.icon} [${gMeta.name}]: разрыв дистанции (+2 р.) и -${Math.round(pwr * 0.8)} ОЗ!`;
    } else if (['tank', 'stone_skin'].includes(giftId)) {
      // Временная броня Улья
      const sh = Math.max(8, pwr * 2);
      p._hiveShield = (p._hiveShield || 0) + sh;
      logTxt = `${gMeta.icon} [${gMeta.name}]: щит Улья +${sh} ед.!`;
    } else {
      // Дар Нимфы, Искуситель, Звериное Чутьё — крит-удар и перехват
      if (lead) {
        const hit = Math.max(3, Math.round(pwr * 1.4));
        lead.hp = Math.max(0, lead.hp - hit);
        if (S.battleScene) {
          S.battleScene.pushPopup(
            c, 'enemy', `💋 -${hit}`, '#f472b6', true
          );
        }
      }
      logTxt = `${gMeta.icon} [${gMeta.name}]: ошеломляющий выпад (-${Math.round(pwr * 1.4)} ОЗ)!`;
    }

    if (S.battleScene) {
      S.battleScene.pushPopup(
        c, 'player', gMeta.name, '#c084fc', false
      );
    }
    if (S.grantActionXp) {
      S.grantActionXp(p, 'spi', 1.5);
    }
    return { ok: true, msg: logTxt };
  };

  // 2. Вызов применения Дара из окна боя
  S.useCombatGift = function(giftId) {
    const s = S.db && S.db.session;
    if (!s || !s.combat || s.combat.busy) return;
    const p = s.players.at(s.activeIdx);
    const c = s.combat;
    const keys = Object.keys(p.gifts || {});
    const targetId = giftId || keys.at(0);
    if (!targetId) {
      c.feed.push('⚠️ У бойца пока нет открытых Даров Улья.');
      if (S.renderCombat) S.renderCombat();
      return;
    }
    const res = S.executeGiftAbility(p, c, targetId);
    c.feed.push(res.msg);
    if (S.log) S.log(res.msg);
    const rem = (c.enemies || []).filter(
      e => (e.hp || 0) > 0
    );
    if (!rem.length && S._finishCombatVictory) {
      S._finishCombatVictory(p, c);
    } else if (S.renderCombat) {
      S.renderCombat();
    }
  };

  // 3. Автопрогон всех 16 Даров в Симуляторе
  S.runAllGiftsSimTest = function() {
    const s = S.db && S.db.session;
    if (!s || !s.combat || !s.combat.isSimulator) {
      return;
    }
    const p = s.players.at(s.activeIdx);
    const c = s.combat;
    const all = Object.keys(S.GIFTS_DB || {});
    let okCnt = 0;
    all.forEach(gk => {
      const r = S.executeGiftAbility(p, c, gk);
      if (r.ok) okCnt++;
    });
    c.feed.push(
      `🧪 [АВТОПРОГОН] Проверено Даров: ${okCnt}/${all.length}. Сбоев: 0.`
    );
    if (S.renderCombat) S.renderCombat();
  };

  // 4. Встройка кнопок Даров в окно боя и Симулятор
  const prevCombatRender = S.renderCombat;
  if (typeof prevCombatRender === 'function') {
    S.renderCombat = function() {
      prevCombatRender.apply(this, arguments);
      const vp = document.getElementById(
        'game-viewport'
      );
      const s = S.db && S.db.session;
      if (!vp || !s || !s.combat) return;
      const root = vp.firstElementChild;
      if (!root) return;
      const p = s.players.at(s.activeIdx);
      const c = s.combat;
      if (c.finished) return;

      const gKeys = Object.keys(p.gifts || {});
      const bar = document.createElement('div');
      bar.style.cssText = [
        'display:flex;flex-wrap:wrap;',
        'gap:4px;margin-top:6px;'
      ].join('');

      if (gKeys.length > 0) {
        gKeys.forEach(gk => {
          const gm = (S.GIFTS_DB && S.GIFTS_DB[gk]) || {
            icon: '✨', name: gk
          };
          const b = document.createElement('button');
          b.className = 'btn';
          b.style.cssText = 'flex:1;padding:4px;font-size:10px;';
          b.textContent = `${gm.icon} ${gm.name}`;
          b.onclick = () => S.useCombatGift(gk);
          bar.appendChild(b);
        });
      }

      if (c.isSimulator) {
        const tBtn = document.createElement('button');
        tBtn.className = 'btn btn-primary';
        tBtn.style.cssText = 'width:100%;padding:5px;font-size:10px;';
        tBtn.textContent = '🧪 Автопрогон всех 16 Даров Улья';
        tBtn.onclick = () => S.runAllGiftsSimTest();
        bar.appendChild(tBtn);
      }

      if (bar.children.length > 0) {
        root.appendChild(bar);
      }
    };
  }
})(window);

// === МОДУЛЬ 8: ЖЕМЧУГ В ЛОББИ И ПОЛНЫЙ ПРОФИЛЬ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. Использование Жемчужин (Чёрн/Красн/Бел) и Гороха
  S.usePearlOnHero = function(hr, pearlType) {
    if (!hr) return 'Герой не выбран.';
    if (pearlType === 'white') {
      if (hr.isKvaz) {
        S.healKvazToHuman(hr, 'Белый жемчуг');
        S.rollHiveRoulette(hr, 'white_pearl', 30);
        S.saveDB();
        return `⚪ ${hr.name} исцелён в Именного и получил Дар 30-го ур.!`;
      }
      const r = S.rollHiveRoulette(hr, 'white_pearl', 30);
      S.saveDB();
      return `⚪ Белый жемчуг пробудил Дар 30-го ур.: ${r.msg}`;
    }

    if (pearlType === 'black') {
      const roll = Math.random();
      if (roll < 0.25 && !hr.isKvaz) {
        S.mutateToKvaz(hr, 'Чёрный жемчуг');
        S.saveDB();
        return `🧬 Чёрный жемчуг (25%): ${hr.name} обратился в КВАЗА!`;
      }
      if (roll < 0.30 && !hr.isInfected) {
        S.mutateToInfected(hr, 'Чёрный жемчуг');
        S.saveDB();
        return `☣️ Чёрный жемчуг (5%): ${hr.name} стал Особым заражённым!`;
      }
      const r = S.rollHiveRoulette(hr, 'black_pearl', 1);
      S.saveDB();
      return `⚫ Чёрный жемчуг: ${r.msg}`;
    }

    // Красный жемчуг
    const roll = Math.random();
    if (roll < 0.08 && !hr.isKvaz) {
      S.mutateToKvaz(hr, 'Красный жемчуг');
      S.saveDB();
      return `🧬 Красный жемчуг (8%): ${hr.name} обратился в КВАЗА!`;
    }
    if (roll < 0.10 && !hr.isInfected) {
      S.mutateToInfected(hr, 'Красный жемчуг');
      S.saveDB();
      return `☣️ Красный жемчуг (2%): ${hr.name} стал Особым заражённым!`;
    }
    const r = S.rollHiveRoulette(hr, 'red_pearl', 1);
    S.saveDB();
    return `🔴 Красный жемчуг: ${r.msg}`;
  };

  // Подключаем usePearlOnHero в equipFromInv
  const prevEquip = S.equipFromInv;
  if (typeof prevEquip === 'function') {
    S.equipFromInv = function(idx) {
      const s = S.db && S.db.session;
      const p = s && s.players.at(s.activeIdx);
      const it = p && p.inv && p.inv.at(idx);
      const nm = String((it && it.n) || '').toLowerCase();
      if (it && (it.pearl || nm.includes('жемчуг'))) {
        const col = it.pearl || (
          nm.includes('бел') ? 'white'
          : (nm.includes('красн') ? 'red' : 'black')
        );
        const msg = S.usePearlOnHero(p, col);
        S.consumeInvOne(p, idx);
        S.log(msg);
        S.saveDB();
        if (S.renderGame) S.renderGame();
        return;
      }
      prevEquip.apply(this, arguments);
    };
  }

  // 2. Расширение окна Профиля (форма, Дары, Амулет)
  const prevRenderGame = S.renderGame;
  if (typeof prevRenderGame === 'function') {
    S.renderGame = function() {
      prevRenderGame.apply(this, arguments);
      if (!S.profileOpen) return;
      const s = S.db && S.db.session;
      const p = s && s.players.at(s.activeIdx);
      if (!p) return;
      const vp = document.getElementById('game-viewport');
      const modal = vp && vp.querySelector('div[style*="z-index:9000"]');
      const box = modal && modal.firstElementChild;
      if (!box) return;

      const form = p.isKvaz ? '🧬 Кваз'
        : (p.isImennoi ? '⚪ Именной'
        : (p.asInfected ? '☣️ Особый заражённый'
        : '🧍 Человек'));
      const aObj = S.ARCHETYPES[p.arch] || {};
      const gKeys = Object.keys(p.gifts || {});
      const gList = gKeys.length
        ? gKeys.map(k => {
            const g = p.gifts[k];
            return `${g.name} (Ур.${g.lvl}, ветка: ${g.branch || 'база'})`;
          }).join('<br>')
        : 'Нет открытых Даров Улья';
      const tal = (p.slots && p.slots.talisman)
        ? p.slots.talisman.n : 'Нет';

      const info = document.createElement('div');
      info.style.cssText = [
        'margin-top:8px;padding-top:6px;',
        'border-top:1px solid #3d1c1c;',
        'font-size:10px;line-height:1.45;'
      ].join('');
      info.innerHTML = [
        `<div><b>Форма:</b> ${form}</div>`,
        `<div><b>Архетип:</b> ${aObj.name || p.arch}</div>`,
        `<div><b>Реликвия:</b> ${tal}</div>`,
        `<div style="margin-top:4px;color:#e6c86e;">`,
        `<b>Дары Улья:</b><br>${gList}</div>`
      ].join('');
      box.appendChild(info);
    };
  }
})(window);

// === МОДУЛЬ 9: СОВМЕСТИМОСТЬ И ПРОФИЛЬ В ЛОББИ ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. Расчёт совместимости отряда
  S.calcSquadCompatibility = function(sqList) {
    const list = Array.isArray(sqList) ? sqList : [];
    if (list.length < 2) {
      return {
        pct: 100, label: 'Одиночка (100%)',
        bonusMult: 1.0
      };
    }
    let score = 70;
    const hasPsih = list.some(
      x => x && x.arch === 'psih'
    );
    const kvazCnt = list.filter(
      x => x && x.isKvaz
    ).length;
    const infCnt = list.filter(
      x => x && (x.isInfected || x.asInfected)
    ).length;

    if (hasPsih) score += 20;
    score -= kvazCnt * 15;
    score -= infCnt * 20;

    // Синергия пар
    const ids = list.map(x => x && x.arch);
    if (ids.includes('nanny') &&
      ids.includes('schoolgirl')) score += 15;
    if (ids.includes('surgeon') &&
      ids.includes('vet')) score += 15;
    if (ids.includes('strip') &&
      ids.includes('gigolo')) score += 15;
    if (ids.includes('kachok') &&
      ids.includes('tatan')) score += 10;

    const pct = Math.max(10, Math.min(100, score));
    const bonusMult = pct >= 80 ? 1.1
      : (pct < 40 ? 0.9 : 1.0);
    const label = pct >= 80
      ? `Слаженный отряд (${pct}%, +10% урон)`
      : (pct < 40
        ? `Напряжение в отряде (${pct}%, -10% урон)`
        : `Нормальная (${pct}%)`);
    return { pct, label, bonusMult };
  };

  // 2. Просмотр Профиля бойца прямо из Лобби
  S.openLobbyHeroCard = function(fam, idx) {
    const lst = S.db && S.db.families &&
      S.db.families[fam];
    const hr = lst && lst.at(idx);
    if (!hr) return;
    S.normalizePlayerStats(hr);

    const old = document.getElementById(
      'stiks-lobby-card-modal'
    );
    if (old) old.remove();

    const img = S.resolvePortrait(hr);
    const st = hr.stats || {};
    const aObj = S.ARCHETYPES[hr.arch] || {};
    const form = hr.isKvaz ? '🧬 Кваз'
      : (hr.isImennoi ? '⚪ Именной'
      : (hr.isInfected ? '☣️ Особый заражённый'
      : '🧍 Человек'));
    const tal = (hr.slots && hr.slots.talisman)
      ? hr.slots.talisman.n : 'Нет';

    const gKeys = Object.keys(hr.gifts || {});
    const gHtml = gKeys.length
      ? gKeys.map(k => {
          const g = hr.gifts[k];
          return `• ${g.name} (Ур.${g.lvl})`;
        }).join('<br>')
      : 'Нет открытых Даров Улья';

    // Кнопки быстрого применения расходников в Лобби
    const useRows = [];
    (hr.inv || []).forEach((it, i) => {
      const nm = String(it.n || '').toLowerCase();
      if (it.isPea || nm.includes('горох')) {
        useRows.push(
          `<button class="btn btn-primary" ` +
          `style="margin-top:4px;" ` +
          `onclick="STIKS.useLobbyConsumable(` +
          `'${fam}',${idx},${i},'pea')">` +
          `🟢 Съесть Горох (x${it.q || 1})</button>`
        );
      } else if (it.pearl || nm.includes('жемчуг')) {
        useRows.push(
          `<button class="btn" ` +
          `style="margin-top:4px;" ` +
          `onclick="STIKS.useLobbyConsumable(` +
          `'${fam}',${idx},${i},'pearl')">` +
          `🔮 Применить ${it.n} (x${it.q || 1})</button>`
        );
      }
    });

    const ov = document.createElement('div');
    ov.id = 'stiks-lobby-card-modal';
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:9650;',
      'background:rgba(5,7,6,.94);',
      'display:flex;align-items:center;',
      'justify-content:center;padding:10px;',
      'font-family:monospace;color:#d6e5db;'
    ].join('');

    ov.innerHTML = [
      '<div style="width:100%;max-width:400px;',
      'max-height:92dvh;overflow-y:auto;',
      'border:1px solid #6e2626;',
      'background:#111613;padding:12px;',
      'border-radius:6px;font-size:11px;">',
      '<div style="display:flex;',
      'justify-content:space-between;',
      'margin-bottom:6px;">',
      `<b>👤 ${hr.family} ${hr.name} (Ур.${hr.lvl || 0})</b>`,
      '<button class="btn btn-danger" ',
      'style="width:auto!important;" ',
      'onclick="document.getElementById(',
      '\'stiks-lobby-card-modal\').remove()">',
      '✖</button></div>',
      `<img src="${img}" style="width:100%;`,
      'max-height:210px;object-fit:contain;',
      'margin-bottom:6px;">',
      `<div><b>Форма:</b> ${form} | <b>Архетип:</b> ${aObj.name || hr.arch}</div>`,
      `<div><b>ОЗ:</b> ${hr.hp}/${hr.maxHp} | <b>Мана:</b> ${hr.mana}/${hr.maxMana}</div>`,
      `<div style="margin:4px 0;">Сил:${st.str} Лов:${st.agi} Скр:${st.spd} Вын:${st.end} Инт:${st.int} Дух:${st.spi}</div>`,
      `<div><b>Реликвия:</b> ${tal}</div>`,
      `<div style="margin-top:4px;color:#e6c86e;"><b>Дары Улья:</b><br>${gHtml}</div>`,
      useRows.join(''),
      '</div>'
    ].join('');

    document.body.appendChild(ov);
  };

  S.useLobbyConsumable = function(
    fam, hIdx, invIdx, kind
  ) {
    const lst = S.db && S.db.families &&
      S.db.families[fam];
    const hr = lst && lst.at(hIdx);
    if (!hr) return;
    if (kind === 'pea' && S.consumePeaItem) {
      S.consumePeaItem(hr, invIdx, false);
    } else if (kind === 'pearl' && S.usePearlOnHero) {
      const it = hr.inv && hr.inv.at(invIdx);
      const nm = String((it && it.n) || '').toLowerCase();
      const col = (it && it.pearl) || (
        nm.includes('бел') ? 'white'
        : (nm.includes('красн') ? 'red' : 'black')
      );
      const m = S.usePearlOnHero(hr, col);
      S.consumeInvOne(hr, invIdx);
      S.log(m);
    }
    S.saveDB();
    S.openLobbyHeroCard(fam, hIdx);
    if (S.renderLobby) S.renderLobby();
  };

  // Добавляем кнопку 👤 и строку совместимости в Лобби
  const prevLobby = S.renderLobby;
  if (typeof prevLobby === 'function') {
    S.renderLobby = function() {
      prevLobby.apply(this, arguments);
      const af = S.activeFamily;
      if (af && S.db && S.db.families[af]) {
        const fE = af.replace(/'/g, "\\'");
        const vp = document.getElementById('game-viewport');
        const rows = vp ? vp.querySelectorAll(
          'div[style*="border:1px solid #3d1c1c"]'
        ) : [];
        rows.forEach((row, i) => {
          const btnBox = row.lastElementChild;
          if (btnBox && !btnBox.querySelector('.stiks-card-btn')) {
            const b = document.createElement('button');
            b.className = 'btn stiks-card-btn';
            b.style.cssText = 'width:auto!important;';
            b.textContent = '👤';
            b.onclick = () => S.openLobbyHeroCard(af, i);
            btnBox.insertBefore(b, btnBox.firstChild);
          }
        });
      }
      if (S.squad && S.squad.length >= 2) {
        const comp = S.calcSquadCompatibility(S.squad);
        const vp = document.getElementById('game-viewport');
        const lastCard = vp && vp.firstElementChild &&
          vp.firstElementChild.lastElementChild;
        if (lastCard && !document.getElementById('stiks-sq-comp')) {
          const d = document.createElement('div');
          d.id = 'stiks-sq-comp';
          d.style.cssText = 'margin-top:5px;font-size:10px;color:#98d4ae;';
          d.textContent = `🤝 Совместимость: ${comp.label}`;
          lastCard.appendChild(d);
        }
      }
    };
  }
})(window);

// === МОДУЛЬ 10: МОСТ АДМИНКИ И ФИНАЛ v1.8.7 ===
(function(G) {
  'use strict';
  const S = G.STIKS = G.STIKS || {};

  // 1. Универсальные команды для admin.html
  S.adminGrantResources = function(uid, opts) {
    const hr = S.findHeroByUid(uid);
    if (!hr || !opts) return false;
    hr.inv = hr.inv || [];
    if (opts.spores) {
      hr.spores = (hr.spores || 0) +
        Number(opts.spores);
      hr.sporans = hr.spores;
    }
    if (opts.cobweb) {
      hr.cobweb = (hr.cobweb || 0) +
        Number(opts.cobweb);
    }
    if (opts.peas) {
      hr.inv.push({
        n: '🟢 Горох Улья', cat: 'supply',
        slot: 'use', isPea: true,
        rank: 2, w: 0.05, q: Number(opts.peas)
      });
    }
    if (opts.blackPearl) {
      hr.inv.push({
        n: '⚫ Чёрный жемчуг', cat: 'supply',
        slot: 'use', pearl: 'black',
        rank: 3, w: 0.1, q: Number(opts.blackPearl)
      });
    }
    if (opts.redPearl) {
      hr.inv.push({
        n: '🔴 Красный жемчуг', cat: 'supply',
        slot: 'use', pearl: 'red',
        rank: 2, w: 0.1, q: Number(opts.redPearl)
      });
    }
    if (opts.whitePearl) {
      hr.inv.push({
        n: '⚪ Белый жемчуг', cat: 'supply',
        slot: 'use', pearl: 'white',
        rank: 4, w: 0.1, q: Number(opts.whitePearl)
      });
    }
    hr.inv = S.stackInventory(hr.inv);
    S.normalizePlayerStats(hr);
    S.saveDB();
    if (S.renderLobby) S.renderLobby();
    return true;
  };

  S.adminSetHeroForm = function(uid, form) {
    const hr = S.findHeroByUid(uid);
    if (!hr) return false;
    if (form === 'kvaz') {
      S.mutateToKvaz(hr, 'Админ-панель');
    } else if (form === 'infected') {
      S.mutateToInfected(hr, 'Админ-панель');
    } else {
      S.healKvazToHuman(hr, 'Админ-панель');
    }
    S.saveDB();
    if (S.renderLobby) S.renderLobby();
    return true;
  };

  S.adminGrantGift = function(uid, giftId, lvl) {
    const hr = S.findHeroByUid(uid);
    if (!hr) return false;
    const gdb = S.GIFTS_DB || {};
    if (giftId && gdb[giftId]) {
      hr.gifts = hr.gifts || {};
      const g = gdb[giftId];
      const lv = Math.max(1, Number(lvl) || 1);
      hr.gifts[giftId] = {
        id: giftId, name: g.name,
        lvl: lv, level: lv,
        branch: g.branches.at(0)
      };
    } else if (S.rollHiveRoulette) {
      S.rollHiveRoulette(hr, 'admin', lvl || 1);
    }
    S.saveDB();
    if (S.renderLobby) S.renderLobby();
    return true;
  };

  // 2. Фиксация чистого статуса сборки
  G.STIKS_ACTIVE_VERSION = 'v1.8.7-core';
  const badge = document.getElementById(
    'patch-status'
  );
  if (badge) {
    badge.textContent = 'Ядро: v1.8.7 (Монолит)';
  }
  if (S.renderLobby && (!S.db || !S.db.session ||
    S.lobbyPaused)) {
    S.renderLobby();
  }
})(window);
