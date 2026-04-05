@echo off
cd /d C:\Users\jbint\parawaze-shuttle
git add src/components/reports/ReportForm.tsx
git commit -m "UX revamp: compass wheel, sliders, validation overhaul for observation form"
git push origin main
echo DONE
pause
