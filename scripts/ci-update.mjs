// scripts/ci-update.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const BUILD = (process.env.GITHUB_RUN_NUMBER||'0')+'-'+(process.env.GITHUB_SHA||'local').slice(0,7);
const files = ['index.html','styles.css','sw.js','manifest.webmanifest'];
const log = (...a)=>console.log('[ci-update]',...a);

async function replaceToken(file){
  try{
    const p = path.resolve(file);
    let s = await fs.readFile(p,'utf8');
    s = s.replaceAll('{{BUILD}}', BUILD);
    // ensure boot.safe.js is referenced once in index.html
    if (file==='index.html' && !/boot\.safe\.js/.test(s)){
      s = s.replace('</head>', `  <script src="./js/boot.safe.js?v={{BUILD}}"></script>\n</head>`);
      s = s.replaceAll('{{BUILD}}', BUILD);
    }
    await fs.writeFile(p,s,'utf8');
    log('patched', file);
  }catch(e){ /* optional */ }
}

for (const f of files) await replaceToken(f);
console.log('[ci-update] BUILD =', BUILD);
