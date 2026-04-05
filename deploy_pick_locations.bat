@echo off
chcp 65001 >nul
cd /d "C:\Users\jbint\parawaze-shuttle"

echo === Cleaning null bytes ===
powershell -Command "$f='src\app\shuttle\pick-locations\page.tsx'; $bytes=[System.IO.File]::ReadAllBytes($f); $clean=[byte[]]($bytes | Where-Object {$_ -ne 0}); [System.IO.File]::WriteAllBytes($f,$clean); Write-Host 'Cleaned null bytes from page.tsx'"

echo === Git add and commit ===
git add src/app/shuttle/pick-locations/page.tsx
git commit -m "refactor(shuttle): rewrite pick-locations with dual-mode pin UX - Replace confusing auto step 1/2 flow with explicit Depart/Arrivee mode buttons - Fix Validate button not appearing - Users can freely switch between modes and reposition pins - Validate appears only when both pins are placed"

echo === Git push ===
git push

echo === DONE ===
