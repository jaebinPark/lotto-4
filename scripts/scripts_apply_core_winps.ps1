# scripts_apply_reco_ui_winps.ps1 (patch_0.041)
# Purpose: inject storage/safe-hooks/render-bridge into index.html for Windows PowerShell users

$ErrorActionPreference = "Stop"

$index = "index.html"
if (-not (Test-Path $index)) {
  Write-Error "index.html not found in current directory"
  exit 1
}

[string]$html = Get-Content $index -Raw

function Ensure-Line([string]$content, [string]$needle, [string]$insertion) {
  if ($content -match [Regex]::Escape($needle)) {
    return $content  # already present
  }
  return $content.Replace("</head>", "$insertion`n</head>")
}

function Insert-Before-AppBundle([string]$content, [string]$scriptTag) {
  $pattern = '<script[^>]+app\.bundle\.js[^>]*></script>'
  $m = [regex]::Match($content, $pattern, "IgnoreCase")
  if ($m.Success) {
    $idx = $m.Index
    return $content.Substring(0,$idx) + $scriptTag + "`n" + $content.Substring($idx)
  } else {
    # fallback: add to end of body
    return $content.Replace("</body>", "$scriptTag`n</body>")
  }
}

$tag1 = '<script src="./js/storage.api.js?v=patch_0.041"></script>'
$tag2 = '<script src="./js/safe-hooks.js?v=patch_0.041"></script>'
$tag3 = '<script src="./js/render-bridge.js?v=patch_0.041"></script>'

# Prefer to load BEFORE app.bundle.js so hooks are ready.
$html = Insert-Before-AppBundle $html $tag3
$html = Insert-Before-AppBundle $html $tag2
$html = Insert-Before-AppBundle $html $tag1

Set-Content -Path $index -Value $html -Encoding utf8

Write-Host "[OK] index.html injected tags."
