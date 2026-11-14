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

  serializeObj: function(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(k => {
      const v = obj[k];
      if (typeof v === 'function') {
        copy[k] = v.toString();
      } else if (v && typeof v === 'object') {
        copy[k] = this.serializeObj(v);
      } else {
        copy[k] = v;
      }
    });
    return copy;
  },

  parseRaw: function(patchOrRaw) {
    if (!patchOrRaw) return null;
    if (typeof patchOrRaw === 'object') return patchOrRaw;
    if (typeof patchOrRaw === 'string') {
      const clean = patchOrRaw
        .replace(/^\uFEFF/, '')
        .trim()
        .replace(/^(?:window\.)?STIKS_(?:REMOTE_PATCH|PATCH_DATA)\s*=\s*/, '')
        .replace(/;+\s*$/, '');
      return new Function('return (' + clean + ')')();
    }
    return null;
  },

  mergePatches: function(base, inc) {
    const res = Object.assign({}, base || {}, inc || {});
    ['DB_SET', 'DB_PUSH', 'ENGINE_SET', 'HOOK_BEFORE', 'HOOK_AFTER'].forEach(sec => {
      if ((base && base[sec]) || (inc && inc[sec])) {
        res[sec] = Object.assign({}, (base && base[sec]) || {}, (inc && inc[sec]) || {});
      }
    });
    if (Array.isArray(base && base.DB_EDIT) || Array.isArray(inc && inc.DB_EDIT)) {
      res.DB_EDIT = [].concat((base && base.DB_EDIT) || [], (inc && inc.DB_EDIT) || []);
    }
    if (inc && inc.RAW_JS) {
      res.RAW_JS = inc.RAW_JS;
    } else if (base && base.RAW_JS) {
      res.RAW_JS = base.RAW_JS;
    }
    return res;
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
          eng[fnName] = new Function('return ' + src)();
        }
      });
    }

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

    if (patch.RAW_JS) {
      if (typeof patch.RAW_JS === 'function') patch.RAW_JS();
      else if (typeof patch.RAW_JS === 'string') new Function(patch.RAW_JS)();
    }

    if (patch.version) {
      window.STIKS_ACTIVE_VERSION = patch.version;
      const verEls = document.querySelectorAll('#core-version, .core-version, [data-core-version], #patch-status');
      verEls.forEach(el => {
        el.textContent = 'Ядро: ' + patch.version;
      });
    }

    return true;
  },

  apply: function(patchOrRaw) {
    try {
      const incoming = this.parseRaw(patchOrRaw);
      if (!incoming || typeof incoming !== 'object') return false;
      const serIncoming = this.serializeObj(incoming);

      let existing = {};
      try {
        const prev = localStorage.getItem(this.STORAGE_KEY);
        if (prev) existing = JSON.parse(prev);
      } catch (e) {}

      const merged = this.mergePatches(existing, serIncoming);
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
    return window.STIKS_ACTIVE_VERSION ? ('Ядро: ' + window.STIKS_ACTIVE_VERSION) : 'Ядро: 1.0';
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
    const parsed = this.parseRaw(rawText);
    const ser = this.serializeObj(parsed);
    let existing = {};
    try {
      const prev = localStorage.getItem(this.STORAGE_KEY);
      if (prev) existing = JSON.parse(prev);
    } catch (e) {}
    const merged = this.mergePatches(existing, ser);
    this.applyPatchObject(merged);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
    return merged.version || 'без версии';
  },

  fetchFromServer: async function(url = 'patch.js') {
    const resp = await fetch(url + '?nocache=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    const ver = this.saveAndApplyRaw(text);
    return ver;
  },

  clearPatch: function() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.LEGACY_KEY);
  }
};
