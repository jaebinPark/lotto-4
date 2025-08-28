// patch_0.031 — light DOM enhancer (non-breaking).
// - Adds VERSION log
// - Ensures two side-by-side buttons share equal width if wrapped in .button-row
// - Provides tiny helper to render recommended sets in 5x6 blocks if host app calls window.renderRecoSets(list)
(function(){
  const VERSION = 'patch_0.031';
  try{ console.log('VERSION', VERSION); }catch{}
  // Equalize two buttons if container isn't marked
  document.addEventListener('DOMContentLoaded', () => {
    // Heuristic: find two sibling buttons under the exclude board
    const candidateRows = Array.from(document.querySelectorAll('div,section')).filter(el=>{
      const t = (el.textContent||'').trim();
      return /제외수|추천/.test(t) && el.querySelectorAll('button').length>=2;
    }).slice(0,3);
    candidateRows.forEach(row=>{ row.classList.add('button-row'); });
  });

  // helper: chip color class
  const colorClass = (n)=> n<=10?'chip--yellow' : n<=20?'chip--blue' : n<=30?'chip--red' : n<=40?'chip--gray' : 'chip--green';

  // Public hook: host app may call window.renderRecoSets(recoSets)
  // recoSets: array of set arrays, each set has 6 numbers.
  // This will group 30 into a .reco-block (5 rows x 6 sets).
  window.renderRecoSets = function renderRecoSets(sets, mountSelector){
    const mount = mountSelector ? document.querySelector(mountSelector) : document.querySelector('#reco-list, .reco-list, [data-reco-list]');
    if(!mount) return false;
    // clear
    mount.innerHTML = '';
    // chunk by 30
    for(let i=0; i<sets.length; i+=30){
      const block = document.createElement('div');
      block.className = 'reco-block';
      // 5 rows (each 6 sets)
      for(let r=0; r<5 && (i+r*6)<sets.length; r++){
        const row = document.createElement('div');
        row.className = 'reco-row';
        for(let c=0; c<6 && (i+r*6+c)<sets.length; c++){
          const set = sets[i+r*6+c];
          set.forEach(n=>{
            const chip = document.createElement('div');
            chip.className = 'chip '+colorClass(n);
            chip.textContent = n;
            row.appendChild(chip);
          });
          // gap between sets
          const spacer = document.createElement('span');
          spacer.style.width = '10px';
          row.appendChild(spacer);
        }
        block.appendChild(row);
      }
      mount.appendChild(block);
    }
    return true;
  };
})();
