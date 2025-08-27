
Lotto UI/UX patch v0.013 (append-to-bundle)
-------------------------------------------
이 패치는 js/app.bundle.js 끝에 UI/UX 오버레이 코드를 '추가(Append)'하여,
요청하신 홈/당첨번호/저장번호/추천 화면 조율을 즉시 반영합니다.
(원래 번들은 건드리지 않고, 실행 시점에 DOM을 조정하는 안전한 방식)

적용 방법 (Windows PowerShell):
  cd C:\work\lotto-4
  Expand-Archive -Path .\lotto_patch_0.013.zip -DestinationPath . -Force
  pwsh -File .\scripts\patch_app_bundle.ps1

  git add js/app.bundle.js js/ui.v013.inline.js scripts/patch_app_bundle.ps1 scripts/patch_app_bundle.sh README-PATCH_0.013.txt
  git commit -m "patch_0.013: append UI/UX overlay into app.bundle.js"
  git push

적용 방법 (macOS/Linux):
  unzip lotto_patch_0.013.zip -o
  bash ./scripts/patch_app_bundle.sh

  git add js/app.bundle.js js/ui.v013.inline.js scripts/patch_app_bundle.ps1 scripts/patch_app_bundle.sh README-PATCH_0.013.txt
  git commit -m "patch_0.013: append UI/UX overlay into app.bundle.js"
  git push

index.html는 수정할 필요 없습니다 (app.bundle.js 뒤에 자동으로 실행됨).
화면 우하단에 patch_0.013 배지가 보이면 UI 패치가 적용된 것입니다.
