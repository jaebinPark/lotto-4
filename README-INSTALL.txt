Fail-Safe Overlay Pack (v7.1)

포함:
- .github/workflows/pages.yml  : 빌드/배포 + 실패해도 계속 진행
- scripts/build-draws.mjs      : 외부 의존성 없는 전체 회차 수집기 (https, 재시도, 타임아웃)
- scripts/build-anti.mjs       : 간단 진단용 ANTI 산출 (실패해도 비치명적)
- scripts/ci-update.mjs        : {{BUILD}} 토큰 치환 + boot.safe.js 자동 삽입
- sw.js                        : 네트워크 우선 + 캐시 자동 갱신(REV={{BUILD}})
- js/boot.safe.js              : doRecommend / excludedModal 미정의 에러 방지
- manifest.webmanifest         : 아이콘/색상 등록
- icons/app-icon-180.png       : 180x180 아이콘 (404 방지)

설치:
1) 압축을 리포 루트에 풀기(덮어쓰기).
2) git add . && git commit -m "chore: apply fail-safe overlay"
3) git pull --rebase origin main && git push origin main
4) 배포 후 브라우저에서 서비스워커 캐시를 한 번만 초기화.

확인:
- Actions 로그에 [build-draws.v2] / [ci-update] 문자열이 보이면 적용 완료.
