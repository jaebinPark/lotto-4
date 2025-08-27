
// patch 0.011: Background update check + user prompt
(function(){
  const CHECK_INTERVAL_MIN = 30; // minutes
  const KEY_HASH = 'APP_REMOTE_HASH';
  const KEY_LAST_CHECK = 'APP_LAST_CHECK';
  const TXT_PROMPT = '새 버전이 있습니다. 지금 업데이트할까요?';
  const BTN_OK = '업데이트';
  const BTN_CANCEL = '나중에';

  function sha1(str){ // simple hash (not crypto-strong)
    let h=0; for(let i=0;i<str.length;i++){ h = ((h<<5)-h) + str.charCodeAt(i); h|=0; }
    return 'h'+(h>>>0).toString(16);
  }

  async function fetchIndexHash(){
    try{
      const res = await fetch(location.pathname.replace(/[^/]*$/,'') + 'index.html?chk=' + Date.now(), {cache:'no-cache'});
      const txt = await res.text();
      return sha1(txt);
    }catch(e){
      return null;
    }
  }

  function save(k,v){ try{ localStorage.setItem(k,v);}catch(e){} }
  function load(k){ try{ return localStorage.getItem(k);}catch(e){ return null; } }

  function makePrompt(){
    const ov = document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:99998;';
    const card = document.createElement('div');
    card.style.cssText='background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:18px 16px;width:min(90%,360px);font-size:15px;text-align:center;';
    const p = document.createElement('div'); p.textContent = TXT_PROMPT; p.style.margin='6px 0 14px';
    const row = document.createElement('div'); row.style.display='flex'; row.style.gap='10px'; row.style.justifyContent='center';
    const ok = document.createElement('button'); ok.textContent=BTN_OK; ok.style.cssText='padding:10px 14px;border-radius:12px;border:none;background:#1565c0;color:#fff;font-weight:700;';
    const no = document.createElement('button'); no.textContent=BTN_CANCEL; no.style.cssText='padding:10px 14px;border-radius:12px;border:1px solid #ddd;background:#fafafa;color:#333;';
    row.appendChild(no); row.appendChild(ok);
    card.appendChild(p); card.appendChild(row);
    ov.appendChild(card);
    no.onclick=()=>ov.remove();
    ok.onclick=()=>{ ov.remove(); try{ (window.__LOTTO_FORCE_REFRESH||(()=>{}))(); }catch(e){} };
    return ov;
  }

  async function check(force){
    const last = parseInt(load(KEY_LAST_CHECK) || '0', 10);
    const now = Date.now();
    if(!force && (now - last) < CHECK_INTERVAL_MIN*60*1000) return; // throttle
    save(KEY_LAST_CHECK, String(now));
    const remote = await fetchIndexHash();
    if(!remote) return;
    const prev = load(KEY_HASH);
    if(prev && prev !== remote){
      // show prompt
      document.addEventListener('DOMContentLoaded', ()=>{
        document.body.appendChild(makePrompt());
      });
    }
    save(KEY_HASH, remote);
  }

  // First check on load + interval
  check(true);
  setInterval(check, CHECK_INTERVAL_MIN*60*1000);
  // Expose manual check
  window.__LOTTO_CHECK_UPDATE = ()=>check(true);
})();
