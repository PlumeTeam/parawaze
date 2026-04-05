@echo off
cd /d C:\Users\jbint\parawaze-shuttle
"C:\Program Files\Git\cmd\git.exe" add src\components\reports\ReportCard.tsx src\components\map\ReportBottomSheet.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: show ALL report data in ReportCard and ReportBottomSheet"
"C:\Program Files\Git\cmd\git.exe" push
echo === PUSH COMPLETE ===
