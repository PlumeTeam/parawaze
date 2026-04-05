@echo off
cd /d C:\Users\jbint\parawaze-shuttle
"C:\Program Files\Git\bin\git.exe" status --short
"C:\Program Files\Git\bin\git.exe" add src/hooks/useReports.ts src/components/reports/ReportForm.tsx src/components/reports/ReportDetail.tsx "src/app/report/edit/[id]/page.tsx" clean_and_push.bat do_push.bat
"C:\Program Files\Git\bin\git.exe" commit -m "feat: add edit and delete functionality for weather reports"
"C:\Program Files\Git\bin\git.exe" push
