@echo off
cd /d C:\Users\jbint\parawaze-shuttle

echo === Cleaning null bytes ===
powershell -Command "$files = @('src\components\reports\ReportForm.tsx', 'src\hooks\useReports.ts'); foreach ($f in $files) { $bytes = [System.IO.File]::ReadAllBytes($f); $clean = $bytes | Where-Object { $_ -ne 0 }; [System.IO.File]::WriteAllBytes($f, [byte[]]$clean); Write-Host \"Cleaned: $f\" }"

echo === Git status ===
git status --short

echo === Git add ===
git add src/components/reports/ReportForm.tsx src/hooks/useReports.ts

echo === Git commit ===
git commit -m "enforce temporal rules: observations=now only, forecasts=today/tomorrow only"

echo === Git push ===
git push origin main

echo === Done ===
pause