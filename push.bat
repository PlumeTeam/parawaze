@echo off
cd /d C:\Users\jbint\parawaze-shuttle
"C:\Program Files\Git\cmd\git.exe" add src/components/reports/ReportCard.tsx src/components/map/ReportBottomSheet.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: show ALL report data in ReportCard and ReportBottomSheet - Add thermals, turbulence, flyability score, altitude, visibility, cloud ceiling to ReportCard - Add condition color dot (green/yellow/red) to cards - Show description preview (100 chars) on all cards, not just expanded - Add photo count indicator with Camera icon - ReportBottomSheet selected mode now shows full inline detail view with weather grid, photo carousel, forecast scenarios mini-table, and Voir detail button - Increase bottom sheet max-height to 70vh for selected reports - All labels in French, using existing formatters and constants - Icons from lucide-react for compact readability"
"C:\Program Files\Git\cmd\git.exe" push
echo DONE
