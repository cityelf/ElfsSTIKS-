    useShameTalisman() {
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
