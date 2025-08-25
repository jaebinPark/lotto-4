// js/boot.safe.js
(function(){
  const NOP = ()=>{};
  if (typeof window.doRecommend !== 'function') {
    window.doRecommend = function(){ console.log('[boot.safe] doRecommend stub'); alert('추천 로직이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.'); };
  }
  if (typeof window.excludedModal !== 'function') {
    window.excludedModal = function(){ console.log('[boot.safe] excludedModal stub'); alert('제외수 설정 로직이 아직 로드되지 않았습니다.'); };
  }
  // 기타 방어용 전역
  window.__BOOT_SAFE__ = true;
  console.log('[boot.safe] loaded');
})();
