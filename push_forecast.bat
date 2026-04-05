@echo off
cd /d C:\Users\jbint\parawaze-shuttle

echo === Cleaning null bytes from modified files ===

for %%F in (
  src\lib\types.ts
  src\hooks\useReports.ts
  src\components\reports\ReportForm.tsx
  src\components\reports\ReportDetail.tsx
  src\components\reports\ReportCard.tsx
) do (
  echo Cleaning %%F ...
  powershell -Command "$c = [System.IO.File]::ReadAllText('%%F'); $clean = $c -replace \"`0\", ''; [System.IO.File]::WriteAllText('%%F', $clean, [System.Text.UTF8Encoding]::new($false))"
)

echo === Git status ===
git status

echo === Adding files ===
git add src\lib\types.ts src\hooks\useReports.ts src\components\reports\ReportForm.tsx src\components\reports\ReportDetail.tsx src\components\reports\ReportCard.tsx

echo === Committing ===
git commit -m "feat: add forecast_date and hourly scenario support to weather reports"

echo === Pushing ===
git push

echo === Done ===
