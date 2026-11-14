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

  serializePatch: function(obj) {
    const out = Object.assign({}, obj);
    ['ENGINE_SET', 'HOOK_BEFORE', 'HOOK_AFTER'].forEach(function(sec) {
      if (out[sec] && typeof out[sec] === 'object') {
        const copy = {};
        Object.keys(out[sec]).forEach(function(k) {
          const fn = out[sec][k];
          copy[k] = typeof fn === 'function' ? fn.toString() : fn;
        });
        out[sec] = copy;
      }
    });
    if (typeof out.RAW_JS === 'function') {
      out.RAW_JS = '(' + out.RAW_JS.toString() + ')();';
    }
    return out;
  },

  applyPatchObject: function(patch) {
    if (!patch || typeof patch !== 'object') return false;
    const db = window.STIKS_DB;
    const eng = window.STIKS;

    if (patch.DB_SET && db) {
      Object.keys(patch.DB_SET).forEach(path => {
        this.setByPath(db, path, patch.DB_SET[path]);
      });
    }

    if (patch.DB_PUSH && db) {
      Object.keys(patch.DB_PUSH).forEach(path => {
        const arr = this.getByPath(db, path);
        const items = patch.DB_PUSH[path];
        if (Array.isArray(arr) && Array.isArray(items)) {
          items.forEach(it => arr.push(it));
        }
      });
    }

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

    if (patch.ENGINE_SET && eng) {
      Object.keys(patch.ENGINE_SET).forEach(fnName => {
        const src = patch.ENGINE_SET[fnName];
        if (typeof src === 'function') {
          eng[fnName] = src;
        } else if (typeof src === 'string') {
          eng[fnName] = new Function('return (' + src + ')')();
        }
      });
    }

    if (patch.HOOK_BEFORE && eng) {
      Object.keys(patch.HOOK_BEFORE).forEach(fnName => {
        if (typeof eng[fnName] === 'function') {
          const orig = eng[fnName];
          const hookFn = typeof patch.HOOK_BEFORE[fnName] === 'function'
            ? patch.HOOK_BEFORE[fnName]
            : new Function('return (' + patch.HOOK_BEFORE[fnName] + ')')();
          eng[fnName] = function(...args) {
            hookFn.apply(this, args);
            return orig.apply(this, args);
          };
        }
      });
    }

    if (patch.HOOK_AFTER && eng) {
      Object.keys(patch.HOOK_AFTER).forEach(fnName => {
        if (typeof eng[fnName] === 'function') {
          const orig = eng[fnName];
          const hookFn = typeof patch.HOOK_AFTER[fnName] === 'function'
            ? patch.HOOK_AFTER[fnName]
            : new Function('return (' + patch.HOOK_AFTER[fnName] + ')')();
          eng[fnName] = function(...args) {
            const res = orig.apply(this, args);
            hookFn.apply(this, args);
            return res;
          };
        }
      });
    }

    if (patch.RAW_JS) {
      if (typeof patch.RAW_JS === 'function') patch.RAW_JS();
      else if (typeof patch.RAW_JS === 'string') new Function(patch.RAW_JS)();
    }

    if (patch.version) {
      window.STIKS_ACTIVE_VERSION = patch.version;
      const verLabel = 'Ядро: ' + patch.version;
      document.querySelectorAll('#patch-status, #core-version, .core-version, [data-core-version]').forEach(el => {
        el.textContent = verLabel;
      });
    }

    return true;
  },

  apply: function(patchOrRaw) {
    try {
      let incoming = patchOrRaw;
      if (typeof patchOrRaw === 'string') {
        const clean = patchOrRaw
          .replace(/^\uFEFF/, '')
          .trim()
          .replace(/^(?:window\.)?STIKS_(?:REMOTE_PATCH|PATCH_DATA)\s*=\s*/, '')
          .replace(/;+\s*$/, '');
        incoming = new Function('return (' + clean + ')')();
      }
      if (!incoming || typeof incoming !== 'object') return false;

      let existing = {};
      try {
        const prev = localStorage.getItem(this.STORAGE_KEY);
        if (prev) existing = JSON.parse(prev);
      } catch (e) {}

      const incSer = this.serializePatch(incoming);
      const merged = Object.assign({}, existing, incSer);
      ['DB_SET', 'DB_PUSH', 'ENGINE_SET', 'HOOK_BEFORE', 'HOOK_AFTER'].forEach(function(sec) {
        if (existing[sec] || incSer[sec]) {
          merged[sec] = Object.assign({}, existing[sec] || {}, incSer[sec] || {});
        }
      });
      if (existing.RAW_JS && incSer.RAW_JS && existing.RAW_JS !== incSer.RAW_JS) {
        merged.RAW_JS = existing.RAW_JS + ';\n' + incSer.RAW_JS;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
      return this.applyPatchObject(merged);
    } catch (e) {
      console.error('STIKS_PATCHER.apply error:', e);
      return false;
    }
  },

  boot: function() {
    const applied = this.applyFromStorage();
    if (applied && window.STIKS) {
      try {
        if (window.STIKS.db && window.STIKS.db.session && !window.STIKS.lobbyPaused && typeof window.STIKS.renderGame === 'function') {
          window.STIKS.renderGame();
        } else if (typeof window.STIKS.renderLobby === 'function') {
          window.STIKS.renderLobby();
        }
      } catch (e) {
        console.error('STIKS_PATCHER.boot render error:', e);
      }
    }
    return window.STIKS_ACTIVE_VERSION ? ('Ядро: ' + window.STIKS_ACTIVE_VERSION) : 'Базовое ядро';
  },

  applyFromStorage: function() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem(this.LEGACY_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return this.applyPatchObject(parsed);
    } catch (e) {
      console.error('STIKS_PATCHER storage error:', e);
      return false;
    }
  },

  saveAndApplyRaw: function(rawText) {
    this.apply(rawText);
    return window.STIKS_ACTIVE_VERSION || 'без версии';
  },

  fetchFromServer: async function(url = 'patch.js') {
    const resp = await fetch(url + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    return this.saveAndApplyRaw(text);
  },

  clearPatch: function() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.LEGACY_KEY);
  }
};
