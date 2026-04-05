@echo off
cd /d C:\Users\jbint\parawaze-shuttle

echo === Cleaning null bytes from modified files ===
powershell -Command "Get-ChildItem -Path 'src\hooks\useReports.ts','src\components\reports\ReportForm.tsx','src\components\reports\ReportDetail.tsx','src\app\report\edit\[id]\page.tsx' | ForEach-Object { $content = [System.IO.File]::ReadAllText($_.FullName); $cleaned = $content -replace \"`0\", ''; if ($content.Length -ne $cleaned.Length) { [System.IO.File]::WriteAllText($_.FullName, $cleaned); Write-Host ('Cleaned: ' + $_.Name + ' (removed ' + ($content.Length - $cleaned.Length) + ' null bytes)') } else { Write-Host ('OK: ' + $_.Name + ' (no null bytes)') } }"

echo.
echo === Git status ===
git status

echo.
echo === Adding files ===
git add src/hooks/useReports.ts
git add src/components/reports/ReportForm.tsx
git add src/components/reports/ReportDetail.tsx
git add "src/app/report/edit/[id]/page.tsx"

echo.
echo === Committing ===
git commit -m "feat: add edit and delete functionality for weather reports - Add updateReport and deleteReport to useReports hook - Add edit mode support to ReportForm with initialData prop - Add Modifier (pencil) and Supprimer (trash) buttons to ReportDetail - Create /report/edit/[id] page for editing existing reports - All UI text in French"

echo.
echo === Pushing ===
git push

echo.
echo === Done ===
