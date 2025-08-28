
param(
  [string]$IndexPath = ".\index.html"
)
$version = "patch_0.030"
if(-not (Test-Path $IndexPath)){ Write-Error "index.html not found at $IndexPath"; exit 1 }
$orig = Get-Content $IndexPath -Raw
$backup = "$IndexPath.bak_$version"
if(-not (Test-Path $backup)){ $orig | Set-Content -Path $backup -Encoding UTF8 }

$cssTag = '<link rel="stylesheet" href="./styles.ux-guard.css?v=patch_0.030">'
$jsTag  = '<script defer src="./js/ux-guard.js?v=patch_0.030"></script>'

# insert css before </head>
if($orig -notmatch [regex]::Escape($cssTag)){
  $orig = $orig -replace '</head>', "$cssTag`n</head>"
}
# insert js before </body>
if($orig -notmatch [regex]::Escape($jsTag)){
  $orig = $orig -replace '</body>', "$jsTag`n</body>"
}

$orig | Set-Content -Path $IndexPath -Encoding UTF8
Write-Host "UX Guard injected ($version). Backup: $backup"
