window.STIKS_PATCHER = {
  STORAGE_KEY: 'stiks_active_patch',
  LEGACY_KEY: 'stiks_hot_patch_v1',

  getByPath: function(root, path) {
    if (!path) return root;
    const parts = path.split('.');
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  },

  setByPath: function(root, path, val) {
    const parts = path.split('.');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = val;
  },

  applyPatchObject: function(patch) {
    if (!patch || typeof patch !== 'object') return false;
    const db = window.STIKS_DB;
    const eng = window.STIKS;

    // 1. DB_SET: полная замена узла по пути (например 'DIFFS.hell.mod')
    if (patch.DB_SET && db) {
      Object.keys(patch.DB_SET).forEach(path => {
        this.setByPath(db, path, patch.DB_SET[path]);
      });
    }

    // 2. DB_PUSH: добавление элементов в массив (например 'ITEMS.1.weapon.std')
    if (patch.DB_PUSH && db) {
      Object.keys(patch.DB_PUSH).forEach(path => {
        const arr = this.getByPath(db, path);
        const items = patch.DB_PUSH[path];
        if (Array.isArray(arr) && Array.isArray(items)) {
          items.forEach(it => arr.push(it));
        }
      });
    }

    // 3. DB_EDIT: поиск объекта в массиве по ключу и изменение полей
    if (Array.isArray(patch.DB_EDIT) && db) {
      patch.DB_EDIT.forEach(rule => {
        const arr = this.getByPath(db, rule.path);
        if (Array.isArray(arr) && rule.match && rule.set) {
          arr.forEach(item => {
            const ok = Object.keys(rule.match).every(k => item[k] === rule.match[k]);
            if (ok) Object.assign(item, rule.set);
          });
        }
      });
    }

    // 4. ENGINE_SET: замена или добавление метода в window.STIKS
    if (patch.ENGINE_SET && eng) {
      Object.keys(patch.ENGINE_SET).forEach(fnName => {
        const src = patch.ENGINE_SET[fnName];
        if (typeof src === 'function') {
          eng[fnName] = src;
        } else if (typeof src === 'string') {
          eng[fnName] = new Function('return ' + src)();
        }
      });
    }

    // 4.1 Поддержка прямых функций или блока ui/methods в объекте патча
    if (eng) {
      ['renderLobby', 'renderGame', 'renderCombat', 'showProfile', 'resumeRaid'].forEach(fnName => {
        const candidate = patch[fnName] || (patch.ui && patch.ui[fnName]) || (patch.methods && patch.methods[fnName]);
        if (typeof candidate === 'function') {
          eng[fnName] = candidate;
        } else if (typeof candidate === 'string') {
          eng[fnName] = new Function('return ' + candidate)();
        }
      });
    }

    // 5. HOOK_BEFORE: выполнение кода ДО вызова метода движка
    if (patch.HOOK_BEFORE && eng) {
      Object.keys(patch.HOOK_BEFORE).forEach(fnName => {
        if (typeof eng[fnName] === 'function') {
          const orig = eng[fnName];
          const hookFn = typeof patch.HOOK_BEFORE[fnName] === 'function'
            ? patch.HOOK_BEFORE[fnName]
            : new Function('return ' + patch.HOOK_BEFORE[fnName])();
          eng[fnName] = function(...args) {
            hookFn.apply(this, args);
            return orig.apply(this, args);
          };
        }
      });
    }

    // 6. HOOK_AFTER: выполнение кода ПОСЛЕ вызова метода движка
    if (patch.HOOK_AFTER && eng) {
      Object.keys(patch.HOOK_AFTER).forEach(fnName => {
        if (typeof eng[fnName] === 'function') {
          const orig = eng[fnName];
          const hookFn = typeof patch.HOOK_AFTER[fnName] === 'function'
            ? patch.HOOK_AFTER[fnName]
            : new Function('return ' + patch.HOOK_AFTER[fnName])();
          eng[fnName] = function(...args) {
            const res = orig.apply(this, args);
            hookFn.apply(this, args);
            return res;
          };
        }
      });
    }

    // 7. RAW_JS: произвольный блок кода инициализации
    if (patch.RAW_JS) {
      if (typeof patch.RAW_JS === 'function') patch.RAW_JS();
      else if (typeof patch.RAW_JS === 'string') new Function(patch.RAW_JS)();
    }

    // 8. Обновление версии ядра в шапке клиента (если элемент присутствует)
    if (patch.version) {
      window.STIKS_ACTIVE_VERSION = patch.version;
      const verEls = document.querySelectorAll('#core-version, .core-version, [data-core-version]');
      verEls.forEach(el => {
        el.textContent = 'Ядро: ' + patch.version;
      });
    }

    return true;
  },

  // Адаптер для admin.html (STIKS_PATCHER.apply)
  apply: function(patchOrRaw) {
    try {
      let obj = patchOrRaw;
      if (typeof patchOrRaw === 'string') {
        const clean = patchOrRaw
          .replace(/^\uFEFF/, '')
          .trim()
          .replace(/^(?:window\.)?STIKS_(?:REMOTE_PATCH|PATCH_DATA)\s*=\s*/, '')
          .replace(/;+\s*$/, '');
        obj = new Function('return (' + clean + ')')();
      }
      if (!obj || typeof obj !== 'object') return false;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
      return this.applyPatchObject(obj);
    } catch (e) {
      console.error('STIKS_PATCHER.apply error:', e);
      return false;
    }
  },

  // Адаптер для index.html (STIKS_PATCHER.boot)
  boot: function() {
    const applied = this.applyFromStorage();
    if (applied && window.STIKS && typeof window.STIKS.renderLobby === 'function') {
      try {
        window.STIKS.renderLobby();
      } catch (e) {
        console.error('STIKS_PATCHER.boot renderLobby error:', e);
      }
    }
    return applied;
  },

  applyFromStorage: function() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem(this.LEGACY_KEY);
      if (!raw) return false;
      const parsed = new Function('return (' + raw + ')')();
      return this.applyPatchObject(parsed);
    } catch (e) {
      console.error('STIKS_PATCHER storage error:', e);
      return false;
    }
  },

  saveAndApplyRaw: function(rawText) {
    const parsed = new Function('return (' + rawText + ')')();
    this.applyPatchObject(parsed);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(parsed));
    return parsed.version || 'без версии';
  },

  fetchFromServer: async function(url = 'patch.js') {
    const resp = await fetch(url + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    const clean = text
      .replace(/^(?:window\.)?STIKS_(?:REMOTE_PATCH|PATCH_DATA)\s*=\s*/, '')
      .replace(/;\s*$/, '');
    const ver = this.saveAndApplyRaw(clean);
    return ver;
  },

  clearPatch: function() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.LEGACY_KEY);
  }
};
