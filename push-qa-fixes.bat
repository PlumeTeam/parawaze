@echo off
chcp 65001 >nul
cd /d "C:\Users\jbint\parawaze-shuttle"

echo === Copying fixed files from Dropbox ===
set SRC=C:\Users\jbint\JB Chandelier Dropbox\Jean-Baptiste CHANDELIER\04_Code\App\ParaWaze\web

echo Copying LoginForm.tsx...
copy /Y "%SRC%\src\components\auth\LoginForm.tsx" "src\components\auth\LoginForm.tsx"

echo Copying SignupForm.tsx...
copy /Y "%SRC%\src\components\auth\SignupForm.tsx" "src\components\auth\SignupForm.tsx"

echo Copying shuttle\page.tsx...
copy /Y "%SRC%\src\app\shuttle\page.tsx" "src\app\shuttle\page.tsx"

echo Copying ShuttleFormContent.tsx...
copy /Y "%SRC%\src\app\shuttle\new\ShuttleFormContent.tsx" "src\app\shuttle\new\ShuttleFormContent.tsx"

echo Copying pick-locations\page.tsx...
copy /Y "%SRC%\src\app\shuttle\pick-locations\page.tsx" "src\app\shuttle\pick-locations\page.tsx"

echo Copying shuttle [id]\page.tsx...
copy /Y "%SRC%\src\app\shuttle\[id]\page.tsx" "src\app\shuttle\[id]\page.tsx"

echo Copying MapView.tsx...
copy /Y "%SRC%\src\components\map\MapView.tsx" "src\components\map\MapView.tsx"

echo Copying ReportBottomSheet.tsx...
copy /Y "%SRC%\src\components\map\ReportBottomSheet.tsx" "src\components\map\ReportBottomSheet.tsx"

echo Copying ProfileCard.tsx...
copy /Y "%SRC%\src\components\profile\ProfileCard.tsx" "src\components\profile\ProfileCard.tsx"

echo Copying ReportCard.tsx...
copy /Y "%SRC%\src\components\reports\ReportCard.tsx" "src\components\reports\ReportCard.tsx"

echo Creating login redirect page...
if not exist "src\app\login" mkdir "src\app\login"
copy /Y "%SRC%\src\app\login\page.tsx" "src\app\login\page.tsx"

echo.
echo === Cleaning null bytes ===
powershell -Command "Get-ChildItem -Recurse -Filter *.tsx -Path src | ForEach-Object { $content = [System.IO.File]::ReadAllText($_.FullName); if ($content.Contains([char]0)) { $clean = $content -replace [char]0, ''; [System.IO.File]::WriteAllText($_.FullName, $clean, [System.Text.UTF8Encoding]::new($false)); Write-Host ('Cleaned null bytes: ' + $_.FullName) } }"

echo.
echo === Git operations ===
git add -A
git status
git commit -m "fix: resolve 9 QA v2 bugs (P0-P3)

- P0: Hide Google OAuth button (provider not enabled in Supabase)
- P1: Fix Unicode encoding in shuttle pages (replace escape sequences with actual chars)
- P1: Add forgot password link with supabase.auth.resetPasswordForEmail
- P2: Clarify badge vs pilot level distinction in profile card
- P2: Fix floating coordinates label z-index on map pin placement
- P2: Create /login redirect to /auth
- P3: Show coordinates instead of 'Position inconnue' when location_name is null"

echo.
echo === Pushing to GitHub ===
git push origin main

echo.
echo === Done ===
