# Build installer Windows untuk Briefzy Studio
# Jalankan di Windows 10/11 (PowerShell):  powershell -ExecutionPolicy Bypass -File desktop\windows\build-installer.ps1
$ErrorActionPreference = 'Stop'

Write-Host "== Briefzy Studio - Windows installer builder ==" -ForegroundColor Cyan

# 1. Node.js
try {
  $nodeVersion = (node -v).Trim()
  Write-Host "Node.js terdeteksi: $nodeVersion"
} catch {
  Write-Host "Node.js belum terpasang." -ForegroundColor Yellow
  Write-Host "Install dulu dengan:  winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
  Write-Host "atau unduh dari https://nodejs.org (pilih LTS)." -ForegroundColor Yellow
  exit 1
}

$major = [int](($nodeVersion -replace '^v', '') -split '\.')[0]
if ($major -lt 20) {
  Write-Host "Node.js minimal versi 20. Versi sekarang: $nodeVersion" -ForegroundColor Yellow
  exit 1
}

# 2. Pindah ke root proyek
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
Write-Host "Folder proyek: $root"

# 3. Dependensi (mengikuti package-lock.json)
if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Write-Host "Memasang dependensi (npm ci)... ini butuh beberapa menit." -ForegroundColor Cyan
  npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci gagal." }
} else {
  Write-Host "node_modules sudah ada, lewati npm ci. (Hapus folder node_modules lalu jalankan ulang jika ada masalah dependensi.)"
}

# 4. Build aplikasi + server + installer
Write-Host "Membangun aplikasi dan installer Windows..." -ForegroundColor Cyan
npm run dist:win
if ($LASTEXITCODE -ne 0) { throw "Build installer gagal." }

$release = Join-Path $root 'release'
Write-Host ""
Write-Host "SELESAI." -ForegroundColor Green
Write-Host "Installer ada di: $release"
if (Test-Path $release) {
  Get-ChildItem $release -Filter *.exe | ForEach-Object { Write-Host ("  - " + $_.FullName) }
  Start-Process explorer.exe $release
}
Write-Host ""
Write-Host "Jalankan file Setup .exe untuk meng-install Briefzy Studio."
Write-Host "Data artikel & token Blogger disimpan di %APPDATA%\Briefzy Studio\data"
