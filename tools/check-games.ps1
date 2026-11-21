# Tjekker at Spilleparkens katalog (games/games.js) og mapperne under games/ passer sammen.
# Kør fra repo-roden:  pwsh tools/check-games.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$gamesDir = Join-Path $root 'games'
$registry = Get-Content (Join-Path $gamesDir 'games.js') -Raw -Encoding utf8

$ids = [regex]::Matches($registry, "(?m)^\s*id:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$errors = @()

if (-not $ids) { $errors += 'Ingen spil fundet i games/games.js' }

$dupes = $ids | Group-Object | Where-Object Count -gt 1
foreach ($d in $dupes) { $errors += "Id '$($d.Name)' står flere gange i games.js" }

foreach ($id in $ids) {
  if ($id -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') { $errors += "Id '$id' er ikke kebab-case" }
  $dir = Join-Path $gamesDir $id
  if (-not (Test-Path $dir -PathType Container)) { $errors += "Mappen games/$id mangler"; continue }
  foreach ($f in 'index.html', 'cover.svg', 'README.md') {
    if (-not (Test-Path (Join-Path $dir $f))) { $errors += "games/$id/$f mangler" }
  }
  $html = Join-Path $dir 'index.html'
  if (Test-Path $html) {
    $text = Get-Content $html -Raw -Encoding utf8
    if ($text -notmatch '\.\./\.\./park/home-button\.js') { $errors += "games/$id/index.html inkluderer ikke ../../park/home-button.js" }
    foreach ($m in [regex]::Matches($text, '(?:src|href)\s*=\s*"([^"]+)"')) {
      $url = $m.Groups[1].Value
      if ($url -match '^(https?:)?//' -or $url.StartsWith('/')) { $errors += "games/$id/index.html bruger en ikke-relativ sti: $url" }
    }
  }
}

# Arbejdsplanlægning hører til i det private repo games-park-backlog – aldrig her.
$planning = Get-ChildItem $root -Recurse -Directory -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\\.git(\\|$)' -and $_.Name -match '^(backlog|games-park-backlog)$' }
foreach ($p in $planning) { $errors += "Backlog-mappe i det offentlige repo: $($p.FullName.Substring($root.Length + 1)) – flyt den til C:\dev\games-park-backlog" }

$folders = Get-ChildItem $gamesDir -Directory | ForEach-Object Name
foreach ($f in $folders) {
  if ($ids -notcontains $f) { $errors += "Mappen games/$f står ikke i games/games.js" }
}

if ($errors) {
  Write-Host "FEJL ($($errors.Count)):" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}
Write-Host "OK: $($ids.Count) spil i parken: $($ids -join ', ')" -ForegroundColor Green
