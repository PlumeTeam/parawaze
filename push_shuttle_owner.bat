@echo off
cd /d "C:\Users\jbint\parawaze-shuttle"
echo === Git Status ===
git status
echo.
echo === Adding files ===
git add src/lib/types.ts
git add src/hooks/useShuttles.ts
git add "src/app/shuttle/[id]/page.tsx"
echo.
echo === Committing ===
git commit -m "feat: add shuttle owner management (edit, accept/reject passengers, cancel)"
echo.
echo === Pushing ===
git push origin main
echo.
echo === Done ===
