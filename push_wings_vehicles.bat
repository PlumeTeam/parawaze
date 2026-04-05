@echo off
cd /d C:\Users\jbint\parawaze-shuttle

echo =========================================
echo   ParaWaze - Wings and Vehicles Push
echo =========================================
echo.

echo [1/6] Cleaning null bytes...
powershell -NoProfile -Command "Get-ChildItem -Path 'src' -Recurse -Include *.ts,*.tsx,*.js,*.css | ForEach-Object { $b=[IO.File]::ReadAllBytes($_.FullName); $i=[Array]::IndexOf($b,[byte]0); if($i -ge 0){[IO.File]::WriteAllBytes($_.FullName,$b[0..($i-1)]);Write-Host ('  Fixed: '+$_.Name)} }"
echo Done.
echo.

echo [2/6] Refreshing git index...
git update-index --really-refresh
echo.

echo [3/6] Checking current status...
git status --short
echo.

echo [4/6] Staging all changed files...
git add -A src/hooks/useWings.ts
git add -A src/hooks/useVehicles.ts
git add -A src/lib/types.ts
git add -A src/app/profile/page.tsx
git add -A src/app/shuttle/new/ShuttleFormContent.tsx
git add -A "src/app/shuttle/[id]/page.tsx"
git add -A src/hooks/useShuttles.ts
echo.
echo Staged files:
git diff --cached --stat
echo.

echo [5/6] Committing...
git commit -m "feat: add wings and vehicles management to profile, vehicle selector in shuttle creation"
echo.

echo [6/6] Pushing to GitHub...
git push origin main
echo.

echo =========================================
echo   DONE!
echo =========================================
pause
