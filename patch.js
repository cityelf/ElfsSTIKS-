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
      name: "Хирург", stats: { str: 8, agi: 16, spd: 9, end: 7, int: 14, spi: 6 },
      mult: { str: 1, agi: 2.5, spd: 1, end: 0.8, int: 2, spi: 0.5 },
      skill: "Вскрытие сухожилий", phrase: "мииилочка! Резать не дозьидайась прьетонита!",
      hint: "Щелкает невидимым скальпелем.", dar15: "Потрошитель Улья (Без Клятвы, крит x3)"
    },
    "ARCHETYPES.nanny": {
      name: "Воспитательница", stats: { str: 7, agi: 8, spd: 9, end: 12, int: 10, spi: 14 },
      mult: { str: 0.8, agi: 1, spd: 1, end: 1.5, int: 1.2, spi: 2 },
      skill: "А ну-ка в угол!", phrase: "опяааать обосралсиии!? Ааа ну ка в угол!",
      hint: "Грозит пальцем пустоте.", dar15: "Мать-героиня мутантов (Вербовка)"
    },
    "ARCHETYPES.cashier": {
      name: "Кассирша", stats: { str: 8, agi: 13, spd: 11, end: 14, int: 8, spi: 6 },
      mult: { str: 1, agi: 2, spd: 1.5, end: 2, int: 1, spi: 0.5 },
      skill: "Галя, у нас отмена!", phrase: "гхаааляаа у нас ооотмеээнааа!!!",
      hint: "Пикает сканером штрих-кодов.", dar15: "Круглосуточный гипермаркет (Контратаки)"
    },
    "ARCHETYPES.gigolo": {
      name: "Жигало", stats: { str: 10, agi: 14, spd: 13, end: 9, int: 6, spi: 8 },
      mult: { str: 1.2, agi: 2, spd: 1.5, end: 1, int: 0.8, spi: 1.2 },
      skill: "Томный взгляд и комплимент", phrase: "Ты погляди какой у меня инструмент!",
      hint: "Поправляет челку.", dar15: "Неотразимый альфа-самэц (Обморок врагов)"
    },
    "ARCHETYPES.schoolgirl": {
      name: "Школьница", stats: { str: 5, agi: 17, spd: 18, end: 6, int: 9, spi: 5 },
      mult: { str: 0.5, agi: 2.5, spd: 2.5, end: 0.8, int: 1.2, spi: 1 },
      skill: "Ультразвуковой визг",
      phrase: "а ну стоять! Там гугрриморда - он в синергии с Пикачу! Я должна его поймать",
      hint: "Трясет разбитым телефоном.", dar15: "Чит-код разработчика (Игнор брони)"
    },
    "ARCHETYPES.vet": {
      name: "Ветеринар девушка", stats: { str: 7, agi: 13, spd: 11, end: 10, int: 13, spi: 6 },
      mult: { str: 0.8, agi: 1.8, spd: 1.2, end: 1.2, int: 1.8, spi: 1 },
      skill: "А ну-ка дай лапу!", phrase: "А ну-ка дай лапу!",
      hint: "Роется в сумке в поисках шприца.", dar15: "Хозяйка очереди (50% приручение)"
    },
    "SHAME_AMULETS": {
      kachok: "Розовые трусики с доступом", prof: "Гигантский фаллоимитатор",
      alkash: "Упаковка слабительного", strip: "Надувной резиновый топор",
      tatan: "Экшн-камера с солнечной батареей", asiat: "Ботинки 59-го размера",
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
    getStepCost(m) { return m === 'careful' ? 3 : (m === 'fast' ? 2 : 1); },
    isFem(p) { return p && ['tatan','strip','nanny','cashier','schoolgirl','vet'].includes(p.arch) && !p.asInfected; },
    dropItem(idx) {
      const s = this.db.session, p = s.players[s.activeIdx], it = p.inv[idx];
      if (it && it.noDrop) {
        const m = it.noDropMsg || 'Нельзя выкинуть!';
        this.log('🚫 ' + m); this.sayAs(p.arch, m); return;
      }
      p.inv.splice(idx, 1); this.log('🗑️ Выброшено: ' + it.n);
      this.saveDB(); if (this.renderGame) this.renderGame();
    },
    unequipSlot(k) {
      const s = this.db.session, p = s.players[s.activeIdx], it = p.slots && p.slots[k];
      if (it) {
        if (it.noDrop) {
          const m = it.noDropMsg || 'Нельзя снять!';
          this.log('🚫 ' + m); this.sayAs(p.arch, m); return;
        }
        p.inv.push(it); p.slots[k] = null; this.log('↩️ Снято: ' + it.n);
        this.saveDB(); if (this.renderGame) this.renderGame();
      }
    },
