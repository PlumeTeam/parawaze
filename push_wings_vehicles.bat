@echo off
cd /d C:\Users\jbint\parawaze-shuttle

echo === Cleaning null bytes ===
powershell -Command "$files = Get-ChildItem -Path 'src' -Recurse -Include *.ts,*.tsx,*.js,*.css; foreach ($f in $files) { $bytes = [System.IO.File]::ReadAllBytes($f.FullName); $nullIdx = [Array]::IndexOf($bytes, [byte]0); if ($nullIdx -ge 0) { $clean = $bytes[0..($nullIdx-1)]; [System.IO.File]::WriteAllBytes($f.FullName, $clean); Write-Host ('Fixed: ' + $f.FullName) } }"

echo === Git operations ===
git add src/hooks/useWings.ts
git add src/hooks/useVehicles.ts
git add src/lib/types.ts
git add src/app/profile/page.tsx
git add src/app/shuttle/new/ShuttleFormContent.tsx
git add "src/app/shuttle/[id]/page.tsx"
git add src/hooks/useShuttles.ts

echo === Committing ===
git commit -m "feat: add wings and vehicles management to profile, vehicle selector in shuttle creation"

echo === Pushing ===
git push origin main

echo === Done ===
pause
