@echo off
cd /d C:\Users\jbint\parawaze-shuttle
git add src/lib/types.ts src/hooks/usePois.ts src/app/sites/[id]/page.tsx
git commit -m "feat(wiki): add POI wiki system with edit history and comments"
git push origin main
