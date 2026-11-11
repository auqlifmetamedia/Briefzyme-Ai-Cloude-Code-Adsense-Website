@echo off
REM Menjalankan Briefzy Studio langsung dari source (tanpa membuat installer).
REM Klik dua kali file ini di Windows.
setlocal
cd /d "%~dp0..\.."

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Install dulu: winget install OpenJS.NodeJS.LTS
  pause
  exit /b 1
)

if not exist node_modules (
  echo Memasang dependensi... ini hanya sekali.
  call npm ci
  if errorlevel 1 goto :error
)

echo Membangun aplikasi...
call npm run build:desktop
if errorlevel 1 goto :error

echo Menjalankan Briefzy Studio...
call npx electron .
exit /b 0

:error
echo.
echo Gagal menjalankan aplikasi. Periksa pesan di atas.
pause
exit /b 1
