window.STIKS_PATCHER = {
  STORAGE_KEY: 'stiks_hot_patch_v1',

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
    // Формат: { path: 'CAL_POOL.weapon', match: { n: 'АК-74 (5.45)' }, set: { a: 18 } }
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

    return true;
  },

  applyFromStorage: function() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
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
    localStorage.setItem(this.STORAGE_KEY, rawText);
    return parsed.version || 'без версии';
  },

  fetchFromServer: async function(url = 'patch.js') {
    const resp = await fetch(url + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    const clean = text.replace(/^\s*window\.STIKS_PATCH_DATA\s*=\s*/, '').replace(/;\s*$/, '');
    const ver = this.saveAndApplyRaw(clean);
    return ver;
  },

  clearPatch: function() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};
