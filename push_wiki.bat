@echo off
cd /d C:\Users\jbint\parawaze-shuttle
echo === Git Status ===
git status
echo.
echo === Adding modified files ===
git add src/lib/types.ts src/hooks/usePois.ts "src/app/sites/[id]/page.tsx"
echo.
echo === Committing ===
git commit -m "feat(wiki): add POI wiki system with edit history and comments - Add PoiEdit and PoiComment types to types.ts - Add wiki functions to usePois hook (editPoiField, getPoiEdits, voteOnEdit, addComment, getComments, voteOnComment) - Update POI detail page with inline edit buttons, edit history section, and community comments - Wiki-style: changes are immediate, community can downvote to auto-revert - All French UI text"
echo.
echo === Pushing to GitHub ===
git push origin main
echo.
echo === Done ===
pause
