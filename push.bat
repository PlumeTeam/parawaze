@echo off
cd /d "C:\Users\jbint\parawaze-temp"
"C:\Program Files\Git\cmd\git.exe" add -A
"C:\Program Files\Git\cmd\git.exe" commit -m "Initial commit: ParaWaze web app"
"C:\Program Files\Git\cmd\git.exe" branch -M main
"C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/PlumeTeam/parawaze.git
"C:\Program Files\Git\cmd\git.exe" push -u origin main
echo DONE
