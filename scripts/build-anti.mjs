// scripts/build-anti.mjs (lightweight, non-fatal)
import fs from 'node:fs/promises';
import path from 'node:path';
const log = (...a) => console.log('[build-anti]', ...a);
async function main(){
  const p = path.resolve('data/draws.json');
  let arr=[]; try { arr = JSON.parse(await fs.readFile(p,'utf8')); } catch {}
  if (!arr.length){ log('no draws yet, skip'); return; }

  // simple "anti" summary: top 10 most frequent numbers (for diagnostics)
  const cnt = Array(46).fill(0);
  for (const r of arr){ for (const n of r.nums) cnt[n]++; cnt[r.bnus]++; }
  const top = Array.from({length:45}, (_,i)=>({n:i+1,c:cnt[i+1]}))
    .sort((a,b)=>b.c-a.c).slice(0,10);
  await fs.writeFile(path.resolve('data/anti.top.json'), JSON.stringify(top,null,2)+'\n');
  log('wrote data/anti.top.json');
}
main().catch(e=>{ console.error('[build-anti] FAILED', e?.stack||e); process.exit(0); });
