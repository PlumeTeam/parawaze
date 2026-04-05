@echo off
cd /d C:\Users\jbint\parawaze-shuttle

echo === Cleaning null bytes from all source files ===
powershell -Command "Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | ForEach-Object { $content = [System.IO.File]::ReadAllBytes($_.FullName); $clean = $content | Where-Object { $_ -ne 0 }; if ($clean.Length -ne $content.Length) { [System.IO.File]::WriteAllBytes($_.FullName, [byte[]]$clean); Write-Host ('Cleaned: ' + $_.Name) } }"

echo === Adding files to git ===
git add src/lib/types.ts
git add src/hooks/usePois.ts
git add src/components/shared/BottomNav.tsx
git add src/components/map/MapView.tsx
git add src/app/map/page.tsx
git add src/app/sites/page.tsx
git add src/app/sites/new/page.tsx
git add src/app/sites/pick-location/page.tsx
git add "src/app/sites/[id]/page.tsx"

echo === Git status ===
git status

echo === Committing ===
git commit -m "feat: add POI (Sites) feature - markers, list, creation, voting, detail pages"

echo === Pushing ===
git push origin main

echo === Done ===
pause
