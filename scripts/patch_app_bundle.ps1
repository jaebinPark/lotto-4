
# scripts/patch_app_bundle.ps1
# Append UI/UX overlay into js/app.bundle.js (Windows PowerShell)
$src = "js\ui.v013.inline.js"
$dst = "js\app.bundle.js"
if (!(Test-Path $src)) { Write-Error "missing $src"; exit 1 }
if (!(Test-Path $dst)) { Write-Error "missing $dst"; exit 1 }
Add-Content -Path $dst -Value "`n`n/* appended UI/UX patch v0.013 */`n"
Get-Content $src | Add-Content -Path $dst
Write-Output "OK: appended UI patch into $dst"
