/* patch_0.041 - storage.api.js
 * Lightweight, safe, versioned storage wrapper for this app.
 * - Namespace: window.$store
 * - Persists to localStorage with TTL support, JSON-safe.
 * - Falls back to in-memory when unavailable.
 */
(function(){"use strict";
  const NS = "lotto.kr.lab";
  const VER = "patch_0.041";
  const memory = new Map();
  const hasLocal = (function(){ try{ const k="__t__"; localStorage.setItem(k,"1"); localStorage.removeItem(k); return true; }catch(_e){ return false; } })();
  function now(){ return Date.now(); }
  function k(key){ return NS + ":" + key; }
  function _readRaw(key){
    if (hasLocal){ const v = localStorage.getItem(k(key)); return v; }
    return memory.get(k(key));
  }
  function _writeRaw(key, value){
    if (hasLocal) localStorage.setItem(k(key), value);
    else memory.set(k(key), value);
  }
  function _removeRaw(key){
    if (hasLocal) localStorage.removeItem(k(key));
    else memory.delete(k(key));
  }
  function _parse(v){ try{ return JSON.parse(v); }catch(_e){ return null; } }
  function _pack(value, ttlMs){ return JSON.stringify({ v:value, t: now(), ttl: ttlMs||0, ver: VER }); }
  function _expired(p){ if(!p) return true; if(!p.ttl) return false; return (now()-p.t) > p.ttl; }

  const api = {
    ver: VER,
    get(key, dflt=null){
      const raw = _readRaw(key); if(raw==null) return dflt;
      const parsed = _parse(raw); if(!parsed) return dflt;
      if(_expired(parsed)){ _removeRaw(key); return dflt; }
      return parsed.v;
    },
    set(key, value, opts={}){
      const ttl = (opts && opts.ttlMs) || 0;
      _writeRaw(key, _pack(value, ttl)); return true;
    },
    remove(key){ _removeRaw(key); },
    keys(prefix=""){
      const arr=[]; 
      if(hasLocal){ for(let i=0;i<localStorage.length;i++){ const kk=localStorage.key(i); if(kk && kk.startsWith(NS+":"+(prefix||""))) arr.push(kk.slice(NS.length+1)); } }
      else { for(const kk of memory.keys()) if(kk.startsWith(NS+":"+(prefix||""))) arr.append(kk.slice(NS.length+1)); }
      return arr.sort();
    },
    clear(prefix=""){
      const ks = this.keys(prefix);
      ks.forEach(k=>_removeRaw(k));
    },
    migrate(mapper){
      // mapper: (key, value) => [newKey, newValue] | null
      const ks = this.keys();
      ks.forEach((oldK)=>{
        const v = this.get(oldK);
        const res = mapper(oldK, v);
        if(!res) return;
        const [nk, nv] = res;
        this.set(nk, nv);
        if(nk!==oldK) this.remove(oldK);
      });
    },
  };

  window.$store = window.$store || api;
})();
