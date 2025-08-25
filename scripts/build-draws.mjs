// scripts/build-draws.mjs (fail-safe v2)
import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import { setTimeout as delay } from 'node:timers/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const BASE = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';
const log = (...a) => console.log('[build-draws.v2]', ...a);

function getJson(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'user-agent': UA, accept: 'application/json,text/plain,*/*' } }, res => {
      if (res.statusCode >= 400) { reject(new Error('HTTP '+res.statusCode)); res.resume(); return; }
      let data=''; res.setEncoding('utf8');
      res.on('data', c => data+=c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); } });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('Timeout')); });
  });
}
const rec = j => ({ no:j.drwNo, date:j.drwNoDate, nums:[j.drwtNo1,j.drwtNo2,j.drwtNo3,j.drwtNo4,j.drwtNo5,j.drwtNo6], bnus:j.bnusNo });

async function detectLatest() {
  for (let n = Number(process.env.CI_LATEST_HINT || 1400); n >= 1; n--) {
    try { const j = await getJson(BASE+n); if (j && j.returnValue === 'success') return j.drwNo; } catch {}
  } throw new Error('latest not found');
}

async function main() {
  const dataDir = path.resolve('data');
  await fs.mkdir(dataDir, { recursive:true });
  const pathFull = path.join(dataDir, 'draws.json');
  const path50  = path.join(dataDir, 'draws50.json');
  let arr = []; try { arr = JSON.parse(await fs.readFile(pathFull,'utf8')); } catch {}
  const have = new Set(arr.map(x=>x.no));
  const latest = await detectLatest();
  const list = []; for (let n=1; n<=latest; n++) if (!have.has(n)) list.push(n);
  log('need', list.length, 'latest=', latest);
  const CONC = Math.max(1, Math.min(Number(process.env.CI_FETCH_CONCURRENCY||4), 8));
  let idx=0, done=0;
  async function worker() {
    while (idx < list.length) {
      const i = idx++; const n = list[i];
      for (let t=1; t<=3; t++) {
        try { const j = await getJson(BASE+n); if (j && j.returnValue==='success') { arr.push(rec(j)); break; } } 
        catch (e) { if (t===3) log('warn: n', n, e.message); else await delay(300*t); }
      }
      done++; if (done%50===0) log('progress', done,'/',list.length);
      await delay(50);
    }
  }
  await Promise.all(Array.from({length:Math.min(CONC, Math.max(1,list.length))}, worker));
  const map = new Map(arr.map(x=>[x.no,x])); arr = Array.from(map.values()).sort((a,b)=>a.no-b.no);
  await fs.writeFile(pathFull, JSON.stringify(arr,null,2)+'\n');
  await fs.writeFile(path50, JSON.stringify(arr.slice(-50),null,2)+'\n');
  log('done: wrote', arr.length, 'draws, last=', arr.at(-1)?.no);
}
main().catch(e => { console.error('[build-draws.v2] FAILED', e?.stack||e); process.exit(0); });
