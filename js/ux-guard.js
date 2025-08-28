
/* UX Guard JS — patch_0.030 */
(function(){
  const VERSION = 'patch_0.030';
  console.log('UX Guard loaded', VERSION);

  function parseNum(text){
    const n = parseInt(String(text).replace(/[^0-9]/g,''),10);
    return isFinite(n)?n:null;
  }
  function colorFor(n){
    if(n>=1 && n<=10)  return {bg:'#F2C94C', fg:'#FFFFFF'};     // yellow
    if(n>=11 && n<=20) return {bg:'#4B7BE5', fg:'#FFFFFF'};     // blue
    if(n>=21 && n<=30) return {bg:'#F56C6C', fg:'#FFFFFF'};     // red
    if(n>=31 && n<=40) return {bg:'#BDBDBD', fg:'#FFFFFF'};     // gray
    if(n>=41 && n<=45) return {bg:'#27AE60', fg:'#FFFFFF'};     // green
    return {bg:'#CCCCCC', fg:'#111'};
  }
  function paintBall(el){
    // only paint if looks like a lotto ball
    if(!(el.classList.contains('ball') || el.classList.contains('number-chip'))) return;
    const n = parseNum(el.getAttribute('data-n') || el.textContent);
    if(n==null) return;
    const {bg,fg} = colorFor(n);
    el.style.background = bg;
    el.style.color = fg;
  }
  function autoShrink(el, minPx=11){
    try{
      const cs = getComputedStyle(el);
      let fs = parseFloat(cs.fontSize || 14);
      let guard=0;
      while(el.scrollWidth > el.clientWidth && fs>minPx && guard<10){
        fs -= 1;
        el.style.fontSize = fs + 'px';
        guard++;
      }
    }catch(e){/*noop*/}
  }
  function shrinkBatch(root=document){
    const sels = ['.chip','.numchip','.ball','.number-chip','.btn','.button','button','.title','.subtitle','.h1','.h2','.h3','.meta'];
    root.querySelectorAll(sels.join(',')).forEach(el=>autoShrink(el));
  }
  function paintBatch(root=document){
    root.querySelectorAll('.ball,.number-chip').forEach(paintBall);
  }
  function enforceGrid10(root=document){
    // add grid-10 to containers that look like exclusion grids
    const candidates = Array.from(root.querySelectorAll('.chips,.numbers,[data-grid="10"],.grid-10'));
    candidates.forEach(el => el.classList.add('grid-10'));
    // fallback: any element that contains >=40 chips becomes grid-10
    Array.from(root.querySelectorAll('*')).forEach(el=>{
      const kids = el.children || [];
      if(kids.length>=40){
        let count=0;
        for(const c of kids){
          if(!c.classList) continue;
          if(c.classList.contains('chip')||c.classList.contains('numchip')||c.classList.contains('ball')||c.classList.contains('number-chip')) count++;
        }
        if(count>=40) el.classList.add('grid-10');
      }
    });
  }

  function applyAll(root=document){
    paintBatch(root);
    enforceGrid10(root);
    shrinkBatch(root);
  }

  // initial
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>applyAll(document));
  }else{ applyAll(document); }

  // dynamic updates
  const mo = new MutationObserver(muts=>{
    for(const m of muts){
      if(m.addedNodes && m.addedNodes.length){
        m.addedNodes.forEach(n=>{ if(n.nodeType===1) applyAll(n); });
      }
      if(m.type==='attributes' && m.target) applyAll(m.target);
    }
  });
  mo.observe(document.documentElement, { subtree:true, childList:true, attributes:true });
})();
